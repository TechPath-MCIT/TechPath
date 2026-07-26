BEGIN;

UPDATE roles
SET
  main_responsibilities = $$["Design, train, evaluate, and optimize machine learning models.","Build reproducible data, feature, training, and inference pipelines.","Deploy models to production and monitor quality, latency, and drift.","Partner with data, product, and engineering teams to translate business needs into ML solutions."]$$::jsonb,
  position_in_field = $$Applies machine learning research and methods within production engineering systems, bridging data science experimentation and scalable software delivery.$$,
  typical_job_titles = $$["Machine Learning Engineer","AI Engineer","MLOps Engineer","Applied Machine Learning Engineer","Deep Learning Engineer"]$$::jsonb
WHERE "Role ID" = 0;

UPDATE roles
SET
  main_responsibilities = $$["Define system architecture, integration patterns, and technical standards.","Translate business and product requirements into scalable solution designs.","Evaluate technology choices and document architectural tradeoffs.","Guide engineering teams through implementation, modernization, and governance."]$$::jsonb,
  position_in_field = $$Provides senior technical direction across systems and teams, connecting organizational goals with durable technology decisions.$$,
  typical_job_titles = $$["Software Architect","Solutions Architect","Enterprise Architect","Cloud Solutions Architect","Application Architect"]$$::jsonb
WHERE "Role ID" = 1;

UPDATE roles
SET
  main_responsibilities = $$["Design and operate secure, scalable cloud infrastructure.","Automate provisioning and configuration through infrastructure as code.","Implement networking, identity, resilience, and disaster recovery controls.","Monitor capacity, reliability, performance, and cloud spending."]$$::jsonb,
  position_in_field = $$Builds the cloud foundation on which applications and data platforms run, with emphasis on automation, resilience, security, and cost control.$$,
  typical_job_titles = $$["Cloud Engineer","Cloud Infrastructure Engineer","Cloud Platform Engineer","Infrastructure Engineer","Cloud Operations Engineer"]$$::jsonb
WHERE "Role ID" = 2;

UPDATE roles
SET
  main_responsibilities = $$["Assess security risks, vulnerabilities, threats, and control gaps.","Implement and monitor preventive, detective, and responsive security controls.","Investigate incidents and coordinate containment, recovery, and reporting.","Develop security policies and support compliance, audits, and awareness programs."]$$::jsonb,
  position_in_field = $$Protects systems, data, and operations across security engineering, governance, risk management, and incident response.$$,
  typical_job_titles = $$["Cybersecurity Analyst","Information Security Engineer","Security Operations Analyst","Security Consultant","Information Security Specialist"]$$::jsonb
WHERE "Role ID" = 3;

UPDATE roles
SET
  main_responsibilities = $$["Build and maintain reliable batch and streaming data pipelines.","Design data models, storage layers, and transformation workflows.","Enforce data quality, lineage, observability, and access controls.","Optimize data platforms for performance, scale, and cost."]$$::jsonb,
  position_in_field = $$Creates the trusted data infrastructure used by analysts, scientists, applications, and decision-makers.$$,
  typical_job_titles = $$["Data Engineer","Analytics Engineer","Big Data Engineer","ETL Developer","Data Platform Engineer"]$$::jsonb
WHERE "Role ID" = 4;

UPDATE roles
SET
  main_responsibilities = $$["Translate business questions into measurable analyses and requirements.","Query, clean, validate, and interpret data from multiple sources.","Build dashboards, reports, forecasts, and decision-support models.","Communicate findings, recommendations, assumptions, and limitations to stakeholders."]$$::jsonb,
  position_in_field = $$Connects operational or strategic questions with evidence, serving as a bridge among business stakeholders, data systems, and decision-making.$$,
  typical_job_titles = $$["Data Analyst","Business Analyst","Business Intelligence Analyst","Reporting Analyst","Operations Analyst"]$$::jsonb
WHERE "Role ID" = 5;

