import { useKV } from '@github/spark/hooks'
import type { 
  AnalyticsEvent, 
  AnalyticsEventType, 
  AnalyticsSession,
  AnalyticsMetrics,
  AnalyticsFilter
} from './types'

const SESSION_TIMEOUT = 30 * 60 * 1000

class AnalyticsService {
  private sessionId: string
  private sessionStartTime: number
  private lastActivityTime: number

  constructor() {
    this.sessionId = this.generateSessionId()
    this.sessionStartTime = Date.now()
    this.lastActivityTime = Date.now()
    this.initSession()
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }

  private async initSession() {
    const sessions = await spark.kv.get<AnalyticsSession[]>('analytics-sessions') || []
    
    const newSession: AnalyticsSession = {
      id: this.sessionId,
      startedAt: this.sessionStartTime,
      eventCount: 0,
      platform: navigator?.platform || 'unknown',
      userAgent: navigator?.userAgent || 'unknown'
    }

    await spark.kv.set('analytics-sessions', [newSession, ...sessions])
  }

  private async updateSession() {
    const sessions = await spark.kv.get<AnalyticsSession[]>('analytics-sessions') || []
    const currentSession = sessions.find(s => s.id === this.sessionId)
    
    if (currentSession) {
      const now = Date.now()
      
      if (now - this.lastActivityTime > SESSION_TIMEOUT) {
        currentSession.endedAt = this.lastActivityTime
        currentSession.duration = this.lastActivityTime - currentSession.startedAt
        
        this.sessionId = this.generateSessionId()
        this.sessionStartTime = now
        this.lastActivityTime = now
        await this.initSession()
      } else {
        this.lastActivityTime = now
        currentSession.eventCount++
        await spark.kv.set('analytics-sessions', sessions)
      }
    }
  }

  async track(
    type: AnalyticsEventType,
    category: string,
    action: string,
    options?: {
      label?: string
      value?: number
      metadata?: Record<string, any>
      duration?: number
    }
  ): Promise<void> {
    try {
      await this.updateSession()

      const event: AnalyticsEvent = {
        id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        type,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        category,
        action,
        label: options?.label,
        value: options?.value,
        metadata: options?.metadata,
        duration: options?.duration
      }

      const user = await spark.user()
      if (user) {
        event.userId = user.id
      }

      const events = await spark.kv.get<AnalyticsEvent[]>('analytics-events') || []
      await spark.kv.set('analytics-events', [event, ...events.slice(0, 9999)])

      console.log('[Analytics]', type, category, action, options)
    } catch (error) {
      console.error('[Analytics] Error tracking event:', error)
    }
  }

  async getEvents(filter?: AnalyticsFilter): Promise<AnalyticsEvent[]> {
    let events = await spark.kv.get<AnalyticsEvent[]>('analytics-events') || []

    if (filter) {
      if (filter.startDate) {
        events = events.filter(e => e.timestamp >= filter.startDate!)
      }
      if (filter.endDate) {
        events = events.filter(e => e.timestamp <= filter.endDate!)
      }
      if (filter.eventTypes && filter.eventTypes.length > 0) {
        events = events.filter(e => filter.eventTypes!.includes(e.type))
      }
      if (filter.userId) {
        events = events.filter(e => e.userId === filter.userId)
      }
      if (filter.category) {
        events = events.filter(e => e.category === filter.category)
      }
    }

    return events
  }

  async getSessions(): Promise<AnalyticsSession[]> {
    return await spark.kv.get<AnalyticsSession[]>('analytics-sessions') || []
  }

