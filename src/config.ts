export function config() {
  return {
    port: parseInt(process.env.PORT, 10) || 3000,
    mail: {
      pass: process.env.MAIL_PASS,
      email: process.env.MAIL_EMAIL,
      port: process.env.MAIL_PORT,
      host: process.env.MAIL_HOST,
    },
  };
}
