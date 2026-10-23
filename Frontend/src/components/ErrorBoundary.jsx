import { Component } from "react";
import { RefreshCw } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAFAFC] px-6 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Something went wrong
          </h2>
          <p className="max-w-md text-sm text-slate-600">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;