# Integration & Deployment System API Documentation

## Overview

The Integration & Deployment System provides a comprehensive RESTful API for managing orchestration, deployment, configuration, and monitoring operations. This documentation includes interactive examples and code samples for all major endpoints.

## Base URL and Authentication

### Base URL
```
Production: https://api.integration-deployment.com/v1
Staging: https://staging-api.integration-deployment.com/v1
Development: http://localhost:3000/v1
```

### Authentication

The API supports multiple authentication methods:

#### 1. JWT Bearer Token
```bash
curl -H "Authorization: Bearer <jwt-token>" \
  https://api.integration-deployment.com/v1/status
```

#### 2. API Key
```bash
curl -H "X-API-Key: <api-key>" \
  https://api.integration-deployment.com/v1/status
```

#### 3. OAuth 2.0
```bash
# Get access token
curl -X POST https://api.integration-deployment.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret"
  }'

# Use access token
curl -H "Authorization: Bearer <access-token>" \
  https://api.integration-deployment.com/v1/status
```

## Core API Endpoints

### System Status and Health

#### GET /health
Returns system health status.

**Request:**
```bash
curl -X GET https://api.integration-deployment.com/v1/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "components": {
    "orchestration_engine": {
      "status": "healthy",
      "response_time": "12ms"
    },
    "database": {
      "status": "healthy",
      "response_time": "5ms"
    },
    "cache": {
      "status": "healthy",
      "response_time": "2ms"
    },
    "message_queue": {
      "status": "healthy",
      "response_time": "8ms"
    }
  }
}
```

#### GET /status
Returns detailed system status and metrics.

**Request:**
```bash
curl -X GET https://api.integration-deployment.com/v1/status \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "system": {
    "uptime": "72h 15m 30s",
    "version": "1.0.0",
    "environment": "production"
  },
  "metrics": {
    "requests_per_second": 1250,
    "average_response_time": "45ms",
    "error_rate": "0.02%",
    "active_connections": 342
  },
  "components": {
    "orchestration_engine": {
      "active_workflows": 15,
      "queued_requests": 3,
      "processed_today": 12450
    },
    "deployment_manager": {
      "active_deployments": 2,
      "successful_deployments_today": 8,
      "failed_deployments_today": 0
    }
  }
}
```

### Orchestration Engine API

#### POST /orchestration/workflows
Create and execute a new workflow.

**Request:**
```bash
curl -X POST https://api.integration-deployment.com/v1/orchestration/workflows \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "deployment",
    "name": "Deploy Application v2.1.0",
    "priority": "high",
    "components": [
      {
        "id": "readme-parser",
        "action": "update",
        "version": "2.1.0"
      },
      {
        "id": "yaml-generator",
        "action": "update",
        "version": "2.1.0"
      }
    ],
    "environment": "production",
    "strategy": "blue-green",
    "rollback_on_failure": true
  }'
```

**Response:**
```json
{
  "workflow_id": "wf-123e4567-e89b-12d3-a456-426614174000",
  "status": "initiated",
  "created_at": "2024-01-15T10:30:00Z",
  "estimated_duration": "15m",
  "steps": [
    {
      "id": "step-1",
      "name": "Validate Components",
      "status": "pending",
      "estimated_duration": "2m"
    },
    {
      "id": "step-2",
      "name": "Deploy Components",
      "status": "pending",
      "estimated_duration": "10m"
    },
    {
      "id": "step-3",
      "name": "Verify Deployment",
      "status": "pending",
      "estimated_duration": "3m"
    }
  ]
}
```

#### GET /orchestration/workflows/{workflow_id}
Get workflow status and details.

**Request:**
```bash
curl -X GET https://api.integration-deployment.com/v1/orchestration/workflows/wf-123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "workflow_id": "wf-123e4567-e89b-12d3-a456-426614174000",
  "status": "running",
  "progress": 60,
  "created_at": "2024-01-15T10:30:00Z",
  "started_at": "2024-01-15T10:30:15Z",
  "estimated_completion": "2024-01-15T10:42:00Z",
  "current_step": {
    "id": "step-2",
    "name": "Deploy Components",
    "status": "running",
    "progress": 75,
    "logs": [
      {
        "timestamp": "2024-01-15T10:35:00Z",
        "level": "info",
        "message": "Deploying readme-parser component"
      },
      {
        "timestamp": "2024-01-15T10:36:30Z",
        "level": "info",
        "message": "readme-parser deployment successful"
      }
    ]
  },
  "completed_steps": [
    {
      "id": "step-1",
      "name": "Validate Components",
      "status": "completed",
      "duration": "1m 45s"
    }
  ]
}
```

