# ERP ligero — ventas e inventario

ERP ligero para gestionar productos, inventario, ventas, usuarios, reportes y actividad. La interfaz usa Vue 3 + Vite; la API usa Node.js + Express; los datos se guardan en MySQL.

## Demo interactiva

Para recorrer la interfaz con información de ejemplo, arranca solo el frontend y abre `http://localhost:5174/demo`. También puedes abrir **Explorar demo interactiva** desde el inicio de sesión. La demo incluye panel, ventas simuladas, catálogo, reposición por lotes FIFO, reportes, equipo y actividad; las modificaciones se guardan solo en memoria durante esa sesión y no llegan a la API ni a MySQL.

## Requisitos

- Node.js 20 o posterior y npm.
- MySQL 8 en ejecución.
- Para crear y verificar cuentas: una cuenta Gmail y una contraseña de aplicación. Las credenciales se guardan solo en `backend/.env`.

## Primera configuración

### 1. Crear la base de datos

Crea una base nueva llamada `sales_system` en MySQL Workbench, o desde PowerShell:

```powershell
mysql -u root -p -e "CREATE DATABASE sales_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Desde la raíz del repositorio, carga el esquema inicial:

```powershell
cmd /c "mysql -u root -p sales_system < database\schema.sql"
```

`database/schema.sql` es para una **base nueva**. No lo ejecutes sobre una base que ya contenga datos sin hacer antes un respaldo y revisar una migración adecuada.

### 2. Configurar el backend

En una terminal de PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
```

Edita `backend/.env` y configura, como mínimo, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y un `JWT_SECRET` aleatorio. Para registro y recuperación de cuentas, completa `EMAIL_USER` y `EMAIL_PASS` con el correo de envío y su contraseña de aplicación.

Puedes generar un secreto local para JWT con:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Instala y arranca la API:

```powershell
npm install
npm run dev
```

La API queda en `http://localhost:5000`. Su comprobación de conexión está en `http://localhost:5000/api/health`.

### 3. Arrancar el frontend

Abre **otra** terminal de PowerShell desde la raíz del repositorio:

```powershell
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5174`. El entorno de desarrollo ya apunta la interfaz a la API local del puerto 5000. En producción debes definir `VITE_API_URL` con la URL pública del backend.

## Primer usuario administrador

El registro público crea cuentas con rol `cajero`; el rol recibido desde el navegador no se acepta. Registra la primera cuenta, verifica el correo y luego, **solo en tu base local**, promuévela desde MySQL Workbench:

```sql
UPDATE users
SET rol = 'admin'
WHERE correo_electronico = 'tu-correo@example.com';
```

Cierra sesión y vuelve a ingresar para que el token nuevo incluya el rol de administrador. No publiques credenciales de acceso de demostración.

## Uso habitual

1. Inicia MySQL.
2. En una terminal, ejecuta `cd backend` y `npm run dev`.
3. En otra terminal, ejecuta `cd frontend` y `npm run dev`.
4. Entra a `http://localhost:5174` e inicia sesión.

El backend y las vistas usan WebSockets autenticados en `/ws` para anunciar cambios de ventas, inventario, productos, usuarios y actividades. En desarrollo, `VITE_API_URL` determina la dirección del socket; revisa [la guía de tiempo real](frontend/README-REALTIME-DASHBOARD.md) para configurar otra URL o producción.

## Solución de problemas

- **`ECONNREFUSED` o la API indica que la base no está disponible:** inicia MySQL y confirma host, puerto y nombre de base en `backend/.env`.
- **`Access denied for user`:** revisa el usuario y contraseña de MySQL.
- **La interfaz no conecta con la API:** confirma que el backend use el puerto 5000 y que el frontend esté en el 5174.
- **No llegan mensajes de verificación o recuperación:** configura `EMAIL_USER` y `EMAIL_PASS` con una contraseña de aplicación de Gmail; no uses ni publiques la contraseña normal de la cuenta.
- **No puedes acceder a administración:** vuelve a iniciar sesión luego de asignar el rol `admin`.

## Seguridad y datos

- No subas `backend/.env`, credenciales de correo, claves JWT, datos reales de clientes ni imágenes privadas.
- Usa datos ficticios si vas a mostrar una demostración.
- Haz respaldos antes de cambiar la estructura de una base con datos existentes.
