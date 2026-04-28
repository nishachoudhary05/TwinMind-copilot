'use client';
import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';

export default function TranscriptPanel({
  onManualRefresh,
}: {
  onManualRefresh: () => void;
}) {
  const { transcript, isRecording, clearTranscript } = useAppStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const lines = transcript.split('\n').filter(Boolean);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Transcript</h2>
        <button
          onClick={clearTranscript}
          className="text-xs text-gray-500 hover:text-gray-300 transition"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {lines.length === 0 ? (
          <p className="text-gray-600 text-sm italic">
            {isRecording ? 'Listening…' : 'Start recording to see transcript here.'}
          </p>
        ) : (
          lines.map((line, i) => (
            <p key={i} className="text-sm text-gray-300 leading-relaxed">
              {line}
            </p>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <button
        onClick={onManualRefresh}
        className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition self-start"
      >
        ↻ Refresh now
      </button>
    </div>
  );
}