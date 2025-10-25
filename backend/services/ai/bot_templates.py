"""
Bot Templates System
Pre-configured bot templates for common use cases
"""
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import json


class TemplateCategory(str, Enum):
    """Template categories"""
    DOCUMENT = "document"
    EXTRACTION = "extraction"
    ANALYSIS = "analysis"
    LEGAL = "legal"
    COMPLIANCE = "compliance"
    FINANCE = "finance"
    HR = "hr"
    CUSTOM = "custom"


@dataclass
class BotTemplate:
    """Bot template definition"""
    id: str
    name: str
    description: str
    category: TemplateCategory
    system_prompt: str
    parameters: Dict[str, Any]
    icon: str
    example_queries: List[str]
    output_format: Optional[str] = None
    required_fields: List[str] = None
    
    def to_dict(self) -> Dict:
        data = asdict(self)
        data['category'] = self.category.value
        return data


class BotTemplateLibrary:
    """Library of pre-configured bot templates"""
    
    def __init__(self):
        self.templates = self._load_templates()
    
    def _load_templates(self) -> Dict[str, BotTemplate]:
        """Load all templates"""
        templates = [
            # Document Q&A Template
            BotTemplate(
                id="doc-qa",
                name="Document Q&A Assistant",
                description="Ask questions about uploaded documents and get accurate answers with citations",
                category=TemplateCategory.DOCUMENT,
                system_prompt="""You are an expert document analysis assistant. Your role is to:
1. Answer questions about document content accurately
2. Cite specific sections when providing answers
3. Acknowledge when information is not in the document
4. Provide clear, concise explanations
5. Suggest related information the user might find helpful

Always include page numbers or section references in your responses.""",
                parameters={
                    "temperature": 0.3,
                    "max_tokens": 2000,
                    "citation_required": True
                },
                icon="📄",
                example_queries=[
                    "What is the main topic of this document?",
                    "Summarize section 3",
                    "What are the key dates mentioned?",
                    "Find all references to financial data"
                ],
                output_format="text_with_citations"
            ),
            
            # Invoice Extraction Template
            BotTemplate(
                id="invoice-extraction",
                name="Invoice Data Extractor",
                description="Automatically extract structured data from invoices including line items, totals, and vendor info",
                category=TemplateCategory.EXTRACTION,
                system_prompt="""You are an expert invoice processing assistant. Extract the following information:
- Invoice number
- Invoice date
- Due date
- Vendor name and address
- Customer name and address
- Line items (description, quantity, unit price, total)
- Subtotal, tax, and total amount
- Payment terms

Return data in JSON format. If a field is not present, use null.""",
                parameters={
                    "temperature": 0.1,
                    "max_tokens": 3000,
                    "output_format": "json"
                },
                icon="🧾",
                example_queries=[
                    "Extract all invoice data",
                    "What is the total amount?",
                    "List all line items",
                    "Who is the vendor?"
                ],
                output_format="json",
                required_fields=["invoice_number", "total_amount", "vendor_name"]
            ),
            
            # Contract Analysis Template
            BotTemplate(
                id="contract-analysis",
                name="Contract Analyzer",
                description="Analyze contracts to identify key clauses, obligations, risks, and important dates",
                category=TemplateCategory.LEGAL,
                system_prompt="""You are a legal contract analysis assistant. Analyze contracts and identify:
- Key parties and their obligations
- Important dates (start, end, renewal, notice periods)
- Payment terms and financial obligations
- Termination clauses
- Liability and indemnification clauses
- Potential risks or unusual terms
- Compliance requirements

Provide clear summaries and flag any concerning clauses.""",
                parameters={
                    "temperature": 0.2,
                    "max_tokens": 4000,
                    "analysis_depth": "comprehensive"
                },
                icon="📜",
                example_queries=[
                    "What are the key terms of this contract?",
                    "Identify all important dates",
                    "What are the termination conditions?",
                    "Are there any unusual or risky clauses?"
                ],
                output_format="structured_analysis"
            ),
            
            # Document Summarization Template
            BotTemplate(
                id="document-summary",
                name="Document Summarizer",
                description="Generate clear, concise summaries of long documents",
                category=TemplateCategory.DOCUMENT,
                system_prompt="""You are an expert at creating clear, concise document summaries. Your summaries should:
1. Capture the main points and key information
2. Be 20-30% of the original length
3. Use bullet points for clarity
4. Highlight actionable items or important decisions
5. Maintain the document's tone and context

Always include: Purpose, Key Points, Important Dates/Numbers, and Next Steps (if applicable).""",
                parameters={
                    "temperature": 0.4,
                    "max_tokens": 1500,
                    "summary_style": "executive"
                },
                icon="📝",
                example_queries=[
                    "Summarize this document",
                    "Give me the key points",
                    "What are the action items?",
                    "Create an executive summary"
                ],
                output_format="structured_summary"
            ),
            
            # Compliance Checker Template
            BotTemplate(
                id="compliance-check",
                name="Compliance Checker",
                description="Check documents for regulatory compliance and identify potential issues",
                category=TemplateCategory.COMPLIANCE,
                system_prompt="""You are a compliance verification assistant. Review documents for:
- Regulatory compliance (GDPR, HIPAA, SOX, etc.)
- Required disclosures and notices
- Data protection and privacy requirements
- Industry-specific regulations
- Missing or incomplete information
- Potential compliance risks

Provide a compliance score and detailed findings with recommendations.""",
                parameters={
                    "temperature": 0.2,
                    "max_tokens": 3000,
                    "compliance_frameworks": ["GDPR", "CCPA", "SOX"]
                },
                icon="✅",
                example_queries=[
                    "Is this document GDPR compliant?",
                    "Check for compliance issues",
                    "What regulations apply here?",
                    "Are there any missing required disclosures?"
                ],
                output_format="compliance_report"
            ),
            
            # Receipt Processing Template
            BotTemplate(
                id="receipt-processing",
                name="Receipt Processor",
                description="Extract data from receipts for expense tracking and accounting",
                category=TemplateCategory.FINANCE,
                system_prompt="""You are a receipt processing assistant. Extract:
- Merchant name and location
- Date and time of purchase
- Individual line items with prices
- Subtotal, tax, and total
- Payment method
- Receipt/transaction number
- Category classification (meals, travel, office supplies, etc.)

Return structured data suitable for expense reporting.""",
                parameters={
                    "temperature": 0.1,
                    "max_tokens": 2000,
                    "output_format": "json"
                },
                icon="🧮",
                example_queries=[
                    "Extract receipt data",
                    "What category is this expense?",
                    "What's the total amount?",
                    "Where was this purchase made?"
                ],
                output_format="json",
                required_fields=["merchant", "total", "date"]
            ),
            
            # Resume Screening Template
            BotTemplate(
                id="resume-screening",
                name="Resume Screener",
                description="Analyze resumes and match candidates to job requirements",
                category=TemplateCategory.HR,
                system_prompt="""You are an HR assistant specializing in resume analysis. Extract and analyze:
- Contact information
- Work experience (companies, roles, dates, responsibilities)
- Education (degrees, institutions, dates)
- Skills (technical, soft skills, languages)
- Certifications and achievements
- Match score against job requirements

Provide a structured summary and hiring recommendations.""",
                parameters={
                    "temperature": 0.3,
                    "max_tokens": 3000,
                    "analysis_criteria": "comprehensive"
                },
                icon="👤",
                example_queries=[
                    "Summarize this candidate's experience",
                    "What are their key skills?",
                    "How well do they match the job requirements?",
                    "Years of relevant experience?"
                ],
                output_format="candidate_profile"
            ),
            
            # Form Filler Template
            BotTemplate(
                id="form-filler",
                name="Intelligent Form Filler",
                description="Extract data from documents and populate forms automatically",
                category=TemplateCategory.EXTRACTION,
                system_prompt="""You are a form filling assistant. Extract information from source documents and map it to form fields:
1. Identify all relevant data points
2. Match data to form field requirements
3. Format data appropriately (dates, addresses, phone numbers)
4. Flag missing or ambiguous information
5. Suggest values for optional fields

Return a JSON mapping of form fields to extracted values.""",
                parameters={
                    "temperature": 0.2,
                    "max_tokens": 2500,
                    "strict_validation": True
                },
                icon="📋",
                example_queries=[
                    "Fill in the form fields",
                    "Extract data for application",
                    "What information is missing?",
                    "Map document data to form"
                ],
                output_format="json"
            ),
            
            # Email Responder Template
            BotTemplate(
                id="email-responder",
                name="Email Response Assistant",
                description="Draft professional email responses based on context and intent",
                category=TemplateCategory.DOCUMENT,
                system_prompt="""You are an email composition assistant. Draft professional email responses that:
1. Match the tone and formality of the original email
2. Address all questions and concerns
3. Provide clear, actionable information
4. Include appropriate greetings and closings
5. Are concise yet complete

Adapt your style based on the relationship (client, colleague, vendor, etc.).""",
                parameters={
                    "temperature": 0.6,
                    "max_tokens": 1500,
                    "tone": "professional"
                },
                icon="✉️",
                example_queries=[
                    "Draft a response to this email",
                    "How should I reply to this request?",
                    "Compose a follow-up email",
                    "Write a professional decline"
                ],
                output_format="email_draft"
            ),
            
            # Report Generator Template
            BotTemplate(
                id="report-generator",
                name="Report Generator",
                description="Generate comprehensive reports from multiple document sources",
                category=TemplateCategory.ANALYSIS,
                system_prompt="""You are a report generation assistant. Create comprehensive reports that:
1. Synthesize information from multiple sources
2. Organize data into logical sections
3. Include executive summary, findings, and recommendations
4. Use charts and tables where appropriate
5. Cite all sources
6. Maintain professional formatting

Structure: Executive Summary, Background, Analysis, Findings, Recommendations, Conclusion.""",
                parameters={
                    "temperature": 0.5,
                    "max_tokens": 4000,
                    "report_style": "business"
                },
                icon="📊",
                example_queries=[
                    "Generate a report on these documents",
                    "Create an analysis report",
                    "Synthesize findings from all sources",
                    "Draft monthly summary report"
                ],
                output_format="formatted_report"
            )
        ]
        
        return {template.id: template for template in templates}
    
    def get_template(self, template_id: str) -> Optional[BotTemplate]:
        """Get template by ID"""
        return self.templates.get(template_id)
    
    def list_templates(
        self, 
        category: Optional[TemplateCategory] = None
    ) -> List[BotTemplate]:
        """List all templates, optionally filtered by category"""
        templates = list(self.templates.values())
        
        if category:
            templates = [t for t in templates if t.category == category]
        
        return sorted(templates, key=lambda t: t.name)
    
    def get_categories(self) -> List[str]:
        """Get all available categories"""
        return [cat.value for cat in TemplateCategory]
    
    def search_templates(self, query: str) -> List[BotTemplate]:
        """Search templates by name or description"""
        query_lower = query.lower()
        results = []
        
        for template in self.templates.values():
            if (query_lower in template.name.lower() or 
                query_lower in template.description.lower()):
                results.append(template)
        
        return sorted(results, key=lambda t: t.name)
    
    def create_custom_template(
        self,
        template_id: str,
        name: str,
        description: str,
        system_prompt: str,
        parameters: Dict[str, Any],
        icon: str = "🤖",
        example_queries: List[str] = None
    ) -> BotTemplate:
        """Create a custom bot template"""
        template = BotTemplate(
            id=template_id,
            name=name,
            description=description,
            category=TemplateCategory.CUSTOM,
            system_prompt=system_prompt,
            parameters=parameters,
            icon=icon,
            example_queries=example_queries or []
        )
        
        self.templates[template_id] = template
        return template


# Global instance
bot_template_library = BotTemplateLibrary()


# Convenience functions
def get_template(template_id: str) -> Optional[BotTemplate]:
    """Get template by ID"""
    return bot_template_library.get_template(template_id)


def list_templates(category: Optional[TemplateCategory] = None) -> List[BotTemplate]:
    """List all templates"""
    return bot_template_library.list_templates(category)


def search_templates(query: str) -> List[BotTemplate]:
    """Search templates"""
    return bot_template_library.search_templates(query)
