import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'

import cors from './cors'

describe('cors', () => {
  const app = new Hono()
  app.use(cors({ addHeaders: ['X-Custom-Header'], addMethods: ['PATCH'] }))
  app.get('/', (c) => c.text('OK'))

  it('should bypass CORS middleware if no Origin header is present', async () => {
    const res = await app.request('/')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
  })

  it('should set the default origin to * when `ORIGIN` is not set', async () => {
    const res = await app.request(
      '/',
      { headers: { Origin: 'https://example.com' } },
      { ORIGIN: undefined }
    )
    expect(res.headers.get('Access-Control-Allow-Origin')).toEqual('*')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
  })

  it('should set the allowed origin to the client origin when it matches `ORIGIN`', async () => {
    const ORIGIN = 'https://example.com'
    const Origin = ORIGIN
    const res = await app.request('/', { headers: { Origin } }, { ORIGIN })
    expect(res.headers.get('Access-Control-Allow-Origin')).toEqual(ORIGIN)
    expect(res.headers.get('Access-Control-Allow-Credentials')).toEqual('true')
  })

  it('should not set CORS headers when client origin does not match `ORIGIN`', async () => {
    const ORIGIN = 'https://example.com'
    const Origin = 'https://not-example.com'
    const res = await app.request('/', { headers: { Origin } }, { ORIGIN })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
  })

  it('should add Authorization to allowed headers when `ORIGIN` is set and matches', async () => {
    const ORIGIN = 'https://example.com'
    const Origin = ORIGIN
    const method = 'OPTIONS'
    const res = await app.request('/', { method, headers: { Origin } }, { ORIGIN })
    expect(res.status).toEqual(204)
    expect(res.headers.get('Access-Control-Allow-Headers')).toInclude('Authorization')
  })

  it('should add X-Api-Key to allowed headers when `SECRET` is set', async () => {
    const ORIGIN = '*'
    const Origin = 'https://example.com'
    const SECRET = 'test'
    const method = 'OPTIONS'
    const res = await app.request(
      '/',
      { method, headers: { Origin } },
      { ORIGIN, SECRET }
    )
    expect(res.status).toEqual(204)
    expect(res.headers.get('Access-Control-Allow-Headers')).toInclude('X-Api-Key')
  })

  it('should support glob patterns in `ORIGIN`', async () => {
    const ORIGIN = 'https://*.example.com'
    const Origin = 'https://api.example.com'
    const res = await app.request('/', { headers: { Origin } }, { ORIGIN })
    expect(res.headers.get('Access-Control-Allow-Origin')).toEqual(Origin)
    expect(res.headers.get('Access-Control-Allow-Credentials')).toEqual('true')
  })

  it('should add custom headers and methods', async () => {
    const ORIGIN = '*'
    const Origin = 'https://example.com'
    const method = 'OPTIONS'
    const res = await app.request('/', { method, headers: { Origin } }, { ORIGIN })
    expect(res.status).toEqual(204)
    expect(res.headers.get('Access-Control-Allow-Headers')).toInclude('X-Custom-Header')
    expect(res.headers.get('Access-Control-Allow-Methods')).toInclude('PATCH')
  })
})
