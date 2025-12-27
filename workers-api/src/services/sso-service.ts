// SSO/OIDC Authentication Service

import { D1Database } from '@cloudflare/workers-types';

interface SSOProvider {
  id: string;
  company_id: string;
  provider_type: 'oidc' | 'saml' | 'google' | 'microsoft' | 'okta';
  name: string;
  client_id?: string;
  client_secret_token_id?: string;
  issuer_url?: string;
  authorization_url?: string;
  token_url?: string;
  userinfo_url?: string;
  jwks_url?: string;
  scopes: string;
  domain_restriction?: string[];
  auto_provision_users: boolean;
  default_role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SSOSession {
  id: string;
  user_id: string;
  provider_id: string;
  external_user_id?: string;
  state?: string;
  nonce?: string;
  id_token?: string;
  access_token_id?: string;
  expires_at?: string;
  created_at: string;
}

interface OIDCTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

interface OIDCUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

// Well-known OIDC provider configurations
const PROVIDER_CONFIGS: Record<string, { authorization_url: string; token_url: string; userinfo_url: string; jwks_url: string }> = {
  google: {
    authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    userinfo_url: 'https://openidconnect.googleapis.com/v1/userinfo',
    jwks_url: 'https://www.googleapis.com/oauth2/v3/certs'
  },
  microsoft: {
    authorization_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    token_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userinfo_url: 'https://graph.microsoft.com/oidc/userinfo',
    jwks_url: 'https://login.microsoftonline.com/common/discovery/v2.0/keys'
  },
  okta: {
    authorization_url: '', // Requires issuer_url
    token_url: '',
    userinfo_url: '',
    jwks_url: ''
  }
};

// Create an SSO provider
export async function createSSOProvider(
  db: D1Database,
  input: Omit<SSOProvider, 'id' | 'created_at' | 'updated_at' | 'is_active'>
): Promise<SSOProvider> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Get well-known URLs for known providers
  let authUrl = input.authorization_url;
  let tokenUrl = input.token_url;
  let userinfoUrl = input.userinfo_url;
  let jwksUrl = input.jwks_url;
  
  if (input.provider_type in PROVIDER_CONFIGS) {
    const config = PROVIDER_CONFIGS[input.provider_type];
    authUrl = authUrl || config.authorization_url;
    tokenUrl = tokenUrl || config.token_url;
    userinfoUrl = userinfoUrl || config.userinfo_url;
    jwksUrl = jwksUrl || config.jwks_url;
  }
  
  // For Okta, derive URLs from issuer
  if (input.provider_type === 'okta' && input.issuer_url) {
    authUrl = authUrl || `${input.issuer_url}/v1/authorize`;
    tokenUrl = tokenUrl || `${input.issuer_url}/v1/token`;
    userinfoUrl = userinfoUrl || `${input.issuer_url}/v1/userinfo`;
    jwksUrl = jwksUrl || `${input.issuer_url}/v1/keys`;
  }
  
