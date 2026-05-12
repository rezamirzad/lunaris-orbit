-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
-- Note: TimescaleDB is available on Supabase, but must be enabled via the dashboard or specific plan.
-- If not available, standard tables will work, but for high-frequency data, hypertables are preferred.
-- CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- 1. Market Snapshots Table
-- Optimized for high-frequency append-only time-series data.
CREATE TABLE IF NOT EXISTS market_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    symbol VARCHAR(20) NOT NULL,
    ohlcv JSONB NOT NULL, -- { open, high, low, close, volume }
    indicators JSONB,     -- { rsi, macd, atr, etc. }
    market_context JSONB   -- { spread, volatility, liquidity }
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_market_snapshots_symbol_timestamp 
ON market_snapshots (symbol, timestamp DESC);

-- If TimescaleDB is enabled, convert to hypertable:
-- SELECT create_hypertable('market_snapshots', 'timestamp');

-- 2. Trade Ledger Table
-- Logs all orders, Capital.com transaction IDs, and broker responses.
CREATE TABLE IF NOT EXISTS trade_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_snapshot_id UUID NOT NULL REFERENCES market_snapshots(id),
    broker_transaction_id VARCHAR(100) UNIQUE,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('BUY', 'SELL')),
    size DECIMAL NOT NULL,
    entry_price DECIMAL,
    stop_loss DECIMAL,
    take_profit DECIMAL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, EXECUTED, CLOSED, CANCELLED, REJECTED
    broker_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_ledger_market_snapshot_id ON trade_ledger(market_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_trade_ledger_broker_transaction_id ON trade_ledger(broker_transaction_id);

-- 3. AI Logs Table
-- Stores raw JSON reasoning from Gemini API and pgvector embeddings.
CREATE TABLE IF NOT EXISTS ai_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_ledger_id UUID REFERENCES trade_ledger(id),
    market_snapshot_id UUID REFERENCES market_snapshots(id),
    reasoning JSONB NOT NULL,
    embedding vector(1536), -- Assuming 1536 dimensions for Gemini/OpenAI embeddings
    confidence_score DECIMAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_trade_ledger_id ON ai_logs(trade_ledger_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_market_snapshot_id ON ai_logs(market_snapshot_id);

-- HNSW Index for vector similarity search
-- Note: Requires pgvector extension to be active.
CREATE INDEX IF NOT EXISTS idx_ai_logs_embedding_hnsw ON ai_logs 
USING hnsw (embedding vector_cosine_ops);

-- Trigger to update 'updated_at' on trade_ledger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trade_ledger_updated_at
BEFORE UPDATE ON trade_ledger
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
