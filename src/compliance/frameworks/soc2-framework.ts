/**
 * SOC2Framework - SOC 2 Type II compliance framework implementation
 * 
 * Implements SOC 2 Trust Services Criteria including Security,
 * Availability, Processing Integrity, Confidentiality, and Privacy.
 */

import { ComplianceFramework } from '../types';

export class SOC2Framework {
  getFramework(): ComplianceFramework {
    return {
      id: 'SOC2',
      name: 'SOC 2 Type II',
      version: '2017',
      type: 'SOC2',
      requirements: this.getRequirements(),
      controls: this.getControls(),
      assessmentCriteria: this.getAssessmentCriteria()
    };
  }

  private getRequirements() {
    return [
      // Security (Common Criteria)
      {
        id: 'CC1.1',
        title: 'Control Environment - Integrity and Ethical Values',
        description: 'The entity demonstrates a commitment to integrity and ethical values.',
        category: 'SECURITY',
        severity: 'HIGH' as const,
        controls: ['CC1.1-001', 'CC1.1-002', 'CC1.1-003'],
        evidence: [
          {
            type: 'DOCUMENT' as const,
            description: 'Code of conduct and ethics policy',
            retention: 2555, // 7 years
            location: 'policy-repository'
          },
          {
            type: 'DOCUMENT' as const,
            description: 'Employee acknowledgment of code of conduct',
            retention: 2555,
            location: 'hr-records'
          }
        ]
      },
      {
        id: 'CC2.1',
        title: 'Communication and Information - Internal Communication',
        description: 'The entity obtains or generates and uses relevant, quality information to support the functioning of internal control.',
        category: 'SECURITY',
        severity: 'MEDIUM' as const,
        controls: ['CC2.1-001', 'CC2.1-002'],
        evidence: [
          {
            type: 'DOCUMENT' as const,
            description: 'Information and communication policies',
            retention: 2555,
            location: 'policy-repository'
          }
        ]
      },
      {
        id: 'CC3.1',
        title: 'Risk Assessment - Objectives and Risks',
        description: 'The entity specifies objectives with sufficient clarity to enable the identification and assessment of risks relating to objectives.',
        category: 'SECURITY',
        severity: 'HIGH' as const,
        controls: ['CC3.1-001', 'CC3.1-002', 'CC3.1-003'],
        evidence: [
          {
            type: 'DOCUMENT' as const,
            description: 'Risk assessment documentation',
            retention: 2555,
            location: 'risk-management'
          }
        ]
      },
      {
        id: 'CC4.1',
        title: 'Monitoring Activities - Ongoing and Separate Evaluations',
        description: 'The entity selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal control are present and functioning.',
        category: 'SECURITY',
        severity: 'HIGH' as const,
        controls: ['CC4.1-001', 'CC4.1-002'],
        evidence: [
          {
            type: 'REPORT' as const,
            description: 'Internal control monitoring reports',
            retention: 2555,
            location: 'audit-reports'
          }
        ]
      },
      {
        id: 'CC5.1',
        title: 'Control Activities - Selection and Development',
        description: 'The entity selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels.',
        category: 'SECURITY',
        severity: 'HIGH' as const,
        controls: ['CC5.1-001', 'CC5.1-002', 'CC5.1-003'],
        evidence: [
          {
            type: 'DOCUMENT' as const,
            description: 'Control activities documentation',
            retention: 2555,
            location: 'control-documentation'
          }
        ]
      },
      {
        id: 'CC6.1',
        title: 'Logical and Physical Access Controls - Logical Access',
        description: 'The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events to meet the entity\'s objectives.',
        category: 'SECURITY',
        severity: 'CRITICAL' as const,
        controls: ['CC6.1-001', 'CC6.1-002', 'CC6.1-003', 'CC6.1-004'],
        evidence: [
          {
            type: 'LOG' as const,
            description: 'Access control logs and reviews',
            retention: 2555,
            location: 'security-logs'
          }
        ]
      },
      {
        id: 'CC7.1',
        title: 'System Operations - System Monitoring',
        description: 'To meet its objectives, the entity uses detection and monitoring procedures to identify (1) changes to configurations that result in the introduction of new vulnerabilities, and (2) susceptibilities to newly discovered vulnerabilities.',
        category: 'SECURITY',
        severity: 'HIGH' as const,
        controls: ['CC7.1-001', 'CC7.1-002', 'CC7.1-003'],
        evidence: [
          {
            type: 'LOG' as const,
            description: 'System monitoring logs and alerts',
            retention: 2555,
            location: 'monitoring-logs'
          }
        ]
      },
      {
        id: 'CC8.1',
        title: 'Change Management - System Changes',
        description: 'The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet its objectives.',
        category: 'SECURITY',
        severity: 'HIGH' as const,
        controls: ['CC8.1-001', 'CC8.1-002', 'CC8.1-003'],
        evidence: [
          {
            type: 'DOCUMENT' as const,
            description: 'Change management records and approvals',
            retention: 2555,
            location: 'change-management'
          }
        ]
      },

      // Availability
      {
        id: 'A1.1',
        title: 'Availability - System Availability',
        description: 'The entity maintains, monitors, and evaluates current processing capacity and use of system components (infrastructure, data, and software) to manage capacity demand and to enable the implementation of additional capacity to help meet its objectives.',
        category: 'AVAILABILITY',
        severity: 'HIGH' as const,
        controls: ['A1.1-001', 'A1.1-002', 'A1.1-003'],
        evidence: [
          {
            type: 'REPORT' as const,
            description: 'Capacity monitoring and planning reports',
            retention: 1095, // 3 years
            location: 'capacity-reports'
          }
        ]
      },
      {
        id: 'A1.2',
        title: 'Availability - Environmental Protections',
        description: 'The entity authorizes, designs, develops or acquires, implements, operates, approves, maintains, and monitors environmental protections, software, data backup processes, and recovery infrastructure to meet its objectives.',
        category: 'AVAILABILITY',
        severity: 'HIGH' as const,
        controls: ['A1.2-001', 'A1.2-002', 'A1.2-003'],
        evidence: [
          {
            type: 'DOCUMENT' as const,
            description: 'Environmental protection and backup procedures',
            retention: 1095,
            location: 'disaster-recovery'
          }
        ]
      },

      // Processing Integrity
      {
        id: 'PI1.1',
        title: 'Processing Integrity - Data Processing',
        description: 'The entity implements policies and procedures to make available for sale only those products and services that meet the entity\'s specifications.',
        category: 'PROCESSING_INTEGRITY',
        severity: 'HIGH' as const,
        controls: ['PI1.1-001', 'PI1.1-002'],
        evidence: [
          {
            type: 'DOCUMENT' as const,
            description: 'Data processing integrity procedures',
            retention: 1095,
            location: 'processing-procedures'
          }
        ]
      },

      // Confidentiality
      {
        id: 'C1.1',
        title: 'Confidentiality - Confidential Information',
        description: 'The entity identifies and maintains confidential information to meet the entity\'s objectives related to confidentiality.',
        category: 'CONFIDENTIALITY',
        severity: 'CRITICAL' as const,
        controls: ['C1.1-001', 'C1.1-002', 'C1.1-003'],
        evidence: [
          {
            type: 'DOCUMENT' as const,
            description: 'Data classification and handling procedures',
            retention: 2555,
            location: 'data-classification'
          }
        ]
      },

      // Privacy
      {
        id: 'P1.1',
        title: 'Privacy - Notice and Communication',
        description: 'The entity provides notice to data subjects about its privacy practices to meet the entity\'s objectives related to privacy.',
        category: 'PRIVACY',
        severity: 'HIGH' as const,
        controls: ['P1.1-001', 'P1.1-002'],
        evidence: [
          {
            type: 'DOCUMENT' as const,
            description: 'Privacy notices and communications',
            retention: 2555,
            location: 'privacy-notices'
          }
        ]
      }
    ];
  }

