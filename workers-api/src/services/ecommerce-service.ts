// E-Commerce Connector Service - Shopify/WooCommerce integration

import { D1Database } from '@cloudflare/workers-types';

interface EcommerceStore {
  id: string;
  company_id: string;
  connector_id: string;
  platform: 'shopify' | 'woocommerce' | 'magento' | 'bigcommerce';
  store_name: string;
  store_url?: string;
  store_id?: string;
  default_warehouse_id?: string;
  default_price_list_id?: string;
  sync_products: boolean;
  sync_orders: boolean;
  sync_customers: boolean;
  sync_inventory: boolean;
  order_prefix?: string;
  last_order_sync_at?: string;
  last_product_sync_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface OrderMapping {
  id: string;
  company_id: string;
  store_id: string;
  ecommerce_order_id: string;
  ecommerce_order_number?: string;
  sales_order_id?: string;
  invoice_id?: string;
  fulfillment_status: 'pending' | 'partial' | 'fulfilled' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded' | 'partial_refund';
  sync_status: string;
  last_synced_at?: string;
  created_at: string;
}

interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  created_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  line_items: Array<{
    id: number;
    product_id: number;
    variant_id: number;
    title: string;
    quantity: number;
    price: string;
    sku: string;
  }>;
  shipping_address?: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
}

// Create an e-commerce store connection
export async function createStore(
  db: D1Database,
  input: Omit<EcommerceStore, 'id' | 'created_at' | 'updated_at' | 'is_active'>
): Promise<EcommerceStore> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO ecommerce_stores (
      id, company_id, connector_id, platform, store_name, store_url, store_id,
      default_warehouse_id, default_price_list_id, sync_products, sync_orders,
      sync_customers, sync_inventory, order_prefix, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.connector_id,
    input.platform,
    input.store_name,
    input.store_url || null,
    input.store_id || null,
    input.default_warehouse_id || null,
    input.default_price_list_id || null,
    input.sync_products ? 1 : 0,
    input.sync_orders ? 1 : 0,
    input.sync_customers ? 1 : 0,
    input.sync_inventory ? 1 : 0,
    input.order_prefix || null,
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

// Get store by ID
export async function getStore(db: D1Database, storeId: string): Promise<EcommerceStore | null> {
  const result = await db.prepare(`
    SELECT * FROM ecommerce_stores WHERE id = ?
  `).bind(storeId).first();
  
  if (!result) return null;
  
  return {
    ...result,
    sync_products: Boolean(result.sync_products),
    sync_orders: Boolean(result.sync_orders),
    sync_customers: Boolean(result.sync_customers),
    sync_inventory: Boolean(result.sync_inventory),
    is_active: Boolean(result.is_active)
  } as EcommerceStore;
}

// List stores for a company
export async function listStores(db: D1Database, companyId: string): Promise<EcommerceStore[]> {
  const results = await db.prepare(`
    SELECT * FROM ecommerce_stores WHERE company_id = ? AND is_active = 1 ORDER BY store_name
  `).bind(companyId).all();
  
  return (results.results || []).map((row: Record<string, unknown>) => ({
    ...row,
    sync_products: Boolean(row.sync_products),
    sync_orders: Boolean(row.sync_orders),
    sync_customers: Boolean(row.sync_customers),
    sync_inventory: Boolean(row.sync_inventory),
    is_active: Boolean(row.is_active)
  })) as EcommerceStore[];
}

// Create order mapping
export async function createOrderMapping(
  db: D1Database,
  input: Omit<OrderMapping, 'id' | 'created_at'>
): Promise<OrderMapping> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO ecommerce_order_mappings (
      id, company_id, store_id, ecommerce_order_id, ecommerce_order_number,
      sales_order_id, invoice_id, fulfillment_status, payment_status,
      sync_status, last_synced_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.store_id,
    input.ecommerce_order_id,
    input.ecommerce_order_number || null,
    input.sales_order_id || null,
    input.invoice_id || null,
    input.fulfillment_status,
    input.payment_status,
    input.sync_status,
    input.last_synced_at || null,
    now
  ).run();
  
  return {
    id,
    ...input,
    created_at: now
  };
}

