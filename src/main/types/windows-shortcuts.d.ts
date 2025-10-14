declare module 'windows-shortcuts' {
  export interface ShortcutData {
    target?: string
    args?: string
    workingDir?: string
    desc?: string
    icon?: string
    iconIndex?: number
  }

  export function query(
    path: string,
    callback: (error: Error | null, data?: ShortcutData) => void
  ): void

  export function create(
    path: string,
    options: ShortcutData,
    callback?: (error: Error | null) => void
  ): void
}
