"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewToolbar = void 0;
const react_1 = __importDefault(require("react"));
const PreviewToolbar = ({ editMode, hasChanges, onEditToggle, onSave, onGenerate, onCancel, onLayoutChange, layout }) => {
    const handleLayoutToggle = () => {
        onLayoutChange({ splitView: !layout.splitView });
    };
    const handleOrientationToggle = () => {
        onLayoutChange({
            orientation: layout.orientation === 'horizontal' ? 'vertical' : 'horizontal'
        });
    };
    const handleSplitResize = (configWidth) => {
        onLayoutChange({
            configurationWidth: configWidth,
            previewWidth: 100 - configWidth
        });
    };
    return (<div className="preview-toolbar">
      <div className="toolbar-section left">
        <div className="toolbar-group">
          <button className={`toolbar-button ${editMode ? 'active' : ''}`} onClick={onEditToggle} title={editMode ? 'Exit edit mode' : 'Enter edit mode'}>
            <span className="button-icon">{editMode ? '👁️' : '✏️'}</span>
            <span className="button-text">{editMode ? 'View' : 'Edit'}</span>
          </button>

          {editMode && hasChanges && (<button className="toolbar-button save" onClick={onSave} title="Save changes (Ctrl+S)">
              <span className="button-icon">💾</span>
              <span className="button-text">Save</span>
            </button>)}
        </div>

        <div className="toolbar-separator"></div>

        <div className="toolbar-group">
          <button className={`toolbar-button ${layout.splitView ? 'active' : ''}`} onClick={handleLayoutToggle} title="Toggle split view">
            <span className="button-icon">📱</span>
            <span className="button-text">Split</span>
          </button>

          {layout.splitView && (<button className="toolbar-button" onClick={handleOrientationToggle} title={`Switch to ${layout.orientation === 'horizontal' ? 'vertical' : 'horizontal'} layout`}>
              <span className="button-icon">
                {layout.orientation === 'horizontal' ? '⬌' : '⬍'}
              </span>
              <span className="button-text">
                {layout.orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
              </span>
            </button>)}
        </div>

        {layout.splitView && (<>
            <div className="toolbar-separator"></div>
            <div className="toolbar-group">
              <label className="split-control">
                <span>Config Width:</span>
                <input type="range" min="20" max="80" value={layout.configurationWidth} onChange={(e) => handleSplitResize(parseInt(e.target.value))} className="split-slider"/>
                <span>{layout.configurationWidth}%</span>
              </label>
            </div>
          </>)}
      </div>

      <div className="toolbar-section center">
        <div className="toolbar-title">
          <span className="title-icon">📄</span>
          <span className="title-text">Workflow Preview</span>
          {hasChanges && <span className="changes-indicator">●</span>}
        </div>
      </div>

      <div className="toolbar-section right">
        <div className="toolbar-group">
          <button className="toolbar-button generate primary" onClick={onGenerate} title="Generate and save workflow files">
            <span className="button-icon">🚀</span>
            <span className="button-text">Generate Files</span>
          </button>

          <button className="toolbar-button cancel" onClick={onCancel} title="Cancel and return to configuration">
            <span className="button-icon">❌</span>
            <span className="button-text">Cancel</span>
          </button>
        </div>
      </div>

      {hasChanges && (<div className="unsaved-changes-banner">
          <span className="banner-icon">⚠️</span>
          <span className="banner-text">You have unsaved changes</span>
          <button className="banner-action" onClick={onSave}>
            Save Now
          </button>
        </div>)}
    </div>);
};
exports.PreviewToolbar = PreviewToolbar;
//# sourceMappingURL=PreviewToolbar.js.map