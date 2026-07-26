import { MapPin, Mail, Briefcase, Edit2, Target, X, ChevronDown, UserCircle, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { jobTaxonomyData } from '../data/jobData';

const GLOBAL_CITIES = [
  'San Francisco, CA, USA', 'New York, NY, USA', 'Seattle, WA, USA', 'Austin, TX, USA',
  'Boston, MA, USA', 'Los Angeles, CA, USA', 'Chicago, IL, USA', 'Denver, CO, USA',
  'Atlanta, GA, USA', 'San Jose, CA, USA', 'Washington, DC, USA', 'Raleigh, NC, USA',
  'Portland, OR, USA', 'San Diego, CA, USA', 'Dallas, TX, USA', 'Miami, FL, USA',
  'Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada', 'Mexico City, Mexico',
  'London, UK', 'Berlin, Germany', 'Amsterdam, Netherlands', 'Paris, France',
  'Dublin, Ireland', 'Stockholm, Sweden', 'Zurich, Switzerland', 'Munich, Germany',
  'Barcelona, Spain', 'Madrid, Spain', 'Warsaw, Poland', 'Prague, Czech Republic',
  'Copenhagen, Denmark', 'Helsinki, Finland', 'Oslo, Norway', 'Vienna, Austria',
  'Lisbon, Portugal', 'Milan, Italy', 'Rome, Italy', 'Brussels, Belgium',
  'Singapore', 'Tokyo, Japan', 'Seoul, South Korea', 'Beijing, China',
  'Shanghai, China', 'Shenzhen, China', 'Hong Kong', 'Taipei, Taiwan',
  'Bangalore, India', 'Mumbai, India', 'Hyderabad, India', 'Delhi, India',
  'Sydney, Australia', 'Melbourne, Australia', 'Auckland, New Zealand',
  'Jakarta, Indonesia', 'Kuala Lumpur, Malaysia', 'Bangkok, Thailand',
  'Ho Chi Minh City, Vietnam', 'Manila, Philippines',
  'Dubai, UAE', 'Abu Dhabi, UAE', 'Tel Aviv, Israel', 'Riyadh, Saudi Arabia',
  'Cairo, Egypt', 'Lagos, Nigeria', 'Nairobi, Kenya', 'Cape Town, South Africa',
  'São Paulo, Brazil', 'Buenos Aires, Argentina', 'Bogotá, Colombia',
  'Santiago, Chile', 'Lima, Peru',
  'Remote',
];

interface UserProfileProps {
  name: string;
  email: string;
  role: string;
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
  onLoadRoles?: () => Promise<RoleOption[]>;
  onSetTargetRole?: (target: RoleOption) => Promise<void>;
  onSetLocation?: (location: string) => Promise<void>;
}

export type RoleOption = {
  roleId: number;
  name: string;
};

const figmaPreviewRoles: RoleOption[] = jobTaxonomyData.map(
  (role, index) => ({
    roleId: index + 1,
    name: role.L4_job_role,
  }),
);

export function UserProfile({
  name,
  email,
  role,
  location,
  skills,
  yearsOfExperience,
  experience,
  targetRole,
  avatarUrl,
  onLoadRoles = async () => figmaPreviewRoles,
  onSetTargetRole = async () => {},
  onSetLocation,
}: UserProfileProps) {
  const [userLocation, setUserLocation] = useState(location);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  const handleSelectLocation = async (city: string) => {
    setLocationOpen(false);
    setLocationQuery('');

    if (city === userLocation) {
      return;
    }

    const previous = userLocation;
    setUserLocation(city);

    if (!onSetLocation) {
      return;
    }

    setSavingLocation(true);
    setLocationError(null);

    try {
      await onSetLocation(city);
    } catch (error) {
      setUserLocation(previous);
      setLocationError(
        error instanceof Error ? error.message : 'Failed to save location.',
      );
    } finally {
      setSavingLocation(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
        setLocationQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCities = GLOBAL_CITIES.filter(c =>
    c.toLowerCase().includes(locationQuery.toLowerCase())
  );

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isComputingGoal, setIsComputingGoal] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [tempTargetRole, setTempTargetRole] = useState(targetRole?.target || '');
  const [savedTarget, setSavedTarget] = useState(targetRole?.target || '');

  const targetRoleData = jobTaxonomyData.find(j => j.L4_job_role === savedTarget);
  const requiredSkills = targetRoleData
    ? targetRoleData.core_skills.split(',').map(s => s.trim())
    : [];

  const getSkillProficiency = (requiredSkill: string): number => {
    const userSkillsLower = skills.map(s => s.toLowerCase());
    const sl = requiredSkill.toLowerCase();
    return userSkillsLower.some(u => u.includes(sl) || sl.includes(u)) ? 100 : Math.floor(Math.random() * 40);
  };

  const matchScore = savedTarget && requiredSkills.length > 0
    ? Math.round(
        requiredSkills.filter(s => {
          const sl = s.toLowerCase();
          return skills.map(u => u.toLowerCase()).some(u => u.includes(sl) || sl.includes(u));
        }).length / requiredSkills.length * 100
      )
    : 0;

    const loadAvailableRoles = async () => {
      if (availableRoles.length > 0 || rolesLoading) {
        return;
      }

      setRolesLoading(true);
      setGoalError(null);

      try {
        const roles = await onLoadRoles();
        setAvailableRoles(roles);
      } catch (error) {
        setGoalError(
          error instanceof Error
            ? error.message
            : "Failed to load roles.",
        );
      } finally {
        setRolesLoading(false);
      }
    };

  const handleEditGoal = async () => {
    await loadAvailableRoles();
    setTempTargetRole(savedTarget);
    setIsEditingGoal(true);
  };

  useEffect(() => {
    if (!savedTarget) {
      void loadAvailableRoles();
    }
    // Initial target-role setup only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveGoal = async () => {
    const selectedRole = availableRoles.find(
      (role) => role.name === tempTargetRole,
    );

    if (!selectedRole) {
      setGoalError("Please select a target role.");
      return;
    }

    setIsComputingGoal(true);
    setGoalError(null);

    try {
      await onSetTargetRole(selectedRole);
      setSavedTarget(selectedRole.name);
      setIsEditingGoal(false);
    } catch (error) {
      setGoalError(
        error instanceof Error
          ? error.message
          : "Failed to save target role.",
      );
    } finally {
      setIsComputingGoal(false);
    }
  };

  const handleCancelGoal = () => {
    setTempTargetRole(savedTarget);
    setIsEditingGoal(false);
  };

  return (
    <div className="h-full bg-white rounded-2xl shadow-md p-6 overflow-y-auto">
      {/* Avatar + name */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 border-4"
          style={{ background: 'linear-gradient(135deg, #b8e2d4 0%, #02746f 100%)', borderColor: '#d1cece' }}>
          {avatarUrl
            ? <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover" />
            : <span className="text-white text-3xl font-semibold">{name.charAt(0).toUpperCase()}</span>
          }
        </div>
        <h2 className="text-xl font-semibold" style={{ color: '#15100c' }}>{name}</h2>
      </div>

      {/* Info rows */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-3 text-sm" style={{ color: '#55371e' }}>
          <Mail className="w-4 h-4 flex-shrink-0" style={{ color: '#02746f' }} />
          <span>{email}</span>
        </div>
        <div className="flex items-center gap-3 text-sm" style={{ color: '#55371e' }}>
          <UserCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#02746f' }} />
          <span>{role}</span>
        </div>
        <div className="flex items-center gap-3 text-sm" style={{ color: '#55371e' }}>
          <Briefcase className="w-4 h-4 flex-shrink-0" style={{ color: '#02746f' }} />
          <span>{yearsOfExperience} years experience</span>
        </div>
        <div className="flex items-center gap-3 text-sm" style={{ color: '#55371e' }}>
          <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#02746f' }} />
          <div ref={locationRef} className="relative flex-1">
            <button
              onClick={() => { setLocationOpen(v => !v); setLocationQuery(''); }}
              disabled={savingLocation}
              className="flex items-center justify-between w-full gap-1 text-sm text-left disabled:opacity-60"
              style={{ color: '#55371e' }}
            >
              <span className="flex-1 truncate">{savingLocation ? 'Saving…' : userLocation}</span>
              <Edit2 className="w-3 h-3 flex-shrink-0 opacity-50" style={{ color: '#55371e' }} />
            </button>
            {locationError && (
              <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>
                {locationError}
              </p>
            )}

            {locationOpen && (
              <div
                className="absolute left-0 z-50 mt-1 w-64 rounded-xl border shadow-xl overflow-hidden"
                style={{ borderColor: 'rgba(21,16,12,0.1)', backgroundColor: '#fff' }}
              >
                <div className="p-2.5 border-b" style={{ borderColor: 'rgba(21,16,12,0.08)' }}>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border" style={{ borderColor: '#02746f', backgroundColor: 'rgba(2,116,111,0.03)' }}>
                    <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#02746f' }} />
                    <input
                      autoFocus
                      type="text"
                      value={locationQuery}
                      onChange={e => setLocationQuery(e.target.value)}
                      placeholder="Search city or country…"
                      className="flex-1 text-sm outline-none bg-transparent"
                      style={{ color: '#15100c' }}
                    />
                    {locationQuery && (
                      <button onClick={() => setLocationQuery('')}>
                        <X className="w-3 h-3" style={{ color: '#55371e' }} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredCities.length === 0
                    ? <p className="px-4 py-3 text-xs italic" style={{ color: '#55371e' }}>No cities found</p>
                    : filteredCities.map(city => (
                      <button
                        key={city}
                        onClick={() => { void handleSelectLocation(city); }}
                        className="w-full text-left px-4 py-2 text-xs transition-colors hover:bg-stone-50"
                        style={{
                          color: city === userLocation ? '#02746f' : '#15100c',
                          fontWeight: city === userLocation ? 600 : 400,
                          backgroundColor: city === userLocation ? 'rgba(2,116,111,0.06)' : undefined,
                        }}
                      >
                        {city}
                      </button>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Your Skills — always shown as pills */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#15100c' }}>Your Skills</h3>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill, i) => (
            <span
              key={i}
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'rgba(2,116,111,0.08)', color: '#02746f' }}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Career goal / Skills for target — mutually exclusive states */}
      {isEditingGoal || !savedTarget ? (
        /* Editing state: inline dropdown replaces the skills title */
        <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(184, 226, 212, 0.2)', border: '2px solid #02746f' }}>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4" style={{ color: '#02746f' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#15100c' }}>Career Goal</h3>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <select
                value={tempTargetRole}
                onChange={(e) => setTempTargetRole(e.target.value)}
                className="w-full appearance-none px-2 py-1.5 border rounded text-sm pr-7"
                style={{ borderColor: '#02746f', color: tempTargetRole ? '#15100c' : '#9ca3af', backgroundColor: '#fff' }}
              >
                <option value="">Select target role…</option>
                {rolesLoading ? (
                  <option disabled>Loading roles…</option>
                ) : (
                  availableRoles.map((role) => (
                    <option
                      key={role.roleId}
                      value={role.name}
                    >
                      {role.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#02746f' }} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveGoal}
                disabled={isComputingGoal}
                className="flex-1 px-3 py-1.5 rounded text-sm font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: '#02746f', color: '#fff', opacity: isComputingGoal ? 0.8 : 1 }}
              >
                {isComputingGoal ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Computing…
                  </>
                ) : 'Save'}
              </button>
              {isEditingGoal && !isComputingGoal && (
                <button
                  onClick={handleCancelGoal}
                  className="flex-1 px-3 py-1.5 rounded text-sm font-medium"
                  style={{ backgroundColor: '#f4f1f2', color: '#15100c' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Saved state: title + pencil + skill bars */
        requiredSkills.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: '#15100c' }}>
                Skills for {savedTarget}
              </h3>
              <button
                onClick={() => { void handleEditGoal(); }}
                className="p-1 hover:bg-stone-100 rounded transition-colors"
              >
                <Edit2 className="w-3 h-3" style={{ color: '#55371e' }} />
              </button>
            </div>
            <div className="space-y-3">
              {requiredSkills.map((skill, i) => {
                const p = getSkillProficiency(skill);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: '#15100c' }}>{skill}</span>
                      <span className="text-xs font-semibold" style={{ color: '#55371e' }}>{p}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(184, 226, 212, 0.3)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${p}%`,
                          background: p >= 70
                            ? 'linear-gradient(90deg, #02746f 0%, #b8e2d4 100%)'
                            : p >= 40
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
        )
      )}

      {/* Experience Highlights */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#15100c' }}>Experience Highlights</h3>
        <ul className="space-y-2">
          {experience.map((exp, i) => (
            <li key={i} className="flex gap-2 text-sm" style={{ color: '#55371e' }}>
              <span style={{ color: '#02746f' }}>•</span>
              <span>{exp}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
