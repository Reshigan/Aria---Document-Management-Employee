
CREATE TABLE IF NOT EXISTS asset_categories (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    depreciation_method VARCHAR(50) NOT NULL DEFAULT 'straight_line',
    useful_life_years INTEGER NOT NULL DEFAULT 5,
    residual_value_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    gl_asset_account VARCHAR(50) NOT NULL DEFAULT '1400',
    gl_depreciation_account VARCHAR(50) NOT NULL DEFAULT '1450',
    gl_expense_account VARCHAR(50) NOT NULL DEFAULT '6100',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_asset_categories_company ON asset_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_asset_categories_code ON asset_categories(code);

CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL,
    asset_number VARCHAR(50) NOT NULL,
    category_id UUID NOT NULL REFERENCES asset_categories(id),
    description TEXT NOT NULL,
    acquisition_date DATE NOT NULL,
    acquisition_cost DECIMAL(15,2) NOT NULL,
    residual_value DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    useful_life_years INTEGER NOT NULL,
    depreciation_method VARCHAR(50) NOT NULL DEFAULT 'straight_line',
    accumulated_depreciation DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    location VARCHAR(255),
    serial_number VARCHAR(100),
    supplier_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    disposal_date DATE,
    disposal_amount DECIMAL(15,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, asset_number)
);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_company ON fixed_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(category_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_status ON fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_number ON fixed_assets(asset_number);

CREATE TABLE IF NOT EXISTS depreciation_runs (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL,
    run_number VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    description TEXT,
    total_depreciation DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    assets_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    journal_entry_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, run_number)
);

CREATE INDEX IF NOT EXISTS idx_depreciation_runs_company ON depreciation_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_runs_period ON depreciation_runs(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_depreciation_runs_status ON depreciation_runs(status);

INSERT INTO asset_categories (id, company_id, code, name, depreciation_method, useful_life_years, residual_value_percentage, gl_asset_account, gl_depreciation_account, gl_expense_account, is_active, created_at, updated_at)
VALUES 
    (gen_random_uuid(), (SELECT id FROM companies LIMIT 1), 'COMP', 'Computer Equipment', 'straight_line', 3, 10.00, '1400', '1450', '6100', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT id FROM companies LIMIT 1), 'FURN', 'Furniture & Fixtures', 'straight_line', 7, 5.00, '1400', '1450', '6100', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT id FROM companies LIMIT 1), 'VEH', 'Vehicles', 'straight_line', 5, 15.00, '1400', '1450', '6100', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT id FROM companies LIMIT 1), 'MACH', 'Machinery', 'straight_line', 10, 10.00, '1400', '1450', '6100', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT id FROM companies LIMIT 1), 'BUILD', 'Buildings', 'straight_line', 40, 5.00, '1400', '1450', '6100', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (company_id, code) DO NOTHING;
