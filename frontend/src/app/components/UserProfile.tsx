import { MapPin, Mail, Briefcase, Edit2, Check, Target } from 'lucide-react';
import { useState } from 'react';
import { jobTaxonomyData } from '../data/jobData';

interface UserProfileProps {
  name: string;
  email: string;
  location: string;
  skills: string[];
  yearsOfExperience: number;
  experience: string[];
  targetRole?: {
    current: string;
    target: string;
    matchScore: number;
  };
  avatarUrl?: string;
  onSetTargetRole?: (current: string, target: string) => void;
}

export function UserProfile({
  name,
  email,
  location,
  skills,
  yearsOfExperience,
  experience,
  targetRole,
  avatarUrl,
  onSetTargetRole,
}: UserProfileProps) {
  const [userLocation, setUserLocation] = useState(location);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [tempLocation, setTempLocation] = useState(location);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempCurrentRole, setTempCurrentRole] = useState(targetRole?.current || '');
  const [tempTargetRole, setTempTargetRole] = useState(targetRole?.target || '');
  const [userTargetRole, setUserTargetRole] = useState(targetRole);

  // Get target role's required skills
  const targetRoleData = jobTaxonomyData.find(
    job => job.L4_job_role === userTargetRole?.target
  );

  const requiredSkills = targetRoleData
    ? targetRoleData.core_skills.split(',').map(s => s.trim())
    : [];

  // Calculate skill proficiency for each required skill
  const getSkillProficiency = (requiredSkill: string): number => {
    const userSkillsLower = skills.map(s => s.toLowerCase());
    const requiredSkillLower = requiredSkill.toLowerCase();

    // Check if user has this skill (exact or partial match)
    const hasSkill = userSkillsLower.some(us =>
      us.includes(requiredSkillLower) || requiredSkillLower.includes(us)
    );

    if (hasSkill) {
      return 100; // User has the skill
    } else {
      // Generate a random proficiency between 0-40 for skills user doesn't have
      return Math.floor(Math.random() * 40);
    }
  };


  const handleSaveLocation = () => {
    setUserLocation(tempLocation);
    setIsEditingLocation(false);
  };

  const handleCancelLocation = () => {
    setTempLocation(userLocation);
    setIsEditingLocation(false);
  };

  const handleSaveGoal = () => {
    if (tempCurrentRole && tempTargetRole) {
      setUserTargetRole({
        current: tempCurrentRole,
        target: tempTargetRole,
        matchScore: userTargetRole?.matchScore || 0
      });
      onSetTargetRole?.(tempCurrentRole, tempTargetRole);
      setIsEditingGoal(false);
    }
  };

  const handleCancelGoal = () => {
    setTempCurrentRole(userTargetRole?.current || '');
    setTempTargetRole(userTargetRole?.target || '');
    setIsEditingGoal(false);
  };
  return (
    <div className="h-full bg-white rounded-2xl shadow-md p-6">
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 border-4" style={{ background: 'linear-gradient(135deg, #b8e2d4 0%, #02746f 100%)', borderColor: '#d1cece' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-white text-3xl font-semibold">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <h2 className="text-xl font-semibold" style={{ color: '#15100c' }}>
          {name}
        </h2>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-3 text-sm" style={{ color: '#55371e' }}>
          <Mail className="w-4 h-4" style={{ color: '#02746f' }} />
          <span>{email}</span>
        </div>
        <div className="flex items-center gap-3 text-sm" style={{ color: '#55371e' }}>
          <Briefcase className="w-4 h-4" style={{ color: '#02746f' }} />
          <span>{yearsOfExperience} years experience</span>
        </div>
        <div className="flex items-center gap-3 text-sm" style={{ color: '#55371e' }}>
          <MapPin className="w-4 h-4" style={{ color: '#02746f' }} />
          {isEditingLocation ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={tempLocation}
                onChange={(e) => setTempLocation(e.target.value)}
                className="flex-1 px-2 py-1 border rounded text-sm"
                style={{ borderColor: '#02746f' }}
                autoFocus
              />
              <button onClick={handleSaveLocation} className="p-1 hover:bg-stone-100 rounded">
                <Check className="w-4 h-4" style={{ color: '#02746f' }} />
              </button>
              <button onClick={handleCancelLocation} className="p-1 hover:bg-stone-100 rounded">
                <X className="w-4 h-4" style={{ color: '#55371e' }} />
              </button>
            </div>
          ) : (
            <>
              <span className="flex-1">{userLocation}</span>
              <button onClick={() => setIsEditingLocation(true)} className="p-1 hover:bg-stone-100 rounded">
                <Edit2 className="w-3 h-3" style={{ color: '#55371e' }} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Target Role */}
      {userTargetRole && (
        <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(184, 226, 212, 0.2)', border: '2px solid #02746f' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" style={{ color: '#02746f' }} />
              <h3 className="text-sm font-semibold" style={{ color: '#15100c' }}>
                Career Goal
              </h3>
            </div>
            {!isEditingGoal && (
              <button
                onClick={() => {
                  setTempCurrentRole(userTargetRole.current);
                  setTempTargetRole(userTargetRole.target);
                  setIsEditingGoal(true);
                }}
                className="p-1 hover:bg-white rounded transition-colors"
              >
                <Edit2 className="w-3 h-3" style={{ color: '#02746f' }} />
              </button>
            )}
          </div>
          {isEditingGoal ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#55371e' }}>
                  From:
                </label>
                <input
                  type="text"
                  value={tempCurrentRole}
                  onChange={(e) => setTempCurrentRole(e.target.value)}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                  style={{ borderColor: '#02746f' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#55371e' }}>
                  To:
                </label>
                <input
                  type="text"
                  value={tempTargetRole}
                  onChange={(e) => setTempTargetRole(e.target.value)}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                  style={{ borderColor: '#02746f' }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveGoal}
                  className="flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#02746f', color: '#ffffff' }}
                >
                  Save
                </button>
                <button
                  onClick={handleCancelGoal}
                  className="flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#f4f1f2', color: '#15100c' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs" style={{ color: '#55371e' }}>
                <span className="font-medium">From:</span> {userTargetRole.current}
              </div>
              <div className="text-xs mb-2" style={{ color: '#55371e' }}>
                <span className="font-medium">To:</span> {userTargetRole.target}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(184, 226, 212, 0.3)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${userTargetRole.matchScore}%`,
                      background: 'linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)',
                    }}
                  />
                </div>
                <span className="text-xs font-semibold" style={{ color: '#02746f' }}>
                  {userTargetRole.matchScore}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Required Skills for Target Role */}
      {userTargetRole && requiredSkills.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#15100c' }}>
            Skills for {userTargetRole.target}
          </h3>
          <div className="space-y-3">
            {requiredSkills.map((skill, index) => {
              const proficiency = getSkillProficiency(skill);

              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: '#15100c' }}>
                      {skill}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: '#55371e' }}>
                      {proficiency}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(184, 226, 212, 0.3)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${proficiency}%`,
                        background: proficiency >= 70
                          ? 'linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)'
                          : proficiency >= 40
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
      )}

      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#15100c' }}>
          Experience Highlights
        </h3>
        <ul className="space-y-2">
          {experience.map((exp, index) => (
            <li key={index} className="flex gap-2 text-sm" style={{ color: '#55371e' }}>
              <span style={{ color: '#02746f' }}>•</span>
              <span>{exp}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
