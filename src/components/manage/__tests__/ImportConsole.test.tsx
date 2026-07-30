// @vitest-environment jsdom
/*
 * REPRO tests for item 5: "Must refresh before revalidating a corrected file."
 *
 * Written before the fix and observed to FAIL. Two separate root causes, both
 * asserted here:
 *
 *  a) The file input's value is never cleared after a read. A browser fires no
 *     change event when the same file name is picked again, so a scheduler who
 *     fixes their file in Excel, saves it under the same name, and reselects it
 *     gets nothing at all until they reload the page.
 *  b) State does not fully reset between attempts, so a stale message from the
 *     previous try is still on screen next to the new file.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ImportConsole } from '../ImportConsole'

const SEASONS = [{ id: 1, name: '2026 season' }]

function makeCsv(name: string, body = 'date,time\n2026-01-10,18:00\n') {
  return new File([body], name, { type: 'text/csv' })
}

function fileInput(): HTMLInputElement {
  const el = document.querySelector('input[type="file"]')
  if (!el) throw new Error('no file input rendered')
  return el as HTMLInputElement
}

/*
 * jsdom will happily let us dispatch the same change twice, which a real browser
 * will not. So we assert the real root cause instead: after the component reads a
 * file it must assign '' to the input value, which is what makes the second pick
 * of the same file name fire a change event at all. jsdom's own value getter for
 * a file input does not reflect a stubbed `files` list, so we install our own
 * property and record what the component writes to it.
 */
function trackValueWrites(input: HTMLInputElement): string[] {
  const writes: string[] = []
  let current = 'C:\\fakepath\\schedule.csv'
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => current,
    set: (v: string) => {
      writes.push(v)
      current = v
    },
  })
  return writes
}

async function pickFile(file: File) {
  const input = fileInput()
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  fireEvent.change(input)
  await waitFor(() => expect(screen.getByText(file.name)).toBeInTheDocument())
}

const previewWithErrors = {
  ok: true,
  kind: 'games',
  validation: {
    rows: [{ row: 2, status: 'error', issues: [{ severity: 'error', message: 'Venue not found.', value: 'Nowhere Gym' }] }],
    summary: { ready: 0, warnings: 0, errors: 1 },
  },
  conflicts: [],
  canImport: false,
  needsAck: false,
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(previewWithErrors), { status: 200, headers: { 'Content-Type': 'application/json' } })),
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('item 5 repro: fix and revalidate without a page refresh', () => {
  it('clears the file input value after reading, so reselecting the same file name works', async () => {
    render(<ImportConsole seasons={SEASONS} />)
    const writes = trackValueWrites(fileInput())
    await pickFile(makeCsv('schedule.csv'))
    // The browser only fires change when the value actually changes. Leaving the
    // previously chosen path in the input is exactly why the scheduler had to
    // reload the page before trying the corrected file.
    expect(writes).toContain('')
  })

  it('clears a stale error message when a new file is chosen', async () => {
    // The reported flow: validate fails, the scheduler fixes the file, picks it
    // again, and the old failure text is still sitting there next to the new name.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'Could not detect the file type from the header.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })),
    )
    render(<ImportConsole seasons={SEASONS} />)
    await pickFile(makeCsv('schedule.csv'))

    fireEvent.click(screen.getByRole('button', { name: /validate file/i }))
    await waitFor(() => expect(screen.getByText(/Could not detect the file type/)).toBeInTheDocument())

    await pickFile(makeCsv('schedule-fixed.csv'))
    expect(screen.queryByText(/Could not detect the file type/)).not.toBeInTheDocument()
  })

  it('clears the previous preview when a new file is chosen', async () => {
    render(<ImportConsole seasons={SEASONS} />)
    await pickFile(makeCsv('schedule.csv'))

    fireEvent.click(screen.getByRole('button', { name: /validate file/i }))
    await waitFor(() => expect(screen.getByText(/Venue not found\./)).toBeInTheDocument())

    await pickFile(makeCsv('schedule.csv'))
    expect(screen.queryByText(/Venue not found\./)).not.toBeInTheDocument()
  })

  it('offers a start over control that clears everything without a reload', async () => {
    render(<ImportConsole seasons={SEASONS} />)
    await pickFile(makeCsv('schedule.csv'))
    fireEvent.click(screen.getByRole('button', { name: /validate file/i }))
    await waitFor(() => expect(screen.getByText(/Venue not found\./)).toBeInTheDocument())

    // Start over is offered both at the top of the upload step and under the
    // preview, so a scheduler never has to scroll to find it. Either will do.
    fireEvent.click(screen.getAllByRole('button', { name: /start over/i })[0])

    expect(screen.queryByText(/Venue not found\./)).not.toBeInTheDocument()
    expect(screen.queryByText('schedule.csv')).not.toBeInTheDocument()
    expect(fileInput().value).toBe('')
  })

  it('lets the scheduler revalidate as many times as needed with no reload', async () => {
    render(<ImportConsole seasons={SEASONS} />)
    const writes = trackValueWrites(fileInput())
    for (let attempt = 1; attempt <= 3; attempt++) {
      await pickFile(makeCsv('schedule.csv'))
      fireEvent.click(screen.getByRole('button', { name: /validate file/i }))
      await waitFor(() => expect(screen.getByText(/Venue not found\./)).toBeInTheDocument())
      expect(writes.filter((w) => w === '')).toHaveLength(attempt)
    }
  })
})

describe('item 4 support: the preview shows what the importer read', () => {
  it('shows the normalized 12 hour time back to the scheduler', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ok: true,
              kind: 'games',
              validation: {
                rows: [
                  {
                    row: 2,
                    status: 'ready',
                    issues: [],
                    normalized: { date: '2026-01-10', time: '08:00', timeDisplay: '8:00 AM' },
                  },
                ],
                summary: { ready: 1, warnings: 0, errors: 0 },
              },
              conflicts: [],
              canImport: true,
              needsAck: false,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    )
    render(<ImportConsole seasons={SEASONS} />)
    await pickFile(makeCsv('schedule.csv'))
    fireEvent.click(screen.getByRole('button', { name: /validate file/i }))
    await waitFor(() => expect(screen.getByText(/8:00 AM/)).toBeInTheDocument())
  })
})
