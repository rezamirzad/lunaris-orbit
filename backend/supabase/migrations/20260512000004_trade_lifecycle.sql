-- 1. Finalize Trade Ledger with Initial Risk Benchmarks
ALTER TABLE trade_ledger 
ADD COLUMN IF NOT EXISTS initial_sl DECIMAL,
ADD COLUMN IF NOT EXISTS initial_tp DECIMAL,
ADD COLUMN IF NOT EXISTS initial_max_profit_potential DECIMAL,
ADD COLUMN IF NOT EXISTS initial_max_loss_potential DECIMAL;

-- 2. Ensure suggestions support auditing
ALTER TABLE trade_suggestions
ADD COLUMN IF NOT EXISTS request_id UUID UNIQUE,
ADD COLUMN IF NOT EXISTS user_notes TEXT;

-- 3. Live Risk View (Calculated on the fly for UI)
CREATE OR REPLACE VIEW live_trade_stats AS
SELECT 
    tl.*,
    ms.ohlcv->>'close' as current_price_at_snapshot
FROM trade_ledger tl
JOIN market_snapshots ms ON tl.market_snapshot_id = ms.id;
