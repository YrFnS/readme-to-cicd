"use strict";
/**
 * Preview Webview Entry Point
 *
 * This is the main entry point for the preview webview panel.
 * It renders the React-based preview interface with syntax highlighting,
 * real-time editing, and workflow validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("react-dom/client");
const PreviewApp_1 = require("./components/PreviewApp");
// Initialize the preview application
const container = document.getElementById('preview-root');
if (container) {
    const root = (0, client_1.createRoot)(container);
    root.render(<PreviewApp_1.PreviewApp />);
}
else {
    console.error('Preview root element not found');
}
//# sourceMappingURL=index.js.map