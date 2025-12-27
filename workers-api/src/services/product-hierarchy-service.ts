// Product Hierarchy Service - Multi-level categories, templates, variants, attributes

interface ProductCategory {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  parent_id?: string;
  level: number;
  path?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductTemplate {
  id: string;
  company_id: string;
  name: string;
  sku_prefix?: string;
  description?: string;
  category_id?: string;
  product_type: 'physical' | 'service' | 'consumable' | 'bundle';
  list_price: number;
  cost_price: number;
  can_be_sold: boolean;
  can_be_purchased: boolean;
  track_inventory: boolean;
  weight?: number;
  volume?: number;
  uom_id?: string;
  purchase_uom_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductAttribute {
  id: string;
  company_id: string;
  name: string;
  display_type: 'radio' | 'select' | 'color' | 'pills';
  create_variant: 'always' | 'dynamic' | 'no_variant';
  sequence: number;
  is_active: boolean;
  created_at: string;
}

interface ProductAttributeValue {
  id: string;
  attribute_id: string;
  name: string;
  html_color?: string;
  sequence: number;
  is_active: boolean;
  created_at: string;
}

interface ProductVariant {
  id: string;
  company_id: string;
  template_id: string;
  name: string;
  sku?: string;
  barcode?: string;
  attribute_value_ids?: string;
  list_price?: number;
  cost_price?: number;
  weight?: number;
  volume?: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function createCategory(
  db: D1Database,
  input: Omit<ProductCategory, 'id' | 'level' | 'path' | 'created_at' | 'updated_at'>
): Promise<ProductCategory> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  let level = 0;
  let path = id;
  
  if (input.parent_id) {
    const parent = await db.prepare(`
      SELECT level, path FROM product_category_tree WHERE id = ?
    `).bind(input.parent_id).first<{ level: number; path: string }>();
    
    if (parent) {
      level = parent.level + 1;
      path = `${parent.path}/${id}`;
    }
  }
  
  await db.prepare(`
    INSERT INTO product_category_tree (
      id, company_id, name, code, parent_id, level, path, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.name,
    input.code || null,
    input.parent_id || null,
    level,
    path,
    input.is_active ? 1 : 0,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    level,
    path,
    created_at: now,
    updated_at: now
  };
}

export async function getCategory(db: D1Database, categoryId: string): Promise<ProductCategory | null> {
  const result = await db.prepare(`
    SELECT * FROM product_category_tree WHERE id = ?
  `).bind(categoryId).first();
  
  return result as ProductCategory | null;
}

export async function listCategories(
  db: D1Database,
  companyId: string,
  parentId?: string
): Promise<ProductCategory[]> {
  let query = 'SELECT * FROM product_category_tree WHERE company_id = ? AND is_active = 1';
  const params: (string | null)[] = [companyId];
  
  if (parentId === null) {
    query += ' AND parent_id IS NULL';
  } else if (parentId) {
    query += ' AND parent_id = ?';
    params.push(parentId);
  }
  
  query += ' ORDER BY level, name';
  
  const results = await db.prepare(query).bind(...params).all();
  return (results.results || []) as unknown as ProductCategory[];
}

export async function getCategoryTree(
  db: D1Database,
  companyId: string
): Promise<ProductCategory[]> {
  const results = await db.prepare(`
    SELECT * FROM product_category_tree 
    WHERE company_id = ? AND is_active = 1
    ORDER BY path
  `).bind(companyId).all();
  
  return (results.results || []) as unknown as ProductCategory[];
}

export async function getCategoryChildren(
  db: D1Database,
  categoryId: string
): Promise<ProductCategory[]> {
  const category = await getCategory(db, categoryId);
  if (!category) return [];
  
  const results = await db.prepare(`
    SELECT * FROM product_category_tree 
    WHERE path LIKE ? AND id != ? AND is_active = 1
    ORDER BY level, name
  `).bind(`${category.path}%`, categoryId).all();
  
  return (results.results || []) as unknown as ProductCategory[];
}

export async function createTemplate(
  db: D1Database,
  input: Omit<ProductTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<ProductTemplate> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO product_templates (
      id, company_id, name, sku_prefix, description, category_id, product_type,
      list_price, cost_price, can_be_sold, can_be_purchased, track_inventory,
      weight, volume, uom_id, purchase_uom_id, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.name,
    input.sku_prefix || null,
    input.description || null,
    input.category_id || null,
    input.product_type,
    input.list_price,
    input.cost_price,
    input.can_be_sold ? 1 : 0,
    input.can_be_purchased ? 1 : 0,
    input.track_inventory ? 1 : 0,
    input.weight || null,
    input.volume || null,
    input.uom_id || null,
    input.purchase_uom_id || null,
    input.is_active ? 1 : 0,
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

export async function getTemplate(db: D1Database, templateId: string): Promise<ProductTemplate | null> {
  const result = await db.prepare(`
    SELECT * FROM product_templates WHERE id = ?
  `).bind(templateId).first();
  
  return result as ProductTemplate | null;
}

export async function listTemplates(
  db: D1Database,
  companyId: string,
  options: { categoryId?: string; productType?: string; limit?: number } = {}
): Promise<ProductTemplate[]> {
  let query = 'SELECT * FROM product_templates WHERE company_id = ? AND is_active = 1';
  const params: (string | number)[] = [companyId];
  
  if (options.categoryId) {
    query += ' AND category_id = ?';
    params.push(options.categoryId);
  }
  
  if (options.productType) {
    query += ' AND product_type = ?';
    params.push(options.productType);
  }
  
  query += ' ORDER BY name';
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  const results = await db.prepare(query).bind(...params).all();
  return (results.results || []) as unknown as ProductTemplate[];
}

export async function createAttribute(
  db: D1Database,
  input: Omit<ProductAttribute, 'id' | 'created_at'>
): Promise<ProductAttribute> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO product_attributes (
      id, company_id, name, display_type, create_variant, sequence, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.name,
    input.display_type,
    input.create_variant,
    input.sequence,
    input.is_active ? 1 : 0,
    now
  ).run();
  
  return {
    id,
    ...input,
    created_at: now
  };
}

export async function listAttributes(db: D1Database, companyId: string): Promise<ProductAttribute[]> {
  const results = await db.prepare(`
    SELECT * FROM product_attributes WHERE company_id = ? AND is_active = 1 ORDER BY sequence, name
  `).bind(companyId).all();
  
  return (results.results || []) as unknown as ProductAttribute[];
}

export async function createAttributeValue(
  db: D1Database,
  input: Omit<ProductAttributeValue, 'id' | 'created_at'>
): Promise<ProductAttributeValue> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO product_attribute_values (
      id, attribute_id, name, html_color, sequence, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.attribute_id,
    input.name,
    input.html_color || null,
    input.sequence,
    input.is_active ? 1 : 0,
    now
  ).run();
  
  return {
    id,
    ...input,
    created_at: now
  };
}

export async function listAttributeValues(db: D1Database, attributeId: string): Promise<ProductAttributeValue[]> {
  const results = await db.prepare(`
    SELECT * FROM product_attribute_values WHERE attribute_id = ? AND is_active = 1 ORDER BY sequence, name
  `).bind(attributeId).all();
  
  return (results.results || []) as unknown as ProductAttributeValue[];
}

export async function addAttributeToTemplate(
  db: D1Database,
  templateId: string,
  attributeId: string,
  valueIds: string[]
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await db.prepare(`
    INSERT INTO product_template_attribute_lines (id, template_id, attribute_id, value_ids, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, templateId, attributeId, JSON.stringify(valueIds), now).run();
}

export async function getTemplateAttributes(
  db: D1Database,
  templateId: string
): Promise<Array<{ attribute: ProductAttribute; values: ProductAttributeValue[] }>> {
  const lines = await db.prepare(`
    SELECT * FROM product_template_attribute_lines WHERE template_id = ?
  `).bind(templateId).all();
  
  const result: Array<{ attribute: ProductAttribute; values: ProductAttributeValue[] }> = [];
  
  for (const line of (lines.results || []) as unknown as Array<{ attribute_id: string; value_ids: string }>) {
    const attribute = await db.prepare(`
      SELECT * FROM product_attributes WHERE id = ?
    `).bind(line.attribute_id).first() as ProductAttribute | null;
    
    if (attribute) {
      const valueIds = JSON.parse(line.value_ids || '[]') as string[];
      const values: ProductAttributeValue[] = [];
      
      for (const valueId of valueIds) {
        const value = await db.prepare(`
          SELECT * FROM product_attribute_values WHERE id = ?
        `).bind(valueId).first() as ProductAttributeValue | null;
        if (value) values.push(value);
      }
      
      result.push({ attribute, values });
    }
  }
  
  return result;
}

export async function createVariant(
  db: D1Database,
  input: Omit<ProductVariant, 'id' | 'quantity_available' | 'created_at' | 'updated_at'>
): Promise<ProductVariant> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const quantityAvailable = input.quantity_on_hand - input.quantity_reserved;
  
  await db.prepare(`
    INSERT INTO product_variants (
      id, company_id, template_id, name, sku, barcode, attribute_value_ids,
      list_price, cost_price, weight, volume, quantity_on_hand, quantity_reserved,
      quantity_available, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.company_id,
    input.template_id,
    input.name,
    input.sku || null,
    input.barcode || null,
    input.attribute_value_ids || null,
    input.list_price || null,
    input.cost_price || null,
    input.weight || null,
    input.volume || null,
    input.quantity_on_hand,
    input.quantity_reserved,
    quantityAvailable,
    input.is_active ? 1 : 0,
    now,
    now
  ).run();
  
  return {
    id,
    ...input,
    quantity_available: quantityAvailable,
    created_at: now,
    updated_at: now
  };
}

export async function getVariant(db: D1Database, variantId: string): Promise<ProductVariant | null> {
  const result = await db.prepare(`
    SELECT * FROM product_variants WHERE id = ?
  `).bind(variantId).first();
  
  return result as ProductVariant | null;
}

export async function listVariants(
  db: D1Database,
  companyId: string,
  options: { templateId?: string; limit?: number } = {}
): Promise<ProductVariant[]> {
  let query = 'SELECT * FROM product_variants WHERE company_id = ? AND is_active = 1';
  const params: (string | number)[] = [companyId];
  
  if (options.templateId) {
    query += ' AND template_id = ?';
    params.push(options.templateId);
  }
  
  query += ' ORDER BY name';
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  const results = await db.prepare(query).bind(...params).all();
  return (results.results || []) as unknown as ProductVariant[];
}

export async function generateVariantsFromTemplate(
  db: D1Database,
  templateId: string
): Promise<ProductVariant[]> {
  const template = await getTemplate(db, templateId);
  if (!template) throw new Error('Template not found');
  
  const templateAttrs = await getTemplateAttributes(db, templateId);
  if (templateAttrs.length === 0) {
    const variant = await createVariant(db, {
      company_id: template.company_id,
      template_id: templateId,
      name: template.name,
      sku: template.sku_prefix,
      list_price: template.list_price,
      cost_price: template.cost_price,
      weight: template.weight,
      volume: template.volume,
      quantity_on_hand: 0,
      quantity_reserved: 0,
      is_active: true
    });
    return [variant];
  }
  
  const combinations = generateCombinations(templateAttrs.map(a => a.values));
  const variants: ProductVariant[] = [];
  
  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];
    const valueIds = combo.map(v => v.id);
    const valueName = combo.map(v => v.name).join(' / ');
    const sku = template.sku_prefix ? `${template.sku_prefix}-${i + 1}` : undefined;
    
    const variant = await createVariant(db, {
      company_id: template.company_id,
      template_id: templateId,
      name: `${template.name} (${valueName})`,
      sku,
      attribute_value_ids: JSON.stringify(valueIds),
      list_price: template.list_price,
      cost_price: template.cost_price,
      weight: template.weight,
      volume: template.volume,
      quantity_on_hand: 0,
      quantity_reserved: 0,
      is_active: true
    });
    
    variants.push(variant);
  }
  
  return variants;
}

function generateCombinations<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  if (arrays.length === 1) return arrays[0].map(item => [item]);
  
  const result: T[][] = [];
  const restCombinations = generateCombinations(arrays.slice(1));
  
  for (const item of arrays[0]) {
    for (const rest of restCombinations) {
      result.push([item, ...rest]);
    }
  }
  
  return result;
}

export async function updateVariantStock(
  db: D1Database,
  variantId: string,
  quantityChange: number,
  isReservation: boolean = false
): Promise<ProductVariant> {
  const variant = await getVariant(db, variantId);
  if (!variant) throw new Error('Variant not found');
  
  const now = new Date().toISOString();
  let newOnHand = variant.quantity_on_hand;
  let newReserved = variant.quantity_reserved;
  
  if (isReservation) {
    newReserved += quantityChange;
  } else {
    newOnHand += quantityChange;
  }
  
  const newAvailable = newOnHand - newReserved;
  
  await db.prepare(`
    UPDATE product_variants 
    SET quantity_on_hand = ?, quantity_reserved = ?, quantity_available = ?, updated_at = ?
    WHERE id = ?
  `).bind(newOnHand, newReserved, newAvailable, now, variantId).run();
  
  return {
    ...variant,
    quantity_on_hand: newOnHand,
    quantity_reserved: newReserved,
    quantity_available: newAvailable,
    updated_at: now
  };
}

export async function searchProducts(
  db: D1Database,
  companyId: string,
  query: string,
  limit: number = 20
): Promise<ProductVariant[]> {
  const searchPattern = `%${query}%`;
  
  const results = await db.prepare(`
    SELECT v.* FROM product_variants v
    JOIN product_templates t ON v.template_id = t.id
    WHERE v.company_id = ? AND v.is_active = 1
    AND (v.name LIKE ? OR v.sku LIKE ? OR v.barcode LIKE ? OR t.name LIKE ?)
    ORDER BY v.name
    LIMIT ?
  `).bind(companyId, searchPattern, searchPattern, searchPattern, searchPattern, limit).all();
  
  return (results.results || []) as unknown as ProductVariant[];
}

export async function getProductSummary(
  db: D1Database,
  companyId: string
): Promise<{
  total_templates: number;
  total_variants: number;
  by_type: Record<string, number>;
  low_stock_count: number;
  out_of_stock_count: number;
}> {
  const templateCount = await db.prepare(`
    SELECT COUNT(*) as count FROM product_templates WHERE company_id = ? AND is_active = 1
  `).bind(companyId).first<{ count: number }>();
  
  const variantCount = await db.prepare(`
    SELECT COUNT(*) as count FROM product_variants WHERE company_id = ? AND is_active = 1
  `).bind(companyId).first<{ count: number }>();
  
  const byType = await db.prepare(`
    SELECT product_type, COUNT(*) as count 
    FROM product_templates WHERE company_id = ? AND is_active = 1
    GROUP BY product_type
  `).bind(companyId).all();
  
  const lowStock = await db.prepare(`
    SELECT COUNT(*) as count FROM product_variants 
    WHERE company_id = ? AND is_active = 1 AND quantity_available > 0 AND quantity_available < 10
  `).bind(companyId).first<{ count: number }>();
  
  const outOfStock = await db.prepare(`
    SELECT COUNT(*) as count FROM product_variants 
    WHERE company_id = ? AND is_active = 1 AND quantity_available <= 0
  `).bind(companyId).first<{ count: number }>();
  
  const typeMap: Record<string, number> = {};
  for (const row of (byType.results || []) as unknown as Array<{ product_type: string; count: number }>) {
    typeMap[row.product_type] = row.count;
  }
  
  return {
    total_templates: templateCount?.count || 0,
    total_variants: variantCount?.count || 0,
    by_type: typeMap,
    low_stock_count: lowStock?.count || 0,
    out_of_stock_count: outOfStock?.count || 0
  };
}
