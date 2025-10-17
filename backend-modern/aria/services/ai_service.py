"""
AI Service for document processing and chat capabilities.
"""
import asyncio
import json
import logging
from typing import List, Dict, Any, Optional, AsyncGenerator
from datetime import datetime

import openai
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from aria.core.config import get_settings
from aria.models.document import Document
from aria.models.chat import ChatSession, ChatMessage, MessageType
from aria.models.user import User

logger = logging.getLogger(__name__)
settings = get_settings()


class AIService:
    """Service for AI-powered document processing and chat capabilities."""
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.openai_api_key
        ) if settings.openai_api_key else None
        self.model = settings.openai_model
        self.max_tokens = settings.openai_max_tokens
        self.temperature = settings.openai_temperature
        
    async def analyze_document(
        self, 
        document: Document, 
        analysis_type: str = "comprehensive"
    ) -> Dict[str, Any]:
        """
        Analyze a document using AI.
        
        Args:
            document: Document to analyze
            analysis_type: Type of analysis (comprehensive, summary, keywords, etc.)
            
        Returns:
            Analysis results
        """
        if not self.client:
            raise ValueError("OpenAI API key not configured")
            
        try:
            # Prepare the document content
            content = document.extracted_text or document.title or "No content available"
            
            # Create analysis prompt based on type
            prompts = {
                "comprehensive": f"""
                Analyze the following document comprehensively:
                
                Title: {document.title}
                Content: {content[:4000]}  # Limit content to avoid token limits
                
                Please provide:
                1. A concise summary (2-3 sentences)
                2. Key topics and themes
                3. Important entities (people, organizations, dates, etc.)
                4. Sentiment analysis
                5. Suggested tags
                6. Document category/type
                7. Key insights or takeaways
                
                Format your response as JSON with the following structure:
                {{
                    "summary": "...",
                    "topics": ["topic1", "topic2"],
                    "entities": {{"people": [], "organizations": [], "dates": [], "locations": []}},
                    "sentiment": "positive/negative/neutral",
                    "tags": ["tag1", "tag2"],
                    "category": "...",
                    "insights": ["insight1", "insight2"]
                }}
                """,
                "summary": f"""
                Provide a concise summary of this document:
                
                Title: {document.title}
                Content: {content[:4000]}
                
                Summary (2-3 sentences):
                """,
                "keywords": f"""
                Extract the most important keywords and phrases from this document:
                
                Title: {document.title}
                Content: {content[:4000]}
                
                Return the top 10 keywords/phrases as a JSON array.
                """
            }
            
            prompt = prompts.get(analysis_type, prompts["comprehensive"])
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert document analyst. Provide accurate, insightful analysis."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            result = response.choices[0].message.content
            
            # Try to parse as JSON for comprehensive analysis
            if analysis_type == "comprehensive":
                try:
                    parsed_result = json.loads(result)
                    return {
                        "type": analysis_type,
                        "result": parsed_result,
                        "raw_response": result,
                        "tokens_used": response.usage.total_tokens if response.usage else 0,
                        "model": self.model,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                except json.JSONDecodeError:
                    logger.warning("Failed to parse AI response as JSON, returning raw text")
            
            return {
                "type": analysis_type,
                "result": result,
                "tokens_used": response.usage.total_tokens if response.usage else 0,
                "model": self.model,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing document {document.id}: {str(e)}")
            raise
    
    async def chat_with_documents(
        self,
        session: AsyncSession,
        user: User,
        chat_session: ChatSession,
        message: str,
        document_ids: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat response based on documents and conversation history.
        
        Args:
            session: Database session
            user: User making the request
            chat_session: Chat session
            message: User message
            document_ids: Optional list of document IDs to reference
            
        Yields:
            Streaming response chunks
        """
        if not self.client:
            raise ValueError("OpenAI API key not configured")
            
        try:
            # Get conversation history
            history_query = select(ChatMessage).where(
                ChatMessage.session_id == chat_session.id
            ).order_by(ChatMessage.created_at.desc()).limit(10)
            
            history_result = await session.execute(history_query)
            history = history_result.scalars().all()
            
            # Get referenced documents
            documents = []
            if document_ids:
                doc_query = select(Document).where(
                    Document.id.in_(document_ids),
                    Document.user_id == user.id
                )
                doc_result = await session.execute(doc_query)
                documents = doc_result.scalars().all()
            
            # Build context
            context_parts = []
            
            if documents:
                context_parts.append("=== REFERENCED DOCUMENTS ===")
                for doc in documents:
                    content = doc.extracted_text or doc.title or "No content"
                    context_parts.append(f"Document: {doc.title}")
                    context_parts.append(f"Content: {content[:2000]}")  # Limit per document
                    context_parts.append("---")
            
            # Add conversation history
            if history:
                context_parts.append("=== CONVERSATION HISTORY ===")
                for msg in reversed(history[-5:]):  # Last 5 messages
                    role = "User" if msg.message_type == MessageType.USER else "Assistant"
                    context_parts.append(f"{role}: {msg.content}")
            
            context = "\n".join(context_parts)
            
            # Create system prompt
            system_prompt = f"""
            You are ARIA, an intelligent document management assistant. You help users understand, 
            analyze, and work with their documents. You have access to the user's document collection 
            and conversation history.
            
            Guidelines:
            - Be helpful, accurate, and concise
            - Reference specific documents when relevant
            - If you don't have enough information, ask clarifying questions
            - Provide actionable insights and suggestions
            - Maintain context from the conversation history
            
            Current context:
            {context}
            """
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ]
            
            # Stream the response
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"Error in chat with documents: {str(e)}")
            yield f"I apologize, but I encountered an error: {str(e)}"
    
    async def generate_document_summary(
        self, 
        documents: List[Document]
    ) -> str:
        """
        Generate a summary of multiple documents.
        
        Args:
            documents: List of documents to summarize
            
        Returns:
            Combined summary
        """
        if not self.client:
            raise ValueError("OpenAI API key not configured")
            
        if not documents:
            return "No documents provided for summary."
            
        try:
            # Prepare document content
            doc_contents = []
            for doc in documents:
                content = doc.extracted_text or doc.title or "No content"
                doc_contents.append(f"Document: {doc.title}\nContent: {content[:1500]}")
            
            combined_content = "\n\n---\n\n".join(doc_contents)
            
            prompt = f"""
            Please provide a comprehensive summary of the following documents:
            
            {combined_content}
            
            Summary should include:
            1. Overall themes and topics
            2. Key insights across all documents
            3. Important relationships or connections
            4. Main conclusions or takeaways
            
            Keep the summary concise but informative (3-5 paragraphs).
            """
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert document analyst specializing in creating comprehensive summaries."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating document summary: {str(e)}")
            raise
    
    async def suggest_tags(self, document: Document) -> List[str]:
        """
        Suggest tags for a document using AI.
        
        Args:
            document: Document to analyze
            
        Returns:
            List of suggested tags
        """
        if not self.client:
            return []
            
        try:
            content = document.extracted_text or document.title or "No content"
            
            prompt = f"""
            Analyze this document and suggest 5-8 relevant tags:
            
            Title: {document.title}
            Content: {content[:2000]}
            
            Return only the tags as a JSON array of strings. Tags should be:
            - Relevant and specific
            - Useful for categorization and search
            - Mix of topics, document types, and key concepts
            
            Example: ["finance", "quarterly-report", "revenue", "analysis"]
            """
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a document tagging expert. Provide relevant, searchable tags."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.3
            )
            
            result = response.choices[0].message.content
            
            try:
                tags = json.loads(result)
                return tags if isinstance(tags, list) else []
            except json.JSONDecodeError:
                # Fallback: extract tags from text response
                import re
                tags = re.findall(r'"([^"]+)"', result)
                return tags[:8]  # Limit to 8 tags
                
        except Exception as e:
            logger.error(f"Error suggesting tags for document {document.id}: {str(e)}")
            return []
    
    async def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract named entities from text.
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary of entity types and their values
        """
        if not self.client:
            return {}
            
        try:
            prompt = f"""
            Extract named entities from the following text:
            
            {text[:3000]}
            
            Return the entities as JSON with these categories:
            - people: Person names
            - organizations: Company/organization names
            - locations: Places, cities, countries
            - dates: Dates and time references
            - money: Monetary amounts
            - products: Product or service names
            
            Format: {{"people": ["name1", "name2"], "organizations": ["org1"], ...}}
            """
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert in named entity recognition. Extract entities accurately."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.1
            )
            
            result = response.choices[0].message.content
            
            try:
                entities = json.loads(result)
                return entities if isinstance(entities, dict) else {}
            except json.JSONDecodeError:
                logger.warning("Failed to parse entity extraction response as JSON")
                return {}
                
        except Exception as e:
            logger.error(f"Error extracting entities: {str(e)}")
            return {}


# Global AI service instance
ai_service = AIService()


async def get_ai_service() -> AIService:
    """Get the AI service instance."""
    return ai_service