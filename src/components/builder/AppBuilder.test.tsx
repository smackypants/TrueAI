import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AppBuilder } from './AppBuilder'

describe('AppBuilder', () => {
  it('renders heading', () => {
    render(<AppBuilder models={[]} />)
    expect(screen.getByText(/app builder/i)).toBeInTheDocument()
  })

  it('renders New App button', () => {
    render(<AppBuilder models={[]} />)
    // Multiple "New App" matches exist (header button "New App" plus
    // "Create New App" inside an always-rendered dialog). getAllByRole
    // returns at least one and avoids the duplicate-match error.
    expect(
      screen.getAllByRole('button', { name: /new app/i }).length
    ).toBeGreaterThan(0)
  })

  it('renders without crashing', () => {
    render(<AppBuilder models={[]} />)
    expect(document.body).toBeTruthy()
  })
})
