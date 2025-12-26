// API Routes for Odoo Parity Features
// Product Hierarchy, Pricing, Service Fulfillment, Helpdesk, Field Service, Migration

import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import * as productHierarchy from '../services/product-hierarchy-service';
import * as pricing from '../services/pricing-service';
import * as serviceFulfillment from '../services/service-fulfillment-service';
import * as helpdesk from '../services/helpdesk-service';
import * as fieldService from '../services/field-service-service';
import * as migration from '../services/migration-service';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

function getCompanyId(c: { get: (key: string) => { company_id?: string } }): string {
  const payload = c.get('jwtPayload');
  return payload?.company_id || 'default';
}

// ============================================
// PRODUCT HIERARCHY ROUTES
// ============================================

app.post('/products/categories', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const category = await productHierarchy.createCategory(db, {
    company_id: companyId,
    name: body.name,
    code: body.code,
    parent_id: body.parent_id,
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: category });
});

app.get('/products/categories', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const parentId = c.req.query('parent_id');
  
  const categories = await productHierarchy.listCategories(db, companyId, parentId || undefined);
  return c.json({ success: true, data: categories });
});

app.get('/products/categories/tree', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const tree = await productHierarchy.getCategoryTree(db, companyId);
  return c.json({ success: true, data: tree });
});

app.get('/products/categories/:id', async (c) => {
  const db = c.env.DB;
  const categoryId = c.req.param('id');
  
  const category = await productHierarchy.getCategory(db, categoryId);
  if (!category) {
    return c.json({ success: false, error: 'Category not found' }, 404);
  }
  
  return c.json({ success: true, data: category });
});

app.get('/products/categories/:id/children', async (c) => {
  const db = c.env.DB;
  const categoryId = c.req.param('id');
  
  const children = await productHierarchy.getCategoryChildren(db, categoryId);
  return c.json({ success: true, data: children });
});

app.post('/products/templates', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const template = await productHierarchy.createTemplate(db, {
    company_id: companyId,
    name: body.name,
    sku_prefix: body.sku_prefix,
    description: body.description,
    category_id: body.category_id,
    product_type: body.product_type || 'physical',
    list_price: body.list_price || 0,
    cost_price: body.cost_price || 0,
    can_be_sold: body.can_be_sold !== false,
    can_be_purchased: body.can_be_purchased !== false,
    track_inventory: body.track_inventory !== false,
    weight: body.weight,
    volume: body.volume,
    uom_id: body.uom_id,
    purchase_uom_id: body.purchase_uom_id,
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: template });
});

app.get('/products/templates', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const categoryId = c.req.query('category_id');
  const productType = c.req.query('product_type');
  const limit = parseInt(c.req.query('limit') || '50');
  
  const templates = await productHierarchy.listTemplates(db, companyId, { categoryId, productType, limit });
  return c.json({ success: true, data: templates });
});

app.get('/products/templates/:id', async (c) => {
  const db = c.env.DB;
  const templateId = c.req.param('id');
  
  const template = await productHierarchy.getTemplate(db, templateId);
  if (!template) {
    return c.json({ success: false, error: 'Template not found' }, 404);
  }
  
  return c.json({ success: true, data: template });
});

app.post('/products/attributes', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const attribute = await productHierarchy.createAttribute(db, {
    company_id: companyId,
    name: body.name,
    display_type: body.display_type || 'select',
    create_variant: body.create_variant || 'always',
    sequence: body.sequence || 0,
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: attribute });
});

app.get('/products/attributes', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const attributes = await productHierarchy.listAttributes(db, companyId);
  return c.json({ success: true, data: attributes });
});

app.post('/products/attributes/:id/values', async (c) => {
  const db = c.env.DB;
  const attributeId = c.req.param('id');
  const body = await c.req.json();
  
  const value = await productHierarchy.createAttributeValue(db, {
    attribute_id: attributeId,
    name: body.name,
    html_color: body.html_color,
    sequence: body.sequence || 0,
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: value });
});

app.get('/products/attributes/:id/values', async (c) => {
  const db = c.env.DB;
  const attributeId = c.req.param('id');
  
  const values = await productHierarchy.listAttributeValues(db, attributeId);
  return c.json({ success: true, data: values });
});

app.post('/products/templates/:id/attributes', async (c) => {
  const db = c.env.DB;
  const templateId = c.req.param('id');
  const body = await c.req.json();
  
  await productHierarchy.addAttributeToTemplate(db, templateId, body.attribute_id, body.value_ids);
  return c.json({ success: true });
});