#### POST /orchestration/workflows/{workflow_id}/cancel
Cancel a running workflow.

**Request:**
```bash
curl -X POST https://api.integration-deployment.com/v1/orchestration/workflows/wf-123e4567-e89b-12d3-a456-426614174000/cancel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Emergency maintenance required",
    "force": false
  }'
```

### Component Management API

#### GET /components
List all registered components.

**Request:**
```bash
curl -X GET https://api.integration-deployment.com/v1/components \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "components": [
    {
      "id": "readme-parser",
      "name": "README Parser Service",
      "version": "2.0.1",
      "status": "running",
      "health": "healthy",
      "instances": 3,
      "last_updated": "2024-01-15T09:15:00Z",
      "metrics": {
        "cpu_usage": "45%",
        "memory_usage": "62%",
        "requests_per_minute": 150
      }
    },
    {
      "id": "framework-detection",
      "name": "Framework Detection Service",
      "version": "1.8.2",
      "status": "running",
      "health": "healthy",
      "instances": 2,
      "last_updated": "2024-01-14T16:30:00Z",
      "metrics": {
        "cpu_usage": "32%",
        "memory_usage": "48%",
        "requests_per_minute": 89
      }
    }
  ],
  "total": 6,
  "healthy": 6,
  "unhealthy": 0
}
```

#### POST /components/{component_id}/deploy
Deploy or update a component.

**Request:**
```bash
curl -X POST https://api.integration-deployment.com/v1/components/readme-parser/deploy \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "2.1.0",
    "environment": "production",
    "strategy": "rolling",
    "configuration": {
      "replicas": 3,
      "resources": {
        "cpu": "500m",
        "memory": "1Gi"
      },
      "environment_variables": {
        "LOG_LEVEL": "info",
        "CACHE_TTL": "3600"
      }
    },
    "health_check": {
      "path": "/health",
      "interval": "30s",
      "timeout": "5s"
    }
  }'
```

**Response:**
```json
{
  "deployment_id": "dep-987fcdeb-51a2-4b3c-d789-123456789abc",
  "component_id": "readme-parser",
  "status": "initiated",
  "strategy": "rolling",
  "created_at": "2024-01-15T10:45:00Z",
  "estimated_duration": "8m",
  "rollback_available": true
}
```

#### POST /components/{component_id}/scale
Scale a component up or down.

**Request:**
```bash
curl -X POST https://api.integration-deployment.com/v1/components/readme-parser/scale \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "replicas": 5,
    "reason": "Increased load expected"
  }'
```

### Deployment Management API

#### GET /deployments
List all deployments.

**Request:**
```bash
curl -X GET https://api.integration-deployment.com/v1/deployments?status=running&limit=10 \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "deployments": [
    {
      "id": "dep-987fcdeb-51a2-4b3c-d789-123456789abc",
      "name": "Production Deployment v2.1.0",
      "status": "running",
      "strategy": "blue-green",
      "environment": "production",
      "progress": 75,
      "created_at": "2024-01-15T10:00:00Z",
      "started_at": "2024-01-15T10:02:00Z",
      "estimated_completion": "2024-01-15T10:20:00Z",
      "components": [
        {
          "id": "readme-parser",
          "status": "completed",
          "version": "2.1.0"
        },
        {
          "id": "yaml-generator",
          "status": "running",
          "version": "2.1.0"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "has_next": true
  }
}
```

#### POST /deployments/{deployment_id}/rollback
Rollback a deployment to previous version.

**Request:**
```bash
curl -X POST https://api.integration-deployment.com/v1/deployments/dep-987fcdeb-51a2-4b3c-d789-123456789abc/rollback \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "target_version": "2.0.1",
    "reason": "Critical bug found in v2.1.0",
    "force": false
  }'
```

### Configuration Management API

#### GET /configuration
Get system configuration.

