// Base resource type
export type ResourceType = 'course' | 'book' | 'podcast' | 'event' | 'workshop' | 'certification';
export type ResourceSource = 'MCIT' | 'Coursera' | 'MIT OCW' | 'Udacity' | 'YouTube' | 'Book' | 'Podcast' | 'Meetup' | 'Conference';

export interface LearningResource {
  id: string;
  type: ResourceType;
  source: ResourceSource;
  title: string;
  description: string;
  skills: string[];
  recommendationScore: number; // 0-100, higher = more recommended
  duration?: string; // e.g., "3 months", "5 hours", "2 days"
  url?: string;
  instructor?: string;
  cost?: string; // e.g., "Free", "$49", "Included in MCIT"
}

export interface CourseResource extends LearningResource {
  type: 'course';
  code?: string;
  category?: string;
  prerequisites?: string[];
}

export interface EventResource extends LearningResource {
  type: 'event' | 'workshop' | 'conference';
  location?: string;
  date?: string;
}

export interface MCITCourse {
  code: string;
  title: string;
  description: string;
  skills: string[];
  category: 'core' | 'technical-elective' | 'elective';
  prerequisites?: string[];
  recommendationScore: number; // 0-100, higher = more recommended
}

export interface EnrolledResource {
  resourceId: string;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'completed' | 'cancelled';
  skillsEarned: boolean;
  completionDate?: string;
  notes?: string;
}

export interface UserLearningProfile {
  completedCourses: EnrolledResource[];
  booksRead: EnrolledResource[];
  skills: { name: string; proficiency: number; source: string }[];
  certifications: { name: string; issuer: string; date: string }[];
  resume: {
    summary: string;
    experience: { role: string; company: string; duration: string; highlights: string[] }[];
    education: { degree: string; institution: string; year: string }[];
    projects: { name: string; description: string; skills: string[] }[];
  };
  agentProfile: {
    technicalSkills: { category: string; skills: string[] }[];
    experience: { domain: string; level: string; highlights: string[] }[];
    softSkills: string[];
    strengths: string[];
    growthAreas: string[];
  };
}

