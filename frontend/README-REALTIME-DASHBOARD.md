# Actualizaciones en tiempo real

El sistema usa una conexión WebSocket autenticada (`/ws`) para notificar cambios de ventas, inventario, productos, actividad y usuarios. Las notificaciones no incluyen los registros completos: las vistas consultan la API existente cuando reciben un evento.

## Configuración

En desarrollo, `VITE_API_URL` se usa para derivar la URL WebSocket. Para definirla explícitamente:

```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000/ws
VITE_ENABLE_WEBSOCKETS=true
```

El servidor lee `FRONTEND_URL` para validar el origen de la conexión y requiere `JWT_SECRET` y una sesión vigente en la base de datos. En producción, usa `wss://` detrás de HTTPS y configura `FRONTEND_URL` con el origen real del frontend.

## Comportamiento

- El cliente envía el token de sesión al abrir el socket; no se incluye en la URL.
- El servidor verifica el usuario y la sesión, y vuelve a comprobarlos periódicamente.
- Las conexiones se recuperan con espera incremental cuando hay una interrupción.
- Ventas, productos, entradas de stock, cambios de usuario y actividades publican eventos tras guardar los cambios.
- Las vistas abiertas refrescan los datos afectados y agrupan eventos cercanos para evitar consultas duplicadas.
- El botón de actualización sigue consultando la API directamente; WebSocket entrega notificaciones, no reemplaza los endpoints de lectura.
- Al cerrar sesión, revocar una sesión o desactivar un usuario, las conexiones correspondientes se cierran.

No hay sondeo periódico de datos como alternativa al WebSocket. Si el socket está desconectado, la actualización se reanuda al reconectar; el usuario también puede actualizar manualmente.
