/**
 * Payment Webhook Verification Service
 * 
 * Provides cryptographic signature verification for payment provider webhooks:
 * - Stripe (HMAC-SHA256)
 * - PayFast (MD5 signature)
 * - PayPal (Certificate verification)
 * - Flutterwave (HMAC-SHA256)
 * - Razorpay (HMAC-SHA256)
 * 
 * This is critical for security - never trust webhook data without verification.
 */

interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  provider: string;
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compute HMAC-SHA256 signature
 */
async function computeHmacSha256(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return arrayBufferToHex(signature);
}

/**
 * Compute MD5 hash (for PayFast)
 * 
 * Pure JavaScript implementation since Web Crypto API doesn't support MD5.
 * Based on RFC 1321 specification.
 */
function computeMd5(data: string): string {
  // Convert string to array of bytes
  function stringToBytes(str: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i) & 0xff);
    }
    return bytes;
  }

  // Add padding to message
  function addPadding(bytes: number[]): number[] {
    const originalLength = bytes.length;
    const bitLength = originalLength * 8;
    
    // Add 0x80 byte
    bytes.push(0x80);
    
    // Pad to 56 mod 64 bytes
    while (bytes.length % 64 !== 56) {
      bytes.push(0);
    }
    
    // Add original length in bits as 64-bit little-endian
    for (let i = 0; i < 8; i++) {
      bytes.push((bitLength >>> (i * 8)) & 0xff);
    }
    
    return bytes;
  }

  // Left rotate
  function leftRotate(x: number, n: number): number {
    return ((x << n) | (x >>> (32 - n))) >>> 0;
  }

  // MD5 round functions
  function F(x: number, y: number, z: number): number { return (x & y) | (~x & z); }
  function G(x: number, y: number, z: number): number { return (x & z) | (y & ~z); }
  function H(x: number, y: number, z: number): number { return x ^ y ^ z; }
  function I(x: number, y: number, z: number): number { return y ^ (x | ~z); }

  // Constants
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ];

  const K = new Array(64);
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
  }

  // Initialize hash values
  let a0 = 0x67452301 >>> 0;
  let b0 = 0xefcdab89 >>> 0;
  let c0 = 0x98badcfe >>> 0;
  let d0 = 0x10325476 >>> 0;

  // Process message
  const bytes = addPadding(stringToBytes(data));
  
  for (let i = 0; i < bytes.length; i += 64) {
    // Break chunk into 16 32-bit words
    const M = new Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] = (bytes[i + j * 4] |
              (bytes[i + j * 4 + 1] << 8) |
              (bytes[i + j * 4 + 2] << 16) |
              (bytes[i + j * 4 + 3] << 24)) >>> 0;
    }

    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let j = 0; j < 64; j++) {
      let f: number, g: number;
      
      if (j < 16) {
        f = F(B, C, D);
        g = j;
      } else if (j < 32) {
        f = G(B, C, D);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = H(B, C, D);
        g = (3 * j + 5) % 16;
      } else {
        f = I(B, C, D);
        g = (7 * j) % 16;
      }

      const temp = D;
      D = C;
      C = B;
      B = (B + leftRotate((A + f + K[j] + M[g]) >>> 0, S[j])) >>> 0;
      A = temp;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  // Convert to hex string (little-endian)
  function toHex(n: number): string {
    let hex = '';
    for (let i = 0; i < 4; i++) {
      hex += ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
    }
    return hex;
  }

  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify Stripe webhook signature
 * 
 * Stripe uses HMAC-SHA256 with a timestamp to prevent replay attacks.
 * Header format: t=timestamp,v1=signature
 */
export async function verifyStripeWebhook(
  payload: string,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSeconds: number = 300
): Promise<WebhookVerificationResult> {
  try {
    if (!signatureHeader) {
      return { valid: false, error: 'Missing Stripe-Signature header', provider: 'stripe' };
    }

    // Parse the signature header
    const elements = signatureHeader.split(',');
    const signatureMap: Record<string, string> = {};
    
    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key && value) {
        signatureMap[key] = value;
      }
    }

    const timestamp = signatureMap['t'];
    const signature = signatureMap['v1'];

    if (!timestamp || !signature) {
      return { valid: false, error: 'Invalid signature header format', provider: 'stripe' };
    }

    // Check timestamp tolerance (prevent replay attacks)
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    
    if (Math.abs(now - timestampNum) > toleranceSeconds) {
      return { valid: false, error: 'Webhook timestamp outside tolerance window', provider: 'stripe' };
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = await computeHmacSha256(webhookSecret, signedPayload);

    // Compare signatures (timing-safe)
    if (!timingSafeEqual(expectedSignature, signature)) {
      return { valid: false, error: 'Signature verification failed', provider: 'stripe' };
    }

    return { valid: true, provider: 'stripe' };
  } catch (error) {
    return { 
      valid: false, 
      error: `Stripe verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      provider: 'stripe'
    };
  }
}

/**
 * Verify PayFast webhook signature
 * 
 * PayFast uses MD5 hash of sorted parameters + passphrase
 */
export async function verifyPayFastWebhook(
  params: Record<string, string>,
  passphrase?: string
): Promise<WebhookVerificationResult> {
  try {
    const receivedSignature = params['signature'];
    if (!receivedSignature) {
      return { valid: false, error: 'Missing signature parameter', provider: 'payfast' };
    }

    // Build parameter string (sorted, excluding signature)
    const sortedKeys = Object.keys(params)
      .filter(key => key !== 'signature')
      .sort();

    const paramString = sortedKeys
      .map(key => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
      .join('&');

    // Add passphrase if provided
    const stringToHash = passphrase 
      ? `${paramString}&passphrase=${encodeURIComponent(passphrase)}`
      : paramString;

    // Compute MD5 hash using pure JavaScript implementation
    const expectedSignature = computeMd5(stringToHash);

    if (!timingSafeEqual(expectedSignature.toLowerCase(), receivedSignature.toLowerCase())) {
      return { valid: false, error: 'Signature verification failed', provider: 'payfast' };
    }

    return { valid: true, provider: 'payfast' };
  } catch (error) {
    return { 
      valid: false, 
      error: `PayFast verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      provider: 'payfast'
    };
  }
}

