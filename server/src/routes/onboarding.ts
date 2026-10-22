import { Router } from 'express';
import { UserModel } from '../db/index.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { aiProvider } from '../services/ai/index.js';
import jwt from 'jsonwebtoken';

const router = Router();

// Domains for onboarding
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

// Skills by domain
const SKILLS_BY_DOMAIN: Record<string, string[]> = {
  'Web Development': ['JavaScript', 'TypeScript', 'React', 'Vue.js', 'Node.js', 'Express', 'Next.js', 'HTML/CSS', 'Tailwind CSS', 'GraphQL', 'REST APIs', 'Webpack', 'Vite'],
  'Data Science': ['Python', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'Jupyter', 'SQL', 'Data Visualization', 'Statistics', 'ETL', 'Data Cleaning'],
  'Machine Learning': ['TensorFlow', 'PyTorch', 'Scikit-learn', 'Deep Learning', 'NLP', 'Computer Vision', 'Model Deployment', 'MLOps', 'Feature Engineering', 'Transformers'],
  'DevOps & Cloud': ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD', 'Linux', 'Bash', 'Monitoring', 'Infrastructure as Code'],
  'Mobile Development': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android', 'Mobile UI/UX', 'App Store Deployment'],
  'Cybersecurity': ['Network Security', 'Cryptography', 'Penetration Testing', 'OWASP', 'Security Auditing', 'Incident Response', 'Compliance'],
  'Backend Engineering': ['Go', 'Java', 'Spring Boot', 'PostgreSQL', 'MongoDB', 'Redis', 'Microservices', 'Message Queues', 'System Design'],
  'Frontend Engineering': ['React', 'TypeScript', 'CSS', 'Tailwind CSS', 'Vue.js', 'Next.js', 'State Management', 'Testing', 'Accessibility', 'Performance'],
  'Database Systems': ['SQL', 'NoSQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Data Modeling', 'Query Optimization', 'Replication'],
  'Software Architecture': ['System Design', 'Design Patterns', 'Domain-Driven Design', 'Event-Driven Architecture', 'Scalability', 'Performance Optimization'],
};

// Validation schemas
const startOnboardingSchema = z.object({
  targetDomain: z.string().refine((val) => DOMAINS.includes(val), 'Invalid domain'),
});

const skillsSchema = z.object({
  skills: z.array(z.string()).min(1, 'Select at least one skill'),
});

const studyTimeSchema = z.object({
  studyTimeMinutes: z.number().int().min(5).max(480).default(30),
});

// Helper to get user ID from auth header
const getUserIdFromToken = (authHeader: string | undefined): string | null => {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
};

/**
 * GET /api/onboarding/domains
 * Get available domains for step 1
 */
router.get('/domains', async (_req, res) => {
  res.json({ domains: DOMAINS });
});

/**
 * GET /api/onboarding/skills/:domain
 * Get skills for a specific domain for step 2
 */
router.get('/skills/:domain', async (req, res) => {
  const { domain } = req.params;
  const skills = SKILLS_BY_DOMAIN[domain] || [];
  res.json({ skills });
});

/**
 * POST /api/onboarding/step1
 * Save target domain (step 1)
 */
