export interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}

export interface EmailConfig {
  id: string;
  email: string;
  password?: string;
  isDefault: boolean;
  authType: 'password' | 'oauth';
  oauthCredentials?: OAuthCredentials;
  templateId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OAuthConfig {
  id: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
} 