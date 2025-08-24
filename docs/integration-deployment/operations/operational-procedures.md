# Operational Procedures and Troubleshooting Guide

## Overview

This document provides comprehensive operational procedures, troubleshooting guides, and best practices for maintaining the Integration & Deployment system in production environments.

## Daily Operations

### Morning Health Check Routine

**Frequency**: Daily at 8:00 AM
**Duration**: 15-20 minutes
**Responsible**: Operations Team

#### Checklist

```bash
#!/bin/bash
# daily-health-check.sh

echo "=== Daily Health Check - $(date) ==="

# 1. System Health
echo "1. Checking system health..."
curl -s https://api.integration-deployment.com/v1/health | jq '.'

# 2. Component Status
echo "2. Checking component status..."
kubectl get pods -n integration-deployment --no-headers | \
  awk '{print $1, $3}' | grep -v Running && echo "⚠️  Issues found" || echo "✅ All pods running"

# 3. Resource Usage
echo "3. Checking resource usage..."
kubectl top nodes
kubectl top pods -n integration-deployment --sort-by=cpu

# 4. Recent Errors
echo "4. Checking recent errors..."
kubectl logs -n integration-deployment -l app=integration-deployment --since=24h | \
  grep -i error | tail -10

# 5. Database Health
echo "5. Checking database health..."
kubectl exec -n integration-deployment postgres-0 -- \
  psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 6. Cache Health
echo "6. Checking cache health..."
kubectl exec -n integration-deployment redis-0 -- redis-cli ping

# 7. Disk Usage
echo "7. Checking disk usage..."
kubectl exec -n integration-deployment postgres-0 -- df -h

# 8. Active Workflows
echo "8. Checking active workflows..."
curl -s -H "Authorization: Bearer $API_TOKEN" \
  https://api.integration-deployment.com/v1/orchestration/workflows?status=running | \
  jq '.workflows | length'

echo "=== Health Check Complete ==="
```

### Weekly Maintenance Tasks

**Frequency**: Weekly on Sundays at 2:00 AM
**Duration**: 2-3 hours
**Responsible**: Operations Team

#### Maintenance Checklist

1. **Database Maintenance**
   ```bash
   # Vacuum and analyze database
   kubectl exec -n integration-deployment postgres-0 -- \
     psql -U postgres -d integration_db -c "VACUUM ANALYZE;"
   
   # Check database size and growth
   kubectl exec -n integration-deployment postgres-0 -- \
     psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('integration_db'));"
   ```

2. **Log Rotation and Cleanup**
   ```bash
   # Clean old logs (older than 30 days)
   kubectl delete pods -n integration-deployment \
     -l app=log-cleaner --field-selector=status.phase=Succeeded
   
   # Rotate application logs
   kubectl apply -f k8s/maintenance/log-rotation-job.yaml
   ```

3. **Certificate Renewal Check**
   ```bash
   # Check certificate expiration
   kubectl get certificates -n integration-deployment
   
   # Verify TLS certificates
   echo | openssl s_client -servername api.integration-deployment.com \
     -connect api.integration-deployment.com:443 2>/dev/null | \
     openssl x509 -noout -dates
   ```

4. **Backup Verification**
   ```bash
   # Verify recent backups
   kubectl get cronjobs -n integration-deployment
   kubectl get jobs -n integration-deployment | grep backup
   
   # Test backup restoration (in staging)
   ./scripts/test-backup-restore.sh staging
   ```

## Incident Response Procedures

### Severity Levels

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| P0 - Critical | System down, data loss | 15 minutes | Immediate |
| P1 - High | Major functionality impaired | 1 hour | 2 hours |
| P2 - Medium | Minor functionality impaired | 4 hours | 8 hours |
| P3 - Low | Cosmetic issues, enhancement requests | 24 hours | 48 hours |

### P0 - Critical Incident Response

#### Immediate Actions (0-15 minutes)

1. **Acknowledge the Incident**
   ```bash
   # Update incident status
   curl -X POST https://status.integration-deployment.com/api/incidents \
     -H "Authorization: Bearer $STATUS_TOKEN" \
     -d '{
       "name": "System Outage",
       "status": "investigating",
       "impact": "major"
     }'
   ```