// Get order mapping by e-commerce order ID
export async function getOrderMapping(
  db: D1Database,
  storeId: string,
  ecommerceOrderId: string
): Promise<OrderMapping | null> {
  const result = await db.prepare(`
    SELECT * FROM ecommerce_order_mappings WHERE store_id = ? AND ecommerce_order_id = ?
  `).bind(storeId, ecommerceOrderId).first();
  
  return result as OrderMapping | null;
}

// Transform Shopify order to ARIA sales order
export function transformShopifyOrder(
  order: ShopifyOrder,
  store: EcommerceStore
): {
  customer: Record<string, unknown>;
  salesOrder: Record<string, unknown>;
  lines: Array<Record<string, unknown>>;
} {
  const orderNumber = store.order_prefix 
    ? `${store.order_prefix}${order.order_number}`
    : `SHOP-${order.order_number}`;
  
  return {
    customer: {
      name: `${order.customer.first_name} ${order.customer.last_name}`.trim(),
      email: order.customer.email || order.email,
      external_id: `shopify_${order.customer.id}`,
      address: order.shipping_address ? {
        line1: order.shipping_address.address1,
        line2: order.shipping_address.address2,
        city: order.shipping_address.city,
        state: order.shipping_address.province,
        postal_code: order.shipping_address.zip,
        country: order.shipping_address.country
      } : undefined
    },
    salesOrder: {
      order_number: orderNumber,
      order_date: order.created_at.split('T')[0],
      currency: order.currency,
      subtotal: parseFloat(order.subtotal_price),
      tax_amount: parseFloat(order.total_tax),
      total_amount: parseFloat(order.total_price),
      status: order.fulfillment_status === 'fulfilled' ? 'completed' : 'confirmed',
      payment_status: order.financial_status === 'paid' ? 'paid' : 'pending',
      external_id: `shopify_${order.id}`,
      external_order_number: String(order.order_number)
    },
    lines: order.line_items.map(item => ({
      product_sku: item.sku,
      product_name: item.title,
      quantity: item.quantity,
      unit_price: parseFloat(item.price),
      total: item.quantity * parseFloat(item.price),
      external_id: `shopify_${item.id}`,
      external_product_id: `shopify_${item.product_id}`,
      external_variant_id: `shopify_${item.variant_id}`
    }))
  };
}

// Transform WooCommerce order to ARIA sales order
export function transformWooCommerceOrder(
  order: Record<string, unknown>,
  store: EcommerceStore
): {
  customer: Record<string, unknown>;
  salesOrder: Record<string, unknown>;
  lines: Array<Record<string, unknown>>;
} {
  const billing = order.billing as Record<string, string>;
  const shipping = order.shipping as Record<string, string>;
  const lineItems = order.line_items as Array<Record<string, unknown>>;
  
  const orderNumber = store.order_prefix 
    ? `${store.order_prefix}${order.number}`
    : `WOO-${order.number}`;
  
  return {
    customer: {
      name: `${billing.first_name} ${billing.last_name}`.trim(),
      email: billing.email,
      phone: billing.phone,
      external_id: `woo_${order.customer_id}`,
      address: {
        line1: shipping.address_1 || billing.address_1,
        line2: shipping.address_2 || billing.address_2,
        city: shipping.city || billing.city,
        state: shipping.state || billing.state,
        postal_code: shipping.postcode || billing.postcode,
        country: shipping.country || billing.country
      }
    },
    salesOrder: {
      order_number: orderNumber,
      order_date: (order.date_created as string).split('T')[0],
      currency: order.currency as string,
      subtotal: parseFloat(order.total as string) - parseFloat(order.total_tax as string),
      tax_amount: parseFloat(order.total_tax as string),
      total_amount: parseFloat(order.total as string),
      status: order.status === 'completed' ? 'completed' : 'confirmed',
      payment_status: order.status === 'completed' || order.status === 'processing' ? 'paid' : 'pending',
      external_id: `woo_${order.id}`,
      external_order_number: String(order.number)
    },
    lines: lineItems.map(item => ({
      product_sku: item.sku as string,
      product_name: item.name as string,
      quantity: item.quantity as number,
      unit_price: parseFloat(item.price as string),
      total: parseFloat(item.total as string),
      external_id: `woo_${item.id}`,
      external_product_id: `woo_${item.product_id}`
    }))
  };
}

