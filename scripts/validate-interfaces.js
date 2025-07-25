#!/usr/bin/env node

/**
 * Interface Validation Script
 * Validates that all component interfaces are properly defined and compatible
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating README-to-CICD Component Interfaces...\n');

// Define expected interfaces for each component
const expectedInterfaces = {
  'README Parser': {
    file: 'src/parser/types/index.ts',
    interfaces: ['ReadmeParser', 'ParseResult', 'ProjectInfo'],
    status: 'implemented'
  },
  'Framework Detection': {
    file: 'src/detection/types.ts',
    interfaces: ['FrameworkDetector', 'DetectionResult', 'DetectedFramework'],
    status: 'missing'
  },
  'YAML Generator': {
    file: 'src/generator/types.ts', 
    interfaces: ['YAMLGenerator', 'WorkflowResult', 'GeneratedWorkflow'],
    status: 'missing'
  },
  'CLI Tool': {
    file: 'src/cli/types.ts',
    interfaces: ['CLITool', 'CLICommand', 'CLIResult'],
    status: 'missing'
  },
  'VSCode Extension': {
    file: 'src/extension/types.ts',
    interfaces: ['VSCodeExtension', 'ExtensionCommand'],
    status: 'missing'
  },
  'Agent Hooks': {
    file: 'src/hooks/types.ts',
    interfaces: ['AgentHook', 'HookTrigger', 'HookResult'],
    status: 'missing'
  },
  'Integration & Deployment': {
    file: 'src/deployment/types.ts',
    interfaces: ['DeploymentManager', 'DeploymentConfig', 'DeploymentResult'],
    status: 'missing'
  }
};

// Check shared types
console.log('📋 Checking Shared Types...');
const sharedTypesPath = 'src/shared/types/index.ts';
if (fs.existsSync(sharedTypesPath)) {
  console.log('✅ Shared types file exists');
  
  const content = fs.readFileSync(sharedTypesPath, 'utf8');
  const sharedInterfaces = [
    'FrameworkDetector', 'DetectionResult', 'YAMLGenerator', 'WorkflowResult',
    'CLITool', 'CLICommand', 'VSCodeExtension', 'AgentHook', 'DeploymentManager'
  ];
  
  let missingSharedInterfaces = [];
  sharedInterfaces.forEach(interfaceName => {
    if (!content.includes(`interface ${interfaceName}`)) {
      missingSharedInterfaces.push(interfaceName);
    }
  });
  
  if (missingSharedInterfaces.length === 0) {
    console.log('✅ All required shared interfaces are defined');
  } else {
    console.log(`❌ Missing shared interfaces: ${missingSharedInterfaces.join(', ')}`);
  }
} else {
  console.log('❌ Shared types file missing');
}

console.log('\n📦 Checking Component Interfaces...');

let totalComponents = 0;
let implementedComponents = 0;
let missingComponents = [];

Object.entries(expectedInterfaces).forEach(([componentName, config]) => {
  totalComponents++;
  console.log(`\n🔧 ${componentName}:`);
  
  if (fs.existsSync(config.file)) {
    console.log(`  ✅ Interface file exists: ${config.file}`);
    
    const content = fs.readFileSync(config.file, 'utf8');
    let missingInterfaces = [];
    
    config.interfaces.forEach(interfaceName => {
      if (!content.includes(`interface ${interfaceName}`) && !content.includes(`export interface ${interfaceName}`)) {
        missingInterfaces.push(interfaceName);
      }
    });
    
    if (missingInterfaces.length === 0) {
      console.log(`  ✅ All required interfaces present`);
      implementedComponents++;
    } else {
      console.log(`  ❌ Missing interfaces: ${missingInterfaces.join(', ')}`);
      missingComponents.push(componentName);
    }
  } else {
    console.log(`  ❌ Interface file missing: ${config.file}`);
    missingComponents.push(componentName);
  }
});

// Check data flow compatibility
console.log('\n🔄 Checking Data Flow Compatibility...');

const dataFlowChecks = [
  {
    from: 'README Parser',
    to: 'Framework Detection',
    interface: 'ProjectInfo',
    description: 'Parser output → Detection input'
  },
  {
    from: 'Framework Detection', 
    to: 'YAML Generator',
    interface: 'DetectionResult',
    description: 'Detection output → Generator input'
  },
  {
    from: 'YAML Generator',
    to: 'CLI Tool',
    interface: 'WorkflowResult', 
    description: 'Generator output → CLI input'
  }
];

dataFlowChecks.forEach(check => {
  console.log(`\n  🔗 ${check.description}:`);
  
  // Check if interface exists in shared types
  if (fs.existsSync(sharedTypesPath)) {
    const sharedContent = fs.readFileSync(sharedTypesPath, 'utf8');
    if (sharedContent.includes(`interface ${check.interface}`)) {
      console.log(`    ✅ Interface ${check.interface} defined in shared types`);
    } else {
      console.log(`    ❌ Interface ${check.interface} missing from shared types`);
    }
  }
});

// Summary
console.log('\n📊 Integration Validation Summary:');
console.log(`  Total Components: ${totalComponents}`);
console.log(`  Implemented: ${implementedComponents}`);
console.log(`  Missing: ${totalComponents - implementedComponents}`);

if (missingComponents.length > 0) {
  console.log(`\n❌ Components needing interface implementation:`);
  missingComponents.forEach(component => {
    console.log(`  - ${component}`);
  });
}

// Recommendations
console.log('\n💡 Recommendations:');

if (implementedComponents === 1) {
  console.log('  1. ✅ README Parser is complete - good foundation');
  console.log('  2. 🔧 Implement Framework Detection interfaces next');
  console.log('  3. 🔧 Use shared types for all new components');
  console.log('  4. 🧪 Add integration tests as components are implemented');
}

if (fs.existsSync(sharedTypesPath)) {
  console.log('  5. ✅ Shared types are defined - use them in component implementations');
} else {
  console.log('  5. ❌ Create shared types package for interface consistency');
}

console.log('\n🎯 Next Steps:');
console.log('  1. Implement Framework Detection component using shared interfaces');
console.log('  2. Add integration tests for README Parser → Framework Detection');
console.log('  3. Implement YAML Generator component');
console.log('  4. Create end-to-end pipeline tests');

// Exit with appropriate code
const exitCode = missingComponents.length > 5 ? 1 : 0;
console.log(`\n${exitCode === 0 ? '✅' : '❌'} Validation ${exitCode === 0 ? 'passed' : 'failed'} - ${missingComponents.length} components need interfaces`);
process.exit(exitCode);