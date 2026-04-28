# Mind Copilot

AI meeting assistant with live transcript, suggestions, and chat.

## Stack
- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Groq Whisper Large V3** — transcription
- **Groq moonshotai/kimi-k1.5-32k** — suggestions + chat
- **Zustand** — client state
- **Vercel** — hosting

## Setup
1. Clone and `npm install`
2. `npm run dev` — open http://localhost:3000
3. Paste your Groq API key in Settings

## Prompt Strategy
- **Suggestions:** Passes last ~3000 chars as "recent context" + full transcript. Instructs the model to vary suggestion type (question/answer/fact-check/talking-point/clarification) based on what's most useful at that moment. Prioritizes answering questions just asked.
- **Detailed answers:** Full transcript context (8000 chars) + suggestion text — produces structured, actionable responses.
- **Chat:** System prompt with full transcript, rolling 20-message history.

## Tradeoffs
- All API calls run client-side (no server) — keeps latency low, avoids cold starts
- 30s audio chunks balance latency vs. API cost
- JSON mode for suggestions ensures reliable parsing