export const PASSWORD_POLICY_MESSAGE = 'Usa al menos 8 caracteres, con una letra, un número y un carácter especial.';

export function getPasswordRequirements(password = '') {
  return {
    minLength: password.length >= 8,
    letter: /\p{L}/u.test(password),
    number: /\p{N}/u.test(password),
    special: /[^\p{L}\p{N}\s]/u.test(password),
  };
}

export function isPasswordValid(password = '') {
  return Object.values(getPasswordRequirements(password)).every(Boolean);
}
