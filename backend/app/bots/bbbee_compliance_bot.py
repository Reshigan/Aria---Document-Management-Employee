"""
BBBEE Compliance Automation Bot

This bot automates BBBEE (Broad-Based Black Economic Empowerment) compliance
for South African businesses, including:
- Scorecard calculation (2019 Codes of Good Practice)
- Certificate collection and verification
- Compliance report generation
- Deadline tracking and alerts

Author: ARIA AI Platform
Date: October 2025
Priority: CRITICAL (Phase 1, Week 1-4)
Value: R30-60K/year savings per customer
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
import logging
import re
from sqlalchemy.orm import Session

from app.bots.base_bot import BaseBot
from app.models import Company, BbbeeScorecard, BbbeeCertificate, FinancialStatement
from app.core.config import settings

logger = logging.getLogger(__name__)


class BbbeeComplianceBot(BaseBot):
    """
    BBBEE Compliance Automation Bot
    
    Automates BBBEE scorecard calculation based on South African
    2019 Codes of Good Practice. Handles:
    - Ownership scoring (25 points)
    - Management Control (19 points)
    - Skills Development (20 points)
    - Enterprise & Supplier Development (40 points)
    - Socio-Economic Development (5 points)
    
    Total: 109 points (105 + 4 bonus points)
    """
    
    def __init__(self):
        super().__init__()
        self.bot_name = "BBBEE Compliance Bot"
        self.bot_category = "compliance"
        self.bot_priority = "critical"
        self.target_accuracy = 0.95  # 95% accuracy target
        
        # BBBEE 2019 Codes weightings
        self.SCORECARD_WEIGHTS = {
            "ownership": 25,
            "management_control": 19,
            "skills_development": 20,
            "enterprise_supplier_development": 40,
            "socio_economic_development": 5
        }
        
        # BBBEE Level thresholds (based on 2019 Codes)
        self.BBBEE_LEVELS = {
            1: 100,  # Level 1: 100+ points
            2: 95,   # Level 2: 95-99.99 points
            3: 90,   # Level 3: 90-94.99 points
            4: 80,   # Level 4: 80-89.99 points
            5: 75,   # Level 5: 75-79.99 points
            6: 70,   # Level 6: 70-74.99 points
            7: 55,   # Level 7: 55-69.99 points
            8: 40,   # Level 8: 40-54.99 points
        }
        
        # Procurement recognition levels (for supplier scoring)
        self.PROCUREMENT_RECOGNITION = {
            1: 135,  # Level 1: 135% recognition
            2: 125,  # Level 2: 125% recognition
            3: 110,  # Level 3: 110% recognition
            4: 100,  # Level 4: 100% recognition
            5: 80,   # Level 5: 80% recognition
            6: 60,   # Level 6: 60% recognition
            7: 50,   # Level 7: 50% recognition
            8: 10,   # Level 8: 10% recognition
            "non-compliant": 0
        }
    
    def calculate_scorecard(
        self,
        company_id: int,
        db: Session,
        financial_year: Optional[int] = None
    ) -> Dict:
        """
        Calculate complete BBBEE scorecard for a company
        
        Args:
            company_id: Company database ID
            db: Database session
            financial_year: Year to calculate for (default: current year)
        
        Returns:
            Dictionary with scorecard results
        """
        try:
            logger.info(f"Calculating BBBEE scorecard for company {company_id}")
            
            # Get company data
            company = db.query(Company).filter(Company.id == company_id).first()
            if not company:
                raise ValueError(f"Company {company_id} not found")
            
            # Get financial year (default to current)
            if not financial_year:
                financial_year = datetime.now().year
            
            # Get financial statements for the year
            financials = db.query(FinancialStatement).filter(
                FinancialStatement.company_id == company_id,
                FinancialStatement.financial_year == financial_year
            ).first()
            
            if not financials:
                raise ValueError(f"No financial statements found for {financial_year}")
            
            # Calculate each element
            ownership_score = self._calculate_ownership(company, financials)
            management_score = self._calculate_management_control(company, financials)
            skills_score = self._calculate_skills_development(company, financials)
            esd_score = self._calculate_enterprise_supplier_development(company, financials)
            sed_score = self._calculate_socio_economic_development(company, financials)
            
            # Calculate total score
            total_score = (
                ownership_score["points"] +
                management_score["points"] +
                skills_score["points"] +
                esd_score["points"] +
                sed_score["points"]
            )
            
            # Determine BBBEE level
            bbbee_level = self._determine_level(total_score)
            
            # Calculate procurement recognition
            procurement_recognition = self.PROCUREMENT_RECOGNITION.get(
                bbbee_level,
                self.PROCUREMENT_RECOGNITION["non-compliant"]
            )
            
            # Build result
            result = {
                "company_id": company_id,
                "company_name": company.name,
                "financial_year": financial_year,
                "calculation_date": datetime.now().isoformat(),
                "total_score": round(total_score, 2),
                "bbbee_level": bbbee_level,
                "procurement_recognition": procurement_recognition,
                "elements": {
                    "ownership": ownership_score,
                    "management_control": management_score,
                    "skills_development": skills_score,
                    "enterprise_supplier_development": esd_score,
                    "socio_economic_development": sed_score
                },
                "compliance_status": "compliant" if bbbee_level <= 8 else "non-compliant",
                "next_verification_due": self._calculate_next_verification_date(bbbee_level)
            }
            
            # Save to database
            self._save_scorecard(result, db)
            
            logger.info(
                f"BBBEE scorecard calculated: Level {bbbee_level}, "
                f"Score: {total_score}, Recognition: {procurement_recognition}%"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error calculating BBBEE scorecard: {str(e)}")
            raise
    
    def _calculate_ownership(
        self,
        company: Company,
        financials: FinancialStatement
    ) -> Dict:
        """
        Calculate Ownership element (25 points max)
        
        Sub-elements:
        - Exercisable voting rights (7 points)
        - Economic interest (9 points)
        - Realisation points (3 points)
        - Net value (6 points)
        - Bonus points (4 points for 51%+ Black ownership)
        """
        # Get ownership data
        black_ownership_pct = company.black_ownership_percentage or 0
        black_women_ownership_pct = company.black_women_ownership_percentage or 0
        
        # Exercisable voting rights (7 points)
        voting_rights_score = min(
            (black_ownership_pct / 25) * 7,  # 25% = full 7 points
            7
        )
        
        # Economic interest (9 points)
        economic_interest_score = min(
            (black_ownership_pct / 25) * 9,  # 25% = full 9 points
            9
        )
        
        # Realisation points (3 points) - simplified: assume same as ownership
        realisation_score = min(
            (black_ownership_pct / 25) * 3,
            3
        )
        
        # Net value (6 points)
        net_value_score = min(
            (black_ownership_pct / 25) * 6,
            6
        )
        
        # Bonus points (4 points for 51%+ Black ownership)
        bonus_points = 4 if black_ownership_pct >= 51 else 0
        
        # Black women bonus (additional 2 points if 30%+ Black women ownership)
        if black_women_ownership_pct >= 30:
            bonus_points += 2
        
        # Total ownership points
        total_points = (
            voting_rights_score +
            economic_interest_score +
            realisation_score +
            net_value_score +
            bonus_points
        )
        
        return {
            "category": "Ownership",
            "max_points": 25,
            "points": round(min(total_points, 25), 2),
            "percentage": round((min(total_points, 25) / 25) * 100, 2),
            "breakdown": {
                "voting_rights": round(voting_rights_score, 2),
                "economic_interest": round(economic_interest_score, 2),
                "realisation": round(realisation_score, 2),
                "net_value": round(net_value_score, 2),
                "bonus_points": bonus_points
            },
            "compliance": min(total_points, 25) >= (25 * 0.4)  # 40% threshold
        }
    
    def _calculate_management_control(
        self,
        company: Company,
        financials: FinancialStatement
    ) -> Dict:
        """
        Calculate Management Control element (19 points max)
        
        Sub-elements:
        - Board participation (2 points)
        - Executive management (2 points)
        - Senior management (5 points)
        - Middle management (5 points)
        - Junior management (5 points)
        """
        # Simplified calculation based on company data
        # In production, this would pull from HR system
        
        # Assume proportional to overall Black ownership for now
        black_ownership_pct = company.black_ownership_percentage or 0
        management_factor = min(black_ownership_pct / 50, 1)  # 50% = full points
        
        board_score = 2 * management_factor
        exec_score = 2 * management_factor
        senior_score = 5 * management_factor
        middle_score = 5 * management_factor
        junior_score = 5 * management_factor
        
        total_points = board_score + exec_score + senior_score + middle_score + junior_score
        
        return {
            "category": "Management Control",
            "max_points": 19,
            "points": round(total_points, 2),
            "percentage": round((total_points / 19) * 100, 2),
            "breakdown": {
                "board_participation": round(board_score, 2),
                "executive_management": round(exec_score, 2),
                "senior_management": round(senior_score, 2),
                "middle_management": round(middle_score, 2),
                "junior_management": round(junior_score, 2)
            },
            "compliance": total_points >= (19 * 0.4)
        }
    
    def _calculate_skills_development(
        self,
        company: Company,
        financials: FinancialStatement
    ) -> Dict:
        """
        Calculate Skills Development element (20 points max)
        
        Target: 6% of payroll spent on skills development
        - 3.5% for Black people
        - 2.5% for other
        """
        # Get payroll and skills development spend
        total_payroll = float(financials.total_payroll or 0)
        skills_dev_spend = float(financials.skills_development_spend or 0)
        
        if total_payroll == 0:
            return {
                "category": "Skills Development",
                "max_points": 20,
                "points": 0,
                "percentage": 0,
                "breakdown": {
                    "spend_amount": 0,
                    "target_amount": 0,
                    "spend_percentage": 0
                },
                "compliance": False
            }
        
        # Calculate percentage
        spend_percentage = (skills_dev_spend / total_payroll) * 100
        
        # Target is 6% of payroll
        target_percentage = 6.0
        
        # Calculate points (20 points max at 6% spend)
        points = min((spend_percentage / target_percentage) * 20, 20)
        
        return {
            "category": "Skills Development",
            "max_points": 20,
            "points": round(points, 2),
            "percentage": round((points / 20) * 100, 2),
            "breakdown": {
                "spend_amount": round(skills_dev_spend, 2),
                "target_amount": round(total_payroll * 0.06, 2),
                "spend_percentage": round(spend_percentage, 2),
                "target_percentage": target_percentage
            },
            "compliance": points >= (20 * 0.4)
        }
    
    def _calculate_enterprise_supplier_development(
        self,
        company: Company,
        financials: FinancialStatement
    ) -> Dict:
        """
        Calculate Enterprise & Supplier Development element (40 points max)
        
        Target:
        - 3% of net profit after tax (NPAT) for supplier development
        - 2% of NPAT for enterprise development
        """
        # Get financial data
        npat = float(financials.net_profit_after_tax or 0)
        supplier_dev_spend = float(financials.supplier_development_spend or 0)
        enterprise_dev_spend = float(financials.enterprise_development_spend or 0)
        
        if npat <= 0:
            return {
                "category": "Enterprise & Supplier Development",
                "max_points": 40,
                "points": 0,
                "percentage": 0,
                "breakdown": {
                    "supplier_development": 0,
                    "enterprise_development": 0
                },
                "compliance": False
            }
        
        # Supplier development (25 points, target 3% of NPAT)
        supplier_percentage = (supplier_dev_spend / npat) * 100
        supplier_points = min((supplier_percentage / 3.0) * 25, 25)
        
        # Enterprise development (15 points, target 2% of NPAT)
        enterprise_percentage = (enterprise_dev_spend / npat) * 100
        enterprise_points = min((enterprise_percentage / 2.0) * 15, 15)
        
        total_points = supplier_points + enterprise_points
        
        return {
            "category": "Enterprise & Supplier Development",
            "max_points": 40,
            "points": round(total_points, 2),
            "percentage": round((total_points / 40) * 100, 2),
            "breakdown": {
                "supplier_development": {
                    "points": round(supplier_points, 2),
                    "spend": round(supplier_dev_spend, 2),
                    "target": round(npat * 0.03, 2),
                    "percentage": round(supplier_percentage, 2)
                },
                "enterprise_development": {
                    "points": round(enterprise_points, 2),
                    "spend": round(enterprise_dev_spend, 2),
                    "target": round(npat * 0.02, 2),
                    "percentage": round(enterprise_percentage, 2)
                }
            },
            "compliance": total_points >= (40 * 0.4)
        }
    
    def _calculate_socio_economic_development(
        self,
        company: Company,
        financials: FinancialStatement
    ) -> Dict:
        """
        Calculate Socio-Economic Development element (5 points max)
        
        Target: 1% of net profit after tax (NPAT)
        """
        # Get financial data
        npat = float(financials.net_profit_after_tax or 0)
        sed_spend = float(financials.socio_economic_development_spend or 0)
        
        if npat <= 0:
            return {
                "category": "Socio-Economic Development",
                "max_points": 5,
                "points": 0,
                "percentage": 0,
                "breakdown": {
                    "spend_amount": 0,
                    "target_amount": 0
                },
                "compliance": False
            }
        
        # Calculate percentage
        spend_percentage = (sed_spend / npat) * 100
        
        # Target is 1% of NPAT
        target_percentage = 1.0
        
        # Calculate points (5 points max at 1% spend)
        points = min((spend_percentage / target_percentage) * 5, 5)
        
        return {
            "category": "Socio-Economic Development",
            "max_points": 5,
            "points": round(points, 2),
            "percentage": round((points / 5) * 100, 2),
            "breakdown": {
                "spend_amount": round(sed_spend, 2),
                "target_amount": round(npat * 0.01, 2),
                "spend_percentage": round(spend_percentage, 2)
            },
            "compliance": points >= (5 * 0.4)
        }
    
    def _determine_level(self, total_score: float) -> int:
        """
        Determine BBBEE level based on total score
        
        Args:
            total_score: Total BBBEE score (out of 109)
        
        Returns:
            BBBEE level (1-8, or 9 for non-compliant)
        """
        for level, threshold in sorted(self.BBBEE_LEVELS.items()):
            if total_score >= threshold:
                return level
        
        return 9  # Non-compliant (less than 40 points)
    
    def _calculate_next_verification_date(self, bbbee_level: int) -> str:
        """
        Calculate next BBBEE verification due date
        
        Verification frequency:
        - Level 1-2: Annual verification required
        - Level 3-8: Every 2 years
        - Large companies (>R50M turnover): Annual
        """
        # Simplified: assume annual verification for all
        # In production, check company size and level
        next_date = datetime.now() + timedelta(days=365)
        return next_date.strftime("%Y-%m-%d")
    
    def _save_scorecard(self, result: Dict, db: Session):
        """Save scorecard to database"""
        try:
            scorecard = BbbeeScorecard(
                company_id=result["company_id"],
                financial_year=result["financial_year"],
                total_score=result["total_score"],
                bbbee_level=result["bbbee_level"],
                procurement_recognition=result["procurement_recognition"],
                ownership_score=result["elements"]["ownership"]["points"],
                management_score=result["elements"]["management_control"]["points"],
                skills_score=result["elements"]["skills_development"]["points"],
                esd_score=result["elements"]["enterprise_supplier_development"]["points"],
                sed_score=result["elements"]["socio_economic_development"]["points"],
                compliance_status=result["compliance_status"],
                next_verification_date=datetime.strptime(
                    result["next_verification_due"],
                    "%Y-%m-%d"
                ),
                created_at=datetime.now()
            )
            
            db.add(scorecard)
            db.commit()
            
            logger.info(f"Scorecard saved for company {result['company_id']}")
            
        except Exception as e:
            logger.error(f"Error saving scorecard: {str(e)}")
            db.rollback()
            raise
    
    def generate_report(
        self,
        company_id: int,
        db: Session,
        financial_year: Optional[int] = None
    ) -> bytes:
        """
        Generate BBBEE compliance report (PDF)
        
        Args:
            company_id: Company database ID
            db: Database session
            financial_year: Year to generate report for
        
        Returns:
            PDF report as bytes
        """
        # Calculate scorecard
        result = self.calculate_scorecard(company_id, db, financial_year)
        
        # TODO: Implement PDF generation using ReportLab or similar
        # For now, return a placeholder
        logger.info(f"Generating BBBEE report for company {company_id}")
        
        report_content = f"""
        BBBEE COMPLIANCE REPORT
        =======================
        
        Company: {result['company_name']}
        Financial Year: {result['financial_year']}
        
        OVERALL SCORECARD
        -----------------
        Total Score: {result['total_score']}/109
        BBBEE Level: Level {result['bbbee_level']}
        Procurement Recognition: {result['procurement_recognition']}%
        
        ELEMENT BREAKDOWN
        -----------------
        1. Ownership: {result['elements']['ownership']['points']}/25
        2. Management Control: {result['elements']['management_control']['points']}/19
        3. Skills Development: {result['elements']['skills_development']['points']}/20
        4. Enterprise & Supplier Development: {result['elements']['enterprise_supplier_development']['points']}/40
        5. Socio-Economic Development: {result['elements']['socio_economic_development']['points']}/5
        
        Next Verification Due: {result['next_verification_due']}
        """
        
        return report_content.encode('utf-8')
    
    def check_compliance_alerts(self, db: Session) -> List[Dict]:
        """
        Check for companies with upcoming verification deadlines
        or compliance issues
        
        Returns:
            List of alerts
        """
        alerts = []
        
        try:
            # Get all companies with scorecards
            scorecards = db.query(BbbeeScorecard).filter(
                BbbeeScorecard.next_verification_date.isnot(None)
            ).all()
            
            today = datetime.now().date()
            
            for scorecard in scorecards:
                days_to_deadline = (scorecard.next_verification_date - today).days
                
                # Alert if verification due within 60 days
                if 0 <= days_to_deadline <= 60:
                    alerts.append({
                        "company_id": scorecard.company_id,
                        "alert_type": "verification_due",
                        "severity": "high" if days_to_deadline <= 30 else "medium",
                        "message": f"BBBEE verification due in {days_to_deadline} days",
                        "deadline": scorecard.next_verification_date.isoformat()
                    })
                
                # Alert if non-compliant
                if scorecard.compliance_status == "non-compliant":
                    alerts.append({
                        "company_id": scorecard.company_id,
                        "alert_type": "non_compliant",
                        "severity": "critical",
                        "message": f"Company is non-compliant (Level {scorecard.bbbee_level})",
                        "bbbee_level": scorecard.bbbee_level
                    })
            
            logger.info(f"Found {len(alerts)} compliance alerts")
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking compliance alerts: {str(e)}")
            return []


# Singleton instance
bbbee_bot = BbbeeComplianceBot()
