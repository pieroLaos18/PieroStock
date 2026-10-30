-- EJECUTAR UNA SOLA VEZ después de desplegar la versión que valida hashes.
-- No es idempotente para los tokens de reset y verificación: al repetirlo,
-- los hashes almacenados volverían a cambiar y los enlaces enviados dejarían de funcionar.
UPDATE sessions SET token = SHA2(token, 256) WHERE CHAR_LENGTH(token) > 64;
UPDATE users SET reset_token = SHA2(reset_token, 256) WHERE reset_token IS NOT NULL;
UPDATE pending_users SET token_verificacion = SHA2(token_verificacion, 256);
