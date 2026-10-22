import { Router } from 'express';
import { DailyTaskModel } from '../db/index.js';

const router = Router();

// Generate daily tasks for a user
router.post('/generate', async (req, res) => {
  try {
    const { userId, courseId, date } = req.body;

    // In a real implementation, this would use the AI provider
    // For now, return a mock task
    const task = await DailyTaskModel.create({
      userId,
      courseId,
      date: date || new Date().toISOString().split('T')[0],
      title: 'Daily Learning Task',
      microUnits: [
        { step: 'Review key concepts from last session', completed: false },
        { step: 'Watch video lecture (15 min)', completed: false },
        { step: 'Complete practice exercises', completed: false },
      ],
      difficultyLevel: 'beginner',
      estimatedMinutes: 30,
      status: 'pending',
    });

    res.status(201).json({ task });
  } catch (error) {
    console.error('Generate tasks error:', error);
    res.status(500).json({ error: 'Failed to generate tasks' });
  }
});

// Get today's tasks for a user
router.get('/today/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const tasks = await DailyTaskModel.find({ userId, date: today })
      .populate('courseId', 'title domain difficulty')
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    console.error('Get today tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
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