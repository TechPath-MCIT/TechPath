"use client";

import { SignOutButton as ClerkSignOutButton } from "@clerk/nextjs";

export default function SignOutButton() {
  return (
    <ClerkSignOutButton redirectUrl="/sign-in">
      <button
        className="text-sm transition-colors hover:opacity-70"
        style={{ color: "#55371e" }}
      >
        Sign out
      </button>
    </ClerkSignOutButton>
  );
}
