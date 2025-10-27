"""
ARIA - Natural Language Processing Engine
Intent Recognition and Parameter Extraction for Bot Routing
"""

from typing import Dict, Any, List, Optional, Tuple
import re
from datetime import datetime


class IntentRecognizer:
    """
    Natural Language Processing engine for understanding user requests
    and routing them to the appropriate bots.
    """
    
    def __init__(self):
        self.intent_patterns = self._build_intent_patterns()
        self.bot_mappings = self._build_bot_mappings()
        
    def _build_intent_patterns(self) -> Dict[str, List[Dict[str, Any]]]:
        """Define patterns for intent recognition"""
        return {
            # Manufacturing intents
            "production_planning": [
                {
                    "pattern": r"(?:plan|create|schedule|organize)\s+(?:production|manufacturing)",
                    "keywords": ["plan production", "create plan", "schedule production", "manufacturing plan"],
                    "bot": "mrp_bot",
                    "params": ["product", "quantity", "deadline"]
                },
                {
                    "pattern": r"(?:material|materials)\s+(?:requirement|planning|needed)",
                    "keywords": ["material requirements", "materials needed", "mrp"],
                    "bot": "mrp_bot",
                    "params": ["bom", "quantity"]
                }
            ],
            
            "quality_prediction": [
                {
                    "pattern": r"(?:quality|defect|inspection)\s+(?:predict|forecast|check|analyze)",
                    "keywords": ["quality check", "predict defects", "quality issues", "inspection"],
                    "bot": "quality_predictor",
                    "params": ["product", "batch"]
                }
            ],
            
            "inventory_management": [
                {
                    "pattern": r"(?:check|optimize|manage)\s+(?:inventory|stock)",
                    "keywords": ["check inventory", "stock levels", "inventory optimization"],
                    "bot": "inventory_optimizer",
                    "params": ["product", "location"]
                }
            ],
            
            "maintenance_prediction": [
                {
                    "pattern": r"(?:predict|forecast)\s+(?:maintenance|failure|breakdown)",
                    "keywords": ["predictive maintenance", "equipment failure", "maintenance schedule"],
                    "bot": "predictive_maintenance",
                    "params": ["equipment", "last_maintenance"]
                }
            ],
            
            "production_scheduling": [
                {
                    "pattern": r"(?:schedule|plan)\s+(?:production|manufacturing|work)",
                    "keywords": ["production schedule", "schedule work", "optimize production"],
                    "bot": "production_scheduler",
                    "params": ["orders", "capacity"]
                }
            ],
            
            # Healthcare intents
            "patient_scheduling": [
                {
                    "pattern": r"(?:schedule|book|arrange)\s+(?:patient|appointment|visit)",
                    "keywords": ["schedule patient", "book appointment", "patient visit"],
                    "bot": "patient_scheduling",
                    "params": ["patient_name", "doctor", "date"]
                }
            ],
            
            "medical_records": [
                {
                    "pattern": r"(?:access|retrieve|get|process)\s+(?:medical|health)\s+(?:record|file)",
                    "keywords": ["medical records", "patient records", "health records"],
                    "bot": "medical_records",
                    "params": ["patient_id", "record_type"]
                }
            ],
            
            "insurance_claims": [
                {
                    "pattern": r"(?:process|submit|handle)\s+(?:insurance|claim)",
                    "keywords": ["insurance claim", "process claim", "submit claim"],
                    "bot": "insurance_claims",
                    "params": ["patient_id", "claim_type", "amount"]
                }
            ],
            
            "lab_results": [
                {
                    "pattern": r"(?:analyze|process|check)\s+(?:lab|laboratory)\s+(?:result|test)",
                    "keywords": ["lab results", "test results", "laboratory analysis"],
                    "bot": "lab_results",
                    "params": ["patient_id", "test_type"]
                }
            ],
            
            "prescription_management": [
                {
                    "pattern": r"(?:manage|create|renew|refill)\s+(?:prescription|medication)",
                    "keywords": ["prescription", "medication", "refill prescription"],
                    "bot": "prescription_management",
                    "params": ["patient_id", "medication", "dosage"]
                }
            ],
            
            # Retail intents
            "demand_forecasting": [
                {
                    "pattern": r"(?:forecast|predict|estimate)\s+(?:demand|sales)",
                    "keywords": ["demand forecast", "predict sales", "sales forecast"],
                    "bot": "demand_forecasting",
                    "params": ["product", "period", "location"]
                }
            ],
            
            "price_optimization": [
                {
                    "pattern": r"(?:optimize|adjust|set)\s+(?:price|pricing)",
                    "keywords": ["price optimization", "dynamic pricing", "pricing strategy"],
                    "bot": "price_optimization",
                    "params": ["product", "competitor_prices"]
                }
            ],
            
            "customer_segmentation": [
                {
                    "pattern": r"(?:segment|analyze|categorize)\s+(?:customer|client)",
                    "keywords": ["customer segmentation", "customer analysis", "customer groups"],
                    "bot": "customer_segmentation",
                    "params": ["customer_data"]
                }
            ],
            
            "store_performance": [
                {
                    "pattern": r"(?:analyze|check|review)\s+(?:store|outlet)\s+(?:performance|sales)",
                    "keywords": ["store performance", "sales analysis", "store analytics"],
                    "bot": "store_performance",
                    "params": ["store_id", "period"]
                }
            ],
            
            "loyalty_program": [
                {
                    "pattern": r"(?:manage|track|analyze)\s+(?:loyalty|reward|points)",
                    "keywords": ["loyalty program", "customer rewards", "points system"],
                    "bot": "loyalty_program",
                    "params": ["customer_id"]
                }
            ],
            
            # ERP intents
            "create_bom": [
                {
                    "pattern": r"(?:create|add|make)\s+(?:bom|bill of materials)",
                    "keywords": ["create bom", "add bom", "bill of materials"],
                    "bot": "erp_manufacturing",
                    "action": "create_bom",
                    "params": ["product_name", "components"]
                }
            ],
            
            "create_work_order": [
                {
                    "pattern": r"(?:create|generate|make)\s+(?:work order|production order)",
                    "keywords": ["create work order", "production order", "work order"],
                    "bot": "erp_manufacturing",
                    "action": "create_work_order",
                    "params": ["product", "quantity"]
                }
            ],
            
            "create_inspection": [
                {
                    "pattern": r"(?:create|schedule|perform)\s+(?:quality inspection|inspection)",
                    "keywords": ["quality inspection", "create inspection", "schedule inspection"],
                    "bot": "erp_quality",
                    "action": "create_inspection",
                    "params": ["product", "batch"]
                }
            ]
        }
    
    def _build_bot_mappings(self) -> Dict[str, Dict[str, Any]]:
        """Map bot IDs to their capabilities and descriptions"""
        return {
            "mrp_bot": {
                "name": "Material Requirements Planning",
                "description": "Plans material requirements and schedules",
                "category": "manufacturing",
                "required_params": ["bom", "quantity"]
            },
            "production_scheduler": {
                "name": "Production Scheduler",
                "description": "Optimizes production schedules",
                "category": "manufacturing",
                "required_params": ["orders"]
            },
            "quality_predictor": {
                "name": "Quality Predictor",
                "description": "Predicts quality issues and defects",
                "category": "manufacturing",
                "required_params": ["product"]
            },
            "predictive_maintenance": {
                "name": "Predictive Maintenance",
                "description": "Predicts equipment failures",
                "category": "manufacturing",
                "required_params": ["equipment"]
            },
            "inventory_optimizer": {
                "name": "Inventory Optimizer",
                "description": "Optimizes inventory levels",
                "category": "manufacturing",
                "required_params": ["current_stock"]
            },
            "patient_scheduling": {
                "name": "Patient Scheduling",
                "description": "Manages patient appointments",
                "category": "healthcare",
                "required_params": ["patient_name", "date"]
            },
            "medical_records": {
                "name": "Medical Records",
                "description": "Processes medical records",
                "category": "healthcare",
                "required_params": ["patient_id"]
            },
            "insurance_claims": {
                "name": "Insurance Claims",
                "description": "Processes insurance claims",
                "category": "healthcare",
                "required_params": ["patient_id", "amount"]
            },
            "lab_results": {
                "name": "Lab Results",
                "description": "Analyzes laboratory results",
                "category": "healthcare",
                "required_params": ["patient_id", "test_type"]
            },
            "prescription_management": {
                "name": "Prescription Management",
                "description": "Manages prescriptions and medications",
                "category": "healthcare",
                "required_params": ["patient_id", "medication"]
            },
            "demand_forecasting": {
                "name": "Demand Forecasting",
                "description": "Forecasts product demand",
                "category": "retail",
                "required_params": ["historical_data"]
            },
            "price_optimization": {
                "name": "Price Optimization",
                "description": "Optimizes product pricing",
                "category": "retail",
                "required_params": ["product", "cost"]
            },
            "customer_segmentation": {
                "name": "Customer Segmentation",
                "description": "Segments customers by behavior",
                "category": "retail",
                "required_params": ["customer_data"]
            },
            "store_performance": {
                "name": "Store Performance",
                "description": "Analyzes store performance",
                "category": "retail",
                "required_params": ["store_id"]
            },
            "loyalty_program": {
                "name": "Loyalty Program",
                "description": "Manages customer loyalty programs",
                "category": "retail",
                "required_params": ["customer_id"]
            }
        }
    
    def recognize_intent(self, text: str) -> Dict[str, Any]:
        """
        Analyze text and recognize user intent
        
        Args:
            text: Natural language input from user
            
        Returns:
            Dict containing intent, bot, confidence, and extracted params
        """
        text_lower = text.lower()
        
        # Try to match patterns
        for intent_name, patterns in self.intent_patterns.items():
            for pattern_config in patterns:
                # Check regex pattern
                if re.search(pattern_config["pattern"], text_lower):
                    return self._build_intent_result(
                        intent=intent_name,
                        bot=pattern_config["bot"],
                        action=pattern_config.get("action"),
                        confidence=0.9,
                        text=text,
                        required_params=pattern_config.get("params", [])
                    )
                
                # Check keywords
                keyword_matches = sum(1 for kw in pattern_config["keywords"] if kw in text_lower)
                if keyword_matches > 0:
                    confidence = min(0.5 + (keyword_matches * 0.2), 0.95)
                    return self._build_intent_result(
                        intent=intent_name,
                        bot=pattern_config["bot"],
                        action=pattern_config.get("action"),
                        confidence=confidence,
                        text=text,
                        required_params=pattern_config.get("params", [])
                    )
        
        # No match found
        return {
            "intent": "unknown",
            "confidence": 0.0,
            "bot": None,
            "action": None,
            "message": "I couldn't understand your request. Could you please rephrase?",
            "suggestions": self._get_suggestions()
        }
    
    def _build_intent_result(
        self, 
        intent: str, 
        bot: str, 
        action: Optional[str],
        confidence: float, 
        text: str,
        required_params: List[str]
    ) -> Dict[str, Any]:
        """Build the intent recognition result"""
        extracted_params = self.extract_parameters(text, required_params)
        bot_info = self.bot_mappings.get(bot, {})
        
        return {
            "intent": intent,
            "confidence": confidence,
            "bot": bot,
            "bot_name": bot_info.get("name", bot),
            "action": action,
            "category": bot_info.get("category", "unknown"),
            "extracted_params": extracted_params,
            "required_params": required_params,
            "missing_params": [p for p in required_params if p not in extracted_params],
            "message": f"I understand you want to {intent.replace('_', ' ')}. I'll use the {bot_info.get('name', bot)} bot."
        }
    
    def extract_parameters(self, text: str, param_names: List[str]) -> Dict[str, Any]:
        """
        Extract parameters from natural language text
        
        Args:
            text: Natural language input
            param_names: List of parameter names to extract
            
        Returns:
            Dictionary of extracted parameters
        """
        params = {}
        text_lower = text.lower()
        
        # Extract numbers (quantities, amounts, etc.)
        numbers = re.findall(r'\b\d+\b', text)
        
        # Common parameter extraction patterns
        for param_name in param_names:
            if param_name in ["quantity", "qty", "units"]:
                if numbers:
                    params["quantity"] = int(numbers[0])
            
            elif param_name in ["product", "product_name", "item"]:
                # Look for product names (capitalized words or after "of")
                product_match = re.search(r'(?:of|for)\s+([A-Z][\w\s]+?)(?:\s|$|,|\.|by)', text)
                if product_match:
                    params["product_name"] = product_match.group(1).strip()
                else:
                    # Try to find capitalized words
                    words = text.split()
                    for i, word in enumerate(words):
                        if word[0].isupper() and word not in ["I", "We", "Can", "Please", "The", "A", "An"]:
                            params["product_name"] = word
                            break
            
            elif param_name in ["date", "deadline", "by"]:
                # Extract dates
                date_patterns = [
                    r'(\d{4}-\d{2}-\d{2})',  # YYYY-MM-DD
                    r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})',  # Month Day
                    r'(next\s+(?:week|month|year))',
                    r'(tomorrow|today)'
                ]
                for pattern in date_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        params["deadline"] = match.group(1)
                        break
            
            elif param_name in ["customer_id", "patient_id", "store_id"]:
                # Extract IDs (numbers or alphanumeric)
                id_match = re.search(rf'{param_name[:-3]}\s*(?:id|#|number)?\s*:?\s*([A-Z0-9-]+)', text_lower)
                if id_match:
                    params[param_name] = id_match.group(1).upper()
                elif numbers:
                    params[param_name] = numbers[0]
            
            elif param_name == "bom":
                # BOM might be provided as JSON or needs to be fetched
                if "{" in text and "}" in text:
                    params["bom"] = "provided_in_request"
                else:
                    params["bom"] = "fetch_from_erp"
        
        return params
    
    def _get_suggestions(self) -> List[str]:
        """Get suggestions for what Aria can help with"""
        return [
            "Plan production for [quantity] units of [product]",
            "Check inventory levels for [product]",
            "Predict quality issues for [product]",
            "Schedule maintenance for [equipment]",
            "Forecast demand for [product]",
            "Optimize pricing for [product]",
            "Create a bill of materials",
            "Generate a work order",
            "Schedule a quality inspection"
        ]
    
    def get_clarification_question(self, intent_result: Dict[str, Any]) -> Optional[str]:
        """
        Generate a clarification question if parameters are missing
        
        Args:
            intent_result: Result from recognize_intent()
            
        Returns:
            Clarification question or None
        """
        missing = intent_result.get("missing_params", [])
        if not missing:
            return None
        
        param = missing[0]
        
        # Map parameters to human-friendly questions
        questions = {
            "quantity": "How many units do you need?",
            "product": "Which product are you referring to?",
            "product_name": "What is the product name?",
            "date": "What date would you like?",
            "deadline": "What's the deadline?",
            "customer_id": "What is the customer ID?",
            "patient_id": "What is the patient ID?",
            "store_id": "Which store are you asking about?",
            "bom": "Do you have a Bill of Materials, or should I fetch it from ERP?",
            "equipment": "Which equipment are you referring to?",
            "location": "Which location?",
            "period": "What time period (e.g., next month, Q1)?",
        }
        
        return questions.get(param, f"Could you please provide the {param.replace('_', ' ')}?")


