/**
 * Integration & Deployment Module
 * 
 * Main entry point for production deployment and operations management.
 * Provides comprehensive deployment orchestration, monitoring, backup/recovery,
 * performance optimization, and operational documentation.
 */

export { ProductionDeploymentManager } from './production-deployment';
export { OperationalRunbooksManager } from './operational-runbooks';
export { MonitoringDashboardsManager } from './monitoring-dashboards';
export { BackupRecoveryManager } from './backup-recovery';
export { PerformanceOptimizationManager } from './performance-optimization';
export { OperationalDocumentationManager } from './operational-documentation';

// Re-export types
export type {
  DeploymentConfig,
  DeploymentResult,
  InfrastructureConfig,
  ApplicationConfig,
  ValidationConfig,
  RollbackConfig,
  DeploymentMetrics
} from './production-deployment';

export type {
  Runbook,
  RunbookExecution,
  MaintenanceWindow,
  RunbookStep,
  TroubleshootingGuide
} from './operational-runbooks';

export type {
  DashboardConfig,
  DashboardData,
  DashboardWidget,
  ActiveAlert,
  WidgetConfiguration
} from './monitoring-dashboards';

export type {
  BackupConfig,
  BackupResult,
  RecoveryConfig,
  RecoveryResult,
  BackupTarget,
  ValidationResult as BackupValidationResult
} from './backup-recovery';

export type {
  PerformanceMetrics,
  OptimizationRecommendation,
  OptimizationResult,
  OptimizationConfig,
  PerformanceSnapshot
} from './performance-optimization';

export type {
  DocumentationConfig,
  TrainingMaterial,
  SearchQuery,
  SearchResult,
  DocumentationContent
} from './operational-documentation';

import { Logger } from '../../cli/lib/logger';
import { ConfigurationManager } from '../configuration/configuration-manager';
import { MonitoringSystem } from '../monitoring/monitoring-system';
import { ProductionDeploymentManager } from './production-deployment';
import { OperationalRunbooksManager } from './operational-runbooks';
import { MonitoringDashboardsManager } from './monitoring-dashboards';
import { BackupRecoveryManager } from './backup-recovery';
import { PerformanceOptimizationManager } from './performance-optimization';
import { OperationalDocumentationManager } from './operational-documentation';

/**
 * Integrated deployment and operations manager
 * 
 * Coordinates all deployment and operational components to provide
 * a comprehensive production management solution.
 */
export class IntegratedDeploymentManager {
  private logger: Logger;
  private configManager: ConfigurationManager;
  private monitoringSystem: MonitoringSystem;
  
  // Component managers
  private productionDeployment: ProductionDeploymentManager;
  private operationalRunbooks: OperationalRunbooksManager;
  private monitoringDashboards: MonitoringDashboardsManager;
  private backupRecovery: BackupRecoveryManager;
  private performanceOptimization: PerformanceOptimizationManager;
  private operationalDocumentation: OperationalDocumentationManager;

  constructor(
    logger: Logger,
    configManager: ConfigurationManager,
    monitoringSystem: MonitoringSystem
  ) {
    this.logger = logger;
    this.configManager = configManager;
    this.monitoringSystem = monitoringSystem;

    // Initialize component managers
    this.productionDeployment = new ProductionDeploymentManager(
      logger,
      configManager,
      monitoringSystem
    );

    this.operationalRunbooks = new OperationalRunbooksManager(
      logger,
      monitoringSystem,
      configManager
    );

    this.monitoringDashboards = new MonitoringDashboardsManager(
      logger,
      monitoringSystem,
      configManager
    );

    this.backupRecovery = new BackupRecoveryManager(
      logger,
      monitoringSystem,
      configManager
    );

    this.performanceOptimization = new PerformanceOptimizationManager(
      logger,
      monitoringSystem,
      configManager
    );

    this.operationalDocumentation = new OperationalDocumentationManager(
      logger,
      configManager
    );
  }

  /**
   * Initialize all deployment and operations components
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing IntegratedDeploymentManager...');

    try {
      // Initialize all components in parallel
      await Promise.all([
        this.operationalRunbooks.initialize(),
        this.monitoringDashboards.initialize(),
        this.backupRecovery.initialize(),
        this.performanceOptimization.initialize(),
        this.operationalDocumentation.initialize()
      ]);

      this.logger.info('IntegratedDeploymentManager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize IntegratedDeploymentManager', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get production deployment manager
   */
  getProductionDeploymentManager(): ProductionDeploymentManager {
    return this.productionDeployment;
  }

  /**
   * Get operational runbooks manager
   */
  getOperationalRunbooksManager(): OperationalRunbooksManager {
    return this.operationalRunbooks;
  }

  /**
   * Get monitoring dashboards manager
   */
  getMonitoringDashboardsManager(): MonitoringDashboardsManager {
    return this.monitoringDashboards;
  }

