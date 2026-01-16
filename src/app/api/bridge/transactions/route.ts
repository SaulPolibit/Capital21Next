import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BRIDGE_API_URL = process.env.NEXT_BRIDGE_API_URL || 'https://api.bridge.xyz/v0';
const BRIDGE_API_KEY = process.env.NEXT_BRIDGE_API_KEY;

// Server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  console.log('BRIDGE_API_KEY configured:', !!BRIDGE_API_KEY);
  console.log('BRIDGE_API_URL:', BRIDGE_API_URL);

  if (!BRIDGE_API_KEY) {
    return NextResponse.json(
      { error: 'Bridge API key not configured. Please set NEXT_BRIDGE_API_KEY in .env.local' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { on_behalf_of, source, destination, amount, developer_fee, user_id } = body;

    if (!on_behalf_of || !source || !destination || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Use idempotency key from header if provided, otherwise generate one
    const idempotencyKey = request.headers.get('Idempotency-Key') || crypto.randomUUID();

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

    const headers = {
      'Api-Key': BRIDGE_API_KEY || '',
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    };

    console.log('Sending to Bridge API:', `${BRIDGE_API_URL}/transfers`);
    console.log('Headers:', {
      'Api-Key': BRIDGE_API_KEY ? `${BRIDGE_API_KEY.substring(0, 8)}...` : 'NOT SET',
      'Idempotency-Key': idempotencyKey,
    });
    console.log('Payload:', JSON.stringify(transactionData, null, 2));

    const response = await fetch(`${BRIDGE_API_URL}/transfers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(transactionData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Bridge API error:', response.status, errorData);
      return NextResponse.json(
        { error: errorData.message || 'Failed to create transaction', details: errorData },
        { status: response.status }
      );
    }

    const bridgeResponse = await response.json();
    console.log('Bridge API success:', bridgeResponse);

    // Save transaction to Supabase
    try {
      const transactionRecord = {
        bridge_transaction_id: bridgeResponse.id,
        currency: bridgeResponse.currency || source.currency,
        amount: bridgeResponse.amount || amount.toString(),
        state: bridgeResponse.state || 'pending',
        on_behalf_of: bridgeResponse.on_behalf_of || on_behalf_of,
        developer_fee: bridgeResponse.developer_fee || developer_fee?.toString(),
        source_payment_rail: bridgeResponse.source?.payment_rail || source.payment_rail,
        source_currency: bridgeResponse.source?.currency || source.currency,
        source_from_address: bridgeResponse.source?.from_address || source.from_address,
        source_to_address: bridgeResponse.source_deposit_instructions?.to_address,
        source_amount: bridgeResponse.source_deposit_instructions?.amount,
        destination_payment_rail: bridgeResponse.destination?.payment_rail || destination.payment_rail,
        destination_currency: bridgeResponse.destination?.currency || destination.currency,
        destination_external_account_id: bridgeResponse.destination?.external_account_id || destination.external_account_id,
        user_id: user_id,
      };

      const { data: savedTransaction, error: dbError } = await supabase
        .from('bridge_transactions')
        .insert(transactionRecord)
        .select()
        .single();

      if (dbError) {
        console.error('Error saving transaction to Supabase:', dbError);
        // Return Bridge response even if DB save fails
        return NextResponse.json({
          ...bridgeResponse,
          db_error: dbError.message || 'Transaction created but failed to save to database',
          db_error_details: dbError,
        });
      }

      console.log('Transaction saved to Supabase:', savedTransaction);
      return NextResponse.json({
        ...bridgeResponse,
        db_record: savedTransaction,
      });
    } catch (dbError) {
      console.error('Error saving to database:', dbError);
      return NextResponse.json({
        ...bridgeResponse,
        db_error: 'Transaction created but failed to save to database',
      });
    }
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
