import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { muiTheme } from "./theme/muiTheme";
import "./styles/global.css";
import "./styles/admin.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <ThemeProvider theme={muiTheme}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ThemeProvider>
);