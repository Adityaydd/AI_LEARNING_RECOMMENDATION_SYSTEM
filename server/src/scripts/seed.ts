import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../db/connect.js';
import { UserModel } from '../models/User.js';
import { CourseModel } from '../models/Course.js';

// ============================================
// CONFIGURATION
// ============================================
const NUM_USERS = 30;
const NUM_COURSES = 50;
const PASSWORD_HASH = '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG3vv1BD7WC'; // "password123"

// ============================================
// DOMAINS & SKILLS DATA
// ============================================
const DOMAINS = [
  'Web Development',
  'Data Science',
  'Machine Learning',
  'DevOps & Cloud',
  'Mobile Development',
  'Cybersecurity',
  'Backend Engineering',
  'Frontend Engineering',
  'Database Systems',
  'Software Architecture',
];

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

const ALL_SKILLS = [
  // Web Development
  'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Node.js', 'Express', 'Next.js',
  'HTML/CSS', 'Tailwind CSS', 'GraphQL', 'REST APIs', 'Webpack', 'Vite',
  // Data Science
  'Python', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'Jupyter', 'SQL',
  'Data Visualization', 'Statistics', 'ETL', 'Data Cleaning',
  // Machine Learning
  'TensorFlow', 'PyTorch', 'Scikit-learn', 'Deep Learning', 'NLP', 'Computer Vision',
  'Model Deployment', 'MLOps', 'Feature Engineering', 'Transformers',
  // DevOps & Cloud
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD',
  'Linux', 'Bash', 'Monitoring', 'Infrastructure as Code',
  // Mobile
  'React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android',
  'Mobile UI/UX', 'App Store Deployment',
  // Cybersecurity
  'Network Security', 'Cryptography', 'Penetration Testing', 'OWASP',
  'Security Auditing', 'Incident Response', 'Compliance',
  // Backend
  'Go', 'Java', 'Spring Boot', 'PostgreSQL', 'MongoDB', 'Redis',
  'Microservices', 'Message Queues', 'System Design',
  // Database
  'SQL', 'NoSQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'Data Modeling', 'Query Optimization', 'Replication',
  // Architecture
  'System Design', 'Design Patterns', 'Domain-Driven Design', 'Event-Driven Architecture',
  'Scalability', 'Performance Optimization',
];

const ACADEMIC_BACKGROUNDS = [
  'Computer Science',
  'Software Engineering',
  'Data Science',
  'Information Technology',
  'Mathematics',
  'Physics',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Business Administration',
  'Liberal Arts',
  'Self-taught',
  'Bootcamp Graduate',
];

const INTERESTS_POOL = [
  'Web Development', 'Data Science', 'Machine Learning', 'DevOps',
  'Mobile Development', 'Cybersecurity', 'Backend Engineering',
  'Frontend Engineering', 'Database Systems', 'Software Architecture',
  'AI/ML Research', 'Cloud Computing', 'Open Source',
  'Technical Writing', 'Developer Tools', 'Game Development',
];

const NAMES_FIRST = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Sydney', 'Dakota', 'Peyton', 'Reese', 'Rowan', 'Sage', 'Drew',
  'Cameron', 'Logan', 'Harper', 'Finley', 'Ellis', 'Marley', 'Skyler',
  'Justice', 'Kennedy', 'Emerson', 'Phoenix', 'River', 'Winter', 'Nova',
];

const NAMES_LAST = [
  'Chen', 'Patel', 'Kim', 'Singh', 'Garcia', 'Rodriguez', 'Martinez',
  'Anderson', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
  'Thompson', 'Robinson', 'Clark', 'Lewis', 'Walker', 'Hall', 'Allen',
  'Young', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams',
];

// ============================================
// HELPER FUNCTIONS
// ============================================
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBool(probability = 0.5): boolean {
  return Math.random() < probability;
}

function generateEmail(firstName: string, lastName: string, index: number): string {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'proton.me', 'example.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${randomElement(domains)}`;
}

function generateDummyEmbedding(): number[] {
  // Generate a random 384-dimensional vector (normalized)
  const vec = new Array(384).fill(0).map(() => (Math.random() - 0.5) * 2);
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return vec.map(v => v / magnitude);
}

function generateTFIDFTerms(skills: string[]): Record<string, number> {
  const terms: Record<string, number> = {};
  skills.forEach(skill => {
    const words = skill.toLowerCase().split(/[\s\-]+/);
    words.forEach(word => {
      if (word.length > 2) {
        terms[word] = (terms[word] || 0) + Math.random() * 2 + 0.5;
      }
    });
  });
  return terms;
}

