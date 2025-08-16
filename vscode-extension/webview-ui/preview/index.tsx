/**
 * Preview Webview Entry Point
 * 
 * This is the main entry point for the preview webview panel.
 * It renders the React-based preview interface with syntax highlighting,
 * real-time editing, and workflow validation.
 */

import { createRoot } from 'react-dom/client';
import { PreviewApp } from './components/PreviewApp';

// Initialize the preview application
const container = document.getElementById('preview-root');
if (container) {
  const root = createRoot(container);
  root.render(<PreviewApp />);
} else {
  console.error('Preview root element not found');
}