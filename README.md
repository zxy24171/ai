# AI Vision Chat

A real-time AI conversation app that runs entirely in the browser. It uses your camera and microphone to enable a natural face-to-face voice conversation with an AI assistant powered by Doubao (volcano engine).

## Features

- **Real-time camera feed**: AI can see what you see
- **Voice interaction**: Hold the mic button to speak, release to send
- **Text input**: Type messages as an alternative
- **Chinese UI**: Full Chinese localization
- **Multi-modal AI**: Text + image understanding via Doubao API
- **Cost control**: Three modes (Off / Balanced / Eco) to manage API usage
- **Conversation history**: Scrollable chat log with auto-scroll
- **Auto-sleep**: Releases camera/mic after inactivity
- **Offline detection**: Displays a warning when network is lost
- **Friendly error messages**: Maps HTTP errors to human-readable Chinese hints

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS |
| AI Model | Doubao (volcano engine) via OpenAI-compatible API |
| Speech-to-Text | Browser Web Speech API (SpeechRecognition) |
| Text-to-Speech | Browser Web Speech API (SpeechSynthesis) |
| Voice Detection | Browser-based energy threshold VAD |
| Video Processing | WebRTC getUserMedia + Canvas frame capture |

### Dependencies (package.json)

- react, react-dom — UI framework
- tailwindcss, postcss, autoprefixer — styling
- vite, @vitejs/plugin-react — build tool
- typescript — type safety

No additional UI libraries, AI SDKs, or audio processing packages are required beyond what the browser provides.

## Original Work

All source code in this repository is original. The project demonstrates:
- Custom React hooks for camera, microphone, session, and multimodal chat
- Real-time frame capture with motion detection and deduplication
- Browser-native STT/TTS integration
- Manual API proxy for streaming chat completions
- Cost management with dynamic frame rate and resolution control

## Prerequisites

- Node.js 18+
- A Doubao API key from [volcano engine console](https://console.volcengine.com/ark/)

## Setup

1. Clone the repository
2. Copy .env.example to .env
3. Fill in your API credentials in .env
4. Install dependencies:

`ash
npm install
`

5. Start the dev server:

`ash
npm run dev
`

6. Open the URL shown in the terminal (usually http://localhost:3001)

## Environment Variables

| Variable | Description |
|----------|-------------|
| VITE_API_KEY | Doubao API key for chat |
| VITE_API_BASE_URL | API endpoint (volcano engine) |
| VITE_MODEL | Model name |
| VITE_VISION_API_KEY | Vision API key (same as above) |
| VITE_VISION_API_BASE_URL | Vision API endpoint |
| VITE_VISION_MODEL | Vision model name |
| VITE_STT_API_KEY | (Optional) STT API key |
| VITE_COST_MODE | Default cost mode: off/balanced/aggressive |

## Usage

1. Allow camera and microphone when prompted
2. Hold the circular mic button and speak
3. Release to send your voice as a message
4. AI responds with voice and text
5. Use the text input as an alternative
6. Toggle camera/mic via the status bar buttons
7. Open Settings (gear icon) to adjust resolution, frame interval, and cost mode

## Project Structure

`
src/
  components/    # React UI components
  hooks/         # Custom React hooks
  lib/           # Utility modules (STT, TTS, camera, VAD, etc.)
  types/         # TypeScript type definitions
  App.tsx        # Main application component
  main.tsx       # Entry point
`

## License

MIT