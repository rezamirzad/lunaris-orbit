-- Migration: Final Cleanup & Fix for trade_suggestions
-- 1. Add missing columns
ALTER TABLE trade_suggestions
ADD COLUMN IF NOT EXISTS entry_price DECIMAL,
ADD COLUMN IF NOT EXISTS raw_ai_response JSONB;

-- 2. Standardize confirmation column (Prefer user_confirmed as used in service)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trade_suggestions' AND column_name='is_user_confirmed') THEN
        -- Move data if needed and drop
        UPDATE trade_suggestions SET user_confirmed = is_user_confirmed WHERE user_confirmed IS NULL;
        ALTER TABLE trade_suggestions DROP COLUMN is_user_confirmed;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
