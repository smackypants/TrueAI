import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter
} from './card'

describe('Card', () => {
  describe('Card', () => {
    it('should render a card element', () => {
      render(<Card>Card content</Card>)
      const card = screen.getByText('Card content')
      expect(card).toBeInTheDocument()
    })

    it('should have the data-slot attribute', () => {
      render(<Card data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('data-slot', 'card')
    })

    it('should apply custom className', () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-class')
    })

    it('should forward props to the div element', () => {
      render(<Card data-testid="card" id="test-id">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('id', 'test-id')
    })
  })

  describe('CardHeader', () => {
    it('should render card header', () => {
      render(<CardHeader>Header content</CardHeader>)
      const header = screen.getByText('Header content')
      expect(header).toBeInTheDocument()
    })

    it('should have the data-slot attribute', () => {
      render(<CardHeader data-testid="header">Content</CardHeader>)
      const header = screen.getByTestId('header')
      expect(header).toHaveAttribute('data-slot', 'card-header')
    })

    it('should apply custom className', () => {
      render(<CardHeader className="custom-header" data-testid="header">Content</CardHeader>)
      const header = screen.getByTestId('header')
      expect(header).toHaveClass('custom-header')
    })
  })

  describe('CardTitle', () => {
    it('should render card title', () => {
      render(<CardTitle>Test Title</CardTitle>)
      const title = screen.getByText('Test Title')
      expect(title).toBeInTheDocument()
    })

    it('should have the data-slot attribute', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>)
      const title = screen.getByTestId('title')
      expect(title).toHaveAttribute('data-slot', 'card-title')
    })

    it('should apply custom className', () => {
      render(<CardTitle className="custom-title" data-testid="title">Title</CardTitle>)
      const title = screen.getByTestId('title')
      expect(title).toHaveClass('custom-title')
    })
  })

  describe('CardDescription', () => {
    it('should render card description', () => {
      render(<CardDescription>Test Description</CardDescription>)
      const description = screen.getByText('Test Description')
      expect(description).toBeInTheDocument()
    })

    it('should have the data-slot attribute', () => {
      render(<CardDescription data-testid="description">Description</CardDescription>)
      const description = screen.getByTestId('description')
      expect(description).toHaveAttribute('data-slot', 'card-description')
    })

    it('should apply custom className', () => {
      render(<CardDescription className="custom-desc" data-testid="description">Description</CardDescription>)
      const description = screen.getByTestId('description')
      expect(description).toHaveClass('custom-desc')
    })
  })

  describe('CardAction', () => {
    it('should render card action', () => {
      render(<CardAction>Action content</CardAction>)
      const action = screen.getByText('Action content')
      expect(action).toBeInTheDocument()
    })

    it('should have the data-slot attribute', () => {
      render(<CardAction data-testid="action">Action</CardAction>)
      const action = screen.getByTestId('action')
      expect(action).toHaveAttribute('data-slot', 'card-action')
    })

    it('should apply custom className', () => {
      render(<CardAction className="custom-action" data-testid="action">Action</CardAction>)
      const action = screen.getByTestId('action')
      expect(action).toHaveClass('custom-action')
    })
  })

  describe('CardContent', () => {
    it('should render card content', () => {
      render(<CardContent>Main content</CardContent>)
      const content = screen.getByText('Main content')
      expect(content).toBeInTheDocument()
    })

    it('should have the data-slot attribute', () => {
      render(<CardContent data-testid="content">Content</CardContent>)
      const content = screen.getByTestId('content')
      expect(content).toHaveAttribute('data-slot', 'card-content')
    })

    it('should apply custom className', () => {
      render(<CardContent className="custom-content" data-testid="content">Content</CardContent>)
      const content = screen.getByTestId('content')
      expect(content).toHaveClass('custom-content')
    })
  })

  describe('CardFooter', () => {
    it('should render card footer', () => {
      render(<CardFooter>Footer content</CardFooter>)
      const footer = screen.getByText('Footer content')
      expect(footer).toBeInTheDocument()
    })

    it('should have the data-slot attribute', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer).toHaveAttribute('data-slot', 'card-footer')
    })

    it('should apply custom className', () => {
      render(<CardFooter className="custom-footer" data-testid="footer">Footer</CardFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer).toHaveClass('custom-footer')
    })
  })

  describe('Card composition', () => {
    it('should render a complete card with all subcomponents', () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
            <CardAction>Action</CardAction>
          </CardHeader>
          <CardContent>Main Content</CardContent>
          <CardFooter>Footer Content</CardFooter>
        </Card>
      )

      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card Description')).toBeInTheDocument()
      expect(screen.getByText('Action')).toBeInTheDocument()
      expect(screen.getByText('Main Content')).toBeInTheDocument()
      expect(screen.getByText('Footer Content')).toBeInTheDocument()
    })

    it('should render card without optional components', () => {
      render(
        <Card>
          <CardContent>Just content</CardContent>
        </Card>
      )

      expect(screen.getByText('Just content')).toBeInTheDocument()
    })
  })
})
