/**
 * Operational Documentation Manager
 * 
 * Provides comprehensive documentation and training materials for system
 * administrators and operations teams managing production deployments.
 */

import { Logger } from '../../cli/lib/logger';
import { Result, success, failure } from '../../shared/types/result';
import { ConfigurationManager } from '../configuration/configuration-manager';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Documentation types
 */
export interface DocumentationConfig {
  id: string;
  title: string;
  description: string;
  type: 'guide' | 'reference' | 'tutorial' | 'troubleshooting' | 'api' | 'runbook';
  category: 'deployment' | 'monitoring' | 'security' | 'maintenance' | 'troubleshooting' | 'api';
  audience: 'admin' | 'operator' | 'developer' | 'user' | 'all';
  format: 'markdown' | 'html' | 'pdf' | 'interactive';
  content: DocumentationContent;
  metadata: DocumentationMetadata;
  version: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentationContent {
  sections: DocumentationSection[];
  attachments: Attachment[];
  codeExamples: CodeExample[];
  diagrams: Diagram[];
  videos: VideoContent[];
}

export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  subsections: DocumentationSection[];
  order: number;
  tags: string[];
}

export interface Attachment {
  id: string;
  name: string;
  type: 'file' | 'link' | 'image';
  url: string;
  description: string;
  size?: number;
}

export interface CodeExample {
  id: string;
  title: string;
  language: string;
  code: string;
  description: string;
  runnable: boolean;
  dependencies?: string[];
}

export interface Diagram {
  id: string;
  title: string;
  type: 'flowchart' | 'sequence' | 'architecture' | 'network' | 'deployment';
  format: 'mermaid' | 'plantuml' | 'image';
  content: string;
  description: string;
}

export interface VideoContent {
  id: string;
  title: string;
  url: string;
  duration: number; // seconds
  description: string;
  transcript?: string;
}

export interface DocumentationMetadata {
  author: string;
  reviewers: string[];
  tags: string[];
  keywords: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedReadTime: number; // minutes
  prerequisites: string[];
  relatedDocs: string[];
  lastReviewed: Date;
  reviewFrequency: number; // days
}

/**
 * Training material types
 */