app.get('/products/templates/:id/attributes', async (c) => {
  const db = c.env.DB;
  const templateId = c.req.param('id');
  
  const attributes = await productHierarchy.getTemplateAttributes(db, templateId);
  return c.json({ success: true, data: attributes });
});

app.post('/products/templates/:id/generate-variants', async (c) => {
  const db = c.env.DB;
  const templateId = c.req.param('id');
  
  const variants = await productHierarchy.generateVariantsFromTemplate(db, templateId);
  return c.json({ success: true, data: variants });
});

app.post('/products/variants', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const variant = await productHierarchy.createVariant(db, {
    company_id: companyId,
    template_id: body.template_id,
    name: body.name,
    sku: body.sku,
    barcode: body.barcode,
    attribute_value_ids: body.attribute_value_ids,
    list_price: body.list_price,
    cost_price: body.cost_price,
    weight: body.weight,
    volume: body.volume,
    quantity_on_hand: body.quantity_on_hand || 0,
    quantity_reserved: body.quantity_reserved || 0,
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: variant });
});

app.get('/products/variants', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const templateId = c.req.query('template_id');
  const limit = parseInt(c.req.query('limit') || '50');
  
  const variants = await productHierarchy.listVariants(db, companyId, { templateId, limit });
  return c.json({ success: true, data: variants });
});

app.get('/products/variants/:id', async (c) => {
  const db = c.env.DB;
  const variantId = c.req.param('id');
  
  const variant = await productHierarchy.getVariant(db, variantId);
  if (!variant) {
    return c.json({ success: false, error: 'Variant not found' }, 404);
  }
  
  return c.json({ success: true, data: variant });
});

app.post('/products/variants/:id/stock', async (c) => {
  const db = c.env.DB;
  const variantId = c.req.param('id');
  const body = await c.req.json();
  
  const variant = await productHierarchy.updateVariantStock(db, variantId, body.quantity_change, body.is_reservation);
  return c.json({ success: true, data: variant });
});

app.get('/products/search', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '20');
  
  const products = await productHierarchy.searchProducts(db, companyId, query, limit);
  return c.json({ success: true, data: products });
});

app.get('/products/summary', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const summary = await productHierarchy.getProductSummary(db, companyId);
  return c.json({ success: true, data: summary });
});

// ============================================
// PRICING ROUTES
// ============================================

app.post('/pricing/customer-groups', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const group = await pricing.createCustomerGroup(db, {
    company_id: companyId,
    name: body.name,
    code: body.code,
    description: body.description,
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: group });
});

app.get('/pricing/customer-groups', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const groups = await pricing.listCustomerGroups(db, companyId);
  return c.json({ success: true, data: groups });
});

app.post('/pricing/customer-groups/:id/members', async (c) => {
  const db = c.env.DB;
  const groupId = c.req.param('id');
  const body = await c.req.json();
  
  await pricing.addCustomerToGroup(db, body.customer_id, groupId);
  return c.json({ success: true });
});

app.post('/pricing/pricelists', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const pricelist = await pricing.createPricelist(db, {
    company_id: companyId,
    name: body.name,
    code: body.code,
    currency: body.currency || 'USD',
    is_default: body.is_default || false,
    customer_group_id: body.customer_group_id,
    valid_from: body.valid_from,
    valid_to: body.valid_to,
    priority: body.priority || 10,
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: pricelist });
});

app.get('/pricing/pricelists', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const customerGroupId = c.req.query('customer_group_id');
  
  const pricelists = await pricing.listPricelists(db, companyId, customerGroupId);
  return c.json({ success: true, data: pricelists });
});

app.get('/pricing/pricelists/:id', async (c) => {
  const db = c.env.DB;
  const pricelistId = c.req.param('id');
  
  const pricelist = await pricing.getPricelist(db, pricelistId);
  if (!pricelist) {
    return c.json({ success: false, error: 'Pricelist not found' }, 404);
  }
  
  return c.json({ success: true, data: pricelist });
});

