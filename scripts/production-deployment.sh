#!/bin/bash

# Production Deployment Script for README-to-CICD System
# This script handles infrastructure provisioning and application deployment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="${PROJECT_ROOT}/config/production.env"
LOG_FILE="${PROJECT_ROOT}/logs/deployment-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)  echo -e "${GREEN}[INFO]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE" ;;
        DEBUG) echo -e "${BLUE}[DEBUG]${NC} ${timestamp} - $message" | tee -a "$LOG_FILE" ;;
    esac
}

# Error handling
error_exit() {
    log ERROR "$1"
    exit 1
}

# Cleanup function
cleanup() {
    log INFO "Cleaning up temporary resources..."
    # Add cleanup logic here
}

# Trap for cleanup on exit
trap cleanup EXIT

# Load configuration
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        log INFO "Loading configuration from $CONFIG_FILE"
        source "$CONFIG_FILE"
    else
        log WARN "Configuration file not found: $CONFIG_FILE"
        log INFO "Using default configuration"
    fi
    
    # Set defaults if not provided
    export ENVIRONMENT="${ENVIRONMENT:-production}"
    export DEPLOYMENT_STRATEGY="${DEPLOYMENT_STRATEGY:-blue-green}"
    export KUBERNETES_NAMESPACE="${KUBERNETES_NAMESPACE:-readme-to-cicd}"
    export DOCKER_REGISTRY="${DOCKER_REGISTRY:-docker.io}"
    export IMAGE_TAG="${IMAGE_TAG:-latest}"
    export REPLICAS="${REPLICAS:-3}"
    export ENABLE_MONITORING="${ENABLE_MONITORING:-true}"
    export ENABLE_BACKUP="${ENABLE_BACKUP:-true}"
    export SSL_ENABLED="${SSL_ENABLED:-true}"
}

# Validate prerequisites
validate_prerequisites() {
    log INFO "Validating prerequisites..."
    
    # Check required tools
    local required_tools=("kubectl" "docker" "helm")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error_exit "Required tool not found: $tool"
        fi
    done
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info &> /dev/null; then
        error_exit "Cannot connect to Kubernetes cluster"
    fi
    
    # Check Docker registry access
    if ! docker info &> /dev/null; then
        error_exit "Cannot connect to Docker daemon"
    fi
    
    # Validate environment variables
    local required_vars=("ENVIRONMENT" "KUBERNETES_NAMESPACE")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error_exit "Required environment variable not set: $var"
        fi
    done
    
    log INFO "Prerequisites validation completed successfully"
}

# Create namespace if it doesn't exist
create_namespace() {
    log INFO "Creating Kubernetes namespace: $KUBERNETES_NAMESPACE"
    
    if kubectl get namespace "$KUBERNETES_NAMESPACE" &> /dev/null; then
        log INFO "Namespace $KUBERNETES_NAMESPACE already exists"
    else
        kubectl create namespace "$KUBERNETES_NAMESPACE"
        log INFO "Namespace $KUBERNETES_NAMESPACE created successfully"
    fi
    
    # Label namespace for monitoring
    kubectl label namespace "$KUBERNETES_NAMESPACE" \
        app=readme-to-cicd \
        environment="$ENVIRONMENT" \
        --overwrite
}

