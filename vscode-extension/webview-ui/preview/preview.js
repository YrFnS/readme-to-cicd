// Preview Panel JavaScript

// Get VS Code API
const vscode = acquireVsCodeApi();

// Current workflow data
let currentWorkflows = [];
let activeWorkflowIndex = 0;

// Initialize the preview panel
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    requestWorkflowPreview();
});

/**
 * Setup event listeners for user interactions
 */
function setupEventListeners() {
    // Edit Configuration button
    document.getElementById('edit-config-btn').addEventListener('click', () => {
        vscode.postMessage({
            type: 'editConfiguration'
        });
    });

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
        requestWorkflowPreview();
    });

    // Copy button
    document.getElementById('copy-btn').addEventListener('click', () => {
        const content = document.getElementById('workflow-content').textContent;
        navigator.clipboard.writeText(content).then(() => {
            showNotification('Workflow copied to clipboard');
        });
    });

    // Download button
    document.getElementById('download-btn').addEventListener('click', () => {
        const content = document.getElementById('workflow-content').textContent;
        const filename = document.getElementById('current-file').textContent;
        downloadFile(content, filename);
    });

    // Approve button
    document.getElementById('approve-btn').addEventListener('click', () => {
        vscode.postMessage({
            type: 'approveGeneration',
            data: {
                workflows: currentWorkflows
            }
        });
    });

    // Cancel button
    document.getElementById('cancel-btn').addEventListener('click', () => {
        vscode.postMessage({
            type: 'cancelPreview'
        });
    });
}

/**
 * Request workflow preview from the extension
 */
function requestWorkflowPreview() {
    vscode.postMessage({
        type: 'requestPreview'
    });
}

/**
 * Update the preview with new workflow data
 */
function updatePreview(workflows) {
    currentWorkflows = workflows;
    activeWorkflowIndex = 0;
    
    createWorkflowTabs(workflows);
    displayWorkflow(0);
}

/**
 * Create tabs for multiple workflows
 */
function createWorkflowTabs(workflows) {
    const tabsContainer = document.querySelector('.workflow-tabs');
    tabsContainer.innerHTML = '';

    workflows.forEach((workflow, index) => {
        const tab = document.createElement('div');
        tab.className = `workflow-tab ${index === 0 ? 'active' : ''}`;
        tab.textContent = workflow.filename;
        tab.addEventListener('click', () => {
            selectWorkflowTab(index);
        });
        tabsContainer.appendChild(tab);
    });
}

/**
 * Select a workflow tab
 */
function selectWorkflowTab(index) {
    // Update active tab
    document.querySelectorAll('.workflow-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });

    activeWorkflowIndex = index;
    displayWorkflow(index);
}

/**
 * Display a specific workflow
 */
function displayWorkflow(index) {
    if (!currentWorkflows[index]) return;

    const workflow = currentWorkflows[index];
    document.getElementById('current-file').textContent = workflow.filename;
    document.getElementById('workflow-content').textContent = workflow.content;
    
    // Update validation status
    updateValidationStatus(workflow.validation);
}

/**
 * Update validation status display
 */
function updateValidationStatus(validation) {
    const indicator = document.getElementById('validation-indicator');
    const message = document.getElementById('validation-message');

    if (validation.isValid) {
        indicator.textContent = '✓';
        indicator.className = 'status-indicator valid';
        message.textContent = 'Workflow is valid';
    } else if (validation.hasWarnings) {
        indicator.textContent = '⚠';
        indicator.className = 'status-indicator warning';
        message.textContent = `${validation.warnings.length} warning(s)`;
    } else {
        indicator.textContent = '✗';
        indicator.className = 'status-indicator invalid';
        message.textContent = `${validation.errors.length} error(s)`;
    }
}

/**
 * Download a file with the given content
 */
function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Show a temporary notification
 */
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--vscode-notifications-background);
        color: var(--vscode-notifications-foreground);
        padding: 10px 15px;
        border-radius: 4px;
        border: 1px solid var(--vscode-notifications-border);
        z-index: 1000;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Listen for messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.type) {
        case 'previewUpdate':
            updatePreview(message.data.workflows);
            break;
        case 'validationUpdate':
            updateValidationStatus(message.data);
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
});