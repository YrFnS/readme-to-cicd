import React from 'react';
import { Framework } from '../types';

interface FrameworkSelectionProps {
  frameworks: Framework[];
  selectedFrameworks: string[];
  onFrameworkToggle: (frameworkId: string, enabled: boolean) => void;
  isLoading: boolean;
}

export const FrameworkSelection: React.FC<FrameworkSelectionProps> = ({
  frameworks,
  selectedFrameworks,
  onFrameworkToggle,
  isLoading
}) => {
  const detectedFrameworks = frameworks.filter(f => f.detected);
  const otherFrameworks = frameworks.filter(f => !f.detected);

  const renderFramework = (framework: Framework) => {
    const isSelected = selectedFrameworks.includes(framework.id);
    const confidenceLevel = framework.confidence ? Math.round(framework.confidence * 100) : null;
    
    return (
      <div 
        key={framework.id} 
        className={`framework-item ${framework.detected ? 'detected' : ''} ${isSelected ? 'selected' : ''}`}
      >
        <label className="framework-label">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onFrameworkToggle(framework.id, e.target.checked)}
            disabled={isLoading}
          />
          <div className="framework-info">
            <div className="framework-header">
              <span className="framework-name">{framework.name}</span>
              {framework.detected && (
                <span className="detection-badge">
                  Detected
                  {confidenceLevel && (
                    <span className="confidence-score">{confidenceLevel}%</span>
                  )}
                </span>
              )}
              {framework.version && (
                <span className="version-badge">{framework.version}</span>
              )}
            </div>
            <p className="framework-description">{framework.description}</p>
          </div>
        </label>
      </div>
    );
  };

  return (
    <section className="framework-selection">
      <div className="section-header">
        <h2>Framework Detection</h2>
        <p>Select the frameworks and technologies used in your project</p>
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Detecting frameworks...</span>
        </div>
      )}

      {detectedFrameworks.length > 0 && (
        <div className="framework-group">
          <h3 className="group-title">
            <span className="detection-icon">🔍</span>
            Detected Frameworks
          </h3>
          <div className="framework-grid">
            {detectedFrameworks.map(renderFramework)}
          </div>
        </div>
      )}

      {otherFrameworks.length > 0 && (
        <div className="framework-group">
          <h3 className="group-title">
            <span className="manual-icon">⚙️</span>
            Additional Frameworks
          </h3>
          <div className="framework-grid">
            {otherFrameworks.map(renderFramework)}
          </div>
        </div>
      )}

      {selectedFrameworks.length === 0 && (
        <div className="empty-selection">
          <p>⚠️ No frameworks selected. Please select at least one framework to generate workflows.</p>
        </div>
      )}
    </section>
  );
};