2. **Assess System Status**
   ```bash
   # Quick system assessment
   ./scripts/emergency-assessment.sh
   
   # Check all critical components
   kubectl get pods -n integration-deployment -o wide
   kubectl get services -n integration-deployment
   kubectl get ingress -n integration-deployment
   ```

3. **Activate War Room**
   ```bash
   # Notify on-call team
   ./scripts/notify-oncall.sh "P0 Incident: System Outage"
   
   # Create incident channel
   slack-cli create-channel "incident-$(date +%Y%m%d-%H%M)"
   ```

#### Investigation Phase (15-60 minutes)

1. **Gather Information**
   ```bash
   # Collect system logs
   kubectl logs -n integration-deployment -l app=integration-deployment \
     --since=1h > incident-logs-$(date +%Y%m%d-%H%M).log
   
   # Check recent deployments
   kubectl rollout history deployment/integration-deployment -n integration-deployment
   
   # Review monitoring dashboards
   echo "Check Grafana: https://grafana.integration-deployment.com"
   echo "Check Prometheus: https://prometheus.integration-deployment.com"
   ```

2. **Identify Root Cause**
   ```bash
   # Common root cause checks
   ./scripts/root-cause-analysis.sh
   
   # Check resource constraints
   kubectl describe nodes | grep -A 5 "Allocated resources"
   
   # Check network connectivity
   kubectl exec -n integration-deployment debug-pod -- \
     nslookup postgres.integration-deployment.svc.cluster.local
   ```

#### Resolution Phase

1. **Apply Fix**
   ```bash
   # Rollback if recent deployment caused issue
   kubectl rollout undo deployment/integration-deployment -n integration-deployment
   
   # Scale up if resource issue
   kubectl scale deployment/integration-deployment --replicas=10 -n integration-deployment
   
   # Restart services if needed
   kubectl rollout restart deployment/integration-deployment -n integration-deployment
   ```

2. **Verify Resolution**
   ```bash
   # Test system functionality
   ./scripts/smoke-tests.sh production
   
   # Monitor recovery
   watch kubectl get pods -n integration-deployment
   ```

### Common Troubleshooting Scenarios

#### Scenario 1: High Response Times

**Symptoms:**
- API response times > 5 seconds
- User complaints about slow performance
- High CPU/memory usage

**Investigation Steps:**
```bash
# 1. Check current performance metrics
curl -s -H "Authorization: Bearer $API_TOKEN" \
  https://api.integration-deployment.com/v1/metrics?timerange=1h | \
  jq '.system_metrics.average_response_time'

# 2. Identify bottlenecks
kubectl top pods -n integration-deployment --sort-by=cpu
kubectl top pods -n integration-deployment --sort-by=memory

# 3. Check database performance
kubectl exec -n integration-deployment postgres-0 -- \
  psql -U postgres -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# 4. Analyze slow queries
kubectl logs -n integration-deployment -l app=integration-deployment | \
  grep "slow query" | tail -20
```

**Resolution Actions:**
```bash
# Scale up application
kubectl scale deployment/integration-deployment --replicas=8 -n integration-deployment

# Optimize database
kubectl exec -n integration-deployment postgres-0 -- \
  psql -U postgres -d integration_db -c "REINDEX DATABASE integration_db;"

# Clear cache if needed
kubectl exec -n integration-deployment redis-0 -- redis-cli FLUSHDB

# Update resource limits
kubectl patch deployment integration-deployment -n integration-deployment -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"app","resources":{"limits":{"cpu":"2","memory":"4Gi"}}}]}}}}'
```

#### Scenario 2: Database Connection Issues

**Symptoms:**
- Connection timeout errors
- "Too many connections" errors
- Database unavailable errors

**Investigation Steps:**
```bash
# 1. Check database status
kubectl get pods -n integration-deployment -l app=postgres
kubectl logs -n integration-deployment postgres-0 --tail=50

# 2. Check connection count
kubectl exec -n integration-deployment postgres-0 -- \
  psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Check connection pool status
kubectl logs -n integration-deployment -l app=integration-deployment | \
  grep "connection pool" | tail -10

# 4. Test connectivity
kubectl run -it --rm debug --image=postgres:14 --restart=Never -- \
  psql -h postgres.integration-deployment.svc.cluster.local -U postgres
```

