import React from 'react';
import { PreviewConfiguration } from '../types';

interface ConfigurationPanelProps {
  configuration: PreviewConfiguration;
  onConfigurationChange: (updates: Partial<PreviewConfiguration>) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  configuration,
  onConfigurationChange
}) => {
  const handleFrameworkToggle = (frameworkId: string, enabled: boolean) => {
    const frameworks = enabled 
      ? [...configuration.frameworks, frameworkId]
      : configuration.frameworks.filter(id => id !== frameworkId);
    
    onConfigurationChange({ frameworks });
  };

  const handleWorkflowTypeToggle = (workflowType: string, enabled: boolean) => {
    const workflowTypes = enabled
      ? [...configuration.workflowTypes, workflowType]
      : configuration.workflowTypes.filter(type => type !== workflowType);
    
    onConfigurationChange({ workflowTypes });
  };

  const handleDeploymentChange = (platform: string) => {
    onConfigurationChange({ 
      deploymentPlatform: platform,
      deploymentConfig: {}
    });
  };

  const availableFrameworks = [
    { id: 'nodejs', name: 'Node.js', icon: '🟢' },
    { id: 'react', name: 'React', icon: '⚛️' },
    { id: 'typescript', name: 'TypeScript', icon: '🔷' },
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'java', name: 'Java', icon: '☕' },
    { id: 'docker', name: 'Docker', icon: '🐳' },
    { id: 'go', name: 'Go', icon: '🐹' },
    { id: 'rust', name: 'Rust', icon: '🦀' }
  ];

  const workflowTypes = [
    { id: 'ci', name: 'CI', description: 'Continuous Integration', icon: '🔄' },
    { id: 'cd', name: 'CD', description: 'Continuous Deployment', icon: '🚀' },
    { id: 'release', name: 'Release', description: 'Release Automation', icon: '📦' },
    { id: 'maintenance', name: 'Maintenance', description: 'Maintenance Tasks', icon: '🔧' }
  ];

  const deploymentPlatforms = [
    { id: '', name: 'None', icon: '🚫' },
    { id: 'github-pages', name: 'GitHub Pages', icon: '📄' },
    { id: 'netlify', name: 'Netlify', icon: '🌐' },
    { id: 'vercel', name: 'Vercel', icon: '▲' },
    { id: 'aws', name: 'AWS', icon: '☁️' }
  ];

  return (
    <div className="configuration-panel">
      <div className="panel-header">
        <h3>Configuration</h3>
        <p>Modify settings to update workflow preview</p>
      </div>

      <div className="config-section">
        <h4>
          <span className="section-icon">🔧</span>
          Frameworks ({configuration.frameworks.length})
        </h4>
        <div className="framework-list">
          {availableFrameworks.map(framework => (
            <label key={framework.id} className="framework-item">
              <input
                type="checkbox"
                checked={configuration.frameworks.includes(framework.id)}
                onChange={(e) => handleFrameworkToggle(framework.id, e.target.checked)}
              />
              <span className="framework-icon">{framework.icon}</span>
              <span className="framework-name">{framework.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="config-section">
        <h4>
          <span className="section-icon">⚙️</span>
          Workflow Types ({configuration.workflowTypes.length})
        </h4>
        <div className="workflow-type-list">
          {workflowTypes.map(workflowType => (
            <label key={workflowType.id} className="workflow-type-item">
              <input
                type="checkbox"
                checked={configuration.workflowTypes.includes(workflowType.id)}
                onChange={(e) => handleWorkflowTypeToggle(workflowType.id, e.target.checked)}
              />
              <div className="workflow-type-content">
                <div className="workflow-type-header">
                  <span className="workflow-type-icon">{workflowType.icon}</span>
                  <span className="workflow-type-name">{workflowType.name}</span>
                </div>
                <span className="workflow-type-description">{workflowType.description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="config-section">
        <h4>
          <span className="section-icon">🚀</span>
          Deployment Platform
        </h4>
        <div className="deployment-list">
          {deploymentPlatforms.map(platform => (
            <label key={platform.id} className="deployment-item">
              <input
                type="radio"
                name="deployment"
                value={platform.id}
                checked={configuration.deploymentPlatform === platform.id}
                onChange={() => handleDeploymentChange(platform.id)}
              />
              <span className="deployment-icon">{platform.icon}</span>
              <span className="deployment-name">{platform.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="config-summary">
        <h4>Current Configuration</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Frameworks:</span>
            <span className="summary-value">
              {configuration.frameworks.length > 0 
                ? configuration.frameworks.join(', ')
                : 'None selected'
              }
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Workflows:</span>
            <span className="summary-value">
              {configuration.workflowTypes.length > 0 
                ? configuration.workflowTypes.join(', ')
                : 'None selected'
              }
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Deployment:</span>
            <span className="summary-value">
              {configuration.deploymentPlatform || 'None'}
            </span>
          </div>
        </div>
      </div>

      <div className="config-actions">
        <button 
          className="config-button reset"
          onClick={() => onConfigurationChange({
            frameworks: [],
            workflowTypes: ['ci'],
            deploymentPlatform: '',
            deploymentConfig: {}
          })}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};