import { screen } from 'electron'

/**
 * Calculate window position centered on mouse cursor
 * Handles screen boundary cases to ensure window is fully visible
 *
 * @param mouseX - Mouse X coordinate
 * @param mouseY - Mouse Y coordinate
 * @param windowWidth - Window width
 * @param windowHeight - Window height
 * @returns Calculated window position { x, y }
 */
export function calculateWindowPosition(
  mouseX: number,
  mouseY: number,
  windowWidth: number,
  windowHeight: number
): { x: number; y: number } {
  // Get the display where the mouse is located
  const cursorPoint = { x: mouseX, y: mouseY }
  const display = screen.getDisplayNearestPoint(cursorPoint)
  const { x: displayX, y: displayY, width: displayWidth, height: displayHeight } = display.bounds

  // Calculate centered position
  let x = mouseX - windowWidth / 2
  let y = mouseY - windowHeight / 2

  // Handle horizontal boundaries
  if (x < displayX) {
    x = displayX
  } else if (x + windowWidth > displayX + displayWidth) {
    x = displayX + displayWidth - windowWidth
  }

  // Handle vertical boundaries
  if (y < displayY) {
    y = displayY
  } else if (y + windowHeight > displayY + displayHeight) {
    y = displayY + displayHeight - windowHeight
  }

  return { x: Math.round(x), y: Math.round(y) }
}
