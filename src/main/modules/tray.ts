import { app, Tray, Menu, nativeImage } from 'electron'
import icon from '../../../resources/icon.png?asset'

let tray: Tray | null = null

/**
 * Create system tray icon and menu
 */
export function createTray(): void {
  // Create tray icon
  const trayIcon = nativeImage.createFromPath(icon)
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setToolTip('Fingertips AI')
  tray.setContextMenu(contextMenu)
}

/**
 * Get the tray instance
 */
export function getTray(): Tray | null {
  return tray
}

/**
 * Destroy the tray
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
