-- SentinelLab PostgreSQL Initialization
-- This script runs on first container creation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create application schema
CREATE SCHEMA IF NOT EXISTS sentinel;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE sentinel_lab TO sentinel;
GRANT ALL PRIVILEGES ON SCHEMA sentinel TO sentinel;
GRANT ALL PRIVILEGES ON SCHEMA public TO sentinel;

-- Set default search path
ALTER DATABASE sentinel_lab SET search_path TO public, sentinel;
