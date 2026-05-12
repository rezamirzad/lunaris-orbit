-- 1. Update Trade Ledger with Immutable Initial Risk Parameters
ALTER TABLE trade_ledger 
ADD COLUMN IF NOT EXISTS initial_sl DECIMAL,
ADD COLUMN IF NOT EXISTS initial_tp DECIMAL,
ADD COLUMN IF NOT EXISTS initial_max_profit_potential DECIMAL,
ADD COLUMN IF NOT EXISTS initial_max_loss_potential DECIMAL;

-- 2. Update Trade Suggestions Table for Enhanced Tracking
ALTER TABLE trade_suggestions
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suggestion_type VARCHAR(20) DEFAULT 'NEW_TRADE'; -- 'NEW_TRADE' or 'ACTIVE_ANALYSIS'

-- 3. Create Function for Live Potential Stats
-- This calculates potential profit/loss based on current price vs SL/TP
CREATE OR REPLACE FUNCTION get_potential_stats(
    current_price DECIMAL,
    entry_price DECIMAL,
    sl DECIMAL,
    tp DECIMAL,
    direction VARCHAR(4),
    size DECIMAL
) 
RETURNS TABLE (
    potential_profit DECIMAL,
    potential_loss DECIMAL
) AS $$
BEGIN
    IF direction = 'BUY' THEN
        RETURN QUERY SELECT 
            (tp - current_price) * size as potential_profit,
            (current_price - sl) * size as potential_loss;
    ELSE
        RETURN QUERY SELECT 
            (current_price - tp) * size as potential_profit,
            (sl - current_price) * size as potential_loss;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Create View for Active Trade Analytics
CREATE OR REPLACE VIEW active_trade_analytics AS
SELECT 
    tl.id,
    tl.broker_transaction_id,
    tl.direction,
    tl.size,
    tl.entry_price,
    tl.stop_loss,
    tl.take_profit,
    tl.initial_sl,
    tl.initial_tp,
    tl.initial_max_profit_potential,
    tl.initial_max_loss_potential
FROM trade_ledger tl
WHERE tl.status = 'EXECUTED';
