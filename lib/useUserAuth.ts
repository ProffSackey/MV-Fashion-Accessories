import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { USER_SIGNED_OUT_EVENT } from "./userSession";

export function useUserAuth() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clearAndRedirect = () => {
      setUser(null);
      setLoading(false);
      router.replace("/login");
    };

    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        clearAndRedirect();
        return;
      }
      setUser(data.session.user);
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        clearAndRedirect();
        return;
      }
      setLoading(false);
    });

    window.addEventListener(USER_SIGNED_OUT_EVENT, clearAndRedirect);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener(USER_SIGNED_OUT_EVENT, clearAndRedirect);
    };
  }, [router]);

  return { user, loading };
}
