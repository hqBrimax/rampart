import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ChangelogPage, StatusPage } from "./pages";
import { DocsPage } from "./docs";
import Whitepaper from "./whitepaper";
import "./styles.css";

const path = window.location.pathname.replace(/\/$/, "") || "/";
const page = path === "/whitepaper" ? <Whitepaper />
  : path === "/changelog" ? <ChangelogPage />
  : path === "/status" ? <StatusPage />
  : path === "/docs" || path.startsWith("/docs/") ? <DocsPage path={path} />
  : path === "/" ? <App />
  : <main className="not-found"><h1>Page not found</h1><p>The requested Rampart page does not exist.</p><a href="/">Return home →</a></main>;

createRoot(document.getElementById("root")!).render(<StrictMode>{page}</StrictMode>);
