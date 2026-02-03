"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { setAuthErrorHandler, clearAuthErrorHandler, ApiError } from "@/lib/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useStore((s) => s.setUser);
  const logout = useStore((s) => s.logout);
  const router = useRouter();

  // Обработчик ошибок авторизации
  const handleAuthError = useCallback(
    (error: ApiError) => {
      if (error.isUnauthorized) {
        // 401 - требуется авторизация
        logout();
        router.push("/login?error=session_expired");
      } else if (error.isForbidden) {
        // 403 - недостаточно прав
        router.push("/?error=forbidden");
      }
    },
    [logout, router]
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
            name: data.user.email || "",
            role: data.user.role,
          });
        }
      })
      .catch(() => {
        // Не авторизован - это нормально
      });
  }, [setUser]);

  return <>{children}</>;
}
