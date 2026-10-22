import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getHybridRecommendations } from '../services/recommendation.js';
import { UserModel } from '../models/User.js';

const router = Router();

// Validation schema
const recommendationParamsSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
});

const recommendationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * GET /api/recommendations/:userId
 * Returns personalized course recommendations for a user
 * Query params: ?limit=10
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    // Validate params
    const paramsResult = recommendationParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid user ID',
        details: paramsResult.error.flatten(),
      });
    }

    // Validate query
    const queryResult = recommendationQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.flatten(),
      });
    }

    const { userId } = paramsResult.data;
    const { limit } = queryResult.data;

    // Verify user exists
    const user = await UserModel.findById(userId).select('_id').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get hybrid recommendations
    const recommendations = await getHybridRecommendations(userId, limit);

    // Format response
    const response = {
      userId,
      recommendations: recommendations.map(rec => ({
        courseId: rec.courseId.toString(),
        title: rec.title,
        domain: rec.domain,
        difficulty: rec.difficulty,
        matchScore: Math.round(rec.score * 100) / 100,
        reason: rec.reason,
      })),
      count: recommendations.length,
      generatedAt: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

export default router;