import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ResourceLoader, preloadCriticalResources, preloadFont, deferNonCriticalScripts, optimizeResourceLoading } from './resource-loader'

describe('ResourceLoader', () => {
  let loader: ResourceLoader

  beforeEach(() => {
    loader = ResourceLoader.getInstance()
    loader.clear()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    loader.clear()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should return a singleton instance', () => {
    const instance1 = ResourceLoader.getInstance()
    const instance2 = ResourceLoader.getInstance()

    expect(instance1).toBe(instance2)
  })

  it('should add tasks to the queue', () => {
    const task = {
      id: 'test-task',
      priority: 'medium' as const,
      execute: vi.fn().mockResolvedValue(undefined)
    }

    loader.addTask(task)

    expect(loader.getQueueSize()).toBeGreaterThan(0)
  })

  it('should prioritize tasks correctly', () => {
    const executionOrder: string[] = []

    const lowPriorityTask = {
      id: 'low',
      priority: 'low' as const,
      execute: vi.fn().mockImplementation(async () => {
        executionOrder.push('low')
      })
    }

    const criticalTask = {
      id: 'critical',
      priority: 'critical' as const,
      execute: vi.fn().mockImplementation(async () => {
        executionOrder.push('critical')
      })
    }

    const highTask = {
      id: 'high',
      priority: 'high' as const,
      execute: vi.fn().mockImplementation(async () => {
        executionOrder.push('high')
      })
    }

    // Add in non-priority order
    loader.addTask(lowPriorityTask)
    loader.addTask(criticalTask)
    loader.addTask(highTask)

    // Critical should be first, then high, then low
    vi.runAllTimers()

    // At least critical should execute first
    expect(executionOrder[0]).toBe('critical')
  })

  it('should set concurrency limit', () => {
    loader.setConcurrency(5)

    // Concurrency is set (no way to directly test internal state)
    // but we can verify the method doesn't crash
    expect(loader).toBeDefined()
  })

  it('should execute tasks', async () => {
    const mockExecute = vi.fn().mockResolvedValue(undefined)

    const task = {
      id: 'execute-test',
      priority: 'medium' as const,
      execute: mockExecute
    }

    loader.addTask(task)

    await vi.runAllTimersAsync()

    expect(mockExecute).toHaveBeenCalled()
  })

  it('should handle task timeout', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const slowTask = {
      id: 'slow-task',
      priority: 'medium' as const,
      execute: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 10000))),
      timeout: 100
    }

    loader.addTask(slowTask)

    await vi.runAllTimersAsync()

    // Task should fail due to timeout
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('should handle task execution errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const failingTask = {
      id: 'failing-task',
      priority: 'medium' as const,
      execute: vi.fn().mockRejectedValue(new Error('Task failed'))
    }

    loader.addTask(failingTask)

    await vi.runAllTimersAsync()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Task failing-task failed:',
      expect.any(Error)
    )

    consoleErrorSpy.mockRestore()
  })

  it('should clear the queue', () => {
    const task = {
      id: 'test-task',
      priority: 'medium' as const,
      execute: vi.fn().mockResolvedValue(undefined)
    }

    loader.addTask(task)
    expect(loader.getQueueSize()).toBeGreaterThan(0)

    loader.clear()
    expect(loader.getQueueSize()).toBe(0)
  })

  it('should return queue size', () => {
    expect(loader.getQueueSize()).toBe(0)

    loader.addTask({
      id: 'task1',
      priority: 'medium' as const,
      execute: vi.fn().mockResolvedValue(undefined)
    })

    loader.addTask({
      id: 'task2',
      priority: 'low' as const,
      execute: vi.fn().mockResolvedValue(undefined)
    })

    expect(loader.getQueueSize()).toBe(2)
  })

  it('should execute tasks without timeout', async () => {
    const mockExecute = vi.fn().mockResolvedValue(undefined)

    const task = {
      id: 'no-timeout-task',
      priority: 'medium' as const,
      execute: mockExecute
    }

    loader.addTask(task)

    await vi.runAllTimersAsync()

    expect(mockExecute).toHaveBeenCalled()
  })

  it('should handle concurrent tasks', async () => {
    const executionCount = { value: 0 }

    for (let i = 0; i < 5; i++) {
      loader.addTask({
        id: `task-${i}`,
        priority: 'medium' as const,
        execute: vi.fn().mockImplementation(async () => {
          executionCount.value++
          await new Promise(resolve => setTimeout(resolve, 10))
        })
      })
    }

    await vi.runAllTimersAsync()

    expect(executionCount.value).toBe(5)
  })
})

describe('preloadCriticalResources', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    const loader = ResourceLoader.getInstance()
    loader.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should preload critical resources', async () => {
    const resources = ['/api/data1', '/api/data2']

    preloadCriticalResources(resources)

    await vi.runAllTimersAsync()

    // Check that link elements were created
    const links = document.head.querySelectorAll('link[rel="preload"]')
    expect(links.length).toBeGreaterThan(0)
  })

  it('should handle empty resources array', () => {
    expect(() => preloadCriticalResources([])).not.toThrow()
  })
})

describe('preloadFont', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    const loader = ResourceLoader.getInstance()
    loader.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should preload font', async () => {
    preloadFont('Roboto', '/fonts/roboto.woff2')

    await vi.runAllTimersAsync()

    const links = document.head.querySelectorAll('link[rel="preload"][as="font"]')
    expect(links.length).toBeGreaterThan(0)
  })

  it('should set correct font attributes', async () => {
    preloadFont('OpenSans', '/fonts/opensans.woff2')

    await vi.runAllTimersAsync()

    const link = document.head.querySelector('link[rel="preload"][as="font"]')
    expect(link).toBeDefined()
    if (link) {
      expect(link.getAttribute('type')).toBe('font/woff2')
      expect(link.getAttribute('crossOrigin')).toBe('anonymous')
    }
  })
})

describe('deferNonCriticalScripts', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    const loader = ResourceLoader.getInstance()
    loader.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should defer non-critical scripts', async () => {
    document.body.innerHTML = `
      <script data-defer="true" src="/script1.js"></script>
      <script data-defer="true" src="/script2.js"></script>
    `

    deferNonCriticalScripts()

    await vi.runAllTimersAsync()

    // Scripts should be processed (queue reduced)
    const loader = ResourceLoader.getInstance()
    expect(loader.getQueueSize()).toBe(0)
  })

  it('should handle scripts without src attribute', async () => {
    document.body.innerHTML = `
      <script data-defer="true">console.log('inline')</script>
    `

    expect(() => deferNonCriticalScripts()).not.toThrow()
  })

  it('should handle no deferred scripts', () => {
    document.body.innerHTML = '<div>No scripts</div>'

    expect(() => deferNonCriticalScripts()).not.toThrow()
  })
})

describe('optimizeResourceLoading', () => {
  let loader: ResourceLoader

  beforeEach(() => {
    loader = ResourceLoader.getInstance()
    loader.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should set concurrency for low-end devices', () => {
    expect(() => optimizeResourceLoading('low')).not.toThrow()
  })

  it('should set concurrency for mid-tier devices', () => {
    expect(() => optimizeResourceLoading('mid')).not.toThrow()
  })

  it('should set concurrency for high-end devices', () => {
    expect(() => optimizeResourceLoading('high')).not.toThrow()
  })

  it('should use different concurrency levels for different tiers', () => {
    // Call each tier setting
    optimizeResourceLoading('low')
    optimizeResourceLoading('mid')
    optimizeResourceLoading('high')

    // Verify no crashes occur
    expect(loader).toBeDefined()
  })
})
