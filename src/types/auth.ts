export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
};

export type GoogleLoginRequest = {
  idToken: string;
};

export type ApiErrorResponse = {
  code: string;
  message: string;
  timestamp: string;
};
