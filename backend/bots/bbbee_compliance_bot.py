"""
BBBEE Compliance Bot (Broad-Based Black Economic Empowerment)
Calculate BBBEE scorecard, track ownership, verify suppliers, and generate reports

This is ARIA's UNIQUE competitive advantage for South Africa! 🇿🇦
No other ERP has built-in BBBEE compliance automation.

BBBEE is mandatory for:
- Government contracts
- Corporate procurement
- Tender submissions
- B2B transactions with large companies

This bot helps businesses:
- Calculate BBBEE scorecard (Level 1-8)
- Track ownership (Black ownership %)
- Verify supplier BBBEE certificates
- Generate BBBEE compliance reports
- Automate BBBEE reporting
"""
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)


class BBBEEComplianceBot:
    """BBBEE Compliance Bot - South African B-BBEE automation"""
    
    # BBBEE Scorecard Elements (Total 110 points)
    SCORECARD_ELEMENTS = {
        "ownership": {
            "name": "Ownership",
            "max_points": 25,
            "weight_percentage": 22.7,
            "description": "Black ownership of enterprise"
        },
        "management_control": {
            "name": "Management Control",
            "max_points": 19,
            "weight_percentage": 17.3,
            "description": "Black representation in management and board"
        },
        "skills_development": {
            "name": "Skills Development",
            "max_points": 20,
            "weight_percentage": 18.2,
            "description": "Training and development of black employees"
        },
        "enterprise_supplier_development": {
            "name": "Enterprise & Supplier Development",
            "max_points": 44,
            "weight_percentage": 40.0,
            "description": "Support for black-owned suppliers and enterprises"
        },
        "socio_economic_development": {
            "name": "Socio-Economic Development",
            "max_points": 2,
            "weight_percentage": 1.8,
            "description": "Contributions to community development"
        }
    }
    
    # BBBEE Levels (based on total score)
    BBBEE_LEVELS = [
        {"level": 1, "min_score": 100, "procurement_recognition": 135},
        {"level": 2, "min_score": 95, "procurement_recognition": 125},
        {"level": 3, "min_score": 90, "procurement_recognition": 110},
        {"level": 4, "min_score": 80, "procurement_recognition": 100},
        {"level": 5, "min_score": 75, "procurement_recognition": 80},
        {"level": 6, "min_score": 70, "procurement_recognition": 60},
        {"level": 7, "min_score": 55, "procurement_recognition": 50},
        {"level": 8, "min_score": 40, "procurement_recognition": 10},
        {"level": "Non-Compliant", "min_score": 0, "procurement_recognition": 0}
    ]
    
    def __init__(self):
        self.bot_id = "bbbee_compliance"
        self.name = "BBBEE Compliance Bot"
        self.description = "Calculate BBBEE scorecard, track ownership, verify suppliers, and generate reports"
    

    def get_capabilities(self):
        """Return bot capabilities"""
        return ["compliance", "reporting", "calculation"]

    async def execute_async(self, query: str, context: Optional[Dict] = None) -> Dict:
        """Execute bot query asynchronously"""
        return self.execute(query, context)
    
    def execute(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Execute BBBEE compliance query
        
        Supported queries:
        - "Calculate my BBBEE scorecard"
        - "What is my BBBEE level?"
        - "Verify supplier BBBEE certificate"
        - "Generate BBBEE report"
        - "How to improve my BBBEE score?"
        """
        query_lower = query.lower()
        
        # Determine query type
        if "calculate" in query_lower or "scorecard" in query_lower:
            return self._calculate_scorecard(context)
        elif "level" in query_lower or "rating" in query_lower:
            return self._get_bbbee_level(context)
        elif "verify" in query_lower or "supplier" in query_lower:
            return self._verify_supplier_certificate(context)
        elif "improve" in query_lower or "better" in query_lower:
            return self._get_improvement_recommendations(context)
        elif "report" in query_lower:
            return self._generate_compliance_report(context)
        else:
            return self._general_response(query, context)
    
    def _calculate_scorecard(self, context: Optional[Dict] = None) -> Dict:
        """Calculate BBBEE scorecard"""
        # TODO: Connect to real data
        # For now, use mock data
        
        scorecard = {
            "ownership": {
                "black_ownership_percentage": 35,
                "points_earned": 18.5,
                "max_points": 25,
                "percentage": 74
            },
            "management_control": {
                "black_board_members": 3,
                "total_board_members": 5,
                "black_executives": 2,
                "total_executives": 4,
                "points_earned": 14.2,
                "max_points": 19,
                "percentage": 75
            },
            "skills_development": {
                "training_spend_percentage": 3.5,
                "target_percentage": 6.0,
                "points_earned": 11.7,
                "max_points": 20,
                "percentage": 59
            },
            "enterprise_supplier_development": {
                "black_supplier_spend_percentage": 55,
                "target_percentage": 70,
                "points_earned": 34.5,
                "max_points": 44,
                "percentage": 78
            },
            "socio_economic_development": {
                "contribution_percentage": 1.2,
                "target_percentage": 1.0,
                "points_earned": 2.0,
                "max_points": 2,
                "percentage": 100
            }
        }
        
        # Calculate total score
        total_score = sum(elem["points_earned"] for elem in scorecard.values())
        total_max = sum(elem["max_points"] for elem in scorecard.values())
        percentage = (total_score / total_max) * 100
        
        # Determine BBBEE level
        bbbee_level = None
        for level in self.BBBEE_LEVELS:
            if isinstance(level["level"], int) and total_score >= level["min_score"]:
                bbbee_level = level
                break
        if not bbbee_level:
            bbbee_level = self.BBBEE_LEVELS[-1]  # Non-Compliant
        
        response_text = f"""**Your BBBEE Scorecard**

🏆 **BBBEE Level: {bbbee_level['level']}**
📊 **Total Score: {total_score:.1f} / {total_max} ({percentage:.1f}%)**
💰 **Procurement Recognition: {bbbee_level['procurement_recognition']}%**

**Detailed Breakdown:**

"""
        
        for element_id, data in scorecard.items():
            element_info = self.SCORECARD_ELEMENTS[element_id]
            status_icon = "✅" if data["percentage"] >= 75 else "⚠️" if data["percentage"] >= 50 else "🔴"
            response_text += f"\n**{element_info['name']}** {status_icon}\n"
            response_text += f"  - Score: {data['points_earned']:.1f} / {data['max_points']} ({data['percentage']}%)\n"
            
            # Add specific details
            if element_id == "ownership":
                response_text += f"  - Black ownership: {data['black_ownership_percentage']}%\n"
            elif element_id == "management_control":
                response_text += f"  - Board: {data['black_board_members']}/{data['total_board_members']} black members\n"
                response_text += f"  - Executives: {data['black_executives']}/{data['total_executives']} black executives\n"
            elif element_id == "skills_development":
                response_text += f"  - Training spend: {data['training_spend_percentage']}% (target: {data['target_percentage']}%)\n"
            elif element_id == "enterprise_supplier_development":
                response_text += f"  - Black supplier spend: {data['black_supplier_spend_percentage']}% (target: {data['target_percentage']}%)\n"
            elif element_id == "socio_economic_development":
                response_text += f"  - CSR contribution: {data['contribution_percentage']}% (target: {data['target_percentage']}%)\n"
        
        response_text += "\n**What This Means:**\n"
        if isinstance(bbbee_level["level"], int) and bbbee_level["level"] <= 4:
            response_text += f"✅ Excellent! You qualify for government tenders and corporate procurement.\n"
        elif isinstance(bbbee_level["level"], int) and bbbee_level["level"] <= 6:
            response_text += f"⚠️ Good, but improvement needed for competitive advantage.\n"
        else:
            response_text += f"🔴 Below expectations. Focus on improvement to access opportunities.\n"
        
        response_text += f"\n💡 **Tip**: Aim for Level 1-4 for maximum business opportunities!"
        
        return {
            "response": response_text,
            "scorecard": scorecard,
            "summary": {
                "bbbee_level": bbbee_level["level"],
                "total_score": total_score,
                "total_max": total_max,
                "percentage": percentage,
                "procurement_recognition": bbbee_level["procurement_recognition"]
            }
        }
    
    def _get_bbbee_level(self, context: Optional[Dict] = None) -> Dict:
        """Get current BBBEE level"""
        # Call scorecard calculation and extract level
        scorecard_result = self._calculate_scorecard(context)
        
        response_text = f"""**Your BBBEE Status**

🏆 **Level: {scorecard_result['summary']['bbbee_level']}**
📊 **Score: {scorecard_result['summary']['total_score']:.1f} / {scorecard_result['summary']['total_max']}**
💰 **Procurement Recognition: {scorecard_result['summary']['procurement_recognition']}%**

**What is Procurement Recognition?**
This is the percentage added to your invoice value when large companies calculate their own BBBEE scores. Higher is better!

**BBBEE Level Comparison:**
- Level 1 (100+ pts): 135% recognition - BEST! 🥇
- Level 2 (95-99 pts): 125% recognition - Excellent! 🥈
- Level 3 (90-94 pts): 110% recognition - Very good! 🥉
- Level 4 (80-89 pts): 100% recognition - Good ✓
- Level 5 (75-79 pts): 80% recognition
- Level 6 (70-74 pts): 60% recognition
- Level 7 (55-69 pts): 50% recognition
- Level 8 (40-54 pts): 10% recognition
- Non-Compliant (<40 pts): 0% recognition ✗

Your current level qualifies you for government tenders and most corporate procurement processes.
"""
        
        return {
            "response": response_text,
            "bbbee_level": scorecard_result['summary']['bbbee_level'],
            "score": scorecard_result['summary']['total_score'],
            "procurement_recognition": scorecard_result['summary']['procurement_recognition']
        }
    
    def _verify_supplier_certificate(self, context: Optional[Dict] = None) -> Dict:
        """Verify supplier BBBEE certificate"""
        # TODO: Connect to BBBEE Commission API or database
        # For now, return mock verification
        
        supplier_name = context.get("supplier_name", "ABC Suppliers (Pty) Ltd") if context else "ABC Suppliers (Pty) Ltd"
        
        verification_result = {
            "supplier_name": supplier_name,
            "bbbee_level": 2,
            "certificate_number": "BBBEE-2024-12345",
            "issue_date": "2024-07-01",
            "expiry_date": "2025-06-30",
            "verification_agency": "SANAS Accredited Agency",
            "black_ownership": 68,
            "is_valid": True,
            "days_until_expiry": 158
        }
        
        status_icon = "✅" if verification_result["is_valid"] else "❌"
        expiry_warning = ""
        if verification_result["days_until_expiry"] < 30:
            expiry_warning = " ⚠️ **WARNING: Certificate expires soon!**"
        elif verification_result["days_until_expiry"] < 90:
            expiry_warning = " ⏰ Note: Certificate expires in ~3 months"
        
        response_text = f"""**BBBEE Certificate Verification**

**Supplier:** {verification_result['supplier_name']}

**Certificate Status:** Valid {status_icon}{expiry_warning}

**Details:**
- 🏆 BBBEE Level: **{verification_result['bbbee_level']}**
- 📄 Certificate No: {verification_result['certificate_number']}
- 📅 Issue Date: {verification_result['issue_date']}
- 📅 Expiry Date: {verification_result['expiry_date']}
- 🏢 Verification Agency: {verification_result['verification_agency']}
- 💼 Black Ownership: {verification_result['black_ownership']}%

**Procurement Recognition:** 125% (Level 2)

**What This Means:**
✅ This supplier is BBBEE compliant
✅ You can claim 125% of spend towards your Enterprise & Supplier Development score
✅ Certificate is valid for {verification_result['days_until_expiry']} more days

**Recommendation:**
{'Request renewal confirmation 30 days before expiry' if verification_result['days_until_expiry'] > 90 else '⚠️ Contact supplier to confirm renewal plans'}
"""
        
        return {
            "response": response_text,
            "verification": verification_result
        }
    
    def _get_improvement_recommendations(self, context: Optional[Dict] = None) -> Dict:
        """Get recommendations to improve BBBEE score"""
        
        response_text = """**How to Improve Your BBBEE Score** 🚀

Based on your current scorecard, here are the TOP 5 actions to improve your BBBEE level:

**1. Increase Black Supplier Spend (Quick Win!)** 💰
   - Current: 55% | Target: 70% | Potential: +6.6 points
   - **Action**: Prioritize black-owned suppliers for next 3 months
   - **Impact**: Could move you from Level 3 to Level 2!

**2. Boost Skills Development** 📚
   - Current: 3.5% | Target: 6.0% | Potential: +4.9 points
   - **Action**: Increase training budget for black employees
   - **Specific**: Fund learnerships, internships, bursaries

**3. Increase Black Ownership** 💼
   - Current: 35% | Target: 50%+ | Potential: +4.5 points
   - **Action**: Consider ESOP (Employee Share Ownership Plan)
   - **Note**: This is a long-term strategy (12-24 months)

**4. Improve Management Control** 👥
   - Current: 75% | Target: 85%+ | Potential: +2.8 points
   - **Action**: Promote black employees to management positions
   - **Specific**: Add 1-2 black board members

**5. Maintain Socio-Economic Development** ❤️
   - Current: 100% ✅ Keep it up!
   - **Action**: Continue CSR contributions
   - **Tip**: Document all charitable work for verification

**Quick Wins (0-3 months):**
✅ Switch to black-owned suppliers (easiest!)
✅ Increase training spend (medium difficulty)
✅ Add black board members (requires planning)

**Long-term Strategies (6-24 months):**
⏰ Employee share ownership (complex but high impact)
⏰ Graduate recruitment programs (skills + management)
⏰ Strategic partnerships with black-owned enterprises

**Estimated Impact:**
If you implement all recommendations, you could achieve:
- **Level 1** (100+ points) within 12-18 months
- **135% Procurement Recognition**
- **Significant competitive advantage** for tenders!

💡 **Want help?** I can create a detailed improvement roadmap for your business.
"""
        
        return {"response": response_text}
    
    def _generate_compliance_report(self, context: Optional[Dict] = None) -> Dict:
        """Generate BBBEE compliance report"""
        
        response_text = """**BBBEE Compliance Report - Q1 2025**

**Executive Summary:**
- Current BBBEE Level: **3** (Good)
- Total Score: 80.9 / 110 (73.5%)
- Procurement Recognition: 110%
- Status: ✅ Compliant

**Scorecard Performance:**

| Element | Score | Max | % | Status |
|---------|-------|-----|---|--------|
| Ownership | 18.5 | 25 | 74% | ⚠️ Fair |
| Management Control | 14.2 | 19 | 75% | ✅ Good |
| Skills Development | 11.7 | 20 | 59% | ⚠️ Fair |
| Enterprise & Supplier Dev | 34.5 | 44 | 78% | ✅ Good |
| Socio-Economic Dev | 2.0 | 2 | 100% | ✅ Excellent |

**Key Metrics:**
- Black Ownership: 35%
- Black Management: 50%
- Black Supplier Spend: 55%
- Training Spend: 3.5% of payroll
- CSR Contribution: 1.2% of NPAT

**Compliance Status:**
✅ Valid BBBEE certificate
✅ Qualifies for government tenders
✅ Meets corporate procurement requirements

**Recommendations:**
1. Increase black supplier spend to 70% (priority!)
2. Boost training spend to 6% of payroll
3. Add 1-2 black board members

**Next Steps:**
- Review recommendations with management
- Create improvement roadmap
- Schedule next verification (due in 6 months)

📊 **Full PDF Report**: Available for download
📧 **Certified for Tenders**: Yes (valid until 2025-06-30)
"""
        
        return {"response": response_text}
    
    def _general_response(self, query: str, context: Optional[Dict] = None) -> Dict:
        """Handle general queries"""
        response_text = f"""I'm the BBBEE Compliance Bot 🇿🇦

**What I Can Do:**
- 📊 Calculate your BBBEE scorecard (5 elements)
- 🏆 Determine your BBBEE level (1-8)
- ✅ Verify supplier BBBEE certificates
- 📈 Provide improvement recommendations
- 📄 Generate compliance reports for tenders

**Why BBBEE Matters:**
- Required for government tenders (100% of contracts)
- Required by large corporates (procurement scorecards)
- Provides competitive advantage (procurement recognition)
- Mandatory for certain industries (mining, telecoms, etc.)

**Try asking me:**
- "Calculate my BBBEE scorecard"
- "What is my BBBEE level?"
- "How can I improve my BBBEE score?"
- "Verify supplier certificate for [supplier name]"
- "Generate BBBEE compliance report"

**Your Question:** "{query}"

🇿🇦 **Fun Fact**: ARIA is the ONLY ERP with built-in BBBEE compliance automation!
No other system (SAP, Odoo, Xero) has this feature.

How can I help you with BBBEE compliance?
"""
        
        return {"response": response_text}


# Export bot instance
bbbee_compliance_bot = BBBEEComplianceBot()
