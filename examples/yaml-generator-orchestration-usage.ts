/**
 * Example usage of the YAML Generator orchestration functionality
 * Demonstrates how to use the main YAMLGeneratorImpl class to coordinate all specialized generators
 */

import { YAMLGeneratorImpl } from '../src/generator/yaml-generator';
import { DetectionResult, GenerationOptions, WorkflowType } from '../src/generator/interfaces';

// Example detection result from framework detection component
const exampleDetectionResult: DetectionResult = {
  frameworks: [
    {
      name: 'React',
      version: '18.0.0',
      confidence: 0.9,
      evidence: ['package.json contains react', 'src/App.jsx exists'],
      category: 'frontend'
    },
    {
      name: 'Express',
      version: '4.18.0',
      confidence: 0.8,
      evidence: ['package.json contains express', 'server.js exists'],
      category: 'backend'
    }
  ],
  languages: [
    {
      name: 'JavaScript',
      version: '18.0.0',
      confidence: 0.95,
      primary: true
    },
    {
      name: 'TypeScript',
      version: '4.8.0',
      confidence: 0.8,
      primary: false
    }
  ],
  buildTools: [
    {
      name: 'webpack',
      configFile: 'webpack.config.js',
      confidence: 0.8
    }
  ],
  packageManagers: [
    {
      name: 'npm',
      lockFile: 'package-lock.json',
      confidence: 0.9
    }
  ],
  testingFrameworks: [
    {
      name: 'Jest',
      type: 'unit',
      confidence: 0.85
    },
    {
      name: 'Cypress',
      type: 'e2e',
      confidence: 0.7
    }
  ],
  deploymentTargets: [
    {
      platform: 'AWS',
      type: 'container',
      confidence: 0.8
    },
    {
      platform: 'Vercel',
      type: 'static',
      confidence: 0.6
    }
  ],
  projectMetadata: {
    name: 'full-stack-app',
    description: 'A full-stack React and Express application',
    version: '1.0.0',
    license: 'MIT',
    repository: 'https://github.com/example/full-stack-app',
    author: 'Example Developer'
  }
};

async function demonstrateBasicUsage() {
  console.log('=== Basic YAML Generator Orchestration Usage ===\n');

  // Initialize the generator
  const generator = new YAMLGeneratorImpl({
    baseTemplatesPath: './templates',
    cacheEnabled: true
  });

  // 1. Generate a single CI workflow with default options
  console.log('1. Generating CI workflow with default options...');
  const ciWorkflow = await generator.generateWorkflow(exampleDetectionResult);
  console.log(`Generated: ${ciWorkflow.filename}`);
  console.log(`Type: ${ciWorkflow.type}`);
  console.log(`Optimizations: ${ciWorkflow.metadata.optimizations.join(', ')}`);
  console.log('');

  // 2. Generate a CD workflow with custom options
  console.log('2. Generating CD workflow with custom options...');
  const cdOptions: GenerationOptions = {
    workflowType: 'cd',
    optimizationLevel: 'aggressive',
    includeComments: true,
    securityLevel: 'enterprise',
    environments: [
      {
        name: 'staging',
        type: 'staging',
        approvalRequired: false,
        secrets: ['STAGING_API_KEY', 'DATABASE_URL'],
        variables: { NODE_ENV: 'staging', API_URL: 'https://api-staging.example.com' },
        deploymentStrategy: 'rolling',
        rollbackEnabled: true
      },
      {
        name: 'production',
        type: 'production',
        approvalRequired: true,
        secrets: ['PROD_API_KEY', 'DATABASE_URL'],
        variables: { NODE_ENV: 'production', API_URL: 'https://api.example.com' },
        deploymentStrategy: 'blue-green',
        rollbackEnabled: true
      }
    ],
    environmentManagement: {
      includeSecretValidation: true,
      includeOIDC: true,
      includeConfigGeneration: true,
      generateEnvFiles: true,
      autoDetectSecrets: true
    }
  };

  const cdWorkflow = await generator.generateWorkflow(exampleDetectionResult, cdOptions);
  console.log(`Generated: ${cdWorkflow.filename}`);
  console.log(`Type: ${cdWorkflow.type}`);
  console.log(`Optimizations: ${cdWorkflow.metadata.optimizations.join(', ')}`);
  console.log('');

  // 3. Generate multiple workflows
  console.log('3. Generating multiple workflows...');
  const workflowTypes: WorkflowType[] = ['ci', 'cd', 'release'];
  const multipleWorkflows = await generator.generateMultipleWorkflows(exampleDetectionResult, workflowTypes);
  console.log(`Generated ${multipleWorkflows.length} workflows:`);
  multipleWorkflows.forEach(workflow => {
    console.log(`  - ${workflow.filename} (${workflow.type})`);
  });
  console.log('');

  // 4. Generate recommended workflows
  console.log('4. Generating recommended workflows...');
  const recommendedWorkflows = await generator.generateRecommendedWorkflows(exampleDetectionResult);
  console.log(`Generated ${recommendedWorkflows.length} recommended workflows:`);
  recommendedWorkflows.forEach(workflow => {
    console.log(`  - ${workflow.filename} (${workflow.type})`);
  });
  console.log('');

  // 5. Generate complete workflow suite
  console.log('5. Generating complete workflow suite...');
  const completeWorkflows = await generator.generateCompleteWorkflowSuite(exampleDetectionResult);
  console.log(`Generated ${completeWorkflows.length} workflows in complete suite:`);
  completeWorkflows.forEach(workflow => {
    console.log(`  - ${workflow.filename} (${workflow.type})`);
  });
  console.log('');

  // 6. Get generation statistics
  console.log('6. Generation statistics...');
  const stats = generator.getGenerationStatistics(completeWorkflows);
  console.log(`Total workflows: ${stats.totalWorkflows}`);
  console.log(`Workflow types: ${JSON.stringify(stats.workflowTypes)}`);
  console.log(`Total optimizations: ${stats.totalOptimizations}`);
  console.log(`Generator version: ${stats.generatorVersion}`);
  console.log('');
}

