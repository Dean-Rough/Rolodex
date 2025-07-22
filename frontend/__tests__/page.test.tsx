import { render, screen } from '@testing-library/react'
import Home from '../app/page'

describe('Home page', () => {
  it('renders the welcome message', () => {
    render(<Home />)
    
    const heading = screen.getByRole('heading', { name: /welcome to rolodex/i })
    expect(heading).toBeInTheDocument()
    
    const description = screen.getByText(/your personal knowledge management system is ready to go/i)
    expect(description).toBeInTheDocument()
  })
})
