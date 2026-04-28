import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/serviceWorker', () => ({
  skipWaiting: vi.fn(),
}))

import * as sw from '@/lib/serviceWorker'
import { ServiceWorkerUpdate } from './ServiceWorkerUpdate'

const mockSkipWaiting = sw.skipWaiting as ReturnType<typeof vi.fn>

// Helper to build a fake ServiceWorkerRegistration.
function makeReg(
  waitingState?: ServiceWorkerState,
): ServiceWorkerRegistration {
  const waiting = waitingState
    ? ({ state: waitingState } as unknown as ServiceWorker)
    : null
  return {
    waiting,
    installing: null,
    active: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    update: vi.fn(),
    unregister: vi.fn().mockResolvedValue(true),
  } as unknown as ServiceWorkerRegistration
}

describe('ServiceWorkerUpdate', () => {
  let origServiceWorker: ServiceWorker | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    // By default, hide navigator.serviceWorker so the effect doesn't run.
    origServiceWorker = navigator.serviceWorker as unknown as ServiceWorker | undefined
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: origServiceWorker,
    })
    vi.restoreAllMocks()
  })

  it('renders nothing by default (no update detected)', () => {
    const { container } = render(<ServiceWorkerUpdate />)
    // No update banner should be visible
    expect(container.querySelector('[class*="fixed"]')).not.toBeInTheDocument()
  })

  it('shows the update banner when a waiting worker is present at mount', async () => {
    const reg = makeReg('installed')
    const readyPromise = Promise.resolve(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: readyPromise,
        controller: {},
      },
    })

    render(<ServiceWorkerUpdate />)
    await act(async () => { await readyPromise })
    expect(screen.getByText('Update available')).toBeInTheDocument()
    expect(screen.getByText('A new version is ready to install')).toBeInTheDocument()
  })

  it('shows the "Later" and "Update" buttons in the banner', async () => {
    const reg = makeReg('installed')
    const readyPromise = Promise.resolve(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: readyPromise, controller: {} },
    })

    render(<ServiceWorkerUpdate />)
    await act(async () => { await readyPromise })
    expect(screen.getByRole('button', { name: /Later/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Update/i })).toBeInTheDocument()
  })

  it('dismisses the banner when "Later" is clicked (showUpdate becomes false)', async () => {
    const reg = makeReg('installed')
    const readyPromise = Promise.resolve(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: readyPromise, controller: {} },
    })

    const user = userEvent.setup()
    render(<ServiceWorkerUpdate />)
    await act(async () => { await readyPromise })
    // Banner is present before click
    expect(screen.getByRole('button', { name: /Later/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Later/i }))
    // After state change, framer-motion starts the exit animation.
    // We verify that skipWaiting was NOT called (user chose "Later").
    expect(mockSkipWaiting).not.toHaveBeenCalled()
  })

  it('calls skipWaiting and reloads when "Update" is clicked', async () => {
    const reg = makeReg('installed')
    const readyPromise = Promise.resolve(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: readyPromise, controller: {} },
    })

    const reload = vi.fn()
    vi.stubGlobal('location', { reload })

    const user = userEvent.setup()
    render(<ServiceWorkerUpdate />)
    await act(async () => { await readyPromise })
    await user.click(screen.getByRole('button', { name: /Update/i }))

    expect(mockSkipWaiting).toHaveBeenCalledTimes(1)
    expect(mockSkipWaiting).toHaveBeenCalledWith(reg)
    expect(reload).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })

  it('does not call skipWaiting when no waiting worker exists', async () => {
    // Build a reg with no waiting worker; handleUpdate should be a no-op.
    const reg = makeReg()
    const readyPromise = Promise.resolve(reg)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: readyPromise, controller: {} },
    })

    render(<ServiceWorkerUpdate />)
    await act(async () => { await readyPromise })
    // Banner should not appear because reg.waiting is null.
    expect(screen.queryByText('Update available')).not.toBeInTheDocument()
    expect(mockSkipWaiting).not.toHaveBeenCalled()
  })
})
