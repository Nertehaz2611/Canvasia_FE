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
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0b0b0b",
          backgroundImage: "radial-gradient(circle at 10% 0%, rgba(54, 78, 55, 0.15), transparent 55%)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          color: "#f4f4f4",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: "Manrope, Segoe UI, sans-serif",
          fontWeight: 800,
          fontSize: "1.25rem",
          color: "#f4f4f4",
          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          paddingTop: "16px !important",
          color: "#f4f4f4",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#111111",
            borderRadius: "12px",
            "& fieldset": {
              borderColor: "rgba(255, 255, 255, 0.16)",
            },
            "&:hover fieldset": {
              borderColor: "rgba(164, 200, 168, 0.5)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "rgba(164, 200, 168, 0.8)",
              boxShadow: "0 0 0 2px rgba(59, 120, 73, 0.4)",
            },
          },
          "& .MuiOutlinedInput-input": {
            color: "#f4f4f4",
          },
          "& .MuiInputBase-input::placeholder": {
            color: "#7a8399",
            opacity: 1,
          },
          "& .MuiInputLabel-root": {
            color: "#9ea6bb",
          },
          "& .MuiInputLabel-root.Mui-focused": {
            color: "#a4c8a8",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: "#a4c8a8",
          color: "#0b0b0b",
          fontWeight: 800,
          "&:hover": {
            backgroundColor: "#8eb794",
          },
        },
        outlined: {
          borderColor: "rgba(164, 200, 168, 0.5)",
          color: "#a4c8a8",
          "&:hover": {
            backgroundColor: "rgba(164, 200, 168, 0.1)",
            borderColor: "rgba(164, 200, 168, 0.8)",
          },
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          backgroundColor: "transparent",
        },
      },
    },
    MuiStepConnector: {
      styleOverrides: {
        line: {
          borderColor: "rgba(255, 255, 255, 0.12)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          backgroundColor: "#111319",
          borderColor: "rgba(255, 255, 255, 0.12)",
          color: "#e5e9f3",
        },
        standard: {
          "&.MuiAlert-standardInfo": {
            backgroundColor: "rgba(102, 141, 179, 0.15)",
            borderColor: "rgba(102, 141, 179, 0.35)",
          },
        },
      },
    },
  },
});
