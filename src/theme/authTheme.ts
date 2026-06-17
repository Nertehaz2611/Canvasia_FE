import type { SxProps, Theme } from "@mui/material";

export const authCardSx: SxProps<Theme> = {
  width: "min(92vw, 360px)",
  borderRadius: "var(--radius-xl)",
  p: { xs: 2.75, sm: 3.2 },
  background: "var(--surface-card)",
  border: "1px solid var(--surface-card-border)",
  boxShadow: "var(--shadow-card)",
  backdropFilter: "blur(6px)",
};

export const authInputSx: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 1.2,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    "& .MuiOutlinedInput-input": {
      color: "var(--color-text-primary)",
      fontWeight: 600,
    },
    "& .MuiOutlinedInput-input::placeholder": {
      color: "var(--color-text-muted)",
      opacity: 0.7,
    },
    "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus": {
      WebkitTextFillColor: "var(--color-text-primary)",
      WebkitBoxShadow: "0 0 0 1000px rgba(255, 255, 255, 0.6) inset",
      transition: "background-color 9999s ease-out 0s",
      caretColor: "var(--color-text-primary)",
    },
    "& fieldset": {
      borderWidth: 2,
      borderColor: "rgba(17, 24, 12, 0.35)",
    },
    "&:hover fieldset": {
      borderColor: "var(--color-forest-900)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "var(--color-forest-900)",
    },
  },
};

export const primaryButtonSx: SxProps<Theme> = {
  textTransform: "none",
  fontWeight: 800,
  py: 1.2,
  borderRadius: "var(--radius-pill)",
  bgcolor: "#111111",
  color: "#ffffff",
  "&:hover": { 
    bgcolor: "#000000",
    color: "#ffffff",
  },
};

export const outlineButtonSx: SxProps<Theme> = {
  textTransform: "none",
  fontWeight: 800,
  py: 1.2,
  borderRadius: "var(--radius-pill)",
  color: "#1d2519",
  borderColor: "rgba(17, 24, 12, 0.34)",
  bgcolor: "#f5f7f3",
  "&:hover": {
    borderColor: "rgba(17, 24, 12, 0.48)",
    bgcolor: "#edf1e8",
    color: "#1d2519",
  },
};

export const googleButtonSx: SxProps<Theme> = {
  textTransform: "none",
  fontWeight: 800,
  py: 1.2,
  borderRadius: "var(--radius-pill)",
  bgcolor: "#ffffff",
  color: "var(--color-text-primary)",
  boxShadow: "none",
  border: "1px solid rgba(17, 24, 12, 0.28)",
  "&:hover": {
    boxShadow: "none",
    bgcolor: "#f8f8f8",
  },
};

export const switchCopySx: SxProps<Theme> = {
  textAlign: "center",
  fontSize: "0.86rem",
  color: "#455142",
  fontWeight: 700,
  mt: 0.5,
};

export const authFooterSx: SxProps<Theme> = {
  textAlign: "center",
  mt: 3,
  pt: 2,
  borderTop: "1px solid rgba(39, 48, 34, 0.15)",
};

export const authFooterTextSx: SxProps<Theme> = {
  color: "#6a7466",
  fontSize: "0.67rem",
  lineHeight: 1.45,
};

export const authDividerSx: SxProps<Theme> = {
  my: 1.25,
  color: "#2f392b",
  fontWeight: 800,
};
