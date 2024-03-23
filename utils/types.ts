import type { Bindings } from 'hono/types'

export interface Env extends Bindings {
  HF_TOKEN?: string
  PPLX_API_KEY?: string
  ORIGIN?: string
  SECRET?: string
}

export type ParameterValue =
  | string
  | number
  | boolean
  | unknown[]
  | Record<string, unknown>
  | undefined

export interface Parameters {
  [key: string]: ParameterValue
}
