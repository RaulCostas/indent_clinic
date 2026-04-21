import React from 'react';

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
    constructor(props: React.PropsWithChildren<{}>) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ errorInfo });
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#c0392b', background: '#fdf0f0', minHeight: '100vh' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⚠️ Error de renderizado</h2>
                    <pre style={{ background: '#fff', padding: '1rem', borderRadius: '4px', border: '1px solid #e74c3c', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                        <strong>Error:</strong> {this.state.error?.message}
                        {'\n\n'}
                        <strong>Stack:</strong>{'\n'}{this.state.error?.stack}
                        {'\n\n'}
                        <strong>Component Stack:</strong>{'\n'}{this.state.errorInfo?.componentStack}
                    </pre>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                        style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Reintentar
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
