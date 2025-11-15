import { atom } from 'nanostores'

export interface PreviewInfo {
  port: number
  ready: boolean
  baseUrl: string
}

/**
 * PreviewsStore - Placeholder implementation
 * TODO: Implement preview functionality
 */
export class PreviewsStore {
  previews = atom<PreviewInfo[]>([])

  constructor() {
    // Placeholder: No initialization needed yet
  }
}
