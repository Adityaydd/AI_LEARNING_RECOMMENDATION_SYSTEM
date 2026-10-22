import { Router } from 'express';
import { JobListingModel } from '../db/index.js';
import { InteractionModel } from '../db/index.js';
import { Course } from '../models/Course.js';

interface PopulatedInteraction {
  _id: string;
  courseId: Pick<Course, 'skillsTaught'> | null;
  status: string;
}

const router = Router();

// Get job matches for a user
router.get('/matches/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user skills from completed courses
    const interactions = await InteractionModel.find({ userId, status: 'completed' })
      .populate('courseId', 'skillsTaught')
      .lean<PopulatedInteraction[]>();

    const userSkills = [...new Set(
      interactions.flatMap(i => i.courseId?.skillsTaught || [])
    )];

    // Find jobs that match user skills
    const jobs = await JobListingModel.find({
      requiredSkills: { $in: userSkills }
    }).limit(10);

    // Score jobs based on skill overlap
    const scoredJobs = jobs.map(job => {
      const overlap = job.requiredSkills.filter(s => userSkills.includes(s)).length;
      const matchScore = job.requiredSkills.length > 0 ? overlap / job.requiredSkills.length : 0;
      return { ...job.toObject(), matchScore: Math.round(matchScore * 100) };
    });

    // Sort by match score descending
    scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

    res.json({ jobs: scoredJobs.slice(0, 5) });
  } catch (error) {
    console.error('Get job matches error:', error);
    res.status(500).json({ error: 'Failed to fetch job matches' });
  }
});

export default router;