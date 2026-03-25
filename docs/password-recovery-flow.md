# Recuperación de contraseña: contrato Frontend + Backend

## Endpoints esperados

- `POST /api/auth/forgot-password`
  - Body: `{ "email": "usuario@empresa.com" }`
  - Response: `{ "success": true, "message": "..." }`

- `POST /api/auth/reset-password?token=TOKEN`
  - Body: `{ "password": "NuevaPass123" }`
  - Response: `{ "success": true, "message": "..." }`

## Flujo completo

1. Login muestra enlace `Olvidé mi contraseña`.
2. Usuario carga email en `/forgot-password`.
3. Backend valida email, genera `resetToken` único (crypto, 32 bytes hex), guarda `resetTokenExpiry` (10 min).
4. Desarrollo: token por logs. Producción: envío por email con link `/reset-password?token=TOKEN`.
5. Usuario abre `/reset-password?token=...`, define nueva contraseña y confirma.
6. Frontend envía `POST /api/auth/reset-password?token=...`.
7. Backend valida token vigente, hashea con `bcrypt`, actualiza contraseña y limpia `resetToken` + `resetTokenExpiry`.

## Seguridad mínima

- Token aleatorio criptográficamente seguro.
- Expiración estricta (10 min).
- Uso único (invalidar tras reset exitoso).
- Password siempre hasheada (`bcrypt`).
- No revelar si un email no existe (mensaje genérico recomendado).

## Prueba de desarrollo sugerida

1. Ejecutar frontend (`npm run dev`) y backend.
2. Probar `POST /api/auth/forgot-password` con email existente.
3. Copiar token desde logs backend.
4. Abrir `/reset-password?token=...`.
5. Enviar nueva contraseña.
6. Validar login con la nueva contraseña.
