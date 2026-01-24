// Test the exchange transaction payload structure
const testPayload = {
  on_behalf_of: "test-customer-id",
  source: {
    currency: "usdc",
    payment_rail: "arbitrum"
  },
  destination: {
    currency: "usd",
    payment_rail: "ach",
    external_account_id: "test-account-id"
  },
  developer_fee: "0.50",
  amount: "100.00",
  features: {
    allow_any_from_address: true
  }
};

console.log("Exchange Transaction Payload:");
console.log(JSON.stringify(testPayload, null, 2));

// Verify structure
const requiredFields = [
  'on_behalf_of',
  'source',
  'destination',
  'developer_fee',
  'amount',
  'features'
];

const sourceFields = ['currency', 'payment_rail'];
const destinationFields = ['currency', 'payment_rail', 'external_account_id'];

console.log("\n✓ Verification:");
requiredFields.forEach(field => {
  const exists = testPayload[field] !== undefined;
  console.log(`  ${field}: ${exists ? '✓' : '✗'}`);
});

console.log("\n✓ Source fields:");
sourceFields.forEach(field => {
  const exists = testPayload.source[field] !== undefined;
  console.log(`  ${field}: ${exists ? '✓' : '✗'}`);
});

console.log("\n✓ Destination fields:");
destinationFields.forEach(field => {
  const exists = testPayload.destination[field] !== undefined;
  console.log(`  ${field}: ${exists ? '✓' : '✗'}`);
});

console.log("\n✓ Features:");
console.log(`  allow_any_from_address: ${testPayload.features.allow_any_from_address ? '✓' : '✗'}`);

console.log("\n✓ No from_address in source: " + (testPayload.source.from_address === undefined ? '✓' : '✗'));
