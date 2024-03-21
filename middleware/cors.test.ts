import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'

import cors from './cors'

describe('cors', () => {
  const app = new Hono()
  app.use(cors())
  app.get('/', (c) => c.text('OK'))

  it('should set the default origin to *', async () => {
    const res = await app.request('/', {}, { ORIGIN: undefined })
    expect(res.headers.get('Access-Control-Allow-Origin')).toEqual('*')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toEqual(null)
  })

  it('should set the allowed origin to ORIGIN when set', async () => {
    const ORIGIN = 'https://example.com'
    const res = await app.request('/', {}, { ORIGIN })
    expect(res.headers.get('Access-Control-Allow-Origin')).toEqual(ORIGIN)
    expect(res.headers.get('Access-Control-Allow-Credentials')).toEqual('true')
  })

  it('should add Authorization to allowed headers when ORIGIN is set', async () => {
    const ORIGIN = 'https://example.com'
    const res = await app.request('/', { method: 'OPTIONS' }, { ORIGIN })
    expect(res.status).toEqual(204)
    expect(res.headers.get('Access-Control-Allow-Headers')).toEqual('Authorization') // only sent on OPTIONS requests
  })

  it('should add X-Api-Key to allowed headers when SECRET is set', async () => {
    const ORIGIN = 'https://example.com'
    const SECRET = 'test'
    const res = await app.request('/', { method: 'OPTIONS' }, { ORIGIN, SECRET })
    expect(res.status).toEqual(204)
    expect(res.headers.get('Access-Control-Allow-Headers')).toInclude('X-Api-Key')
  })
})
