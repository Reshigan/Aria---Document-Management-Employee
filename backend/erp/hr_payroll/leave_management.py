"""
Leave Management System
BCEA (Basic Conditions of Employment Act) Compliant
South African Labour Law
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum


class LeaveType(Enum):
    """Leave types as per BCEA"""
    ANNUAL = "annual"
    SICK = "sick"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    FAMILY_RESPONSIBILITY = "family_responsibility"
    STUDY = "study"
    UNPAID = "unpaid"
    

class LeaveStatus(Enum):
    """Leave request status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    

@dataclass
class LeaveBalance:
    """Employee leave balance"""
    employee_id: str
    leave_type: LeaveType
    opening_balance: Decimal
    accrued: Decimal
    taken: Decimal
    current_balance: Decimal
    

@dataclass
class LeaveRequest:
    """Leave request"""
    request_id: str
    employee_id: str
    leave_type: LeaveType
    start_date: date
    end_date: date
    days_requested: Decimal
    reason: str
    status: LeaveStatus
    requested_date: datetime
    approved_by: Optional[str] = None
    approved_date: Optional[datetime] = None
    

class LeaveAccrualEngine:
    """Leave accrual calculation engine (BCEA compliant)"""
    
    def __init__(self):
        # Annual leave accrual (BCEA Section 20)
        # 21 consecutive days OR 1 day per 17 days worked OR 1.25 days per month
        self.annual_leave_monthly_accrual = Decimal("1.25")  # Days per month
        self.annual_leave_annual_entitlement = Decimal("15")  # Days per year (some companies offer more)
        
        # Sick leave accrual (BCEA Section 22)
        # 6 weeks per 36-month cycle OR 1 day per 26 days worked
        self.sick_leave_cycle_days = Decimal("30")  # 6 weeks = 30 working days
        self.sick_leave_cycle_months = 36  # 3-year cycle
        
        # Family responsibility leave (BCEA Section 27)
        # 3 days per year (full-time employees)
        self.family_responsibility_annual = Decimal("3")  # Days per year
        
        # Maternity leave (Basic Conditions of Employment Act & Unemployment Insurance Act)
        # 4 consecutive months (approximately 120 days)
        self.maternity_leave_days = Decimal("120")  # 4 months
        
        # Paternity leave (not statutory in SA, but many companies offer 10 days)
        self.paternity_leave_days = Decimal("10")  # 10 days (company policy)
        
    def calculate_annual_leave_accrual(self, months_worked: int) -> Decimal:
        """Calculate annual leave accrual"""
        return (Decimal(months_worked) * self.annual_leave_monthly_accrual).quantize(Decimal("0.01"))
    
    def calculate_sick_leave_entitlement(self, months_in_cycle: int) -> Decimal:
        """Calculate sick leave entitlement for current cycle"""
        if months_in_cycle < 6:
            # First 6 months: 1 day per month worked
            return Decimal(months_in_cycle).quantize(Decimal("0.01"))
        else:
            # After 6 months: full entitlement (30 days per 36-month cycle)
            return self.sick_leave_cycle_days
    
    def calculate_family_responsibility_entitlement(self, year_started: date) -> Decimal:
        """Calculate family responsibility leave"""
        # Only after 4 months of employment
        months_employed = (date.today() - year_started).days / 30
        if months_employed >= 4:
            return self.family_responsibility_annual
        return Decimal(0)


