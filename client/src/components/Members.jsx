import { motion } from 'framer-motion';
import useGameStore, { POTATO_STATES } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { getStatusIcon } from '../utils/potatoAssets';

const STATE_CONFIGS = {
  [POTATO_STATES.IDLE]: {
    label: 'Waiting',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-500/30',
  },
  [POTATO_STATES.HEATING]: {
    label: 'Heating',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/50',
  },
  [POTATO_STATES.CRITICAL]: {
    label: 'Critical!',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
  },
  [POTATO_STATES.COOLING]: {
    label: 'Cooling',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
  },
  OFFLINE: {
    label: 'Offline',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
  },
};

function Members({ onSelectTarget, canSelectTarget = false }) {
  const { userId, members, kitchen } = useGameStore();
  const { sendReaction } = useSocket();

  // Sort members: current user first, then by state
  const sortedMembers = [...members].sort((a, b) => {
    if (a.id === userId) return -1;
    if (b.id === userId) return 1;
    
    const stateOrder = {
      [POTATO_STATES.HEATING]: 0,
      [POTATO_STATES.CRITICAL]: 1,
      [POTATO_STATES.COOLING]: 2,
      [POTATO_STATES.IDLE]: 3,
      OFFLINE: 4,
    };
    
    return (stateOrder[a.state] || 5) - (stateOrder[b.state] || 5);
  });

  const handleReaction = async (targetId, type) => {
    await sendReaction(targetId, type);
  };

  return (
    <div className="glass rounded-2xl p-4 h-full flex flex-col bg-black/40 backdrop-blur-md">
      <h2 className="font-display text-lg text-white mb-4 flex items-center gap-2">
        <span>👨‍🍳</span>
        Kitchen Squad
      </h2>

      <div className="flex-1 overflow-y-auto space-y-3">
        {sortedMembers.map((member, index) => {
          const isMe = member.id === userId;
          const state = member.state || POTATO_STATES.IDLE;
          const config = STATE_CONFIGS[state] || STATE_CONFIGS[POTATO_STATES.IDLE];
          const isHoldingPotato = kitchen?.potatoHolder === member.id;
          const canTarget = canSelectTarget && !isMe && state !== POTATO_STATES.HEATING;
          const statusIcon = getStatusIcon(state);

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                p-3 rounded-xl border transition-all
                ${config.bgColor} ${config.borderColor}
                ${isMe ? 'ring-2 ring-orange-500/50' : ''}
                ${canTarget ? 'cursor-pointer hover:bg-white/10' : ''}
                ${state === POTATO_STATES.CRITICAL ? 'animate-pulse' : ''}
              `}
              onClick={() => canTarget && onSelectTarget?.(member.id)}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-xl
                  ${config.bgColor} border ${config.borderColor}
                `}>
                  {isHoldingPotato ? (
                    <img 
                      src="/potato_01_idle.png" 
                      alt="" 
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <span className="font-bold text-white/80">
                      {member.nickname?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">
                      {member.nickname || 'Anonymous'}
                    </span>
                    {isMe && (
                      <span className="text-xs text-white/40">(you)</span>
                    )}
                  </div>
                  <div className={`text-xs flex items-center gap-1.5 ${config.color}`}>
                    <img 
                      src={statusIcon} 
                      alt="" 
                      className="w-4 h-4 object-contain"
                    />
                    <span>{config.label}</span>
                  </div>
                </div>

                {/* Reaction buttons (for heating members) */}
                {!isMe && state === POTATO_STATES.HEATING && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReaction(member.id, 'ice');
                      }}
                      className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                      title="Send encouragement"
                    >
                      🧊
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReaction(member.id, 'salt');
                      }}
                      className="p-2 hover:bg-orange-500/20 rounded-lg transition-colors"
                      title="Send a nudge"
                    >
                      🧂
                    </button>
                  </div>
                )}

                {/* Target indicator */}
                {canTarget && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-orange-400"
                  >
                    🎯
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Empty state */}
        {members.length === 1 && (
          <div className="text-center py-8 text-white/40">
            <div className="text-3xl mb-2">👻</div>
            <p className="text-sm">It's just you here...</p>
            <p className="text-xs mt-1">Share the kitchen code to invite friends!</p>
          </div>
        )}
      </div>

      {/* Invite hint */}
      {members.length < 5 && (
        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <p className="text-white/40 text-xs">
            {5 - members.length} spots available
          </p>
        </div>
      )}
    </div>
  );
}

export default Members;
