import type { ComponentProps } from 'react'
import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ItemGrid, { Item } from './ItemGrid'

type ImageProps = ComponentProps<'img'> & { fill?: boolean; src?: string }

jest.mock('next/image', () => {
  return {
    __esModule: true,
    default: (input: ImageProps) => {
      const { src, alt = '', fill, ...rest } = input
      void fill
      const resolvedSrc = typeof src === 'string' ? src : 'mock-image-src'
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={resolvedSrc} alt={alt} {...rest} />
    },
  }
})

jest.mock('lucide-react', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const React = require('react')
  const createIcon = (testId: string) =>
    // eslint-disable-next-line react/display-name
    (props: React.HTMLAttributes<HTMLDivElement>) => React.createElement('div', {
      'data-testid': testId,
      ...props,
    })

  return {
    __esModule: true,
    ChevronDown: createIcon('chevron-down'),
    Grid: createIcon('grid-icon'),
    List: createIcon('list-icon'),
    Search: createIcon('search-icon'),
    X: createIcon('x-icon'),
    Filter: createIcon('filter-icon'),
  }
})

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