UPDATE roles
SET
  main_responsibilities = $$["Formulate analytical questions and design experiments or statistical studies.","Explore data and develop predictive, causal, or descriptive models.","Evaluate models and quantify uncertainty, bias, and business impact.","Present insights and collaborate on deploying data-driven products or decisions."]$$::jsonb,
  position_in_field = $$Uses statistics, experimentation, programming, and domain knowledge to produce insights and predictive capabilities from complex data.$$,
  typical_job_titles = $$["Data Scientist","Applied Scientist","Decision Scientist","Research Data Scientist","Quantitative Analyst"]$$::jsonb
WHERE "Role ID" = 6;

UPDATE roles
SET
  main_responsibilities = $$["Install, configure, patch, and upgrade database systems.","Design schemas, indexing strategies, replication, backup, and recovery processes.","Monitor and tune database performance, availability, and capacity.","Manage access, security, integrity, and operational troubleshooting."]$$::jsonb,
  position_in_field = $$Maintains the dependable persistence layer for applications and analytics, balancing availability, performance, recoverability, and security.$$,
  typical_job_titles = $$["Database Administrator","Database Engineer","Database Reliability Engineer","SQL Database Administrator","Database Platform Engineer"]$$::jsonb
WHERE "Role ID" = 7;

UPDATE roles
SET
  main_responsibilities = $$["Automate software build, test, release, and deployment workflows.","Operate delivery platforms, environments, and configuration systems.","Improve service observability, reliability, scalability, and recovery.","Collaborate with developers to reduce operational friction and deployment risk."]$$::jsonb,
  position_in_field = $$Connects software development and operations through automation, shared practices, and reliable delivery platforms.$$,
  typical_job_titles = $$["DevOps Engineer","Platform Engineer","Site Reliability Engineer","Release Engineer","Build and Deployment Engineer"]$$::jsonb
WHERE "Role ID" = 8;

UPDATE roles
SET
  main_responsibilities = $$["Build applications that integrate AI models, agents, or intelligent device capabilities.","Design model interaction, orchestration, retrieval, tool-use, and fallback workflows.","Evaluate application quality, safety, latency, and operating cost.","Integrate AI features with production software, sensors, robots, or edge systems."]$$::jsonb,
  position_in_field = $$Develops user-facing or physical products powered by existing AI capabilities, emphasizing application behavior and integration rather than model research alone.$$,
  typical_job_titles = $$["AI Application Developer","Generative AI Engineer","LLM Application Engineer","Robotics Software Engineer","AI Product Engineer"]$$::jsonb
WHERE "Role ID" = 9;

UPDATE roles
SET
  main_responsibilities = $$["Design test strategies, cases, fixtures, and quality acceptance criteria.","Develop and maintain automated tests across appropriate testing layers.","Investigate defects, document reproducible failures, and verify fixes.","Integrate quality checks into delivery pipelines and monitor release quality."]$$::jsonb,
  position_in_field = $$Specializes in preventing and detecting product defects through test engineering, automation, and systematic quality practices.$$,
  typical_job_titles = $$["QA Engineer","Software Development Engineer in Test","Test Automation Engineer","Software Test Engineer","Quality Engineer"]$$::jsonb
WHERE "Role ID" = 10;

UPDATE roles
SET
  main_responsibilities = $$["Design and implement server-side services, APIs, and business logic.","Model and access data while maintaining integrity, security, and performance.","Integrate internal systems, external services, queues, and event streams.","Test, monitor, troubleshoot, and scale production services."]$$::jsonb,
  position_in_field = $$Builds the server-side systems that power application behavior, data access, integrations, and platform capabilities.$$,
  typical_job_titles = $$["Back-End Developer","Back-End Engineer","Server-Side Engineer","API Engineer","Software Engineer, Back End"]$$::jsonb
WHERE "Role ID" = 11;

