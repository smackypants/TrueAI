/**
 * Copyright (c) 2024-2026 Skyler Jones ("smackypants") / Advanced Technology Research
 *
 * Tests for the root <ErrorFallback /> shown by the top-level
 * react-error-boundary in src/main.tsx. Covers:
 *  - DEV-mode passthrough (rethrows so the dev overlay surfaces the error)
 *  - Initial render: error name/message/stack, "Collecting diagnostics…"
 *    placeholder, and the buttons that are unconditionally visible.
 *  - Wiring of every action button to the corresponding `lib/diagnostics`
 *    helper and the user-facing status text it produces.
 *  - Conditional buttons: Share appears only when `getCapacitorShare()`
 *    returns a non-null value, and "Report on GitHub" appears only when a
 *    GitHub owner+repo is configured.
 *  - The `resetErrorBoundary` callback is wired to the "Try Again" button.
 *  - Automatic background submission: success and network-error paths set
 *    the right status string; silent reasons (disabled / duplicate /
 *    not-android / etc.) leave the status empty.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ErrorFallback } from './ErrorFallback'
import type { DiagnosticReport, GitHubReportingConfig } from './lib/diagnostics'

// ---------------------------------------------------------------------------
// Mock the entire diagnostics module. Every export the component imports is
// replaced with a vi.fn so we can assert call counts/args and control return
// values per-test. Keep the type exports as `any` re-exports — the component
// only uses them at the type level.
// ---------------------------------------------------------------------------
vi.mock('./lib/diagnostics', () => {
  return {
    appendErrorLogEntry: vi.fn(() => true),
    collectDiagnostics: vi.fn(),
    copyToClipboard: vi.fn(),
    downloadErrorLog: vi.fn(() => 0),
    formatDiagnosticReport: vi.fn(
      (report: DiagnosticReport) => `formatted:${report.timestamp}`,
    ),
    getCapacitorShare: vi.fn(() => null),
    loadErrorReportingConfig: vi.fn(),
    openGitHubIssue: vi.fn(() => true),
    reloadBypassingCache: vi.fn(() => Promise.resolve()),
    shareDiagnosticReport: vi.fn(),
    submitDiagnosticReport: vi.fn(),
  }
})

// Pull the mocks back in *after* vi.mock has been hoisted.
import * as diagnostics from './lib/diagnostics'

const mocks = diagnostics as unknown as {
  appendErrorLogEntry: ReturnType<typeof vi.fn>
  collectDiagnostics: ReturnType<typeof vi.fn>
  copyToClipboard: ReturnType<typeof vi.fn>
  downloadErrorLog: ReturnType<typeof vi.fn>
  formatDiagnosticReport: ReturnType<typeof vi.fn>
  getCapacitorShare: ReturnType<typeof vi.fn>
  loadErrorReportingConfig: ReturnType<typeof vi.fn>
  openGitHubIssue: ReturnType<typeof vi.fn>
  reloadBypassingCache: ReturnType<typeof vi.fn>
  shareDiagnosticReport: ReturnType<typeof vi.fn>
  submitDiagnosticReport: ReturnType<typeof vi.fn>
}

const sampleReport: DiagnosticReport = {
  timestamp: '2026-04-29T00:00:00.000Z',
  // The component only uses .timestamp for our mocked formatter; cast the
  // rest of the (large) shape to keep the test focused on behaviour.
} as DiagnosticReport

const sampleGithub: GitHubReportingConfig = {
  owner: 'smackypants',
  repo: 'trueai-localai',
  labels: [],
}

// Default happy-path stubs used by most tests. Individual tests can override
// any of these in their setup.
function applyDefaultMockBehaviour() {
  mocks.collectDiagnostics.mockResolvedValue(sampleReport)
  mocks.loadErrorReportingConfig.mockResolvedValue({ github: null })
  mocks.submitDiagnosticReport.mockResolvedValue({ submitted: false, reason: 'disabled' })
  mocks.copyToClipboard.mockResolvedValue(true)
  mocks.shareDiagnosticReport.mockResolvedValue(true)
  mocks.getCapacitorShare.mockReturnValue(null)
}

beforeEach(() => {
  vi.clearAllMocks()
  applyDefaultMockBehaviour()
  // The component intentionally rethrows in DEV so the Vite overlay can
  // catch the original error. Tests run with `import.meta.env.DEV === true`
  // by default, so stub it for every test in this file.
  vi.stubEnv('DEV', false)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

function makeError(message = 'boom') {
  const err = new Error(message)
  err.name = 'BoomError'
  err.stack = `BoomError: ${message}\n    at fake (file.ts:1:1)`
  return err
}

describe('ErrorFallback', () => {
  it('rethrows the error in DEV mode so the Vite overlay can catch it', () => {
    vi.stubEnv('DEV', true)
    const reset = vi.fn()
    const error = makeError('dev-mode')
    expect(() =>
      render(<ErrorFallback error={error} resetErrorBoundary={reset} />),
    ).toThrow('dev-mode')
  })

  it('renders the error name, message, stack and the placeholder report on first paint', async () => {
    // Hold off on the diagnostics promise so we can assert the placeholder.
    let resolveCollect: (r: DiagnosticReport) => void = () => {}
    mocks.collectDiagnostics.mockReturnValue(
      new Promise<DiagnosticReport>((res) => { resolveCollect = res }),
    )

    render(<ErrorFallback error={makeError('hello')} resetErrorBoundary={vi.fn()} />)

    expect(screen.getByText('This app has encountered a runtime error')).toBeInTheDocument()
    const reportNode = screen.getByTestId('diagnostic-report')
    expect(reportNode.textContent).toBe('Collecting diagnostics…')
    // Error pre block contains name + message + stack.
    expect(screen.getByText(/BoomError: hello/)).toBeInTheDocument()
    expect(screen.getByText(/at fake \(file\.ts:1:1\)/)).toBeInTheDocument()

    // Buttons that are always present.
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload app/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy diagnostic report/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download error log/i })).toBeInTheDocument()
    // Conditional buttons are hidden by default.
    expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /report on github/i })).not.toBeInTheDocument()

    // Resolve the diagnostics promise; placeholder should be replaced and
    // the log-append + auto-submit should fire.
    await act(async () => {
      resolveCollect(sampleReport)
    })
    await waitFor(() => {
      expect(screen.getByTestId('diagnostic-report').textContent).toBe(
        `formatted:${sampleReport.timestamp}`,
      )
    })
    expect(mocks.appendErrorLogEntry).toHaveBeenCalledWith(sampleReport)
    expect(mocks.submitDiagnosticReport).toHaveBeenCalledWith(sampleReport)
  })

  it('shows the Share button only when getCapacitorShare reports a share API', async () => {
    mocks.getCapacitorShare.mockReturnValue({ share: true })
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)
    await screen.findByRole('button', { name: /share/i })
  })

  it('shows the GitHub button only when a GitHub owner+repo is configured', async () => {
    mocks.loadErrorReportingConfig.mockResolvedValue({ github: sampleGithub })
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)
    await screen.findByRole('button', { name: /report on github/i })
  })

  it('hides the GitHub button when only owner OR repo is provided', async () => {
    mocks.loadErrorReportingConfig.mockResolvedValue({
      github: { ...sampleGithub, repo: '' },
    })
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)
    // Wait for the diagnostics flow to complete, then assert the absence.
    await waitFor(() => expect(mocks.appendErrorLogEntry).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /report on github/i })).not.toBeInTheDocument()
  })

  it('"Try Again" calls resetErrorBoundary', async () => {
    const user = userEvent.setup()
    const reset = vi.fn()
    render(<ErrorFallback error={makeError()} resetErrorBoundary={reset} />)
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('"Reload App" calls reloadBypassingCache and shows the clearing-caches status', async () => {
    const user = userEvent.setup()
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /reload app/i }))
    expect(mocks.reloadBypassingCache).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/clearing caches and reloading/i)).toBeInTheDocument()
  })

  it('"Copy Diagnostic Report" copies the formatted report and shows success status', async () => {
    const user = userEvent.setup()
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)

    // Wait for report to be ready (button is disabled until then).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /copy diagnostic report/i })).not.toBeDisabled(),
    )

    await user.click(screen.getByRole('button', { name: /copy diagnostic report/i }))
    expect(mocks.copyToClipboard).toHaveBeenCalledWith(`formatted:${sampleReport.timestamp}`)
    await screen.findByText(/copied to clipboard/i)
  })

  it('shows a failure status when copyToClipboard returns false', async () => {
    mocks.copyToClipboard.mockResolvedValue(false)
    const user = userEvent.setup()
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /copy diagnostic report/i })).not.toBeDisabled(),
    )
    await user.click(screen.getByRole('button', { name: /copy diagnostic report/i }))
    await screen.findByText(/could not copy to clipboard/i)
  })

  it('"Share" calls shareDiagnosticReport and shows success status', async () => {
    mocks.getCapacitorShare.mockReturnValue({ share: true })
    const user = userEvent.setup()
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)
    const shareBtn = await screen.findByRole('button', { name: /share/i })
    await waitFor(() => expect(shareBtn).not.toBeDisabled())
    await user.click(shareBtn)
    expect(mocks.shareDiagnosticReport).toHaveBeenCalledWith(sampleReport)
    await screen.findByText(/share dialog opened/i)
  })

  it('shows a failure status when shareDiagnosticReport returns false', async () => {
    mocks.getCapacitorShare.mockReturnValue({ share: true })
    mocks.shareDiagnosticReport.mockResolvedValue(false)
    const user = userEvent.setup()
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)
    const shareBtn = await screen.findByRole('button', { name: /share/i })
    await waitFor(() => expect(shareBtn).not.toBeDisabled())
    await user.click(shareBtn)
    await screen.findByText(/could not open share dialog/i)
  })

  it('"Download Error Log" pluralises the entry count', async () => {
    const user = userEvent.setup()
    mocks.downloadErrorLog.mockReturnValueOnce(0)
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /download error log/i }))
    expect(mocks.downloadErrorLog).toHaveBeenCalledTimes(1)
    await screen.findByText(/no saved errors to download yet/i)

    mocks.downloadErrorLog.mockReturnValueOnce(1)
    await user.click(screen.getByRole('button', { name: /download error log/i }))
    await screen.findByText(/downloaded error log \(1 entry\)/i)

    mocks.downloadErrorLog.mockReturnValueOnce(3)
    await user.click(screen.getByRole('button', { name: /download error log/i }))
    await screen.findByText(/downloaded error log \(3 entries\)/i)
  })

  it('"Report on GitHub" calls openGitHubIssue with the report + config', async () => {
    mocks.loadErrorReportingConfig.mockResolvedValue({ github: sampleGithub })
    const user = userEvent.setup()
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)
    const ghBtn = await screen.findByRole('button', { name: /report on github/i })
    await waitFor(() => expect(ghBtn).not.toBeDisabled())
    await user.click(ghBtn)
    expect(mocks.openGitHubIssue).toHaveBeenCalledWith(sampleReport, sampleGithub)
    await screen.findByText(/opened github issue draft/i)
  })

  it('shows the not-configured fallback status when openGitHubIssue returns false', async () => {
    mocks.loadErrorReportingConfig.mockResolvedValue({ github: sampleGithub })
    mocks.openGitHubIssue.mockReturnValue(false)
    const user = userEvent.setup()
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)
    const ghBtn = await screen.findByRole('button', { name: /report on github/i })
    await waitFor(() => expect(ghBtn).not.toBeDisabled())
    await user.click(ghBtn)
    await screen.findByText(/repository not configured/i)
  })

  it('reports automatic submission success in the status row', async () => {
    mocks.submitDiagnosticReport.mockResolvedValue({ submitted: true, status: 202 })
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)
    await screen.findByText(/submitted automatically \(http 202\)/i)
  })

  it('reports network-error submission failures in the status row', async () => {
    mocks.submitDiagnosticReport.mockResolvedValue({ submitted: false, reason: 'network-error' })
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)
    await screen.findByText(/automatic report submission failed/i)
  })

  it('keeps the status row empty for silent submission reasons (disabled, duplicate, …)', async () => {
    mocks.submitDiagnosticReport.mockResolvedValue({ submitted: false, reason: 'duplicate' })
    render(<ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />)
    // Wait for the diagnostics flow to settle.
    await waitFor(() => expect(mocks.submitDiagnosticReport).toHaveBeenCalled())
    // The status node always exists (min-height row); its text content
    // should be empty for silent reasons.
    const statusNode = document.querySelector('[aria-live="polite"]')
    expect(statusNode?.textContent ?? '').toBe('')
  })

  it('handles unmount during the in-flight diagnostics promise without state updates', async () => {
    let resolveCollect: (r: DiagnosticReport) => void = () => {}
    mocks.collectDiagnostics.mockReturnValue(
      new Promise<DiagnosticReport>((res) => { resolveCollect = res }),
    )

    const { unmount } = render(
      <ErrorFallback error={makeError()} resetErrorBoundary={vi.fn()} />,
    )
    unmount()
    await act(async () => {
      resolveCollect(sampleReport)
    })
    // The cancelled flag in the effect short-circuits both setReport and
    // appendErrorLogEntry — the latter is the easiest invariant to assert.
    expect(mocks.appendErrorLogEntry).not.toHaveBeenCalled()
    expect(mocks.submitDiagnosticReport).not.toHaveBeenCalled()
  })
})
