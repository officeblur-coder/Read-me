import { useState } from "react";

/** Thin notice on the showcase build: nothing here reaches a real kitchen. */
export default function DemoBar() {
  const [open, setOpen] = useState(true);
  if (!open || import.meta.env.VITE_DEMO_STAFF) return null;
  return (
    <div className="demo-bar" role="note">
      <span><b>Demo</b> comenzile nu sunt reale</span>
      <button onClick={() => setOpen(false)} aria-label="Închide">×</button>
    </div>
  );
}
