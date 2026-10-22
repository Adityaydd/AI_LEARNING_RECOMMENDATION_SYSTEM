import { Router } from 'express';
import { InteractionModel } from '../db/index.js';
import { Course } from '../models/Course.js';

interface PopulatedInteraction {
  _id: string;
  updatedAt: Date;
  courseId: Pick<Course, 'title' | 'domain' | 'skillsTaught'> | null;
  assessmentScores?: number[];
  timeSpentMinutes?: number;
  status: string;
}

const router = Router();

// Get skill timeline for a user
router.get('/skill-timeline/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const interactions = await InteractionModel.find({ userId, status: 'completed' })
      .sort({ updatedAt: 1 })
      .populate('courseId', 'title domain skillsTaught')
      .lean<PopulatedInteraction[]>();

    const timeline = interactions.map(i => ({
      date: i.updatedAt,
      courseTitle: i.courseId?.title,
      domain: i.courseId?.domain,
      skills: i.courseId?.skillsTaught,
      score: i.assessmentScores?.[i.assessmentScores.length - 1] || 0,
      timeSpent: i.timeSpentMinutes,
    }));

    res.json({ timeline });
  } catch (error) {
    console.error('Skill timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch skill timeline' });
  }
});

// Get disengagement risk for a user
router.get('/disengagement-risk/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const interactions = await InteractionModel.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean<{ _id: string; updatedAt: Date; status: string; assessmentScores?: number[] }[]>();

    // Simple heuristic for disengagement risk
    const daysSinceLastActivity = interactions.length > 0
      ? (Date.now() - new Date(interactions[0].updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    const completionRate = interactions.length > 0
      ? interactions.filter(i => i.status === 'completed').length / interactions.length
      : 0;

    const avgScore = interactions.length > 0
      ? interactions.reduce((sum, i) => sum + (i.assessmentScores?.[i.assessmentScores.length - 1] || 0), 0) / interactions.length
      : 0;

    let riskScore = 0;
    if (daysSinceLastActivity > 7) riskScore += 0.3;
    if (daysSinceLastActivity > 14) riskScore += 0.3;
    if (completionRate < 0.5) riskScore += 0.2;
    if (avgScore < 60) riskScore += 0.2;

    riskScore = Math.min(1, riskScore);

    // Update user's disengagement risk score
    const { UserModel } = await import('../db/index.js');
    await UserModel.findByIdAndUpdate(userId, { disengagementRiskScore: riskScore });

    res.json({
      riskScore,
      factors: {
        daysSinceLastActivity,
        completionRate,
        avgScore,
      },
      riskLevel: riskScore > 0.6 ? 'high' : riskScore > 0.3 ? 'medium' : 'low',
    });
  } catch (error) {
    console.error('Disengagement risk error:', error);
    res.status(500).json({ error: 'Failed to compute disengagement risk' });
  }
});

export default router;