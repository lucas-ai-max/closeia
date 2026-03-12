/// <reference lib="dom" />

import { Room, LocalVideoTrack, LocalAudioTrack, Track } from 'livekit-client';

let tabRecorder: MediaRecorder | null = null;
let micRecorder: MediaRecorder | null = null;
let mediaStreamRecorder: MediaRecorder | null = null; // NEW: For video + audio streaming
let fullCallRecorder: MediaRecorder | null = null; // Full call video recording
let fullCallChunks: Blob[] = []; // Buffer for full call recording
let tabStream: MediaStream | null = null;
let micStream: MediaStream | null = null;
let playbackContext: AudioContext | null = null;
let tabAnalyserCtx: AudioContext | null = null;
let micAnalyserCtx: AudioContext | null = null;
let tabAnalyser: AnalyserNode | null = null;
let micAnalyser: AnalyserNode | null = null;
let isRecording = false;
let sellerPaused = false; // Mic mutado no Meet → não enviar segmentos do seller
let isStreamingMedia = false; // NEW: Track if video streaming is active
/** Stream used for LiveKit publish (same as displayStream in startMediaStreaming). Never pass this in sendMessage. */
let currentDisplayStreamForLiveKit: MediaStream | null = null;
let liveKitRoom: Room | null = null;

const RECORDING_TIMESLICE_MS = 500;
const webmHeaders: Record<string, string> = {};

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
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['micMuted'], (result) => {
                if (result && result.micMuted !== undefined) {
                    sellerPaused = !!result.micMuted;
                    log(`🎤 Initial mic state from storage: ${sellerPaused ? 'MUTED' : 'active'}`);
                }
            });
        }

    } else if (message.type === 'STOP_RECORDING') {
        log('📩 STOP_RECORDING received');
        stopTranscription(message.uploadConfig);
    } else if (message.type === 'MIC_MUTE_STATE') {
        sellerPaused = !!message.muted;
        log(`🎤 Seller recording ${sellerPaused ? 'PAUSED (mic muted)' : 'RESUMED'}`);
    } else if (message.type === 'START_LIVEKIT_PUBLISH') {
        const { token, serverUrl } = message as { token: string; serverUrl: string };
        if (token && serverUrl) {
            log('🎬 START_LIVEKIT_PUBLISH received, stream ready:', !!currentDisplayStreamForLiveKit);
            tryStartLiveKitPublishWithRetry(token, serverUrl);
        } else {
            log('⚠️ START_LIVEKIT_PUBLISH missing token or serverUrl');
        }
    }
});

// Robust state sync via storage
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.micMuted) {
            sellerPaused = !!changes.micMuted.newValue;
            log(`🎤 [STORAGE SYNC] Seller recording ${sellerPaused ? 'PAUSED (mic muted)' : 'RESUMED'}`);
        }
    });
}

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
        await stopTranscription();
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
        if (playbackContext.state === 'suspended') {
            log('⚠️ PlaybackContext is suspended. Autoplay policy might be blocking audio.');
        } else {
            log(`🔊 Tab audio routed to speakers (State: ${playbackContext.state})`);
        }

        // === 3. Analisador de volume para tab ===
        tabAnalyserCtx = new AudioContext();
        tabAnalyser = tabAnalyserCtx.createAnalyser();
        tabAnalyser.fftSize = 2048;
        tabAnalyserCtx.createMediaStreamSource(tabStream).connect(tabAnalyser);

        // === 4. Capturar Microfone (Vendedor) — permissão já solicitada no popup com user gesture ===
        try {
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            log('✅ Microphone captured (Seller)');
            micAnalyserCtx = new AudioContext();
            micAnalyser = micAnalyserCtx.createAnalyser();
            micAnalyser.fftSize = 2048;
            micAnalyserCtx.createMediaStreamSource(micStream).connect(micAnalyser);
        } catch (err: any) {
            log('⚠️ Microphone unavailable (suas falas não serão transcritas):', err?.name, err?.message);
        }

        isRecording = true;

        const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
            .find(type => MediaRecorder.isTypeSupported(type)) || '';
        log('📋 Using mimeType:', mimeType || 'default');

        // === 5. Dois ciclos de gravação paralelos ===
        startRecordingCycle(tabStream, mimeType, 'lead', tabAnalyser);
        if (micStream) {
            startRecordingCycle(micStream, mimeType, 'seller', micAnalyser);
            log('🎤 Seller (mic) recording cycle started');
        } else {
            log('⚠️ Seller recording NOT started — mic stream missing');
        }

        chrome.runtime.sendMessage({
            type: 'RECORDING_STARTED',
            micAvailable: !!micStream,
            micError: micStream ? undefined : 'Microfone não autorizado ou indisponível'
        }).catch(() => {});

        // === 6. Start Video + Audio Streaming for Manager (tela da aba Meet) ===
        await startMediaStreaming(combinedStream);

        // === 7. Start full call video recording (video + mixed tab+mic audio) ===
        startFullCallRecording(combinedStream, micStream);

    } catch (err: any) {
        log('❌ Failed:', err.name, err.message);
        chrome.runtime.sendMessage({
            type: 'TRANSCRIPTION_ERROR',
            error: `${err.name}: ${err.message}`
        }).catch(() => { });
    }
}

