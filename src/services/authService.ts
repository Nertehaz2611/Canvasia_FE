import api from "./api";
import type {
  AuthResponse,
  GoogleLoginRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
} from "../types/auth";

export async function register(payload: RegisterRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/register", payload);
  return response.data;
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/login", payload);
  return response.data;
}

export async function loginWithGoogle(payload: GoogleLoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/google/login", payload);
  return response.data;
}

export async function refreshToken(payload: RefreshTokenRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/refresh", payload);
  return response.data;
}

export async function getPrivateHello(): Promise<string> {
  const response = await api.get<string>("/test/private/hello");
  return response.data;
}
