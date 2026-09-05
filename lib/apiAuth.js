import { auth } from "@/auth";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function isAuthenticated(request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    try {
      await verifyMobileToken(authHeader.slice(7));
      return true;
    } catch {
      return false;
    }
  }

  const session = await auth();
  return !!session?.user;
}
