
INSERT INTO companies (
    id,
    code,
    name,
    vat_number,
    registration_number,
    address_line1,
    city,
    postal_code,
    country,
    logo_url,
    bank_name,
    bank_account_number,
    bank_branch_code,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'TEST001',
    'Test Company for Bot Validation',
    '4123456789',
    'TEST/2025/001',
    '123 Test Street',
    'Johannesburg',
    '2000',
    'South Africa',
    NULL,
    'Test Bank',
    '1234567890',
    '123456',
    NOW(),
    NOW()
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

DO $$
DECLARE
    test_company_id UUID;
BEGIN
    SELECT id INTO test_company_id FROM companies WHERE code = 'TEST001';
    
    INSERT INTO users (
        id,
        email,
        username,
        full_name,
        company_id,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'test@aria-erp.test',
        'test_user',
        'Test User for Bot Validation',
        test_company_id,
        'admin',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        company_id = EXCLUDED.company_id,
        updated_at = NOW();
    
    INSERT INTO customers (
        id,
        company_id,
        code,
        name,
        email,
        phone,
        vat_number,
        address_line1,
        city,
        postal_code,
        country,
        payment_terms_id,
        credit_limit,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        test_company_id,
        'CUST-TEST001',
        'Test Customer Ltd',
        'customer@test.com',
        '+27 11 123 4567',
        '4987654321',
        '456 Customer Ave',
        'Cape Town',
        '8001',
        'South Africa',
        (SELECT id FROM payment_terms WHERE code = 'NET30' LIMIT 1),
        100000.00,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (company_id, code) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = NOW();
    
    INSERT INTO suppliers (
        id,
        company_id,
        code,
        name,
        email,
        phone,
        vat_number,
        address_line1,
        city,
        postal_code,
        country,
        payment_terms_id,
        bbbee_level,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        test_company_id,
        'SUPP-TEST001',
        'Test Supplier (Pty) Ltd',
        'supplier@test.com',
        '+27 21 987 6543',
        '4111222333',
        '789 Supplier Road',
        'Durban',
        '4001',
        'South Africa',
        (SELECT id FROM payment_terms WHERE code = 'NET30' LIMIT 1),
        1,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (company_id, code) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = NOW();
    
    INSERT INTO products (
        id,
        company_id,
        code,
        name,
        description,
        category_id,
        unit_of_measure_id,
        unit_price,
        cost_price,
        vat_rate,
        is_active,
        track_inventory,
        created_at,
        updated_at
    ) VALUES 
    (
        gen_random_uuid(),
        test_company_id,
        'PROD-TEST001',
        'Test Product A',
        'Test product for bot validation',
        (SELECT id FROM product_categories WHERE code = 'GENERAL' LIMIT 1),
        (SELECT id FROM units_of_measure WHERE code = 'EA' LIMIT 1),
        100.00,
        60.00,
        0.15,
        true,
        true,
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        test_company_id,
        'PROD-TEST002',
        'Test Product B',
        'Another test product for bot validation',
        (SELECT id FROM product_categories WHERE code = 'GENERAL' LIMIT 1),
        (SELECT id FROM units_of_measure WHERE code = 'EA' LIMIT 1),
        200.00,
        120.00,
        0.15,
        true,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (company_id, code) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = NOW();
    
    INSERT INTO warehouses (
        id,
        company_id,
        code,
        name,
        address_line1,
        city,
        postal_code,
        country,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        test_company_id,
        'WH-TEST001',
        'Test Warehouse',
        '100 Warehouse Street',
        'Johannesburg',
        '2000',
        'South Africa',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (company_id, code) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = NOW();
    
    RAISE NOTICE 'Test tenant setup complete for company: %', test_company_id;
END $$;

SELECT 
    'Company' as entity_type,
    code,
    name
FROM companies 
WHERE code = 'TEST001'
UNION ALL
SELECT 
    'Customer' as entity_type,
    code,
    name
FROM customers 
WHERE company_id = (SELECT id FROM companies WHERE code = 'TEST001')
UNION ALL
SELECT 
    'Supplier' as entity_type,
    code,
    name
FROM suppliers 
WHERE company_id = (SELECT id FROM companies WHERE code = 'TEST001')
UNION ALL
SELECT 
    'Product' as entity_type,
    code,
    name
FROM products 
WHERE company_id = (SELECT id FROM companies WHERE code = 'TEST001')
UNION ALL
SELECT 
    'Warehouse' as entity_type,
    code,
    name
FROM warehouses 
WHERE company_id = (SELECT id FROM companies WHERE code = 'TEST001');
