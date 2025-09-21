const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'chrislocordc@gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendPasswordResetEmail(to, resetLink) {
  return transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: 'Recupera tu contraseña',
    html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Si no solicitaste este cambio, ignora este correo.</p>`
  });
}

module.exports = { sendPasswordResetEmail };
