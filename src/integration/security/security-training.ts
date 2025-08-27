/**
 * Security Training
 * Manages security training programs, certifications, and awareness campaigns
 */

import {
  ISecurityTraining,
  TrainingProgress,
  Certificate,
  TrainingMetrics,
  AwarenessCampaign
} from './interfaces';
import {
  TrainingConfig,
  TrainingProgram,
  TrainingModule,
  CertificationConfig,
  AwarenessConfig
} from './types';
import { logger } from '../../shared/logging/central-logger';

export class SecurityTraining implements ISecurityTraining {
  private config: TrainingConfig;
  private initialized: boolean = false;
  private programs: Map<string, TrainingProgram> = new Map();
  private enrollments: Map<string, any> = new Map();
  private certificates: Map<string, Certificate> = new Map();
  private campaigns: Map<string, AwarenessCampaign> = new Map();

  constructor() {
  }

  async initialize(config: TrainingConfig): Promise<void> {
    try {
      this.config = config;

      // Load training programs
      await this.loadTrainingPrograms();
      
      // Initialize certification system
      await this.initializeCertificationSystem();
      
      // Initialize awareness campaigns
      await this.initializeAwarenessCampaigns();
      
      // Initialize tracking system
      await this.initializeTrackingSystem();

      this.initialized = true;
      logger.info('SecurityTraining initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize SecurityTraining', { error });
      throw error;
    }
  }

  async createProgram(program: TrainingProgram): Promise<string> {
    try {
      if (!this.initialized) {
        throw new Error('SecurityTraining not initialized');
      }

      // Validate program
      const validation = this.validateProgram(program);
      if (!validation.valid) {
        throw new Error(`Invalid training program: ${validation.errors.join(', ')}`);
      }

      // Generate program ID
      const programId = this.generateProgramId();
      program.id = programId;

      // Store program
      this.programs.set(programId, program);

      logger.info('Training program created', {
        programId,
        name: program.name,
        modules: program.modules.length,
        mandatory: program.mandatory
      });

      return programId;
      
    } catch (error) {
      logger.error('Failed to create training program', { error });
      throw error;
    }
  }

  async enrollUser(userId: string, programId: string): Promise<void> {
    try {
      if (!this.initialized) {
        throw new Error('SecurityTraining not initialized');
      }

      const program = this.programs.get(programId);
      if (!program) {
        throw new Error(`Training program not found: ${programId}`);
      }

      // Check if user is already enrolled
      const enrollmentKey = `${userId}-${programId}`;
      if (this.enrollments.has(enrollmentKey)) {
        logger.warn('User already enrolled in program', { userId, programId });
        return;
      }

      // Create enrollment
      const enrollment = {
        userId,
        programId,
        enrolledAt: new Date(),
        progress: 0,
        completedModules: [],
        currentModule: program.modules[0]?.id,
        status: 'enrolled'
      };

      this.enrollments.set(enrollmentKey, enrollment);

      logger.info('User enrolled in training program', {
        userId,
        programId,
        programName: program.name
      });
      
    } catch (error) {
      logger.error('Failed to enroll user in training program', { error, userId, programId });
      throw error;
    }
  }

