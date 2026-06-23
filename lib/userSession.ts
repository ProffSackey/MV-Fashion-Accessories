import { supabase } from "./supabaseClient";

export const USER_SIGNED_OUT_EVENT = "mv-user-signed-out";

type RouterLike = {
  replace: (href: string) => void;
  refresh?: () => void;
};

export async function signOutUser(router?: RouterLike) {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Sign out failed:", error);
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (localError) {
      console.error("Local sign out failed:", localError);
    }
  } finally {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(USER_SIGNED_OUT_EVENT));
    }
    router?.replace("/login");
    router?.refresh?.();
  }
}
