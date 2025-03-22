-- Initialize MMO Game Database Schema

-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geospatial support

-- Players Table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    avatar_url VARCHAR(255)
);

-- Player Profiles Table
CREATE TABLE IF NOT EXISTS player_profiles (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    display_name VARCHAR(50),
    bio TEXT,
    experience INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    health SMALLINT DEFAULT 100,
    max_health SMALLINT DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player Positions Table (for geospatial tracking)
CREATE TABLE IF NOT EXISTS player_positions (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    position GEOMETRY(POINT, 4326), -- WGS84 coordinate system
    direction DECIMAL(5, 2) DEFAULT 0,
    current_area VARCHAR(50),
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player Inventory Table
CREATE TABLE IF NOT EXISTS player_inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player Inventory Items Table (for individual item tracking)
CREATE TABLE IF NOT EXISTS player_inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL,
    quantity INTEGER DEFAULT 1,
    slot INTEGER,
    is_equipped BOOLEAN DEFAULT FALSE,
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Areas Table (for geospatial regions)
CREATE TABLE IF NOT EXISTS areas (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    area_type VARCHAR(50) NOT NULL,
    boundary GEOMETRY(POLYGON, 4326) NOT NULL,
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flags Table (for territory control)
CREATE TABLE IF NOT EXISTS flags (
    id VARCHAR(50) PRIMARY KEY,
    owner_id UUID REFERENCES players(id) ON DELETE SET NULL,
    name VARCHAR(100),
    position GEOMETRY(POINT, 4326) NOT NULL,
    radius INTEGER DEFAULT 500,
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboards Table
CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    score BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions Table (for authentication)
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(100) PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_valid BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_player_positions_position ON player_positions USING GIST(position);
CREATE INDEX IF NOT EXISTS idx_areas_boundary ON areas USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_flags_position ON flags USING GIST(position);
CREATE INDEX IF NOT EXISTS idx_leaderboards_category_score ON leaderboards(category, score DESC);

-- Insert some default areas for testing
INSERT INTO areas (id, name, area_type, boundary, properties)
VALUES (
    'starting-area',
    'Starting Area',
    'safe-zone',
    ST_GeomFromText('POLYGON((0 0, 0 0.1, 0.1 0.1, 0.1 0, 0 0))', 4326),
    '{"description": "A safe area for new players to start their journey"}'
),
(
    'city-area',
    'Central City',
    'city',
    ST_GeomFromText('POLYGON((0.1 0.1, 0.1 0.2, 0.2 0.2, 0.2 0.1, 0.1 0.1))', 4326),
    '{"description": "A bustling city center with shops and NPCs"}'
),
(
    'wilderness',
    'Wilderness',
    'wilderness',
    ST_GeomFromText('POLYGON((0.2 0, 0.2 0.3, 0.4 0.3, 0.4 0, 0.2 0))', 4326),
    '{"description": "A dangerous area with resources to claim"}'
);

-- Insert system flags
INSERT INTO flags (id, owner_id, name, position, properties)
VALUES (
    'starting-flag',
    NULL,
    'Starting Flag',
    ST_GeomFromText('POINT(0.05 0.05)', 4326),
    '{"type": "system", "description": "Starting point for new players"}'
); 