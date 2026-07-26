import { getRolesList } from "@/services/roles";
import LandscapeContainer from "./LandscapeContainer";
import type { LandscapeRole } from "@/ui/figma/generated/components/JobLandscapeNew";

export default async function LandscapePage() {
  const databaseRoles = await getRolesList(1000);

  const roles: LandscapeRole[] = databaseRoles
    .flatMap((role) =>
      role.role
        ? [
            {
              roleId: role.roleId,
              name: role.role,
              entrySalary: role.entrySalary,
              salaryOutlook: role.salaryOutlook,
              jobSatisfaction: role.jobSatisfaction,
            },
          ]
        : [],
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name, "en", {
        sensitivity: "base",
      }),
    );

  return <LandscapeContainer roles={roles} />;
}