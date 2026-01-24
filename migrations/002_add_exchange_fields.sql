-- Migration: Add exchange transaction fields to bridge_transactions table
-- Run this in your Supabase SQL Editor

-- Add transaction_type column to distinguish between regular and exchange transactions
ALTER TABLE bridge_transactions
ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'regular' CHECK (transaction_type IN ('regular', 'exchange'));

-- Add exchange_type column to track crypto-to-fiat or fiat-to-crypto
ALTER TABLE bridge_transactions
ADD COLUMN IF NOT EXISTS exchange_type TEXT CHECK (exchange_type IN ('crypto_to_fiat', 'fiat_to_crypto'));

-- Create index for filtering exchange transactions
CREATE INDEX IF NOT EXISTS idx_bridge_transactions_transaction_type ON bridge_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_bridge_transactions_exchange_type ON bridge_transactions(exchange_type);

-- Add comment for documentation
COMMENT ON COLUMN bridge_transactions.transaction_type IS 'Type of transaction: regular (with from_address) or exchange (allow_any_from_address)';
COMMENT ON COLUMN bridge_transactions.exchange_type IS 'Direction of exchange: crypto_to_fiat or fiat_to_crypto (only for exchange transactions)';
