import axios from "axios";
import {
  clearAuthTokens,
  getAuthorizationHeader,
  getRefreshToken,
  saveAuthTokens,
} from "../utils/tokenStorage";
import type { AuthResponse } from "../types/auth";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api";

const api = axios.create({
  baseURL,
});

let activeRefresh: Promise<string | null> | null = null;

async function getRefreshedAccessToken(): Promise<string | null> {
  if (activeRefresh) {
    return activeRefresh;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  activeRefresh = axios
    .post<AuthResponse>(`${baseURL}/auth/refresh`, { refreshToken })
    .then((response) => {
      saveAuthTokens(response.data);
      return response.data.accessToken;
    })
    .catch(() => {
      clearAuthTokens();
      return null;
    })
    .finally(() => {
      activeRefresh = null;
    });

  return activeRefresh;
}

api.interceptors.request.use((config) => {
  const authorizationHeader = getAuthorizationHeader();

  if (authorizationHeader) {
    config.headers.Authorization = authorizationHeader;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || !error.config || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    if (originalRequest._retry) {
      clearAuthTokens();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const newAccessToken = await getRefreshedAccessToken();

    if (!newAccessToken) {
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = getAuthorizationHeader();
    return api.request(originalRequest);
  },
);

export default api;