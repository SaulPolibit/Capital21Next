import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_API_URL = process.env.BRIDGE_API_URL || 'https://api.bridge.xyz/v0';
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY;

// GET - Get transactions or single transaction
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('id');

  if (!BRIDGE_API_KEY) {
    return NextResponse.json(
      { error: 'Bridge API key not configured' },
      { status: 500 }
    );
  }

  try {
    const url = transactionId
      ? `${BRIDGE_API_URL}/transfers/${transactionId}`
      : `${BRIDGE_API_URL}/transfers`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Api-Key': BRIDGE_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch transactions' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create transaction
export async function POST(request: NextRequest) {
  if (!BRIDGE_API_KEY) {
    return NextResponse.json(
      { error: 'Bridge API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { on_behalf_of, source, destination, amount, developer_fee } = body;

    if (!on_behalf_of || !source || !destination || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate idempotency key
    const idempotencyKey = crypto.randomUUID();

    const transactionData: Record<string, unknown> = {
      on_behalf_of,
      source: {
        currency: source.currency,
        payment_rail: source.payment_rail,
        from_address: source.from_address,
      },
      destination: {
        currency: destination.currency,
        payment_rail: destination.payment_rail,
        external_account_id: destination.external_account_id,
      },
      amount: amount.toString(),
    };

    if (developer_fee) {
      transactionData.developer_fee = developer_fee.toString();
    }

    const response = await fetch(`${BRIDGE_API_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Api-Key': BRIDGE_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(transactionData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to create transaction' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
