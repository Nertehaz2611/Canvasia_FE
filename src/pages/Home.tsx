import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getPrivateHello } from "../services/authService";
import { getErrorMessage } from "../utils/errorMessage";
import { clearAuthTokens } from "../utils/tokenStorage";

function Home() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrivateMessage() {
      setIsLoading(true);
      setError(null);

      try {
        const privateMessage = await getPrivateHello();
        setMessage(privateMessage);
      } catch (fetchError) {
        setError(getErrorMessage(fetchError, "Cannot call private API"));
      } finally {
        setIsLoading(false);
      }
    }

    void fetchPrivateMessage();
  }, []);

  const handleLogout = () => {
    clearAuthTokens();
    navigate("/login", { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 2,
      }}
    >
      <Paper elevation={0} sx={{ width: "min(100%, 680px)", p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 800 }}>
            Home
          </Typography>

          <Typography color="text.secondary">
            Trang này gọi endpoint private `GET /api/test/private/hello` bằng JWT nhận được sau khi đăng nhập.
          </Typography>

          {isLoading ? (
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
              <CircularProgress size={20} />
              <Typography>Calling private API...</Typography>
            </Box>
          ) : null}

          {!isLoading && error ? <Alert severity="error">{error}</Alert> : null}
          {!isLoading && !error ? <Alert severity="success">{message}</Alert> : null}

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button variant="outlined" onClick={() => navigate(0)}>
              Retry
            </Button>
            <Button variant="contained" color="error" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

export default Home;