-- Ensure trade_activities table exists and has a proper foreign key relationship to trade_ledger
-- This migration fixes potential PGRST200 errors by explicitly asserting the relationship

DO $$ 
BEGIN
    -- 1. Create the table if it doesn't exist (fallback)
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trade_activities') THEN
        CREATE TABLE trade_activities (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            trade_ledger_id UUID NOT NULL,
            activity_type VARCHAR(20) NOT NULL,
            price DECIMAL,
            stop_loss DECIMAL,
            take_profit DECIMAL,
            pnl DECIMAL,
            broker_response JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;

    -- 2. Ensure the foreign key exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_trade_activities_ledger' 
        AND table_name = 'trade_activities'
    ) THEN
        ALTER TABLE trade_activities 
        ADD CONSTRAINT fk_trade_activities_ledger 
        FOREIGN KEY (trade_ledger_id) 
        REFERENCES trade_ledger(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Re-create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_activities_ledger_id ON trade_activities(trade_ledger_id);
CREATE INDEX IF NOT EXISTS idx_trade_activities_created_at ON trade_activities(created_at DESC);

-- 4. Notify PostgREST to reload schema cache (Supabase specific)
NOTIFY pgrst, 'reload schema';
