export interface Objection {
    id: string;
    trigger_phrases: string[];
    suggested_response: string;
    mental_trigger: string;
    coaching_tip: string;
}

export interface ObjectionMatchResult {
    score: number;
    objectionId: string;
    triggerPhrase: string;
    suggestedResponse: string;
    mentalTrigger: string;
    coachingTip: string;
}

export class ObjectionMatcher {
    match(text: string, objections: Objection[]): ObjectionMatchResult | null {
        const normalized = this.normalize(text);
        let bestMatch: ObjectionMatchResult | null = null;
        let bestScore = 0;

        for (const obj of objections) {
            for (const phrase of obj.trigger_phrases) {
                const normalizedPhrase = this.normalize(phrase);

                // Simple containment check for MVP
                // In production, use levenshtein or more advanced fuzzy matching
                const score = this.calculateScore(normalized, normalizedPhrase);

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = {
                        score,
                        objectionId: obj.id,
                        triggerPhrase: phrase,
                        suggestedResponse: obj.suggested_response,
                        mentalTrigger: obj.mental_trigger,
                        coachingTip: obj.coaching_tip
                    };
                }
            }
        }

        return bestMatch && bestMatch.score > 0.4 ? bestMatch : null;
    }

    private normalize(text: string): string {
        return text.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/g, '').trim();
    }

    private calculateScore(text: string, phrase: string): number {
        if (text.includes(phrase)) return 1.0;

        // Basic overlap check
        const textWords = new Set(text.split(/\s+/));
        const phraseWords = phrase.split(/\s+/);
        const matches = phraseWords.filter(w => textWords.has(w)).length;

        return matches / phraseWords.length;
    }
}
