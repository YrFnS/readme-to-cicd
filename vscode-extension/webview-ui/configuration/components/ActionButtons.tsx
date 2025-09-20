import React from 'react';

interface ActionButtonsProps {
  onPreview: () => void;
  onGenerate: () => void;
  onCancel: () => void;
  isValid: boolean;
  isLoading: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onPreview,
  onGenerate,
  onCancel,
  isValid,
  isLoading
}) => {
  return (
    <div className="action-buttons">
      <div className="button-group primary-actions">
        <button
          className="action-button preview"
          onClick={onPreview}
          disabled={isLoading}
          aria-label="Preview the generated workflows before creating files"
          title="Preview the generated workflows before creating files"
        >
          <span className="button-icon">👁️</span>
          <span className="button-text">Preview Workflow</span>
        </button>
    
        <button
          className={`action-button generate ${isValid ? 'enabled' : 'disabled'}`}
          onClick={onGenerate}
          disabled={!isValid || isLoading}
          aria-label={isValid ? 'Generate workflow files' : 'Fix configuration errors before generating'}
          title={isValid ? 'Generate workflow files' : 'Fix configuration errors before generating'}
        >
          <span className="button-icon">🚀</span>
          <span className="button-text">Generate Files</span>
        </button>
      </div>

      <div className="button-group secondary-actions">
        <button
          className="action-button cancel"
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Cancel and close configuration panel"
          title="Cancel and close configuration panel"
        >
          <span className="button-icon">❌</span>
          <span className="button-text">Cancel</span>
        </button>
      </div>

      {isLoading && (
        <div className="loading-overlay" role="status">
          <div className="spinner" aria-hidden="true"></div>
          <span className="loading-text" aria-label="Processing...">Processing...</span>
        </div>
      )}

      <div className="action-help" role="complementary">
        <div className="help-item">
          <strong>Preview:</strong> See the generated YAML workflows before creating files
        </div>
        <div className="help-item">
          <strong>Generate:</strong> Create workflow files in your repository
        </div>
        {!isValid && (
          <div className="help-item error">
            <strong>⚠️ Fix configuration errors before generating workflows</strong>
          </div>
        )}
      </div>
    </div>
  );
};