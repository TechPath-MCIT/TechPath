import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Calendar, Briefcase,
  FileText, CheckCircle, Clock, DollarSign, ExternalLink,
  ChevronDown, ChevronUp, Edit3, Send, Sparkles, Search, X, Trash2, Pencil
} from 'lucide-react';
import { AddResourceDialog } from "./AddResourceDialog";
import { DatePicker } from "./DatePicker";

// Virtual resource source for YouTube videos fetched per target-role skill.
const YOUTUBE_SOURCE = "YouTube";

// resource_status.status_id that represents an "In Progress" resource.
const IN_PROGRESS_STATUS_ID = 1;

// resource_status.status_id that represents a "Complete" resource.
const COMPLETED_STATUS_ID = 2;

// resource_status.status_id that represents a removed ("Cancelled") resource.
// Reusing the existing status (rather than deleting the row) means a removed
// course simply stops matching the In Progress/Completed filters below and
// its Add button in the Resources list re-enables — no extra plumbing needed.
const CANCELLED_STATUS_ID = 0;

function isPastOrToday(isoDate: string): boolean {
  return isoDate <= new Date().toISOString().slice(0, 10);
}

function courseProgressPercent(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (end <= start) return 100;
  return Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
}

interface ProfileResourceApiItem {
  id: number;
  resource_id: string;
  statusId: number;
  startDate: string | null;
  expectedEndDate: string | null;
  resource: {
    resource_id: string;
    resource_type: string;
    name: string;
    description: string | null;
    source: string | null;
    source_url: string | null;
    courses: {
      course_id: string;
      course_name: string;
    } | null;
    resource_skills: Array<{
      skill_id: number;
      skills: {
        skillId: number;
        name: string | null;
      } | null;
    }>;
  } | null;
  status: {
    status_id: number;
    status: string;
  } | null;
}

interface ProfileResourcesApiResponse {
  success: boolean;
  data?: ProfileResourceApiItem[];
  error?: string;
}

interface ResourceApiItem {
  id: string;
  type: string;
  name: string;
  description: string | null;
  source: string | null;
  url: string | null;

  pricing: {
    type: string;
    amount: number | null;
    currency: string | null;
    note: string | null;
  };

  durationMinutes: number | null;
  durationText?: string | null;
  instructorText?: string | null;
  isExternal?: boolean;

  skills: Array<{
    skillId: number;
    name: string | null;
    coverageWeight: number;
  }>;

  course: {
    courseId: string;
    units: number | null;
    prerequisites: unknown;
    creators: unknown;
  } | null;
}

interface DisplayResource {
  id: string;
  type: string;
  source: string;
  title: string;
  description: string;
  skills: string[];
  duration?: string;
  cost?: string;
  url?: string;
  instructor?: string;
  isExternal?: boolean;
}

function toDisplayResource(resource: ResourceApiItem): DisplayResource {
  const creators = resource.course?.creators;

  const instructor = resource.instructorText
    ? resource.instructorText
    : Array.isArray(creators)
    ? creators
        .filter((creator): creator is string => typeof creator === "string")
        .join(", ")
    : undefined;

  let cost: string | undefined = undefined;

  if (resource.pricing.note) {
    cost = resource.pricing.note;
  } else if (resource.pricing.type === "free") {
    cost = "Free";
  } else if (resource.pricing.amount !== null) {
    cost = [resource.pricing.currency, resource.pricing.amount].filter(Boolean).join(" ");
  }

  return {
    id: resource.id,
    type: resource.type,
    source: resource.source ?? "Unknown",
    title: resource.course ? `${resource.course.courseId} - ${resource.name}` : resource.name,
    description: resource.description ?? "No description available.",
    skills: resource.skills.flatMap((skill) => (skill.name ? [skill.name] : [])),
    duration:
      resource.durationText ??
      (resource.durationMinutes === null ? undefined : `${resource.durationMinutes} minutes`),
    cost,
    url: resource.url ?? undefined,
    instructor: instructor || undefined,
    isExternal: resource.isExternal ?? false,
  };
}

interface RoleSkill {
  skillId: number;
  name: string | null;
  weight: number;
}

interface RoleSkillsApiResponse {
  success: boolean;
  data?: {
    roleId: number | null;
    roleName: string | null;
    skills: RoleSkill[];
  };
  error?: string;
}

interface VideoApiResponse {
  success: boolean;
  data?: string;
}

interface GrindProject {
  name: string;
  dateRange?: string;
  bullets: string[];
}

interface GrindPageProps {
  profileId: number;
  targetRole: string;
  skills: string[];
  experience: string[];
  projects: GrindProject[];
  resources: ResourceApiItem[];
  isLoadingResources: boolean;
  resourcesError: string | null;
}

/**
 * Renders the skills associated with a profile resource as small pill badges,
 * mirroring the skill-tag styling used on the YouTube video cards. Renders
 * nothing when the resource has no named skills.
 */
