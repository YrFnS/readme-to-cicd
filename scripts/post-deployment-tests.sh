#!/bin/bash

# Post-Deployment Tests for README-to-CICD System
# This script runs comprehensive tests after deployment to validate system functionality

set -euo pipefail

# Configuration
ENVIRONMENT=${1:-production}
NAMESPACE=${2:-readme-to-cicd}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_LOG="${PROJECT_ROOT}/logs/post-deployment-tests-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)  echo -e "${GREEN}[INFO]${NC} ${timestamp} - $message" | tee -a "$TEST_LOG" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message" | tee -a "$TEST_LOG" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} ${timestamp} - $message" | tee -a "$TEST_LOG" ;;
        DEBUG) echo -e "${BLUE}[DEBUG]${NC} ${timestamp} - $message" | tee -a "$TEST_LOG" ;;
        PASS)  echo -e "${GREEN}[PASS]${NC} ${timestamp} - $message" | tee -a "$TEST_LOG" ;;
        FAIL)  echo -e "${RED}[FAIL]${NC} ${timestamp} - $message" | tee -a "$TEST_LOG" ;;
    esac
}

# Test execution wrapper
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    log INFO "Running test: $test_name"
    ((TESTS_TOTAL++))
    
    if $test_function; then
        log PASS "$test_name"
        ((TESTS_PASSED++))
        return 0
    else
        log FAIL "$test_name"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test: Kubernetes resources are running