  private getControls() {
    return [
      // Control Environment Controls
      {
        id: 'CC1.1-001',
        name: 'Code of Conduct Implementation',
        description: 'Implement and maintain a comprehensive code of conduct that addresses integrity and ethical values',
        type: 'PREVENTIVE' as const,
        implementation: {
          automated: false,
          manual: true,
          procedures: [
            'Develop comprehensive code of conduct',
            'Obtain management approval',
            'Communicate to all personnel',
            'Require annual acknowledgment'
          ],
          tools: ['HR Management System', 'Policy Management Platform'],
          responsible: ['HR', 'Legal', 'Management']
        },
        testing: {
          method: 'MANUAL' as const,
          frequency: 'ANNUALLY',
          criteria: [
            {
              id: 'CC1.1-001-T1',
              description: 'Code of conduct exists and is current',
              expectedResult: 'Current code of conduct document available',
              tolerance: 0
            },
            {
              id: 'CC1.1-001-T2',
              description: 'All employees have acknowledged code of conduct',
              expectedResult: '100% employee acknowledgment',
              tolerance: 5
            }
          ],
          evidence: ['Code of conduct document', 'Employee acknowledgment records']
        },
        frequency: 'ANNUALLY'
      },
      {
        id: 'CC1.1-002',
        name: 'Ethics Training Program',
        description: 'Provide regular ethics training to all personnel',
        type: 'PREVENTIVE' as const,
        implementation: {
          automated: true,
          manual: true,
          procedures: [
            'Develop ethics training curriculum',
            'Schedule regular training sessions',
            'Track completion and effectiveness'
          ],
          tools: ['Learning Management System', 'Training Platform'],
          responsible: ['HR', 'Training Team']
        },
        testing: {
          method: 'AUTOMATED' as const,
          frequency: 'QUARTERLY',
          criteria: [
            {
              id: 'CC1.1-002-T1',
              description: 'Training completion rates meet targets',
              expectedResult: '95% completion rate within 30 days',
              tolerance: 5
            }
          ],
          evidence: ['Training completion reports', 'Training effectiveness assessments']
        },
        frequency: 'QUARTERLY'
      },

      // Access Control Controls
      {
        id: 'CC6.1-001',
        name: 'User Access Provisioning',
        description: 'Implement formal user access provisioning process with appropriate approvals',
        type: 'PREVENTIVE' as const,
        implementation: {
          automated: true,
          manual: true,
          procedures: [
            'Submit access request with business justification',
            'Obtain manager approval',
            'Review and approve by security team',
            'Provision access with least privilege principle'
          ],
          tools: ['Identity Management System', 'Access Request Portal'],
          responsible: ['Security Team', 'IT Operations', 'Managers']
        },
        testing: {
          method: 'HYBRID' as const,
          frequency: 'MONTHLY',
          criteria: [
            {
              id: 'CC6.1-001-T1',
              description: 'All access requests have proper approvals',
              expectedResult: '100% of access requests properly approved',
              tolerance: 0
            },
            {
              id: 'CC6.1-001-T2',
              description: 'Access provisioned follows least privilege',
              expectedResult: 'No excessive privileges granted',
              tolerance: 0
            }
          ],
          evidence: ['Access request records', 'Approval workflows', 'Access reviews']
        },
        frequency: 'CONTINUOUS'
      },
      {
        id: 'CC6.1-002',
        name: 'Multi-Factor Authentication',
        description: 'Require multi-factor authentication for all system access',
        type: 'PREVENTIVE' as const,
        implementation: {
          automated: true,
          manual: false,
          procedures: [
            'Configure MFA for all systems',
            'Enroll users in MFA',
            'Monitor MFA compliance'
          ],
          tools: ['MFA Solution', 'Identity Provider'],
          responsible: ['Security Team', 'IT Operations']
        },
        testing: {
          method: 'AUTOMATED' as const,
          frequency: 'CONTINUOUS',
          criteria: [
            {
              id: 'CC6.1-002-T1',
              description: 'MFA enabled for all user accounts',
              expectedResult: '100% MFA enrollment',
              tolerance: 0
            },
            {
              id: 'CC6.1-002-T2',
              description: 'MFA bypass attempts blocked',
              expectedResult: 'No successful MFA bypasses',
              tolerance: 0
            }
          ],
          evidence: ['MFA enrollment reports', 'Authentication logs', 'Security monitoring alerts']
        },
        frequency: 'CONTINUOUS'
      },

      // System Monitoring Controls
      {
        id: 'CC7.1-001',
        name: 'Security Event Monitoring',
        description: 'Implement comprehensive security event monitoring and alerting',
        type: 'DETECTIVE' as const,
        implementation: {
          automated: true,
          manual: true,
          procedures: [
            'Deploy security monitoring tools',
            'Configure alerting rules',
            'Monitor and respond to alerts',
            'Review and tune monitoring rules'
          ],
          tools: ['SIEM', 'Security Monitoring Platform', 'Log Management'],
          responsible: ['Security Operations Center', 'Security Team']
        },
        testing: {
          method: 'AUTOMATED' as const,
          frequency: 'CONTINUOUS',
          criteria: [
            {
              id: 'CC7.1-001-T1',
              description: 'Security events properly detected and alerted',
              expectedResult: '95% detection rate for security events',
              tolerance: 5
            },
            {
              id: 'CC7.1-001-T2',
              description: 'Alert response times meet SLA',
              expectedResult: 'Critical alerts responded to within 15 minutes',
              tolerance: 10
            }
          ],
          evidence: ['Security monitoring logs', 'Alert response records', 'Incident reports']
        },
        frequency: 'CONTINUOUS'
      },

      // Change Management Controls
      {
        id: 'CC8.1-001',
        name: 'Change Approval Process',
        description: 'Implement formal change approval process for all system changes',
        type: 'PREVENTIVE' as const,
        implementation: {
          automated: true,
          manual: true,
          procedures: [
            'Submit change request with impact assessment',
            'Technical review and approval',
            'Business approval for significant changes',
            'Schedule and implement change',
            'Post-implementation review'
          ],
          tools: ['Change Management System', 'Approval Workflow'],
          responsible: ['Change Advisory Board', 'Technical Teams', 'Business Owners']
        },
        testing: {
          method: 'MANUAL' as const,
          frequency: 'MONTHLY',
          criteria: [
            {
              id: 'CC8.1-001-T1',
              description: 'All changes have proper approvals',
              expectedResult: '100% of changes properly approved',
              tolerance: 0
            },
            {
              id: 'CC8.1-001-T2',
              description: 'Emergency changes documented post-implementation',
              expectedResult: 'All emergency changes documented within 24 hours',
              tolerance: 0
            }
          ],
          evidence: ['Change requests', 'Approval records', 'Implementation logs']
        },
        frequency: 'CONTINUOUS'
      }
    ];
  }

