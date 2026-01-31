# 🥔🔥 Patatodoro – Social Pomodoro Game

A real-time, multiplayer Pomodoro timer that gamifies focus sessions. Pass the "hot potato" to teammates to earn breaks and stay accountable!

![Patatodoro](https://img.shields.io/badge/Status-MVP-orange)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🎮 How It Works

1. **Create a Kitchen** – Start a squad (2-5 players)
2. **Grab the Potato** – Begin your focus session (15-60 mins)
3. **Heat It Up** – Watch your potato glow as time passes
4. **Toss It!** – When time's up, pass the potato to a teammate
5. **Cool Down** – Take a well-earned break while they work

## 🧪 Learning Science

| Mechanic | Principle | Effect |
|----------|-----------|--------|
| Heating Potato | Zeigarnik Effect | Unfinished tasks create drive to complete |
| Social Toss | Peer Accountability | Reduces procrastination knowing others wait |
| Cool Down | Cognitive Load Theory | Prevents burnout, aids memory consolidation |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker (for Redis & PostgreSQL)

### Local Development

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd patatodoro

# 2. Start databases
docker-compose up -d redis postgres

# 3. Install dependencies
npm install

# 4. Create environment file
cp .env.example .env
# Edit .env with your settings

# 5. Start development server
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### Environment Variables

```env
PORT=3000
NODE_ENV=development
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hotpotato
CORS_ORIGIN=http://localhost:5173
```

## 🏗️ Project Structure

```
patatodoro/
├── server/
│   ├── index.js          # Express server entry
│   ├── db/
│   │   ├── redis.js      # Redis connection & helpers
│   │   └── postgres.js   # PostgreSQL connection & migrations
│   └── socket/
│       └── handlers.js   # Socket.io event handlers
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Potato.jsx      # Animated potato with heat states
│   │   │   ├── Kitchen.jsx     # Main game view
│   │   │   ├── Timer.jsx       # Thermometer timer
│   │   │   ├── Members.jsx     # Squad member list
│   │   │   └── JoinForm.jsx    # Create/join kitchen
│   │   ├── hooks/
│   │   │   └── useSocket.js    # Socket.io hook
│   │   └── store/
│   │       └── gameStore.js    # Zustand state management
│   └── tailwind.config.js
├── Dockerfile
├── docker-compose.yml
└── railway.toml
```

## 🎨 Potato States

| State | Visual | Description |
|-------|--------|-------------|
| `IDLE` | 🥔 Cool brown | Ready to grab |
| `HEATING` | 🟠 Orange glow | Focus session active |
| `CRITICAL` | 🔴 Red + shake | Time's up! Must toss |
| `COOLING` | 🔵 Blue + butter | On break |

## 📡 Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `create_kitchen` | `{ nickname, userId? }` | Create new kitchen |
| `join_kitchen` | `{ kitchenCode, nickname, userId? }` | Join existing kitchen |
| `start_heating` | `{ duration? }` | Start focus session |
| `toss_potato` | `{ targetUserId? }` | Toss to teammate |
| `send_reaction` | `{ targetUserId, reactionType }` | Send 🧊 or 🧂 |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `heating_started` | `{ holderId, startTime, duration, kitchen }` | Session began |
| `potato_critical` | `{ holderId, kitchen }` | Timer at 90%+ |
| `potato_tossed` | `{ fromUserId, toUserId, kitchen }` | Potato transferred |
| `reaction_received` | `{ fromUserId, toUserId, reactionType }` | Got a reaction |

## 🚂 Deploy to Railway

1. Create a new Railway project
2. Add **Redis** and **PostgreSQL** plugins
3. Connect your GitHub repo
4. Set environment variables:
   - `CORS_ORIGIN` = Your Railway app URL
5. Deploy!

Railway will automatically:
- Build using the Dockerfile
- Connect to Redis/Postgres plugins
- Start the server

## 🗺️ Roadmap

- [x] **MVP**: 2-player lobby with timer passing
- [ ] **V2**: Visual heating states, cool-down mini-game
- [ ] **V3**: Learning science prompts (interleaving suggestions)
- [ ] **V4**: Global leaderboards, topping collections

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT © 2026

---

**Built with** 🔥 Node.js • Socket.io • React • Tailwind CSS • Framer Motion • Redis • PostgreSQL