test_kubernetes_resources() {
    log DEBUG "Checking Kubernetes resources in namespace: $NAMESPACE"
    
    # Check deployments
    local deployments=$(kubectl get deployments -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')
    if [[ -z "$deployments" ]]; then
        log ERROR "No deployments found in namespace $NAMESPACE"
        return 1
    fi
    
    for deployment in $deployments; do
        local ready_replicas=$(kubectl get deployment "$deployment" -n "$NAMESPACE" \
            -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired_replicas=$(kubectl get deployment "$deployment" -n "$NAMESPACE" \
            -o jsonpath='{.spec.replicas}')
        
        if [[ "$ready_replicas" != "$desired_replicas" ]]; then
            log ERROR "Deployment $deployment: $ready_replicas/$desired_replicas replicas ready"
            return 1
        fi
        
        log DEBUG "Deployment $deployment: $ready_replicas/$desired_replicas replicas ready"
    done
    
    # Check services
    local services=$(kubectl get services -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')
    if [[ -z "$services" ]]; then
        log ERROR "No services found in namespace $NAMESPACE"
        return 1
    fi
    
    log DEBUG "Found services: $services"
    
    # Check pods
    local failed_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running \
        -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -n "$failed_pods" ]]; then
        log ERROR "Failed pods found: $failed_pods"
        return 1
    fi
    
    return 0
}

# Test: Application health endpoints
test_application_health() {
    log DEBUG "Testing application health endpoints"
    
    # Get service endpoint
    local service_name="readme-to-cicd-service"
    local service_ip=$(kubectl get service "$service_name" -n "$NAMESPACE" \
        -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || \
        kubectl get service "$service_name" -n "$NAMESPACE" \
        -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")
    
    if [[ -z "$service_ip" ]]; then
        log ERROR "Could not get service IP for $service_name"
        return 1
    fi
    
    local service_port=$(kubectl get service "$service_name" -n "$NAMESPACE" \
        -o jsonpath='{.spec.ports[0].port}')
    
    # Test health endpoint
    local health_url="http://$service_ip:$service_port/health"
    log DEBUG "Testing health endpoint: $health_url"
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$health_url" 2>/dev/null || echo "000")
    
    if [[ "$response" == "200" ]]; then
        log DEBUG "Health endpoint returned 200 OK"
        return 0
    else
        log ERROR "Health endpoint returned $response"
        return 1
    fi
}

# Test: API endpoints functionality
test_api_endpoints() {
    log DEBUG "Testing API endpoints functionality"
    
    # Get service endpoint
    local service_name="readme-to-cicd-service"
    local service_ip=$(kubectl get service "$service_name" -n "$NAMESPACE" \
        -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || \
        kubectl get service "$service_name" -n "$NAMESPACE" \
        -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")
    
    if [[ -z "$service_ip" ]]; then
        log ERROR "Could not get service IP for $service_name"
        return 1
    fi
    
    local service_port=$(kubectl get service "$service_name" -n "$NAMESPACE" \
        -o jsonpath='{.spec.ports[0].port}')
    
    local base_url="http://$service_ip:$service_port"
    
    # Test API version endpoint
    local version_response=$(curl -s "$base_url/api/version" 2>/dev/null || echo "")
    if [[ -z "$version_response" ]]; then
        log ERROR "API version endpoint not responding"
        return 1
    fi
    
    log DEBUG "API version response: $version_response"
    
    # Test README parsing endpoint (with sample data)
    local parse_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"content": "# Test Project\n\nThis is a test README."}' \
        "$base_url/api/parse" 2>/dev/null || echo "")
    
    if [[ -z "$parse_response" ]]; then
        log ERROR "README parsing endpoint not responding"
        return 1
    fi
    
    log DEBUG "Parse response received"
    
    return 0
}

# Test: Database connectivity
test_database_connectivity() {
    log DEBUG "Testing database connectivity"
    
    # Get database pod
    local db_pod=$(kubectl get pods -n "$NAMESPACE" -l app=database \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$db_pod" ]]; then
        log ERROR "Database pod not found"
        return 1
    fi
    
    # Test database connection
    local db_test=$(kubectl exec "$db_pod" -n "$NAMESPACE" -- \
        psql -U postgres -d readme_to_cicd -c "SELECT 1;" 2>/dev/null || echo "")
    
    if [[ -z "$db_test" ]]; then
        log ERROR "Database connection test failed"
        return 1
    fi
    
    log DEBUG "Database connection successful"
    return 0
}

# Test: Cache connectivity
test_cache_connectivity() {
    log DEBUG "Testing cache connectivity"
    
    # Get Redis pod
    local redis_pod=$(kubectl get pods -n "$NAMESPACE" -l app=redis \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$redis_pod" ]]; then
        log ERROR "Redis pod not found"
        return 1
    fi
    
    # Test Redis connection
    local redis_test=$(kubectl exec "$redis_pod" -n "$NAMESPACE" -- \
        redis-cli ping 2>/dev/null || echo "")
    
    if [[ "$redis_test" != "PONG" ]]; then
        log ERROR "Redis connection test failed: $redis_test"
        return 1
    fi
    
    log DEBUG "Redis connection successful"
    return 0
}

# Test: Monitoring stack
test_monitoring_stack() {
    log DEBUG "Testing monitoring stack"
    
    # Check if monitoring is enabled
    local prometheus_pod=$(kubectl get pods -n "$NAMESPACE" -l app=prometheus \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$prometheus_pod" ]]; then
        log WARN "Prometheus pod not found - monitoring may be disabled"
        return 0
    fi
    
    # Test Prometheus
    local prometheus_ready=$(kubectl get pod "$prometheus_pod" -n "$NAMESPACE" \
        -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "")
    
    if [[ "$prometheus_ready" != "True" ]]; then
        log ERROR "Prometheus pod not ready"
        return 1
    fi
    
    # Check Grafana
    local grafana_pod=$(kubectl get pods -n "$NAMESPACE" -l app=grafana \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -n "$grafana_pod" ]]; then
        local grafana_ready=$(kubectl get pod "$grafana_pod" -n "$NAMESPACE" \
            -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "")
        
        if [[ "$grafana_ready" != "True" ]]; then
            log ERROR "Grafana pod not ready"
            return 1
        fi
    fi
    
    log DEBUG "Monitoring stack is healthy"
    return 0
}

# Test: SSL/TLS configuration
test_ssl_configuration() {
    log DEBUG "Testing SSL/TLS configuration"
    
    # Get ingress
    local ingress=$(kubectl get ingress -n "$NAMESPACE" \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$ingress" ]]; then
        log WARN "No ingress found - SSL test skipped"
        return 0
    fi
    
    # Get ingress host
    local ingress_host=$(kubectl get ingress "$ingress" -n "$NAMESPACE" \
        -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "")
    
    if [[ -z "$ingress_host" ]]; then
        log WARN "No ingress host found - SSL test skipped"
        return 0
    fi
    
    # Test SSL certificate
    local ssl_test=$(echo | openssl s_client -connect "$ingress_host:443" -servername "$ingress_host" 2>/dev/null | \
        openssl x509 -noout -dates 2>/dev/null || echo "")
    
    if [[ -z "$ssl_test" ]]; then
        log ERROR "SSL certificate test failed"
        return 1
    fi
    
    log DEBUG "SSL certificate is valid"
    return 0
}

# Test: Performance benchmarks
test_performance_benchmarks() {
    log DEBUG "Running performance benchmarks"
    
    # Get service endpoint
    local service_name="readme-to-cicd-service"
    local service_ip=$(kubectl get service "$service_name" -n "$NAMESPACE" \
        -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || \
        kubectl get service "$service_name" -n "$NAMESPACE" \
        -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")
    
    if [[ -z "$service_ip" ]]; then
        log ERROR "Could not get service IP for performance test"
        return 1
    fi
    
    local service_port=$(kubectl get service "$service_name" -n "$NAMESPACE" \
        -o jsonpath='{.spec.ports[0].port}')
    
    local health_url="http://$service_ip:$service_port/health"
    
    # Simple performance test with curl
    log DEBUG "Running performance test with 10 concurrent requests"
    
    local start_time=$(date +%s)
    local success_count=0
    
    for i in {1..10}; do
        if curl -s -f "$health_url" > /dev/null 2>&1; then
            ((success_count++))
        fi &
    done
    
    wait
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log DEBUG "Performance test completed: $success_count/10 requests successful in ${duration}s"
    
    if [[ $success_count -lt 8 ]]; then
        log ERROR "Performance test failed: only $success_count/10 requests successful"
        return 1
    fi
    
    if [[ $duration -gt 30 ]]; then
        log ERROR "Performance test failed: took ${duration}s (expected < 30s)"
        return 1
    fi
    
    return 0
}

# Test: Backup and recovery readiness
test_backup_readiness() {
    log DEBUG "Testing backup and recovery readiness"
    
    # Check if backup CronJob exists
    local backup_cronjob=$(kubectl get cronjobs -n "$NAMESPACE" -l app=backup \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$backup_cronjob" ]]; then
        log WARN "No backup CronJob found - backup may be disabled"
        return 0
    fi
    
    # Check backup storage configuration
    local backup_pvc=$(kubectl get pvc -n "$NAMESPACE" -l app=backup \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$backup_pvc" ]]; then
        log ERROR "Backup PVC not found"
        return 1
    fi
    
    # Check PVC status
    local pvc_status=$(kubectl get pvc "$backup_pvc" -n "$NAMESPACE" \
        -o jsonpath='{.status.phase}' 2>/dev/null || echo "")
    
    if [[ "$pvc_status" != "Bound" ]]; then
        log ERROR "Backup PVC not bound: $pvc_status"
        return 1
    fi
    
    log DEBUG "Backup configuration is ready"
    return 0
}

# Test: Security configurations
test_security_configurations() {
    log DEBUG "Testing security configurations"
    
    # Check network policies
    local network_policies=$(kubectl get networkpolicies -n "$NAMESPACE" \
        -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$network_policies" ]]; then
        log WARN "No network policies found"
    else
        log DEBUG "Network policies found: $network_policies"
    fi
    
    # Check pod security policies
    local pod_security_policies=$(kubectl get podsecuritypolicies \
        -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$pod_security_policies" ]]; then
        log WARN "No pod security policies found"
    else
        log DEBUG "Pod security policies found: $pod_security_policies"
    fi
    
    # Check RBAC
    local service_accounts=$(kubectl get serviceaccounts -n "$NAMESPACE" \
        -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$service_accounts" ]]; then
        log ERROR "No service accounts found"
        return 1
    fi
    
    log DEBUG "Service accounts found: $service_accounts"
    return 0
}

# Generate test report
generate_test_report() {
    log INFO "Generating test report..."
    
    local report_file="${PROJECT_ROOT}/reports/post-deployment-test-report-$(date +%Y%m%d-%H%M%S).json"
    mkdir -p "$(dirname "$report_file")"
    
    local success_rate=0
    if [[ $TESTS_TOTAL -gt 0 ]]; then
        success_rate=$(( (TESTS_PASSED * 100) / TESTS_TOTAL ))
    fi
    
    cat > "$report_file" << EOF
{
  "testExecution": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "namespace": "$NAMESPACE",
    "duration": "$(( $(date +%s) - $(stat -c %Y "$TEST_LOG" 2>/dev/null || date +%s) ))s"
  },
  "results": {
    "total": $TESTS_TOTAL,
    "passed": $TESTS_PASSED,
    "failed": $TESTS_FAILED,
    "successRate": $success_rate
  },
  "status": "$([[ $TESTS_FAILED -eq 0 ]] && echo "success" || echo "failure")",
  "logFile": "$TEST_LOG"
}
EOF
    
    log INFO "Test report generated: $report_file"
}

# Main test execution
main() {
    log INFO "Starting post-deployment tests..."
    log INFO "Environment: $ENVIRONMENT"
    log INFO "Namespace: $NAMESPACE"
    
    # Create log directory
    mkdir -p "$(dirname "$TEST_LOG")"
    
    # Run all tests
    run_test "Kubernetes Resources" test_kubernetes_resources
    run_test "Application Health" test_application_health
    run_test "API Endpoints" test_api_endpoints
    run_test "Database Connectivity" test_database_connectivity
    run_test "Cache Connectivity" test_cache_connectivity
    run_test "Monitoring Stack" test_monitoring_stack
    run_test "SSL Configuration" test_ssl_configuration
    run_test "Performance Benchmarks" test_performance_benchmarks
    run_test "Backup Readiness" test_backup_readiness
    run_test "Security Configurations" test_security_configurations
    
    # Generate report
    generate_test_report
    
    # Summary
    log INFO "Post-deployment tests completed"
    log INFO "Tests passed: $TESTS_PASSED/$TESTS_TOTAL"
    log INFO "Tests failed: $TESTS_FAILED/$TESTS_TOTAL"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        log INFO "All tests passed successfully!"
        return 0
    else
        log ERROR "Some tests failed. Check the log for details: $TEST_LOG"
        return 1
    fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi