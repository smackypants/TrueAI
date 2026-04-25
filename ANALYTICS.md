# Analytics Integration Documentation

## Overview
Comprehensive analytics tracking has been integrated across all user interactions in the TrueAI LocalAI platform.

## Analytics Events Tracked

### Chat & Conversations
- **conversation_created**: When a new conversation is started
  - Metadata: model, hasSystemPrompt
- **chat_message_sent**: When user sends a message
  - Metadata: conversationId, messageLength
- **chat_message_received**: When assistant responds
  - Metadata: model, responseTime, tokenCount (estimated)
- **conversation_deleted**: When a conversation is removed
  - Metadata: conversationId, messageCount

### Agents
- **agent_created**: When a new AI agent is configured
  - Metadata: model, tools, hasGoal
- **agent_run_started**: When an agent execution begins
  - Metadata: agentId, agentName, toolsCount
- **agent_run_completed**: When an agent successfully completes
  - Metadata: agentId, executionTime, stepsCount
- **agent_run_failed**: When an agent execution fails
  - Metadata: agentId, error, duration
- **agent_deleted**: When an agent is removed
  - Metadata: agentId
- **tool_used**: When an agent uses a specific tool
  - Metadata: tool, agentId, success

### Models
- **model_configured**: When model settings are updated
  - Metadata: modelId, temperature, maxTokens
- **model_downloaded**: When a model is added from HuggingFace
  - Metadata: modelName, size, quantization, source
- **model_deleted**: When a model is removed
  - Metadata: modelId

### Fine-Tuning
- **dataset_created**: When a fine-tuning dataset is created
  - Metadata: datasetId, format, samplesCount
- **dataset_deleted**: When a dataset is removed
- **finetuning_started**: When a fine-tuning job begins
  - Metadata: modelId, datasetId, epochs, learningRate
- **finetuning_completed**: When fine-tuning completes
  - Metadata: jobId, duration, resultModelId

### Quantization
- **quantization_started**: When model quantization begins
  - Metadata: modelId, targetFormat, originalSize
- **quantization_completed**: When quantization finishes
  - Metadata: modelId, compressionRatio, quantizedSize

### Harness/Extensions
- **harness_created**: When a new harness is added
  - Metadata: harnessName, toolsCount
- **harness_deleted**: When a harness is removed
- **harness_exported**: When a harness manifest is exported
  - Metadata: harnessId, harnessName

### GGUF Models
- **gguf_model_added**: When a GGUF model is registered
  - Metadata: modelName, size, quantization
- **gguf_model_deleted**: When a GGUF model is removed

### System
- **page_view**: When the app loads or tab changes
  - Metadata: tab, timestamp
- **feature_used**: When specific features are accessed
  - Metadata: feature, context
- **error_occurred**: When errors happen
  - Metadata: errorType, message, context

## Analytics Metrics Computed

### Session Metrics
- Total sessions
- Average session duration
- Active users count
- Session retention

### Chat Metrics
- Total messages sent/received
- Total conversations
- Average messages per conversation
- Average response time
- Most used models

### Agent Metrics
- Total agents created
- Total agent runs
- Success rate
- Average execution time
- Most used tools

### Model Metrics
- Total models configured
- Total downloads
- Most popular models
- Total storage used

### Performance Metrics
- Error rate
- Feature adoption
- User engagement
- Conversion funnels

## Analytics Dashboard

The analytics dashboard provides:
1. **Overview Cards**: Key metrics at a glance
2. **Time Series Charts**: Event trends over time
3. **Usage Statistics**: Feature utilization
4. **Performance Insights**: Response times, success rates
5. **User Behavior**: Common workflows and patterns

## Data Storage

Analytics data is stored using the Spark KV persistence API:
- **Key**: `analytics-events` - Array of all events (max 10,000)
- **Key**: `analytics-sessions` - Array of all sessions
- Session timeout: 30 minutes of inactivity

## Privacy & Data Management

- All analytics data stored locally using Spark KV
- No external analytics services
- Users can clear all analytics data
- Session IDs are randomly generated
- User IDs only included if authenticated

## Usage Example

```typescript
import { analytics } from '@/lib/analytics'

// Track a custom event
analytics.track(
  'feature_used',
  'models',
  'configure_temperature',
  {
    label: 'GPT-4',
    value: 0.7,
    metadata: { modelId: 'gpt-4' }
  }
)

// Get analytics metrics
const metrics = await analytics.getMetrics({
  startDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
  endDate: Date.now()
})

console.log(metrics.chatMetrics)
console.log(metrics.agentMetrics)
```

## Implementation Status

✅ Analytics service created (`src/lib/analytics.ts`)
✅ Types defined (`src/lib/types.ts`)
✅ Analytics tracking integrated in App.tsx
✅ Event tracking across all major user actions
✅ Metrics calculation functions
✅ Session management with timeout
✅ Data persistence via Spark KV

## Future Enhancements

- Real-time analytics dashboard component
- Export analytics data to CSV/JSON
- Advanced filtering and date range selection
- Predictive analytics and insights
- A/B testing framework
- Performance monitoring and alerting
