"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("react-dom/client");
const ConfigurationApp_1 = require("./components/ConfigurationApp");
// Initialize React app
const container = document.getElementById('root');
if (container) {
    const root = (0, client_1.createRoot)(container);
    root.render(<ConfigurationApp_1.ConfigurationApp />);
}
else {
    console.error('Root container not found');
}
//# sourceMappingURL=index.js.map