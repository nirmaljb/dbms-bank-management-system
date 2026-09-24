import jwt from 'jsonwebtoken';

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: 'customer' | 'admin';
  name: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'bank-management-default-secret-key-change-me';
const JWT_EXPIRES_IN = '7d';

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded as AuthTokenPayload;
}
