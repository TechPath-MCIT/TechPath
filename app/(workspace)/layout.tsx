import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import * as users from "@/services/users";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

export default async function WorkspaceLayout({
  children,
}: WorkspaceLayoutProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await users.getUserByClerkId(userId);

  if (!user?.profile_ID) {
    redirect("/resume-upload");
  }

  return <WorkspaceShell>{children}</WorkspaceShell>;
}