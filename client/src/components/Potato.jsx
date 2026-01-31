import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { POTATO_STATES } from '../store/gameStore';
import { getPotatoAsset, getHeatIntensity } from '../utils/potatoAssets';

const SIZE_CONFIGS = {
  sm: { width: 80, height: 80 },
  md: { width: 120, height: 120 },
  lg: { width: 180, height: 180 },
  xl: { width: 280, height: 280 },
};

function Potato({ 
  state = POTATO_STATES.IDLE, 
  size = 'md', 
  elapsedMs = 0,
  totalDurationMs = 25 * 60 * 1000,
  showEffects = true,
  className = '',
}) {
  const sizeConfig = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  
  // Convert to minutes for asset selection
  const elapsedMinutes = elapsedMs / 60000;
  const totalMinutes = totalDurationMs / 60000;
  
  // Get the correct potato asset
  const potatoAsset = useMemo(() => {
    return getPotatoAsset(state, elapsedMinutes, totalMinutes);
  }, [state, elapsedMinutes, totalMinutes]);

  // Calculate heat intensity for glow effect
  const heatIntensity = useMemo(() => {
    if (state === POTATO_STATES.IDLE || state === POTATO_STATES.COOLING) {
      return 0;
    }
    return getHeatIntensity(elapsedMinutes, totalMinutes);
  }, [state, elapsedMinutes, totalMinutes]);

  // Determine glow color based on state
  const glowColor = useMemo(() => {
    if (state === POTATO_STATES.COOLING) {
      return 'rgba(59, 130, 246, 0.6)'; // Blue glow for cooling
    }
    if (state === POTATO_STATES.CRITICAL) {
      return 'rgba(255, 0, 0, 0.8)'; // Red glow for critical
    }
    if (state === POTATO_STATES.HEATING) {
      // Interpolate from orange to red based on intensity
      const r = 255;
      const g = Math.round(165 - (165 * heatIntensity));
      const b = 0;
      return `rgba(${r}, ${g}, ${b}, ${0.4 + heatIntensity * 0.4})`;
    }
    return 'rgba(139, 115, 85, 0.2)'; // Subtle brown for idle
  }, [state, heatIntensity]);

  // Animation variants
  const containerVariants = {
    idle: {
      y: [0, -6, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
    heating: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 1.5 - heatIntensity * 0.5, // Faster as it gets hotter
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
    critical: {
      x: [0, -4, 4, -4, 4, -2, 2, 0],
      y: [0, 2, -2, 2, -2, 1, -1, 0],
      transition: {
        duration: 0.15,
        repeat: Infinity,
        ease: 'linear',
      },
    },
    cooling: {
      y: [0, -4, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  // Get animation variant key
  const animationKey = useMemo(() => {
    if (state === POTATO_STATES.CRITICAL) return 'critical';
    if (state === POTATO_STATES.HEATING) return 'heating';
    if (state === POTATO_STATES.COOLING) return 'cooling';
    return 'idle';
  }, [state]);

  return (
    <div 
      className={`relative ${className}`}
      style={{ 
        width: sizeConfig.width, 
        height: sizeConfig.height,
      }}
    >
      {/* Pulsing heat glow effect */}
      {showEffects && state !== POTATO_STATES.IDLE && (
        <motion.div
          className="absolute inset-0 rounded-full blur-3xl"
          style={{ 
            backgroundColor: glowColor,
            transform: 'scale(1.5)',
          }}
          animate={{
            opacity: state === POTATO_STATES.CRITICAL 
              ? [0.5, 1, 0.5] 
              : [0.3, 0.6, 0.3],
            scale: state === POTATO_STATES.CRITICAL 
              ? [1.3, 1.6, 1.3] 
              : [1.2, 1.4, 1.2],
          }}
          transition={{
            duration: state === POTATO_STATES.CRITICAL ? 0.3 : 2 - heatIntensity,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* The Potato Image */}
      <motion.div
        className="relative w-full h-full"
        variants={containerVariants}
        animate={animationKey}
      >
        <motion.img
          src={potatoAsset}
          alt="Potato"
          className="w-full h-full object-contain"
          style={{
            filter: showEffects 
              ? `drop-shadow(0 0 ${20 + heatIntensity * 40}px ${glowColor})`
              : 'none',
          }}
          animate={
            state === POTATO_STATES.CRITICAL 
              ? { 
                  filter: [
                    `drop-shadow(0 0 30px ${glowColor})`,
                    `drop-shadow(0 0 60px ${glowColor})`,
                    `drop-shadow(0 0 30px ${glowColor})`,
                  ]
                }
              : {}
          }
          transition={{
            duration: 0.3,
            repeat: state === POTATO_STATES.CRITICAL ? Infinity : 0,
          }}
        />
      </motion.div>

      {/* Heat particles for heating/critical states */}
      {showEffects && (state === POTATO_STATES.HEATING || state === POTATO_STATES.CRITICAL) && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {[...Array(state === POTATO_STATES.CRITICAL ? 8 : 4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${30 + Math.random() * 40}%`,
                bottom: '50%',
                backgroundColor: state === POTATO_STATES.CRITICAL 
                  ? '#FF4500' 
                  : '#FFA500',
              }}
              animate={{
                y: [-20, -80],
                x: [0, (Math.random() - 0.5) * 40],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.3],
              }}
              transition={{
                duration: 1 + Math.random(),
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      {/* Snowflakes for cooling state */}
      {showEffects && state === POTATO_STATES.COOLING && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-lg"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: '-20%',
              }}
              animate={{
                y: [0, sizeConfig.height * 1.5],
                x: [0, (Math.random() - 0.5) * 30],
                opacity: [0, 1, 0],
                rotate: [0, 180],
              }}
              transition={{
                duration: 2 + Math.random(),
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'linear',
              }}
            >
              ❄️
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Potato;
