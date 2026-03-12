import { Buffer } from 'buffer';

const bigIntToNumber = (value, decimals = 18) => {
  const big = typeof value === 'bigint' ? value : BigInt(value || 0);
  const base = 10n ** BigInt(decimals);
  const integerPart = big / base;
  const fractionPart = big % base;
  return Number(integerPart) + Number(fractionPart) / Number(base);
};

const chunkArray = (items = [], chunkSize = 50) => {
  if (!Array.isArray(items) || chunkSize <= 0) {
    return [];
  }
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const normalizeDecimals = (value) => {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 38) {
    return parsed;
  }
  return 18;
};

const normalizeOptionalAddress = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

const decimalToRawString = (value, decimals) => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('fee_amount must be a numeric string');
  }
  const [integerPart, fractionalPart = ''] = normalized.split('.');
  const scaledFraction =
    decimals > 0 ? fractionalPart.padEnd(decimals, '0').slice(0, decimals) : '';
  const combined = `${integerPart}${scaledFraction}`;
  return BigInt(combined || '0').toString();
};

const toBufferFromHex = (value, fieldName = 'hex value') => {
  if (!value) {
    return Buffer.alloc(0);
  }
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a hex string`);
  }
  const trimmed = value.startsWith('0x') || value.startsWith('\\x') ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]*$/.test(trimmed)) {
    throw new Error(`${fieldName} must be a hex string`);
  }
  const padded = trimmed.length % 2 === 0 ? trimmed : `0${trimmed}`;
  return Buffer.from(padded, 'hex');
};

const parseInteger = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const ensureNonNegativeInteger = (value, fieldName) => {
  const parsed = parseInteger(value);
  if (parsed === null || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return parsed;
};

export {
  bigIntToNumber,
  chunkArray,
  normalizeDecimals,
  normalizeOptionalAddress,
  decimalToRawString,
  toBufferFromHex,
  parseInteger,
  ensureNonNegativeInteger,
};

