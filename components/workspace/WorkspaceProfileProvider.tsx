"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type TargetRole = {
  roleId: number;
  name: string;
};

export type WorkspaceProject = {
  name: string;
  dateRange?: string;
  bullets: string[];
};

export type WorkspaceProfile = {
  profileId: number;
  name: string;
  email: string;
  currentRole: string;
  location: string;
  skills: string[];
  yearsOfExperience: number;
  experience: string[];
  projects: WorkspaceProject[];
  targetRole: TargetRole | null;
};

type WorkspaceProfileContextValue = WorkspaceProfile & {
  setTargetRole: (targetRole: TargetRole | null) => void;
  setLocation: (location: string) => void;
};

type WorkspaceProfileProviderProps = {
  profile: WorkspaceProfile;
  children: ReactNode;
};

const WorkspaceProfileContext =
  createContext<WorkspaceProfileContextValue | null>(null);

export function WorkspaceProfileProvider({
  profile,
  children,
}: WorkspaceProfileProviderProps) {
  const [targetRole, setTargetRole] = useState<TargetRole | null>(
    profile.targetRole,
  );
  const [location, setLocation] = useState<string>(profile.location);

  // useState only takes its initial value from `profile` on mount, so a
  // router.refresh() re-running the server layout and passing a fresh
  // `profile` prop into this already-mounted provider would otherwise be
  // silently ignored. Re-sync during render (React's documented pattern for
  // this) rather than in an effect, which would cost an extra render pass.
  const [prevProfile, setPrevProfile] = useState(profile);
  if (profile !== prevProfile) {
    setPrevProfile(profile);
    setTargetRole(profile.targetRole);
    setLocation(profile.location);
  }

  const value = useMemo(
    () => ({
      ...profile,
      targetRole,
      setTargetRole,
      location,
      setLocation,
    }),
    [profile, targetRole, location],
  );

  return (
    <WorkspaceProfileContext.Provider value={value}>
      {children}
    </WorkspaceProfileContext.Provider>
  );
}

export function useWorkspaceProfile() {
  const profile = useContext(WorkspaceProfileContext);

  if (!profile) {
    throw new Error(
      "useWorkspaceProfile must be used inside WorkspaceProfileProvider",
    );
  }

  return profile;
}