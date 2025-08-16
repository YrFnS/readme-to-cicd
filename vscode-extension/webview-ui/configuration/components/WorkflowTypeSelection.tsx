import React from 'react';
import { WorkflowType } from '../types';

interface WorkflowTypeSelectionProps {
  selectedTypes: string[];
  onTypeToggle: (workflowType: string, enabled: boolean) => void;
}

const WORKFLOW_TYPES: WorkflowType[] = [
  {
    id: 'ci',
    name: 'Continuous Integration (CI)',
    description: 'Automated testing, building, and code quality checks on every push',
    icon: '🔄',
    enabled: true
  },
  {
    id: 'cd',
    name: 'Continuous Deployment (CD)',
    description: 'Automated deployment to staging and production environments',
    icon: '🚀',
    enabled: false
  },
  {
    id: 'release',
    name: 'Release Automation',
    description: 'Automated versioning, changelog generation, and release publishing',
    icon: '📦',
    enabled: false
  },
  {
    id: 'maintenance',
    name: 'Maintenance Tasks',
    description: 'Scheduled dependency updates, security scans, and cleanup tasks',
    icon: '🔧',
    enabled: false
  }
];

export const WorkflowTypeSelection: React.FC<WorkflowTypeSelectionProps> = ({
  selectedTypes,
  onTypeToggle
}) => {
  const renderWorkflowType = (workflowType: WorkflowType) => {
    const isSelected = selectedTypes.includes(workflowType.id);
    
    return (
      <div 
        key={workflowType.id}
        className={`workflow-type-item ${isSelected ? 'selected' : ''}`}
      >
        <label className="workflow-type-label">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onTypeToggle(workflowType.id, e.target.checked)}
          />
          <div className="workflow-type-content">
            <div className="workflow-type-header">
              <span className="workflow-type-icon">{workflowType.icon}</span>
              <span className="workflow-type-name">{workflowType.name}</span>
              {workflowType.id === 'ci' && (
                <span className="recommended-badge">Recommended</span>
              )}
            </div>
            <p className="workflow-type-description">{workflowType.description}</p>
            
            {isSelected && (
              <div className="workflow-type-features">
                {getWorkflowFeatures(workflowType.id).map((feature, index) => (
                  <span key={index} className="feature-tag">{feature}</span>
                ))}
              </div>
            )}
          </div>
        </label>
      </div>
    );
  };

  const getWorkflowFeatures = (workflowId: string): string[] => {
    switch (workflowId) {
      case 'ci':
        return ['Unit Tests', 'Linting', 'Build Verification', 'Code Coverage'];
      case 'cd':
        return ['Environment Deployment', 'Health Checks', 'Rollback Support'];
      case 'release':
        return ['Semantic Versioning', 'Changelog', 'GitHub Releases', 'NPM Publishing'];
      case 'maintenance':
        return ['Dependency Updates', 'Security Scans', 'Performance Monitoring'];
      default:
        return [];
    }
  };

  return (
    <section className="workflow-type-selection">
      <div className="section-header">
        <h2>Workflow Types</h2>
        <p>Choose the types of workflows to generate for your project</p>
      </div>

      <div className="workflow-types-grid">
        {WORKFLOW_TYPES.map(renderWorkflowType)}
      </div>

      {selectedTypes.length === 0 && (
        <div className="empty-selection">
          <p>⚠️ No workflow types selected. At least one workflow type is required.</p>
        </div>
      )}

      {selectedTypes.length > 0 && (
        <div className="selection-summary">
          <h4>Selected Workflows:</h4>
          <div className="selected-types">
            {selectedTypes.map(typeId => {
              const workflowType = WORKFLOW_TYPES.find(wt => wt.id === typeId);
              return workflowType ? (
                <span key={typeId} className="selected-type-badge">
                  {workflowType.icon} {workflowType.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </section>
  );
};