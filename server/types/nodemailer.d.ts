import { TransportOptions as BaseTransportOptions } from 'nodemailer';

declare module 'nodemailer' {
  interface AuthOpts {
    type: 'OAuth2' | 'login';
    user: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    accessToken?: string;
    password?: string;
  }

  interface TransportOptions {
    pool?: boolean;
    service?: string;
    auth: AuthOpts;
  }
} 