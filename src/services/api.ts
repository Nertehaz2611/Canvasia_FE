import axios from "axios";
import { getAuthorizationHeader } from "../utils/tokenStorage";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api";

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const authorizationHeader = getAuthorizationHeader();

  if (authorizationHeader) {
    config.headers.Authorization = authorizationHeader;
  }

  return config;
});

export default api;