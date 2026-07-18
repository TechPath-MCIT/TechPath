import { LearningResource, CourseResource, EventResource, ResourceSource, UserLearningProfile } from './mcitCourses';

// Sample Coursera courses
export const courseraResources: CourseResource[] = [
  {
    id: 'coursera-ml',
    type: 'course',
    source: 'Coursera',
    title: 'Machine Learning Specialization',
    description: 'Master fundamental AI concepts and develop practical machine learning skills',
    skills: ['Machine Learning', 'Python', 'TensorFlow', 'Neural Networks'],
    recommendationScore: 92,
    duration: '3 months',
    instructor: 'Andrew Ng',
    cost: '$49/month',
    url: 'https://www.coursera.org/specializations/machine-learning-introduction',
  },
  {
    id: 'coursera-dl',
    type: 'course',
    source: 'Coursera',
    title: 'Deep Learning Specialization',
    description: 'Build and train deep neural networks, implement vectorized neural networks',
    skills: ['Deep Learning', 'Neural Networks', 'TensorFlow', 'Python'],
    recommendationScore: 94,
    duration: '5 months',
    instructor: 'Andrew Ng',
    cost: '$49/month',
  },
  {
    id: 'coursera-mlops',
    type: 'course',
    source: 'Coursera',
    title: 'Machine Learning Engineering for Production (MLOps)',
    description: 'Design and build production-ready ML systems',
    skills: ['MLOps', 'TensorFlow', 'Model Deployment', 'Production ML'],
    recommendationScore: 88,
    duration: '4 months',
    instructor: 'Andrew Ng',
    cost: '$49/month',
  },
];

// Sample MIT OpenCourseWare
export const mitOCWResources: CourseResource[] = [
  {
    id: 'mit-6006',
    type: 'course',
    source: 'MIT OCW',
    code: '6.006',
    title: 'Introduction to Algorithms',
    description: 'Introduction to mathematical modeling of computational problems',
    skills: ['Algorithms', 'Data Structures', 'Complexity Analysis'],
    recommendationScore: 90,
    duration: '14 weeks',
    cost: 'Free',
  },
  {
    id: 'mit-6034',
    type: 'course',
    source: 'MIT OCW',
    code: '6.034',
    title: 'Artificial Intelligence',
    description: 'Representations, methods, and architectures for building intelligent systems',
    skills: ['AI', 'Search Algorithms', 'Machine Learning', 'Neural Networks'],
    recommendationScore: 91,
    duration: '14 weeks',
    cost: 'Free',
  },
  {
    id: 'mit-6824',
    type: 'course',
    source: 'MIT OCW',
    code: '6.824',
    title: 'Distributed Systems',
    description: 'Abstractions and implementation techniques for distributed systems',
    skills: ['Distributed Systems', 'Fault Tolerance', 'Consistency', 'Replication'],
    recommendationScore: 87,
    duration: '14 weeks',
    cost: 'Free',
  },
];

// Sample events and other resources
export const eventResources: EventResource[] = [
  {
    id: 'event-sf-ml',
    type: 'event',
    source: 'Meetup',
    title: 'San Francisco Machine Learning Meetup',
    description: 'Monthly meetup for ML practitioners to share projects and insights',
    skills: ['Networking', 'Machine Learning', 'Industry Trends'],
    recommendationScore: 75,
    location: 'San Francisco, CA',
    date: '2026-06-15',
    cost: 'Free',
  },
  {
    id: 'event-neurips',
    type: 'conference',
    source: 'Conference',
    title: 'NeurIPS 2026',
    description: 'Leading conference on neural information processing systems',
    skills: ['Deep Learning', 'Research', 'Networking'],
    recommendationScore: 95,
    location: 'New Orleans, LA',
    date: '2026-12-07',
    cost: '$1000',
  },
];

