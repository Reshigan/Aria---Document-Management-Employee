// Shipping Carrier Service - FedEx/UPS/DHL via aggregator (Shippo/EasyPost)

import { D1Database } from '@cloudflare/workers-types';

interface ShippingCarrier {
  id: string;
  company_id: string;
  connector_id?: string;
  carrier_code: string;
  carrier_name: string;
  account_number?: string;
  is_aggregator: boolean;
  supported_services?: string[];
  default_service?: string;
  markup_type: 'none' | 'percentage' | 'fixed';
  markup_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ShippingRate {
  id: string;
  company_id: string;
  carrier_id: string;
  quote_id?: string;
  service_code: string;
  service_name?: string;
  origin_postal: string;
  destination_postal: string;
  destination_country: string;
  weight: number;
  weight_unit: string;
  dimensions?: { length: number; width: number; height: number };
  rate: number;
  currency: string;
  estimated_days?: number;
  valid_until?: string;
  created_at: string;
}

interface Shipment {
  id: string;
  company_id: string;
  carrier_id: string;
  sales_order_id?: string;
  delivery_note_id?: string;
  tracking_number?: string;
  carrier_tracking_url?: string;
  service_code?: string;
  label_url?: string;
  label_format: string;
  ship_date?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  status: 'pending' | 'label_created' | 'in_transit' | 'delivered' | 'exception' | 'returned';
  shipping_cost?: number;
  insurance_cost?: number;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  from_address: Address;
  to_address: Address;
  packages?: Package[];
  created_at: string;
  updated_at: string;
}

interface Address {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  email?: string;
}

interface Package {
  weight: number;
  weight_unit: string;
  length: number;
  width: number;
  height: number;
  dimension_unit: string;
}

// Carrier service codes
const CARRIER_SERVICES: Record<string, Array<{ code: string; name: string }>> = {
  fedex: [
    { code: 'FEDEX_GROUND', name: 'FedEx Ground' },
    { code: 'FEDEX_EXPRESS_SAVER', name: 'FedEx Express Saver' },
    { code: 'FEDEX_2_DAY', name: 'FedEx 2Day' },
    { code: 'STANDARD_OVERNIGHT', name: 'FedEx Standard Overnight' },
    { code: 'PRIORITY_OVERNIGHT', name: 'FedEx Priority Overnight' },
    { code: 'FEDEX_INTERNATIONAL_ECONOMY', name: 'FedEx International Economy' },
    { code: 'FEDEX_INTERNATIONAL_PRIORITY', name: 'FedEx International Priority' }
  ],
  ups: [
    { code: 'UPS_GROUND', name: 'UPS Ground' },
    { code: 'UPS_3_DAY_SELECT', name: 'UPS 3 Day Select' },
    { code: 'UPS_2ND_DAY_AIR', name: 'UPS 2nd Day Air' },
    { code: 'UPS_NEXT_DAY_AIR_SAVER', name: 'UPS Next Day Air Saver' },
    { code: 'UPS_NEXT_DAY_AIR', name: 'UPS Next Day Air' },
    { code: 'UPS_WORLDWIDE_EXPEDITED', name: 'UPS Worldwide Expedited' },
    { code: 'UPS_WORLDWIDE_EXPRESS', name: 'UPS Worldwide Express' }
  ],
  dhl: [
    { code: 'DHL_EXPRESS_WORLDWIDE', name: 'DHL Express Worldwide' },
    { code: 'DHL_EXPRESS_12', name: 'DHL Express 12:00' },
    { code: 'DHL_EXPRESS_9', name: 'DHL Express 9:00' },
    { code: 'DHL_ECONOMY_SELECT', name: 'DHL Economy Select' }
  ],
  usps: [
    { code: 'USPS_FIRST_CLASS', name: 'USPS First Class' },
    { code: 'USPS_PRIORITY', name: 'USPS Priority Mail' },
    { code: 'USPS_EXPRESS', name: 'USPS Priority Mail Express' },
    { code: 'USPS_PARCEL_SELECT', name: 'USPS Parcel Select' }
  ]
};

// Create a shipping carrier
export async function createCarrier(
  db: D1Database,
  input: Omit<ShippingCarrier, 'id' | 'created_at' | 'updated_at' | 'is_active'>
): Promise<ShippingCarrier> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Get supported services for this carrier
  const services = CARRIER_SERVICES[input.carrier_code.toLowerCase()] || [];
  
