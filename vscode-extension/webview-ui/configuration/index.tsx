import { createRoot } from 'react-dom/client';
import { ConfigurationApp } from './components/ConfigurationApp';

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ConfigurationApp />);
} else {
  console.error('Root container not found');
}