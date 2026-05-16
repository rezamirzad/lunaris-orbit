-- Add raw_ai_response to trade_suggestions for full audit trail
ALTER TABLE trade_suggestions 
ADD COLUMN IF NOT EXISTS raw_ai_response JSONB;

-- Ensure is_user_confirmed exists (aliased to user_confirmed in some migrations)
-- We'll use user_confirmed as the primary one since it was in 20260512000003_advanced_audit.sql
-- But 20260512000001_trade_suggestions.sql had is_user_confirmed.
-- Let's stick to user_confirmed and update code if needed.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trade_suggestions' AND column_name='user_confirmed') THEN
        ALTER TABLE trade_suggestions ADD COLUMN user_confirmed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
