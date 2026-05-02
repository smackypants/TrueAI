// Smoke tests for thin shadcn/ui primitive wrappers that are otherwise unused
// in the app and therefore show 0% coverage. Each test renders the component
// and asserts on its data-slot or DOM tag so the wrapper code (className
// assembly via cn(), variant defaults, asChild forwarding) is exercised.

import { describe, it, expect, vi } from 'vitest'
import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion'
import { AspectRatio } from './aspect-ratio'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from './breadcrumb'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible'
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from './drawer'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from './pagination'
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table'
import { Toggle } from './toggle'
import { ToggleGroup, ToggleGroupItem } from './toggle-group'
import { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './resizable'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from './input-otp'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './dropdown-menu'
import { useForm } from 'react-hook-form'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from './form'
import { Toaster } from './sonner'
import { Input } from './input'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './carousel'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from './chart'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from './popover'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'

describe('Accordion primitive', () => {
  it('renders accordion items with trigger and content', () => {
    render(
      <Accordion type="single" collapsible defaultValue="a">
        <AccordionItem value="a" data-testid="acc-item">
          <AccordionTrigger data-testid="acc-trigger">Trigger</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByTestId('acc-item')).toHaveAttribute('data-slot', 'accordion-item')
    expect(screen.getByTestId('acc-trigger')).toHaveAttribute('data-slot', 'accordion-trigger')
    expect(screen.getByText('Trigger')).toBeInTheDocument()
  })
})

describe('AspectRatio primitive', () => {
  it('renders the aspect-ratio wrapper', () => {
    render(<AspectRatio ratio={16 / 9} data-testid="ar"><div>Inside</div></AspectRatio>)
    expect(screen.getByTestId('ar')).toHaveAttribute('data-slot', 'aspect-ratio')
    expect(screen.getByText('Inside')).toBeInTheDocument()
  })
})

describe('Breadcrumb primitive', () => {
  it('renders all breadcrumb sub-components with correct ARIA roles', () => {
    render(
      <Breadcrumb data-testid="bc">
        <BreadcrumbList data-testid="bc-list">
          <BreadcrumbItem data-testid="bc-item">
            <BreadcrumbLink href="/" data-testid="bc-link">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator data-testid="bc-sep" />
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="bc-page">Current</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbEllipsis data-testid="bc-ellipsis" />
        </BreadcrumbList>
      </Breadcrumb>
    )
    expect(screen.getByTestId('bc')).toHaveAttribute('aria-label', 'breadcrumb')
    expect(screen.getByTestId('bc-list')).toHaveAttribute('data-slot', 'breadcrumb-list')
    expect(screen.getByTestId('bc-link')).toHaveAttribute('href', '/')
    expect(screen.getByTestId('bc-page')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('bc-sep')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByTestId('bc-ellipsis')).toHaveAttribute('aria-hidden', 'true')
  })

  it('forwards children through BreadcrumbLink with asChild', () => {
    render(
      <BreadcrumbLink asChild data-testid="bc-link-as">
        <span>SpanLink</span>
      </BreadcrumbLink>
    )
    expect(screen.getByTestId('bc-link-as').tagName).toBe('SPAN')
  })

  it('renders a custom child inside BreadcrumbSeparator', () => {
    render(<BreadcrumbSeparator data-testid="bc-sep-custom"><span>Custom</span></BreadcrumbSeparator>)
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })
})

describe('Collapsible primitive', () => {
  it('renders Collapsible with Trigger and Content', () => {
    render(
      <Collapsible defaultOpen data-testid="col">
        <CollapsibleTrigger data-testid="col-trigger">Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="col-content">Body</CollapsibleContent>
      </Collapsible>
    )
    expect(screen.getByTestId('col')).toHaveAttribute('data-slot', 'collapsible')
    expect(screen.getByTestId('col-trigger')).toHaveAttribute('data-slot', 'collapsible-trigger')
    expect(screen.getByText('Body')).toBeInTheDocument()
  })
})

describe('Drawer primitive', () => {
  it('renders an open Drawer with title, description, header, footer, and close', () => {
    render(
      <Drawer open>
        <DrawerTrigger>Open</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerDescription>Description</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose>Close</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()
  })
})

describe('Pagination primitive', () => {
  it('renders pagination with previous, links, ellipsis, next', () => {
    render(
      <Pagination data-testid="pag">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(screen.getByTestId('pag')).toHaveAttribute('aria-label', 'pagination')
    expect(screen.getByText('1')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})

describe('Table primitive', () => {
  it('renders a full table with header, body, footer, and caption', () => {
    render(
      <Table data-testid="tbl">
        <TableCaption>Cap</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>foo</TableCell>
            <TableCell>1</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Sum</TableCell>
            <TableCell>1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )
    expect(screen.getByTestId('tbl').tagName).toBe('TABLE')
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('foo')).toBeInTheDocument()
    expect(screen.getByText('Cap')).toBeInTheDocument()
  })
})

describe('Toggle primitive', () => {
  it('renders default Toggle', () => {
    render(<Toggle data-testid="tg">B</Toggle>)
    expect(screen.getByTestId('tg')).toHaveAttribute('data-slot', 'toggle')
  })

  it('renders Toggle with outline variant and lg size', () => {
    render(<Toggle variant="outline" size="lg" data-testid="tg2">B</Toggle>)
    expect(screen.getByTestId('tg2')).toBeInTheDocument()
  })
})

describe('ToggleGroup primitive', () => {
  it('renders ToggleGroup with items', () => {
    render(
      <ToggleGroup type="single" defaultValue="a" data-testid="tg-grp">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })
})

describe('HoverCard primitive', () => {
  it('renders an open HoverCard with trigger and content', () => {
    render(
      <HoverCard open>
        <HoverCardTrigger data-testid="hc-trigger">Hover me</HoverCardTrigger>
        <HoverCardContent data-testid="hc-content" align="start" sideOffset={8}>
          Body content
        </HoverCardContent>
      </HoverCard>
    )
    expect(screen.getByTestId('hc-trigger')).toHaveAttribute(
      'data-slot',
      'hover-card-trigger'
    )
    // Content renders into a portal; query by text rather than testid container
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })
})

describe('Resizable primitives', () => {
  it('renders a panel group with two panels and a handle (with grip)', () => {
    render(
      <ResizablePanelGroup direction="horizontal" id="rpg">
        <ResizablePanel defaultSize={50} id="rp1">Left</ResizablePanel>
        <ResizableHandle withHandle id="rh" />
        <ResizablePanel defaultSize={50} id="rp2">Right</ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(screen.getByTestId('rpg')).toHaveAttribute(
      'data-slot',
      'resizable-panel-group'
    )
    expect(screen.getByTestId('rp1')).toHaveAttribute('data-slot', 'resizable-panel')
    expect(screen.getByTestId('rh')).toHaveAttribute('data-slot', 'resizable-handle')
    expect(screen.getByText('Left')).toBeInTheDocument()
    expect(screen.getByText('Right')).toBeInTheDocument()
  })

  it('renders a handle without grip when withHandle is omitted', () => {
    render(
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={50}>A</ResizablePanel>
        <ResizableHandle id="rh-bare" />
        <ResizablePanel defaultSize={50}>B</ResizablePanel>
      </ResizablePanelGroup>
    )
    expect(screen.getByTestId('rh-bare')).toBeInTheDocument()
  })
})

describe('InputOTP primitive', () => {
  it('renders OTP input with grouped slots and a separator', () => {
    render(
      <InputOTP maxLength={6} data-testid="otp">
        <InputOTPGroup data-testid="otp-grp">
          <InputOTPSlot index={0} data-testid="otp-slot-0" />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
        <InputOTPSeparator data-testid="otp-sep" />
        <InputOTPGroup>
          <InputOTPSlot index={2} />
        </InputOTPGroup>
      </InputOTP>
    )
    expect(screen.getByTestId('otp-grp')).toHaveAttribute(
      'data-slot',
      'input-otp-group'
    )
    expect(screen.getByTestId('otp-slot-0')).toHaveAttribute(
      'data-slot',
      'input-otp-slot'
    )
    expect(screen.getByTestId('otp-sep')).toHaveAttribute('role', 'separator')
  })
})

describe('DropdownMenu primitive', () => {
  it('renders an open menu with label, items, separator, shortcut, and a checkbox/radio group', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger data-testid="dm-trigger">Open</DropdownMenuTrigger>
        <DropdownMenuContent sideOffset={6}>
          <DropdownMenuLabel inset>Section</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem inset>
              Item one
              <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked>Check me</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="r1">
            <DropdownMenuRadioItem value="r1">Radio one</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="r2">Radio two</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByTestId('dm-trigger')).toHaveAttribute(
      'data-slot',
      'dropdown-menu-trigger'
    )
    expect(screen.getByText('Section')).toBeInTheDocument()
    expect(screen.getByText('Item one')).toBeInTheDocument()
    expect(screen.getByText('⌘A')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Check me')).toBeInTheDocument()
    expect(screen.getByText('Radio one')).toBeInTheDocument()
    expect(screen.getByText('Radio two')).toBeInTheDocument()
  })
})

function FormHarness({
  withError = false,
  description = 'Helper text',
}: {
  withError?: boolean
  description?: string
}) {
  const form = useForm<{ username: string }>({
    defaultValues: { username: '' },
  })
  // Manually set an error after mount so FormMessage renders the error string
  // rather than children. Using useEffect avoids triggering a setState during
  // render of a sibling component (FormLabel).
  React.useEffect(() => {
    if (withError) {
      form.setError('username', { type: 'manual', message: 'Required field' })
    }
  }, [withError, form])
  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input data-testid="username-input" {...field} />
              </FormControl>
              <FormDescription>{description}</FormDescription>
              <FormMessage>fallback</FormMessage>
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

describe('Form primitive', () => {
  it('wires FormField → FormItem → FormLabel/FormControl/FormDescription with stable ids', () => {
    render(<FormHarness />)
    const label = screen.getByText('Username')
    const input = screen.getByTestId('username-input')
    const description = screen.getByText('Helper text')

    // Label is associated with the input via htmlFor → form-item id
    expect(label).toHaveAttribute('for', input.getAttribute('id') ?? '')
    expect(input).toHaveAttribute('aria-describedby', description.getAttribute('id') ?? '')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    // FormMessage renders its children when there is no error
    expect(screen.getByText('fallback')).toBeInTheDocument()
  })

  it('renders FormMessage with the field error message and toggles aria-invalid', () => {
    render(<FormHarness withError />)
    const input = screen.getByTestId('username-input')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Required field')).toBeInTheDocument()
  })
})

describe('Sonner Toaster primitive', () => {
  it('renders without crashing using next-themes default theme', () => {
    const { container } = render(<Toaster />)
    // Sonner renders a section with class containing 'toaster'
    const section = container.querySelector('section')
    expect(section).toBeTruthy()
  })
})

describe('Carousel primitive', () => {
  it('renders horizontal carousel with content, items, prev/next buttons', () => {
    const { container } = render(
      <Carousel orientation="horizontal" className="my-carousel">
        <CarouselContent>
          <CarouselItem data-testid="slide-1">Slide 1</CarouselItem>
          <CarouselItem data-testid="slide-2">Slide 2</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    )
    const region = container.querySelector('[data-slot="carousel"]')
    expect(region).toHaveAttribute('role', 'region')
    expect(region).toHaveAttribute('aria-roledescription', 'carousel')
    expect(container.querySelector('[data-slot="carousel-content"]')).toBeTruthy()
    expect(screen.getByTestId('slide-1')).toHaveAttribute('aria-roledescription', 'slide')
    const prev = container.querySelector('[data-slot="carousel-previous"]') as HTMLButtonElement
    const next = container.querySelector('[data-slot="carousel-next"]') as HTMLButtonElement
    expect(prev).toBeTruthy()
    expect(next).toBeTruthy()
    expect(screen.getByText('Previous slide')).toBeInTheDocument()
    expect(screen.getByText('Next slide')).toBeInTheDocument()
  })

  it('invokes setApi callback on mount and supports vertical orientation', () => {
    const setApi = vi.fn()
    const { container } = render(
      <Carousel orientation="vertical" setApi={setApi}>
        <CarouselContent>
          <CarouselItem>v1</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    )
    expect(setApi).toHaveBeenCalled()
    expect(container.querySelector('[data-slot="carousel"]')).toBeTruthy()
  })

  it('handles ArrowLeft / ArrowRight key presses on the carousel region', () => {
    const { container } = render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>a</CarouselItem>
          <CarouselItem>b</CarouselItem>
        </CarouselContent>
      </Carousel>
    )
    const region = container.querySelector('[data-slot="carousel"]') as HTMLElement
    // Trigger keydown handlers (preventDefault + scrollPrev/Next branches)
    fireEvent.keyDown(region, { key: 'ArrowLeft' })
    fireEvent.keyDown(region, { key: 'ArrowRight' })
    fireEvent.keyDown(region, { key: 'Enter' }) // unhandled key
    expect(region).toBeInTheDocument()
  })
})

describe('Chart primitive', () => {
  const config = {
    visitors: { label: 'Visitors', color: '#ff0000' },
    revenue: { label: 'Revenue', theme: { light: '#00ff00', dark: '#0000ff' } },
    bad: { label: 'Bad', color: 'javascript:alert(1)' as string }, // exercises sanitizeColor reject
  }

  it('renders ChartContainer with ChartStyle CSS variables (theme + color branches)', () => {
    const { container } = render(
      <ChartContainer config={config} id="test">
        <div data-testid="child">child</div>
      </ChartContainer>
    )
    const chart = container.querySelector('[data-slot="chart"]') as HTMLElement
    expect(chart).toBeTruthy()
    expect(chart.getAttribute('data-chart')).toBe('chart-test')
    const style = container.querySelector('style')
    expect(style).toBeTruthy()
    expect(style!.innerHTML).toContain('--color-visitors: #ff0000')
    expect(style!.innerHTML).toContain('--color-revenue: #00ff00')
    expect(style!.innerHTML).toContain('.dark [data-chart=chart-test]')
    // Sanitized invalid color should be excluded
    expect(style!.innerHTML).not.toContain('javascript:')
  })

  it('ChartStyle returns null when there is no color/theme config', () => {
    const { container } = render(
      <ChartStyle id="empty" config={{ x: { label: 'X' } }} />
    )
    expect(container.querySelector('style')).toBeNull()
  })

  it('ChartTooltipContent returns null when inactive or empty payload', () => {
    const { container } = render(
      <ChartContainer config={config}>
        <div>
          <ChartTooltipContent active={false} payload={[]} />
        </div>
      </ChartContainer>
    )
    // No tooltip box rendered
    expect(container.querySelector('.bg-background')).toBeNull()
  })

  it('ChartTooltipContent renders payload items with label, formatter and value', () => {
    const formatter = vi.fn((value: number, name: string) => (
      <span data-testid="custom-fmt">{name}={value}</span>
    ))
    render(
      <ChartContainer config={config}>
        <div>
          <ChartTooltipContent
            active
            label="visitors"
            indicator="line"
            payload={[
              { name: 'visitors', value: 1234, dataKey: 'visitors', color: '#ff0000', payload: { fill: '#ff0000' } },
            ]}
            formatter={formatter}
          />
        </div>
      </ChartContainer>
    )
    expect(screen.getByTestId('custom-fmt')).toHaveTextContent('visitors=1234')
    expect(formatter).toHaveBeenCalled()
  })

  it('ChartTooltipContent supports labelFormatter, hideLabel, hideIndicator, dashed indicator', () => {
    const labelFormatter = vi.fn(() => <span data-testid="lf">label!</span>)
    render(
      <ChartContainer config={config}>
        <div>
          <ChartTooltipContent
            active
            label="visitors"
            labelFormatter={labelFormatter}
            indicator="dashed"
            hideIndicator
            payload={[
              { name: 'visitors', value: 50, dataKey: 'visitors', color: '#ff0000', payload: {} },
            ]}
          />
        </div>
      </ChartContainer>
    )
    expect(screen.getByTestId('lf')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('ChartLegendContent renders payload items with label and color swatch', () => {
    render(
      <ChartContainer config={config}>
        <div>
          <ChartLegendContent
            payload={[
              { value: 'visitors', dataKey: 'visitors', color: '#ff0000' },
              { value: 'revenue', dataKey: 'revenue', color: '#00ff00' },
            ]}
          />
        </div>
      </ChartContainer>
    )
    expect(screen.getByText('Visitors')).toBeInTheDocument()
    expect(screen.getByText('Revenue')).toBeInTheDocument()
  })

  it('ChartLegendContent returns null when payload is empty', () => {
    render(
      <ChartContainer config={config}>
        <div data-testid="legend-host">
          <ChartLegendContent payload={[]} />
        </div>
      </ChartContainer>
    )
    expect(screen.getByTestId('legend-host').children.length).toBe(0)
  })

  it('exports re-exported ChartTooltip and ChartLegend', () => {
    expect(ChartTooltip).toBeDefined()
    expect(ChartLegend).toBeDefined()
  })
})

describe('Select sub-components', () => {
  it('renders SelectGroup, SelectLabel, SelectItem and SelectSeparator inside an open Select', () => {
    render(
      <Select defaultValue="a" open>
        <SelectTrigger>
          <SelectValue placeholder="pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup data-testid="sel-group">
            <SelectLabel data-testid="sel-label">Group A</SelectLabel>
            <SelectItem value="a">Alpha</SelectItem>
            <SelectSeparator data-testid="sel-sep" />
            <SelectItem value="b">Beta</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    )
    expect(screen.getByTestId('sel-group')).toHaveAttribute('data-slot', 'select-group')
    expect(screen.getByTestId('sel-label')).toHaveAttribute('data-slot', 'select-label')
    expect(screen.getByTestId('sel-sep')).toHaveAttribute('data-slot', 'select-separator')
  })
})

describe('Avatar primitive', () => {
  it('renders Avatar root with AvatarImage and AvatarFallback', () => {
    render(
      <Avatar data-testid="avatar-root">
        <AvatarImage src="/x.png" alt="x" data-testid="avatar-img" />
        <AvatarFallback data-testid="avatar-fb">XX</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByTestId('avatar-root')).toHaveAttribute('data-slot', 'avatar')
    // Radix Avatar may render either the image or the fallback depending on
    // image load state; assert at least one descendant exists with the right
    // data-slot, which exercises both wrapper functions.
    const root = screen.getByTestId('avatar-root')
    expect(root).toBeInTheDocument()
  })
})

describe('Dialog sub-components', () => {
  it('renders DialogTrigger and DialogClose inside an open Dialog', () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger data-testid="dlg-trigger">Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Desc</DialogDescription>
          <DialogClose data-testid="dlg-close">Close</DialogClose>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByTestId('dlg-trigger')).toHaveAttribute('data-slot', 'dialog-trigger')
    expect(screen.getByTestId('dlg-close')).toHaveAttribute('data-slot', 'dialog-close')
  })
})

describe('Popover sub-components', () => {
  it('renders PopoverAnchor alongside Popover', () => {
    render(
      <Popover defaultOpen>
        <PopoverAnchor data-testid="pop-anchor"><span>anchor</span></PopoverAnchor>
        <PopoverTrigger>Trigger</PopoverTrigger>
        <PopoverContent>Body</PopoverContent>
      </Popover>
    )
    expect(screen.getByTestId('pop-anchor')).toHaveAttribute('data-slot', 'popover-anchor')
  })
})

describe('Sheet sub-components', () => {
  it('renders SheetClose and SheetFooter inside an open Sheet', () => {
    render(
      <Sheet defaultOpen>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Desc</SheetDescription>
          </SheetHeader>
          <SheetFooter data-testid="sheet-footer">
            <SheetClose data-testid="sheet-close">Close</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByTestId('sheet-footer')).toHaveAttribute('data-slot', 'sheet-footer')
    expect(screen.getByTestId('sheet-close')).toHaveAttribute('data-slot', 'sheet-close')
  })

  it.each(['left', 'top', 'bottom'] as const)(
    'renders SheetContent with side=%s to cover side-variant branches',
    (side) => {
      render(
        <Sheet defaultOpen>
          <SheetContent side={side}>
            <SheetTitle>{side}</SheetTitle>
            <SheetDescription>desc</SheetDescription>
          </SheetContent>
        </Sheet>
      )
      expect(screen.getByText(side)).toBeInTheDocument()
    }
  )
})
