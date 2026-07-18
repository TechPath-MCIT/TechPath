export interface JobNode {
  node_id: string;
  L1: string;
  L2: string;
  L3: string;
  L4_job_role: string;
  core_skills: string;
  typical_titles_en: string;
  typical_titles_zh: string;
  L1_zh: string;
}

export interface JobDetail {
  node_id: string;
  description: string;
  main_responsibilities: string[];
  position_in_field: string;
  salary_range: string;
}

export const jobDetails: Record<string, JobDetail> = {
  "T001": {
    node_id: "T001",
    description: "Design and verify digital integrated circuits using hardware description languages. Work on complex chip architectures from concept to tape-out.",
    main_responsibilities: [
      "Design RTL code for digital circuits using Verilog/VHDL",
      "Perform logic synthesis and timing closure",
      "Collaborate with verification teams to ensure design quality",
      "Optimize designs for power, performance, and area (PPA)"
    ],
    position_in_field: "Core technical role in semiconductor design, essential for creating modern processors, SoCs, and ASICs. Works closely with verification engineers and physical design teams.",
    salary_range: "$120K - $220K"
  },
  "T002": {
    node_id: "T002",
    description: "Specialize in designing analog and mixed-signal circuits for various applications including power management, data conversion, and RF communication.",
    main_responsibilities: [
      "Design analog circuits for power management and signal processing",
      "Run SPICE simulations to verify circuit performance",
      "Work with layout engineers to optimize chip area and performance",
      "Characterize silicon and debug analog issues"
    ],
    position_in_field: "Specialized role requiring deep understanding of circuit theory. Critical for power management ICs, ADCs/DACs, and RF transceivers.",
    salary_range: "$130K - $230K"
  },
  "T030": {
    node_id: "T030",
    description: "Build and maintain scalable data pipelines that move and transform data across various systems. Enable data-driven decision making through reliable data infrastructure.",
    main_responsibilities: [
      "Design and implement ETL/ELT pipelines using Spark, Airflow, or similar tools",
      "Build data warehouses and lakes for analytics and ML",
      "Optimize data pipeline performance and reliability",
      "Collaborate with data scientists and analysts on data requirements"
    ],
    position_in_field: "Foundation role in data organizations, enabling all downstream analytics and ML work. Bridges software engineering and data analytics.",
    salary_range: "$110K - $190K"
  },
  "T034": {
    node_id: "T034",
    description: "Develop and deploy machine learning models to solve business problems. Work on the full ML lifecycle from data preparation to model deployment and monitoring.",
    main_responsibilities: [
      "Train and evaluate ML models using PyTorch/TensorFlow",
      "Perform feature engineering and data preprocessing",
      "Deploy models to production and monitor performance",
      "Collaborate with product teams to define ML solutions"
    ],
    position_in_field: "High-demand role at the intersection of software engineering and data science. Critical for building intelligent products and features.",
    salary_range: "$130K - $240K"
  },
  "T037": {
    node_id: "T037",
    description: "Work on cutting-edge natural language processing and large language model technologies. Build applications that understand and generate human language.",
    main_responsibilities: [
      "Fine-tune and deploy large language models",
      "Implement RAG (Retrieval Augmented Generation) systems",
      "Design prompt engineering strategies",
      "Optimize model performance and cost"
    ],
    position_in_field: "Highly specialized and in-demand role in the AI field. At the forefront of generative AI applications and LLM technology.",
    salary_range: "$150K - $280K"
  },
  "T042": {
    node_id: "T042",
    description: "Build server-side applications and APIs that power web and mobile applications. Design scalable backend systems handling millions of requests.",
    main_responsibilities: [
      "Develop REST/GraphQL APIs for client applications",
      "Design and implement microservices architectures",
      "Optimize database queries and system performance",
      "Ensure security, scalability, and reliability of backend systems"
    ],
    position_in_field: "Core engineering role in most tech companies. Works closely with frontend engineers, product managers, and infrastructure teams.",
    salary_range: "$100K - $200K"
  },
  "T044": {
    node_id: "T044",
    description: "Create engaging user interfaces for web applications. Translate design mockups into responsive, performant web experiences.",
    main_responsibilities: [
      "Build responsive web UIs using React/Vue/Angular",
      "Optimize frontend performance and accessibility",
      "Collaborate with designers to implement pixel-perfect interfaces",
      "Integrate with backend APIs and manage application state"
    ],
    position_in_field: "User-facing role critical for product success. Works at the intersection of design and engineering.",
    salary_range: "$95K - $185K"
  },
  "T047": {
    node_id: "T047",
    description: "Handle both frontend and backend development, building complete features end-to-end. Versatile engineers who understand the full technology stack.",
    main_responsibilities: [
      "Develop features spanning frontend and backend",
      "Design database schemas and API contracts",
      "Implement user interfaces and business logic",
      "Deploy and maintain full-stack applications"
    ],
    position_in_field: "Highly versatile role, especially valuable in startups and smaller teams. Can independently deliver complete features.",
    salary_range: "$105K - $195K"
  },
  "T054": {
    node_id: "T054",
    description: "Define product strategy and roadmap. Bridge user needs, business goals, and technical capabilities to build successful products.",
    main_responsibilities: [
      "Define product vision and roadmap",
      "Write detailed product requirements and user stories",
      "Collaborate with engineering, design, and stakeholders",
      "Analyze user feedback and metrics to inform decisions"
    ],
    position_in_field: "Strategic role that drives product direction. Works across all functions to deliver user value and business impact.",
    salary_range: "$120K - $220K"
  },
  "T026": {
    node_id: "T026",
    description: "Automate software delivery and maintain infrastructure. Enable rapid, reliable deployments through CI/CD pipelines and infrastructure as code.",
    main_responsibilities: [
      "Build and maintain CI/CD pipelines",
      "Manage containerized applications with Docker and Kubernetes",
      "Implement infrastructure as code using Terraform",
      "Monitor system health and respond to incidents"
    ],
    position_in_field: "Critical role for modern software delivery. Bridges development and operations, enabling teams to ship faster and more reliably.",
    salary_range: "$110K - $210K"
  }
};

