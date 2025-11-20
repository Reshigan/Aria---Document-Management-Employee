"""
Ollama LLM Client for Ask Aria
Handles communication with local Ollama instance for conversational AI
"""
import json
import requests
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)


class OllamaClient:
    """Client for interacting with Ollama local LLM"""
    
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "qwen2.5:1.5b-instruct"):
        self.base_url = base_url
        self.model = model
        self.timeout = 60  # 60 second timeout for LLM inference
        self._warmup()
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Send chat completion request to Ollama
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            tools: Optional list of tool/function definitions
            temperature: Sampling temperature (0-1)
            stream: Whether to stream the response
            
        Returns:
            Response dict with 'message' and optional 'tool_calls'
        """
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "stream": stream,
                "keep_alive": "1h",
                "options": {
                    "num_predict": 80,
                    "num_ctx": 768,
                    "num_threads": 2,
                    "temperature": 0.2,
                    "top_k": 40,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1
                }
            }
            
            if tools:
                payload["tools"] = tools
            
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Ollama chat response: {result.get('message', {}).get('role')}")
            
            return result
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama request failed: {str(e)}")
            raise Exception(f"Failed to communicate with Ollama: {str(e)}")
    
    def generate(self, prompt: str, temperature: float = 0.2) -> str:
        """
        Simple text generation (non-chat mode)
        
        Args:
            prompt: Text prompt
            temperature: Sampling temperature
            
        Returns:
            Generated text
        """
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "temperature": temperature,
                "stream": False,
                "keep_alive": "1h",
                "options": {
                    "num_predict": 80,
                    "num_ctx": 768,
                    "num_threads": 2,
                    "temperature": 0.2,
                    "top_k": 40,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1
                }
            }
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get("response", "")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama generate failed: {str(e)}")
            raise Exception(f"Failed to generate text: {str(e)}")
    
    def list_models(self) -> List[str]:
        """List available models in Ollama"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=10)
            response.raise_for_status()
            
            result = response.json()
            models = [m["name"] for m in result.get("models", [])]
            return models
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to list Ollama models: {str(e)}")
            return []
    
    def pull_model(self, model_name: str) -> bool:
        """Pull/download a model from Ollama registry"""
        try:
            response = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": model_name},
                timeout=600  # 10 minutes for model download
            )
            response.raise_for_status()
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to pull model {model_name}: {str(e)}")
            return False
    
    def is_available(self) -> bool:
        """Check if Ollama service is available"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def chat_stream(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2
    ):
        """
        Stream chat completion from Ollama (generator)
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            tools: Optional list of tool/function definitions
            temperature: Sampling temperature (0-1)
            
        Yields:
            Chunks of response text as they arrive
        """
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "stream": True,
                "keep_alive": "1h",
                "options": {
                    "num_predict": 80,
                    "num_ctx": 768,
                    "num_threads": 2,
                    "temperature": 0.2,
                    "top_k": 40,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1
                }
            }
            
            if tools:
                payload["tools"] = tools
            
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=self.timeout,
                stream=True
            )
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        if chunk.get("message", {}).get("content"):
                            yield chunk["message"]["content"]
                        
                        if chunk.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue
                        
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama streaming failed: {str(e)}")
            raise Exception(f"Failed to stream from Ollama: {str(e)}")
    
    def _warmup(self):
        """Warmup the model on initialization to reduce first-call latency"""
        try:
            logger.info(f"Warming up Ollama model {self.model}...")
            self.generate("Hello", temperature=0.1)
            logger.info("Ollama model warmed up successfully")
        except Exception as e:
            logger.warning(f"Failed to warmup Ollama model: {str(e)}")


ollama_client = OllamaClient()