  async trackProgress(userId: string, programId: string): Promise<TrainingProgress> {
    try {
      if (!this.initialized) {
        throw new Error('SecurityTraining not initialized');
      }

      const enrollmentKey = `${userId}-${programId}`;
      const enrollment = this.enrollments.get(enrollmentKey);
      
      if (!enrollment) {
        throw new Error(`User not enrolled in program: ${userId} - ${programId}`);
      }

      const program = this.programs.get(programId);
      if (!program) {
        throw new Error(`Training program not found: ${programId}`);
      }

      // Calculate progress
      const totalModules = program.modules.length;
      const completedModules = enrollment.completedModules.length;
      const progress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

      // Estimate completion date
      let estimatedCompletion: Date | undefined;
      if (progress > 0 && progress < 100) {
        const averageTimePerModule = this.calculateAverageModuleTime(program);
        const remainingModules = totalModules - completedModules;
        const estimatedDays = (remainingModules * averageTimePerModule) / (24 * 60); // Convert to days
        estimatedCompletion = new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000);
      }

      const trainingProgress: TrainingProgress = {
        userId,
        programId,
        progress: Math.round(progress),
        completedModules: enrollment.completedModules,
        currentModule: enrollment.currentModule,
        startDate: enrollment.enrolledAt,
        estimatedCompletion
      };

      return trainingProgress;
      
    } catch (error) {
      logger.error('Failed to track training progress', { error, userId, programId });
      throw error;
    }
  }

  async generateCertificate(userId: string, programId: string): Promise<Certificate> {
    try {
      if (!this.initialized) {
        throw new Error('SecurityTraining not initialized');
      }

      const progress = await this.trackProgress(userId, programId);
      
      if (progress.progress < 100) {
        throw new Error('Training program not completed');
      }

      const program = this.programs.get(programId);
      if (!program) {
        throw new Error(`Training program not found: ${programId}`);
      }

      // Check certification requirements
      if (this.config.certification.enabled) {
        const meetsRequirements = await this.checkCertificationRequirements(userId, programId);
        if (!meetsRequirements) {
          throw new Error('Certification requirements not met');
        }
      }

      // Generate certificate
      const certificateId = this.generateCertificateId();
      const issuedDate = new Date();
      const expiryDate = new Date(issuedDate.getTime() + this.config.certification.validity * 24 * 60 * 60 * 1000);

      const certificate: Certificate = {
        id: certificateId,
        userId,
        programId,
        issuedDate,
        expiryDate,
        status: 'valid'
      };

      this.certificates.set(certificateId, certificate);

      logger.info('Certificate generated', {
        certificateId,
        userId,
        programId,
        programName: program.name,
        expiryDate
      });

      return certificate;
      
    } catch (error) {
      logger.error('Failed to generate certificate', { error, userId, programId });
      throw error;
    }
  }

  async getTrainingMetrics(): Promise<TrainingMetrics> {
    try {
      if (!this.initialized) {
        throw new Error('SecurityTraining not initialized');
      }

      const totalEnrollments = this.enrollments.size;
      let completedCount = 0;
      let totalScore = 0;
      let scoreCount = 0;

      // Calculate completion and scores
      for (const enrollment of this.enrollments.values()) {
        const progress = await this.trackProgress(enrollment.userId, enrollment.programId);
        if (progress.progress === 100) {
          completedCount++;
        }

        // Mock assessment scores
        if (enrollment.assessmentScore) {
          totalScore += enrollment.assessmentScore;
          scoreCount++;
        }
      }

      const completionRate = totalEnrollments > 0 ? (completedCount / totalEnrollments) * 100 : 0;
      const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;
      const certificationsCount = this.certificates.size;
      
      // Calculate compliance rate (users with valid certificates)
      const validCertificates = Array.from(this.certificates.values()).filter(c => c.status === 'valid').length;
      const complianceRate = totalEnrollments > 0 ? (validCertificates / totalEnrollments) * 100 : 0;

      const metrics: TrainingMetrics = {
        enrollment: totalEnrollments,
        completion: completedCount,
        certifications: certificationsCount,
        averageScore: Math.round(averageScore),
        complianceRate: Math.round(complianceRate)
      };

      return metrics;
      
    } catch (error) {
      logger.error('Failed to get training metrics', { error });
      throw error;
    }
  }

  async scheduleAwareness(campaign: AwarenessCampaign): Promise<string> {
    try {
      if (!this.initialized) {
        throw new Error('SecurityTraining not initialized');
      }

      const campaignId = this.generateCampaignId();
      campaign.id = campaignId;

      // Initialize campaign metrics
      campaign.metrics = {
        reach: 0,
        engagement: 0,
        completion: 0,
        feedback: 0
      };

      this.campaigns.set(campaignId, campaign);

      logger.info('Awareness campaign scheduled', {
        campaignId,
        name: campaign.name,
        topic: campaign.topic,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        audience: campaign.audience.length
      });

      // Schedule campaign execution
      await this.scheduleCampaignExecution(campaign);

      return campaignId;
      
    } catch (error) {
      logger.error('Failed to schedule awareness campaign', { error });
      throw error;
    }
  }

  // Private helper methods
  private async loadTrainingPrograms(): Promise<void> {
    // Load default security training programs
    await this.loadDefaultPrograms();
    
    // Load custom programs from configuration
    for (const program of this.config.programs) {
      this.programs.set(program.id, program);
    }

    logger.info('Training programs loaded', { count: this.programs.size });
  }

  private async loadDefaultPrograms(): Promise<void> {
    // Security Awareness Fundamentals
    const securityFundamentals: TrainingProgram = {
      id: 'security-fundamentals',
      name: 'Security Awareness Fundamentals',
      description: 'Basic security awareness training covering essential security concepts',
      modules: [
        {
          id: 'password-security',
          name: 'Password Security',
          content: 'Learn about creating strong passwords and password management',
          duration: 30,
          assessment: true
        },
        {
          id: 'phishing-awareness',
          name: 'Phishing Awareness',
          content: 'Identify and avoid phishing attacks',
          duration: 45,
          assessment: true
        },
        {
          id: 'data-protection',
          name: 'Data Protection',
          content: 'Understanding data classification and protection requirements',
          duration: 60,
          assessment: true
        }
      ],
      mandatory: true,
      frequency: 365 // Annual
    };

    // Incident Response Training
    const incidentResponse: TrainingProgram = {
      id: 'incident-response',
      name: 'Incident Response Training',
      description: 'Training on security incident identification and response procedures',
      modules: [
        {
          id: 'incident-identification',
          name: 'Incident Identification',
          content: 'How to identify security incidents',
          duration: 45,
          assessment: true
        },
        {
          id: 'response-procedures',
          name: 'Response Procedures',
          content: 'Step-by-step incident response procedures',
          duration: 90,
          assessment: true
        },
        {
          id: 'communication-protocols',
          name: 'Communication Protocols',
          content: 'Proper communication during security incidents',
          duration: 30,
          assessment: false
        }
      ],
      mandatory: false,
      frequency: 180 // Semi-annual
    };

    // Compliance Training
    const complianceTraining: TrainingProgram = {
      id: 'compliance-training',
      name: 'Compliance and Regulatory Training',
      description: 'Training on compliance requirements and regulatory obligations',
      modules: [
        {
          id: 'gdpr-basics',
          name: 'GDPR Basics',
          content: 'Understanding GDPR requirements and obligations',
          duration: 120,
          assessment: true
        },
        {
          id: 'sox-compliance',
          name: 'SOX Compliance',
          content: 'Sarbanes-Oxley compliance requirements',
          duration: 90,
          assessment: true
        },
        {
          id: 'industry-standards',
          name: 'Industry Standards',
          content: 'Relevant industry security standards and frameworks',
          duration: 75,
          assessment: false
        }
      ],
      mandatory: true,
      frequency: 365 // Annual
    };

    this.programs.set('security-fundamentals', securityFundamentals);
    this.programs.set('incident-response', incidentResponse);
    this.programs.set('compliance-training', complianceTraining);
  }

  private async initializeCertificationSystem(): Promise<void> {
    if (this.config.certification.enabled) {
      logger.info('Certification system initialized', {
        validity: this.config.certification.validity,
        renewal: this.config.certification.renewal
      });
    }
  }

  private async initializeAwarenessCampaigns(): Promise<void> {
    // Initialize awareness campaign system
    logger.info('Awareness campaigns initialized');
  }

  private async initializeTrackingSystem(): Promise<void> {
    // Initialize progress tracking system
    logger.info('Training tracking system initialized');
  }

  private validateProgram(program: TrainingProgram): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!program.name) {
      errors.push('Program name is required');
    }

    if (!program.description) {
      errors.push('Program description is required');
    }

    if (!program.modules || program.modules.length === 0) {
      errors.push('Program must have at least one module');
    }

    // Validate modules
    for (let i = 0; i < program.modules.length; i++) {
      const module = program.modules[i];
      if (!module.name) {
        errors.push(`Module ${i + 1} name is required`);
      }
      if (!module.content) {
        errors.push(`Module ${i + 1} content is required`);
      }
      if (!module.duration || module.duration <= 0) {
        errors.push(`Module ${i + 1} must have a valid duration`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private calculateAverageModuleTime(program: TrainingProgram): number {
    if (program.modules.length === 0) {
      return 60; // Default 1 hour
    }

    const totalDuration = program.modules.reduce((sum, module) => sum + module.duration, 0);
    return totalDuration / program.modules.length;
  }

  private async checkCertificationRequirements(userId: string, programId: string): Promise<boolean> {
    // Check if user meets certification requirements
    for (const requirement of this.config.certification.requirements) {
      const meets = await this.checkRequirement(userId, programId, requirement);
      if (!meets) {
        return false;
      }
    }
    return true;
  }

  private async checkRequirement(userId: string, programId: string, requirement: any): Promise<boolean> {
    switch (requirement.type) {
      case 'training':
        // Check if training is completed
        const progress = await this.trackProgress(userId, programId);
        return progress.progress === 100;
      
      case 'assessment':
        // Check assessment scores
        const enrollmentKey = `${userId}-${programId}`;
        const enrollment = this.enrollments.get(enrollmentKey);
        return enrollment?.assessmentScore >= requirement.criteria;
      
      case 'experience':
        // Check user experience (mock)
        return true;
      
      default:
        return false;
    }
  }

  private async scheduleCampaignExecution(campaign: AwarenessCampaign): Promise<void> {
    // Schedule campaign execution
    logger.info(`Awareness campaign execution scheduled for ${campaign.startDate}`);
    
    // Mock campaign execution
    setTimeout(() => {
      this.executeCampaign(campaign);
    }, Math.max(0, campaign.startDate.getTime() - Date.now()));
  }

  private async executeCampaign(campaign: AwarenessCampaign): Promise<void> {
    logger.info('Executing awareness campaign', {
      campaignId: campaign.id,
      name: campaign.name,
      topic: campaign.topic
    });

    // Mock campaign execution and metrics
    campaign.metrics.reach = campaign.audience.length;
    campaign.metrics.engagement = Math.floor(campaign.audience.length * 0.7); // 70% engagement
    campaign.metrics.completion = Math.floor(campaign.audience.length * 0.5); // 50% completion
    campaign.metrics.feedback = Math.floor(campaign.audience.length * 0.3); // 30% feedback
  }

  private generateProgramId(): string {
    return `program-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCertificateId(): string {
    return `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCampaignId(): string {
    return `campaign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}