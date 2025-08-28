"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowTabs = void 0;
const react_1 = __importDefault(require("react"));
const WorkflowTabs = ({ workflows, selectedWorkflow, onWorkflowSelect }) => {
    const getWorkflowIcon = (workflowName) => {
        const name = workflowName.toLowerCase();
        if (name.includes('ci') || name.includes('test'))
            return '🔄';
        if (name.includes('cd') || name.includes('deploy'))
            return '🚀';
        if (name.includes('release'))
            return '📦';
        if (name.includes('security') || name.includes('scan'))
            return '🔒';
        if (name.includes('maintenance') || name.includes('update'))
            return '🔧';
        return '📄';
    };
    const getWorkflowType = (workflowName) => {
        const name = workflowName.toLowerCase();
        if (name.includes('ci') || name.includes('test'))
            return 'CI';
        if (name.includes('cd') || name.includes('deploy'))
            return 'CD';
        if (name.includes('release'))
            return 'Release';
        if (name.includes('security') || name.includes('scan'))
            return 'Security';
        if (name.includes('maintenance') || name.includes('update'))
            return 'Maintenance';
        return 'Workflow';
    };
    const formatFileSize = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    if (workflows.length === 0) {
        return (<div className="workflow-tabs empty">
        <div className="empty-state">
          <span className="empty-icon">📄</span>
          <p>No workflows generated yet</p>
        </div>
      </div>);
    }
    return (<div className="workflow-tabs">
      <div className="tabs-header">
        <h3>Generated Workflows ({workflows.length})</h3>
        <div className="tabs-actions">
          <button className="tab-action" title="Refresh workflows" onClick={() => window.location.reload()}>
            🔄
          </button>
        </div>
      </div>

      <div className="tabs-container">
        {workflows.map((workflow) => (<div key={workflow.name} className={`workflow-tab ${selectedWorkflow === workflow.name ? 'active' : ''}`} onClick={() => onWorkflowSelect(workflow.name)}>
            <div className="tab-header">
              <span className="tab-icon">{getWorkflowIcon(workflow.name)}</span>
              <span className="tab-name">{workflow.name}</span>
              <span className="tab-type">{getWorkflowType(workflow.name)}</span>
            </div>
            
            <div className="tab-details">
              <span className="tab-path">{workflow.path}</span>
              <span className="tab-size">{formatFileSize(workflow.size)}</span>
              <span className="tab-lines">{workflow.content.split('\n').length} lines</span>
            </div>

            {selectedWorkflow === workflow.name && (<div className="tab-indicator"></div>)}
          </div>))}
      </div>

      <div className="tabs-summary">
        <div className="summary-stats">
          <span>Total Size: {formatFileSize(workflows.reduce((sum, w) => sum + w.size, 0))}</span>
          <span>Total Lines: {workflows.reduce((sum, w) => sum + w.content.split('\n').length, 0)}</span>
        </div>
        
        <div className="workflow-types">
          {Array.from(new Set(workflows.map(w => getWorkflowType(w.name)))).map(type => (<span key={type} className="type-badge">{type}</span>))}
        </div>
      </div>
    </div>);
};
exports.WorkflowTabs = WorkflowTabs;
//# sourceMappingURL=WorkflowTabs.js.map