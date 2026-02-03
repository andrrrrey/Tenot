"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Страница /profile редиректит на единый личный кабинет /me
 * Все функции профиля теперь доступны через /me
 */
export default function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/me");
  }, [router]);

  return (
    <div className="card">
      Перенаправление в личный кабинет...
    </div>
  );
}
