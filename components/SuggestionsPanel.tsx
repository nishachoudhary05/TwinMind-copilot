'use client';
import { useAppStore } from '@/lib/store';
import { SuggestionCard } from '@/lib/types';

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  question:      { label: 'Question to Ask',  icon: '?',  color: 'bg-blue-500/15 text-blue-300 border-blue-500/40' },
  talking_point: { label: 'Talking Point',    icon: '→',  color: 'bg-purple-500/15 text-purple-300 border-purple-500/40' },
  answer:        { label: 'Answer',           icon: '✓',  color: 'bg-green-500/15 text-green-300 border-green-500/40' },
  fact_check:    { label: 'Fact Check',       icon: '⚑',  color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40' },
  clarification: { label: 'Clarification',   icon: '◎',  color: 'bg-orange-500/15 text-orange-300 border-orange-500/40' },
  action_item:   { label: 'Action Item',      icon: '✦',  color: 'bg-pink-500/15 text-pink-300 border-pink-500/40' },
  status_update: { label: 'Status Update',   icon: '↑',  color: 'bg-teal-500/15 text-teal-300 border-teal-500/40' },
};

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 p-4 animate-pulse">
      <div className="h-3 w-24 bg-gray-700 rounded-full mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-700 rounded-full w-full" />
        <div className="h-3 bg-gray-700 rounded-full w-5/6" />
        <div className="h-3 bg-gray-700 rounded-full w-4/6" />
      </div>
    </div>
  );
}

export default function SuggestionsPanel({
  onSuggestionClick,
  isLoading,
}: {
  onSuggestionClick: (s: SuggestionCard) => void;
  isLoading: boolean;
}) {
  const { suggestionBatches } = useAppStore();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Suggestions</h2>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            Thinking…
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        {isLoading && suggestionBatches.length === 0 && (
          <div className="space-y-3">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        )}

        {!isLoading && suggestionBatches.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <p className="text-gray-500 text-sm">Suggestions appear as you speak.</p>
            <p className="text-gray-600 text-xs mt-2 leading-relaxed">
              Works for interviews, client calls, standups, planning meetings, and 1:1s.
            </p>
          </div>
        )}

        {suggestionBatches.map((batch, batchIdx) => (
          <div key={batch.id}>
            {batchIdx > 0 && <hr className="border-gray-800/80 mb-5" />}
            <p className="text-xs text-gray-600 mb-2.5 font-mono">
              {new Date(batch.timestamp).toLocaleTimeString()}
            </p>
            <div className="space-y-2.5">
              {batch.suggestions.map((s) => {
                const cfg = TYPE_CONFIG[s.type] ?? TYPE_CONFIG['talking_point'];
                return (
                  <button
                    key={s.id}
                    onClick={() => onSuggestionClick(s)}
                    className="w-full text-left rounded-xl border border-gray-700/60 bg-gray-800/50 hover:bg-gray-700/70 hover:border-gray-600 p-4 transition-all duration-150 group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.color}`}>
                        <span>{cfg.icon}</span>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed group-hover:text-gray-100 transition-colors">
                      {s.preview}
                    </p>
                    <p className="text-xs text-gray-600 mt-2 group-hover:text-gray-500 transition-colors">
                      Click for full answer →
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}