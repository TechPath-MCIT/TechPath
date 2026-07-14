import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Signed in — will redirect to /landscape or /resume-upload once DB is set up (Step 5)
  redirect("/resume-upload");
}
