import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CourseModel } from '../models/Course.js';

const router = Router();

// Validation schemas
const courseIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid course ID format'),
});

/**
 * GET /api/courses/:id
 * Get full course details including modules, skills, prerequisites
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const paramsResult = courseIdParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid course ID',
        details: paramsResult.error.flatten(),
      });
    }

    const { id } = paramsResult.data;

    const course = await CourseModel.findById(id).lean();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const totalDuration = course.modules.reduce((sum, m) => sum + m.durationMinutes, 0);

    res.json({
      success: true,
      course: {
        id: course._id,
        title: course.title,
        description: course.description,
        domain: course.domain,
        difficulty: course.difficulty,
        prerequisites: course.prerequisites,
        modules: course.modules,
        skillsTaught: course.skillsTaught,
        tfidfTerms: course.tfidfTerms,
        embedding: course.embedding,
        eligibilityRules: course.eligibilityRules,
        totalDurationMinutes: totalDuration,
        moduleCount: course.modules.length,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

/**
 * GET /api/courses
 * List courses with optional filters
 * Query params: ?domain=Web Development&difficulty=beginner&limit=20&skip=0
 */
const listQuerySchema = z.object({
  domain: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  skillsTaught: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  skip: z.coerce.number().int().min(0).default(0),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const queryResult = listQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.flatten(),
      });
    }

    const { domain, difficulty, skillsTaught, limit, skip } = queryResult.data;

    const filter: Record<string, unknown> = {};
    if (domain) filter.domain = domain;
    if (difficulty) filter.difficulty = difficulty;
    if (skillsTaught) filter.skillsTaught = skillsTaught;

    const [courses, total] = await Promise.all([
      CourseModel.find(filter)
        .select('title domain difficulty skillsTaught modules prerequisites')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseModel.countDocuments(filter),
    ]);

    res.json({
      courses: courses.map((c) => ({
        id: c._id,
        title: c.title,
        domain: c.domain,
        difficulty: c.difficulty,
        skillsTaught: c.skillsTaught,
        moduleCount: c.modules.length,
        totalDurationMinutes: c.modules.reduce((sum, m) => sum + m.durationMinutes, 0),
        prerequisites: c.prerequisites,
      })),
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error('List courses error:', error);
    res.status(500).json({ error: 'Failed to list courses' });
  }
});

export default router;