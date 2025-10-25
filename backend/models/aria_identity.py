"""
Aria Identity & Orchestration Models
Aria as the central AI controller with voice, visual identity, and bot orchestration
"""
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .base import Base

class AriaPersonalityMode(str, enum.Enum):
    """Aria's personality modes"""
    PROFESSIONAL = "professional"  # Business formal
    FRIENDLY = "friendly"  # Warm and approachable
    TECHNICAL = "technical"  # Detail-oriented, precise
    CREATIVE = "creative"  # Innovative, brainstorming
    EXECUTIVE = "executive"  # Strategic, high-level

class VoiceGender(str, enum.Enum):
    """Voice gender options"""
    FEMALE = "female"
    MALE = "male"
    NEUTRAL = "neutral"

class ProcessStatus(str, enum.Enum):
    """Process execution status"""
    PENDING = "pending"
    RUNNING = "running"
    WAITING = "waiting"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# ============================================================================
# ARIA IDENTITY & CONFIGURATION
# ============================================================================

class AriaIdentity(Base):
    """Aria's identity and configuration per organization"""
    __tablename__ = "aria_identities"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    
    # Visual Identity
    display_name = Column(String(100), default="Aria")
    avatar_url = Column(String(500), nullable=True)  # Profile picture
    avatar_style = Column(String(50), default="professional")  # professional, friendly, abstract
    brand_color = Column(String(7), default="#6366f1")  # Hex color
    
    # Voice Configuration
    voice_enabled = Column(Boolean, default=True)
    voice_provider = Column(String(50), default="elevenlabs")  # elevenlabs, azure, google
    voice_id = Column(String(100), nullable=True)  # Provider-specific voice ID
    voice_gender = Column(SQLEnum(VoiceGender), default=VoiceGender.FEMALE)
    voice_language = Column(String(10), default="en-US")
    voice_speed = Column(Float, default=1.0)  # 0.5 to 2.0
    voice_pitch = Column(Float, default=1.0)  # 0.5 to 2.0
    
    # Personality
    personality_mode = Column(SQLEnum(AriaPersonalityMode), default=AriaPersonalityMode.PROFESSIONAL)
    greeting_message = Column(Text, default="Hello! I'm Aria, your AI assistant. How can I help you today?")
    system_prompt_override = Column(Text, nullable=True)  # Custom system prompt
    
    # Capabilities
    can_delegate_to_bots = Column(Boolean, default=True)
    can_execute_workflows = Column(Boolean, default=True)
    can_access_documents = Column(Boolean, default=True)
    can_make_decisions = Column(Boolean, default=False)  # Auto-approve workflows
    
    # Settings
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============================================================================
# BOT ORCHESTRATION (Aria managing other bots)
# ============================================================================

class ManagedBot(Base):
    """Specialized bots managed by Aria"""
    __tablename__ = "managed_bots"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    
    # Bot identity
    bot_id = Column(String(100), nullable=False)  # "sales_assistant", "hr_bot", etc.
    bot_name = Column(String(100), nullable=False)
    bot_description = Column(Text, nullable=True)
    bot_avatar_url = Column(String(500), nullable=True)
    
    # Configuration
    template_id = Column(String(100), nullable=False)  # Base template it's built on
    is_active = Column(Boolean, default=True)
    
    # Specialization
    department = Column(String(100), nullable=True)  # "sales", "hr", "finance", "legal"
    expertise_areas = Column(JSON, default=list)  # ["contracts", "invoices", "compliance"]
    
    # Behavior
    system_prompt = Column(Text, nullable=True)
    custom_context = Column(JSON, default=dict)
    
    # Analytics
    total_interactions = Column(Integer, default=0)
    success_rate = Column(Float, default=1.0)
    avg_response_time = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relationships
    interactions = relationship("BotInteraction", back_populates="bot")

class BotInteraction(Base):
    """Track interactions with managed bots"""
    __tablename__ = "bot_interactions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    managed_bot_id = Column(Integer, ForeignKey("managed_bots.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    conversation_id = Column(String, nullable=True)
    
    # Interaction details
    user_message = Column(Text, nullable=False)
    bot_response = Column(Text, nullable=False)
    response_time_ms = Column(Integer, nullable=False)
    success = Column(Boolean, default=True)
    
    # Context
    delegated_by_aria = Column(Boolean, default=True)  # Did Aria route this?
    metadata = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    bot = relationship("ManagedBot", back_populates="interactions")

# ============================================================================
# PROCESS ORCHESTRATION (Aria executing complex processes)
# ============================================================================

