#!/usr/bin/env node

/**
 * Database management script
 * 
 * Usage:
 *   node db-manager.js [command]
 * 
 * Commands:
 *   reset     - Reset the database (delete all data)
 *   seed      - Seed the database with sample data
 *   backup    - Backup the database
 *   restore   - Restore the database from backup
 *   stats     - Show database statistics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = process.env.DB_PATH || path.join(dataDir, 'game.db');
const backupDir = path.join(dataDir, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Initialize database connection
const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Command handlers
const commands = {
  // Reset the database (delete all data)
  reset: () => {
    console.log('Resetting database...');
    
    // Drop tables
    db.exec('DROP TABLE IF EXISTS room_users');
    db.exec('DROP TABLE IF EXISTS messages');
    db.exec('DROP TABLE IF EXISTS rooms');
    
    // Recreate tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        metadata TEXT
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS room_users (
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        PRIMARY KEY (room_id, user_id),
        FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
      )
    `);
    
    console.log('Database reset successfully');
  },
  
  // Seed the database with sample data
  seed: () => {
    console.log('Seeding database...');
    
    // Create sample rooms
    const rooms = [
      { id: 'lobby', name: 'Main Lobby', created_at: new Date().toISOString() },
      { id: 'game-room-1', name: 'Game Room 1', created_at: new Date().toISOString() },
      { id: 'chat-room', name: 'Chat Room', created_at: new Date().toISOString() }
    ];
    
    // Insert rooms
    const roomStmt = db.prepare(`
      INSERT OR REPLACE INTO rooms (id, name, created_at, metadata)
      VALUES (?, ?, ?, ?)
    `);
    
    rooms.forEach(room => {
      roomStmt.run(room.id, room.name, room.created_at, null);
    });
    
    // Create sample messages
    const messages = [
      { 
        id: '1', 
        room_id: 'lobby', 
        sender: 'system', 
        message: 'Welcome to the lobby!', 
        timestamp: new Date().toISOString() 
      },
      { 
        id: '2', 
        room_id: 'game-room-1', 
        sender: 'system', 
        message: 'Game room created', 
        timestamp: new Date().toISOString() 
      },
      { 
        id: '3', 
        room_id: 'chat-room', 
        sender: 'system', 
        message: 'Chat room created', 
        timestamp: new Date().toISOString() 
      }
    ];
    
    // Insert messages
    const messageStmt = db.prepare(`
      INSERT OR REPLACE INTO messages (id, room_id, sender, message, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    messages.forEach(msg => {
      messageStmt.run(msg.id, msg.room_id, msg.sender, msg.message, msg.timestamp);
    });
    
    console.log('Database seeded successfully');
  },
  
  // Backup the database
  backup: () => {
    console.log('Backing up database...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `game-${timestamp}.db`);
    
    try {
      // Create a backup using fs.copyFileSync instead of db.backup
      fs.copyFileSync(dbPath, backupPath);
      console.log(`Database backed up to ${backupPath}`);
    } catch (err) {
      console.error('Backup failed:', err);
    }
  },
  
  // Restore the database from backup
  restore: () => {
    console.log('Available backups:');
    
    // List available backups
    const backups = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.db'))
      .sort()
      .reverse();
    
    if (backups.length === 0) {
      console.log('No backups found');
      return;
    }
    
    backups.forEach((backup, index) => {
      const stats = fs.statSync(path.join(backupDir, backup));
      console.log(`${index + 1}. ${backup} (${stats.size} bytes)`);
    });
    
    console.log('\nTo restore, run:');
    console.log(`cp "${path.join(backupDir, backups[0])}" "${dbPath}"`);
  },
  
  // Show database statistics
  stats: () => {
    console.log('Database statistics:');
    
    // Get table counts
    const tables = ['rooms', 'messages', 'room_users'];
    
    tables.forEach(table => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
      console.log(`- ${table}: ${count} rows`);
    });
    
    // Get database file size
    const stats = fs.statSync(dbPath);
    console.log(`- Database size: ${stats.size} bytes`);
  }
};

// Parse command line arguments
const command = process.argv[2];

if (!command || !commands[command]) {
  console.log('Available commands:');
  Object.keys(commands).forEach(cmd => {
    console.log(`- ${cmd}`);
  });
} else {
  commands[command]();
}

// Close database connection
db.close(); 