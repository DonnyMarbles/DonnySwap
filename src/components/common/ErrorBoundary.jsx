import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>
          <h2>Something went wrong.</h2>
          <p style={{ opacity: 0.7 }}>{this.state.error?.message}</p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1.5rem',
              cursor: 'pointer',
              borderRadius: '8px',
              border: 'none',
              background: '#6c5ce7',
              color: '#fff',
              fontSize: '1rem',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
