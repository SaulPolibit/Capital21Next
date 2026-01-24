// User types
export interface LocalUser {
  id: string;
  email: string;
  display_name: string;
  photo_url?: string;
  uid: string;
  created_time?: string;
  phone_number?: string;
  role: 'root' | 'admin' | 'customer';
  country?: string;
  wallet_address?: string;
  disabled: boolean;
}

// Bridge Customer types
export interface BridgeCustomer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: CustomerStatus;
  type: 'individual' | 'business';
  persona_inquiry_type?: string;
  created_at?: string;
  updated_at?: string;
  has_accepted_terms_of_service: boolean;
  capabilities?: string;
  tos_link?: string;
  kyc_link?: string;
  bridge_customer_id: string;
  user_id: string;
}

export type CustomerStatus =
  | 'pending'
  | 'active'
  | 'inactive'
  | 'rejected'
  | 'under_review';

// Bridge Transaction types
export interface BridgeTransaction {
  id: string;
  bridge_transaction_id: string;
  currency: string;
  amount: string;
  created_at?: string;
  updated_at?: string;
  destination_payment_rail?: string;
  destination_currency?: string;
  destination_external_account_id?: string;
  client_id?: string;
  state: TransactionState;
  on_behalf_of?: string;
  client_user_reference?: string;
  developer_fee?: string;
  source_amount?: string;
  source_payment_rail?: string;
  source_currency?: string;
  source_from_address?: string;
  source_to_address?: string;
  user_id: string;
  transaction_type?: 'regular' | 'exchange';
  exchange_type?: 'crypto_to_fiat' | 'fiat_to_crypto';
}

export type TransactionState =
  | 'pending'
  | 'awaiting_funds'
  | 'in_review'
  | 'funds_received'
  | 'payment_submitted'
  | 'payment_processed'
  | 'completed'
  | 'returned'
  | 'canceled'
  | 'error';

// External Account types
export interface ExternalAccount {
  id: string;
  external_account_id: string;
  customer_id: string;
  created_at?: string;
  updated_at?: string;
  bank_name: string;
  account_name?: string;
  account_owner_name: string;
  active: boolean;
  currency: string;
  account_owner_type: 'individual' | 'business';
  account_type: 'us' | 'iban' | 'other';
  first_name?: string;
  last_name?: string;
  business_name?: string;
  account_last_4?: string;
  account_routing_number?: string;
  account_checking_or_savings?: 'checking' | 'savings';
  beneficiary_address_valid?: boolean;
  status: 'active' | 'inactive' | 'pending';
  user_id: string;
}

// Auth context types
export interface AuthContextType {
  currentUser: { email: string } | null;
  userData: LocalUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LocalUser | null>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isRoot: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
}

// API Request/Response types
export interface CreateCustomerRequest {
  type: 'individual' | 'business';
  full_name: string;
  email: string;
  redirect_uri?: string;
}

export interface CreateCustomerResponse {
  customer_id: string;
  full_name: string;
  email: string;
  type: string;
  kyc_link: string;
  tos_link: string;
  kyc_status: string;
  tos_status: string;
  persona_inquiry_type?: string;
}

export interface CreateExternalAccountRequest {
  customer_id: string;
  account_owner_name: string;
  account_type: 'us' | 'iban';
  account_number: string;
  routing_number?: string;
  checking_or_savings?: 'checking' | 'savings';
  currency: string;
  bank_name: string;
  account_owner_type: 'individual' | 'business';
  first_name?: string;
  last_name?: string;
  business_name?: string;
  address?: {
    street_line_1: string;
    city: string;
    state?: string;
    country: string;
    postal_code: string;
  };
}

export interface CreateTransactionRequest {
  on_behalf_of: string;
  source: {
    currency: string;
    payment_rail: string;
    from_address?: string;
  };
  destination: {
    currency: string;
    payment_rail: string;
    external_account_id: string;
  };
  amount: number;
  developer_fee?: number;
}

// Role options
export const ROLE_OPTIONS = [
  { value: 'root', label: 'Root' },
  { value: 'admin', label: 'Administrador' },
  { value: 'customer', label: 'Cliente' },
] as const;

// Account type options
export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'business', label: 'Empresa' },
] as const;

// Transaction state labels (Spanish)
export const TRANSACTION_STATE_LABELS: Record<TransactionState, string> = {
  pending: 'Pendiente',
  awaiting_funds: 'Esperando Fondos',
  in_review: 'En Revisión',
  funds_received: 'Fondos Recibidos',
  payment_submitted: 'Pago Enviado',
  payment_processed: 'Pago Procesado',
  completed: 'Completado',
  returned: 'Devuelto',
  canceled: 'Cancelado',
  error: 'Error',
};

// Customer status labels (Spanish)
export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  inactive: 'Inactivo',
  rejected: 'Rechazado',
  under_review: 'En Revisión',
};
