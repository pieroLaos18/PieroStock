const nodemailer = require('nodemailer');

const getEmailConfig = () => ({
  user: (process.env.EMAIL_USER || '').trim(),
  // Google muestra las contraseñas de aplicación agrupadas con espacios.
  pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, '')
});

const isEmailConfigured = () => {
  const { user, pass } = getEmailConfig();
  return Boolean(user && pass);
};

const createTransporter = () => {
  const { user, pass } = getEmailConfig();
  if (!user || !pass) {
    const error = new Error('EMAIL_CONFIG_MISSING');
    error.code = 'EMAIL_CONFIG_MISSING';
    throw error;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
};

const getSender = () => getEmailConfig().user;
const getFrontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/+$/, '');
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

const buildVerificationEmail = (nombre, verifyUrl) => {
  const safeName = escapeHtml(nombre || '');
  const plainName = String(nombre || '').replace(/[\r\n]+/g, ' ').trim();
  const greeting = safeName ? `Hola ${safeName},` : 'Hola,';
  const textGreeting = plainName ? `Hola ${plainName},` : 'Hola,';
  const safeUrl = escapeHtml(verifyUrl);
  const year = new Date().getFullYear();

  return {
    subject: 'Confirma tu correo y activa tu cuenta',
    text: `${textGreeting}\n\nGracias por registrarte en Sistema de ventas e inventario. Confirma tu correo para activar tu cuenta:\n\n${verifyUrl}\n\nEl enlace vence en 15 minutos. Si no solicitaste esta cuenta, puedes ignorar este mensaje.\n\nSistema de ventas e inventario`,
    html: `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Confirma tu correo</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f6;font-family:Arial,Helvetica,sans-serif;color:#172b3a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Confirma tu correo para activar tu cuenta de Sistema de ventas e inventario.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f6;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #dce5e8;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:25px 34px;background-color:#142b40;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="42" height="42" align="center" valign="middle" style="width:42px;height:42px;border-radius:12px;background-color:#1b766f;color:#ffffff;font-size:16px;font-weight:bold;">SV</td>
                    <td style="padding-left:12px;color:#ffffff;font-size:15px;font-weight:bold;letter-spacing:.2px;">Sistema de ventas e inventario</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 38px 22px;">
                <p style="margin:0 0 10px;color:#087f83;font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;">Verificación de cuenta</p>
                <h1 style="margin:0 0 18px;color:#15283b;font-size:28px;line-height:1.25;font-weight:700;">Confirma tu correo</h1>
                <p style="margin:0 0 14px;color:#304456;font-size:16px;line-height:1.65;">${greeting}</p>
                <p style="margin:0;color:#536779;font-size:15px;line-height:1.75;">Gracias por crear una cuenta. Confirma que esta dirección de correo te pertenece para activar el acceso a tu espacio de ventas e inventario.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:14px 38px 24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#087f83" style="border-radius:10px;">
                      <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:15px 27px;border:1px solid #087f83;border-radius:10px;background-color:#087f83;color:#ffffff;font-size:15px;font-weight:bold;line-height:1.2;text-decoration:none;">Verificar mi correo</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 38px 30px;">
                <p style="margin:0 0 8px;color:#536779;font-size:13px;line-height:1.65;">El enlace es válido durante <strong style="color:#304456;">15 minutos</strong>. Si el botón no funciona, copia este enlace en tu navegador:</p>
                <p style="margin:0;word-break:break-all;font-size:12px;line-height:1.7;"><a href="${safeUrl}" target="_blank" style="color:#087f83;text-decoration:underline;">${safeUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:21px 38px;background-color:#f7fafb;border-top:1px solid #e5ecee;">
                <p style="margin:0 0 7px;color:#536779;font-size:12px;line-height:1.6;">Si no creaste esta cuenta, puedes ignorar este mensaje; no se activará sin verificar el correo.</p>
                <p style="margin:0;color:#82919c;font-size:11px;line-height:1.6;">Mensaje automático de Sistema de ventas e inventario · ${year}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
  };
};

const buildPasswordRecoveryEmail = (nombre, resetUrl) => {
  const safeName = escapeHtml(nombre || '');
  const plainName = String(nombre || '').replace(/[\r\n]+/g, ' ').trim();
  const greeting = safeName ? `Hola ${safeName},` : 'Hola,';
  const textGreeting = plainName ? `Hola ${plainName},` : 'Hola,';
  const safeUrl = escapeHtml(resetUrl);
  const year = new Date().getFullYear();

  return {
    subject: 'Restablece la contraseña de tu cuenta',
    text: `${textGreeting}\n\nRecibimos una solicitud para cambiar la contraseña de tu cuenta de Sistema de ventas e inventario. Usa este enlace para elegir una nueva:\n\n${resetUrl}\n\nEl enlace vence en 1 hora. Si no solicitaste este cambio, ignora este mensaje; tu contraseña actual no cambiará.\n\nSistema de ventas e inventario`,
    html: `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Restablece tu contraseña</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f6;font-family:Arial,Helvetica,sans-serif;color:#172b3a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Recupera el acceso a tu cuenta de Sistema de ventas e inventario.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f6;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #dce5e8;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:25px 34px;background-color:#142b40;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="42" height="42" align="center" valign="middle" style="width:42px;height:42px;border-radius:12px;background-color:#1b766f;color:#ffffff;font-size:16px;font-weight:bold;">SV</td>
                    <td style="padding-left:12px;color:#ffffff;font-size:15px;font-weight:bold;letter-spacing:.2px;">Sistema de ventas e inventario</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 38px 22px;">
                <p style="margin:0 0 10px;color:#087f83;font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;">Seguridad de tu cuenta</p>
                <h1 style="margin:0 0 18px;color:#15283b;font-size:28px;line-height:1.25;font-weight:700;">Restablece tu contraseña</h1>
                <p style="margin:0 0 14px;color:#304456;font-size:16px;line-height:1.65;">${greeting}</p>
                <p style="margin:0;color:#536779;font-size:15px;line-height:1.75;">Recibimos una solicitud para cambiar la contraseña de tu cuenta. Usa el botón para elegir una nueva y recuperar el acceso.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:14px 38px 24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#087f83" style="border-radius:10px;">
                      <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:15px 27px;border:1px solid #087f83;border-radius:10px;background-color:#087f83;color:#ffffff;font-size:15px;font-weight:bold;line-height:1.2;text-decoration:none;">Restablecer mi contraseña</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 38px 30px;">
                <p style="margin:0 0 8px;color:#536779;font-size:13px;line-height:1.65;">El enlace es válido durante <strong style="color:#304456;">1 hora</strong>. Si el botón no funciona, copia este enlace en tu navegador:</p>
                <p style="margin:0;word-break:break-all;font-size:12px;line-height:1.7;"><a href="${safeUrl}" target="_blank" style="color:#087f83;text-decoration:underline;">${safeUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:21px 38px;background-color:#f7fafb;border-top:1px solid #e5ecee;">
                <p style="margin:0 0 7px;color:#536779;font-size:12px;line-height:1.6;">Si no solicitaste este cambio, puedes ignorar el mensaje. Tu contraseña actual no cambiará.</p>
                <p style="margin:0;color:#82919c;font-size:11px;line-height:1.6;">Mensaje automático de Sistema de ventas e inventario · ${year}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
  };
};

const buildTemporaryPasswordEmail = (nombre, temporaryPassword) => {
  const safeName = escapeHtml(nombre || '');
  const plainName = String(nombre || '').replace(/[\r\n]+/g, ' ').trim();
  const greeting = safeName ? `Hola ${safeName},` : 'Hola,';
  const textGreeting = plainName ? `Hola ${plainName},` : 'Hola,';
  const safePassword = escapeHtml(temporaryPassword);
  return {
    subject: 'Tu acceso al Sistema de ventas e inventario',
    text: `${textGreeting}\n\nUn administrador creó una cuenta para ti. Tu contraseña temporal de un solo uso es:\n\n${temporaryPassword}\n\nInicia sesión con este correo y contraseña. El sistema te pedirá cambiarla antes de continuar. Esta contraseña solo sirve para el primer acceso. Si no esperabas este mensaje, contacta al administrador de tu negocio.`,
    html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tu acceso al sistema</title></head><body style="margin:0;padding:32px 12px;background:#f1f5f6;font-family:Arial,Helvetica,sans-serif;color:#172b3a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="600" style="width:100%;max-width:600px;background:#fff;border:1px solid #dce5e8;border-radius:18px;overflow:hidden" cellspacing="0" cellpadding="0"><tr><td style="padding:24px 32px;background:#142b40;color:#fff;font-size:16px;font-weight:bold">Sistema de ventas e inventario</td></tr><tr><td style="padding:34px 32px 12px"><p style="margin:0 0 10px;color:#087f83;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase">Acceso creado por tu administrador</p><h1 style="margin:0 0 16px;color:#15283b;font-size:26px">Tu cuenta está lista</h1><p style="color:#536779;line-height:1.7">${greeting} Un administrador creó una cuenta para ti. Usa esta contraseña temporal para iniciar sesión:</p><p style="padding:16px;background:#f1f5f6;border:1px solid #dce5e8;border-radius:10px;text-align:center;font-family:monospace;font-size:20px;font-weight:bold;letter-spacing:1px;word-break:break-all;color:#142b40">${safePassword}</p><p style="color:#536779;line-height:1.7">La contraseña es de un solo uso. Después de iniciar sesión, el sistema te pedirá elegir una nueva antes de acceder a cualquier otra función.</p><p style="color:#82919c;font-size:12px;line-height:1.6">Si no esperabas este mensaje, contacta al administrador de tu negocio.</p></td></tr><tr><td style="padding:18px 32px;background:#f7fafb;border-top:1px solid #e5ecee;color:#82919c;font-size:11px">Mensaje automático · Sistema de ventas e inventario</td></tr></table></td></tr></table></body></html>`
  };
};

const enviarCorreoContrasenaTemporal = async (email, nombre, temporaryPassword) => {
  const message = buildTemporaryPasswordEmail(nombre, temporaryPassword);
  await createTransporter().sendMail({
    from: `"Sistema de ventas e inventario" <${getSender()}>`,
    to: email,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
};

const enviarCorreoRecuperacion = async (email, token, nombre) => {
  const resetUrl = `${getFrontendUrl()}/reset-password/${encodeURIComponent(token)}`;
  const message = buildPasswordRecoveryEmail(nombre, resetUrl);
  await createTransporter().sendMail({
    from: `"Sistema de ventas e inventario" <${getSender()}>`,
    to: email,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
};

// 🆕 Función para verificación de cuenta
const enviarCorreoVerificacion = async (email, nombre, token) => {
  const verifyUrl = `${getFrontendUrl()}/verificar?token=${encodeURIComponent(token)}`;
  const message = buildVerificationEmail(nombre, verifyUrl);
  await createTransporter().sendMail({
    from: `"Sistema de ventas e inventario" <${getSender()}>`,
    to: email,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
};

module.exports = {
  enviarCorreoRecuperacion,
  enviarCorreoVerificacion,
  enviarCorreoContrasenaTemporal,
  isEmailConfigured
};

