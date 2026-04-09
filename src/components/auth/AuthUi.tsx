import { Box, Button, Card, Divider, Typography, type ButtonProps, type TextFieldProps } from "@mui/material";
import TextField from "@mui/material/TextField";
import type { ReactNode } from "react";
import googleMarkIcon from "../../assets/icon/google-mark.svg";
import {
  authCardSx,
  authDividerSx,
  authFooterSx,
  authFooterTextSx,
  authInputSx,
  googleButtonSx,
  outlineButtonSx,
  primaryButtonSx,
} from "../../theme/authTheme";

export { switchCopySx } from "../../theme/authTheme";

type AuthSurfaceProps = {
  children: ReactNode;
  ariaLabel: string;
};

export function AuthSurface({ children, ariaLabel }: Readonly<AuthSurfaceProps>) {
  return (
    <Card component="section" aria-label={ariaLabel} sx={authCardSx}>
      {children}
    </Card>
  );
}

type AuthTitleProps = {
  children: ReactNode;
};

export function AuthTitle({ children }: Readonly<AuthTitleProps>) {
  return (
    <Typography
      component="h2"
      sx={{
        textAlign: "center",
        fontSize: { xs: "1.8rem", sm: "2rem" },
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: "-0.03em",
        mt: 3,
        mb: 2,
      }}
    >
      {children}
    </Typography>
  );
}

export function AuthDividerLine() {
  return (
    <Divider sx={authDividerSx}>
      <Typography component="span" variant="body2" sx={{ fontWeight: 800 }}>
        or
      </Typography>
    </Divider>
  );
}

type AuthGoogleButtonProps = {
  onClick: () => void;
  children?: ReactNode;
};

export function AuthGoogleButton({ onClick, children = "Continue with Google" }: Readonly<AuthGoogleButtonProps>) {
  return (
    <Button
      fullWidth
      variant="contained"
      onClick={onClick}
      startIcon={<img src={googleMarkIcon} alt="" width={18} height={18} />}
      sx={googleButtonSx}
    >
      {children}
    </Button>
  );
}

type AuthTextFieldProps = Omit<TextFieldProps, "size" | "fullWidth" | "sx" | "variant">;

export function AuthTextField(props: Readonly<AuthTextFieldProps>) {
  return <TextField fullWidth size="small" variant="outlined" sx={authInputSx} {...props} />;
}

type AuthFooterProps = {
  children: ReactNode;
};

export function AuthFooter({ children }: Readonly<AuthFooterProps>) {
  return (
    <Box component="footer" sx={authFooterSx}>
      <Typography sx={authFooterTextSx}>{children}</Typography>
    </Box>
  );
}

type AuthActionButtonProps = Omit<ButtonProps, "fullWidth" | "sx">;

export function AuthPrimaryButton(props: Readonly<AuthActionButtonProps>) {
  return <Button fullWidth variant="contained" sx={primaryButtonSx} {...props} />;
}

export function AuthOutlineButton(props: Readonly<AuthActionButtonProps>) {
  return <Button fullWidth variant="outlined" sx={outlineButtonSx} {...props} />;
}
