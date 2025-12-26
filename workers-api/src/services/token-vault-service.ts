// Token Vault Service - Encrypted token storage for OAuth and API keys
// Uses AES-256-GCM encryption for secure token storage

import { D1Database } from '@cloudflare/workers-types';

interface SecureToken {
  id: string;
  company_id: string;
  provider: string;
  token_type: 'access' | 'refresh' | 'api_key';
  encrypted_value: string;
  encryption_iv: string;
  scopes?: string[];
  expires_at?: string;
  refresh_token_id?: string;
  metadata?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

interface TokenInput {
  company_id: string;
  provider: string;
  token_type: 'access' | 'refresh' | 'api_key';
  value: string;
  scopes?: string[];
  expires_at?: string;
  refresh_token_id?: string;
  metadata?: Record<string, unknown>;
}

// Generate a cryptographically secure encryption key from a secret
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('aria-token-vault-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a token value
async function encryptToken(value: string, encryptionSecret: string): Promise<{ encrypted: string; iv: string }> {
  const key = await deriveKey(encryptionSecret);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(value)
  );
  
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

// Decrypt a token value
async function decryptToken(encrypted: string, iv: string, encryptionSecret: string): Promise<string> {
  const key = await deriveKey(encryptionSecret);
  const decoder = new TextDecoder();
  
  const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    encryptedBytes
  );
  
  return decoder.decode(decrypted);
}

// Store a new token securely
export async function storeToken(
  db: D1Database,
  input: TokenInput,
  encryptionSecret: string
): Promise<SecureToken> {
  const id = crypto.randomUUID();
  const { encrypted, iv } = await encryptToken(input.value, encryptionSecret);
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO secure_tokens (
      id, company_id, provider, token_type, encrypted_value, encryption_iv,
      scopes, expires_at, refresh_token_id, metadata, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.provider,
    input.token_type,
    encrypted,
    iv,
    input.scopes ? JSON.stringify(input.scopes) : null,
    input.expires_at || null,
    input.refresh_token_id || null,
    input.metadata ? JSON.stringify(input.metadata) : null,
    now,
    now
  ).run();
  
  return {
    id,
    company_id: input.company_id,
    provider: input.provider,
    token_type: input.token_type,
    encrypted_value: encrypted,
    encryption_iv: iv,
    scopes: input.scopes,
    expires_at: input.expires_at,
    refresh_token_id: input.refresh_token_id,
    metadata: input.metadata,
    is_active: true,
    created_at: now,
    updated_at: now
  };
}

// Retrieve and decrypt a token
export async function getToken(
  db: D1Database,
  tokenId: string,
  encryptionSecret: string
): Promise<{ token: SecureToken; decryptedValue: string } | null> {
  const result = await db.prepare(`
    SELECT * FROM secure_tokens WHERE id = ? AND is_active = 1
  `).bind(tokenId).first<SecureToken>();
  
  if (!result) return null;
  
  // Update last_used_at
  await db.prepare(`
    UPDATE secure_tokens SET last_used_at = ? WHERE id = ?
  `).bind(new Date().toISOString(), tokenId).run();
  
  const decryptedValue = await decryptToken(
    result.encrypted_value,
    result.encryption_iv,
    encryptionSecret
  );
  
  return {
    token: {
      ...result,
      scopes: result.scopes ? JSON.parse(result.scopes as unknown as string) : undefined,
      metadata: result.metadata ? JSON.parse(result.metadata as unknown as string) : undefined
    },
    decryptedValue
  };
}

// Get token by provider for a company
export async function getTokenByProvider(
  db: D1Database,
  companyId: string,
  provider: string,
  tokenType: 'access' | 'refresh' | 'api_key',
  encryptionSecret: string
): Promise<{ token: SecureToken; decryptedValue: string } | null> {
  const result = await db.prepare(`
    SELECT * FROM secure_tokens 
    WHERE company_id = ? AND provider = ? AND token_type = ? AND is_active = 1
    ORDER BY created_at DESC LIMIT 1
  `).bind(companyId, provider, tokenType).first<SecureToken>();
  
  if (!result) return null;
  
  const decryptedValue = await decryptToken(
    result.encrypted_value,
    result.encryption_iv,
    encryptionSecret
  );
  
  return {
    token: {
      ...result,
      scopes: result.scopes ? JSON.parse(result.scopes as unknown as string) : undefined,
      metadata: result.metadata ? JSON.parse(result.metadata as unknown as string) : undefined
    },
    decryptedValue
  };
}

// Rotate a token (store new, deactivate old)
export async function rotateToken(
  db: D1Database,
  oldTokenId: string,
  newValue: string,
  encryptionSecret: string,
  newExpiresAt?: string
): Promise<SecureToken> {
  const oldToken = await db.prepare(`
    SELECT * FROM secure_tokens WHERE id = ?
  `).bind(oldTokenId).first<SecureToken>();
  
  if (!oldToken) {
    throw new Error('Token not found');
  }
  
  // Deactivate old token
  await db.prepare(`
    UPDATE secure_tokens SET is_active = 0, updated_at = ? WHERE id = ?
  `).bind(new Date().toISOString(), oldTokenId).run();
  
  // Store new token
  return storeToken(db, {
    company_id: oldToken.company_id,
    provider: oldToken.provider,
    token_type: oldToken.token_type,
    value: newValue,
    scopes: oldToken.scopes ? JSON.parse(oldToken.scopes as unknown as string) : undefined,
    expires_at: newExpiresAt,
    refresh_token_id: oldToken.refresh_token_id,
    metadata: oldToken.metadata ? JSON.parse(oldToken.metadata as unknown as string) : undefined
  }, encryptionSecret);
}

// Revoke a token
export async function revokeToken(db: D1Database, tokenId: string): Promise<void> {
  await db.prepare(`
    UPDATE secure_tokens SET is_active = 0, updated_at = ? WHERE id = ?
  `).bind(new Date().toISOString(), tokenId).run();
}

// Revoke all tokens for a provider
export async function revokeProviderTokens(
  db: D1Database,
  companyId: string,
  provider: string
): Promise<number> {
  const result = await db.prepare(`
    UPDATE secure_tokens SET is_active = 0, updated_at = ? 
    WHERE company_id = ? AND provider = ?
  `).bind(new Date().toISOString(), companyId, provider).run();
  
  return result.meta.changes || 0;
}

// List tokens for a company (without decrypted values)
export async function listTokens(
  db: D1Database,
  companyId: string,
  provider?: string
): Promise<Omit<SecureToken, 'encrypted_value' | 'encryption_iv'>[]> {
  let query = `
    SELECT id, company_id, provider, token_type, scopes, expires_at, 
           refresh_token_id, metadata, is_active, created_at, updated_at, last_used_at
    FROM secure_tokens WHERE company_id = ?
  `;
  const params: string[] = [companyId];
  
  if (provider) {
    query += ' AND provider = ?';
    params.push(provider);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    company_id: row.company_id as string,
    provider: row.provider as string,
    token_type: row.token_type as 'access' | 'refresh' | 'api_key',
    scopes: row.scopes ? JSON.parse(row.scopes as string) : undefined,
    expires_at: row.expires_at as string | undefined,
    refresh_token_id: row.refresh_token_id as string | undefined,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    last_used_at: row.last_used_at as string | undefined
  }));
}

