import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LazyTabContent } from './LazyTabContent'

describe('LazyTabContent', () => {
  it('renders children when isActive is true', () => {
    render(
      <LazyTabContent isActive={true} tabName="chat">
        <div>Tab content</div>
      </LazyTabContent>
    )
    expect(screen.getByText('Tab content')).toBeInTheDocument()
  })

  it('renders nothing when isActive is false and keepMounted is false (default)', () => {
    const { container } = render(
      <LazyTabContent isActive={false} tabName="chat">
        <div>Tab content</div>
      </LazyTabContent>
    )
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('Tab content')).not.toBeInTheDocument()
  })

  it('renders hidden div when isActive is false and keepMounted is true', () => {
    const { container } = render(
      <LazyTabContent isActive={false} tabName="chat" keepMounted>
        <div>Hidden content</div>
      </LazyTabContent>
    )
    const hiddenDiv = container.querySelector('[style]') as HTMLElement
    expect(hiddenDiv).toBeInTheDocument()
    expect(hiddenDiv.style.display).toBe('none')
    expect(screen.getByText('Hidden content')).toBeInTheDocument()
  })

  it('renders children visibly when isActive is true and keepMounted is true', () => {
    render(
      <LazyTabContent isActive={true} tabName="chat" keepMounted>
        <div>Active keepMounted content</div>
      </LazyTabContent>
    )
    expect(screen.getByText('Active keepMounted content')).toBeInTheDocument()
  })

  it('has displayName LazyTabContent', () => {
    expect(LazyTabContent.displayName).toBe('LazyTabContent')
  })

  it('renders multiple children when active', () => {
    render(
      <LazyTabContent isActive={true} tabName="settings">
        <span>Child A</span>
        <span>Child B</span>
      </LazyTabContent>
    )
    expect(screen.getByText('Child A')).toBeInTheDocument()
    expect(screen.getByText('Child B')).toBeInTheDocument()
  })

  it('does not render children at all when inactive and not keepMounted', () => {
    render(
      <LazyTabContent isActive={false} tabName="settings">
        <span>Should not render</span>
      </LazyTabContent>
    )
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument()
  })
})
