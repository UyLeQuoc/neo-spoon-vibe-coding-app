/**
 * Decorator for async method - will ensure that only one invocation of the method is active at a time.
 *
 * Using the Web Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
 */
export function ensureExclusive(key: string = crypto.randomUUID()) {
  return (target: (...args: any[]) => Promise<any>) => {
    return async function (this: any, ...args: unknown[]) {
      const locks = navigator.locks
      if (!locks) return await target.apply(this, args)
      return await locks.request(key, () => target.apply(this, args))
    }
  }
}