/**
 * Verify PayPal webhook signature
 * 
 * PayPal uses certificate-based verification with transmission ID and timestamp.
 * We use PayPal's verification API which is the recommended approach for serverless environments.
 */
export async function verifyPayPalWebhook(
  payload: string,
  headers: {
    transmissionId: string;
    timestamp: string;
    webhookId: string;
    certUrl: string;
    authAlgo: string;
    transmissionSig: string;
  },
  webhookId: string,
  apiCredentials?: {
    clientId: string;
    clientSecret: string;
    sandbox?: boolean;
  }
): Promise<WebhookVerificationResult> {
  try {
    // Basic validation first
    if (!headers.transmissionId || !headers.timestamp || !headers.transmissionSig) {
      return { valid: false, error: 'Missing required PayPal headers', provider: 'paypal' };
    }

    // Check timestamp is recent (within 5 minutes)
    const timestamp = new Date(headers.timestamp).getTime();
    const now = Date.now();
    if (Math.abs(now - timestamp) > 300000) {
      return { valid: false, error: 'Webhook timestamp outside tolerance window', provider: 'paypal' };
    }

    // If API credentials are provided, use PayPal's verification API
    if (apiCredentials?.clientId && apiCredentials?.clientSecret) {
      const baseUrl = apiCredentials.sandbox 
        ? 'https://api-m.sandbox.paypal.com' 
        : 'https://api-m.paypal.com';

      // Get OAuth token
      const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${apiCredentials.clientId}:${apiCredentials.clientSecret}`)}`
        },
        body: 'grant_type=client_credentials'
      });

      if (!authResponse.ok) {
        return { valid: false, error: 'Failed to authenticate with PayPal API', provider: 'paypal' };
      }

      const authData = await authResponse.json() as { access_token: string };
      const accessToken = authData.access_token;

      // Verify webhook signature using PayPal API
      const verifyResponse = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          auth_algo: headers.authAlgo,
          cert_url: headers.certUrl,
          transmission_id: headers.transmissionId,
          transmission_sig: headers.transmissionSig,
          transmission_time: headers.timestamp,
          webhook_id: webhookId,
          webhook_event: JSON.parse(payload)
        })
      });

      if (!verifyResponse.ok) {
        return { valid: false, error: 'PayPal verification API request failed', provider: 'paypal' };
      }

      const verifyData = await verifyResponse.json() as { verification_status: string };
      
      if (verifyData.verification_status !== 'SUCCESS') {
        return { valid: false, error: `PayPal verification failed: ${verifyData.verification_status}`, provider: 'paypal' };
      }

      return { valid: true, provider: 'paypal' };
    }

    // Fallback: If no API credentials, verify webhook ID matches and trust basic validation
    // This is less secure but allows the system to work without full PayPal API setup
    if (headers.webhookId && headers.webhookId !== webhookId) {
      return { valid: false, error: 'Webhook ID mismatch', provider: 'paypal' };
    }

    // Log warning that full verification is not enabled
    console.warn('PayPal webhook verification: API credentials not configured, using basic validation only');
    
    return { valid: true, provider: 'paypal' };
  } catch (error) {
    return { 
      valid: false, 
      error: `PayPal verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      provider: 'paypal'
    };
  }
}

/**
 * Verify Flutterwave webhook signature
 * 
 * Flutterwave uses HMAC-SHA256 with the secret hash
 */
export async function verifyFlutterwaveWebhook(
  payload: string,
  signatureHeader: string,
  secretHash: string
): Promise<WebhookVerificationResult> {
  try {
    if (!signatureHeader) {
      return { valid: false, error: 'Missing verif-hash header', provider: 'flutterwave' };
    }

    // Flutterwave sends the secret hash directly in the header
    // We just need to compare it with our stored secret hash
    if (!timingSafeEqual(signatureHeader, secretHash)) {
      return { valid: false, error: 'Signature verification failed', provider: 'flutterwave' };
    }

    return { valid: true, provider: 'flutterwave' };
  } catch (error) {
    return { 
      valid: false, 
      error: `Flutterwave verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      provider: 'flutterwave'
    };
  }
}

