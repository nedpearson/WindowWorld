// Haptic feedback utilities for mobile PWA
// Wraps the Vibration API with named patterns for consistent UX

export const haptic = {
  /** Single light tap — button presses */
  tap: () => 'vibrate' in navigator && navigator.vibrate(30),

  /** Medium impact — confirm actions */
  impact: () => 'vibrate' in navigator && navigator.vibrate(50),

  /** Success pattern — action completed */
  success: () => 'vibrate' in navigator && navigator.vibrate([40, 30, 40]),

  /** Warning pattern — caution required */
  warning: () => 'vibrate' in navigator && navigator.vibrate([60, 40, 60, 40, 60]),

  /** Error pattern — action failed */
  error: () => 'vibrate' in navigator && navigator.vibrate([100, 50, 100]),

  /** Selection change — picker/tab switches */
  selection: () => 'vibrate' in navigator && navigator.vibrate(15),

  /** Voice recording start/stop */
  voice: (starting: boolean) =>
    'vibrate' in navigator &&
    navigator.vibrate(starting ? 40 : [20, 10, 20]),

  /** Measurement saved */
  measureSaved: () =>
    'vibrate' in navigator && navigator.vibrate([30, 20, 30, 20, 80]),

  /** Sync complete */
  syncComplete: () => 'vibrate' in navigator && navigator.vibrate([20, 15, 20]),
};
