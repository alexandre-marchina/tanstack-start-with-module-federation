import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ErrorBoundary } from "~/components/ErrorBoundary";
import "~/styles/index.css";

const getLoaderData = createServerFn({ method: "GET" }).handler(async () => {
  return { bffMessageFromLoader: "Pre-loaded information from server" };
});

export const Route = createFileRoute("/")({
  loader: () => getLoaderData(),
  component: Home,
});

const LazyTestSSR = lazy(() => import("remote_bff/Test"));
const LazyComponenteCSR = lazy(() => import("remote_simple/ComponenteCSR"));

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

function Home() {
  const { bffMessageFromLoader } = Route.useLoaderData();

  return (
    <div className="container-box">
      <main>
        <span className="poc-badge">POC</span>
        <h1 className="poc-title">
          TanStack Start + Module Federation Validation
        </h1>
        <p className="poc-subtitle">
          Proof of concept to evaluate SSR, remotes and federated architecture
        </p>
        <section className="remote-demo">
          <div
            className="remote-demo-label"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            Remote component (remote_bff)
            <span
              style={{
                fontSize: "0.7rem",
                color: "#7ee787",
                padding: "0.2rem 0.5rem",
                background: "#238636",
                borderRadius: "4px",
              }}
              title="Loaded on server via loader before render"
            >
              {bffMessageFromLoader}
            </span>
          </div>
          <ClientOnly>
            <ErrorBoundary>
              <Suspense fallback={<div>loading...</div>}>
                <LazyTestSSR />
              </Suspense>
            </ErrorBoundary>
          </ClientOnly>
          <div className="remote-demo-label" style={{ marginTop: "1rem" }}>
            Remote component (remote_simple)
          </div>
          <ClientOnly>
            <ErrorBoundary>
              <Suspense fallback={<div>loading...</div>}>
                <LazyComponenteCSR />
              </Suspense>
            </ErrorBoundary>
          </ClientOnly>
        </section>
        <div className="section-title">Explore</div>
        <div className="poc-grid">
          <a
            href="https://tanstack.com/start/latest/docs/framework/react/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="poc-card"
          >
            <h2>
              Docs TanStack Start
              <img
                className="arrow-right"
                src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zq-uylkvT/ljhwZthlaukjlkulzlp/arrow-right.svg"
                alt=""
              />
            </h2>
            <p>Documentação oficial do TanStack Start</p>
          </a>
          <a
            href="https://github.com/module-federation/vite"
            target="_blank"
            rel="noopener noreferrer"
            className="poc-card"
          >
            <h2>
              MF Vite Plugin
              <img
                className="arrow-right"
                src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zq-uylkvT/ljhwZthlaukjlkulzlp/arrow-right.svg"
                alt=""
              />
            </h2>
            <p>Module Federation plugin for Vite</p>
          </a>
        </div>
      </main>
    </div>
  );
}
