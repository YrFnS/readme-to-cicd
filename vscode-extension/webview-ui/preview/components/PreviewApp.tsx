import React, { useState, useEffect, useCallback } from 'react';
import { WorkflowPreview } from './WorkflowPreview';
import { ConfigurationPanel } from './ConfigurationPanel';
import { PreviewToolbar } from './PreviewToolbar';
import { WorkflowTabs } from './WorkflowTabs';
import { 
  PreviewState, 
  PreviewConfiguration, 
  WorkflowFile, 
  PreviewMessage,
  PreviewLayout 
} from '../types';

// VS Code API
declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
  setState: (state: any) => void;
  getState: () => any;
};

const vscode = acquireVsCodeApi();

export const PreviewApp: React.FC = () => {
  const [previewState, setPreviewState] = useState<PreviewState>({
    isLoading: true,
    error: null,
    workflows: [],
    selectedWorkflow: null,
    editMode: false,
    hasChanges: false
  });

  const [configuration, setConfiguration] = useState<PreviewConfiguration>({
    frameworks: [],
    workflowTypes: ['ci'],
    deploymentPlatform: '',
    deploymentConfig: {}
  });

  const [layout, setLayout] = useState<PreviewLayout>({
    splitView: true,
    configurationWidth: 30,
    previewWidth: 70,
    orientation: 'horizontal'
  });

  // Handle messages from the extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message: PreviewMessage = event.data;
      
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
  useEffect(() => {
    vscode.setState({ previewState, configuration, layout });
  }, [previewState, configuration, layout]);

  const handleConfigurationChange = useCallback((updates: Partial<PreviewConfiguration>) => {
    const newConfig = { ...configuration, ...updates };
    setConfiguration(newConfig);
    
    // Send configuration change to extension
    vscode.postMessage({
      type: 'configurationChange',
      data: newConfig
    });
  }, [configuration]);

  const handleWorkflowSelect = useCallback((workflowName: string) => {
    setPreviewState(prev => ({
      ...prev,
      selectedWorkflow: workflowName,
      editMode: false,
      hasChanges: false
    }));
  }, []);

  const handleEditToggle = useCallback(() => {
    setPreviewState(prev => ({
      ...prev,
      editMode: !prev.editMode,
      hasChanges: false
    }));
  }, []);

  const handleContentChange = useCallback((content: string) => {
    setPreviewState(prev => {
      const selectedWorkflow = prev.workflows.find(w => w.name === prev.selectedWorkflow);
      const hasChanges = selectedWorkflow ? content !== selectedWorkflow.content : false;
      
      return {
        ...prev,
        hasChanges,
        workflows: prev.workflows.map(workflow => 
          workflow.name === prev.selectedWorkflow 
            ? { ...workflow, content }
            : workflow
        )
      };
    });
  }, []);

  const handleSaveChanges = useCallback(() => {
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

  const handleGenerate = useCallback(() => {
    vscode.postMessage({
      type: 'generateWorkflows',
      data: {
        configuration,
        workflows: previewState.workflows
      }
    });
  }, [configuration, previewState.workflows]);

  const handleCancel = useCallback(() => {
    vscode.postMessage({
      type: 'cancelPreview'
    });
  }, []);

  const handleLayoutChange = useCallback((newLayout: Partial<PreviewLayout>) => {
    setLayout(prev => ({ ...prev, ...newLayout }));
  }, []);

  const selectedWorkflowFile = previewState.workflows.find(w => w.name === previewState.selectedWorkflow);

  if (previewState.isLoading) {
    return (
      <div className="preview-loading">
        <div className="loading-spinner"></div>
        <p>Generating workflow preview...</p>
      </div>
    );
  }

  if (previewState.error) {
    return (
      <div className="preview-error">
        <h2>Preview Error</h2>
        <p>{previewState.error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className={`preview-container ${layout.splitView ? 'split-view' : 'full-preview'}`}>
      <PreviewToolbar
        editMode={previewState.editMode}
        hasChanges={previewState.hasChanges}
        onEditToggle={handleEditToggle}
        onSave={handleSaveChanges}
        onGenerate={handleGenerate}
        onCancel={handleCancel}
        onLayoutChange={handleLayoutChange}
        layout={layout}
      />

      <div className="preview-content" style={{
        flexDirection: layout.orientation === 'horizontal' ? 'row' : 'column'
      }}>
        {layout.splitView && (
          <div 
            className="configuration-section"
            style={{ 
              width: layout.orientation === 'horizontal' ? `${layout.configurationWidth}%` : '100%',
              height: layout.orientation === 'vertical' ? `${layout.configurationWidth}%` : '100%'
            }}
          >
            <ConfigurationPanel
              configuration={configuration}
              onConfigurationChange={handleConfigurationChange}
            />
          </div>
        )}

        <div 
          className="preview-section"
          style={{ 
            width: layout.splitView && layout.orientation === 'horizontal' 
              ? `${layout.previewWidth}%` 
              : '100%',
            height: layout.splitView && layout.orientation === 'vertical' 
              ? `${layout.previewWidth}%` 
              : '100%'
          }}
        >
          <WorkflowTabs
            workflows={previewState.workflows}
            selectedWorkflow={previewState.selectedWorkflow}
            onWorkflowSelect={handleWorkflowSelect}
          />

          {selectedWorkflowFile && (
            <WorkflowPreview
              workflow={selectedWorkflowFile}
              editMode={previewState.editMode}
              onContentChange={handleContentChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};