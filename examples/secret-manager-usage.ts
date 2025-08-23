/**
 * Secret Manager Usage Examples
 * 
 * This file demonstrates how to use the SecretManager for secure
 * secret storage, rotation, and management across different backends.
 */

import { SecretManager } from '../src/integration/configuration/secrets/secret-manager.js';

async function demonstrateBasicUsage() {
  console.log('=== Basic Secret Manager Usage ===');
  
  // Initialize with file backend for local development
  const secretManager = new SecretManager({
    backend: 'file',
    basePath: './secrets',
    encryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  });

  try {
    // Store a simple secret
    await secretManager.storeSecret('api-key', 'sk-1234567890abcdef');
    console.log('✓ Stored API key');

    // Store a secret with metadata
    await secretManager.storeSecret('database-password', 'super-secure-password', {
      description: 'Production database password',
      tags: { environment: 'production', type: 'database' },
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      rotationPolicy: {
        enabled: true,
        intervalDays: 30,
        autoRotate: true
      }
    });
    console.log('✓ Stored database password with metadata');

    // Retrieve secrets
    const apiKey = await secretManager.retrieveSecret('api-key');
    console.log('✓ Retrieved API key:', apiKey.substring(0, 10) + '...');

    // List all secrets
    const secrets = await secretManager.listSecrets();
    console.log('✓ Found secrets:', secrets);

    // Get secret information without exposing the value
    const dbInfo = await secretManager.getSecretInfo('database-password');
    console.log('✓ Database secret info:', {
      key: dbInfo?.key,
      tags: dbInfo?.tags,
      expiresAt: dbInfo?.expiresAt
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

async function demonstrateRotation() {
  console.log('\n=== Secret Rotation ===');
  
  const secretManager = new SecretManager({
    backend: 'file',
    basePath: './secrets'
  });

  try {
    // Store a secret that needs rotation
    await secretManager.storeSecret('jwt-secret', 'original-jwt-secret', {
      description: 'JWT signing secret',
      rotationPolicy: {
        enabled: true,
        intervalDays: 7,
        autoRotate: true
      }
    });

    const originalValue = await secretManager.retrieveSecret('jwt-secret');
    console.log('✓ Original JWT secret:', originalValue.substring(0, 10) + '...');

    // Manually rotate the secret
    await secretManager.rotateSecret('jwt-secret');
    console.log('✓ Rotated JWT secret');

    const newValue = await secretManager.retrieveSecret('jwt-secret');
    console.log('✓ New JWT secret:', newValue.substring(0, 10) + '...');
    console.log('✓ Values are different:', originalValue !== newValue);

  } catch (error) {
    console.error('Error:', error);
  }
}

async function demonstrateAuditing() {
  console.log('\n=== Auditing and Compliance ===');
  
  const secretManager = new SecretManager({
    backend: 'file',
    basePath: './secrets'
  });

  try {
    // Generate audit report
    const auditReport = await secretManager.auditSecrets();
    console.log('✓ Audit report:', {
      totalSecrets: auditReport.totalSecrets,
      expiringSoon: auditReport.expiringSoon.length,
      expired: auditReport.expired.length,
      recentAccess: auditReport.recentAccess.length
    });

    // Generate compliance report
    const complianceReport = await secretManager.getComplianceReport();
    console.log('✓ Compliance report:', {
      totalSecrets: complianceReport.totalSecrets,
      encrypted: complianceReport.encrypted,
      withRotationPolicy: complianceReport.withRotationPolicy,
      accessViolations: complianceReport.accessViolations.length
    });

    // Export secrets for backup (metadata only)
    const exportData = await secretManager.exportSecrets();
    const parsed = JSON.parse(exportData);
    console.log('✓ Export contains', Object.keys(parsed.secrets).length, 'secrets');

  } catch (error) {
    console.error('Error:', error);
  }
}

async function demonstrateCloudBackends() {
  console.log('\n=== Cloud Backend Configuration ===');

  // HashiCorp Vault configuration
  const vaultManager = new SecretManager({
    backend: 'vault',
    vaultConfig: {
      endpoint: 'https://vault.company.com',
      token: process.env.VAULT_TOKEN || 'hvs.example-token',
      mountPath: 'secret',
      namespace: 'production'
    }
  });
  console.log('✓ Configured Vault backend');

  // AWS Secrets Manager configuration
  const awsManager = new SecretManager({
    backend: 'aws-secrets',
    awsConfig: {
      region: 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  console.log('✓ Configured AWS Secrets Manager backend');

  // Azure Key Vault configuration
  const azureManager = new SecretManager({
    backend: 'azure-keyvault',
    azureConfig: {
      vaultUrl: 'https://company-vault.vault.azure.net',
      clientId: process.env.AZURE_CLIENT_ID || 'client-id',
      clientSecret: process.env.AZURE_CLIENT_SECRET || 'client-secret',
      tenantId: process.env.AZURE_TENANT_ID || 'tenant-id'
    }
  });
  console.log('✓ Configured Azure Key Vault backend');

  // Google Cloud Secret Manager configuration
  const gcpManager = new SecretManager({
    backend: 'gcp-secret',
    gcpConfig: {
      projectId: 'my-project-id',
      keyFilename: './service-account-key.json'
    }
  });
  console.log('✓ Configured GCP Secret Manager backend');
}

async function demonstrateBulkOperations() {
  console.log('\n=== Bulk Operations ===');
  
  const secretManager = new SecretManager({
    backend: 'file',
    basePath: './secrets'
  });

  try {
    // Validate integrity of all secrets
    const integrityResult = await secretManager.validateSecretIntegrity();
    console.log('✓ Integrity validation:', {
      valid: integrityResult.valid.length,
      invalid: integrityResult.invalid.length
    });

    // Perform bulk rotation (for secrets with rotation policies)
    const rotationResult = await secretManager.bulkRotateSecrets();
    console.log('✓ Bulk rotation:', {
      rotated: rotationResult.rotated.length,
      failed: rotationResult.failed.length
    });

    // Cleanup expired secrets
    const cleanupResult = await secretManager.cleanupExpiredSecrets();
    console.log('✓ Cleanup expired:', {
      deleted: cleanupResult.deleted.length,
      failed: cleanupResult.failed.length
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run all demonstrations
async function main() {
  try {
    await demonstrateBasicUsage();
    await demonstrateRotation();
    await demonstrateAuditing();
    await demonstrateCloudBackends();
    await demonstrateBulkOperations();
    
    console.log('\n✅ All demonstrations completed successfully!');
  } catch (error) {
    console.error('❌ Demonstration failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  demonstrateBasicUsage,
  demonstrateRotation,
  demonstrateAuditing,
  demonstrateCloudBackends,
  demonstrateBulkOperations
};