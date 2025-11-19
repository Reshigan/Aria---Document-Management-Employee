
CREATE TABLE IF NOT EXISTS aria_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, sha256)
);

CREATE INDEX idx_aria_documents_company ON aria_documents(company_id);
CREATE INDEX idx_aria_documents_sha256 ON aria_documents(sha256);
CREATE INDEX idx_aria_documents_uploaded_at ON aria_documents(uploaded_at DESC);

CREATE TABLE IF NOT EXISTS aria_document_classification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES aria_documents(id) ON DELETE CASCADE,
    class VARCHAR(100) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    labels JSONB,
    model VARCHAR(100) NOT NULL,
    method VARCHAR(50) DEFAULT 'rules',
    reasoning TEXT,
    classified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id)
);

CREATE INDEX idx_aria_document_classification_document ON aria_document_classification(document_id);
CREATE INDEX idx_aria_document_classification_class ON aria_document_classification(class);
CREATE INDEX idx_aria_document_classification_confidence ON aria_document_classification(confidence DESC);

CREATE TABLE IF NOT EXISTS aria_document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES aria_documents(id) ON DELETE CASCADE,
    fields JSONB NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    model VARCHAR(100) NOT NULL,
    ocr_text TEXT,
    line_items JSONB,
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id)
);

CREATE INDEX idx_aria_document_extractions_document ON aria_document_extractions(document_id);

CREATE TABLE IF NOT EXISTS aria_document_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES aria_documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),
    destination_system VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    posted_reference_id UUID,
    posted_reference_number VARCHAR(100),
    sap_export_template VARCHAR(100),
    sap_export_file_path TEXT,
    validation_errors JSONB,
    error_message TEXT,
    posted_by UUID NOT NULL,
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_aria_document_postings_document ON aria_document_postings(document_id);
CREATE INDEX idx_aria_document_postings_company ON aria_document_postings(company_id);
CREATE INDEX idx_aria_document_postings_destination ON aria_document_postings(destination_system);
CREATE INDEX idx_aria_document_postings_status ON aria_document_postings(status);

COMMENT ON TABLE aria_documents IS 'Uploaded documents for OCR and classification';
COMMENT ON TABLE aria_document_classification IS 'Document classification results (rules + LLM)';
COMMENT ON TABLE aria_document_extractions IS 'Extracted fields and line items from documents';
COMMENT ON TABLE aria_document_postings IS 'Document posting/export actions to ARIA ERP or SAP';
