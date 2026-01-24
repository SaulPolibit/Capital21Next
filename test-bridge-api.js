// Test Bridge API credentials
const BRIDGE_API_URL = 'https://api.sandbox.bridge.xyz/v0';
const BRIDGE_API_KEY = 'sk-test-5e5acb2a9813f1c13e573b6f856e97c0';

async function testBridgeAPI() {
  console.log('Testing Bridge API connection...\n');

  // Test 1: Get transfers (to verify API key)
  console.log('1. Testing GET /transfers (list transfers to verify API key)');
  try {
    const response = await fetch(`${BRIDGE_API_URL}/transfers`, {
      method: 'GET',
      headers: {
        'Api-Key': BRIDGE_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ API Key is valid!\n');
    } else if (response.status === 401) {
      console.log('❌ API Key is invalid or unauthorized\n');
      return;
    } else {
      console.log('⚠️  Unexpected response\n');
    }
  } catch (error) {
    console.error('Error:', error.message);
    return;
  }

  // Test 2: Try to create a transfer with the same payload from your app
  console.log('2. Testing POST /transfers (create transfer with your payload)');
  const transferPayload = {
    on_behalf_of: '9d5bc1a7-c713-416c-a88c-b8ff371fc71c',
    source: {
      currency: 'usdc',
      payment_rail: 'arbitrum',
      from_address: '0x1234567890123456789012345678901234567890', // dummy address for testing
    },
    destination: {
      currency: 'usd',
      payment_rail: 'ach',
      external_account_id: '4ff1f4e3-533b-45f8-a28d-86427680e6ca',
    },
    amount: '1.02',
    developer_fee: '0.02',
  };

  try {
    const response = await fetch(`${BRIDGE_API_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Api-Key': BRIDGE_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': `test-${Date.now()}`,
      },
      body: JSON.stringify(transferPayload),
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Transfer created successfully!\n');
    } else if (response.status === 401) {
      console.log('❌ Unauthorized - Check API key permissions or on_behalf_of client ID\n');
    } else if (response.status === 404) {
      console.log('❌ Not found - Check external_account_id or endpoint\n');
    } else {
      console.log('❌ Transfer creation failed\n');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBridgeAPI();
