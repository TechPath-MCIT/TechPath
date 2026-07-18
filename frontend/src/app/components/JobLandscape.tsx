import { useState } from 'react';
import { ChevronRight, ChevronDown, Briefcase } from 'lucide-react';
import { TreeNode, JobNode, userSkills, calculateSkillMatch } from '../data/jobData';

interface JobLandscapeProps {
  treeData: TreeNode[];
}

export function JobLandscape({ treeData }: JobLandscapeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedJob, setSelectedJob] = useState<JobNode | null>(null);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isL4 = node.level === 4;

    const indentStyle = {
      paddingLeft: `${depth * 24}px`,
    };

    const getLevelColor = (level: number) => {
      switch (level) {
        case 1: return '#202723';
        case 2: return '#26755f';
        case 3: return '#5a615d';
        case 4: return '#ec2749';
        default: return '#202723';
      }
    };

    const getLevelBg = (level: number) => {
      switch (level) {
        case 1: return 'rgba(32, 39, 35, 0.05)';
        case 2: return 'rgba(38, 117, 95, 0.05)';
        case 3: return 'rgba(90, 97, 93, 0.05)';
        case 4: return 'rgba(236, 39, 73, 0.05)';
        default: return 'transparent';
      }
    };

    return (
      <div key={node.id}>
        <div
          className="py-2.5 px-3 cursor-pointer hover:bg-opacity-80 transition-all rounded-lg mb-1"
          style={{
            ...indentStyle,
            backgroundColor: isL4 && selectedJob?.node_id === node.id ? 'rgba(236, 39, 73, 0.1)' : getLevelBg(node.level),
          }}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            }
            if (isL4 && node.job) {
              setSelectedJob(node.job);
            }
          }}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              <span style={{ color: getLevelColor(node.level) }}>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            )}
            {isL4 && <Briefcase className="w-4 h-4" style={{ color: getLevelColor(node.level) }} />}
            <span
              style={{
                color: getLevelColor(node.level),
                fontWeight: node.level <= 2 ? 600 : node.level === 3 ? 500 : 400,
                fontSize: node.level === 1 ? '1rem' : node.level === 2 ? '0.938rem' : '0.875rem',
              }}
            >
              {node.name}
            </span>
            {isL4 && node.job && (
              <span
                className="ml-auto px-2 py-0.5 rounded text-xs font-semibold"
                style={{
                  backgroundColor: '#26755f',
                  color: '#ffffff',
                }}
              >
                {calculateSkillMatch(node.job.core_skills, userSkills)}% Match
              </span>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="ml-2">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-white rounded-2xl shadow-md p-6 flex gap-6">
      <div className="flex-1 overflow-y-auto pr-4" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        <h2 className="text-xl font-semibold mb-4 sticky top-0 bg-white pb-2" style={{ color: '#202723' }}>
          Tech Job Landscape
        </h2>
        <div>{treeData.map((node) => renderNode(node, 0))}</div>
      </div>

      {selectedJob && (
        <div className="w-96 border-l pl-6 overflow-y-auto" style={{ borderColor: 'rgba(32, 39, 35, 0.1)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#202723' }}>
            {selectedJob.L4_job_role}
          </h3>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: '#5a615d' }}>
                Required Skills
              </h4>
              <div className="space-y-2">
                {selectedJob.core_skills.split(',').map((skill, index) => {
                  const trimmedSkill = skill.trim();
                  const matchPercentage = userSkills.some(us =>
                    trimmedSkill.toLowerCase().includes(us.toLowerCase()) ||
                    us.toLowerCase().includes(trimmedSkill.toLowerCase())
                  ) ? 100 : Math.floor(Math.random() * 40) + 20;

                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-sm flex-1" style={{ color: '#202723' }}>
                        {trimmedSkill}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${matchPercentage}%`,
                              backgroundColor: matchPercentage >= 70 ? '#26755f' : matchPercentage >= 40 ? '#f59e0b' : '#ec2749',
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold w-10 text-right" style={{ color: '#5a615d' }}>
                          {matchPercentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: '#5a615d' }}>
                Typical Titles
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedJob.typical_titles_en.split(',').map((title, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      backgroundColor: '#f0f0f0',
                      color: '#202723',
                    }}
                  >
                    {title.trim()}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2" style={{ color: '#5a615d' }}>
                Career Path
              </h4>
              <div className="text-sm space-y-1" style={{ color: '#5a615d' }}>
                <div>
                  <span className="font-medium">Domain:</span> {selectedJob.L1}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {selectedJob.L2}
                </div>
                <div>
                  <span className="font-medium">Specialization:</span> {selectedJob.L3}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
