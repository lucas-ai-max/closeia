/// <reference lib="dom" />

let tabRecorder: MediaRecorder | null = null;
let micRecorder: MediaRecorder | null = null;
let mediaStreamRecorder: MediaRecorder | null = null; // NEW: For video + audio streaming
let tabStream: MediaStream | null = null;
let micStream: MediaStream | null = null;
let playbackContext: AudioContext | null = null;
let tabAnalyser: AnalyserNode | null = null;
let micAnalyser: AnalyserNode | null = null;
let isRecording = false;
let sellerPaused = false; // Mic mutado no Meet → não enviar segmentos do seller
let isStreamingMedia = false; // NEW: Track if video streaming is active

const RECORDING_INTERVAL_MS = 3000;
const SILENCE_THRESHOLD_LEAD = 5;
const SILENCE_THRESHOLD_SELLER = 8; // Maior para ignorar eco do lead no mic

function log(...args: any[]) {
    console.log(...args);
    chrome.runtime.sendMessage({
        type: 'OFFSCREEN_LOG',
        message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
    }).catch(() => { });
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'INIT_RECORDING') {
        log('📩 INIT_RECORDING received');
        startTranscription(message.streamId);

        // Check initial storage state
        chrome.storage.local.get(['micMuted'], (result) => {
            if (result.micMuted !== undefined) {
                sellerPaused = !!result.micMuted;
                log(`🎤 Initial mic state from storage: ${sellerPaused ? 'MUTED' : 'active'}`);
            }
        });

    } else if (message.type === 'STOP_RECORDING') {
        log('📩 STOP_RECORDING received');
        stopTranscription();
    } else if (message.type === 'MIC_MUTE_STATE') {
        sellerPaused = !!message.muted;
        log(`🎤 Seller recording ${sellerPaused ? 'PAUSED (mic muted)' : 'RESUMED'}`);
    }
});

// Robust state sync via storage
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.micMuted) {
        sellerPaused = !!changes.micMuted.newValue;
        log(`🎤 [STORAGE SYNC] Seller recording ${sellerPaused ? 'PAUSED (mic muted)' : 'RESUMED'}`);
    }
});

chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' }).catch(() => { });

function getAudioLevel(analyser: AnalyserNode | null): number {
    if (!analyser) return 0;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
}

// NEW: Unified capture function
async function startTranscription(streamId: string) {
    if (isRecording) {
        log('⚠️ Already recording, stopping previous session...');
        stopTranscription();
    }

    try {
        // === 1. Unified Capture (Video + Audio) ===
        log('🎥 Capturing tab media (Video + Audio)...');
        let combinedStream: MediaStream;

        try {
            combinedStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: 'tab',
                        chromeMediaSourceId: streamId
                    }
                } as any,
                video: {
                    mandatory: {
                        chromeMediaSource: 'tab',
                        chromeMediaSourceId: streamId,
                        maxWidth: 1280,
                        maxHeight: 720,
                        maxFrameRate: 15 // Reduced to 15fps for performance
                    }
                } as any
            });
            log('✅ Tab media captured (Audio + Video)');
        } catch (err: any) {
            log('❌ Failed to capture combined stream:', err.message);
            throw err;
        }

        // Extract audio track for analysis/transcription logic
        tabStream = new MediaStream(combinedStream.getAudioTracks());

        if (!tabStream) throw new Error('Failed to acquire tab stream');

        // === 2. Redirecionar áudio da aba aos speakers ===
        playbackContext = new AudioContext();
        const tabPlayback = playbackContext.createMediaStreamSource(tabStream);
        tabPlayback.connect(playbackContext.destination);
        await playbackContext.resume();
        log('🔊 Tab audio routed to speakers');

        // === 3. Analisador de volume para tab ===
        const tabCtx = new AudioContext();
        tabAnalyser = tabCtx.createAnalyser();
        tabAnalyser.fftSize = 2048;
        tabCtx.createMediaStreamSource(tabStream).connect(tabAnalyser);

        // === 4. Capturar Microfone (Vendedor) ===
        try {
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            log('✅ Microphone captured (Seller)');
            const micCtx = new AudioContext();
            micAnalyser = micCtx.createAnalyser();
            micAnalyser.fftSize = 2048;
            micCtx.createMediaStreamSource(micStream).connect(micAnalyser);
        } catch (err: any) {
            log('⚠️ Microphone unavailable:', err.message);
        }

        isRecording = true;

        const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
            .find(type => MediaRecorder.isTypeSupported(type)) || '';
        log('📋 Using mimeType:', mimeType || 'default');

        // === 5. Dois ciclos de gravação paralelos ===
        startRecordingCycle(tabStream, mimeType, 'lead', tabAnalyser);
        if (micStream) {
            startRecordingCycle(micStream, mimeType, 'seller', micAnalyser);
        }

        chrome.runtime.sendMessage({
            type: 'RECORDING_STARTED',
            micAvailable: !!micStream
        }).catch(() => { });

        // === 6. Start Video + Audio Streaming for Manager using the SAME stream ===
        await startMediaStreaming(combinedStream);

    } catch (err: any) {
        log('❌ Failed:', err.name, err.message);
        chrome.runtime.sendMessage({
            type: 'TRANSCRIPTION_ERROR',
            error: `${err.name}: ${err.message}`
        }).catch(() => { });
    }
}

