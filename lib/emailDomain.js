export function isAllowedEmailDomain(email) {
  return email?.endsWith(process.env.AUTH_ALLOWED_EMAIL_DOMAINS) ?? false;
}
