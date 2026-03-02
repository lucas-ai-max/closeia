import { z } from 'zod';
import { logger } from '../../shared/utils/logger.js';

export type ParsedResponse = z.infer<typeof ResponseSchema>;

const ResponseSchema = z.object({
    currentStep: z.number(),
    coaching: z.object({
        type: z.enum(['tip', 'alert', 'reinforcement', 'objection', 'buying_signal']),
        urgency: z.enum(['low', 'medium', 'high']),
        content: z.string().max(300)
    }).nullable(),
    nextStep: z.object({
        action: z.string(),
        question: z.string().nullable()
    }).nullable(),
    leadProfile: z.object({
        type: z.enum(['emotional', 'rational', 'skeptical', 'anxious', 'enthusiastic']),
        concerns: z.array(z.string()),
        interests: z.array(z.string()),
        buyingSignals: z.array(z.string())
    }).nullable(),
    spinStage: z.string().optional(),
    stageChanged: z.boolean(),
    shouldSkipResponse: z.boolean()
});

export class ResponseParser {
    parse(raw: string): ParsedResponse {
        try {
            // Remove markdown code blocks if present (though response_format usually avoids this)
            const cleaned = raw.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return ResponseSchema.parse(parsed);
        } catch (e) {
            logger.error({ err: e }, 'Failed to parse LLM response');
            // Fallback safe response
            return {
                shouldSkipResponse: true,
                currentStep: 1,
                stageChanged: false,
                coaching: null,
                nextStep: null,
                leadProfile: null
            };
        }
    }
}
