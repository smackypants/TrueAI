# TrueAI LocalAI - Enterprise AI Assistant Platform

A comprehensive, production-ready AI assistant platform with visual workflow builder, cost tracking, offline support, and mobile optimization. **Now with ToolNeuron-competitive features!**

## 🚀 Key Features

### Core Functionality
- **Multi-Model Chat**: Conversations with GPT-4o and custom models
- **Visual Workflow Builder**: Drag-and-drop interface for complex multi-agent workflows ✨ **NEW!**
- **Workflow Templates**: 6 pre-built templates for common automation scenarios ✨ **NEW!**
- **Cost Tracking & Budgets**: Real-time API cost monitoring with spending limits ✨ **NEW!**
- **Autonomous Agents**: Create AI agents with 14 tools and advanced capabilities
- **Model Management**: Configure, optimize, and fine-tune AI models
- **Analytics Dashboard**: Real-time insights and performance metrics
- **AI App Builder**: Build applications using natural language
- **Local IDE**: Full-featured code editor with syntax highlighting

### Advanced Features
- **🔀 Visual Workflows**: Node-based editor for agent orchestration ✨ **NEW!**
- **💰 Cost Management**: Track spending, set budgets, get alerts ✨ **NEW!**
- **📋 Pre-built Templates**: Content creation, data processing, code review ✨ **NEW!**
- **🔄 Background Sync**: Automatic queue and sync of offline actions
- **📴 Offline Support**: Full functionality without internet connection
- **💾 Service Worker**: Fast load times and offline caching
- **🗄️ IndexedDB Caching**: Efficient storage for large conversation histories
- **📱 Mobile Optimized**: Touch gestures, pull-to-refresh, responsive design
- **🎨 Modern UI**: Framer Motion animations, shadcn components
- **⚡ Performance**: Hardware optimization, benchmarking tools
- **🔧 Developer Tools**: Local IDE, code highlighting, auto-save

## ✨ What's New (ToolNeuron Competitive Features)

### Visual Workflow Builder
Create sophisticated multi-agent workflows with a drag-and-drop interface:
- **6 Node Types**: Agent, Tool, Decision, Parallel, Start, End
- **Visual Connections**: See data flow between nodes
- **Real-time Execution**: Watch your workflow run step-by-step
- **Node Configuration**: Customize each step with ease

### Workflow Templates Library
Get started instantly with pre-built templates:
- **Content Research & Writing**: Research + analyze + write articles
- **Data ETL Pipeline**: Extract, transform, validate, load
- **Code Review Automation**: Parallel quality & security checks
- **Market Research Report**: Trends + competitors + analysis
- **Email Campaign Automation**: Generate + validate + send
- **Customer Support Triage**: Sentiment analysis + routing

### Cost Tracking & Budget Management
Complete visibility and control over AI spending:
- **Real-time Tracking**: See costs as you use the platform
- **Budget Limits**: Set daily/weekly/monthly spending caps
- **Smart Alerts**: Get notified before exceeding budgets
- **Detailed Breakdown**: Costs by model, resource, and time
- **Export Reports**: Download spending data as JSON

See [TOOLNEURON_COMPARISON.md](TOOLNEURON_COMPARISON.md) for detailed competitive analysis.

## 📖 Documentation

### Feature Guides
- [Features Overview](FEATURES.md)
- [ToolNeuron Comparison](TOOLNEURON_COMPARISON.md) - **NEW!**
- [Implementation Details](TOOLNEURON_IMPLEMENTATION.md) - **NEW!**
- [Android Build Guide](ANDROID_BUILD_GUIDE.md) - **NEW!**
- [Service Worker & Offline](SERVICE_WORKER.md)
- [Background Sync](BACKGROUND_SYNC.md)
- [IndexedDB Caching](INDEXEDDB_CACHE.md)
- [Mobile Optimizations](MOBILE_OPTIMIZATION_COMPLETE.md)
- [Performance Guide](OPTIMIZATION_GUIDE.md)
- [Analytics](ANALYTICS.md)
- [Security](SECURITY.md)

## 🎯 Quick Start

### Prerequisites

This project requires Node.js 24. We recommend using nvm (Node Version Manager):

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash

