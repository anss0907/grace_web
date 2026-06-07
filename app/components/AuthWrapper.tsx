"use client";

import AuthProvider from "./AuthProvider";
import LoginUI from "./LoginUI";

/**
 * Client-side wrapper that provides AuthProvider context
 * and renders the LoginUI in the navbar area.
 * Used by the server-side layout.tsx.
 */
export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export function NavbarAuth() {
  return <LoginUI />;
}
