import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useGameStore from './store/gameStore';
import { useSocket } from './hooks/useSocket';
import LandingPage from './components/LandingPage';
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
    <div className="h-full min-h-screen overflow-hidden">
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
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <LandingPage />
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
