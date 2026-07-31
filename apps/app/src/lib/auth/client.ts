import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [convexClient()],
});

export const signOutAndReload = async (): Promise<void> => {
  const { error } = await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        location.reload();
      },
    },
  });
  if (error) throw new Error("Sign-out failed");
};