export interface TrainingMaterial {
  id: string;
  title: string;
  description: string;
  type: 'course' | 'workshop' | 'certification' | 'assessment' | 'simulation';
  category: 'onboarding' | 'advanced' | 'certification' | 'troubleshooting' | 'best-practices';
  audience: 'admin' | 'operator' | 'developer' | 'manager' | 'all';
  format: 'interactive' | 'video' | 'hands-on' | 'reading' | 'mixed';
  content: TrainingContent;
  assessment: Assessment;
  certification: CertificationConfig;
  metadata: TrainingMetadata;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingContent {
  modules: TrainingModule[];
  resources: TrainingResource[];
  exercises: Exercise[];
  labs: LabExercise[];
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  content: string;
  duration: number; // minutes
  objectives: string[];
  prerequisites: string[];
  order: number;
}

export interface TrainingResource {
  id: string;
  title: string;
  type: 'document' | 'video' | 'link' | 'tool';
  url: string;
  description: string;
  required: boolean;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'practical' | 'scenario' | 'simulation';
  instructions: string;
  expectedOutcome: string;
  timeLimit?: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface LabExercise {
  id: string;
  title: string;
  description: string;
  environment: LabEnvironment;
  instructions: LabInstruction[];
  validation: LabValidation[];
  cleanup: string[];
  estimatedTime: number; // minutes
}

export interface LabEnvironment {
  type: 'docker' | 'kubernetes' | 'vm' | 'cloud' | 'local';
  requirements: EnvironmentRequirement[];
  setup: string[];
  teardown: string[];
}

export interface EnvironmentRequirement {
  name: string;
  version?: string;
  optional: boolean;
  description: string;
}

export interface LabInstruction {
  step: number;
  title: string;
  description: string;
  command?: string;
  expectedOutput?: string;
  hints: string[];
}

export interface LabValidation {
  step: number;
  type: 'command' | 'file' | 'service' | 'custom';
  validation: string;
  expectedResult: string;
  errorMessage: string;
}

export interface Assessment {
  enabled: boolean;
  passingScore: number; // percentage
  questions: AssessmentQuestion[];
  timeLimit?: number; // minutes
  retakePolicy: RetakePolicy;
}

export interface AssessmentQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'practical';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface RetakePolicy {
  allowed: boolean;
  maxAttempts: number;
  cooldownPeriod: number; // hours
}

export interface CertificationConfig {
  enabled: boolean;
  name: string;
  description: string;
  validityPeriod: number; // days
  renewalRequired: boolean;
  prerequisites: string[];
  requirements: CertificationRequirement[];
}

export interface CertificationRequirement {
  type: 'assessment' | 'practical' | 'experience' | 'training';
  description: string;
  minimumScore?: number;
  required: boolean;
}

export interface TrainingMetadata {
  author: string;
  instructors: string[];
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedDuration: number; // hours
  prerequisites: string[];
  learningObjectives: string[];
  lastUpdated: Date;
  version: string;
}

/**
 * Documentation search and indexing
 */
export interface SearchIndex {
  documentId: string;
  title: string;
  content: string;
  tags: string[];
  keywords: string[];
  type: string;
  category: string;
  audience: string;
  lastIndexed: Date;
}

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  pagination?: SearchPagination;
  sorting?: SearchSorting;
}

export interface SearchFilters {
  type?: string[];
  category?: string[];
  audience?: string[];
  difficulty?: string[];
  tags?: string[];
}

export interface SearchPagination {
  page: number;
  limit: number;
}

export interface SearchSorting {
  field: 'relevance' | 'date' | 'title' | 'popularity';
  order: 'asc' | 'desc';
}

export interface SearchResult {
  documentId: string;
  title: string;
  description: string;
  type: string;
  category: string;
  relevanceScore: number;
  highlights: string[];
  url: string;
}

/**
 * Operational documentation manager
 */
export class OperationalDocumentationManager {
  private logger: Logger;
  private configManager: ConfigurationManager;
  private documentation: Map<string, DocumentationConfig> = new Map();
  private trainingMaterials: Map<string, TrainingMaterial> = new Map();
  private searchIndex: Map<string, SearchIndex> = new Map();
  private documentationPath: string;
  private trainingPath: string;

  constructor(
    logger: Logger,
    configManager: ConfigurationManager,
    documentationPath?: string,
    trainingPath?: string
  ) {
    this.logger = logger;
    this.configManager = configManager;
    this.documentationPath = documentationPath || path.join(process.cwd(), 'docs');
    this.trainingPath = trainingPath || path.join(process.cwd(), 'training');
  }

