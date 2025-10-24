import { configuration } from "@/configuration";
import { hasAuthCookie } from "@/lib/auth.utils";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await hasAuthCookie()) {
    redirect(configuration.paths.home);
  }
  return <>{children}</>;
}
