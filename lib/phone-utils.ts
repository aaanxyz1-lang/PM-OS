export function normalizePhone(phone: string): string {
  if (!phone) return '';

  let normalized = phone.trim();

  if (normalized.startsWith('+')) {
    normalized = '+' + normalized.replace(/[^\d]/g, '');
  } else {
    normalized = normalized.replace(/[^\d]/g, '');
  }

  if (normalized.startsWith('01') && !normalized.startsWith('+')) {
    normalized = '+88' + normalized;
  }

  return normalized;
}

export function formatPhoneForDisplay(phone: string | null): string {
  if (!phone) return '-';
  return phone;
}

export function isValidPhoneLength(phone: string): boolean {
  const normalized = normalizePhone(phone);

  if (normalized.startsWith('+')) {
    return normalized.length >= 10;
  }

  return normalized.length >= 10;
}
