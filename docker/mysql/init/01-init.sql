-- Spring AI Chat Agent - Database Initialization Script
-- This script runs automatically when MySQL container starts for the first time

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS spring_ai_chat
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Use the database
USE spring_ai_chat;

-- Grant privileges to app user
GRANT ALL PRIVILEGES ON spring_ai_chat.* TO 'appuser'@'%';
FLUSH PRIVILEGES;

-- Note: Tables will be created by Drizzle ORM migrations
-- This script only ensures the database exists with proper character set
