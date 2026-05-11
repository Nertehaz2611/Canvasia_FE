import { useCallback, useEffect, useState, type ComponentProps } from "react";
import {
  Alert,
  Box,
  IconButton,
  InputAdornment,
  Stack,
  Typography,
} from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { Link, useLocation, useNavigate } from "react-router-dom";
import projectNameImage from "../../assets/project-name.png";
import {
  AuthDividerLine,
  AuthFooter,
  AuthGoogleButton,
  AuthOutlineButton,
  AuthPrimaryButton,
  AuthSurface,
  AuthTextField,
  AuthTitle,
  switchCopySx,
} from "./AuthUi";
import { login, loginWithGoogle, register } from "../../services/authService";
import { getErrorMessage } from "../../utils/errorMessage";
import { saveAuthTokens } from "../../utils/tokenStorage";

type AuthCardMode = "welcome" | "login" | "register";

type AuthCardProps = {
  mode: AuthCardMode;
};

type LoginFormState = {
  email: string;
  password: string;
};

type RegisterFormState = {
  email: string;
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
};

type LoginLocationState = {
  justRegistered?: boolean;
};

type SubmitFormEvent = Parameters<NonNullable<ComponentProps<"form">["onSubmit"]>>[0];

type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  valueVisible: boolean;
  placeholder: string;
  onToggleVisibility: () => void;
  hiddenAriaLabel: string;
  visibleAriaLabel: string;
};

type GoogleAuthButtonProps = {
  onClick: () => void;
};

const AUTH_ROUTES = {
  explore: "/explore",
  login: "/login",
  register: "/register",
} as const;

const AUTH_TITLE_BY_MODE: Record<AuthCardMode, string> = {
  welcome: "Welcome",
  login: "Log in",
  register: "Create an account",
};

const INITIAL_LOGIN_FORM: LoginFormState = {
  email: "",
  password: "",
};

const INITIAL_REGISTER_FORM: RegisterFormState = {
  email: "",
  username: "",
  displayName: "",
  password: "",
  confirmPassword: "",
};

const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";

function getGoogleGlobal(): GoogleGlobal | undefined {
  return (globalThis as typeof globalThis & { google?: GoogleGlobal }).google;
}

