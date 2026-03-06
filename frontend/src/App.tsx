import { useState, Component } from "react";
import type { ReactNode } from "react";
import "./index.css";
import { useMetricsWS } from "./hooks/useWebSocket";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";
import Sidebar from "./components/Sidebar";
import ToastContainer from "./components/ToastContainer";
import Dashboard from "./pages/Dashboard";
import VMList from "./pages/VMList";
import CreateVM from "./pages/CreateVM";
import Settings from "./pages/Settings";
import Help from "./pages/Help";

type Page = "dashboard" | "vms" | "create" | "settings" | "help";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: "var(--danger)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Render Error</div>
          <div style={{ fontFamily: "monospace", fontSize: 13, background: "var(--bg-card)", padding: 16, borderRadius: 8 }}>
            {this.state.error}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => this.setState({ error: null })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const { status, metrics } = useMetricsWS();
  const { toasts, addToast, removeToast } = useToast();
  const { theme, toggle } = useTheme();

  const onToast = (msg: string, type: "success" | "error" | "info" = "info") => addToast(msg, type);

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard metrics={metrics} />;
      case "vms":       return <VMList vms={metrics?.vms ?? []} onToast={onToast} />;
      case "create":    return <CreateVM onToast={onToast} onDone={() => setPage("vms")} />;
      case "settings":  return <Settings />;
      case "help":      return <Help />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar page={page} onNav={setPage} wsStatus={status} theme={theme} onThemeToggle={toggle} />
      <main className="main-content">
        <ErrorBoundary>{renderPage()}</ErrorBoundary>
      </main>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
