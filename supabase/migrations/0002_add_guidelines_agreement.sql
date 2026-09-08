-- Add guidelines agreement columns to registrations table
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS agreed_to_guidelines boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS agreed_at timestamptz DEFAULT NULL;

-- Add index for tracking agreed registrations
CREATE INDEX IF NOT EXISTS registrations_agreed_to_guidelines_idx 
ON registrations(agreed_to_guidelines);
