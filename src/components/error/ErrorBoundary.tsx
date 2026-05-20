"use client";
import React from "react";

type FallbackRender = (error: Error, reset: () => void) => React.ReactNode;

interface Props {
  children:   React.ReactNode;
  fallback?:  React.ReactNode | FallbackRender;
  onError?:   (error: Error, info: React.ErrorInfo) => void;
  label?:     string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const label = this.props.label ?? "unknown";
    console.error(`[mnemo-error] boundary="${label}"`, {
      message:    error.message,
      name:       error.name,
      component:  info.componentStack?.split("\n")[1]?.trim() ?? "—",
    });
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      if (fallback === undefined || fallback === null) return null;
      if (typeof fallback === "function") return (fallback as FallbackRender)(error, this.reset);
      return fallback;
    }
    return this.props.children;
  }
}
