import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mocks must be hoisted before importing the module under test.
vi.mock('@/lib/offline-queue', () => ({
  offlineQueue: {
    enqueue: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/native/network', () => ({
  isOffline: vi.fn(),
}))

import { queuedActions } from './queued-actions'
import { offlineQueue } from '@/lib/offline-queue'
import { isOffline } from '@/lib/native/network'
import type { Conversation, Message, Agent, ModelConfig } from '@/lib/types'

const mockEnqueue = offlineQueue.enqueue as ReturnType<typeof vi.fn>
const mockIsOffline = isOffline as ReturnType<typeof vi.fn>

const sampleConversation: Conversation = {
  id: 'c1',
  title: 'Test',
  model: 'gpt-x',
  createdAt: 1,
  updatedAt: 2,
}

const sampleMessage: Message = {
  id: 'm1',
  conversationId: 'c1',
  role: 'user',
  content: 'hi',
  timestamp: 1,
}

const sampleAgent: Agent = {
  id: 'a1',
  name: 'Agent',
  goal: 'do',
  model: 'gpt-x',
  tools: [],
  createdAt: 1,
  status: 'idle',
}

const sampleModel: ModelConfig = {
  id: 'mdl',
  name: 'Model',
  provider: 'ollama',
  temperature: 0.7,
  maxTokens: 1024,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
}

describe('queuedActions', () => {
  beforeEach(() => {
    mockEnqueue.mockClear()
    mockIsOffline.mockReset()
  })

  describe('when online', () => {
    beforeEach(() => mockIsOffline.mockReturnValue(false))

    it('does not enqueue createConversation', async () => {
      await queuedActions.createConversation(sampleConversation)
      expect(mockEnqueue).not.toHaveBeenCalled()
    })

    it('does not enqueue any of the action types', async () => {
      await queuedActions.updateConversation(sampleConversation)
      await queuedActions.deleteConversation('c1')
      await queuedActions.createMessage(sampleMessage)
      await queuedActions.createAgent(sampleAgent)
      await queuedActions.updateAgent(sampleAgent)
      await queuedActions.deleteAgent('a1')
      await queuedActions.updateModel(sampleModel)
      await queuedActions.saveCode('foo.ts', 'x=1')
      await queuedActions.trackAnalytics('e', 'cat', 'act')
      expect(mockEnqueue).not.toHaveBeenCalled()
    })
  })

  describe('when offline', () => {
    beforeEach(() => mockIsOffline.mockReturnValue(true))

    it('enqueues createConversation', async () => {
      await queuedActions.createConversation(sampleConversation)
      expect(mockEnqueue).toHaveBeenCalledWith({
        type: 'conversation',
        action: 'create',
        data: sampleConversation,
      })
    })

    it('enqueues updateConversation', async () => {
      await queuedActions.updateConversation(sampleConversation)
      expect(mockEnqueue).toHaveBeenCalledWith({
        type: 'conversation',
        action: 'update',
        data: sampleConversation,
      })
    })

    it('enqueues deleteConversation with id payload', async () => {
      await queuedActions.deleteConversation('c1')
      expect(mockEnqueue).toHaveBeenCalledWith({
        type: 'conversation',
        action: 'delete',
        data: { id: 'c1' },
      })
    })

    it('enqueues createMessage', async () => {
      await queuedActions.createMessage(sampleMessage)
      expect(mockEnqueue).toHaveBeenCalledWith({
        type: 'message',
        action: 'create',
        data: sampleMessage,
      })
    })

    it('enqueues createAgent / updateAgent / deleteAgent', async () => {
      await queuedActions.createAgent(sampleAgent)
      await queuedActions.updateAgent(sampleAgent)
      await queuedActions.deleteAgent('a1')
      expect(mockEnqueue).toHaveBeenNthCalledWith(1, {
        type: 'agent',
        action: 'create',
        data: sampleAgent,
      })
      expect(mockEnqueue).toHaveBeenNthCalledWith(2, {
        type: 'agent',
        action: 'update',
        data: sampleAgent,
      })
      expect(mockEnqueue).toHaveBeenNthCalledWith(3, {
        type: 'agent',
        action: 'delete',
        data: { id: 'a1' },
      })
    })

    it('enqueues updateModel', async () => {
      await queuedActions.updateModel(sampleModel)
      expect(mockEnqueue).toHaveBeenCalledWith({
        type: 'model',
        action: 'update',
        data: sampleModel,
      })
    })

    it('enqueues saveCode with fileName + code', async () => {
      await queuedActions.saveCode('a.ts', 'console.log(1)')
      expect(mockEnqueue).toHaveBeenCalledWith({
        type: 'code',
        action: 'update',
        data: { fileName: 'a.ts', code: 'console.log(1)' },
      })
    })

    it('enqueues trackAnalytics with the full event payload', async () => {
      await queuedActions.trackAnalytics('login', 'auth', 'submit', { userId: 'u1' })
      expect(mockEnqueue).toHaveBeenCalledWith({
        type: 'analytics',
        action: 'create',
        data: { event: 'login', category: 'auth', action: 'submit', metadata: { userId: 'u1' } },
      })
    })

    it('enqueues trackAnalytics with undefined metadata when not supplied', async () => {
      await queuedActions.trackAnalytics('view', 'page', 'open')
      expect(mockEnqueue).toHaveBeenCalledWith({
        type: 'analytics',
        action: 'create',
        data: { event: 'view', category: 'page', action: 'open', metadata: undefined },
      })
    })
  })
})