router.post('/step1', validate(startOnboardingSchema), async (req, res) => {
  try {
    const userId = getUserIdFromToken(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { targetDomain } = req.body;

    // Store targetDomain in user document temporarily
    await UserModel.findByIdAndUpdate(userId, {
      $set: { 'onboardingAnswers.targetDomain': targetDomain },
    });

    // Get skills for this domain
    const skills = SKILLS_BY_DOMAIN[targetDomain] || [];

    res.json({
      success: true,
      targetDomain,
      skills,
      nextStep: 'skills',
    });
  } catch (error) {
    console.error('Onboarding step1 error:', error);
    res.status(500).json({ error: 'Failed to save domain' });
  }
});

/**
 * POST /api/onboarding/step2
 * Save selected skills (step 2)
 */
router.post('/step2', validate(skillsSchema), async (req, res) => {
  try {
    const userId = getUserIdFromToken(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { skills } = req.body;

    // Store skills in user document temporarily
    await UserModel.findByIdAndUpdate(userId, {
      $set: { 'onboardingAnswers.skills': skills },
    });

    res.json({
      success: true,
      skills,
      nextStep: 'complete',
    });
  } catch (error) {
    console.error('Onboarding step2 error:', error);
    res.status(500).json({ error: 'Failed to save skills' });
  }
});

/**
 * POST /api/onboarding/complete
 * Complete onboarding: compute profileVector, save all data
 */
router.post('/complete', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Get user with onboarding answers
    const user = await UserModel.findById(userId).select('onboardingAnswers studyTimeMinutes academicBackground').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const answers = (user as any).onboardingAnswers || {};
    const { targetDomain, skills } = answers;
    const studyTimeMinutes = user.studyTimeMinutes || 30;
    const academicBackground = user.academicBackground;

    if (!targetDomain || !skills || skills.length === 0) {
      return res.status(400).json({ error: 'Incomplete onboarding data. Please complete all steps.' });
    }

    // Compute profileVector using AI provider (local embeddings)
    // Combine targetDomain, skills, and academicBackground for embedding
    const embeddingText = [
      targetDomain,
      ...skills,
      academicBackground || '',
    ].filter(Boolean).join(' ');

    let profileVector: number[];
    try {
      profileVector = await aiProvider.generateTextEmbeddings(embeddingText);
    } catch (embeddingError) {
      console.warn('Failed to generate embeddings, using dummy vector:', embeddingError);
      // Fallback: generate a deterministic dummy vector based on the text
      const words = embeddingText.toLowerCase().split(/\W+/).filter(w => w.length > 2);
      const vector = new Array(384).fill(0);
      words.forEach((word, idx) => {
        if (idx < 384) {
          let hash = 0;
          for (let i = 0; i < word.length; i++) {
            hash = ((hash << 5) - hash) + word.charCodeAt(i);
            hash |= 0;
          }
          vector[idx] = (hash % 1000) / 10000;
        }
      });
      // Normalize
      const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      if (magnitude > 0) {
        profileVector = vector.map(v => v / magnitude);
      } else {
        profileVector = new Array(384).fill(0).map(() => Math.random() - 0.5);
        const mag = Math.sqrt(profileVector.reduce((sum, v) => sum + v * v, 0));
        profileVector = profileVector.map(v => v / mag);
      }
    }

    // Update user with onboarding data
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          onboardingCompleted: true,
          interests: [targetDomain],
          skills: skills.map((name: string) => ({ name, level: 'beginner' as const })),
          studyTimeMinutes,
          profileVector,
          academicBackground,
        },
        $unset: { onboardingAnswers: '' },
      },
      { new: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        onboardingCompleted: updatedUser.onboardingCompleted,
        academicBackground: updatedUser.academicBackground,
        studyTimeMinutes: updatedUser.studyTimeMinutes,
        skills: updatedUser.skills,
        interests: updatedUser.interests,
        profileVector: updatedUser.profileVector,
        disengagementRiskScore: updatedUser.disengagementRiskScore,
      },
    });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

/**
 * GET /api/onboarding/status
 * Get current onboarding status for the user
 */
router.get('/status', async (req, res) => {
  try {
    const userId = getUserIdFromToken(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await UserModel.findById(userId).select('onboardingCompleted onboardingAnswers').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const answers = (user as any).onboardingAnswers || {};
    const currentStep = answers.targetDomain ? (answers.skills ? 'complete' : 'skills') : 'domain';

    res.json({
      onboardingCompleted: user.onboardingCompleted,
      currentStep,
      answers: {
        targetDomain: answers.targetDomain,
        skills: answers.skills || [],
      },
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    res.status(500).json({ error: 'Failed to get onboarding status' });
  }
});

export default router;