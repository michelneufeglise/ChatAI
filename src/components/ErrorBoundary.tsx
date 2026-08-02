import { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="error-boundary-overlay">
          <motion.div
            className="error-boundary-card"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="error-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p className="error-message">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            {this.state.errorInfo && (
              <details className="error-details">
                <summary>Technical details</summary>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
            <motion.button
              className="error-reset-btn"
              onClick={this.handleReset}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              🔄 Reload App
            </motion.button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
