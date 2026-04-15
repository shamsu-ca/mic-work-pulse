import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🚨 GLOBAL React Error Caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#ffebee', color: '#b71c1c', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2>🚨 React Crashed! (White Screen Prevented)</h2>
          <p><strong>Error Message:</strong> {this.state.error && this.state.error.toString()}</p>
          <hr />
          <p><strong>Component Stack:</strong></p>
          <pre style={{ background: '#ffcdd2', padding: '10px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <hr />
          <p><strong>Full Stack Trace:</strong></p>
          <pre style={{ background: '#ffcdd2', padding: '10px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#b71c1c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}
