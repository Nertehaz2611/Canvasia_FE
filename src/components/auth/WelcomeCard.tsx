import { Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  AuthDividerLine,
  AuthFooter,
  AuthGoogleButton,
  AuthOutlineButton,
  AuthPrimaryButton,
  AuthSurface,
} from "./AuthUi";

function WelcomeCard() {
  const navigate = useNavigate();

  return (
    <AuthSurface ariaLabel="Welcome">
      <Typography component="h1" sx={{ textAlign: "center", fontSize: "clamp(2rem, 3vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em" }}>
        Canvasia
      </Typography>

      <Typography sx={{ mt: 0.5, textAlign: "center", fontSize: "0.67rem", fontWeight: 700, color: "#576154" }}>
        Colors awaken, new visions arise, shaping imagination alive
      </Typography>

      <Typography sx={{ mt: 3, mb: 2, textAlign: "center", fontSize: "0.95rem", fontWeight: 700 }}>
        Log in with your canvasia account
      </Typography>

      <Stack spacing={1.5}>
        <AuthPrimaryButton onClick={() => navigate("/register")}>
          Create an account
        </AuthPrimaryButton>

        <AuthOutlineButton onClick={() => navigate("/login")}>
          Login
        </AuthOutlineButton>
      </Stack>

      <AuthDividerLine />

      <AuthGoogleButton onClick={() => navigate("/home")}>
        Login with Google
      </AuthGoogleButton>

      <AuthFooter>
        This site is protected by reCAPTCHA Enterprise and the Google Privacy Policy and Terms of Service apply.
      </AuthFooter>
    </AuthSurface>
  );
}

export default WelcomeCard;
