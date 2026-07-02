import { describe, expect, it } from 'vitest'

import { assertCanadianResidency, checkCanadianResidency } from './region'

const CA_PROD = {
  databaseUrl: 'postgresql://postgres@db.pdwautioosstdgbbblxl.supabase.co:5432/postgres',
  s3Region: 'ca-central-1',
  s3Endpoint: 'https://pdwautioosstdgbbblxl.supabase.co/storage/v1/s3',
}

describe('checkCanadianResidency', () => {
  it('passes for the ca-central-1 prod project (direct connection, ref allowlisted)', () => {
    expect(checkCanadianResidency(CA_PROD)).toEqual({ ok: true, problems: [] })
  })

  it('passes for a ca-central-1 pooler URL (region encoded in host)', () => {
    expect(
      checkCanadianResidency({
        databaseUrl: 'postgresql://postgres.abcdefghij@aws-1-ca-central-1.pooler.supabase.com:6543/postgres',
        s3Region: 'ca-central-1',
        s3Endpoint: 'https://x.supabase.co/storage/v1/s3',
      }).ok,
    ).toBe(true)
  })

  it('fails when DATABASE_URL points at the stale us-east-2 project', () => {
    const res = checkCanadianResidency({
      databaseUrl: 'postgresql://postgres@db.vdlpmjmpaalesmddwabo.supabase.co:5432/postgres',
      s3Region: 'ca-central-1',
      s3Endpoint: 'https://vdlpmjmpaalesmddwabo.supabase.co/storage/v1/s3',
    })
    expect(res.ok).toBe(false)
    expect(res.problems.join(' ')).toMatch(/not a known ca-central-1 target/)
  })

  it('fails on a non-Canadian S3 region', () => {
    const res = checkCanadianResidency({ ...CA_PROD, s3Region: 'us-east-2' })
    expect(res.ok).toBe(false)
    expect(res.problems.join(' ')).toMatch(/S3_REGION/)
  })

  it('honors an extra allowed ref (e.g. a ca-central-1 preview branch)', () => {
    const branchRef = 'bcyfxboehbwzecnpqexk' // a real ca-central-1 project ref
    const res = checkCanadianResidency({
      databaseUrl: `postgresql://postgres@db.${branchRef}.supabase.co:5432/postgres`,
      s3Region: 'ca-central-1',
      s3Endpoint: 'https://x.supabase.co/storage/v1/s3',
      allowedRefs: [branchRef],
    })
    expect(res.ok).toBe(true)
  })

  it('reports an unset DATABASE_URL', () => {
    const res = checkCanadianResidency({ databaseUrl: '', s3Region: 'ca-central-1' })
    expect(res.ok).toBe(false)
    expect(res.problems.join(' ')).toMatch(/DATABASE_URL is unset/)
  })
})

describe('assertCanadianResidency', () => {
  it('throws with a clear message on a US target', () => {
    expect(() => assertCanadianResidency({ ...CA_PROD, s3Region: 'us-east-1' })).toThrow(/residency check failed/)
  })

  it('does not throw for the Canadian prod project', () => {
    expect(() => assertCanadianResidency(CA_PROD)).not.toThrow()
  })
})
