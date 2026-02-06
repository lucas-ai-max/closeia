import { ObjectionMatcher } from "./objection-matcher";
import { TriggerDetector, TriggerResult } from "./trigger-detector";
import { PromptBuilder } from "./prompt-builder";
import { OpenAIClient } from "./openai-client";
import { ResponseParser, ParsedResponse } from "./response-parser";
import { CallSession, TranscriptChunk } from "../websocket/server";

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
}

export class CoachEngine {
    constructor(
        private triggerDetector: TriggerDetector,
        private objectionMatcher: ObjectionMatcher,
        private promptBuilder: PromptBuilder,
        private openaiClient: OpenAIClient,
        private responseParser: ResponseParser
    ) { }

    async processTranscriptChunk(chunk: TranscriptChunk, session: CallSession & { lastCoachingAt?: number, silenceSince?: number, lastCoaching?: string, objectionsFaced?: string[] }): Promise<CoachEvent[]> {
        const events: CoachEvent[] = [];

        // 1. Checar cache de objeções (instantâneo)
        // Note: In real app, we need to fetch objections list from somewhere (Redis or passed in session)
        // For MVP we assume session has a loaded script/objections or we ignore it if not passed
        // This example assumes we might load objections from DB or Cache, skipping implementations details for dependency injection complexity
        const matchedObjection = this.objectionMatcher.match(chunk.text, []); // Passing empty for now as we don't have objections loaded in session yet

        if (matchedObjection && matchedObjection.score > 0.7) {
            events.push({
                type: 'objection',
                content: matchedObjection.coachingTip,
                urgency: 'high',
                metadata: {
                    objection: matchedObjection.triggerPhrase,
                    mentalTrigger: matchedObjection.mentalTrigger,
                    suggestedResponse: matchedObjection.suggestedResponse
                }
            });
            // If objection matched strongly, we might skip LLM or force it.
            // Let's continue to LLM only if trigger says so, but usually objection response is enough.
        }

        // 2. Checar triggers para LLM
        const trigger = this.triggerDetector.evaluate(session, chunk);
        if (!trigger.shouldTrigger) return events;

        // 3. Construir prompt e chamar LLM
        // Mocking script data for MVP as it's not fully in session yet
        const mockScript = {
            name: "Default Script",
            coach_personality: "Strategic",
            coach_tone: "Direct",
            intervention_level: "High",
            steps: [] // Should be populated from DB
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
                    // stepName lookup would happen here
                    progress: 0 // calc progress
                });
                session.currentStep = parsed.currentStep;
            }

            if (parsed.coaching?.type === 'buying_signal') {
                // Special handling if needed, or just let it pass as coaching event
            }

            // 5. Update Session State (in memory, caller persists)
            if (parsed.nextStep) {
                // session.nextStep = parsed.nextStep;
            }

            if (parsed.leadProfile) {
                // session.leadProfile = ...
            }

            // Update local tracking
            // Use mutable session object or return updates
            // In this architecture, we return events and caller updates DB/Redis

        } catch (error) {
            console.error("Coach Engine Error", error);
        }

        return events;
    }
}