  await db.prepare(`
    INSERT INTO shipping_carriers (
      id, company_id, connector_id, carrier_code, carrier_name, account_number,
      is_aggregator, supported_services, default_service, markup_type, markup_value,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.connector_id || null,
    input.carrier_code,
    input.carrier_name,
    input.account_number || null,
    input.is_aggregator ? 1 : 0,
    JSON.stringify(input.supported_services || services.map(s => s.code)),
    input.default_service || (services[0]?.code || null),
    input.markup_type || 'none',
    input.markup_value || 0,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    supported_services: input.supported_services || services.map(s => s.code),
    is_active: true,
    created_at: now,
    updated_at: now
  };
}

// Get carrier by ID
export async function getCarrier(db: D1Database, carrierId: string): Promise<ShippingCarrier | null> {
  const result = await db.prepare(`
    SELECT * FROM shipping_carriers WHERE id = ?
  `).bind(carrierId).first();
  
  if (!result) return null;
  
  return {
    ...result,
    supported_services: result.supported_services ? JSON.parse(result.supported_services as string) : undefined,
    is_aggregator: Boolean(result.is_aggregator),
    is_active: Boolean(result.is_active)
  } as ShippingCarrier;
}

// List carriers for a company
export async function listCarriers(db: D1Database, companyId: string): Promise<ShippingCarrier[]> {
  const results = await db.prepare(`
    SELECT * FROM shipping_carriers WHERE company_id = ? AND is_active = 1 ORDER BY carrier_name
  `).bind(companyId).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    supported_services: row.supported_services ? JSON.parse(row.supported_services as string) : undefined,
    is_aggregator: Boolean(row.is_aggregator),
    is_active: Boolean(row.is_active)
  })) as ShippingCarrier[];
}

// Get shipping rates (rate shopping)
export async function getRates(
  db: D1Database,
  companyId: string,
  fromAddress: Address,
  toAddress: Address,
  packages: Package[]
): Promise<ShippingRate[]> {
  const carriers = await listCarriers(db, companyId);
  const rates: ShippingRate[] = [];
  const now = new Date().toISOString();
  const validUntil = new Date(Date.now() + 24 * 3600000).toISOString(); // 24 hours
  
  // Calculate total weight
  const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);
  
  for (const carrier of carriers) {
    const services = carrier.supported_services || [];
    
    for (const serviceCode of services) {
      // Simulate rate calculation (in production, this would call the carrier API)
      const baseRate = calculateBaseRate(
        carrier.carrier_code,
        serviceCode,
        fromAddress.postal_code,
        toAddress.postal_code,
        toAddress.country,
        totalWeight
      );
      
      // Apply markup
      let finalRate = baseRate;
      if (carrier.markup_type === 'percentage') {
        finalRate = baseRate * (1 + carrier.markup_value / 100);
      } else if (carrier.markup_type === 'fixed') {
        finalRate = baseRate + carrier.markup_value;
      }
      
      const rateId = crypto.randomUUID();
      const serviceName = CARRIER_SERVICES[carrier.carrier_code.toLowerCase()]?.find(s => s.code === serviceCode)?.name || serviceCode;
      
      const rate: ShippingRate = {
        id: rateId,
        company_id: companyId,
        carrier_id: carrier.id,
        quote_id: crypto.randomUUID(),
        service_code: serviceCode,
        service_name: serviceName,
        origin_postal: fromAddress.postal_code,
        destination_postal: toAddress.postal_code,
        destination_country: toAddress.country,
        weight: totalWeight,
        weight_unit: packages[0]?.weight_unit || 'lb',
        rate: Math.round(finalRate * 100) / 100,
        currency: 'USD',
        estimated_days: getEstimatedDays(serviceCode),
        valid_until: validUntil,
        created_at: now
      };
      
      // Store rate in database
      await db.prepare(`
        INSERT INTO shipping_rates (
          id, company_id, carrier_id, quote_id, service_code, service_name,
          origin_postal, destination_postal, destination_country, weight, weight_unit,
          rate, currency, estimated_days, valid_until, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        rate.id,
        rate.company_id,
        rate.carrier_id,
        rate.quote_id,
        rate.service_code,
        rate.service_name,
        rate.origin_postal,
        rate.destination_postal,
        rate.destination_country,
        rate.weight,
        rate.weight_unit,
        rate.rate,
        rate.currency,
        rate.estimated_days,
        rate.valid_until,
        rate.created_at
      ).run();
      
      rates.push(rate);
    }
  }
  
  // Sort by rate
  return rates.sort((a, b) => a.rate - b.rate);
}

