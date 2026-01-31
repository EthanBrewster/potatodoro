import { useEffect } from 'react';
import { motion } from 'framer-motion';

function Toast({ 
  message, 
  type = 'info', // 'info', 'error', 'success'
  duration = 4000,
  onClose 
}) {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeConfig = {
    info: {
      bg: 'bg-blue-500/90',
      icon: 'ℹ️',
    },
    error: {
      bg: 'bg-red-500/90',
      icon: '⚠️',
    },
    success: {
      bg: 'bg-green-500/90',
      icon: '✅',
    },
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 50, x: '-50%' }}
      className={`
        fixed bottom-6 left-1/2 z-50
        px-6 py-3 rounded-xl
        ${config.bg} backdrop-blur-sm
        text-white font-medium
        shadow-lg
        flex items-center gap-3
      `}
    >
      <span className="text-xl">{config.icon}</span>
      <span>{message}</span>
      {onClose && (
        <button 
          onClick={onClose}
          className="ml-2 text-white/60 hover:text-white transition-colors"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
}

export default Toast;