  /**
   * Get backup and recovery manager
   */
  getBackupRecoveryManager(): BackupRecoveryManager {
    return this.backupRecovery;
  }

  /**
   * Get performance optimization manager
   */
  getPerformanceOptimizationManager(): PerformanceOptimizationManager {
    return this.performanceOptimization;
  }

  /**
   * Get operational documentation manager
   */
  getOperationalDocumentationManager(): OperationalDocumentationManager {
    return this.operationalDocumentation;
  }

  /**
   * Execute a complete production deployment with all operational components
   */
  async executeCompleteDeployment(deploymentConfig: any): Promise<any> {
    this.logger.info('Starting complete production deployment', {
      environment: deploymentConfig.environment,
      strategy: deploymentConfig.strategy
    });

    try {
      // 1. Execute deployment
      const deploymentResult = await this.productionDeployment.deployToProduction(deploymentConfig);

      if (!deploymentResult.success) {
        throw new Error(`Deployment failed: ${deploymentResult.errors.join(', ')}`);
      }

      // 2. Set up monitoring dashboards
      await this.setupMonitoringForDeployment(deploymentConfig);

      // 3. Configure backup procedures
      await this.setupBackupForDeployment(deploymentConfig);

      // 4. Start performance optimization
      await this.performanceOptimization.startPerformanceAnalysis();

      // 5. Generate deployment documentation
      await this.generateDeploymentDocumentation(deploymentConfig, deploymentResult);

      this.logger.info('Complete production deployment finished successfully', {
        deploymentId: deploymentResult.deploymentId,
        duration: deploymentResult.duration
      });

      return {
        success: true,
        deploymentResult,
        components: {
          monitoring: 'configured',
          backup: 'configured',
          optimization: 'started',
          documentation: 'generated'
        }
      };

    } catch (error) {
      this.logger.error('Complete production deployment failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Execute emergency runbook if available
      await this.executeEmergencyRunbook('deployment-failure', {
        deploymentConfig,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Set up monitoring dashboards for a deployment
   */
  private async setupMonitoringForDeployment(deploymentConfig: any): Promise<void> {
    this.logger.info('Setting up monitoring dashboards for deployment');

    // Create deployment-specific dashboard
    const dashboardConfig = {
      title: `${deploymentConfig.name} - ${deploymentConfig.environment}`,
      description: `Monitoring dashboard for ${deploymentConfig.name} deployment`,
      category: 'application' as const,
      layout: {
        type: 'grid' as const,
        columns: 4,
        rows: 3,
        responsive: true,
        theme: 'dark' as const
      },
      widgets: [
        {
          id: 'deployment-health',
          type: 'status' as const,
          title: 'Deployment Health',
          position: { x: 0, y: 0 },
          size: { width: 2, height: 1 },
          configuration: {
            displayOptions: {
              showTooltips: true
            }
          },
          dataSource: {
            type: 'prometheus' as const,
            connection: { url: 'http://prometheus:9090' },
            query: `up{job="${deploymentConfig.name}"}`
          }
        }
      ],
      refreshInterval: 30,
      permissions: {
        view: ['*'],
        edit: ['admin', 'operator'],
        admin: ['admin'],
        public: true
      },
      tags: ['deployment', deploymentConfig.environment],
      isPublic: true,
      createdBy: 'deployment-system'
    };

    await this.monitoringDashboards.createDashboard(dashboardConfig);
  }

  /**
   * Set up backup procedures for a deployment
   */
  private async setupBackupForDeployment(deploymentConfig: any): Promise<void> {
    this.logger.info('Setting up backup procedures for deployment');

    // Create backup configuration
    const backupConfig = {
      name: `${deploymentConfig.name} Production Backup`,
      description: `Automated backup for ${deploymentConfig.name} production deployment`,
      type: 'full' as const,
      schedule: {
        frequency: 'daily' as const,
        cronExpression: '0 2 * * *',
        timezone: 'UTC',
        maxConcurrent: 1,
        retryAttempts: 3,
        retryDelay: 30
      },
      retention: {
        keepDaily: 7,
        keepWeekly: 4,
        keepMonthly: 12,
        keepYearly: 3,
        maxAge: 365,
        maxSize: '100GB',
        autoCleanup: true
      },
      targets: [
        {
          id: 'application-data',
          type: 'database' as const,
          source: {
            type: 'postgresql' as const,
            connection: {
              host: 'postgres-service',
              port: 5432,
              database: deploymentConfig.database?.name || 'readme_to_cicd',
              username: 'backup_user'
            }
          },
          destination: {
            type: 's3' as const,
            connection: {
              credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
              }
            },
            path: `/backups/${deploymentConfig.name}/${deploymentConfig.environment}`,
            bucket: process.env.BACKUP_BUCKET || 'readme-to-cicd-backups',
            region: process.env.AWS_REGION || 'us-east-1'
          },
          filters: [],
          priority: 1
        }
      ],
      encryption: {
        enabled: true,
        algorithm: 'AES-256' as const,
        keySource: 'vault' as const,
        keyId: 'backup-encryption-key'
      },
      compression: {
        enabled: true,
        algorithm: 'gzip' as const,
        level: 6
      },
      validation: {
        enabled: true,
        checksumAlgorithm: 'sha256' as const,
        integrityCheck: true,
        restoreTest: true,
        testFrequency: 'weekly' as const
      },
      notifications: [
        {
          type: 'email' as const,
          recipients: ['ops@example.com'],
          events: ['failure' as const, 'warning' as const]
        }
      ],
      enabled: true
    };

    await this.backupRecovery.createBackupConfig(backupConfig);
  }

  /**
   * Generate deployment documentation
   */
  private async generateDeploymentDocumentation(deploymentConfig: any, deploymentResult: any): Promise<void> {
    this.logger.info('Generating deployment documentation');

    const context = {
      title: `${deploymentConfig.name} Deployment Guide`,
      description: `Production deployment guide for ${deploymentConfig.name}`,
      category: 'deployment',
      audience: 'admin',
      deploymentSteps: [
        {
          title: 'Infrastructure Provisioning',
          description: 'Provision required infrastructure components',
          command: 'kubectl apply -f infrastructure.yaml'
        },
        {
          title: 'Application Deployment',
          description: 'Deploy the application using the configured strategy',
          command: `helm upgrade --install ${deploymentConfig.name} ./helm/app`
        },
        {
          title: 'Health Verification',
          description: 'Verify deployment health and functionality',
          command: 'kubectl get pods -l app=' + deploymentConfig.name
        }
      ],
      troubleshooting: 'Common deployment issues and their solutions...',
      nextSteps: 'Post-deployment monitoring and maintenance procedures...',
      tags: ['deployment', 'production', deploymentConfig.environment],
      keywords: ['deploy', 'production', 'kubernetes', deploymentConfig.name],
      difficulty: 'intermediate',
      prerequisites: ['kubernetes-access', 'helm-installed']
    };

    await this.operationalDocumentation.generateDocumentationFromTemplate('deployment-guide', context);
  }

  /**
   * Execute emergency runbook
   */
  private async executeEmergencyRunbook(runbookType: string, context: any): Promise<void> {
    this.logger.info('Executing emergency runbook', { runbookType });

    try {
      // Find appropriate runbook
      const runbooks = await this.operationalRunbooks.getTroubleshootingGuide(runbookType);
      
      if (runbooks.length > 0) {
        const emergencyRunbook = runbooks.find(r => r.severity === 'critical') || runbooks[0];
        
        await this.operationalRunbooks.executeRunbook(
          emergencyRunbook.id,
          'deployment-system',
          context
        );
      } else {
        this.logger.warn('No emergency runbook found for type', { runbookType });
      }

    } catch (error) {
      this.logger.error('Failed to execute emergency runbook', {
        runbookType,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get system health status across all components
   */
  async getSystemHealthStatus(): Promise<any> {
    const status = {
      timestamp: new Date(),
      overall: 'healthy' as 'healthy' | 'warning' | 'error' | 'critical',
      components: {
        deployment: 'healthy',
        monitoring: 'healthy',
        backup: 'healthy',
        performance: 'healthy',
        documentation: 'healthy'
      },
      metrics: {
        activeDeployments: 0,
        activeDashboards: 0,
        activeBackups: 0,
        activeOptimizations: 0,
        documentationCount: 0
      },
      alerts: [] as any[]
    };

    try {
      // Get component statuses
      const [
        dashboards,
        backupHistory,
        performanceMetrics,
        documentation
      ] = await Promise.all([
        this.monitoringDashboards.listDashboards(),
        this.backupRecovery.getBackupHistory(undefined, 10),
        this.performanceOptimization.getCurrentMetrics(),
        this.operationalDocumentation.listDocumentation()
      ]);

      status.metrics.activeDashboards = dashboards.length;
      status.metrics.activeBackups = backupHistory.filter(b => b.status === 'success').length;
      status.metrics.documentationCount = documentation.length;

      // Check for alerts
      const alerts = await this.monitoringDashboards.getActiveAlerts();
      status.alerts = alerts.map(alert => ({
        id: alert.id,
        severity: alert.threshold.severity,
        message: alert.threshold.message,
        triggeredAt: alert.triggeredAt
      }));

      // Determine overall status based on alerts
      if (alerts.some(a => a.threshold.severity === 'critical')) {
        status.overall = 'critical';
      } else if (alerts.some(a => a.threshold.severity === 'error')) {
        status.overall = 'error';
      } else if (alerts.some(a => a.threshold.severity === 'warning')) {
        status.overall = 'warning';
      }

    } catch (error) {
      this.logger.error('Failed to get system health status', {
        error: error instanceof Error ? error.message : String(error)
      });
      status.overall = 'error';
    }

    return status;
  }
}