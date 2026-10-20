import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: { main: "#ed535b", contrastText: "#ffffff" },
    secondary: { main: "#36ad94", contrastText: "#ffffff" },
    success: { main: "#2e7d32", contrastText: "#ffffff" },
    background: { default: "#fff", paper: "#fff" },
    text: { primary: "#293c43", secondary: "#64747a" },
  },
  typography: () => ({
    fontFamily: "Arial, Tahoma, sans-serif",
    // Add 2px to each MUI text size while retaining browser font scaling.
    pxToRem: (size: number) => `${(size + 2) / 16}rem`,
    button: { textTransform: "none", fontWeight: 600 },
  }),
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "10px 22px",
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: {
          borderRadius: 12,
          borderColor: "#e3e9e4",
        },
      },
    },
    MuiPaper: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: {
          borderRadius: 12,
          borderColor: "#e3e9e4",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
        },
        colorPrimary: {
          "&.MuiChip-filled": {
            color: "#ffffff",
            "& .MuiChip-icon": { color: "#ffffff" },
          },
        },
        colorSecondary: {
          "&.MuiChip-filled": {
            color: "#ffffff",
            "& .MuiChip-icon": { color: "#ffffff" },
          },
        },
        colorSuccess: {
          "&.MuiChip-filled": {
            color: "#ffffff",
            "& .MuiChip-icon": { color: "#ffffff" },
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", fullWidth: true },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
  },
});
