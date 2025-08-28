"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationDisplay = void 0;
const react_1 = __importDefault(require("react"));
const ValidationDisplay = ({ validationResult }) => {
    const { isValid, errors, warnings } = validationResult;
    if (isValid && errors.length === 0 && warnings.length === 0) {
        return (<section className="validation-display valid">
        <div className="validation-header">
          <span className="validation-icon success">✅</span>
          <h3>Configuration Valid</h3>
        </div>
        <p>Your workflow configuration is valid and ready to generate.</p>
      </section>);
    }
    const renderError = (error, index) => (<div key={`error-${index}`} className="validation-item error">
      <div className="validation-item-header">
        <span className="validation-icon error">❌</span>
        <span className="validation-field">{error.field}</span>
        <span className="validation-code">{error.code}</span>
      </div>
      <p className="validation-message">{error.message}</p>
    </div>);
    const renderWarning = (warning, index) => (<div key={`warning-${index}`} className="validation-item warning">
      <div className="validation-item-header">
        <span className="validation-icon warning">⚠️</span>
        <span className="validation-field">{warning.field}</span>
        <span className="validation-code">{warning.code}</span>
      </div>
      <p className="validation-message">{warning.message}</p>
    </div>);
    return (<section className={`validation-display ${isValid ? 'valid' : 'invalid'}`}>
      <div className="validation-header">
        <span className={`validation-icon ${isValid ? 'success' : 'error'}`}>
          {isValid ? '✅' : '❌'}
        </span>
        <h3>
          {isValid ? 'Configuration Valid' : 'Configuration Issues'}
        </h3>
        <div className="validation-summary">
          {errors.length > 0 && (<span className="error-count">{errors.length} error{errors.length !== 1 ? 's' : ''}</span>)}
          {warnings.length > 0 && (<span className="warning-count">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>)}
        </div>
      </div>

      {errors.length > 0 && (<div className="validation-section errors">
          <h4 className="section-title">
            <span className="section-icon">🚫</span>
            Errors (must be fixed)
          </h4>
          <div className="validation-items">
            {errors.map(renderError)}
          </div>
        </div>)}

      {warnings.length > 0 && (<div className="validation-section warnings">
          <h4 className="section-title">
            <span className="section-icon">⚠️</span>
            Warnings (recommended fixes)
          </h4>
          <div className="validation-items">
            {warnings.map(renderWarning)}
          </div>
        </div>)}

      {!isValid && (<div className="validation-help">
          <h4>Need Help?</h4>
          <ul>
            <li>Check that all required fields are filled</li>
            <li>Ensure at least one framework is selected</li>
            <li>Verify deployment configuration is complete</li>
            <li>Review workflow type selections</li>
          </ul>
        </div>)}
    </section>);
};
exports.ValidationDisplay = ValidationDisplay;
//# sourceMappingURL=ValidationDisplay.js.map