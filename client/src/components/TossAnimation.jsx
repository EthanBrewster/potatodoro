import { motion } from 'framer-motion';

function TossAnimation({ target, potatoAsset = '/potato_04_critical.png' }) {
  // Arc trajectory: y = -x^2 (parabolic arc)
  // We'll animate from center-left to center-right with an arc
  const arcKeyframes = {
    // x goes from -200 to +300 (left to right)
    x: [-200, -100, 0, 100, 200, 300],
    // y follows inverted parabola for arc (negative = up)
    // Peak at middle of animation
    y: [50, -100, -180, -180, -100, 50],
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
    >
      {/* Flying potato with arc trajectory */}
      <motion.div
        className="absolute"
        style={{ 
          left: '50%', 
          top: '50%',
          marginLeft: '-60px',
          marginTop: '-60px',
        }}
        initial={{ 
          x: arcKeyframes.x[0], 
          y: arcKeyframes.y[0], 
          scale: 1, 
          rotate: 0,
          opacity: 1,
        }}
        animate={{
          x: arcKeyframes.x,
          y: arcKeyframes.y,
          scale: [1, 1.3, 1.4, 1.3, 1.1, 0.9],
          rotate: [0, -45, -90, -180, -270, -360],
          opacity: [1, 1, 1, 1, 1, 0],
        }}
        transition={{
          duration: 1.2,
          ease: [0.25, 0.1, 0.25, 1], // Custom easing for natural arc
          times: [0, 0.2, 0.4, 0.6, 0.8, 1],
        }}
      >
        <img 
          src={potatoAsset}
          alt="Flying Potato"
          className="w-32 h-32 object-contain"
          style={{
            filter: 'drop-shadow(0 0 30px rgba(255, 69, 0, 0.8)) drop-shadow(0 0 60px rgba(255, 165, 0, 0.5))',
          }}
        />
        
        {/* Motion blur trail */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 0.2, repeat: 6 }}
        >
          <img 
            src={potatoAsset}
            alt=""
            className="w-32 h-32 object-contain blur-sm opacity-50"
          />
        </motion.div>
      </motion.div>

      {/* Fire trail particles following the arc */}
      {[...Array(20)].map((_, i) => {
        const progress = i / 20;
        const trailX = arcKeyframes.x[0] + (arcKeyframes.x[5] - arcKeyframes.x[0]) * progress * 0.8;
        const trailY = -Math.pow((progress - 0.5) * 2, 2) * 180 + 50; // Parabola
        
        return (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              left: '50%',
              top: '50%',
              background: `radial-gradient(circle, ${i % 3 === 0 ? '#FF6B35' : i % 3 === 1 ? '#FFA500' : '#FFD700'}, transparent)`,
            }}
            initial={{ 
              x: trailX - 6, 
              y: trailY - 6,
              scale: 0, 
              opacity: 0 
            }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.6,
              delay: 0.1 + i * 0.04,
              ease: 'easeOut',
            }}
          />
        );
      })}

      {/* Radial burst at throw point */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        return (
          <motion.div
            key={`burst-${i}`}
            className="absolute w-4 h-4 rounded-full bg-orange-500"
            style={{
              left: 'calc(50% - 200px)',
              top: '50%',
            }}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              x: Math.cos(angle) * 80,
              y: Math.sin(angle) * 80,
            }}
            transition={{
              duration: 0.5,
              delay: i * 0.02,
              ease: 'easeOut',
            }}
          />
        );
      })}

      {/* Target indicator */}
      {target && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.3 }}
          className="absolute right-1/4 top-1/2 -translate-y-1/2 text-center"
        >
          <motion.div
            className="text-6xl mb-3"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.3, delay: 1 }}
          >
            📥
          </motion.div>
          <motion.p 
            className="text-white font-display text-2xl bg-black/50 px-4 py-2 rounded-xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            Tossed to {target.nickname}!
          </motion.p>
        </motion.div>
      )}

      {/* TOSS! text effect */}
      <motion.div
        className="absolute left-1/4 top-1/3 font-display text-7xl font-bold"
        style={{
          textShadow: '0 0 20px rgba(255, 107, 53, 0.8), 0 0 40px rgba(255, 69, 0, 0.6)',
          WebkitTextStroke: '2px rgba(255, 69, 0, 0.5)',
        }}
        initial={{ opacity: 0, scale: 0, rotate: -20 }}
        animate={{ 
          opacity: [0, 1, 1, 0], 
          scale: [0.5, 1.3, 1.2, 0.8], 
          rotate: [-20, 5, 0, 10],
          color: ['#FF6B35', '#FFA500', '#FFD700', '#FF4500'],
        }}
        transition={{ 
          duration: 0.8,
          times: [0, 0.3, 0.6, 1],
        }}
      >
        TOSS!
      </motion.div>
    </motion.div>
  );
}

export default TossAnimation;