class ConversationManager:
    """Manages multi-turn conversations with context"""
    
    def __init__(self):
        self.conversations: Dict[str, Dict[str, Any]] = {}
    
    def start_conversation(self, user_id: str, intent_result: Dict[str, Any]) -> str:
        """Start a new conversation"""
        conversation_id = f"conv_{user_id}_{datetime.now().timestamp()}"
        
        self.conversations[conversation_id] = {
            "user_id": user_id,
            "intent": intent_result,
            "started_at": datetime.now().isoformat(),
            "messages": [],
            "status": "active"
        }
        
        return conversation_id
    
    def add_message(self, conversation_id: str, role: str, message: str):
        """Add a message to conversation history"""
        if conversation_id in self.conversations:
            self.conversations[conversation_id]["messages"].append({
                "role": role,
                "message": message,
                "timestamp": datetime.now().isoformat()
            })
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation by ID"""
        return self.conversations.get(conversation_id)
    
    def end_conversation(self, conversation_id: str):
        """Mark conversation as completed"""
        if conversation_id in self.conversations:
            self.conversations[conversation_id]["status"] = "completed"
            self.conversations[conversation_id]["ended_at"] = datetime.now().isoformat()


# Singleton instances
_intent_recognizer = None
_conversation_manager = None


def get_intent_recognizer() -> IntentRecognizer:
    """Get singleton IntentRecognizer instance"""
    global _intent_recognizer
    if _intent_recognizer is None:
        _intent_recognizer = IntentRecognizer()
    return _intent_recognizer


def get_conversation_manager() -> ConversationManager:
    """Get singleton ConversationManager instance"""
    global _conversation_manager
    if _conversation_manager is None:
        _conversation_manager = ConversationManager()
    return _conversation_manager