// ============================================
// COURSE GENERATION
// ============================================
const COURSE_TEMPLATES = [
  // Web Development
  {
    domain: 'Web Development',
    titles: [
      'Modern React with Hooks and Context',
      'Building Scalable APIs with Node.js and Express',
      'Full-Stack TypeScript with Next.js 14',
      'Advanced Vue.js 3 Composition API',
      'State Management with Redux Toolkit and RTK Query',
      'Testing React Applications with Vitest and Playwright',
      'Performance Optimization for React Apps',
      'Server-Side Rendering with Next.js App Router',
      'Building Design Systems with Storybook',
      'Progressive Web Apps with Service Workers',
    ],
  },
  {
    domain: 'Data Science',
    titles: [
      'Python for Data Analysis with Pandas',
      'Data Visualization with Matplotlib and Seaborn',
      'Statistical Analysis and Hypothesis Testing',
      'SQL for Data Scientists',
      'Time Series Analysis and Forecasting',
      'Exploratory Data Analysis Techniques',
      'Feature Engineering for Machine Learning',
      'Big Data Processing with PySpark',
      'Data Wrangling and Cleaning Best Practices',
      'Dashboard Creation with Streamlit',
    ],
  },
  {
    domain: 'Machine Learning',
    titles: [
      'Introduction to Machine Learning with Scikit-learn',
      'Deep Learning Fundamentals with PyTorch',
      'Natural Language Processing with Transformers',
      'Computer Vision with CNNs and Vision Transformers',
      'MLOps: Deploying ML Models to Production',
      'Reinforcement Learning Basics',
      'Generative AI: LLMs and Diffusion Models',
      'Feature Stores and ML Pipelines',
      'Model Evaluation and Hyperparameter Tuning',
      'Responsible AI and Bias Mitigation',
    ],
  },
  {
    domain: 'DevOps & Cloud',
    titles: [
      'Docker Mastery: From Basics to Production',
      'Kubernetes Fundamentals and Cluster Management',
      'AWS Certified Solutions Architect Preparation',
      'Infrastructure as Code with Terraform',
      'CI/CD Pipelines with GitHub Actions',
      'Observability: Logging, Metrics, and Tracing',
      'Site Reliability Engineering Practices',
      'Cloud-Native Application Development',
      'Serverless Architecture with AWS Lambda',
      'GitOps with ArgoCD and Flux',
    ],
  },
  {
    domain: 'Mobile Development',
    titles: [
      'Cross-Platform Apps with React Native',
      'Flutter Development for iOS and Android',
      'Native iOS Development with SwiftUI',
      'Android Development with Jetpack Compose',
      'Mobile App Architecture Patterns',
      'State Management in React Native',
      'Mobile Testing and CI/CD',
      'App Store Deployment and ASO',
      'Push Notifications and Background Tasks',
      'Mobile Performance Optimization',
    ],
  },
  {
    domain: 'Cybersecurity',
    titles: [
      'Network Security Fundamentals',
      'Web Application Penetration Testing',
      'Cryptography for Developers',
      'OWASP Top 10: Vulnerabilities and Mitigation',
      'Security Incident Response and Forensics',
      'Cloud Security Best Practices',
      'DevSecOps: Integrating Security in CI/CD',
      'Identity and Access Management',
      'Secure Code Review Techniques',
      'Compliance: SOC2, GDPR, and HIPAA',
    ],
  },
  {
    domain: 'Backend Engineering',
    titles: [
      'Building Microservices with Go',
      'Distributed Systems Design Patterns',
      'Database Design and Optimization',
      'Message Queues: RabbitMQ and Kafka',
      'API Design: REST, GraphQL, and gRPC',
      'Caching Strategies with Redis',
      'Authentication and Authorization Systems',
      'Event-Driven Architecture with Kafka',
      'System Design for High Scale',
      'Observability for Backend Services',
    ],
  },
  {
    domain: 'Frontend Engineering',
    titles: [
      'Advanced CSS: Grid, Flexbox, and Animations',
      'TypeScript for Large-Scale Frontend Apps',
      'Frontend Architecture: Micro-Frontends',
      'Web Components and Lit',
      'Accessibility (a11y) Best Practices',
      'Frontend Performance and Core Web Vitals',
      'State Management: Signals and Atoms',
      'Building Component Libraries',
      'Frontend Testing Strategies',
      'Modern CSS: Container Queries and Cascade Layers',
    ],
  },
  {
    domain: 'Database Systems',
    titles: [
      'PostgreSQL Advanced Features and Performance',
      'MongoDB Data Modeling and Aggregation',
      'Redis for Caching and Real-Time Systems',
      'Database Sharding and Replication',
      'Time-Series Databases: InfluxDB and TimescaleDB',
      'Graph Databases with Neo4j',
      'Vector Databases for AI Applications',
      'Database Migration Strategies',
      'ACID vs BASE: Consistency Models',
      'Query Optimization and Indexing',
    ],
  },
  {
    domain: 'Software Architecture',
    titles: [
      'Clean Architecture and Domain-Driven Design',
      'Event-Driven Architecture Patterns',
      'CQRS and Event Sourcing',
      'Service Mesh with Istio',
      'API Gateway Patterns',
      'Saga Pattern for Distributed Transactions',
      'Hexagonal Architecture in Practice',
      'Modular Monoliths vs Microservices',
      'Architecture Decision Records (ADRs)',
      'Technical Debt Management Strategies',
    ],
  },
];

