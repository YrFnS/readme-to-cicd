/**
 * Simplified CI Workflow Generator for testing
 */

import { DetectionResult, GenerationOptions, WorkflowOutput } from '../interfaces';

export class SimpleCIWorkflowGenerator {
  async generateCIWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    const content = this.createSimpleWorkflow(detectionResult);
    
    return {
      filename: 'ci.yml',
      content,
      type: 'ci',
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '1.0.0',
        detectionSummary: this.createDetectionSummary(detectionResult),
        optimizations: ['Basic CI workflow'],
        warnings: []
      }
    };
  }

  private createSimpleWorkflow(detectionResult: DetectionResult): string {
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    const languageName = primaryLanguage?.name || 'generic';
    
    return `name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup ${languageName}
        run: echo "Setting up ${languageName}"
      - name: Run tests
        run: echo "Running tests"
`;
  }

  private createDetectionSummary(detectionResult: DetectionResult): string {
    const languages = detectionResult.languages.map(l => l.name).join(', ');
    return `Languages: ${languages}`;
  }
}