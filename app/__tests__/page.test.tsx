import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import HomePage from '@/app/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock the useAuth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}))

const mockPush = jest.fn()
const mockReplace = jest.fn()

beforeEach(() => {
  (useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
    replace: mockReplace,
  })
})

describe('HomePage', () => {
  it('renders loading spinner', () => {
    const { useAuth } = require('@/hooks/use-auth')
    useAuth.mockReturnValue({
      user: null,
      loading: true,
    })

    render(<HomePage />)

    // Check for loading spinner
    const loader = screen.getByRole('status', { hidden: true }) || 
                  document.querySelector('.animate-spin')
    expect(loader).toBeInTheDocument()
  })

  it('redirects to dashboard when user is authenticated', () => {
    const { useAuth } = require('@/hooks/use-auth')
    useAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      loading: false,
    })

    render(<HomePage />)

    expect(mockReplace).toHaveBeenCalledWith('/dashboard')
  })

  it('redirects to login when user is not authenticated', () => {
    const { useAuth } = require('@/hooks/use-auth')
    useAuth.mockReturnValue({
      user: null,
      loading: false,
    })

    render(<HomePage />)

    expect(mockReplace).toHaveBeenCalledWith('/login')
  })
})
