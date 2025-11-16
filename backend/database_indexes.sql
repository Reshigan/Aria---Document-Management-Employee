

CREATE INDEX IF NOT EXISTS idx_journal_entries_posting_date_status 
    ON journal_entries(company_id, posting_date, status);

CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_debit_credit 
    ON journal_entry_lines(company_id, account_code, debit_credit);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type_active 
    ON chart_of_accounts(company_id, account_type, is_active);

CREATE INDEX IF NOT EXISTS idx_journal_entries_fiscal_period 
    ON journal_entries(company_id, fiscal_year, fiscal_period, status);


CREATE INDEX IF NOT EXISTS idx_invoices_customer_status_date 
    ON invoices(company_id, customer_id, status, invoice_date, due_date);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_status 
    ON payments(company_id, invoice_id, status);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_status_date 
    ON purchase_orders(company_id, supplier_id, status, order_date, expected_delivery_date);

CREATE INDEX IF NOT EXISTS idx_payments_po_status 
    ON payments(company_id, purchase_order_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_date_method_status 
    ON payments(company_id, payment_date, payment_method, status);

CREATE INDEX IF NOT EXISTS idx_customers_credit_active 
    ON customers(company_id, credit_limit, is_active);


CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_warehouse_date 
    ON inventory_movements(company_id, item_id, warehouse_id, movement_date, movement_type);

CREATE INDEX IF NOT EXISTS idx_cost_layers_item_warehouse_remaining 
    ON cost_layers(company_id, item_id, warehouse_id, remaining_quantity);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_date_type 
    ON inventory_movements(company_id, movement_date, movement_type);

CREATE INDEX IF NOT EXISTS idx_cost_layers_receipt_date 
    ON cost_layers(company_id, receipt_date, remaining_quantity);

CREATE INDEX IF NOT EXISTS idx_cost_layer_consumption_date 
    ON cost_layer_consumption(company_id, cost_layer_id, consumption_date);

CREATE INDEX IF NOT EXISTS idx_lot_serial_tracking_item_warehouse 
    ON lot_serial_tracking(company_id, item_id, warehouse_id, quantity_on_hand);

CREATE INDEX IF NOT EXISTS idx_lot_serial_tracking_lot_serial 
    ON lot_serial_tracking(company_id, lot_number, serial_number);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_lot_serial 
    ON inventory_movements(company_id, lot_serial_tracking_id);

CREATE INDEX IF NOT EXISTS idx_cost_layers_age_analysis 
    ON cost_layers(company_id, item_id, warehouse_id, receipt_date, remaining_quantity);


CREATE INDEX IF NOT EXISTS idx_work_orders_date_status 
    ON work_orders(company_id, start_date, status);

CREATE INDEX IF NOT EXISTS idx_work_orders_item_work_center 
    ON work_orders(company_id, item_id, work_center_id);

CREATE INDEX IF NOT EXISTS idx_standard_costs_item_active 
    ON standard_costs(company_id, item_id, is_active);

CREATE INDEX IF NOT EXISTS idx_material_consumption_work_order_date 
    ON material_consumption(company_id, work_order_id, consumption_date);

CREATE INDEX IF NOT EXISTS idx_material_consumption_item_date 
    ON material_consumption(company_id, item_id, consumption_date);

CREATE INDEX IF NOT EXISTS idx_time_booking_entries_date_employee 
    ON time_booking_entries(company_id, booking_date, employee_id);

CREATE INDEX IF NOT EXISTS idx_time_booking_entries_work_order 
    ON time_booking_entries(company_id, work_order_id);

CREATE INDEX IF NOT EXISTS idx_work_orders_completion 
    ON work_orders(company_id, start_date, completion_date, status);


CREATE INDEX IF NOT EXISTS idx_sales_orders_date_customer 
    ON sales_orders(company_id, order_date, customer_id);

CREATE INDEX IF NOT EXISTS idx_sales_order_lines_item 
    ON sales_order_lines(company_id, item_id, sales_order_id);

CREATE INDEX IF NOT EXISTS idx_quotes_customer_date 
    ON quotes(company_id, customer_id, quote_date);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_date_supplier 
    ON purchase_orders(company_id, order_date, supplier_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_item 
    ON purchase_order_lines(company_id, item_id, purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_goods_receipts_po_date 
    ON goods_receipts(company_id, purchase_order_id, receipt_date, status);

CREATE INDEX IF NOT EXISTS idx_sales_orders_date_trunc 
    ON sales_orders(company_id, order_date);

CREATE INDEX IF NOT EXISTS idx_sales_order_lines_quantity_price 
    ON sales_order_lines(company_id, sales_order_id, item_id, quantity, unit_price);

CREATE INDEX IF NOT EXISTS idx_deliveries_sales_order_date 
    ON deliveries(company_id, sales_order_id, delivery_date, status);


CREATE INDEX IF NOT EXISTS idx_quality_inspections_work_order_date 
    ON quality_inspections(company_id, work_order_id, inspection_date);

CREATE INDEX IF NOT EXISTS idx_quality_defects_inspection_type 
    ON quality_defects(company_id, inspection_id, defect_type);

CREATE INDEX IF NOT EXISTS idx_nonconformance_reports_date_status 
    ON nonconformance_reports(company_id, ncr_date, status, severity);

CREATE INDEX IF NOT EXISTS idx_nonconformance_reports_item 
    ON nonconformance_reports(company_id, item_id);

CREATE INDEX IF NOT EXISTS idx_quality_defects_ncr 
    ON quality_defects(company_id, ncr_id);


CREATE INDEX IF NOT EXISTS idx_items_code_active 
    ON items(company_id, item_code, is_active);

CREATE INDEX IF NOT EXISTS idx_warehouses_active 
    ON warehouses(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_work_centers_active 
    ON work_centers(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_suppliers_active 
    ON suppliers(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_customers_active 
    ON customers(company_id, is_active);


CREATE INDEX IF NOT EXISTS idx_je_lines_composite 
    ON journal_entry_lines(company_id, account_code, journal_entry_id, debit_credit, amount);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_composite 
    ON inventory_movements(company_id, item_id, warehouse_id, movement_date, movement_type, quantity);

CREATE INDEX IF NOT EXISTS idx_material_consumption_composite 
    ON material_consumption(company_id, work_order_id, item_id, consumption_date, quantity_consumed, unit_cost);

CREATE INDEX IF NOT EXISTS idx_sales_order_lines_composite 
    ON sales_order_lines(company_id, sales_order_id, item_id, quantity, unit_price);

CREATE INDEX IF NOT EXISTS idx_quality_inspections_composite 
    ON quality_inspections(company_id, work_order_id, inspection_date, result, quantity_inspected);


ANALYZE journal_entries;
ANALYZE journal_entry_lines;
ANALYZE chart_of_accounts;
ANALYZE invoices;
ANALYZE payments;
ANALYZE purchase_orders;
ANALYZE customers;
ANALYZE suppliers;
ANALYZE inventory_movements;
ANALYZE cost_layers;
ANALYZE cost_layer_consumption;
ANALYZE lot_serial_tracking;
ANALYZE work_orders;
ANALYZE material_consumption;
ANALYZE time_booking_entries;
ANALYZE standard_costs;
ANALYZE sales_orders;
ANALYZE sales_order_lines;
ANALYZE purchase_order_lines;
ANALYZE goods_receipts;
ANALYZE deliveries;
ANALYZE quality_inspections;
ANALYZE quality_defects;
ANALYZE nonconformance_reports;
ANALYZE items;
ANALYZE warehouses;
ANALYZE work_centers;