export const mcitCourses: MCITCourse[] = [
  // Core Courses
  {
    code: 'CIT 5910',
    title: 'Introduction to Software Development',
    description: 'Introduction to fundamental concepts of programming and computer science',
    skills: ['Python', 'Java', 'Data Structures', 'OOP', 'Programming Fundamentals'],
    category: 'core',
    recommendationScore: 95,
  },
  {
    code: 'CIT 5920',
    title: 'Mathematical Foundations of Computer Science',
    description: 'Sets, functions, permutations, combinations, discrete probability, mathematical induction, graph theory',
    skills: ['Discrete Math', 'Graph Theory', 'Probability', 'Mathematical Reasoning'],
    category: 'core',
    recommendationScore: 90,
  },
  {
    code: 'CIT 5930',
    title: 'Introduction to Computer Systems',
    description: 'Introduction to fundamental concepts of computer systems and computer architecture',
    skills: ['C Programming', 'Computer Architecture', 'Systems Programming'],
    category: 'core',
    prerequisites: ['CIT 5910'],
    recommendationScore: 88,
  },
  {
    code: 'CIT 5940',
    title: 'Data Structures & Software Design',
    description: 'Focuses on data structures, software design, and advanced Java',
    skills: ['Java', 'Data Structures', 'Software Design', 'Algorithms'],
    category: 'core',
    prerequisites: ['CIT 5910'],
    recommendationScore: 92,
  },
  {
    code: 'CIT 5950',
    title: 'Computer Systems Programming',
    description: 'Processes, scheduling, caching, virtual memory, networked systems',
    skills: ['C Programming', 'Operating Systems', 'Systems Programming', 'Networking'],
    category: 'core',
    prerequisites: ['CIT 5930'],
    recommendationScore: 85,
  },
  {
    code: 'CIT 5960',
    title: 'Algorithms & Computation',
    description: 'Design and analysis of algorithms',
    skills: ['Algorithms', 'Algorithm Analysis', 'Dynamic Programming', 'Complexity Theory'],
    category: 'core',
    prerequisites: ['CIT 5920', 'CIT 5940'],
    recommendationScore: 93,
  },

  // Technical Electives
  {
    code: 'CIS 5150',
    title: 'Fundamentals of Linear Algebra & Optimization',
    description: 'Linear algebra tools for machine learning',
    skills: ['Linear Algebra', 'Optimization', 'Machine Learning Math', 'MATLAB'],
    category: 'technical-elective',
    recommendationScore: 87,
  },
  {
    code: 'CIS 5210',
    title: 'Artificial Intelligence',
    description: 'Search, machine learning, probabilistic reasoning, NLP, knowledge representation',
    skills: ['AI', 'Machine Learning', 'NLP', 'Python', 'Probabilistic Reasoning'],
    category: 'technical-elective',
    prerequisites: ['CIT 5910', 'CIT 5920', 'CIT 5940', 'CIT 5960'],
    recommendationScore: 94,
  },
  {
    code: 'CIS 5300',
    title: 'Natural Language Processing',
    description: 'Machine translation, summarization, question answering, dialog systems',
    skills: ['NLP', 'Machine Learning', 'Python', 'Text Processing'],
    category: 'technical-elective',
    prerequisites: ['CIT 5910', 'CIT 5920', 'CIT 5940'],
    recommendationScore: 89,
  },
  {
    code: 'CIS 5450',
    title: 'Big Data Analytics',
    description: 'Fundamentals of scaling computation to handle common data analytics tasks',
    skills: ['Big Data', 'Distributed Systems', 'Python', 'Data Analytics', 'Spark'],
    category: 'technical-elective',
    prerequisites: ['CIT 5910'],
    recommendationScore: 91,
  },
  {
    code: 'CIS 5470',
    title: 'Software Analysis',
    description: 'Dynamic analysis, testing, dataflow analysis, constraint solving, symbolic execution',
    skills: ['C++', 'Software Testing', 'Program Analysis', 'LLVM'],
    category: 'technical-elective',
    prerequisites: ['CIT 5920', 'CIT 5940', 'CIT 5950'],
    recommendationScore: 78,
  },
  {
    code: 'CIS 5490',
    title: 'Wireless Communications for Mobile Networks and IoT',
    description: 'Covers 4G LTE, 5G NR, Wi-Fi, IoT technologies',
    skills: ['Wireless Networks', '5G', 'IoT', 'Mobile Networks'],
    category: 'technical-elective',
    prerequisites: ['CIT 5930', 'CIT 5950'],
    recommendationScore: 72,
  },
  {
    code: 'CIS 5500',
    title: 'Database & Information Systems',
    description: 'Relational data model, SQL, database design, transactions, query optimization',
    skills: ['SQL', 'Database Design', 'Query Optimization', 'Transactions'],
    category: 'technical-elective',
    prerequisites: ['CIT 5910', 'CIT 5920'],
    recommendationScore: 90,
  },
  {
    code: 'CIS 5510',
    title: 'Computer & Network Security',
    description: 'Cryptography, communication protocols security, OS security',
    skills: ['Security', 'Cryptography', 'Network Security', 'OS Security'],
    category: 'technical-elective',
    prerequisites: ['CIT 5920', 'CIT 5930', 'CIT 5950'],
    recommendationScore: 86,
  },
  {
    code: 'CIS 5530',
    title: 'Networked Systems',
    description: 'Internet architecture, routing, transport protocols, distributed systems',
    skills: ['Networking', 'Distributed Systems', 'Protocols', 'Systems Design'],
    category: 'technical-elective',
    prerequisites: ['CIT 5950'],
    recommendationScore: 83,
  },
  {
    code: 'CIS 5550',
    title: 'Internet and Web Systems',
    description: 'Scalability, fault tolerance, security. Build Google-style search engine project',
    skills: ['Web Systems', 'Scalability', 'Search Engines', 'Distributed Systems'],
    category: 'technical-elective',
    prerequisites: ['CIT 5950'],
    recommendationScore: 88,
  },
  {
    code: 'CIS 5560',
    title: 'Cryptography',
    description: 'Symmetric/public-key cryptography, digital signatures, zero-knowledge proofs',
    skills: ['Cryptography', 'Security', 'Mathematical Cryptography'],
    category: 'technical-elective',
    prerequisites: ['CIT 5920'],
    recommendationScore: 80,
  },
  {
    code: 'CIS 5580',
    title: 'Secure System Engineering and Management',
    description: 'Threat modeling, secure development, security operations',
    skills: ['Security Engineering', 'Threat Modeling', 'Secure Development'],
    category: 'technical-elective',
    recommendationScore: 77,
  },
  {
    code: 'CIS 5690',
    title: 'GPU Computing for Machine Learning Systems',
    description: 'GPU programming for ML/AI applications',
    skills: ['GPU Programming', 'CUDA', 'Machine Learning', 'C++', 'Performance Optimization'],
    category: 'technical-elective',
    recommendationScore: 84,
  },
  {
    code: 'CIS 5810',
    title: 'Computer Vision & Computational Photography',
    description: 'Image features, morphing, stitching, deep learning for images',
    skills: ['Computer Vision', 'Deep Learning', 'Image Processing', 'Python'],
    category: 'technical-elective',
    prerequisites: ['CIT 5910', 'CIT 5920', 'CIT 5930', 'CIT 5940'],
    recommendationScore: 85,
  },
  {
    code: 'CIS 5980',
    title: 'Artificial Intelligence Capstone',
    description: 'Portfolio-ready AI application projects',
    skills: ['AI', 'Machine Learning', 'Project Development', 'Portfolio Building'],
    category: 'technical-elective',
    prerequisites: ['CIS 5210', 'CIS 5300'],
    recommendationScore: 92,
  },
  {
    code: 'ESE 5410',
    title: 'Machine Learning for Data Science',
    description: 'Regression, classification, ensemble learning, SVMs, neural networks, clustering',
    skills: ['Machine Learning', 'Python', 'Statistical Learning', 'Neural Networks'],
    category: 'technical-elective',
    prerequisites: ['CIT 5920'],
    recommendationScore: 93,
  },
  {
    code: 'ESE 5420',
    title: 'Statistics for Data Science',
    description: 'Hypothesis testing, regression, classification, dimensionality reduction, PAC learning',
    skills: ['Statistics', 'Python', 'Statistical Learning', 'Data Science'],
    category: 'technical-elective',
    prerequisites: ['CIT 5920'],
    recommendationScore: 90,
  },
  {
    code: 'ESE 5460',
    title: 'Principles of Deep Learning',
    description: 'Training deep networks, theoretical foundations',
    skills: ['Deep Learning', 'Neural Networks', 'Machine Learning Theory'],
    category: 'technical-elective',
    recommendationScore: 91,
  },
];

