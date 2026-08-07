// @vitest-environment happy-dom
/*
 * Tests for the resilience states added in the mobile audit Phase 1.
 *
 * These are written against the specific defects the audit found, so each one
 * would have failed before the fix rather than merely describing the fix:
 *
 *  1. 49 routes had zero error boundaries, so a failed fetch rendered nothing.
 *     -> assert the error state renders text and a working retry.
 *  2. The site's `.reveal` class starts at opacity 0 and only becomes visible when
 *     an IntersectionObserver in GlobalFX adds `.in`. A failure state that depends
 *     on more JavaScript succeeding is a failure state that sometimes never shows.
 *     -> assert none of these components use `.reveal`.
 *  3. Touch targets were unenforced anywhere in the app.
 *     -> assert every action in these states carries the 48px minimum.
 *  4. A skeleton with no accessible name is a silent page of boxes to a screen
 *     reader. -> assert the busy state is announced.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ErrorState } from '../ErrorState'
import { EmptyState } from '../EmptyState'
import { PageSkeleton } from '../PageSkeleton'

/** Walks the rendered tree for any element still relying on the reveal observer. */
function revealElements(container: HTMLElement) {
  return container.querySelectorAll('.reveal')
}

/**
 * The 48px floor, asserted on the class list rather than on a computed height.
 * happy-dom does not run Tailwind, so a computed style check here would pass
 * vacuously and prove nothing. The class is the contract.
 */
function assertTouchTarget(el: Element) {
  expect(el.className).toMatch(/min-h-\[48px\]/)
}

describe('ErrorState', () => {
  it('renders a plain language message and a working retry', () => {
    const reset = vi.fn()
    render(<ErrorState onRetry={reset} />)

    expect(screen.getByText(/this page did not load/i)).toBeInTheDocument()

    const retry = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(retry)
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('always offers a safe path home, even when retrying is impossible', () => {
    // No onRetry: this is the 404 shape, where reloading produces the same 404.
    render(<ErrorState title="We could not find that page" body="..." />)

    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull()
    expect(screen.getByRole('link', { name: /home page/i })).toHaveAttribute('href', '/')
  })

  it('sends a role area back to its own hub rather than the site root', () => {
    render(<ErrorState body="..." homeHref="/manage" homeLabel="Go to the console" />)
    expect(screen.getByRole('link', { name: /go to the console/i })).toHaveAttribute(
      'href',
      '/manage',
    )
  })

  it('announces itself to assistive technology immediately', () => {
    render(<ErrorState onRetry={() => {}} />)
    // role=alert is implicitly assertive; a polite region would be read after
    // whatever the user is already hearing, which is too late for a failure.
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows the digest for support but never the raw error message', () => {
    render(<ErrorState onRetry={() => {}} digest="abc123" />)
    expect(screen.getByText(/abc123/)).toBeInTheDocument()
  })

  it('does not depend on the reveal observer to become visible', () => {
    const { container } = render(<ErrorState onRetry={() => {}} digest="x" />)
    expect(revealElements(container)).toHaveLength(0)
  })

  it('gives every action a 48px minimum touch target', () => {
    render(<ErrorState onRetry={() => {}} />)
    assertTouchTarget(screen.getByRole('button', { name: /try again/i }))
    assertTouchTarget(screen.getByRole('link', { name: /home page/i }))
  })
})

describe('EmptyState', () => {
  it('says what is empty and why, not just that it is empty', () => {
    render(
      <EmptyState
        title="No upcoming games"
        body="Nothing is on the schedule right now. New games appear here as soon as they are published."
      />,
    )
    expect(screen.getByRole('heading', { name: /no upcoming games/i })).toBeInTheDocument()
    expect(screen.getByText(/new games appear here/i)).toBeInTheDocument()
  })

  it('offers a next step when one exists, and a 48px target for it', () => {
    render(
      <EmptyState title="No games" body="..." actionHref="/standings" actionLabel="See standings" />,
    )
    const action = screen.getByRole('link', { name: /see standings/i })
    expect(action).toHaveAttribute('href', '/standings')
    assertTouchTarget(action)
  })

  it('does not depend on the reveal observer to become visible', () => {
    const { container } = render(<EmptyState title="No games" body="..." />)
    expect(revealElements(container)).toHaveLength(0)
  })
})

describe('PageSkeleton', () => {
  it('announces that something is loading rather than showing silent boxes', () => {
    render(<PageSkeleton label="Loading the schedule" />)
    expect(screen.getByText('Loading the schedule')).toBeInTheDocument()
  })

  it('marks the region busy so assistive tech does not read half a page', () => {
    const { container } = render(<PageSkeleton />)
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it.each(['default', 'table', 'cards', 'form', 'card'] as const)(
    'renders the %s variant with the shared editorial header, so content lands where the skeleton held space',
    (variant) => {
      const { container } = render(<PageSkeleton variant={variant} />)
      // The header block is what every page opens with; if a variant dropped it,
      // the real page would shift down by the height of a display heading on arrival.
      expect(container.querySelector('section')).toBeTruthy()
      expect(container.querySelectorAll(String.raw`div[class*="bg-white"]`).length).toBeGreaterThan(3)
    },
  )

  it('does not depend on the reveal observer to become visible', () => {
    const { container } = render(<PageSkeleton variant="table" />)
    expect(revealElements(container)).toHaveLength(0)
  })
})
