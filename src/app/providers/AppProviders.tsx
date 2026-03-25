import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { queryClient } from "@/shared/lib/queryClient";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { ToastProvider } from "@/shared/ui/toast/ToastProvider";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