app.post('/pricing/pricelists/:id/rules', async (c) => {
  const db = c.env.DB;
  const pricelistId = c.req.param('id');
  const body = await c.req.json();
  
  const rule = await pricing.createPricelistRule(db, {
    pricelist_id: pricelistId,
    name: body.name,
    applied_on: body.applied_on || 'all',
    category_id: body.category_id,
    template_id: body.template_id,
    variant_id: body.variant_id,
    min_quantity: body.min_quantity || 1,
    compute_price: body.compute_price || 'fixed',
    fixed_price: body.fixed_price,
    percent_discount: body.percent_discount,
    base: body.base || 'list_price',
    base_pricelist_id: body.base_pricelist_id,
    price_surcharge: body.price_surcharge || 0,
    price_round: body.price_round,
    price_min_margin: body.price_min_margin,
    price_max_margin: body.price_max_margin,
    valid_from: body.valid_from,
    valid_to: body.valid_to,
    sequence: body.sequence || 10,
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: rule });
});

app.get('/pricing/pricelists/:id/rules', async (c) => {
  const db = c.env.DB;
  const pricelistId = c.req.param('id');
  
  const rules = await pricing.listPricelistRules(db, pricelistId);
  return c.json({ success: true, data: rules });
});

app.post('/pricing/customers/:id/pricelist', async (c) => {
  const db = c.env.DB;
  const customerId = c.req.param('id');
  const body = await c.req.json();
  
  await pricing.assignPricelistToCustomer(db, customerId, body.pricelist_id, body.is_default, body.valid_from, body.valid_to);
  return c.json({ success: true });
});

app.post('/pricing/contracts', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const contract = await pricing.createContractPrice(db, {
    company_id: companyId,
    customer_id: body.customer_id,
    variant_id: body.variant_id,
    template_id: body.template_id,
    fixed_price: body.fixed_price,
    min_quantity: body.min_quantity || 1,
    valid_from: body.valid_from,
    valid_to: body.valid_to,
    contract_reference: body.contract_reference,
    notes: body.notes,
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: contract });
});

app.post('/pricing/calculate', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const result = await pricing.calculatePrice(
    db, companyId, body.variant_id, body.quantity, body.customer_id, body.pricelist_id
  );
  
  return c.json({ success: true, data: result });
});

app.post('/pricing/calculate-bulk', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const results = await pricing.bulkCalculatePrices(
    db, companyId, body.items, body.customer_id, body.pricelist_id
  );
  
  return c.json({ success: true, data: results });
});

app.get('/pricing/summary', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const summary = await pricing.getPricingSummary(db, companyId);
  return c.json({ success: true, data: summary });
});

// ============================================
// SERVICE FULFILLMENT ROUTES
// ============================================

app.post('/services/projects', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const project = await serviceFulfillment.createProject(db, {
    company_id: companyId,
    name: body.name,
    customer_id: body.customer_id,
    sales_order_id: body.sales_order_id,
    status: body.status || 'draft',
    start_date: body.start_date,
    end_date: body.end_date,
    budget_hours: body.budget_hours,
    budget_amount: body.budget_amount,
    billing_type: body.billing_type || 'time_materials',
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: project });
});

app.get('/services/projects', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const customerId = c.req.query('customer_id');
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50');
  
  const projects = await serviceFulfillment.listProjects(db, companyId, { customerId, status, limit });
  return c.json({ success: true, data: projects });
});

app.get('/services/projects/:id', async (c) => {
  const db = c.env.DB;
  const projectId = c.req.param('id');
  
  const project = await serviceFulfillment.getProject(db, projectId);
  if (!project) {
    return c.json({ success: false, error: 'Project not found' }, 404);
  }
  
  return c.json({ success: true, data: project });
});

app.get('/services/projects/:id/summary', async (c) => {
  const db = c.env.DB;
  const projectId = c.req.param('id');
  
  const summary = await serviceFulfillment.getProjectSummary(db, projectId);
  return c.json({ success: true, data: summary });
});

app.put('/services/projects/:id/status', async (c) => {
  const db = c.env.DB;
  const projectId = c.req.param('id');
  const body = await c.req.json();
  
  await serviceFulfillment.updateProjectStatus(db, projectId, body.status);
  return c.json({ success: true });
});

app.post('/services/projects/:id/milestones', async (c) => {
  const db = c.env.DB;
  const projectId = c.req.param('id');
  const body = await c.req.json();
  
  const milestone = await serviceFulfillment.createMilestone(db, {
    project_id: projectId,
    name: body.name,
    description: body.description,
    due_date: body.due_date,
    amount: body.amount,
    percentage: body.percentage,
    status: body.status || 'pending'
  });
  
  return c.json({ success: true, data: milestone });
});

app.get('/services/projects/:id/milestones', async (c) => {
  const db = c.env.DB;
  const projectId = c.req.param('id');
  
  const milestones = await serviceFulfillment.listMilestones(db, projectId);
  return c.json({ success: true, data: milestones });
});

