import { AppSettings } from './types';

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const CHAT_MODEL = 'openai/gpt-oss-120b'; // GPT-OSS 120B on Groq

export async function transcribeAudio(
  audioBlob: Blob,
  apiKey: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'text');
  formData.append('language', 'en');

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper error: ${err}`);
  }
  return res.text();
}

export async function generateSuggestions(
  transcript: string,
  fullTranscript: string,
  settings: AppSettings,
  systemContext: string = ''
): Promise<{ type: string; preview: string }[]> {
  const prompt = settings.suggestionPrompt
    .replace('{systemContext}', (systemContext || 'No additional context provided.').slice(0, 2000))
    .replace('{transcript}', transcript.slice(-settings.suggestionContextWindow))
    .replace('{fullTranscript}', fullTranscript.slice(-settings.suggestionContextWindow * 2));

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,  // increased from 800
    }),
  });

  if (!res.ok) throw new Error(`Suggestions API error: ${await res.text()}`);

  const data = await res.json();
  const raw = data.choices[0]?.message?.content as string;

  // If empty, return fallback
  if (!raw?.trim()) {
    console.warn('Empty response from model');
    return [];
  }

  // Try extracting JSON array directly first
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  // Try extracting JSON object
  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      return parsed.suggestions ?? [];
    } catch {
      // JSON is truncated — try to salvage complete suggestion objects
      const partialMatches = raw.matchAll(/"type"\s*:\s*"(\w+)"\s*,\s*"preview"\s*:\s*"([^"]+)"/g);
      const salvaged = [];
      for (const m of partialMatches) {
        salvaged.push({ type: m[1], preview: m[2] });
      }
      if (salvaged.length > 0) return salvaged;
    }
  }

  console.warn('Could not parse suggestions from:', raw.slice(0, 300));
  return [];
}

export async function getDetailedAnswer(
  fullTranscript: string,
  suggestion: string,
  settings: AppSettings
): Promise<string> {
  const prompt = settings.detailedAnswerPrompt
    .replace('{fullTranscript}', fullTranscript.slice(-settings.chatContextWindow))
    .replace('{suggestion}', suggestion);

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1200,
      stream: true,
    }),
  });

  if (!res.ok) throw new Error(`Detailed answer error: ${await res.text()}`);
  return streamToString(res);
}

export async function chatWithContext(
  fullTranscript: string,
  chatHistory: { role: string; content: string }[],
  userMessage: string,
  settings: AppSettings
): Promise<ReadableStream<string>> {
  const systemPrompt = settings.chatPrompt.replace(
    '{fullTranscript}',
    fullTranscript.slice(-settings.chatContextWindow)
  );

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-20), // last 20 messages for context
        { role: 'user', content: userMessage },
      ],
      temperature: 0.5,
      max_tokens: 1500,
      stream: true,
    }),
  });

  if (!res.ok) throw new Error(`Chat API error: ${await res.text()}`);
  return parseSSEStream(res.body!);
}

// --- Streaming helpers ---

async function streamToString(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try {
          const json = JSON.parse(line.slice(6));
          result += json.choices?.[0]?.delta?.content ?? '';
        } catch {}
      }
    }
  }
  return result;
}

export function parseSSEStream(body: ReadableStream<Uint8Array>): ReadableStream<string> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  return new ReadableStream<string>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const json = JSON.parse(line.slice(6));
              const token = json.choices?.[0]?.delta?.content;
              if (token) controller.enqueue(token);
            } catch {}
          }
        }
      }
    },
  });
}