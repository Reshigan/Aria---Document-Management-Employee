/**
 * Admin Routes
 * Company Settings, System Configuration
 */

import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';
import { jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Helper to verify JWT and get company_id
async function getAuthenticatedCompanyId(c: any): Promise<string | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const token = authHeader.substring(7);
    const secretKey = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return (payload as any).company_id || null;
  } catch {
    return null;
  }
}

// Generate UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

// ==================== COMPANY SETTINGS ====================

// Get company settings
app.get('/company', async (c) => {
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const company = await c.env.DB.prepare(
      'SELECT * FROM companies WHERE id = ?'
    ).bind(companyId).first();
    
    if (!company) {
      // Return default settings if company not found
      return c.json({
        id: companyId,
        name: 'My Company',
        registration_number: '',
        vat_number: '',
        tax_number: '',
        bbbee_level: 0,
        sars_tax_number: '',
        financial_year_end: new Date().toISOString().split('T')[0],
        vat_rate: 15.0,
        currency: 'ZAR',
        address: {
          street: '',
          city: '',
          province: '',
          postal_code: '',
          country: 'South Africa'
        },
        contact: {
          phone: '',
          email: '',
          website: ''
        },
        bank_details: {
          bank_name: '',
          account_holder: '',
          account_number: '',
          branch_code: '',
          account_type: 'Current',
          swift_code: ''
        }
      });
    }
    
    // Parse JSON fields
    const settings = {
      id: (company as any).id,
      name: (company as any).name,
      registration_number: (company as any).registration_number || '',
      vat_number: (company as any).vat_number || '',
      tax_number: (company as any).tax_number || '',
      bbbee_level: (company as any).bbbee_level || 0,
      bbbee_certificate_url: (company as any).bbbee_certificate_url,
      bbbee_expiry_date: (company as any).bbbee_expiry_date,
      sars_tax_number: (company as any).sars_tax_number || '',
      sars_paye_number: (company as any).sars_paye_number,
      sars_uif_number: (company as any).sars_uif_number,
      sars_sdl_number: (company as any).sars_sdl_number,
      financial_year_end: (company as any).financial_year_end || new Date().toISOString().split('T')[0],
      vat_rate: (company as any).vat_rate || 15.0,
      currency: (company as any).currency || 'ZAR',
      logo_url: (company as any).logo_url,
      primary_color: (company as any).primary_color,
      secondary_color: (company as any).secondary_color,
      address: (company as any).address ? JSON.parse((company as any).address) : {
        street: '',
        city: '',
        province: '',
        postal_code: '',
        country: 'South Africa'
      },
      contact: (company as any).contact ? JSON.parse((company as any).contact) : {
        phone: '',
        email: '',
        website: ''
      },
      bank_details: (company as any).bank_details ? JSON.parse((company as any).bank_details) : {
        bank_name: '',
        account_holder: '',
        account_number: '',
        branch_code: '',
        account_type: 'Current',
        swift_code: ''
      }
    };
    
    return c.json(settings);
  } catch (error) {
    console.error('Error loading company settings:', error);
    return c.json({ error: 'Failed to load company settings' }, 500);
  }
});

// Update company settings
app.put('/company', async (c) => {
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const now = new Date().toISOString();
    
    // Check if company exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM companies WHERE id = ?'
    ).bind(companyId).first();
    
    if (existing) {
      // Update existing company
      await c.env.DB.prepare(`
        UPDATE companies SET
          name = ?,
          registration_number = ?,
          vat_number = ?,
          tax_number = ?,
          bbbee_level = ?,
          bbbee_certificate_url = ?,
          bbbee_expiry_date = ?,
          sars_tax_number = ?,
          sars_paye_number = ?,
          sars_uif_number = ?,
          sars_sdl_number = ?,
          financial_year_end = ?,
          vat_rate = ?,
          currency = ?,
          logo_url = ?,
          primary_color = ?,
          secondary_color = ?,
          address = ?,
          contact = ?,
          bank_details = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        body.name,
        body.registration_number,
        body.vat_number,
        body.tax_number,
        body.bbbee_level,
        body.bbbee_certificate_url || null,
        body.bbbee_expiry_date || null,
        body.sars_tax_number,
        body.sars_paye_number || null,
        body.sars_uif_number || null,
        body.sars_sdl_number || null,
        body.financial_year_end,
        body.vat_rate,
        body.currency,
        body.logo_url || null,
        body.primary_color || null,
        body.secondary_color || null,
        JSON.stringify(body.address),
        JSON.stringify(body.contact),
        JSON.stringify(body.bank_details),
        now,
        companyId
      ).run();
    } else {
      // Insert new company
      await c.env.DB.prepare(`
        INSERT INTO companies (
          id, name, registration_number, vat_number, tax_number, bbbee_level,
          bbbee_certificate_url, bbbee_expiry_date, sars_tax_number, sars_paye_number,
          sars_uif_number, sars_sdl_number, financial_year_end, vat_rate, currency,
          logo_url, primary_color, secondary_color, address, contact, bank_details,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        companyId,
        body.name,
        body.registration_number,
        body.vat_number,
        body.tax_number,
        body.bbbee_level,
        body.bbbee_certificate_url || null,
        body.bbbee_expiry_date || null,
        body.sars_tax_number,
        body.sars_paye_number || null,
        body.sars_uif_number || null,
        body.sars_sdl_number || null,
        body.financial_year_end,
        body.vat_rate,
        body.currency,
        body.logo_url || null,
        body.primary_color || null,
        body.secondary_color || null,
        JSON.stringify(body.address),
        JSON.stringify(body.contact),
        JSON.stringify(body.bank_details),
        now,
        now
      ).run();
    }
    
    return c.json({ message: 'Company settings saved successfully' });
  } catch (error) {
    console.error('Error saving company settings:', error);
    return c.json({ error: 'Failed to save company settings' }, 500);
  }
});

// Upload company logo
app.post('/company/logo', async (c) => {
  const companyId = await getAuthenticatedCompanyId(c);
  if (!companyId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const formData = await c.req.formData();
    const fileEntry = formData.get('logo');
    
    if (!fileEntry || typeof fileEntry === 'string') {
      return c.json({ error: 'No file uploaded' }, 400);
    }
    
    const file = fileEntry as unknown as File;
    
    // Upload to R2
    const key = `logos/${companyId}/${Date.now()}-${file.name}`;
    await c.env.DOCUMENTS.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type
      }
    });
    
    const url = `https://aria-documents.r2.dev/${key}`;
    
    // Update company logo URL
    await c.env.DB.prepare(
      'UPDATE companies SET logo_url = ?, updated_at = ? WHERE id = ?'
    ).bind(url, new Date().toISOString(), companyId).run();
    
    return c.json({ url });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return c.json({ error: 'Failed to upload logo' }, 500);
  }
});

export default app;
