import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Potato states
export const POTATO_STATES = {
  IDLE: 'IDLE',
  HEATING: 'HEATING',
  CRITICAL: 'CRITICAL',
  COOLING: 'COOLING',
};

// Default timer durations (in milliseconds)
export const DEFAULT_WORK_DURATION = 25 * 60 * 1000; // 25 minutes
export const DEFAULT_BREAK_DURATION = 5 * 60 * 1000; // 5 minutes

const useGameStore = create(
  persist(
    (set, get) => ({
      // User state (persisted)
      userId: null,
      nickname: '',
      
      // Kitchen state (from server)
      kitchenCode: null,
      kitchen: null,
      members: [],
      
      // Local timer state
      timerStartedAt: null,
      timerDuration: DEFAULT_WORK_DURATION,
      timerRemaining: null,
      
      // UI state
      isConnected: false,
      isJoining: false,
      error: null,
      
      // Reactions
      pendingReactions: [],
      
      // Stats (local cache)
      stats: null,
      toppings: [],

      // Actions
      setUser: (userId, nickname) => set({ userId, nickname }),
      
      setKitchen: (kitchen) => set({ 
        kitchen,
        kitchenCode: kitchen?.code,
        members: kitchen?.members || [],
      }),
      
      updateKitchen: (updates) => set((state) => ({
        kitchen: state.kitchen ? { ...state.kitchen, ...updates } : null,
      })),
      
      setMembers: (members) => set({ members }),
      
      updateMember: (memberId, updates) => set((state) => ({
        members: state.members.map((m) =>
          m.id === memberId ? { ...m, ...updates } : m
        ),
      })),
      
      addMember: (member) => set((state) => ({
        members: [...state.members.filter(m => m.id !== member.id), member],
      })),
      
      removeMember: (memberId) => set((state) => ({
        members: state.members.filter((m) => m.id !== memberId),
      })),
      
      setTimer: (startedAt, duration) => set({
        timerStartedAt: startedAt,
        timerDuration: duration,
      }),
      
      clearTimer: () => set({
        timerStartedAt: null,
        timerRemaining: null,
      }),
      
      setTimerRemaining: (remaining) => set({ timerRemaining: remaining }),
      
      setConnected: (isConnected) => set({ isConnected }),
      
      setJoining: (isJoining) => set({ isJoining }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      addReaction: (reaction) => set((state) => ({
        pendingReactions: [...state.pendingReactions, { ...reaction, id: Date.now() }],
      })),
      
      removeReaction: (reactionId) => set((state) => ({
        pendingReactions: state.pendingReactions.filter((r) => r.id !== reactionId),
      })),
      
      setStats: (stats) => set({ stats }),
      
      setToppings: (toppings) => set({ toppings }),
      
      addToppings: (newToppings) => set((state) => ({
        toppings: [...state.toppings, ...newToppings],
      })),
      
      // Reset kitchen state (on leave)
      leaveKitchen: () => set({
        kitchenCode: null,
        kitchen: null,
        members: [],
        timerStartedAt: null,
        timerRemaining: null,
        pendingReactions: [],
      }),
      
      // Full reset
      reset: () => set({
        kitchenCode: null,
        kitchen: null,
        members: [],
        timerStartedAt: null,
        timerDuration: DEFAULT_WORK_DURATION,
        timerRemaining: null,
        isConnected: false,
        isJoining: false,
        error: null,
        pendingReactions: [],
      }),

      // Helper to check if current user holds potato
      isHoldingPotato: () => {
        const state = get();
        return state.kitchen?.potatoHolder === state.userId;
      },

      // Helper to get current potato state
      getPotatoState: () => {
        const state = get();
        return state.kitchen?.potatoState || POTATO_STATES.IDLE;
      },

      // Helper to get current user's member state
      getCurrentMemberState: () => {
        const state = get();
        const member = state.members.find((m) => m.id === state.userId);
        return member?.state || POTATO_STATES.IDLE;
      },
    }),
    {
      name: 'hot-potato-storage',
      partialize: (state) => ({
        userId: state.userId,
        nickname: state.nickname,
      }),
    }
  )
);

export default useGameStore;
