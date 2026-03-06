import CreateVMWizard from "../components/CreateVMWizard";

interface Props {
  onToast: (msg: string, type: "success" | "error" | "info") => void;
  onDone: () => void;
}

export default function CreateVM({ onToast, onDone }: Props) {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Create Virtual Machine</div>
          <div className="page-subtitle">Provision a new VM or clone an existing template</div>
        </div>
      </div>
      <CreateVMWizard
        onClose={onDone}
        onSuccess={(msg) => { onToast(msg, "success"); onDone(); }}
        onError={(msg) => onToast(msg, "error")}
      />
    </>
  );
}