# Install Node.js 24
nvm install 24
nvm use 24
```

The project includes a `.nvmrc` file, so you can simply run `nvm use` to switch to the correct version.

### Web Application

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

### Android APK

#### Download Pre-built APK

Download the latest release APK from the [GitHub Releases](https://github.com/smackypants/trueai-localai/releases) page:
- **TrueAI-LocalAI-debug.apk** - Debug version for testing
- **TrueAI-LocalAI-release-unsigned.apk** - Release version (unsigned)

See [RELEASE_NOTES.md](RELEASE_NOTES.md) for installation instructions and release details.

#### Build from Source

1. **Build Android APK**
   ```bash
   npm run android:build
   ```

   See [ANDROID_BUILD_GUIDE.md](ANDROID_BUILD_GUIDE.md) for complete instructions.

## 🔄 Background Sync (New!)

The app now includes robust background sync that queues offline actions:

- ✅ Automatic queuing when offline
- ✅ Auto-sync when connection restored
- ✅ Retry failed actions (up to 3 times)
- ✅ Visual queue indicator in header
- ✅ Full queue management in Analytics tab

See [BACKGROUND_SYNC.md](BACKGROUND_SYNC.md) for complete documentation.

## 🏗️ Architecture

### Tech Stack
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4.1
- **Components**: shadcn/ui v4
- **Icons**: Phosphor Icons
- **Animations**: Framer Motion
- **Build**: Vite 7
- **State**: React Hooks + on-device IndexedDB KV (drop-in replacement for Spark KV)
- **Offline**: Service Workers + Background Sync API

### Project Structure
```
src/
├── components/
│   ├── ui/              # shadcn components
│   ├── chat/            # Chat interface
│   ├── agent/           # AI agents
│   ├── models/          # Model management
│   ├── analytics/       # Analytics dashboard
│   ├── builder/         # App builder & IDE
│   ├── harness/         # Testing tools
│   └── notifications/   # Offline, sync, updates
├── hooks/               # Custom React hooks
├── lib/                 # Utilities & core logic
└── styles/              # CSS & themes
```

## 📱 Mobile Features

- **Touch Gestures**: Swipe between tabs
- **Pull to Refresh**: Update conversations and agents
- **Bottom Navigation**: Easy thumb access
- **Floating Action Buttons**: Quick actions
- **Optimized Forms**: Mobile-friendly inputs
- **Safe Areas**: Notch support

### Native Capabilities (Android APK)

The Android build uses Capacitor 8 first-party plugins to provide a fully
native experience. All integrations live behind a single abstraction
(`src/lib/native/`) so call sites work identically on web and native.

| Capability | Native plugin | Web fallback |
| --- | --- | --- |
| Secure credential storage (LLM API keys) | `@capacitor/preferences` (app-private SharedPreferences) | IndexedDB-only (never localStorage) |
| Network reachability | `@capacitor/network` (OS connectivity manager) | `navigator.onLine` + `online`/`offline` events |
| Clipboard | `@capacitor/clipboard` | `navigator.clipboard.writeText` + `execCommand('copy')` |
| Share sheet | `@capacitor/share` | Web Share API → clipboard |
| Haptic feedback | `@capacitor/haptics` | `navigator.vibrate` |
| App lifecycle (back button, resume) | `@capacitor/app` | `visibilitychange` event |
| Status bar | `@capacitor/status-bar` | n/a |
| Splash screen | `@capacitor/splash-screen` | n/a |
| Keyboard handling | `@capacitor/keyboard` | n/a |
| Local notifications (agent completion) | `@capacitor/local-notifications` | `Notification` API |
| File save (chat exports) | `@capacitor/filesystem` (Documents directory) | Blob + anchor download |

The Android back button is wired to a global handler stack: open
dialogs/sheets register a handler with `pushBackHandler(...)`; otherwise
the WebView navigates back, and on the home view the app minimises rather
than exits, mirroring standard Android behaviour. The offline action queue
auto-flushes when the app returns to the foreground via `onAppResume`.

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Lint code
```

### Key Technologies
- TypeScript 5.7
- React 19
- Tailwind CSS 4.1
- Vite 7
- Service Workers
- Background Sync API
- On-device LLM runtime (OpenAI-compatible: Ollama, llama.cpp, LM Studio, OpenAI)

## 🧠 LLM Runtime (on-device / user-hosted)

The app no longer depends on the GitHub Spark hosted LLM/KV runtime. All
`spark.llm` / `spark.llmPrompt` / `spark.kv` / `useKV` call sites resolve to
local shims under `src/lib/llm-runtime/`:

- **Chat & agents** call any OpenAI-compatible `POST {baseUrl}/chat/completions`
  endpoint.
- **State (`useKV`)** is persisted in IndexedDB (with a `localStorage`
  fallback for restricted WebViews).

### Configuring an LLM endpoint

Open **Settings → LLM Runtime** in the app and pick a provider preset, or
edit the base URL directly. Suggested setups:

| Provider | Base URL | Default model |
| --- | --- | --- |
| Ollama | `http://localhost:11434/v1` | `llama3.2` |
| llama.cpp `llama-server` | `http://localhost:8080/v1` | (server-loaded model) |
| LM Studio | `http://localhost:1234/v1` | (server-loaded model) |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |

The "Test connection" button probes `{baseUrl}/models` and lists the models
your server reports — handy on Android, where `localhost` is the device
itself; point the app at your LAN IP (e.g. `http://192.168.1.10:11434/v1`)
to talk to a server on another machine.

Defaults can also be baked into the APK by editing the `llm` block in
`public/runtime.config.json` before building.

## 🔐 Security

- No external API calls by default (fully local; only talks to the LLM endpoint you configure)
- Secure service worker implementation
- Local data storage via on-device IndexedDB
- No telemetry or tracking

## 🤝 Contributing

Website: https://advancedtechnologyresearch.com/

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

Template resources from GitHub are licensed under MIT, Copyright GitHub, Inc.
