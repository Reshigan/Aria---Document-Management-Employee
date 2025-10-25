"""
Microsoft Teams Integration for Aria AI Bot
Deploy bots to Teams channels with adaptive cards
"""
import logging
import aiohttp
from typing import Dict, Optional, Any

logger = logging.getLogger(__name__)


class TeamsIntegration:
    """Microsoft Teams bot integration"""
    
    def __init__(self, app_id: str, app_password: str):
        self.app_id = app_id
        self.app_password = app_password
        self.service_url = "https://smba.trafficmanager.net/apis/"
    
    async def send_message(
        self,
        conversation_id: str,
        text: str,
        card: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Send message to Teams"""
        try:
            activity = {
                "type": "message",
                "text": text,
                "conversation": {"id": conversation_id}
            }
            
            if card:
                activity["attachments"] = [
                    {
                        "contentType": "application/vnd.microsoft.card.adaptive",
                        "content": card
                    }
                ]
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.service_url}v3/conversations/{conversation_id}/activities",
                    json=activity
                ) as response:
                    return await response.json()
        
        except Exception as e:
            logger.error(f"Error sending Teams message: {e}")
            raise
    
    def create_adaptive_card(self, title: str, content: str, actions: list = None) -> Dict:
        """Create Teams adaptive card"""
        card = {
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.4",
            "body": [
                {
                    "type": "TextBlock",
                    "text": title,
                    "size": "Large",
                    "weight": "Bolder"
                },
                {
                    "type": "TextBlock",
                    "text": content,
                    "wrap": True
                }
            ]
        }
        
        if actions:
            card["actions"] = actions
        
        return card
