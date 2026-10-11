"use client";

/** Last-resort boundary for errors in the root layout. It must render its own <html> and <body>. */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0a0a0b",
          color: "#f5f5f6",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ padding: 24, maxWidth: 560 }}>
          <p style={{ fontSize: 12, letterSpacing: "0.22em", color: "#b0b0b8" }}>ERROR</p>
          <h1 style={{ fontSize: 48, margin: "16px 0", fontWeight: 400 }}>Frame dropped.</h1>
          <p style={{ color: "#b0b0b8", lineHeight: 1.6 }}>
            The site hit an unexpected problem. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "12px 20px",
              background: "#f5f5f6",
              color: "#0a0a0b",
              border: 0,
              letterSpacing: "0.22em",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            TRY AGAIN
          </button>
        </main>
      </body>
    </html>
  );
}
