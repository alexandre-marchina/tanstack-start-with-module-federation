import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("MFE crash intercepted:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            padding: "1rem",
            background: "#1c2128",
            border: "1px solid #da3633",
            borderRadius: "8px",
            color: "#f0f6fc",
            fontSize: "0.9rem",
          }}
        >
          <strong style={{ color: "#da3633" }}>Crash intercepted</strong>
          <p style={{ margin: "0.5rem 0 0", color: "#8b949e" }}>
            Remote component (MFE) failed. Application continues working.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
