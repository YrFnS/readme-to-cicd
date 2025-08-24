# Environment-Specific Deployment Guides

## Overview

This document provides detailed deployment instructions tailored for specific environments, including development, staging, production, and specialized deployment scenarios.

## Development Environment

### Local Development Setup

Perfect for individual developers working on the Integration & Deployment system.

#### Prerequisites

```bash
# Required software
- Node.js 18+ with npm
- Docker Desktop 4.0+
- Git 2.30+
- VS Code (recommended)

# Optional tools
- Postman (for API testing)
- pgAdmin (for database management)
- Redis CLI (for cache management)
```

#### Quick Start

```bash
# 1. Clone and setup
git clone <repository-url>
cd integration-deployment
npm install

# 2. Start development services
docker-compose -f docker-compose.dev.yml up -d

# 3. Initialize database
npm run db:setup
npm run db:seed

# 4. Start development server
npm run dev

# 5. Verify setup
curl http://localhost:3000/health
```

#### Development Configuration

Create `.env.development`:

```bash
# Application Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database Configuration
DATABASE_URL=postgresql://dev_user:dev_pass@localhost:5432/integration_dev
REDIS_URL=redis://localhost:6379/0

# Security Configuration (Development Only)
JWT_SECRET=dev-jwt-secret-not-for-production
ENCRYPTION_KEY=dev-encryption-key-32-characters

# Feature Flags
ENABLE_DEBUG_ROUTES=true
ENABLE_MOCK_SERVICES=true
ENABLE_HOT_RELOAD=true

# External Services (Mock/Local)
AWS_ENDPOINT=http://localhost:4566  # LocalStack
PROMETHEUS_ENDPOINT=http://localhost:9090
GRAFANA_ENDPOINT=http://localhost:3001
```

#### Development Docker Compose

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: integration_dev
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
      - ./scripts/init-dev-db.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_dev_data:/data

  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"
    environment:
      SERVICES: s3,lambda,sqs,sns,dynamodb
      DEBUG: 1
      DATA_DIR: /tmp/localstack/data
    volumes:
      - localstack_data:/tmp/localstack

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.dev.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_dev_data:/var/lib/grafana

volumes:
  postgres_dev_data:
  redis_dev_data:
  localstack_data:
  grafana_dev_data:
```

#### Development Scripts

```bash
# Package.json scripts for development
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "dev:debug": "nodemon --exec 'node --inspect=0.0.0.0:9229 -r ts-node/register src/index.ts'",
    "dev:watch": "concurrently \"npm run dev\" \"npm run test:watch\"",
    "db:setup": "npm run db:migrate && npm run db:seed",
    "db:migrate": "knex migrate:latest --env development",
    "db:seed": "knex seed:run --env development",
    "db:reset": "npm run db:rollback && npm run db:setup",
    "test:dev": "vitest --config vitest.config.dev.ts",
    "test:watch": "vitest --watch",
    "lint:fix": "eslint --fix src/ tests/",
    "type-check": "tsc --noEmit"
  }
}
```

## Staging Environment

### Staging Deployment on Kubernetes

Staging environment mirrors production but with reduced resources and relaxed security for testing.

#### Staging Cluster Setup

```bash
# Create staging namespace
kubectl create namespace integration-deployment-staging

# Set context
kubectl config set-context --current --namespace=integration-deployment-staging

# Label namespace for monitoring
kubectl label namespace integration-deployment-staging environment=staging
```

#### Staging Configuration

```yaml
# values.staging.yaml
global:
  environment: staging
  imageTag: "staging-latest"
  
replicaCount: 2

resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

database:
  host: postgres-staging.internal
  name: integration_staging
  poolSize: 10

redis:
  host: redis-staging.internal
  maxConnections: 50

monitoring:
  enabled: true
  prometheus:
    scrapeInterval: 30s
  grafana:
    enabled: true

security:
  tls:
    enabled: true
    issuer: letsencrypt-staging
  networkPolicies:
    enabled: true
    
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

ingress:
  enabled: true
  hostname: staging-api.integration-deployment.com
  tls:
    enabled: true
```

#### Staging Deployment Script

```bash
#!/bin/bash
# deploy-staging.sh

set -e

echo "Deploying to staging environment..."

# Build and push staging image
docker build -t integration-deployment:staging-$(git rev-parse --short HEAD) .
docker tag integration-deployment:staging-$(git rev-parse --short HEAD) integration-deployment:staging-latest
docker push integration-deployment:staging-latest

