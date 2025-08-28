"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewApp = void 0;
const react_1 = __importStar(require("react"));
const WorkflowPreview_1 = require("./WorkflowPreview");
const ConfigurationPanel_1 = require("./ConfigurationPanel");
const PreviewToolbar_1 = require("./PreviewToolbar");
const WorkflowTabs_1 = require("./WorkflowTabs");
const vscode = acquireVsCodeApi();
const PreviewApp = () => {
    const [previewState, setPreviewState] = (0, react_1.useState)({
        isLoading: true,
        error: null,
        workflows: [],
        selectedWorkflow: null,
        editMode: false,
        hasChanges: false
    });
    const [configuration, setConfiguration] = (0, react_1.useState)({
        frameworks: [],
        workflowTypes: ['ci'],
        deploymentPlatform: '',
        deploymentConfig: {}
    });
    const [layout, setLayout] = (0, react_1.useState)({
        splitView: true,
        configurationWidth: 30,
        previewWidth: 70,
        orientation: 'horizontal'
    });
    // Handle messages from the extension
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
            switch (message.type) {
                case 'previewUpdate':
                    setPreviewState(prev => ({
                        ...prev,
                        workflows: message.data.workflows,
                        isLoading: false,
                        error: null,
                        selectedWorkflow: message.data.workflows[0]?.name || null
                    }));
                    break;
                case 'configurationChange':
                    setConfiguration(message.data);
                    // Request updated preview
                    vscode.postMessage({
                        type: 'requestPreviewUpdate',
                        data: message.data
                    });
                    break;
                default:
                    console.log('Unknown message type:', message.type);
            }
        };
        window.addEventListener('message', handleMessage);
        // Request initial preview data
        vscode.postMessage({
            type: 'requestInitialPreview'
        });
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);
    // Save state changes
    (0, react_1.useEffect)(() => {
        vscode.setState({ previewState, configuration, layout });
    }, [previewState, configuration, layout]);
    const handleConfigurationChange = (0, react_1.useCallback)((updates) => {
        const newConfig = { ...configuration, ...updates };
        setConfiguration(newConfig);
        // Send configuration change to extension
        vscode.postMessage({
            type: 'configurationChange',
            data: newConfig
        });
    }, [configuration]);
    const handleWorkflowSelect = (0, react_1.useCallback)((workflowName) => {
        setPreviewState(prev => ({
            ...prev,
            selectedWorkflow: workflowName,
            editMode: false,
            hasChanges: false
        }));
    }, []);
    const handleEditToggle = (0, react_1.useCallback)(() => {
        setPreviewState(prev => ({
            ...prev,
            editMode: !prev.editMode,
            hasChanges: false
        }));
    }, []);
    const handleContentChange = (0, react_1.useCallback)((content) => {
        setPreviewState(prev => {
            const selectedWorkflow = prev.workflows.find(w => w.name === prev.selectedWorkflow);
            const hasChanges = selectedWorkflow ? content !== selectedWorkflow.content : false;
            return {
                ...prev,
                hasChanges,
                workflows: prev.workflows.map(workflow => workflow.name === prev.selectedWorkflow
                    ? { ...workflow, content }
                    : workflow)
            };
        });
    }, []);
    const handleSaveChanges = (0, react_1.useCallback)(() => {
        const selectedWorkflow = previewState.workflows.find(w => w.name === previewState.selectedWorkflow);
        if (selectedWorkflow && previewState.hasChanges) {
            vscode.postMessage({
                type: 'saveWorkflowChanges',
                data: {
                    workflowName: selectedWorkflow.name,
                    content: selectedWorkflow.content
                }
            });
            setPreviewState(prev => ({
                ...prev,
                hasChanges: false
            }));
        }
    }, [previewState]);
    const handleGenerate = (0, react_1.useCallback)(() => {
        vscode.postMessage({
            type: 'generateWorkflows',
            data: {
                configuration,
                workflows: previewState.workflows
            }
        });
    }, [configuration, previewState.workflows]);
    const handleCancel = (0, react_1.useCallback)(() => {
        vscode.postMessage({
            type: 'cancelPreview'
        });
    }, []);
    const handleLayoutChange = (0, react_1.useCallback)((newLayout) => {
        setLayout(prev => ({ ...prev, ...newLayout }));
    }, []);
    const selectedWorkflowFile = previewState.workflows.find(w => w.name === previewState.selectedWorkflow);
    if (previewState.isLoading) {
        return (<div className="preview-loading">
        <div className="loading-spinner"></div>
        <p>Generating workflow preview...</p>
      </div>);
    }
    if (previewState.error) {
        return (<div className="preview-error">
        <h2>Preview Error</h2>
        <p>{previewState.error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>);
    }
    return (<div className={`preview-container ${layout.splitView ? 'split-view' : 'full-preview'}`}>
      <PreviewToolbar_1.PreviewToolbar editMode={previewState.editMode} hasChanges={previewState.hasChanges} onEditToggle={handleEditToggle} onSave={handleSaveChanges} onGenerate={handleGenerate} onCancel={handleCancel} onLayoutChange={handleLayoutChange} layout={layout}/>

      <div className="preview-content" style={{
            flexDirection: layout.orientation === 'horizontal' ? 'row' : 'column'
        }}>
        {layout.splitView && (<div className="configuration-section" style={{
                width: layout.orientation === 'horizontal' ? `${layout.configurationWidth}%` : '100%',
                height: layout.orientation === 'vertical' ? `${layout.configurationWidth}%` : '100%'
            }}>
            <ConfigurationPanel_1.ConfigurationPanel configuration={configuration} onConfigurationChange={handleConfigurationChange}/>
          </div>)}

        <div className="preview-section" style={{
            width: layout.splitView && layout.orientation === 'horizontal'
                ? `${layout.previewWidth}%`
                : '100%',
            height: layout.splitView && layout.orientation === 'vertical'
                ? `${layout.previewWidth}%`
                : '100%'
        }}>
          <WorkflowTabs_1.WorkflowTabs workflows={previewState.workflows} selectedWorkflow={previewState.selectedWorkflow} onWorkflowSelect={handleWorkflowSelect}/>

          {selectedWorkflowFile && (<WorkflowPreview_1.WorkflowPreview workflow={selectedWorkflowFile} editMode={previewState.editMode} onContentChange={handleContentChange}/>)}
        </div>
      </div>
    </div>);
};
exports.PreviewApp = PreviewApp;
//# sourceMappingURL=PreviewApp.js.map