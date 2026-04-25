import { offlineQueue } from '@/lib/offline-queue'
import type { Conversation, Message, Agent, ModelConfig } from '@/lib/types'

export const queuedActions = {
  async createConversation(conversation: Conversation) {
    if (!navigator.onLine) {
      await offlineQueue.enqueue({
        type: 'conversation',
        action: 'create',
        data: conversation
      })
    }
  },

  async updateConversation(conversation: Conversation) {
    if (!navigator.onLine) {
      await offlineQueue.enqueue({
        type: 'conversation',
        action: 'update',
        data: conversation
      })
    }
  },

  async deleteConversation(conversationId: string) {
    if (!navigator.onLine) {
      await offlineQueue.enqueue({
        type: 'conversation',
        action: 'delete',
        data: { id: conversationId }
      })
    }
  },

  async createMessage(message: Message) {
    if (!navigator.onLine) {
      await offlineQueue.enqueue({
        type: 'message',
        action: 'create',
        data: message
      })
    }
  },

  async createAgent(agent: Agent) {
    if (!navigator.onLine) {
      await offlineQueue.enqueue({
        type: 'agent',
        action: 'create',
        data: agent
      })
    }
  },

  async updateAgent(agent: Agent) {
    if (!navigator.onLine) {
      await offlineQueue.enqueue({
        type: 'agent',
        action: 'update',
        data: agent
      })
    }
  },

  async deleteAgent(agentId: string) {
    if (!navigator.onLine) {
      await offlineQueue.enqueue({
        type: 'agent',
        action: 'delete',
        data: { id: agentId }
      })
    }
  },

  async updateModel(model: ModelConfig) {
    if (!navigator.onLine) {
      await offlineQueue.enqueue({
        type: 'model',
        action: 'update',
        data: model
      })
    }
  },

  async saveCode(fileName: string, code: string) {
    if (!navigator.onLine) {
      await offlineQueue.enqueue({
        type: 'code',
        action: 'update',
        data: { fileName, code }
      })
    }
  },

  async trackAnalytics(event: string, category: string, action: string, metadata?: Record<string, unknown>) {
    if (!navigator.onLine) {
      await offlineQueue.enqueue({
        type: 'analytics',
        action: 'create',
        data: { event, category, action, metadata }
      })
    }
  }
}
