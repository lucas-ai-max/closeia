import OpenAI from 'openai';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/utils/logger.js';
import { UsageTracker, UsageInfo } from './usage-tracker.js';

export class OpenAIClient {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 60_000 });
    }

    async streamCoaching(systemPrompt: string, userPrompt: string, callId?: string): Promise<string> {
        let fullResponse = '';

        const stream = await this.client.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 500,
            temperature: 0.3,
            stream: true,
            stream_options: { include_usage: true },
            response_format: { type: 'json_object' }
        });

        let usage: UsageInfo | null = null;
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            fullResponse += delta;
            if (chunk.usage) {
                usage = {
                    prompt_tokens: chunk.usage.prompt_tokens ?? 0,
                    completion_tokens: chunk.usage.completion_tokens ?? 0,
                    cached_tokens: (chunk.usage as any).prompt_tokens_details?.cached_tokens ?? 0,
                    total_tokens: chunk.usage.total_tokens ?? 0,
                    model: 'gpt-4.1-mini',
                };
            }
        }

        if (callId && usage) {
            UsageTracker.logOpenAI({ callId }, 'streamCoaching', usage).catch(err => logger.warn({ err }, 'Failed to log usage'));
        }

        return fullResponse;
    }

    async analyzePostCall(systemPrompt: string, userPrompt: string, callId?: string): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 4000,
            temperature: 0.2,
            response_format: { type: 'json_object' }
        });

        if (callId && response.usage) {
            const usage: UsageInfo = {
                prompt_tokens: response.usage.prompt_tokens,
                completion_tokens: response.usage.completion_tokens,
                cached_tokens: (response.usage as any).prompt_tokens_details?.cached_tokens ?? 0,
                total_tokens: response.usage.total_tokens,
                model: 'gpt-4.1-mini',
            };
            UsageTracker.logOpenAI({ callId }, 'analyzePostCall', usage).catch(err => logger.warn({ err }, 'Failed to log usage'));
        }

        return response.choices[0]?.message?.content || '{}';
    }

    /** Yields individual tokens from a streaming LLM coaching response. */
    async *streamCoachingTokens(
        systemPrompt: string,
        userPrompt: string,
        callId?: string
    ): AsyncGenerator<string> {
        const stream = await this.client.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 500,
            temperature: 0.3,
            stream: true,
            stream_options: { include_usage: true },
            response_format: { type: 'json_object' }
        });

        let usage: UsageInfo | null = null;
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            if (delta) yield delta;
            if (chunk.usage) {
                usage = {
                    prompt_tokens: chunk.usage.prompt_tokens ?? 0,
                    completion_tokens: chunk.usage.completion_tokens ?? 0,
                    cached_tokens: (chunk.usage as any).prompt_tokens_details?.cached_tokens ?? 0,
                    total_tokens: chunk.usage.total_tokens ?? 0,
                    model: 'gpt-4.1-mini',
                };
            }
        }

        if (callId && usage) {
            UsageTracker.logOpenAI({ callId }, 'streamCoachingTokens', usage).catch(err => logger.warn({ err }, 'Failed to log usage'));
        }
    }

    async completeText(systemPrompt: string, userPrompt: string, callId?: string): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 4000,
            temperature: 0.2,
        });

        if (callId && response.usage) {
            const usage: UsageInfo = {
                prompt_tokens: response.usage.prompt_tokens,
                completion_tokens: response.usage.completion_tokens,
                cached_tokens: (response.usage as any).prompt_tokens_details?.cached_tokens ?? 0,
                total_tokens: response.usage.total_tokens,
                model: 'gpt-4.1-mini',
            };
            UsageTracker.logOpenAI({ callId }, 'completeText', usage).catch(err => logger.warn({ err }, 'Failed to log usage'));
        }

        return response.choices[0]?.message?.content || '';
    }

    async completeJson<T>(systemPrompt: string, userPrompt: string, callId?: string): Promise<T | null> {
        try {
            const response = await this.client.chat.completions.create({
                model: 'gpt-4.1-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 500,
                temperature: 0.2,
                response_format: { type: 'json_object' }
            });

            if (callId && response.usage) {
                const usage: UsageInfo = {
                    prompt_tokens: response.usage.prompt_tokens,
                    completion_tokens: response.usage.completion_tokens,
                    cached_tokens: (response.usage as any).prompt_tokens_details?.cached_tokens ?? 0,
                    total_tokens: response.usage.total_tokens,
                    model: 'gpt-4.1-mini',
                };
                UsageTracker.logOpenAI({ callId }, 'completeJson', usage).catch(err => logger.warn({ err }, 'Failed to log usage'));
            }

            const content = response.choices[0]?.message?.content;
            if (!content) return null;
            return JSON.parse(content) as T;
        } catch (error) {
            logger.error({ err: error }, 'OpenAI completeJson failed');
            return null;
        }
    }
}

export const openaiClient = new OpenAIClient();
