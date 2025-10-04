# ARIA System Architecture

## Table of Contents

- [Overview](#overview)
- [High-Level Architecture](#high-level-architecture)
- [Microservices Architecture](#microservices-architecture)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Scalability](#scalability)
- [High Availability](#high-availability)

## Overview

ARIA follows a modern, cloud-native microservices architecture designed for scalability, resilience, and maintainability. The system is built on containerized services that communicate through well-defined APIs and message queues.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Web Browser  │  │  Mobile App  │  │ API Clients  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         Gateway Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │Load Balancer │  │     WAF      │  │     CDN      │             │
│  │  (NGINX)     │  │  (Security)  │  │ (CloudFlare) │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Application Layer                               │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │              Frontend Services                           │        │
│  │  ┌──────────────┐  ┌──────────────┐                    │        │
│  │  │  React App   │  │  Next.js SSR │                    │        │
│  │  └──────────────┘  └──────────────┘                    │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │              Backend Services                            │        │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │        │
│  │  │   API    │ │   Auth   │ │Document  │ │   NLP    │  │        │
│  │  │ Gateway  │ │ Service  │ │ Service  │ │ Service  │  │        │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │        │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐              │        │
│  │  │   SAP    │ │   Comm   │ │ Training │              │        │
│  │  │Connector │ │ Service  │ │ Service  │              │        │
│  │  └──────────┘ └──────────┘ └──────────┘              │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │              AI/ML Services                              │        │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │        │
│  │  │Vision Models │  │  OCR Engine  │  │   Training   │ │        │
│  │  │Donut/LayoutLM│  │PaddleOCR/Tess│  │   Pipeline   │ │        │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │        │
│  └─────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  PostgreSQL  │  │    Redis     │  │    MinIO     │             │
│  │  (Primary)   │  │ (Cache/Queue)│  │  (Storage)   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│  ┌──────────────┐  ┌──────────────┐                               │
│  │Elasticsearch │  │  RabbitMQ    │                               │
│  │  (Search)    │  │  (Broker)    │                               │
│  └──────────────┘  └──────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      External Systems                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  SAP ECC/S4  │  │Email Server  │  │  Slack API   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│  ┌──────────────┐                                                  │
│  │  Teams API   │                                                  │
│  └──────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Microservices Architecture

### Service Catalog

#### 1. API Gateway Service
**Port**: 8000  
**Technology**: FastAPI, NGINX  
**Responsibilities**:
- Central API gateway handling all client requests
- Request routing to appropriate services
- Rate limiting and throttling
- API versioning
- Request/response transformation
- Authentication and authorization checks
- Request logging and monitoring

**Key Features**:
- JWT token validation
- API rate limiting (60/min, 1000/hour)
- Request/response caching
- API documentation (OpenAPI/Swagger)
- WebSocket support for real-time updates

#### 2. Authentication Service
**Port**: 8001  
**Technology**: FastAPI, OAuth2, JWT  
**Responsibilities**:
- User authentication and authorization
- JWT token generation and validation
- Role-based access control (RBAC)
- SSO integration
- Two-factor authentication (2FA)
- Session management
- API key management

**Security Features**:
- Argon2 password hashing
- Brute force protection
- IP-based blocking
- Session revocation
- Audit logging

#### 3. Document Service
**Port**: 8002  
**Technology**: FastAPI, PyTorch, Celery  
**Responsibilities**:
- Document upload and storage
- Document type detection
- Data extraction orchestration
- Validation and verification
- Table and form processing
- Multi-format conversion
- Batch processing

**Processing Pipeline**:
1. Document reception and validation
2. Type detection (Invoice, PO, POD, Remittance)
3. Layout analysis
4. Text extraction (OCR)
5. Structured data extraction
6. Validation
7. SAP mapping
8. Storage and indexing

#### 4. NLP Service
**Port**: 8003  
**Technology**: FastAPI, Transformers  
**Responsibilities**:
- Natural language understanding
- Intent recognition
- Entity extraction
- Response generation
- Conversation management
- Sentiment analysis
- Context tracking

**Capabilities**:
- Multi-turn conversations
- Context-aware responses
- Proactive notifications
- Query understanding
- Command execution

#### 5. SAP Connector Service
**Port**: 8004  
**Technology**: FastAPI, PyRFC  
**Responsibilities**:
- RFC/BAPI connection management
- Transaction posting
- Data validation
- Error handling and rollback
- Connection pooling
- Retry logic

**SAP Modules Supported**:
- FI (Finance)
- MM (Materials Management)
- SD (Sales & Distribution)
- WM (Warehouse Management)

#### 6. Communication Service
**Port**: 8005  
**Technology**: FastAPI, Celery  
**Responsibilities**:
- Multi-channel message delivery
- Email sending (SMTP)
- Slack integration
- Microsoft Teams integration
- SMS notifications
- Template management
- Delivery tracking

**Communication Channels**:
- Email with HTML templates
- Slack with interactive buttons
- Teams adaptive cards
- SMS via Twilio
- Push notifications

#### 7. Training Service
**Port**: 8006  
**Technology**: FastAPI, MLflow, PyTorch  
**Responsibilities**:
- Model training and fine-tuning
- Hyperparameter optimization
- Model versioning
- A/B testing
- Performance monitoring
- Dataset management

**Training Pipeline**:
1. Data collection and labeling
2. Data augmentation
3. Model training
4. Validation and testing
5. Model deployment
6. Performance monitoring

## Data Flow

### Document Processing Flow

```
┌──────────────┐
│   User       │
│  Uploads     │
│  Document    │
└──────┬───────┘
       │
       ↓
┌──────────────────────┐
│   API Gateway        │
│   - Validate request │
│   - Check auth       │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│  Document Service    │
│  - Save to MinIO     │
│  - Create DB record  │
│  - Queue for process │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│  Celery Worker       │
│  - Fetch document    │
│  - Process with AI   │
└──────┬───────────────┘
       │
       ├───────────────────┐
       │                   │
       ↓                   ↓
┌──────────────┐    ┌──────────────┐
│Vision Models │    │  OCR Engine  │
│- Donut       │    │ - PaddleOCR  │
│- LayoutLMv3  │    │ - Tesseract  │
│- TrOCR       │    │ - TrOCR      │
└──────┬───────┘    └──────┬───────┘
       │                   │
       └─────────┬─────────┘
                 │
                 ↓
┌─────────────────────────┐
│  Data Extraction        │
│  - Parse layout         │
│  - Extract fields       │
│  - Validate data        │
└─────────┬───────────────┘
          │
          ↓
┌─────────────────────────┐
│  SAP Connector          │
│  - Map to SAP structure │
│  - Post transaction     │
│  - Validate response    │
└─────────┬───────────────┘
          │
          ↓
┌─────────────────────────┐
│  Communication Service  │
│  - Notify user          │
│  - Send summary         │
└─────────────────────────┘
```

## Technology Stack

### Backend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | FastAPI | 0.104.1 | API development |
| Server | Uvicorn + Gunicorn | latest | ASGI server |
| ML Framework | PyTorch | 2.1.0 | Deep learning |
| Vision Models | Transformers | 4.35.2 | Model inference |
| OCR | PaddleOCR | 2.7.0 | Text extraction |
| Database | PostgreSQL | 14+ | Primary database |
| Cache | Redis | 7.0 | Caching & queuing |
| Storage | MinIO | latest | Object storage |
| Search | Elasticsearch | 8.0 | Full-text search |
| Task Queue | Celery | 5.3.4 | Async tasks |
| Message Broker | RabbitMQ | 3.12 | Message queuing |

### Frontend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | React | 18.2 | UI framework |
| Language | TypeScript | 5.3 | Type safety |
| UI Library | Ant Design | 5.11 | Components |
| Styling | TailwindCSS | 3.3 | Utility CSS |
| State | Redux Toolkit | 1.9.7 | State management |
| Data Fetching | RTK Query | latest | API calls |
| Real-time | Socket.io | 4.5.4 | WebSocket |

### Infrastructure Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Containers | Docker | 24.0+ | Containerization |
| Orchestration | Kubernetes | 1.28+ | Container orchestration |
| Reverse Proxy | NGINX | latest | Load balancing |
| Monitoring | Prometheus | latest | Metrics collection |
| Visualization | Grafana | latest | Dashboards |
| Logging | ELK Stack | 8.0 | Log aggregation |
| Tracing | Jaeger | latest | Distributed tracing |

## Scalability

### Horizontal Scaling

ARIA is designed for horizontal scaling:

1. **Stateless Services**: All application services are stateless
2. **Load Balancing**: NGINX distributes load across instances
3. **Database Replication**: PostgreSQL with streaming replication
4. **Cache Distribution**: Redis Sentinel for HA
5. **Storage Scaling**: MinIO distributed mode

### Scaling Strategy

```yaml
Development:
  API Instances: 1
  Worker Instances: 1
  Database: Single instance
  Cache: Single Redis

Staging:
  API Instances: 2
  Worker Instances: 3
  Database: Primary + Replica
  Cache: Redis Sentinel (3 nodes)

Production:
  API Instances: 5+
  Worker Instances: 10+
  Database: Primary + 2 Replicas
  Cache: Redis Cluster (6 nodes)
  Load Balancer: HA pair
```

### Auto-Scaling Configuration

```yaml
Kubernetes HPA:
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  minReplicas: 3
  maxReplicas: 20
```

## High Availability

### Components HA Setup

#### Application Layer
- **Multiple Instances**: Run 3+ instances of each service
- **Health Checks**: Kubernetes liveness and readiness probes
- **Rolling Updates**: Zero-downtime deployments
- **Circuit Breakers**: Prevent cascade failures

#### Database Layer
- **PostgreSQL**: Streaming replication with automatic failover
- **Redis**: Sentinel for HA with 3+ nodes
- **MinIO**: Distributed mode with erasure coding
- **Elasticsearch**: 3+ node cluster

#### Network Layer
- **Load Balancer**: Active-passive HA pair
- **DNS**: Multiple DNS servers
- **CDN**: Global content delivery network

### Disaster Recovery

#### Backup Strategy
```yaml
Databases:
  PostgreSQL:
    - Full backup: Daily
    - Incremental: Hourly
    - Retention: 30 days
    - Location: Off-site storage
  
  MinIO:
    - Snapshot: Daily
    - Replication: Cross-region
    - Retention: 90 days

Application State:
  - ConfigMaps: Version controlled
  - Secrets: Encrypted backup
  - Persistent Volumes: Daily snapshots
```

#### Recovery Time Objectives (RTO)
- **Database**: < 5 minutes
- **Application**: < 2 minutes
- **Full System**: < 15 minutes

#### Recovery Point Objectives (RPO)
- **Critical Data**: < 1 hour
- **Non-Critical Data**: < 24 hours

### Fault Tolerance

#### Retry Logic
```python
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(TemporaryError)
)
async def call_external_service():
    # Service call
    pass
```

#### Circuit Breaker
```python
circuit_breaker = CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=60,
    expected_exception=ServiceError
)
```

## Security Architecture

### Defense in Depth

1. **Network Layer**: WAF, DDoS protection, VPC isolation
2. **Application Layer**: OAuth2, JWT, rate limiting
3. **Data Layer**: Encryption at rest, TLS in transit
4. **Monitoring**: Intrusion detection, audit logging

### Security Zones

```
┌─────────────────────────────────────┐
│        DMZ (Demilitarized Zone)     │
│  - Load Balancer                    │
│  - WAF                              │
│  - CDN                              │
└────────────────┬────────────────────┘
                 │
┌────────────────┴────────────────────┐
│     Application Zone (Private)      │
│  - API Services                     │
│  - Application Servers              │
└────────────────┬────────────────────┘
                 │
┌────────────────┴────────────────────┐
│      Data Zone (Highly Restricted)  │
│  - Databases                        │
│  - Storage                          │
│  - Secrets Management               │
└─────────────────────────────────────┘
```

## Performance Optimization

### Caching Strategy

1. **Browser Cache**: Static assets (24h)
2. **CDN Cache**: Images and files (7 days)
3. **Redis Cache**: API responses (5-60 minutes)
4. **Database Cache**: Query results (configurable)

### Database Optimization

- Connection pooling (20 connections)
- Prepared statements
- Index optimization
- Query caching
- Read replicas for reporting

### API Optimization

- Response compression (gzip)
- Pagination (default 50 items)
- Field filtering
- Batch endpoints
- GraphQL for complex queries

## Monitoring and Observability

### Key Metrics

```yaml
Application Metrics:
  - Request rate (req/sec)
  - Response time (p50, p95, p99)
  - Error rate (%)
  - Active connections
  - Queue depth

System Metrics:
  - CPU usage (%)
  - Memory usage (%)
  - Disk I/O
  - Network throughput

Business Metrics:
  - Documents processed
  - Processing time
  - Accuracy rate
  - SAP transaction success rate
```

### Alerting

```yaml
Critical Alerts:
  - Service down
  - Database unreachable
  - High error rate (>5%)
  - Response time >5s

Warning Alerts:
  - CPU >80%
  - Memory >85%
  - Disk >90%
  - Queue backlog >1000
```

## Conclusion

ARIA's architecture is designed for enterprise-scale operations with a focus on:
- **Scalability**: Horizontal scaling to handle growing load
- **Reliability**: High availability with fault tolerance
- **Security**: Defense in depth with multiple security layers
- **Performance**: Optimized for low latency and high throughput
- **Maintainability**: Clean separation of concerns and modular design

For implementation details, see:
- [Installation Guide](INSTALLATION.md)
- [Configuration Reference](CONFIGURATION.md)
- [Deployment Guide](DEPLOYMENT.md)
