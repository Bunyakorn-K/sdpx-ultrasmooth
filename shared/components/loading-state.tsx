"use client";

import { Box, CircularProgress, Typography } from "@mui/material";

export function LoadingState({
  message = "กำลังโหลดข้อมูล...",
  minHeight = "50vh",
  showLogo = true,
}: {
  message?: string;
  minHeight?: string | number;
  showLogo?: boolean;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight,
        gap: 2,
        width: "100%",
        py: 6,
      }}
      role="status"
      aria-label={message}
    >
      {showLogo && (
        <Box
          className="wordmark"
          sx={{
            fontSize: "36px !important",
            userSelect: "none",
            color: "primary.main",
            animation: "pulseLogo 2s infinite ease-in-out",
            mb: 0.5,
            "@keyframes pulseLogo": {
              "0%, 100%": { opacity: 1, transform: "scale(1)" },
              "50%": { opacity: 0.8, transform: "scale(0.97)" },
            },
          }}
        >
          pair<span>wise</span>
          <i>✳</i>
        </Box>
      )}
      <CircularProgress
        size={36}
        thickness={4}
        sx={{ color: "primary.main" }}
      />
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: 500, letterSpacing: 0.2 }}
      >
        {message}
      </Typography>
    </Box>
  );
}
