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

export type WorkspaceProfile = {
  profileId: number;
  name: string;
  email: string;
  currentRole: string;
  location: string;
  skills: string[];
  yearsOfExperience: number;
  experience: string[];
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