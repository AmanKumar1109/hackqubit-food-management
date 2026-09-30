/**
 * Generates a unique, secure 16-character alphanumeric Special ID
 * Format example: "HQ8F92A7C3B1E4D6" or formatted "HQ26-A8F9-2C7B-3D1E"
 */
export const generateSpecialId = (length = 16, prefix = 'HQ') => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars like 0/O, 1/I
  const randomLength = Math.max(0, length - prefix.length);
  
  let result = prefix;
  for (let i = 0; i < randomLength; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars.charAt(randomIndex);
  }
  
  return result;
};

/**
 * Formats a 16-character alphanumeric ID into easily readable chunks
 * Example: "HQ8F92A7C3B1E4D6" -> "HQ8F-92A7-C3B1-E4D6"
 */
export const formatSpecialId = (id) => {
  if (!id || typeof id !== 'string') return '';
  const clean = id.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length <= 4) return clean;
  return clean.match(/.{1,4}/g)?.join('-') || clean;
};