function ResourceSkillBadges({ resource, className }: { resource: ProfileResourceApiItem["resource"]; className?: string }) {
  const names = (resource?.resource_skills ?? [])
    .map((link) => link.skills?.name)
    .filter((name): name is string => Boolean(name));

  if (names.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1${className ? ` ${className}` : ""}`}>
      {names.map((name, i) => (
        <span
          key={i}
          className="text-xs px-2 py-1 rounded font-medium"
          style={{ backgroundColor: "rgba(184, 226, 212, 0.2)", color: "#15100c" }}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

export function GrindPage({ profileId, targetRole, skills, experience, projects, resources, isLoadingResources, resourcesError, }: GrindPageProps) {
  const router = useRouter();

  // Each retrieved YouTube video for a target-role skill.
  const [skillVideos, setSkillVideos] = useState<
    { skillId: number; skillName: string; videoId: string }[]
  >([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [hasLoadedVideos, setHasLoadedVideos] = useState(false);

  // All resource pairings for this profile (any type, any status), fetched
  // once from profile_resource. The ongoing/completed course lists and the
  // "already selected" lookup for the Add button are all derived from this.
  const [profileResources, setProfileResources] = useState<ProfileResourceApiItem[]>([]);
  const [addingResourceId, setAddingResourceId] = useState<string | null>(null);

  const loadProfileResources = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(
        `/api/profiles/${profileId}/resources`,
        { method: "GET", signal },
      );

      const result =
        (await response.json()) as ProfileResourcesApiResponse;

      if (!response.ok || !result.success) {
        return;
      }

      setProfileResources(result.data ?? []);
    } catch {
      // Minimal handling: leave the list empty on failure.
    }
  }, [profileId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadProfileResources(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadProfileResources]);

  // Course pairings split by status, derived from the unified list. "In
  // Progress" courses are further split into ones that have actually started
  // (startDate is today or earlier — or unset, treated as already started)
  // vs. ones scheduled to start in the future, which render under Upcoming
  // Events instead.
  const activeCourses = useMemo(
    () =>
      profileResources.filter(
        (item) => item.resource?.resource_type === "course" && item.statusId === IN_PROGRESS_STATUS_ID,
      ),
    [profileResources],
  );
  const inProgressCourses = useMemo(
    () => activeCourses.filter((item) => !item.startDate || isPastOrToday(item.startDate)),
    [activeCourses],
  );
  const upcomingCourses = useMemo(
    () => activeCourses.filter((item) => item.startDate && !isPastOrToday(item.startDate)),
    [activeCourses],
  );
  const completedCourses = useMemo(
    () =>
      profileResources.filter(
        (item) => item.resource?.resource_type === "course" && item.statusId === COMPLETED_STATUS_ID,
      ),
    [profileResources],
  );

  // resource_id -> statusId, so a resource card can tell whether it is already
  // in progress or completed for this profile.
  const resourceStatusById = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of profileResources) {
      map.set(item.resource_id, item.statusId);
    }
    return map;
  }, [profileResources]);

  // The resource currently open in the Add dialog (name/course units are
  // looked up from `resources` by id when the dialog is opened).
  const [addDialogResource, setAddDialogResource] = useState<{ id: string; name: string; courseUnits: number | null } | null>(null);

  /**
   * Adds a resource to this profile with the "In Progress" status and the
   * chosen start/end dates via the PUT endpoint, then refreshes the pairing
   * list so it shows up immediately (under In Progress or Upcoming Events,
   * depending on whether the start date is in the future).
   */
  const handleAddResource = useCallback(async (resourceId: string, startDate: string, endDate: string) => {
    setAddingResourceId(resourceId);
    try {
      const response = await fetch(
        `/api/profiles/${profileId}/resources?resourceId=${encodeURIComponent(resourceId)}&statusId=${IN_PROGRESS_STATUS_ID}&startDate=${startDate}&endDate=${endDate}`,
        { method: "PUT" },
      );

      if (!response.ok) {
        return;
      }

      await loadProfileResources();
      setAddDialogResource(null);
    } catch {
      // Minimal handling: no-op on failure.
    } finally {
      setAddingResourceId(null);
    }
  }, [profileId, loadProfileResources]);

  // Tracks the resource currently being marked complete/removed, to disable its button.
  const [completingResourceId, setCompletingResourceId] = useState<string | null>(null);
  const [removingResourceId, setRemovingResourceId] = useState<string | null>(null);
  const [updatingEndDateResourceId, setUpdatingEndDateResourceId] = useState<string | null>(null);

  // Ids currently showing an inline "are you sure?" confirmation, keyed by
  // action so a course can't accidentally trigger the wrong one. Mirrors the
  // delete-confirmation pattern used for conversations in AgentChat.tsx.
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);

  // The resource currently showing an inline end-date editor, and its draft value.
  const [editingEndDateId, setEditingEndDateId] = useState<string | null>(null);
  const [editingEndDateValue, setEditingEndDateValue] = useState('');

  /**
   * Removes a course from the profile by setting its status to "Cancelled"
   * rather than deleting the profile_resource row — this preserves history
   * and, since Cancelled matches neither the In Progress nor Completed status
   * filters, the course simply disappears from both lists and its Add button
   * re-enables in the Resources list.
   */
  const handleRemoveCourse = useCallback(async (resourceId: string) => {
    setRemovingResourceId(resourceId);
    try {
      const response = await fetch(
        `/api/profiles/${profileId}/resources?resourceId=${encodeURIComponent(resourceId)}&statusId=${CANCELLED_STATUS_ID}`,
        { method: "PUT" },
      );

      if (!response.ok) {
        return;
      }

      await loadProfileResources();
    } catch {
      // Minimal handling: no-op on failure.
    } finally {
      setRemovingResourceId(null);
    }
  }, [profileId, loadProfileResources]);

  /**
   * Updates just the expected end date for an already-enrolled course.
   * Resends the course's current status unchanged (required by the PUT
   * endpoint) alongside the new endDate; startDate is left untouched.
   */
  const handleUpdateEndDate = useCallback(async (resourceId: string, statusId: number, endDate: string) => {
    setUpdatingEndDateResourceId(resourceId);
    try {
      const response = await fetch(
        `/api/profiles/${profileId}/resources?resourceId=${encodeURIComponent(resourceId)}&statusId=${statusId}&endDate=${endDate}`,
        { method: "PUT" },
      );

      if (!response.ok) {
        return;
      }

      await loadProfileResources();
      setEditingEndDateId(null);
    } catch {
      // Minimal handling: no-op on failure.
    } finally {
      setUpdatingEndDateResourceId(null);
    }
  }, [profileId, loadProfileResources]);

  /**
   * Marks an in-progress course complete: sets the profile_resource pairing to
   * the "Complete" status and links the course's skills to the profile (via the
   * complete=true flag). Refreshes both the ongoing and completed lists so the
   * card moves between them immediately.
   */
  const handleCompleteCourse = useCallback(async (resourceId: string) => {
    setCompletingResourceId(resourceId);
    try {
      const response = await fetch(
        `/api/profiles/${profileId}/resources?resourceId=${encodeURIComponent(resourceId)}&statusId=${COMPLETED_STATUS_ID}&complete=true`,
        { method: "PUT" },
      );

      if (!response.ok) {
        return;
      }

      await loadProfileResources();
      // Completing a course rolls its skills onto the profile, so refresh
      // the shared workspace profile data — this page's own Skills/Experience
      // tabs are driven by that same data via props, so no separate refetch
      // is needed here.
      router.refresh();
    } catch {
      // Minimal handling: no-op on failure.
    } finally {
      setCompletingResourceId(null);
    }
  }, [profileId, loadProfileResources, router]);

  /**
   * Retrieves a YouTube video for each skill associated with the profile's
   * target role. First resolves the role's skills via the role/skills endpoint,
   * then calls GET /api/video for every (roleId, skillId) pair. Results are
   * stored in `skillVideos` keyed by skillId.
   */
  const getVideo = useCallback(async () => {
    setIsLoadingVideos(true);
    setVideosError(null);

    try {
      // 1. Resolve the target role's skills (and its roleId) for this profile.
      const skillsResponse = await fetch(
        `/api/profiles/${profileId}/role/skills`,
        { method: "GET" },
      );

      const skillsResult =
        (await skillsResponse.json()) as RoleSkillsApiResponse;

      if (!skillsResponse.ok || !skillsResult.success) {
        throw new Error(
          skillsResult.error ?? "Failed to load target role skills.",
        );
      }

      const roleId = skillsResult.data?.roleId;
      const skills = skillsResult.data?.skills ?? [];

      if (roleId === null || roleId === undefined) {
        setSkillVideos([]);
        setHasLoadedVideos(true);
        return;
      }

      // 2. Fetch a video for each skill. The video endpoint reads roleId/skillId
      //    from the query string (the path segments are ignored by the handler).
      const entries = await Promise.all(
        skills.map(async (skill) => {
          try {
            const videoResponse = await fetch(
              `/api/video/${roleId}/${skill.skillId}?roleId=${roleId}&skillId=${skill.skillId}`,
              { method: "GET" },
            );

            if (!videoResponse.ok) {
              return null;
            }

            const videoResult =
              (await videoResponse.json()) as VideoApiResponse;

            if (!videoResult.success || !videoResult.data) {
              return null;
            }

            return {
              skillId: skill.skillId,
              skillName: skill.name ?? `Skill ${skill.skillId}`,
              videoId: videoResult.data,
            };
          } catch {
            return null;
          }
        }),
      );

      setSkillVideos(
        entries.filter(
          (entry): entry is { skillId: number; skillName: string; videoId: string } =>
            entry !== null,
        ),
      );
      setHasLoadedVideos(true);
    } catch (error) {
      setVideosError(
        error instanceof Error
          ? error.message
          : "Failed to load videos.",
      );
    } finally {
      setIsLoadingVideos(false);
    }
  }, [profileId]);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseraSearchQuery, setCourseraSearchQuery] = useState('');
  // Single-select — MCIT and YouTube are both tailored to the target role,
  // so mixing them in one list made sense as a source toggle. Coursera isn't
  // tailored at all (rating-sorted only), so it lives in its own separate
  // section below instead of a third tab here — see showCourseraSection.
  const [activeSource, setActiveSource] = useState<'mcit' | 'youtube'>('mcit');
  const [showCourseraSection, setShowCourseraSection] = useState(false);

  // Resource descriptions are clamped to 5 lines with an Expand button, but
  // only when the text actually overflows. `measuredDescriptionIds` records
  // which resources have already had their overflow checked (via the ref
  // callback below) so we measure each one exactly once, while still
  // rendered in its clamped state — measuring again after it's expanded
  // would always report "fits", hiding the button incorrectly.
  const measuredDescriptionIds = useRef<Set<string>>(new Set());
  const [truncatedDescriptionIds, setTruncatedDescriptionIds] = useState<Set<string>>(new Set());
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState<Set<string>>(new Set());

  const measureDescription = useCallback((id: string, el: HTMLParagraphElement | null) => {
    if (!el || measuredDescriptionIds.current.has(id)) return;
    measuredDescriptionIds.current.add(id);
    if (el.scrollHeight > el.clientHeight + 1) {
      setTruncatedDescriptionIds((prev) => new Set(prev).add(id));
    }
  }, []);

  const toggleDescriptionExpanded = useCallback((id: string) => {
    setExpandedDescriptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  const [profileSection, setProfileSection] = useState<'ongoing' | 'courses' | 'skills' | 'experience' | 'projects'>('ongoing');
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showAgentInput, setShowAgentInput] = useState(false);
  const [agentInputText, setAgentInputText] = useState('');
  const [isSendingAgentUpdate, setIsSendingAgentUpdate] = useState(false);
  const [agentUpdateReply, setAgentUpdateReply] = useState<string | null>(null);
  const [agentUpdateError, setAgentUpdateError] = useState<string | null>(null);

  // MCIT courses only — already ranked by relevance to the target role from
  // the API (see services/resources.ts), so no client-side re-sort here.
  const combinedResources: DisplayResource[] = resources
  .filter((resource) => !resource.isExternal)
  .map(toDisplayResource)
  .filter((resource) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      resource.title.toLowerCase().includes(query) ||
      resource.skills.some((skill) => skill.toLowerCase().includes(query))
    );
  });

  // Coursera courses — kept as a separate, clearly-labeled "browse" section
  // (not mixed with MCIT/YouTube) since they're only rating-sorted, not
  // tailored to the target role.
  const courseraResources: DisplayResource[] = resources
  .filter((resource) => resource.isExternal)
  .map(toDisplayResource)
  .filter((resource) => {
    const query = courseraSearchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      resource.title.toLowerCase().includes(query) ||
      resource.skills.some((skill) => skill.toLowerCase().includes(query))
    );
  });

  const handleAgentSubmit = async () => {
    const message = agentInputText.trim();
    if (!message) return;

    setIsSendingAgentUpdate(true);
    setAgentUpdateError(null);
    setAgentUpdateReply(null);

    try {
      const response = await fetch(`/api/profiles/${profileId}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to send update to the agent.");
      }

      // The endpoint streams newline-delimited JSON — accumulate the delta
      // chunks into the final reply rather than parsing the body as one
      // JSON object.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullReply = "";
      let profileUpdated = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as
            | { type: "delta"; text: string }
            | { type: "done"; conversationId: number; profileUpdated: boolean }
            | { type: "error"; error: string };

          if (event.type === "delta") {
            fullReply += event.text;
            setAgentUpdateReply(fullReply);
          } else if (event.type === "done") {
            profileUpdated = event.profileUpdated;
          } else if (event.type === "error") {
            throw new Error(event.error);
          }
        }
      }

      setAgentInputText('');

      if (profileUpdated) {
        // Refresh the shared profile data (skills, experience, projects) and
        // this page's own resource pairings (course status badges, Ongoing
        // tab) — the agent may have changed either via mark_course_status,
        // add_skills, etc.
        await loadProfileResources();
        router.refresh();
      }
    } catch (error) {
      setAgentUpdateError(
        error instanceof Error ? error.message : "Failed to send update to the agent.",
      );
    } finally {
      setIsSendingAgentUpdate(false);
    }
  };

  const selectSource = (source: 'mcit' | 'youtube') => {
    setActiveSource(source);

    // Lazily load the target-role videos the first time YouTube is selected.
    if (source === 'youtube' && !hasLoadedVideos) {
      void getVideo();
    }
  };

  /**
   * Renders one enrolled-course card, shared across the In Progress,
   * Upcoming Events, and Completed Courses lists so the progress bar,
   * end-date editor, and Remove/Complete confirmations stay in sync in one
   * place instead of being duplicated per section.
   */
  function renderCourseCard(course: ProfileResourceApiItem, opts: { showProgress: boolean; showCompleteButton: boolean }) {
    const isHov = hoveredItem === `course-${course.id}`;
    const name = course.resource?.name ?? `Resource ${course.resource_id}`;
    const title = course.resource?.courses
      ? `${course.resource.courses.course_id} - ${name}`
      : name;
    const isEditingEndDate = editingEndDateId === course.resource_id;
    const isConfirmingComplete = confirmCompleteId === course.resource_id;
    const showBar = opts.showProgress && Boolean(course.startDate) && Boolean(course.expectedEndDate);
    const progressPercent = showBar ? courseProgressPercent(course.startDate!, course.expectedEndDate!) : null;

    return (
      <div
        key={course.id}
        className="relative p-3 rounded-lg transition-all cursor-default"
        style={{ backgroundColor: 'rgba(253,211,87,0.15)', border: `1px solid ${isHov ? 'rgba(253,211,87,0.6)' : 'rgba(253,211,87,0.3)'}`, boxShadow: isHov ? '0 4px 12px rgba(0,0,0,0.08)' : 'none' }}
        onMouseEnter={() => setHoveredItem(`course-${course.id}`)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#02746f' }} />
            <span className="text-sm font-medium" style={{ color: '#15100c' }}>{title}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {progressPercent !== null ? (
              <span className="text-xs font-semibold" style={{ color: '#02746f' }}>{progressPercent}%</span>
            ) : (
              course.status?.status && (
                <span className="text-xs font-semibold" style={{ color: '#02746f' }}>{course.status.status}</span>
              )
            )}
            <button
              onClick={() => void handleRemoveCourse(course.resource_id)}
              disabled={removingResourceId === course.resource_id}
              title="Remove course"
              className="p-1 -m-1 rounded-md hover:bg-black/5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" style={{ color: '#55371e' }} />
            </button>
          </div>
        </div>

        {showBar && (
          <div className="w-full h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'rgba(184,226,212,0.3)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)' }}
            />
          </div>
        )}

        {(course.startDate || course.expectedEndDate) && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#55371e' }}>
            <span>
              {course.startDate ? new Date(course.startDate).toLocaleDateString() : '—'}
              {' – '}
              {isEditingEndDate ? '' : course.expectedEndDate ? new Date(course.expectedEndDate).toLocaleDateString() : '—'}
            </span>
            {isEditingEndDate ? (
              <>
                <DatePicker
                  value={editingEndDateValue}
                  onChange={setEditingEndDateValue}
                  minDate={course.startDate ?? undefined}
                  placeholder="End date"
                />
                <button
                  onClick={() => editingEndDateValue && handleUpdateEndDate(course.resource_id, course.statusId, editingEndDateValue)}
                  disabled={!editingEndDateValue || updatingEndDateResourceId === course.resource_id}
                  className="font-medium disabled:opacity-50"
                  style={{ color: '#02746f' }}
                >
                  Save
                </button>
                <button onClick={() => setEditingEndDateId(null)} style={{ color: '#55371e' }}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setEditingEndDateId(course.resource_id);
                  setEditingEndDateValue(course.expectedEndDate ?? '');
                }}
                title="Update end date"
                className="p-0.5 rounded hover:bg-black/5"
              >
                <Pencil className="w-3 h-3" style={{ color: '#55371e' }} />
              </button>
            )}
          </div>
        )}

        <ResourceSkillBadges resource={course.resource} className="mt-2" />
        {isHov && course.resource?.description && (
          <div className="mt-2 pt-2 border-t space-y-1.5" style={{ borderColor: 'rgba(253,211,87,0.4)' }}>
            <p className="text-xs" style={{ color: '#55371e' }}>{course.resource.description}</p>
            {course.resource.source && (
              <div className="flex items-center gap-3 text-xs" style={{ color: '#55371e' }}>
                <span>Source: <strong>{course.resource.source}</strong></span>
              </div>
            )}
          </div>
        )}

        {opts.showCompleteButton && (
          <button
            onClick={() => setConfirmCompleteId(course.resource_id)}
            disabled={completingResourceId === course.resource_id}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#02746f', color: '#ffffff' }}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {completingResourceId === course.resource_id ? 'Completing…' : 'Complete'}
          </button>
        )}

        {isConfirmingComplete && (
          <div
            className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg shadow-md"
            style={{ backgroundColor: '#fff', border: '1px solid rgba(2, 116, 111, 0.3)' }}
          >
            <span className="text-xs" style={{ color: '#15100c' }}>Mark this course complete?</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => {
                  setConfirmCompleteId(null);
                  void handleCompleteCourse(course.resource_id);
                }}
                className="px-2 py-1 rounded-md text-xs font-medium"
                style={{ backgroundColor: '#02746f', color: '#ffffff' }}
              >
                Complete
              </button>
              <button
                onClick={() => setConfirmCompleteId(null)}
                className="px-2 py-1 rounded-md text-xs font-medium"
                style={{ backgroundColor: 'rgba(184, 226, 212, 0.2)', color: '#02746f' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // The course search bar only searches MCIT courses, so hide it whenever
  // that source isn't the active tab.
  const coursesVisible = activeSource === 'mcit' && !showCourseraSection;

  return (
    <>
    <div className="h-full grid grid-cols-12 gap-6" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      {/* Left Panel - Resources */}
      <div className="col-span-5 bg-white rounded-2xl shadow-md flex flex-col overflow-hidden" style={{ maxHeight: '100%' }}>
        {/* Header with Filters - Fixed */}
        <div className="flex-shrink-0 p-6 border-b" style={{ borderColor: 'rgba(21, 16, 12, 0.1)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: '#15100c' }}>
                Resources
              </h2>
              <p className="text-sm" style={{ color: '#55371e' }}>
                {activeSource === 'mcit' && (
                  <>Sorted by relevance to: <span className="font-semibold">{targetRole}</span></>
                )}
                {activeSource === 'youtube' && (
                  <>Top skills for: <span className="font-semibold">{targetRole}</span></>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={() => selectSource('mcit')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                style={{
                  background: activeSource === 'mcit' ? 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)' : 'rgba(184, 226, 212, 0.2)',
                  color: activeSource === 'mcit' ? '#ffffff' : '#15100c',
                }}
              >
                MCIT Courses
              </button>
              <button
                onClick={() => selectSource('youtube')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                style={{
                  background: activeSource === 'youtube' ? 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)' : 'rgba(184, 226, 212, 0.2)',
                  color: activeSource === 'youtube' ? '#ffffff' : '#15100c',
                }}
              >
                YouTube
              </button>
            </div>
          </div>

          {coursesVisible && (
            <div className="relative mb-4">
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: '#55371e' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full pl-9 pr-8 py-2 rounded-lg text-sm border outline-none"
                style={{ borderColor: 'rgba(21, 16, 12, 0.1)', color: '#15100c' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" style={{ color: '#55371e' }} />
                </button>
              )}
            </div>
          )}

          {/* Explore More Courses - Coursera, kept as its own collapsible
              section (not a third source tab) since it's only rating-sorted,
              not tailored to the target role. Placed right under the search
              bar so it's visible without scrolling past the course list. */}
          <button
            onClick={() => setShowCourseraSection((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all hover:shadow-md"
            style={{ backgroundColor: 'rgba(253, 211, 87, 0.15)', border: '1px solid rgba(253, 211, 87, 0.4)' }}
          >
            <div>
              <h3 className="text-sm font-semibold" style={{ color: '#15100c' }}>
                Explore More Courses (Coursera)
              </h3>
              <p className="text-xs" style={{ color: '#55371e' }}>
                Tech courses sorted by rating, not tailored to your role
              </p>
            </div>
            {showCourseraSection ? <ChevronUp className="w-4 h-4" style={{ color: '#02746f' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#02746f' }} />}
          </button>

          {showCourseraSection && (
            <div className="relative mt-3">
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: '#55371e' }}
              />
              <input
                type="text"
                value={courseraSearchQuery}
                onChange={(e) => setCourseraSearchQuery(e.target.value)}
                placeholder="Search Coursera courses…"
                className="w-full pl-9 pr-8 py-2 rounded-lg text-sm border outline-none"
                style={{ borderColor: 'rgba(21, 16, 12, 0.1)', color: '#15100c' }}
              />
              {courseraSearchQuery && (
                <button
                  onClick={() => setCourseraSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" style={{ color: '#55371e' }} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Resources List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {/* Coursera - takes over the full scrollable area while expanded,
                instead of squeezing into a small box above MCIT/YouTube. */}
            {showCourseraSection && (
              <>
                {courseraResources.length === 0 && (
                  <div className="py-12 text-center text-sm" style={{ color: "#55371e" }}>
                    No courses found.
                  </div>
                )}
                {courseraResources.map((resource) => (
                  <div
                    key={resource.id}
                    className="p-4 rounded-lg border transition-all hover:shadow-md"
                    style={{ borderColor: 'rgba(21, 16, 12, 0.15)' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen className="w-4 h-4" style={{ color: '#02746f' }} />
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(253, 211, 87, 0.3)', color: '#15100c' }}>
                            {resource.source}
                          </span>
                        </div>
                        <h4 className="font-semibold mb-1" style={{ color: '#15100c' }}>
                          {resource.title}
                        </h4>
                        <p className="text-sm mb-2" style={{ color: '#55371e' }}>
                          {resource.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: '#55371e' }}>
                      {resource.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {resource.duration}
                        </span>
                      )}
                      {resource.instructor && <span>By {resource.instructor}</span>}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {resource.skills.slice(0, 5).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: 'rgba(184, 226, 212, 0.2)', color: '#15100c' }}
                        >
                          {skill}
                        </span>
                      ))}
                      {resource.skills.length > 5 && (
                        <span className="px-2 py-1 text-xs" style={{ color: '#55371e' }}>
                          +{resource.skills.length - 5} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-end">
                      {resource.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:shadow-md"
                          style={{ background: 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)', color: '#ffffff' }}
                        >
                          View Resource
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* YouTube Videos - shown when the YouTube source is active */}
            {!showCourseraSection && activeSource === 'youtube' && (
              <div className="space-y-3">
                {isLoadingVideos && (
                  <div
                    className="py-12 text-center text-sm"
                    style={{ color: "#55371e" }}
                  >
                    Loading videos...
                  </div>
                )}

                {!isLoadingVideos && videosError && (
                  <div
                    className="rounded-lg p-4 text-sm"
                    style={{ color: "#991b1b", backgroundColor: "#fef2f2" }}
                  >
                    {videosError}
                  </div>
                )}

                {!isLoadingVideos &&
                  !videosError &&
                  hasLoadedVideos &&
                  skillVideos.length === 0 && (
                    <div
                      className="py-12 text-center text-sm"
                      style={{ color: "#55371e" }}
                    >
                      No videos found for this role.
                    </div>
                  )}

                {!isLoadingVideos &&
                  !videosError &&
                  skillVideos.map((video) => (
                    <div
                      key={video.skillId}
                      className="p-4 rounded-lg border"
                      style={{ borderColor: "rgba(21, 16, 12, 0.15)" }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: "rgba(253, 211, 87, 0.3)",
                            color: "#15100c",
                          }}
                        >
                          {YOUTUBE_SOURCE}
                        </span>
                        <span
                          className="text-xs px-2 py-1 rounded font-medium"
                          style={{
                            backgroundColor: "rgba(184, 226, 212, 0.2)",
                            color: "#15100c",
                          }}
                        >
                          {video.skillName}
                        </span>
                      </div>
                      <div
                        className="relative w-full overflow-hidden rounded-lg"
                        style={{ paddingBottom: "56.25%" }}
                      >
                        <iframe
                          className="absolute top-0 left-0 w-full h-full"
                          src={`https://www.youtube.com/embed/${video.videoId}`}
                          title={video.skillName}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {isLoadingResources && (
              <div
                className="py-12 text-center text-sm"
                style={{ color: "#55371e" }}
              >
                Loading resources...
              </div>
            )}

            {!isLoadingResources && resourcesError && (
              <div
                className="rounded-lg p-4 text-sm"
                style={{
                  color: "#991b1b",
                  backgroundColor: "#fef2f2",
                }}
              >
                {resourcesError}
              </div>
            )}

            {!isLoadingResources &&
              !resourcesError &&
              !showCourseraSection &&
              activeSource === 'mcit' &&
              combinedResources.length === 0 && (
                <div
                  className="py-12 text-center text-sm"
                  style={{ color: "#55371e" }}
                >
                  No resources found.
                </div>
              )}

            {!isLoadingResources &&
              !resourcesError &&
              !showCourseraSection &&
              activeSource === 'mcit' &&
              combinedResources.map((resource) => {
              const IconComponent = resource.type === 'course' || resource.type === 'certification'
                ? BookOpen
                : resource.type === 'event' || resource.type === 'workshop'
                ? Calendar
                : resource.type === 'podcast'
                ? Briefcase
                : FileText;

              return (
                <div
                  key={resource.id}
                  className="p-4 rounded-lg border transition-all hover:shadow-md"
                  style={{ borderColor: 'rgba(21, 16, 12, 0.15)' }}
                >
                  <div className="flex items-start gap-4">

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <IconComponent className="w-4 h-4" style={{ color: '#02746f' }} />
                            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(253, 211, 87, 0.3)', color: '#15100c' }}>
                              {resource.source}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded capitalize" style={{ backgroundColor: 'rgba(184, 226, 212, 0.2)', color: '#15100c' }}>
                              {resource.type}
                            </span>
                          </div>
                          <h4 className="font-semibold mb-1" style={{ color: '#15100c' }}>
                            {resource.title}
                          </h4>
                          <div className="relative mb-2">
                            <p
                              ref={(el) => measureDescription(resource.id, el)}
                              className="text-sm"
                              style={{
                                color: '#55371e',
                                lineHeight: '1.25rem',
                                ...(expandedDescriptionIds.has(resource.id)
                                  ? {}
                                  : {
                                      // Plain pixel-height crop rather than -webkit-line-clamp:
                                      // line-clamp inserts its own browser-positioned "…", which
                                      // can land mid-word and collide with the "...Expand" button
                                      // overlaid below. A fixed height crops cleanly with no
                                      // ellipsis of its own, leaving only ours visible.
                                      maxHeight: 'calc(1.25rem * 5)',
                                      overflow: 'hidden',
                                    }),
                              }}
                            >
                              {resource.description}
                            </p>
                            {truncatedDescriptionIds.has(resource.id) &&
                              !expandedDescriptionIds.has(resource.id) && (
                                <button
                                  onClick={() => toggleDescriptionExpanded(resource.id)}
                                  className="text-xs font-medium"
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    bottom: 0,
                                    paddingLeft: '1.5rem',
                                    lineHeight: 'inherit',
                                    background: 'linear-gradient(to right, transparent, #ffffff 45%)',
                                    color: '#02746f',
                                  }}
                                >
                                  ...Expand
                                </button>
                              )}
                          </div>
                          {truncatedDescriptionIds.has(resource.id) &&
                            expandedDescriptionIds.has(resource.id) && (
                              <button
                                onClick={() => toggleDescriptionExpanded(resource.id)}
                                className="text-xs font-medium mb-2"
                                style={{ color: '#02746f' }}
                              >
                                Collapse
                              </button>
                            )}
                        </div>
                      </div>

                      {/* Meta Information */}
                      <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: '#55371e' }}>
                        {resource.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {resource.duration}
                          </span>
                        )}
                        {resource.cost && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {resource.cost}
                          </span>
                        )}
                        {resource.instructor && (
                          <span>By {resource.instructor}</span>
                        )}
                      </div>

                      {/* Skills Tags */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {resource.skills.slice(0, 5).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: 'rgba(184, 226, 212, 0.2)',
                              color: '#15100c',
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                        {resource.skills.length > 5 && (
                          <span className="px-2 py-1 text-xs" style={{ color: '#55371e' }}>
                            +{resource.skills.length - 5} more
                          </span>
                        )}
                      </div>

                      {/* Action Row */}
                      <div className="flex items-center justify-end gap-2">
                        {!resource.isExternal && (() => {
                          const pairingStatus = resourceStatusById.get(resource.id);
                          const isInProgress = pairingStatus === IN_PROGRESS_STATUS_ID;
                          const isComplete = pairingStatus === COMPLETED_STATUS_ID;
                          const alreadySelected = isInProgress || isComplete;
                          const isAdding = addingResourceId === resource.id;
                          const label = isComplete
                            ? 'Completed'
                            : isInProgress
                            ? 'In Progress'
                            : isAdding
                            ? 'Adding...'
                            : 'Add';
                          return (
                            <button
                              onClick={() =>
                                setAddDialogResource({
                                  id: resource.id,
                                  name: resource.title,
                                  courseUnits: resources.find((r) => r.id === resource.id)?.course?.units ?? null,
                                })
                              }
                              disabled={isAdding || alreadySelected}
                              title={alreadySelected ? 'Already selected' : undefined}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                              style={{
                                background: 'rgba(184, 226, 212, 0.2)',
                                color: '#02746f',
                              }}
                            >
                              {label}
                            </button>
                          );
                        })()}
                        {resource.url && (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:shadow-md"
                            style={{
                              background: 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)',
                              color: '#ffffff',
                            }}
                          >
                            View Resource
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel - My Progress */}
      <div className="col-span-7 bg-white rounded-2xl shadow-md flex flex-col overflow-hidden" style={{ maxHeight: '100%' }}>
        {/* Profile Header */}
        <div className="px-6 pt-6 pb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold" style={{ color: '#15100c' }}>
            My Progress
          </h2>
          {/* Applies to the whole profile, not any specific tab below */}
          <button
            onClick={() => setShowAgentInput(!showAgentInput)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:shadow-md flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)',
              color: '#ffffff',
            }}
          >
            <Edit3 className="w-4 h-4" />
            <span className="text-sm font-medium">Update with AI</span>
          </button>
        </div>

        {/* Quick Update — applies to the whole profile, shown right below
            the header rather than inside tab content, since it isn't
            scoped to any tab */}
        {showAgentInput && (
          <div className="mx-6 mb-3 p-4 rounded-lg space-y-3" style={{ backgroundColor: 'rgba(184, 226, 212, 0.1)', border: '1px solid rgba(2, 116, 111, 0.3)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" style={{ color: '#02746f' }} />
              <span className="text-sm font-semibold" style={{ color: '#15100c' }}>
                Quick Update
              </span>
            </div>
            <textarea
              value={agentInputText}
              onChange={e => setAgentInputText(e.target.value)}
              placeholder="Tell the AI what to update... e.g., 'I finished the Networked Systems course' or 'Add a project called Chess Engine' or 'Add AWS to my skills'"
              disabled={isSendingAgentUpdate}
              className="w-full px-3 py-2 rounded-lg border resize-none text-sm disabled:opacity-60"
              style={{ borderColor: 'rgba(21, 16, 12, 0.2)', minHeight: '80px' }}
            />
            {agentUpdateError && (
              <p className="text-xs" style={{ color: '#dc2626' }}>
                {agentUpdateError}
              </p>
            )}
            {agentUpdateReply && (
              <p className="text-xs p-2 rounded" style={{ color: '#15100c', backgroundColor: 'rgba(2, 116, 111, 0.08)' }}>
                {agentUpdateReply}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAgentSubmit}
                disabled={isSendingAgentUpdate || !agentInputText.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)',
                  color: '#ffffff',
                }}
              >
                <Send className="w-4 h-4" />
                <span className="text-sm font-medium">{isSendingAgentUpdate ? 'Sending…' : 'Send to AI'}</span>
              </button>
              <button
                onClick={() => {
                  setShowAgentInput(false);
                  setAgentUpdateReply(null);
                  setAgentUpdateError(null);
                }}
                disabled={isSendingAgentUpdate}
                className="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                style={{ color: '#55371e' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Profile Tabs */}
        <div className="flex border-b px-6" style={{ borderColor: 'rgba(21, 16, 12, 0.1)' }}>
          <button
            onClick={() => setProfileSection('ongoing')}
            className="px-3 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: profileSection === 'ongoing' ? '#02746f' : '#55371e',
              borderBottom: profileSection === 'ongoing' ? '2px solid #02746f' : '2px solid transparent',
            }}
          >
            Ongoing
          </button>
          <button
            onClick={() => setProfileSection('courses')}
            className="px-3 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: profileSection === 'courses' ? '#02746f' : '#55371e',
              borderBottom: profileSection === 'courses' ? '2px solid #02746f' : '2px solid transparent',
            }}
          >
            Courses
          </button>
          <button
            onClick={() => setProfileSection('skills')}
            className="px-3 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: profileSection === 'skills' ? '#02746f' : '#55371e',
              borderBottom: profileSection === 'skills' ? '2px solid #02746f' : '2px solid transparent',
            }}
          >
            Skills
          </button>
          <button
            onClick={() => setProfileSection('experience')}
            className="px-3 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: profileSection === 'experience' ? '#02746f' : '#55371e',
              borderBottom: profileSection === 'experience' ? '2px solid #02746f' : '2px solid transparent',
            }}
          >
            Experience
          </button>
          <button
            onClick={() => setProfileSection('projects')}
            className="px-3 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: profileSection === 'projects' ? '#02746f' : '#55371e',
              borderBottom: profileSection === 'projects' ? '2px solid #02746f' : '2px solid transparent',
            }}
          >
            Projects
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Ongoing Tab */}
          {profileSection === 'ongoing' && (
            <div className="space-y-6">
              {/* In Progress */}
              {inProgressCourses.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#15100c' }}>
                    <Clock className="w-4 h-4" style={{ color: '#02746f' }} />
                    In Progress
                  </h3>
                  <div className="space-y-2">
                    {inProgressCourses.map(course => renderCourseCard(course, { showProgress: true, showCompleteButton: true }))}
                  </div>
                </div>
              )}

              {inProgressCourses.length === 0 && upcomingCourses.length === 0 && (
                <p className="text-xs" style={{ color: '#55371e' }}>Nothing in progress yet.</p>
              )}

              {/* Upcoming Events — courses added with a future start date */}
              {upcomingCourses.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#15100c' }}>
                    <Calendar className="w-4 h-4" style={{ color: '#02746f' }} />
                    Upcoming Events
                  </h3>
                  <div className="space-y-2">
                    {upcomingCourses.map(course => renderCourseCard(course, { showProgress: false, showCompleteButton: false }))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Courses Tab */}
          {profileSection === 'courses' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2" style={{ color: '#15100c' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: '#02746f' }} />
                    Completed Courses
                  </h3>
                  {completedCourses.length > 2 && (
                    <button
                      onClick={() => setShowAllCompleted(!showAllCompleted)}
                      className="text-xs font-medium flex items-center gap-1"
                      style={{ color: '#02746f' }}
                    >
                      {showAllCompleted ? 'Show Less' : `View All (${completedCourses.length})`}
                      {showAllCompleted ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>
                {completedCourses.length === 0 ? (
                  <p className="text-xs" style={{ color: '#55371e' }}>No completed courses yet.</p>
                ) : (
                <div className="space-y-2">
                  {(showAllCompleted ? completedCourses : completedCourses.slice(0, 2)).map(course => {
                    const name = course.resource?.name ?? `Resource ${course.resource_id}`;
                    const title = course.resource?.courses
                      ? `${course.resource.courses.course_id} - ${name}`
                      : name;
                    const key = `course-done-${course.id}`;
                    const isOpen = expandedItem === key;
                    const hasDetails = Boolean(course.resource?.description || course.resource?.source);
                    const isConfirmingRemove = confirmRemoveId === course.resource_id;
                    return (
                      <div
                        key={course.id}
                        className="relative p-3 rounded-lg transition-all"
                        style={{ backgroundColor: 'rgba(184,226,212,0.15)', border: '1px solid transparent' }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#02746f' }} />
                            <span className="text-sm font-medium" style={{ color: '#15100c' }}>{title}</span>
                          </div>
                          <button
                            onClick={() => setConfirmRemoveId(course.resource_id)}
                            title="Remove course"
                            className="p-1 -m-1 rounded-md hover:bg-black/5 flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" style={{ color: '#55371e' }} />
                          </button>
                        </div>
                        {isConfirmingRemove && (
                          <div
                            className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg shadow-md"
                            style={{ backgroundColor: '#fff', border: '1px solid rgba(2, 116, 111, 0.3)' }}
                          >
                            <span className="text-xs" style={{ color: '#15100c' }}>Remove this course?</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setConfirmRemoveId(null);
                                  void handleRemoveCourse(course.resource_id);
                                }}
                                className="px-2 py-1 rounded-md text-xs font-medium"
                                style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                              >
                                Remove
                              </button>
                              <button
                                onClick={() => setConfirmRemoveId(null)}
                                className="px-2 py-1 rounded-md text-xs font-medium"
                                style={{ backgroundColor: 'rgba(184, 226, 212, 0.2)', color: '#02746f' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                        {course.expectedEndDate && (
                          <div className="text-xs" style={{ color: '#55371e' }}>Completed: {new Date(course.expectedEndDate).toLocaleDateString()}</div>
                        )}
                        <ResourceSkillBadges resource={course.resource} className="mt-2" />
                        {hasDetails && (
                          <button
                            onClick={() => setExpandedItem(isOpen ? null : key)}
                            className="mt-2 flex items-center gap-1 text-xs font-medium"
                            style={{ color: '#02746f' }}
                          >
                            {isOpen ? 'Hide details' : 'Expand'}
                            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                        {isOpen && hasDetails && (
                          <div className="mt-2 pt-2 border-t space-y-1.5" style={{ borderColor: 'rgba(2,116,111,0.15)' }}>
                            {course.resource?.description && (
                              <p className="text-xs" style={{ color: '#55371e' }}>{course.resource.description}</p>
                            )}
                            {course.resource?.source && (
                              <div className="flex items-center gap-3 text-xs" style={{ color: '#55371e' }}>
                                <span>Source: <strong>{course.resource.source}</strong></span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            </div>
          )}

          {/* Skills Tab */}
          {profileSection === 'skills' && (
            <div className="space-y-2">
              {skills.length === 0 ? (
                <p className="text-xs" style={{ color: '#55371e' }}>No skills yet.</p>
              ) : (
                skills.map((name) => (
                  <div
                    key={name}
                    className="rounded-lg px-3 py-2.5"
                    style={{ backgroundColor: 'rgba(184,226,212,0.12)', border: '1px solid rgba(2,116,111,0.15)' }}
                  >
                    <span className="text-sm font-medium" style={{ color: '#15100c' }}>{name}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Experience Tab */}
          {profileSection === 'experience' && (
            <div className="space-y-2">
              {experience.length === 0 ? (
                <p className="text-xs" style={{ color: '#55371e' }}>No experience highlights yet.</p>
              ) : (
                experience.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg flex gap-2"
                    style={{ backgroundColor: 'rgba(184,226,212,0.08)' }}
                  >
                    <span style={{ color: '#02746f' }}>•</span>
                    <span className="text-sm" style={{ color: '#15100c' }}>{highlight}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Projects Tab */}
          {profileSection === 'projects' && (
            <div className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-xs" style={{ color: '#55371e' }}>No projects yet.</p>
              ) : (
                projects.map((project, idx) => {
                  const key = `proj-${idx}`;
                  const isOpen = expandedItem === key;
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-lg transition-all cursor-pointer"
                      style={{ backgroundColor: isOpen ? 'rgba(184,226,212,0.18)' : 'rgba(184,226,212,0.08)', border: `1px solid ${isOpen ? 'rgba(2,116,111,0.2)' : 'transparent'}` }}
                      onClick={() => setExpandedItem(isOpen ? null : key)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium" style={{ color: '#15100c' }}>{project.name}</div>
                          {project.dateRange && (
                            <div className="text-xs" style={{ color: '#55371e' }}>{project.dateRange}</div>
                          )}
                        </div>
                        {project.bullets.length > 0 && (
                          <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: '#02746f', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        )}
                      </div>
                      {isOpen && project.bullets.length > 0 && (
                        <ul className="mt-3 space-y-1 border-t pt-3" style={{ borderColor: 'rgba(2,116,111,0.12)' }}>
                          {project.bullets.map((bullet, bidx) => (
                            <li key={bidx} className="flex gap-2 text-sm" style={{ color: '#55371e' }}>
                              <span style={{ color: '#02746f' }}>•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Resume Tab */}
        </div>
      </div>
    </div>
    {addDialogResource && (
      <AddResourceDialog
        resourceName={addDialogResource.name}
        courseUnits={addDialogResource.courseUnits}
        isSubmitting={addingResourceId === addDialogResource.id}
        onCancel={() => setAddDialogResource(null)}
        onConfirm={(startDate, endDate) => handleAddResource(addDialogResource.id, startDate, endDate)}
      />
    )}
    </>
  );
}
