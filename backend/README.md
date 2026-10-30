# Backend

API REST del Sistema de ventas e inventario, construida con Node.js, Express y MySQL.

La configuración completa de MySQL, Gmail, primer usuario, arranque y solución de problemas está en el [README principal](../README.md).

Desde esta carpeta, después de copiar `.env.example` a `.env` y completar sus valores:

```powershell
npm install
npm run dev
```

El servidor local escucha en el puerto definido por `PORT` (5000 por defecto). `npm start` inicia el mismo servidor sin reinicio automático.

## Actualización de seguridad

Antes de desplegar una base de datos existente, ejecuta una sola vez y en este orden:

1. `database/migrations/20261030_temporary_user_password.sql`
2. `database/migrations/20261030_hash_existing_tokens.sql`

La segunda migración convierte los tokens de recuperación y verificación pendientes a hashes; no la ejecutes por segunda vez. Las instalaciones nuevas deben partir de `database/schema.sql` y solo necesitan la segunda migración si ya conservan tokens emitidos antes de esta versión.

Configura `JWT_SECRET` con un valor aleatorio de al menos 32 caracteres y define `FRONTEND_URL` con los orígenes exactos permitidos, separados por comas. Rota las credenciales que anteriormente estuvieron publicadas en archivos de ejemplo y usa únicamente los valores nuevos en `backend/.env`.
