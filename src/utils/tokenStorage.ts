import type { AuthResponse } from "../types/auth";

const ACCESS_TOKEN_KEY = "canvasia.accessToken";
const REFRESH_TOKEN_KEY = "canvasia.refreshToken";
const TOKEN_TYPE_KEY = "canvasia.tokenType";

export function saveAuthTokens(auth: AuthResponse): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, auth.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
  localStorage.setItem(TOKEN_TYPE_KEY, auth.tokenType || "Bearer");
}

export function clearAuthTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_TYPE_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getTokenType(): string {
  return localStorage.getItem(TOKEN_TYPE_KEY) || "Bearer";
}

export function getAuthorizationHeader(): string | null {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return null;
  }

  return `${getTokenType()} ${accessToken}`;
}

export function hasAccessToken(): boolean {
  return Boolean(getAccessToken());
}
