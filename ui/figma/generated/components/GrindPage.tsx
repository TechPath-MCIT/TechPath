import { useState, useCallback } from 'react';
import {
  Filter, BookOpen, Calendar, Award, Briefcase,
  FileText, CheckCircle, Clock, DollarSign, ExternalLink,
  ChevronDown, ChevronUp, Edit3, Send, Sparkles, Upload, Download
} from 'lucide-react';
import { sampleUserProfile } from "../data/learningResources";

// Virtual resource source for YouTube videos fetched per target-role skill.
const YOUTUBE_SOURCE = "YouTube";

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

interface GrindPageProps {
  profileId: number;
  targetRole: string;
  resources: ResourceApiItem[];
  isLoadingResources: boolean;
  resourcesError: string | null;
}

export function GrindPage({ profileId, targetRole, resources, isLoadingResources, resourcesError, }: GrindPageProps) {
  // Each retrieved YouTube video for a target-role skill.
  const [skillVideos, setSkillVideos] = useState<
    { skillId: number; skillName: string; videoId: string }[]
  >([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [hasLoadedVideos, setHasLoadedVideos] = useState(false);

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
  const [sourceFilters, setSourceFilters] = useState<string[]>([]);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [profileSection, setProfileSection] = useState<'ongoing' | 'courses' | 'skills' | 'certifications' | 'activities' | 'experience' | 'projects' | 'resume'>('ongoing');
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showAgentInput, setShowAgentInput] = useState(false);
  const [agentInputText, setAgentInputText] = useState('');
  const [uploadedResumes, setUploadedResumes] = useState<{ name: string; uploadDate: string; url: string }[]>([
    { name: 'Resume_2026_May.pdf', uploadDate: '2026-05-15', url: '#' },
    { name: 'Resume_2025_Dec.pdf', uploadDate: '2025-12-10', url: '#' },
  ]);

  const combinedResources: DisplayResource[] = resources
  .filter(
    (resource) =>
      sourceFilters.length === 0 ||
      (resource.source !== null &&
        sourceFilters.includes(resource.source)),
  )
  .filter(
    (resource) =>
      typeFilters.length === 0 ||
      typeFilters.includes(resource.type),
  )
  .map((resource) => {
    const creators = resource.course?.creators;

    const instructor = Array.isArray(creators)
      ? creators
          .filter(
            (creator): creator is string =>
              typeof creator === "string",
          )
          .join(", ")
      : undefined;

    let cost: string | undefined = undefined;

    if (resource.pricing.note) {
      cost = resource.pricing.note;
    } else if (resource.pricing.type === "free") {
      cost = "Free";
    } else if (resource.pricing.amount !== null) {
      cost = [
        resource.pricing.currency,
        resource.pricing.amount,
      ]
        .filter(Boolean)
        .join(" ");
    }

    return {
      id: resource.id,
      type: resource.type,
      source: resource.source ?? "Unknown",
      title: resource.course
        ? `${resource.course.courseId} - ${resource.name}`
        : resource.name,
      description:
        resource.description ?? "No description available.",
      skills: resource.skills.flatMap((skill) =>
        skill.name ? [skill.name] : [],
      ),
      duration:
        resource.durationMinutes === null
          ? undefined
          : `${resource.durationMinutes} minutes`,
      cost,
      url: resource.url ?? undefined,
      instructor: instructor || undefined,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

  const userProfile = sampleUserProfile;

  // Sample active courses
  const activeCourses = [
    {
      id: 'active-1',
      title: 'CIT 5960 - Algorithms & Computation',
      startDate: '2026-05-01',
      endDate: '2026-08-15',
      progress: 35,
    },
    {
      id: 'active-2',
      title: 'ESE 5410 - Machine Learning for Data Science',
      startDate: '2026-05-01',
      endDate: '2026-08-15',
      progress: 28,
    },
  ];

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

  // Sort skills by proficiency
  const sortedSkills = [...userProfile.skills].sort((a, b) => b.proficiency - a.proficiency);

  const handleAgentSubmit = () => {
    // In real app, this would send to the Agent
    console.log('Sending to Agent:', agentInputText);
    setAgentInputText('');
    setShowAgentInput(false);
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const newResume = {
        name: file.name,
        uploadDate: new Date().toISOString().split('T')[0],
        url: URL.createObjectURL(file),
      };
      setUploadedResumes([newResume, ...uploadedResumes]);
    }
  };

  const toggleSourceFilter = (source: string) => {
    const isTurningOn = !sourceFilters.includes(source);

    setSourceFilters(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );

    // Lazily load the target-role videos the first time YouTube is selected.
    if (source === YOUTUBE_SOURCE && isTurningOn && !hasLoadedVideos) {
      void getVideo();
    }
  };

  const toggleTypeFilter = (type: string) => {
    setTypeFilters(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const availableSources = Array.from(
    new Set([
      YOUTUBE_SOURCE,
      ...resources.flatMap((resource) =>
        resource.source ? [resource.source] : [],
      ),
    ]),
  ).sort();

  const showYouTube = sourceFilters.includes(YOUTUBE_SOURCE);

  const availableTypes = Array.from(
    new Set(resources.map((resource) => resource.type)),
  ).sort();

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
                Personalized for: <span className="font-semibold">{targetRole}</span>
              </p>
            </div>
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:shadow-md"
              style={{
                background: showFilterPanel ? 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)' : 'rgba(184, 226, 212, 0.2)',
                color: showFilterPanel ? '#ffffff' : '#02746f',
              }}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
              {showFilterPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(244, 241, 242, 1)' }}>
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: '#15100c' }}>
                  Source
                </h4>
                <div className="flex flex-wrap gap-2">
                  {availableSources.map(source => (
                    <button
                      key={source}
                      onClick={() => toggleSourceFilter(source)}
                      className="px-3 py-1.5 rounded-lg text-sm transition-all"
                      style={{
                        background: sourceFilters.includes(source)
                          ? 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)'
                          : 'rgba(184, 226, 212, 0.2)',
                        color: sourceFilters.includes(source) ? '#ffffff' : '#15100c',
                      }}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2" style={{ color: '#15100c' }}>
                  Type
                </h4>
                <div className="flex flex-wrap gap-2">
                  {availableTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleTypeFilter(type)}
                      className="px-3 py-1.5 rounded-lg text-sm transition-all capitalize"
                      style={{
                        background: typeFilters.includes(type)
                          ? 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)'
                          : 'rgba(184, 226, 212, 0.2)',
                        color: typeFilters.includes(type) ? '#ffffff' : '#15100c',
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resources List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {/* YouTube Videos - shown when the YouTube source is active */}
            {showYouTube && (
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
              combinedResources.length === 0 &&
              !(showYouTube && sourceFilters.length === 1) && (
                <div
                  className="py-12 text-center text-sm"
                  style={{ color: "#55371e" }}
                >
                  No resources found.
                </div>
              )}

            {!isLoadingResources &&
              !resourcesError &&
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
                      <div className="flex items-center justify-end">
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
        <div className="px-6 pt-6 pb-3">
          <h2 className="text-xl font-semibold" style={{ color: '#15100c' }}>
            My Progress
          </h2>
        </div>

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
          <button
            onClick={() => setProfileSection('resume')}
            className="px-3 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: profileSection === 'resume' ? '#02746f' : '#55371e',
              borderBottom: profileSection === 'resume' ? '2px solid #02746f' : '2px solid transparent',
            }}
          >
            Resume
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Edit Button - Always visible */}
          <button
            onClick={() => setShowAgentInput(!showAgentInput)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:shadow-md mb-6"
            style={{
              background: 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)',
              color: '#ffffff',
            }}
          >
            <Edit3 className="w-4 h-4" />
            <span className="text-sm font-medium">Update with AI</span>
          </button>

          {/* Agent Input */}
          {showAgentInput && (
            <div className="p-4 rounded-lg space-y-3 mb-6" style={{ backgroundColor: 'rgba(184, 226, 212, 0.1)', border: '1px solid rgba(2, 116, 111, 0.3)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" style={{ color: '#02746f' }} />
                <span className="text-sm font-semibold" style={{ color: '#15100c' }}>
                  Quick Update
                </span>
              </div>
              <textarea
                value={agentInputText}
                onChange={e => setAgentInputText(e.target.value)}
                placeholder="Tell the AI what to update... e.g., 'Add AWS certification obtained on June 1st, 2026' or 'I completed the Deep Learning course'"
                className="w-full px-3 py-2 rounded-lg border resize-none text-sm"
                style={{ borderColor: 'rgba(21, 16, 12, 0.2)', minHeight: '80px' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAgentSubmit}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)',
                    color: '#ffffff',
                  }}
                >
                  <Send className="w-4 h-4" />
                  <span className="text-sm font-medium">Send to AI</span>
                </button>
                <button
                  onClick={() => setShowAgentInput(false)}
                  className="px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{ color: '#55371e' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

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
                      const res = combinedResources.find(r => r.title.includes(course.title.split(' - ')[0]));
                      const isHov = hoveredItem === course.id;
                      return (
                        <div
                          key={course.id}
                          className="relative p-3 rounded-lg transition-all cursor-default"
                          style={{ backgroundColor: 'rgba(253,211,87,0.15)', border: `1px solid ${isHov ? 'rgba(253,211,87,0.6)' : 'rgba(253,211,87,0.3)'}`, boxShadow: isHov ? '0 4px 12px rgba(0,0,0,0.08)' : 'none' }}
                          onMouseEnter={() => setHoveredItem(course.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#02746f' }} />
                              <span className="text-sm font-medium" style={{ color: '#15100c' }}>{course.title}</span>
                            </div>
                            <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#02746f' }}>{course.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden mb-1.5" style={{ backgroundColor: 'rgba(184,226,212,0.3)' }}>
                            <div className="h-full rounded-full" style={{ width: `${course.progress}%`, background: 'linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)' }} />
                          </div>
                          <div className="text-xs" style={{ color: '#55371e' }}>
                            {new Date(course.startDate).toLocaleDateString()} – {new Date(course.endDate).toLocaleDateString()}
                          </div>
                          {isHov && res && (
                            <div className="mt-2 pt-2 border-t space-y-1.5" style={{ borderColor: 'rgba(253,211,87,0.4)' }}>
                              <p className="text-xs" style={{ color: '#55371e' }}>{res.description}</p>
                              <div className="flex flex-wrap gap-1">
                                {res.skills.slice(0, 4).map((s, i) => (
                                  <span key={i} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(184,226,212,0.3)', color: '#15100c' }}>{s}</span>
                                ))}
                              </div>
                              <div className="flex items-center gap-3 text-xs" style={{ color: '#55371e' }}>
                                <span>Source: <strong>{res.source}</strong></span>
                                {res.instructor && <span>By {res.instructor}</span>}
                              </div>
                            </div>
                          )}
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
                  {userProfile.completedCourses.length > 2 && (
                    <button
                      onClick={() => setShowAllCompleted(!showAllCompleted)}
                      className="text-xs font-medium flex items-center gap-1"
                      style={{ color: '#02746f' }}
                    >
                      {showAllCompleted ? 'Show Less' : `View All (${userProfile.completedCourses.length})`}
                      {showAllCompleted ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {(['Introduction to Python Programming', 'Data Structures & Algorithms'] as const).slice(0, showAllCompleted ? undefined : 2).map((title, idx) => {
                    const enrolled = userProfile.completedCourses[idx];
                    if (!enrolled) return null;
                    const res = combinedResources.find(r => r.title.toLowerCase().includes('python') && idx === 0 || r.title.toLowerCase().includes('algorithm') && idx === 1);
                    const isHov = hoveredItem === `course-done-${idx}`;
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg transition-all cursor-default"
                        style={{ backgroundColor: 'rgba(184,226,212,0.15)', border: `1px solid ${isHov ? 'rgba(2,116,111,0.25)' : 'transparent'}`, boxShadow: isHov ? '0 4px 12px rgba(0,0,0,0.06)' : 'none' }}
                        onMouseEnter={() => setHoveredItem(`course-done-${idx}`)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#02746f' }} />
                          <span className="text-sm font-medium" style={{ color: '#15100c' }}>{title}</span>
                        </div>
                        <div className="text-xs" style={{ color: '#55371e' }}>Completed: {enrolled.completionDate}</div>
                        {isHov && enrolled.notes && (
                          <div className="mt-2 pt-2 border-t text-xs" style={{ borderColor: 'rgba(2,116,111,0.15)', color: '#55371e' }}>
                            {enrolled.notes}
                          </div>
                        )}
                        {isHov && res && (
                          <div className="mt-2 pt-2 border-t space-y-1.5" style={{ borderColor: 'rgba(2,116,111,0.15)' }}>
                            <p className="text-xs" style={{ color: '#55371e' }}>{res.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {res.skills.slice(0, 4).map((s, i) => (
                                <span key={i} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(184,226,212,0.3)', color: '#15100c' }}>{s}</span>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 text-xs" style={{ color: '#55371e' }}>
                              <span>Source: <strong>{res.source}</strong></span>
                              {res.instructor && <span>By {res.instructor}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Skills Tab */}
          {profileSection === 'skills' && (
            <div className="space-y-2">
              {sortedSkills.map((skill, idx) => {
                const level =
                  skill.proficiency >= 80 ? { label: 'Expert', color: '#02746f', bg: 'rgba(2,116,111,0.1)' }
                  : skill.proficiency >= 60 ? { label: 'Proficient', color: '#059669', bg: 'rgba(5,150,105,0.1)' }
                  : skill.proficiency >= 40 ? { label: 'Intermediate', color: '#b45309', bg: 'rgba(253,211,87,0.2)' }
                  : { label: 'Beginner', color: '#55371e', bg: 'rgba(21,16,12,0.06)' };

                const relatedCourses = combinedResources
                  .filter((resource) =>
                    resource.skills.some(
                      (resourceSkill) =>
                        resourceSkill
                          .toLowerCase()
                          .includes(skill.name.toLowerCase()) ||
                        skill.name
                          .toLowerCase()
                          .includes(resourceSkill.toLowerCase()),
                    ),
                  )
                  .slice(0, 2)
                  .map((resource) => resource.title);

                const isHovered = hoveredSkill === skill.name;

                return (
                  <div
                    key={idx}
                    className="relative rounded-lg px-3 py-2.5 cursor-default transition-all"
                    style={{ backgroundColor: isHovered ? 'rgba(184,226,212,0.12)' : 'transparent', border: '1px solid', borderColor: isHovered ? 'rgba(2,116,111,0.2)' : 'transparent' }}
                    onMouseEnter={() => setHoveredSkill(skill.name)}
                    onMouseLeave={() => setHoveredSkill(null)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: '#15100c' }}>{skill.name}</span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: level.color, backgroundColor: level.bg }}
                      >
                        {level.label}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#55371e', opacity: 0.7 }}>{skill.source}</div>

                    {/* Hover detail card */}
                    {isHovered && (
                      <div
                        className="absolute left-0 right-0 z-10 mt-1 p-3 rounded-lg shadow-lg"
                        style={{ top: '100%', backgroundColor: '#fff', border: '1px solid rgba(2,116,111,0.2)' }}
                      >
                        {relatedCourses.length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs font-semibold mb-1" style={{ color: '#02746f' }}>Related Courses</div>
                            {relatedCourses.map((c, i) => (
                              <div key={i} className="text-xs flex items-center gap-1" style={{ color: '#55371e' }}>
                                <BookOpen className="w-3 h-3 flex-shrink-0" style={{ color: '#02746f' }} />
                                {c}
                              </div>
                            ))}
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-semibold mb-1" style={{ color: '#02746f' }}>Experience</div>
                          <div className="text-xs flex items-center gap-1" style={{ color: '#55371e' }}>
                            <Briefcase className="w-3 h-3 flex-shrink-0" style={{ color: '#02746f' }} />
                            {skill.source}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
            <div className="space-y-3">
              {userProfile.resume.experience.map((exp, idx) => {
                const key = `exp-${idx}`;
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
                        <div className="font-medium" style={{ color: '#15100c' }}>{exp.role}</div>
                        <div className="text-sm" style={{ color: '#55371e' }}>{exp.company} · {exp.duration}</div>
                      </div>
                      {exp.highlights.length > 0 && (
                        <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: '#02746f', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                      )}
                    </div>
                    {isOpen && exp.highlights.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t pt-3" style={{ borderColor: 'rgba(2,116,111,0.12)' }}>
                        {exp.highlights.map((h, hidx) => (
                          <li key={hidx} className="flex gap-2 text-sm" style={{ color: '#55371e' }}>
                            <span style={{ color: '#02746f' }}>•</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Projects Tab */}
          {profileSection === 'projects' && (
            <div className="space-y-3">
              {userProfile.resume.projects.map((project, idx) => {
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
                      <div className="font-medium" style={{ color: '#15100c' }}>{project.name}</div>
                      <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: '#02746f', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    </div>
                    {isOpen && (
                      <div className="mt-3 border-t pt-3 space-y-2" style={{ borderColor: 'rgba(2,116,111,0.12)' }}>
                        <p className="text-sm" style={{ color: '#55371e' }}>{project.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {project.skills.map((s, sidx) => (
                            <span key={sidx} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(253,211,87,0.2)', color: '#15100c' }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
          {profileSection === 'resume' && (
            <div className="space-y-4">
              {/* AI Info */}
              <div className="p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: 'rgba(184, 226, 212, 0.1)' }}>
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#02746f' }} />
                <p className="text-xs" style={{ color: '#55371e' }}>
                  Upload your resume and AI will automatically parse and populate your Experience and Projects tabs.
                </p>
              </div>

              {/* Upload Section */}
              <div className="p-4 rounded-lg border-2 border-dashed" style={{ borderColor: 'rgba(2, 116, 111, 0.3)' }}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleResumeUpload}
                  className="hidden"
                  id="resume-upload"
                />
                <label
                  htmlFor="resume-upload"
                  className="flex flex-col items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-8 h-8" style={{ color: '#02746f' }} />
                  <span className="text-sm font-medium" style={{ color: '#15100c' }}>
                    Upload Resume (PDF)
                  </span>
                  <span className="text-xs" style={{ color: '#55371e' }}>
                    Click to browse or drag and drop
                  </span>
                </label>
              </div>

              {/* Uploaded Resumes */}
              <div>
                <h3 className="font-semibold mb-3" style={{ color: '#15100c' }}>
                  Uploaded Resumes
                </h3>
                <div className="space-y-2">
                  {uploadedResumes.map((resume, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg flex items-center justify-between"
                      style={{ backgroundColor: 'rgba(184, 226, 212, 0.15)' }}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5" style={{ color: '#02746f' }} />
                        <div>
                          <div className="text-sm font-medium" style={{ color: '#15100c' }}>
                            {resume.name}
                          </div>
                          <div className="text-xs" style={{ color: '#55371e' }}>
                            Uploaded: {new Date(resume.uploadDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <a
                        href={resume.url}
                        download={resume.name}
                        className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" style={{ color: '#02746f' }} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
