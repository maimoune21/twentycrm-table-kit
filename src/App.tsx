import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  QueryClient as QueryClientV3,
  QueryClientProvider as QueryClientProviderV3,
} from "react-query";
import { Toaster } from "sonner";

import { UsersPage } from "./admin/dashboard/users";

const v5Client = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
const v3Client = new QueryClientV3({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

export function App() {
  return (
    <QueryClientProvider client={v5Client}>
      <QueryClientProviderV3 client={v3Client}>
        <BrowserRouter>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/admin/utilisateurs/users" replace />}
            />
            <Route
              path="/admin/utilisateurs/users/*"
              element={<UsersPage />}
            />
            <Route
              path="/admin/utilisateurs/*"
              element={<UsersPage />}
            />
            <Route path="*" element={<UsersPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProviderV3>
    </QueryClientProvider>
  );
}