async function demonstrateAdvancedUsage() {
  console.log('=== Advanced YAML Generator Orchestration Usage ===\n');

  // Initialize generator with custom configuration
  const generator = new YAMLGeneratorImpl({
    baseTemplatesPath: './templates',
    customTemplatesPath: './custom-templates',
    cacheEnabled: true
  });

  // 1. Generate workflow with organization policies
  console.log('1. Generating workflow with organization policies...');
  const enterpriseOptions: GenerationOptions = {
    workflowType: 'ci',
    optimizationLevel: 'standard',
    includeComments: true,
    securityLevel: 'basic', // Will be upgraded by policies
    organizationPolicies: {
      requiredSecurityScans: ['dependency-scan', 'sast', 'container-scan'],
      approvalRequired: true,
      allowedActions: [
        'actions/checkout@v4',
        'actions/setup-node@v4',
        'actions/cache@v3',
        'github/codeql-action/init@v2',
        'github/codeql-action/analyze@v2'
      ],
      blockedActions: [
        'actions/checkout@v2', // Outdated version
        'actions/setup-node@v2' // Outdated version
      ],
      environmentRestrictions: {
        production: ['admin', 'deploy-team'],
        staging: ['developer', 'qa-team']
      }
    }
  };

  const enterpriseWorkflow = await generator.generateWorkflow(exampleDetectionResult, enterpriseOptions);
  console.log(`Generated: ${enterpriseWorkflow.filename}`);
  console.log(`Security level applied: enterprise (upgraded from basic)`);
  console.log(`Optimizations: ${enterpriseWorkflow.metadata.optimizations.join(', ')}`);
  if (enterpriseWorkflow.metadata.warnings.length > 0) {
    console.log(`Warnings: ${enterpriseWorkflow.metadata.warnings.join(', ')}`);
  }
  console.log('');

  // 2. Generate workflow with custom templates
  console.log('2. Generating workflow with custom templates...');
  const customTemplateOptions: GenerationOptions = {
    workflowType: 'ci',
    optimizationLevel: 'standard',
    includeComments: true,
    securityLevel: 'standard',
    customTemplates: {
      'ci-basic': {
        name: 'Custom CI Template',
        type: 'ci',
        triggers: {
          push: { branches: ['main', 'develop'] },
          pull_request: { branches: ['main'] },
          schedule: [{ cron: '0 2 * * 1' }] // Weekly security scan
        },
        jobs: [
          {
            name: 'custom-build-and-test',
            runsOn: 'ubuntu-latest',
            steps: [
              {
                name: 'Checkout code',
                uses: 'actions/checkout@v4'
              },
              {
                name: 'Setup Node.js',
                uses: 'actions/setup-node@v4',
                with: {
                  'node-version': '18',
                  'cache': 'npm'
                }
              },
              {
                name: 'Install dependencies',
                run: 'npm ci'
              },
              {
                name: 'Run custom build script',
                run: 'npm run build:custom'
              },
              {
                name: 'Run comprehensive tests',
                run: 'npm run test:all'
              }
            ]
          }
        ]
      }
    }
  };

  const customWorkflow = await generator.generateWorkflow(exampleDetectionResult, customTemplateOptions);
  console.log(`Generated: ${customWorkflow.filename}`);
  console.log(`Used custom template: ci-basic`);
  console.log(`Optimizations: ${customWorkflow.metadata.optimizations.join(', ')}`);
  console.log('');

  // 3. Access internal managers for advanced usage
  console.log('3. Accessing internal managers...');
  const templateManager = generator.getTemplateManager();
  const environmentManager = generator.getEnvironmentManager();
  const workflowSpecializationManager = generator.getWorkflowSpecializationManager();

  console.log('Template manager available for advanced template operations');
  console.log('Environment manager available for custom environment configuration');
  console.log('Workflow specialization manager available for direct workflow type handling');
  console.log('');

  // 4. Cache management
  console.log('4. Cache management...');
  console.log('Clearing caches...');
  generator.clearCaches();
  console.log('Reloading templates...');
  await generator.reloadTemplates();
  console.log('Cache management completed');
  console.log('');

  // 5. Validation
  console.log('5. Workflow validation...');
  const sampleYaml = `
name: Sample Workflow
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: echo "Testing"
`;

  const validationResult = generator.validateWorkflow(sampleYaml);
  console.log(`Validation result: ${validationResult.isValid ? 'Valid' : 'Invalid'}`);
  if (validationResult.errors.length > 0) {
    console.log(`Errors: ${validationResult.errors.map(e => e.message).join(', ')}`);
  }
  if (validationResult.warnings.length > 0) {
    console.log(`Warnings: ${validationResult.warnings.map(w => w.message).join(', ')}`);
  }
  console.log('');
}

