export interface TOk<T> {
  ok: true
  data: T
  error?: never
}
export interface TFailed<E> {
  ok: false
  error: E
  data?: never
}
export type TResult<T = void, E = string> = TOk<T> | TFailed<E>

export function ok(): TOk<void>
export function ok<T>(data: T): TOk<T>
export function ok<T>(data?: T): TOk<T> {
  return { ok: true, data: data as T }
}
export function failed<E>(error: E): TFailed<E> {
  return { ok: false, error }
}

// ###########################################################################
// # API specific result type and helpers
// ###########################################################################

export interface TApiError {
  code: string
  message: string
  stack?: string
}
export const apiFailed = failed<TApiError>
export type TApiResult<T> = TResult<T, TApiError>
