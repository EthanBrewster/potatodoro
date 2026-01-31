import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';

function LandingPage() {
  const [kitchenCodeInput, setKitchenCodeInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [nickname, setNickname] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'create' or 'join'
  const [playersOnline, setPlayersOnline] = useState(0);

  const { userId, nickname: storedNickname, setUser, setKitchen, setError, isConnected } = useGameStore();
  const { createKitchen, joinKitchen, socket } = useSocket();

  // Fetch online players count
  useEffect(() => {
    const fetchOnlineCount = async () => {
      try {
        const res = await fetch('/api/online-count');
        const data = await res.json();
        setPlayersOnline(data.count || 0);
      } catch (err) {
        // Silently fail - not critical
      }
    };

    fetchOnlineCount();
    const interval = setInterval(fetchOnlineCount, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  // Use stored nickname if available
  useEffect(() => {
    if (storedNickname) {
      setNickname(storedNickname);
    }
  }, [storedNickname]);

  const handleStartKitchen = () => {
    if (!nickname.trim()) {
      setPendingAction('create');
      setShowNicknameModal(true);
      return;
    }
    performCreate();
  };

  const handleJoinKitchen = () => {
    if (!kitchenCodeInput.trim()) {
      setError('Please enter a Kitchen Code');
      return;
    }
    if (!nickname.trim()) {
      setPendingAction('join');
      setShowNicknameModal(true);
      return;
    }
    performJoin();
  };

  const performCreate = async () => {
    setIsCreating(true);
    try {
      const result = await createKitchen(nickname.trim(), userId);
      setUser(result.userId, nickname.trim());
      setKitchen(result.kitchen);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const performJoin = async () => {
    setIsJoining(true);
    try {
      const code = kitchenCodeInput.trim().toUpperCase();
      const result = await joinKitchen(code, nickname.trim(), userId);
      setUser(result.userId, nickname.trim());
      setKitchen(result.kitchen);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleNicknameSubmit = () => {
    if (!nickname.trim()) return;
    setShowNicknameModal(false);
    if (pendingAction === 'create') {
      performCreate();
    } else if (pendingAction === 'join') {
      performJoin();
    }
    setPendingAction(null);
  };

  return (
    <div 
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        backgroundImage: 'url(/bg_hero_landing.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />

      {/* Players Online Counter */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-white/80 text-sm font-medium">
          {playersOnline} {playersOnline === 1 ? 'Player' : 'Players'} Online
        </span>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        {/* Hero Card - Drop Animation */}
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            type: 'spring',
            stiffness: 100,
            damping: 15,
            delay: 0.2,
          }}
          className="w-full max-w-lg"
        >
          {/* Glassmorphism Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
            {/* Logo/Potato */}
            <motion.div
              className="flex justify-center mb-4"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img 
                src="/potato_01_idle.png" 
                alt="Hot Potato" 
                className="w-40 h-40 object-contain drop-shadow-2xl"
                style={{
                  filter: 'drop-shadow(0 0 30px rgba(255, 165, 0, 0.5))',
                }}
              />
            </motion.div>

            {/* Title */}
            <h1 
              className="text-center text-5xl md:text-6xl font-black mb-2 tracking-tight"
              style={{
                fontFamily: "'Dela Gothic One', cursive",
                background: 'linear-gradient(135deg, #FF6B35 0%, #F7C59F 50%, #FF6B35 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 40px rgba(255, 107, 53, 0.3)',
              }}
            >
              HOT POTATO
            </h1>
            <p className="text-center text-white/60 mb-8 text-lg">
              Pass the heat. Stay focused. Together.
            </p>

            {/* Join Kitchen Section */}
            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={kitchenCodeInput}
                  onChange={(e) => setKitchenCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter Kitchen Code"
                  maxLength={15}
                  className="flex-1 px-4 py-3 bg-black/30 rounded-xl text-white placeholder-white/40 border border-white/10 focus:border-orange-500/50 focus:bg-black/40 transition-all font-mono tracking-wider text-center text-lg"
                />
                <motion.button
                  onClick={handleJoinKitchen}
                  disabled={isJoining || !isConnected}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all disabled:opacity-50"
                >
                  {isJoining ? '...' : 'Join'}
                </motion.button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-white/40 text-sm">or</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              {/* Start New Kitchen Button with Pulse */}
              <motion.button
                onClick={handleStartKitchen}
                disabled={isCreating || !isConnected}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full py-4 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white font-bold text-lg rounded-xl shadow-lg transition-all disabled:opacity-50 overflow-hidden"
              >
                {/* Pulsing glow effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 rounded-xl"
                  animate={{
                    opacity: [0, 0.5, 0],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isCreating ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        🥔
                      </motion.span>
                      Creating Kitchen...
                    </>
                  ) : (
                    <>
                      🍳 Start New Kitchen
                    </>
                  )}
                </span>
              </motion.button>
            </div>

            {/* Connection Status */}
            {!isConnected && (
              <div className="text-center text-yellow-400/80 text-sm mb-4">
                ⚠️ Connecting to server...
              </div>
            )}
          </div>
        </motion.div>

{/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-white/30 text-sm mt-12 text-center"
        >
          A social Pomodoro game built with 🔥 by the Patatodoro team
        </motion.p>
      </div>

      {/* Nickname Modal */}
      {showNicknameModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowNicknameModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-xl mb-4 text-center">
              What's your chef name?
            </h3>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g., Chef Gordon"
              maxLength={20}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNicknameSubmit()}
              className="w-full px-4 py-3 bg-black/30 rounded-xl text-white placeholder-white/40 border border-white/10 focus:border-orange-500/50 transition-all text-center mb-4"
            />
            <button
              onClick={handleNicknameSubmit}
              disabled={!nickname.trim()}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl disabled:opacity-50 transition-all"
            >
              Let's Cook! 👨‍🍳
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default LandingPage;
