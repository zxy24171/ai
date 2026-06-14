# AI Vision Chat

A real-time AI conversation app that runs entirely in the browser. Uses your camera and microphone for face-to-face voice conversation with an AI assistant powered by Doubao (volcano engine).

## Features

- **Real-time camera feed** — AI sees what you see
- **Voice interaction** — Hold mic button to speak, release to send
- **Text input** — Type messages as an alternative
- **Full Chinese UI** — All labels, buttons, and messages in Chinese
- **Multi-modal AI** — Text + image understanding via Doubao API
- **Cost control** — Three modes (Off / Balanced / Eco) to manage API usage
- **Conversation history** — Scrollable chat log with auto-scroll
- **Auto-sleep** — Releases camera/mic after inactivity
- **Offline detection** — Warning when network is lost
- **Friendly errors** — HTTP errors mapped to human-readable Chinese hints

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS |
| AI Model | Doubao (volcano engine) via OpenAI-compatible API |
| Speech-to-Text | Browser Web Speech API (SpeechRecognition) |
| Text-to-Speech | Browser Web Speech API (SpeechSynthesis) |
| Voice Detection | Browser energy-threshold VAD |
| Video Processing | WebRTC getUserMedia + Canvas frame capture |

### Dependencies

All in package.json: react, react-dom, tailwindcss, postcss, autoprefixer, vite, @vitejs/plugin-react, typescript.

No external AI SDKs or audio processing libraries required — everything uses built-in browser APIs.

## Original Work

All source code is original. Key original modules:
- Custom React hooks for camera, microphone, session, multimodal chat
- Real-time frame capture with motion detection and deduplication
- Browser-native STT/TTS integration
- Manual API proxy for streaming chat completions
- Cost management with dynamic frame rate / resolution control

## Setup

1. Clone the repo
2. Copy .env.example to .env
3. Fill in your Doubao API credentials
4. Run:

`ash
npm install
npm run dev
`

5. Open http://localhost:3001

## Environment Variables

| Variable | Description |
|----------|-------------|
| VITE_API_KEY | Doubao API key for chat |
| VITE_API_BASE_URL | API endpoint (volcano engine) |
| VITE_MODEL | Model name |
| VITE_VISION_API_KEY | Vision API key |
| VITE_VISION_API_BASE_URL | Vision API endpoint |
| VITE_VISION_MODEL | Vision model name |
| VITE_COST_MODE | Default cost mode: off / balanced / aggressive |

## Usage

1. Allow camera and microphone when prompted
2. Hold the mic button and speak
3. Release to send voice as a message
4. AI responds with voice and text
5. Use text input as alternative
6. Toggle camera/mic via the status bar
7. Open Settings to adjust resolution, frame interval, cost mode

## Project Structure

`
src/
  components/    — React UI components
  hooks/         — Custom React hooks
  lib/           — Utility modules (STT, TTS, camera, VAD, …)
  types/         — TypeScript type definitions
  App.tsx        — Main application component
  main.tsx       — Entry point
`

## License

MIT