class LeaveManagementSystem:
    """Complete leave management system"""
    
    def __init__(self):
        self.accrual_engine = LeaveAccrualEngine()
        self.leave_balances: Dict[str, List[LeaveBalance]] = {}
        self.leave_requests: List[LeaveRequest] = []
        
    def initialize_employee_leave(self, employee_id: str, 
                                   employment_start_date: date) -> Dict[LeaveType, LeaveBalance]:
        """Initialize leave balances for a new employee"""
        months_employed = max(0, (date.today() - employment_start_date).days // 30)
        
        # Calculate initial balances
        annual_balance = self.accrual_engine.calculate_annual_leave_accrual(months_employed)
        sick_balance = self.accrual_engine.calculate_sick_leave_entitlement(months_employed)
        family_balance = self.accrual_engine.calculate_family_responsibility_entitlement(employment_start_date)
        
        balances = {
            LeaveType.ANNUAL: LeaveBalance(
                employee_id=employee_id,
                leave_type=LeaveType.ANNUAL,
                opening_balance=Decimal(0),
                accrued=annual_balance,
                taken=Decimal(0),
                current_balance=annual_balance
            ),
            LeaveType.SICK: LeaveBalance(
                employee_id=employee_id,
                leave_type=LeaveType.SICK,
                opening_balance=Decimal(0),
                accrued=sick_balance,
                taken=Decimal(0),
                current_balance=sick_balance
            ),
            LeaveType.FAMILY_RESPONSIBILITY: LeaveBalance(
                employee_id=employee_id,
                leave_type=LeaveType.FAMILY_RESPONSIBILITY,
                opening_balance=Decimal(0),
                accrued=family_balance,
                taken=Decimal(0),
                current_balance=family_balance
            ),
            LeaveType.MATERNITY: LeaveBalance(
                employee_id=employee_id,
                leave_type=LeaveType.MATERNITY,
                opening_balance=Decimal(0),
                accrued=self.accrual_engine.maternity_leave_days,
                taken=Decimal(0),
                current_balance=self.accrual_engine.maternity_leave_days
            ),
            LeaveType.PATERNITY: LeaveBalance(
                employee_id=employee_id,
                leave_type=LeaveType.PATERNITY,
                opening_balance=Decimal(0),
                accrued=self.accrual_engine.paternity_leave_days,
                taken=Decimal(0),
                current_balance=self.accrual_engine.paternity_leave_days
            )
        }
        
        self.leave_balances[employee_id] = list(balances.values())
        return balances
    
    def accrue_monthly_leave(self, employee_id: str):
        """Accrue monthly leave (run at month-end)"""
        if employee_id not in self.leave_balances:
            return
        
        for balance in self.leave_balances[employee_id]:
            if balance.leave_type == LeaveType.ANNUAL:
                # Accrue monthly annual leave
                balance.accrued += self.accrual_engine.annual_leave_monthly_accrual
                balance.current_balance += self.accrual_engine.annual_leave_monthly_accrual
    
    def calculate_working_days(self, start_date: date, end_date: date) -> Decimal:
        """Calculate working days between two dates (excluding weekends)"""
        days = 0
        current_date = start_date
        
        while current_date <= end_date:
            # Exclude Saturdays (5) and Sundays (6)
            if current_date.weekday() < 5:
                days += 1
            current_date += timedelta(days=1)
        
        return Decimal(days)
    
    def request_leave(self, employee_id: str, leave_type: LeaveType,
                     start_date: date, end_date: date, reason: str) -> Dict[str, Any]:
        """Submit a leave request"""
        
        # Calculate days requested
        days_requested = self.calculate_working_days(start_date, end_date)
        
        # Check if employee has sufficient balance
        balance = self._get_leave_balance(employee_id, leave_type)
        
        if not balance:
            return {
                "success": False,
                "message": "Leave balance not found",
                "request_id": None
            }
        
        # Check balance (except for unpaid leave)
        if leave_type != LeaveType.UNPAID and days_requested > balance.current_balance:
            return {
                "success": False,
                "message": f"Insufficient leave balance. Available: {balance.current_balance} days, Requested: {days_requested} days",
                "request_id": None
            }
        
        # Create leave request
        request_id = f"LR-{employee_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        leave_request = LeaveRequest(
            request_id=request_id,
            employee_id=employee_id,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            days_requested=days_requested,
            reason=reason,
            status=LeaveStatus.PENDING,
            requested_date=datetime.now()
        )
        
        self.leave_requests.append(leave_request)
        
        return {
            "success": True,
            "message": "Leave request submitted successfully",
            "request_id": request_id,
            "days_requested": float(days_requested),
            "current_balance": float(balance.current_balance)
        }
    
    def approve_leave(self, request_id: str, approved_by: str) -> Dict[str, Any]:
        """Approve a leave request"""
        
        request = self._get_leave_request(request_id)
        if not request:
            return {"success": False, "message": "Leave request not found"}
        
        if request.status != LeaveStatus.PENDING:
            return {"success": False, "message": f"Leave request already {request.status.value}"}
        
        # Update request status
        request.status = LeaveStatus.APPROVED
        request.approved_by = approved_by
        request.approved_date = datetime.now()
        
        # Deduct from leave balance
        balance = self._get_leave_balance(request.employee_id, request.leave_type)
        if balance:
            balance.taken += request.days_requested
            balance.current_balance -= request.days_requested
        
        return {
            "success": True,
            "message": "Leave request approved",
            "request_id": request_id,
            "days_approved": float(request.days_requested),
            "remaining_balance": float(balance.current_balance) if balance else 0
        }
    
    def reject_leave(self, request_id: str, rejected_by: str, reason: str) -> Dict[str, Any]:
        """Reject a leave request"""
        
        request = self._get_leave_request(request_id)
        if not request:
            return {"success": False, "message": "Leave request not found"}
        
        if request.status != LeaveStatus.PENDING:
            return {"success": False, "message": f"Leave request already {request.status.value}"}
        
        request.status = LeaveStatus.REJECTED
        request.approved_by = rejected_by
        request.approved_date = datetime.now()
        
        return {
            "success": True,
            "message": f"Leave request rejected: {reason}",
            "request_id": request_id
        }
    
    def cancel_leave(self, request_id: str, cancelled_by: str) -> Dict[str, Any]:
        """Cancel an approved leave request"""
        
        request = self._get_leave_request(request_id)
        if not request:
            return {"success": False, "message": "Leave request not found"}
        
        if request.status != LeaveStatus.APPROVED:
            return {"success": False, "message": "Only approved leave can be cancelled"}
        
        # Restore leave balance
        balance = self._get_leave_balance(request.employee_id, request.leave_type)
        if balance:
            balance.taken -= request.days_requested
            balance.current_balance += request.days_requested
        
        request.status = LeaveStatus.CANCELLED
        
        return {
            "success": True,
            "message": "Leave cancelled and balance restored",
            "request_id": request_id,
            "restored_days": float(request.days_requested)
        }
    
    def get_employee_leave_summary(self, employee_id: str) -> Dict[str, Any]:
        """Get complete leave summary for employee"""
        
        if employee_id not in self.leave_balances:
            return {"employee_id": employee_id, "balances": [], "recent_requests": []}
        
        balances = [
            {
                "leave_type": b.leave_type.value,
                "opening_balance": float(b.opening_balance),
                "accrued": float(b.accrued),
                "taken": float(b.taken),
                "current_balance": float(b.current_balance)
            }
            for b in self.leave_balances[employee_id]
        ]
        
        recent_requests = [
            {
                "request_id": r.request_id,
                "leave_type": r.leave_type.value,
                "start_date": r.start_date.isoformat(),
                "end_date": r.end_date.isoformat(),
                "days_requested": float(r.days_requested),
                "status": r.status.value,
                "requested_date": r.requested_date.isoformat()
            }
            for r in self.leave_requests
            if r.employee_id == employee_id
        ]
        
        return {
            "employee_id": employee_id,
            "balances": balances,
            "recent_requests": recent_requests
        }
    
    def _get_leave_balance(self, employee_id: str, leave_type: LeaveType) -> Optional[LeaveBalance]:
        """Get leave balance for employee and type"""
        if employee_id not in self.leave_balances:
            return None
        
        for balance in self.leave_balances[employee_id]:
            if balance.leave_type == leave_type:
                return balance
        
        return None
    
    def _get_leave_request(self, request_id: str) -> Optional[LeaveRequest]:
        """Get leave request by ID"""
        for request in self.leave_requests:
            if request.request_id == request_id:
                return request
        return None
