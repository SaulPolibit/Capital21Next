-- Migration: Create tables for Capital21 On/Off Ramp
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LOCAL USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS local_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  uid TEXT UNIQUE,
  created_time TIMESTAMPTZ DEFAULT NOW(),
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'agent')),
  country TEXT,
  wallet_address TEXT,
  disabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_local_users_email ON local_users(email);
CREATE INDEX IF NOT EXISTS idx_local_users_uid ON local_users(uid);

-- ============================================
-- BRIDGE CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bridge_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected', 'under_review')),
  type TEXT NOT NULL CHECK (type IN ('individual', 'business')),
  persona_inquiry_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  has_accepted_terms_of_service BOOLEAN DEFAULT FALSE,
  capabilities TEXT,
  tos_link TEXT,
  kyc_link TEXT,
  bridge_customer_id TEXT UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bridge_customers_email ON bridge_customers(email);
CREATE INDEX IF NOT EXISTS idx_bridge_customers_user_id ON bridge_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_bridge_customers_bridge_id ON bridge_customers(bridge_customer_id);

-- ============================================
-- EXTERNAL ACCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS external_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_account_id TEXT UNIQUE,
  customer_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  bank_name TEXT NOT NULL,
  account_name TEXT,
  account_owner_name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  currency TEXT NOT NULL DEFAULT 'usd',
  account_owner_type TEXT NOT NULL CHECK (account_owner_type IN ('individual', 'business')),
  account_type TEXT NOT NULL CHECK (account_type IN ('us', 'iban', 'other')),
  first_name TEXT,
  last_name TEXT,
  business_name TEXT,
  account_last_4 TEXT,
  account_routing_number TEXT,
  account_checking_or_savings TEXT CHECK (account_checking_or_savings IN ('checking', 'savings')),
  beneficiary_address_valid BOOLEAN,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_external_accounts_customer_id ON external_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_external_accounts_user_id ON external_accounts(user_id);

-- ============================================
-- BRIDGE TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bridge_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bridge_transaction_id TEXT UNIQUE,
  currency TEXT NOT NULL,
  amount TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  destination_payment_rail TEXT,
  destination_currency TEXT,
  destination_external_account_id TEXT,
  client_id TEXT,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN (
    'pending', 'awaiting_funds', 'in_review', 'funds_received',
    'payment_submitted', 'payment_processed', 'completed',
    'returned', 'canceled', 'error'
  )),
  on_behalf_of TEXT,
  client_user_reference TEXT,
  developer_fee TEXT,
  source_amount TEXT,
  source_payment_rail TEXT,
  source_currency TEXT,
  source_from_address TEXT,
  source_to_address TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bridge_transactions_user_id ON bridge_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bridge_transactions_state ON bridge_transactions(state);
CREATE INDEX IF NOT EXISTS idx_bridge_transactions_bridge_id ON bridge_transactions(bridge_transaction_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Simple policies: Allow all CRUD operations for authenticated users

-- Enable RLS on all tables
ALTER TABLE local_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_transactions ENABLE ROW LEVEL SECURITY;

-- LOCAL USERS policies - Full access for authenticated users
CREATE POLICY "Authenticated users can select local_users" ON local_users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert local_users" ON local_users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update local_users" ON local_users
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete local_users" ON local_users
  FOR DELETE USING (auth.role() = 'authenticated');

-- BRIDGE CUSTOMERS policies - Full access for authenticated users
CREATE POLICY "Authenticated users can select bridge_customers" ON bridge_customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert bridge_customers" ON bridge_customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update bridge_customers" ON bridge_customers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete bridge_customers" ON bridge_customers
  FOR DELETE USING (auth.role() = 'authenticated');

-- EXTERNAL ACCOUNTS policies - Full access for authenticated users
CREATE POLICY "Authenticated users can select external_accounts" ON external_accounts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert external_accounts" ON external_accounts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update external_accounts" ON external_accounts
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete external_accounts" ON external_accounts
  FOR DELETE USING (auth.role() = 'authenticated');

-- BRIDGE TRANSACTIONS policies - Full access for authenticated users
CREATE POLICY "Authenticated users can select bridge_transactions" ON bridge_transactions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert bridge_transactions" ON bridge_transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update bridge_transactions" ON bridge_transactions
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete bridge_transactions" ON bridge_transactions
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for each table
CREATE TRIGGER update_local_users_updated_at
  BEFORE UPDATE ON local_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bridge_customers_updated_at
  BEFORE UPDATE ON bridge_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_external_accounts_updated_at
  BEFORE UPDATE ON external_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bridge_transactions_updated_at
  BEFORE UPDATE ON bridge_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
