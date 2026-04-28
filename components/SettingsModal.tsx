'use client';
import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { DEFAULT_SETTINGS } from '@/lib/types';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, setSettings } = useAppStore();
  const [local, setLocal] = useState(settings);

  const save = () => { setSettings(local); onClose(); };
  const reset = () => setLocal(DEFAULT_SETTINGS);

  const field = (label: string, key: keyof typeof local, multiline = false) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
      {multiline ? (
        <textarea
          className="bg-gray-800 rounded-lg p-3 text-sm text-gray-100 resize-y min-h-[120px] border border-gray-700 focus:border-blue-500 outline-none"
          value={String(local[key])}
          onChange={(e) => setLocal({ ...local, [key]: e.target.value })}
        />
      ) : (
        <input
          className="bg-gray-800 rounded-lg p-3 text-sm text-gray-100 border border-gray-700 focus:border-blue-500 outline-none"
          type={typeof local[key] === 'number' ? 'number' : key.includes('Key') ? 'password' : 'text'}
          value={String(local[key])}
          onChange={(e) =>
            setLocal({ ...local, [key]: typeof local[key] === 'number' ? Number(e.target.value) : e.target.value })
          }
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-white">Reset to defaults</button>
        </div>

        {field('Groq API Key', 'groqApiKey')}
        {field('Live Suggestion Prompt', 'suggestionPrompt', true)}
        {field('Detailed Answer Prompt (on click)', 'detailedAnswerPrompt', true)}
        {field('Chat System Prompt', 'chatPrompt', true)}
        {field('Suggestion Context Window (chars)', 'suggestionContextWindow')}
        {field('Chat Context Window (chars)', 'chatContextWindow')}

        <div className="flex gap-3 pt-2">
          <button onClick={save} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 font-semibold transition">
            Save Settings
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-xl py-3 font-semibold transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}