const PASSWORD_POLICY_MESSAGE = 'La contraseña debe tener al menos 8 caracteres e incluir una letra, un número y un carácter especial.';
const PASSWORD_PATTERN = /^(?=.*\p{L})(?=.*\p{N})(?=.*[^\p{L}\p{N}\s]).{8,}$/u;

function isPasswordValid(password) {
  return typeof password === 'string' && PASSWORD_PATTERN.test(password);
}

module.exports = { PASSWORD_PATTERN, PASSWORD_POLICY_MESSAGE, isPasswordValid };
