import { POTATO_STATES } from '../store/gameStore';

/**
 * Get the correct potato asset based on timer state and elapsed time
 * @param {string} timerState - Current potato state (IDLE, HEATING, CRITICAL, COOLING)
 * @param {number} elapsedMinutes - Minutes elapsed in the current session
 * @param {number} totalMinutes - Total session duration in minutes (default 25)
 * @returns {string} Path to the potato PNG asset
 */
export function getPotatoAsset(timerState, elapsedMinutes = 0, totalMinutes = 25) {
  // Break/Cooling state always shows frozen potato
  if (timerState === POTATO_STATES.COOLING) {
    return '/potato_05_frozen.png';
  }

  // Critical state (when timer is almost done or complete)
  if (timerState === POTATO_STATES.CRITICAL) {
    return '/potato_04_critical.png';
  }

  // Idle state
  if (timerState === POTATO_STATES.IDLE) {
    return '/potato_01_idle.png';
  }

  // Heating state - determine asset based on elapsed time
  // Scale the thresholds based on total session duration
  const scaleFactor = totalMinutes / 25;
  
  const idleThreshold = 5 * scaleFactor;      // 0-5 mins (scaled)
  const warmThreshold = 15 * scaleFactor;     // 5-15 mins (scaled)
  const hotThreshold = 23 * scaleFactor;      // 15-23 mins (scaled)
  // 23-25 mins would be critical (scaled)

  if (elapsedMinutes < idleThreshold) {
    return '/potato_01_idle.png';
  } else if (elapsedMinutes < warmThreshold) {
    return '/potato_02_warm.png';
  } else if (elapsedMinutes < hotThreshold) {
    return '/potato_03_hot.png';
  } else {
    return '/potato_04_critical.png';
  }
}

/**
 * Get status icon path based on member state
 * @param {string} state - Member state
 * @returns {string} Path to the status icon PNG
 */
export function getStatusIcon(state) {
  switch (state) {
    case POTATO_STATES.HEATING:
    case POTATO_STATES.CRITICAL:
      return '/icon_status_heating.png';
    case POTATO_STATES.COOLING:
      return '/icon_status_cooling.png';
    case POTATO_STATES.IDLE:
    default:
      return '/icon_status_waiting.png';
  }
}

/**
 * Calculate heat intensity for glow effects (0-1)
 * @param {number} elapsedMinutes - Minutes elapsed
 * @param {number} totalMinutes - Total session duration
 * @returns {number} Intensity value between 0 and 1
 */
export function getHeatIntensity(elapsedMinutes, totalMinutes) {
  return Math.min(1, elapsedMinutes / totalMinutes);
}