// NEW: Capture and stream video + audio for manager supervision
// IMPORTANT: Never pass displayStream (or any MediaStream/MediaStreamTrack) in sendMessage/postMessage —
// Chrome uses structuredClone for messages and BrowserCaptureMediaStreamTrack cannot be cloned.
async function startMediaStreaming(displayStream: MediaStream) {
    try {
        log('📹 Starting video + audio streaming for manager...');
        currentDisplayStreamForLiveKit = displayStream;

        // Stream is only used here (same context); we send only base64 chunks via sendMessage.
        log('✅ Display media received for streaming');

        // Helper to start a recording cycle
        const startRecorderCycle = () => {
            if (!isStreamingMedia) return;

            // Determine supported mime type (doing this inside to be safe/consistent)
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=opus,vp9')
                ? 'video/webm;codecs=opus,vp9'
                : MediaRecorder.isTypeSupported('video/webm;codecs=opus,vp8')
                    ? 'video/webm;codecs=opus,vp8'
                    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
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
                        const dataUrl = reader.result as string;
                        const base64Index = dataUrl.indexOf(';base64,');
                        const base64 = base64Index >= 0 ? dataUrl.slice(base64Index + 8) : dataUrl.split(',')[1];

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

            // Start recording (500ms chunks) - Optimized for WebSocket
            recorder.start(500);

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
    stopLiveKitPublish();
    currentDisplayStreamForLiveKit = null;
    log('🛑 Media streaming stopped');
}

const LIVEKIT_PUBLISH_RETRY_MS = 1000;
const LIVEKIT_PUBLISH_RETRY_MAX = 8;

function tryStartLiveKitPublishWithRetry(token: string, serverUrl: string, attempt = 0): void {
    if (currentDisplayStreamForLiveKit) {
        startLiveKitPublish(token, serverUrl).catch((err) =>
            log('❌ LiveKit publish error:', (err as Error).message)
        );
        return;
    }
    if (attempt >= LIVEKIT_PUBLISH_RETRY_MAX) {
        log('⚠️ LiveKit: gave up publishing (stream never ready)');
        return;
    }
    log(`⚠️ LiveKit: stream not ready yet, retry in ${LIVEKIT_PUBLISH_RETRY_MS}ms (${attempt + 1}/${LIVEKIT_PUBLISH_RETRY_MAX})`);
    setTimeout(() => tryStartLiveKitPublishWithRetry(token, serverUrl, attempt + 1), LIVEKIT_PUBLISH_RETRY_MS);
}

async function startLiveKitPublish(token: string, serverUrl: string): Promise<void> {
    const stream = currentDisplayStreamForLiveKit;
    if (!stream) {
        log('⚠️ LiveKit: no display stream available');
        return;
    }
    if (liveKitRoom) {
        await liveKitRoom.disconnect();
        liveKitRoom = null;
    }
    const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        stopLocalTrackOnUnpublish: false, // stream is shared with MediaRecorder; do not stop tracks on disconnect
    });
    liveKitRoom = room;
    room.on('disconnected', () => log('🔌 LiveKit disconnected'));
    room.on('reconnecting', () => log('🔄 LiveKit reconnecting...'));
    room.on('reconnected', () => log('✅ LiveKit reconnected'));
    await room.connect(serverUrl, token);
    log('✅ LiveKit connected to room');
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    log(`📹 Stream: ${videoTracks.length} video, ${audioTracks.length} audio track(s)`);
    if (videoTracks.length > 0) {
        try {
            const lv = new LocalVideoTrack(videoTracks[0], undefined, true);
            lv.source = Track.Source.ScreenShare;
            await room.localParticipant.publishTrack(lv, {
                name: 'screen',
                source: Track.Source.ScreenShare,
            });
            log('✅ LiveKit video (screen) published');
        } catch (err) {
            log('❌ LiveKit publish video failed:', (err as Error).message);
        }
    }
    if (audioTracks.length > 0) {
        try {
            const la = new LocalAudioTrack(audioTracks[0], undefined, true);
            await room.localParticipant.publishTrack(la, {
                name: 'microphone',
                source: Track.Source.Microphone,
            });
            log('✅ LiveKit audio published');
        } catch (err) {
            log('❌ LiveKit publish audio failed:', (err as Error).message);
        }
    }
    log('✅ LiveKit publishing done');
}

