import { create } from 'zustand';

export type CardType = 'signal' | 'objection' | 'tip' | 'alert' | 'reinforcement';

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
}

export const useCoachingStore = create<CoachingState>((set, get) => ({
    isMinimized: false,
    isDark: true, // Default Dark
    showEndModal: false,

    connectionStatus: 'disconnected',
    timer: 0,
    startTime: null,

    currentStageIndex: 2, // Mock start
    stages: [
        { id: '1', name: 'Rapport', status: 'completed' },
        { id: '2', name: 'Discovery', status: 'completed' },
        { id: '3', name: 'Apresentação', status: 'current' },
        { id: '4', name: 'Objeções', status: 'pending' },
        { id: '5', name: 'Fechamento', status: 'pending' },
        { id: '6', name: 'Next Steps', status: 'pending' },
        { id: '7', name: 'Wrap Up', status: 'pending' },
    ],
    nextStep: 'Agendar Demo Técnica',
    nextStepQuestion: 'O que acontece se nada mudar?',

    leadProfile: 'emotional',
    buyingSignalsCount: 3,
    activeSpeaker: 'lead',

    cards: [
        // Initial Mock Data
        {
            id: 'mock-1',
            type: 'signal',
            title: 'SINAL DE COMPRA',
            description: 'Ele perguntou sobre pagamento! Vá direto para o fechamento.',
            timestamp: Date.now() - 5000,
            isDismissed: false
        }
    ],

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
    setCallSummary: (show) => set({ showEndModal: show })
}));
