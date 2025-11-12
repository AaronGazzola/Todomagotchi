import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { configuration, isPrivatePath } from "./configuration";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasAuthCookie = request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.includes("better-auth") || cookie.name.includes("session")
    );

  if (isPrivatePath(pathname) && !hasAuthCookie) {
    return NextResponse.redirect(
      new URL(configuration.paths.signIn, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
