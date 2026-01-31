import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useGameStore from './store/gameStore';
import { useSocket } from './hooks/useSocket';
import JoinForm from './components/JoinForm';
import Kitchen from './components/Kitchen';
import Toast from './components/Toast';

function App() {
  const { kitchenCode, isConnected, error, clearError, toppings } = useGameStore();
  const { getKitchenState } = useSocket();

  // Sync kitchen state on reconnection
  useEffect(() => {
    if (isConnected && kitchenCode) {
      getKitchenState().catch(console.error);
    }
  }, [isConnected, kitchenCode, getKitchenState]);

  return (
    <div className="h-full min-h-screen kitchen-bg overflow-hidden">
      {/* Background ambiance */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      </div>

      {/* Connection indicator */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <div 
          className={`w-2 h-2 rounded-full transition-colors ${
            isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
          }`} 
        />
        <span className="text-xs text-white/50 font-mono">
          {isConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>

      {/* Main content */}
      <AnimatePresence mode="wait">
        {kitchenCode ? (
          <motion.div
            key="kitchen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <Kitchen />
          </motion.div>
        ) : (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full flex items-center justify-center p-4"
          >
            <JoinForm />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <Toast 
            message={error} 
            type="error" 
            onClose={clearError} 
          />
        )}
      </AnimatePresence>

      {/* New topping notification */}
      <AnimatePresence>
        {toppings.length > 0 && toppings.slice(-1).map((topping, i) => (
          <Toast
            key={`topping-${i}`}
            message={`🎉 New Topping Unlocked: ${topping}!`}
            type="success"
            duration={5000}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default App;
