import { useState } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';

function JoinForm() {
  const [mode, setMode] = useState('initial'); // 'initial', 'create', 'join'
  const [nickname, setNickname] = useState('');
  const [kitchenCodeInput, setKitchenCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { userId, setUser, setKitchen, setError, isConnected } = useGameStore();
  const { createKitchen, joinKitchen } = useSocket();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!nickname.trim() || !isConnected) return;

    setIsLoading(true);
    try {
      const result = await createKitchen(nickname.trim(), userId);
      setUser(result.userId, nickname.trim());
      setKitchen(result.kitchen);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!nickname.trim() || !kitchenCodeInput.trim() || !isConnected) return;

    setIsLoading(true);
    try {
      const code = kitchenCodeInput.trim().toUpperCase();
      const result = await joinKitchen(code, nickname.trim(), userId);
      setUser(result.userId, nickname.trim());
      setKitchen(result.kitchen);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo and Title */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <motion.div 
          className="flex justify-center mb-4"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img 
            src="/potato_01_idle.png" 
            alt="Patatodoro" 
            className="w-32 h-32 object-contain drop-shadow-2xl"
            style={{
              filter: 'drop-shadow(0 0 20px rgba(139, 115, 85, 0.4))',
            }}
          />
        </motion.div>
        <h1 className="font-display text-5xl text-white text-glow mb-2">
          PATATODORO
        </h1>
        <p className="text-white/60 text-lg">
          Pass the heat. Stay focused.
        </p>
      </motion.div>

      {/* Mode Selection / Forms */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6"
      >
        {mode === 'initial' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              disabled={!isConnected}
              className="w-full btn btn-primary text-lg flex items-center justify-center gap-3"
            >
              <span className="text-2xl">🍳</span>
              Create a Kitchen
            </button>
            <button
              onClick={() => setMode('join')}
              disabled={!isConnected}
              className="w-full btn btn-secondary text-lg flex items-center justify-center gap-3"
            >
              <span className="text-2xl">🚪</span>
              Join a Kitchen
            </button>

            <div className="pt-4 border-t border-white/10">
              <p className="text-white/40 text-sm text-center">
                Invite friends to join your Kitchen and pass the potato
                <br />to keep each other focused!
              </p>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <button
              type="button"
              onClick={() => setMode('initial')}
              className="text-white/60 hover:text-white text-sm flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>

            <h2 className="font-display text-2xl text-white">
              Create a Kitchen
            </h2>

            <div>
              <label className="block text-white/60 text-sm mb-2">
                Your Chef Name
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g., Gordon"
                maxLength={20}
                className="w-full px-4 py-3 bg-kitchen-dark rounded-xl text-white placeholder-white/30 border border-white/10 focus:border-orange-500 transition-colors"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!nickname.trim() || isLoading || !isConnected}
              className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    🥔
                  </motion.span>
                  Heating up...
                </span>
              ) : (
                'Start Cooking 🔥'
              )}
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <button
              type="button"
              onClick={() => setMode('initial')}
              className="text-white/60 hover:text-white text-sm flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>

            <h2 className="font-display text-2xl text-white">
              Join a Kitchen
            </h2>

            <div>
              <label className="block text-white/60 text-sm mb-2">
                Your Chef Name
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g., Julia"
                maxLength={20}
                className="w-full px-4 py-3 bg-kitchen-dark rounded-xl text-white placeholder-white/30 border border-white/10 focus:border-orange-500 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">
                Kitchen Code
              </label>
              <input
                type="text"
                value={kitchenCodeInput}
                onChange={(e) => setKitchenCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g., POTATO-A1B2"
                maxLength={15}
                className="w-full px-4 py-3 bg-kitchen-dark rounded-xl text-white placeholder-white/30 border border-white/10 focus:border-orange-500 transition-colors font-mono tracking-wider"
              />
            </div>

            <button
              type="submit"
              disabled={!nickname.trim() || !kitchenCodeInput.trim() || isLoading || !isConnected}
              className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    🥔
                  </motion.span>
                  Joining...
                </span>
              ) : (
                'Enter Kitchen 🚪'
              )}
            </button>
          </form>
        )}
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-white/30 text-sm mt-6"
      >
        A social Pomodoro game powered by peer accountability
      </motion.p>
    </div>
  );
}

export default JoinForm;
