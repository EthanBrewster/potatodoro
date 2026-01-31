import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import useGameStore, { POTATO_STATES } from '../store/gameStore';

function Timer({ 
  startTime, 
  duration, 
  onComplete,
  showControls = true,
}) {
  const [remaining, setRemaining] = useState(duration);
  const [isComplete, setIsComplete] = useState(false);
  const { setTimerRemaining } = useGameStore();

  // Calculate remaining time
  useEffect(() => {
    if (!startTime || !duration) {
      setRemaining(duration);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newRemaining = Math.max(0, duration - elapsed);
      
      setRemaining(newRemaining);
      setTimerRemaining(newRemaining);

      if (newRemaining <= 0 && !isComplete) {
        setIsComplete(true);
        onComplete?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, duration, isComplete, onComplete, setTimerRemaining]);

  // Calculate progress percentage
  const progress = useMemo(() => {
    if (!duration) return 0;
    return Math.min(100, ((duration - remaining) / duration) * 100);
  }, [duration, remaining]);

  // Format time display
  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Determine state based on progress
  const timerState = useMemo(() => {
    if (progress >= 95) return POTATO_STATES.CRITICAL;
    if (progress >= 50) return 'HOT';
    if (progress >= 25) return 'WARM';
    return 'STARTING';
  }, [progress]);

  // Color gradient based on progress
  const progressColor = useMemo(() => {
    if (progress >= 95) return 'from-red-600 to-orange-500';
    if (progress >= 75) return 'from-orange-500 to-yellow-500';
    if (progress >= 50) return 'from-yellow-500 to-amber-400';
    if (progress >= 25) return 'from-amber-400 to-orange-300';
    return 'from-orange-300 to-yellow-300';
  }, [progress]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Thermometer */}
      <div className="relative w-16 h-64">
        {/* Glass tube */}
        <div className="thermometer-tube absolute inset-0 rounded-full overflow-hidden">
          {/* Mercury fill */}
          <motion.div
            className={`thermometer-mercury absolute bottom-0 left-0 right-0 bg-gradient-to-t ${progressColor}`}
            initial={{ height: 0 }}
            animate={{ height: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />

          {/* Bubbles */}
          {progress > 50 && (
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-white/30 rounded-full"
                  style={{
                    left: `${20 + i * 25}%`,
                    bottom: `${progress * 0.5}%`,
                  }}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0, 0.6, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bulb at bottom */}
        <div 
          className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-br ${progressColor} border-2 border-white/20`}
          style={{
            boxShadow: timerState === POTATO_STATES.CRITICAL 
              ? '0 0 30px rgba(255, 69, 0, 0.8)' 
              : '0 0 15px rgba(255, 107, 53, 0.4)',
          }}
        />

        {/* Temperature markers */}
        <div className="absolute left-full ml-2 top-0 bottom-0 flex flex-col justify-between text-xs text-white/40 font-mono">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>
      </div>

      {/* Time display */}
      <motion.div
        className={`font-mono text-5xl font-bold ${
          timerState === POTATO_STATES.CRITICAL 
            ? 'text-red-500 text-glow-critical animate-pulse' 
            : 'text-white text-glow'
        }`}
        animate={
          timerState === POTATO_STATES.CRITICAL 
            ? { scale: [1, 1.05, 1] } 
            : {}
        }
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        {formatTime(remaining)}
      </motion.div>

      {/* Status text */}
      <div className={`text-sm font-medium ${
        timerState === POTATO_STATES.CRITICAL 
          ? 'text-red-400' 
          : 'text-white/60'
      }`}>
        {timerState === POTATO_STATES.CRITICAL && '🔥 TIME TO TOSS!'}
        {timerState === 'HOT' && '🌡️ Getting Hot...'}
        {timerState === 'WARM' && '♨️ Warming Up...'}
        {timerState === 'STARTING' && '🥔 Focus Mode'}
      </div>

      {/* Progress bar (alternative view) */}
      <div className="w-full max-w-xs h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${progressColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

export default Timer;
