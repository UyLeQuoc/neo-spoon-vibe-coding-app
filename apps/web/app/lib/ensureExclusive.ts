type AsyncMethod = <T>(this: T, ...args: unknown[]) => Promise<unknown>

/**
 * Decorator for async method - will ensure that only one invocation of the method is active at a time.
 *
 * Using the Web Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
 */
export function ensureExclusive(key: string = crypto.randomUUID()): MethodDecorator {
  return <F>(_target: unknown, _propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<F>) => {
    const origin = descriptor?.value
    if (!origin || typeof origin !== 'function') return

    const decorated: AsyncMethod = async function (this, ...args) {
      const locks = navigator.locks
      if (!locks) return await origin.apply(this, args)
      return await locks.request(key, async () => await origin.apply(this, args))
    }

    descriptor.value = decorated as F
    return descriptor
  }
}
