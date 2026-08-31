"use client";
// 全局错误边界：组件崩溃时展示可恢复界面，不白屏
import React from "react";

interface Props {
  children: React.ReactNode;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      console.error("[lab-error]", error, info.componentStack);
    } catch { /* ignore */ }
  }
  handleReset = () => {
    this.setState({ error: null });
    if (this.props.onReset) this.props.onReset();
  };
  render() {
    if (this.state.error) {
      return (
        <div className="boundaryFallback" role="alert">
          <div className="boundaryIcon" aria-hidden="true">⚠️</div>
          <h2>实验工作区遇到了一点问题</h2>
          <p className="boundaryMsg">{String(this.state.error.message || "").slice(0, 180)}</p>
          <div className="boundaryActions">
            <button className="demoBtn" onClick={this.handleReset}>重新加载实验</button>
            <button className="demoBtn" onClick={() => window.location.reload()}>刷新页面</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}