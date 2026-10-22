import { Router } from 'express';
import { UserModel } from '../db/index.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();

// Adaptive onboarding questions
const questions = [
  {
    id: 'targetDomain',
    text: 'What is your primary learning goal?',
    type: 'single' as const,
    options: [
      { value: 'Web Development', label: 'Web Development' },
      { value: 'Data Science', label: 'Data Science' },
      { value: 'Machine Learning', label: 'Machine Learning' },
      { value: 'DevOps & Cloud', label: 'DevOps & Cloud' },
      { value: 'Mobile Development', label: 'Mobile Development' },
      { value: 'Cybersecurity', label: 'Cybersecurity' },
      { value: 'Backend Engineering', label: 'Backend Engineering' },
      { value: 'Frontend Engineering', label: 'Frontend Engineering' },
    ],
  },
  {
    id: 'currentLevel',
    text: 'How would you rate your current skill level?',
    type: 'single' as const,
    options: [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'expert', label: 'Expert' },
    ],
  },
  {
    id: 'studyTime',
    text: 'How much time can you dedicate daily?',
    type: 'scale' as const,
    min: 15,
    max: 120,
    step: 15,
  },
];

const answerSchema = z.object({
  questionId: z.string(),
  answer: z.union([z.string(), z.number()]),
});

router.get('/start', async (req, res) => {
  res.json({ question: questions[0] });
});

router.post('/answer', validate(answerSchema), async (req, res) => {
  const { questionId, answer } = req.body;
  const currentIndex = questions.findIndex(q => q.id === questionId);
  const nextIndex = currentIndex + 1;

  if (nextIndex >= questions.length) {
    return res.json({ completed: true });
  }

  res.json({ question: questions[nextIndex] });
});

router.post('/complete', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET!) as { userId: string };

    // In a real implementation, we'd compute the profileVector from answers
    // For now, just mark onboarding as complete
    await UserModel.findByIdAndUpdate(decoded.userId, {
      onboardingCompleted: true,
    });

    res.json({ success: true, message: 'Onboarding completed' });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

export default router;