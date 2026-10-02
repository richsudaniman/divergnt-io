# divrgnt.io

Learning platform for people with ADHD.

Long lectures, messy notes, and "where do I even start?" are where ADHD students lose the most time. divrgnt breaks lectures into interactive study modules, turns spoken brain dumps into structured notes, and builds exam study plans around how much time is actually left.

## what it does

- **brain dump** - type or just talk, and get back Cornell notes, key concepts, action items, and links to stuff you've already saved
- **lecture processing** - upload a lecture, get sectioned notes (with diagrams only where they actually help)
- **learning modes** - analogies, flashcards, dynamic Q&A, real-world applications, a creation lab, and a social-media-style project mode. same material, different ways in, pick whatever holds your attention
- **podcast mode** - turns a transcript into a conversational audio session with an ElevenLabs voice agent
- **concept maps** - you get 5-7 AI-picked keywords and connect them yourself, then the AI gives feedback on your summary. it doesn't just hand you a finished map, because the point is active recall
- **exam prep** - upload materials, set the exam date and session length, get notes + a study schedule scaled to the days left
- **practice** - flashcards, practice questions, full practice exams, an AI tutor, a Pomodoro timer
- **tasks** - break assignments into phases and small steps, and get one "do this next" suggestion instead of a to-do list
- **classes + calendar** - syllabus parsing, a smart calendar, time blocking
- **Academic Weapon score** - points, streaks and levels (from *Butter Knife* up to *Reality Bender*) for staying consistent

## a few design choices

- **one next action, not a list.** `getNextTaskSuggestion` scores every open task on deadline + progress, then asks the LLM for exactly one concrete step and why. the whole point is to cut the "which thing first" paralysis
- **talk first, organize later.** speaking a brain dump is way less friction than writing one. audio is recorded in the browser, transcribed by Whisper, then restructured
- **API keys stay on the server.** the Whisper call runs in a serverless function and reads the OpenAI key from environment secrets, so it never hits the browser
- **structured AI output everywhere.** pretty much every feature is an `InvokeLLM` call with a `response_json_schema`, so notes/flashcards/questions/tasks come back as typed data the UI can render and save directly

## how it's built

React 18 + Vite, TanStack Query, Tailwind/shadcn, Mermaid for diagrams, Recharts, a custom infinite canvas. Base44 for auth, database, hosting and functions. OpenAI Whisper for transcription, ElevenLabs for the podcast agent.

14 entities in `base44/entities/` (brain dumps, classes/exams, study content like notes/flashcards/questions/concept maps, tasks with phases and steps, and user progress) and 5 Deno functions: `speechToText`, `parseSyllabus`, `getNextTaskSuggestion`, `getUserProgress`, `updateUserProgress`.

## problems I hit

**Getting voice recordings to Whisper through a serverless function.** The browser records `webm` with `MediaRecorder`, but the functions take JSON. So the audio gets base64-encoded on the client, decoded back to bytes in the Deno function, and rebuilt as multipart form data for Whisper. I added checks for bad base64, missing MIME types and empty transcriptions (that one shows a "speak closer to the mic" hint), plus timestamped logs at every step because this broke a lot before it worked.

**AI notes were too much.** Early versions over-used diagrams and formatting, which is the opposite of what an ADHD reader needs. The note prompt turned into a staged pipeline with explicit rules for when visuals are allowed, and the output is schema-constrained so the UI controls the layout, not the model.

**Build errors after moving off the builder.** After syncing to GitHub and building locally, some page components wouldn't build because of how they were named. Renaming them fixed it.

## known limitations

- **video transcription is faked for now.** uploaded lecture videos aren't transcribed from their audio yet - the LLM generates a representative transcript from the video title. uploaded documents and voice recordings are processed for real. next step is pulling the audio out of the video and sending it through the existing Whisper function

## running it locally

You need Node 18+, [Deno](https://docs.deno.com/runtime/getting_started/installation/) (the local Base44 backend runs on it), the Base44 CLI (`npm install -g base44@latest`), and an `OPENAI_API_KEY` secret set in your Base44 app for transcription.

```bash
git clone https://github.com/richsudaniman/divergnt-io.git
cd divergnt-io
npm install
base44 login   # once per machine
base44 link    # once per clone
base44 dev     # runs backend + frontend together
```

Use `base44 dev`, not `npm run dev` - plain Vite serves the UI with no backend behind it.
