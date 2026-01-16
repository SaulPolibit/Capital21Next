import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_API_URL = process.env.NEXT_BRIDGE_API_URL || 'https://api.bridge.xyz/v0';
const BRIDGE_API_KEY = process.env.NEXT_BRIDGE_API_KEY;

// GET - Get external accounts for a customer
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customer_id');

  if (!BRIDGE_API_KEY) {
    return NextResponse.json(
      { error: 'Bridge API key not configured' },
      { status: 500 }
    );
  }

  if (!customerId) {
    return NextResponse.json(
      { error: 'Customer ID is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${BRIDGE_API_URL}/customers/${customerId}/external_accounts`,
      {
        method: 'GET',
        headers: {
          'Api-Key': BRIDGE_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch external accounts' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching external accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create external account
export async function POST(request: NextRequest) {
  if (!BRIDGE_API_KEY) {
    return NextResponse.json(
      { error: 'Bridge API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const {
      customer_id,
      account_owner_name,
      account_type,
      account_number,
      routing_number,
      checking_or_savings,
      currency,
      bank_name,
      account_owner_type,
      first_name,
      last_name,
      business_name,
      address,
    } = body;

    if (!customer_id || !account_owner_name || !account_type || !account_number) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate idempotency key
    const idempotencyKey = crypto.randomUUID();

    const accountData: Record<string, unknown> = {
      currency,
      bank_name,
      account_owner_name,
      account_owner_type,
      account: {
        account_number,
      },
    };

    if (account_type === 'us') {
      accountData.account = {
        ...accountData.account as object,
        routing_number,
        account_type: checking_or_savings,
      };
    }

    if (account_owner_type === 'individual') {
      accountData.first_name = first_name;
      accountData.last_name = last_name;
    } else {
      accountData.business_name = business_name;
    }

    if (address) {
      accountData.address = address;
    }

    const response = await fetch(
      `${BRIDGE_API_URL}/customers/${customer_id}/external_accounts`,
      {
        method: 'POST',
        headers: {
          'Api-Key': BRIDGE_API_KEY,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(accountData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to create external account' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating external account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
