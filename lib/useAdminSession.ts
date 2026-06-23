import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAdminSession() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/verify-session")
      .then((res) => {
        if (!res.ok) {
          router.push("/admin/login");
        } else {
          setSessionChecked(true);
        }
      })
      .catch(() => {
        router.push("/admin/login");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  return { sessionChecked, isLoading };
}