// Calculate base rate (simplified - in production would call carrier API)
function calculateBaseRate(
  carrierCode: string,
  serviceCode: string,
  originPostal: string,
  destPostal: string,
  destCountry: string,
  weight: number
): number {
  // Base rate per pound
  const baseRates: Record<string, number> = {
    'FEDEX_GROUND': 0.85,
    'FEDEX_EXPRESS_SAVER': 2.50,
    'FEDEX_2_DAY': 4.00,
    'STANDARD_OVERNIGHT': 8.00,
    'PRIORITY_OVERNIGHT': 12.00,
    'UPS_GROUND': 0.90,
    'UPS_3_DAY_SELECT': 2.75,
    'UPS_2ND_DAY_AIR': 4.25,
    'UPS_NEXT_DAY_AIR_SAVER': 8.50,
    'UPS_NEXT_DAY_AIR': 12.50,
    'DHL_EXPRESS_WORLDWIDE': 15.00,
    'DHL_ECONOMY_SELECT': 8.00,
    'USPS_FIRST_CLASS': 0.50,
    'USPS_PRIORITY': 1.50,
    'USPS_EXPRESS': 5.00
  };
  
  const ratePerPound = baseRates[serviceCode] || 2.00;
  let rate = Math.max(weight * ratePerPound, 5.00); // Minimum $5
  
  // International surcharge
  if (destCountry !== 'US' && destCountry !== 'USA') {
    rate *= 2.5;
  }
  
  // Zone-based adjustment (simplified)
  const originZone = parseInt(originPostal.substring(0, 3)) || 0;
  const destZone = parseInt(destPostal.substring(0, 3)) || 0;
  const zoneDiff = Math.abs(originZone - destZone);
  rate *= (1 + zoneDiff / 1000);
  
  return rate;
}

// Get estimated delivery days
function getEstimatedDays(serviceCode: string): number {
  const estimates: Record<string, number> = {
    'FEDEX_GROUND': 5,
    'FEDEX_EXPRESS_SAVER': 3,
    'FEDEX_2_DAY': 2,
    'STANDARD_OVERNIGHT': 1,
    'PRIORITY_OVERNIGHT': 1,
    'UPS_GROUND': 5,
    'UPS_3_DAY_SELECT': 3,
    'UPS_2ND_DAY_AIR': 2,
    'UPS_NEXT_DAY_AIR_SAVER': 1,
    'UPS_NEXT_DAY_AIR': 1,
    'DHL_EXPRESS_WORLDWIDE': 3,
    'DHL_ECONOMY_SELECT': 7,
    'USPS_FIRST_CLASS': 5,
    'USPS_PRIORITY': 3,
    'USPS_EXPRESS': 2
  };
  
  return estimates[serviceCode] || 5;
}

// Create a shipment
export async function createShipment(
  db: D1Database,
  input: Omit<Shipment, 'id' | 'created_at' | 'updated_at'>
): Promise<Shipment> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO shipments (
      id, company_id, carrier_id, sales_order_id, delivery_note_id,
      tracking_number, carrier_tracking_url, service_code, label_url, label_format,
      ship_date, estimated_delivery, status, shipping_cost, insurance_cost,
      weight, dimensions, from_address, to_address, packages, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.carrier_id,
    input.sales_order_id || null,
    input.delivery_note_id || null,
    input.tracking_number || null,
    input.carrier_tracking_url || null,
    input.service_code || null,
    input.label_url || null,
    input.label_format || 'pdf',
    input.ship_date || null,
    input.estimated_delivery || null,
    input.status,
    input.shipping_cost || null,
    input.insurance_cost || null,
    input.weight || null,
    input.dimensions ? JSON.stringify(input.dimensions) : null,
    JSON.stringify(input.from_address),
    JSON.stringify(input.to_address),
    input.packages ? JSON.stringify(input.packages) : null,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    created_at: now,
    updated_at: now
  };
}

