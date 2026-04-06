// src/main.tsx
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.css";
import App from "./App";
import { store, persistor } from "@/store";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </PersistGate>
  </Provider>
);