UPDATE roles
SET
  main_responsibilities = $$["Develop and maintain desktop or enterprise business applications.","Implement complex workflows, integrations, permissions, and data access.","Modernize legacy systems while preserving reliability and compatibility.","Test, package, deploy, support, and document application releases."]$$::jsonb,
  position_in_field = $$Builds software for desktop environments or organization-scale business operations, often involving long-lived workflows and system integrations.$$,
  typical_job_titles = $$["Desktop Application Developer","Enterprise Application Developer","Application Developer","Business Systems Developer","ERP Developer"]$$::jsonb
WHERE "Role ID" = 12;

UPDATE roles
SET
  main_responsibilities = $$["Develop firmware and software for constrained devices and real-time systems.","Integrate processors, sensors, actuators, communication buses, and peripherals.","Optimize performance, memory, power consumption, reliability, and timing.","Test and debug interactions among hardware, firmware, and higher-level software."]$$::jsonb,
  position_in_field = $$Works at the hardware-software boundary, creating dependable software for devices with strict resource, timing, or safety constraints.$$,
  typical_job_titles = $$["Embedded Software Engineer","Firmware Engineer","Embedded Systems Developer","IoT Firmware Engineer","Real-Time Software Engineer"]$$::jsonb
WHERE "Role ID" = 13;

UPDATE roles
SET
  main_responsibilities = $$["Build responsive, accessible, and reusable user-interface components.","Translate product and design specifications into polished interactions.","Integrate interfaces with APIs, state management, and client-side data flows.","Test and optimize usability, compatibility, performance, and maintainability."]$$::jsonb,
  position_in_field = $$Owns the browser-side or presentation-layer experience through which users interact with digital products.$$,
  typical_job_titles = $$["Front-End Developer","Front-End Engineer","UI Engineer","Web Developer","JavaScript Engineer"]$$::jsonb
WHERE "Role ID" = 14;

UPDATE roles
SET
  main_responsibilities = $$["Implement user interfaces, server-side services, APIs, and data access.","Design features across application layers and select appropriate technical patterns.","Test, deploy, monitor, and troubleshoot complete product workflows.","Collaborate with design, product, and engineering peers throughout delivery."]$$::jsonb,
  position_in_field = $$Delivers features across both client and server layers, providing broad ownership of end-to-end application behavior.$$,
  typical_job_titles = $$["Full-Stack Developer","Full-Stack Engineer","Software Engineer","Web Application Developer","Product Engineer"]$$::jsonb
WHERE "Role ID" = 15;

UPDATE roles
SET
  main_responsibilities = $$["Implement gameplay systems, rendering features, graphics tools, or visual simulations.","Optimize frame rate, memory use, loading, and platform-specific performance.","Integrate assets, physics, animation, audio, input, and networking systems.","Collaborate with artists, designers, and technical teams to deliver interactive experiences."]$$::jsonb,
  position_in_field = $$Combines software engineering with real-time rendering or interactive design to produce games, simulations, and graphics-intensive applications.$$,
  typical_job_titles = $$["Game Developer","Gameplay Engineer","Graphics Engineer","Rendering Engineer","Game Engine Programmer"]$$::jsonb
WHERE "Role ID" = 16;

UPDATE roles
SET
  main_responsibilities = $$["Build and maintain mobile applications for supported platforms.","Implement responsive interfaces, navigation, local storage, and device integrations.","Integrate mobile clients with APIs, authentication, analytics, and notifications.","Test and optimize reliability, performance, accessibility, and battery usage."]$$::jsonb,
  position_in_field = $$Specializes in application experiences for mobile devices, balancing platform conventions, constrained resources, and diverse device conditions.$$,
  typical_job_titles = $$["Mobile Application Developer","iOS Developer","Android Developer","React Native Developer","Mobile Software Engineer"]$$::jsonb
WHERE "Role ID" = 17;

UPDATE roles
SET
  main_responsibilities = $$["Lead, coach, hire, and develop engineers and technical leads.","Set team priorities, delivery plans, operating practices, and quality expectations.","Coordinate architecture, dependencies, staffing, and technical risk with partners.","Improve team health, execution, career growth, and organizational communication."]$$::jsonb,
  position_in_field = $$Leads engineering teams by combining people management, delivery accountability, and enough technical judgment to guide execution and tradeoffs.$$,
  typical_job_titles = $$["Engineering Manager","Software Engineering Manager","Development Manager","Technical Engineering Manager","Director of Engineering"]$$::jsonb
