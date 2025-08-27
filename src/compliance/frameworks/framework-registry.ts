/**
 * FrameworkRegistry - Central registry for compliance frameworks
 * 
 * Manages registration, discovery, and instantiation of compliance
 * frameworks including built-in and custom frameworks.
 */

import { ComplianceFramework } from '../types';
import { SOC2Framework } from './soc2-framework';
import { HIPAAFramework } from './hipaa-framework';
import { PCIDSSFramework } from './pci-dss-framework';
import { GDPRFramework } from './gdpr-framework';
import { CustomFramework } from './custom-framework';

export class FrameworkRegistry {
  private frameworks: Map<string, ComplianceFramework> = new Map();
  private frameworkFactories: Map<string, () => ComplianceFramework> = new Map();

  constructor() {
    this.initializeBuiltInFrameworks();
  }

  /**
   * Register a compliance framework
   */
  registerFramework(framework: ComplianceFramework): void {
    this.frameworks.set(framework.id, framework);
  }

  /**
   * Register a framework factory
   */
  registerFrameworkFactory(type: string, factory: () => ComplianceFramework): void {
    this.frameworkFactories.set(type, factory);
  }

  /**
   * Get framework by ID
   */
  async getFramework(frameworkId: string): Promise<ComplianceFramework | undefined> {
    // Check if framework is already loaded
    let framework = this.frameworks.get(frameworkId);
    if (framework) {
      return framework;
    }

    // Try to create framework from factory
    const factory = this.frameworkFactories.get(frameworkId);
    if (factory) {
      framework = factory();
      this.frameworks.set(frameworkId, framework);
      return framework;
    }

    return undefined;
  }

  /**
   * List all available frameworks
   */
  listFrameworks(): ComplianceFramework[] {
    return Array.from(this.frameworks.values());
  }

  /**
   * List framework types
   */
  listFrameworkTypes(): string[] {
    return Array.from(this.frameworkFactories.keys());
  }

  /**
   * Create framework from template
   */
  async createFrameworkFromTemplate(
    templateId: string,
    customizations?: FrameworkCustomization
  ): Promise<ComplianceFramework> {
    const factory = this.frameworkFactories.get(templateId);
    if (!factory) {
      throw new Error(`Framework template not found: ${templateId}`);
    }

    let framework = factory();

    // Apply customizations if provided
    if (customizations) {
      framework = this.applyCustomizations(framework, customizations);
    }

    return framework;
  }

  /**
   * Validate framework structure
   */
  validateFramework(framework: ComplianceFramework): FrameworkValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic structure
    if (!framework.id) {
      errors.push('Framework must have an ID');
    }

    if (!framework.name) {
      errors.push('Framework must have a name');
    }

    if (!framework.version) {
      errors.push('Framework must have a version');
    }

    if (!framework.requirements || framework.requirements.length === 0) {
      errors.push('Framework must have at least one requirement');
    }

    if (!framework.controls || framework.controls.length === 0) {
      errors.push('Framework must have at least one control');
    }

    // Validate requirements
    if (framework.requirements) {
      for (const requirement of framework.requirements) {
        if (!requirement.id) {
          errors.push(`Requirement missing ID: ${requirement.title}`);
        }

        if (!requirement.controls || requirement.controls.length === 0) {
          warnings.push(`Requirement has no controls: ${requirement.id}`);
        }

        // Check if referenced controls exist
        for (const controlId of requirement.controls) {
          const controlExists = framework.controls.some(c => c.id === controlId);
          if (!controlExists) {
            errors.push(`Requirement ${requirement.id} references non-existent control: ${controlId}`);
          }
        }
      }
    }

