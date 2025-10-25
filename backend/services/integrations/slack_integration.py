"""
Slack Integration for Aria AI Bot
Deploy bots to Slack channels with slash commands and interactive messages
"""
import logging
import aiohttp
from typing import Dict, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SlackConfig:
    """Slack integration configuration"""
    bot_token: str
    signing_secret: str
    app_token: Optional[str] = None
    workspace_id: Optional[str] = None


class SlackIntegration:
    """Slack bot integration"""
    
    def __init__(self, config: SlackConfig):
        self.config = config
        self.api_url = "https://slack.com/api"
    
    async def send_message(
        self,
        channel: str,
        text: str,
        blocks: Optional[list] = None,
        thread_ts: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send message to Slack channel"""
        try:
            headers = {
                "Authorization": f"Bearer {self.config.bot_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "channel": channel,
                "text": text
            }
            
            if blocks:
                payload["blocks"] = blocks
            if thread_ts:
                payload["thread_ts"] = thread_ts
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_url}/chat.postMessage",
                    headers=headers,
                    json=payload
                ) as response:
                    data = await response.json()
                    
                    if not data.get("ok"):
                        logger.error(f"Slack API error: {data.get('error')}")
                        raise Exception(f"Slack error: {data.get('error')}")
                    
                    return data
        
        except Exception as e:
            logger.error(f"Error sending Slack message: {e}")
            raise
    
    async def handle_slash_command(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Slack slash command"""
        command_text = command.get("text", "")
        channel_id = command.get("channel_id")
        user_id = command.get("user_id")
        
        # Process command through bot
        response_text = f"Processing: {command_text}"
        
        return {
            "response_type": "in_channel",
            "text": response_text
        }
    
    async def handle_interaction(self, interaction: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Slack interactive component"""
        return {"ok": True}
    
    def create_message_blocks(self, title: str, content: str, actions: list = None) -> list:
        """Create Slack message blocks"""
        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": title}
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": content}
            }
        ]
        
        if actions:
            blocks.append({
                "type": "actions",
                "elements": actions
            })
        
        return blocks


# Example Slack bot deployment
async def deploy_bot_to_slack(bot_template_id: str, slack_config: SlackConfig):
    """Deploy an Aria bot to Slack"""
    integration = SlackIntegration(slack_config)
    
    # Send welcome message
    blocks = integration.create_message_blocks(
        title="🤖 Aria AI Bot Deployed",
        content="I'm now available in this channel! Use `/aria <question>` to ask me anything.",
        actions=[
            {
                "type": "button",
                "text": {"type": "plain_text", "text": "Get Started"},
                "action_id": "aria_get_started"
            }
        ]
    )
    
    return await integration.send_message(
        channel="general",
        text="Aria AI Bot is now active!",
        blocks=blocks
    )