  /**
   * Initialize the operational documentation manager
   */
  async initialize(): Promise<Result<void>> {
    try {
      this.logger.info('Initializing OperationalDocumentationManager...');

      // Ensure directories exist
      await fs.mkdir(this.documentationPath, { recursive: true });
      await fs.mkdir(this.trainingPath, { recursive: true });

      // Load existing documentation
      await this.loadDocumentation();
      await this.loadTrainingMaterials();

      // Initialize default content if none exists
      if (this.documentation.size === 0) {
        await this.initializeDefaultDocumentation();
      }

      if (this.trainingMaterials.size === 0) {
        await this.initializeDefaultTrainingMaterials();
      }

      // Build search index
      await this.buildSearchIndex();

      this.logger.info('OperationalDocumentationManager initialized successfully', {
        documentationCount: this.documentation.size,
        trainingMaterialsCount: this.trainingMaterials.size,
        searchIndexSize: this.searchIndex.size
      });

      return success(undefined);

    } catch (error) {
      const errorMessage = `Failed to initialize OperationalDocumentationManager: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage, { error });
      return failure(new Error(errorMessage));
    }
  }

  /**
   * Create documentation
   */
  async createDocumentation(config: Omit<DocumentationConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docId = `doc-${Date.now()}`;
    const documentation: DocumentationConfig = {
      ...config,
      id: docId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.documentation.set(docId, documentation);
    await this.saveDocumentation(documentation);
    await this.updateSearchIndex(documentation);

    this.logger.info('Documentation created', {
      docId,
      title: documentation.title,
      type: documentation.type,
      category: documentation.category
    });

    return docId;
  }

  /**
   * Create training material
   */
  async createTrainingMaterial(material: Omit<TrainingMaterial, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const materialId = `training-${Date.now()}`;
    const trainingMaterial: TrainingMaterial = {
      ...material,
      id: materialId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.trainingMaterials.set(materialId, trainingMaterial);
    await this.saveTrainingMaterial(trainingMaterial);
    await this.updateSearchIndex(trainingMaterial);

    this.logger.info('Training material created', {
      materialId,
      title: trainingMaterial.title,
      type: trainingMaterial.type,
      category: trainingMaterial.category
    });

    return materialId;
  }

  /**
   * Search documentation and training materials
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchTerms = query.query.toLowerCase().split(' ');

    for (const [id, index] of this.searchIndex.entries()) {
      // Apply filters
      if (query.filters) {
        if (query.filters.type && !query.filters.type.includes(index.type)) continue;
        if (query.filters.category && !query.filters.category.includes(index.category)) continue;
        if (query.filters.audience && !query.filters.audience.includes(index.audience)) continue;
        if (query.filters.tags && !query.filters.tags.some(tag => index.tags.includes(tag))) continue;
      }

      // Calculate relevance score
      let relevanceScore = 0;
      const highlights: string[] = [];

      // Title matching (highest weight)
      const titleLower = index.title.toLowerCase();
      for (const term of searchTerms) {
        if (titleLower.includes(term)) {
          relevanceScore += 10;
          highlights.push(`Title: ...${this.highlightTerm(index.title, term)}...`);
        }
      }

      // Content matching
      const contentLower = index.content.toLowerCase();
      for (const term of searchTerms) {
        const matches = (contentLower.match(new RegExp(term, 'g')) || []).length;
        relevanceScore += matches * 2;
        
        if (matches > 0) {
          const contextStart = Math.max(0, contentLower.indexOf(term) - 50);
          const contextEnd = Math.min(index.content.length, contentLower.indexOf(term) + term.length + 50);
          const context = index.content.substring(contextStart, contextEnd);
          highlights.push(`Content: ...${this.highlightTerm(context, term)}...`);
        }
      }

      // Keywords and tags matching
      for (const term of searchTerms) {
        if (index.keywords.some(keyword => keyword.toLowerCase().includes(term))) {
          relevanceScore += 5;
        }
        if (index.tags.some(tag => tag.toLowerCase().includes(term))) {
          relevanceScore += 3;
        }
      }

      if (relevanceScore > 0) {
        results.push({
          documentId: index.documentId,
          title: index.title,
          description: this.getDocumentDescription(index.documentId),
          type: index.type,
          category: index.category,
          relevanceScore,
          highlights: highlights.slice(0, 3), // Limit highlights
          url: this.getDocumentUrl(index.documentId)
        });
      }
    }

    // Sort by relevance score
    results.sort((a, b) => {
      if (query.sorting?.field === 'relevance' || !query.sorting) {
        return query.sorting?.order === 'asc' ? a.relevanceScore - b.relevanceScore : b.relevanceScore - a.relevanceScore;
      }
      // Add other sorting options as needed
      return 0;
    });

    // Apply pagination
    if (query.pagination) {
      const start = (query.pagination.page - 1) * query.pagination.limit;
      const end = start + query.pagination.limit;
      return results.slice(start, end);
    }

    return results;
  }

  /**
   * Get documentation by ID
   */
  async getDocumentation(docId: string): Promise<DocumentationConfig | null> {
    return this.documentation.get(docId) || null;
  }

  /**
   * Get training material by ID
   */
  async getTrainingMaterial(materialId: string): Promise<TrainingMaterial | null> {
    return this.trainingMaterials.get(materialId) || null;
  }

  /**
   * List documentation
   */
  async listDocumentation(filters?: { type?: string; category?: string; audience?: string }): Promise<DocumentationConfig[]> {
    let docs = Array.from(this.documentation.values());

    if (filters) {
      if (filters.type) {
        docs = docs.filter(d => d.type === filters.type);
      }
      if (filters.category) {
        docs = docs.filter(d => d.category === filters.category);
      }
      if (filters.audience) {
        docs = docs.filter(d => d.audience === filters.audience || d.audience === 'all');
      }
    }

    return docs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * List training materials
   */
  async listTrainingMaterials(filters?: { type?: string; category?: string; audience?: string }): Promise<TrainingMaterial[]> {
    let materials = Array.from(this.trainingMaterials.values());

    if (filters) {
      if (filters.type) {
        materials = materials.filter(m => m.type === filters.type);
      }
      if (filters.category) {
        materials = materials.filter(m => m.category === filters.category);
      }
      if (filters.audience) {
        materials = materials.filter(m => m.audience === filters.audience || m.audience === 'all');
      }
    }

    return materials.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Generate documentation from templates
   */
  async generateDocumentationFromTemplate(templateType: string, context: Record<string, any>): Promise<Result<string>> {
    try {
      const template = await this.getDocumentationTemplate(templateType);
      if (!template) {
        return failure(new Error(`Template not found: ${templateType}`));
      }

      const generatedContent = this.processTemplate(template, context);
      
      const docConfig: Omit<DocumentationConfig, 'id' | 'createdAt' | 'updatedAt'> = {
        title: context.title || `Generated ${templateType}`,
        description: context.description || `Auto-generated documentation from ${templateType} template`,
        type: 'guide',
        category: context.category || 'deployment',
        audience: context.audience || 'admin',
        format: 'markdown',
        content: {
          sections: [
            {
              id: 'main',
              title: 'Main Content',
              content: generatedContent,
              subsections: [],
              order: 1,
              tags: []
            }
          ],
          attachments: [],
          codeExamples: [],
          diagrams: [],
          videos: []
        },
        metadata: {
          author: 'system',
          reviewers: [],
          tags: context.tags || [],
          keywords: context.keywords || [],
          difficulty: context.difficulty || 'intermediate',
          estimatedReadTime: Math.ceil(generatedContent.length / 200), // Rough estimate
          prerequisites: context.prerequisites || [],
          relatedDocs: [],
          lastReviewed: new Date(),
          reviewFrequency: 30
        },
        version: '1.0.0',
        status: 'draft'
      };

      const docId = await this.createDocumentation(docConfig);
      return success(docId);

    } catch (error) {
      const errorMessage = `Failed to generate documentation: ${error instanceof Error ? error.message : String(error)}`;
      return failure(new Error(errorMessage));
    }
  }

  /**
   * Export documentation
   */
  async exportDocumentation(docId: string, format: 'markdown' | 'html' | 'pdf'): Promise<Result<string>> {
    const doc = this.documentation.get(docId);
    if (!doc) {
      return failure(new Error(`Documentation not found: ${docId}`));
    }

    try {
      let exportedContent: string;

      switch (format) {
        case 'markdown':
          exportedContent = await this.exportToMarkdown(doc);
          break;
        case 'html':
          exportedContent = await this.exportToHTML(doc);
          break;
        case 'pdf':
          exportedContent = await this.exportToPDF(doc);
          break;
        default:
          return failure(new Error(`Unsupported export format: ${format}`));
      }

      return success(exportedContent);

    } catch (error) {
      const errorMessage = `Failed to export documentation: ${error instanceof Error ? error.message : String(error)}`;
      return failure(new Error(errorMessage));
    }
  }

  // Private helper methods

  private async loadDocumentation(): Promise<void> {
    try {
      const files = await fs.readdir(this.documentationPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.documentationPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const doc = JSON.parse(content) as DocumentationConfig;
          
          // Convert date strings back to Date objects
          doc.createdAt = new Date(doc.createdAt);
          doc.updatedAt = new Date(doc.updatedAt);
          doc.metadata.lastReviewed = new Date(doc.metadata.lastReviewed);
          
          this.documentation.set(doc.id, doc);
          
        } catch (error) {
          this.logger.warn('Failed to load documentation file', {
            file,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      this.logger.info('Loaded documentation', { count: this.documentation.size });

    } catch (error) {
      this.logger.warn('Failed to load documentation directory', {
        path: this.documentationPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async loadTrainingMaterials(): Promise<void> {
    try {
      const files = await fs.readdir(this.trainingPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.trainingPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const material = JSON.parse(content) as TrainingMaterial;
          
          // Convert date strings back to Date objects
          material.createdAt = new Date(material.createdAt);
          material.updatedAt = new Date(material.updatedAt);
          material.metadata.lastUpdated = new Date(material.metadata.lastUpdated);
          
          this.trainingMaterials.set(material.id, material);
          
        } catch (error) {
          this.logger.warn('Failed to load training material file', {
            file,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      this.logger.info('Loaded training materials', { count: this.trainingMaterials.size });

    } catch (error) {
      this.logger.warn('Failed to load training materials directory', {
        path: this.trainingPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async initializeDefaultDocumentation(): Promise<void> {
    const defaultDocs: Omit<DocumentationConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'Production Deployment Guide',
        description: 'Comprehensive guide for deploying the readme-to-cicd system to production',
        type: 'guide',
        category: 'deployment',
        audience: 'admin',
        format: 'markdown',
        content: {
          sections: [
            {
              id: 'overview',
              title: 'Overview',
              content: 'This guide covers the complete process of deploying the readme-to-cicd system to production environments.',
              subsections: [],
              order: 1,
              tags: ['overview']
            },
            {
              id: 'prerequisites',
              title: 'Prerequisites',
              content: '- Kubernetes cluster (v1.20+)\n- Docker registry access\n- SSL certificates\n- Database instance',
              subsections: [],
              order: 2,
              tags: ['prerequisites']
            },
            {
              id: 'deployment-steps',
              title: 'Deployment Steps',
              content: '1. Configure environment variables\n2. Deploy database\n3. Deploy application\n4. Configure load balancer\n5. Set up monitoring',
              subsections: [],
              order: 3,
              tags: ['deployment']
            }
          ],
          attachments: [],
          codeExamples: [
            {
              id: 'kubectl-deploy',
              title: 'Kubernetes Deployment',
              language: 'bash',
              code: 'kubectl apply -f deployment.yaml\nkubectl rollout status deployment/readme-to-cicd',
              description: 'Deploy the application to Kubernetes',
              runnable: true,
              dependencies: ['kubectl']
            }
          ],
          diagrams: [
            {
              id: 'deployment-arch',
              title: 'Deployment Architecture',
              type: 'architecture',
              format: 'mermaid',
              content: 'graph TD\n    A[Load Balancer] --> B[App Pods]\n    B --> C[Database]\n    B --> D[Cache]',
              description: 'High-level deployment architecture'
            }
          ],
          videos: []
        },
        metadata: {
          author: 'system',
          reviewers: [],
          tags: ['deployment', 'production', 'kubernetes'],
          keywords: ['deploy', 'production', 'kubernetes', 'docker'],
          difficulty: 'intermediate',
          estimatedReadTime: 15,
          prerequisites: ['kubernetes-knowledge', 'docker-experience'],
          relatedDocs: [],
          lastReviewed: new Date(),
          reviewFrequency: 30
        },
        version: '1.0.0',
        status: 'published'
      },
      {
        title: 'System Monitoring and Alerting',
        description: 'Guide for monitoring system health and configuring alerts',
        type: 'guide',
        category: 'monitoring',
        audience: 'operator',
        format: 'markdown',
        content: {
          sections: [
            {
              id: 'monitoring-overview',
              title: 'Monitoring Overview',
              content: 'The system provides comprehensive monitoring through Prometheus, Grafana, and custom dashboards.',
              subsections: [],
              order: 1,
              tags: ['monitoring']
            },
            {
              id: 'key-metrics',
              title: 'Key Metrics',
              content: '- Response time\n- Error rate\n- CPU and memory usage\n- Database performance\n- Cache hit rate',
              subsections: [],
              order: 2,
              tags: ['metrics']
            },
            {
              id: 'alerting-rules',
              title: 'Alerting Rules',
              content: 'Configure alerts for critical system events and performance thresholds.',
              subsections: [],
              order: 3,
              tags: ['alerting']
            }
          ],
          attachments: [],
          codeExamples: [
            {
              id: 'prometheus-config',
              title: 'Prometheus Configuration',
              language: 'yaml',
              code: 'global:\n  scrape_interval: 15s\nscrape_configs:\n  - job_name: "readme-to-cicd"\n    static_configs:\n      - targets: ["app:8080"]',
              description: 'Basic Prometheus configuration',
              runnable: false
            }
          ],
          diagrams: [],
          videos: []
        },
        metadata: {
          author: 'system',
          reviewers: [],
          tags: ['monitoring', 'alerting', 'prometheus', 'grafana'],
          keywords: ['monitor', 'alert', 'metrics', 'dashboard'],
          difficulty: 'intermediate',
          estimatedReadTime: 20,
          prerequisites: ['monitoring-tools-knowledge'],
          relatedDocs: [],
          lastReviewed: new Date(),
          reviewFrequency: 30
        },
        version: '1.0.0',
        status: 'published'
      }
    ];

    for (const docConfig of defaultDocs) {
      await this.createDocumentation(docConfig);
    }

    this.logger.info('Initialized default documentation', { count: defaultDocs.length });
  }

  private async initializeDefaultTrainingMaterials(): Promise<void> {
    const defaultMaterials: Omit<TrainingMaterial, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'System Administrator Onboarding',
        description: 'Complete onboarding course for new system administrators',
        type: 'course',
        category: 'onboarding',
        audience: 'admin',
        format: 'mixed',
        content: {
          modules: [
            {
              id: 'intro',
              title: 'Introduction to README-to-CICD',
              description: 'Overview of the system architecture and components',
              content: 'This module introduces the README-to-CICD system...',
              duration: 30,
              objectives: ['Understand system architecture', 'Identify key components'],
              prerequisites: [],
              order: 1
            },
            {
              id: 'deployment',
              title: 'Deployment Procedures',
              description: 'Learn how to deploy and manage the system',
              content: 'This module covers deployment procedures...',
              duration: 45,
              objectives: ['Deploy system components', 'Manage deployments'],
              prerequisites: ['intro'],
              order: 2
            }
          ],
          resources: [
            {
              id: 'deployment-guide',
              title: 'Production Deployment Guide',
              type: 'document',
              url: '/docs/deployment-guide',
              description: 'Comprehensive deployment documentation',
              required: true
            }
          ],
          exercises: [
            {
              id: 'deploy-exercise',
              title: 'Deploy to Staging',
              description: 'Practice deploying the system to a staging environment',
              type: 'practical',
              instructions: 'Follow the deployment guide to deploy to staging',
              expectedOutcome: 'System successfully deployed and accessible',
              timeLimit: 60,
              difficulty: 'medium'
            }
          ],
          labs: [
            {
              id: 'troubleshooting-lab',
              title: 'Troubleshooting Common Issues',
              description: 'Hands-on lab for troubleshooting system issues',
              environment: {
                type: 'kubernetes',
                requirements: [
                  {
                    name: 'kubectl',
                    version: '1.20+',
                    optional: false,
                    description: 'Kubernetes CLI tool'
                  }
                ],
                setup: ['kubectl apply -f lab-environment.yaml'],
                teardown: ['kubectl delete -f lab-environment.yaml']
              },
              instructions: [
                {
                  step: 1,
                  title: 'Identify the Issue',
                  description: 'Use kubectl to identify the failing component',
                  command: 'kubectl get pods',
                  expectedOutput: 'List of pods with status',
                  hints: ['Look for pods with Error or CrashLoopBackOff status']
                }
              ],
              validation: [
                {
                  step: 1,
                  type: 'command',
                  validation: 'kubectl get pods | grep -c Running',
                  expectedResult: '3',
                  errorMessage: 'Not all pods are running'
                }
              ],
              cleanup: ['kubectl delete pod --all'],
              estimatedTime: 30
            }
          ]
        },
        assessment: {
          enabled: true,
          passingScore: 80,
          questions: [
            {
              id: 'q1',
              type: 'multiple-choice',
              question: 'What is the primary purpose of the README-to-CICD system?',
              options: [
                'Generate documentation',
                'Automate CI/CD pipeline creation',
                'Monitor system performance',
                'Manage user accounts'
              ],
              correctAnswer: 'Automate CI/CD pipeline creation',
              explanation: 'The system automatically generates CI/CD pipelines from README files',
              points: 10,
              difficulty: 'easy'
            }
          ],
          timeLimit: 60,
          retakePolicy: {
            allowed: true,
            maxAttempts: 3,
            cooldownPeriod: 24
          }
        },
        certification: {
          enabled: true,
          name: 'README-to-CICD System Administrator',
          description: 'Certified administrator for the README-to-CICD system',
          validityPeriod: 365,
          renewalRequired: true,
          prerequisites: [],
          requirements: [
            {
              type: 'assessment',
              description: 'Pass the system administrator assessment',
              minimumScore: 80,
              required: true
            },
            {
              type: 'practical',
              description: 'Complete hands-on deployment exercise',
              required: true
            }
          ]
        },
        metadata: {
          author: 'system',
          instructors: ['admin@example.com'],
          tags: ['onboarding', 'admin', 'deployment'],
          difficulty: 'intermediate',
          estimatedDuration: 4, // hours
          prerequisites: ['basic-kubernetes-knowledge'],
          learningObjectives: [
            'Deploy and manage the README-to-CICD system',
            'Troubleshoot common issues',
            'Monitor system health'
          ],
          lastUpdated: new Date(),
          version: '1.0.0'
        },
        status: 'published'
      }
    ];

    for (const materialConfig of defaultMaterials) {
      await this.createTrainingMaterial(materialConfig);
    }

    this.logger.info('Initialized default training materials', { count: defaultMaterials.length });
  }

  private async saveDocumentation(doc: DocumentationConfig): Promise<void> {
    const filePath = path.join(this.documentationPath, `${doc.id}.json`);
    const content = JSON.stringify(doc, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async saveTrainingMaterial(material: TrainingMaterial): Promise<void> {
    const filePath = path.join(this.trainingPath, `${material.id}.json`);
    const content = JSON.stringify(material, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async buildSearchIndex(): Promise<void> {
    this.searchIndex.clear();

    // Index documentation
    for (const doc of this.documentation.values()) {
      const content = doc.content.sections.map(s => s.content).join(' ');
      
      this.searchIndex.set(doc.id, {
        documentId: doc.id,
        title: doc.title,
        content,
        tags: doc.metadata.tags,
        keywords: doc.metadata.keywords,
        type: doc.type,
        category: doc.category,
        audience: doc.audience,
        lastIndexed: new Date()
      });
    }

    // Index training materials
    for (const material of this.trainingMaterials.values()) {
      const content = material.content.modules.map(m => m.content).join(' ');
      
      this.searchIndex.set(material.id, {
        documentId: material.id,
        title: material.title,
        content,
        tags: material.metadata.tags,
        keywords: [],
        type: material.type,
        category: material.category,
        audience: material.audience,
        lastIndexed: new Date()
      });
    }

    this.logger.info('Search index built', { size: this.searchIndex.size });
  }

  private async updateSearchIndex(item: DocumentationConfig | TrainingMaterial): Promise<void> {
    let content: string;
    let type: string;
    let category: string;
    let audience: string;
    let tags: string[];

    if ('content' in item && 'sections' in item.content) {
      // Documentation
      const doc = item as DocumentationConfig;
      content = doc.content.sections.map(s => s.content).join(' ');
      type = doc.type;
      category = doc.category;
      audience = doc.audience;
      tags = doc.metadata.tags;
    } else {
      // Training material
      const material = item as TrainingMaterial;
      content = material.content.modules.map(m => m.content).join(' ');
      type = material.type;
      category = material.category;
      audience = material.audience;
      tags = material.metadata.tags;
    }

    this.searchIndex.set(item.id, {
      documentId: item.id,
      title: item.title,
      content,
      tags,
      keywords: [],
      type,
      category,
      audience,
      lastIndexed: new Date()
    });
  }

  private highlightTerm(text: string, term: string): string {
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  private getDocumentDescription(docId: string): string {
    const doc = this.documentation.get(docId);
    if (doc) {
      return doc.description;
    }

    const material = this.trainingMaterials.get(docId);
    if (material) {
      return material.description;
    }

    return 'No description available';
  }

  private getDocumentUrl(docId: string): string {
    const doc = this.documentation.get(docId);
    if (doc) {
      return `/docs/${docId}`;
    }

    const material = this.trainingMaterials.get(docId);
    if (material) {
      return `/training/${docId}`;
    }

    return '#';
  }

  private async getDocumentationTemplate(templateType: string): Promise<string | null> {
    // In a real implementation, this would load templates from files
    const templates: Record<string, string> = {
      'deployment-guide': `# {{title}}

## Overview
{{description}}

## Prerequisites
{{#each prerequisites}}
- {{this}}
{{/each}}

## Deployment Steps
{{#each deploymentSteps}}
### {{@index}}. {{title}}
{{description}}

\`\`\`bash
{{command}}
\`\`\`
{{/each}}

## Troubleshooting
{{troubleshooting}}

## Next Steps
{{nextSteps}}`,

      'troubleshooting-guide': `# {{title}} Troubleshooting Guide

## Common Issues

{{#each issues}}
### {{symptom}}
**Cause:** {{cause}}
**Solution:** {{solution}}
**Prevention:** {{prevention}}
{{/each}}

## Diagnostic Commands
{{#each diagnosticCommands}}
- \`{{this}}\`
{{/each}}

## Escalation Procedure
{{escalationProcedure}}`
    };

    return templates[templateType] || null;
  }

  private processTemplate(template: string, context: Record<string, any>): string {
    // Simple template processing - in a real implementation, use a proper template engine
    let processed = template;

    // Replace simple variables
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(value));
    }

    // Handle arrays (simplified)
    const arrayRegex = /{{#each (\w+)}}([\s\S]*?){{\/each}}/g;
    processed = processed.replace(arrayRegex, (match, arrayName, content) => {
      const array = context[arrayName];
      if (Array.isArray(array)) {
        return array.map((item, index) => {
          let itemContent = content;
          if (typeof item === 'object') {
            for (const [key, value] of Object.entries(item)) {
              itemContent = itemContent.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
            }
          } else {
            itemContent = itemContent.replace(/{{this}}/g, String(item));
          }
          itemContent = itemContent.replace(/{{@index}}/g, String(index + 1));
          return itemContent;
        }).join('');
      }
      return '';
    });

    return processed;
  }

  private async exportToMarkdown(doc: DocumentationConfig): Promise<string> {
    let markdown = `# ${doc.title}\n\n`;
    markdown += `${doc.description}\n\n`;

    for (const section of doc.content.sections) {
      markdown += `## ${section.title}\n\n`;
      markdown += `${section.content}\n\n`;
    }

    // Add code examples
    if (doc.content.codeExamples.length > 0) {
      markdown += `## Code Examples\n\n`;
      for (const example of doc.content.codeExamples) {
        markdown += `### ${example.title}\n\n`;
        markdown += `${example.description}\n\n`;
        markdown += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
      }
    }

    return markdown;
  }

  private async exportToHTML(doc: DocumentationConfig): Promise<string> {
    // Simple HTML export - in a real implementation, use a proper markdown-to-HTML converter
    const markdown = await this.exportToMarkdown(doc);
    
    let html = `<!DOCTYPE html>
<html>
<head>
    <title>${doc.title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
        code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>`;

    // Convert markdown to HTML (simplified)
    html += markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/```(\w+)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');

    html += `</body></html>`;
    return html;
  }

  private async exportToPDF(doc: DocumentationConfig): Promise<string> {
    // PDF export would require a PDF generation library
    // For now, return a placeholder
    return `PDF export not implemented. Document: ${doc.title}`;
  }
}