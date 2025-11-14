"""
Service Layer
Contains business logic implementations for all bots

Note: Imports are lazy-loaded to avoid circular dependencies and heavy import chains.
Import specific services directly when needed instead of from this package.
"""

__all__ = [
    'GeneralLedgerService',
    'TrialBalanceService',
    'FinancialStatementsService',
    'PostingEngine'
]

def __getattr__(name):
    if name == 'GeneralLedgerService':
        from .general_ledger_service import GeneralLedgerService
        return GeneralLedgerService
    elif name == 'TrialBalanceService':
        from .trial_balance_service import TrialBalanceService
        return TrialBalanceService
    elif name == 'FinancialStatementsService':
        from .financial_statements_service import FinancialStatementsService
        return FinancialStatementsService
    elif name == 'PostingEngine':
        from .posting_engine import PostingEngine
        return PostingEngine
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
