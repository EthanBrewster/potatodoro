import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore, { POTATO_STATES, DEFAULT_WORK_DURATION } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import Potato from './Potato';
import Timer from './Timer';
import Members from './Members';
import TossAnimation from './TossAnimation';

const DURATION_OPTIONS = [
  { label: '15 min', value: 15 * 60 * 1000 },
  { label: '25 min', value: 25 * 60 * 1000 },
  { label: '45 min', value: 45 * 60 * 1000 },
  { label: '60 min', value: 60 * 60 * 1000 },
];

function Kitchen() {
  const [selectedDuration, setSelectedDuration] = useState(DEFAULT_WORK_DURATION);
  const [showTossAnimation, setShowTossAnimation] = useState(false);
  const [tossTarget, setTossTarget] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const {
    userId,
    kitchen,
    kitchenCode,
    members,
    timerStartedAt,
    timerDuration,
    setError,
  } = useGameStore();

  const { 
    leaveKitchen, 
    startHeating, 
    tossPotato, 
    cancelSession 
  } = useSocket();

  // Check if current user holds the potato
  const isHoldingPotato = kitchen?.potatoHolder === userId;
  const potatoState = kitchen?.potatoState || POTATO_STATES.IDLE;
  const currentHolder = members.find(m => m.id === kitchen?.potatoHolder);

  // Get current user's state
  const currentMember = members.find(m => m.id === userId);
  const myState = currentMember?.state || POTATO_STATES.IDLE;

  // Update elapsed time continuously
  useEffect(() => {
    if (!timerStartedAt || !isHoldingPotato) {
      setElapsedMs(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - timerStartedAt);
    }, 100);

    return () => clearInterval(interval);
  }, [timerStartedAt, isHoldingPotato]);

  // Handle start heating
  const handleStartHeating = useCallback(async () => {
    setIsLoading(true);
    try {
      await startHeating(selectedDuration);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [startHeating, selectedDuration, setError]);

  // Handle toss
  const handleToss = useCallback(async (targetId = null) => {
    setIsLoading(true);
    setShowTossAnimation(true);
    
    // Find target for animation
    const target = targetId 
      ? members.find(m => m.id === targetId)
      : members.find(m => m.id !== userId && m.state !== POTATO_STATES.HEATING);
    
    setTossTarget(target);

    try {
      await tossPotato(targetId);
    } catch (error) {
      setError(error.message);
      setShowTossAnimation(false);
    } finally {
      setIsLoading(false);
      // Hide animation after delay
      setTimeout(() => setShowTossAnimation(false), 1500);
    }
  }, [tossPotato, members, userId, setError]);

  // Handle cancel
  const handleCancel = useCallback(async () => {
    setIsLoading(true);
    try {
      await cancelSession();
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [cancelSession, setError]);

  // Handle leave
  const handleLeave = useCallback(async () => {
    if (isHoldingPotato && potatoState === POTATO_STATES.HEATING) {
      if (!confirm('You\'re still holding the potato! Leave anyway?')) {
        return;
      }
    }
    await leaveKitchen();
  }, [leaveKitchen, isHoldingPotato, potatoState]);

  // Copy kitchen code
  const copyCode = () => {
    navigator.clipboard.writeText(kitchenCode);
  };

  return (
    <div 
      className="h-full flex flex-col relative"
      style={{
        backgroundImage: 'url(/bg_kitchen_main.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col p-4 md:p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl text-white text-glow">
              The Kitchen
            </h1>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
            >
              <span className="font-mono text-sm">{kitchenCode}</span>
              <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                📋 Copy
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-white/60 text-sm">
              👨‍🍳 {members.length}/5 chefs
            </span>
            <button
              onClick={handleLeave}
              className="px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              Leave
            </button>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
          {/* Potato Area - Center on Grill */}
          <div className="flex-1 flex flex-col items-center justify-end pb-8 md:pb-16 min-h-[400px]">
            {/* The Potato - positioned on the grill */}
            <motion.div
              className="relative"
              style={{ marginBottom: '5%' }} 
              animate={{
                scale: potatoState === POTATO_STATES.CRITICAL ? [1, 1.02, 1] : 1,
              }}
              transition={{ duration: 0.3, repeat: potatoState === POTATO_STATES.CRITICAL ? Infinity : 0 }}
            >
              <Potato 
                state={isHoldingPotato ? potatoState : POTATO_STATES.IDLE}
                size="xxl"
                elapsedMs={isHoldingPotato ? elapsedMs : 0}
                totalDurationMs={timerDuration || DEFAULT_WORK_DURATION}
              />

              {/* Potato holder indicator */}
              {currentHolder && !isHoldingPotato && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
                >
                  <span className="text-white/80 text-sm bg-black/50 px-3 py-1 rounded-full">
                    🥔 {currentHolder.nickname} is heating
                  </span>
                </motion.div>
              )}
            </motion.div>

            {/* Timer (when heating) */}
            <AnimatePresence>
              {isHoldingPotato && timerStartedAt && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-8"
                >
                  <Timer
                    startTime={timerStartedAt}
                    duration={timerDuration}
                    onComplete={() => {}}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls */}
            <div className="mt-8 flex flex-col items-center gap-4">
              {/* Idle state - Start button */}
              {myState === POTATO_STATES.IDLE && !kitchen?.potatoHolder && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  {/* Duration selector */}
                  <div className="flex gap-2 bg-black/30 p-2 rounded-xl backdrop-blur-sm">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedDuration(opt.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedDuration === opt.value
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleStartHeating}
                    disabled={isLoading}
                    className="btn btn-primary text-lg px-8 flex items-center gap-3"
                  >
                    <span className="text-2xl">🧤</span>
                    Grab the Potato
                  </button>
                </motion.div>
              )}

              {/* Waiting for others */}
              {myState === POTATO_STATES.IDLE && kitchen?.potatoHolder && kitchen.potatoHolder !== userId && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center bg-black/30 px-6 py-4 rounded-xl backdrop-blur-sm"
                >
                  <p className="text-white/80 mb-2">
                    Waiting for {currentHolder?.nickname || 'someone'} to finish...
                  </p>
                  <p className="text-white/50 text-sm">
                    The potato will be tossed to you soon! 🥔
                  </p>
                </motion.div>
              )}

              {/* Heating state - Toss button */}
              {isHoldingPotato && potatoState !== POTATO_STATES.IDLE && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  {potatoState === POTATO_STATES.CRITICAL && (
                    <motion.p
                      className="text-red-400 font-bold text-lg bg-black/50 px-4 py-2 rounded-lg"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      🔥 TIME'S UP! TOSS THE POTATO! 🔥
                    </motion.p>
                  )}

                  <div className="flex gap-3">
                    {/* Toss Button with PNG */}
                    <motion.button
                      onClick={() => handleToss()}
                      disabled={isLoading}
                      className={`relative overflow-hidden rounded-2xl transition-all ${
                        potatoState === POTATO_STATES.CRITICAL ? 'animate-bounce' : ''
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <img 
                        src="/btn_toss_active.png" 
                        alt="Toss!" 
                        className="h-16 w-auto"
                        style={{
                          filter: potatoState === POTATO_STATES.CRITICAL 
                            ? 'drop-shadow(0 0 20px rgba(255, 69, 0, 0.8))' 
                            : 'drop-shadow(0 0 10px rgba(255, 165, 0, 0.5))',
                        }}
                      />
                    </motion.button>

                    {potatoState === POTATO_STATES.HEATING && (
                      <button
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Cooling state */}
              {myState === POTATO_STATES.COOLING && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center bg-blue-500/20 px-6 py-4 rounded-xl backdrop-blur-sm border border-blue-500/30"
                >
                  <div className="text-4xl mb-2">❄️</div>
                  <p className="text-blue-300 font-medium text-lg">
                    Cooling Down...
                  </p>
                  <p className="text-blue-200/60 text-sm mt-1">
                    Take a break! You've earned it.
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Members Panel - Side */}
          <div className="lg:w-80 shrink-0">
            <Members 
              onSendReaction={() => {}}
              onSelectTarget={handleToss}
              canSelectTarget={isHoldingPotato && potatoState === POTATO_STATES.CRITICAL}
            />
          </div>
        </div>

        {/* Toss Animation Overlay */}
        <AnimatePresence>
          {showTossAnimation && (
            <TossAnimation 
              target={tossTarget}
              potatoAsset={
                elapsedMs > (timerDuration || DEFAULT_WORK_DURATION) * 0.92
                  ? '/potato_04_critical.png'
                  : '/potato_03_hot.png'
              }
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Kitchen;
