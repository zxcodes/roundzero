import type { JobFormData } from "@/features/jobs/components/job-form";

export interface JobTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  tags: string[];
  data: Partial<JobFormData>;
}

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    id: "backend_engineer",
    title: "Backend Engineer",
    description: "Build scalable APIs, databases, and server-side systems",
    icon: "Code01Icon",
    tags: ["Engineering", "Backend"],
    data: {
      description: `We're looking for a Backend Engineer to design and build the core infrastructure that powers our platform.

You'll be responsible for:
- Designing and implementing RESTful APIs and microservices
- Optimizing database queries and data models
- Building scalable systems that handle millions of requests
- Collaborating with frontend engineers on API contracts
- Writing clean, maintainable code with comprehensive tests
- Participating in code reviews and technical design discussions

You'll work with modern tools and have autonomy over technical decisions. We value thoughtful engineering, clear communication, and ownership of your work.`,
      requirements: [
        "3+ years of backend development experience",
        "Strong proficiency in at least one backend language (Node.js, Python, Go, Rust, Java)",
        "Experience with SQL and NoSQL databases",
        "Understanding of API design, REST principles, and microservices",
        "Experience with version control (Git) and CI/CD pipelines",
        "Strong problem-solving and debugging skills",
        "Experience with cloud platforms (AWS, GCP, or Azure) is a plus",
      ],
      interviewQuestions: [
        "Walk us through a backend system you designed. What were the key technical decisions and trade-offs?",
        "How do you approach database optimization? Describe a time you identified and fixed a performance issue.",
        "Tell us about a time you had to debug a complex production issue. How did you approach it?",
        "What's your experience with distributed systems? How do you handle eventual consistency?",
      ],
      experienceLevel: "mid",
      workplaceType: "remote",
      employmentType: "full_time",
      salaryMin: 120000,
      salaryMax: 180000,
      salaryCurrency: "USD",
    },
  },
  {
    id: "frontend_engineer",
    title: "Frontend Engineer",
    description: "Create beautiful, responsive user interfaces and rich web experiences",
    icon: "Code02Icon",
    tags: ["Engineering", "Frontend"],
    data: {
      description: `We're seeking a Frontend Engineer to build intuitive, performant user interfaces that users love.

You'll be responsible for:
- Building responsive web applications with modern frameworks (React, Vue, Svelte)
- Optimizing performance and ensuring fast load times
- Implementing pixel-perfect designs from Figma and design systems
- Writing semantic HTML and accessible components
- Collaborating with designers and backend engineers
- Staying current with frontend best practices and tooling
- Testing your code and ensuring cross-browser compatibility

We value clean code, attention to detail, and a user-centric mindset. You'll have the autonomy to make technical decisions that impact the user experience directly.`,
      requirements: [
        "2+ years of professional frontend development experience",
        "Expert-level knowledge of HTML, CSS, and JavaScript/TypeScript",
        "Strong experience with at least one modern frontend framework (React, Vue, Svelte)",
        "Experience building responsive designs and mobile-first interfaces",
        "Understanding of web accessibility (WCAG guidelines)",
        "Familiarity with CSS frameworks or design systems",
        "Experience with frontend tooling (Webpack, Vite, etc.)",
        "Ability to work with design tools and understand design specifications",
      ],
      interviewQuestions: [
        "Describe a complex UI component you've built. How did you handle state management and performance?",
        "How do you approach making a web application accessible? Give examples.",
        "Walk us through how you'd optimize a slow-loading page.",
        "Tell us about a time you had to implement a design that was technically challenging. How did you solve it?",
      ],
      experienceLevel: "mid",
      workplaceType: "remote",
      employmentType: "full_time",
      salaryMin: 110000,
      salaryMax: 170000,
      salaryCurrency: "USD",
    },
  },
  {
    id: "full_stack_engineer",
    title: "Full Stack Engineer",
    description: "Own full-stack features from database to UI, working end-to-end",
    icon: "Code03Icon",
    tags: ["Engineering", "Full Stack"],
    data: {
      description: `Join us as a Full Stack Engineer and own complete features across our entire technology stack.

You'll be responsible for:
- Building end-to-end features from database schema to user interface
- Making informed trade-offs between frontend and backend implementations
- Shipping features quickly without compromising quality
- Writing clean, well-tested code across the stack
- Collaborating with product and design teams
- Contributing to architecture decisions
- Mentoring junior engineers

We're looking for versatile engineers who enjoy the full picture and can navigate complexity across multiple domains. You'll have ownership and the autonomy to make decisions about how features are built.`,
      requirements: [
        "3+ years of professional full-stack development experience",
        "Strong backend fundamentals (databases, APIs, server-side logic)",
        "Strong frontend fundamentals (React or similar framework, CSS, HTML)",
        "Comfortable with both relational and NoSQL databases",
        "Experience deploying and maintaining applications in production",
        "Strong problem-solving and communication skills",
        "Familiarity with DevOps concepts and cloud platforms is a plus",
      ],
      interviewQuestions: [
        "Describe a full-stack feature you built from scratch. Walk us through your architectural decisions.",
        "How do you decide what logic belongs on the frontend vs. the backend?",
        "Tell us about a time you had to optimize something across the stack. What was the bottleneck?",
        "How do you approach learning a new technology or framework when you need it for a project?",
      ],
      experienceLevel: "mid",
      workplaceType: "remote",
      employmentType: "full_time",
      salaryMin: 130000,
      salaryMax: 190000,
      salaryCurrency: "USD",
    },
  },
  {
    id: "design_engineer",
    title: "Design Engineer",
    description: "Bridge design and engineering to build beautiful, functional products",
    icon: "PencilEdit02Icon",
    tags: ["Engineering", "Design"],
    data: {
      description: `We're looking for a Design Engineer who bridges the gap between design and engineering, translating beautiful designs into pixel-perfect, interactive products.

You'll be responsible for:
- Collaborating closely with product designers and UX/UI teams
- Building reusable component libraries and design systems
- Implementing complex interactions and animations
- Ensuring accessibility and performance across all experiences
- Prototyping and iterating quickly on design concepts
- Maintaining and evolving our design system
- Mentoring frontend engineers on design best practices

You're the perfect fit if you understand both design and code, and you're passionate about creating exceptional user experiences. You'll push boundaries on what's possible in the browser while keeping accessibility and performance in mind.`,
      requirements: [
        "3+ years of experience in design engineering or similar hybrid role",
        "Expert-level frontend development skills (React, TypeScript, CSS)",
        "Strong understanding of design principles and user experience",
        "Experience with design tools (Figma, Sketch) and design-to-code workflows",
        "Proficiency in building component libraries and design systems",
        "Understanding of animation, micro-interactions, and motion design",
        "Experience implementing accessible interfaces (WCAG compliance)",
        "Comfort with design feedback and iterative refinement",
      ],
      interviewQuestions: [
        "Tell us about a design system you've built or contributed to. What challenges did you face?",
        "How do you translate complex design specs into component APIs?",
        "Describe your process for implementing a complex interaction. How do you balance fidelity and performance?",
        "How do you stay aligned with designers while shipping features efficiently?",
      ],
      experienceLevel: "mid",
      workplaceType: "remote",
      employmentType: "full_time",
      salaryMin: 125000,
      salaryMax: 185000,
      salaryCurrency: "USD",
    },
  },
  {
    id: "product_manager",
    title: "Product Manager",
    description: "Define strategy and roadmap, working across design, engineering, and users",
    icon: "Target01Icon",
    tags: ["Product"],
    data: {
      description: `We're seeking a Product Manager to drive our product vision and strategy, working cross-functionally with design, engineering, and our users.

You'll be responsible for:
- Defining product strategy and quarterly roadmaps
- Conducting user research and synthesizing insights
- Writing clear, compelling PRDs and user stories
- Collaborating with designers on user experience
- Working with engineers to ship features on time
- Measuring success with metrics and analytics
- Building relationships with key customers and stakeholders
- Advocating for users and maintaining product quality

You'll have autonomy to make strategic decisions and shape the direction of our product. We value data-driven decision-making, clear communication, and a user-first mindset.`,
      requirements: [
        "3+ years of product management experience",
        "Track record of shipping successful products or features",
        "Strong analytical and problem-solving skills",
        "Experience with user research and data analysis",
        "Excellent written and verbal communication skills",
        "Comfort with technical concepts and collaborating with engineers",
        "Experience with product metrics and analytics tools",
        "Passion for understanding users and solving real problems",
      ],
      interviewQuestions: [
        "Walk us through a product you shipped from conception to launch. What was your role?",
        "How do you approach user research? Describe a time you uncovered unexpected insights.",
        "Tell us about a time a metric you tracked led to a product decision.",
        "How do you balance user feedback with your own product intuition?",
      ],
      experienceLevel: "mid",
      workplaceType: "hybrid",
      employmentType: "full_time",
      salaryMin: 140000,
      salaryMax: 200000,
      salaryCurrency: "USD",
    },
  },
  {
    id: "devops_engineer",
    title: "DevOps / Infrastructure",
    description: "Build reliable infrastructure and deployment pipelines for scale",
    icon: "Server01Icon",
    tags: ["Engineering", "Infrastructure"],
    data: {
      description: `We're looking for a DevOps Engineer to design and maintain the infrastructure that keeps our platform running smoothly at scale.

You'll be responsible for:
- Designing and implementing CI/CD pipelines
- Managing cloud infrastructure (AWS, GCP, or Azure)
- Ensuring high availability, security, and disaster recovery
- Monitoring systems and responding to incidents
- Optimizing infrastructure costs and performance
- Documenting infrastructure and runbooks
- Collaborating with engineers to improve deployment processes
- Implementing Infrastructure as Code (Terraform, CloudFormation)

You'll be the architect behind the scenes, ensuring our platform is reliable, secure, and scalable. We value proactive problem-solving, automation mindset, and clear communication about system design.`,
      requirements: [
        "4+ years of DevOps or infrastructure engineering experience",
        "Strong experience with at least one cloud platform (AWS, GCP, Azure)",
        "Proficiency with Infrastructure as Code (Terraform, CloudFormation, Pulumi)",
        "Experience with containerization and orchestration (Docker, Kubernetes)",
        "Strong understanding of CI/CD pipelines and deployment automation",
        "Experience with monitoring, logging, and alerting systems",
        "Linux system administration experience",
        "Experience with security best practices and compliance",
      ],
      interviewQuestions: [
        "Describe a production incident you handled. How did you debug and resolve it?",
        "Walk us through a CI/CD pipeline you designed. What tools did you use and why?",
        "Tell us about your experience with Kubernetes or container orchestration.",
        "How do you approach infrastructure cost optimization?",
      ],
      experienceLevel: "mid",
      workplaceType: "remote",
      employmentType: "full_time",
      salaryMin: 130000,
      salaryMax: 190000,
      salaryCurrency: "USD",
    },
  },
  {
    id: "data_engineer",
    title: "Data Engineer",
    description: "Build robust data pipelines and infrastructure for analytics and ML",
    icon: "BarChartSquare02Icon",
    tags: ["Engineering", "Data"],
    data: {
      description: `We're seeking a Data Engineer to design and build the data infrastructure that powers our analytics and decision-making.

You'll be responsible for:
- Building robust ETL/ELT pipelines
- Designing data warehouse and lake architectures
- Ensuring data quality and reliability
- Optimizing data workflows for performance and cost
- Collaborating with analysts and data scientists
- Implementing monitoring and alerting for data pipelines
- Documenting data schemas and lineage
- Working with both batch and streaming data

You'll be the backbone of our data infrastructure, enabling better decision-making across the company. We value engineering rigor, problem-solving mindset, and clear communication about data systems.`,
      requirements: [
        "3+ years of data engineering experience",
        "Strong SQL and Python/Scala programming skills",
        "Experience with data warehousing (Snowflake, BigQuery, Redshift)",
        "Proficiency with ETL/ELT tools (dbt, Airflow, Spark)",
        "Understanding of data modeling and schema design",
        "Experience with version control and CI/CD for data",
        "Familiarity with cloud platforms and their data services",
        "Experience with both batch and streaming data is a plus",
      ],
      interviewQuestions: [
        "Describe a complex data pipeline you built. What were the challenges?",
        "How do you approach data quality and validation?",
        "Tell us about your experience with data warehousing and modeling.",
        "Walk us through how you've optimized data pipeline performance.",
      ],
      experienceLevel: "mid",
      workplaceType: "remote",
      employmentType: "full_time",
      salaryMin: 125000,
      salaryMax: 185000,
      salaryCurrency: "USD",
    },
  },
  {
    id: "marketing_specialist",
    title: "Marketing Specialist",
    description: "Drive growth through strategic marketing campaigns and brand building",
    icon: "MarketingIcon",
    tags: ["Marketing"],
    data: {
      description: `We're looking for a Marketing Specialist to drive customer acquisition and brand growth through strategic campaigns and creative initiatives.

You'll be responsible for:
- Developing and executing integrated marketing campaigns
- Managing digital channels (social media, email, content)
- Creating compelling marketing copy and messaging
- Analyzing campaign performance and optimizing for results
- Collaborating with sales, product, and design teams
- Building and nurturing our community
- Researching market trends and competitor activity
- Managing marketing budget and ROI

You'll be key to our growth story, combining creative thinking with data-driven decision-making. We value entrepreneurial mindset, strong communication, and a passion for our customers.`,
      requirements: [
        "2+ years of marketing experience in B2B or B2C environments",
        "Experience running digital marketing campaigns (paid, organic, email)",
        "Strong writing and copywriting skills",
        "Analytical mindset with experience tracking KPIs and metrics",
        "Proficiency with marketing tools (HubSpot, Mailchimp, Google Analytics, etc.)",
        "Experience with social media marketing and community building",
        "Project management and organization skills",
        "Understanding of marketing funnels and conversion optimization",
      ],
      interviewQuestions: [
        "Describe a successful marketing campaign you ran. What metrics mattered most?",
        "How do you approach developing marketing strategy for a new product or feature?",
        "Tell us about your experience with content marketing or community building.",
        "Walk us through how you'd measure the success of a campaign.",
      ],
      experienceLevel: "mid",
      workplaceType: "hybrid",
      employmentType: "full_time",
      salaryMin: 60000,
      salaryMax: 100000,
      salaryCurrency: "USD",
    },
  },
  {
    id: "social_media_specialist",
    title: "Social Media Specialist",
    description: "Build engaging community and brand presence across social platforms",
    icon: "Send01Icon",
    tags: ["Marketing", "Social"],
    data: {
      description: `We're seeking a Social Media Specialist to build an engaged community and establish our brand presence across social platforms.

You'll be responsible for:
- Creating compelling social media content across platforms
- Managing our social channels (Twitter, LinkedIn, Instagram, TikTok)
- Building and nurturing an engaged community
- Responding to comments and DMs professionally and promptly
- Analyzing social metrics and optimizing content strategy
- Collaborating with marketing and product teams
- Running social media campaigns and contests
- Staying on top of trends and platform best practices

You'll be the voice of our brand on social media, creating authentic connections with our audience. We value creativity, community focus, and data-driven thinking.`,
      requirements: [
        "1+ years of social media management experience",
        "Expertise in at least 2-3 major social platforms",
        "Strong writing and storytelling skills",
        "Experience creating visual content or working with design teams",
        "Understanding of social media analytics and performance metrics",
        "Comfort with community management and handling feedback",
        "Ability to stay current with platform trends and algorithm changes",
        "Experience with scheduling tools (Buffer, Later, Hootsuite)",
      ],
      interviewQuestions: [
        "Tell us about your most successful social media post or campaign. Why did it resonate?",
        "How do you approach building community engagement on social media?",
        "Describe your social media content strategy. How do you decide what to post?",
        "Walk us through how you'd measure social media success beyond followers.",
      ],
      experienceLevel: "mid",
      workplaceType: "hybrid",
      employmentType: "full_time",
      salaryMin: 50000,
      salaryMax: 85000,
      salaryCurrency: "USD",
    },
  },
  {
    id: "community_manager",
    title: "Community Manager",
    description: "Foster engagement and build thriving communities around our brand",
    icon: "Users01Icon",
    tags: ["Community", "Operations"],
    data: {
      description: `We're looking for a Community Manager to foster meaningful connections, drive engagement, and build a thriving community around our brand.

You'll be responsible for:
- Moderating and nurturing our community spaces (Discord, forums, Slack communities)
- Planning and hosting community events (webinars, AMAs, meetups)
- Gathering and sharing community feedback with product and leadership
- Creating community guidelines and ensuring a welcoming environment
- Onboarding new community members and helping them succeed
- Building relationships with community champions and advocates
- Creating content that celebrates community contributions
- Analyzing community metrics and engagement

You'll be the heart of our community, creating belonging and enabling our users to help each other. We value empathy, authenticity, communication skills, and a genuine passion for community building.`,
      requirements: [
        "1+ years of community management or community engagement experience",
        "Experience managing online communities (Discord, Slack, forums, etc.)",
        "Strong interpersonal and communication skills",
        "Ability to handle moderation and resolve conflicts diplomatically",
        "Event planning and execution experience",
        "Content creation skills (writing, maybe video)",
        "Understanding of community metrics and engagement",
        "Passion for building inclusive, welcoming spaces",
      ],
      interviewQuestions: [
        "Tell us about a community you've been part of or managed. What made it special?",
        "Describe how you'd handle a conflict or negative situation in a community.",
        "Walk us through a community event you've organized.",
        "How do you measure community health and engagement beyond just numbers?",
      ],
      experienceLevel: "mid",
      workplaceType: "hybrid",
      employmentType: "full_time",
      salaryMin: 55000,
      salaryMax: 90000,
      salaryCurrency: "USD",
    },
  },
];
