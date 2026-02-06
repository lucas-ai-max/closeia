import OpenAI from 'openai';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/utils/logger.js';

export class WhisperClient {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY
        });
    }

    async transcribe(audioBuffer: Buffer, prompt?: string): Promise<string> {
        try {
            logger.info('🎤 Transcribing audio with Whisper...');

            // Create File object from buffer
            const file = new File([audioBuffer], 'audio.webm', {
                type: 'audio/webm'
            });

            const response = await this.openai.audio.transcriptions.create({
                file: file,
                model: 'whisper-1',
                language: 'pt',
                response_format: 'text',
                prompt: prompt
            });

            logger.info('✅ Transcription completed');
            return response as unknown as string;
        } catch (err) {
            logger.error('❌ Whisper transcription failed:', err);
            throw err;
        }
    }
}
