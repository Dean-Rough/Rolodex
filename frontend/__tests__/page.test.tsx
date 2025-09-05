import { render, screen } from '@testing-library/react'
import Home from '../app/page'

describe('Home page', () => {
  it('renders the welcome message', () => {
    render(<Home />)
    
    const heading = screen.getByRole('heading', { name: /welcome to rolodex/i })
    expect(heading).toBeInTheDocument()
    
    const description = screen.getByText(/your personal ff&e product management system for interior design professionals\./i)
    expect(description).toBeInTheDocument()
  })
})
