#!/usr/bin/env python3
"""
Direct database creation script for compliance system
Creates all compliance and audit tables with sample data
"""

import sqlite3
import json
from datetime import datetime, timedelta
import os

def create_compliance_tables():
    """Create all compliance and audit system tables"""
    
    # Connect to database
    db_path = "aria.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("🔧 Creating compliance and audit system tables...")
        
        # Create compliance_frameworks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS compliance_frameworks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                framework TEXT NOT NULL UNIQUE CHECK (framework IN ('gdpr', 'hipaa', 'sox', 'iso27001', 'pci_dss', 'ccpa', 'ferpa', 'custom')),
                name TEXT NOT NULL,
                description TEXT,
                version TEXT DEFAULT '1.0',
                is_active BOOLEAN DEFAULT 1,
                retention_period_days INTEGER DEFAULT 2555,
                audit_frequency_days INTEGER DEFAULT 90,
                risk_assessment_frequency_days INTEGER DEFAULT 365,
                notification_enabled BOOLEAN DEFAULT 1,
                alert_threshold_hours INTEGER DEFAULT 24,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                created_by INTEGER,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        """)
        
        # Create compliance_policies table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS compliance_policies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                framework_id INTEGER NOT NULL,
                policy_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT,
                implementation_guide TEXT,
                technical_controls TEXT, -- JSON as TEXT
                procedural_controls TEXT, -- JSON as TEXT
                risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
                priority INTEGER DEFAULT 5,
                is_mandatory BOOLEAN DEFAULT 1,
                is_implemented BOOLEAN DEFAULT 0,
                implementation_date DATETIME,
                next_review_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                created_by INTEGER,
                FOREIGN KEY (framework_id) REFERENCES compliance_frameworks (id),
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        """)
        
        # Create compliance_audit_logs table (separate from existing audit_logs)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS compliance_audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL CHECK (event_type IN ('user_login', 'user_logout', 'document_access', 'document_upload', 'document_download', 'document_delete', 'document_share', 'permission_change', 'system_config', 'data_export', 'backup_created', 'backup_restored', 'security_incident', 'compliance_violation')),
                event_category TEXT,
                event_description TEXT NOT NULL,
                user_id INTEGER,
                username TEXT,
                session_id TEXT,
                ip_address TEXT,
                user_agent TEXT,
                request_method TEXT,
                request_url TEXT,
                request_headers TEXT, -- JSON as TEXT
                request_body TEXT, -- JSON as TEXT
                response_status INTEGER,
                response_time_ms REAL,
                resource_type TEXT,
                resource_id TEXT,
                resource_name TEXT,
                old_values TEXT, -- JSON as TEXT
                new_values TEXT, -- JSON as TEXT
                risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
                compliance_relevant BOOLEAN DEFAULT 0,
                retention_until DATETIME,
                country TEXT,
                region TEXT,
                city TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Create compliance_assessments table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS compliance_assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                framework_id INTEGER NOT NULL,
                assessment_name TEXT NOT NULL,
                assessment_type TEXT DEFAULT 'internal',
                scope TEXT,
                start_date DATETIME NOT NULL,
                end_date DATETIME,
                due_date DATETIME,
                status TEXT DEFAULT 'pending_review' CHECK (status IN ('compliant', 'non_compliant', 'pending_review', 'remediation_required')),
                overall_score REAL,
                findings_summary TEXT,
                recommendations TEXT, -- JSON as TEXT
                assessor_name TEXT,
                assessor_organization TEXT,
                assessor_credentials TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                created_by INTEGER,
                FOREIGN KEY (framework_id) REFERENCES compliance_frameworks (id),
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        """)
        
        # Create policy_assessments table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS policy_assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assessment_id INTEGER NOT NULL,
                policy_id INTEGER NOT NULL,
                compliance_status TEXT NOT NULL CHECK (compliance_status IN ('compliant', 'non_compliant', 'pending_review', 'remediation_required')),
                compliance_score REAL,
                findings TEXT,
                evidence TEXT, -- JSON as TEXT
                gaps_identified TEXT, -- JSON as TEXT
                remediation_required BOOLEAN DEFAULT 0,
                remediation_plan TEXT,
                remediation_due_date DATETIME,
                remediation_owner INTEGER,
                risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
                risk_description TEXT,
                assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER,
                FOREIGN KEY (assessment_id) REFERENCES compliance_assessments (id),
                FOREIGN KEY (policy_id) REFERENCES compliance_policies (id),
                FOREIGN KEY (remediation_owner) REFERENCES users (id),
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        """)
        
        # Create compliance_violations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS compliance_violations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                framework_id INTEGER NOT NULL,
                policy_id INTEGER,
                violation_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
                impact_description TEXT,
                affected_systems TEXT, -- JSON as TEXT
                affected_data_types TEXT, -- JSON as TEXT
                detected_at DATETIME NOT NULL,
                detected_by TEXT,
                detection_method TEXT DEFAULT 'manual',
                related_audit_logs TEXT, -- JSON as TEXT
                status TEXT DEFAULT 'open',
                assigned_to INTEGER,
                response_plan TEXT,
                remediation_steps TEXT, -- JSON as TEXT
                response_due_date DATETIME,
                resolved_at DATETIME,
                closed_at DATETIME,
                reported_to_authorities BOOLEAN DEFAULT 0,
                authority_reference TEXT,
                external_notifications TEXT, -- JSON as TEXT
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                created_by INTEGER,
                FOREIGN KEY (framework_id) REFERENCES compliance_frameworks (id),
                FOREIGN KEY (policy_id) REFERENCES compliance_policies (id),
                FOREIGN KEY (assigned_to) REFERENCES users (id),
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        """)
        
        # Create data_classifications table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS data_classifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                classification_name TEXT NOT NULL UNIQUE,
                classification_level INTEGER NOT NULL CHECK (classification_level BETWEEN 1 AND 5),
                description TEXT,
                access_requirements TEXT, -- JSON as TEXT
                storage_requirements TEXT, -- JSON as TEXT
                transmission_requirements TEXT, -- JSON as TEXT
                retention_requirements TEXT, -- JSON as TEXT
                disposal_requirements TEXT, -- JSON as TEXT
                applicable_frameworks TEXT, -- JSON as TEXT
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                created_by INTEGER,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        """)
        
        # Create document_compliance table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_compliance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                classification_id INTEGER,
                compliance_status TEXT DEFAULT 'pending_review' CHECK (compliance_status IN ('compliant', 'non_compliant', 'pending_review', 'remediation_required')),
                last_reviewed DATETIME,
                next_review_due DATETIME,
                contains_personal_data BOOLEAN DEFAULT 0,
                data_subjects TEXT, -- JSON as TEXT
                processing_purposes TEXT, -- JSON as TEXT
                legal_basis TEXT, -- JSON as TEXT
                retention_period_years INTEGER,
                disposal_date DATETIME,
                disposal_method TEXT,
                access_log_retention_days INTEGER DEFAULT 2555,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                created_by INTEGER,
                FOREIGN KEY (document_id) REFERENCES documents (id),
                FOREIGN KEY (classification_id) REFERENCES data_classifications (id),
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        """)
        
        # Create compliance_reports table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS compliance_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                framework_id INTEGER,
                report_name TEXT NOT NULL,
                report_type TEXT DEFAULT 'periodic',
                report_period_start DATETIME,
                report_period_end DATETIME,
                executive_summary TEXT,
                findings TEXT, -- JSON as TEXT
                metrics TEXT, -- JSON as TEXT
                recommendations TEXT, -- JSON as TEXT
                status TEXT DEFAULT 'draft',
                approved_by INTEGER,
                approved_at DATETIME,
                recipients TEXT, -- JSON as TEXT
                published_at DATETIME,
                file_path TEXT,
                file_size INTEGER,
                file_hash TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                created_by INTEGER,
                FOREIGN KEY (framework_id) REFERENCES compliance_frameworks (id),
                FOREIGN KEY (approved_by) REFERENCES users (id),
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        """)
        
        # Create compliance_metrics table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS compliance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                framework_id INTEGER,
                metric_name TEXT NOT NULL,
                metric_type TEXT,
                description TEXT,
                current_value REAL,
                target_value REAL,
                threshold_warning REAL,
                threshold_critical REAL,
                calculation_method TEXT,
                data_sources TEXT, -- JSON as TEXT
                update_frequency TEXT,
                last_calculated DATETIME,
                next_calculation DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                created_by INTEGER,
                FOREIGN KEY (framework_id) REFERENCES compliance_frameworks (id),
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        """)
        
        # Create indexes for performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_compliance_audit_logs_timestamp ON compliance_audit_logs(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_compliance_audit_logs_user_id ON compliance_audit_logs(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_compliance_audit_logs_event_type ON compliance_audit_logs(event_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_compliance_audit_logs_compliance_relevant ON compliance_audit_logs(compliance_relevant)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_compliance_violations_status ON compliance_violations(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_compliance_violations_severity ON compliance_violations(severity)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_document_compliance_document_id ON document_compliance(document_id)")
        
        print("✅ All compliance tables created successfully")
        
        # Insert default compliance frameworks
        frameworks = [
            ('gdpr', 'General Data Protection Regulation', 'EU data protection regulation for personal data processing', '2018', 1, 2555, 90, 365, 1, 24, 1),
            ('hipaa', 'Health Insurance Portability and Accountability Act', 'US healthcare data protection regulation', '1996', 1, 2555, 90, 365, 1, 24, 1),
            ('sox', 'Sarbanes-Oxley Act', 'US financial reporting and corporate governance regulation', '2002', 1, 2555, 90, 365, 1, 24, 1),
            ('iso27001', 'ISO/IEC 27001', 'International information security management standard', '2013', 1, 2555, 90, 365, 1, 24, 1),
            ('pci_dss', 'Payment Card Industry Data Security Standard', 'Security standard for payment card data', '4.0', 1, 2555, 90, 365, 1, 24, 1)
        ]
        
        cursor.executemany("""
            INSERT OR IGNORE INTO compliance_frameworks 
            (framework, name, description, version, is_active, retention_period_days, audit_frequency_days, risk_assessment_frequency_days, notification_enabled, alert_threshold_hours, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, frameworks)
        
        print("✅ Default compliance frameworks inserted")
        
        # Insert default data classifications
        classifications = [
            ('Public', 1, 'Information that can be freely shared with the public', '{}', '{}', '{"years": 1}', '{}', '{}', '[]', 1),
            ('Internal', 2, 'Information for internal use within the organization', '{"authentication": "required"}', '{"encryption": "recommended"}', '{"years": 3}', '{}', '{}', '[]', 1),
            ('Confidential', 3, 'Sensitive information requiring protection', '{"authentication": "required", "authorization": "role_based"}', '{"encryption": "required"}', '{"years": 7}', '{}', '{}', '[]', 1),
            ('Restricted', 4, 'Highly sensitive information with strict access controls', '{"authentication": "multi_factor", "authorization": "explicit_approval"}', '{"encryption": "required", "location": "secure_facility"}', '{"years": 10}', '{}', '{}', '[]', 1),
            ('Top Secret', 5, 'Most sensitive information requiring highest level of protection', '{"authentication": "multi_factor", "authorization": "need_to_know", "clearance": "required"}', '{"encryption": "military_grade", "location": "classified_facility"}', '{"years": 25}', '{}', '{}', '[]', 1)
        ]
        
        cursor.executemany("""
            INSERT OR IGNORE INTO data_classifications 
            (classification_name, classification_level, description, access_requirements, storage_requirements, retention_requirements, transmission_requirements, disposal_requirements, applicable_frameworks, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, classifications)
        
        print("✅ Default data classifications inserted")
        
        # Insert sample GDPR policies
        gdpr_policies = [
            (1, 'GDPR-ART-6', 'Lawfulness of Processing', 'Processing shall be lawful only if and to the extent that at least one of the conditions applies', 'Data Protection', '["consent_management", "legal_basis_tracking"]', '["privacy_policy", "consent_procedures"]', 'high', 9, 1, 0),
            (1, 'GDPR-ART-7', 'Conditions for Consent', 'Where processing is based on consent, the controller shall be able to demonstrate that the data subject has consented', 'Data Protection', '["consent_tracking", "withdrawal_mechanism"]', '["consent_forms", "privacy_notices"]', 'high', 8, 1, 0),
            (1, 'GDPR-ART-17', 'Right to Erasure', 'The data subject shall have the right to obtain from the controller the erasure of personal data', 'Data Subject Rights', '["data_deletion", "erasure_procedures"]', '["deletion_policies", "retention_schedules"]', 'medium', 7, 1, 0),
            (1, 'GDPR-ART-25', 'Data Protection by Design', 'The controller shall implement appropriate technical and organisational measures', 'Technical Measures', '["privacy_by_design", "data_minimization"]', '["system_design", "privacy_impact_assessments"]', 'high', 9, 1, 0),
            (1, 'GDPR-ART-32', 'Security of Processing', 'The controller and processor shall implement appropriate technical and organisational measures', 'Security', '["encryption", "access_controls", "security_monitoring"]', '["security_policies", "incident_response"]', 'critical', 10, 1, 0)
        ]
        
        cursor.executemany("""
            INSERT OR IGNORE INTO compliance_policies 
            (framework_id, policy_id, title, description, category, technical_controls, procedural_controls, risk_level, priority, is_mandatory, is_implemented)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, gdpr_policies)
        
        print("✅ Sample GDPR policies inserted")
        
        # Insert sample audit logs
        retention_date = (datetime.now() + timedelta(days=2555)).isoformat()
        
        sample_audit_logs = [
            ('user_login', 'Authentication', 'User admin logged in successfully', 1, 'admin', 'sess_123', '192.168.1.100', 'Mozilla/5.0', 'POST', '/api/auth/login', '{}', '{}', 200, 150.5, 'user', '1', 'admin', '{}', '{"login_time": "2024-01-15T10:00:00Z"}', 'low', 1, retention_date, 'US', 'California', 'San Francisco'),
            ('document_upload', 'Document Management', 'Document uploaded: test_document.pdf', 1, 'admin', 'sess_123', '192.168.1.100', 'Mozilla/5.0', 'POST', '/api/documents/upload', '{}', '{}', 201, 2500.0, 'document', '1', 'test_document.pdf', '{}', '{"file_size": 1024000, "file_type": "pdf"}', 'medium', 1, retention_date, 'US', 'California', 'San Francisco'),
            ('system_config', 'System Administration', 'Compliance framework configuration updated', 1, 'admin', 'sess_123', '192.168.1.100', 'Mozilla/5.0', 'PUT', '/api/compliance/frameworks/1', '{}', '{}', 200, 300.0, 'compliance_framework', '1', 'GDPR', '{"retention_period_days": 2555}', '{"retention_period_days": 3650}', 'medium', 1, retention_date, 'US', 'California', 'San Francisco')
        ]
        
        cursor.executemany("""
            INSERT INTO compliance_audit_logs 
            (event_type, event_category, event_description, user_id, username, session_id, ip_address, user_agent, request_method, request_url, request_headers, request_body, response_status, response_time_ms, resource_type, resource_id, resource_name, old_values, new_values, risk_level, compliance_relevant, retention_until, country, region, city)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, sample_audit_logs)
        
        print("✅ Sample audit logs inserted")
        
        # Insert sample compliance assessment
        cursor.execute("""
            INSERT OR IGNORE INTO compliance_assessments 
            (framework_id, assessment_name, assessment_type, scope, start_date, due_date, status, assessor_name, assessor_organization, created_by)
            VALUES (1, 'Q1 2024 GDPR Compliance Assessment', 'internal', 'Full system assessment covering all GDPR requirements', '2024-01-01', '2024-03-31', 'pending_review', 'John Smith', 'Internal Audit Team', 1)
        """)
        
        print("✅ Sample compliance assessment inserted")
        
        # Insert sample compliance metrics
        metrics = [
            (1, 'Policy Implementation Rate', 'percentage', 'Percentage of mandatory policies implemented', 60.0, 100.0, 80.0, 70.0, 'COUNT(implemented) / COUNT(total) * 100', '["compliance_policies"]', 'monthly', datetime.now().isoformat(), (datetime.now() + timedelta(days=30)).isoformat(), 1),
            (1, 'Audit Log Retention Compliance', 'percentage', 'Percentage of audit logs properly retained', 95.0, 100.0, 90.0, 85.0, 'COUNT(retained) / COUNT(total) * 100', '["audit_logs"]', 'daily', datetime.now().isoformat(), (datetime.now() + timedelta(days=1)).isoformat(), 1),
            (1, 'Data Subject Request Response Time', 'duration', 'Average time to respond to data subject requests (hours)', 48.0, 72.0, 60.0, 48.0, 'AVG(response_time_hours)', '["data_subject_requests"]', 'weekly', datetime.now().isoformat(), (datetime.now() + timedelta(days=7)).isoformat(), 1)
        ]
        
        cursor.executemany("""
            INSERT OR IGNORE INTO compliance_metrics 
            (framework_id, metric_name, metric_type, description, current_value, target_value, threshold_warning, threshold_critical, calculation_method, data_sources, update_frequency, last_calculated, next_calculation, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, metrics)
        
        print("✅ Sample compliance metrics inserted")
        
        # Commit all changes
        conn.commit()
        print("✅ All compliance system data committed to database")
        
        # Verify table creation
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%compliance%' OR name LIKE '%audit%'")
        tables = cursor.fetchall()
        print(f"✅ Created {len(tables)} compliance/audit tables: {[t[0] for t in tables]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating compliance tables: {str(e)}")
        conn.rollback()
        return False
        
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 Starting compliance and audit system database setup...")
    success = create_compliance_tables()
    if success:
        print("🎉 Compliance and audit system database setup completed successfully!")
        print("\n📊 System includes:")
        print("   • Compliance frameworks (GDPR, HIPAA, SOX, ISO27001, PCI-DSS)")
        print("   • Policy management with implementation tracking")
        print("   • Comprehensive audit logging with 7-year retention")
        print("   • Compliance assessments and policy evaluations")
        print("   • Violation tracking and remediation management")
        print("   • Data classification system (5 levels)")
        print("   • Document compliance tracking")
        print("   • Automated compliance reporting")
        print("   • Real-time compliance metrics and monitoring")
        print("\n🔒 Enterprise-grade compliance and audit capabilities ready!")
    else:
        print("❌ Failed to set up compliance and audit system database")
        exit(1)