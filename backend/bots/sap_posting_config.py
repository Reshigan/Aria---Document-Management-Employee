"""
SAP Posting Configuration for Document Types

This module defines SAP posting requirements for each document type,
including which SAP transaction code to use and whether line items are required.
"""

SAP_POSTING_CONFIG = {
    "invoice": {
        "default_tcode": "FB60",
        "module": "FI-AP",
        "description": "Vendor Invoice (without PO)",
        "line_items_required": True,
        "accounting_impact": "DR Expense/Asset, CR Accounts Payable",
        "alternative_tcodes": {
            "MIRO": {
                "condition": "has_po_number",
                "module": "MM",
                "description": "Invoice Receipt (with PO - 3-way match)",
                "rationale": "Invoice references PO → Use MIRO for 3-way match (PO, GR, IR)"
            }
        }
    },
    "credit_note": {
        "default_tcode": "FB65",
        "module": "FI-AP",
        "description": "Vendor Credit Memo",
        "line_items_required": True,
        "accounting_impact": "DR Accounts Payable, CR Expense/Asset",
        "rationale": "Credit note for returns or adjustments → Post via FB65"
    },
    "remittance_advice": {
        "default_tcode": "F-28",
        "module": "FI",
        "description": "Incoming Payment",
        "line_items_required": False,
        "accounting_impact": "DR Bank, CR Accounts Receivable",
        "rationale": "Remittance advice (incoming payment) → Process via F-28",
        "header_only": True
    },
    "bank_statement": {
        "default_tcode": "FF_5",
        "module": "FI",
        "description": "Electronic Bank Statement",
        "line_items_required": True,
        "accounting_impact": "Various (per transaction line)",
        "rationale": "Bank statement with multiple transactions → Import via FF_5"
    },
    "delivery_note": {
        "default_tcode": "VL02N",
        "module": "SD",
        "description": "Outbound Delivery",
        "line_items_required": True,
        "accounting_impact": "No accounting posting (logistics document)",
        "rationale": "Delivery note → Display/change via VL02N (no GL posting)"
    },
    "purchase_order": {
        "default_tcode": "ME23N",
        "module": "MM",
        "description": "Purchase Order Display",
        "line_items_required": True,
        "accounting_impact": "No accounting posting (procurement document)",
        "rationale": "Purchase order → Display via ME23N (no GL posting)"
    },
    "customer_invoice": {
        "default_tcode": "VF01",
        "module": "SD",
        "description": "Create Billing Document",
        "line_items_required": True,
        "accounting_impact": "DR Accounts Receivable, CR Revenue",
        "rationale": "Customer invoice → Create via VF01 (auto-posts to FI)"
    },
    "receipt": {
        "default_tcode": "FB03",
        "module": "FI",
        "description": "Display Document",
        "line_items_required": False,
        "accounting_impact": "Display only (no posting)",
        "rationale": "Receipt → Display via FB03 (reference only)",
        "header_only": True
    },
    "contract": {
        "default_tcode": None,
        "module": None,
        "description": "Reference document (no SAP posting)",
        "line_items_required": False,
        "accounting_impact": "No posting",
        "rationale": "Contract → Reference document only, no SAP transaction"
    },
    "report": {
        "default_tcode": None,
        "module": None,
        "description": "Reference document (no SAP posting)",
        "line_items_required": False,
        "accounting_impact": "No posting",
        "rationale": "Report → Reference document only, no SAP transaction"
    },
    "other": {
        "default_tcode": None,
        "module": None,
        "description": "Unclassified document",
        "line_items_required": False,
        "accounting_impact": "Unknown",
        "rationale": "Document type not recognized → Manual classification required"
    }
}

def get_sap_posting_info(doc_type: str, has_po_number: bool = False) -> dict:
    """
    Get SAP posting information for a document type.
    
    Args:
        doc_type: Document type (invoice, credit_note, etc.)
        has_po_number: Whether the document has a PO number reference
        
    Returns:
        Dictionary with SAP posting information including:
        - tcode: SAP transaction code
        - module: SAP module
        - description: Transaction description
        - line_items_required: Whether line items are required
        - rationale: Explanation of why this transaction is recommended
    """
    config = SAP_POSTING_CONFIG.get(doc_type, SAP_POSTING_CONFIG["other"])
    
    # Check for alternative transaction codes based on conditions
    if "alternative_tcodes" in config and has_po_number:
        for alt_tcode, alt_config in config["alternative_tcodes"].items():
            if alt_config.get("condition") == "has_po_number":
                return {
                    "tcode": alt_tcode,
                    "module": alt_config["module"],
                    "description": alt_config["description"],
                    "line_items_required": config["line_items_required"],
                    "rationale": alt_config["rationale"],
                    "confidence": 0.95
                }
    
    # Return default transaction code
    return {
        "tcode": config.get("default_tcode"),
        "module": config.get("module"),
        "description": config.get("description"),
        "line_items_required": config.get("line_items_required", False),
        "rationale": config.get("rationale", ""),
        "confidence": 0.90 if config.get("default_tcode") else 0.0
    }

def requires_line_items(doc_type: str) -> bool:
    """Check if a document type requires line items for SAP posting."""
    config = SAP_POSTING_CONFIG.get(doc_type, SAP_POSTING_CONFIG["other"])
    return config.get("line_items_required", False)

def is_header_only(doc_type: str) -> bool:
    """Check if a document type is header-only (no line items)."""
    config = SAP_POSTING_CONFIG.get(doc_type, SAP_POSTING_CONFIG["other"])
    return config.get("header_only", False)

def has_accounting_impact(doc_type: str) -> bool:
    """Check if a document type has accounting impact (posts to GL)."""
    config = SAP_POSTING_CONFIG.get(doc_type, SAP_POSTING_CONFIG["other"])
    impact = config.get("accounting_impact", "")
    return impact and "No posting" not in impact and "Display only" not in impact
