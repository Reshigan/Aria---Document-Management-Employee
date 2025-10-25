"""
Production-ready LLM Provider with support for multiple AI services
Supports: OpenAI GPT-4, Anthropic Claude, Ollama (local), and fallbacks
"""
import asyncio
import logging
import json
from typing import Dict, List, Optional, Any, AsyncGenerator
from enum import Enum
from abc import ABC, abstractmethod
import aiohttp
from datetime import datetime

logger = logging.getLogger(__name__)


class LLMProvider(str, Enum):
    """Supported LLM providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OLLAMA = "ollama"
    AZURE_OPENAI = "azure_openai"


class LLMResponse:
    """Standardized LLM response"""
    def __init__(
        self,
        content: str,
        model: str,
        provider: str,
        usage: Dict[str, int] = None,
        finish_reason: str = "stop",
        metadata: Dict[str, Any] = None
    ):
        self.content = content
        self.model = model
        self.provider = provider
        self.usage = usage or {}
        self.finish_reason = finish_reason
        self.metadata = metadata or {}
        self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict:
        return {
            "content": self.content,
            "model": self.model,
            "provider": self.provider,
            "usage": self.usage,
            "finish_reason": self.finish_reason,
            "metadata": self.metadata,
            "timestamp": self.timestamp
        }


class BaseLLMProvider(ABC):
    """Base class for LLM providers"""
    
    def __init__(self, api_key: str, model: str, **kwargs):
        self.api_key = api_key
        self.model = model
        self.kwargs = kwargs
    
    @abstractmethod
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False,
        **kwargs
    ) -> LLMResponse:
        """Generate chat completion"""
        pass
    
    @abstractmethod
    async def stream_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream chat completion"""
        pass


class OpenAIProvider(BaseLLMProvider):
    """OpenAI GPT-4 provider"""
    
    def __init__(self, api_key: str, model: str = "gpt-4-turbo-preview", **kwargs):
        super().__init__(api_key, model, **kwargs)
        self.api_url = kwargs.get("api_url", "https://api.openai.com/v1/chat/completions")
        self.timeout = kwargs.get("timeout", 60)
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False,
        **kwargs
    ) -> LLMResponse:
        """Generate OpenAI chat completion"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": False,
                **kwargs
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"OpenAI API error: {response.status} - {error_text}")
                        raise Exception(f"OpenAI API error: {response.status}")
                    
                    data = await response.json()
                    choice = data["choices"][0]
                    
                    return LLMResponse(
                        content=choice["message"]["content"],
                        model=data["model"],
                        provider=LLMProvider.OPENAI.value,
                        usage=data.get("usage", {}),
                        finish_reason=choice.get("finish_reason", "stop"),
                        metadata={"id": data.get("id")}
                    )
        
        except Exception as e:
            logger.error(f"OpenAI completion error: {e}")
            raise
    
    async def stream_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream OpenAI chat completion"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True,
                **kwargs
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"OpenAI API error: {response.status} - {error_text}")
                        raise Exception(f"OpenAI API error: {response.status}")
                    
                    async for line in response.content:
                        line = line.decode('utf-8').strip()
                        if line.startswith('data: '):
                            data_str = line[6:]  # Remove 'data: ' prefix
                            if data_str == '[DONE]':
                                break
                            try:
                                data = json.loads(data_str)
                                delta = data["choices"][0]["delta"]
                                if "content" in delta:
                                    yield delta["content"]
                            except json.JSONDecodeError:
                                continue
        
        except Exception as e:
            logger.error(f"OpenAI streaming error: {e}")
            raise


class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude provider"""
    
    def __init__(self, api_key: str, model: str = "claude-3-opus-20240229", **kwargs):
        super().__init__(api_key, model, **kwargs)
        self.api_url = kwargs.get("api_url", "https://api.anthropic.com/v1/messages")
        self.timeout = kwargs.get("timeout", 60)
        self.anthropic_version = kwargs.get("anthropic_version", "2023-06-01")
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False,
        **kwargs
    ) -> LLMResponse:
        """Generate Anthropic chat completion"""
        try:
            # Extract system message if present
            system_message = ""
            filtered_messages = []
            for msg in messages:
                if msg["role"] == "system":
                    system_message = msg["content"]
                else:
                    filtered_messages.append(msg)
            
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": self.anthropic_version,
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.model,
                "messages": filtered_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                **kwargs
            }
            
            if system_message:
                payload["system"] = system_message
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Anthropic API error: {response.status} - {error_text}")
                        raise Exception(f"Anthropic API error: {response.status}")
                    
                    data = await response.json()
                    content = data["content"][0]["text"]
                    
                    return LLMResponse(
                        content=content,
                        model=data["model"],
                        provider=LLMProvider.ANTHROPIC.value,
                        usage=data.get("usage", {}),
                        finish_reason=data.get("stop_reason", "stop"),
                        metadata={"id": data.get("id")}
                    )
        
        except Exception as e:
            logger.error(f"Anthropic completion error: {e}")
            raise
    
    async def stream_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream Anthropic chat completion"""
        # Implementation similar to chat_completion but with streaming
        # For brevity, using placeholder
        async for chunk in self._stream_anthropic(messages, temperature, max_tokens, **kwargs):
            yield chunk
    
    async def _stream_anthropic(self, messages, temperature, max_tokens, **kwargs):
        """Helper for streaming (simplified)"""
        response = await self.chat_completion(messages, temperature, max_tokens, **kwargs)
        yield response.content


class OllamaProvider(BaseLLMProvider):
    """Ollama local LLM provider"""
    
    def __init__(self, api_key: str = "", model: str = "llama3", **kwargs):
        super().__init__(api_key, model, **kwargs)
        self.api_url = kwargs.get("api_url", "http://localhost:11434/api/chat")
        self.timeout = kwargs.get("timeout", 120)
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False,
        **kwargs
    ) -> LLMResponse:
        """Generate Ollama chat completion"""
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Ollama API error: {response.status} - {error_text}")
                        raise Exception(f"Ollama API error: {response.status}")
                    
                    data = await response.json()
                    
                    return LLMResponse(
                        content=data["message"]["content"],
                        model=self.model,
                        provider=LLMProvider.OLLAMA.value,
                        usage={},
                        finish_reason="stop",
                        metadata={"done": data.get("done")}
                    )
        
        except Exception as e:
            logger.error(f"Ollama completion error: {e}")
            raise
    
    async def stream_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream Ollama chat completion"""
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": True,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    async for line in response.content:
                        if line:
                            try:
                                data = json.loads(line)
                                if "message" in data and "content" in data["message"]:
                                    yield data["message"]["content"]
                            except json.JSONDecodeError:
                                continue
        
        except Exception as e:
            logger.error(f"Ollama streaming error: {e}")
            raise


