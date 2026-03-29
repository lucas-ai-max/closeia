'use client';

import { useEffect, useRef, useState } from 'react';

interface MediaStreamPlayerProps {
    callId: string;
    wsUrl: string;
    token: string;
}

const WAITING_HINT_AFTER_MS = 12000;
/** Keep this many seconds of buffer; remove older data to avoid QuotaExceededError. */
const BUFFER_KEEP_SECONDS = 8;
/** Interval (ms) for proactive buffer trim. */
const BUFFER_TRIM_INTERVAL_MS = 4000;
/** If playback is more than this many seconds behind buffer end, seek to live edge to prevent stall. */
const LIVE_EDGE_SEEK_THRESHOLD_SEC = 4;
const LIVE_EDGE_SEEK_INTERVAL_MS = 2000;
/** Only remove old buffer when we have at least this many seconds ahead (avoids DEMUXER_UNDERFLOW). */
const MIN_BUFFER_AHEAD_BEFORE_TRIM_SEC = 10;

const WEBM_EBML = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);
const MIN_INIT_SEGMENT_BYTES = 100;

function isWebMInit(bytes: Uint8Array): boolean {
    if (bytes.length < MIN_INIT_SEGMENT_BYTES) return false;
    return bytes[0] === WEBM_EBML[0] && bytes[1] === WEBM_EBML[1] && bytes[2] === WEBM_EBML[2] && bytes[3] === WEBM_EBML[3];
}

/** Binary frame from backend: 1 byte flag (0x01=header, 0x00=data) + chunk bytes. */
function parseBinaryMediaChunk(data: ArrayBuffer): { bytes: Uint8Array; isHeader: boolean } | null {
    if (data.byteLength < 2) return null;
    const view = new Uint8Array(data);
    const isHeader = view[0] === 0x01;
    const chunkLen = view.length - 1;
    const chunk = new Uint8Array(chunkLen);
    for (let i = 0; i < chunkLen; i++) chunk[i] = view[i + 1];
    return { bytes: chunk, isHeader };
}