// Purchase shipping label
export async function purchaseLabel(
  db: D1Database,
  shipmentId: string,
  rateId: string
): Promise<{ tracking_number: string; label_url: string }> {
  const rate = await db.prepare(`
    SELECT * FROM shipping_rates WHERE id = ?
  `).bind(rateId).first<ShippingRate>();
  
  if (!rate) throw new Error('Rate not found');
  
  // In production, this would call the carrier API to purchase the label
  // For now, we'll simulate it
  const trackingNumber = `TRK${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const labelUrl = `https://labels.example.com/${trackingNumber}.pdf`;
  
  const carrier = await getCarrier(db, rate.carrier_id);
  const trackingUrl = getTrackingUrl(carrier?.carrier_code || '', trackingNumber);
  
  const now = new Date().toISOString();
  const estimatedDelivery = new Date(Date.now() + (rate.estimated_days || 5) * 24 * 3600000).toISOString().split('T')[0];
  
  await db.prepare(`
    UPDATE shipments 
    SET tracking_number = ?, carrier_tracking_url = ?, label_url = ?,
        service_code = ?, shipping_cost = ?, estimated_delivery = ?,
        status = 'label_created', ship_date = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    trackingNumber,
    trackingUrl,
    labelUrl,
    rate.service_code,
    rate.rate,
    estimatedDelivery,
    now.split('T')[0],
    now,
    shipmentId
  ).run();
  
  return { tracking_number: trackingNumber, label_url: labelUrl };
}

// Get tracking URL for carrier
function getTrackingUrl(carrierCode: string, trackingNumber: string): string {
  const urls: Record<string, string> = {
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    dhl: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
    usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`
  };
  
  return urls[carrierCode.toLowerCase()] || `https://track.example.com/${trackingNumber}`;
}

// Update shipment status
export async function updateShipmentStatus(
  db: D1Database,
  shipmentId: string,
  status: Shipment['status'],
  actualDelivery?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE shipments 
    SET status = ?, actual_delivery = ?, updated_at = ?
    WHERE id = ?
  `).bind(status, actualDelivery || null, now, shipmentId).run();
}

// Get shipment by ID
export async function getShipment(db: D1Database, shipmentId: string): Promise<Shipment | null> {
  const result = await db.prepare(`
    SELECT * FROM shipments WHERE id = ?
  `).bind(shipmentId).first();
  
  if (!result) return null;
  
  return {
    ...result,
    dimensions: result.dimensions ? JSON.parse(result.dimensions as string) : undefined,
    from_address: JSON.parse(result.from_address as string),
    to_address: JSON.parse(result.to_address as string),
    packages: result.packages ? JSON.parse(result.packages as string) : undefined
  } as Shipment;
}

// List shipments for a company
export async function listShipments(
  db: D1Database,
  companyId: string,
  status?: Shipment['status'],
  limit: number = 100
): Promise<Shipment[]> {
  let query = 'SELECT * FROM shipments WHERE company_id = ?';
  const params: (string | number)[] = [companyId];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  
  const results = await db.prepare(query).bind(...params).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    dimensions: row.dimensions ? JSON.parse(row.dimensions as string) : undefined,
    from_address: JSON.parse(row.from_address as string),
    to_address: JSON.parse(row.to_address as string),
    packages: row.packages ? JSON.parse(row.packages as string) : undefined
  })) as Shipment[];
}

// Get shipping summary
export async function getShippingSummary(
  db: D1Database,
  companyId: string
): Promise<{
  total_shipments: number;
  pending: number;
  in_transit: number;
  delivered: number;
  total_cost: number;
}> {
  const result = await db.prepare(`
    SELECT 
      COUNT(*) as total_shipments,
      SUM(CASE WHEN status = 'pending' OR status = 'label_created' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      COALESCE(SUM(shipping_cost), 0) as total_cost
    FROM shipments WHERE company_id = ?
  `).bind(companyId).first();
  
  return result as {
    total_shipments: number;
    pending: number;
    in_transit: number;
    delivered: number;
    total_cost: number;
  };
}
