-- 1. Create Trade Suggestions Table for On-Demand AI Consulting
CREATE TABLE IF NOT EXISTS trade_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair VARCHAR(20) NOT NULL, -- e.g., 'EURUSD'
    action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL', 'HOLD')),
    amount DECIMAL NOT NULL,
    stop_loss DECIMAL,
    take_profit DECIMAL,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    is_user_confirmed BOOLEAN DEFAULT FALSE,
    reasoning TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup of recent suggestions
CREATE INDEX IF NOT EXISTS idx_trade_suggestions_created_at ON trade_suggestions(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_trade_suggestions_updated_at
BEFORE UPDATE ON trade_suggestions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
