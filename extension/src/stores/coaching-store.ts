import { create } from 'zustand';

export type CardType = 'signal' | 'objection' | 'tip' | 'alert' | 'reinforcement' | 'manager-whisper';

export interface CoachCard {
    id: string;
    type: CardType;
    title: string;
    description: string;
    metadata?: any; // e.g., trigger name, specific advice
    timestamp: number;
    isDismissed: boolean;
}

export interface Stage {
    id: string;
    name: string;
    status: 'completed' | 'current' | 'pending';
}

// NEW: Objection interface for edge processing
export interface CachedObjection {
    id: string;
    trigger_phrases: string[];
    suggested_response: string;
    mental_trigger: string;
    coaching_tip: string;
    success_rate?: number;
}

interface CoachingState {
    // UI State
    isMinimized: boolean;
    isDark: boolean;
    showEndModal: boolean;

    // Call State
    connectionStatus: 'connected' | 'disconnected' | 'recording' | 'paused';
    timer: number; // seconds
    startTime: number | null;

    // Coaching Data
    currentStageIndex: number;
    stages: Stage[];
    nextStep: string;
    nextStepQuestion: string;

    // Lead Profile
    leadProfile: 'emotional' | 'rational' | 'skeptic';
    buyingSignalsCount: number;
    activeSpeaker: 'user' | 'lead';

    // Cards
    cards: CoachCard[];

    // NEW: Script Cache for Edge Processing
    cachedObjections: CachedObjection[];
    scriptId: string | null;
    cacheTimestamp: number | null;

    // NEW: SPIN Phase
    currentSpinPhase: string | null;
    setSpinPhase: (phase: string) => void;

    // Actions
    toggleMinimize: () => void;
    toggleTheme: () => void;
    setConnectionStatus: (status: CoachingState['connectionStatus']) => void;
    startTimer: () => void;
    stopTimer: () => void;
    addCard: (card: Omit<CoachCard, 'id' | 'timestamp' | 'isDismissed'>) => void;
    dismissCard: (id: string) => void;
    setStage: (index: number) => void;
    setLeadProfile: (profile: CoachingState['leadProfile']) => void;
    setSpeaker: (speaker: 'user' | 'lead') => void;
    setCallSummary: (show: boolean) => void;

    // Cache Management
    loadScriptData: (scriptId: string, objections: CachedObjection[]) => void;
    clearCache: () => void;
}

export const useCoachingStore = create<CoachingState>((set, get) => ({
    isMinimized: false,
    isDark: true, // Default Dark
    showEndModal: false,

    connectionStatus: 'disconnected',
    timer: 0,
    startTime: null,

    currentStageIndex: 0,
    stages: [
        { id: '1', name: 'Situação', status: 'current' },
        { id: '2', name: 'Problema', status: 'pending' },
        { id: '3', name: 'Implicação', status: 'pending' },
        { id: '4', name: 'Necessidade', status: 'pending' },
    ],
    nextStep: 'Próximo Passo SPIN',
    nextStepQuestion: '',

    leadProfile: 'rational',
    buyingSignalsCount: 0,
    activeSpeaker: 'lead',

    currentSpinPhase: null,

    cards: [],

    toggleMinimize: () => set((state) => ({ isMinimized: !state.isMinimized })),
    toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
    setConnectionStatus: (status) => set({ connectionStatus: status }),

    startTimer: () => {
        if (get().startTime) return;
        set({ startTime: Date.now() });
        // Timer update logic would be in a component effect or middleware, 
        // simply setting start time here for reference
    },
    stopTimer: () => set({ startTime: null }),

    addCard: (cardData) => set((state) => {
        const newCard: CoachCard = {
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now(),
            isDismissed: false,
            ...cardData
        };
        // Limit to 20 cards, new on top
        return { cards: [newCard, ...state.cards].slice(0, 20) };
    }),

    dismissCard: (id) => set((state) => ({
        cards: state.cards.map(c => c.id === id ? { ...c, isDismissed: true } : c)
    })),

    setStage: (index) => set((state) => ({
        currentStageIndex: index,
        stages: state.stages.map((s, i) => ({
            ...s,
            status: i < index ? 'completed' : i === index ? 'current' : 'pending'
        }))
    })),

    setLeadProfile: (profile) => set({ leadProfile: profile }),
    setSpeaker: (speaker) => set({ activeSpeaker: speaker }),
    setCallSummary: (show) => set({ showEndModal: show }),
    setSpinPhase: (phase) => set({ currentSpinPhase: phase }),

    // NEW: Script Cache Implementation
    cachedObjections: [],
    scriptId: null,
    cacheTimestamp: null,

    loadScriptData: (scriptId, objections) => {
        console.log(`📦 Caching ${objections.length} objections for script ${scriptId}`);
        set({
            scriptId,
            cachedObjections: objections,
            cacheTimestamp: Date.now()
        });
    },

    clearCache: () => {
        console.log('🗑️ Clearing objection cache');
        set({
            cachedObjections: [],
            scriptId: null,
            cacheTimestamp: null
        });
    }
}));
