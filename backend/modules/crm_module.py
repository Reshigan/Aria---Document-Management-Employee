"""
ARIA ERP - CRM Module
Production-grade Customer Relationship Management with lead scoring and pipeline
"""

import sqlite3
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

class CRMModule:
    """Complete CRM Module"""
    
    LEAD_SCORE_WEIGHTS = {
        'company_size': {'Small': 10, 'Medium': 25, 'Large': 40, 'Enterprise': 60},
        'engagement': {'Cold': 0, 'Warm': 20, 'Hot': 40, 'Active': 60},
        'budget': {'<100k': 10, '100k-500k': 20, '500k-1M': 30, '>1M': 50},
        'decision_timeframe': {'>6 months': 5, '3-6 months': 15, '1-3 months': 30, '<1 month': 50}
    }
    
    def __init__(self, database_path: str = 'aria_erp_production.db'):
        self.db_path = database_path
    
    def calculate_lead_score(self, lead_data: Dict) -> int:
        """Calculate AI-powered lead score (0-100)"""
        score = 0
        
        # Company size score
        company_size = lead_data.get('company_size', 'Small')
        score += self.LEAD_SCORE_WEIGHTS['company_size'].get(company_size, 0)
        
        # Engagement level
        engagement = lead_data.get('engagement_level', 'Cold')
        score += self.LEAD_SCORE_WEIGHTS['engagement'].get(engagement, 0)
        
        # Budget range
        budget = lead_data.get('budget_range', '<100k')
        score += self.LEAD_SCORE_WEIGHTS['budget'].get(budget, 0)
        
        # Decision timeframe
        timeframe = lead_data.get('decision_timeframe', '>6 months')
        score += self.LEAD_SCORE_WEIGHTS['decision_timeframe'].get(timeframe, 0)
        
        # Recency bonus (contacted in last 7 days)
        last_contact = lead_data.get('last_contact_date')
        if last_contact:
            days_since = (date.today() - last_contact).days
            if days_since <= 7:
                score += 10
            elif days_since <= 30:
                score += 5
        
        return min(score, 100)
    
    def create_opportunity(
        self,
        company_id: int,
        user_id: int,
        customer_id: int,
        title: str,
        amount: Decimal,
        stage: str,
        probability: int,
        expected_close_date: date
    ) -> Dict:
        """Create sales opportunity"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO opportunities (
                    company_id, customer_id, title, description,
                    amount, stage, probability, expected_close_date,
                    owner_id, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                company_id, customer_id, title, '',
                float(amount), stage, probability, expected_close_date,
                user_id, 'OPEN', datetime.now()
            ))
            
            opp_id = cursor.lastrowid
            conn.commit()
            
            return {
                'success': True,
                'opportunity_id': opp_id,
                'weighted_value': float(amount * Decimal(probability) / 100)
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            conn.close()
    
    def get_sales_pipeline(
        self,
        company_id: int,
        user_id: Optional[int] = None
    ) -> Dict:
        """Get sales pipeline analysis"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            where_clause = "company_id = ? AND status = 'OPEN'"
            params = [company_id]
            
            if user_id:
                where_clause += " AND owner_id = ?"
                params.append(user_id)
            
            cursor.execute(f"""
                SELECT stage, COUNT(*) as count,
                       SUM(amount) as total_value,
                       SUM(amount * probability / 100.0) as weighted_value
                FROM opportunities
                WHERE {where_clause}
                GROUP BY stage
                ORDER BY 
                    CASE stage
                        WHEN 'PROSPECTING' THEN 1
                        WHEN 'QUALIFICATION' THEN 2
                        WHEN 'PROPOSAL' THEN 3
                        WHEN 'NEGOTIATION' THEN 4
                        WHEN 'CLOSED_WON' THEN 5
                        WHEN 'CLOSED_LOST' THEN 6
                        ELSE 7
                    END
            """, params)
            
            pipeline = []
            total_count = 0
            total_value = Decimal('0.00')
            total_weighted = Decimal('0.00')
            
            for row in cursor.fetchall():
                stage_data = {
                    'stage': row[0],
                    'count': row[1],
                    'total_value': float(row[2] or 0),
                    'weighted_value': float(row[3] or 0)
                }
                pipeline.append(stage_data)
                total_count += row[1]
                total_value += Decimal(str(row[2] or 0))
                total_weighted += Decimal(str(row[3] or 0))
            
            return {
                'pipeline': pipeline,
                'summary': {
                    'total_opportunities': total_count,
                    'total_value': float(total_value),
                    'weighted_value': float(total_weighted)
                }
            }
            
        finally:
            conn.close()
    
    def get_customer_health_score(
        self,
        company_id: int,
        customer_id: int
    ) -> Dict:
        """Calculate customer health score based on engagement and revenue"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get customer revenue (last 12 months)
            cursor.execute("""
                SELECT COALESCE(SUM(total_amount), 0)
                FROM sales_invoices
                WHERE company_id = ? AND customer_id = ?
                AND invoice_date >= date('now', '-12 months')
                AND status != 'CANCELLED'
            """, (company_id, customer_id))
            
            annual_revenue = Decimal(str(cursor.fetchone()[0]))
            
            # Get payment behavior
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_invoices,
                    SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as paid_invoices,
                    AVG(julianday(paid_date) - julianday(due_date)) as avg_days_late
                FROM sales_invoices
                WHERE company_id = ? AND customer_id = ?
                AND invoice_date >= date('now', '-12 months')
                AND status IN ('PAID', 'OVERDUE')
            """, (company_id, customer_id))
            
            payment_row = cursor.fetchone()
            
            # Calculate health score (0-100)
            score = 50  # Base score
            
            # Revenue contribution (+30 max)
            if annual_revenue > 1000000:
                score += 30
            elif annual_revenue > 500000:
                score += 20
            elif annual_revenue > 100000:
                score += 10
            
            # Payment behavior (+20 max)
            if payment_row and payment_row[0] > 0:
                payment_rate = payment_row[1] / payment_row[0]
                score += int(payment_rate * 20)
                
                # Deduct for late payments
                avg_days_late = payment_row[2] or 0
                if avg_days_late > 30:
                    score -= 20
                elif avg_days_late > 14:
                    score -= 10
                elif avg_days_late > 7:
                    score -= 5
            
            health_status = 'Excellent' if score >= 80 else ('Good' if score >= 60 else ('Fair' if score >= 40 else 'Poor'))
            
            return {
                'customer_id': customer_id,
                'health_score': max(0, min(100, score)),
                'health_status': health_status,
                'annual_revenue': float(annual_revenue),
                'payment_behavior': {
                    'total_invoices': payment_row[0] if payment_row else 0,
                    'paid_invoices': payment_row[1] if payment_row else 0,
                    'avg_days_late': float(payment_row[2] or 0) if payment_row else 0
                }
            }
            
        finally:
            conn.close()


