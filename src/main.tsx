import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import ErrorBoundary from './components/ErrorBoundary';
import { useRendererStore } from './store/renderer';

const FallbackUI = () => (
  <div style={{ 
    padding: '2rem', 
    maxWidth: '800px', 
    margin: '0 auto', 
    textAlign: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }}>
    <h1>Vinci Application</h1>
    <p style={{ color: '#777' }}>Loading application...</p>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallback={<FallbackUI />}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Make the renderer store globally accessible for cleanup during sign-out
// This ensures we can properly reset state between sessions
if (typeof window !== 'undefined') {
  window.rendererStore = useRendererStore;
}