# TwinMind Copilot

An always-on AI meeting copilot that listens to live audio, transcribes speech in real time, and continuously surfaces 3 contextual suggestions — personalized to the conversation type and the user's background.

**Live Demo:** [twinmind-copilot-gules.vercel.app](https://twin-mind-copilot-gules.vercel.app/)

## What It Does

- **Live transcription** via Groq Whisper Large V3, chunked every 30 seconds
- **3 live suggestions** refreshed automatically, each tailored to the meeting context
- **Persistent chat panel** for detailed answers and follow-up questions
- **Session export** — full transcript + all suggestion batches + chat history as JSON

## Stack

**Frontend**
Next.js 15 (App Router) + TypeScript — zero-config Vercel deploy, file-based routing, and strong typing throughout. Tailwind CSS for styling — fast to iterate, no separate CSS files.

**State Management**
Zustand — lightweight with no boilerplate, works outside React components (needed for setState inside async callbacks), and persists settings to localStorage in one line.

**AI & Transcription**
Groq Whisper Large V3 for transcription — fastest available Whisper inference, highly accurate on conversational speech. Groq `openai/gpt-oss-120b` for suggestions and chat — strong reasoning at 500+ tokens/second.

**Hosting**
Vercel — one-click deploy from GitHub, zero configuration for Next.js projects.

> All Groq API calls run client-side — no backend server, no cold starts, lowest possible latency.

## Setup

### Prerequisites
- Node.js 18+
- A [Groq API key](https://console.groq.com)

### Run Locally

```bash
git clone https://github.com/nishachoudhary05/TwinMind-copilot.git
cd twinmind-copilot
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Settings**, paste your Groq API key, and hit Save.

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect the GitHub repo at [vercel.com](https://vercel.com) — zero configuration needed.

## How to Use

1. **(Optional but recommended)** Paste your resume or background into the Chat panel first. The AI will use this to personalize suggestions.
2. Click **Start** to begin recording. Allow microphone access.
3. Speak naturally. Transcript appears in the left column every ~30 seconds.
4. **Live suggestions** appear in the middle column — click any card for a detailed answer in the right chat panel.
5. You can also type questions directly into chat at any time.
6. Click **Export** to download the full session as JSON.

## Prompt Strategy

### Meeting Type Detection
The suggestion prompt first silently detects the meeting type from the transcript:
- **Interview** — behavioral and technical questions, STAR-format answers
- **Client Meeting** — pain points, proposals, action items
- **Team Standup** — status updates, blockers, daily plans
- **Planning Meeting** — prioritization, roadmap, decisions
- **1:1** — feedback, growth, manager check-ins
- **General** — open-ended discussion, brainstorming

This detection drives which suggestion types are surfaced and how they're framed.

### Suggestion Types
Each refresh produces exactly 3 suggestions from these types, varied by context:

**Answer** — A direct question was just asked. Gives a concrete response, using STAR format for behavioral interview questions.

**Question to Ask** — The user could redirect, deepen, or clarify the conversation with a sharp follow-up.

**Talking Point** — A relevant insight, stat, or angle that hasn't been raised yet and would add value.

**Fact Check** — A claim was made that warrants verification, nuance, or correction.

**Clarification** — Something is ambiguous or undefined and unpacking it would unlock the conversation.

**Action Item** — A commitment or next step was implied and should be captured explicitly.

**Status Update** — In a standup context, a structured summary of what was done and what's next.


### Context Windows
- **Suggestions:** Last 2,000 chars as "recent context" + last 4,000 chars as "full context" — keeps the model focused on what was just said while having broader awareness
- **Chat:** Last 8,000 chars — more context for detailed, accurate answers

### STAR Format
For behavioral interview questions ("tell me about a time..."), the detailed answer prompt automatically structures responses as Situation → Task → Action → Result, drawing from the user's provided background.

### Personalization
If the user pastes their resume or background into chat, it's stored as `systemContext` and injected into all three prompts (suggestions, detailed answers, chat). Detection is automatic — any message over 200 characters or containing keywords like "experience", "internship", "I built" is treated as background context.

## Architecture

```
app/
├── page.tsx              # Main layout, recording logic, refresh loop
├── layout.tsx            # Root layout
components/
├── TranscriptPanel.tsx   # Left column — live transcript
├── SuggestionsPanel.tsx  # Middle column — suggestion cards + skeletons
├── ChatPanel.tsx         # Right column — streaming chat
└── SettingsModal.tsx     # API key + prompt editor
lib/
├── groq.ts               # All Groq API calls (transcribe, suggest, chat)
├── store.ts              # Zustand global state
└── types.ts              # TypeScript types + default prompts/settings
```

## Tradeoffs & Decisions

**Client-side API calls vs. backend proxy**
All Groq calls go directly from the browser. This eliminates server cold starts and keeps latency low. The tradeoff is that the API key lives in localStorage — acceptable for a personal tool, not for a multi-user product.

**30-second audio chunks**
MediaRecorder stops every 30 seconds, the chunk is sent to Whisper, then suggestions refresh. Shorter chunks (10s) would feel more responsive but increase API calls and cost. 30s is the sweet spot for conversational context.

**No `response_format: json_object`**
The Groq `openai/gpt-oss-120b` model was unreliable with forced JSON mode — it returned empty responses. Instead, the prompt instructs JSON output and the parser uses regex extraction + partial salvage to handle truncated or wrapped responses gracefully.

**Zustand over Redux/Context**
No boilerplate, works outside React components (needed for `setState` inside async callbacks), and persists settings to localStorage in one line.

**Streaming for chat, non-streaming for suggestions**
Chat streams token-by-token for responsiveness. Suggestions are non-streaming because all 3 must arrive together as a batch — streaming partial JSON would be complex and unreliable.

## Settings

All prompts and parameters are editable in the Settings panel at runtime:

**Suggestion Prompt** — Controls meeting type detection and suggestion quality. Edit this to tune how the model picks suggestion types and frames answers.

**Detailed Answer Prompt** — Controls the structured response shown when a suggestion card is clicked. Includes STAR format instructions for interview scenarios.

**Chat System Prompt** — Controls how the chat panel responds to direct questions and follow-ups.

**Suggestion Context Window** — How many characters of recent transcript to use when generating suggestions. Default: 2,000.

**Chat Context Window** — How many characters of transcript to include as context for chat answers. Default: 8,000.