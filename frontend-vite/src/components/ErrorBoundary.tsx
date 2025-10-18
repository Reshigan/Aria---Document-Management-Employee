import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Send error to monitoring service
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Send error report to backend
    fetch('/api/errors/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }),
    }).catch(console.error);
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportIssue = () => {
    const subject = encodeURIComponent('Aria Application Error Report');
    const body = encodeURIComponent(`
Error Details:
- Message: ${this.state.error?.message || 'Unknown error'}
- Time: ${new Date().toISOString()}
- URL: ${window.location.href}
- User Agent: ${navigator.userAgent}

Please describe what you were doing when this error occurred:
[Your description here]
    `);
    
    window.open(`mailto:support@aria.vantax.co.za?subject=${subject}&body=${body}`);
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </div>

            {/* Error Title */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600 text-lg">
                We're sorry, but an unexpected error has occurred. Our team has been notified.
              </p>
            </div>

            {/* Error Details (Development Mode) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h3 className="font-semibold text-gray-900 mb-2">Error Details:</h3>
                <p className="text-sm text-red-600 font-mono mb-2">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="text-xs text-gray-600">
                    <summary className="cursor-pointer hover:text-gray-800">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={this.handleRefresh}
                className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Refresh Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                <Home className="w-5 h-5 mr-2" />
                Go Home
              </button>
              
              <button
                onClick={this.handleReportIssue}
                className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Mail className="w-5 h-5 mr-2" />
                Report Issue
              </button>
            </div>

            {/* Additional Help */}
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>
                If this problem persists, please contact our support team at{' '}
                <a 
                  href="mailto:support@aria.vantax.co.za" 
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  support@aria.vantax.co.za
                </a>
              </p>
              <p className="mt-2">
                Error ID: {Date.now().toString(36).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;