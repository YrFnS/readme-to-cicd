import { BaseLanguageAnalyzer } from './base';
import { LanguageDetectionResult, ProjectInfo } from '../interfaces/language-analyzer';
import { FrameworkInfo, ContainerInfo, BuildToolInfo } from '../interfaces/framework-info';
import { CIStep } from '../interfaces/ci-pipeline';
import { Evidence } from '../interfaces/evidence';
import { FileSystemScanner } from '../utils/file-scanner';
import { join } from 'path';

/**
 * Container and deployment analyzer
 */
export class ContainerAnalyzer extends BaseLanguageAnalyzer {
  readonly name = 'Container Analyzer';
  readonly ecosystem = 'container';

  private fileScanner = new FileSystemScanner();

  canAnalyze(projectInfo: ProjectInfo): boolean {
    // Check for container indicators
    return this.hasConfigFile(projectInfo, 'Dockerfile') ||
           this.hasConfigFile(projectInfo, 'docker-compose.yml') ||
           this.hasConfigFile(projectInfo, 'docker-compose.yaml') ||
           this.hasConfigFile(projectInfo, 'Chart.yaml') ||
           this.hasConfigFile(projectInfo, 'values.yaml') ||
           this.hasDependency(projectInfo, 'docker') ||
           this.hasCommand(projectInfo, 'docker build') ||
           this.hasCommand(projectInfo, 'kubectl') ||
           this.hasCommand(projectInfo, 'helm') ||
           this.hasCommand(projectInfo, 'docker-compose');
  }

  async analyze(projectInfo: ProjectInfo, projectPath?: string): Promise<LanguageDetectionResult> {
    const startTime = Date.now();
    const frameworks: FrameworkInfo[] = [];
    const buildTools: BuildToolInfo[] = [];
    const warnings: string[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Detect Docker
    try {
      const dockerInfo = await this.detectDocker(projectInfo, projectPath);
      if (dockerInfo) {
        frameworks.push(dockerInfo.framework);
        if (dockerInfo.buildTool) {
          buildTools.push(dockerInfo.buildTool);
        }
        filesAnalyzed.push(...dockerInfo.filesAnalyzed);
        patternsMatched.push(...dockerInfo.patternsMatched);
      }
    } catch (error) {
      warnings.push(`Docker detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Detect Docker Compose
    try {
      const composeInfo = await this.detectDockerCompose(projectInfo, projectPath);
      if (composeInfo) {
        frameworks.push(composeInfo.framework);
        if (composeInfo.buildTool) {
          buildTools.push(composeInfo.buildTool);
        }
        filesAnalyzed.push(...composeInfo.filesAnalyzed);
        patternsMatched.push(...composeInfo.patternsMatched);
      }
    } catch (error) {
      warnings.push(`Docker Compose detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Detect Kubernetes
    try {
      const k8sInfo = await this.detectKubernetes(projectInfo, projectPath);
      if (k8sInfo) {
        frameworks.push(k8sInfo.framework);
        filesAnalyzed.push(...k8sInfo.filesAnalyzed);
        patternsMatched.push(...k8sInfo.patternsMatched);
      }
    } catch (error) {
      warnings.push(`Kubernetes detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Detect Helm
    try {
      const helmInfo = await this.detectHelm(projectInfo, projectPath);
      if (helmInfo) {
        frameworks.push(helmInfo.framework);
        if (helmInfo.buildTool) {
          buildTools.push(helmInfo.buildTool);
        }
        filesAnalyzed.push(...helmInfo.filesAnalyzed);
        patternsMatched.push(...helmInfo.patternsMatched);
      }
    } catch (error) {
      warnings.push(`Helm detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      frameworks,
      buildTools,
      confidence: frameworks.length > 0 ? Math.max(...frameworks.map(f => f.confidence)) : 0.1,
      recommendations: this.generateRecommendations(frameworks, warnings),
      metadata: {
        executionTime: Date.now() - startTime,
        filesAnalyzed: [...new Set(filesAnalyzed)],
        patternsMatched: [...new Set(patternsMatched)],
        warnings
      }
    };
  }

  /**
   * Detect Docker configuration
   */
  private async detectDocker(projectInfo: ProjectInfo, projectPath?: string): Promise<ContainerDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for Dockerfile
    if (this.hasConfigFile(projectInfo, 'Dockerfile')) {
      evidence.push({
        type: 'config_file',
        source: 'Dockerfile',
        value: 'Dockerfile found',
        weight: 0.9
      });
      patternsMatched.push('Dockerfile');
    }

    // Check for docker commands
    if (this.hasCommand(projectInfo, 'docker build')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'docker build',
        weight: 0.7
      });
      patternsMatched.push('docker build command');
    }

    if (this.hasCommand(projectInfo, 'docker run')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'docker run',
        weight: 0.6
      });
      patternsMatched.push('docker run command');
    }

