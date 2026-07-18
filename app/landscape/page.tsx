import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LandscapePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="max-w-4xl w-full p-8 bg-white rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold mb-4">Career Landscape</h1>
        <p className="text-zinc-600 mb-6">
          Explore tech roles that match your skills. This page is a placeholder
          for Phase 2.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["Software Engineer", "Data Scientist", "Product Manager", "DevOps Engineer"].map(
            (role) => (
              <div key={role} className="p-6 border border-zinc-200 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">{role}</h3>
                <p className="text-zinc-500 text-sm">Role details and match score will go here</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
