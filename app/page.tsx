'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { SuggestionCard, SuggestionBatch, ChatMessage } from '@/lib/types';
import { transcribeAudio, generateSuggestions, getDetailedAnswer } from '@/lib/groq';
import TranscriptPanel from '@/components/TranscriptPanel';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import ChatPanel from '@/components/ChatPanel';
import SettingsModal from '@/components/SettingsModal';

const REFRESH_INTERVAL_MS = 30_000;

export default function Home() {
  const {
    settings, transcript, appendTranscript, isRecording, setRecording,
    addSuggestionBatch, addChatMessage, suggestionBatches, chatMessages, 
    systemContext,
  } = useAppStore();

  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => {
  if (!settings.groqApiKey) setShowSettings(true);
  }, []);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTranscriptRef = useRef('');

  // --- Suggestions refresh ---
  const refreshSuggestions = useCallback(async (currentTranscript: string) => {
    if (!settings.groqApiKey || !currentTranscript.trim()) return;
    setSuggestionsLoading(true);
    try {
      const recentContext = currentTranscript.slice(-settings.suggestionContextWindow);
      const raw = await generateSuggestions(recentContext, currentTranscript, settings, systemContext);
      const batch: SuggestionBatch = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        transcriptSnapshot: recentContext,
        suggestions: raw.map((s) => ({
          id: crypto.randomUUID(),
          preview: s.preview,
          type: s.type as SuggestionCard['type'],
          batchId: '',
          timestamp: Date.now(),
        })),
      };
      addSuggestionBatch(batch);
    } catch (err) {
      console.error('Suggestion error:', err);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [settings, addSuggestionBatch]);

  // --- Transcribe a chunk ---
  const transcribeChunk = useCallback(async (blob: Blob) => {
    if (!settings.groqApiKey || blob.size < 1000) return;
    try {
      const text = await transcribeAudio(blob, settings.groqApiKey);
      if (text?.trim()) {
        appendTranscript(text.trim());
        lastTranscriptRef.current = useAppStore.getState().transcript;
      }
    } catch (err) {
      console.error('Transcription error:', err);
    }
  }, [settings.groqApiKey, appendTranscript]);

  // --- Start recording ---
  const startRecording = useCallback(async () => {
    if (!settings.groqApiKey) { setShowSettings(true); return; }
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        await transcribeChunk(blob);
        // After transcribing, refresh suggestions
        await refreshSuggestions(useAppStore.getState().transcript);
      };

      // Collect chunks every 30s, then restart
      const startChunk = () => {
        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            // Only restart if still recording
            if (useAppStore.getState().isRecording) setTimeout(startChunk, 100);
          }
        }, REFRESH_INTERVAL_MS);
      };
      startChunk();
      setRecording(true);
    } catch (err) {
      setMicError('Microphone access denied. Please allow mic access.');
    }
  }, [settings.groqApiKey, transcribeChunk, refreshSuggestions, setRecording]);

  // --- Stop recording ---
  const stopRecording = useCallback(() => {
    setRecording(false);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, [setRecording]);

  // --- Manual refresh ---
  const handleManualRefresh = useCallback(async () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      await refreshSuggestions(useAppStore.getState().transcript);
    }
  }, [refreshSuggestions]);

  // --- Suggestion card click ---
  const handleSuggestionClick = useCallback(async (s: SuggestionCard) => {
    if (!settings.groqApiKey) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: s.preview,
      timestamp: Date.now(),
      fromSuggestion: s.preview,
    };
    addChatMessage(userMsg);

    const assistantId = crypto.randomUUID();
    addChatMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    });

    try {
      const answer = await getDetailedAnswer(transcript, s.preview, settings);
      useAppStore.setState((state) => ({
        chatMessages: state.chatMessages.map((m) =>
          m.id === assistantId ? { ...m, content: answer } : m
        ),
      }));
    } catch (err) {
      useAppStore.setState((state) => ({
        chatMessages: state.chatMessages.map((m) =>
          m.id === assistantId ? { ...m, content: '⚠️ Error fetching answer.' } : m
        ),
      }));
    }
  }, [settings, transcript, addChatMessage]);

  // --- Export ---
  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      transcript,
      suggestionBatches: suggestionBatches.map((b) => ({
        timestamp: new Date(b.timestamp).toISOString(),
        suggestions: b.suggestions.map((s) => ({ type: s.type, preview: s.preview })),
      })),
      chatHistory: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp).toISOString(),
        fromSuggestion: m.fromSuggestion ?? null,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mind-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">TM</div>
          <span className="font-semibold text-white">TwinMind Copilot</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Mic button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition ${
              isRecording
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white animate-pulse' : 'bg-white/60'}`} />
            {isRecording ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-semibold transition"
          >
            Export
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-semibold transition"
          >
            ⚙ Settings
          </button>
        </div>
      </header>

      {micError && (
        <div className="bg-red-900/50 border-b border-red-800 px-6 py-2 text-sm text-red-300">
          {micError}
        </div>
      )}

      {/* 3-column layout */}
      <main className="flex-1 grid grid-cols-3 gap-0 overflow-hidden">
        <div className="border-r border-gray-800 p-5 overflow-hidden flex flex-col">
          <TranscriptPanel onManualRefresh={handleManualRefresh} />
        </div>
        <div className="border-r border-gray-800 p-5 overflow-hidden flex flex-col">
          <SuggestionsPanel onSuggestionClick={handleSuggestionClick} isLoading={suggestionsLoading} />
        </div>
        <div className="p-5 overflow-hidden flex flex-col">
          <ChatPanel />
        </div>
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}