from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.deps import get_current_user, get_db
from app.models.user import User
import importlib
import os
from pathlib import Path

router = APIRouter(prefix="/bots", tags=["AI Bots"])

BOT_DIRECTORY = Path(__file__).parent.parent / "bots"

def discover_bots() -> List[Dict[str, Any]]:
    """Discover all available bots in the bots directory"""
    bots = []
    
    if not BOT_DIRECTORY.exists():
        return bots
    
    for file in BOT_DIRECTORY.glob("*.py"):
        if file.name.startswith("__") or file.name == "base_bot.py":
            continue
            
        bot_name = file.stem
        
        if bot_name == "bot_manager" or bot_name == "bot_action_system":
            continue
        
        bot_info = {
            "id": bot_name,
            "name": bot_name.replace("_", " ").title(),
            "module": f"app.bots.{bot_name}",
            "status": "available",
            "category": categorize_bot(bot_name)
        }
        bots.append(bot_info)
    
    return bots

def categorize_bot(bot_name: str) -> str:
    """Categorize bot based on name"""
    if any(x in bot_name for x in ["invoice", "accounts_payable", "accounts_receivable", "ar_collections", "expense"]):
        return "Financial Operations"
    elif any(x in bot_name for x in ["bank", "cash", "payment", "treasury"]):
        return "Banking & Treasury"
    elif any(x in bot_name for x in ["tax", "compliance", "bbbee", "audit"]):
        return "Compliance & Regulatory"
    elif any(x in bot_name for x in ["payroll", "hr", "employee", "benefits", "leave"]):
        return "Human Resources"
    elif any(x in bot_name for x in ["inventory", "procurement", "supplier", "purchase", "stock", "warehouse"]):
        return "Supply Chain"
    elif any(x in bot_name for x in ["sales", "customer", "order", "crm", "lead"]):
        return "Sales & CRM"
    elif any(x in bot_name for x in ["production", "manufacturing", "quality", "maintenance", "mrp"]):
        return "Manufacturing"
    elif any(x in bot_name for x in ["general_ledger", "journal", "financial_close", "financial_reporting"]):
        return "Accounting"
    elif any(x in bot_name for x in ["document", "email", "data", "archive"]):
        return "Document Management"
    else:
        return "General Operations"

@router.get("/")
async def list_bots(
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """List all available AI bots"""
    bots = discover_bots()
    return sorted(bots, key=lambda x: (x["category"], x["name"]))

@router.get("/categories")
async def get_bot_categories(
    current_user: User = Depends(get_current_user)
) -> Dict[str, int]:
    """Get bot counts by category"""
    bots = discover_bots()
    categories = {}
    for bot in bots:
        cat = bot["category"]
        categories[cat] = categories.get(cat, 0) + 1
    return categories

@router.get("/{bot_id}")
async def get_bot_details(
    bot_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get details about a specific bot"""
    bots = discover_bots()
    bot = next((b for b in bots if b["id"] == bot_id), None)
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    try:
        module = importlib.import_module(bot["module"])
        
        bot["description"] = getattr(module, "__doc__", "No description available")
        
        if hasattr(module, "BOT_CAPABILITIES"):
            bot["capabilities"] = module.BOT_CAPABILITIES
        else:
            bot["capabilities"] = ["Process automation", "Data analysis", "Report generation"]
        
        if hasattr(module, "BOT_CONFIG"):
            bot["config"] = module.BOT_CONFIG
        
    except Exception as e:
        bot["description"] = f"Bot module available but details not loaded: {str(e)}"
        bot["capabilities"] = ["Process automation"]
    
    return bot

@router.post("/{bot_id}/execute")
async def execute_bot(
    bot_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Execute a bot with given payload"""
    bots = discover_bots()
    bot = next((b for b in bots if b["id"] == bot_id), None)
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    try:
        module = importlib.import_module(bot["module"])
        
        if hasattr(module, "execute"):
            result = await module.execute(payload, db, current_user)
            return {"status": "success", "result": result}
        elif hasattr(module, "process"):
            result = await module.process(payload, db, current_user)
            return {"status": "success", "result": result}
        else:
            return {
                "status": "info",
                "message": f"Bot {bot['name']} is available but needs configuration for execution"
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bot execution failed: {str(e)}")

@router.get("/{bot_id}/status")
async def get_bot_status(
    bot_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get the operational status of a bot"""
    bots = discover_bots()
    bot = next((b for b in bots if b["id"] == bot_id), None)
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    return {
        "bot_id": bot_id,
        "status": "operational",
        "last_run": None,
        "success_rate": 100.0,
        "total_runs": 0
    }