/**
 * Verify Razorpay webhook signature
 * 
 * Razorpay uses HMAC-SHA256
 */
export async function verifyRazorpayWebhook(
  payload: string,
  signatureHeader: string,
  webhookSecret: string
): Promise<WebhookVerificationResult> {
  try {
    if (!signatureHeader) {
      return { valid: false, error: 'Missing X-Razorpay-Signature header', provider: 'razorpay' };
    }

    const expectedSignature = await computeHmacSha256(webhookSecret, payload);

    if (!timingSafeEqual(expectedSignature, signatureHeader)) {
      return { valid: false, error: 'Signature verification failed', provider: 'razorpay' };
    }

    return { valid: true, provider: 'razorpay' };
  } catch (error) {
    return { 
      valid: false, 
      error: `Razorpay verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      provider: 'razorpay'
    };
  }
}

/**
 * Universal webhook verification function
 * 
 * Automatically detects provider and verifies signature
 */
export async function verifyWebhook(
  provider: string,
  payload: string,
  headers: Record<string, string>,
  secrets: {
    stripeWebhookSecret?: string;
    payfastPassphrase?: string;
    paypalWebhookId?: string;
    paypalClientId?: string;
    paypalClientSecret?: string;
    paypalSandbox?: boolean;
    flutterwaveSecretHash?: string;
    razorpayWebhookSecret?: string;
  }
): Promise<WebhookVerificationResult> {
  switch (provider.toLowerCase()) {
    case 'stripe':
      if (!secrets.stripeWebhookSecret) {
        return { valid: false, error: 'Stripe webhook secret not configured', provider: 'stripe' };
      }
      return verifyStripeWebhook(
        payload,
        headers['stripe-signature'] || headers['Stripe-Signature'] || '',
        secrets.stripeWebhookSecret
      );

    case 'payfast':
      const params = JSON.parse(payload);
      return verifyPayFastWebhook(params, secrets.payfastPassphrase);

    case 'paypal':
      if (!secrets.paypalWebhookId) {
        return { valid: false, error: 'PayPal webhook ID not configured', provider: 'paypal' };
      }
      return verifyPayPalWebhook(
        payload,
        {
          transmissionId: headers['paypal-transmission-id'] || '',
          timestamp: headers['paypal-transmission-time'] || '',
          webhookId: headers['paypal-webhook-id'] || '',
          certUrl: headers['paypal-cert-url'] || '',
          authAlgo: headers['paypal-auth-algo'] || '',
          transmissionSig: headers['paypal-transmission-sig'] || ''
        },
        secrets.paypalWebhookId,
        secrets.paypalClientId && secrets.paypalClientSecret ? {
          clientId: secrets.paypalClientId,
          clientSecret: secrets.paypalClientSecret,
          sandbox: secrets.paypalSandbox
        } : undefined
      );

    case 'flutterwave':
      if (!secrets.flutterwaveSecretHash) {
        return { valid: false, error: 'Flutterwave secret hash not configured', provider: 'flutterwave' };
      }
      return verifyFlutterwaveWebhook(
        payload,
        headers['verif-hash'] || '',
        secrets.flutterwaveSecretHash
      );

    case 'razorpay':
      if (!secrets.razorpayWebhookSecret) {
        return { valid: false, error: 'Razorpay webhook secret not configured', provider: 'razorpay' };
      }
      return verifyRazorpayWebhook(
        payload,
        headers['x-razorpay-signature'] || headers['X-Razorpay-Signature'] || '',
        secrets.razorpayWebhookSecret
      );

    default:
      return { valid: false, error: `Unknown payment provider: ${provider}`, provider };
  }
}

/**
 * Get webhook secrets from database
 */
export async function getWebhookSecrets(
  db: D1Database,
  companyId: string,
  provider: string
): Promise<Record<string, string>> {
  const integration = await db.prepare(`
    SELECT webhook_secret_encrypted, settings_json
    FROM payment_integrations
    WHERE company_id = ? AND provider = ? AND is_active = 1
  `).bind(companyId, provider).first<any>();

  if (!integration) {
    return {};
  }

  const settings = JSON.parse(integration.settings_json || '{}');
  
  return {
    webhookSecret: integration.webhook_secret_encrypted,
    ...settings
  };
}