    // Parse Dockerfile if available
    let dockerfileInfo: DockerfileInfo | null = null;
    if (projectPath && this.hasConfigFile(projectInfo, 'Dockerfile')) {
      try {
        dockerfileInfo = await this.parseDockerfile(join(projectPath, 'Dockerfile'));
        filesAnalyzed.push('Dockerfile');
        
        if (dockerfileInfo.baseImage) {
          evidence.push({
            type: 'config_file',
            source: 'Dockerfile',
            value: `Base image: ${dockerfileInfo.baseImage}`,
            weight: 0.8
          });
        }

        if (dockerfileInfo.isMultiStage) {
          evidence.push({
            type: 'config_file',
            source: 'Dockerfile',
            value: 'Multi-stage build detected',
            weight: 0.7
          });
          patternsMatched.push('multi-stage build');
        }
      } catch (error) {
        // Dockerfile exists but couldn't be parsed
        evidence.push({
          type: 'config_file',
          source: 'Dockerfile',
          value: 'Dockerfile found but could not be parsed',
          weight: 0.3
        });
      }
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const framework = this.createFrameworkInfo(
      'Docker',
      'build_tool',
      confidence,
      evidence,
      dockerfileInfo?.version || undefined
    );

    // Add container-specific metadata
    framework.metadata = {
      ...framework.metadata,
      containerType: 'docker',
      baseImage: dockerfileInfo?.baseImage,
      isMultiStage: dockerfileInfo?.isMultiStage,
      exposedPorts: dockerfileInfo?.exposedPorts,
      volumes: dockerfileInfo?.volumes
    };

    const buildTool: BuildToolInfo | undefined = dockerfileInfo ? {
      name: 'Docker',
      configFile: 'Dockerfile',
      commands: [
        {
          name: 'build',
          command: 'docker build -t ${IMAGE_NAME} .',
          description: 'Build Docker image',
          isPrimary: true
        },
        {
          name: 'run',
          command: 'docker run -p ${PORT}:${PORT} ${IMAGE_NAME}',
          description: 'Run Docker container',
          isPrimary: false
        }
      ],
      confidence,
      config: {
        baseImage: dockerfileInfo.baseImage,
        exposedPorts: dockerfileInfo.exposedPorts,
        volumes: dockerfileInfo.volumes
      }
    } : undefined;

    const result: ContainerDetectionResult = {
      framework,
      filesAnalyzed,
      patternsMatched
    };
    
    if (buildTool) {
      result.buildTool = buildTool;
    }

    return result;
  }

  /**
   * Detect Docker Compose configuration
   */
  private async detectDockerCompose(projectInfo: ProjectInfo, projectPath?: string): Promise<ContainerDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for docker-compose files
    const composeFiles = ['docker-compose.yml', 'docker-compose.yaml'];
    let composeFile: string | null = null;
    
    for (const file of composeFiles) {
      if (this.hasConfigFile(projectInfo, file)) {
        composeFile = file;
        evidence.push({
          type: 'config_file',
          source: file,
          value: `${file} found`,
          weight: 0.9
        });
        patternsMatched.push(file);
        break;
      }
    }