app.post('/services/milestones/:id/complete', async (c) => {
  const db = c.env.DB;
  const milestoneId = c.req.param('id');
  
  await serviceFulfillment.completeMilestone(db, milestoneId);
  return c.json({ success: true });
});

app.post('/services/timesheets', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const timesheet = await serviceFulfillment.createTimesheet(db, {
    company_id: companyId,
    employee_id: body.employee_id,
    project_id: body.project_id,
    task_description: body.task_description,
    date: body.date,
    hours: body.hours,
    hourly_rate: body.hourly_rate,
    billable: body.billable !== false,
    status: body.status || 'draft',
    notes: body.notes
  });
  
  return c.json({ success: true, data: timesheet });
});

app.get('/services/timesheets', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const employeeId = c.req.query('employee_id');
  const projectId = c.req.query('project_id');
  const status = c.req.query('status');
  const dateFrom = c.req.query('date_from');
  const dateTo = c.req.query('date_to');
  const limit = parseInt(c.req.query('limit') || '50');
  
  const timesheets = await serviceFulfillment.listTimesheets(db, companyId, { employeeId, projectId, status, dateFrom, dateTo, limit });
  return c.json({ success: true, data: timesheets });
});

app.post('/services/timesheets/:id/submit', async (c) => {
  const db = c.env.DB;
  const timesheetId = c.req.param('id');
  
  await serviceFulfillment.submitTimesheet(db, timesheetId);
  return c.json({ success: true });
});

app.post('/services/timesheets/:id/approve', async (c) => {
  const db = c.env.DB;
  const timesheetId = c.req.param('id');
  const body = await c.req.json();
  
  await serviceFulfillment.approveTimesheet(db, timesheetId, body.approved_by);
  return c.json({ success: true });
});

app.post('/services/timesheets/:id/reject', async (c) => {
  const db = c.env.DB;
  const timesheetId = c.req.param('id');
  
  await serviceFulfillment.rejectTimesheet(db, timesheetId);
  return c.json({ success: true });
});

app.post('/services/projects/:id/deliverables', async (c) => {
  const db = c.env.DB;
  const projectId = c.req.param('id');
  const body = await c.req.json();
  
  const deliverable = await serviceFulfillment.createDeliverable(db, {
    project_id: projectId,
    name: body.name,
    description: body.description,
    quantity: body.quantity || 1,
    unit_price: body.unit_price,
    status: body.status || 'pending'
  });
  
  return c.json({ success: true, data: deliverable });
});

app.get('/services/projects/:id/deliverables', async (c) => {
  const db = c.env.DB;
  const projectId = c.req.param('id');
  
  const deliverables = await serviceFulfillment.listDeliverables(db, projectId);
  return c.json({ success: true, data: deliverables });
});

app.post('/services/deliverables/:id/deliver', async (c) => {
  const db = c.env.DB;
  const deliverableId = c.req.param('id');
  
  await serviceFulfillment.deliverDeliverable(db, deliverableId);
  return c.json({ success: true });
});

app.post('/services/deliverables/:id/accept', async (c) => {
  const db = c.env.DB;
  const deliverableId = c.req.param('id');
  const body = await c.req.json();
  
  await serviceFulfillment.acceptDeliverable(db, deliverableId, body.accepted_by);
  return c.json({ success: true });
});

app.get('/services/projects/:id/billable', async (c) => {
  const db = c.env.DB;
  const projectId = c.req.param('id');
  
  const billable = await serviceFulfillment.getBillableItems(db, projectId);
  return c.json({ success: true, data: billable });
});

app.get('/services/dashboard', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const dashboard = await serviceFulfillment.getServiceDashboard(db, companyId);
  return c.json({ success: true, data: dashboard });
});

// ============================================
// HELPDESK ROUTES
// ============================================

app.post('/helpdesk/teams', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const team = await helpdesk.createTeam(db, {
    company_id: companyId,
    name: body.name,
    email_alias: body.email_alias,
    description: body.description,
    manager_id: body.manager_id,
    auto_assign: body.auto_assign || false,
    assignment_method: body.assignment_method || 'manual',
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: team });
});

app.get('/helpdesk/teams', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const teams = await helpdesk.listTeams(db, companyId);
  return c.json({ success: true, data: teams });
});

app.get('/helpdesk/teams/:id', async (c) => {
  const db = c.env.DB;
  const teamId = c.req.param('id');
  
  const team = await helpdesk.getTeam(db, teamId);
  if (!team) {
    return c.json({ success: false, error: 'Team not found' }, 404);
  }
  
  return c.json({ success: true, data: team });
});

