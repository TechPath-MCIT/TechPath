import { useState } from 'react';
import {
  Filter, X, BookOpen, Calendar, Award, Briefcase, TrendingUp,
  FileText, CheckCircle, Clock, MapPin, DollarSign, ExternalLink,
  ChevronDown, ChevronUp, Edit3, Send, Sparkles, Upload, Download
} from 'lucide-react';
import { ResourceSource, LearningResource, EnrolledResource, UserLearningProfile } from '../data/mcitCourses';
import { getRecommendedResources, sampleUserProfile } from '../data/learningResources';
import { getRecommendedCourses, mcitCourses } from '../data/mcitCourses';

interface GrindPageProps {
  targetRole: string;
  userSkills: string[];
}

export function GrindPage({ targetRole, userSkills }: GrindPageProps) {
  const [sourceFilters, setSourceFilters] = useState<ResourceSource[]>([]);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [profileSection, setProfileSection] = useState<'ongoing' | 'courses' | 'skills' | 'certifications' | 'activities' | 'experience' | 'projects' | 'resume'>('ongoing');
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllCertifications, setShowAllCertifications] = useState(false);
  const [showAgentInput, setShowAgentInput] = useState(false);
  const [agentInputText, setAgentInputText] = useState('');
  const [uploadedResumes, setUploadedResumes] = useState<{ name: string; uploadDate: string; url: string }[]>([
    { name: 'Resume_2026_May.pdf', uploadDate: '2026-05-15', url: '#' },
    { name: 'Resume_2025_Dec.pdf', uploadDate: '2025-12-10', url: '#' },
  ]);

  // Combine MCIT courses with other resources
  const mcitResources: LearningResource[] = mcitCourses.map(course => ({
    id: `mcit-${course.code}`,
    type: 'course' as const,
    source: 'MCIT' as ResourceSource,
    title: `${course.code} - ${course.title}`,
    description: course.description,
    skills: course.skills,
    recommendationScore: course.recommendationScore,
    cost: 'Included in MCIT',
    duration: '14 weeks',
  }));

  const allRecommendedResources = getRecommendedResources(targetRole, userSkills, sourceFilters.length > 0 ? sourceFilters : undefined, typeFilters.length > 0 ? typeFilters : undefined);
  const mcitCoursesRecommended = getRecommendedCourses(targetRole, userSkills);

  // Merge and sort all resources
  const combinedResources = [...allRecommendedResources, ...mcitResources]
    .sort((a, b) => b.recommendationScore - a.recommendationScore);

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

  const toggleSourceFilter = (source: ResourceSource) => {
    setSourceFilters(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const toggleTypeFilter = (type: string) => {
    setTypeFilters(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const availableSources: ResourceSource[] = ['MCIT', 'Coursera', 'MIT OCW', 'Book', 'Podcast', 'Meetup'];
  const availableTypes = ['course', 'book', 'podcast', 'event', 'workshop'];

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
            {combinedResources.map((resource, index) => {
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
                    {/* Rank Badge */}
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{
                        background: index < 5
                          ? 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)'
                          : 'rgba(184, 226, 212, 0.3)',
                        color: index < 5 ? '#ffffff' : '#15100c',
                      }}
                    >
                      {index + 1}
                    </div>

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
                        {'location' in resource && resource.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {resource.location}
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
                      <div className="flex items-center justify-between">
                        <div className="text-xs" style={{ color: '#55371e' }}>
                          Match Score: <span className="font-semibold" style={{ color: '#02746f' }}>{resource.recommendationScore}</span>
                        </div>
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
              {/* Active Courses */}
              {activeCourses.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#15100c' }}>
                    <BookOpen className="w-4 h-4" style={{ color: '#02746f' }} />
                    Active Courses
                  </h3>
                  <div className="space-y-2">
                    {activeCourses.map(course => (
                      <div
                        key={course.id}
                        className="p-3 rounded-lg"
                        style={{
                          backgroundColor: 'rgba(253, 211, 87, 0.15)',
                          border: '1px solid rgba(253, 211, 87, 0.3)',
                        }}
                      >
                        <div className="text-sm font-medium mb-2" style={{ color: '#15100c' }}>
                          {course.title}
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs" style={{ color: '#55371e' }}>
                            Progress
                          </span>
                          <span className="text-xs font-semibold" style={{ color: '#02746f' }}>
                            {course.progress}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(184, 226, 212, 0.3)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${course.progress}%`,
                              background: 'linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)',
                            }}
                          />
                        </div>
                        <div className="text-xs mt-1" style={{ color: '#55371e' }}>
                          {new Date(course.startDate).toLocaleDateString()} - {new Date(course.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* In-Progress Certifications */}
              {inProgressCertifications.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: '#15100c' }}>
                    <Award className="w-4 h-4" style={{ color: '#fdd357' }} />
                    In Progress
                  </h3>
                  <div className="space-y-2">
                    {inProgressCertifications.map(cert => (
                      <div
                        key={cert.id}
                        className="p-3 rounded-lg"
                        style={{
                          backgroundColor: 'rgba(253, 211, 87, 0.15)',
                        }}
                      >
                        <div className="text-sm font-medium mb-2" style={{ color: '#15100c' }}>
                          {cert.name}
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs" style={{ color: '#55371e' }}>
                            Progress
                          </span>
                          <span className="text-xs font-semibold" style={{ color: '#02746f' }}>
                            {cert.progress}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(184, 226, 212, 0.3)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${cert.progress}%`,
                              background: 'linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)',
                            }}
                          />
                        </div>
                        <div className="text-xs mt-1" style={{ color: '#55371e' }}>
                          Expected: {new Date(cert.expectedCompletion).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
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
                        style={{
                          backgroundColor: 'rgba(184, 226, 212, 0.15)',
                          border: '1px solid rgba(2, 116, 111, 0.2)',
                        }}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="text-sm font-medium" style={{ color: '#15100c' }}>
                            {activity.title}
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(253, 211, 87, 0.3)', color: '#15100c' }}>
                            {activity.type}
                          </span>
                        </div>
                        <p className="text-xs mb-1" style={{ color: '#55371e' }}>
                          {activity.description}
                        </p>
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
              {/* Completed Courses */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2" style={{ color: '#15100c' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: '#02746f' }} />
                    Completed Courses
                  </h3>
                  {userProfile.completedCourses.length > 2 && (
                    <button
                      onClick={() => setShowAllCompleted(!showAllCompleted)}
                      className="text-xs font-medium flex items-center gap-1 transition-colors"
                      style={{ color: '#02746f' }}
                    >
                      {showAllCompleted ? 'Show Less' : `View All (${userProfile.completedCourses.length})`}
                      {showAllCompleted ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {(showAllCompleted ? userProfile.completedCourses : userProfile.completedCourses.slice(0, 2)).map((enrolled, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: 'rgba(184, 226, 212, 0.15)' }}
                    >
                      <div className="text-sm font-medium mb-1" style={{ color: '#15100c' }}>
                        Introduction to Python Programming
                      </div>
                      <div className="text-xs" style={{ color: '#55371e' }}>
                        Completed: {enrolled.completionDate}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Skills Tab */}
          {profileSection === 'skills' && (
            <div className="space-y-3">
              {sortedSkills.map((skill, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: '#15100c' }}>
                      {skill.name}
                    </span>
                    <span className="text-xs" style={{ color: '#55371e' }}>
                      {skill.proficiency}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(184, 226, 212, 0.3)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${skill.proficiency}%`,
                        background: 'linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)',
                      }}
                    />
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#55371e' }}>
                    {skill.source}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Certifications Tab */}
          {profileSection === 'certifications' && (
            <div className="space-y-2">
              {userProfile.certifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'rgba(253, 211, 87, 0.15)' }}
                >
                  <div className="text-sm font-medium" style={{ color: '#15100c' }}>
                    {cert.name}
                  </div>
                  <div className="text-xs" style={{ color: '#55371e' }}>
                    {cert.issuer} • {cert.date}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Experience Tab */}
          {profileSection === 'experience' && (
            <div className="space-y-4">
              {userProfile.resume.experience.map((exp, idx) => (
                <div key={idx} className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(184, 226, 212, 0.1)' }}>
                  <div className="font-medium mb-1" style={{ color: '#15100c' }}>
                    {exp.role}
                  </div>
                  <div className="text-sm mb-2" style={{ color: '#55371e' }}>
                    {exp.company} • {exp.duration}
                  </div>
                  <ul className="space-y-1">
                    {exp.highlights.map((highlight, hidx) => (
                      <li key={hidx} className="flex gap-2 text-sm" style={{ color: '#55371e' }}>
                        <span style={{ color: '#02746f' }}>•</span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Projects Tab */}
          {profileSection === 'projects' && (
            <div className="space-y-4">
              {userProfile.resume.projects.map((project, idx) => (
                <div key={idx} className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(184, 226, 212, 0.1)' }}>
                  <div className="font-medium mb-2" style={{ color: '#15100c' }}>
                    {project.name}
                  </div>
                  <p className="text-sm mb-2" style={{ color: '#55371e' }}>
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {project.skills.map((skill, sidx) => (
                      <span
                        key={sidx}
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: 'rgba(253, 211, 87, 0.2)',
                          color: '#15100c',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Activities Tab */}
          {profileSection === 'activities' && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(184, 226, 212, 0.15)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" style={{ color: '#02746f' }} />
                  <span className="text-sm font-medium" style={{ color: '#15100c' }}>
                    San Francisco ML Meetup
                  </span>
                </div>
                <p className="text-xs mb-2" style={{ color: '#55371e' }}>
                  Attended monthly meetup on practical ML applications
                </p>
                <div className="text-xs" style={{ color: '#55371e' }}>
                  June 1, 2026
                </div>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(184, 226, 212, 0.15)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4" style={{ color: '#02746f' }} />
                  <span className="text-sm font-medium" style={{ color: '#15100c' }}>
                    Tech Conference 2026
                  </span>
                </div>
                <p className="text-xs mb-2" style={{ color: '#55371e' }}>
                  Presented paper on distributed ML systems
                </p>
                <div className="text-xs" style={{ color: '#55371e' }}>
                  March 15, 2026
                </div>
              </div>
            </div>
          )}

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
