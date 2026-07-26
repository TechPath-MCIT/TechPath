import { useState } from 'react';
import { Briefcase, X, DollarSign, Target, MapPin as Position, ChevronDown, ChevronUp } from 'lucide-react';
import { jobTaxonomyData, userSkills, calculateSkillMatch, JobNode, jobDetails } from '../data/jobData';

interface JobLandscapeNewProps {}

export function JobLandscapeNew({}: JobLandscapeNewProps) {
  const [selectedJob, setSelectedJob] = useState<JobNode | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Get unique L1 categories
  const l1Categories = Array.from(new Set(jobTaxonomyData.map(job => job.L1)));

  // Group jobs by L1
  const jobsByL1 = l1Categories.map(l1 => ({
    category: l1,
    jobs: jobTaxonomyData.filter(job => job.L1 === l1)
  }));

  const toggleCategory = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  const handleJobClick = (job: JobNode) => {
    setSelectedJob(job);
  };

  const closeDrawer = () => {
    setSelectedJob(null);
  };

  return (
    <div className="h-full bg-white rounded-2xl shadow-md flex flex-col relative">
      {/* Job cards - All categories */}
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="text-xl font-semibold mb-6" style={{ color: '#15100c' }}>
          Landscape
        </h2>

        {jobsByL1.map(({ category, jobs }) => {
          const isCollapsed = collapsedCategories.has(category);

          return (
            <div key={category} className="mb-8">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between mb-4 p-3 rounded-lg hover:bg-stone-50 transition-colors"
              >
                <h3 className="text-lg font-semibold" style={{ color: '#15100c' }}>
                  {category}
                  <span className="ml-3 text-sm font-normal" style={{ color: '#55371e' }}>
                    ({jobs.length} roles)
                  </span>
                </h3>
                {isCollapsed ? (
                  <ChevronDown className="w-5 h-5" style={{ color: '#55371e' }} />
                ) : (
                  <ChevronUp className="w-5 h-5" style={{ color: '#55371e' }} />
                )}
              </button>

              {/* Job cards */}
              {!isCollapsed && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {jobs.map((job) => {
                    const matchPercentage = calculateSkillMatch(job.core_skills, userSkills);

                    return (
                      <div
                        key={job.node_id}
                        onClick={() => handleJobClick(job)}
                        className="p-3 rounded-lg border cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                        style={{
                          borderColor: 'rgba(21, 16, 12, 0.15)',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#02746f' }} />
                          <h5 className="font-semibold text-xs line-clamp-2" style={{ color: '#15100c' }}>
                            {job.L4_job_role}
                          </h5>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(184, 226, 212, 0.3)' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${matchPercentage}%`,
                                background: matchPercentage >= 70
                                  ? 'linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)'
                                  : matchPercentage >= 40
                                  ? 'linear-gradient(90deg, #fdd357 0%, #b8e2d4 100%)'
                                  : 'linear-gradient(90deg, #ef4444 0%, #fdd357 100%)',
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: '#02746f' }}>
                            {matchPercentage}%
                          </span>
                        </div>

                        <div className="text-xs" style={{ color: '#55371e' }}>
                          {job.L3}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Drawer overlay */}
      {selectedJob && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={closeDrawer}
          />

          {/* Drawer */}
          <div
            className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl z-50 overflow-y-auto"
            style={{ animation: 'slideIn 0.3s ease-out' }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6 pb-4 border-b" style={{ borderColor: 'rgba(21, 16, 12, 0.1)' }}>
                <div className="flex-1 pr-4">
                  <h2 className="text-2xl font-semibold mb-2" style={{ color: '#15100c' }}>
                    {selectedJob.L4_job_role}
                  </h2>
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#55371e' }}>
                    <span>{selectedJob.L1}</span>
                    <span>→</span>
                    <span>{selectedJob.L2}</span>
                    <span>→</span>
                    <span>{selectedJob.L3}</span>
                  </div>
                </div>
                <button
                  onClick={closeDrawer}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" style={{ color: '#55371e' }} />
                </button>
              </div>

              {/* Overall Match Score */}
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(184, 226, 212, 0.2)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: '#15100c' }}>
                    Overall Match Score
                  </span>
                  <span className="text-2xl font-bold" style={{ color: '#02746f' }}>
                    {calculateSkillMatch(selectedJob.core_skills, userSkills)}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(184, 226, 212, 0.3)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${calculateSkillMatch(selectedJob.core_skills, userSkills)}%`,
                      background: 'linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)',
                    }}
                  />
                </div>
              </div>

              {/* Detailed Match Score */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3" style={{ color: '#15100c' }}>
                  Detailed Match Score
                </h3>
                <div className="space-y-3">
                  {selectedJob.core_skills.split(',').map((skill, index) => {
                    const trimmedSkill = skill.trim();
                    const matchPercentage = userSkills.some(us =>
                      trimmedSkill.toLowerCase().includes(us.toLowerCase()) ||
                      us.toLowerCase().includes(trimmedSkill.toLowerCase())
                    ) ? 100 : Math.floor(Math.random() * 40) + 20;

                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium" style={{ color: '#15100c' }}>
                            {trimmedSkill}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: '#55371e' }}>
                            {matchPercentage}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(184, 226, 212, 0.3)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${matchPercentage}%`,
                              background: matchPercentage >= 70
                                ? 'linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)'
                                : matchPercentage >= 40
                                ? 'linear-gradient(90deg, #fdd357 0%, #b8e2d4 100%)'
                                : 'linear-gradient(90deg, #ef4444 0%, #fdd357 100%)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Job details */}
              {jobDetails[selectedJob.node_id] && (
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <p className="text-sm leading-relaxed" style={{ color: '#55371e' }}>
                      {jobDetails[selectedJob.node_id].description}
                    </p>
                  </div>

                  {/* Salary */}
                  <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: 'rgba(253, 211, 87, 0.15)' }}>
                    <DollarSign className="w-5 h-5" style={{ color: '#02746f' }} />
                    <div>
                      <div className="text-xs font-semibold mb-1" style={{ color: '#55371e' }}>
                        Salary Range
                      </div>
                      <div className="text-lg font-bold" style={{ color: '#15100c' }}>
                        {jobDetails[selectedJob.node_id].salary_range}
                      </div>
                    </div>
                  </div>

                  {/* Main Responsibilities */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4" style={{ color: '#02746f' }} />
                      <h3 className="font-semibold" style={{ color: '#15100c' }}>
                        Main Responsibilities
                      </h3>
                    </div>
                    <ul className="space-y-2">
                      {jobDetails[selectedJob.node_id].main_responsibilities.map((resp, idx) => (
                        <li key={idx} className="flex gap-2 text-sm" style={{ color: '#55371e' }}>
                          <span style={{ color: '#02746f' }}>•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Position in Field */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Position className="w-4 h-4" style={{ color: '#02746f' }} />
                      <h3 className="font-semibold" style={{ color: '#15100c' }}>
                        Position in Field
                      </h3>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#55371e' }}>
                      {jobDetails[selectedJob.node_id].position_in_field}
                    </p>
                  </div>

                  {/* Typical Titles */}
                  <div>
                    <h3 className="font-semibold mb-3" style={{ color: '#15100c' }}>
                      Typical Job Titles
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.typical_titles_en.split(',').map((title, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 rounded-lg text-sm"
                          style={{
                            backgroundColor: '#f4f1f2',
                            color: '#15100c',
                          }}
                        >
                          {title.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