app.post('/helpdesk/teams/:id/members', async (c) => {
  const db = c.env.DB;
  const teamId = c.req.param('id');
  const body = await c.req.json();
  
  await helpdesk.addTeamMember(db, teamId, body.user_id, body.is_leader);
  return c.json({ success: true });
});

app.get('/helpdesk/teams/:id/members', async (c) => {
  const db = c.env.DB;
  const teamId = c.req.param('id');
  
  const members = await helpdesk.getTeamMembers(db, teamId);
  return c.json({ success: true, data: members });
});

app.get('/helpdesk/teams/:id/stages', async (c) => {
  const db = c.env.DB;
  const teamId = c.req.param('id');
  
  const stages = await helpdesk.listStages(db, teamId);
  return c.json({ success: true, data: stages });
});

app.post('/helpdesk/teams/:id/sla-policies', async (c) => {
  const db = c.env.DB;
  const teamId = c.req.param('id');
  const body = await c.req.json();
  
  const policy = await helpdesk.createSLAPolicy(db, {
    team_id: teamId,
    name: body.name,
    priority: body.priority,
    ticket_type: body.ticket_type,
    time_to_first_response_hours: body.time_to_first_response_hours,
    time_to_resolve_hours: body.time_to_resolve_hours,
    target_stage_id: body.target_stage_id,
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: policy });
});

app.get('/helpdesk/teams/:id/sla-policies', async (c) => {
  const db = c.env.DB;
  const teamId = c.req.param('id');
  
  const policies = await helpdesk.listSLAPolicies(db, teamId);
  return c.json({ success: true, data: policies });
});

app.post('/helpdesk/tickets', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const ticket = await helpdesk.createTicket(db, {
    company_id: companyId,
    team_id: body.team_id,
    subject: body.subject,
    description: body.description,
    customer_id: body.customer_id,
    customer_email: body.customer_email,
    customer_name: body.customer_name,
    contact_id: body.contact_id,
    assigned_to: body.assigned_to,
    stage_id: body.stage_id,
    priority: body.priority || 'medium',
    ticket_type: body.ticket_type,
    source: body.source || 'web',
    tags: body.tags
  });
  
  return c.json({ success: true, data: ticket });
});

app.get('/helpdesk/tickets', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const teamId = c.req.query('team_id');
  const stageId = c.req.query('stage_id');
  const assignedTo = c.req.query('assigned_to');
  const customerId = c.req.query('customer_id');
  const priority = c.req.query('priority');
  const status = c.req.query('status') as 'open' | 'closed' | undefined;
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  
  const result = await helpdesk.listTickets(db, companyId, { teamId, stageId, assignedTo, customerId, priority, status, limit, offset });
  return c.json({ success: true, data: result.tickets, total: result.total });
});

app.get('/helpdesk/tickets/:id', async (c) => {
  const db = c.env.DB;
  const ticketId = c.req.param('id');
  
  const ticket = await helpdesk.getTicket(db, ticketId);
  if (!ticket) {
    return c.json({ success: false, error: 'Ticket not found' }, 404);
  }
  
  return c.json({ success: true, data: ticket });
});

app.put('/helpdesk/tickets/:id/stage', async (c) => {
  const db = c.env.DB;
  const ticketId = c.req.param('id');
  const body = await c.req.json();
  
  await helpdesk.updateTicketStage(db, ticketId, body.stage_id, body.user_id);
  return c.json({ success: true });
});

app.put('/helpdesk/tickets/:id/assign', async (c) => {
  const db = c.env.DB;
  const ticketId = c.req.param('id');
  const body = await c.req.json();
  
  await helpdesk.assignTicket(db, ticketId, body.assigned_to, body.user_id);
  return c.json({ success: true });
});

app.put('/helpdesk/tickets/:id/priority', async (c) => {
  const db = c.env.DB;
  const ticketId = c.req.param('id');
  const body = await c.req.json();
  
  await helpdesk.updateTicketPriority(db, ticketId, body.priority, body.user_id);
  return c.json({ success: true });
});

app.post('/helpdesk/tickets/:id/messages', async (c) => {
  const db = c.env.DB;
  const ticketId = c.req.param('id');
  const body = await c.req.json();
  
  const message = await helpdesk.addMessage(db, {
    ticket_id: ticketId,
    author_id: body.author_id,
    author_name: body.author_name,
    author_email: body.author_email,
    message_type: body.message_type || 'comment',
    body: body.body,
    attachments: body.attachments,
    is_internal: body.is_internal || false
  });
  
  return c.json({ success: true, data: message });
});