    // Validate controls
    if (framework.controls) {
      for (const control of framework.controls) {
        if (!control.id) {
          errors.push(`Control missing ID: ${control.name}`);
        }

        if (!control.implementation) {
          warnings.push(`Control has no implementation details: ${control.id}`);
        }

        if (!control.testing) {
          warnings.push(`Control has no testing details: ${control.id}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get framework compatibility matrix
   */
  getCompatibilityMatrix(): FrameworkCompatibilityMatrix {
    const frameworks = this.listFrameworks();
    const matrix: FrameworkCompatibilityMatrix = {};

    for (const framework1 of frameworks) {
      matrix[framework1.id] = {};
      
      for (const framework2 of frameworks) {
        if (framework1.id === framework2.id) {
          matrix[framework1.id][framework2.id] = 100; // Same framework
          continue;
        }

        // Calculate compatibility based on overlapping controls
        const compatibility = this.calculateFrameworkCompatibility(framework1, framework2);
        matrix[framework1.id][framework2.id] = compatibility;
      }
    }

    return matrix;
  }

  /**
   * Find frameworks by type
   */
  findFrameworksByType(type: ComplianceFramework['type']): ComplianceFramework[] {
    return this.listFrameworks().filter(f => f.type === type);
  }

  /**
   * Search frameworks by keyword
   */
  searchFrameworks(keyword: string): ComplianceFramework[] {
    const lowerKeyword = keyword.toLowerCase();
    
    return this.listFrameworks().filter(framework => 
      framework.name.toLowerCase().includes(lowerKeyword) ||
      framework.id.toLowerCase().includes(lowerKeyword) ||
      framework.requirements.some(req => 
        req.title.toLowerCase().includes(lowerKeyword) ||
        req.description.toLowerCase().includes(lowerKeyword)
      )
    );
  }

  /**
   * Initialize built-in frameworks
   */
  private initializeBuiltInFrameworks(): void {
    // Register framework factories for lazy loading
    this.frameworkFactories.set('SOC2', () => new SOC2Framework().getFramework());
    this.frameworkFactories.set('HIPAA', () => new HIPAAFramework().getFramework());
    this.frameworkFactories.set('PCI-DSS', () => new PCIDSSFramework().getFramework());
    this.frameworkFactories.set('GDPR', () => new GDPRFramework().getFramework());
    this.frameworkFactories.set('CUSTOM', () => new CustomFramework().getFramework());
  }

  /**
   * Apply customizations to framework
   */
  private applyCustomizations(
    framework: ComplianceFramework,
    customizations: FrameworkCustomization
  ): ComplianceFramework {
    const customizedFramework = { ...framework };

    // Apply name customization
    if (customizations.name) {
      customizedFramework.name = customizations.name;
    }

    // Apply requirement customizations
    if (customizations.requirements) {
      for (const reqCustomization of customizations.requirements) {
        const requirement = customizedFramework.requirements.find(r => r.id === reqCustomization.id);
        if (requirement) {
          if (reqCustomization.title) {requirement.title = reqCustomization.title;}
          if (reqCustomization.description) {requirement.description = reqCustomization.description;}
          if (reqCustomization.severity) {requirement.severity = reqCustomization.severity;}
        }
      }
    }

    // Apply control customizations
    if (customizations.controls) {
      for (const controlCustomization of customizations.controls) {
        const control = customizedFramework.controls.find(c => c.id === controlCustomization.id);
        if (control) {
          if (controlCustomization.name) {control.name = controlCustomization.name;}
          if (controlCustomization.description) {control.description = controlCustomization.description;}
          if (controlCustomization.frequency) {control.frequency = controlCustomization.frequency;}
        }
      }
    }

    // Add additional requirements
    if (customizations.additionalRequirements) {
      customizedFramework.requirements.push(...customizations.additionalRequirements);
    }

    // Add additional controls
    if (customizations.additionalControls) {
      customizedFramework.controls.push(...customizations.additionalControls);
    }

    return customizedFramework;
  }

  /**
   * Calculate compatibility between two frameworks
   */
  private calculateFrameworkCompatibility(
    framework1: ComplianceFramework,
    framework2: ComplianceFramework
  ): number {
    const controls1 = new Set(framework1.controls.map(c => c.name.toLowerCase()));
    const controls2 = new Set(framework2.controls.map(c => c.name.toLowerCase()));

    const intersection = new Set([...controls1].filter(x => controls2.has(x)));
    const union = new Set([...controls1, ...controls2]);

    if (union.size === 0) {return 0;}

    return Math.round((intersection.size / union.size) * 100);
  }
}

/**
 * Framework customization interface
 */
interface FrameworkCustomization {
  name?: string;
  requirements?: RequirementCustomization[];
  controls?: ControlCustomization[];
  additionalRequirements?: any[];
  additionalControls?: any[];
}

/**
 * Requirement customization interface
 */
interface RequirementCustomization {
  id: string;
  title?: string;
  description?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Control customization interface
 */
interface ControlCustomization {
  id: string;
  name?: string;
  description?: string;
  frequency?: 'CONTINUOUS' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
}

/**
 * Framework validation result interface
 */
interface FrameworkValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Framework compatibility matrix interface
 */
interface FrameworkCompatibilityMatrix {
  [frameworkId: string]: {
    [otherFrameworkId: string]: number; // Compatibility percentage
  };
}