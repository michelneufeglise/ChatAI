# Copilot Instructions for ChatAI

This document provides guidance for GitHub Copilot (and other AI assistants) working on the ChatAI project.

## Project Overview

**ChatAI** is a Tauri desktop application for macOS that unifies messaging from WhatsApp and Telegram in a single interface with local Ollama AI integration for intelligent support and assistance.

**Tech Stack:**
- **Framework:** Tauri (Rust + React)
- **Frontend:** React with TypeScript, Aceternity UI framework
- **Backend:** Rust
- **AI/LLM:** Local Ollama integration
- **Messaging:** WhatsApp Web client + Telegram Bot API
- **Platform:** macOS only

## Development Setup

### Prerequisites
- Rust (via rustup)
- Node.js/npm (for React/Vite frontend)
- Tauri CLI: `npm install -g @tauri-apps/cli`
- Ollama running locally (for AI features)

### Essential Commands

**Development:**
```bash
npm run tauri dev      # Start dev server with hot reload
```

**Build:**
```bash
npm run tauri build    # Build production macOS app (.app bundle in src-tauri/target/release/bundle/macos/)
```

**Single Test:**
```bash
npm test -- --testNamePattern="your test name"  # Run specific test (once test suite is configured)
```

**Linting & Formatting:**
```bash
npm run lint           # Run ESLint on frontend
npm run format         # Format with Prettier
cargo clippy           # Lint Rust backend (run from src-tauri/)
cargo fmt              # Format Rust code
```

**Clean:**
```bash
npm run tauri dev:clean  # Clear build cache
```

## Architecture

### High-Level Structure
```
ChatAI/
├── src/                 # React frontend (Vite)
│   ├── components/      # Aceternity UI + custom components
│   ├── pages/           # Page-level components
│   ├── store/           # State management (recommended: Zustand or Redux)
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API calls to backend
│   └── App.tsx
├── src-tauri/           # Tauri backend (Rust)
│   ├── src/
│   │   ├── main.rs      # Tauri setup & IPC handlers
│   │   ├── messaging/   # WhatsApp/Telegram integration logic
│   │   ├── ollama/      # Ollama API client & AI logic
│   │   └── db.rs        # Local database (SQLite via Tauri)
│   └── Cargo.toml
└── tauri.conf.json      # Tauri configuration
```

### Core Layers

1. **Tauri IPC Bridge** - Communication between React frontend and Rust backend
   - Frontend: Invoke Rust commands via `invoke()` from @tauri-apps/api
   - Backend: Define commands in `main.rs` with `#[tauri::command]`

2. **UI Layer (React + Aceternity)** - Chat interface, conversation management
   - Use Aceternity components for polished, animated UI
   - State management for conversations, messages, user input
   - Real-time UI updates for incoming messages

3. **Messaging Integrations**
   - **WhatsApp:** Integrate with WhatsApp Web (chrome automation or official SDK if available)
   - **Telegram:** Use Telegram Bot API for receiving/sending messages
   - Each integration runs as a background service in Rust

4. **Ollama Integration**
   - Connect to Ollama API (default: `http://localhost:11434`)
   - Implement prompt engineering for chat support/suggestions
   - Handle streaming responses for real-time output

5. **Data Persistence** - SQLite database for chat history, contacts, settings

### Communication Flow
```
User Input → React Component → IPC Invoke → Rust Command → 
Ollama API / Messaging Service → IPC Event → React State Update → UI Render
```

## Key Conventions

### Frontend (React + TypeScript)
- **File Naming:** Components use PascalCase (`ChatWindow.tsx`), utils use camelCase (`messageUtils.ts`)
- **Aceternity Usage:** Import components from aceternity-ui, follow their theming system
- **State Management:** Use Zustand or Redux for global state (conversations, selected chat, settings)
- **API Calls:** Create service layer in `src/services/` for Tauri IPC calls
- **Async Patterns:** Use async/await with try-catch; handle Tauri invoke errors
- **Type Safety:** Always type props, API responses, and Zustand stores

### Backend (Rust)
- **Error Handling:** Use Result<T, String> or custom error types; propagate errors to frontend
- **Tauri Commands:** Keep command signatures simple (serialize-friendly types)
- **Async Runtime:** Tauri uses tokio; use `#[tokio::main]` for async contexts
- **Module Organization:** Group related functionality (messaging, ollama, db) into separate modules
- **Logging:** Use `println!` or env_logger for debugging (logs visible in dev console)

### Messaging Integration
- **WhatsApp:** Keep client session persistent; handle reconnection gracefully
- **Telegram:** Use polling or webhook; store bot token securely (never commit to git)
- **Message Format:** Normalize incoming messages to a common Message struct with metadata (sender, timestamp, platform)

### Ollama Integration
- **Model Selection:** Document which Ollama model(s) are tested (e.g., mistral, neural-chat)
- **Prompt Templates:** Keep system prompts in separate files or constants for easy iteration
- **Response Streaming:** Use streaming endpoint for better UX on long responses
- **Rate Limiting:** Implement reasonable timeouts to prevent UI freezes

## Important Development Notes

- **macOS Only:** Ensure all native integrations (keyboard shortcuts, notifications, menu bar) use Tauri's macOS-specific APIs
- **Ollama Requirement:** App requires Ollama running locally; handle graceful degradation if unavailable
- **WhatsApp Terms:** WhatsApp Web automation may violate their ToS; consider official business API
- **Telegram Bot Token:** Store securely (use Tauri secure storage or environment variables); never hardcode
- **Hot Reload:** Tauri's `dev` command hot-reloads frontend changes but requires manual restart for Rust changes
- **Bundle Size:** Monitor binary size; Tauri bundles are larger than typical Electron apps (~50-100MB)
- **Testing:** Write tests for message normalization logic and Ollama API client before integrations get complex
