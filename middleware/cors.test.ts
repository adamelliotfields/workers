import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'

import cors from './cors'

const ACAO = 'Access-Control-Allow-Origin'
const ACAC = 'Access-Control-Allow-Credentials'
const ACAH = 'Access-Control-Allow-Headers'
const ACAM = 'Access-Control-Allow-Methods'

describe('cors', () => {
  const app = new Hono()
  app.use(cors({ headers: ['X-Custom-Header'], methods: ['PATCH'] }))
  app.get('/', (c) => c.text('OK'))

  it('should set the origin to `ORIGIN` when set', async () => {
    const ORIGIN = 'https://example.com'
    const method = 'OPTIONS'
    const res = await app.request('/', { method }, { ORIGIN })
    expect(res.status).toEqual(204)
    expect(res.headers.get(ACAO)).toEqual(ORIGIN)
    expect(res.headers.get(ACAC)).toEqual('true')
  })

  it('should set the default origin to * when `ORIGIN` is not set', async () => {
    const res1 = await app.request('/', { method: 'OPTIONS' })
    const res2 = await app.request('/', { method: 'GET' })
    expect(res1.status).toEqual(204)
    expect(res2.status).toEqual(200)
    expect(res1.headers.get(ACAO)).toEqual('*')
    expect(res1.headers.get(ACAC)).toBeNull()
    expect(res2.headers.get(ACAO)).toEqual('*')
    expect(res2.headers.get(ACAC)).toBeNull()
  })

  it('should add Authorization to allowed headers when `ORIGIN` is set and not `*`', async () => {
    const ORIGIN = 'https://example.com'
    const method = 'OPTIONS'
    const res = await app.request('/', { method }, { ORIGIN })
    expect(res.status).toEqual(204)
    expect(res.headers.get(ACAH)).toInclude('Authorization')
    expect(res.headers.get(ACAC)).toEqual('true')
  })

  it('should not add Authorization header when `ORIGIN` is `*`', async () => {
    const ORIGIN = '*'
    const method = 'OPTIONS'
    const res = await app.request('/', { method }, { ORIGIN })
    expect(res.status).toEqual(204)
    expect(res.headers.get(ACAH)).not.toInclude('Authorization')
    expect(res.headers.get(ACAC)).toBeNull()
  })

  it('should not add Credentials header when `ORIGIN` is `*`', async () => {
    const ORIGIN = '*'
    const method = 'OPTIONS'
    const res = await app.request('/', { method }, { ORIGIN })
    expect(res.status).toEqual(204)
    expect(res.headers.get(ACAC)).toBeNull()
  })

  it('should add X-Api-Key to allowed headers when `SECRET` is set', async () => {
    const ORIGIN = '*'
    const SECRET = 'test'
    const method = 'OPTIONS'
    const res = await app.request('/', { method }, { ORIGIN, SECRET })
    expect(res.status).toEqual(204)
    expect(res.headers.get(ACAH)).toInclude('X-Api-Key')
  })

  it('should add custom headers and methods', async () => {
    const ORIGIN = '*'
    const Origin = 'https://example.com'
    const method = 'OPTIONS'
    const res = await app.request('/', { method, headers: { Origin } }, { ORIGIN })
    expect(res.status).toEqual(204)
    expect(res.headers.get(ACAH)).toInclude('X-Custom-Header')
    expect(res.headers.get(ACAM)).toInclude('PATCH')
  })
})
