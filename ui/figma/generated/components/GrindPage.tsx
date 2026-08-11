import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Calendar, Award, Briefcase,
  FileText, CheckCircle, Clock, DollarSign, ExternalLink,
  ChevronDown, ChevronUp, Edit3, Send, Sparkles, Search, X
} from 'lucide-react';
import { sampleUserProfile } from "../data/learningResources";

// Virtual resource source for YouTube videos fetched per target-role skill.
const YOUTUBE_SOURCE = "YouTube";

// resource_status.status_id that represents an "In Progress" resource.
const IN_PROGRESS_STATUS_ID = 1;

// resource_status.status_id that represents a "Complete" resource.
const COMPLETED_STATUS_ID = 2;

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

  // Course pairings split by status, derived from the unified list.
  const activeCourses = useMemo(
    () =>
      profileResources.filter(
        (item) => item.resource?.resource_type === "course" && item.statusId === IN_PROGRESS_STATUS_ID,
      ),
    [profileResources],
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

  /**
   * Adds a resource to this profile with the "In Progress" status via the
   * PUT endpoint, then refreshes the pairing list so it shows up immediately.
   */
  const handleAddResource = useCallback(async (resourceId: string) => {
    setAddingResourceId(resourceId);
    try {
      const response = await fetch(
        `/api/profiles/${profileId}/resources?resourceId=${encodeURIComponent(resourceId)}&statusId=${IN_PROGRESS_STATUS_ID}`,
        { method: "PUT" },
      );

      if (!response.ok) {
        return;
      }

      await loadProfileResources();
    } catch {
      // Minimal handling: no-op on failure.
    } finally {
      setAddingResourceId(null);
    }
  }, [profileId, loadProfileResources]);

  // Tracks the resource currently being marked complete, to disable its button.
  const [completingResourceId, setCompletingResourceId] = useState<string | null>(null);

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
  // Single-select — MCIT and YouTube are both tailored to the target role,
  // so mixing them in one list made sense as a source toggle. Coursera isn't
  // tailored at all (rating-sorted only), so it lives in its own separate
  // section below instead of a third tab here — see showCourseraSection.
  const [activeSource, setActiveSource] = useState<'mcit' | 'youtube'>('mcit');
  const [showCourseraSection, setShowCourseraSection] = useState(false);
  const [profileSection, setProfileSection] = useState<'ongoing' | 'courses' | 'skills' | 'certifications' | 'activities' | 'experience' | 'projects'>('ongoing');
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
  .map(toDisplayResource);

  const userProfile = sampleUserProfile;

  // Sample upcoming activities
  const upcomingActivities = [
    {
      id: 'upcoming-1',
      title: 'AI Summit 2026',
      type: 'Conference',
      date: '2026-06-20',
      description: 'Annual AI and ML conference in San Francisco',
    },
    {
      id: 'upcoming-2',
      title: 'Deep Learning Workshop',
      type: 'Workshop',
      date: '2026-06-12',
      description: 'Hands-on workshop on transformer architectures',
    },
  ];

  // Sample in-progress certifications
  const inProgressCertifications = [
    {
      id: 'cert-progress-1',
      name: 'Google Cloud Professional ML Engineer',
      progress: 65,
      expectedCompletion: '2026-07-15',
    },
  ];

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

  // The course search bar only searches MCIT courses, so hide it whenever
  // that source isn't the active tab.
  const coursesVisible = activeSource === 'mcit' && !showCourseraSection;

  return (
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
                placeholder="Search MCIT courses…"
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
                Sorted by rating, not tailored to your role
              </p>
            </div>
            {showCourseraSection ? <ChevronUp className="w-4 h-4" style={{ color: '#02746f' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#02746f' }} />}
          </button>
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
                          <p className="text-sm mb-2" style={{ color: '#55371e' }}>
                            {resource.description}
                          </p>
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
                              onClick={() => handleAddResource(resource.id)}
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
            onClick={() => setProfileSection('certifications')}
            className="px-3 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: profileSection === 'certifications' ? '#02746f' : '#55371e',
              borderBottom: profileSection === 'certifications' ? '2px solid #02746f' : '2px solid transparent',
            }}
          >
            Certifications
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
          <button
            onClick={() => setProfileSection('activities')}
            className="px-3 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: profileSection === 'activities' ? '#02746f' : '#55371e',
              borderBottom: profileSection === 'activities' ? '2px solid #02746f' : '2px solid transparent',
            }}
          >
            Activities
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Ongoing Tab */}
          {profileSection === 'ongoing' && (
            <div className="space-y-6">
              {/* In Progress — merged courses + certifications */}
              {(activeCourses.length > 0 || inProgressCertifications.length > 0) && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#15100c' }}>
                    <Clock className="w-4 h-4" style={{ color: '#02746f' }} />
                    In Progress
                  </h3>
                  <div className="space-y-2">
                    {activeCourses.map(course => {
                      const isHov = hoveredItem === `course-${course.id}`;
                      const name = course.resource?.name ?? `Resource ${course.resource_id}`;
                      const title = course.resource?.courses
                        ? `${course.resource.courses.course_id} - ${name}`
                        : name;
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
                            {course.status?.status && (
                              <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#02746f' }}>{course.status.status}</span>
                            )}
                          </div>
                          {(course.startDate || course.expectedEndDate) && (
                            <div className="text-xs" style={{ color: '#55371e' }}>
                              {course.startDate ? new Date(course.startDate).toLocaleDateString() : '—'}
                              {' – '}
                              {course.expectedEndDate ? new Date(course.expectedEndDate).toLocaleDateString() : '—'}
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
                          <button
                            onClick={() => handleCompleteCourse(course.resource_id)}
                            disabled={completingResourceId === course.resource_id}
                            className="mt-3 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                            style={{ backgroundColor: '#02746f', color: '#ffffff' }}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {completingResourceId === course.resource_id ? 'Completing…' : 'Complete'}
                          </button>
                        </div>
                      );
                    })}
                    {inProgressCertifications.map(cert => {
                      const isHov = hoveredItem === cert.id;
                      return (
                        <div
                          key={cert.id}
                          className="relative p-3 rounded-lg transition-all cursor-default"
                          style={{ backgroundColor: 'rgba(253,211,87,0.15)', border: `1px solid ${isHov ? 'rgba(253,211,87,0.6)' : 'rgba(253,211,87,0.3)'}`, boxShadow: isHov ? '0 4px 12px rgba(0,0,0,0.08)' : 'none' }}
                          onMouseEnter={() => setHoveredItem(cert.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Award className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fdd357' }} />
                              <span className="text-sm font-medium" style={{ color: '#15100c' }}>{cert.name}</span>
                            </div>
                            <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#02746f' }}>{cert.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden mb-1.5" style={{ backgroundColor: 'rgba(184,226,212,0.3)' }}>
                            <div className="h-full rounded-full" style={{ width: `${cert.progress}%`, background: 'linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)' }} />
                          </div>
                          <div className="text-xs" style={{ color: '#55371e' }}>Expected: {new Date(cert.expectedCompletion).toLocaleDateString()}</div>
                          {isHov && (
                            <div className="mt-2 pt-2 border-t text-xs" style={{ borderColor: 'rgba(253,211,87,0.4)', color: '#55371e' }}>
                              Professional certification — validates expertise in cloud ML workloads.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upcoming Activities */}
              {upcomingActivities.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#15100c' }}>
                    <Calendar className="w-4 h-4" style={{ color: '#02746f' }} />
                    Upcoming Events
                  </h3>
                  <div className="space-y-2">
                    {upcomingActivities.map(activity => (
                      <div
                        key={activity.id}
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: 'rgba(184, 226, 212, 0.15)', border: '1px solid rgba(2, 116, 111, 0.2)' }}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="text-sm font-medium" style={{ color: '#15100c' }}>{activity.title}</div>
                          <span className="text-xs px-2 py-0.5 rounded flex-shrink-0 ml-2" style={{ backgroundColor: 'rgba(253, 211, 87, 0.3)', color: '#15100c' }}>{activity.type}</span>
                        </div>
                        <p className="text-xs mb-1" style={{ color: '#55371e' }}>{activity.description}</p>
                        <div className="flex items-center gap-1 text-xs" style={{ color: '#02746f' }}>
                          <Clock className="w-3 h-3" />
                          {new Date(activity.date).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
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
                    return (
                      <div
                        key={course.id}
                        className="p-3 rounded-lg transition-all"
                        style={{ backgroundColor: 'rgba(184,226,212,0.15)', border: '1px solid transparent' }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#02746f' }} />
                          <span className="text-sm font-medium" style={{ color: '#15100c' }}>{title}</span>
                        </div>
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

          {/* Certifications Tab */}
          {profileSection === 'certifications' && (
            <div className="space-y-2">
              {userProfile.certifications.map((cert, idx) => {
                const isHov = hoveredItem === `cert-${idx}`;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg transition-all cursor-default"
                    style={{ backgroundColor: 'rgba(253,211,87,0.15)', border: `1px solid ${isHov ? 'rgba(253,211,87,0.6)' : 'transparent'}`, boxShadow: isHov ? '0 4px 12px rgba(0,0,0,0.07)' : 'none' }}
                    onMouseEnter={() => setHoveredItem(`cert-${idx}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Award className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fdd357' }} />
                      <span className="text-sm font-medium" style={{ color: '#15100c' }}>{cert.name}</span>
                    </div>
                    <div className="text-xs" style={{ color: '#55371e' }}>{cert.issuer} · {cert.date}</div>
                    {isHov && (
                      <div className="mt-2 pt-2 border-t text-xs space-y-1" style={{ borderColor: 'rgba(253,211,87,0.4)', color: '#55371e' }}>
                        <div>Issued by <strong>{cert.issuer}</strong> — industry-recognised credential.</div>
                        <div style={{ color: '#02746f' }}>✓ Valid · Earned {cert.date}</div>
                      </div>
                    )}
                  </div>
                );
              })}
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

          {/* Activities Tab */}
          {profileSection === 'activities' && (() => {
            const activities = [
              { id: 'act-0', icon: Calendar, title: 'San Francisco ML Meetup', date: 'June 1, 2026', summary: 'Monthly meetup on practical ML applications', detail: 'Networked with 80+ ML practitioners. Discussed real-world feature engineering challenges and production deployment patterns.' },
              { id: 'act-1', icon: Briefcase, title: 'Tech Conference 2026', date: 'March 15, 2026', summary: 'Presented paper on distributed ML systems', detail: 'Paper: "Scaling ML Pipelines Beyond 10M Records". Received positive feedback from Google and Meta engineers in attendance.' },
            ];
            return (
              <div className="space-y-3">
                {activities.map(act => {
                  const isOpen = expandedItem === act.id;
                  return (
                    <div
                      key={act.id}
                      className="p-4 rounded-lg transition-all cursor-pointer"
                      style={{ backgroundColor: isOpen ? 'rgba(184,226,212,0.18)' : 'rgba(184,226,212,0.12)', border: `1px solid ${isOpen ? 'rgba(2,116,111,0.2)' : 'transparent'}` }}
                      onClick={() => setExpandedItem(isOpen ? null : act.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <act.icon className="w-4 h-4 flex-shrink-0" style={{ color: '#02746f' }} />
                          <span className="text-sm font-medium" style={{ color: '#15100c' }}>{act.title}</span>
                        </div>
                        <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: '#02746f', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                      </div>
                      <div className="text-xs mt-0.5 ml-6" style={{ color: '#55371e' }}>{act.summary} · {act.date}</div>
                      {isOpen && (
                        <div className="mt-3 border-t pt-3 ml-6 text-xs" style={{ borderColor: 'rgba(2,116,111,0.12)', color: '#55371e' }}>
                          {act.detail}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Resume Tab */}
        </div>
      </div>
    </div>
  );
}
