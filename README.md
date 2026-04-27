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
