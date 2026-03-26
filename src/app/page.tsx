import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/**
 * Root page — redirects to dashboard if authenticated, login if not.
 * The actual dashboard content is in (dashboard)/page.tsx.
 */
export default async function RootPage() {
  const user = await getSession();

  if (user) {
    // Redirect is handled by the (dashboard) layout
    // This page shouldn't normally be reached
  }

  redirect("/login");
}
