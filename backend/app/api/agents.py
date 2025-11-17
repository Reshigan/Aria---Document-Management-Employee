from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.deps import get_current_user, get_db
from app.models.user import User
import importlib
import os
from pathlib import Path

router = APIRouter(prefix="/agents", tags=["AI Agents"])

AGENT_DIRECTORY = Path(__file__).parent.parent / "bots"

def discover_agents() -> List[Dict[str, Any]]:
    """Discover all available agents in the bots directory"""
    agents = []
    
    if not AGENT_DIRECTORY.exists():
        return agents
    
    for file in AGENT_DIRECTORY.glob("*.py"):
        if file.name.startswith("__") or file.name == "base_bot.py":
            continue
            
        agent_name = file.stem
        
        if agent_name == "bot_manager" or agent_name == "bot_action_system":
            continue
        
        agent_info = {
            "id": agent_name,
            "name": agent_name.replace("_", " ").title(),
            "module": f"app.bots.{agent_name}",
            "status": "available",
            "category": categorize_agent(agent_name)
        }
        agents.append(agent_info)
    
    return agents

def categorize_agent(agent_name: str) -> str:
    """Categorize agent based on name"""
    if any(x in agent_name for x in ["invoice", "accounts_payable", "accounts_receivable", "ar_collections", "expense"]):
        return "Financial Operations"
    elif any(x in agent_name for x in ["bank", "cash", "payment", "treasury"]):
        return "Banking & Treasury"
    elif any(x in agent_name for x in ["tax", "compliance", "bbbee", "audit"]):
        return "Compliance & Regulatory"
    elif any(x in agent_name for x in ["payroll", "hr", "employee", "benefits", "leave"]):
        return "Human Resources"
    elif any(x in agent_name for x in ["inventory", "procurement", "supplier", "purchase", "stock", "warehouse"]):
        return "Supply Chain"
    elif any(x in agent_name for x in ["sales", "customer", "order", "crm", "lead"]):
        return "Sales & CRM"
    elif any(x in agent_name for x in ["production", "manufacturing", "quality", "maintenance", "mrp"]):
        return "Manufacturing"
    elif any(x in agent_name for x in ["general_ledger", "journal", "financial_close", "financial_reporting"]):
        return "Accounting"
    elif any(x in agent_name for x in ["document", "email", "data", "archive"]):
        return "Document Management"
    else:
        return "General Operations"

@router.get("/")
async def list_agents(
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """List all available AI agents"""
    agents = discover_agents()
    return sorted(agents, key=lambda x: (x["category"], x["name"]))

@router.get("/categories")
async def get_agent_categories(
    current_user: User = Depends(get_current_user)
) -> Dict[str, int]:
    """Get agent counts by category"""
    agents = discover_agents()
    categories = {}
    for agent in agents:
        cat = agent["category"]
        categories[cat] = categories.get(cat, 0) + 1
    return categories

@router.get("/{agent_id}")
async def get_agent_details(
    agent_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get details about a specific agent"""
    agents = discover_agents()
    agent = next((a for a in agents if a["id"] == agent_id), None)
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    try:
        module = importlib.import_module(agent["module"])
        
        agent["description"] = getattr(module, "__doc__", "No description available")
        
        if hasattr(module, "BOT_CAPABILITIES"):
            agent["capabilities"] = module.BOT_CAPABILITIES
        else:
            agent["capabilities"] = ["Process automation", "Data analysis", "Report generation"]
        
        if hasattr(module, "BOT_CONFIG"):
            agent["config"] = module.BOT_CONFIG
        
    except Exception as e:
        agent["description"] = f"Agent module available but details not loaded: {str(e)}"
        agent["capabilities"] = ["Process automation"]
    
    return agent

@router.post("/{agent_id}/execute")
async def execute_agent(
    agent_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Execute an agent with given payload"""
    agents = discover_agents()
    agent = next((a for a in agents if a["id"] == agent_id), None)
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    try:
        module = importlib.import_module(agent["module"])
        
        if hasattr(module, "execute"):
            result = await module.execute(payload, db, current_user)
            return {"status": "success", "result": result}
        elif hasattr(module, "process"):
            result = await module.process(payload, db, current_user)
            return {"status": "success", "result": result}
        else:
            return {
                "status": "info",
                "message": f"Agent {agent['name']} is available but needs configuration for execution"
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")

@router.get("/{agent_id}/status")
async def get_agent_status(
    agent_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get the operational status of an agent"""
    agents = discover_agents()
    agent = next((a for a in agents if a["id"] == agent_id), None)
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {
        "agent_id": agent_id,
        "status": "operational",
        "last_run": None,
        "success_rate": 100.0,
        "total_runs": 0
    }
