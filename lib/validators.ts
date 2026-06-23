// simple validation helpers used across API routes

export function isValidEmail(email: string): boolean {
  // basic regex for demonstration; consider using a library for production
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;
  return re.test(email);
}

export function sanitizeString(str: string, maxLength = 1000): string {
  let s = str.trim();
  // truncate
  if (s.length > maxLength) s = s.slice(0, maxLength);
  // escape angle brackets to prevent simple html injection
  s = s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return s;
}
