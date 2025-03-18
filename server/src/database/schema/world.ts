import { pgTable, serial, varchar, timestamp, integer, json, boolean, text, foreignKey } from 'drizzle-orm/pg-core';
import { EntityType } from 'shared';
import { players } from './players';

/**
 * Game world chunks table schema
 */
export const worldChunks = pgTable('world_chunks', {
  id: serial('id').primaryKey(),
  chunkId: varchar('chunk_id', { length: 20 }).notNull().unique(),
  data: json('data').default({}),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  entityCount: integer('entity_count').default(0).notNull()
});

/**
 * Game entities table schema
 */
export const entities = pgTable('entities', {
  id: serial('id').primaryKey(),
  entityId: varchar('entity_id', { length: 36 }).notNull().unique(),
  type: varchar('type', { length: 20 }).$type<EntityType>().notNull(),
  
  // Entity position
  positionX: integer('position_x').default(0).notNull(),
  positionY: integer('position_y').default(0).notNull(),
  chunkId: varchar('chunk_id', { length: 20 }).notNull(),
  
  // Entity owner
  ownerId: integer('owner_id').references(() => players.id),
  
  // Entity data
  name: varchar('name', { length: 100 }),
  properties: json('properties').default({}),
  
  // Entity state
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  despawnAt: timestamp('despawn_at')
});

/**
 * Game world events table schema
 */
export const worldEvents = pgTable('world_events', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 50 }).notNull(),
  chunkId: varchar('chunk_id', { length: 20 }).references(() => worldChunks.chunkId),
  data: json('data').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  scheduledFor: timestamp('scheduled_for'),
  processedAt: timestamp('processed_at'),
  isProcessed: boolean('is_processed').default(false).notNull()
});

/**
 * Game instances table schema
 */
export const gameInstances = pgTable('game_instances', {
  id: serial('id').primaryKey(),
  instanceId: varchar('instance_id', { length: 36 }).notNull().unique(),
  name: varchar('name', { length: 100 }),
  type: varchar('type', { length: 50 }).notNull(),
  maxPlayers: integer('max_players').default(100).notNull(),
  currentPlayers: integer('current_players').default(0).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  data: json('data').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Game instance players table schema
 */
export const instancePlayers = pgTable('instance_players', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => gameInstances.id, { onDelete: 'cascade' }),
  playerId: integer('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at')
}); 