function generateCourse(index: number) {
  const template = COURSE_TEMPLATES[index % COURSE_TEMPLATES.length];
  const titleIndex = Math.floor(index / COURSE_TEMPLATES.length) % template.titles.length;
  const difficulty = DIFFICULTIES[randomInt(0, 2)];

  // Select skills relevant to domain
  const domainSkills = ALL_SKILLS.filter(s =>
    template.domain.toLowerCase().includes(s.toLowerCase().split(' ')[0]) ||
    s.toLowerCase().includes(template.domain.toLowerCase().split(' ')[0])
  );
  const skillsTaught = randomElements(
    domainSkills.length > 0 ? domainSkills : ALL_SKILLS,
    randomInt(3, 8)
  );

  const numModules = randomInt(5, 12);
  const modules = [];
  let cumulativeDuration = 0;

  for (let i = 0; i < numModules; i++) {
    const duration = randomInt(30, 120);
    cumulativeDuration += duration;
    modules.push({
      title: `Module ${i + 1}: ${skillsTaught[i % skillsTaught.length]} Fundamentals`,
      content: `This module covers the fundamentals of ${skillsTaught[i % skillsTaught.length]} including key concepts, best practices, and hands-on exercises. Duration: ${duration} minutes.`,
      durationMinutes: duration,
    });
  }

  // Prerequisites based on difficulty
  let prerequisites: string[] = [];
  if (difficulty === 'intermediate') {
    prerequisites = randomElements(ALL_SKILLS, randomInt(1, 3));
  } else if (difficulty === 'advanced') {
    prerequisites = randomElements(ALL_SKILLS, randomInt(2, 5));
  }

  return {
    title: template.titles[titleIndex],
    description: `A comprehensive ${difficulty}-level course on ${template.titles[titleIndex].toLowerCase()}. This course covers ${skillsTaught.slice(0, 3).join(', ')} and more through ${numModules} hands-on modules totaling ${cumulativeDuration} minutes of content.`,
    domain: template.domain,
    difficulty,
    prerequisites,
    modules,
    skillsTaught,
    tfidfTerms: generateTFIDFTerms(skillsTaught),
    embedding: generateDummyEmbedding(),
    eligibilityRules: {},
  };
}

// ============================================
// USER GENERATION
// ============================================
function generateUser(index: number) {
  const firstName = randomElement(NAMES_FIRST);
  const lastName = randomElement(NAMES_LAST);
  const email = generateEmail(firstName, lastName, index);

  const numSkills = randomInt(0, 8);
  const userSkills = randomElements(ALL_SKILLS, numSkills).map(skill => ({
    name: skill,
    level: randomElement(['beginner', 'intermediate', 'advanced', 'expert'] as const),
  }));

  const numInterests = randomInt(2, 6);
  const interests = randomElements(INTERESTS_POOL, numInterests);

  // Some users have completed onboarding, some haven't
  const onboardingCompleted = randomBool(0.7);

  // Generate profile vector for users who completed onboarding
  let profileVector: number[] | undefined;
  if (onboardingCompleted) {
    profileVector = generateDummyEmbedding();
  }

  // Study time varies
  const studyTimeMinutes = randomElement([15, 20, 30, 45, 60, 90, 120]);

  // Academic background
  const academicBackground = randomBool(0.8) ? randomElement(ACADEMIC_BACKGROUNDS) : undefined;

  // Disengagement risk (some users at risk)
  const disengagementRiskScore = randomBool(0.15) ? Math.random() * 0.3 + 0.6 : Math.random() * 0.4;

  return {
    name: `${firstName} ${lastName}`,
    email,
    passwordHash: PASSWORD_HASH,
    role: 'learner' as const,
    onboardingCompleted,
    academicBackground,
    studyTimeMinutes,
    skills: userSkills,
    interests,
    profileVector,
    disengagementRiskScore,
  };
}

