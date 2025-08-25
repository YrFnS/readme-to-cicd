/**
 * Framework Detection Spec Tests
 * Comprehensive tests validating all Framework Detection spec requirements
 * Target: 90+ tests covering all 6 requirements
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { FrameworkDetector } from '../../../src/detection/framework-detector';
import { DetectionEngine } from '../../../src/detection/detection-engine';
import { loadSpecRequirements, measurePerformance, loadSampleReadme } from '../utils/spec-test-helpers';

describe('Framework Detection - Complete Spec Validation', () => {
  let detector: FrameworkDetector;
  let engine: DetectionEngine;
  
  beforeEach(() => {
    engine = new DetectionEngine();
    detector = new FrameworkDetector(engine);
  });

  describe('Requirement 1: Node.js Project Detection', () => {
    describe('User Story: As a developer, I want the system to detect Node.js projects and their specific frameworks', () => {
      
      describe('AC1: Detect package.json file', () => {
        it('should identify project as Node.js when package.json is detected', async () => {
          const projectData = {
            languages: ['javascript'],
            dependencies: { packageManager: 'npm' },
            commands: [{ command: 'npm install', type: 'install' }],
            files: ['package.json']
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.detectedFrameworks).toContainEqual(
            expect.objectContaining({ name: 'Node.js', confidence: expect.any(Number) })
          );
        });

        it('should detect Node.js version from package.json', async () => {
          const projectData = {
            languages: ['javascript'],
            dependencies: { 
              packageManager: 'npm',
              engines: { node: '>=14.0.0' }
            },
            files: ['package.json']
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          
          const nodeFramework = result.data?.detectedFrameworks?.find(f => f.name === 'Node.js');
          expect(nodeFramework?.version).toBe('>=14.0.0');
        });

        it('should handle missing package.json gracefully', async () => {
          const projectData = {
            languages: ['javascript'],
            commands: [{ command: 'node index.js', type: 'start' }]
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          // Should still detect Node.js from commands, but with lower confidence
        });
      });

      describe('AC2: Extract and categorize npm scripts', () => {
        it('should extract build scripts from package.json', async () => {
          const projectData = {
            languages: ['javascript'],
            dependencies: { packageManager: 'npm' },
            commands: [
              { command: 'npm run build', type: 'build' },
              { command: 'npm run dev', type: 'dev' }
            ]
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.suggestedSteps).toContainEqual(
            expect.objectContaining({ 
              type: 'build',
              command: 'npm run build'
            })
          );
        });

        it('should extract test scripts from package.json', async () => {
          const projectData = {
            languages: ['javascript'],
            dependencies: { packageManager: 'npm' },
            commands: [
              { command: 'npm test', type: 'test' },
              { command: 'npm run test:coverage', type: 'test' }
            ]
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.suggestedSteps).toContainEqual(
            expect.objectContaining({ 
              type: 'test',
              command: 'npm test'
            })
          );
        });

        it('should extract start scripts from package.json', async () => {
          const projectData = {
            languages: ['javascript'],
            dependencies: { packageManager: 'npm' },
            commands: [
              { command: 'npm start', type: 'start' },
              { command: 'npm run serve', type: 'start' }
            ]
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.suggestedSteps).toContainEqual(
            expect.objectContaining({ 
              type: 'start',
              command: 'npm start'
            })
          );
        });
      });

      describe('AC3: Detect popular Node.js frameworks', () => {
        it('should detect React framework', async () => {
          const projectData = {
            languages: ['javascript'],
            dependencies: { 
              packageManager: 'npm',
              packages: ['react', 'react-dom']
            },
            commands: [{ command: 'npm start', type: 'start' }]
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.detectedFrameworks).toContainEqual(
            expect.objectContaining({ name: 'React' })
          );
        });

        it('should detect Vue.js framework', async () => {
          const projectData = {
            languages: ['javascript'],
            dependencies: { 
              packageManager: 'npm',
              packages: ['vue', '@vue/cli']
            }
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.detectedFrameworks).toContainEqual(
            expect.objectContaining({ name: 'Vue.js' })
          );
        });

        it('should detect Angular framework', async () => {
          const projectData = {
            languages: ['typescript'],
            dependencies: { 
              packageManager: 'npm',
              packages: ['@angular/core', '@angular/cli']
            }
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.detectedFrameworks).toContainEqual(
            expect.objectContaining({ name: 'Angular' })
          );
        });

        it('should detect Express.js framework', async () => {
          const projectData = {
            languages: ['javascript'],
            dependencies: { 
              packageManager: 'npm',
              packages: ['express']
            },
            commands: [{ command: 'node server.js', type: 'start' }]
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.detectedFrameworks).toContainEqual(
            expect.objectContaining({ name: 'Express.js' })
          );
        });

        it('should detect Next.js framework', async () => {
          const projectData = {
            languages: ['javascript'],
            dependencies: { 
              packageManager: 'npm',
              packages: ['next', 'react']
            },
            commands: [{ command: 'npm run dev', type: 'dev' }]
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.detectedFrameworks).toContainEqual(
            expect.objectContaining({ name: 'Next.js' })
          );
        });
      });

      describe('AC4: Suggest appropriate CI steps', () => {
        it('should suggest Node.js setup step', async () => {
          const projectData = {
            languages: ['javascript'],
            dependencies: { packageManager: 'npm' }
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.suggestedSteps).toContainEqual(
            expect.objectContaining({ 
              type: 'setup',
              name: 'Setup Node.js',
              action: 'actions/setup-node@v3'
            })
          );
        });

        it('should suggest dependency installation step', async () => {
          const projectData = {
            languages: ['javascript'],
            dependencies: { packageManager: 'npm' }
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.suggestedSteps).toContainEqual(
            expect.objectContaining({ 
              type: 'install',
              command: 'npm ci'
            })
          );
        });

        it('should suggest build step when build script exists', async () => {
          const projectData = {
            languages: ['javascript'],
            dependencies: { packageManager: 'npm' },
            commands: [{ command: 'npm run build', type: 'build' }]
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.suggestedSteps).toContainEqual(
            expect.objectContaining({ 
              type: 'build',
              command: 'npm run build'
            })
          );
        });

        it('should suggest test step when test script exists', async () => {
          const projectData = {
            languages: ['javascript'],
            dependencies: { packageManager: 'npm' },
            commands: [{ command: 'npm test', type: 'test' }]
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.suggestedSteps).toContainEqual(
            expect.objectContaining({ 
              type: 'test',
              command: 'npm test'
            })
          );
        });
      });

      describe('AC5: Recommend package manager', () => {
        it('should recommend npm when package-lock.json exists', async () => {
          const projectData = {
            languages: ['javascript'],
            files: ['package.json', 'package-lock.json']
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.recommendedPackageManager).toBe('npm');
        });

        it('should recommend yarn when yarn.lock exists', async () => {
          const projectData = {
            languages: ['javascript'],
            files: ['package.json', 'yarn.lock']
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.recommendedPackageManager).toBe('yarn');
        });

        it('should recommend pnpm when pnpm-lock.yaml exists', async () => {
          const projectData = {
            languages: ['javascript'],
            files: ['package.json', 'pnpm-lock.yaml']
          };
          
          const result = await detector.detectFrameworks(projectData);
          expect(result.success).toBe(true);
          expect(result.data?.recommendedPackageManager).toBe('pnpm');
        });
      });
    });
  });

  describe('Requirement 2: Python Project Detection', () => {
    describe('User Story: As a developer, I want the system to detect Python projects and frameworks', () => {
      
      it('should detect Python projects from requirements.txt', async () => {
        const projectData = {
          languages: ['python'],
          files: ['requirements.txt'],
          commands: [{ command: 'pip install -r requirements.txt', type: 'install' }]
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        expect(result.data?.detectedFrameworks).toContainEqual(
          expect.objectContaining({ name: 'Python' })
        );
      });

      it('should detect Django framework', async () => {
        const projectData = {
          languages: ['python'],
          dependencies: { 
            packageManager: 'pip',
            packages: ['Django', 'django-rest-framework']
          },
          files: ['manage.py']
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        expect(result.data?.detectedFrameworks).toContainEqual(
          expect.objectContaining({ name: 'Django' })
        );
      });

      it('should detect Flask framework', async () => {
        const projectData = {
          languages: ['python'],
          dependencies: { 
            packageManager: 'pip',
            packages: ['Flask', 'flask-sqlalchemy']
          }
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        expect(result.data?.detectedFrameworks).toContainEqual(
          expect.objectContaining({ name: 'Flask' })
        );
      });

      it('should detect FastAPI framework', async () => {
        const projectData = {
          languages: ['python'],
          dependencies: { 
            packageManager: 'pip',
            packages: ['fastapi', 'uvicorn']
          }
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        expect(result.data?.detectedFrameworks).toContainEqual(
          expect.objectContaining({ name: 'FastAPI' })
        );
      });

      it('should suggest Python CI steps', async () => {
        const projectData = {
          languages: ['python'],
          dependencies: { packageManager: 'pip' }
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        expect(result.data?.suggestedSteps).toContainEqual(
          expect.objectContaining({ 
            type: 'setup',
            name: 'Setup Python',
            action: 'actions/setup-python@v4'
          })
        );
      });
    });
  });

  describe('Requirement 3: Multi-language Project Handling', () => {
    describe('User Story: As a developer, I want support for projects using multiple languages', () => {
      
      it('should detect multiple languages in a project', async () => {
        const projectData = {
          languages: ['javascript', 'python', 'typescript'],
          dependencies: { 
            packageManager: 'npm',
            packages: ['express', 'typescript']
          },
          files: ['package.json', 'requirements.txt']
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        expect(result.data?.detectedFrameworks?.length).toBeGreaterThan(1);
      });

      it('should prioritize primary language framework', async () => {
        const projectData = {
          languages: ['javascript', 'python'], // JavaScript first = primary
          dependencies: { 
            packageManager: 'npm',
            packages: ['react']
          }
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        
        const frameworks = result.data?.detectedFrameworks || [];
        const jsFramework = frameworks.find(f => f.name === 'React');
        expect(jsFramework?.confidence).toBeGreaterThan(0.8);
      });

      it('should suggest CI steps for all detected languages', async () => {
        const projectData = {
          languages: ['javascript', 'python'],
          dependencies: { packageManager: 'npm' },
          files: ['package.json', 'requirements.txt']
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        
        const steps = result.data?.suggestedSteps || [];
        expect(steps.some(s => s.name?.includes('Node.js'))).toBe(true);
        expect(steps.some(s => s.name?.includes('Python'))).toBe(true);
      });

      it('should handle conflicting package managers', async () => {
        const projectData = {
          languages: ['javascript', 'python'],
          files: ['package.json', 'requirements.txt', 'yarn.lock']
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        expect(result.data?.recommendedPackageManager).toBeDefined();
      });
    });
  });

  describe('Requirement 4: Framework-specific CI Suggestions', () => {
    describe('User Story: As a developer, I want framework-specific CI pipeline suggestions', () => {
      
      it('should suggest React-specific build steps', async () => {
        const projectData = {
          languages: ['javascript'],
          dependencies: { 
            packageManager: 'npm',
            packages: ['react', 'react-scripts']
          }
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        
        const buildStep = result.data?.suggestedSteps?.find(s => s.type === 'build');
        expect(buildStep?.command).toBe('npm run build');
      });

      it('should suggest Django-specific test steps', async () => {
        const projectData = {
          languages: ['python'],
          dependencies: { 
            packageManager: 'pip',
            packages: ['Django']
          },
          files: ['manage.py']
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        
        const testStep = result.data?.suggestedSteps?.find(s => s.type === 'test');
        expect(testStep?.command).toContain('python manage.py test');
      });

      it('should suggest Docker steps when Dockerfile exists', async () => {
        const projectData = {
          languages: ['javascript'],
          files: ['Dockerfile', 'package.json']
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        
        const dockerStep = result.data?.suggestedSteps?.find(s => s.type === 'docker');
        expect(dockerStep).toBeDefined();
      });

      it('should suggest deployment steps for specific frameworks', async () => {
        const projectData = {
          languages: ['javascript'],
          dependencies: { 
            packageManager: 'npm',
            packages: ['next']
          }
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        
        const deployStep = result.data?.suggestedSteps?.find(s => s.type === 'deploy');
        expect(deployStep).toBeDefined();
      });
    });
  });

  describe('Requirement 5: Confidence Scoring Algorithms', () => {
    describe('User Story: As a developer, I want accurate confidence scores for framework detection', () => {
      
      it('should provide high confidence for clear framework indicators', async () => {
        const projectData = {
          languages: ['javascript'],
          dependencies: { 
            packageManager: 'npm',
            packages: ['react', 'react-dom', 'react-scripts']
          },
          commands: [{ command: 'npm start', type: 'start' }],
          files: ['package.json', 'src/App.js']
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        
        const reactFramework = result.data?.detectedFrameworks?.find(f => f.name === 'React');
        expect(reactFramework?.confidence).toBeGreaterThan(0.9);
      });

      it('should provide lower confidence for ambiguous indicators', async () => {
        const projectData = {
          languages: ['javascript'],
          commands: [{ command: 'node index.js', type: 'start' }]
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        
        const nodeFramework = result.data?.detectedFrameworks?.find(f => f.name === 'Node.js');
        expect(nodeFramework?.confidence).toBeLessThan(0.7);
      });

      it('should adjust confidence based on multiple evidence sources', async () => {
        const strongEvidence = {
          languages: ['python'],
          dependencies: { 
            packageManager: 'pip',
            packages: ['Django', 'django-rest-framework']
          },
          files: ['manage.py', 'settings.py'],
          commands: [{ command: 'python manage.py runserver', type: 'start' }]
        };
        
        const weakEvidence = {
          languages: ['python'],
          dependencies: { packageManager: 'pip' }
        };
        
        const strongResult = await detector.detectFrameworks(strongEvidence);
        const weakResult = await detector.detectFrameworks(weakEvidence);
        
        const strongDjango = strongResult.data?.detectedFrameworks?.find(f => f.name === 'Django');
        const weakPython = weakResult.data?.detectedFrameworks?.find(f => f.name === 'Python');
        
        expect(strongDjango?.confidence).toBeGreaterThan(weakPython?.confidence || 0);
      });

      it('should provide overall confidence score', async () => {
        const projectData = {
          languages: ['javascript'],
          dependencies: { 
            packageManager: 'npm',
            packages: ['react']
          }
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        expect(result.data?.overallConfidence).toBeGreaterThan(0);
        expect(result.data?.overallConfidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Requirement 6: Extensibility and Plugin Support', () => {
    describe('User Story: As a developer, I want to extend framework detection with custom rules', () => {
      
      it('should support custom framework detection rules', async () => {
        // Register custom framework detector
        const customRule = {
          name: 'CustomFramework',
          detect: (data: any) => {
            return data.files?.includes('custom.config.js') ? 0.8 : 0;
          },
          suggestSteps: () => [
            { type: 'build', command: 'custom-build' }
          ]
        };
        
        engine.registerCustomRule(customRule);
        
        const projectData = {
          languages: ['javascript'],
          files: ['custom.config.js']
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        expect(result.data?.detectedFrameworks).toContainEqual(
          expect.objectContaining({ name: 'CustomFramework' })
        );
      });

      it('should allow overriding built-in detection rules', async () => {
        const overrideRule = {
          name: 'React',
          detect: () => 0.95, // Always high confidence
          suggestSteps: () => [
            { type: 'build', command: 'custom-react-build' }
          ]
        };
        
        engine.registerCustomRule(overrideRule);
        
        const projectData = {
          languages: ['javascript'],
          dependencies: { packages: ['react'] }
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        
        const reactFramework = result.data?.detectedFrameworks?.find(f => f.name === 'React');
        expect(reactFramework?.confidence).toBe(0.95);
      });

      it('should support plugin-based framework detection', async () => {
        const plugin = {
          name: 'GoPlugin',
          frameworks: ['Go', 'Gin', 'Echo'],
          detect: (data: any) => {
            if (data.languages?.includes('go')) {
              return { name: 'Go', confidence: 0.9 };
            }
            return null;
          }
        };
        
        engine.loadPlugin(plugin);
        
        const projectData = {
          languages: ['go'],
          files: ['go.mod', 'main.go']
        };
        
        const result = await detector.detectFrameworks(projectData);
        expect(result.success).toBe(true);
        expect(result.data?.detectedFrameworks).toContainEqual(
          expect.objectContaining({ name: 'Go' })
        );
      });
    });
  });

  // Performance tests
  describe('Framework Detection - Performance Requirements', () => {
    it('should detect frameworks within performance limits', async () => {
      const complexProjectData = {
        languages: ['javascript', 'typescript', 'python'],
        dependencies: { 
          packageManager: 'npm',
          packages: ['react', 'express', 'typescript', 'jest']
        },
        files: ['package.json', 'tsconfig.json', 'requirements.txt'],
        commands: [
          { command: 'npm run build', type: 'build' },
          { command: 'npm test', type: 'test' },
          { command: 'npm start', type: 'start' }
        ]
      };
      
      const { result, executionTime, withinLimit } = await measurePerformance(
        () => detector.detectFrameworks(complexProjectData),
        1000 // 1 second limit
      );
      
      expect(result.success).toBe(true);
      expect(withinLimit).toBe(true);
      expect(executionTime).toBeLessThan(1000);
    });

    it('should handle large numbers of dependencies efficiently', async () => {
      const largeDependencyList = Array.from({ length: 1000 }, (_, i) => `package-${i}`);
      
      const projectData = {
        languages: ['javascript'],
        dependencies: { 
          packageManager: 'npm',
          packages: largeDependencyList
        }
      };
      
      const { result, executionTime } = await measurePerformance(
        () => detector.detectFrameworks(projectData)
      );
      
      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(2000); // 2 second limit for large projects
    });
  });

  // Integration tests
  describe('Integration with README Parser', () => {
    it('should work with README parser output', async () => {
      // Simulate README parser output
      const readmeParserOutput = {
        languages: ['javascript', 'typescript'],
        commands: [
          { command: 'npm install', type: 'install' },
          { command: 'npm run build', type: 'build' },
          { command: 'npm test', type: 'test' }
        ],
        dependencies: {
          packageManager: 'npm',
          packages: ['react', '@types/react', 'typescript']
        },
        metadata: {
          title: 'React TypeScript Project'
        }
      };
      
      const result = await detector.detectFrameworks(readmeParserOutput);
      expect(result.success).toBe(true);
      expect(result.data?.detectedFrameworks).toBeDefined();
      expect(result.data?.suggestedSteps).toBeDefined();
    });
  });
});