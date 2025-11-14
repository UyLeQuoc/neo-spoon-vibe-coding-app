export function debounce<Args extends any[]>(fn: (...args: Args) => void, delay = 100) {
  if (delay === 0) {
    return fn
  }

  let timer: number | undefined

  return function <U>(this: U, ...args: Args) {
    clearTimeout(timer)

    timer = window.setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}
