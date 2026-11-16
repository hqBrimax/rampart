import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ChangelogPage, StatusPage } from "./pages";
import { DocsPage } from "./docs";
import Whitepaper from "./whitepaper";
import "./styles.css";

const path = window.location.pathname.replace(/\/$/, "") || "/";
const page =
  path === "/changelog"
    ? <ChangelogPage />
    : path === "/status"
    ? <StatusPage />
    : path.startsWith("/docs")
    ? <DocsPage path={path} />
    : path === "/"
    ? <Whitepaper />
    : <App />;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {page}
  </StrictMode>
);
