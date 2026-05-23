const charset =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateShortCode(length = 6) {
  let code = "";

  for (let i = 0; i < length; i++) {
    code += charset[Math.floor(Math.random() * charset.length)];
  }

  return code;
}

export function isValidAlias(alias: string) {
  return /^[a-zA-Z0-9-]{3,30}$/.test(alias);
}

export const reservedWords = new Set([
  "shorten",
  "qr",
  "api",
  "static",
  "admin",
  "dashboard",
  "login",
  "register",
]);