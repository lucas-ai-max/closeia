import { OpenAIClient } from "./openai-client.js";
import { logger } from '../../shared/utils/logger.js';

// ─── Interfaces ───────────────────────────────────────────────

export interface SpinAnalysis {
    phase: 'S' | 'P' | 'I' | 'N';
    objection: string | null;
    tip: string;
    /** Pergunta que o vendedor deve FAZER ao lead. */
    suggested_question: string | null;
    /** Resposta pronta que o vendedor deve DIZER ao cliente quando ele pergunta, objeta ou levanta dúvida. */
    suggested_response: string | null;
}

const SPIN_SYSTEM_PROMPT = `
Você é um Coach de Vendas SPIN em tempo real auxiliando o VENDEDOR. Duas funções principais:
1) Sugerir PERGUNTAS que o vendedor deve fazer ao lead (SPIN).
2) Sugerir a RESPOSTA exata que o vendedor deve dar quando o lead pergunta, objeta ou levanta dúvida.

## IDENTIFICAÇÃO DE PAPÉIS (CRÍTICO)
Na transcrição fornecida, as falas estão estritamente marcadas com o nome de quem falou:
- Falas marcadas como **"VENDEDOR: "** (ou o nome do vendedor) são do coachee (você está ajudando esta pessoa).
- Falas marcadas como **"LEAD: "** (ou o nome do cliente) são do cliente/prospect.
NUNCA confunda quem disse o quê. Leia as etiquetas antes de cada frase com máxima atenção.

## RESPOSTA AO CLIENTE (suggested_response)
Sempre que o LEAD fizer uma pergunta, levantar objeção (preço, tempo, "me manda material", desconfiança) ou dúvida, preencha "suggested_response" com a frase PRONTA que o vendedor deve dizer ao cliente — 1 ou 2 frases curtas. Exemplos:
- "Quanto custa?" → suggested_response com enquadramento (valor, investimento, próximo passo).
- "Preciso pensar." / "Vou falar com meu sócio." → suggested_response que mantém compromisso sem pressionar.
- "Me manda um e-mail." → suggested_response que pede 1 coisa concreta antes.
- "Não tenho tempo." → suggested_response com 1 minuto ou agendamento.
- Qualquer pergunta objetiva do lead → suggested_response clara que vira para a dor/necessidade.
Se o lead NÃO perguntou e NÃO objetou repito, use suggested_response: null.

## PERGUNTA SUGERIDA (suggested_question)
Pergunta que o vendedor deve FAZER ao lead (próximo passo SPIN). NÃO repita as "Perguntas já enviadas". Se não houver pergunta nova útil, use null.

## ESTILO
- CURTO. Máximo 4 linhas no tip. suggested_response: 1–2 frases.
- PRECISO. Resposta ao cliente usável na hora.

## SPIN
S (Situação) → P (Problema/dor) → I (Implicação) → N (Necessidade). Lead pergunta/objeta → suggested_response; hora de explorar → suggested_question.

## JSON OBRIGATÓRIO (retorne APENAS este objeto)
{
  "phase": "S" | "P" | "I" | "N",
  "objection": "tipo da objeção (ex: Preço, Tempo) ou null",
  "tip": "feedback curto do coach direcionado ao VENDEDOR. Perguntas em **negrito**. Use \\n para quebra.",
  "suggested_question": "pergunta nova para o vendedor fazer ao lead" | null,
  "suggested_response": "resposta pronta para o vendedor DIZER ao cliente (não o que o cliente disse)" | null
}
Regras finais: Só gere "suggested_response" para responder a falas que vieram EXPLICITAMENTE do LEAD. Português brasileiro.
`;

// ─── Coach Engine ─────────────────────────────────────────────

export class CoachEngine {
    constructor(private openaiClient: OpenAIClient) { }

    /** Expose the system prompt for streaming coaching in the WS server. */
    getSystemPrompt(): string {
        return SPIN_SYSTEM_PROMPT;
    }

    /**
     * Analisa todo o histórico de transcrição e retorna fase SPIN + objeção + dica.
     * @param fullTranscript Texto com todo o histórico da conversa formatada.
     * @param options.sentQuestions Perguntas já enviadas ao vendedor (não repetir).
     */
    async analyzeTranscription(
        fullTranscript: string,
        options?: { sentQuestions?: string[]; callId?: string }
    ): Promise<SpinAnalysis | null> {
        if (!fullTranscript || fullTranscript.trim().length < 10) return null;

        const sentQuestions = options?.sentQuestions ?? [];
        const sentBlock =
            sentQuestions.length > 0
                ? `
## PERGUNTAS JÁ ENVIADAS AO VENDEDOR(NÃO REPITA NENHUMA DESTAS)
${sentQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
`
                : '';

        const userPrompt = `
Transcrição completa da conversa até agora:
${fullTranscript}
${sentBlock}

Analise e retorne o JSON.Se o lead fez pergunta ou objeção, preencha suggested_response(resposta pronta para o vendedor dizer).Sugira uma pergunta NOVA em suggested_question(não repita as listadas).
`;

        try {
            const result = await this.openaiClient.completeJson<SpinAnalysis & { suggested_question?: string | null; suggested_response?: string | null }>(
                SPIN_SYSTEM_PROMPT,
                userPrompt,
                options?.callId
            );

            // Validate shape
            if (result && result.phase && result.tip) {
                return {
                    phase: result.phase,
                    objection: result.objection || null,
                    tip: result.tip,
                    suggested_question: result.suggested_question ?? null,
                    suggested_response: result.suggested_response ?? null,
                };
            }

            return null;
        } catch (error) {
            logger.error({ err: error }, 'CoachEngine.analyzeTranscription failed');
            return null;
        }
    }
}