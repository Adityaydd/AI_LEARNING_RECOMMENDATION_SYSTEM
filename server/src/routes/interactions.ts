import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { InteractionModel } from '../models/Interaction.js';
import { CourseModel } from '../models/Course.js';
import { UserModel } from '../models/User.js';
import { DailyTaskModel } from '../models/DailyTask.js';
import { aiProvider } from '../services/ai/index.js';

const router = Router();

// Validation schemas
const createInteractionBodySchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
  courseId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid course ID format'),
  interactionType: z.enum(['view', 'enroll', 'start', 'complete', 'rate', 'bookmark']),
  timeSpentMinutes: z.number().int().min(0).default(0),
  completionStatus: z.enum(['not_started', 'in_progress', 'completed', 'dropped']).default('not_started'),
  assessmentScores: z.array(z.number().min(0).max(100)).default([]),
  rating: z.number().min(1).max(5).optional(),
  metadata: z.record(z.unknown()).default({}),
});

const userIdParamsSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
});

const interactionQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  interactionType: z.enum(['view', 'enroll', 'start', 'complete', 'rate', 'bookmark']).optional(),
});

/**
 * POST /api/interactions
 * Record a new interaction (view, enroll, start, complete, rate, bookmark)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const bodyResult = createInteractionBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.flatten(),
      });
    }

    const { userId, courseId, interactionType, ...rest } = bodyResult.data;

    // Verify user exists
    const user = await UserModel.findById(userId).select('_id').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify course exists
    const course = await CourseModel.findById(courseId).select('_id').lean();
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Upsert interaction (unique compound index on userId + courseId)
    const interaction = await InteractionModel.findOneAndUpdate(
      { userId, courseId },
      {
        $set: {
          userId,
          courseId,
          interactionType,
          ...rest,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Auto-generate daily task when enrolling
    let generatedTask = null;
    if (interactionType === 'enroll') {
      try {
        // Fetch user and course details for task generation
        const [user, course] = await Promise.all([
          UserModel.findById(userId).select('skills interests studyTimeMinutes academicBackground').lean(),
          CourseModel.findById(courseId).lean(),
        ]);

        if (user && course) {
          // Generate tasks using AI provider with fallback
          let tasks;
          try {
            tasks = await aiProvider.generateDailyTasks(
              {
                interests: user.interests || [],
                skills: user.skills || [],
                studyTimeMinutes: user.studyTimeMinutes || 30,
                academicBackground: user.academicBackground,
              },
              {
                title: course.title,
                description: course.description,
                skillsTaught: course.skillsTaught || [],
                difficulty: course.difficulty,
                modules: course.modules || [],
              }
            );
          } catch (aiError) {
            console.warn('AI task generation failed on enroll, using fallback:', aiError);
            // Fallback: create basic tasks based on course modules
            const firstModule = course.modules?.[0];
            tasks = [
              {
                title: `Start: ${course.title}`,
                description: firstModule?.content || `Begin learning ${course.title}`,
                durationMin: Math.min(firstModule?.durationMinutes || 30, user.studyTimeMinutes || 30),
              },
              {
                title: `Practice: ${course.skillsTaught[0] || 'Key Concepts'}`,
                description: `Hands-on practice with ${course.skillsTaught[0] || 'core concepts'}`,
                durationMin: Math.min(30, user.studyTimeMinutes || 30),
              },
              {
                title: 'Review & Reflect',
                description: 'Review what you learned and note questions',
                durationMin: 10,
              },
            ];
          }

          // Save task to database with today's date
          const taskDate = new Date();
          taskDate.setHours(0, 0, 0, 0);

          const dailyTask = await DailyTaskModel.findOneAndUpdate(
            { userId, courseId: course._id, date: taskDate },
            {
              $set: {
                userId,
                courseId: course._id,
                date: taskDate,
                title: `Daily Practice: ${course.title}`,
                microUnits: tasks.map(t => ({ step: t.title, completed: false })),
                difficultyLevel: course.difficulty,
                estimatedMinutes: tasks.reduce((sum, t) => sum + t.durationMin, 0),
                status: 'pending',
              },
            },
            { upsert: true, new: true }
          );

          generatedTask = {
            id: dailyTask._id,
            courseId: course._id,
            title: dailyTask.title,
            microUnits: dailyTask.microUnits,
            difficultyLevel: dailyTask.difficultyLevel,
            estimatedMinutes: dailyTask.estimatedMinutes,
            status: dailyTask.status,
            date: taskDate.toISOString().split('T')[0],
          };
        }
      } catch (taskError) {
        console.error('Failed to auto-generate task on enroll:', taskError);
        // Don't fail the enrollment if task generation fails
      }
    }

    res.status(201).json({
      success: true,
      interaction: {
        id: interaction._id,
        userId: interaction.userId,
        courseId: interaction.courseId,
        interactionType: interaction.interactionType,
        timeSpentMinutes: interaction.timeSpentMinutes,
        completionStatus: interaction.completionStatus,
        assessmentScores: interaction.assessmentScores,
        rating: interaction.rating,
        metadata: interaction.metadata,
        createdAt: interaction.createdAt,
        updatedAt: interaction.updatedAt,
      },
      generatedTask,
    });
  } catch (error) {
    console.error('Create interaction error:', error);
    res.status(500).json({ error: 'Failed to record interaction' });
  }
});

/**
 * GET /api/interactions/user/:userId
 * Get all interactions for a user
 * Query params: ?limit=50&interactionType=enroll
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const paramsResult = userIdParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid user ID',
        details: paramsResult.error.flatten(),
      });
    }

    const queryResult = interactionQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.flatten(),
      });
    }

    const { userId } = paramsResult.data;
    const { limit, interactionType } = queryResult.data;

    // Verify user exists
    const user = await UserModel.findById(userId).select('_id').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const filter: Record<string, unknown> = { userId };
    if (interactionType) {
      filter.interactionType = interactionType;
    }

    const interactions = await InteractionModel.find(filter)
      .populate('courseId', 'title domain difficulty skillsTaught')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      userId,
      interactions: interactions.map((i) => ({
        id: i._id,
        courseId: i.courseId,
        interactionType: i.interactionType,
        timeSpentMinutes: i.timeSpentMinutes,
        completionStatus: i.completionStatus,
        assessmentScores: i.assessmentScores,
        rating: i.rating,
        metadata: i.metadata,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })),
      count: interactions.length,
    });
  } catch (error) {
    console.error('Get interactions error:', error);
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
});

export default router;