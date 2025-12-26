// E-Invoicing Service - Peppol, ZATCA, FatturaPA, and other e-invoicing standards

import { D1Database } from '@cloudflare/workers-types';

interface EInvoiceConfig {
  id: string;
  company_id: string;
  country: string;
  scheme: 'peppol' | 'facturae' | 'fatturaPA' | 'ubl' | 'cii' | 'zatca' | 'gstn';
  sender_id?: string;
  endpoint_id?: string;
  certificate_token_id?: string;
  access_point_url?: string;
  test_mode: boolean;
  auto_send: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EInvoice {
  id: string;
  company_id: string;
  config_id: string;
  invoice_id: string;
  direction: 'outbound' | 'inbound';
  document_type: 'invoice' | 'credit_note' | 'debit_note';
  xml_content?: string;
  hash?: string;
  signature?: string;
  status: 'pending' | 'validated' | 'sent' | 'delivered' | 'accepted' | 'rejected' | 'failed';
  recipient_id?: string;
  transmission_id?: string;
  response_code?: string;
  response_message?: string;
  sent_at?: string;
  delivered_at?: string;
  response_at?: string;
  created_at: string;
  updated_at: string;
}

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  seller: {
    name: string;
    tax_id: string;
    address: {
      street: string;
      city: string;
      postal_code: string;
      country: string;
    };
    email?: string;
    phone?: string;
  };
  buyer: {
    name: string;
    tax_id?: string;
    address: {
      street: string;
      city: string;
      postal_code: string;
      country: string;
    };
    email?: string;
  };
  lines: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    tax_amount: number;
    line_total: number;
  }>;
  subtotal: number;
  tax_total: number;
  total: number;
  payment_terms?: string;
  notes?: string;
}

// Country-specific e-invoicing requirements
const COUNTRY_SCHEMES: Record<string, { scheme: string; mandatory: boolean; format: string }> = {
  IT: { scheme: 'fatturaPA', mandatory: true, format: 'FatturaPA XML' },
  SA: { scheme: 'zatca', mandatory: true, format: 'ZATCA UBL 2.1' },
  IN: { scheme: 'gstn', mandatory: true, format: 'GST e-Invoice JSON' },
  ES: { scheme: 'facturae', mandatory: true, format: 'Facturae 3.2.2' },
  DE: { scheme: 'peppol', mandatory: false, format: 'XRechnung/UBL' },
  FR: { scheme: 'peppol', mandatory: true, format: 'Factur-X/UBL' },
  PL: { scheme: 'peppol', mandatory: true, format: 'KSeF' },
  default: { scheme: 'ubl', mandatory: false, format: 'UBL 2.1' }
};

// Create e-invoice configuration
export async function createEInvoiceConfig(
  db: D1Database,
  input: Omit<EInvoiceConfig, 'id' | 'created_at' | 'updated_at' | 'is_active'>
): Promise<EInvoiceConfig> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO einvoice_configs (
      id, company_id, country, scheme, sender_id, endpoint_id,
      certificate_token_id, access_point_url, test_mode, auto_send,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.country,
    input.scheme,
    input.sender_id || null,
    input.endpoint_id || null,
    input.certificate_token_id || null,
    input.access_point_url || null,
    input.test_mode ? 1 : 0,
    input.auto_send ? 1 : 0,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    is_active: true,
    created_at: now,
    updated_at: now
  };
}

// Get e-invoice config
export async function getEInvoiceConfig(db: D1Database, configId: string): Promise<EInvoiceConfig | null> {
  const result = await db.prepare(`
    SELECT * FROM einvoice_configs WHERE id = ?
  `).bind(configId).first();
  
  if (!result) return null;
  
  return {
    ...result,
    test_mode: Boolean(result.test_mode),
    auto_send: Boolean(result.auto_send),
    is_active: Boolean(result.is_active)
  } as EInvoiceConfig;
}

// Get config by country
export async function getEInvoiceConfigByCountry(
  db: D1Database,
  companyId: string,
  country: string
): Promise<EInvoiceConfig | null> {
  const result = await db.prepare(`
    SELECT * FROM einvoice_configs WHERE company_id = ? AND country = ? AND is_active = 1
  `).bind(companyId, country).first();
  
  if (!result) return null;
  
  return {
    ...result,
    test_mode: Boolean(result.test_mode),
    auto_send: Boolean(result.auto_send),
    is_active: Boolean(result.is_active)
  } as EInvoiceConfig;
}