    // Check for docker-compose commands
    if (this.hasCommand(projectInfo, 'docker-compose')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'docker-compose',
        weight: 0.8
      });
      patternsMatched.push('docker-compose command');
    }

    // Parse docker-compose file if available
    let composeInfo: DockerComposeInfo | null = null;
    if (projectPath && composeFile) {
      try {
        composeInfo = await this.parseDockerCompose(join(projectPath, composeFile));
        filesAnalyzed.push(composeFile);
        
        if (composeInfo.services.length > 0) {
          evidence.push({
            type: 'config_file',
            source: composeFile,
            value: `${composeInfo.services.length} services defined`,
            weight: 0.8
          });
        }

        if (composeInfo.services.length > 1) {
          patternsMatched.push('multi-container setup');
        }
      } catch (error) {
        evidence.push({
          type: 'config_file',
          source: composeFile,
          value: 'Docker Compose file found but could not be parsed',
          weight: 0.3
        });
      }
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const framework = this.createFrameworkInfo(
      'Docker Compose',
      'build_tool',
      confidence,
      evidence,
      composeInfo?.version || undefined
    );

    // Add compose-specific metadata
    framework.metadata = {
      ...framework.metadata,
      containerType: 'compose',
      services: composeInfo?.services,
      networks: composeInfo?.networks,
      volumes: composeInfo?.volumes
    };

    const buildTool: BuildToolInfo | undefined = composeInfo ? {
      name: 'Docker Compose',
      configFile: composeFile!,
      commands: [
        {
          name: 'up',
          command: 'docker-compose up -d',
          description: 'Start all services',
          isPrimary: true
        },
        {
          name: 'build',
          command: 'docker-compose build',
          description: 'Build all services',
          isPrimary: false
        },
        {
          name: 'down',
          command: 'docker-compose down',
          description: 'Stop all services',
          isPrimary: false
        }
      ],
      confidence,
      config: {
        services: composeInfo.services,
        networks: composeInfo.networks,
        volumes: composeInfo.volumes
      }
    } : undefined;

    const result: ContainerDetectionResult = {
      framework,
      filesAnalyzed,
      patternsMatched
    };
    
    if (buildTool) {
      result.buildTool = buildTool;
    }

    return result;
  }

  /**
   * Detect Kubernetes configuration
   */
  private async detectKubernetes(projectInfo: ProjectInfo, projectPath?: string): Promise<ContainerDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for kubectl commands
    if (this.hasCommand(projectInfo, 'kubectl')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'kubectl',
        weight: 0.8
      });
      patternsMatched.push('kubectl command');
    }

    // Check for Kubernetes manifest files
    const k8sPatterns = [
      'deployment.yaml', 'deployment.yml',
      'service.yaml', 'service.yml',
      'ingress.yaml', 'ingress.yml',
      'configmap.yaml', 'configmap.yml',
      'secret.yaml', 'secret.yml',
      'kustomization.yaml', 'kustomization.yml'
    ];

    let manifestFiles: string[] = [];
    for (const pattern of k8sPatterns) {
      if (this.hasConfigFile(projectInfo, pattern)) {
        manifestFiles.push(pattern);
        evidence.push({
          type: 'config_file',
          source: pattern,
          value: `Kubernetes manifest: ${pattern}`,
          weight: 0.7
        });
        patternsMatched.push(`k8s manifest: ${pattern}`);
      }
    }

    // Check for k8s directory
    if (projectInfo.configFiles.some(file => file.includes('k8s/') || file.includes('kubernetes/'))) {
      evidence.push({
        type: 'directory_structure',
        source: 'project structure',
        value: 'Kubernetes directory found',
        weight: 0.6
      });
      patternsMatched.push('kubernetes directory');
    }

    // Parse manifest files if available
    let k8sInfo: KubernetesInfo | null = null;
    if (projectPath && manifestFiles.length > 0) {
      try {
        k8sInfo = await this.parseKubernetesManifests(projectPath, manifestFiles);
        filesAnalyzed.push(...manifestFiles);
      } catch (error) {
        evidence.push({
          type: 'config_file',
          source: 'kubernetes manifests',
          value: 'Kubernetes manifests found but could not be parsed',
          weight: 0.4
        });
      }
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const framework = this.createFrameworkInfo(
      'Kubernetes',
      'build_tool',
      confidence,
      evidence
    );

    // Add k8s-specific metadata
    framework.metadata = {
      ...framework.metadata,
      containerType: 'kubernetes',
      manifestFiles,
      resources: k8sInfo?.resources,
      namespaces: k8sInfo?.namespaces
    };

    return {
      framework,
      filesAnalyzed,
      patternsMatched
    };
  }

  /**
   * Detect Helm configuration
   */
  private async detectHelm(projectInfo: ProjectInfo, projectPath?: string): Promise<ContainerDetectionResult | null> {
    const evidence: Evidence[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];

    // Check for Helm files
    if (this.hasConfigFile(projectInfo, 'Chart.yaml')) {
      evidence.push({
        type: 'config_file',
        source: 'Chart.yaml',
        value: 'Helm Chart.yaml found',
        weight: 0.95
      });
      patternsMatched.push('Chart.yaml');
    }

    if (this.hasConfigFile(projectInfo, 'values.yaml')) {
      evidence.push({
        type: 'config_file',
        source: 'values.yaml',
        value: 'Helm values.yaml found',
        weight: 0.85
      });
      patternsMatched.push('values.yaml');
    }

    // Check for helm commands
    if (this.hasCommand(projectInfo, 'helm')) {
      evidence.push({
        type: 'command_pattern',
        source: 'build commands',
        value: 'helm',
        weight: 0.75
      });
      patternsMatched.push('helm command');
    }

    // Parse Helm chart if available
    let helmInfo: HelmInfo | null = null;
    if (projectPath && this.hasConfigFile(projectInfo, 'Chart.yaml')) {
      try {
        helmInfo = await this.parseHelmChart(projectPath);
        filesAnalyzed.push('Chart.yaml');
        if (helmInfo.hasValues) {
          filesAnalyzed.push('values.yaml');
        }
        
        if (helmInfo.name) {
          evidence.push({
            type: 'config_file',
            source: 'Chart.yaml',
            value: `Helm chart: ${helmInfo.name}`,
            weight: 0.8
          });
        }
      } catch (error) {
        evidence.push({
          type: 'config_file',
          source: 'Chart.yaml',
          value: 'Helm chart found but could not be parsed',
          weight: 0.3
        });
      }
    }

    if (evidence.length === 0) {
      return null;
    }

    const confidence = this.calculateEvidenceConfidence(evidence);
    
    const framework = this.createFrameworkInfo(
      'Helm',
      'build_tool',
      confidence,
      evidence,
      helmInfo?.version || undefined
    );

    // Add helm-specific metadata
    framework.metadata = {
      ...framework.metadata,
      containerType: 'helm',
      chartName: helmInfo?.name,
      chartVersion: helmInfo?.version,
      hasValues: helmInfo?.hasValues
    };

    const buildTool: BuildToolInfo | undefined = helmInfo ? {
      name: 'Helm',
      configFile: 'Chart.yaml',
      commands: [
        {
          name: 'install',
          command: 'helm install ${RELEASE_NAME} .',
          description: 'Install Helm chart',
          isPrimary: true
        },
        {
          name: 'upgrade',
          command: 'helm upgrade ${RELEASE_NAME} .',
          description: 'Upgrade Helm release',
          isPrimary: false
        },
        {
          name: 'package',
          command: 'helm package .',
          description: 'Package Helm chart',
          isPrimary: false
        }
      ],
      confidence,
      config: {
        chartName: helmInfo.name,
        version: helmInfo.version
      }
    } : undefined;

    const result: ContainerDetectionResult = {
      framework,
      filesAnalyzed,
      patternsMatched
    };
    
    if (buildTool) {
      result.buildTool = buildTool;
    }

    return result;
  }

  /**
   * Parse Dockerfile content
   */
  private async parseDockerfile(dockerfilePath: string): Promise<DockerfileInfo> {
    const content = await this.fileScanner.readConfigFile(dockerfilePath);
    const lines = content.split('\n').map((line: string) => line.trim()).filter((line: string) => line && !line.startsWith('#'));
    
    const info: DockerfileInfo = {
      baseImage: null,
      exposedPorts: [],
      volumes: [],
      isMultiStage: false,
      version: null
    };

    let stageCount = 0;
    
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      
      if (upperLine.startsWith('FROM ')) {
        stageCount++;
        if (stageCount === 1) {
          const parts = line.split(' ');
          if (parts.length > 1) {
            info.baseImage = parts[1].split(' AS ')[0]; // Handle "FROM image AS stage"
          }
        }
      } else if (upperLine.startsWith('EXPOSE ')) {
        const ports = line.substring(7).split(' ').map((p: string) => parseInt(p.trim())).filter((p: number) => !isNaN(p));
        info.exposedPorts.push(...ports);
      } else if (upperLine.startsWith('VOLUME ')) {
        const volume = line.substring(7).trim().replace(/["\[\]]/g, '');
        info.volumes.push(volume);
      }
    }
    
    info.isMultiStage = stageCount > 1;
    
    return info;
  }

  /**
   * Parse docker-compose.yml content
   */
  private async parseDockerCompose(composePath: string): Promise<DockerComposeInfo> {
    const content = await this.fileScanner.readConfigFile(composePath);
    
    const info: DockerComposeInfo = {
      version: content.version || null,
      services: [],
      networks: [],
      volumes: []
    };

    if (content.services) {
      info.services = Object.keys(content.services);
    }

    if (content.networks) {
      info.networks = Object.keys(content.networks);
    }

    if (content.volumes) {
      info.volumes = Object.keys(content.volumes);
    }

    return info;
  }

  /**
   * Parse Kubernetes manifest files
   */
  private async parseKubernetesManifests(projectPath: string, manifestFiles: string[]): Promise<KubernetesInfo> {
    const info: KubernetesInfo = {
      resources: [],
      namespaces: []
    };

    for (const file of manifestFiles) {
      try {
        const content = await this.fileScanner.readConfigFile(join(projectPath, file));
        
        if (content.kind) {
          info.resources.push(content.kind);
        }
        
        if (content.metadata?.namespace) {
          info.namespaces.push(content.metadata.namespace);
        }
      } catch (error) {
        // Skip files that can't be parsed
      }
    }

    // Remove duplicates
    info.resources = [...new Set(info.resources)];
    info.namespaces = [...new Set(info.namespaces)];

    return info;
  }

  /**
   * Parse Helm chart
   */
  private async parseHelmChart(projectPath: string): Promise<HelmInfo> {
    const chartContent = await this.fileScanner.readConfigFile(join(projectPath, 'Chart.yaml'));
    
    const info: HelmInfo = {
      name: chartContent.name || null,
      version: chartContent.version || null,
      hasValues: await this.fileScanner.fileExists(projectPath, 'values.yaml')
    };

    return info;
  }

  /**
   * Calculate confidence based on evidence
   */
  private calculateEvidenceConfidence(evidence: Evidence[]): number {
    if (evidence.length === 0) return 0;
    
    const totalWeight = evidence.reduce((sum, e) => sum + e.weight, 0);
    const maxPossibleWeight = evidence.length * 1.0; // Assuming max weight is 1.0
    
    return Math.min(totalWeight / maxPossibleWeight, 1.0);
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(frameworks: FrameworkInfo[]): number {
    if (frameworks.length === 0) return 0;
    return Math.max(...frameworks.map(f => f.confidence));
  }

  /**
   * Generate recommendations based on detected frameworks
   */
  private generateRecommendations(frameworks: FrameworkInfo[], warnings: string[]): string[] {
    const recommendations: string[] = [];

    const hasDocker = frameworks.some(f => f.name === 'Docker');
    const hasCompose = frameworks.some(f => f.name === 'Docker Compose');
    const hasK8s = frameworks.some(f => f.name === 'Kubernetes');
    const hasHelm = frameworks.some(f => f.name === 'Helm');

    if (hasDocker && !hasCompose && frameworks.length === 1) {
      recommendations.push('Consider using Docker Compose for multi-container development environments');
    }

    if (hasCompose && hasK8s) {
      recommendations.push('Consider using Docker Compose for development and Kubernetes for production');
    }

    if (hasK8s && !hasHelm) {
      recommendations.push('Consider using Helm for easier Kubernetes application management');
    }

    if (hasDocker || hasCompose) {
      recommendations.push('Add .dockerignore file to optimize build context');
      recommendations.push('Use multi-stage builds to reduce image size');
      recommendations.push('Consider using specific image tags instead of latest');
    }

    if (warnings.length > 0) {
      recommendations.push('Review container configuration warnings for potential issues');
    }

    return recommendations;
  }

  generateCISteps(frameworks: FrameworkInfo[]): CIStep[] {
    // TODO: Implement CI step generation for containers
    // This will be implemented in task 11
    return [];
  }
}

// Supporting interfaces
interface ContainerDetectionResult {
  framework: FrameworkInfo;
  buildTool?: BuildToolInfo;
  filesAnalyzed: string[];
  patternsMatched: string[];
}

interface DockerfileInfo {
  baseImage: string | null;
  exposedPorts: number[];
  volumes: string[];
  isMultiStage: boolean;
  version: string | null;
}

interface DockerComposeInfo {
  version: string | null;
  services: string[];
  networks: string[];
  volumes: string[];
}

interface KubernetesInfo {
  resources: string[];
  namespaces: string[];
}

interface HelmInfo {
  name: string | null;
  version: string | null;
  hasValues: boolean;
}