# Persistent storage paths
STORAGE_DIR = Path("storage")
DOCUMENTS_FILE = STORAGE_DIR / "documents.json"
SETTINGS_FILE = STORAGE_DIR / "settings.json"
REPORTS_FILE = STORAGE_DIR / "reports.json"

# Ensure storage directory exists
STORAGE_DIR.mkdir(exist_ok=True)

def load_documents():
    """Load documents from persistent storage"""
    global MOCK_DOCUMENTS, DOCUMENT_COUNTER
    try:
        if DOCUMENTS_FILE.exists():
            with open(DOCUMENTS_FILE, 'r') as f:
                data = json.load(f)
                MOCK_DOCUMENTS = data.get('documents', [])
                DOCUMENT_COUNTER = data.get('counter', 1)
                logger.info(f"Loaded {len(MOCK_DOCUMENTS)} documents from storage")
    except Exception as e:
        logger.error(f"Error loading documents: {e}")
        MOCK_DOCUMENTS = []
        DOCUMENT_COUNTER = 1

def save_documents():
    """Save documents to persistent storage"""
    try:
        with open(DOCUMENTS_FILE, 'w') as f:
            json.dump({
                'documents': MOCK_DOCUMENTS,
                'counter': DOCUMENT_COUNTER
            }, f, indent=2, default=str)
        logger.info(f"Saved {len(MOCK_DOCUMENTS)} documents to storage")
    except Exception as e:
        logger.error(f"Error saving documents: {e}")

def load_settings():
    """Load SAP settings from persistent storage"""
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Error loading settings: {e}")
    
    # Return default settings
    return {
        'sap_connection': {
            'server': '',
            'client': '100',
            'username': '',
            'password': '',
            'system_number': '00'
        },
        'document_mappings': {
            'Invoice': {'transaction': 'FB01', 'document_type': 'KR', 'z_transaction': ''},
            'Receipt': {'transaction': 'FB01', 'document_type': 'KR', 'z_transaction': ''},
            'Contract': {'transaction': 'ME21N', 'document_type': 'NB', 'z_transaction': ''},
            'Purchase Order': {'transaction': 'ME21N', 'document_type': 'NB', 'z_transaction': ''},
            'Credit Note': {'transaction': 'FB75', 'document_type': 'DG', 'z_transaction': ''}
        },
        'confidence_threshold': 70.0,
        'auto_post_threshold': 90.0
    }

def save_settings(settings):
    """Save SAP settings to persistent storage"""
    try:
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings, f, indent=2)
        logger.info("Settings saved successfully")
        return True
    except Exception as e:
        logger.error(f"Error saving settings: {e}")
        return False
