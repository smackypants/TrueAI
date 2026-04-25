# Background Sync for Offline Actions

## Overview

The TrueAI LocalAI platform now includes a robust background sync system that queues all user actions when offline and automatically syncs them when the connection is restored. This ensures data integrity and a seamless user experience even in unreliable network conditions.

## Features

### 1. Offline Action Queue
- **Automatic Queuing**: All create, update, and delete operations are queued when offline
- **Persistent Storage**: Queue is stored using the Spark KV API for persistence across sessions
- **Status Tracking**: Each action has a status (pending, syncing, completed, failed)
- **Retry Logic**: Failed actions are automatically retried up to 3 times

### 2. Background Sync API
- **Service Worker Integration**: Uses the Background Sync API for reliable syncing
- **Automatic Sync**: Triggers sync automatically when device comes online
- **Manual Sync**: Users can manually trigger sync from the UI
- **Periodic Sync**: Optional periodic background sync for supported browsers

### 3. User Interface

#### Offline Queue Indicator (Header)
- **Real-time Badge**: Shows pending and failed action counts
- **Status Icons**:
  - Cloud with arrow up: Pending/syncing actions
  - WiFi slash: Device is offline
  - Check circle: All synced
  - Rotating icon: Sync in progress
- **Quick Sync**: Click to manually trigger sync
- **Tooltip**: Hover for detailed status

#### Offline Queue Panel (Analytics Tab)
- **Queue Overview**: Shows pending, failed, and total action counts
- **Detailed List**: View all queued actions with status and timestamps
- **Bulk Actions**:
  - Sync Now: Manually trigger sync
  - Retry Failed: Retry all failed actions
  - Clear All: Remove all actions from queue
  - Clear Completed: Remove successful actions
  - Clear Failed: Remove failed actions
- **Action Details**: View type, timestamp, retry count, and error messages

## Architecture

### Components

#### 1. `offline-queue.ts`
Core queue management system:
```typescript
interface OfflineAction {
  id: string
  type: 'conversation' | 'message' | 'agent' | 'model' | ...
  action: 'create' | 'update' | 'delete'
  data: unknown
  timestamp: number
  retryCount: number
  status: 'pending' | 'syncing' | 'failed' | 'completed'
  error?: string
}
```

Key methods:
- `enqueue()`: Add action to queue
- `sync()`: Process all pending actions
- `retryFailed()`: Retry failed actions
- `clearCompleted()`, `clearFailed()`, `clearAll()`: Queue management

#### 2. `use-offline-queue.ts`
React hook for accessing queue functionality:
```typescript
const {
  queue,           // Array of all actions
  pendingCount,    // Number of pending actions
  failedCount,     // Number of failed actions
  isOnline,        // Network status
  isSyncing,       // Sync in progress
  enqueue,         // Add action to queue
  sync,            // Trigger sync
  retryFailed,     // Retry failed actions
  clearCompleted,  // Clear completed actions
  clearFailed,     // Clear failed actions
  clearAll         // Clear all actions
} = useOfflineQueue()
```

#### 3. UI Components
- **OfflineQueueIndicator**: Compact header badge
- **OfflineQueuePanel**: Full management interface

### Service Worker

The service worker handles background sync events:

```javascript
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync())
  }
})
```

When a sync event occurs, the service worker notifies all clients to process their queues.

## Usage

### 1. Automatic Integration

The offline queue is automatically initialized when the app loads. No setup required.

### 2. Queuing Actions

To queue an action when performing operations:

```typescript
import { offlineQueue } from '@/lib/offline-queue'

// Example: Creating a conversation
const createConversation = async (conversation) => {
  // Always perform the operation optimistically
  setConversations(prev => [conversation, ...prev])
  
  // Queue for sync if offline
  if (!navigator.onLine) {
    await offlineQueue.enqueue({
      type: 'conversation',
      action: 'create',
      data: conversation
    })
  }
}
```

### 3. Using the Hook

