import { supabaseDb as supabase } from '@/lib/supabase';
import type {
  LocalUser,
  BridgeCustomer,
  ExternalAccount,
  BridgeTransaction,
} from '@/types';

// ============================================
// LOCAL USERS
// ============================================

export async function getUserByEmail(email: string): Promise<LocalUser | null> {
  const { data, error } = await supabase
    .from('local_users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }

  return data;
}

export async function getUserById(id: string): Promise<LocalUser | null> {
  const { data, error } = await supabase
    .from('local_users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching user by id:', error);
    return null;
  }

  return data;
}

export async function createUser(user: Omit<LocalUser, 'id' | 'created_time' | 'updated_at'>): Promise<LocalUser | null> {
  const { data, error } = await supabase
    .from('local_users')
    .insert(user)
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return data;
}

export async function updateUser(id: string, updates: Partial<LocalUser>): Promise<LocalUser | null> {
  const { data, error } = await supabase
    .from('local_users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    throw error;
  }

  return data;
}

// ============================================
// BRIDGE CUSTOMERS
// ============================================

export async function getCustomersByUserId(userId: string): Promise<BridgeCustomer[]> {
  const { data, error } = await supabase
    .from('bridge_customers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }

  return data || [];
}

export async function getCustomerByEmail(email: string): Promise<BridgeCustomer | null> {
  const { data, error } = await supabase
    .from('bridge_customers')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching customer by email:', error);
    return null;
  }

  return data;
}

export async function getCustomerById(id: string): Promise<BridgeCustomer | null> {
  const { data, error } = await supabase
    .from('bridge_customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching customer by id:', error);
    return null;
  }

  return data;
}

export async function createCustomer(customer: Omit<BridgeCustomer, 'id' | 'created_at' | 'updated_at'>): Promise<BridgeCustomer | null> {
  const { data, error } = await supabase
    .from('bridge_customers')
    .insert(customer)
    .select()
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    throw error;
  }

  return data;
}

export async function updateCustomer(id: string, updates: Partial<BridgeCustomer>): Promise<BridgeCustomer | null> {
  const { data, error } = await supabase
    .from('bridge_customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer:', error);
    throw error;
  }

  return data;
}

// ============================================
// EXTERNAL ACCOUNTS
// ============================================

export async function getExternalAccountsByCustomerId(customerId: string): Promise<ExternalAccount[]> {
  const { data, error } = await supabase
    .from('external_accounts')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching external accounts:', error);
    return [];
  }

  return data || [];
}

export async function getExternalAccountsByUserId(userId: string): Promise<ExternalAccount[]> {
  const { data, error } = await supabase
    .from('external_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching external accounts:', error);
    return [];
  }

  return data || [];
}

export async function getExternalAccountById(id: string): Promise<ExternalAccount | null> {
  const { data, error } = await supabase
    .from('external_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching external account by id:', error);
    return null;
  }

  return data;
}

export async function createExternalAccount(account: Omit<ExternalAccount, 'id' | 'created_at' | 'updated_at'>): Promise<ExternalAccount | null> {
  const { data, error } = await supabase
    .from('external_accounts')
    .insert(account)
    .select()
    .single();

  if (error) {
    console.error('Error creating external account:', error);
    throw error;
  }

  return data;
}

export async function updateExternalAccount(id: string, updates: Partial<ExternalAccount>): Promise<ExternalAccount | null> {
  const { data, error } = await supabase
    .from('external_accounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating external account:', error);
    throw error;
  }

  return data;
}

export async function deleteExternalAccount(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('external_accounts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting external account:', error);
    throw error;
  }

  return true;
}

// ============================================
// BRIDGE TRANSACTIONS
// ============================================

export async function getTransactionsByUserId(userId: string): Promise<BridgeTransaction[]> {
  const { data, error } = await supabase
    .from('bridge_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return data || [];
}

export async function getTransactionById(id: string): Promise<BridgeTransaction | null> {
  const { data, error } = await supabase
    .from('bridge_transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching transaction by id:', error);
    return null;
  }

  return data;
}

export async function createTransaction(transaction: Omit<BridgeTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<BridgeTransaction | null> {
  const { data, error } = await supabase
    .from('bridge_transactions')
    .insert(transaction)
    .select()
    .single();

  if (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }

  return data;
}

export async function updateTransaction(id: string, updates: Partial<BridgeTransaction>): Promise<BridgeTransaction | null> {
  const { data, error } = await supabase
    .from('bridge_transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }

  return data;
}