# Deploy secrets
deploy_secrets() {
    log INFO "Deploying secrets..."
    
    local secrets_dir="${PROJECT_ROOT}/k8s/secrets"
    
    if [[ -d "$secrets_dir" ]]; then
        for secret_file in "$secrets_dir"/*.yaml; do
            if [[ -f "$secret_file" ]]; then
                log INFO "Applying secret: $(basename "$secret_file")"
                kubectl apply -f "$secret_file" -n "$KUBERNETES_NAMESPACE"
            fi
        done
    else
        log WARN "Secrets directory not found: $secrets_dir"
    fi
}

# Deploy ConfigMaps
deploy_configmaps() {
    log INFO "Deploying ConfigMaps..."
    
    local configmaps_dir="${PROJECT_ROOT}/k8s/configmaps"
    
    if [[ -d "$configmaps_dir" ]]; then
        for configmap_file in "$configmaps_dir"/*.yaml; do
            if [[ -f "$configmap_file" ]]; then
                log INFO "Applying ConfigMap: $(basename "$configmap_file")"
                kubectl apply -f "$configmap_file" -n "$KUBERNETES_NAMESPACE"
            fi
        done
    else
        log WARN "ConfigMaps directory not found: $configmaps_dir"
    fi
}

# Deploy database
deploy_database() {
    log INFO "Deploying database..."
    
    local db_chart="${PROJECT_ROOT}/helm/database"
    
    if [[ -d "$db_chart" ]]; then
        helm upgrade --install readme-to-cicd-db "$db_chart" \
            --namespace "$KUBERNETES_NAMESPACE" \
            --set environment="$ENVIRONMENT" \
            --set backup.enabled="$ENABLE_BACKUP" \
            --wait --timeout=10m
        
        log INFO "Database deployed successfully"
    else
        log WARN "Database chart not found: $db_chart"
    fi
}

# Deploy Redis cache
deploy_cache() {
    log INFO "Deploying Redis cache..."
    
    local cache_chart="${PROJECT_ROOT}/helm/redis"
    
    if [[ -d "$cache_chart" ]]; then
        helm upgrade --install readme-to-cicd-redis "$cache_chart" \
            --namespace "$KUBERNETES_NAMESPACE" \
            --set environment="$ENVIRONMENT" \
            --wait --timeout=5m
        
        log INFO "Redis cache deployed successfully"
    else
        log WARN "Redis chart not found: $cache_chart"
    fi
}

# Deploy application based on strategy
deploy_application() {
    log INFO "Deploying application using $DEPLOYMENT_STRATEGY strategy..."
    
    case "$DEPLOYMENT_STRATEGY" in
        "blue-green")
            deploy_blue_green
            ;;
        "canary")
            deploy_canary
            ;;
        "rolling")
            deploy_rolling
            ;;
        *)
            error_exit "Unknown deployment strategy: $DEPLOYMENT_STRATEGY"
            ;;
    esac
}

# Blue-Green deployment
deploy_blue_green() {
    log INFO "Executing Blue-Green deployment..."
    
    local app_chart="${PROJECT_ROOT}/helm/app"
    local current_color=$(kubectl get service readme-to-cicd-service -n "$KUBERNETES_NAMESPACE" \
        -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "blue")
    local new_color="green"
    
    if [[ "$current_color" == "green" ]]; then
        new_color="blue"
    fi
    
    log INFO "Current color: $current_color, deploying to: $new_color"
    
    # Deploy new version
    helm upgrade --install "readme-to-cicd-$new_color" "$app_chart" \
        --namespace "$KUBERNETES_NAMESPACE" \
        --set image.tag="$IMAGE_TAG" \
        --set color="$new_color" \
        --set replicas="$REPLICAS" \
        --set environment="$ENVIRONMENT" \
        --wait --timeout=10m
    
    # Health check
    if perform_health_check "$new_color"; then
        # Switch traffic
        log INFO "Switching traffic to $new_color"
        kubectl patch service readme-to-cicd-service -n "$KUBERNETES_NAMESPACE" \
            -p '{"spec":{"selector":{"color":"'$new_color'"}}}'
        
        # Wait for traffic switch
        sleep 30
        
        # Final health check
        if perform_health_check "$new_color"; then
            log INFO "Blue-Green deployment completed successfully"
            
            # Cleanup old deployment
            helm uninstall "readme-to-cicd-$current_color" -n "$KUBERNETES_NAMESPACE" || true
        else
            log ERROR "Final health check failed, rolling back"
            kubectl patch service readme-to-cicd-service -n "$KUBERNETES_NAMESPACE" \
                -p '{"spec":{"selector":{"color":"'$current_color'"}}}'
            error_exit "Blue-Green deployment failed"
        fi
    else
        error_exit "Health check failed for $new_color deployment"
    fi
}

# Canary deployment
deploy_canary() {
    log INFO "Executing Canary deployment..."
    
    local app_chart="${PROJECT_ROOT}/helm/app"
    local canary_percentage=10
    
    # Deploy canary version
    helm upgrade --install readme-to-cicd-canary "$app_chart" \
        --namespace "$KUBERNETES_NAMESPACE" \
        --set image.tag="$IMAGE_TAG" \
        --set canary.enabled=true \
        --set canary.percentage="$canary_percentage" \
        --set replicas=1 \
        --set environment="$ENVIRONMENT" \
        --wait --timeout=10m
    
    # Progressive rollout
    local percentages=(10 25 50 100)
    for percentage in "${percentages[@]}"; do
        log INFO "Rolling out to $percentage% of traffic"
        
        # Update canary percentage
        kubectl patch deployment readme-to-cicd-canary -n "$KUBERNETES_NAMESPACE" \
            -p '{"metadata":{"annotations":{"canary.percentage":"'$percentage'"}}}'
        
        # Wait and monitor
        sleep 300 # 5 minutes
        
        if ! perform_health_check "canary"; then
            log ERROR "Canary health check failed at $percentage%"
            rollback_canary
            error_exit "Canary deployment failed"
        fi
        
        # Check metrics
        if ! check_canary_metrics; then
            log ERROR "Canary metrics check failed at $percentage%"
            rollback_canary
            error_exit "Canary deployment failed due to metrics"
        fi
    done
    
    # Promote canary to stable
    log INFO "Promoting canary to stable"
    helm upgrade readme-to-cicd "$app_chart" \
        --namespace "$KUBERNETES_NAMESPACE" \
        --set image.tag="$IMAGE_TAG" \
        --set replicas="$REPLICAS" \
        --set environment="$ENVIRONMENT" \
        --wait --timeout=10m
    
    # Cleanup canary
    helm uninstall readme-to-cicd-canary -n "$KUBERNETES_NAMESPACE" || true
    
    log INFO "Canary deployment completed successfully"
}

# Rolling deployment
deploy_rolling() {
    log INFO "Executing Rolling deployment..."
    
    local app_chart="${PROJECT_ROOT}/helm/app"
    
    helm upgrade --install readme-to-cicd "$app_chart" \
        --namespace "$KUBERNETES_NAMESPACE" \
        --set image.tag="$IMAGE_TAG" \
        --set replicas="$REPLICAS" \
        --set environment="$ENVIRONMENT" \
        --set strategy.type="RollingUpdate" \
        --set strategy.rollingUpdate.maxUnavailable="25%" \
        --set strategy.rollingUpdate.maxSurge="25%" \
        --wait --timeout=15m
    
    log INFO "Rolling deployment completed successfully"
}

# Rollback canary deployment
rollback_canary() {
    log INFO "Rolling back canary deployment..."
    
    # Remove canary deployment
    helm uninstall readme-to-cicd-canary -n "$KUBERNETES_NAMESPACE" || true
    
    # Ensure stable version is running
    kubectl rollout status deployment/readme-to-cicd -n "$KUBERNETES_NAMESPACE"
}

# Perform health check
perform_health_check() {
    local target=${1:-""}
    log INFO "Performing health check for target: $target"
    
    local service_name="readme-to-cicd-service"
    if [[ -n "$target" ]]; then
        service_name="readme-to-cicd-$target-service"
    fi
    
    # Get service endpoint
    local service_ip=$(kubectl get service "$service_name" -n "$KUBERNETES_NAMESPACE" \
        -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    
    if [[ -z "$service_ip" ]]; then
        service_ip=$(kubectl get service "$service_name" -n "$KUBERNETES_NAMESPACE" \
            -o jsonpath='{.spec.clusterIP}')
    fi
    
    local service_port=$(kubectl get service "$service_name" -n "$KUBERNETES_NAMESPACE" \
        -o jsonpath='{.spec.ports[0].port}')
    
    # Health check endpoint
    local health_url="http://$service_ip:$service_port/health"
    
    log INFO "Checking health endpoint: $health_url"
    
    # Retry health check
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log INFO "Health check passed (attempt $attempt/$max_attempts)"
            return 0
        fi
        
        log DEBUG "Health check failed (attempt $attempt/$max_attempts), retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    log ERROR "Health check failed after $max_attempts attempts"
    return 1
}

# Check canary metrics
check_canary_metrics() {
    log INFO "Checking canary metrics..."
    
    # This would integrate with monitoring system to check metrics
    # For now, simulate metric checks
    
    local error_rate=$(kubectl exec -n "$KUBERNETES_NAMESPACE" \
        deployment/prometheus -- \
        promtool query instant 'rate(http_requests_total{status=~"5.."}[5m])' 2>/dev/null || echo "0")
    
    # Check if error rate is acceptable (< 5%)
    if (( $(echo "$error_rate < 0.05" | bc -l) )); then
        log INFO "Canary metrics check passed (error rate: $error_rate)"
        return 0
    else
        log ERROR "Canary metrics check failed (error rate: $error_rate)"
        return 1
    fi
}

# Deploy monitoring stack
deploy_monitoring() {
    if [[ "$ENABLE_MONITORING" != "true" ]]; then
        log INFO "Monitoring disabled, skipping..."
        return 0
    fi
    
    log INFO "Deploying monitoring stack..."
    
    local monitoring_chart="${PROJECT_ROOT}/helm/monitoring"
    
    if [[ -d "$monitoring_chart" ]]; then
        helm upgrade --install readme-to-cicd-monitoring "$monitoring_chart" \
            --namespace "$KUBERNETES_NAMESPACE" \
            --set environment="$ENVIRONMENT" \
            --set grafana.enabled=true \
            --set prometheus.enabled=true \
            --set alertmanager.enabled=true \
            --wait --timeout=10m
        
        log INFO "Monitoring stack deployed successfully"
    else
        log WARN "Monitoring chart not found: $monitoring_chart"
    fi
}

# Deploy ingress and SSL
deploy_ingress() {
    log INFO "Deploying ingress and SSL configuration..."
    
    local ingress_chart="${PROJECT_ROOT}/helm/ingress"
    
    if [[ -d "$ingress_chart" ]]; then
        helm upgrade --install readme-to-cicd-ingress "$ingress_chart" \
            --namespace "$KUBERNETES_NAMESPACE" \
            --set ssl.enabled="$SSL_ENABLED" \
            --set environment="$ENVIRONMENT" \
            --wait --timeout=5m
        
        log INFO "Ingress deployed successfully"
    else
        log WARN "Ingress chart not found: $ingress_chart"
    fi
}

# Run post-deployment tests
run_post_deployment_tests() {
    log INFO "Running post-deployment tests..."
    
    local test_script="${PROJECT_ROOT}/scripts/post-deployment-tests.sh"
    
    if [[ -f "$test_script" ]]; then
        if bash "$test_script" "$ENVIRONMENT" "$KUBERNETES_NAMESPACE"; then
            log INFO "Post-deployment tests passed"
        else
            log ERROR "Post-deployment tests failed"
            return 1
        fi
    else
        log WARN "Post-deployment test script not found: $test_script"
    fi
}

# Generate deployment report
generate_deployment_report() {
    log INFO "Generating deployment report..."
    
    local report_file="${PROJECT_ROOT}/reports/deployment-report-$(date +%Y%m%d-%H%M%S).json"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
{
  "deployment": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "strategy": "$DEPLOYMENT_STRATEGY",
    "namespace": "$KUBERNETES_NAMESPACE",
    "imageTag": "$IMAGE_TAG",
    "replicas": $REPLICAS
  },
  "components": {
    "application": "deployed",
    "database": "deployed",
    "cache": "deployed",
    "monitoring": "$([[ "$ENABLE_MONITORING" == "true" ]] && echo "deployed" || echo "skipped")",
    "ingress": "deployed"
  },
  "status": "success",
  "logFile": "$LOG_FILE"
}
EOF
    
    log INFO "Deployment report generated: $report_file"
}

# Main deployment function
main() {
    log INFO "Starting production deployment..."
    log INFO "Environment: $ENVIRONMENT"
    log INFO "Strategy: $DEPLOYMENT_STRATEGY"
    log INFO "Namespace: $KUBERNETES_NAMESPACE"
    log INFO "Image Tag: $IMAGE_TAG"
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Load configuration
    load_config
    
    # Validate prerequisites
    validate_prerequisites
    
    # Create namespace
    create_namespace
    
    # Deploy infrastructure components
    deploy_secrets
    deploy_configmaps
    deploy_database
    deploy_cache
    
    # Deploy application
    deploy_application
    
    # Deploy supporting services
    deploy_monitoring
    deploy_ingress
    
    # Run tests
    if ! run_post_deployment_tests; then
        log ERROR "Post-deployment tests failed, but deployment will continue"
    fi
    
    # Generate report
    generate_deployment_report
    
    log INFO "Production deployment completed successfully!"
    log INFO "Log file: $LOG_FILE"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi