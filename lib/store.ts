import { create } from 'zustand';
import { SuggestionBatch, ChatMessage, AppSettings, DEFAULT_SETTINGS } from './types';

interface AppState {
  // Settings
  settings: AppSettings;
  setSettings: (s: Partial<AppSettings>) => void;

  // Transcript
  transcript: string;           // full session transcript
  appendTranscript: (chunk: string) => void;
  clearTranscript: () => void;

  // Recording
  isRecording: boolean;
  setRecording: (v: boolean) => void;

  // Suggestions
  suggestionBatches: SuggestionBatch[];
  addSuggestionBatch: (batch: SuggestionBatch) => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;

  // SystemContext
  systemContext: string;
  setSystemContext: (ctx: string) => void;

}

export const useAppStore = create<AppState>((set) => ({
  settings: (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mind-settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
    return DEFAULT_SETTINGS;
  })(),

  setSettings: (partial) =>
    set((state) => {
      const next = { ...state.settings, ...partial };
      localStorage.setItem('mind-settings', JSON.stringify(next));
      return { settings: next };
    }),

  transcript: '',
  appendTranscript: (chunk) =>
    set((state) => ({ transcript: state.transcript + (state.transcript ? '\n' : '') + chunk })),
  clearTranscript: () => set({ transcript: '' }),

  isRecording: false,
  setRecording: (v) => set({ isRecording: v }),

  suggestionBatches: [],
  addSuggestionBatch: (batch) =>
    set((state) => ({ suggestionBatches: [batch, ...state.suggestionBatches] })),

  chatMessages: [],
  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),

  systemContext: '',
  setSystemContext: (ctx) => set({ systemContext: ctx }),
}));