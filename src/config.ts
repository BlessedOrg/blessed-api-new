export function config() {
  return {
    port: parseInt(process.env.PORT, 10) || 3000,
    mail: {
      pass: process.env.SMTP_PASSWORD,
      email: process.env.SMTP_EMAIL,
      port: process.env.SMTP_PORT,
      host: process.env.SMTP_HOST,
    },
  };
}
