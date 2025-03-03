import { createClient } from '@libsql/client';
import { EmailConfig, EmailTemplate, OAuthConfig } from '../../types/email';

const client = createClient({
  url: import.meta.env.VITE_TURSO_DB_URL,
  authToken: import.meta.env.VITE_TURSO_DB_AUTH_TOKEN,
});

// Funciones para OAuth Config
export async function getOAuthConfig(): Promise<OAuthConfig | null> {
  const result = await client.execute('SELECT * FROM oauth_config WHERE is_active = true LIMIT 1');
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0] as any;
  return {
    id: row.id,
    clientId: row.client_id,
    clientSecret: row.client_secret,
    redirectUri: row.redirect_uri,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function saveOAuthConfig(config: Omit<OAuthConfig, 'id' | 'isActive'>): Promise<OAuthConfig> {
  // Desactivar cualquier configuración existente
  await client.execute('UPDATE oauth_config SET is_active = false');

  const result = await client.execute({
    sql: `INSERT INTO oauth_config (id, client_id, client_secret, redirect_uri, is_active)
          VALUES (lower(hex(randomblob(4))), ?, ?, ?, true)
          RETURNING *`,
    args: [config.clientId, config.clientSecret, config.redirectUri]
  });

  const row = result.rows[0] as any;
  return {
    id: row.id,
    clientId: row.client_id,
    clientSecret: row.client_secret,
    redirectUri: row.redirect_uri,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Funciones para Email Config
export async function getEmailConfigs(): Promise<EmailConfig[]> {
  const result = await client.execute('SELECT * FROM email_configs ORDER BY is_default DESC');
  return result.rows.map((row: any) => ({
    id: row.id,
    email: row.email,
    password: row.password,
    isDefault: Boolean(row.is_default),
    authType: row.auth_type,
    oauthCredentials: row.oauth_credentials ? JSON.parse(row.oauth_credentials) : undefined,
    templateId: row.template_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function saveEmailConfig(config: Omit<EmailConfig, 'id'>): Promise<EmailConfig> {
  if (config.isDefault) {
    await client.execute('UPDATE email_configs SET is_default = false');
  }

  const args = [
    config.email,
    config.password ?? null,
    config.isDefault ? 1 : 0,
    config.authType,
    config.oauthCredentials ? JSON.stringify(config.oauthCredentials) : null,
    config.templateId ?? null
  ];

  const result = await client.execute({
    sql: `INSERT INTO email_configs (
            id, email, password, is_default, auth_type, 
            oauth_credentials, template_id
          )
          VALUES (
            lower(hex(randomblob(4))), ?, ?, ?, ?,
            ?, ?
          )
          RETURNING *`,
    args
  });

  const row = result.rows[0] as any;
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    isDefault: Boolean(row.is_default),
    authType: row.auth_type,
    oauthCredentials: row.oauth_credentials ? JSON.parse(row.oauth_credentials) : undefined,
    templateId: row.template_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function updateEmailConfig(id: string, updates: Partial<EmailConfig>): Promise<void> {
  if (updates.isDefault) {
    // Si la actualización es para hacer esta config por defecto, desactivar cualquier otra
    await client.execute('UPDATE email_configs SET is_default = false');
  }

  const setClauses = [];
  const args: (string | number | null)[] = [];

  if ('email' in updates && updates.email !== undefined) {
    setClauses.push('email = ?');
    args.push(updates.email);
  }
  if ('password' in updates) {
    setClauses.push('password = ?');
    args.push(updates.password ?? null);
  }
  if ('isDefault' in updates && updates.isDefault !== undefined) {
    setClauses.push('is_default = ?');
    args.push(updates.isDefault ? 1 : 0);
  }
  if ('authType' in updates && updates.authType !== undefined) {
    setClauses.push('auth_type = ?');
    args.push(updates.authType);
  }
  if ('oauthCredentials' in updates) {
    setClauses.push('oauth_credentials = ?');
    args.push(updates.oauthCredentials ? JSON.stringify(updates.oauthCredentials) : null);
  }
  if ('templateId' in updates) {
    setClauses.push('template_id = ?');
    args.push(updates.templateId ?? null);
  }

  if (setClauses.length > 0) {
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    args.push(id);

    await client.execute({
      sql: `UPDATE email_configs SET ${setClauses.join(', ')} WHERE id = ?`,
      args
    });
  }
}

export async function deleteEmailConfig(id: string): Promise<void> {
  await client.execute({
    sql: 'DELETE FROM email_configs WHERE id = ?',
    args: [id]
  });
}

// Funciones para Email Templates
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const result = await client.execute('SELECT * FROM email_templates ORDER BY is_default DESC');
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    subject: row.subject,
    body: row.body,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function saveEmailTemplate(template: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate> {
  if (template.isDefault) {
    await client.execute('UPDATE email_templates SET is_default = false');
  }

  const args = [
    template.name,
    template.subject,
    template.body,
    template.isDefault ? 1 : 0
  ];

  const result = await client.execute({
    sql: `INSERT INTO email_templates (id, name, subject, body, is_default)
          VALUES (lower(hex(randomblob(4))), ?, ?, ?, ?)
          RETURNING *`,
    args
  });

  const row = result.rows[0] as any;
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    body: row.body,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<void> {
  if (updates.isDefault) {
    // Si la actualización es para hacer esta plantilla por defecto, desactivar cualquier otra
    await client.execute('UPDATE email_templates SET is_default = false');
  }

  const setClauses = [];
  const args: (string | number)[] = [];

  if ('name' in updates && updates.name !== undefined) {
    setClauses.push('name = ?');
    args.push(updates.name);
  }
  if ('subject' in updates && updates.subject !== undefined) {
    setClauses.push('subject = ?');
    args.push(updates.subject);
  }
  if ('body' in updates && updates.body !== undefined) {
    setClauses.push('body = ?');
    args.push(updates.body);
  }
  if ('isDefault' in updates && updates.isDefault !== undefined) {
    setClauses.push('is_default = ?');
    args.push(updates.isDefault ? 1 : 0);
  }

  if (setClauses.length > 0) {
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    args.push(id);

    await client.execute({
      sql: `UPDATE email_templates SET ${setClauses.join(', ')} WHERE id = ?`,
      args
    });
  }
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await client.execute({
    sql: 'DELETE FROM email_templates WHERE id = ?',
    args: [id]
  });
} 