-- Database initialization script for Integration & Deployment system
-- This script sets up the basic schema for the readme-to-cicd system

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS integration;
CREATE SCHEMA IF NOT EXISTS deployment;
CREATE SCHEMA IF NOT EXISTS monitoring;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set search path
SET search_path TO integration, deployment, monitoring, audit, public;

-- Components table
CREATE TABLE IF NOT EXISTS integration.components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    version VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('service', 'function', 'worker', 'extension')),
    status VARCHAR(50) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'deploying', 'running', 'stopped', 'failed')),
    configuration JSONB,
    dependencies TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deployments table
CREATE TABLE IF NOT EXISTS deployment.deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    strategy VARCHAR(50) NOT NULL CHECK (strategy IN ('blue-green', 'canary', 'rolling', 'recreate')),
    environment VARCHAR(50) NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'failed', 'rolled-back')),
    configuration JSONB NOT NULL,
    component_ids UUID[],
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow executions table
CREATE TABLE IF NOT EXISTS integration.workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    trace_id VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System events table
CREATE TABLE IF NOT EXISTS monitoring.system_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    source VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    message TEXT NOT NULL,
    data JSONB,
    correlation_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metrics table
CREATE TABLE IF NOT EXISTS monitoring.metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(255) NOT NULL,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'summary')),
    value DECIMAL,
    labels JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuration table
CREATE TABLE IF NOT EXISTS integration.configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    environment VARCHAR(50),
    version INTEGER DEFAULT 1,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_components_name ON integration.components(name);
CREATE INDEX IF NOT EXISTS idx_components_type ON integration.components(type);
CREATE INDEX IF NOT EXISTS idx_components_status ON integration.components(status);
CREATE INDEX IF NOT EXISTS idx_components_created_at ON integration.components(created_at);

CREATE INDEX IF NOT EXISTS idx_deployments_environment ON deployment.deployments(environment);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployment.deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployment.deployments(created_at);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_type ON integration.workflow_executions(workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON integration.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON integration.workflow_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_trace_id ON integration.workflow_executions(trace_id);

CREATE INDEX IF NOT EXISTS idx_system_events_type ON monitoring.system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON monitoring.system_events(severity);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON monitoring.system_events(created_at);
CREATE INDEX IF NOT EXISTS idx_system_events_correlation_id ON monitoring.system_events(correlation_id);

CREATE INDEX IF NOT EXISTS idx_metrics_name ON monitoring.metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON monitoring.metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit.audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_configurations_key ON integration.configurations(key);
CREATE INDEX IF NOT EXISTS idx_configurations_environment ON integration.configurations(environment);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_components_updated_at BEFORE UPDATE ON integration.components
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON deployment.deployments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configurations_updated_at BEFORE UPDATE ON integration.configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration values
INSERT INTO integration.configurations (key, value, environment) VALUES
    ('system.orchestration.maxConcurrentWorkflows', '10', 'development'),
    ('system.orchestration.workflowTimeout', '300000', 'development'),
    ('system.deployment.defaultStrategy', '"rolling"', 'development'),
    ('system.monitoring.metricsEnabled', 'true', 'development'),
    ('system.security.auditEnabled', 'true', 'development')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA integration TO readme_user;
GRANT USAGE ON SCHEMA deployment TO readme_user;
GRANT USAGE ON SCHEMA monitoring TO readme_user;
GRANT USAGE ON SCHEMA audit TO readme_user;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA integration TO readme_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA deployment TO readme_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA monitoring TO readme_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit TO readme_user;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA integration TO readme_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA deployment TO readme_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA monitoring TO readme_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA audit TO readme_user;