function stopLiveKitPublish(): void {
    if (liveKitRoom) {
        liveKitRoom.disconnect();
        liveKitRoom = null;
        log('🛑 LiveKit publish stopped');
    }
}



// === Full Call Video Recording (continuous, no restarts) ===
// AudioContext used to mix tab + mic audio into a single stream for recording
let mixerCtx: AudioContext | null = null;
let mixerDest: MediaStreamAudioDestinationNode | null = null;

function startFullCallRecording(tabVideoStream: MediaStream, micAudioStream?: MediaStream | null) {
    fullCallChunks = [];

    // Mix tab audio + mic audio into one audio track using AudioContext
    mixerCtx = new AudioContext();
    mixerDest = mixerCtx.createMediaStreamDestination();

    // Tab audio (lead)
    const tabAudioTracks = tabVideoStream.getAudioTracks();
    if (tabAudioTracks.length > 0) {
        const tabSource = mixerCtx.createMediaStreamSource(new MediaStream(tabAudioTracks));
        tabSource.connect(mixerDest);
        log('🔊 Mixed tab audio into recording');
    }

    // Mic audio (seller)
    if (micAudioStream && micAudioStream.getAudioTracks().length > 0) {
        const micSource = mixerCtx.createMediaStreamSource(micAudioStream);
        micSource.connect(mixerDest);
        log('🎤 Mixed mic audio into recording');
    }

    // Build final stream: video from tab + mixed audio
    const videoTrack = tabVideoStream.getVideoTracks()[0];
    const mixedAudioTrack = mixerDest.stream.getAudioTracks()[0];
    const recordingStream = new MediaStream();
    if (videoTrack) recordingStream.addTrack(videoTrack);
    if (mixedAudioTrack) recordingStream.addTrack(mixedAudioTrack);

    const mimeType = ['video/webm;codecs=opus,vp9', 'video/webm;codecs=opus,vp8', 'video/webm']
        .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

    fullCallRecorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond: 500000, // 500kbps for storage efficiency
        audioBitsPerSecond: 64000,
    });

    const MAX_RECORDING_CHUNKS = 3600; // ~1h at 1 chunk/sec
    fullCallRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
            if (fullCallChunks.length < MAX_RECORDING_CHUNKS) {
                fullCallChunks.push(event.data);
            } else if (fullCallChunks.length === MAX_RECORDING_CHUNKS) {
                log('⚠️ Recording chunk limit reached, stopping collection');
            }
        }
    };

    fullCallRecorder.onerror = (event: any) => {
        log('❌ Full call recorder error:', event.error?.message);
    };

    fullCallRecorder.start(2000); // 2s chunks
    log('🎬 Full call video recording started (video + mixed audio)');
}

interface UploadConfig {
    supabaseUrl: string;
    supabaseAnonKey: string;
    accessToken: string;
    callId: string;
}