  async getMetrics(filter?: AnalyticsFilter): Promise<AnalyticsMetrics> {
    const events = await this.getEvents(filter)
    const sessions = await this.getSessions()

    const totalEvents = events.length
    const totalSessions = sessions.length
    
    const completedSessions = sessions.filter(s => s.endedAt)
    const averageSessionDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
      : 0

    const uniqueUsers = new Set(events.filter(e => e.userId).map(e => e.userId)).size

    const eventsByType = this.groupBy(events, 'type').map(([type, count]) => ({
      type,
      count
    }))

    const eventsByDay = this.groupEventsByDay(events)

    const topActions = this.groupBy(events, 'action')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }))

    const errorEvents = events.filter(e => e.type === 'error_occurred')
    const errorRate = totalEvents > 0 ? (errorEvents.length / totalEvents) * 100 : 0

    const chatMetrics = this.calculateChatMetrics(events)
    const agentMetrics = this.calculateAgentMetrics(events)
    const modelMetrics = this.calculateModelMetrics(events)

    return {
      totalEvents,
      totalSessions,
      averageSessionDuration,
      activeUsers: uniqueUsers,
      eventsByType,
      eventsByDay,
      topActions,
      errorRate,
      chatMetrics,
      agentMetrics,
      modelMetrics
    }
  }

  private groupBy(events: AnalyticsEvent[], key: keyof AnalyticsEvent): [string, number][] {
    const grouped = events.reduce((acc, event) => {
      const value = String(event[key])
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped)
  }

  private groupEventsByDay(events: AnalyticsEvent[]): { date: string; count: number }[] {
    const grouped = events.reduce((acc, event) => {
      const date = new Date(event.timestamp).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  private calculateChatMetrics(events: AnalyticsEvent[]) {
    const chatEvents = events.filter(e => e.category === 'chat')
    const messagesSent = events.filter(e => e.type === 'chat_message_sent').length
    const messagesReceived = events.filter(e => e.type === 'chat_message_received').length
    const conversationsCreated = events.filter(e => e.type === 'conversation_created').length

    const responseTimes = events
      .filter(e => e.type === 'chat_message_received' && e.duration)
      .map(e => e.duration!)
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

    const modelUsage = events
      .filter(e => e.type === 'chat_message_received' && e.metadata?.model)
      .reduce((acc, e) => {
        const model = e.metadata!.model
        acc[model] = (acc[model] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    const mostUsedModels = Object.entries(modelUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([model, count]) => ({ model, count }))

    return {
      totalMessages: messagesSent + messagesReceived,
      totalConversations: conversationsCreated,
      averageMessagesPerConversation: conversationsCreated > 0 
        ? (messagesSent + messagesReceived) / conversationsCreated 
        : 0,
      averageResponseTime,
      mostUsedModels
    }
  }

  private calculateAgentMetrics(events: AnalyticsEvent[]) {
    const agentEvents = events.filter(e => e.category === 'agent')
    const agentsCreated = events.filter(e => e.type === 'agent_created').length
    const runsStarted = events.filter(e => e.type === 'agent_run_started').length
    const runsCompleted = events.filter(e => e.type === 'agent_run_completed').length
    const runsFailed = events.filter(e => e.type === 'agent_run_failed').length

    const successRate = runsStarted > 0 ? (runsCompleted / runsStarted) * 100 : 0

    const executionTimes = events
      .filter(e => e.type === 'agent_run_completed' && e.duration)
      .map(e => e.duration!)
    
    const averageExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0

    const toolUsage = events
      .filter(e => e.type === 'tool_used' && e.metadata?.tool)
      .reduce((acc, e) => {
        const tool = e.metadata!.tool
        acc[tool] = (acc[tool] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    const mostUsedTools = Object.entries(toolUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tool, count]) => ({ tool, count }))

    return {
      totalAgents: agentsCreated,
      totalRuns: runsStarted,
      successRate,
      averageExecutionTime,
      mostUsedTools
    }
  }

  private calculateModelMetrics(events: AnalyticsEvent[]) {
    const modelDownloads = events.filter(e => e.type === 'model_downloaded')
    const totalModels = new Set(
      events
        .filter(e => e.metadata?.modelId)
        .map(e => e.metadata!.modelId)
    ).size

    const downloadsByModel = modelDownloads.reduce((acc, e) => {
      const model = e.metadata?.modelName || 'unknown'
      acc[model] = (acc[model] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostPopularModels = Object.entries(downloadsByModel)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([model, downloads]) => ({ model, downloads }))

    const storageUsed = modelDownloads.reduce((sum, e) => {
      return sum + (e.metadata?.size || 0)
    }, 0)

    return {
      totalModels,
      totalDownloads: modelDownloads.length,
      mostPopularModels,
      storageUsed
    }
  }

  async clearData(): Promise<void> {
    await spark.kv.delete('analytics-events')
    await spark.kv.delete('analytics-sessions')
  }
}

export const analytics = new AnalyticsService()

export const useAnalytics = () => {
  const [events] = useKV<AnalyticsEvent[]>('analytics-events', [])
  const [sessions] = useKV<AnalyticsSession[]>('analytics-sessions', [])

  return {
    events: events || [],
    sessions: sessions || [],
    track: analytics.track.bind(analytics),
    getEvents: analytics.getEvents.bind(analytics),
    getSessions: analytics.getSessions.bind(analytics),
    getMetrics: analytics.getMetrics.bind(analytics),
    clearData: analytics.clearData.bind(analytics)
  }
}