  private getAssessmentCriteria() {
    return [
      {
        id: 'SOC2-SECURITY',
        requirement: 'Security Trust Services Criteria',
        weight: 40,
        scoring: {
          type: 'WEIGHTED' as const,
          scale: 100,
          thresholds: [
            {
              level: 'COMPLIANT' as const,
              minScore: 90,
              maxScore: 100
            },
            {
              level: 'PARTIALLY_COMPLIANT' as const,
              minScore: 70,
              maxScore: 89
            },
            {
              level: 'NON_COMPLIANT' as const,
              minScore: 0,
              maxScore: 69
            }
          ]
        }
      },
      {
        id: 'SOC2-AVAILABILITY',
        requirement: 'Availability Trust Services Criteria',
        weight: 20,
        scoring: {
          type: 'WEIGHTED' as const,
          scale: 100,
          thresholds: [
            {
              level: 'COMPLIANT' as const,
              minScore: 95,
              maxScore: 100
            },
            {
              level: 'PARTIALLY_COMPLIANT' as const,
              minScore: 80,
              maxScore: 94
            },
            {
              level: 'NON_COMPLIANT' as const,
              minScore: 0,
              maxScore: 79
            }
          ]
        }
      },
      {
        id: 'SOC2-PROCESSING-INTEGRITY',
        requirement: 'Processing Integrity Trust Services Criteria',
        weight: 15,
        scoring: {
          type: 'WEIGHTED' as const,
          scale: 100,
          thresholds: [
            {
              level: 'COMPLIANT' as const,
              minScore: 90,
              maxScore: 100
            },
            {
              level: 'PARTIALLY_COMPLIANT' as const,
              minScore: 75,
              maxScore: 89
            },
            {
              level: 'NON_COMPLIANT' as const,
              minScore: 0,
              maxScore: 74
            }
          ]
        }
      },
      {
        id: 'SOC2-CONFIDENTIALITY',
        requirement: 'Confidentiality Trust Services Criteria',
        weight: 15,
        scoring: {
          type: 'WEIGHTED' as const,
          scale: 100,
          thresholds: [
            {
              level: 'COMPLIANT' as const,
              minScore: 95,
              maxScore: 100
            },
            {
              level: 'PARTIALLY_COMPLIANT' as const,
              minScore: 85,
              maxScore: 94
            },
            {
              level: 'NON_COMPLIANT' as const,
              minScore: 0,
              maxScore: 84
            }
          ]
        }
      },
      {
        id: 'SOC2-PRIVACY',
        requirement: 'Privacy Trust Services Criteria',
        weight: 10,
        scoring: {
          type: 'WEIGHTED' as const,
          scale: 100,
          thresholds: [
            {
              level: 'COMPLIANT' as const,
              minScore: 90,
              maxScore: 100
            },
            {
              level: 'PARTIALLY_COMPLIANT' as const,
              minScore: 75,
              maxScore: 89
            },
            {
              level: 'NON_COMPLIANT' as const,
              minScore: 0,
              maxScore: 74
            }
          ]
        }
      }
    ];
  }
}