  await db.prepare(`
    INSERT INTO sso_providers (
      id, company_id, provider_type, name, client_id, client_secret_token_id,
      issuer_url, authorization_url, token_url, userinfo_url, jwks_url,
      scopes, domain_restriction, auto_provision_users, default_role,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.provider_type,
    input.name,
    input.client_id || null,
    input.client_secret_token_id || null,
    input.issuer_url || null,
    authUrl || null,
    tokenUrl || null,
    userinfoUrl || null,
    jwksUrl || null,
    input.scopes || 'openid profile email',
    input.domain_restriction ? JSON.stringify(input.domain_restriction) : null,
    input.auto_provision_users ? 1 : 0,
    input.default_role || 'user',
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    authorization_url: authUrl,
    token_url: tokenUrl,
    userinfo_url: userinfoUrl,
    jwks_url: jwksUrl,
    is_active: true,
    created_at: now,
    updated_at: now
  };
}

// Get SSO provider by ID
export async function getSSOProvider(db: D1Database, providerId: string): Promise<SSOProvider | null> {
  const result = await db.prepare(`
    SELECT * FROM sso_providers WHERE id = ?
  `).bind(providerId).first();
  
  if (!result) return null;
  
  return {
    ...result,
    domain_restriction: result.domain_restriction ? JSON.parse(result.domain_restriction as string) : undefined,
    auto_provision_users: Boolean(result.auto_provision_users),
    is_active: Boolean(result.is_active)
  } as SSOProvider;
}

// List SSO providers for a company
export async function listSSOProviders(db: D1Database, companyId: string): Promise<SSOProvider[]> {
  const results = await db.prepare(`
    SELECT * FROM sso_providers WHERE company_id = ? AND is_active = 1 ORDER BY name
  `).bind(companyId).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    domain_restriction: row.domain_restriction ? JSON.parse(row.domain_restriction as string) : undefined,
    auto_provision_users: Boolean(row.auto_provision_users),
    is_active: Boolean(row.is_active)
  })) as SSOProvider[];
}

// Generate authorization URL for SSO login
export async function generateAuthorizationUrl(
  db: D1Database,
  providerId: string,
  redirectUri: string,
  state?: string
): Promise<{ url: string; state: string; nonce: string }> {
  const provider = await getSSOProvider(db, providerId);
  if (!provider) throw new Error('SSO provider not found');
  if (!provider.authorization_url) throw new Error('Authorization URL not configured');
  if (!provider.client_id) throw new Error('Client ID not configured');
  
  const generatedState = state || crypto.randomUUID();
  const nonce = crypto.randomUUID();
  
  const params = new URLSearchParams({
    client_id: provider.client_id,
    response_type: 'code',
    scope: provider.scopes,
    redirect_uri: redirectUri,
    state: generatedState,
    nonce: nonce
  });
  
  return {
    url: `${provider.authorization_url}?${params.toString()}`,
    state: generatedState,
    nonce
  };
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  db: D1Database,
  providerId: string,
  code: string,
  redirectUri: string,
  clientSecret: string
): Promise<OIDCTokenResponse> {
  const provider = await getSSOProvider(db, providerId);
  if (!provider) throw new Error('SSO provider not found');
  if (!provider.token_url) throw new Error('Token URL not configured');
  if (!provider.client_id) throw new Error('Client ID not configured');
  
  const response = await fetch(provider.token_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: provider.client_id,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    }).toString()
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }
  
  return response.json() as Promise<OIDCTokenResponse>;
}

// Get user info from OIDC provider
export async function getUserInfo(
  db: D1Database,
  providerId: string,
  accessToken: string
): Promise<OIDCUserInfo> {
  const provider = await getSSOProvider(db, providerId);
  if (!provider) throw new Error('SSO provider not found');
  if (!provider.userinfo_url) throw new Error('UserInfo URL not configured');
  
  const response = await fetch(provider.userinfo_url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`UserInfo request failed: ${error}`);
  }
  
  return response.json() as Promise<OIDCUserInfo>;
}

// Validate email domain against restrictions
export function validateEmailDomain(email: string, allowedDomains?: string[]): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true;
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return allowedDomains.some(allowed => domain === allowed.toLowerCase());
}

// Create SSO session
export async function createSSOSession(
  db: D1Database,
  input: Omit<SSOSession, 'id' | 'created_at'>
): Promise<SSOSession> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO sso_sessions (
      id, user_id, provider_id, external_user_id, state, nonce,
      id_token, access_token_id, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.user_id,
    input.provider_id,
    input.external_user_id || null,
    input.state || null,
    input.nonce || null,
    input.id_token || null,
    input.access_token_id || null,
    input.expires_at || null,
    now
  ).run();
  
  return {
    id,
    ...input,
    created_at: now
  };
}

// Get SSO session by state (for callback validation)
export async function getSSOSessionByState(db: D1Database, state: string): Promise<SSOSession | null> {
  const result = await db.prepare(`
    SELECT * FROM sso_sessions WHERE state = ? ORDER BY created_at DESC LIMIT 1
  `).bind(state).first();
  
  return result as SSOSession | null;
}

// Complete SSO login flow
export async function completeSSOLogin(
  db: D1Database,
  providerId: string,
  code: string,
  state: string,
  redirectUri: string,
  clientSecret: string
): Promise<{
  user: OIDCUserInfo;
  tokens: OIDCTokenResponse;
  isNewUser: boolean;
}> {
  const provider = await getSSOProvider(db, providerId);
  if (!provider) throw new Error('SSO provider not found');
  
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(db, providerId, code, redirectUri, clientSecret);
  
  // Get user info
  const userInfo = await getUserInfo(db, providerId, tokens.access_token);
  
  // Validate email domain
  if (userInfo.email && !validateEmailDomain(userInfo.email, provider.domain_restriction)) {
    throw new Error('Email domain not allowed for this SSO provider');
  }
  
  // Check if user exists
  const existingUser = await db.prepare(`
    SELECT id FROM users WHERE email = ? AND company_id = ?
  `).bind(userInfo.email, provider.company_id).first();
  
  let isNewUser = false;
  
  if (!existingUser && provider.auto_provision_users) {
    // Auto-provision new user
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await db.prepare(`
      INSERT INTO users (id, company_id, email, name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      userId,
      provider.company_id,
      userInfo.email,
      userInfo.name || userInfo.email,
      provider.default_role,
      now,
      now
    ).run();
    
    isNewUser = true;
  } else if (!existingUser) {
    throw new Error('User not found and auto-provisioning is disabled');
  }
  
  return {
    user: userInfo,
    tokens,
    isNewUser
  };
}

// Disable SSO provider
export async function disableSSOProvider(db: D1Database, providerId: string): Promise<void> {
  await db.prepare(`
    UPDATE sso_providers SET is_active = 0, updated_at = ? WHERE id = ?
  `).bind(new Date().toISOString(), providerId).run();
}

// Update SSO provider
export async function updateSSOProvider(
  db: D1Database,
  providerId: string,
  updates: Partial<Omit<SSOProvider, 'id' | 'company_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const now = new Date().toISOString();
  const setClauses: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];
  
  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    values.push(updates.name);
  }
  if (updates.client_id !== undefined) {
    setClauses.push('client_id = ?');
    values.push(updates.client_id);
  }
  if (updates.scopes !== undefined) {
    setClauses.push('scopes = ?');
    values.push(updates.scopes);
  }
  if (updates.domain_restriction !== undefined) {
    setClauses.push('domain_restriction = ?');
    values.push(updates.domain_restriction ? JSON.stringify(updates.domain_restriction) : null);
  }
  if (updates.auto_provision_users !== undefined) {
    setClauses.push('auto_provision_users = ?');
    values.push(updates.auto_provision_users ? 1 : 0);
  }
  if (updates.default_role !== undefined) {
    setClauses.push('default_role = ?');
    values.push(updates.default_role);
  }
  
  values.push(providerId);
  
  await db.prepare(`
    UPDATE sso_providers SET ${setClauses.join(', ')} WHERE id = ?
  `).bind(...values).run();
}
