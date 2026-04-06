export const authEndpoints = {
  login: "/api/auth/login",
  refresh: "/api/auth/refresh",
  logout: "/api/auth/logout",
  register: "/api/auth/register",
  forgotPassword: "/api/auth/forgot-password",
  resetPassword: "/api/auth/reset-password"
} as const;
