import React, { useState, useEffect } from 'react';
import { DeploymentPlatform, DeploymentConfigField } from '../types';

interface DeploymentConfigurationProps {
  platform: string;
  config: Record<string, any>;
  onDeploymentChange: (platform: string, config: Record<string, any>) => void;
}

const DEPLOYMENT_PLATFORMS: DeploymentPlatform[] = [
  {
    id: 'github-pages',
    name: 'GitHub Pages',
    description: 'Deploy static sites directly from your GitHub repository',
    configFields: [
      {
        name: 'branch',
        type: 'select',
        label: 'Source Branch',
        description: 'Branch to deploy from',
        required: true,
        options: [
          { value: 'main', label: 'main' },
          { value: 'master', label: 'master' },
          { value: 'gh-pages', label: 'gh-pages' }
        ],
        defaultValue: 'main'
      },
      {
        name: 'buildCommand',
        type: 'text',
        label: 'Build Command',
        description: 'Command to build your site',
        defaultValue: 'npm run build'
      },
      {
        name: 'outputDir',
        type: 'text',
        label: 'Output Directory',
        description: 'Directory containing built files',
        defaultValue: 'dist'
      }
    ]
  },
  {
    id: 'netlify',
    name: 'Netlify',
    description: 'Deploy to Netlify with automatic builds and previews',
    configFields: [
      {
        name: 'siteId',
        type: 'text',
        label: 'Site ID',
        description: 'Your Netlify site ID',
        required: true
      },
      {
        name: 'buildCommand',
        type: 'text',
        label: 'Build Command',
        description: 'Command to build your site',
        defaultValue: 'npm run build'
      },
      {
        name: 'publishDir',
        type: 'text',
        label: 'Publish Directory',
        description: 'Directory to publish',
        defaultValue: 'dist'
      }
    ]
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy to Vercel with automatic deployments and previews',
    configFields: [
      {
        name: 'projectId',
        type: 'text',
        label: 'Project ID',
        description: 'Your Vercel project ID',
        required: true
      },
      {
        name: 'orgId',
        type: 'text',
        label: 'Organization ID',
        description: 'Your Vercel organization ID',
        required: true
      }
    ]
  },
  {
    id: 'aws',
    name: 'AWS S3 + CloudFront',
    description: 'Deploy to AWS S3 with CloudFront CDN',
    configFields: [
      {
        name: 'bucketName',
        type: 'text',
        label: 'S3 Bucket Name',
        description: 'Name of your S3 bucket',
        required: true
      },
      {
        name: 'region',
        type: 'select',
        label: 'AWS Region',
        description: 'AWS region for your bucket',
        required: true,
        options: [
          { value: 'us-east-1', label: 'US East (N. Virginia)' },
          { value: 'us-west-2', label: 'US West (Oregon)' },
          { value: 'eu-west-1', label: 'Europe (Ireland)' },
          { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' }
        ]
      },
      {
        name: 'distributionId',
        type: 'text',
        label: 'CloudFront Distribution ID',
        description: 'CloudFront distribution ID (optional)'
      }
    ]
  }
];

export const DeploymentConfiguration: React.FC<DeploymentConfigurationProps> = ({
  platform,
  config,
  onDeploymentChange
}) => {
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(config);
  
  const selectedPlatform = DEPLOYMENT_PLATFORMS.find(p => p.id === platform);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handlePlatformChange = (newPlatform: string) => {
    const platformDef = DEPLOYMENT_PLATFORMS.find(p => p.id === newPlatform);
    const defaultConfig: Record<string, any> = {};
    
    if (platformDef) {
      platformDef.configFields.forEach(field => {
        if (field.defaultValue !== undefined) {
          defaultConfig[field.name] = field.defaultValue;
        }
      });
    }
    
    setLocalConfig(defaultConfig);
    onDeploymentChange(newPlatform, defaultConfig);
  };

  const handleConfigChange = (fieldName: string, value: any) => {
    const newConfig = { ...localConfig, [fieldName]: value };
    setLocalConfig(newConfig);
    onDeploymentChange(platform, newConfig);
  };

  const renderConfigField = (field: DeploymentConfigField, descId?: string) => {
    const value = localConfig[field.name] || '';
    
    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <input
            type={field.type}
            id={field.name}
            value={value}
            onChange={(e) => handleConfigChange(field.name, e.target.value)}
            placeholder={field.defaultValue?.toString() || ''}
            required={field.required}
            className="config-input"
            aria-describedby={descId}
          />
        );
      
      case 'select':
        return (
          <select
            id={field.name}
            value={value}
            onChange={(e) => handleConfigChange(field.name, e.target.value)}
            required={field.required}
            className="config-select"
            aria-describedby={descId}
          >
            <option value="">Select {field.label.toLowerCase()}...</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'boolean':
        return (
          <label className="config-checkbox">
            <input
              type="checkbox"
              id={field.name}
              checked={!!value}
              onChange={(e) => handleConfigChange(field.name, e.target.checked)}
              aria-describedby={descId}
            />
            <span className="checkbox-label">Enable {field.label}</span>
          </label>
        );
      
      default:
        return null;
    }
  };

  return (
    <section className="deployment-configuration" role="region" aria-labelledby="deployment-header">
      <div className="section-header">
        <h2 id="deployment-header">Deployment Configuration</h2>
        <p>Configure deployment settings for your workflows</p>
      </div>

      <div className="platform-selection">
        <label htmlFor="deployment-platform" className="platform-label">
          Deployment Platform:
        </label>
        <select
          id="deployment-platform"
          value={platform}
          onChange={(e) => handlePlatformChange(e.target.value)}
          className="platform-select"
          aria-label="Select deployment platform"
        >
          <option value="">No deployment</option>
          {DEPLOYMENT_PLATFORMS.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {selectedPlatform && (
        <div className="platform-config">
          <div className="platform-info">
            <h3>{selectedPlatform.name}</h3>
            <p>{selectedPlatform.description}</p>
          </div>

          <div className="config-fields">
            {selectedPlatform.configFields.map(field => {
              const descId = field.description ? `${field.name}-desc` : undefined;
              return (
                <div key={field.name} className="config-field">
                  <label htmlFor={field.name} className="config-label">
                    {field.label}
                    {field.required && <span className="required-indicator">*</span>}
                  </label>
                  {renderConfigField(field, descId)}
                  {field.description && (
                    <p id={descId} className="config-description">{field.description}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="deployment-preview">
            <h4>Configuration Preview:</h4>
            <pre className="config-preview">
              {JSON.stringify(localConfig, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {!platform && (
        <div className="no-deployment" role="status" aria-label="No deployment configured">
          <div className="no-deployment-icon">📦</div>
          <h3>No Deployment Configured</h3>
          <p>Select a deployment platform above to configure automatic deployment workflows.</p>
        </div>
      )}
    </section>
  );
};