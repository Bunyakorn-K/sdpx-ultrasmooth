"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NotificationsOutlined } from "@mui/icons-material";
import {
  Alert,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { requestJson } from "@/shared/services/http-client";
import type { Notification, NotificationPage } from "../types";

const titles: Record<Notification["kind"], string> = {
  assignment_opened: "An assignment is open for evaluation",
  deadline_reminder: "Evaluation is due within 48 hours",
  results_finalized: "Your teacher has finalized the results",
};

export function NotificationBell({
  mode = "student",
}: {
  mode?: "student" | "teacher" | "demo";
}) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [page, setPage] = useState<NotificationPage>({
    items: [],
    unreadCount: 0,
    nextCursor: null,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(mode === "student");
  const [pending, setPending] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const olderLoaded = useRef(false);
  const mutation = useRef(false);

  const refresh = useCallback(async () => {
    if (mode !== "student") return;
    if (document.visibilityState !== "visible" || mutation.current) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    try {
      const response = await requestJson<NotificationPage>(
        "/api/notifications",
        { cache: "no-store", signal: request.signal },
      );
      if (request.signal.aborted) return;
      setPage((previous) => ({
        ...response,
        items: olderLoaded.current
          ? [
              ...response.items,
              ...previous.items.filter(
                (item) =>
                  !response.items.some((latest) => latest.id === item.id),
              ),
            ]
          : response.items,
        nextCursor: olderLoaded.current
          ? previous.nextCursor
          : response.nextCursor,
      }));
      setError("");
    } catch {
      if (!request.signal.aborted)
        setError("Notifications could not be loaded. Try again.");
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "student") return;
    const update = () => {
      void refresh();
    };
    update();
    const timer = setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      controller.current?.abort();
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, [refresh, mode]);

  async function read(id?: string) {
    mutation.current = true;
    controller.current?.abort();
    setPending(true);
    setError("");
    try {
      await requestJson(
        id ? `/api/notifications/${id}/read` : "/api/notifications/read-all",
        { method: id ? "PATCH" : "POST" },
      );
      const now = new Date().toISOString();
      setPage((previous) => ({
        ...previous,
        items: previous.items.map((item) =>
          !id || item.id === id
            ? { ...item, readAt: item.readAt ?? now }
            : item,
        ),
        unreadCount: id
          ? Math.max(
              0,
              previous.unreadCount -
                (previous.items.some((item) => item.id === id && !item.readAt)
                  ? 1
                  : 0),
            )
          : 0,
      }));
      return true;
    } catch {
      setError("Could not mark notifications as read. Try again.");
      return false;
    } finally {
      mutation.current = false;
      setPending(false);
    }
  }

  async function more() {
    if (!page.nextCursor) return;
    mutation.current = true;
    controller.current?.abort();
    setPending(true);
    try {
      const response = await requestJson<NotificationPage>(
        `/api/notifications?before=${encodeURIComponent(page.nextCursor)}`,
        { cache: "no-store" },
      );
      olderLoaded.current = true;
      setPage((previous) => ({
        ...response,
        items: [
          ...previous.items,
          ...response.items.filter(
            (item) => !previous.items.some((known) => known.id === item.id),
          ),
        ],
      }));
      setError("");
    } catch {
      setError("Older notifications could not be loaded. Try again.");
    } finally {
      mutation.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          aria-label="Notifications"
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            color: "text.primary",
          }}
          aria-controls={anchor ? "notification-inbox" : undefined}
          aria-expanded={Boolean(anchor)}
          onClick={(event) => {
            setAnchor(event.currentTarget);
            void refresh();
          }}
        >
          <Badge badgeContent={page.unreadCount} max={99} color="error">
            <NotificationsOutlined />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        id="notification-inbox"
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box
          role="region"
          aria-label="Notification inbox"
          sx={{
            width: { xs: "calc(100vw - 32px)", sm: 380 },
            maxWidth: 420,
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          <Stack
            direction="row"
            sx={{ p: 2, alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography component="h2" sx={{ fontWeight: 700 }}>
              Notifications
            </Typography>
            <Button
              size="small"
              disabled={pending || !page.unreadCount}
              onClick={() => void read()}
            >
              Read all
            </Button>
          </Stack>
          <Divider />
          {mode !== "student" && (
            <Alert severity="info" sx={{ m: 2 }}>
              {mode === "demo"
                ? "Demo mode does not store notifications. Sign in with a student account to use the inbox."
                : "Notifications currently notify students when evaluation opens, a deadline approaches, or results are finalized."}
            </Alert>
          )}
          {error && (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => void refresh()}
                >
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}
          {loading ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <CircularProgress size={24} aria-label="Loading notifications" />
            </Box>
          ) : mode === "student" && !page.items.length && !error ? (
            <Typography sx={{ p: 3 }} color="text.secondary">
              No notifications yet.
            </Typography>
          ) : null}
          <List disablePadding>
            {page.items.map((item) => (
              <Box
                component="li"
                key={item.id}
                sx={{
                  listStyle: "none",
                  bgcolor: item.readAt ? "transparent" : "action.hover",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <ListItemButton
                  component={Link}
                  href={`/assignments/${encodeURIComponent(item.assignmentId)}`}
                  onClick={(event) => {
                    if (item.readAt) {
                      setAnchor(null);
                      return;
                    }
                    // Persist read state before the link navigates, without exposing score data.
                    if (!item.readAt && openingId !== item.id) {
                      event.preventDefault();
                      setOpeningId(item.id);
                      void read(item.id).then((ok) => {
                        setOpeningId(null);
                        if (ok) {
                          setAnchor(null);
                          router.push(
                            `/assignments/${encodeURIComponent(item.assignmentId)}`,
                          );
                        }
                      });
                    }
                  }}
                  disabled={pending}
                  sx={{ py: 2, gap: 1 }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      bgcolor: item.readAt ? "transparent" : "primary.main",
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: item.readAt ? 400 : 700 }}
                    >
                      {titles[item.kind]}
                    </Typography>
                    <Typography
                      component="time"
                      dateTime={item.createdAt}
                      variant="caption"
                      color="text.secondary"
                    >
                      {new Date(item.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </ListItemButton>
                {!item.readAt && (
                  <Button
                    size="small"
                    disabled={pending}
                    sx={{ ml: 3, mb: 1 }}
                    aria-label={`Mark ${titles[item.kind]} as read`}
                    onClick={() => void read(item.id)}
                  >
                    Mark as read
                  </Button>
                )}
              </Box>
            ))}
          </List>
          {page.nextCursor && (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Button disabled={pending} onClick={() => void more()}>
                Load older notifications
              </Button>
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
}
