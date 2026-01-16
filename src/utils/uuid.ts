/**
 * Generate a random UUID v4
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * Where x is any hex digit and y is one of 8, 9, a, or b
 */
export function getUUID(): string {
  // Use native crypto.randomUUID if available (modern browsers and Node.js 19+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback implementation matching the Dart version
  const chars = '0123456789abcdef';
  const yValues = ['8', '9', 'a', 'b'];

  const randomHex = (length: number): string => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
  };

  // Generate parts of UUID
  const part1 = randomHex(8);
  const part2 = randomHex(4);
  const part3 = '4' + randomHex(3); // Version 4 UUID starts with '4'
  const part4 = yValues[Math.floor(Math.random() * 4)] + randomHex(3); // Variant bits
  const part5 = randomHex(12);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

/**
 * Generate a UUID without dashes (compact format)
 */
export function getCompactUUID(): string {
  return getUUID().replace(/-/g, '');
}

/**
 * Validate if a string is a valid UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(uuid);
}