// Check if a token is expired
export function isTokenExpired(token: SecureToken): boolean {
  if (!token.expires_at) return false;
  return new Date(token.expires_at) < new Date();
}

// Get tokens expiring soon (for proactive refresh)
export async function getExpiringTokens(
  db: D1Database,
  withinMinutes: number = 30
): Promise<SecureToken[]> {
  const threshold = new Date(Date.now() + withinMinutes * 60 * 1000).toISOString();
  
  const results = await db.prepare(`
    SELECT * FROM secure_tokens 
    WHERE is_active = 1 AND expires_at IS NOT NULL AND expires_at < ?
    ORDER BY expires_at ASC
  `).bind(threshold).all();
  
  return (results.results || []) as unknown as SecureToken[];
}

// OAuth token refresh helper
export async function refreshOAuthToken(
  db: D1Database,
  accessTokenId: string,
  encryptionSecret: string,
  refreshFn: (refreshToken: string) => Promise<{ access_token: string; expires_in?: number; refresh_token?: string }>
): Promise<SecureToken> {
  const accessToken = await db.prepare(`
    SELECT * FROM secure_tokens WHERE id = ?
  `).bind(accessTokenId).first<SecureToken>();
  
  if (!accessToken || !accessToken.refresh_token_id) {
    throw new Error('Access token or refresh token not found');
  }
  
  const refreshTokenData = await getToken(db, accessToken.refresh_token_id, encryptionSecret);
  if (!refreshTokenData) {
    throw new Error('Refresh token not found');
  }
  
  // Call the provider's refresh endpoint
  const newTokens = await refreshFn(refreshTokenData.decryptedValue);
  
  // Calculate new expiry
  const expiresAt = newTokens.expires_in 
    ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
    : undefined;
  
  // Rotate the access token
  const newAccessToken = await rotateToken(
    db,
    accessTokenId,
    newTokens.access_token,
    encryptionSecret,
    expiresAt
  );
  
  // If a new refresh token was provided, rotate that too
  if (newTokens.refresh_token) {
    const newRefreshToken = await rotateToken(
      db,
      accessToken.refresh_token_id,
      newTokens.refresh_token,
      encryptionSecret
    );
    
    // Update the access token to reference the new refresh token
    await db.prepare(`
      UPDATE secure_tokens SET refresh_token_id = ?, updated_at = ? WHERE id = ?
    `).bind(newRefreshToken.id, new Date().toISOString(), newAccessToken.id).run();
  }
  
  return newAccessToken;
}