**Request:**
```bash
curl -X GET https://api.integration-deployment.com/v1/configuration?environment=production \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "environment": "production",
  "configuration": {
    "system": {
      "log_level": "info",
      "request_timeout": "30s",
      "max_concurrent_workflows": 50
    },
    "components": {
      "readme-parser": {
        "cache_ttl": 3600,
        "max_file_size": "10MB",
        "supported_formats": ["md", "rst", "txt"]
      },
      "yaml-generator": {
        "template_cache_size": 100,
        "output_format": "yaml",
        "validation_enabled": true
      }
    },
    "security": {
      "jwt_expiration": "24h",
      "rate_limit": "1000/hour",
      "cors_enabled": true
    }
  },
  "last_updated": "2024-01-15T08:00:00Z"
}
```

#### PUT /configuration
Update system configuration.

**Request:**
```bash
curl -X PUT https://api.integration-deployment.com/v1/configuration \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "production",
    "configuration": {
      "system": {
        "log_level": "warn",
        "max_concurrent_workflows": 75
      },
      "components": {
        "readme-parser": {
          "cache_ttl": 7200
        }
      }
    },
    "reason": "Performance optimization"
  }'
```

### Monitoring and Metrics API

#### GET /metrics
Get system metrics.

**Request:**
```bash
curl -X GET https://api.integration-deployment.com/v1/metrics?timerange=1h&components=readme-parser,yaml-generator \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "timerange": {
    "start": "2024-01-15T09:30:00Z",
    "end": "2024-01-15T10:30:00Z",
    "duration": "1h"
  },
  "system_metrics": {
    "requests_total": 45230,
    "requests_per_second": 12.56,
    "average_response_time": "42ms",
    "error_rate": "0.03%",
    "cpu_usage": "68%",
    "memory_usage": "72%"
  },
  "component_metrics": {
    "readme-parser": {
      "requests_total": 18920,
      "average_response_time": "35ms",
      "error_rate": "0.01%",
      "cpu_usage": "45%",
      "memory_usage": "62%"
    },
    "yaml-generator": {
      "requests_total": 12450,
      "average_response_time": "58ms",
      "error_rate": "0.05%",
      "cpu_usage": "52%",
      "memory_usage": "48%"
    }
  }
}
```

#### GET /logs
Query system logs.

**Request:**
```bash
curl -X GET "https://api.integration-deployment.com/v1/logs?level=error&component=readme-parser&since=1h&limit=50" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2024-01-15T10:25:30Z",
      "level": "error",
      "component": "readme-parser",
      "message": "Failed to parse README file: invalid markdown syntax",
      "metadata": {
        "file_path": "/tmp/readme.md",
        "error_code": "PARSE_ERROR",
        "request_id": "req-123456"
      }
    }
  ],
  "total": 3,
  "has_more": false
}
```

## Interactive Examples

### JavaScript/Node.js SDK

```javascript
// Install: npm install @integration-deployment/sdk

const { IntegrationDeploymentClient } = require('@integration-deployment/sdk');

const client = new IntegrationDeploymentClient({
  baseUrl: 'https://api.integration-deployment.com/v1',
  apiKey: 'your-api-key'
});

// Create and execute workflow
async function deployApplication() {
  try {
    const workflow = await client.orchestration.createWorkflow({
      type: 'deployment',
      name: 'Deploy Application v2.1.0',
      components: [
        { id: 'readme-parser', action: 'update', version: '2.1.0' },
        { id: 'yaml-generator', action: 'update', version: '2.1.0' }
      ],
      environment: 'production',
      strategy: 'blue-green'
    });

    console.log('Workflow created:', workflow.workflow_id);

    // Monitor workflow progress
    const monitor = client.orchestration.monitorWorkflow(workflow.workflow_id);
    
    monitor.on('progress', (progress) => {
      console.log(`Progress: ${progress.percentage}%`);
    });

    monitor.on('completed', (result) => {
      console.log('Deployment completed successfully!');
    });

    monitor.on('failed', (error) => {
      console.error('Deployment failed:', error);
    });

  } catch (error) {
    console.error('Error creating workflow:', error);
  }
}

// Get component status
async function getComponentStatus() {
  const components = await client.components.list();
  
  components.forEach(component => {
    console.log(`${component.name}: ${component.status} (${component.health})`);
  });
}

// Scale component
async function scaleComponent(componentId, replicas) {
  const result = await client.components.scale(componentId, {
    replicas: replicas,
    reason: 'Load balancing adjustment'
  });
  
  console.log('Scaling initiated:', result);
}
```

### Python SDK

