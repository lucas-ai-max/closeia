/// <reference lib="dom" />

let recognition: any = null;
let mediaStream: MediaStream | null = null;

chrome.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'INIT_RECORDING') {
        startTranscription(message.streamId);
    } else if (message.type === 'STOP_RECORDING') {
        stopTranscription();
    }
});

async function startTranscription(streamId: string) {
    try {
        // 1. Get Media Stream from streamId
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId,
                },
            } as any,
            video: false,
        });

        // Create AudioContext to keep stream active (sometimes needed for Chrome to keep receiving audio)
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(audioContext.destination); // Connect to output (speakers) so it doesn't mute tab? 
        // Wait... if we connect to destination, user hears themselves properly? 
        // tabCapture mutes the tab by default. We generally want to play it back via AudioContext to default destination if we want user to hear it.

        mediaStream = stream;

        // 2. Setup Speech Recognition
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript || interimTranscript) {
                chrome.runtime.sendMessage({
                    type: 'TRANSCRIPT_RESULT',
                    data: {
                        text: finalTranscript || interimTranscript,
                        isFinal: !!finalTranscript,
                        timestamp: Date.now()
                    }
                });
            }
        }

        recognition.onend = () => {
            // Auto restart if still recording
            if (mediaStream) {
                try { recognition.start(); } catch (e) { }
            }
        }

        recognition.onerror = (event: any) => {
            console.error('Speech error', event.error);
        }

        recognition.start();

    } catch (err) {
        console.error('Offscreen error', err);
    }
}

function stopTranscription() {
    if (recognition) recognition.stop();
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
    }
}
