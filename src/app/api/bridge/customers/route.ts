import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_API_URL = process.env.BRIDGE_API_URL || 'https://api.bridge.xyz/v0';
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY;

// GET - Get customers
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!BRIDGE_API_KEY) {
    return NextResponse.json(
      { error: 'Bridge API key not configured' },
      { status: 500 }
    );
  }

  try {
    const url = email
      ? `${BRIDGE_API_URL}/customers?email=${encodeURIComponent(email)}`
      : `${BRIDGE_API_URL}/customers`;

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
        { error: errorData.message || 'Failed to fetch customers' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create customer
export async function POST(request: NextRequest) {
  if (!BRIDGE_API_KEY) {
    return NextResponse.json(
      { error: 'Bridge API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { type, full_name, email, redirect_uri } = body;

    // Generate idempotency key
    const idempotencyKey = crypto.randomUUID();

    const customerData: Record<string, unknown> = {
      type,
      email,
    };

    if (type === 'individual') {
      const nameParts = full_name.split(' ');
      customerData.first_name = nameParts[0] || '';
      customerData.last_name = nameParts.slice(1).join(' ') || '';
    } else {
      customerData.name = full_name;
    }

    const response = await fetch(`${BRIDGE_API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Api-Key': BRIDGE_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(customerData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to create customer' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