async function stopFullCallRecordingAndUpload(config?: UploadConfig): Promise<string | null> {
    if (!fullCallRecorder || fullCallChunks.length === 0) {
        log('⚠️ No full call recording to upload');
        return null;
    }
    if (!config || !config.supabaseUrl || !config.callId) {
        log('❌ Upload config missing (supabaseUrl or callId)');
        fullCallChunks = [];
        fullCallRecorder = null;
        return null;
    }

    return new Promise((resolve) => {
        const recorder = fullCallRecorder!;

        const doUpload = async () => {
            const blob = new Blob(fullCallChunks, { type: recorder.mimeType || 'video/webm' });
            fullCallChunks = [];
            fullCallRecorder = null;

            if (blob.size < 10000) {
                log('⚠️ Recording too small, skipping upload');
                resolve(null);
                return;
            }

            log(`🎬 Full call recording: ${(blob.size / 1024 / 1024).toFixed(1)} MB, uploading...`);

            try {
                const { supabaseUrl, supabaseAnonKey, accessToken, callId } = config;
                const dateStr = new Date().toISOString().split('T')[0];
                const filePath = `${dateStr}/${callId}_video.webm`;

                const uploadUrl = `${supabaseUrl}/storage/v1/object/call-recordings/${filePath}`;
                const headers: Record<string, string> = {
                    'apikey': supabaseAnonKey,
                    'Content-Type': blob.type || 'video/webm',
                };
                if (accessToken) {
                    headers['Authorization'] = `Bearer ${accessToken}`;
                }

                log(`📤 Uploading to: ${uploadUrl}`);
                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    headers,
                    body: blob,
                });

                if (!response.ok) {
                    const errText = await response.text();
                    log(`❌ Upload failed (${response.status}): ${errText}`);
                    resolve(null);
                    return;
                }

                const publicUrl = `${supabaseUrl}/storage/v1/object/public/call-recordings/${filePath}`;
                log(`✅ Video recording uploaded: ${publicUrl}`);
                resolve(publicUrl);
            } catch (err: any) {
                log('❌ Upload error:', err.message);
                resolve(null);
            }
        };

        if (recorder.state !== 'inactive') {
            recorder.onstop = () => doUpload();
            recorder.stop();
        } else {
            doUpload();
        }
    });
}

function startRecordingCycle(
    stream: MediaStream,
    mimeType: string,
    role: 'lead' | 'seller',
    analyser: AnalyserNode | null
) {
    if (!isRecording) return;

    const options = mimeType ? { mimeType, audioBitsPerSecond: 64000 } : { audioBitsPerSecond: 64000 };
    const recorder = new MediaRecorder(stream, options);

    recorder.ondataavailable = (event) => {
        if (!event.data || event.data.size === 0) return;
        if (role === 'seller' && sellerPaused) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64Index = dataUrl.indexOf(';base64,');
            const base64 = base64Index >= 0 ? dataUrl.slice(base64Index + 8) : dataUrl.split(',')[1];
            if (!base64) return;
            const isHeader = !webmHeaders[role];
            if (isHeader) {
                webmHeaders[role] = base64;
                log(`📦 [${role}] WebM header captured (${event.data.size} bytes)`);
            }
            chrome.runtime.sendMessage({
                type: 'AUDIO_SEGMENT',
                data: base64,
                size: event.data.size,
                role,
                isStreamChunk: true,
                isHeader,
            }).catch(err => log(`❌ [${role}] send error:`, (err as Error).message));
        };
        reader.readAsDataURL(event.data);
    };

    recorder.onerror = (event: any) => {
        log(`❌ [${role}] Recorder error:`, event.error?.message);
        if (isRecording) {
            delete webmHeaders[role];
            setTimeout(() => startRecordingCycle(stream, mimeType, role, analyser), 500);
        }
    };

    recorder.start(RECORDING_TIMESLICE_MS);

    if (role === 'lead') tabRecorder = recorder as MediaRecorder;
    else micRecorder = recorder as MediaRecorder;
}

async function stopTranscription(uploadConfig?: UploadConfig) {
    log('🛑 Stopping transcription...');
    isRecording = false;

    [tabRecorder, micRecorder].forEach(r => {
        if (r && r.state !== 'inactive') r.stop();
    });
    tabRecorder = null;
    micRecorder = null;
    delete webmHeaders['lead'];
    delete webmHeaders['seller'];

    // Upload full call recording before stopping streams
    let videoRecordingUrl: string | null = null;
    try {
        videoRecordingUrl = await stopFullCallRecordingAndUpload(uploadConfig);
    } catch (err: any) {
        log('⚠️ Video upload failed:', err.message);
    }

    // Stop media streaming (includes LiveKit disconnect)
    stopMediaStreaming();

    // Close all AudioContext instances (including mixer used for recording)
    await Promise.allSettled(
        [playbackContext, tabAnalyserCtx, micAnalyserCtx, mixerCtx]
            .filter(Boolean)
            .map(ctx => ctx!.close())
    );
    mixerCtx = null;
    mixerDest = null;
    playbackContext = null;
    tabAnalyserCtx = null;
    micAnalyserCtx = null;

    [tabStream, micStream].forEach(s => {
        if (s) s.getTracks().forEach(t => t.stop());
    });
    tabStream = null;
    micStream = null;
    tabAnalyser = null;
    micAnalyser = null;

    log('✅ Stopped');
    chrome.runtime.sendMessage({
        type: 'RECORDING_STOPPED',
        videoRecordingUrl,
    }).catch(() => { });
}
