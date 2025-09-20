import React, { useState, useEffect, useCallback } from 'react';
import { FrameworkSelection } from './FrameworkSelection';
import { WorkflowTypeSelection } from './WorkflowTypeSelection';
import { DeploymentConfiguration } from './DeploymentConfiguration';
import { ValidationDisplay } from './ValidationDisplay';
import { ActionButtons } from './ActionButtons';
import { 
  WorkflowConfiguration, 
  Framework, 
  ValidationResult, 
  WebviewMessage 
} from '../types';

// VS Code API
declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
  setState: (state: any) => void;
  getState: () => any;
};

const vscode = acquireVsCodeApi();

export const ConfigurationApp: React.FC = () => {
  const [configuration, setConfiguration] = useState<WorkflowConfiguration>({
    frameworks: [],
    workflowTypes: ['ci'],
    deploymentPlatform: '',
    deploymentConfig: {}
  });

  const [availableFrameworks, setAvailableFrameworks] = useState<Framework[]>([
    { id: 'nodejs', name: 'Node.js', detected: true, description: 'JavaScript runtime for server-side applications' },
    { id: 'react', name: 'React', detected: true, description: 'JavaScript library for building user interfaces' },
    { id: 'typescript', name: 'TypeScript', detected: true, description: 'Typed superset of JavaScript' },
    { id: 'python', name: 'Python', detected: false, description: 'High-level programming language' },
    { id: 'java', name: 'Java', detected: false, description: 'Object-oriented programming language' },
    { id: 'docker', name: 'Docker', detected: false, description: 'Containerization platform' },
    { id: 'go', name: 'Go', detected: false, description: 'Statically typed compiled language' },
    { id: 'rust', name: 'Rust', detected: false, description: 'Systems programming language' }
  ]);

  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });

  const [isLoading, setIsLoading] = useState(false);

  // Handle messages from the extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message: WebviewMessage = event.data;
      
      switch (message.type) {
        case 'configurationUpdate':
          setConfiguration(message.data);
          break;
        case 'frameworkDetectionResult':
          setAvailableFrameworks(message.data);
          break;
        case 'validationResult':
          setValidationResult(message.data);
          break;
        case 'loadingStateChange':
          setIsLoading(message.data);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Request initial configuration
    vscode.postMessage({
      type: 'requestConfiguration'
    });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Save configuration changes
  useEffect(() => {
    vscode.setState(configuration);
  }, [configuration]);

  const handleConfigurationChange = useCallback((updates: Partial<WorkflowConfiguration>) => {
    setConfiguration(prev => {
      const newConfig = { ...prev, ...updates };
      
      // Send configuration change to extension for real-time validation
      vscode.postMessage({
        type: 'configurationChange',
        data: newConfig
      });
      
      return newConfig;
    });
  }, []);

  const handleFrameworkToggle = useCallback((frameworkId: string, enabled: boolean) => {
    const frameworks = enabled 
      ? [...configuration.frameworks, frameworkId]
      : configuration.frameworks.filter(id => id !== frameworkId);
    
    handleConfigurationChange({ frameworks });
  }, [configuration.frameworks, handleConfigurationChange]);

  const handleWorkflowTypeToggle = useCallback((workflowType: string, enabled: boolean) => {
    const workflowTypes = enabled
      ? [...configuration.workflowTypes, workflowType]
      : configuration.workflowTypes.filter(type => type !== workflowType);
    
    handleConfigurationChange({ workflowTypes });
  }, [configuration.workflowTypes, handleConfigurationChange]);

  const handleDeploymentChange = useCallback((platform: string, config: Record<string, any>) => {
    handleConfigurationChange({ 
      deploymentPlatform: platform,
      deploymentConfig: config
    });
  }, [handleConfigurationChange]);

  const handlePreview = useCallback(() => {
    vscode.postMessage({
      type: 'previewRequest',
      data: configuration
    });
  }, [configuration]);

  const handleGenerate = useCallback(() => {
    vscode.postMessage({
      type: 'generateRequest',
      data: configuration
    });
  }, [configuration]);

  const handleCancel = useCallback(() => {
    vscode.postMessage({
      type: 'cancelRequest'
    });
  }, []);

  return (
    <div className="configuration-container">
      <header className="configuration-header" role="banner">
        <h1>CI/CD Workflow Configuration</h1>
        <p>Configure your GitHub Actions workflow generation settings</p>
      </header>

      <main className="configuration-content" role="main">
        <FrameworkSelection
          frameworks={availableFrameworks}
          selectedFrameworks={configuration.frameworks}
          onFrameworkToggle={handleFrameworkToggle}
          isLoading={isLoading}
        />

        <WorkflowTypeSelection
          selectedTypes={configuration.workflowTypes}
          onTypeToggle={handleWorkflowTypeToggle}
        />

        <DeploymentConfiguration
          platform={configuration.deploymentPlatform}
          config={configuration.deploymentConfig}
          onDeploymentChange={handleDeploymentChange}
        />

        <ValidationDisplay
          validationResult={validationResult}
        />
      </main>

      <footer className="configuration-footer" role="contentinfo">
        <ActionButtons
          onPreview={handlePreview}
          onGenerate={handleGenerate}
          onCancel={handleCancel}
          isValid={validationResult.isValid}
          isLoading={isLoading}
        />
      </footer>
    </div>
  );
};