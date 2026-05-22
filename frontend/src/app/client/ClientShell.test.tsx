'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientShell } from './ClientShell'

const mockUseClientMe = vi.fn()
const mockPush = vi.fn()
const mockPathname = vi.fn()

vi.mock('@/hooks/useClientAuth', () => ({
  useClientMe: () => mockUseClientMe(),
  useClientLogout: () => vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPathname.mockReturnValue('/client/projects')
})

describe('ClientShell', () => {
  it('shows loading spinner while auth is loading', () => {
    mockUseClientMe.mockReturnValue({ data: undefined, isLoading: true, isFetching: false })

    render(
      <wrapper>
        <ClientShell>
          <p>content</p>
        </ClientShell>
      </wrapper>,
    )

    expect(screen.queryByText('content')).toBeNull()
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeTruthy()
  })

  it('redirects to /client/login when not authenticated', async () => {
    mockUseClientMe.mockReturnValue({ data: undefined, isLoading: false, isFetching: false })

    render(
      <wrapper>
        <ClientShell>
          <p>content</p>
        </ClientShell>
      </wrapper>,
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/client/login')
    })
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
      isFetching: false,
    })

    render(
      <wrapper>
        <ClientShell>
          <p>project list</p>
        </ClientShell>
      </wrapper>,
    )

    expect(screen.getByText('project list')).toBeTruthy()
    expect(screen.getByText('ติดตามโครงการ')).toBeTruthy()
  })

  it('renders children directly on public paths without auth check', () => {
    mockPathname.mockReturnValue('/client/login')
    mockUseClientMe.mockReturnValue({ data: undefined, isLoading: false, isFetching: false })

    render(
      <wrapper>
        <ClientShell>
          <p>login form</p>
        </ClientShell>
      </wrapper>,
    )

    expect(screen.getByText('login form')).toBeTruthy()
    expect(mockPush).not.toHaveBeenCalled()
  })
})