async function demonstrateErrorHandling() {
  console.log('=== Error Handling Demonstration ===\n');

  const generator = new YAMLGeneratorImpl({
    baseTemplatesPath: './templates',
    cacheEnabled: false
  });

  // 1. Handle invalid detection results
  console.log('1. Handling invalid detection results...');
  const invalidDetectionResult: DetectionResult = {
    frameworks: [],
    languages: [],
    buildTools: [],
    packageManagers: [],
    testingFrameworks: [],
    deploymentTargets: [],
    projectMetadata: {
      name: 'empty-project'
    }
  };

  try {
    const workflow = await generator.generateWorkflow(invalidDetectionResult);
    console.log(`Successfully generated workflow for empty project: ${workflow.filename}`);
    console.log(`Warnings: ${workflow.metadata.warnings.join(', ') || 'None'}`);
  } catch (error) {
    console.log(`Error handled: ${(error as Error).message}`);
  }
  console.log('');

  // 2. Handle incompatible workflow types
  console.log('2. Handling incompatible workflow types...');
  try {
    // This might generate warnings but should still work
    const workflows = await generator.generateMultipleWorkflows(invalidDetectionResult, ['ci', 'cd', 'release']);
    console.log(`Generated ${workflows.length} workflows despite minimal detection data`);
    workflows.forEach(workflow => {
      if (workflow.metadata.warnings.length > 0) {
        console.log(`  ${workflow.filename}: ${workflow.metadata.warnings.join(', ')}`);
      }
    });
  } catch (error) {
    console.log(`Error handled: ${(error as Error).message}`);
  }
  console.log('');
}

// Main execution
async function main() {
  try {
    await demonstrateBasicUsage();
    await demonstrateAdvancedUsage();
    await demonstrateErrorHandling();
    
    console.log('=== YAML Generator Orchestration Demo Complete ===');
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Export for use in other examples
export {
  exampleDetectionResult,
  demonstrateBasicUsage,
  demonstrateAdvancedUsage,
  demonstrateErrorHandling
};

// Run if this file is executed directly
if (require.main === module) {
  main();
}