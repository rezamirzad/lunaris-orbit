-- Create Trade Activities table for granular history
CREATE TABLE IF NOT EXISTS trade_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_ledger_id UUID NOT NULL REFERENCES trade_ledger(id),
    activity_type VARCHAR(20) NOT NULL, -- ENTRY, MODIFICATION, CLOSURE
    price DECIMAL,
    stop_loss DECIMAL,
    take_profit DECIMAL,
    pnl DECIMAL,
    broker_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for grouping activities by trade
CREATE INDEX IF NOT EXISTS idx_trade_activities_ledger_id ON trade_activities(trade_ledger_id);
CREATE INDEX IF NOT EXISTS idx_trade_activities_created_at ON trade_activities(created_at DESC);