export function MediaStreamPlayer({ callId, wsUrl, token }: MediaStreamPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const queueRef = useRef<{ bytes: Uint8Array; isHeader: boolean }[]>([]);
    const hasReceivedChunkRef = useRef(false);
    const hasAppendedInitRef = useRef(false);
    const sourceBufferDeadRef = useRef(false);
    const deferHeaderProcessRef = useRef(false);
    const timestampOffsetRetryCountRef = useRef(0);
    const waitingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const trimIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const liveEdgeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const playbackFallbackScheduledRef = useRef(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showWaitingHint, setShowWaitingHint] = useState(false);

    // Process the queue when SourceBuffer is ready
    const processQueue = () => {
        if (sourceBufferDeadRef.current) return;
        const sourceBuffer = sourceBufferRef.current;
        const mediaSource = mediaSourceRef.current;
        const video = videoRef.current;
        const queue = queueRef.current;

        if (!sourceBuffer || !mediaSource || sourceBuffer.updating || queue.length === 0) return;
        if (video?.error) {
            console.warn('[LIVE_DEBUG] Video element error:', video.error.code, video.error.message);
            sourceBufferDeadRef.current = true;
            setError('Playback error');
            return;
        }

        const item = queue.shift();
        if (!item) return;
        const { bytes, isHeader } = item;
        if (bytes.length === 0) { processQueue(); return; }

        // Skip invalid headers
        if (isHeader && !isWebMInit(bytes)) {
            console.warn('[LIVE_DEBUG] Skipping invalid header chunk');
            processQueue();
            return;
        }

        // Wait for init segment before appending data
        if (!isHeader && !hasAppendedInitRef.current) {
            // Drop data chunks that arrive before header instead of re-queuing (prevents infinite loop)
            return;
        }

        try {
            // On new header after init: reset timestampOffset to continue from current duration
            if (isHeader && hasAppendedInitRef.current) {
                const duration = mediaSource.duration;
                const offset = Number.isFinite(duration) && duration > 0 ? duration : 0;
                try {
                    sourceBuffer.timestampOffset = offset;
                } catch {
                    // If we can't set offset, just append anyway
                }
            }

            if (isHeader) {
                hasAppendedInitRef.current = true;
                console.log('[LIVE_DEBUG] Init segment appended, size=', bytes.byteLength);
            }

            const copy = new Uint8Array(bytes.byteLength);
            copy.set(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
            sourceBuffer.appendBuffer(copy.buffer);

            // Try to play
            if (video?.paused && video.readyState >= 2 && !video.error) {
                video.play().catch(() => {});
            }
            if (video && !playbackFallbackScheduledRef.current && hasAppendedInitRef.current) {
                playbackFallbackScheduledRef.current = true;
                setTimeout(() => {
                    const v = videoRef.current;
                    if (v && (v.readyState >= 2 || v.currentTime > 0)) {
                        if (v.paused) v.play().catch(() => {});
                        setIsPlaying(true);
                    }
                }, 2000);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn('[LIVE_DEBUG] appendBuffer error:', msg);

            if (msg.includes('removed from the parent') || msg.includes('error attribute')) {
                sourceBufferDeadRef.current = true;
                sourceBufferRef.current = null;
                setError('Playback error');
                return;
            }
            if (msg.includes('QuotaExceeded') || msg.includes('QUOTA_EXCEEDED')) {
                queue.unshift(item);
                try {
                    const ct = video?.currentTime ?? 0;
                    const end = Math.max(0, ct - BUFFER_KEEP_SECONDS);
                    if (sourceBuffer.buffered.length > 0 && end > 0) {
                        sourceBuffer.remove(0, end);
                    } else {
                        setTimeout(processQueue, 300);
                    }
                } catch {
                    setTimeout(processQueue, 500);
                }
                return;
            }
            // For other errors (PARSING_MEDIA_SEGMENT etc), just skip the chunk and continue
            setTimeout(processQueue, 100);
        }
    };

    useEffect(() => {
        if (!videoRef.current) return;

        console.log('[LIVE_DEBUG] MediaStreamPlayer mount callId=', callId, 'wsUrl=', wsUrl);

        queueRef.current = [];
        hasReceivedChunkRef.current = false;
        hasAppendedInitRef.current = false;
        sourceBufferDeadRef.current = false;
        deferHeaderProcessRef.current = false;
        timestampOffsetRetryCountRef.current = 0;
        playbackFallbackScheduledRef.current = false;
        setError(null);
        setIsPlaying(false);
        setShowWaitingHint(false);

        waitingTimeoutRef.current = setTimeout(() => {
            setShowWaitingHint(true);
            console.log('[LIVE_DEBUG] MediaStreamPlayer 12s timeout: no media:chunk received yet for callId=', callId);
        }, WAITING_HINT_AFTER_MS);

        // Create MediaSource
        const mediaSource = new MediaSource();
        mediaSourceRef.current = mediaSource;
        videoRef.current.src = URL.createObjectURL(mediaSource);

        const handleSourceOpen = () => {
            URL.revokeObjectURL(videoRef.current!.src); // Cleanup URL

            const videoEl = videoRef.current;
            if (videoEl) {
                videoEl.addEventListener('playing', () => setIsPlaying(true), { once: true });
                videoEl.addEventListener('canplay', () => setIsPlaying(true), { once: true });
            }

            try {
                const webmTypes = [
                    'video/webm;codecs=opus,vp9',
                    'video/webm;codecs=vp9,opus',
                    'video/webm;codecs=opus,vp8',
                    'video/webm;codecs=vp8,opus',
                    'video/webm;codecs=vp8,vorbis',
                    'video/webm;codecs=vp9',
                    'video/webm;codecs=vp8'
                ];
                const mimeType = webmTypes.find((t) => MediaSource.isTypeSupported(t)) ?? webmTypes[0];
                console.log('[LIVE_DEBUG] MediaStreamPlayer addSourceBuffer mimeType=', mimeType);

                const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
                sourceBufferRef.current = sourceBuffer;
                sourceBuffer.mode = 'segments';

                sourceBuffer.addEventListener('updateend', () => {
                    processQueue();
                });

                sourceBuffer.addEventListener('error', () => {
                    console.warn('[LIVE_DEBUG] SourceBuffer error — attempting recovery');
                    sourceBufferDeadRef.current = true;
                    sourceBufferRef.current = null;
                    try {
                        if (mediaSource.readyState === 'open') mediaSource.endOfStream();
                    } catch (_) { /* ignore */ }

                    // Auto-recover: recreate MediaSource after brief pause
                    setTimeout(() => {
                        if (!videoRef.current) return;
                        console.log('[LIVE_DEBUG] Recreating MediaSource after error');
                        sourceBufferDeadRef.current = false;
                        hasAppendedInitRef.current = false;
                        queueRef.current = [];
                        setError(null);

                        const newMS = new MediaSource();
                        mediaSourceRef.current = newMS;
                        videoRef.current!.src = URL.createObjectURL(newMS);
                        newMS.addEventListener('sourceopen', () => {
                            URL.revokeObjectURL(videoRef.current!.src);
                            try {
                                const webmTypes = [
                                    'video/webm;codecs=opus,vp9',
                                    'video/webm;codecs=vp9,opus',
                                    'video/webm;codecs=opus,vp8',
                                    'video/webm;codecs=vp8,opus',
                                    'video/webm;codecs=vp8,vorbis',
                                    'video/webm;codecs=vp9',
                                    'video/webm;codecs=vp8'
                                ];
                                const mimeType = webmTypes.find((t) => MediaSource.isTypeSupported(t)) ?? webmTypes[0];
                                const newSB = newMS.addSourceBuffer(mimeType);
                                sourceBufferRef.current = newSB;
                                newSB.mode = 'segments';
                                newSB.addEventListener('updateend', () => processQueue());
                                newSB.addEventListener('error', () => {
                                    sourceBufferDeadRef.current = true;
                                    sourceBufferRef.current = null;
                                    setError('Playback error');
                                });
                            } catch (e) {
                                setError('Playback error');
                            }
                        });
                    }, 1500);
                });

                trimIntervalRef.current = setInterval(() => {
                    if (sourceBufferDeadRef.current) return;
                    const sb = sourceBufferRef.current;
                    const v = videoRef.current;
                    if (!sb || !v || sb.updating) return;
                    const buffered = sb.buffered;
                    if (buffered.length === 0) return;
                    const ct = v.currentTime;
                    const bufferEnd = buffered.end(buffered.length - 1);
                    if (ct <= BUFFER_KEEP_SECONDS) return;
                    if (bufferEnd - ct < MIN_BUFFER_AHEAD_BEFORE_TRIM_SEC) return;
                    const end = Math.max(0, ct - BUFFER_KEEP_SECONDS);
                    try {
                        sb.remove(0, end);
                    } catch {
                        // ignore
                    }
                }, BUFFER_TRIM_INTERVAL_MS);

                liveEdgeIntervalRef.current = setInterval(() => {
                    if (sourceBufferDeadRef.current) return;
                    const sb = sourceBufferRef.current;
                    const v = videoRef.current;
                    if (!sb || !v || v.paused) return;
                    const buffered = sb.buffered;
                    if (buffered.length === 0) return;
                    const bufferEnd = buffered.end(buffered.length - 1);
                    const ct = v.currentTime;
                    if (bufferEnd - ct > LIVE_EDGE_SEEK_THRESHOLD_SEC) {
                        const target = Math.max(ct, bufferEnd - 2);
                        if (target > ct + 0.5) {
                            v.currentTime = target;
                        }
                    }
                }, LIVE_EDGE_SEEK_INTERVAL_MS);

                const ws = new WebSocket(wsUrl);
                ws.binaryType = 'arraybuffer';
                wsRef.current = ws;

                let wsAuthenticated = false;
                ws.onopen = () => {
                    console.log('[LIVE_DEBUG] MediaStreamPlayer WS open, sending auth challenge');
                    ws.send(JSON.stringify({ type: 'auth', payload: { token } }));
                };

                ws.onmessage = (event: MessageEvent<string | ArrayBuffer>) => {
                    const data = event.data;

                    if (data instanceof ArrayBuffer) {
                        const parsed = parseBinaryMediaChunk(data);
                        if (!parsed) return;
                        const { bytes, isHeader } = parsed;
                        if (!hasReceivedChunkRef.current) {
                            hasReceivedChunkRef.current = true;
                            console.log('[LIVE_DEBUG] MediaStreamPlayer first media chunk (binary) received');
                        }
                        if (!hasAppendedInitRef.current) {
                            if (!isHeader) return;
                        }
                        if (waitingTimeoutRef.current) {
                            clearTimeout(waitingTimeoutRef.current);
                            waitingTimeoutRef.current = null;
                        }
                        queueRef.current.push({ bytes, isHeader });
                        processQueue();
                        setShowWaitingHint(false);
                        if (queueRef.current.length >= 1 && !sourceBufferDeadRef.current && videoRef.current?.paused) {
                            videoRef.current.play().catch(() => {});
                        }
                        return;
                    }

                    try {
                        const message = JSON.parse(data as string);
                        if (message.type === 'auth:ok' && !wsAuthenticated) {
                            wsAuthenticated = true;
                            console.log('[LIVE_DEBUG] MediaStreamPlayer WS authenticated, sending manager:join callId=', callId);
                            ws.send(JSON.stringify({
                                type: 'manager:join',
                                payload: { callId }
                            }));
                            return;
                        }
                        if (message.type === 'manager:joined') {
                            console.log('[LIVE_DEBUG] MediaStreamPlayer manager:joined callId=', message.payload?.callId);
                            return;
                        }
                    } catch {
                        if (!hasReceivedChunkRef.current) setError('Invalid stream data');
                    }
                };

                let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
                let reconnectAttempt = 0;
                const MAX_RECONNECT_DELAY = 10000;

                const reconnectWS = () => {
                    if (reconnectTimer) return;
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY);
                    reconnectAttempt++;
                    console.log(`[LIVE_DEBUG] MediaStreamPlayer WS reconnecting in ${delay}ms (attempt ${reconnectAttempt})`);
                    reconnectTimer = setTimeout(() => {
                        reconnectTimer = null;
                        if (!wsRef.current || wsRef.current.readyState >= WebSocket.CLOSING) {
                            const newWs = new WebSocket(wsUrl);
                            newWs.binaryType = 'arraybuffer';
                            wsRef.current = newWs;
                            newWs.onopen = ws.onopen;
                            newWs.onmessage = ws.onmessage;
                            newWs.onerror = ws.onerror;
                            newWs.onclose = ws.onclose;
                        }
                    }, delay);
                };

                ws.onerror = () => {
                    console.warn('[LIVE_DEBUG] MediaStreamPlayer WS error');
                };

                ws.onclose = () => {
                    setIsPlaying(false);
                    reconnectWS();
                };

            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Playback error';
                setError(message);
            }
        };

        mediaSource.addEventListener('sourceopen', handleSourceOpen);

        return () => {
            if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current);
            if (trimIntervalRef.current) {
                clearInterval(trimIntervalRef.current);
                trimIntervalRef.current = null;
            }
            if (liveEdgeIntervalRef.current) {
                clearInterval(liveEdgeIntervalRef.current);
                liveEdgeIntervalRef.current = null;
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (sourceBufferRef.current) {
                try {
                    sourceBufferRef.current.removeEventListener('updateend', processQueue);
                } catch (e) { }
            }
            if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
                try {
                    mediaSourceRef.current.endOfStream();
                } catch (e) { }
            }
            mediaSource.removeEventListener('sourceopen', handleSourceOpen);
        };
    }, [callId, wsUrl, token]);

    return (
        <div className="relative w-full bg-black rounded-lg overflow-hidden border border-gray-800 shadow-xl aspect-video">
            {error && (
                <div className="absolute top-2 left-2 bg-red-500/90 text-white px-3 py-1 rounded text-sm z-20 font-medium">
                    {error}
                </div>
            )}

            {!isPlaying && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10 backdrop-blur-sm">
                    <div className="text-white text-center px-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500 mx-auto mb-3" />
                        <p className="text-gray-300 text-sm font-medium animate-pulse">
                            {showWaitingHint
                                ? 'Aguardando transmissão. Peça ao vendedor para clicar em Iniciar na extensão (aba do Meet).'
                                : 'Conectando ao feed ao vivo...'}
                        </p>
                    </div>
                </div>
            )}

            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                autoPlay
                controls
                playsInline
            />

            {isPlaying && (
                <div className="absolute top-3 right-3 bg-red-600/90 text-white px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-sm animate-pulse z-20">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    LIVE
                </div>
            )}
        </div>
    );
}
