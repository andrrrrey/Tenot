"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { setAuthErrorHandler, clearAuthErrorHandler, ApiError } from "@/lib/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const logout = useStore((s) => s.logout);
  const router = useRouter();

  // Обработчик ошибок авторизации
  const handleAuthError = useCallback(
    (error: ApiError) => {
      if (error.isUnauthorized) {
        // A 401 only means "session expired" when the application actually
        // had an authenticated user. Anonymous visitors may legitimately hit
        // optional protected endpoints and must remain on the public page.
        if (!user) return;
        logout();
        router.push("/login?error=session_expired");
      } else if (error.isForbidden) {
        // 403 - недостаточно прав
        router.push("/?error=forbidden");
      }
    },
    [user, logout, router]
  );

  // Устанавливаем глобальный обработчик ошибок
  useEffect(() => {
    setAuthErrorHandler(handleAuthError);
    return () => clearAuthErrorHandler();
  }, [handleAuthError]);

  // Загружаем пользователя при старте
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser({
            id: String(data.user.id),
            name: data.user.name || data.user.email || "",
            role: data.user.role,
            avatarUrl: data.user.avatarUrl || null,
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        // Не авторизован - это нормально
      });
  }, [setUser]);

  return <>{children}</>;
}
