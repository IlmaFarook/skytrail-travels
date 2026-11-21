import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js';

// phone numbers are kept in international form, like +94771234567
export function phoneValid(value) {
  return isValidPhoneNumber(value);
}

// +94771234567 becomes +94 77 123 4567 for showing on screen
export function formatPhone(value) {
  return parsePhoneNumberFromString(value)?.formatInternational() || value;
}
