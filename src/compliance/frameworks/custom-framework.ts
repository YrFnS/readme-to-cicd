/**
 * CustomFramework - Template for custom compliance frameworks
 * 
 * Provides a template and builder for creating custom compliance
 * frameworks tailored to specific organizational needs.
 */

import { ComplianceFramework } from '../types';

export class CustomFramework {
  getFramework(): ComplianceFramework {
    return {
      id: 'CUSTOM',
      name: 'Custom Compliance Framework',
      version: '1.0',
      type: 'CUSTOM',
      requirements: [
        {
          id: 'CUSTOM-001',
          title: 'Custom Requirement Template',
          description: 'Template for custom compliance requirements',
          category: 'CUSTOM',
          severity: 'MEDIUM' as const,
          controls: ['CUSTOM-001-001'],
          evidence: [
            {
              type: 'DOCUMENT' as const,
              description: 'Custom requirement documentation',
              retention: 1095,
              location: 'custom-documentation'
            }
          ]
        }
      ],
      controls: [
        {
          id: 'CUSTOM-001-001',
          name: 'Custom Control Template',
          description: 'Template for custom compliance controls',
          type: 'PREVENTIVE' as const,
          implementation: {
            automated: false,
            manual: true,
            procedures: ['Define custom procedures'],
            tools: ['Custom Tools'],
            responsible: ['Custom Team']
          },
          testing: {
            method: 'MANUAL' as const,
            frequency: 'QUARTERLY',
            criteria: [
              {
                id: 'CUSTOM-001-001-T1',
                description: 'Custom control test criteria',
                expectedResult: 'Custom expected result',
                tolerance: 0
              }
            ],
            evidence: ['Custom evidence']
          },
          frequency: 'QUARTERLY'
        }
      ],
      assessmentCriteria: [
        {
          id: 'CUSTOM-ASSESSMENT',
          requirement: 'Custom Assessment Criteria',
          weight: 100,
          scoring: {
            type: 'PERCENTAGE' as const,
            scale: 100,
            thresholds: [
              {
                level: 'COMPLIANT' as const,
                minScore: 80,
                maxScore: 100
              },
              {
                level: 'PARTIALLY_COMPLIANT' as const,
                minScore: 60,
                maxScore: 79
              },
              {
                level: 'NON_COMPLIANT' as const,
                minScore: 0,
                maxScore: 59
              }
            ]
          }
        }
      ]
    };
  }

  /**
   * Create a custom framework from configuration
   */
  static createFromConfig(config: CustomFrameworkConfig): ComplianceFramework {
    return {
      id: config.id,
      name: config.name,
      version: config.version || '1.0',
      type: 'CUSTOM',
      requirements: config.requirements || [],
      controls: config.controls || [],
      assessmentCriteria: config.assessmentCriteria || []
    };
  }

  /**
   * Create framework builder
   */
  static builder(): CustomFrameworkBuilder {
    return new CustomFrameworkBuilder();
  }
}

/**
 * Custom framework configuration interface
 */
interface CustomFrameworkConfig {
  id: string;
  name: string;
  version?: string;
  requirements?: any[];
  controls?: any[];
  assessmentCriteria?: any[];
}

/**
 * Custom framework builder class
 */
class CustomFrameworkBuilder {
  private framework: Partial<ComplianceFramework> = {
    type: 'CUSTOM',
    requirements: [],
    controls: [],
    assessmentCriteria: []
  };

  setId(id: string): CustomFrameworkBuilder {
    this.framework.id = id;
    return this;
  }

  setName(name: string): CustomFrameworkBuilder {
    this.framework.name = name;
    return this;
  }

  setVersion(version: string): CustomFrameworkBuilder {
    this.framework.version = version;
    return this;
  }

  addRequirement(requirement: any): CustomFrameworkBuilder {
    this.framework.requirements!.push(requirement);
    return this;
  }

  addControl(control: any): CustomFrameworkBuilder {
    this.framework.controls!.push(control);
    return this;
  }

  addAssessmentCriteria(criteria: any): CustomFrameworkBuilder {
    this.framework.assessmentCriteria!.push(criteria);
    return this;
  }

  build(): ComplianceFramework {
    if (!this.framework.id || !this.framework.name) {
      throw new Error('Framework must have id and name');
    }

    return this.framework as ComplianceFramework;
  }
}