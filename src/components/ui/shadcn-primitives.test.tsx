// Smoke tests for thin shadcn/ui primitive wrappers that are otherwise unused
// in the app and therefore show 0% coverage. Each test renders the component
// and asserts on its data-slot or DOM tag so the wrapper code (className
// assembly via cn(), variant defaults, asChild forwarding) is exercised.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
