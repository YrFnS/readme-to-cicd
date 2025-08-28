"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionButtons = void 0;
const react_1 = __importDefault(require("react"));
const ActionButtons = ({ onPreview, onGenerate, onCancel, isValid, isLoading }) => {
    return (<div className="action-buttons">
      <div className="button-group primary-actions">
        <button className="action-button preview" onClick={onPreview} disabled={isLoading} title="Preview the generated workflows before creating files">
          <span className="button-icon">👁️</span>
          <span className="button-text">Preview Workflow</span>
        </button>

        <button className={`action-button generate ${isValid ? 'enabled' : 'disabled'}`} onClick={onGenerate} disabled={!isValid || isLoading} title={isValid ? 'Generate workflow files' : 'Fix configuration errors before generating'}>
          <span className="button-icon">🚀</span>
          <span className="button-text">Generate Files</span>
        </button>
      </div>

      <div className="button-group secondary-actions">
        <button className="action-button cancel" onClick={onCancel} disabled={isLoading} title="Cancel and close configuration panel">
          <span className="button-icon">❌</span>
          <span className="button-text">Cancel</span>
        </button>
      </div>

      {isLoading && (<div className="loading-overlay">
          <div className="spinner"></div>
          <span className="loading-text">Processing...</span>
        </div>)}

      <div className="action-help">
        <div className="help-item">
          <strong>Preview:</strong> See the generated YAML workflows before creating files
        </div>
        <div className="help-item">
          <strong>Generate:</strong> Create workflow files in your repository
        </div>
        {!isValid && (<div className="help-item error">
            <strong>⚠️ Fix configuration errors before generating workflows</strong>
          </div>)}
      </div>
    </div>);
};
exports.ActionButtons = ActionButtons;
//# sourceMappingURL=ActionButtons.js.map