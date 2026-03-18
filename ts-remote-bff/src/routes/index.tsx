import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#0f1419",
        color: "#f0f6fc",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
        Remote SSR — TanStack Start
      </h1>
      <p style={{ color: "#b1bac4", fontSize: "0.9rem" }}>
        This remote exposes the <code>Test</code> component via Module
        Federation.
      </p>
      <p style={{ color: "#8b949e", fontSize: "0.8rem", marginTop: "1rem" }}>
        Port: 3001
      </p>
    </div>
  );
}