export const jobTaxonomyData: JobNode[] = [
  { node_id: "T001", L1: "Hardware & Semiconductor", L2: "Chip & Semiconductor Design", L3: "Digital IC Design", L4_job_role: "Digital IC Design Engineer", core_skills: "RTL design, Verilog/VHDL, logic synthesis, timing closure, DFT", typical_titles_en: "Digital IC Design Engineer, RTL Design Engineer, ASIC Design Engineer", typical_titles_zh: "数字IC设计工程师, RTL设计工程师, ASIC设计工程师", L1_zh: "硬件与半导体" },
  { node_id: "T002", L1: "Hardware & Semiconductor", L2: "Chip & Semiconductor Design", L3: "Analog & Mixed-Signal IC Design", L4_job_role: "Analog IC Design Engineer", core_skills: "Analog circuit design, SPICE simulation, layout, RF/mixed-signal", typical_titles_en: "Analog IC Design Engineer, Mixed-Signal Design Engineer, RF IC Engineer", typical_titles_zh: "模拟IC设计工程师, 混合信号设计工程师, 射频IC工程师", L1_zh: "硬件与半导体" },
  { node_id: "T003", L1: "Hardware & Semiconductor", L2: "Chip & Semiconductor Design", L3: "Physical Design & Verification", L4_job_role: "Physical Design Engineer", core_skills: "Floorplanning, P&R, DRC/LVS, timing analysis, Cadence/Synopsys tools", typical_titles_en: "Physical Design Engineer, Layout Engineer, PnR Engineer", typical_titles_zh: "物理设计工程师, 版图工程师, 布局布线工程师", L1_zh: "硬件与半导体" },
  { node_id: "T004", L1: "Hardware & Semiconductor", L2: "Chip & Semiconductor Design", L3: "Chip Verification", L4_job_role: "Chip Verification Engineer", core_skills: "UVM/SystemVerilog, functional verification, formal verification, coverage-driven", typical_titles_en: "Verification Engineer, DV Engineer, FPGA Verification Engineer", typical_titles_zh: "芯片验证工程师, DV工程师, 功能验证工程师", L1_zh: "硬件与半导体" },
  { node_id: "T005", L1: "Hardware & Semiconductor", L2: "Chip & Semiconductor Design", L3: "EDA & CAD", L4_job_role: "EDA/CAD Engineer", core_skills: "EDA tool development, Tcl/Python scripting, CAD flow automation", typical_titles_en: "EDA Engineer, CAD Engineer, Design Automation Engineer", typical_titles_zh: "EDA工程师, CAD工程师, 设计自动化工程师", L1_zh: "硬件与半导体" },
  { node_id: "T006", L1: "Hardware & Semiconductor", L2: "Embedded & Firmware", L3: "Embedded Software", L4_job_role: "Embedded Software Engineer", core_skills: "C/C++, RTOS, bare-metal programming, device drivers, MCU/MPU", typical_titles_en: "Embedded Software Engineer, Firmware Engineer, Embedded Systems Engineer", typical_titles_zh: "嵌入式软件工程师, 固件工程师, 嵌入式系统工程师", L1_zh: "硬件与半导体" },
  { node_id: "T030", L1: "Data & AI Platform", L2: "Data Engineering", L3: "Data Pipeline & ETL", L4_job_role: "Data Engineer", core_skills: "ETL/ELT pipelines, Spark/Flink, Airflow, data warehousing (Snowflake/BigQuery/Hive)", typical_titles_en: "Data Engineer, ETL Engineer, Data Pipeline Engineer", typical_titles_zh: "数据工程师, ETL工程师, 数据管道工程师", L1_zh: "数据与AI平台" },
  { node_id: "T034", L1: "Data & AI Platform", L2: "Machine Learning Engineering", L3: "ML Model Development", L4_job_role: "Machine Learning Engineer", core_skills: "Model training, PyTorch/TensorFlow, feature engineering, model evaluation, A/B testing", typical_titles_en: "Machine Learning Engineer, ML Engineer, AI Engineer", typical_titles_zh: "机器学习工程师, ML工程师, AI工程师", L1_zh: "数据与AI平台" },
  { node_id: "T037", L1: "Data & AI Platform", L2: "AI Research", L3: "NLP & Large Language Models", L4_job_role: "NLP / LLM Engineer", core_skills: "Transformer architecture, LLM fine-tuning (LoRA/RLHF), RAG, prompt engineering, tokenization", typical_titles_en: "NLP Engineer, LLM Engineer, Conversational AI Engineer, GenAI Engineer", typical_titles_zh: "NLP工程师, 大模型工程师, 生成式AI工程师", L1_zh: "数据与AI平台" },
  { node_id: "T042", L1: "Application Software", L2: "Backend Development", L3: "Backend API Development", L4_job_role: "Backend Engineer", core_skills: "REST/GraphQL API, microservices, Java/Go/Python/Node.js, SQL/NoSQL, system design", typical_titles_en: "Backend Engineer, Backend Developer, Server-side Engineer, API Engineer", typical_titles_zh: "后端工程师, 服务端工程师, API工程师", L1_zh: "应用软件" },
  { node_id: "T044", L1: "Application Software", L2: "Frontend Development", L3: "Web Frontend", L4_job_role: "Frontend Engineer", core_skills: "HTML/CSS/JavaScript, React/Vue/Angular, TypeScript, performance optimization, browser APIs", typical_titles_en: "Frontend Engineer, Frontend Developer, Web Developer, UI Engineer", typical_titles_zh: "前端工程师, Web前端工程师, UI工程师", L1_zh: "应用软件" },
  { node_id: "T047", L1: "Application Software", L2: "Full-Stack & Platform App", L3: "Full-Stack Development", L4_job_role: "Full-Stack Engineer", core_skills: "Frontend + backend combined, Node.js/Python + React/Vue, database, deployment basics", typical_titles_en: "Full-Stack Engineer, Full-Stack Developer", typical_titles_zh: "全栈工程师, 全栈开发工程师", L1_zh: "应用软件" },
  { node_id: "T054", L1: "Product & Design", L2: "Product Management", L3: "Product Management", L4_job_role: "Product Manager", core_skills: "Product roadmap, PRD writing, user research, cross-functional collaboration, data-driven decisions", typical_titles_en: "Product Manager, PM, Senior Product Manager, Group Product Manager", typical_titles_zh: "产品经理, 高级产品经理, 产品总监", L1_zh: "产品与设计" },
  { node_id: "T026", L1: "Cloud & Platform Infrastructure", L2: "Cloud Platform Engineering", L3: "DevOps & CI/CD", L4_job_role: "DevOps Engineer", core_skills: "CI/CD pipelines (Jenkins/GitHub Actions/GitLab CI), Docker, Kubernetes, GitOps", typical_titles_en: "DevOps Engineer, Platform Engineer, Release Engineer, Build Engineer", typical_titles_zh: "DevOps工程师, 平台工程师, 发布工程师", L1_zh: "云与平台基础设施" },
];

export interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  level: number;
  job?: JobNode;
}

export function buildJobTree(data: JobNode[]): TreeNode[] {
  const tree: TreeNode[] = [];
  const l1Map = new Map<string, TreeNode>();
  const l2Map = new Map<string, TreeNode>();
  const l3Map = new Map<string, TreeNode>();

  data.forEach((job) => {
    // L1
    if (!l1Map.has(job.L1)) {
      const l1Node: TreeNode = {
        id: `l1-${job.L1}`,
        name: job.L1,
        children: [],
        level: 1,
      };
      l1Map.set(job.L1, l1Node);
      tree.push(l1Node);
    }
    const l1Node = l1Map.get(job.L1)!;

    // L2
    const l2Key = `${job.L1}-${job.L2}`;
    if (!l2Map.has(l2Key)) {
      const l2Node: TreeNode = {
        id: `l2-${l2Key}`,
        name: job.L2,
        children: [],
        level: 2,
      };
      l2Map.set(l2Key, l2Node);
      l1Node.children!.push(l2Node);
    }
    const l2Node = l2Map.get(l2Key)!;

    // L3
    const l3Key = `${l2Key}-${job.L3}`;
    if (!l3Map.has(l3Key)) {
      const l3Node: TreeNode = {
        id: `l3-${l3Key}`,
        name: job.L3,
        children: [],
        level: 3,
      };
      l3Map.set(l3Key, l3Node);
      l2Node.children!.push(l3Node);
    }
    const l3Node = l3Map.get(l3Key)!;

    // L4
    const l4Node: TreeNode = {
      id: job.node_id,
      name: job.L4_job_role,
      level: 4,
      job,
    };
    l3Node.children!.push(l4Node);
  });

  return tree;
}

export const userSkills = [
  "Python",
  "React",
  "TypeScript",
  "Node.js",
  "SQL",
  "Git",
  "Docker"
];

export function calculateSkillMatch(jobSkills: string, userSkills: string[]): number {
  const jobSkillList = jobSkills.split(',').map(s => s.trim().toLowerCase());
  const userSkillSet = new Set(userSkills.map(s => s.toLowerCase()));

  let matchCount = 0;
  jobSkillList.forEach(jobSkill => {
    if (userSkillSet.has(jobSkill) ||
        Array.from(userSkillSet).some(us => jobSkill.includes(us) || us.includes(jobSkill))) {
      matchCount++;
    }
  });

  return Math.round((matchCount / jobSkillList.length) * 100);
}
