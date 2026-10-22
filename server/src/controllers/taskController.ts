import { Request, Response } from 'express';
import { z } from 'zod';
import { UserModel } from '../models/User.js';
import { CourseModel } from '../models/Course.js';
import { DailyTaskModel } from '../models/DailyTask.js';
import { aiProvider } from '../services/ai/index.js';

const generateTasksParamsSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
});

const generateTasksBodySchema = z.object({
  courseId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid course ID format').optional(),
  date: z.string().datetime().optional(),
});

/**
 * POST /api/tasks/generate
 * Generate personalized daily micro-tasks for a user
 * Body: { courseId?: string, date?: string }
 */
export async function generateDailyTasks(req: Request, res: Response) {
  try {
    const paramsResult = generateTasksParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      return res.status(400).json({
        error: 'Invalid user ID',
        details: paramsResult.error.flatten(),
      });
    }

    const bodyResult = generateTasksBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.flatten(),
      });
    }

    const { userId } = paramsResult.data;
    const { courseId, date } = bodyResult.data;

    // Verify user exists
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine which course to generate tasks for
    let course;
    if (courseId) {
      course = await CourseModel.findById(courseId).lean();
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
    } else {
      // Find user's current in-progress course or recommend one
      const { InteractionModel } = await import('../models/Interaction.js');
      const inProgressInteraction = await InteractionModel.findOne({
        userId,
        completionStatus: 'in_progress',
      }).lean();

      if (inProgressInteraction) {
        course = await CourseModel.findById(inProgressInteraction.courseId).lean();
      }

      if (!course) {
        // Get a recommended course based on user interests
        const { getHybridRecommendations } = await import('../services/recommendation.js');
        const recs = await getHybridRecommendations(userId, 1);
        if (recs.length > 0) {
          course = await CourseModel.findById(recs[0].courseId).lean();
        }
      }

      if (!course) {
        // Fallback: get any beginner course
        course = await CourseModel.findOne({ difficulty: 'beginner' }).lean();
      }
    }

    if (!course) {
      return res.status(404).json({ error: 'No suitable course found for task generation' });
    }

    // Generate tasks using AI provider
    const tasks = await aiProvider.generateDailyTasks(
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

    // Save tasks to database
    const taskDate = date ? new Date(date) : new Date();
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

    res.json({
      success: true,
      taskId: dailyTask._id,
      course: {
        id: course._id,
        title: course.title,
      },
      date: taskDate.toISOString().split('T')[0],
      tasks: tasks.map(t => ({
        title: t.title,
        description: t.description,
        durationMin: t.durationMin,
      })),
      totalDurationMin: tasks.reduce((sum, t) => sum + t.durationMin, 0),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Task generation error:', error);
    res.status(500).json({ error: 'Failed to generate daily tasks' });
  }
}

/**
 * GET /api/tasks/today/:userId
 * Get today's tasks for a user
 */
export async function getTodaysTasks(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await DailyTaskModel.find({
      userId,
      date: { $gte: today, $lt: tomorrow },
    })
      .populate('courseId', 'title domain difficulty')
      .lean();

    res.json({
      date: today.toISOString().split('T')[0],
      tasks: tasks.map(t => ({
        id: t._id,
        courseId: t.courseId,
        title: t.title,
        microUnits: t.microUnits,
        difficultyLevel: t.difficultyLevel,
        estimatedMinutes: t.estimatedMinutes,
        status: t.status,
      })),
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}

/**
 * PATCH /api/tasks/:taskId/complete
 * Mark a micro-unit as complete
 */
export async function completeMicroUnit(req: Request, res: Response) {
  try {
    const { taskId } = req.params;
    const { unitIndex } = req.body;

    if (typeof unitIndex !== 'number' || unitIndex < 0) {
      return res.status(400).json({ error: 'Invalid unit index' });
    }

    const task = await DailyTaskModel.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (unitIndex >= task.microUnits.length) {
      return res.status(400).json({ error: 'Unit index out of range' });
    }

    task.microUnits[unitIndex].completed = true;

    // Check if all units are complete
    const allComplete = task.microUnits.every(u => u.completed);
    if (allComplete) {
      task.status = 'completed';
    } else if (task.status === 'pending') {
      task.status = 'in_progress';
    }

    await task.save();

    res.json({
      success: true,
      task: {
        id: task._id,
        microUnits: task.microUnits,
        status: task.status,
      },
    });
  } catch (error) {
    console.error('Complete unit error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
}