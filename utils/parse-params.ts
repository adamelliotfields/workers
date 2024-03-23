import type { ParameterValue, Parameters } from './types'

export interface ParseConfig {
  [key: string]: [(value: string) => ParameterValue, ParameterValue?]
}

export default function parseParams(
  params: URLSearchParams,
  config: ParseConfig,
  omitKeys: string[] = []
) {
  const parameters: Parameters = {}

  for (const [key, [parser, defaultValue]] of Object.entries(config)) {
    const value = params.get(key)
    parameters[key] = value ? parser(value) : defaultValue
  }

  for (const key of omitKeys) {
    Reflect.deleteProperty(parameters, key)
  }

  return parameters
}
