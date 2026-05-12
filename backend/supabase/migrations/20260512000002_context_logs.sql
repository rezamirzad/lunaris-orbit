-- 1. Create Context Logs Table for AI reasoning auditability
CREATE TABLE IF NOT EXISTS context_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(20) NOT NULL,
    context JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup of recent contexts
CREATE INDEX IF NOT EXISTS idx_context_logs_symbol_created_at ON context_logs(symbol, created_at DESC);
