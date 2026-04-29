import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OfflineFallback } from './OfflineFallback'

describe('OfflineFallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the offline heading', () => {
    render(<OfflineFallback />)
    expect(screen.getByRole('heading', { name: /You're offline/i })).toBeInTheDocument()
  })

  it('renders the not-available-offline description', () => {
    render(<OfflineFallback />)
    expect(screen.getByText(/not available offline/i)).toBeInTheDocument()
  })

  it('renders the cached-content note', () => {
    render(<OfflineFallback />)
    expect(screen.getByText(/Cached pages/i)).toBeInTheDocument()
  })

  it('renders Try Again and Go to Home buttons', () => {
    render(<OfflineFallback />)
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to Home/i })).toBeInTheDocument()
  })

  it('clicking Try Again calls window.location.reload()', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { reload, href: '' })
    const user = userEvent.setup()
    render(<OfflineFallback />)
    await user.click(screen.getByRole('button', { name: /Try Again/i }))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('clicking Go to Home sets window.location.href to "/"', async () => {
    const locationObj = { reload: vi.fn(), href: '' }
    vi.stubGlobal('location', locationObj)
    const user = userEvent.setup()
    render(<OfflineFallback />)
    await user.click(screen.getByRole('button', { name: /Go to Home/i }))
    expect(locationObj.href).toBe('/')
  })
})