def main():
    """CLI interface"""
    crm = CRMModule()
    
    print("\n" + "="*60)
    print("ARIA ERP - CRM MODULE")
    print("="*60 + "\n")
    
    # Lead scoring examples
    print("AI-POWERED LEAD SCORING")
    print("-" * 60)
    
    leads = [
        {
            'name': 'Tech Startup Ltd',
            'company_size': 'Small',
            'engagement_level': 'Hot',
            'budget_range': '100k-500k',
            'decision_timeframe': '1-3 months',
            'last_contact_date': date.today() - timedelta(days=3)
        },
        {
            'name': 'Enterprise Corp',
            'company_size': 'Enterprise',
            'engagement_level': 'Active',
            'budget_range': '>1M',
            'decision_timeframe': '<1 month',
            'last_contact_date': date.today()
        },
        {
            'name': 'Small Business Co',
            'company_size': 'Small',
            'engagement_level': 'Cold',
            'budget_range': '<100k',
            'decision_timeframe': '>6 months',
            'last_contact_date': date.today() - timedelta(days=60)
        }
    ]
    
    for lead in leads:
        score = crm.calculate_lead_score(lead)
        print(f"\n{lead['name']}")
        print(f"  Company Size:  {lead['company_size']}")
        print(f"  Engagement:    {lead['engagement_level']}")
        print(f"  Budget:        {lead['budget_range']}")
        print(f"  Timeframe:     {lead['decision_timeframe']}")
        print(f"  → Lead Score:  {score}/100 {'⭐' * (score // 20)}")
    
    print("\n" + "="*60)
    
    # Pipeline analysis
    print("\nSALES PIPELINE")
    print("-" * 60)
    
    pipeline = crm.get_sales_pipeline(1)
    
    if pipeline['pipeline']:
        for stage_data in pipeline['pipeline']:
            print(f"\n{stage_data['stage']:20s} ({stage_data['count']:2d} opps)")
            print(f"  Total Value:    R{stage_data['total_value']:>12,.2f}")
            print(f"  Weighted Value: R{stage_data['weighted_value']:>12,.2f}")
        
        print("\n" + "-" * 60)
        print(f"TOTAL PIPELINE:  {pipeline['summary']['total_opportunities']} opportunities")
        print(f"Total Value:     R{pipeline['summary']['total_value']:>12,.2f}")
        print(f"Weighted Value:  R{pipeline['summary']['weighted_value']:>12,.2f}")
    else:
        print("No opportunities in pipeline yet.")
    
    print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    main()