// ============================================
// MAIN SEED FUNCTION
// ============================================
async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    await connectDB();

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      UserModel.deleteMany({}),
      CourseModel.deleteMany({}),
    ]);

    // Create courses
    console.log(`📚 Creating ${NUM_COURSES} courses...`);
    const courses = [];
    for (let i = 0; i < NUM_COURSES; i++) {
      const courseData = generateCourse(i);
      const course = new CourseModel(courseData);
      await course.save();
      courses.push(course);
      if ((i + 1) % 10 === 0) {
        console.log(`  Created ${i + 1}/${NUM_COURSES} courses...`);
      }
    }
    console.log(`✅ Created ${courses.length} courses`);

    // Create users
    console.log(`👥 Creating ${NUM_USERS} users...`);
    const users = [];
    for (let i = 0; i < NUM_USERS; i++) {
      const userData = generateUser(i);
      const user = new UserModel(userData);
      await user.save();
      users.push(user);
      if ((i + 1) % 10 === 0) {
        console.log(`  Created ${i + 1}/${NUM_USERS} users...`);
      }
    }
    console.log(`✅ Created ${users.length} users`);

    // Create some interactions (prior completions) for testing recommendations
    console.log('🔗 Creating sample interactions...');
    const { InteractionModel } = await import('../models/Interaction.js');
    await InteractionModel.deleteMany({});

    const interactions = [];
    // Give each user 0-8 completed courses
    for (const user of users) {
      const numCompletions = randomInt(0, 8);
      const completedCourses = randomElements(courses, numCompletions);

      for (const course of completedCourses) {
        interactions.push({
          userId: user._id,
          courseId: course._id,
          interactionType: 'complete' as const,
          status: 'completed' as const,
          assessmentScores: Array.from({ length: randomInt(1, 3) }, () => randomInt(60, 100)),
          timeSpentMinutes: randomInt(course.modules.reduce((sum, m) => sum + m.durationMinutes, 0) * 0.5,
                                     course.modules.reduce((sum, m) => sum + m.durationMinutes, 0) * 1.5),
          rating: randomInt(3, 5),
          updatedAt: new Date(Date.now() - randomInt(0, 30) * 24 * 60 * 60 * 1000),
        });
      }

      // Some in-progress courses
      const numInProgress = randomInt(0, 2);
      const inProgressCourses = randomElements(
        courses.filter(c => !completedCourses.includes(c)),
        numInProgress
      );

      for (const course of inProgressCourses) {
        interactions.push({
          userId: user._id,
          courseId: course._id,
          interactionType: 'start' as const,
          status: 'in_progress' as const,
          assessmentScores: [],
          timeSpentMinutes: randomInt(30, 120),
          updatedAt: new Date(),
        });
      }
    }

    if (interactions.length > 0) {
      await InteractionModel.insertMany(interactions);
      console.log(`✅ Created ${interactions.length} interactions`);
    }

    // Create some daily tasks
    console.log('📅 Creating sample daily tasks...');
    const { DailyTaskModel } = await import('../models/DailyTask.js');
    await DailyTaskModel.deleteMany({});

    const dailyTasks = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const user of users) {
      // Create tasks for last 7 days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        if (randomBool(0.6)) { // 60% chance of task per day
          const date = new Date(today);
          date.setDate(date.getDate() - dayOffset);

          // Pick a course the user is interested in or enrolled in
          const userInteractions = interactions.filter(i => i.userId.equals(user._id));
          const availableCourses = userInteractions.length > 0
            ? userInteractions.map(i => courses.find(c => c._id.equals(i.courseId))).filter(Boolean) as typeof courses
            : courses;

          if (availableCourses.length > 0) {
            const course = randomElement(availableCourses);
            const numMicroUnits = randomInt(2, 5);

            dailyTasks.push({
              userId: user._id,
              courseId: course._id,
              date,
              title: `Daily Practice: ${course.title}`,
              microUnits: Array.from({ length: numMicroUnits }, (_, i) => ({
                step: `Step ${i + 1}: Review ${course.skillsTaught[i % course.skillsTaught.length]}`,
                completed: dayOffset > 0 ? randomBool(0.8) : randomBool(0.3),
              })),
              difficultyLevel: course.difficulty,
              estimatedMinutes: user.studyTimeMinutes,
              status: dayOffset > 0 && randomBool(0.7) ? 'completed' as const : 'pending' as const,
            });
          }
        }
      }
    }

    if (dailyTasks.length > 0) {
      await DailyTaskModel.insertMany(dailyTasks);
      console.log(`✅ Created ${dailyTasks.length} daily tasks`);
    }

    // Create job listings
    console.log('💼 Creating sample job listings...');
    const { JobListingModel } = await import('../models/JobListing.js');
    await JobListingModel.deleteMany({});

    const jobTitles = [
      { title: 'Frontend Engineer', type: 'corporate' as const, skills: ['React', 'TypeScript', 'CSS', 'Testing'] },
      { title: 'Backend Engineer', type: 'corporate' as const, skills: ['Node.js', 'PostgreSQL', 'Docker', 'Kubernetes'] },
      { title: 'Full Stack Developer', type: 'corporate' as const, skills: ['React', 'Node.js', 'TypeScript', 'AWS'] },
      { title: 'Data Scientist', type: 'corporate' as const, skills: ['Python', 'Pandas', 'SQL', 'Machine Learning'] },
      { title: 'ML Engineer', type: 'corporate' as const, skills: ['PyTorch', 'TensorFlow', 'MLOps', 'Python'] },
      { title: 'DevOps Engineer', type: 'corporate' as const, skills: ['Docker', 'Kubernetes', 'Terraform', 'AWS'] },
      { title: 'Mobile Developer', type: 'corporate' as const, skills: ['React Native', 'TypeScript', 'iOS', 'Android'] },
      { title: 'Security Analyst', type: 'corporate' as const, skills: ['Network Security', 'Penetration Testing', 'OWASP', 'SIEM'] },
      { title: 'Software Engineer - Government', type: 'gov_exam' as const, skills: ['Java', 'Spring Boot', 'PostgreSQL', 'System Design'] },
      { title: 'Data Analyst - Public Sector', type: 'gov_exam' as const, skills: ['SQL', 'Python', 'Data Visualization', 'Statistics'] },
    ];

    const jobListings = jobTitles.map(job => ({
      title: job.title,
      organization: randomElement(['TechCorp', 'DataSystems Inc', 'CloudNative Co', 'SecureNet', 'MobileFirst', 'GovTech Solutions', 'Public Sector Digital', 'Innovation Labs']),
      type: job.type,
      requiredSkills: job.skills,
      minQualification: randomElement(['Bachelor\'s in CS', 'Bachelor\'s in related field', 'Equivalent experience', 'Master\'s preferred']),
      eligibilityCriteria: {
        experienceYears: randomInt(0, 5),
        certifications: randomBool(0.3) ? ['AWS Certified', 'CKAD', 'Security+'] : [],
        location: randomElement(['Remote', 'San Francisco', 'New York', 'Austin', 'Seattle', 'Washington DC']),
      },
      matchVector: generateDummyEmbedding(),
    }));

    await JobListingModel.insertMany(jobListings);
    console.log(`✅ Created ${jobListings.length} job listings`);

    // Summary
    console.log('\n📊 Seeding Summary:');
    console.log(`   Users: ${users.length} (${users.filter(u => u.onboardingCompleted).length} onboarded)`);
    console.log(`   Courses: ${courses.length}`);
    console.log(`   Interactions: ${interactions.length}`);
    console.log(`   Daily Tasks: ${dailyTasks.length}`);
    console.log(`   Job Listings: ${jobListings.length}`);

    // Domain distribution
    const domainCounts = courses.reduce((acc, c) => {
      acc[c.domain] = (acc[c.domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('\n📚 Courses by Domain:');
    Object.entries(domainCounts).forEach(([domain, count]) => {
      console.log(`   ${domain}: ${count}`);
    });

    // Difficulty distribution
    const difficultyCounts = courses.reduce((acc, c) => {
      acc[c.difficulty] = (acc[c.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('\n📈 Courses by Difficulty:');
    Object.entries(difficultyCounts).forEach(([diff, count]) => {
      console.log(`   ${diff}: ${count}`);
    });

    console.log('\n🎉 Seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch(console.error);
}

export { seed };