class LLMProviderFactory:
    """Factory for creating LLM providers with fallback support"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize with configuration
        
        config = {
            "primary_provider": "openai",
            "fallback_providers": ["anthropic", "ollama"],
            "openai": {"api_key": "...", "model": "gpt-4"},
            "anthropic": {"api_key": "...", "model": "claude-3"},
            "ollama": {"model": "llama3", "api_url": "http://localhost:11434"}
        }
        """
        self.config = config
        self.primary_provider = config.get("primary_provider", "openai")
        self.fallback_providers = config.get("fallback_providers", [])
        self._providers = {}
    
    def _create_provider(self, provider_name: str) -> BaseLLMProvider:
        """Create a provider instance"""
        provider_config = self.config.get(provider_name, {})
        
        if provider_name == LLMProvider.OPENAI.value:
            return OpenAIProvider(
                api_key=provider_config.get("api_key", ""),
                model=provider_config.get("model", "gpt-4-turbo-preview"),
                **provider_config
            )
        elif provider_name == LLMProvider.ANTHROPIC.value:
            return AnthropicProvider(
                api_key=provider_config.get("api_key", ""),
                model=provider_config.get("model", "claude-3-opus-20240229"),
                **provider_config
            )
        elif provider_name == LLMProvider.OLLAMA.value:
            return OllamaProvider(
                model=provider_config.get("model", "llama3"),
                **provider_config
            )
        else:
            raise ValueError(f"Unknown provider: {provider_name}")
    
    def get_provider(self, provider_name: Optional[str] = None) -> BaseLLMProvider:
        """Get provider instance (cached)"""
        provider_name = provider_name or self.primary_provider
        
        if provider_name not in self._providers:
            self._providers[provider_name] = self._create_provider(provider_name)
        
        return self._providers[provider_name]
    
    async def chat_completion_with_fallback(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> LLMResponse:
        """
        Try chat completion with primary provider, fallback to others on failure
        """
        providers_to_try = [self.primary_provider] + self.fallback_providers
        last_error = None
        
        for provider_name in providers_to_try:
            try:
                provider = self.get_provider(provider_name)
                logger.info(f"Attempting LLM completion with {provider_name}")
                response = await provider.chat_completion(
                    messages, temperature, max_tokens, **kwargs
                )
                logger.info(f"Successfully completed with {provider_name}")
                return response
            except Exception as e:
                logger.warning(f"Provider {provider_name} failed: {e}")
                last_error = e
                continue
        
        # All providers failed
        logger.error(f"All LLM providers failed. Last error: {last_error}")
        raise Exception(f"All LLM providers failed: {last_error}")
    
    async def stream_completion_with_fallback(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream completion with fallback"""
        providers_to_try = [self.primary_provider] + self.fallback_providers
        
        for provider_name in providers_to_try:
            try:
                provider = self.get_provider(provider_name)
                logger.info(f"Attempting streaming with {provider_name}")
                async for chunk in provider.stream_completion(
                    messages, temperature, max_tokens, **kwargs
                ):
                    yield chunk
                return  # Success
            except Exception as e:
                logger.warning(f"Provider {provider_name} streaming failed: {e}")
                continue
        
        # All providers failed
        raise Exception("All LLM providers failed for streaming")


# Example usage
async def example_usage():
    """Example of how to use the LLM provider"""
    
    # Configuration
    config = {
        "primary_provider": "openai",
        "fallback_providers": ["anthropic", "ollama"],
        "openai": {
            "api_key": "sk-...",  # Your OpenAI API key
            "model": "gpt-4-turbo-preview"
        },
        "anthropic": {
            "api_key": "sk-ant-...",  # Your Anthropic API key
            "model": "claude-3-opus-20240229"
        },
        "ollama": {
            "model": "llama3",
            "api_url": "http://localhost:11434/api/chat"
        }
    }
    
    factory = LLMProviderFactory(config)
    
    # Chat completion with automatic fallback
    messages = [
        {"role": "system", "content": "You are a helpful AI assistant."},
        {"role": "user", "content": "What is the capital of France?"}
    ]
    
    response = await factory.chat_completion_with_fallback(messages)
    print(f"Response: {response.content}")
    print(f"Provider: {response.provider}")
    print(f"Usage: {response.usage}")
    
    # Streaming
    print("\nStreaming response:")
    async for chunk in factory.stream_completion_with_fallback(messages):
        print(chunk, end="", flush=True)


if __name__ == "__main__":
    # Run example
    asyncio.run(example_usage())
