"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Alert, CssBaseline, Snackbar, ThemeProvider } from "@mui/material";
import { theme } from "@/shared/theme/theme";
import { EmotionRegistry } from "@/shared/theme/emotion-registry";
import { WorkspaceDialogs } from "../components/workspace-dialogs";
import {
  useWorkspaceController,
  type WorkspaceController,
} from "../hooks/use-workspace-controller";

const WorkspaceContext = createContext<WorkspaceController | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const controller = useWorkspaceController();
  return (
    <EmotionRegistry>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <WorkspaceContext.Provider value={controller}>
          {children}
          <WorkspaceDialogs controller={controller} />
          {/* Success Notification */}
          <Snackbar
            open={!!controller.toast}
            autoHideDuration={4000}
            onClose={() => controller.setToast("")}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          >
            <Alert
              severity="success"
              variant="filled"
              onClose={() => controller.setToast("")}
              sx={{
                width: "100%",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              {controller.toast}
            </Alert>
          </Snackbar>

          {/* Error Notification */}
          <Snackbar
            open={!!controller.error}
            autoHideDuration={6000}
            onClose={() => controller.setError("")}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              severity="error"
              variant="filled"
              onClose={() => controller.setError("")}
              sx={{
                width: "100%",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              {controller.error}
            </Alert>
          </Snackbar>
        </WorkspaceContext.Provider>
      </ThemeProvider>
    </EmotionRegistry>
  );
}

export function useWorkspace() {
  const controller = useContext(WorkspaceContext);
  if (!controller) throw new Error("WorkspaceProvider is required");
  return controller;
}
