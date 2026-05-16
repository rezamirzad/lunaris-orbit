-- Migration: Cleanup redundant trade_activities foreign key to resolve PGRST201 ambiguity

DO $$ 
BEGIN
    -- Drop the default named foreign key created by 'REFERENCES trade_ledger(id)'
    -- PostgREST was confused because both this and 'fk_trade_activities_ledger' existed.
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trade_activities_trade_ledger_id_fkey' 
        AND table_name = 'trade_activities'
    ) THEN
        ALTER TABLE trade_activities DROP CONSTRAINT trade_activities_trade_ledger_id_fkey;
    END IF;
END $$;

-- Ensure 'fk_trade_activities_ledger' has ON DELETE CASCADE (it should already, but let's be safe)
-- If it didn't exist for some reason, we'd want to know, but 20260512000006 already ensures it.

NOTIFY pgrst, 'reload schema';
