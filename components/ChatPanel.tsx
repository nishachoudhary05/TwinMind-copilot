'use client';
import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { ChatMessage } from '@/lib/types';
import { chatWithContext } from '@/lib/groq';

export default function ChatPanel() {
  const { chatMessages, addChatMessage, transcript, settings, setSystemContext} = useAppStore();
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(chatMessages);
  messagesRef.current = chatMessages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !settings.groqApiKey) return;
    const looksLikeBackground = (text: string) =>
      text.length > 200 || 
      /resume|experience|background|worked at|i am a|my role|i have \d|years of|i built|i led|internship/i.test(text);
    if (looksLikeBackground(text)) {
      setSystemContext(text);
    }
    setInput('');
    setStreaming(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);

    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    addChatMessage(assistantMsg);
    setStreamingId(assistantId);

    try {
      const history = messagesRef.current
        .filter((m) => m.id !== assistantId)
        .map((m) => ({ role: m.role, content: m.content }));

      const stream = await chatWithContext(transcript, history, text.trim(), settings);
      const reader = stream.getReader();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += value;
        // Update the last message in store
        useAppStore.setState((state) => ({
          chatMessages: state.chatMessages.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m
          ),
        }));
      }
    } catch (err) {
      useAppStore.setState((state) => ({
        chatMessages: state.chatMessages.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Error: ' + (err as Error).message }
            : m
        ),
      }));
    } finally {
      setStreaming(false);
      setStreamingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Chat</h2>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {chatMessages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-center px-4">
        <p className="text-gray-500 text-sm">Ask anything about the conversation.</p>
        <p className="text-gray-600 text-xs mt-2 leading-relaxed">
          Tip: Paste your resume or background here first — suggestions will personalize to your experience across all meeting types.
        </p>
        </div>
        )}
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-200 rounded-bl-sm'
              }`}
            >
              {msg.content}
              {streamingId === msg.id && (
                <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse ml-1 rounded-sm" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-100 border border-gray-700 focus:border-blue-500 outline-none placeholder:text-gray-600"
          placeholder="Ask anything… or paste your background/resume to personalize all suggestions"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          disabled={streaming}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={streaming || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-3 rounded-xl text-sm font-semibold transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}