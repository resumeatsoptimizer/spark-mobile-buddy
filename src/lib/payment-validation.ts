/**
 * Payment Card Validation Library
 *
 * Provides client-side validation for payment card information
 * SECURITY NOTE: These validations are for UX only.
 * Always validate on the server and never trust client-side data.
 */

export interface CardValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Luhn Algorithm - Validates credit card numbers
 * https://en.wikipedia.org/wiki/Luhn_algorithm
 */
export function validateCardNumber(cardNumber: string): CardValidationResult {
  // Remove spaces and non-digits
  const cleaned = cardNumber.replace(/\s+/g, '').replace(/\D/g, '');

  // Check if empty
  if (!cleaned) {
    return { valid: false, error: 'กรุณากรอกหมายเลขบัตร' };
  }

  // Check length (13-19 digits for most cards)
  if (cleaned.length < 13 || cleaned.length > 19) {
    return { valid: false, error: 'หมายเลขบัตรไม่ถูกต้อง' };
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  const isValid = sum % 10 === 0;

  return {
    valid: isValid,
    error: isValid ? undefined : 'หมายเลขบัตรไม่ถูกต้อง',
  };
}

/**
 * Detect card brand from card number
 */
export function getCardBrand(cardNumber: string): string | null {
  const cleaned = cardNumber.replace(/\s+/g, '').replace(/\D/g, '');

  const patterns = {
    visa: /^4/,
    mastercard: /^(5[1-5]|2[2-7])/,
    amex: /^3[47]/,
    discover: /^6(?:011|5)/,
    jcb: /^35/,
    diners: /^3(?:0[0-5]|[68])/,
  };

  for (const [brand, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleaned)) {
      return brand;
    }
  }

  return null;
}

/**
 * Validate expiration month
 */
export function validateExpirationMonth(month: string): CardValidationResult {
  const cleaned = month.replace(/\D/g, '');

  if (!cleaned) {
    return { valid: false, error: 'กรุณากรอกเดือนหมดอายุ' };
  }

  const monthNum = parseInt(cleaned, 10);

  if (monthNum < 1 || monthNum > 12) {
    return { valid: false, error: 'เดือนไม่ถูกต้อง (01-12)' };
  }

  return { valid: true };
}

/**
 * Validate expiration year
 */
export function validateExpirationYear(year: string): CardValidationResult {
  const cleaned = year.replace(/\D/g, '');

  if (!cleaned) {
    return { valid: false, error: 'กรุณากรอกปีหมดอายุ' };
  }

  // Support both YY and YYYY formats
  let yearNum: number;
  if (cleaned.length === 2) {
    yearNum = 2000 + parseInt(cleaned, 10);
  } else if (cleaned.length === 4) {
    yearNum = parseInt(cleaned, 10);
  } else {
    return { valid: false, error: 'รูปแบบปีไม่ถูกต้อง (YY หรือ YYYY)' };
  }

  const currentYear = new Date().getFullYear();

  if (yearNum < currentYear) {
    return { valid: false, error: 'บัตรหมดอายุแล้ว' };
  }

  if (yearNum > currentYear + 20) {
    return { valid: false, error: 'ปีไม่ถูกต้อง' };
  }

  return { valid: true };
}

/**
 * Validate expiration date (combined month + year)
 */
export function validateExpirationDate(
  month: string,
  year: string
): CardValidationResult {
  const monthResult = validateExpirationMonth(month);
  if (!monthResult.valid) {
    return monthResult;
  }

  const yearResult = validateExpirationYear(year);
  if (!yearResult.valid) {
    return yearResult;
  }

  // Check if card is expired
  const cleanedMonth = month.replace(/\D/g, '');
  const cleanedYear = year.replace(/\D/g, '');

  let yearNum: number;
  if (cleanedYear.length === 2) {
    yearNum = 2000 + parseInt(cleanedYear, 10);
  } else {
    yearNum = parseInt(cleanedYear, 10);
  }

  const monthNum = parseInt(cleanedMonth, 10);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  if (yearNum === currentYear && monthNum < currentMonth) {
    return { valid: false, error: 'บัตรหมดอายุแล้ว' };
  }

  return { valid: true };
}

/**
 * Validate CVV/CVC security code
 */
export function validateCVV(cvv: string, cardBrand?: string): CardValidationResult {
  const cleaned = cvv.replace(/\D/g, '');

  if (!cleaned) {
    return { valid: false, error: 'กรุณากรอกรหัส CVV' };
  }

  // AMEX uses 4 digits, others use 3
  const expectedLength = cardBrand === 'amex' ? 4 : 3;

  if (cleaned.length !== expectedLength) {
    return {
      valid: false,
      error: `รหัส CVV ต้องเป็น ${expectedLength} หลัก`,
    };
  }

  return { valid: true };
}

/**
 * Validate cardholder name
 */
export function validateCardholderName(name: string): CardValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: 'กรุณากรอกชื่อบนบัตร' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'ชื่อสั้นเกินไป' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'ชื่อยาวเกินไป' };
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const validNamePattern = /^[a-zA-Z\s\-'\.]+$/;
  if (!validNamePattern.test(trimmed)) {
    return { valid: false, error: 'ชื่อมีตัวอักษรที่ไม่ถูกต้อง' };
  }

  return { valid: true };
}

/**
 * Validate payment amount
 */
export function validateAmount(amount: number, min = 1, max = 10000000): CardValidationResult {
  if (!amount || amount <= 0) {
    return { valid: false, error: 'จำนวนเงินต้องมากกว่า 0' };
  }

  if (amount < min) {
    return { valid: false, error: `จำนวนเงินต้องอย่างน้อย ฿${min}` };
  }

  if (amount > max) {
    return { valid: false, error: `จำนวนเงินต้องไม่เกิน ฿${max.toLocaleString()}` };
  }

  return { valid: true };
}

/**
 * Format card number with spaces (for display)
 */
export function formatCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s+/g, '').replace(/\D/g, '');
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(' ') : cleaned;
}

/**
 * Mask card number (show only last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s+/g, '').replace(/\D/g, '');
  if (cleaned.length < 4) return cleaned;

  const last4 = cleaned.slice(-4);
  const masked = '*'.repeat(cleaned.length - 4);
  return formatCardNumber(masked + last4);
}

/**
 * Comprehensive card validation
 */
export function validateCard(cardData: {
  number: string;
  name: string;
  expiration_month: string;
  expiration_year: string;
  security_code: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const nameResult = validateCardholderName(cardData.name);
  if (!nameResult.valid && nameResult.error) {
    errors.name = nameResult.error;
  }

  const numberResult = validateCardNumber(cardData.number);
  if (!numberResult.valid && numberResult.error) {
    errors.number = numberResult.error;
  }

  const dateResult = validateExpirationDate(
    cardData.expiration_month,
    cardData.expiration_year
  );
  if (!dateResult.valid && dateResult.error) {
    errors.expiration = dateResult.error;
  }

  const brand = getCardBrand(cardData.number);
  const cvvResult = validateCVV(cardData.security_code, brand || undefined);
  if (!cvvResult.valid && cvvResult.error) {
    errors.security_code = cvvResult.error;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