# Deploy database migrations
kubectl apply -f k8s/staging/database-migration-job.yaml
kubectl wait --for=condition=complete job/database-migration --timeout=300s

# Deploy application
helm upgrade --install integration-deployment-staging ./helm-charts/integration-deployment \
  --namespace integration-deployment-staging \
  --values values.staging.yaml \
  --set image.tag=staging-latest \
  --wait --timeout=600s

# Run smoke tests
kubectl apply -f k8s/staging/smoke-tests-job.yaml
kubectl wait --for=condition=complete job/smoke-tests --timeout=300s

# Verify deployment
kubectl get pods -l app=integration-deployment
kubectl get services
kubectl get ingress

echo "Staging deployment completed successfully!"
```

#### Staging Testing Configuration

```yaml
# k8s/staging/smoke-tests-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-tests
spec:
  template:
    spec:
      containers:
      - name: smoke-tests
        image: integration-deployment:staging-latest
        command: ["npm", "run", "test:smoke"]
        env:
        - name: API_BASE_URL
          value: "https://staging-api.integration-deployment.com"
        - name: TEST_TIMEOUT
          value: "30000"
      restartPolicy: Never
  backoffLimit: 3
```

## Production Environment

### Production Deployment with High Availability

Production deployment focuses on reliability, security, and performance.

#### Production Prerequisites

```bash
# Infrastructure requirements
- Kubernetes cluster with 3+ nodes
- Load balancer with SSL termination
- Managed database service (RDS/Cloud SQL)
- Managed cache service (ElastiCache/Memorystore)
- Container registry (ECR/ACR/GCR)
- Monitoring stack (Prometheus/Grafana)
- Log aggregation (ELK/Fluentd)
```

#### Production Configuration

```yaml
# values.production.yaml
global:
  environment: production
  imageTag: "v1.0.0"
  
replicaCount: 5

resources:
  limits:
    cpu: 2000m
    memory: 4Gi
  requests:
    cpu: 1000m
    memory: 2Gi

database:
  host: postgres-prod.rds.amazonaws.com
  name: integration_production
  poolSize: 50
  ssl: true
  connectionTimeout: 5000

redis:
  host: redis-prod.cache.amazonaws.com
  maxConnections: 200
  ssl: true

monitoring:
  enabled: true
  prometheus:
    scrapeInterval: 15s
    retention: 30d
  grafana:
    enabled: true
    persistence: true

security:
  tls:
    enabled: true
    issuer: letsencrypt-prod
  networkPolicies:
    enabled: true
    strict: true
  podSecurityPolicy:
    enabled: true
    
autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 50
  targetCPUUtilizationPercentage: 60
  targetMemoryUtilizationPercentage: 70

ingress:
  enabled: true
  hostname: api.integration-deployment.com
  tls:
    enabled: true
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "1000"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"

backup:
  enabled: true
  schedule: "0 2 * * *"
  retention: 30

disaster_recovery:
  enabled: true
  replication:
    enabled: true
    regions: ["us-west-2", "us-east-1"]
```

#### Production Deployment Pipeline

```yaml
# .github/workflows/production-deploy.yml
name: Production Deployment

on:
  push:
    tags:
      - 'v*'

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run security scan
      run: |
        npm audit --audit-level high
        docker run --rm -v $(pwd):/app securecodewarrior/docker-security-scan /app

  build-and-push:
    needs: security-scan
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Build and push Docker image
      run: |
        docker build -t integration-deployment:${{ github.ref_name }} .
        docker push integration-deployment:${{ github.ref_name }}

  deploy-production:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to production
      run: |
        # Blue-green deployment
        ./scripts/blue-green-deploy.sh ${{ github.ref_name }}
        
        # Run production tests
        ./scripts/production-tests.sh
        
        # Switch traffic
        ./scripts/switch-traffic.sh
```

#### Production Blue-Green Deployment

```bash
#!/bin/bash
# blue-green-deploy.sh

set -e

VERSION=$1
CURRENT_COLOR=$(kubectl get service integration-deployment-active -o jsonpath='{.spec.selector.color}')
NEW_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")

echo "Current active color: $CURRENT_COLOR"
echo "Deploying to color: $NEW_COLOR"

# Deploy new version
helm upgrade --install integration-deployment-$NEW_COLOR ./helm-charts/integration-deployment \
  --namespace integration-deployment-production \
  --values values.production.yaml \
  --set image.tag=$VERSION \
  --set color=$NEW_COLOR \
  --wait --timeout=600s

# Health check
echo "Performing health checks..."
kubectl wait --for=condition=ready pod -l app=integration-deployment,color=$NEW_COLOR --timeout=300s

