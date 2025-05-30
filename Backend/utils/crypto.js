import crypto from 'crypto';

export const hashPassword = (password) => {
  const iterations = 260000;
  const keylen = 32; // 32 bytes = 256 bits
  const digest = 'sha256';
  
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    keylen,
    digest
  ).toString('hex');
  
  return `pbkdf2:${digest}:${iterations}$${salt}$${hash}`;
}; 