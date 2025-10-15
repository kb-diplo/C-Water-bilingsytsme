-- Add InitialReading columns to clients table
-- This migration adds the missing columns that are required for initial reading functionality

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS initial_reading DECIMAL(10,2) DEFAULT 0.0 NOT NULL,
ADD COLUMN IF NOT EXISTS initial_reading_date TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS initial_reading_set_by_user_id INTEGER NULL;

-- Add foreign key constraint for initial_reading_set_by_user_id
ALTER TABLE clients 
ADD CONSTRAINT IF NOT EXISTS fk_clients_initial_reading_set_by_user 
FOREIGN KEY (initial_reading_set_by_user_id) REFERENCES users(id);

-- Add comment for documentation
COMMENT ON COLUMN clients.initial_reading IS 'Initial meter reading set by admin (defaults to 0)';
COMMENT ON COLUMN clients.initial_reading_date IS 'When initial reading was set';
COMMENT ON COLUMN clients.initial_reading_set_by_user_id IS 'User ID who set the initial reading';
