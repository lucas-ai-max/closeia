import { OpenAIClient } from "./openai-client.js";
import { TranscriptChunk } from "../websocket/server.js";

export interface LiveSummary {
    status: string;
    summary_points: string[];
    sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Tense';
    spin_phase?: string;
}

const SUMMARY_SYSTEM_PROMPT = `
Você é um Assistente Executivo de Vendas que monitora chamadas ao vivo.
Seu objetivo: fornecer um "Resumo Estratégico" para o Gestor de Vendas a cada 20 segundos.

# REGRAS
1. IGNORE falas triviais ("Olá", "Tudo bem?", "Então...", silêncios).
2. FOQUE APENAS em:
   - **Dores do Cliente**: Quais problemas, insatisfações ou necessidades foram mencionados?
   - **Status da Negociação**: Em que ponto estamos? (Descoberta, Apresentação, Objeção, Fechamento)
   - **Clima da Call**: O lead está engajado, resistente, ansioso, entusiasta?
3. Se nada relevante aconteceu, diga "Conversa em fase inicial, sem insights estratégicos ainda."
4. Máximo 3 pontos em summary_points. Cada ponto deve ser uma frase curta e acionável.
5. Responda em português brasileiro.

# FORMATO (JSON OBRIGATÓRIO)
{
    "status": "Fase da negociação (ex: Descoberta de Dores, Contorno de Objeção, Fechamento)",
    "summary_points": ["Ponto estratégico 1", "Ponto estratégico 2", "Ponto estratégico 3"],
    "sentiment": "Positive" | "Neutral" | "Negative" | "Tense",
    "spin_phase": "Situation" | "Problem" | "Implication" | "Need-Payoff"
}
`;

export class SummaryAgent {
    constructor(private openaiClient: OpenAIClient) { }

    async generateLiveSummary(transcript: TranscriptChunk[]): Promise<LiveSummary | null> {
        if (transcript.length === 0) return null;

        const recentTranscript = transcript
            .slice(-15)
            .map(t => `${t.speaker}: ${t.text}`)
            .join('\n');

        const userPrompt = `
Transcrição recente da chamada:
${recentTranscript}

Gere o Resumo Estratégico em JSON.
`;

        try {
            return await this.openaiClient.completeJson<LiveSummary>(
                SUMMARY_SYSTEM_PROMPT,
                userPrompt
            );
        } catch (error) {
            console.error("SummaryAgent Error", error);
            return null;
        }
    }
}