WHERE "Role ID" = 18;

UPDATE roles
SET
  main_responsibilities = $$["Define product vision, strategy, outcomes, and roadmap priorities.","Research user needs, market conditions, and business opportunities.","Translate priorities into clear requirements and decisions for delivery teams.","Measure product performance and iterate based on evidence and feedback."]$$::jsonb,
  position_in_field = $$Guides what a product team builds and why, aligning customer value, business goals, feasibility, and measurable outcomes.$$,
  typical_job_titles = $$["Product Manager","Technical Product Manager","Digital Product Manager","Platform Product Manager","Product Owner"]$$::jsonb
WHERE "Role ID" = 19;

UPDATE roles
SET
  main_responsibilities = $$["Define project scope, milestones, schedule, budget, and delivery plan.","Coordinate stakeholders, resources, dependencies, vendors, and communications.","Track progress, risks, issues, changes, and decisions.","Maintain delivery governance and guide projects through closure and review."]$$::jsonb,
  position_in_field = $$Organizes time-bound initiatives so that people, scope, resources, risks, and stakeholder expectations remain aligned.$$,
  typical_job_titles = $$["Project Manager","Technical Project Manager","IT Project Manager","Program Coordinator","Implementation Project Manager"]$$::jsonb
WHERE "Role ID" = 20;

UPDATE roles
SET
  main_responsibilities = $$["Diagnose and resolve technical incidents, service requests, and product issues.","Reproduce failures and analyze logs, configurations, systems, and integrations.","Document solutions, known issues, operational procedures, and customer guidance.","Escalate defects and collaborate with engineering to improve product reliability."]$$::jsonb,
  position_in_field = $$Connects users and operating systems with product and engineering teams, restoring service while turning recurring problems into durable improvements.$$,
  typical_job_titles = $$["Technical Support Engineer","Application Support Analyst","Product Support Engineer","IT Support Analyst","Customer Support Engineer"]$$::jsonb
WHERE "Role ID" = 21;

UPDATE roles
SET
  main_responsibilities = $$["Configure, patch, monitor, and maintain servers, operating systems, and core services.","Manage identities, permissions, endpoints, storage, backups, and recovery.","Automate routine administration and enforce configuration standards.","Troubleshoot incidents and support availability, security, and capacity planning."]$$::jsonb,
  position_in_field = $$Operates the shared computing environment that keeps organizational users, services, and infrastructure secure and available.$$,
  typical_job_titles = $$["Systems Administrator","IT Systems Administrator","Linux Systems Administrator","Windows Systems Administrator","Infrastructure Administrator"]$$::jsonb
WHERE "Role ID" = 22;

UPDATE roles
SET
  main_responsibilities = $$["Research user needs, behaviors, workflows, and usability challenges.","Create interaction models, user flows, wireframes, prototypes, and visual designs.","Plan and support research operations, participant workflows, and insight repositories.","Collaborate with product and engineering teams to validate and improve experiences."]$$::jsonb,
  position_in_field = $$Shapes how users understand and experience products through research, interaction design, interface design, and the operational systems supporting those practices.$$,
  typical_job_titles = $$["UX Designer","UI Designer","Product Designer","UX Researcher","Research Operations Specialist"]$$::jsonb
WHERE "Role ID" = 23;

DO $$
DECLARE
  populated_count integer;
BEGIN
  SELECT COUNT(*)
  INTO populated_count
  FROM roles
  WHERE main_responsibilities IS NOT NULL
    AND position_in_field IS NOT NULL
    AND typical_job_titles IS NOT NULL;

  IF populated_count <> 24 THEN
    RAISE EXCEPTION 'Expected 24 enriched roles, found %', populated_count;
  END IF;
END
$$;

COMMIT;
