import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { InstallPrompt } from './InstallPrompt'

vi.mock('@github/spark/hooks', () => ({
  useKV: vi.fn((key, defaultVal) => [defaultVal, vi.fn()]),
}))

vi.mock('@/hooks/use-install-prompt', () => ({
  useInstallPrompt: vi.fn(),
}))

import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { useKV } from '@github/spark/hooks'

const mockUseInstallPrompt = useInstallPrompt as ReturnType<typeof vi.fn>
const mockUseKV = useKV as ReturnType<typeof vi.fn>

describe('InstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when already installed', () => {
    mockUseInstallPrompt.mockReturnValue({ canInstall: true, isInstalled: true, promptInstall: vi.fn() })
    mockUseKV.mockReturnValue([false, vi.fn()])

    const { container } = render(<InstallPrompt />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when dismissed', () => {
    mockUseInstallPrompt.mockReturnValue({ canInstall: true, isInstalled: false, promptInstall: vi.fn() })
    mockUseKV.mockReturnValue([true, vi.fn()])

    const { container } = render(<InstallPrompt />)
    act(() => { vi.advanceTimersByTime(4000) })
    expect(screen.queryByText('Install TrueAI')).not.toBeInTheDocument()
  })

  it('shows prompt after 3 seconds when canInstall and not dismissed', () => {
    mockUseInstallPrompt.mockReturnValue({ canInstall: true, isInstalled: false, promptInstall: vi.fn() })
    mockUseKV.mockReturnValue([false, vi.fn()])

    render(<InstallPrompt />)
    expect(screen.queryByText('Install TrueAI')).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(3000) })
    expect(screen.getByText('Install TrueAI')).toBeInTheDocument()
    expect(screen.getByText('Install this app for quick access and offline use')).toBeInTheDocument()
  })

  it('does not show prompt before 3 seconds', () => {
    mockUseInstallPrompt.mockReturnValue({ canInstall: true, isInstalled: false, promptInstall: vi.fn() })
    mockUseKV.mockReturnValue([false, vi.fn()])

    render(<InstallPrompt />)
    act(() => { vi.advanceTimersByTime(2999) })
    expect(screen.queryByText('Install TrueAI')).not.toBeInTheDocument()
  })

  it('does not show prompt when canInstall is false', () => {
    mockUseInstallPrompt.mockReturnValue({ canInstall: false, isInstalled: false, promptInstall: vi.fn() })
    mockUseKV.mockReturnValue([false, vi.fn()])

    render(<InstallPrompt />)
    act(() => { vi.advanceTimersByTime(4000) })
    expect(screen.queryByText('Install TrueAI')).not.toBeInTheDocument()
  })

  it('dismiss button hides the prompt and calls setDismissed', () => {
    const setDismissed = vi.fn()
    mockUseInstallPrompt.mockReturnValue({ canInstall: true, isInstalled: false, promptInstall: vi.fn() })
    mockUseKV.mockReturnValue([false, setDismissed])

    render(<InstallPrompt />)
    act(() => { vi.advanceTimersByTime(3000) })

    expect(screen.getByText('Install TrueAI')).toBeInTheDocument()

    const notNowBtn = screen.getByRole('button', { name: /not now/i })
    fireEvent.click(notNowBtn)
    expect(setDismissed).toHaveBeenCalledWith(true)
  })

  it('calls promptInstall when Install button clicked', async () => {
    const promptInstall = vi.fn().mockResolvedValue(true)
    mockUseInstallPrompt.mockReturnValue({ canInstall: true, isInstalled: false, promptInstall })
    mockUseKV.mockReturnValue([false, vi.fn()])

    render(<InstallPrompt />)
    act(() => { vi.advanceTimersByTime(3000) })

    const installBtn = screen.getByRole('button', { name: /^install$/i })
    await act(async () => { fireEvent.click(installBtn) })
    expect(promptInstall).toHaveBeenCalled()
  })
})
