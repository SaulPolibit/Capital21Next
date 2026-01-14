import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_API_URL = process.env.BRIDGE_API_URL || 'https://api.bridge.xyz/v0';
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY;

// POST - Get KYC link for a customer
export async function POST(request: NextRequest) {
  if (!BRIDGE_API_KEY) {
    return NextResponse.json(
      { error: 'Bridge API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { customer_id } = body;

    if (!customer_id) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${BRIDGE_API_URL}/customers/${customer_id}/kyc_link`,
      {
        method: 'POST',
        headers: {
          'Api-Key': BRIDGE_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to get KYC link' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting KYC link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