app.get('/helpdesk/tickets/:id/messages', async (c) => {
  const db = c.env.DB;
  const ticketId = c.req.param('id');
  const includeInternal = c.req.query('include_internal') !== 'false';
  
  const messages = await helpdesk.listMessages(db, ticketId, includeInternal);
  return c.json({ success: true, data: messages });
});

app.get('/helpdesk/tickets/:id/activity', async (c) => {
  const db = c.env.DB;
  const ticketId = c.req.param('id');
  
  const activity = await helpdesk.getTicketActivity(db, ticketId);
  return c.json({ success: true, data: activity });
});

app.post('/helpdesk/tickets/:id/rate', async (c) => {
  const db = c.env.DB;
  const ticketId = c.req.param('id');
  const body = await c.req.json();
  
  await helpdesk.rateTicket(db, ticketId, body.rating, body.comment);
  return c.json({ success: true });
});

app.get('/helpdesk/search', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '20');
  
  const tickets = await helpdesk.searchTickets(db, companyId, query, limit);
  return c.json({ success: true, data: tickets });
});

app.get('/helpdesk/dashboard', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const teamId = c.req.query('team_id');
  
  const dashboard = await helpdesk.getHelpdeskDashboard(db, companyId, teamId);
  return c.json({ success: true, data: dashboard });
});

app.get('/helpdesk/customers/:id/tickets', async (c) => {
  const db = c.env.DB;
  const customerId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '20');
  
  const tickets = await helpdesk.getCustomerTickets(db, customerId, limit);
  return c.json({ success: true, data: tickets });
});

// ============================================
// FIELD SERVICE ROUTES
// ============================================

app.post('/field-service/locations', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const location = await fieldService.createLocation(db, {
    company_id: companyId,
    customer_id: body.customer_id,
    name: body.name,
    address: body.address,
    city: body.city,
    state: body.state,
    postal_code: body.postal_code,
    country: body.country,
    latitude: body.latitude,
    longitude: body.longitude,
    contact_name: body.contact_name,
    contact_phone: body.contact_phone,
    contact_email: body.contact_email,
    access_instructions: body.access_instructions,
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: location });
});

app.get('/field-service/locations', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const customerId = c.req.query('customer_id');
  
  const locations = await fieldService.listLocations(db, companyId, customerId);
  return c.json({ success: true, data: locations });
});

app.post('/field-service/technicians', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const technician = await fieldService.createTechnician(db, {
    company_id: companyId,
    user_id: body.user_id,
    name: body.name,
    email: body.email,
    phone: body.phone,
    skills: body.skills,
    certifications: body.certifications,
    home_location_id: body.home_location_id,
    max_jobs_per_day: body.max_jobs_per_day || 8,
    hourly_rate: body.hourly_rate,
    is_active: body.is_active !== false
  });
  
  return c.json({ success: true, data: technician });
});

app.get('/field-service/technicians', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const technicians = await fieldService.listTechnicians(db, companyId);
  return c.json({ success: true, data: technicians });
});

app.get('/field-service/technicians/:id', async (c) => {
  const db = c.env.DB;
  const technicianId = c.req.param('id');
  
  const technician = await fieldService.getTechnician(db, technicianId);
  if (!technician) {
    return c.json({ success: false, error: 'Technician not found' }, 404);
  }
  
  return c.json({ success: true, data: technician });
});

app.get('/field-service/technicians/:id/schedule', async (c) => {
  const db = c.env.DB;
  const technicianId = c.req.param('id');
  const date = c.req.query('date') || new Date().toISOString().split('T')[0];
  
  const schedule = await fieldService.getTechnicianSchedule(db, technicianId, date);
  return c.json({ success: true, data: schedule });
});

app.post('/field-service/technicians/:id/availability', async (c) => {
  const db = c.env.DB;
  const technicianId = c.req.param('id');
  const body = await c.req.json();
  
  const availability = await fieldService.setAvailability(db, {
    technician_id: technicianId,
    date: body.date,
    available_from: body.available_from,
    available_to: body.available_to,
    is_available: body.is_available !== false,
    notes: body.notes
  });
  
  return c.json({ success: true, data: availability });
});

