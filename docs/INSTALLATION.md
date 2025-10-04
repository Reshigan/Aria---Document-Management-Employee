# ARIA Installation Guide

## Table of Contents

- [System Requirements](#system-requirements)
- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
- [Docker Compose Installation](#docker-compose-installation)
- [Kubernetes Installation](#kubernetes-installation)
- [Local Development Setup](#local-development-setup)
- [Post-Installation](#post-installation)
- [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements (Development)

| Component | Requirement |
|-----------|------------|
| CPU | 8 cores (Intel Xeon or AMD EPYC) |
| RAM | 32GB |
| Storage | 500GB SSD |
| GPU | Optional (NVIDIA T4 or better) |
| OS | Ubuntu 22.04 LTS / RHEL 8+ |

### Recommended Requirements (Production)

| Component | Requirement |
|-----------|------------|
| CPU | 16+ cores |
| RAM | 64GB+ |
| Storage | 1TB+ NVMe SSD |
| GPU | NVIDIA V100/A100 (for high throughput) |
| OS | Ubuntu 22.04 LTS |
| Network | 10Gbps |

### High Availability Setup

| Component | Configuration |
|-----------|--------------|
| Application Nodes | 3+ nodes |
| Database | PostgreSQL with streaming replication |
| Cache | Redis Sentinel (3+ nodes) |
| Load Balancer | NGINX/HAProxy HA pair |
| Storage | Distributed MinIO cluster |

## Prerequisites

### Software Requirements

1. **Docker** (24.0+)
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

2. **Docker Compose** (2.21+)
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Python** (3.11+) - For local development
   ```bash
   sudo apt update
   sudo apt install python3.11 python3.11-venv python3.11-dev
   ```

4. **Node.js** (18+) - For frontend development
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

5. **Git**
   ```bash
   sudo apt install git
   ```

### Optional (For GPU Support)

**NVIDIA Docker Runtime**
```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt update
sudo apt install -y nvidia-docker2
sudo systemctl restart docker
```

### SAP Requirements

- SAP NetWeaver RFC SDK (for RFC connections)
- SAP system credentials with appropriate authorizations
- Network connectivity to SAP system

## Installation Methods

ARIA can be installed using three methods:

1. **Docker Compose** - Recommended for development and small deployments
2. **Kubernetes** - Recommended for production
3. **Local Development** - For development and debugging

## Docker Compose Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/Reshigan/Aria---Document-Management-Employee.git
cd Aria---Document-Management-Employee
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration
nano .env
```

**Required Environment Variables:**

```bash
# Application
APP_NAME=ARIA
ENVIRONMENT=production
SECRET_KEY=your-secret-key-min-32-chars
DEBUG=false

# Database
POSTGRES_SERVER=postgres
POSTGRES_USER=aria_user
POSTGRES_PASSWORD=strong_password_here
POSTGRES_DB=aria_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password_here

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin_password

# SAP Configuration
SAP_ASHOST=your_sap_host
SAP_SYSNR=00
SAP_CLIENT=100
SAP_USER=sap_username
SAP_PASSWORD=sap_password
SAP_LANG=EN

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAILS_FROM_EMAIL=noreply@yourdomain.com

# Optional: Slack
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-signing-secret

# Optional: Teams
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
```

### Step 3: Create Required Directories

```bash
mkdir -p data/postgres data/redis data/minio data/elasticsearch logs
```

### Step 4: Deploy with Docker Compose

```bash
# Pull images
docker-compose pull

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 5: Initialize Database

```bash
# Run migrations
docker-compose exec backend python -m alembic upgrade head

# Create initial admin user
docker-compose exec backend python scripts/create_admin.py
```

### Step 6: Verify Installation

```bash
# Check all services are running
docker-compose ps

# Test API
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000
```

### Access Points

- **Web UI**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **API Alternative Docs**: http://localhost:8000/redoc
- **MinIO Console**: http://localhost:9001
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Flower (Celery)**: http://localhost:5555

## Kubernetes Installation

### Step 1: Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Step 2: Prepare Kubernetes Cluster

```bash
# For local testing with minikube
minikube start --cpus=8 --memory=16384 --disk-size=100g

# Or for production, ensure you have access to a cluster
kubectl cluster-info
```

### Step 3: Create Namespace

```bash
kubectl create namespace aria-production
kubectl config set-context --current --namespace=aria-production
```

### Step 4: Create Secrets

```bash
# Database secrets
kubectl create secret generic postgres-secret \
  --from-literal=username=aria_user \
  --from-literal=password=strong_password_here

# SAP secrets
kubectl create secret generic sap-secret \
  --from-literal=username=sap_user \
  --from-literal=password=sap_password

# Email secrets
kubectl create secret generic smtp-secret \
  --from-literal=username=smtp_user \
  --from-literal=password=smtp_password

# Application secret
kubectl create secret generic app-secret \
  --from-literal=secret-key=your-32-char-secret-key
```

### Step 5: Deploy with Helm

```bash
# Add ARIA Helm repository (if available)
helm repo add aria https://charts.aria.example.com
helm repo update

# Or install from local charts
cd deployment/kubernetes/charts

# Install ARIA
helm install aria ./aria \
  --namespace aria-production \
  --values values-production.yaml
```

### Step 6: Verify Deployment

```bash
# Check pods
kubectl get pods

# Check services
kubectl get services

# Check ingress
kubectl get ingress

# View logs
kubectl logs -f deployment/aria-backend
```

### Step 7: Access Application

```bash
# Get load balancer IP
kubectl get service aria-ingress-nginx-controller

# Or use port forwarding for testing
kubectl port-forward service/aria-frontend 3000:80
kubectl port-forward service/aria-backend 8000:8000
```

## Local Development Setup

### Backend Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/Reshigan/Aria---Document-Management-Employee.git
   cd Aria---Document-Management-Employee
   ```

2. **Create Virtual Environment**
   ```bash
   cd backend
   python3.11 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install --upgrade pip
   pip install -r requirements/dev.txt
   ```

4. **Install SAP RFC SDK**
   ```bash
   # Download SAP NW RFC SDK from SAP Support Portal
   # Extract and install
   cd nwrfcsdk
   sudo cp lib/* /usr/local/lib/
   sudo ldconfig
   ```

5. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Start Local Services**
   ```bash
   # Using Docker for databases
   docker-compose -f docker-compose.dev.yml up -d postgres redis minio
   ```

7. **Run Migrations**
   ```bash
   alembic upgrade head
   ```

8. **Start Backend Server**
   ```bash
   uvicorn api.gateway.main:app --reload --host 0.0.0.0 --port 8000
   ```

9. **Start Celery Worker** (in new terminal)
   ```bash
   source venv/bin/activate
   celery -A tasks.celery_app worker --loglevel=info
   ```

### Frontend Setup

1. **Navigate to Frontend**
   ```bash
   cd frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local
   ```

   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_WS_URL=ws://localhost:8000
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/docs

### Download ML Models

```bash
# Run model download script
cd backend
python scripts/download_models.py

# Or manually download
python -c "
from transformers import DonutProcessor, VisionEncoderDecoderModel
DonutProcessor.from_pretrained('naver-clova-ix/donut-base-finetuned-docvqa')
VisionEncoderDecoderModel.from_pretrained('naver-clova-ix/donut-base-finetuned-docvqa')
"
```

## Post-Installation

### Step 1: Create Admin User

```bash
# Using Docker Compose
docker-compose exec backend python scripts/create_admin.py \
  --email admin@example.com \
  --password SecurePassword123! \
  --username admin

# Or locally
python scripts/create_admin.py --email admin@example.com --password SecurePassword123!
```

### Step 2: Configure SAP Connection

1. Log in to ARIA as admin
2. Navigate to Settings > SAP Configuration
3. Add SAP connection details
4. Test connection

### Step 3: Set Up Communication Channels

**Email:**
1. Settings > Communication > Email
2. Configure SMTP settings
3. Test email delivery

**Slack:**
1. Create Slack App at https://api.slack.com/apps
2. Install app to workspace
3. Copy Bot Token to ARIA settings
4. Test connection

**Teams:**
1. Register app in Azure AD
2. Configure webhook URL
3. Add to ARIA settings
4. Test connection

### Step 4: Upload Training Data (Optional)

```bash
# Upload sample documents for training
docker-compose exec backend python scripts/upload_training_data.py \
  --path /data/training_documents
```

### Step 5: Configure Monitoring

**Grafana:**
1. Access http://localhost:3001
2. Login (admin/admin)
3. Import dashboards from `monitoring/grafana/dashboards/`
4. Configure data sources

**Prometheus:**
1. Access http://localhost:9090
2. Verify targets are up
3. Test queries

### Step 6: Set Up Backups

```bash
# Configure automated backups
cp deployment/scripts/backup.sh /etc/cron.daily/aria-backup
chmod +x /etc/cron.daily/aria-backup

# Edit backup configuration
nano /etc/aria/backup.conf
```

## Troubleshooting

### Common Issues

#### Issue: Services won't start

**Solution:**
```bash
# Check logs
docker-compose logs backend

# Verify ports are not in use
sudo netstat -tulpn | grep :8000

# Check disk space
df -h
```

#### Issue: Database connection failed

**Solution:**
```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check connection
docker-compose exec postgres psql -U aria_user -d aria_db

# Reset database
docker-compose down -v
docker-compose up -d postgres
docker-compose exec backend alembic upgrade head
```

#### Issue: Model loading fails

**Solution:**
```bash
# Check disk space
df -h

# Re-download models
docker-compose exec backend python scripts/download_models.py

# Check GPU availability (if using GPU)
docker-compose exec backend nvidia-smi
```

#### Issue: SAP connection fails

**Solution:**
```bash
# Test SAP connectivity
telnet sap_host 3300

# Verify RFC SDK installation
docker-compose exec backend python -c "import pyrfc; print(pyrfc.__version__)"

# Check SAP credentials
docker-compose exec backend python scripts/test_sap_connection.py
```

#### Issue: High memory usage

**Solution:**
```bash
# Check memory usage
docker stats

# Adjust worker count in docker-compose.yml
nano docker-compose.yml
# Reduce CELERY_WORKERS count

# Restart services
docker-compose restart
```

#### Issue: Slow document processing

**Solution:**
```bash
# Enable GPU support
# Edit docker-compose.yml to use nvidia runtime

# Increase worker count
# Edit .env
CELERY_WORKERS=5

# Check queue status
docker-compose exec backend celery -A tasks.celery_app inspect stats
```

### Getting Help

1. **Documentation**: Check [docs/](../docs/) directory
2. **GitHub Issues**: https://github.com/Reshigan/Aria---Document-Management-Employee/issues
3. **Community**: Join our Discord/Slack channel
4. **Support**: support@aria.example.com

### Logs Location

```bash
# Application logs
./logs/app.log

# Docker logs
docker-compose logs -f

# Kubernetes logs
kubectl logs -f deployment/aria-backend

# System logs
/var/log/aria/
```

### Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Database health
docker-compose exec postgres pg_isready

# Redis health
docker-compose exec redis redis-cli ping

# All services health
curl http://localhost:8000/api/v1/health/all
```

## Next Steps

After installation:

1. Read the [Configuration Guide](CONFIGURATION.md)
2. Review [Security Best Practices](SECURITY.md)
3. Set up [Monitoring and Alerting](DEPLOYMENT.md#monitoring)
4. Configure [Backup Strategy](DEPLOYMENT.md#backups)
5. Review [API Documentation](API_DOCUMENTATION.md)

## Uninstallation

### Docker Compose

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: This deletes all data!)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

### Kubernetes

```bash
# Uninstall Helm release
helm uninstall aria --namespace aria-production

# Delete namespace
kubectl delete namespace aria-production

# Delete persistent volumes (if needed)
kubectl delete pv --all
```

### Local Development

```bash
# Remove virtual environment
rm -rf backend/venv

# Remove node modules
rm -rf frontend/node_modules

# Remove data directories
rm -rf data/ logs/
```