```python
# Install: pip install integration-deployment-sdk

from integration_deployment import IntegrationDeploymentClient
import asyncio

client = IntegrationDeploymentClient(
    base_url='https://api.integration-deployment.com/v1',
    api_key='your-api-key'
)

async def deploy_application():
    """Create and monitor a deployment workflow"""
    try:
        # Create workflow
        workflow = await client.orchestration.create_workflow({
            'type': 'deployment',
            'name': 'Deploy Application v2.1.0',
            'components': [
                {'id': 'readme-parser', 'action': 'update', 'version': '2.1.0'},
                {'id': 'yaml-generator', 'action': 'update', 'version': '2.1.0'}
            ],
            'environment': 'production',
            'strategy': 'blue-green'
        })

        print(f"Workflow created: {workflow['workflow_id']}")

        # Monitor progress
        async for status in client.orchestration.monitor_workflow(workflow['workflow_id']):
            print(f"Progress: {status['progress']}%")
            
            if status['status'] == 'completed':
                print("Deployment completed successfully!")
                break
            elif status['status'] == 'failed':
                print(f"Deployment failed: {status['error']}")
                break

    except Exception as error:
        print(f"Error creating workflow: {error}")

async def get_metrics():
    """Retrieve system metrics"""
    metrics = await client.metrics.get_metrics(
        timerange='1h',
        components=['readme-parser', 'yaml-generator']
    )
    
    print(f"System RPS: {metrics['system_metrics']['requests_per_second']}")
    print(f"Average Response Time: {metrics['system_metrics']['average_response_time']}")

# Run examples
asyncio.run(deploy_application())
asyncio.run(get_metrics())
```

### cURL Examples Collection

```bash
#!/bin/bash
# integration-deployment-api-examples.sh

API_BASE="https://api.integration-deployment.com/v1"
TOKEN="your-jwt-token"

# Function to make authenticated requests
api_request() {
    curl -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         "$@"
}

# Health check
echo "=== Health Check ==="
api_request -X GET "$API_BASE/health"

# System status
echo -e "\n=== System Status ==="
api_request -X GET "$API_BASE/status"

# List components
echo -e "\n=== Components ==="
api_request -X GET "$API_BASE/components"

# Create deployment workflow
echo -e "\n=== Create Workflow ==="
api_request -X POST "$API_BASE/orchestration/workflows" \
  -d '{
    "type": "deployment",
    "name": "API Test Deployment",
    "components": [
      {"id": "readme-parser", "action": "update", "version": "2.1.0"}
    ],
    "environment": "staging",
    "strategy": "rolling"
  }'

# Get metrics
echo -e "\n=== Metrics ==="
api_request -X GET "$API_BASE/metrics?timerange=1h"

# Query logs
echo -e "\n=== Recent Logs ==="
api_request -X GET "$API_BASE/logs?level=info&limit=10"
```

## WebSocket API

For real-time updates and monitoring.

### Connection

```javascript
const ws = new WebSocket('wss://api.integration-deployment.com/v1/ws');

ws.onopen = function() {
    // Authenticate
    ws.send(JSON.stringify({
        type: 'auth',
        token: 'your-jwt-token'
    }));
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    
    switch(message.type) {
        case 'workflow_update':
            console.log('Workflow update:', message.data);
            break;
        case 'component_status':
            console.log('Component status:', message.data);
            break;
        case 'system_alert':
            console.log('System alert:', message.data);
            break;
    }
};

// Subscribe to workflow updates
ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'workflows',
    workflow_id: 'wf-123e4567-e89b-12d3-a456-426614174000'
}));

// Subscribe to component status updates
ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'components',
    component_id: 'readme-parser'
}));
```

## Error Handling

### Standard Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "components[0].version",
      "reason": "Version format is invalid"
    },
    "request_id": "req-123456789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid authentication |
| `AUTHORIZATION_DENIED` | 403 | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Default Limit**: 1000 requests per hour per API key
- **Burst Limit**: 100 requests per minute
- **Headers**: Rate limit information is included in response headers

```bash
# Rate limit headers in response
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1642248000
```

## API Versioning

The API uses URL-based versioning:

- **Current Version**: v1
- **Supported Versions**: v1
- **Deprecation Policy**: 12 months notice before version retirement

This comprehensive API documentation provides all the information needed to integrate with the Integration & Deployment System, including interactive examples and code samples for common use cases.