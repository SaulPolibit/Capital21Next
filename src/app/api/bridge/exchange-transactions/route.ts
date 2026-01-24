import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BRIDGE_API_URL = process.env.NEXT_BRIDGE_API_URL || 'https://api.bridge.xyz/v0';
const BRIDGE_API_KEY = process.env.NEXT_BRIDGE_API_KEY;

// Server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// POST - Create exchange transaction
export async function POST(request: NextRequest) {
  console.log('Exchange Transaction - BRIDGE_API_KEY configured:', !!BRIDGE_API_KEY);
  console.log('Exchange Transaction - BRIDGE_API_URL:', BRIDGE_API_URL);

  if (!BRIDGE_API_KEY) {
    return NextResponse.json(
      { error: 'Bridge API key not configured. Please set NEXT_BRIDGE_API_KEY in .env.local' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const {
      on_behalf_of,
      source,
      destination,
      amount,
      developer_fee,
      user_id,
      exchange_type
    } = body;

    // Validate required fields
    if (!on_behalf_of || !source || !destination || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: on_behalf_of, source, destination, amount' },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Exchange transactions involve currency conversion (crypto <-> fiat)
    // Determine exchange type based on payment rails
    const cryptoRails = ['polygon', 'ethereum', 'arbitrum', 'base', 'stellar'];
    const fiatRails = ['ach', 'wire'];

    const isCryptoToFiat =
      cryptoRails.includes(source.payment_rail) &&
      fiatRails.includes(destination.payment_rail);

    const isFiatToCrypto =
      fiatRails.includes(source.payment_rail) &&
      cryptoRails.includes(destination.payment_rail);

    if (!isCryptoToFiat && !isFiatToCrypto) {
      return NextResponse.json(
        {
          error: 'Invalid exchange transaction. Must be crypto-to-fiat or fiat-to-crypto',
          details: 'Source and destination payment rails must represent a currency exchange'
        },
        { status: 400 }
      );
    }

    // Use idempotency key from header if provided, otherwise generate one
    const idempotencyKey = request.headers.get('Idempotency-Key') || crypto.randomUUID();

    // Exchange transactions don't include from_address in source
    // Instead, they use features.allow_any_from_address to accept crypto from any wallet
    const transactionData: Record<string, unknown> = {
      on_behalf_of,
      source: {
        currency: source.currency,
        payment_rail: source.payment_rail,
      },
      destination: {
        currency: destination.currency,
        payment_rail: destination.payment_rail,
        external_account_id: destination.external_account_id,
      },
      developer_fee: developer_fee ? developer_fee.toString() : '0',
      amount: amount.toString(),
      features: {
        allow_any_from_address: true,
      },
    };

    const headers = {
      'Api-Key': BRIDGE_API_KEY || '',
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    };

    console.log('Creating Exchange Transaction via Bridge API:', `${BRIDGE_API_URL}/transfers`);
    console.log('Exchange Type:', isCryptoToFiat ? 'Crypto to Fiat' : 'Fiat to Crypto');
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
        { error: errorData.message || 'Failed to create exchange transaction', details: errorData },
        { status: response.status }
      );
    }

    const bridgeResponse = await response.json();
    console.log('Bridge API success:', bridgeResponse);

    // Save exchange transaction to Supabase
    try {
      const exchangeTransactionRecord = {
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
        exchange_type: exchange_type || (isCryptoToFiat ? 'crypto_to_fiat' : 'fiat_to_crypto'),
        transaction_type: 'exchange',
      };

      const { data: savedTransaction, error: dbError } = await supabase
        .from('bridge_transactions')
        .insert(exchangeTransactionRecord)
        .select()
        .single();

      if (dbError) {
        console.error('Error saving exchange transaction to Supabase:', dbError);
        // Return Bridge response even if DB save fails
        return NextResponse.json({
          ...bridgeResponse,
          exchange_type: exchange_type || (isCryptoToFiat ? 'crypto_to_fiat' : 'fiat_to_crypto'),
          db_error: dbError.message || 'Exchange transaction created but failed to save to database',
          db_error_details: dbError,
        });
      }

      console.log('Exchange transaction saved to Supabase:', savedTransaction);
      return NextResponse.json({
        ...bridgeResponse,
        exchange_type: exchange_type || (isCryptoToFiat ? 'crypto_to_fiat' : 'fiat_to_crypto'),
        db_record: savedTransaction,
      });
    } catch (dbError) {
      console.error('Error saving exchange transaction to database:', dbError);
      return NextResponse.json({
        ...bridgeResponse,
        exchange_type: exchange_type || (isCryptoToFiat ? 'crypto_to_fiat' : 'fiat_to_crypto'),
        db_error: 'Exchange transaction created but failed to save to database',
      });
    }
  } catch (error) {
    console.error('Error creating exchange transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get exchange transactions by user_id or transaction_id
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('transaction_id');
  const userId = searchParams.get('user_id');

  try {
    let query = supabase
      .from('bridge_transactions')
      .select('*')
      .eq('transaction_type', 'exchange');

    if (transactionId) {
      query = query.eq('bridge_transaction_id', transactionId);
      const { data, error } = await query.single();

      if (error) {
        return NextResponse.json(
          { error: error.message || 'Failed to fetch exchange transaction' },
          { status: 404 }
        );
      }

      return NextResponse.json(data);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch exchange transactions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, count: data?.length || 0 });
  } catch (error) {
    console.error('Error fetching exchange transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
