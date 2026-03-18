import { useEffect, useState } from "react";
import "./Test.css";

const API_BASE = "http://localhost:3001";

export default function Test() {
  const [text, setText] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/hello-world`)
      .then((res) => res.json())
      .then(setText)
      .catch(() => setText("Error loading"));
  }, []);

  return (
    <div
      className="test-container"
      style={{
        padding: "0.75rem 1rem",
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: "8px",
        color: "#79c0ff",
        fontSize: "0.9rem",
      }}
    >
      Rendering with BFF
      {text ? (
        <span className="test-flag" data-tooltip={text}>
          BFF
        </span>
      ) : (
        <span className="test-loading">
          <span className="test-spinner" aria-hidden />
        </span>
      )}
    </div>
  );
}
