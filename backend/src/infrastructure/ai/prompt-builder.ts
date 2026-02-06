import { CallSession, TriggerResult } from "./coach-engine";

interface Script {
    name: string;
    coach_personality: string;
    coach_tone: string;
    intervention_level: string;
    steps: Array<{
        step_order: number;
        name: string;
        description: string;
        key_questions: string[];
        transition_criteria: string;
        estimated_duration: number;
    }>;
}

export class PromptBuilder {
    build(session: CallSession, trigger: TriggerResult, script: Script) {
        // Safe defaults for script properties if missing
        const personality = script.coach_personality || "Strategic and Direct";
        const tone = script.coach_tone || "Professional";
        const intervention = script.intervention_level || "Medium";

        const system = `
Você é um coach de vendas de elite, invisível, sussurrando no ouvido do vendedor durante uma call ao vivo.

## SUA PERSONALIDADE
${personality}
Tom: ${tone}
Nível de intervenção: ${intervention}

## REGRAS ABSOLUTAS
1. Seus conselhos são para o VENDEDOR. O lead nunca verá isso.
2. BREVE: máximo 2-3 frases. Vendedor lê em 2 segundos durante a call.
3. ESTRATÉGICO: referencie algo ESPECÍFICO da conversa. Nunca genérico.
4. Se está indo bem, diga. Reforço positivo motiva.
5. Se está errando, seja direto: "Você está falando demais. Pergunte e ESCUTE."
6. Sinais de compra: ALERTE COM URGÊNCIA. É hora de fechar.
7. Nunca sugira manipulação antiética.
8. Responda em português brasileiro.

## SCRIPT DE VENDAS: ${script.name}

### ETAPAS:
${script.steps.map(s => `
**Etapa ${s.step_order}: ${s.name}**
Objetivo: ${s.description}
Perguntas-chave: ${s.key_questions.join(', ')}
Transição: ${s.transition_criteria}
Tempo: ${s.estimated_duration}s
`).join('\n')}

## FORMATO DE RESPOSTA
Responda APENAS em JSON válido, sem markdown:
{
  "currentStep": number,
  "coaching": {
    "type": "tip" | "alert" | "reinforcement" | "objection" | "buying_signal",
    "urgency": "low" | "medium" | "high",
    "content": "conselho máx 280 chars"
  },
  "nextStep": {
    "action": "próximo passo sugerido",
    "question": "pergunta sugerida" | null
  },
  "leadProfile": {
    "type": "emotional" | "rational" | "skeptical" | "anxious" | "enthusiastic",
    "concerns": ["preocupações"],
    "interests": ["interesses"],
    "buyingSignals": ["sinais"]
  },
  "stageChanged": boolean,
  "shouldSkipResponse": boolean
}
`;

        const recentTranscript = session.transcript.slice(-50).map(t =>
            `[${new Date(t.timestamp).toISOString().split('T')[1].split('.')[0]}] ${t.speaker === 'seller' ? 'VENDEDOR' : 'LEAD'}: ${t.text}`
        ).join('\n');

        const user = `
## TRANSCRIÇÃO (últimos turnos)
${recentTranscript}

## ESTADO ATUAL
- Etapa atual: ${session.currentStep}
- Perfil do lead: ${JSON.stringify(session.leadProfile || {})}
- Último coaching: "${session.lastCoaching || ''}"
- Trigger: ${trigger.reason}

Analise e dê coaching. Se não há nada útil, retorne shouldSkipResponse: true.
`;

        return { system, user };
    }
}