class Process(Base):
    """Multi-step processes orchestrated by Aria"""
    __tablename__ = "processes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Process details
    process_name = Column(String(255), nullable=False)
    process_type = Column(String(100), nullable=False)  # "document_approval", "hiring", "sales_pipeline"
    description = Column(Text, nullable=True)
    
    # Status
    status = Column(SQLEnum(ProcessStatus), default=ProcessStatus.PENDING)
    current_step = Column(Integer, default=0)
    total_steps = Column(Integer, nullable=False)
    
    # Execution
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Process definition
    steps = Column(JSON, nullable=False)  # Array of step definitions
    context = Column(JSON, default=dict)  # Shared context across steps
    results = Column(JSON, default=dict)  # Results from each step
    
    # Configuration
    auto_advance = Column(Boolean, default=False)  # Auto-proceed or wait for approval
    timeout_minutes = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    steps_history = relationship("ProcessStep", back_populates="process")

class ProcessStep(Base):
    """Individual steps in a process"""
    __tablename__ = "process_steps"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    process_id = Column(Integer, ForeignKey("processes.id"), nullable=False)
    
    # Step details
    step_number = Column(Integer, nullable=False)
    step_name = Column(String(255), nullable=False)
    step_type = Column(String(50), nullable=False)  # "bot_call", "human_review", "webhook", "decision"
    
    # Execution
    assigned_bot_id = Column(Integer, ForeignKey("managed_bots.id"), nullable=True)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Status
    status = Column(SQLEnum(ProcessStatus), default=ProcessStatus.PENDING)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Input/Output
    input_data = Column(JSON, default=dict)
    output_data = Column(JSON, default=dict)
    
    # Decision making
    requires_approval = Column(Boolean, default=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    process = relationship("Process", back_populates="steps_history")

# ============================================================================
# VOICE INTERACTIONS
# ============================================================================

class VoiceInteraction(Base):
    """Voice conversations with Aria"""
    __tablename__ = "voice_interactions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    conversation_id = Column(String, nullable=True)
    
    # Audio
    audio_input_url = Column(String(500), nullable=True)  # S3/storage URL
    audio_output_url = Column(String(500), nullable=True)
    audio_duration_seconds = Column(Float, nullable=True)
    
    # Transcription
    transcribed_text = Column(Text, nullable=True)
    transcription_confidence = Column(Float, nullable=True)
    detected_language = Column(String(10), nullable=True)
    
    # Response
    response_text = Column(Text, nullable=True)
    synthesized_audio_url = Column(String(500), nullable=True)
    
    # Processing
    processing_time_ms = Column(Integer, nullable=True)
    voice_provider = Column(String(50), nullable=True)
    
    # Metadata
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

# ============================================================================
# ARIA'S DECISION LOG (Audit trail of Aria's actions)
# ============================================================================

class AriaDecision(Base):
    """Log of Aria's autonomous decisions"""
    __tablename__ = "aria_decisions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    
    # Decision context
    decision_type = Column(String(100), nullable=False)  # "route_to_bot", "approve_workflow", "escalate"
    situation = Column(Text, nullable=False)  # What Aria encountered
    
    # Decision made
    decision = Column(Text, nullable=False)  # What Aria decided to do
    reasoning = Column(Text, nullable=True)  # Why (if available from LLM)
    confidence = Column(Float, nullable=True)  # 0-1 confidence score
    
    # Action taken
    action_taken = Column(String(100), nullable=True)  # "delegated_to_sales_bot"
    delegated_to_bot_id = Column(Integer, ForeignKey("managed_bots.id"), nullable=True)
    
    # Outcome
    successful = Column(Boolean, nullable=True)
    user_feedback = Column(String(50), nullable=True)  # "helpful", "not_helpful"
    
    # Context
    conversation_id = Column(String, nullable=True)
    process_id = Column(Integer, ForeignKey("processes.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

# ============================================================================
# BOT DELEGATION RULES
# ============================================================================

class DelegationRule(Base):
    """Rules for how Aria delegates to specialized bots"""
    __tablename__ = "delegation_rules"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    
    # Rule definition
    rule_name = Column(String(255), nullable=False)
    priority = Column(Integer, default=0)  # Higher = higher priority
    is_active = Column(Boolean, default=True)
    
    # Trigger conditions (JSON rules engine)
    conditions = Column(JSON, nullable=False)
    # Example: {"keywords": ["invoice", "billing"], "department": "finance"}
    
    # Action
    target_bot_id = Column(Integer, ForeignKey("managed_bots.id"), nullable=False)
    auto_delegate = Column(Boolean, default=True)  # Or ask user first
    
    # Context to pass
    include_conversation_history = Column(Boolean, default=True)
    include_documents = Column(Boolean, default=False)
    custom_context = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
