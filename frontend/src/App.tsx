import { useState } from "react";
import "./index.css";
import { useMetricsWS } from "./hooks/useWebSocket";
import { useToast } from "./hooks/useToast";
import Sidebar from "./components/Sidebar";
import ToastContainer from "./components/ToastContainer";
import Dashboard from "./pages/Dashboard";
import VMList from "./pages/VMList";
import CreateVM from "./pages/CreateVM";
import Settings from "./pages/Settings";

type Page = "dashboard" | "vms" | "create" | "settings";

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const { status, metrics } = useMetricsWS();
  const { toasts, addToast, removeToast } = useToast();

  const onToast = (msg: string, type: "success" | "error" | "info" = "info") => addToast(msg, type);

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard metrics={metrics} />;
      case "vms":
        return <VMList vms={metrics?.vms ?? []} onToast={onToast} />;
      case "create":
        return (
          <CreateVM
            onToast={onToast}
            onDone={() => setPage("vms")}
          />
        );
      case "settings":
        return <Settings />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar page={page} onNav={setPage} wsStatus={status} />
      <main className="main-content">{renderPage()}</main>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
