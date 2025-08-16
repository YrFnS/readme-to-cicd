// Configuration Panel JavaScript

// Get VS Code API
const vscode = acquireVsCodeApi();

// Initialize the configuration panel
document.addEventListener('DOMContentLoaded', () => {
    initializeFrameworkList();
    setupEventListeners();
    loadSavedConfiguration();
});

/**
 * Initialize the framework detection list
 */
function initializeFrameworkList() {
    const frameworkList = document.querySelector('.framework-list');
    
    // Sample frameworks - will be populated from detection results
    const frameworks = [
        { id: 'nodejs', name: 'Node.js', detected: true },
        { id: 'react', name: 'React', detected: true },
        { id: 'typescript', name: 'TypeScript', detected: true },
        { id: 'python', name: 'Python', detected: false },
        { id: 'java', name: 'Java', detected: false },
        { id: 'docker', name: 'Docker', detected: false }
    ];

    frameworks.forEach(framework => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" id="framework-${framework.id}" ${framework.detected ? 'checked' : ''}>
            ${framework.name}
        `;
        frameworkList.appendChild(label);
    });
}

/**
 * Setup event listeners for user interactions
 */
function setupEventListeners() {
    // Preview button
    document.getElementById('preview-btn').addEventListener('click', () => {
        const config = gatherConfiguration();
        vscode.postMessage({
            type: 'previewRequest',
            data: config
        });
    });

    // Generate button
    document.getElementById('generate-btn').addEventListener('click', () => {
        const config = gatherConfiguration();
        vscode.postMessage({
            type: 'generateRequest',
            data: config
        });
    });

    // Cancel button
    document.getElementById('cancel-btn').addEventListener('click', () => {
        vscode.postMessage({
            type: 'cancelRequest'
        });
    });

    // Configuration change listeners
    document.addEventListener('change', (event) => {
        if (event.target.type === 'checkbox' || event.target.tagName === 'SELECT') {
            const config = gatherConfiguration();
            vscode.postMessage({
                type: 'configurationChange',
                data: config
            });
        }
    });
}

/**
 * Gather current configuration from the form
 */
function gatherConfiguration() {
    const config = {
        frameworks: [],
        workflowTypes: [],
        deploymentPlatform: document.getElementById('deployment-platform').value
    };

    // Gather selected frameworks
    document.querySelectorAll('[id^="framework-"]').forEach(checkbox => {
        if (checkbox.checked) {
            config.frameworks.push(checkbox.id.replace('framework-', ''));
        }
    });

    // Gather selected workflow types
    const workflowCheckboxes = [
        'ci-workflow',
        'cd-workflow', 
        'release-workflow',
        'maintenance-workflow'
    ];

    workflowCheckboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.checked) {
            config.workflowTypes.push(id.replace('-workflow', ''));
        }
    });

    return config;
}

/**
 * Load saved configuration from VS Code state
 */
function loadSavedConfiguration() {
    // Request saved configuration from extension
    vscode.postMessage({
        type: 'requestConfiguration'
    });
}

/**
 * Update configuration based on message from extension
 */
function updateConfiguration(config) {
    // Update framework checkboxes
    if (config.frameworks) {
        config.frameworks.forEach(framework => {
            const checkbox = document.getElementById(`framework-${framework}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

    // Update workflow type checkboxes
    if (config.workflowTypes) {
        config.workflowTypes.forEach(type => {
            const checkbox = document.getElementById(`${type}-workflow`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

    // Update deployment platform
    if (config.deploymentPlatform) {
        document.getElementById('deployment-platform').value = config.deploymentPlatform;
    }
}

// Listen for messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.type) {
        case 'configurationUpdate':
            updateConfiguration(message.data);
            break;
        case 'validationResult':
            handleValidationResult(message.data);
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
});

/**
 * Handle validation results from the extension
 */
function handleValidationResult(result) {
    // TODO: Display validation errors/warnings in the UI
    console.log('Validation result:', result);
}