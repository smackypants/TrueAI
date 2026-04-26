import { useEffect, useCallback, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import type { Conversation, Message, Agent, AgentRun } from '@/lib/types'

interface DataPrefetchState {
  conversations: {
    data: Conversation[] | null
    timestamp: number
  }
  messages: {
    data: Message[] | null
    timestamp: number
  }
  agents: {
    data: Agent[] | null
    timestamp: number
  }
  agentRuns: {
    data: AgentRun[] | null
    timestamp: number
  }
}

const CACHE_TTL = 5 * 60 * 1000

export function useDataPrefetcher() {
  const [conversations] = useKV<Conversation[]>('conversations', [])
  const [messages] = useKV<Message[]>('messages', [])
  const [agents] = useKV<Agent[]>('agents', [])
  const [agentRuns] = useKV<AgentRun[]>('agent-runs', [])
  
  const prefetchCache = useRef<DataPrefetchState>({
    conversations: { data: null, timestamp: 0 },
    messages: { data: null, timestamp: 0 },
    agents: { data: null, timestamp: 0 },
    agentRuns: { data: null, timestamp: 0 }
  })

  const isDataStale = useCallback((timestamp: number): boolean => {
    return Date.now() - timestamp > CACHE_TTL
  }, [])

  const prefetchConversations = useCallback((): Conversation[] | null => {
    const cached = prefetchCache.current.conversations
    if (cached.data && !isDataStale(cached.timestamp)) {
      return cached.data
    }

    if (conversations) {
      prefetchCache.current.conversations = {
        data: conversations,
        timestamp: Date.now()
      }
      return conversations
    }

    return null
  }, [conversations, isDataStale])

  const prefetchMessages = useCallback((conversationId?: string): Message[] | null => {
    const cached = prefetchCache.current.messages
    if (cached.data && !isDataStale(cached.timestamp)) {
      if (conversationId) {
        return cached.data.filter(m => m.conversationId === conversationId)
      }
      return cached.data
    }

    if (messages) {
      prefetchCache.current.messages = {
        data: messages,
        timestamp: Date.now()
      }
      
      if (conversationId) {
        return messages.filter(m => m.conversationId === conversationId)
      }
      return messages
    }

    return null
  }, [messages, isDataStale])

  const prefetchAgents = useCallback((): Agent[] | null => {
    const cached = prefetchCache.current.agents
    if (cached.data && !isDataStale(cached.timestamp)) {
      return cached.data
    }

    if (agents) {
      prefetchCache.current.agents = {
        data: agents,
        timestamp: Date.now()
      }
      return agents
    }

    return null
  }, [agents, isDataStale])

  const prefetchAgentRuns = useCallback((agentId?: string): AgentRun[] | null => {
    const cached = prefetchCache.current.agentRuns
    if (cached.data && !isDataStale(cached.timestamp)) {
      if (agentId) {
        return cached.data.filter(r => r.agentId === agentId)
      }
      return cached.data
    }

    if (agentRuns) {
      prefetchCache.current.agentRuns = {
        data: agentRuns,
        timestamp: Date.now()
      }
      
      if (agentId) {
        return agentRuns.filter(r => r.agentId === agentId)
      }
      return agentRuns
    }

    return null
  }, [agentRuns, isDataStale])

  const prefetchConversationWithMessages = useCallback((conversationId: string) => {
    const conv = prefetchConversations()?.find(c => c.id === conversationId)
    const msgs = prefetchMessages(conversationId)
    
    return {
      conversation: conv || null,
      messages: msgs || []
    }
  }, [prefetchConversations, prefetchMessages])

  const prefetchAgentWithRuns = useCallback((agentId: string) => {
    const agent = prefetchAgents()?.find(a => a.id === agentId)
    const runs = prefetchAgentRuns(agentId)
    
    return {
      agent: agent || null,
      runs: runs || []
    }
  }, [prefetchAgents, prefetchAgentRuns])

  const invalidateCache = useCallback((type?: keyof DataPrefetchState) => {
    if (type) {
      prefetchCache.current[type] = { data: null, timestamp: 0 }
    } else {
      prefetchCache.current = {
        conversations: { data: null, timestamp: 0 },
        messages: { data: null, timestamp: 0 },
        agents: { data: null, timestamp: 0 },
        agentRuns: { data: null, timestamp: 0 }
      }
    }
  }, [])

  const warmupCache = useCallback(() => {
    prefetchConversations()
    prefetchMessages()
    prefetchAgents()
    prefetchAgentRuns()
  }, [prefetchConversations, prefetchMessages, prefetchAgents, prefetchAgentRuns])

  useEffect(() => {
    const timer = setTimeout(() => {
      warmupCache()
    }, 1000)

    return () => clearTimeout(timer)
  }, [warmupCache])

  return {
    prefetchConversations,
    prefetchMessages,
    prefetchAgents,
    prefetchAgentRuns,
    prefetchConversationWithMessages,
    prefetchAgentWithRuns,
    invalidateCache,
    warmupCache
  }
}

export function useSmartPrefetch(activeTab: string) {
  const dataPrefetcher = useDataPrefetcher()
  const hasPrefetched = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (hasPrefetched.current.has(activeTab)) {
      return
    }

    const timer = setTimeout(() => {
      switch (activeTab) {
        case 'chat':
          dataPrefetcher.prefetchConversations()
          dataPrefetcher.prefetchMessages()
          break
        case 'agents':
          dataPrefetcher.prefetchAgents()
          dataPrefetcher.prefetchAgentRuns()
          break
        case 'workflows':
        case 'models':
        case 'analytics':
        case 'builder':
          dataPrefetcher.warmupCache()
          break
      }

      hasPrefetched.current.add(activeTab)
    }, 300)

    return () => clearTimeout(timer)
  }, [activeTab, dataPrefetcher])

  return dataPrefetcher
}
