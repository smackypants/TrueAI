# TrueAI LocalAI - Enterprise AI Assistant Platform

A comprehensive, production-ready AI assistant platform with advanced features including offline support, background sync, local IDE, model optimization, and more.

## 🚀 Key Features

### Core Functionality
- **Multi-Model Chat**: Conversations with GPT-4o and custom models
- **Autonomous Agents**: Create AI agents with tools (calculator, datetime, memory, web search)
- **Model Management**: Configure, optimize, and fine-tune AI models
- **Analytics Dashboard**: Real-time insights and performance metrics
- **AI App Builder**: Build applications using natural language
- **Local IDE**: Full-featured code editor with syntax highlighting

### Advanced Features
- **🔄 Background Sync**: Automatic queue and sync of offline actions
- **📴 Offline Support**: Full functionality without internet connection
- **💾 Service Worker**: Fast load times and offline caching
- **📱 Mobile Optimized**: Touch gestures, pull-to-refresh, responsive design
- **🎨 Modern UI**: Framer Motion animations, shadcn components
- **⚡ Performance**: Hardware optimization, benchmarking tools
- **🔧 Developer Tools**: Local IDE, code highlighting, auto-save

## 📖 Documentation

- [Features Overview](FEATURES.md)
- [Service Worker & Offline](SERVICE_WORKER.md)
- [Background Sync](BACKGROUND_SYNC.md) - **NEW!**
- [Mobile Optimizations](MOBILE_OPTIMIZATION_COMPLETE.md)
- [Performance Guide](OPTIMIZATION_GUIDE.md)
- [Analytics](ANALYTICS.md)
- [Security](SECURITY.md)

## 🎯 Quick Start

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
- **State**: React Hooks + Spark KV
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
- Spark Runtime SDK

## 🔐 Security

- No external API calls (fully local)
- Secure service worker implementation
- Local data storage via Spark KV
- No telemetry or tracking

## 🤝 Contributing

This is a Spark template. Customize it for your needs!

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

Template resources from GitHub are licensed under MIT, Copyright GitHub, Inc.
