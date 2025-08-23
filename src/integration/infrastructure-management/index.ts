/**
 * Multi-Cloud Infrastructure Management Module
 * 
 * Provides comprehensive infrastructure management across AWS, Azure, GCP, and hybrid deployments
 * with Terraform integration, cross-cloud orchestration, and comprehensive monitoring.
 */

// Main infrastructure manager
export { InfrastructureManagerImpl as InfrastructureManager } from './infrastructure-manager.js';

// Cloud provider managers
export { AWSManager } from './providers/aws-manager.js';
export { AzureManager } from './providers/azure-manager.js';
export { GCPManager } from './providers/gcp-manager.js';

// Terraform integration
export { TerraformManagerImpl as TerraformManager } from './terraform/terraform-manager.js';

// Multi-cloud orchestration
export { MultiCloudOrchestratorImpl as MultiCloudOrchestrator } from './orchestration/multi-cloud-orchestrator.js';

// Validation and monitoring
export { InfrastructureValidator } from './validation/infrastructure-validator.js';
export { InfrastructureMonitor } from './monitoring/infrastructure-monitor.js';

// Types and interfaces
export * from './types.js';
export * from './interfaces.js';

// Default export
export { InfrastructureManagerImpl as default } from './infrastructure-manager.js';