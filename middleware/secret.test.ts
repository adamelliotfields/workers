import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'

import secret from './secret'

describe('secret', () => {
  const app = new Hono()
  app.use(secret())
  app.get('/', (c) => c.text('OK'))

  it('should allow requests without a secret', async () => {
    const res = await app.request('/', {}, { SECRET: undefined })
    expect(res.status).toEqual(200)
    expect(await res.text()).toEqual('OK')
  })

  it('should allow requests with the correct secret header', async () => {
    const SECRET = 'test'
    const res = await app.request('/', { headers: { 'X-Api-Key': SECRET } }, { SECRET })
    expect(res.status).toEqual(200)
    expect(await res.text()).toEqual('OK')
  })

  it('should allow requests with the correct secret query string', async () => {
    const SECRET = 'test'
    const res = await app.request(`/?api_key=${SECRET}`, {}, { SECRET })
    expect(res.status).toEqual(200)
    expect(await res.text()).toEqual('OK')
  })

  it('should use the query string when both are set', async () => {
    const right = 'right'
    const wrong = 'wrong'
    const res = await app.request(
      `/?api_key=${right}`,
      { headers: { 'X-Api-Key': wrong } },
      { SECRET: right }
    )
    expect(res.status).toEqual(200)
    expect(await res.text()).toEqual('OK')
  })

  it('should throw 401 when the header is incorrect', async () => {
    const SECRET = 'test'
    const res = await app.request(
      '/',
      { headers: { 'X-Api-Key': 'wrong' } },
      { SECRET }
    )
    expect(res.status).toEqual(401)
  })

  it('should throw 401 when the query string is incorrect', async () => {
    const SECRET = 'test'
    const res = await app.request('/?api_key=wrong', {}, { SECRET })
    expect(res.status).toEqual(401)
  })

  it('should throw 401 when both are missing', async () => {
    const SECRET = 'test'
    const res = await app.request('/', {}, { SECRET })
    expect(res.status).toEqual(401)
  })

  it('should throw 401 when header is right but query string is wrong', async () => {
    const right = 'right'
    const wrong = 'wrong'
    const res = await app.request(
      `/?api_key=${wrong}`,
      { headers: { 'X-Api-Key': right } },
      { SECRET: right }
    )
    expect(res.status).toEqual(401)
  })
})
