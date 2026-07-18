import { clerkMiddleware } from "@clerk/nextjs/server";

// Just run Clerk on every request — auth checks live in each page/layout
export const proxy = clerkMiddleware();

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
