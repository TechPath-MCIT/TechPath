import { getLandscapeRoles } from "@/services/roles";
import LandscapeContainer from "./LandscapeContainer";
import type { LandscapeRole } from "@/ui/figma/generated/components/JobLandscapeNew";

export default async function LandscapePage() {
  const roles: LandscapeRole[] =
    await getLandscapeRoles();

  roles.sort((a, b) =>
    a.name.localeCompare(b.name, "en", {
      sensitivity: "base",
    }),
  );

  return <LandscapeContainer roles={roles} />;
}