// Sync inventory to e-commerce platform
export async function syncInventoryToStore(
  db: D1Database,
  storeId: string,
  products: Array<{ sku: string; quantity: number }>
): Promise<{ synced: number; failed: number }> {
  const store = await getStore(db, storeId);
  if (!store) throw new Error('Store not found');
  
  // This would call the actual e-commerce API
  // For now, we'll just track the sync attempt
  console.log(`Syncing ${products.length} products to ${store.platform} store ${store.store_name}`);
  
  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE ecommerce_stores SET last_product_sync_at = ?, updated_at = ? WHERE id = ?
  `).bind(now, now, storeId).run();
  
  return { synced: products.length, failed: 0 };
}

// Update order fulfillment status
export async function updateOrderFulfillment(
  db: D1Database,
  mappingId: string,
  fulfillmentStatus: OrderMapping['fulfillment_status'],
  trackingNumber?: string,
  carrier?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  await db.prepare(`
    UPDATE ecommerce_order_mappings 
    SET fulfillment_status = ?, last_synced_at = ?
    WHERE id = ?
  `).bind(fulfillmentStatus, now, mappingId).run();
  
  // In a real implementation, this would also update the e-commerce platform
  console.log(`Updated fulfillment for mapping ${mappingId}: ${fulfillmentStatus}, tracking: ${trackingNumber}, carrier: ${carrier}`);
}

// Get orders pending sync
export async function getOrdersPendingSync(
  db: D1Database,
  storeId: string,
  limit: number = 100
): Promise<OrderMapping[]> {
  const results = await db.prepare(`
    SELECT * FROM ecommerce_order_mappings 
    WHERE store_id = ? AND sync_status = 'pending'
    ORDER BY created_at ASC
    LIMIT ?
  `).bind(storeId, limit).all();
  
  return (results.results || []) as unknown as OrderMapping[];
}

// Get e-commerce sync summary
export async function getEcommerceSummary(
  db: D1Database,
  companyId: string
): Promise<{
  total_stores: number;
  total_orders: number;
  orders_pending: number;
  orders_fulfilled: number;
  last_sync_at?: string;
}> {
  const storeCount = await db.prepare(`
    SELECT COUNT(*) as count FROM ecommerce_stores WHERE company_id = ? AND is_active = 1
  `).bind(companyId).first<{ count: number }>();
  
  const orderStats = await db.prepare(`
    SELECT 
      COUNT(*) as total_orders,
      SUM(CASE WHEN fulfillment_status = 'pending' THEN 1 ELSE 0 END) as orders_pending,
      SUM(CASE WHEN fulfillment_status = 'fulfilled' THEN 1 ELSE 0 END) as orders_fulfilled,
      MAX(last_synced_at) as last_sync_at
    FROM ecommerce_order_mappings m
    JOIN ecommerce_stores s ON m.store_id = s.id
    WHERE s.company_id = ?
  `).bind(companyId).first();
  
  return {
    total_stores: storeCount?.count || 0,
    total_orders: (orderStats as Record<string, number>)?.total_orders || 0,
    orders_pending: (orderStats as Record<string, number>)?.orders_pending || 0,
    orders_fulfilled: (orderStats as Record<string, number>)?.orders_fulfilled || 0,
    last_sync_at: (orderStats as Record<string, string>)?.last_sync_at
  };
}

// Webhook handler for e-commerce events
export async function handleWebhook(
  db: D1Database,
  storeId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<{ processed: boolean; message: string }> {
  const store = await getStore(db, storeId);
  if (!store) {
    return { processed: false, message: 'Store not found' };
  }
  
  switch (eventType) {
    case 'orders/create':
    case 'orders/updated':
      // Process new or updated order
      const orderId = String(payload.id);
      const existing = await getOrderMapping(db, storeId, orderId);
      
      if (!existing) {
        await createOrderMapping(db, {
          company_id: store.company_id,
          store_id: storeId,
          ecommerce_order_id: orderId,
          ecommerce_order_number: String(payload.order_number || payload.number),
          fulfillment_status: 'pending',
          payment_status: payload.financial_status === 'paid' ? 'paid' : 'pending',
          sync_status: 'pending'
        });
        return { processed: true, message: 'Order mapping created' };
      }
      
      return { processed: true, message: 'Order already exists' };
    
    case 'products/update':
    case 'inventory_levels/update':
      // Handle inventory updates
      console.log(`Inventory update for store ${storeId}:`, payload);
      return { processed: true, message: 'Inventory update received' };
    
    default:
      return { processed: false, message: `Unknown event type: ${eventType}` };
  }
}
