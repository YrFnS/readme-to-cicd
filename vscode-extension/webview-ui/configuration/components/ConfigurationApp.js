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
exports.ConfigurationApp = void 0;
const react_1 = __importStar(require("react"));
const FrameworkSelection_1 = require("./FrameworkSelection");
const WorkflowTypeSelection_1 = require("./WorkflowTypeSelection");
const DeploymentConfiguration_1 = require("./DeploymentConfiguration");
const ValidationDisplay_1 = require("./ValidationDisplay");
const ActionButtons_1 = require("./ActionButtons");
const vscode = acquireVsCodeApi();
const ConfigurationApp = () => {
    const [configuration, setConfiguration] = (0, react_1.useState)({
        frameworks: [],
        workflowTypes: ['ci'],
        deploymentPlatform: '',
        deploymentConfig: {}
    });
    const [availableFrameworks, setAvailableFrameworks] = (0, react_1.useState)([
        { id: 'nodejs', name: 'Node.js', detected: true, description: 'JavaScript runtime for server-side applications' },
        { id: 'react', name: 'React', detected: true, description: 'JavaScript library for building user interfaces' },
        { id: 'typescript', name: 'TypeScript', detected: true, description: 'Typed superset of JavaScript' },
        { id: 'python', name: 'Python', detected: false, description: 'High-level programming language' },
        { id: 'java', name: 'Java', detected: false, description: 'Object-oriented programming language' },
        { id: 'docker', name: 'Docker', detected: false, description: 'Containerization platform' },
        { id: 'go', name: 'Go', detected: false, description: 'Statically typed compiled language' },
        { id: 'rust', name: 'Rust', detected: false, description: 'Systems programming language' }
    ]);
    const [validationResult, setValidationResult] = (0, react_1.useState)({
        isValid: true,
        errors: [],
        warnings: []
    });
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    // Handle messages from the extension
    (0, react_1.useEffect)(() => {
        const handleMessage = (event) => {
            const message = event.data;
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
    (0, react_1.useEffect)(() => {
        vscode.setState(configuration);
    }, [configuration]);
    const handleConfigurationChange = (0, react_1.useCallback)((updates) => {
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
    const handleFrameworkToggle = (0, react_1.useCallback)((frameworkId, enabled) => {
        const frameworks = enabled
            ? [...configuration.frameworks, frameworkId]
            : configuration.frameworks.filter(id => id !== frameworkId);
        handleConfigurationChange({ frameworks });
    }, [configuration.frameworks, handleConfigurationChange]);
    const handleWorkflowTypeToggle = (0, react_1.useCallback)((workflowType, enabled) => {
        const workflowTypes = enabled
            ? [...configuration.workflowTypes, workflowType]
            : configuration.workflowTypes.filter(type => type !== workflowType);
        handleConfigurationChange({ workflowTypes });
    }, [configuration.workflowTypes, handleConfigurationChange]);
    const handleDeploymentChange = (0, react_1.useCallback)((platform, config) => {
        handleConfigurationChange({
            deploymentPlatform: platform,
            deploymentConfig: config
        });
    }, [handleConfigurationChange]);
    const handlePreview = (0, react_1.useCallback)(() => {
        vscode.postMessage({
            type: 'previewRequest',
            data: configuration
        });
    }, [configuration]);
    const handleGenerate = (0, react_1.useCallback)(() => {
        vscode.postMessage({
            type: 'generateRequest',
            data: configuration
        });
    }, [configuration]);
    const handleCancel = (0, react_1.useCallback)(() => {
        vscode.postMessage({
            type: 'cancelRequest'
        });
    }, []);
    return (<div className="configuration-container">
      <header className="configuration-header">
        <h1>CI/CD Workflow Configuration</h1>
        <p>Configure your GitHub Actions workflow generation settings</p>
      </header>

      <main className="configuration-content">
        <FrameworkSelection_1.FrameworkSelection frameworks={availableFrameworks} selectedFrameworks={configuration.frameworks} onFrameworkToggle={handleFrameworkToggle} isLoading={isLoading}/>

        <WorkflowTypeSelection_1.WorkflowTypeSelection selectedTypes={configuration.workflowTypes} onTypeToggle={handleWorkflowTypeToggle}/>

        <DeploymentConfiguration_1.DeploymentConfiguration platform={configuration.deploymentPlatform} config={configuration.deploymentConfig} onDeploymentChange={handleDeploymentChange}/>

        <ValidationDisplay_1.ValidationDisplay validationResult={validationResult}/>
      </main>

      <footer className="configuration-footer">
        <ActionButtons_1.ActionButtons onPreview={handlePreview} onGenerate={handleGenerate} onCancel={handleCancel} isValid={validationResult.isValid} isLoading={isLoading}/>
      </footer>
    </div>);
};
exports.ConfigurationApp = ConfigurationApp;
//# sourceMappingURL=ConfigurationApp.js.map