function PasswordField({
  value,
  onChange,
  valueVisible,
  placeholder,
  onToggleVisibility,
  hiddenAriaLabel,
  visibleAriaLabel,
}: Readonly<PasswordFieldProps>) {
  return (
    <AuthTextField
      type={valueVisible ? "text" : "password"}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                onClick={onToggleVisibility}
                aria-label={valueVisible ? visibleAriaLabel : hiddenAriaLabel}
                sx={{ color: "#282f25" }}
              >
                {valueVisible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

function AuthDivider() {
  return <AuthDividerLine />;
}

function GoogleAuthButton({ onClick }: Readonly<GoogleAuthButtonProps>) {
  return <AuthGoogleButton onClick={onClick} />;
}

function AuthCard({ mode }: Readonly<AuthCardProps>) {
  const navigate = useNavigate();
  const location = useLocation();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
  const loginLocationState = (location.state as LoginLocationState | null) ?? null;
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginFormState>(INITIAL_LOGIN_FORM);
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(INITIAL_REGISTER_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleReady, setIsGoogleReady] = useState(false);

  const isWelcome = mode === "welcome";
  const isLogin = mode === "login";
  const isRegister = mode === "register";

  const goToExplore = () => {
    navigate(AUTH_ROUTES.explore, { replace: true });
  };

  const goToLogin = () => {
    navigate(AUTH_ROUTES.login, { replace: true });
  };

  const goToRegister = () => {
    navigate(AUTH_ROUTES.register, { replace: true });
  };

  const handleLoginSubmit = async (event: SubmitFormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const authResponse = await login(loginForm);
      saveAuthTokens(authResponse);
      goToExplore();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Login failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: SubmitFormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await register(registerForm);
      navigate(AUTH_ROUTES.login, {
        replace: true,
        state: { justRegistered: true } satisfies LoginLocationState,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Register failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleCredential = useCallback(async (credential?: string) => {
    if (!credential) {
      setErrorMessage("Google credential is missing. Please try again.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const authResponse = await loginWithGoogle({ idToken: credential });
      saveAuthTokens(authResponse);
      goToExplore();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Google login failed"));
    } finally {
      setIsSubmitting(false);
    }
  }, [goToExplore]);

  const initializeGoogleIdentity = useCallback(() => {
    if (!googleClientId) {
      return;
    }

    const google = getGoogleGlobal();
    if (!google?.accounts?.id) {
      return;
    }

    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response: GoogleCredentialResponse) => {
        void handleGoogleCredential(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    setIsGoogleReady(true);
  }, [googleClientId, handleGoogleCredential]);

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    if (getGoogleGlobal()?.accounts?.id) {
      initializeGoogleIdentity();
      return;
    }

    let script = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`) as HTMLScriptElement | null;
    const handleLoad = () => {
      initializeGoogleIdentity();
    };

    if (script) {
      script.addEventListener("load", handleLoad);
    } else {
      script = document.createElement("script");
      script.src = GOOGLE_IDENTITY_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", handleLoad);
      document.head.appendChild(script);
    }

    return () => {
      script?.removeEventListener("load", handleLoad);
    };
  }, [googleClientId, initializeGoogleIdentity]);

  const handleGoogleSignIn = () => {
    setErrorMessage(null);

    if (!googleClientId) {
      setErrorMessage("Missing VITE_GOOGLE_CLIENT_ID. Please configure your frontend environment.");
      return;
    }

    const google = getGoogleGlobal();

    if (!isGoogleReady || !google?.accounts?.id) {
      setErrorMessage("Google Sign-In is still loading. Please try again.");
      return;
    }

    google.accounts.id.prompt();
  };

  const updateLoginField = (field: keyof LoginFormState, value: string) => {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateRegisterField = (field: keyof RegisterFormState, value: string) => {
    setRegisterForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <AuthSurface ariaLabel="Authentication">
      <Box sx={{ textAlign: "center" }}>
        <Box component="img" src={projectNameImage} alt="Canvasia" sx={{ width: "min(100%, 252px)", height: "auto" }} />
      </Box>

      <AuthTitle>{AUTH_TITLE_BY_MODE[mode]}</AuthTitle>

      {isLogin && loginLocationState?.justRegistered ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Registration successful. Please log in.
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      ) : null}

      {isWelcome ? (
        <>
          <Stack spacing={1.5}>
            <AuthPrimaryButton onClick={goToRegister}>
              Create an account
            </AuthPrimaryButton>
            <AuthOutlineButton onClick={goToLogin}>
              Login
            </AuthOutlineButton>
          </Stack>

          <AuthDivider />
          <GoogleAuthButton onClick={handleGoogleSignIn} />
        </>
      ) : null}

      {isLogin ? (
        <Stack component="form" spacing={1.5} onSubmit={handleLoginSubmit}>
          <AuthTextField
            type="email"
            placeholder="E-mail address"
            value={loginForm.email}
            onChange={(event) => updateLoginField("email", event.target.value)}
            required
          />

          <PasswordField
            valueVisible={showLoginPassword}
            placeholder="Password"
            onToggleVisibility={() => setShowLoginPassword((value) => !value)}
            hiddenAriaLabel="Show password"
            visibleAriaLabel="Hide password"
            value={loginForm.password}
            onChange={(value) => updateLoginField("password", value)}
          />

          <AuthPrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log in"}
          </AuthPrimaryButton>

          <AuthDivider />
          <GoogleAuthButton onClick={handleGoogleSignIn} />

          <Typography sx={switchCopySx}>
            New here? <Link to={AUTH_ROUTES.register}>Create your account</Link>
          </Typography>
        </Stack>
      ) : null}

      {isRegister ? (
        <Stack component="form" spacing={1.5} onSubmit={handleRegisterSubmit}>
          <AuthTextField
            type="email"
            placeholder="E-mail address"
            value={registerForm.email}
            onChange={(event) => updateRegisterField("email", event.target.value)}
            required
          />
          <AuthTextField
            type="text"
            placeholder="Username"
            value={registerForm.username}
            onChange={(event) => updateRegisterField("username", event.target.value)}
            required
          />
          <AuthTextField
            type="text"
            placeholder="Display name (e.g. John D. Smith)"
            value={registerForm.displayName}
            onChange={(event) => updateRegisterField("displayName", event.target.value)}
            required
          />

          <PasswordField
            valueVisible={showRegisterPassword}
            placeholder="Password"
            onToggleVisibility={() => setShowRegisterPassword((value) => !value)}
            hiddenAriaLabel="Show password"
            visibleAriaLabel="Hide password"
            value={registerForm.password}
            onChange={(value) => updateRegisterField("password", value)}
          />

          <PasswordField
            valueVisible={showRegisterConfirmPassword}
            placeholder="Confirm password"
            onToggleVisibility={() => setShowRegisterConfirmPassword((value) => !value)}
            hiddenAriaLabel="Show confirm password"
            visibleAriaLabel="Hide confirm password"
            value={registerForm.confirmPassword}
            onChange={(value) => updateRegisterField("confirmPassword", value)}
          />

          <AuthPrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Explore Canvasia"}
          </AuthPrimaryButton>

          <Typography sx={switchCopySx}>
            Already have an account? <Link to={AUTH_ROUTES.login}>Log in</Link>
          </Typography>
        </Stack>
      ) : null}

      <AuthFooter>
        This site is protected by reCAPTCHA Enterprise and the Google Privacy Policy and Terms of Service apply.
      </AuthFooter>
    </AuthSurface>
  );
}

export default AuthCard;