// Generate UBL 2.1 XML
function generateUBLXML(invoice: InvoiceData, documentType: 'invoice' | 'credit_note' | 'debit_note'): string {
  // UBL document type codes: 380 = Invoice, 381 = Credit Note, 383 = Debit Note
  const docTypeCode = documentType === 'invoice' ? '380' : documentType === 'credit_note' ? '381' : '383';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ID>${escapeXml(invoice.invoice_number)}</cbc:ID>
  <cbc:IssueDate>${invoice.invoice_date}</cbc:IssueDate>
  <cbc:DueDate>${invoice.due_date}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${docTypeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(invoice.seller.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(invoice.seller.address.street)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(invoice.seller.address.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(invoice.seller.address.postal_code)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${invoice.seller.address.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(invoice.seller.tax_id)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(invoice.buyer.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(invoice.buyer.address.street)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(invoice.buyer.address.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(invoice.buyer.address.postal_code)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${invoice.buyer.address.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${invoice.buyer.tax_id ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(invoice.buyer.tax_id)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${invoice.currency}">${invoice.tax_total.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  ${invoice.lines.map((line, idx) => `
  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${line.line_total.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${escapeXml(line.description)}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${invoice.currency}">${line.unit_price.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`).join('')}
</Invoice>`;
}

// Generate ZATCA XML (Saudi Arabia)
function generateZATCAXML(invoice: InvoiceData): string {
  // ZATCA uses UBL 2.1 with specific extensions
  const baseXml = generateUBLXML(invoice, 'invoice');
  // In production, would add ZATCA-specific elements and QR code
  return baseXml;
}

// Generate FatturaPA XML (Italy)
function generateFatturaPAXML(invoice: InvoiceData): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"
                      versione="FPR12">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>${invoice.seller.address.country}</IdPaese>
        <IdCodice>${escapeXml(invoice.seller.tax_id)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${invoice.invoice_number}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>${invoice.seller.address.country}</IdPaese>
          <IdCodice>${escapeXml(invoice.seller.tax_id)}</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>${escapeXml(invoice.seller.name)}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(invoice.seller.address.street)}</Indirizzo>
        <CAP>${escapeXml(invoice.seller.address.postal_code)}</CAP>
        <Comune>${escapeXml(invoice.seller.address.city)}</Comune>
        <Nazione>${invoice.seller.address.country}</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        ${invoice.buyer.tax_id ? `
        <IdFiscaleIVA>
          <IdPaese>${invoice.buyer.address.country}</IdPaese>
          <IdCodice>${escapeXml(invoice.buyer.tax_id)}</IdCodice>
        </IdFiscaleIVA>` : ''}
        <Anagrafica>
          <Denominazione>${escapeXml(invoice.buyer.name)}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(invoice.buyer.address.street)}</Indirizzo>
        <CAP>${escapeXml(invoice.buyer.address.postal_code)}</CAP>
        <Comune>${escapeXml(invoice.buyer.address.city)}</Comune>
        <Nazione>${invoice.buyer.address.country}</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>${invoice.currency}</Divisa>
        <Data>${invoice.invoice_date}</Data>
        <Numero>${escapeXml(invoice.invoice_number)}</Numero>
        <ImportoTotaleDocumento>${invoice.total.toFixed(2)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      ${invoice.lines.map((line, idx) => `
      <DettaglioLinee>
        <NumeroLinea>${idx + 1}</NumeroLinea>
        <Descrizione>${escapeXml(line.description)}</Descrizione>
        <Quantita>${line.quantity.toFixed(2)}</Quantita>
        <PrezzoUnitario>${line.unit_price.toFixed(2)}</PrezzoUnitario>
        <PrezzoTotale>${line.line_total.toFixed(2)}</PrezzoTotale>
        <AliquotaIVA>${line.tax_rate.toFixed(2)}</AliquotaIVA>
      </DettaglioLinee>`).join('')}
      <DatiRiepilogo>
        <AliquotaIVA>${(invoice.lines[0]?.tax_rate || 0).toFixed(2)}</AliquotaIVA>
        <ImponibileImporto>${invoice.subtotal.toFixed(2)}</ImponibileImporto>
        <Imposta>${invoice.tax_total.toFixed(2)}</Imposta>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;
}

// Escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate e-invoice XML based on scheme
export function generateEInvoiceXML(
  invoice: InvoiceData,
  scheme: EInvoiceConfig['scheme'],
  documentType: 'invoice' | 'credit_note' | 'debit_note' = 'invoice'
): string {
  switch (scheme) {
    case 'fatturaPA':
      return generateFatturaPAXML(invoice);
    case 'zatca':
      return generateZATCAXML(invoice);
    case 'ubl':
    case 'peppol':
    case 'cii':
    default:
      return generateUBLXML(invoice, documentType);
  }
}

// Calculate document hash
async function calculateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Create e-invoice record
export async function createEInvoice(
  db: D1Database,
  input: {
    company_id: string;
    config_id: string;
    invoice_id: string;
    direction: EInvoice['direction'];
    document_type: EInvoice['document_type'];
    recipient_id?: string;
  },
  invoiceData: InvoiceData
): Promise<EInvoice> {
  const config = await getEInvoiceConfig(db, input.config_id);
  if (!config) throw new Error('E-invoice config not found');
  
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Generate XML
  const xmlContent = generateEInvoiceXML(invoiceData, config.scheme, input.document_type);
  const hash = await calculateHash(xmlContent);
  
  await db.prepare(`
    INSERT INTO einvoices (
      id, company_id, config_id, invoice_id, direction, document_type,
      xml_content, hash, status, recipient_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.config_id,
    input.invoice_id,
    input.direction,
    input.document_type,
    xmlContent,
    hash,
    input.recipient_id || null,
    now,
    now
  ).run();
  
  return {
    id,
    company_id: input.company_id,
    config_id: input.config_id,
    invoice_id: input.invoice_id,
    direction: input.direction,
    document_type: input.document_type,
    xml_content: xmlContent,
    hash,
    status: 'pending',
    recipient_id: input.recipient_id,
    created_at: now,
    updated_at: now
  };
}

// Validate e-invoice
export async function validateEInvoice(
  db: D1Database,
  einvoiceId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const einvoice = await db.prepare(`
    SELECT * FROM einvoices WHERE id = ?
  `).bind(einvoiceId).first<EInvoice>();
  
  if (!einvoice) throw new Error('E-invoice not found');
  
  const errors: string[] = [];
  
  // Basic XML validation
  if (!einvoice.xml_content) {
    errors.push('XML content is missing');
  } else {
    // Check for required elements
    if (!einvoice.xml_content.includes('<cbc:ID>') && !einvoice.xml_content.includes('<Numero>')) {
      errors.push('Invoice number is missing');
    }
    if (!einvoice.xml_content.includes('<cbc:IssueDate>') && !einvoice.xml_content.includes('<Data>')) {
      errors.push('Issue date is missing');
    }
  }
  
  const valid = errors.length === 0;
  const now = new Date().toISOString();
  
  // Update status
  await db.prepare(`
    UPDATE einvoices SET status = ?, updated_at = ? WHERE id = ?
  `).bind(valid ? 'validated' : 'failed', now, einvoiceId).run();
  
  return { valid, errors };
}

// Send e-invoice to access point
export async function sendEInvoice(
  db: D1Database,
  einvoiceId: string
): Promise<{ success: boolean; transmission_id?: string; error?: string }> {
  const einvoice = await db.prepare(`
    SELECT e.*, c.access_point_url, c.test_mode
    FROM einvoices e
    JOIN einvoice_configs c ON e.config_id = c.id
    WHERE e.id = ?
  `).bind(einvoiceId).first();
  
  if (!einvoice) throw new Error('E-invoice not found');
  
  const now = new Date().toISOString();
  
  // In production, this would send to the actual access point
  // For now, simulate successful transmission
  const transmissionId = `TX-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  if ((einvoice as { test_mode: number }).test_mode) {
    console.log(`[TEST MODE] Sending e-invoice ${einvoiceId} to access point`);
  }
  
  await db.prepare(`
    UPDATE einvoices 
    SET status = 'sent', transmission_id = ?, sent_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(transmissionId, now, now, einvoiceId).run();
  
  return { success: true, transmission_id: transmissionId };
}

// Update e-invoice status from response
export async function updateEInvoiceStatus(
  db: D1Database,
  einvoiceId: string,
  status: EInvoice['status'],
  responseCode?: string,
  responseMessage?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE einvoices 
    SET status = ?, response_code = ?, response_message = ?, 
        response_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(status, responseCode || null, responseMessage || null, now, now, einvoiceId).run();
}

// Get e-invoice by ID
export async function getEInvoice(db: D1Database, einvoiceId: string): Promise<EInvoice | null> {
  const result = await db.prepare(`
    SELECT * FROM einvoices WHERE id = ?
  `).bind(einvoiceId).first();
  
  return result as EInvoice | null;
}

// List e-invoices
export async function listEInvoices(
  db: D1Database,
  companyId: string,
  options: { status?: EInvoice['status']; direction?: EInvoice['direction']; limit?: number } = {}
): Promise<EInvoice[]> {
  let query = 'SELECT * FROM einvoices WHERE company_id = ?';
  const params: (string | number)[] = [companyId];
  
  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }
  
  if (options.direction) {
    query += ' AND direction = ?';
    params.push(options.direction);
  }
  
  query += ' ORDER BY created_at DESC';
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []) as unknown as EInvoice[];
}

// Get e-invoicing summary
export async function getEInvoiceSummary(
  db: D1Database,
  companyId: string
): Promise<{
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  accepted: number;
  rejected: number;
  failed: number;
}> {
  const result = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM einvoices WHERE company_id = ?
  `).bind(companyId).first();
  
  return result as {
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    accepted: number;
    rejected: number;
    failed: number;
  };
}

// Check if e-invoicing is required for a country
export function isEInvoicingRequired(country: string): boolean {
  const config = COUNTRY_SCHEMES[country] || COUNTRY_SCHEMES.default;
  return config.mandatory;
}

// Get recommended scheme for a country
export function getRecommendedScheme(country: string): { scheme: string; format: string } {
  const config = COUNTRY_SCHEMES[country] || COUNTRY_SCHEMES.default;
  return { scheme: config.scheme, format: config.format };
}