app.get('/field-service/technicians/:id/availability', async (c) => {
  const db = c.env.DB;
  const technicianId = c.req.param('id');
  const dateFrom = c.req.query('date_from') || new Date().toISOString().split('T')[0];
  const dateTo = c.req.query('date_to') || dateFrom;
  
  const availability = await fieldService.getAvailability(db, technicianId, dateFrom, dateTo);
  return c.json({ success: true, data: availability });
});

app.get('/field-service/available-technicians', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const date = c.req.query('date') || new Date().toISOString().split('T')[0];
  const timeStart = c.req.query('time_start') || '09:00';
  const timeEnd = c.req.query('time_end') || '17:00';
  const skills = c.req.query('skills')?.split(',');
  
  const technicians = await fieldService.getAvailableTechnicians(db, companyId, date, timeStart, timeEnd, skills);
  return c.json({ success: true, data: technicians });
});

app.post('/field-service/orders', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const order = await fieldService.createOrder(db, {
    company_id: companyId,
    customer_id: body.customer_id,
    location_id: body.location_id,
    sales_order_id: body.sales_order_id,
    helpdesk_ticket_id: body.helpdesk_ticket_id,
    service_type: body.service_type,
    priority: body.priority || 'medium',
    status: body.status || 'draft',
    scheduled_date: body.scheduled_date,
    scheduled_time_start: body.scheduled_time_start,
    scheduled_time_end: body.scheduled_time_end,
    estimated_duration_hours: body.estimated_duration_hours,
    assigned_technician_id: body.assigned_technician_id,
    description: body.description,
    customer_notes: body.customer_notes,
    internal_notes: body.internal_notes
  });
  
  return c.json({ success: true, data: order });
});

app.get('/field-service/orders', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const technicianId = c.req.query('technician_id');
  const customerId = c.req.query('customer_id');
  const status = c.req.query('status');
  const scheduledDate = c.req.query('scheduled_date');
  const limit = parseInt(c.req.query('limit') || '50');
  
  const orders = await fieldService.listOrders(db, companyId, { technicianId, customerId, status, scheduledDate, limit });
  return c.json({ success: true, data: orders });
});

app.get('/field-service/orders/:id', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  
  const order = await fieldService.getOrder(db, orderId);
  if (!order) {
    return c.json({ success: false, error: 'Order not found' }, 404);
  }
  
  return c.json({ success: true, data: order });
});

app.get('/field-service/orders/:id/summary', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  
  const summary = await fieldService.getOrderSummary(db, orderId);
  return c.json({ success: true, data: summary });
});

app.post('/field-service/orders/:id/schedule', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  const body = await c.req.json();
  
  await fieldService.scheduleOrder(db, orderId, body.technician_id, body.scheduled_date, body.scheduled_time_start, body.scheduled_time_end);
  return c.json({ success: true });
});

app.post('/field-service/orders/:id/dispatch', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  
  await fieldService.dispatchOrder(db, orderId);
  return c.json({ success: true });
});

app.post('/field-service/orders/:id/start', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  
  await fieldService.startOrder(db, orderId);
  return c.json({ success: true });
});

app.post('/field-service/orders/:id/complete', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  const body = await c.req.json();
  
  await fieldService.completeOrder(db, orderId, body.customer_signature);
  return c.json({ success: true });
});

app.post('/field-service/orders/:id/cancel', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  
  await fieldService.cancelOrder(db, orderId);
  return c.json({ success: true });
});

app.post('/field-service/orders/:id/rate', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  const body = await c.req.json();
  
  await fieldService.rateOrder(db, orderId, body.rating, body.comment);
  return c.json({ success: true });
});

app.post('/field-service/orders/:id/tasks', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  const body = await c.req.json();
  
  const task = await fieldService.createTask(db, {
    order_id: orderId,
    name: body.name,
    description: body.description,
    sequence: body.sequence || 0,
    is_required: body.is_required || false,
    is_completed: false
  });
  
  return c.json({ success: true, data: task });
});

app.get('/field-service/orders/:id/tasks', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  
  const tasks = await fieldService.listTasks(db, orderId);
  return c.json({ success: true, data: tasks });
});

app.post('/field-service/tasks/:id/complete', async (c) => {
  const db = c.env.DB;
  const taskId = c.req.param('id');
  const body = await c.req.json();
  
  await fieldService.completeTask(db, taskId, body.completed_by, body.notes, body.photo_urls);
  return c.json({ success: true });
});

