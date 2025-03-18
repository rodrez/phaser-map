import { pgTable, serial, varchar, timestamp, integer, json, boolean, text } from 'drizzle-orm/pg-core';
import { PlayerClass } from 'shared';

/**
 * Players table schema
 */
export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  // Player authentication info
  uuid: varchar('uuid', { length: 36 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 50 }),
  email: varchar('email', { length: 100 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  
  // Player game data
  class: varchar('class', { length: 20 }).$type<PlayerClass>(),
  level: integer('level').default(1).notNull(),
  experience: integer('experience').default(0).notNull(),
  
  // Player position
  positionX: integer('position_x').default(0).notNull(),
  positionY: integer('position_y').default(0).notNull(),
  currentChunk: varchar('current_chunk', { length: 20 }),
  
  // Player stats as JSON
  stats: json('stats').default({}),
  skills: json('skills').default({}),
  
  // Player status
  isOnline: boolean('is_online').default(false),
  lastSeen: timestamp('last_seen').defaultNow(),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Player inventory table schema
 */
export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 100 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  data: json('data').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Player equipment table schema
 */
export const equipment = pgTable('equipment', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  slot: varchar('slot', { length: 20 }).notNull(),
  itemId: varchar('item_id', { length: 100 }).notNull(),
  data: json('data').default({}),
  equippedAt: timestamp('equipped_at').defaultNow().notNull()
});

/**
 * Player sessions table schema
 */
export const playerSessions = pgTable('player_sessions', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  ip: varchar('ip', { length: 50 }),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow().notNull()
}); 