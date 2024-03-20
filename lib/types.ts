export interface Env {
  [key: string]: string
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
