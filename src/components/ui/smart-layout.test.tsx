import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { DynamicUIPreferences } from '@/hooks/use-dynamic-ui'

const { mockUseDynamicUI } = vi.hoisted(() => ({
  mockUseDynamicUI: vi.fn(),
}))

vi.mock('@/hooks/use-dynamic-ui', () => ({
  useDynamicUI: mockUseDynamicUI,
}))

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get: () => (props: Record<string, unknown> & { children?: React.ReactNode }) => {
          const { children, ...rest } = props
          const {
            initial: _i,
            animate: _a,
            exit: _e,
            transition: _t,
            whileHover: _w,
            ...domProps
          } = rest as Record<string, unknown>
          void _i; void _a; void _e; void _t; void _w
          return <div {...(domProps as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
        },
      }
    ),
  }
})

import {
  SmartContainer,
  DynamicCard,
  AdaptiveText,
  ResponsiveSpacer,
  DynamicBackground,
} from './smart-layout'

const basePreferences: DynamicUIPreferences = {
  layoutDensity: 'comfortable',
  colorScheme: 'default',
  sidebarPosition: 'left',
  chatBubbleStyle: 'rounded',
  animationIntensity: 'normal',
  fontSize: 'medium',
  cardStyle: 'elevated',
  accentColor: 'oklch(0.75 0.14 200)',
  backgroundPattern: 'dots',
  autoAdaptLayout: true,
  smartSpacing: true,
  contextualColors: true,
}

function buildDynamicUI(overrides: Partial<DynamicUIPreferences> | null = {}) {
  const preferences = overrides === null
    ? null
    : { ...basePreferences, ...overrides }
  return {
    preferences,
    adaptiveLayout: { columnCount: 4, cardSize: 'medium', showSidebar: true, compactMode: false },
    getSpacingClass: () => 'spacing-class',
    getAnimationClasses: () => 'anim-class',
    getPaddingClass: () => 'p-class',
    getCardStyleClasses: () => 'card-style-class',
    getFontSizeClass: () => 'text-base',
  }
}

describe('SmartContainer', () => {
  beforeEach(() => mockUseDynamicUI.mockReset())

  it('renders a plain div with only the consumer className when preferences is null', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI(null))
    const { container } = render(
      <SmartContainer className="my-cls">
        <span>child</span>
      </SmartContainer>
    )
    const root = container.firstChild as HTMLElement
    expect(root.tagName).toBe('DIV')
    expect(root.className).toBe('my-cls')
    expect(screen.getByText('child')).toBeInTheDocument()
  })

  it('renders a non-motion div when animationIntensity is "none"', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ animationIntensity: 'none' }))
    const { container } = render(
      <SmartContainer className="extra">
        <span>x</span>
      </SmartContainer>
    )
    const root = container.firstChild as HTMLElement
    // Default variant is grid → expect grid + adaptive cols + class merge.
    expect(root.className).toContain('grid')
    expect(root.className).toContain('grid-cols-1')
    expect(root.className).toContain('md:grid-cols-4')
    expect(root.className).toContain('spacing-class')
    expect(root.className).toContain('anim-class')
    expect(root.className).toContain('extra')
  })

  it('omits adaptive columns when adaptiveColumns=false', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ animationIntensity: 'none' }))
    const { container } = render(
      <SmartContainer adaptiveColumns={false}>
        <span>x</span>
      </SmartContainer>
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('grid')
    expect(root.className).toContain('grid-cols-1')
    expect(root.className).not.toContain('md:grid-cols-')
  })

  it('renders with flex classes when variant="flex"', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ animationIntensity: 'none' }))
    const { container } = render(
      <SmartContainer variant="flex">
        <span>x</span>
      </SmartContainer>
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('flex')
    expect(root.className).toContain('flex-wrap')
    expect(root.className).not.toContain('grid')
  })

  it('renders with stack (flex-col) classes when variant="stack"', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ animationIntensity: 'none' }))
    const { container } = render(
      <SmartContainer variant="stack">
        <span>x</span>
      </SmartContainer>
    )
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('flex')
    expect(root.className).toContain('flex-col')
  })

  it('renders an animated motion.div when preferences allow animation', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ animationIntensity: 'normal' }))
    render(
      <SmartContainer>
        <span data-testid="kid">x</span>
      </SmartContainer>
    )
    expect(screen.getByTestId('kid')).toBeInTheDocument()
  })
})

describe('DynamicCard', () => {
  beforeEach(() => mockUseDynamicUI.mockReset())

  it('renders a plain card div when preferences is null', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI(null))
    const { container } = render(<DynamicCard className="c">x</DynamicCard>)
    const root = container.firstChild as HTMLElement
    expect(root.tagName).toBe('DIV')
    // null preferences → returns <div className={cardClasses}> with all helper classes
    expect(root.className).toContain('rounded-lg')
  })

  it('renders without animation when animationIntensity is "none"', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ animationIntensity: 'none' }))
    const { container } = render(<DynamicCard>kid</DynamicCard>)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('card-style-class')
    expect(root.className).toContain('p-class')
    expect(root.className).toContain('rounded-lg')
  })

  it.each([
    ['success', 'border-l-green-500'],
    ['warning', 'border-l-yellow-500'],
    ['error', 'border-l-red-500'],
    ['info', 'border-l-blue-500'],
  ] as const)('applies %s context color border when contextualColors is on', (color, expectedClass) => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ animationIntensity: 'none', contextualColors: true }))
    const { container } = render(<DynamicCard contextColor={color}>x</DynamicCard>)
    expect((container.firstChild as HTMLElement).className).toContain(expectedClass)
  })

  it('does not apply context color when contextualColors is off', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ animationIntensity: 'none', contextualColors: false }))
    const { container } = render(<DynamicCard contextColor="success">x</DynamicCard>)
    expect((container.firstChild as HTMLElement).className).not.toContain('border-l-green-500')
  })

  it('does not apply context color for the "default" contextColor', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ animationIntensity: 'none', contextualColors: true }))
    const { container } = render(<DynamicCard contextColor="default">x</DynamicCard>)
    expect((container.firstChild as HTMLElement).className).not.toMatch(/border-l-(green|yellow|red|blue)-500/)
  })

  it('adds cursor-pointer when hoverable=true', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ animationIntensity: 'none' }))
    const { container } = render(<DynamicCard hoverable>x</DynamicCard>)
    expect((container.firstChild as HTMLElement).className).toContain('cursor-pointer')
  })

  it('renders animated motion variant when animationIntensity != none', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ animationIntensity: 'enhanced' }))
    render(<DynamicCard hoverable><span data-testid="dc">x</span></DynamicCard>)
    expect(screen.getByTestId('dc')).toBeInTheDocument()
  })
})

