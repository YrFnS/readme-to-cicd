/**
 * Example usage of CacheStrategyGenerator in workflow generation
 */

import { CacheStrategyGenerator } from '../src/generator/utils/cache-utils';
import { DetectionResult } from '../src/generator/interfaces';
import { StepTemplate } from '../src/generator/types';

// Example: Generate cache steps for a Node.js project
function generateNodeJSWorkflowWithCaching() {
  const cacheGenerator = new CacheStrategyGenerator();
  
  // Generate cache strategies for npm
  const cacheStrategies = cacheGenerator.generateNodeJSCaching('npm');
  
  // Convert cache strategies to GitHub Actions steps
  const cacheSteps: StepTemplate[] = cacheStrategies.map((strategy, index) => ({
    name: `Cache ${strategy.type} - ${strategy.paths.join(', ')}`,
    uses: 'actions/cache@v4',
    with: {
      path: strategy.paths.join('\n'),
      key: strategy.key,
      'restore-keys': strategy.restoreKeys.join('\n')
    },
    if: strategy.conditions?.[0]
  }));
  
  console.log('Generated cache steps for Node.js:');
  console.log(JSON.stringify(cacheSteps, null, 2));
  
  return cacheSteps;
}

// Example: Generate cache configuration for multiple frameworks
function generateMultiFrameworkCaching() {
  const cacheGenerator = new CacheStrategyGenerator();
  
  const frameworks = [
    { name: 'nodejs', packageManager: 'npm' },
    { name: 'python', packageManager: 'poetry' },
    { name: 'rust' },
    { name: 'go' },
    { name: 'java', buildTool: 'maven' }
  ];
  
  const allConfigs = frameworks.map(framework => ({
    framework: framework.name,
    config: cacheGenerator.generateCacheConfig(
      framework.name,
      framework.packageManager,
      (framework as any).buildTool
    )
  }));
  
  console.log('Multi-framework cache configurations:');
  allConfigs.forEach(({ framework, config }) => {
    console.log(`${framework}:`, {
      enabled: config.enabled,
      primaryCache: config.strategy.paths,
      additionalPaths: config.customPaths
    });
  });
  
  return allConfigs;
}

// Run examples
if (require.main === module) {
  generateNodeJSWorkflowWithCaching();
  generateMultiFrameworkCaching();
}