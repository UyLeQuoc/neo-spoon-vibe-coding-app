import { classNames } from '~/utils/classNames'

export function cn(...args: Parameters<typeof classNames>) {
  return classNames(...args)
}