describe('AdaptiveText', () => {
  beforeEach(() => mockUseDynamicUI.mockReset())

  it('renders a plain div with only consumer className when preferences is null', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI(null))
    const { container } = render(<AdaptiveText className="cn">hello</AdaptiveText>)
    const root = container.firstChild as HTMLElement
    expect(root.className).toBe('cn')
    expect(root.textContent).toBe('hello')
  })

  it('applies font-semibold for variant="heading"', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI())
    const { container } = render(<AdaptiveText variant="heading">H</AdaptiveText>)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('font-semibold')
    expect(root.className).toContain('text-base')
  })

  it('applies muted text for variant="caption"', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI())
    const { container } = render(<AdaptiveText variant="caption">C</AdaptiveText>)
    expect((container.firstChild as HTMLElement).className).toContain('text-muted-foreground')
  })

  it('uses only the base font size for variant="body" (default)', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI())
    const { container } = render(<AdaptiveText>B</AdaptiveText>)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('text-base')
    expect(root.className).not.toContain('font-semibold')
    expect(root.className).not.toContain('text-muted-foreground')
  })
})

describe('ResponsiveSpacer', () => {
  beforeEach(() => mockUseDynamicUI.mockReset())

  it('renders a fixed h-4 spacer when preferences is null', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI(null))
    const { container } = render(<ResponsiveSpacer />)
    expect((container.firstChild as HTMLElement).className).toBe('h-4')
  })

  it.each([
    ['small', 'compact', 'h-1'],
    ['small', 'comfortable', 'h-2'],
    ['small', 'spacious', 'h-3'],
    ['medium', 'compact', 'h-2'],
    ['medium', 'comfortable', 'h-4'],
    ['medium', 'spacious', 'h-6'],
    ['large', 'compact', 'h-4'],
    ['large', 'comfortable', 'h-6'],
    ['large', 'spacious', 'h-8'],
  ] as const)('renders %s × %s as %s', (size, density, expected) => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ layoutDensity: density }))
    const { container } = render(<ResponsiveSpacer size={size} />)
    expect((container.firstChild as HTMLElement).className).toBe(expected)
  })
})

describe('DynamicBackground', () => {
  beforeEach(() => mockUseDynamicUI.mockReset())

  it('renders a plain div with only consumer className when preferences is null', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI(null))
    const { container } = render(<DynamicBackground className="bg-cls">child</DynamicBackground>)
    const root = container.firstChild as HTMLElement
    expect(root.className).toBe('bg-cls')
    expect(root.textContent).toBe('child')
  })

  it('renders dots pattern overlay and inline backgroundImage', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ backgroundPattern: 'dots' }))
    const { container } = render(<DynamicBackground>x</DynamicBackground>)
    const root = container.firstChild as HTMLElement
    expect(root.style.backgroundImage).toContain('radial-gradient')
    // Overlay div is appended for non-none / non-gradient patterns.
    expect(root.querySelector('.opacity-\\[0\\.02\\]')).not.toBeNull()
  })

  it('renders grid pattern with two linear-gradient layers', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ backgroundPattern: 'grid' }))
    const { container } = render(<DynamicBackground>x</DynamicBackground>)
    const root = container.firstChild as HTMLElement
    expect(root.style.backgroundImage).toContain('linear-gradient')
    expect(root.querySelector('.opacity-\\[0\\.02\\]')).not.toBeNull()
  })

  it('renders waves pattern with an SVG-data background and overlay', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ backgroundPattern: 'waves' }))
    const { container } = render(<DynamicBackground>x</DynamicBackground>)
    const root = container.firstChild as HTMLElement
    expect(root.style.backgroundImage).toContain('svg')
    expect(root.querySelector('.opacity-\\[0\\.02\\]')).not.toBeNull()
  })

  it('renders gradient pattern via inline background and skips the overlay', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ backgroundPattern: 'gradient' }))
    const { container } = render(<DynamicBackground>x</DynamicBackground>)
    const root = container.firstChild as HTMLElement
    expect(root.style.background).toContain('linear-gradient')
    expect(root.querySelector('.opacity-\\[0\\.02\\]')).toBeNull()
  })

  it('renders nothing extra when backgroundPattern is "none"', () => {
    mockUseDynamicUI.mockReturnValue(buildDynamicUI({ backgroundPattern: 'none' }))
    const { container } = render(<DynamicBackground>x</DynamicBackground>)
    const root = container.firstChild as HTMLElement
    expect(root.style.backgroundImage).toBe('')
    expect(root.querySelector('.opacity-\\[0\\.02\\]')).toBeNull()
  })
})