app.post('/field-service/orders/:id/time-entries', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  const body = await c.req.json();
  
  const entry = await fieldService.createTimeEntry(db, {
    order_id: orderId,
    technician_id: body.technician_id,
    entry_type: body.entry_type || 'work',
    start_time: body.start_time,
    end_time: body.end_time,
    duration_hours: body.duration_hours,
    notes: body.notes
  });
  
  return c.json({ success: true, data: entry });
});

app.get('/field-service/orders/:id/time-entries', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  
  const entries = await fieldService.listTimeEntries(db, orderId);
  return c.json({ success: true, data: entries });
});

app.post('/field-service/time-entries/:id/end', async (c) => {
  const db = c.env.DB;
  const entryId = c.req.param('id');
  
  await fieldService.endTimeEntry(db, entryId);
  return c.json({ success: true });
});

app.post('/field-service/orders/:id/parts', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  const body = await c.req.json();
  
  const part = await fieldService.addPart(db, {
    order_id: orderId,
    variant_id: body.variant_id,
    product_name: body.product_name,
    quantity: body.quantity,
    unit_price: body.unit_price,
    from_inventory: body.from_inventory !== false,
    warehouse_id: body.warehouse_id,
    notes: body.notes
  });
  
  return c.json({ success: true, data: part });
});

app.get('/field-service/orders/:id/parts', async (c) => {
  const db = c.env.DB;
  const orderId = c.req.param('id');
  
  const parts = await fieldService.listParts(db, orderId);
  return c.json({ success: true, data: parts });
});

app.get('/field-service/dashboard', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  
  const dashboard = await fieldService.getFieldServiceDashboard(db, companyId);
  return c.json({ success: true, data: dashboard });
});

// ============================================
// MIGRATION ROUTES
// ============================================

app.post('/migration/jobs', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const body = await c.req.json();
  
  const job = await migration.createMigrationJob(db, {
    company_id: companyId,
    source_system: body.source_system,
    source_version: body.source_version,
    job_type: body.job_type || 'full',
    status: 'pending',
    created_by: body.created_by
  });
  
  return c.json({ success: true, data: job });
});

app.get('/migration/jobs', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const limit = parseInt(c.req.query('limit') || '20');
  
  const jobs = await migration.listMigrationJobs(db, companyId, limit);
  return c.json({ success: true, data: jobs });
});

app.get('/migration/jobs/:id', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  
  const job = await migration.getMigrationJob(db, jobId);
  if (!job) {
    return c.json({ success: false, error: 'Job not found' }, 404);
  }
  
  return c.json({ success: true, data: job });
});

app.get('/migration/jobs/:id/summary', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  
  const summary = await migration.getMigrationSummary(db, jobId);
  return c.json({ success: true, data: summary });
});

app.get('/migration/jobs/:id/report', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  
  const report = await migration.generateMigrationReport(db, jobId);
  return c.text(report, 200, { 'Content-Type': 'text/markdown' });
});

app.get('/migration/jobs/:id/mappings', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  const entityType = c.req.query('entity_type');
  const status = c.req.query('status');
  
  const mappings = await migration.listMappings(db, jobId, entityType, status);
  return c.json({ success: true, data: mappings });
});

app.get('/migration/jobs/:id/validations', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  const status = c.req.query('status');
  
  const validations = await migration.listValidations(db, jobId, status);
  return c.json({ success: true, data: validations });
});

app.post('/migration/jobs/:id/run', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const jobId = c.req.param('id');
  const body = await c.req.json();
  
  const result = await migration.runFullMigration(db, jobId, companyId, {
    customers: body.customers || [],
    products: body.products || []
  });
  
  return c.json({ success: true, data: result });
});

app.post('/migration/jobs/:id/validate/trial-balance', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const jobId = c.req.param('id');
  const body = await c.req.json();
  
  const result = await migration.validateTrialBalance(db, jobId, companyId, body.trial_balance);
  return c.json({ success: true, data: result });
});

app.post('/migration/jobs/:id/validate/ar-ageing', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const jobId = c.req.param('id');
  const body = await c.req.json();
  
  const result = await migration.validateARAgeing(db, jobId, companyId, body.ar_ageing);
  return c.json({ success: true, data: result });
});

app.post('/migration/jobs/:id/validate/stock-valuation', async (c) => {
  const db = c.env.DB;
  const companyId = getCompanyId(c);
  const jobId = c.req.param('id');
  const body = await c.req.json();
  
  const result = await migration.validateStockValuation(db, jobId, companyId, body.stock_value);
  return c.json({ success: true, data: result });
});

export default app;
