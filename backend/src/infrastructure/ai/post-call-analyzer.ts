import { CallSession } from "./coach-engine";
import { OpenAIClient } from "./openai-client";

export class PostCallAnalyzer {
    constructor(private openaiClient: OpenAIClient) { }

    async generate(session: CallSession, scriptName: string, steps: string[]) {
        const systemPrompt = `Você é um analista de vendas. Analise a transcrição completa da call e gere um relatório JSON com:
{
  "script_adherence_score": number (0-100),
  "strengths": ["pontos fortes do vendedor"],
  "improvements": ["pontos a melhorar"],
  "objections_faced": [{ "objection": "texto", "handled": boolean, "response": "como respondeu" }],
  "buying_signals": ["sinais detectados"],
  "lead_sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED",
  "result": "CONVERTED" | "FOLLOW_UP" | "LOST" | "UNKNOWN",
  "ai_notes": "resumo livre com recomendações para a próxima interação"
}`;

        const transcriptText = session.transcript.map(t => `[${t.speaker.toUpperCase()}] ${t.text}`).join('\n');

        const userPrompt = `Script: ${scriptName}
Etapas: ${steps.join(' → ')}

Transcrição completa:
${transcriptText}`;

        const raw = await this.openaiClient.analyzePostCall(systemPrompt, userPrompt);
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse post-call analysis', e);
            return {};
        }
    }
}