# Test new deployment
./scripts/health-check.sh integration-deployment-$NEW_COLOR

echo "Blue-green deployment completed. Ready to switch traffic."
```

## Cloud-Specific Deployments

### AWS EKS Production Deployment

```bash
# Create production EKS cluster
eksctl create cluster \
  --name integration-deployment-prod \
  --region us-west-2 \
  --nodegroup-name prod-workers \
  --node-type m5.xlarge \
  --nodes 5 \
  --nodes-min 3 \
  --nodes-max 20 \
  --managed \
  --enable-ssm \
  --asg-access

# Install AWS Load Balancer Controller
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"

# Create IAM service account
eksctl create iamserviceaccount \
  --cluster=integration-deployment-prod \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess \
  --override-existing-serviceaccounts \
  --approve

# Install controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=integration-deployment-prod \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### Azure AKS Production Deployment

```bash
# Create production AKS cluster
az aks create \
  --resource-group integration-deployment-prod-rg \
  --name integration-deployment-prod \
  --node-count 5 \
  --node-vm-size Standard_D4s_v3 \
  --enable-addons monitoring,azure-policy \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 20 \
  --generate-ssh-keys \
  --network-plugin azure \
  --network-policy azure

# Enable Azure Container Insights
az aks enable-addons \
  --resource-group integration-deployment-prod-rg \
  --name integration-deployment-prod \
  --addons monitoring
```

### GCP GKE Production Deployment

```bash
# Create production GKE cluster
gcloud container clusters create integration-deployment-prod \
  --zone us-central1-a \
  --num-nodes 5 \
  --machine-type n1-standard-4 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 20 \
  --enable-autorepair \
  --enable-autoupgrade \
  --enable-network-policy \
  --enable-ip-alias \
  --enable-stackdriver-kubernetes
```

## Specialized Deployment Scenarios

### Edge Computing Deployment

For deployments at edge locations with limited resources.

```yaml
# values.edge.yaml
global:
  environment: edge
  
replicaCount: 1

resources:
  limits:
    cpu: 500m
    memory: 1Gi
  requests:
    cpu: 250m
    memory: 512Mi

database:
  type: sqlite
  path: /data/integration.db

redis:
  enabled: false
  
monitoring:
  enabled: true
  lightweight: true
  
autoscaling:
  enabled: false

persistence:
  enabled: true
  size: 10Gi
```

### Air-Gapped Environment Deployment

For secure environments without internet access.

```bash
# Prepare air-gapped deployment package
./scripts/prepare-airgap-package.sh

# Transfer package to air-gapped environment
# ... secure transfer process ...

# Deploy in air-gapped environment
./scripts/deploy-airgap.sh --package integration-deployment-airgap.tar.gz
```

### Multi-Tenant Deployment

For SaaS deployments supporting multiple tenants.

```yaml
# values.multitenant.yaml
global:
  environment: multitenant
  
multitenancy:
  enabled: true
  isolation: namespace
  
database:
  multitenancy:
    strategy: schema-per-tenant
    
security:
  tenantIsolation:
    enabled: true
    networkPolicies: true
    
monitoring:
  perTenant: true
```

## Environment Promotion Pipeline

### Automated Promotion Workflow

```yaml
# .github/workflows/promotion-pipeline.yml
name: Environment Promotion

on:
  workflow_dispatch:
    inputs:
      source_environment:
        description: 'Source environment'
        required: true
        type: choice
        options:
        - development
        - staging
      target_environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
        - staging
        - production

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
    - name: Promote to target environment
      run: |
        ./scripts/promote-environment.sh \
          --source ${{ github.event.inputs.source_environment }} \
          --target ${{ github.event.inputs.target_environment }}
```

### Environment Validation

```bash
#!/bin/bash
# validate-environment.sh

ENVIRONMENT=$1

echo "Validating $ENVIRONMENT environment..."

# Check cluster connectivity
kubectl cluster-info --context=$ENVIRONMENT

# Validate deployments
kubectl get deployments -n integration-deployment-$ENVIRONMENT

# Run health checks
./scripts/health-check.sh $ENVIRONMENT

# Validate monitoring
./scripts/validate-monitoring.sh $ENVIRONMENT

# Check security policies
./scripts/validate-security.sh $ENVIRONMENT

echo "$ENVIRONMENT environment validation completed!"
```

This comprehensive guide provides detailed instructions for deploying the Integration & Deployment system across various environments, ensuring optimal configuration for each specific use case.