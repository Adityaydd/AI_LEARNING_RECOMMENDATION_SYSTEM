import { Router } from 'express';
import { z } from 'zod';
import { DailyTaskModel } from '../models/DailyTask.js';
import { UserModel } from '../models/User.js';
import { CourseModel } from '../models/Course.js';
import { aiProvider } from '../services/ai/index.js';

const router = Router();

// Validation schemas
const generateTasksBodySchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
  courseId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid course ID format').optional(),
  date: z.string().datetime().optional(),
});

// Generate daily tasks for a user with AI fallback
router.post('/generate', async (req, res) => {
  try {
    const bodyResult = generateTasksBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.flatten(),
      });
    }

    const { userId, courseId, date } = bodyResult.data;

    // Verify user exists
    const user = await UserModel.findById(userId).select('_id skills interests studyTimeMinutes academicBackground').lean();
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
      console.warn('AI task generation failed, using fallback:', aiError);
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

    res.status(201).json({
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
    console.error('Generate tasks error:', error);
    res.status(500).json({ error: 'Failed to generate tasks' });
  }
});

// Get today's tasks for a user (includes tasks from last 7 days)
router.get('/today/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId format
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.json({ tasks: [] });
    }

    // Get tasks from the last 7 days (including today)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const tasks = await DailyTaskModel.find({
      userId,
      date: { $gte: sevenDaysAgo }
    })
      .populate('courseId', 'title domain difficulty')
      .sort({ date: -1, createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    console.error('Get today tasks error:', error);
    res.json({ tasks: [] });
  }
});

// Complete a task unit
router.patch('/:taskId/complete', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { unitIndex } = req.body;

    const task = await DailyTaskModel.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (unitIndex >= 0 && unitIndex < task.microUnits.length) {
      task.microUnits[unitIndex].completed = true;

      const allComplete = task.microUnits.every(u => u.completed);
      if (allComplete) {
        task.status = 'completed';
      }

      await task.save();
    }

    res.json({ task });
  } catch (error) {
    console.error('Complete task unit error:', error);
    res.status(500).json({ error: 'Failed to complete task unit' });
  }
});

export default router;