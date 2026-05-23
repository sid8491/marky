import type { MarkyApi } from '../shared/ipc-contract'

declare global {
  interface Window {
    marky: MarkyApi
  }
}