// NEW: Capture and stream video + audio for manager supervision
async function startMediaStreaming(displayStream: MediaStream) {
    try {
        log('📹 Starting video + audio streaming for manager...');

        // We now receive the stream directly, no need to call getUserMedia again!
        log('✅ Display media received for streaming');

        // Helper to start a recording cycle
        const startRecorderCycle = () => {
            if (!isStreamingMedia) return;

            // Determine supported mime type (doing this inside to be safe/consistent)
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
                ? 'video/webm;codecs=vp9,opus'
                : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
                    ? 'video/webm;codecs=vp8,opus'
                    : 'video/webm';

            // Create new recorder
            const recorder = new MediaRecorder(displayStream, {
                mimeType,
                videoBitsPerSecond: 800000, // 800 kbps
                audioBitsPerSecond: 64000
            });

            mediaStreamRecorder = recorder; // Update global ref

            let isFirstChunk = true;

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];

                        // First chunk of a cycle is the header/init segment
                        const isHeader = isFirstChunk;
                        isFirstChunk = false;

                        chrome.runtime.sendMessage({
                            type: 'MEDIA_STREAM_CHUNK',
                            data: base64,
                            size: event.data.size,
                            timestamp: Date.now(),
                            isHeader: isHeader // Flag essential for backend caching
                        }).catch((err) => {
                            log('❌ Error sending media chunk:', err.message);
                        });
                    };
                    reader.readAsDataURL(event.data);
                }
            };

            recorder.onerror = (event: any) => {
                log('❌ Media streaming error:', event.error?.message);
                // Try to restart cycle on error
                setTimeout(startRecorderCycle, 1000);
            };

            // Start recording (100ms chunks)
            recorder.start(100);

            // Restart recorder every 5 seconds to force new header/keyframe
            setTimeout(() => {
                if (recorder.state !== 'inactive') {
                    recorder.stop();
                    if (isStreamingMedia) {
                        startRecorderCycle();
                    }
                }
            }, 5000);
        };

        isStreamingMedia = true;
        startRecorderCycle();

        log('✅ Media streaming started (5s restart cycle)');

    } catch (err: any) {
        log('⚠️ Video streaming unavailable:', err.message);
        log('⚠️ Manager will only see transcripts, no video');
    }
}

function stopMediaStreaming() {
    if (mediaStreamRecorder) {
        if (mediaStreamRecorder.state !== 'inactive') {
            mediaStreamRecorder.stop();
        }
        mediaStreamRecorder.stream.getTracks().forEach(t => t.stop());
        mediaStreamRecorder = null;
    }
    isStreamingMedia = false;
    log('🛑 Media streaming stopped');
}

function startRecordingCycle(
    stream: MediaStream,
    mimeType: string,
    role: 'lead' | 'seller',
    analyser: AnalyserNode | null
) {
    function recordSegment() {
        if (!isRecording) return;

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        const chunks: Blob[] = [];
        let maxAudioLevel = 0;

        const volumeChecker = setInterval(() => {
            const level = getAudioLevel(analyser);
            if (level > maxAudioLevel) maxAudioLevel = level;
        }, 100);

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunks.push(event.data);
        };

        recorder.onstop = () => {
            clearInterval(volumeChecker);

            if (role === 'seller' && sellerPaused) {
                log('⏭️ [seller] Skipped — mic muted in Meet');
                if (isRecording) recordSegment();
                return;
            }

            const threshold = role === 'seller' ? SILENCE_THRESHOLD_SELLER : SILENCE_THRESHOLD_LEAD;
            if (chunks.length === 0 || maxAudioLevel < threshold) {
                log(`⏭️ [${role}] Silent/echo segment skipped (level: ${maxAudioLevel.toFixed(1)}, threshold: ${threshold})`);
                if (isRecording) recordSegment();
                return;
            }

            const completeBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
            log(`📦 [${role}] Segment: ${completeBlob.size} bytes, level: ${maxAudioLevel.toFixed(1)}`);

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                chrome.runtime.sendMessage({
                    type: 'AUDIO_SEGMENT',
                    data: base64,
                    size: completeBlob.size,
                    role: role
                }).catch(err => log('❌ Error:', (err as Error).message));
            };
            reader.readAsDataURL(completeBlob);

            if (isRecording) recordSegment();
        };

        recorder.onerror = (event: any) => {
            log(`❌ [${role}] Recorder error:`, event.error?.message);
            if (isRecording) setTimeout(() => recordSegment(), 500);
        };

        recorder.start();
        if (role === 'lead') tabRecorder = recorder as MediaRecorder;
        else micRecorder = recorder as MediaRecorder;

        setTimeout(() => {
            if (recorder.state === 'recording') recorder.stop();
        }, RECORDING_INTERVAL_MS);
    }

    recordSegment();
    log(`🚀 [${role}] Recording cycle started`);
}

function stopTranscription() {
    log('🛑 Stopping transcription...');
    isRecording = false;

    [tabRecorder, micRecorder].forEach(r => {
        if (r && r.state !== 'inactive') r.stop();
    });
    tabRecorder = null;
    micRecorder = null;

    // NEW: Stop media streaming
    stopMediaStreaming();

    if (playbackContext) {
        playbackContext.close().catch(() => { });
        playbackContext = null;
    }

    [tabStream, micStream].forEach(s => {
        if (s) s.getTracks().forEach(t => t.stop());
    });
    tabStream = null;
    micStream = null;
    tabAnalyser = null;
    micAnalyser = null;

    log('✅ Stopped');
    chrome.runtime.sendMessage({ type: 'RECORDING_STOPPED' }).catch(() => { });
}