**Resolution Actions:**
```bash
# Restart database if needed
kubectl rollout restart statefulset/postgres -n integration-deployment

# Increase connection limits
kubectl patch configmap postgres-config -n integration-deployment --patch \
  '{"data":{"postgresql.conf":"max_connections = 200\nshared_buffers = 256MB"}}'

# Scale database (if using read replicas)
kubectl scale statefulset/postgres-replica --replicas=2 -n integration-deployment

# Optimize connection pooling
kubectl patch deployment integration-deployment -n integration-deployment --patch \
  '{"spec":{"template":{"spec":{"containers":[{"name":"app","env":[{"name":"DB_POOL_SIZE","value":"20"}]}]}}}}'
```

#### Scenario 3: Memory Leaks

**Symptoms:**
- Gradually increasing memory usage
- Out of memory errors
- Pod restarts due to memory limits

**Investigation Steps:**
```bash
# 1. Monitor memory usage over time
kubectl top pods -n integration-deployment --sort-by=memory

# 2. Check memory limits and requests
kubectl describe pods -n integration-deployment -l app=integration-deployment | \
  grep -A 10 "Limits\|Requests"

# 3. Analyze heap dumps (if available)
kubectl exec -n integration-deployment integration-deployment-pod -- \
  node --expose-gc --inspect=0.0.0.0:9229 app.js

# 4. Check for memory leaks in logs
kubectl logs -n integration-deployment -l app=integration-deployment | \
  grep -i "memory\|heap\|gc"
```

**Resolution Actions:**
```bash
# Restart affected pods
kubectl delete pods -n integration-deployment -l app=integration-deployment

# Increase memory limits
kubectl patch deployment integration-deployment -n integration-deployment -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"app","resources":{"limits":{"memory":"8Gi"}}}]}}}}'

# Enable garbage collection monitoring
kubectl patch deployment integration-deployment -n integration-deployment --patch \
  '{"spec":{"template":{"spec":{"containers":[{"name":"app","env":[{"name":"NODE_OPTIONS","value":"--max-old-space-size=4096"}]}]}}}}'
```

## Monitoring and Alerting

### Key Metrics to Monitor

#### System Metrics
```yaml
# prometheus-rules.yaml
groups:
- name: integration-deployment.rules
  rules:
  - alert: HighResponseTime
    expr: avg(http_request_duration_seconds) > 5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High response time detected"
      
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      
  - alert: DatabaseConnectionsHigh
    expr: pg_stat_database_numbackends > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Database connections approaching limit"
```

#### Application Metrics
```bash
# Custom metrics collection
curl -s https://api.integration-deployment.com/v1/metrics | jq '{
  "active_workflows": .system_metrics.active_workflows,
  "queue_depth": .system_metrics.queue_depth,
  "error_rate": .system_metrics.error_rate,
  "response_time": .system_metrics.average_response_time
}'
```

### Alert Escalation Matrix

| Alert | Level 1 (0-15 min) | Level 2 (15-60 min) | Level 3 (60+ min) |
|-------|-------------------|---------------------|-------------------|
| System Down | On-call Engineer | Engineering Manager | VP Engineering |
| High Error Rate | On-call Engineer | Team Lead | Engineering Manager |
| Performance Degradation | On-call Engineer | Team Lead | - |
| Resource Exhaustion | On-call Engineer | Platform Team | Engineering Manager |

## Backup and Recovery Procedures

### Database Backup

#### Automated Daily Backup
```yaml
# k8s/backup/database-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:14
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h postgres.integration-deployment.svc.cluster.local \
                -U postgres -d integration_db | \
                gzip > /backup/backup-$(date +%Y%m%d-%H%M%S).sql.gz
              
              # Upload to S3
              aws s3 cp /backup/backup-$(date +%Y%m%d-%H%M%S).sql.gz \
                s3://integration-deployment-backups/database/
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            emptyDir: {}
          restartPolicy: OnFailure
```

#### Manual Backup
```bash
# Create immediate backup
kubectl exec -n integration-deployment postgres-0 -- \
  pg_dump -U postgres -d integration_db | \
  gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Upload to backup storage
aws s3 cp backup-$(date +%Y%m%d-%H%M%S).sql.gz \
  s3://integration-deployment-backups/manual/
```

