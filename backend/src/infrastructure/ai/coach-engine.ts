import { ObjectionMatcher } from "./objection-matcher";
import { TriggerDetector, TriggerResult } from "./trigger-detector";
import { PromptBuilder } from "./prompt-builder";
import { OpenAIClient } from "./openai-client";
import { ResponseParser, ParsedResponse } from "./response-parser";
import { CallSession, TranscriptChunk } from "../websocket/server";
import { ObjectionSuccessTracker } from "./objection-success-tracker";

export interface CoachEvent {
    type: 'tip' | 'alert' | 'reinforcement' | 'objection' | 'buying_signal' | 'stage_change' | 'lead_profile';
    content?: string;
    urgency?: 'low' | 'medium' | 'high';
    metadata?: any;
    // Specific fields for certain events
    currentStep?: number;
    stepName?: string;
    progress?: number;
    signal?: string;
    suggestion?: string;
    isTopRecommendation?: boolean; // NEW: Flag for high-success responses
}

export class CoachEngine {
    constructor(
        private triggerDetector: TriggerDetector,
        private objectionMatcher: ObjectionMatcher,
        private promptBuilder: PromptBuilder,
        private openaiClient: OpenAIClient,
        private responseParser: ResponseParser,
        private successTracker: ObjectionSuccessTracker // NEW: Dependency
    ) { }

    async processTranscriptChunk(chunk: TranscriptChunk, session: CallSession & { lastCoachingAt?: number, silenceSince?: number, lastCoaching?: string, objectionsFaced?: string[] }): Promise<CoachEvent[]> {
        const events: CoachEvent[] = [];

        // 1. Checar cache de objeções (instantâneo)
        // In real usage, objections should be loaded from session or DB
        const matchedObjection = this.objectionMatcher.match(chunk.text, []);

        if (matchedObjection && matchedObjection.score > 0.7) {
            // Check success rate
            let isTop = false;
            try {
                const rate = await this.successTracker.getSuccessRate(matchedObjection.id, session.scriptId);
                // If success rate is > 40% (example threshold) or it is the best performing one
                if (rate > 0.4) {
                    isTop = true;
                }
            } catch (e) {
                console.error("Error fetching success rate", e);
            }

            events.push({
                type: 'objection',
                content: matchedObjection.coachingTip,
                urgency: isTop ? 'high' : 'medium', // Higher urgency for top tips
                isTopRecommendation: isTop,
                metadata: {
                    objection: matchedObjection.triggerPhrase,
                    mentalTrigger: matchedObjection.mentalTrigger,
                    suggestedResponse: matchedObjection.suggestedResponse,
                    successRate: isTop ? 'High' : 'Normal'
                }
            });
        }

        // 2. Checar triggers para LLM
        const trigger = this.triggerDetector.evaluate(session, chunk);
        if (!trigger.shouldTrigger) return events;

        // 3. Construir prompt e chamar LLM
        const mockScript = {
            name: "Default Script",
            coach_personality: "Strategic",
            coach_tone: "Direct",
            intervention_level: "High",
            steps: []
        };

        const { system, user } = this.promptBuilder.build(session, trigger, mockScript as any);

        try {
            const llmResponse = await this.openaiClient.streamCoaching(system, user);
            const parsed = this.responseParser.parse(llmResponse);

            if (parsed.shouldSkipResponse) return events;

            // 4. Gerar eventos
            if (parsed.coaching) {
                events.push({
                    type: parsed.coaching.type,
                    content: parsed.coaching.content,
                    urgency: parsed.coaching.urgency
                });
            }

            if (parsed.stageChanged) {
                events.push({
                    type: 'stage_change',
                    currentStep: parsed.currentStep,
                    progress: 0
                });
                session.currentStep = parsed.currentStep;
            }

            if (parsed.coaching?.type === 'buying_signal') {
                // Special handling
            }

            // 5. Update Session State
            if (parsed.nextStep) {
                // session.nextStep = parsed.nextStep;
            }

            if (parsed.leadProfile) {
                // session.leadProfile = ...
            }

        } catch (error) {
            console.error("Coach Engine Error", error);
        }

        return events;
    }
}

