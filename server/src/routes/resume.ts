import { Router } from 'express';
import { InteractionModel } from '../db/index.js';
import { Course } from '../models/Course.js';

interface PopulatedInteraction {
  _id: string;
  updatedAt: Date;
  courseId: Pick<Course, 'title' | 'domain' | 'skillsTaught' | 'modules'> | null;
  assessmentScores?: number[];
  status: string;
}

const router = Router();

// Get resume for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const interactions = await InteractionModel.find({ userId, status: 'completed' })
      .populate('courseId', 'title domain skillsTaught modules')
      .lean<PopulatedInteraction[]>();

    const courses = interactions.map(i => ({
      title: i.courseId?.title,
      domain: i.courseId?.domain,
      skills: i.courseId?.skillsTaught,
      modules: i.courseId?.modules,
      completionDate: i.updatedAt,
      score: i.assessmentScores?.[i.assessmentScores.length - 1] || 0,
    }));

    // Generate simple resume bullets
    const bullets = courses.flatMap(course => {
      const skills = course.skills?.join(', ') || '';
      return [
        `Completed ${course.title} (${course.domain}) with ${course.score}% average assessment score`,
        `Applied ${skills} in hands-on projects and exercises`,
      ];
    });

    res.json({
      courses,
      bullets,
      summary: `Completed ${courses.length} courses across ${[...new Set(courses.map(c => c.domain))].length} domains`,
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

export default router;