export const bookResources: LearningResource[] = [
  {
    id: 'book-ddia',
    type: 'book',
    source: 'Book',
    title: 'Designing Data-Intensive Applications',
    description: 'The big ideas behind reliable, scalable, and maintainable systems',
    skills: ['System Design', 'Distributed Systems', 'Database Design'],
    recommendationScore: 93,
    duration: '20 hours',
    cost: '$45',
  },
  {
    id: 'book-dl',
    type: 'book',
    source: 'Book',
    title: 'Deep Learning (Goodfellow)',
    description: 'Comprehensive textbook on deep learning',
    skills: ['Deep Learning', 'Neural Networks', 'Machine Learning Theory'],
    recommendationScore: 90,
    duration: '40 hours',
    cost: 'Free online',
  },
];

export const podcastResources: LearningResource[] = [
  {
    id: 'podcast-lex',
    type: 'podcast',
    source: 'Podcast',
    title: 'Lex Fridman Podcast',
    description: 'Conversations about AI, science, technology, and philosophy',
    skills: ['AI Trends', 'Industry Insights', 'Research'],
    recommendationScore: 82,
    duration: 'Ongoing',
    cost: 'Free',
  },
  {
    id: 'podcast-practicalai',
    type: 'podcast',
    source: 'Podcast',
    title: 'Practical AI',
    description: 'Making AI practical, productive, and accessible to everyone',
    skills: ['AI', 'Machine Learning', 'Industry Applications'],
    recommendationScore: 80,
    duration: 'Ongoing',
    cost: 'Free',
  },
];

// Combine all resources
export function getAllResources(): LearningResource[] {
  return [
    ...courseraResources,
    ...mitOCWResources,
    ...eventResources,
    ...bookResources,
    ...podcastResources,
  ];
}

// Calculate recommendation scores based on user's target role
export function getRecommendedResources(
  targetRole: string,
  userSkills: string[],
  sourceFilter?: ResourceSource[],
  typeFilter?: string[]
): LearningResource[] {
  let resources = getAllResources();

  // Apply filters
  if (sourceFilter && sourceFilter.length > 0) {
    resources = resources.filter(r => sourceFilter.includes(r.source));
  }
  if (typeFilter && typeFilter.length > 0) {
    resources = resources.filter(r => typeFilter.includes(r.type));
  }

  // Adjust recommendation scores based on target role
  const roleSkillMap: Record<string, string[]> = {
    'Machine Learning Engineer': ['Machine Learning', 'Deep Learning', 'AI', 'Python', 'Neural Networks', 'TensorFlow', 'MLOps'],
    'Backend Engineer': ['Distributed Systems', 'Database Design', 'System Design', 'Scalability', 'API Design'],
    'Full Stack Engineer': ['Web Systems', 'Database Design', 'Python', 'JavaScript', 'React'],
    'Data Engineer': ['Big Data', 'Database Design', 'Distributed Systems', 'Python', 'SQL', 'ETL'],
    'Security Engineer': ['Security', 'Cryptography', 'Network Security', 'Secure Development'],
  };

  const targetSkills = roleSkillMap[targetRole] || [];

  resources.forEach(resource => {
    // Boost score if resource teaches target skills
    const matchingSkills = resource.skills.filter(skill =>
      targetSkills.some(ts => skill.toLowerCase().includes(ts.toLowerCase()) || ts.toLowerCase().includes(skill.toLowerCase()))
    );
    resource.recommendationScore += matchingSkills.length * 3;

    // Reduce score if user already has most of the skills
    const existingSkills = resource.skills.filter(skill =>
      userSkills.some(us => skill.toLowerCase().includes(us.toLowerCase()) || us.toLowerCase().includes(skill.toLowerCase()))
    );
    if (existingSkills.length >= resource.skills.length * 0.7) {
      resource.recommendationScore -= 8;
    }
  });

  // Sort by recommendation score (descending)
  return resources.sort((a, b) => b.recommendationScore - a.recommendationScore);
}