// Calculate recommendation scores based on user's target role
export function getRecommendedCourses(targetRole: string, userSkills: string[]): MCITCourse[] {
  const courses = [...mcitCourses];

  // Adjust recommendation scores based on target role
  const roleSkillMap: Record<string, string[]> = {
    'Machine Learning Engineer': ['Machine Learning', 'Deep Learning', 'AI', 'Python', 'Neural Networks', 'GPU Programming'],
    'Backend Engineer': ['Distributed Systems', 'Database Design', 'Systems Programming', 'Networking', 'Scalability'],
    'Full Stack Engineer': ['Web Systems', 'Database Design', 'Python', 'Java', 'Software Design'],
    'Data Engineer': ['Big Data', 'Database Design', 'Distributed Systems', 'Python', 'SQL'],
    'Security Engineer': ['Security', 'Cryptography', 'Network Security', 'Secure Development'],
  };

  const targetSkills = roleSkillMap[targetRole] || [];

  courses.forEach(course => {
    // Boost score if course teaches target skills
    const matchingSkills = course.skills.filter(skill =>
      targetSkills.some(ts => skill.toLowerCase().includes(ts.toLowerCase()) || ts.toLowerCase().includes(skill.toLowerCase()))
    );
    course.recommendationScore += matchingSkills.length * 5;

    // Reduce score if user already has most of the skills
    const existingSkills = course.skills.filter(skill =>
      userSkills.some(us => skill.toLowerCase().includes(us.toLowerCase()) || us.toLowerCase().includes(skill.toLowerCase()))
    );
    if (existingSkills.length >= course.skills.length * 0.7) {
      course.recommendationScore -= 10;
    }
  });

  // Sort by recommendation score (descending)
  return courses.sort((a, b) => b.recommendationScore - a.recommendationScore);
}