### Disaster Recovery

#### Recovery Time Objectives (RTO)
- **Database Recovery**: 30 minutes
- **Application Recovery**: 15 minutes
- **Full System Recovery**: 1 hour

#### Recovery Point Objectives (RPO)
- **Database**: 1 hour (continuous replication)
- **Configuration**: 24 hours (daily backup)
- **Logs**: 5 minutes (real-time shipping)

#### Disaster Recovery Procedure
```bash
#!/bin/bash
# disaster-recovery.sh

echo "=== Disaster Recovery Procedure ==="

# 1. Assess damage
echo "1. Assessing system status..."
kubectl get nodes
kubectl get pods --all-namespaces

# 2. Restore database
echo "2. Restoring database..."
LATEST_BACKUP=$(aws s3 ls s3://integration-deployment-backups/database/ | \
  sort | tail -n 1 | awk '{print $4}')

aws s3 cp s3://integration-deployment-backups/database/$LATEST_BACKUP /tmp/
gunzip /tmp/$LATEST_BACKUP

kubectl exec -n integration-deployment postgres-0 -- \
  psql -U postgres -d integration_db < /tmp/${LATEST_BACKUP%.gz}

# 3. Restore application
echo "3. Restoring application..."
kubectl apply -f k8s/production/

# 4. Verify recovery
echo "4. Verifying recovery..."
./scripts/smoke-tests.sh production

echo "=== Recovery Complete ==="
```

## Performance Optimization

### Database Optimization

#### Query Performance
```sql
-- Identify slow queries
SELECT query, calls, total_time, mean_time, stddev_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;

-- Analyze table statistics
ANALYZE;
```

#### Connection Pool Tuning
```javascript
// Database connection pool configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Pool configuration
  min: 5,                    // Minimum connections
  max: 20,                   // Maximum connections
  acquireTimeoutMillis: 5000, // Timeout for acquiring connection
  idleTimeoutMillis: 30000,   // Idle connection timeout
  
  // Connection validation
  testOnBorrow: true,
  validationQuery: 'SELECT 1'
});
```

### Application Performance

#### Memory Management
```javascript
// Memory monitoring and optimization
const memoryUsage = process.memoryUsage();
console.log({
  rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
  heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
  heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
  external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
});

// Garbage collection optimization
if (global.gc) {
  setInterval(() => {
    global.gc();
  }, 60000); // Force GC every minute
}
```

#### Caching Strategy
```javascript
// Redis caching implementation
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('Redis server connection refused');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

// Cache with TTL
async function cacheSet(key, value, ttl = 3600) {
  await client.setex(key, ttl, JSON.stringify(value));
}

async function cacheGet(key) {
  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
}
```

## Security Procedures

### Security Incident Response

#### Security Alert Levels
- **Level 1**: Potential security issue
- **Level 2**: Confirmed security breach
- **Level 3**: Critical security compromise

#### Incident Response Steps
```bash
# 1. Isolate affected systems
kubectl cordon <affected-node>
kubectl drain <affected-node> --ignore-daemonsets

# 2. Collect forensic data
kubectl logs -n integration-deployment -l app=integration-deployment \
  --since=24h > security-incident-logs.txt

# 3. Analyze security logs
grep -i "unauthorized\|breach\|attack" security-incident-logs.txt

# 4. Apply security patches
kubectl apply -f k8s/security/emergency-patches.yaml

# 5. Rotate credentials
./scripts/rotate-all-credentials.sh
```

### Regular Security Maintenance

#### Weekly Security Tasks
```bash
# 1. Update container images
kubectl set image deployment/integration-deployment \
  app=integration-deployment:latest -n integration-deployment

# 2. Scan for vulnerabilities
trivy image integration-deployment:latest

# 3. Review access logs
kubectl logs -n integration-deployment -l app=integration-deployment | \
  grep "authentication\|authorization" | tail -100

# 4. Check certificate expiration
kubectl get certificates -n integration-deployment -o custom-columns=\
  NAME:.metadata.name,READY:.status.conditions[0].status,EXPIRES:.status.notAfter
```

This comprehensive operational guide provides the procedures and troubleshooting steps needed to maintain the Integration & Deployment system effectively in production environments.