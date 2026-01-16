// Bridge API Client Service
// Mirrors the Dart BridgeGroup API calls

// ============================================
// RESPONSE TYPES
// ============================================

export interface BridgeCustomerResponse {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string; // For business customers
  email: string;
  status: string;
  type: 'individual' | 'business';
  persona_inquiry_type?: string;
  created_at?: string;
  updated_at?: string;
  has_accepted_terms_of_service: boolean;
  capabilities?: Record<string, unknown>;
}

export interface GetCustomersResponse {
  data: BridgeCustomerResponse[];
  count: number;
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

export interface LinkResponse {
  url: string;
  message?: string;
}

export interface ExternalAccountResponse {
  id: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
  bank_name: string;
  account_owner_name: string;
  active: boolean;
  currency: string;
  account_owner_type: 'individual' | 'business';
  account_type: 'us' | 'iban';
  first_name?: string;
  last_name?: string;
  business_name?: string;
  account: {
    last_4: string;
    routing_number?: string;
    checking_or_savings?: 'checking' | 'savings';
  };
  beneficiary_address_valid?: boolean;
  last_4?: string;
  message?: string;
}

export interface TransactionResponse {
  id: string;
  state: string;
  on_behalf_of: string;
  currency: string;
  amount: string;
  developer_fee?: string;
  created_at: string;
  updated_at: string;
  source: {
    payment_rail: string;
    currency: string;
    from_address?: string;
  };
  source_deposit_instructions?: {
    from_address?: string;
    to_address: string;
    currency: string;
    amount: string;
    payment_rail: string;
  };
  destination: {
    payment_rail: string;
    currency: string;
    external_account_id: string;
    trace_number?: string;
    omad?: string;
    imad?: string;
  };
  receipt?: {
    initial_amount: string;
    subtotal_amount: string;
    exchange_fee: string;
    gas_fee: string;
    developer_fee: string;
    final_amount: string;
  };
  message?: string;
}

// ============================================
// REQUEST TYPES
// ============================================

export interface CreateCustomerRequest {
  type: 'individual' | 'business';
  full_name: string;
  email: string;
  redirect_uri?: string;
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
  amount: number | string;
  developer_fee?: number | string;
  idempotency_key?: string;
  user_id: string;
}

// ============================================
// API CALL RESULT TYPE
// ============================================

export interface ApiCallResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

// ============================================
// BRIDGE API CLIENT
// ============================================

class BridgeApiClient {
  private baseUrl = '/api/bridge';

  // GET Customers
  async getCustomers(email?: string): Promise<ApiCallResult<GetCustomersResponse>> {
    try {
      const url = email
        ? `${this.baseUrl}/customers?email=${encodeURIComponent(email)}`
        : `${this.baseUrl}/customers`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to fetch customers',
          status: response.status,
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching customers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // CREATE Customer
  async createCustomer(request: CreateCustomerRequest): Promise<ApiCallResult<CreateCustomerResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to create customer',
          status: response.status,
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating customer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // GET ToS Link
  async getTosLink(customerId: string): Promise<ApiCallResult<LinkResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/tos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer_id: customerId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to get ToS link',
          status: response.status,
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error getting ToS link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // GET KYC Link
  async getKycLink(customerId: string): Promise<ApiCallResult<LinkResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/kyc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer_id: customerId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to get KYC link',
          status: response.status,
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error getting KYC link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // GET External Accounts for a customer
  async getExternalAccounts(customerId: string): Promise<ApiCallResult<ExternalAccountResponse[]>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/external-accounts?customer_id=${encodeURIComponent(customerId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to fetch external accounts',
          status: response.status,
        };
      }

      return { success: true, data: data.data || data };
    } catch (error) {
      console.error('Error fetching external accounts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // CREATE External Account
  async createExternalAccount(request: CreateExternalAccountRequest): Promise<ApiCallResult<ExternalAccountResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/external-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to create external account',
          status: response.status,
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating external account:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // CREATE Transaction
  async createTransaction(request: CreateTransactionRequest): Promise<ApiCallResult<TransactionResponse>> {
    try {
      const { idempotency_key, ...payload } = request;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (idempotency_key) {
        headers['Idempotency-Key'] = idempotency_key;
      }

      const response = await fetch(`${this.baseUrl}/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload), // user_id is included in payload
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to create transaction',
          status: response.status,
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // GET Single Transaction
  async getTransaction(transactionId: string): Promise<ApiCallResult<TransactionResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/transactions?id=${encodeURIComponent(transactionId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to fetch transaction',
          status: response.status,
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // GET All Transactions
  async getTransactions(): Promise<ApiCallResult<TransactionResponse[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/transactions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to fetch transactions',
          status: response.status,
        };
      }

      return { success: true, data: data.data || data };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
}

// Export singleton instance (similar to Dart's static class members)
export const bridgeApi = new BridgeApiClient();

// Also export the class for testing purposes
export { BridgeApiClient };
