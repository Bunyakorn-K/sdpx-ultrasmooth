import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: { main: "#ed535b", contrastText: "#ffffff" },
    secondary: { main: "#36ad94", contrastText: "#ffffff" },
    success: { main: "#2e7d32", contrastText: "#ffffff" },
    background: { default: "#fff", paper: "#fff" },
    text: { primary: "#293c43", secondary: "#64747a" },
    divider: "#e3e9e4",
  },
  typography: () => ({
    fontFamily: "Arial, Tahoma, sans-serif",
    // Add 2px to each MUI text size while retaining browser font scaling.
    pxToRem: (size: number) => `${(size + 2) / 16}rem`,
    h1: { fontSize: "3.25rem", fontWeight: 800, lineHeight: 1.3 },
    h2: { fontSize: "2.75rem", fontWeight: 800, lineHeight: 1.3 },
    h3: { fontSize: "2.5rem", fontWeight: 800, lineHeight: 1.35 },
    h4: { fontSize: "2.25rem", fontWeight: 800, lineHeight: 1.4 },
    h5: { fontSize: "1.625rem", fontWeight: 700, lineHeight: 1.5 },
    h6: { fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.5 },
    body1: { fontSize: "1.125rem", lineHeight: 1.7 },
    body2: { fontSize: "1rem", lineHeight: 1.7 },
    caption: { fontSize: "0.875rem", lineHeight: 1.6 },
    overline: { fontSize: "0.75rem", fontWeight: 600, lineHeight: 1.6 },
    button: { fontSize: "1rem", textTransform: "none", fontWeight: 600 },
  }),
  shape: { borderRadius: 12 },
  components: {
    // Bridge legacy HTML/CSS and MUI to the same source of design values.
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        ":root": {
          "--ink": theme.palette.text.primary,
          "--muted": theme.palette.text.secondary,
          "--coral": theme.palette.primary.main,
          "--mint": theme.palette.secondary.main,
          "--line": theme.palette.divider,
          "--font-body": theme.typography.fontFamily,
          "--text-display": theme.typography.h1.fontSize,
          "--text-hero": theme.typography.h2.fontSize,
          "--text-page": theme.typography.h4.fontSize,
          "--text-section": theme.typography.h5.fontSize,
          "--text-title": theme.typography.h6.fontSize,
          "--text-body": theme.typography.body1.fontSize,
          "--text-body-small": theme.typography.body2.fontSize,
          "--text-caption": theme.typography.caption.fontSize,
          "--text-label": theme.typography.overline.fontSize,
          "--text-button": theme.typography.button.fontSize,
          "--weight-regular": theme.typography.fontWeightRegular,
          "--weight-medium": theme.typography.fontWeightMedium,
          "--weight-bold": theme.typography.fontWeightBold,
        },
        body: { ...theme.typography.body1 },
        "input, select, textarea": { fontFamily: "inherit" },
        "h1:not(.MuiTypography-root)": { ...theme.typography.h4 },
        "h2:not(.MuiTypography-root)": { ...theme.typography.h5 },
        "h3:not(.MuiTypography-root)": { ...theme.typography.h6 },
      }),
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme }) => ({ ...theme.typography.h6 }),
      },
    },
    MuiAlert: {
      styleOverrides: { message: { lineHeight: 1.7 } },
    },
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
        root: ({ theme }) => ({
          borderRadius: 12,
          borderColor: theme.palette.divider,
        }),
      },
    },
    MuiPaper: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          borderColor: theme.palette.divider,
        }),
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
