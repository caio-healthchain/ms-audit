import { Request } from 'express';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}
