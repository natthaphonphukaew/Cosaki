import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base px-6 text-center">
          <span className="text-6xl mb-4">🎭</span>
          <h2 className="text-xl font-bold text-gray-800">Something went wrong</h2>
          <p className="mt-2 text-sm text-gray-400">Please refresh the page to continue.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-brand-gradient px-8 py-3 text-sm font-semibold text-white"
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
