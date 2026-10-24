import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

export interface RegistrationDetails {
  fullName: string;
  birthDate: string;
  documentNumber: string;
  phone: string;
}

export function validateRegistrationDetails(value: unknown): RegistrationDetails {
  const data = (value || {}) as Record<string, unknown>;
  const field = (key: string) => typeof data[key] === 'string' ? (data[key] as string).trim() : '';
  const fullName = field('fullName'), birthDate = field('birthDate');
  const documentNumber = field('documentNumber'), phone = field('phone');
  if (fullName.length > 150 || fullName.split(/\s+/).filter(Boolean).length < 2) throw new Error('Ingresa tu nombre completo y apellido.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new Error('Ingresa una fecha de nacimiento válida.');
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const today = new Date();
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== birthDate || birth > today || birth.getUTCFullYear() < today.getUTCFullYear() - 120) throw new Error('Ingresa una fecha de nacimiento válida.');
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.toISOString().slice(5, 10) < birthDate.slice(5)) age--;
  if (age < 14) throw new Error('La edad mínima para este torneo es de 14 años.');
  if (!/^[\p{L}\p{N}.\- /]{3,80}$/u.test(documentNumber)) throw new Error('Ingresa un número de documento válido.');
  const parsed = parsePhoneNumberFromString(phone);
  if (!phone.startsWith('+') || !parsed?.isPossible()) throw new Error('Ingresa un teléfono válido con el prefijo de tu país.');
  return { fullName, birthDate, documentNumber, phone: parsed.number };
}
