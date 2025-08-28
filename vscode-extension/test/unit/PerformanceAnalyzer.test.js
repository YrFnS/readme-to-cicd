"use strict";
/**
 * Performance Analyzer Tests
 *
 * Tests for workflow performance analysis and optimization recommendations.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const vscode = __importStar(require("vscode"));
const PerformanceAnalyzer_1 = require("../../src/core/PerformanceAnalyzer");
// Mock VS Code API
vitest_1.vi.mock('vscode', () => ({
    workspace: {
        fs: {
            readFile: vitest_1.vi.fn()
        }
    },
    Uri: {
        file: vitest_1.vi.fn((path) => ({ fsPath: path }))
    }
}));
(0, vitest_1.describe)('PerformanceAnalyzer', () => {
    let analyzer;
    let mockContext;
    let mockConfiguration;
    (0, vitest_1.beforeEach)(() => {
        mockContext = {
            subscriptions: [],
            workspaceState: {},
            globalState: {},
            extensionPath: '/test/path'
        };
        mockConfiguration = {
            defaultOutputDirectory: '.github/workflows',
            enableAutoGeneration: false,
            preferredWorkflowTypes: ['ci'],
            customTemplates: [],
            gitIntegration: {
                autoCommit: false,
                commitMessage: 'Update workflows',
                createPR: false
            },
            showPreviewByDefault: true,
            enableInlineValidation: true,
            notificationLevel: 'all'
        };
        analyzer = new PerformanceAnalyzer_1.PerformanceAnalyzer(mockContext, mockConfiguration);
    });
    (0, vitest_1.describe)('analyzeWorkflowPerformance', () => {
        (0, vitest_1.it)('should analyze a basic Node.js workflow', async () => {
            const mockWorkflow = {
                name: 'CI',
                on: ['push'],
                jobs: {
                    test: {
                        'runs-on': 'ubuntu-latest',
                        steps: [
                            { name: 'Checkout', uses: 'actions/checkout@v3' },
                            { name: 'Install dependencies', run: 'npm install' },
                            { name: 'Run tests', run: 'npm test' }
                        ]
                    }
                }
            };
            const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);
            const result = await analyzer.analyzeWorkflowPerformance('/test/workflow.yml');
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.workflowPath).toBe('/test/workflow.yml');
            (0, vitest_1.expect)(result.overallScore).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.cachingOpportunities).toHaveLength(1);
            (0, vitest_1.expect)(result.cachingOpportunities[0].framework).toBe('node');
            (0, vitest_1.expect)(result.recommendations).toContainEqual(vitest_1.expect.objectContaining({
                category: 'caching',
                title: vitest_1.expect.stringContaining('dependencies'),
                applicableSteps: vitest_1.expect.any(Array)
            }));
        });
        (0, vitest_1.it)('should identify Docker caching opportunities', async () => {
            const mockWorkflow = {
                name: 'Build',
                on: ['push'],
                jobs: {
                    build: {
                        'runs-on': 'ubuntu-latest',
                        steps: [
                            { name: 'Checkout', uses: 'actions/checkout@v3' },
                            { name: 'Build Docker image', run: 'docker build -t app .' }
                        ]
                    }
                }
            };
            const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);
            const result = await analyzer.analyzeWorkflowPerformance('/test/docker-workflow.yml');
            (0, vitest_1.expect)(result.cachingOpportunities).toContainEqual(vitest_1.expect.objectContaining({
                cacheType: 'docker-layers',
                framework: 'docker'
            }));
        });
        (0, vitest_1.it)('should suggest parallelization for independent jobs', async () => {
            const mockWorkflow = {
                name: 'CI/CD',
                on: ['push'],
                jobs: {
                    test: {
                        'runs-on': 'ubuntu-latest',
                        steps: [{ name: 'Run tests', run: 'npm test' }]
                    },
                    lint: {
                        'runs-on': 'ubuntu-latest',
                        steps: [{ name: 'Run linter', run: 'npm run lint' }]
                    },
                    build: {
                        'runs-on': 'ubuntu-latest',
                        needs: ['test', 'lint'],
                        steps: [{ name: 'Build', run: 'npm run build' }]
                    }
                }
            };
            const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);
            const result = await analyzer.analyzeWorkflowPerformance('/test/parallel-workflow.yml');
            (0, vitest_1.expect)(result.parallelizationSuggestions).toContainEqual(vitest_1.expect.objectContaining({
                suggestedStructure: 'parallel',
                affectedJobs: vitest_1.expect.arrayContaining(['test', 'lint'])
            }));
        });
        (0, vitest_1.it)('should identify matrix build opportunities', async () => {
            const mockWorkflow = {
                name: 'Test',
                on: ['push'],
                jobs: {
                    test: {
                        'runs-on': 'ubuntu-latest',
                        steps: [
                            { name: 'Setup Node', uses: 'actions/setup-node@v3' },
                            { name: 'Install', run: 'npm install' },
                            { name: 'Test', run: 'npm test' }
                        ]
                    }
                }
            };
            const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);
            const result = await analyzer.analyzeWorkflowPerformance('/test/matrix-workflow.yml');
            (0, vitest_1.expect)(result.parallelizationSuggestions).toContainEqual(vitest_1.expect.objectContaining({
                suggestedStructure: 'matrix',
                implementation: vitest_1.expect.objectContaining({
                    strategy: 'matrix-build'
                })
            }));
        });
        (0, vitest_1.it)('should identify performance bottlenecks', async () => {
            const mockWorkflow = {
                name: 'Slow Build',
                on: ['push'],
                jobs: {
                    build: {
                        'runs-on': 'ubuntu-latest',
                        steps: [
                            { name: 'Long build', run: 'mvn install' }, // Should be identified as slow
                            { name: 'Docker build', run: 'docker build -t app .' } // Should be identified as slow
                        ]
                    }
                }
            };
            const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);
            const result = await analyzer.analyzeWorkflowPerformance('/test/slow-workflow.yml');
            (0, vitest_1.expect)(result.bottlenecks).toHaveLength(2);
            (0, vitest_1.expect)(result.bottlenecks).toContainEqual(vitest_1.expect.objectContaining({
                type: 'slow-step',
                estimatedDuration: 300 // 5 minutes for mvn install
            }));
            (0, vitest_1.expect)(result.bottlenecks).toContainEqual(vitest_1.expect.objectContaining({
                type: 'slow-step',
                estimatedDuration: 360 // 6 minutes for docker build
            }));
        });
        (0, vitest_1.it)('should calculate overall performance score', async () => {
            const mockWorkflow = {
                name: 'Perfect Workflow',
                on: ['push'],
                jobs: {
                    test: {
                        'runs-on': 'ubuntu-latest',
                        steps: [
                            { name: 'Checkout', uses: 'actions/checkout@v3' },
                            { name: 'Cache', uses: 'actions/cache@v3' },
                            { name: 'Quick test', run: 'echo "test"' }
                        ]
                    }
                }
            };
            const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);
            const result = await analyzer.analyzeWorkflowPerformance('/test/perfect-workflow.yml');
            (0, vitest_1.expect)(result.overallScore).toBeGreaterThan(80); // Should have high score
        });
    });
    (0, vitest_1.describe)('analyzeMultipleWorkflows', () => {
        (0, vitest_1.it)('should analyze multiple workflows and find cross-workflow optimizations', async () => {
            const mockWorkflow1 = {
                name: 'Workflow 1',
                jobs: {
                    test: {
                        'runs-on': 'ubuntu-latest',
                        steps: [{ name: 'Install', run: 'npm install' }]
                    }
                }
            };
            const mockWorkflow2 = {
                name: 'Workflow 2',
                jobs: {
                    build: {
                        'runs-on': 'ubuntu-latest',
                        steps: [{ name: 'Install', run: 'npm install' }]
                    }
                }
            };
            vitest_1.vi.mocked(vscode.workspace.fs.readFile)
                .mockResolvedValueOnce(Buffer.from(JSON.stringify(mockWorkflow1)))
                .mockResolvedValueOnce(Buffer.from(JSON.stringify(mockWorkflow2)));
            const result = await analyzer.analyzeMultipleWorkflows([
                '/test/workflow1.yml',
                '/test/workflow2.yml'
            ]);
            (0, vitest_1.expect)(result.workflows).toHaveLength(2);
            (0, vitest_1.expect)(result.crossWorkflowOptimizations).toContainEqual(vitest_1.expect.objectContaining({
                type: 'shared-caching',
                affectedWorkflows: vitest_1.expect.arrayContaining(['/test/workflow1.yml', '/test/workflow2.yml'])
            }));
            (0, vitest_1.expect)(result.sharedCachingOpportunities).toHaveLength(1);
        });
    });
    (0, vitest_1.describe)('generateOptimizedWorkflow', () => {
        (0, vitest_1.it)('should apply caching recommendations', async () => {
            const mockWorkflow = {
                name: 'CI',
                jobs: {
                    test: {
                        'runs-on': 'ubuntu-latest',
                        steps: [
                            { name: 'Checkout', uses: 'actions/checkout@v3' },
                            { name: 'Install', run: 'npm install' }
                        ]
                    }
                }
            };
            const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);
            // First analyze to get recommendations
            const analysis = await analyzer.analyzeWorkflowPerformance('/test/workflow.yml');
            const cachingRecommendation = analysis.recommendations.find(r => r.category === 'caching');
            (0, vitest_1.expect)(cachingRecommendation).toBeDefined();
            // Then generate optimized workflow
            const result = await analyzer.generateOptimizedWorkflow('/test/workflow.yml', [cachingRecommendation.id]);
            (0, vitest_1.expect)(result.appliedOptimizations).toHaveLength(1);
            (0, vitest_1.expect)(result.appliedOptimizations[0].applied).toBe(true);
            (0, vitest_1.expect)(result.estimatedTimeSaving).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.optimizedContent).toContain('actions/cache');
        });
        (0, vitest_1.it)('should handle failed optimizations gracefully', async () => {
            const mockWorkflow = {
                name: 'CI',
                jobs: {
                    test: {
                        'runs-on': 'ubuntu-latest',
                        steps: [{ name: 'Test', run: 'npm test' }]
                    }
                }
            };
            const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);
            const result = await analyzer.generateOptimizedWorkflow('/test/workflow.yml', ['non-existent-recommendation']);
            (0, vitest_1.expect)(result.warnings).toContain('Recommendation non-existent-recommendation not found');
            (0, vitest_1.expect)(result.appliedOptimizations).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('framework detection', () => {
        (0, vitest_1.it)('should detect Python framework', async () => {
            const mockWorkflow = {
                name: 'Python CI',
                jobs: {
                    test: {
                        'runs-on': 'ubuntu-latest',
                        steps: [
                            { name: 'Install', run: 'pip install -r requirements.txt' }
                        ]
                    }
                }
            };
            const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);
            const result = await analyzer.analyzeWorkflowPerformance('/test/python-workflow.yml');
            (0, vitest_1.expect)(result.cachingOpportunities).toContainEqual(vitest_1.expect.objectContaining({
                framework: 'python',
                cacheType: 'dependencies'
            }));
        });
        (0, vitest_1.it)('should detect Java framework', async () => {
            const mockWorkflow = {
                name: 'Java CI',
                jobs: {
                    test: {
                        'runs-on': 'ubuntu-latest',
                        steps: [
                            { name: 'Build', run: 'mvn compile' }
                        ]
                    }
                }
            };
            const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);
            const result = await analyzer.analyzeWorkflowPerformance('/test/java-workflow.yml');
            (0, vitest_1.expect)(result.cachingOpportunities).toContainEqual(vitest_1.expect.objectContaining({
                framework: 'java',
                cacheType: 'dependencies'
            }));
        });
        (0, vitest_1.it)('should detect Go framework', async () => {
            const mockWorkflow = {
                name: 'Go CI',
                jobs: {
                    test: {
                        'runs-on': 'ubuntu-latest',
                        steps: [
                            { name: 'Download deps', run: 'go mod download' }
                        ]
                    }
                }
            };
            const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);
            const result = await analyzer.analyzeWorkflowPerformance('/test/go-workflow.yml');
            (0, vitest_1.expect)(result.cachingOpportunities).toContainEqual(vitest_1.expect.objectContaining({
                framework: 'go',
                cacheType: 'dependencies'
            }));
        });
    });
    (0, vitest_1.describe)('resource optimization', () => {
        (0, vitest_1.it)('should suggest runner optimizations', async () => {
            const mockWorkflow = {
                name: 'Simple CI',
                jobs: {
                    test: {
                        'runs-on': 'macos-latest', // Expensive runner for simple task
                        steps: [
                            { name: 'Simple test', run: 'echo "test"' }
                        ]
                    }
                }
            };
            const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);
            const result = await analyzer.analyzeWorkflowPerformance('/test/expensive-workflow.yml');
            (0, vitest_1.expect)(result.resourceOptimizations).toContainEqual(vitest_1.expect.objectContaining({
                resourceType: 'runner',
                currentUsage: 'macos-latest',
                recommendedUsage: 'ubuntu-latest',
                costImpact: 'decrease'
            }));
        });
    });
    (0, vitest_1.describe)('error handling', () => {
        (0, vitest_1.it)('should handle invalid YAML gracefully', async () => {
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from('invalid: yaml: content:'));
            await (0, vitest_1.expect)(analyzer.analyzeWorkflowPerformance('/test/invalid.yml'))
                .rejects.toThrow('Failed to analyze workflow performance');
        });
        (0, vitest_1.it)('should handle file read errors', async () => {
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(new Error('File not found'));
            await (0, vitest_1.expect)(analyzer.analyzeWorkflowPerformance('/test/missing.yml'))
                .rejects.toThrow('Failed to analyze workflow performance');
        });
    });
    (0, vitest_1.describe)('performance calculations', () => {
        (0, vitest_1.it)('should calculate estimated improvements correctly', async () => {
            const mockWorkflow = {
                name: 'Unoptimized',
                jobs: {
                    test: {
                        'runs-on': 'ubuntu-latest',
                        steps: [
                            { name: 'Install', run: 'npm install' },
                            { name: 'Build', run: 'npm run build' },
                            { name: 'Test', run: 'npm test' }
                        ]
                    }
                }
            };
            const mockWorkflowContent = Buffer.from(JSON.stringify(mockWorkflow));
            vitest_1.vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockWorkflowContent);
            const result = await analyzer.analyzeWorkflowPerformance('/test/unoptimized.yml');
            (0, vitest_1.expect)(result.estimatedImprovements).toContainEqual(vitest_1.expect.objectContaining({
                category: 'Caching',
                timeSaving: vitest_1.expect.any(Number),
                confidence: vitest_1.expect.any(Number)
            }));
            const cachingImprovement = result.estimatedImprovements.find(i => i.category === 'Caching');
            (0, vitest_1.expect)(cachingImprovement?.timeSaving).toBeGreaterThan(0);
            (0, vitest_1.expect)(cachingImprovement?.confidence).toBeGreaterThan(0);
            (0, vitest_1.expect)(cachingImprovement?.confidence).toBeLessThanOrEqual(1);
        });
    });
});
//# sourceMappingURL=PerformanceAnalyzer.test.js.map