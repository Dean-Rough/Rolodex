import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import Home from '../app/page'

jest.mock('../lib/api', () => ({
  api: {
    listItems: jest.fn().mockResolvedValue({
      items: [
        {
          id: 'item-1',
          img_url: 'https://example.com/image.jpg',
          title: 'Arched Floor Lamp',
          vendor: 'Design House',
          price: 1200,
          currency: 'USD',
          description: 'Sculptural lamp',
          colour_hex: '#C0A480',
          category: 'Lighting',
          material: 'Brass',
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ],
    }),
    searchItems: jest.fn().mockResolvedValue({ items: [] }),
  },
}))

describe('Home page', () => {
  it('renders the Rolodex library layout and fetched items', async () => {
    render(<Home />)

    expect(
      screen.getByRole('heading', { name: /your product library/i })
    ).toBeInTheDocument()

    expect(
      screen.getByText(/discover and organize ff&e products/i)
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Arched Floor Lamp')).toBeInTheDocument()
    })

    expect(screen.getByText('Design House')).toBeInTheDocument()
    expect(screen.getByText('$1,200.00')).toBeInTheDocument()
  })
})
