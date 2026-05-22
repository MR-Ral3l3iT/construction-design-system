import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientShell } from './ClientShell'

// Mock hooks to isolate component behaviour
const mockUseClientMe = vi.fn()
const mockUseClientLogout = vi.fn(() => vi.fn())
const mockPush = vi.fn()

vi.mock('@/hooks/useClientAuth', () => ({
  useClientMe: () => mockUseClientMe(),
  useClientLogout: () => mockUseClientLogout(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/client/projects',
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ClientShell', () => {
  it('shows loading spinner while auth is loading', () => {
    mockUseClientMe.mockReturnValue({ data: undefined, isLoading: true })

    render(
      <wrapper>
        <ClientShell>
          <p>content</p>
        </ClientShell>
      </wrapper>,
    )

    expect(screen.queryByText('content')).toBeNull()
    // Spinner is present (animate-spin class)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeTruthy()
  })

  it('redirects to /client/login when not authenticated', () => {
    mockUseClientMe.mockReturnValue({ data: undefined, isLoading: false })

    render(
      <wrapper>
        <ClientShell>
          <p>content</p>
        </ClientShell>
      </wrapper>,
    )

    expect(mockPush).toHaveBeenCalledWith('/client/login')
  })

  it('renders children and header when authenticated', () => {
    mockUseClientMe.mockReturnValue({
      data: {
        id: 1,
        name: 'สมชาย',
        email: 'somchai@test.com',
        roles: ['CUSTOMER'],
        permissions: [],
      },
      isLoading: false,
    })

    render(
      <wrapper>
        <ClientShell>
          <p>project list</p>
        </ClientShell>
      </wrapper>,
    )

    expect(screen.getByText('project list')).toBeTruthy()
    expect(screen.getByText('Client Portal')).toBeTruthy()
    expect(screen.getByText('สมชาย')).toBeTruthy()
  })

  it('renders children directly on public paths without auth check', () => {
    // Re-mock usePathname to return the login page
    vi.mock('next/navigation', () => ({
      useRouter: () => ({ push: mockPush }),
      usePathname: () => '/client/login',
    }))

    mockUseClientMe.mockReturnValue({ data: undefined, isLoading: false })

    render(
      <wrapper>
        <ClientShell>
          <p>login form</p>
        </ClientShell>
      </wrapper>,
    )

    // Should NOT redirect — just render without auth gate
    // (On public path the component wraps in a div and renders children)
    // The mock push should not be called
    expect(mockPush).not.toHaveBeenCalled()
  })
})