// Sample user learning profile
export const sampleUserProfile: UserLearningProfile = {
  completedCourses: [
    {
      resourceId: 'past-course-1',
      status: 'completed',
      skillsEarned: true,
      completionDate: '2024-05-15',
      notes: 'Great introduction to Python',
    },
    {
      resourceId: 'past-course-2',
      status: 'completed',
      skillsEarned: true,
      completionDate: '2025-01-20',
    },
  ],
  booksRead: [
    {
      resourceId: 'book-clean-code',
      status: 'completed',
      skillsEarned: true,
      completionDate: '2025-03-10',
    },
  ],
  skills: [
    { name: 'Python', proficiency: 85, source: 'Professional Experience' },
    { name: 'JavaScript', proficiency: 80, source: 'Professional Experience' },
    { name: 'React', proficiency: 75, source: 'Professional Experience' },
    { name: 'SQL', proficiency: 70, source: 'Self-taught' },
    { name: 'Docker', proficiency: 65, source: 'Online Course' },
  ],
  certifications: [
    { name: 'AWS Solutions Architect', issuer: 'Amazon Web Services', date: '2024-11-15' },
  ],
  resume: {
    summary: 'Backend engineer with 5 years of experience building scalable systems and transitioning into ML engineering. Strong foundation in Python, distributed systems, and data pipelines.',
    experience: [
      {
        role: 'Backend Engineer',
        company: 'TechCorp Inc.',
        duration: '2021 - Present',
        highlights: [
          'Led development of ML pipeline processing 10M+ records daily',
          'Reduced API response time by 60% through optimization',
          'Mentored 3 junior engineers',
        ],
      },
      {
        role: 'Software Engineer',
        company: 'StartupXYZ',
        duration: '2019 - 2021',
        highlights: [
          'Built React-based dashboard used by 50K+ users',
          'Designed RESTful APIs serving 1M requests/day',
        ],
      },
    ],
    education: [
      { degree: 'B.S. Computer Science', institution: 'State University', year: '2019' },
    ],
    projects: [
      {
        name: 'ML Recommendation System',
        description: 'Built collaborative filtering system for product recommendations',
        skills: ['Python', 'Scikit-learn', 'PostgreSQL'],
      },
      {
        name: 'Real-time Analytics Dashboard',
        description: 'React dashboard with WebSocket integration',
        skills: ['React', 'WebSocket', 'D3.js'],
      },
    ],
  },
  agentProfile: {
    technicalSkills: [
      { category: 'Programming Languages', skills: ['Python', 'JavaScript', 'TypeScript', 'SQL'] },
      { category: 'Backend & Systems', skills: ['REST APIs', 'Distributed Systems', 'Microservices', 'Docker'] },
      { category: 'Machine Learning (Growing)', skills: ['Scikit-learn', 'Data Pipelines', 'Model Deployment'] },
      { category: 'Frontend', skills: ['React', 'HTML/CSS', 'D3.js'] },
    ],
    experience: [
      {
        domain: 'Backend Engineering',
        level: 'Senior',
        highlights: ['5 years building production systems', 'Led team of 3 engineers', 'Scaled systems to 10M+ daily operations'],
      },
      {
        domain: 'Machine Learning',
        level: 'Mid-level',
        highlights: ['Built ML pipeline in production', 'Recommendation system experience', 'Currently expanding ML knowledge'],
      },
    ],
    softSkills: ['Technical Leadership', 'Mentoring', 'System Design', 'Problem Solving', 'Communication'],
    strengths: [
      'Strong foundation in backend systems and scalability',
      'Proven ability to optimize performance',
      'Experience deploying ML models to production',
      'Quick learner with self-directed learning habits',
    ],
    growthAreas: [
      'Deep learning theoretical foundations',
      'Advanced ML algorithms (neural networks, transformers)',
      'GPU computing and optimization',
      'ML research and staying current with papers',
    ],
  },
};
