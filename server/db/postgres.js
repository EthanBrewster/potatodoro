import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// PostgreSQL pool singleton
let pool = null;

export async function initPostgres() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/hotpotato';
  
  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected Postgres pool error:', err);
  });

  // Test connection
  const client = await pool.connect();
  console.log('🐘 PostgreSQL connected');
  client.release();

  // Run migrations
  await runMigrations();
  
  return pool;
}

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    await client.query(`
      -- Users table for persistent stats
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        nickname VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_joules INTEGER DEFAULT 0,
        total_potatoes_baked INTEGER DEFAULT 0,
        total_tosses INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Toppings (Badges) table
      CREATE TABLE IF NOT EXISTS toppings (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50),
        requirement_type VARCHAR(50),
        requirement_value INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- User toppings (earned badges)
      CREATE TABLE IF NOT EXISTS user_toppings (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        topping_id INTEGER REFERENCES toppings(id) ON DELETE CASCADE,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, topping_id)
      );

      -- Session history for analytics
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        kitchen_code VARCHAR(20),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        duration_seconds INTEGER,
        was_completed BOOLEAN DEFAULT false,
        joules_earned INTEGER DEFAULT 0
      );

      -- Insert default toppings
      INSERT INTO toppings (name, description, icon, requirement_type, requirement_value)
      VALUES 
        ('First Bake', 'Complete your first potato', '🥇', 'potatoes_baked', 1),
        ('Getting Warmer', 'Bake 5 potatoes', '🔥', 'potatoes_baked', 5),
        ('Hot Stuff', 'Bake 25 potatoes', '☀️', 'potatoes_baked', 25),
        ('Oven Master', 'Bake 100 potatoes', '👨‍🍳', 'potatoes_baked', 100),
        ('Team Player', 'Toss 10 potatoes', '🤝', 'tosses', 10),
        ('Social Butterfly', 'Toss 50 potatoes', '🦋', 'tosses', 50),
        ('Focus Champion', 'Earn 1000 Joules', '⚡', 'joules', 1000),
        ('Energy Master', 'Earn 10000 Joules', '💫', 'joules', 10000),
        ('Streak Starter', 'Get a 3-day streak', '📅', 'streak', 3),
        ('Streak Master', 'Get a 7-day streak', '🗓️', 'streak', 7)
      ON CONFLICT (name) DO NOTHING;
    `);
    
    console.log('📋 Database migrations complete');
  } catch (error) {
    // Log but don't fail - tables might already exist
    if (!error.message.includes('already exists')) {
      console.error('Migration error:', error.message);
    }
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════════
// USER OPERATIONS
// ═══════════════════════════════════════════════════════════════

export async function createOrUpdateUser(id, nickname) {
  const result = await pool.query(`
    INSERT INTO users (id, nickname, last_active)
    VALUES ($1, $2, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      nickname = $2,
      last_active = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `, [id, nickname]);
  
  return result.rows[0];
}

export async function getUserStats(userId) {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

export async function incrementUserStats(userId, { joules = 0, potatoes = 0, tosses = 0 }) {
  const result = await pool.query(`
    UPDATE users SET
      total_joules = total_joules + $2,
      total_potatoes_baked = total_potatoes_baked + $3,
      total_tosses = total_tosses + $4,
      last_active = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `, [userId, joules, potatoes, tosses]);
  
  return result.rows[0];
}

export async function updateStreak(userId, currentStreak, longestStreak) {
  const result = await pool.query(`
    UPDATE users SET
      current_streak = $2,
      longest_streak = GREATEST(longest_streak, $3),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `, [userId, currentStreak, longestStreak]);
  
  return result.rows[0];
}

// ═══════════════════════════════════════════════════════════════
// TOPPING OPERATIONS
// ═══════════════════════════════════════════════════════════════

export async function getUserToppings(userId) {
  const result = await pool.query(`
    SELECT t.*, ut.earned_at
    FROM toppings t
    JOIN user_toppings ut ON t.id = ut.topping_id
    WHERE ut.user_id = $1
    ORDER BY ut.earned_at DESC
  `, [userId]);
  
  return result.rows;
}

export async function awardTopping(userId, toppingName) {
  try {
    const result = await pool.query(`
      INSERT INTO user_toppings (user_id, topping_id)
      SELECT $1, id FROM toppings WHERE name = $2
      ON CONFLICT (user_id, topping_id) DO NOTHING
      RETURNING *
    `, [userId, toppingName]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Award topping error:', error);
    return null;
  }
}

export async function checkAndAwardToppings(userId, stats) {
  const newToppings = [];
  
  // Check potatoes baked achievements
  if (stats.total_potatoes_baked >= 1) {
    const t = await awardTopping(userId, 'First Bake');
    if (t) newToppings.push('First Bake');
  }
  if (stats.total_potatoes_baked >= 5) {
    const t = await awardTopping(userId, 'Getting Warmer');
    if (t) newToppings.push('Getting Warmer');
  }
  if (stats.total_potatoes_baked >= 25) {
    const t = await awardTopping(userId, 'Hot Stuff');
    if (t) newToppings.push('Hot Stuff');
  }
  if (stats.total_potatoes_baked >= 100) {
    const t = await awardTopping(userId, 'Oven Master');
    if (t) newToppings.push('Oven Master');
  }
  
  // Check tosses achievements
  if (stats.total_tosses >= 10) {
    const t = await awardTopping(userId, 'Team Player');
    if (t) newToppings.push('Team Player');
  }
  if (stats.total_tosses >= 50) {
    const t = await awardTopping(userId, 'Social Butterfly');
    if (t) newToppings.push('Social Butterfly');
  }
  
  // Check joules achievements
  if (stats.total_joules >= 1000) {
    const t = await awardTopping(userId, 'Focus Champion');
    if (t) newToppings.push('Focus Champion');
  }
  if (stats.total_joules >= 10000) {
    const t = await awardTopping(userId, 'Energy Master');
    if (t) newToppings.push('Energy Master');
  }
  
  return newToppings;
}

// ═══════════════════════════════════════════════════════════════
// SESSION OPERATIONS
// ═══════════════════════════════════════════════════════════════

export async function createSession(userId, kitchenCode) {
  const result = await pool.query(`
    INSERT INTO sessions (user_id, kitchen_code)
    VALUES ($1, $2)
    RETURNING *
  `, [userId, kitchenCode]);
  
  return result.rows[0];
}

export async function completeSession(sessionId, durationSeconds, joules) {
  const result = await pool.query(`
    UPDATE sessions SET
      ended_at = CURRENT_TIMESTAMP,
      duration_seconds = $2,
      was_completed = true,
      joules_earned = $3
    WHERE id = $1
    RETURNING *
  `, [sessionId, durationSeconds, joules]);
  
  return result.rows[0];
}

export { pool };
