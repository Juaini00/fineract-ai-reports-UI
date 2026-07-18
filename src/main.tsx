import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import QueryClientProviderWrapper from "./app/provider/QuerClientProviderWrapper.tsx";
import { ThemeProvider } from "next-themes";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProviderWrapper>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <App />
      </ThemeProvider>
    </QueryClientProviderWrapper>
  </StrictMode>,
);
