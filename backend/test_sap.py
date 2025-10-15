#!/usr/bin/env python3

import sys
sys.path.append('/home/ubuntu/Aria---Document-Management-Employee/backend')

from enhanced_ocr_backend import SAPIntegration

# Test data
document_data = {
    'filename': 'test_invoice.txt',
    'content': 'INVOICE\n\nVantaX Holdings Ltd.\n123 Business Street\nCape Town, South Africa\n\nInvoice #: INV-2025-001\nDate: October 13, 2025\n\nBill To:\nABC Corporation\n456 Client Avenue\nJohannesburg, South Africa\n\nDescription: Software Development Services\nAmount: R15,750.00\nTax (15%): R2,362.50\nTotal: R18,112.50\n\nPayment Terms: Net 30 days\nDue Date: November 12, 2025',
    'metadata': {
        'dates_found': ['October 13, 2025', 'November 12, 2025'],
        'amounts_found': ['15,75', '0.00', '2,36', '2.50', '18,11']
    },
    'classification': {
        'document_type': 'Invoice',
        'confidence': 0.7602564102564103,
        'all_scores': {'Invoice': 0.7602564102564103}
    }
}

try:
    sap_integration = SAPIntegration()
    print("SAP Integration initialized successfully")
    
    result = sap_integration.post_document_to_sap(document_data)
    print(f"SAP posting result: {result}")
    
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()
