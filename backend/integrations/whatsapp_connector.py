"""
WhatsApp Business API Connector
"""
from typing import Dict, Any, Optional, List
import requests
import json
from datetime import datetime


class WhatsAppConnector:
    """
    WhatsApp Business API Connector
    
    Supports:
    - Send text messages
    - Send media (images, PDFs, audio)
    - Send template messages
    - Webhook handling
    - Read receipts
    - Typing indicators
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.phone_number_id = config.get("phone_number_id")
        self.access_token = config.get("access_token")
        self.business_account_id = config.get("business_account_id")
        self.api_version = config.get("api_version", "v18.0")
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        
    def send_message(
        self,
        to_phone: str,
        message: str,
        context_message_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send text message"""
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": self._format_phone(to_phone),
            "type": "text",
            "text": {
                "preview_url": True,
                "body": message
            }
        }
        
        # Reply to specific message
        if context_message_id:
            payload["context"] = {"message_id": context_message_id}
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "message_id": result["messages"][0]["id"],
                    "recipient": to_phone,
                    "sent_at": datetime.utcnow().isoformat()
                }
            else:
                return {
                    "success": False,
                    "error": f"WhatsApp API error: {response.status_code} - {response.text}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def send_media(
        self,
        to_phone: str,
        media_type: str,  # image, video, audio, document
        media_url: Optional[str] = None,
        media_id: Optional[str] = None,
        caption: Optional[str] = None,
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send media message"""
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        media_payload = {}
        if media_id:
            media_payload["id"] = media_id
        elif media_url:
            media_payload["link"] = media_url
        else:
            return {"success": False, "error": "Must provide media_id or media_url"}
        
        if caption:
            media_payload["caption"] = caption
        if filename:
            media_payload["filename"] = filename
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": self._format_phone(to_phone),
            "type": media_type,
            media_type: media_payload
        }
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "message_id": result["messages"][0]["id"],
                    "recipient": to_phone,
                    "media_type": media_type
                }
            else:
                return {
                    "success": False,
                    "error": f"WhatsApp API error: {response.status_code} - {response.text}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def send_template(
        self,
        to_phone: str,
        template_name: str,
        language: str = "en",
        components: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Send pre-approved template message"""
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": self._format_phone(to_phone),
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language}
            }
        }
        
        if components:
            payload["template"]["components"] = components
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "message_id": result["messages"][0]["id"],
                    "template": template_name
                }
            else:
                return {
                    "success": False,
                    "error": f"WhatsApp API error: {response.status_code} - {response.text}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def mark_as_read(self, message_id: str) -> bool:
        """Mark message as read"""
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id
        }
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            return response.status_code == 200
        except:
            return False
    
    def upload_media(self, file_path: str, mime_type: str) -> Optional[str]:
        """Upload media file and get media ID"""
        url = f"{self.base_url}/{self.phone_number_id}/media"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        try:
            with open(file_path, 'rb') as f:
                files = {
                    'file': (file_path, f, mime_type)
                }
                data = {
                    'messaging_product': 'whatsapp'
                }
                
                response = requests.post(url, headers=headers, files=files, data=data)
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get("id")
                else:
                    print(f"Media upload failed: {response.status_code} - {response.text}")
                    return None
        except Exception as e:
            print(f"Media upload error: {str(e)}")
            return None
    
    def get_media_url(self, media_id: str) -> Optional[str]:
        """Get download URL for media"""
        url = f"{self.base_url}/{media_id}"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        try:
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                return result.get("url")
            else:
                return None
        except Exception as e:
            print(f"Get media URL error: {str(e)}")
            return None
    
    def download_media(self, media_url: str, save_path: str) -> bool:
        """Download media file"""
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        try:
            response = requests.get(media_url, headers=headers, stream=True)
            
            if response.status_code == 200:
                with open(save_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                return True
            else:
                return False
        except Exception as e:
            print(f"Download media error: {str(e)}")
            return False
    
    def verify_webhook(self, mode: str, token: str, challenge: str) -> Optional[str]:
        """Verify webhook subscription (for setup)"""
        verify_token = self.config.get("webhook_verify_token")
        
        if mode == "subscribe" and token == verify_token:
            return challenge
        else:
            return None
    
    def parse_webhook_message(self, webhook_data: Dict) -> Optional[Dict]:
        """Parse incoming webhook message"""
        try:
            entry = webhook_data["entry"][0]
            changes = entry["changes"][0]
            value = changes["value"]
            
            if "messages" in value:
                message = value["messages"][0]
                
                return {
                    "message_id": message["id"],
                    "from_phone": message["from"],
                    "timestamp": message["timestamp"],
                    "type": message["type"],
                    "text": message.get("text", {}).get("body"),
                    "media": message.get("image") or message.get("audio") or message.get("document"),
                    "contact": value.get("contacts", [{}])[0]
                }
            else:
                return None
        except Exception as e:
            print(f"Webhook parsing error: {str(e)}")
            return None
    
    def _format_phone(self, phone: str) -> str:
        """Format phone number (remove spaces, dashes)"""
        return phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    def get_business_profile(self) -> Optional[Dict]:
        """Get WhatsApp Business profile"""
        url = f"{self.base_url}/{self.phone_number_id}/whatsapp_business_profile"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        params = {
            "fields": "about,address,description,email,profile_picture_url,websites,vertical"
        }
        
        try:
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                return response.json().get("data", [{}])[0]
            else:
                return None
        except Exception as e:
            print(f"Get profile error: {str(e)}")
            return None
