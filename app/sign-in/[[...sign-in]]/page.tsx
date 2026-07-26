import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AnimatedBackground } from "@/ui/figma/generated/components/AnimatedBackground";

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center p-6">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md">
        <SignIn
          path="/sign-in"
          routing="path"
          signInUrl="/sign-in"
          withSignUp
          transferable
          fallbackRedirectUrl="/api/users/sync"
          signUpFallbackRedirectUrl="/api/users/sync"
          appearance={{
            options: {
              socialButtonsPlacement: "top",
              socialButtonsVariant: "blockButton",
            },
            variables: {
              colorPrimary: "#02746f",
              colorForeground: "#15100c",
              colorMutedForeground: "#55371e",
              colorBackground: "#ffffff",
              borderRadius: "0.75rem",
              fontFamily:
                "var(--font-open-sans), Open Sans, Arial, sans-serif",
            },
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none",
              card: "w-full rounded-2xl border-0 shadow-xl",
              headerTitle:
                "bg-gradient-to-br from-[#02746f] to-[#b8e2d4] bg-clip-text text-3xl font-bold text-transparent",
              headerSubtitle: "text-[#55371e]",
              socialButtonsBlockButton:
                "rounded-xl border-2 py-3 transition-all hover:border-[#02746f] hover:shadow-md",
              socialButtonsBlockButtonText:
                "font-medium text-[#15100c]",
              dividerLine: "bg-[rgba(21,16,12,0.12)]",
              dividerText: "text-[#55371e]",
              formFieldInput:
                "rounded-xl border-[rgba(21,16,12,0.15)]",
              formButtonPrimary:
                "rounded-xl bg-[#02746f] font-semibold hover:bg-[#025f5b]",
              footerActionLink:
                "font-semibold text-[#02746f] hover:text-[#025f5b]",
            },
          }}
        />
      </div>
    </main>
  );
}
