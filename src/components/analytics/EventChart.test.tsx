import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { EventChart } from './EventChart'

describe('EventChart', () => {
  it('renders without crashing', () => {
    const { container } = render(<EventChart />)
    expect(container).toBeDefined()
  })

  it('renders null (no visible content)', () => {
    const { container } = render(<EventChart />)
    expect(container.firstChild).toBeNull()
  })
})
