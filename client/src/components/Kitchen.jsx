import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore, { POTATO_STATES, DEFAULT_WORK_DURATION } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import Potato from './Potato';
import Timer from './Timer';
import TossAnimation from './TossAnimation';

const DURATION_OPTIONS = [
  { label: '15 min', value: 15 * 60 * 1000 },
  { label: '25 min', value: 25 * 60 * 1000 },
  { label: '45 min', value: 45 * 60 * 1000 },
  { label: '60 min', value: 60 * 60 * 1000 },
];

// Plate positions relative to the background image (percentages)
// These align with the 4 colored plates in the background
const PLATE_POSITIONS = [
  { id: 0, left: '23%', top: '22%', color: 'blue' },    // Blue plate (left)
  { id: 1, left: '38%', top: '22%', color: 'green' },   // Green plate
  { id: 2, left: '53%', top: '22%', color: 'orange' },  // Orange plate
  { id: 3, left: '68%', top: '22%', color: 'yellow' },  // Yellow plate (right)
];

// Grill center position
const GRILL_POSITION = { left: '42%', top: '52%' };

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

  // Assign members to plate positions
  const memberPlates = useMemo(() => {
    const assignments = new Map();
    members.forEach((member, index) => {
      if (index < PLATE_POSITIONS.length) {
        assignments.set(member.id, PLATE_POSITIONS[index]);
      }
    });
    return assignments;
  }, [members]);

  // Get my plate position
  const myPlate = memberPlates.get(userId);

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

  // Handle start heating (toss potato to grill)
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

  // Handle grab (pull potato back from grill to cool)
  const handleGrab = useCallback(async () => {
    setIsLoading(true);
    try {
      await tossPotato(null); // Toss to self / end session
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [tossPotato, setError]);

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
      if (!confirm('You\'re still cooking! Leave anyway?')) {
        return;
      }
    }
    await leaveKitchen();
  }, [leaveKitchen, isHoldingPotato, potatoState]);

  // Copy kitchen code
  const copyCode = () => {
    navigator.clipboard.writeText(kitchenCode);
  };

  // Check if someone is cooking (potato on grill)
  const someoneCooking = kitchen?.potatoHolder && potatoState === POTATO_STATES.HEATING;

  return (
    <div 
      className="h-full flex flex-col relative overflow-hidden"
      style={{
        backgroundImage: 'url(/bg_kitchen_main.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Subtle dark overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Grill Glow Effect - shows when someone is cooking */}
      <AnimatePresence>
        {someoneCooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute z-10 pointer-events-none"
            style={{
              left: '50%',
              top: '58%',
              transform: 'translate(-50%, -50%)',
              width: '500px',
              height: '400px',
            }}
          >
            {/* Outer glow */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,120,0,0.4) 0%, rgba(255,80,0,0.2) 40%, transparent 70%)',
              }}
              animate={{
                opacity: potatoState === POTATO_STATES.CRITICAL ? [0.8, 1, 0.8] : [0.5, 0.7, 0.5],
                scale: potatoState === POTATO_STATES.CRITICAL ? [1, 1.1, 1] : [1, 1.05, 1],
              }}
              transition={{
                duration: potatoState === POTATO_STATES.CRITICAL ? 0.3 : 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            {/* Inner heat shimmer */}
            <motion.div
              className="absolute inset-[20%] rounded-full"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,200,100,0.3) 0%, transparent 60%)',
              }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Content */}
      <div className="relative z-20 h-full flex flex-col p-4 md:p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
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
              👨‍🍳 {members.length}/4 chefs
            </span>
            <button
              onClick={handleLeave}
              className="px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              Leave
            </button>
          </div>
        </header>

        {/* Player Plates - positioned over background plates */}
        {members.map((member) => {
          const plate = memberPlates.get(member.id);
          if (!plate) return null;
          
          const isMe = member.id === userId;
          const isCooking = kitchen?.potatoHolder === member.id && potatoState === POTATO_STATES.HEATING;
          const isCooling = member.state === POTATO_STATES.COOLING;
          const showPotatoOnPlate = !isCooking; // Show potato on plate unless cooking

          return (
            <div
              key={member.id}
              className="absolute z-30"
              style={{
                left: plate.left,
                top: plate.top,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Player Name */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
              >
                <span className={`
                  px-3 py-1 rounded-full text-sm font-medium
                  ${isMe 
                    ? 'bg-orange-500/80 text-white' 
                    : 'bg-black/60 text-white/90'
                  }
                  ${isCooking ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-transparent' : ''}
                `}>
                  {member.nickname || 'Chef'} {isMe && '(you)'}
                </span>
              </motion.div>

              {/* Potato on Plate - always shown in cooling/resting state */}
              {showPotatoOnPlate && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative"
                >
                  <Potato
                    state={POTATO_STATES.COOLING}
                    size="md"
                    showEffects={true}
                  />
                  
                  {/* Click to start cooking (only for your own potato) */}
                  {isMe && !someoneCooking && (
                    <motion.button
                      onClick={handleStartHeating}
                      disabled={isLoading}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 rounded-full transition-all group"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold bg-orange-500 px-2 py-1 rounded-full transition-all">
                        Cook! 🔥
                      </span>
                    </motion.button>
                  )}

                  {/* Resting indicator */}
                  <motion.div
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2"
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <span className="text-blue-300 text-xs">❄️ Resting</span>
                  </motion.div>
                </motion.div>
              )}

              {/* Empty plate indicator when cooking */}
              {isCooking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center"
                >
                  <span className="text-white/40 text-xs">Cooking...</span>
                </motion.div>
              )}
            </div>
          );
        })}

        {/* Center Grill Area - The cooking potato */}
        <div
          className="absolute z-30"
          style={{
            left: GRILL_POSITION.left,
            top: GRILL_POSITION.top,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Potato on Grill (when someone is cooking) */}
          <AnimatePresence>
            {someoneCooking && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: -100 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: -100 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="relative"
              >
                <Potato
                  state={potatoState}
                  size="xxl"
                  elapsedMs={elapsedMs}
                  totalDurationMs={timerDuration || DEFAULT_WORK_DURATION}
                  showEffects={true}
                />

                {/* Who's cooking label */}
                <motion.div
                  className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-white bg-black/60 px-3 py-1 rounded-full text-sm">
                    {isHoldingPotato ? "Your potato!" : `${currentHolder?.nickname}'s potato`}
                  </span>
                </motion.div>

                {/* Timer (positioned above the potato) */}
                {timerStartedAt && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-20 left-1/2 -translate-x-1/2"
                  >
                    <Timer
                      startTime={timerStartedAt}
                      duration={timerDuration}
                      onComplete={() => {}}
                    />
                  </motion.div>
                )}

                {/* Grab button (only for the person cooking, when critical) */}
                {isHoldingPotato && (
                  <motion.div
                    className="absolute -bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {potatoState === POTATO_STATES.CRITICAL ? (
                      <motion.button
                        onClick={handleGrab}
                        disabled={isLoading}
                        className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl shadow-lg"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 0.3, repeat: Infinity }}
                      >
                        🧤 GRAB IT! 🔥
                      </motion.button>
                    ) : (
                      <button
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/60 text-sm rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Duration Selector - shown when no one is cooking */}
          {!someoneCooking && !members.some(m => m.state === POTATO_STATES.COOLING) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <p className="text-white/60 text-sm mb-2">Select cooking time:</p>
              <div className="flex gap-2 bg-black/40 p-2 rounded-xl backdrop-blur-sm">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedDuration(opt.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedDuration === opt.value
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-white/40 text-xs mt-2">Click your potato to start cooking!</p>
            </motion.div>
          )}
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
