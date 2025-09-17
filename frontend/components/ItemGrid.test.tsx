import type { ComponentProps } from 'react'
import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ItemGrid, { Item } from './ItemGrid'

type ImageProps = ComponentProps<'img'>

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function Image({ src, alt, ...props }: ImageProps) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src as string} alt={alt ?? ''} {...props} />
  }
})

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down">ChevronDown</div>,
  Grid: () => <div data-testid="grid-icon">Grid</div>,
  List: () => <div data-testid="list-icon">List</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>,
}))

const mockItems: Item[] = [
  {
    id: '1',
    img_url: 'https://example.com/image1.jpg',
    title: 'Test Product 1',
    vendor: 'Test Vendor',
    price: 100,
    currency: 'USD',
    category: 'Chair',
    colour_hex: '#ff0000',
    created_at: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    img_url: 'https://example.com/image2.jpg',
    title: 'Test Product 2',
    vendor: 'Another Vendor',
    price: 200,
    currency: 'USD',
    category: 'Table',
    colour_hex: '#00ff00',
    created_at: '2023-01-02T00:00:00Z',
  },
]

describe('ItemGrid', () => {
  it('renders items in grid view', () => {
    render(<ItemGrid items={mockItems} viewMode="grid" />)
    
    expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    expect(screen.getByText('Test Vendor')).toBeInTheDocument()
    expect(screen.getByText('Another Vendor')).toBeInTheDocument()
  })

  it('renders items in list view', () => {
    render(<ItemGrid items={mockItems} viewMode="list" />)
    
    expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    expect(screen.getByText('Test Product 2')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<ItemGrid items={[]} loading={true} />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows empty state when no items', () => {
    render(<ItemGrid items={[]} loading={false} />)
    
    expect(screen.getByText('No items yet')).toBeInTheDocument()
    expect(screen.getByText('Start by adding items using the browser extension')).toBeInTheDocument()
  })

  it('displays search functionality', () => {
    render(<ItemGrid items={mockItems} />)
    
    expect(screen.getByPlaceholderText('Search products, vendors, colors...')).toBeInTheDocument()
    expect(screen.getByTestId('search-icon')).toBeInTheDocument()
  })

  it('displays sort dropdown', () => {
    render(<ItemGrid items={mockItems} />)
    
    const sortSelect = screen.getByDisplayValue('Newest First')
    expect(sortSelect).toBeInTheDocument()
  })

  it('displays filter button', () => {
    render(<ItemGrid items={mockItems} />)
    
    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByTestId('filter-icon')).toBeInTheDocument()
  })

  it('displays item count', () => {
    render(<ItemGrid items={mockItems} />)
    
    expect(screen.getByText('2 items')).toBeInTheDocument()
  })

  it('displays view mode toggle when callback provided', () => {
    const mockViewModeChange = jest.fn()
    render(
      <ItemGrid 
        items={mockItems} 
        viewMode="grid"
        onViewModeChange={mockViewModeChange}
      />
    )
    
    expect(screen.getByTestId('grid-icon')).toBeInTheDocument()
    expect(screen.getByTestId('list-icon')).toBeInTheDocument()
  })

  it('formats prices correctly', () => {
    render(<ItemGrid items={mockItems} viewMode="grid" />)
    
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('$200.00')).toBeInTheDocument()
  })

  it('displays categories', () => {
    render(<ItemGrid items={mockItems} viewMode="grid" />)
    
    expect(screen.getByText('Chair')).toBeInTheDocument()
    expect(screen.getByText('Table')).toBeInTheDocument()
  })
})