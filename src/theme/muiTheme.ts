import { createTheme } from "@mui/material/styles";

export const muiTheme = createTheme({
  palette: {
    mode: "light",
    text: {
      primary: "#121712",
      secondary: "#576154",
    },
    background: {
      default: "#f3f5f1",
      paper: "#f7faf4",
    },
  },
  typography: {
    fontFamily: "Nunito Sans, Segoe UI, sans-serif",
    h1: {
      fontFamily: "Manrope, Segoe UI, sans-serif",
      fontWeight: 800,
      letterSpacing: "-0.03em",
    },
    h2: {
      fontFamily: "Manrope, Segoe UI, sans-serif",
      fontWeight: 800,
      letterSpacing: "-0.03em",
    },
    button: {
      textTransform: "none",
      fontWeight: 800,
    },
  },
  shape: {
    borderRadius: 12,
  },
});
