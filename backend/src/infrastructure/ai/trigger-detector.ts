import { TranscriptChunk, CallSession } from "../websocket/server.js";

export interface TriggerResult {
    shouldTrigger: boolean;
    reason?: string;
    priority?: number;
}

export class TriggerDetector {
    private COOLDOWN_MS = 5000;

    evaluate(session: CallSession & { lastCoachingAt?: number }, chunk: TranscriptChunk): TriggerResult {
        const lastCoachingAt = session.lastCoachingAt || 0;

        // P1 — SINAL DE COMPRA (bypass cooldown)
        const buyingKeywords = [
            'como funciona o pagamento', 'tem desconto', 'posso começar',
            'me manda o link', 'quanto custa', 'aceita cartão', 'fecha pra mim',
            'quando começa', 'como assino', 'pode parcelar', 'qual o valor',
            'como faço pra comprar', 'me inscreve', 'quero começar',
            'onde eu pago', 'tem pix'
        ];
        if (this.matchesAny(chunk.text, buyingKeywords)) {
            return { shouldTrigger: true, reason: 'buying_signal', priority: 1 };
        }

        // Cooldown Check for other triggers
        if (Date.now() - lastCoachingAt < this.COOLDOWN_MS) {
            return { shouldTrigger: false };
        }

        // P2 — OBJEÇÃO (Generic resistance keywords not caught by exact matcher yet)
        const resistanceKeywords = [
            'não sei', 'tá caro', 'caro', 'preciso pensar', 'vou ver',
            'não é pra mim', 'já tenho', 'meu marido', 'minha esposa',
            'não tenho dinheiro', 'depois eu vejo', 'vou pesquisar',
            'não conheço', 'já tentei', 'não funcionou', 'não acredito',
            'sem dinheiro', 'apertado', 'não é o momento', 'mais pra frente',
            'manda por email', 'vou analisar'
        ];
        if (this.matchesAny(chunk.text, resistanceKeywords)) {
            return { shouldTrigger: true, reason: 'objection_detected', priority: 2 };
        }

        // P3 & P4 could be implemented with more session state tracking (silence detection etc)
        // For MVP, we stick to keywords and basic interval

        // P4 — INTERVALO TEMPORAL
        if (Date.now() - lastCoachingAt > 25000) {
            return { shouldTrigger: true, reason: 'time_interval', priority: 4 };
        }

        return { shouldTrigger: false };
    }

    private matchesAny(text: string, keywords: string[]): boolean {
        const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return keywords.some(kw => {
            const normalizedKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return normalized.includes(normalizedKw);
        });
    }
}
