-- Migration: Full Trade Lifecycle Audit Links

-- 1. Update trade_suggestions
ALTER TABLE trade_suggestions
ADD COLUMN IF NOT EXISTS context_log_id UUID REFERENCES context_logs(id),
ADD COLUMN IF NOT EXISTS trade_ledger_id UUID REFERENCES trade_ledger(id), -- For ACTIVE_ANALYSIS linking to the trade
ADD COLUMN IF NOT EXISTS decision_status VARCHAR(20) DEFAULT 'PENDING' CHECK (decision_status IN ('PENDING', 'ACCEPTED', 'REJECTED'));

-- Migrate old user_confirmed boolean to decision_status
UPDATE trade_suggestions SET decision_status = 'ACCEPTED' WHERE user_confirmed = TRUE;
UPDATE trade_suggestions SET decision_status = 'REJECTED' WHERE user_confirmed = FALSE AND decision_status = 'PENDING';

-- 2. Update trade_ledger
ALTER TABLE trade_ledger
ADD COLUMN IF NOT EXISTS trade_suggestion_id UUID REFERENCES trade_suggestions(id),
ADD COLUMN IF NOT EXISTS context_log_id UUID REFERENCES context_logs(id);

-- Create indexes for the new relationships
CREATE INDEX IF NOT EXISTS idx_trade_suggestions_context_log_id ON trade_suggestions(context_log_id);
CREATE INDEX IF NOT EXISTS idx_trade_suggestions_trade_ledger_id ON trade_suggestions(trade_ledger_id);
CREATE INDEX IF NOT EXISTS idx_trade_ledger_trade_suggestion_id ON trade_ledger(trade_suggestion_id);
CREATE INDEX IF NOT EXISTS idx_trade_ledger_context_log_id ON trade_ledger(context_log_id);

NOTIFY pgrst, 'reload schema';
