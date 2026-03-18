import { useState } from "react";

export default function ComponenteCSR() {
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error("Intentional crash — Error Boundary test");
  }

  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: "8px",
        color: "#79c0ff",
        fontSize: "0.9rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      Simple Rendering
      <button
        type="button"
        onClick={() => setShouldCrash(true)}
        style={{
          padding: "0.25rem 0.5rem",
          fontSize: "0.7rem",
          background: "#da3633",
          color: "#fff",
          border: "1px solid #b62324",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Crash
      </button>
    </div>
  );
}