```typescript
import { useOfflineQueue } from '@/hooks/use-offline-queue'

function MyComponent() {
  const { pendingCount, sync, isOnline } = useOfflineQueue()
  
  return (
    <div>
      {pendingCount > 0 && (
        <button onClick={sync} disabled={!isOnline}>
          Sync {pendingCount} actions
        </button>
      )}
    </div>
  )
}
```

## Supported Operations

The queue currently supports the following operation types:

1. **Conversations**: Create, update, delete conversations
2. **Messages**: Create, update, delete messages
3. **Agents**: Create, update, delete AI agents
4. **Agent Runs**: Create, update agent execution runs
5. **Models**: Create, update, delete model configurations
6. **Datasets**: Create, update, delete fine-tuning datasets
7. **Jobs**: Create, update fine-tuning/quantization jobs
8. **Harnesses**: Create, update, delete test harnesses
9. **Code**: Create, update code in Local IDE
10. **Profiles**: Create, update performance profiles
11. **Analytics**: Track analytics events

## Error Handling

### Retry Logic
- Failed actions are automatically retried up to 3 times
- Exponential backoff between retries (handled by browser)
- After 3 failures, action is marked as "failed"

### User Feedback
- Toast notifications for sync results
- Visual indicators for failed actions
- Detailed error messages in queue panel

### Manual Recovery
Users can:
1. Retry individual failed actions (retry failed button)
2. Clear failed actions and perform manually
3. View error details to understand what went wrong

## Performance Considerations

### Storage
- Queue is stored in Spark KV (persistent across sessions)
- Minimal memory footprint (only metadata, not full data)
- Automatic cleanup of completed actions

### Network
- Syncs only when online
- Batch processing for efficiency
- Cancellable sync operations

### UI
- Non-blocking sync operations
- Real-time status updates via subscriptions
- Lazy-loaded panel component

## Browser Support

### Background Sync API
- ✅ Chrome/Edge 49+
- ✅ Chrome/Edge Android
- ❌ Firefox (fallback to manual sync)
- ❌ Safari (fallback to manual sync)

### Fallback Behavior
For browsers without Background Sync API:
- Manual sync button works normally
- Automatic sync on window focus when online
- Automatic sync when online event fires

## Future Enhancements

### Planned Features
1. **Conflict Resolution**: Handle conflicts when data changes on server
2. **Selective Sync**: Allow users to choose which actions to sync
3. **Priority Queuing**: High-priority actions sync first
4. **Batch Optimization**: Combine multiple operations
5. **Sync History**: View past sync operations
6. **Export Queue**: Download queue for debugging
7. **Sync Progress**: Show detailed progress per action

### Integration Points
- Analytics tracking for sync operations
- Error reporting to monitoring service
- Sync statistics in Analytics dashboard

## Testing

### Manual Testing

1. **Offline Creation**:
   - Turn off network
   - Create conversation/agent/etc
   - Check queue indicator shows pending count
   - Turn on network
   - Verify automatic sync

2. **Failed Actions**:
   - Queue action with invalid data
   - Observe retry attempts
   - Check error message in panel

3. **Manual Sync**:
   - Queue multiple actions
   - Click sync button
   - Verify all actions processed

### Browser DevTools

Use Chrome DevTools to test:
1. Network tab → Throttling → Offline
2. Application tab → Service Workers → "Update on reload"
3. Application tab → Background Sync → View registered tags

## Troubleshooting

### Queue Not Syncing
1. Check network status (should be online)
2. Verify service worker is active
3. Check browser console for errors
4. Try manual sync button

### Actions Stay Pending
1. Check if actions exceed retry limit
2. Verify Spark KV is working
3. Clear and recreate actions

### Performance Issues
1. Clear completed actions regularly
2. Limit queue size (future feature)
3. Check for large data payloads

## Security Considerations

1. **Data Privacy**: Queue stored locally, never sent to external services
2. **Authentication**: Sync respects user authentication state
3. **Validation**: All queued data validated before sync
4. **Sanitization**: User data sanitized before processing

## Conclusion

The Background Sync feature provides a robust, production-ready solution for handling offline operations in TrueAI LocalAI. It ensures data integrity, improves user experience, and works seamlessly across different network conditions.
