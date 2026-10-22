import { UserModel } from '../models/User.js';
import { CourseModel } from '../models/Course.js';
import { InteractionModel } from '../models/Interaction.js';
import TfIdf from 'natural/lib/natural/tfidf/tfidf.js';
import type { Types } from 'mongoose';

// ============================================
// TYPE DEFINITIONS
// ============================================
export interface CourseScore {
  courseId: Types.ObjectId;
  title: string;
  domain: string;
  difficulty: string;
  score: number;
  reason: string;
}

export interface UserProfile {
  interests: string[];
  skills: Array<{ name: string; level: string }>;
  completedCourseIds: Set<string>;
  interactionCount: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function buildTfIdfVector(documents: string[], queryTerms: string[]): number[] {
  const tfidf = new TfIdf();
  documents.forEach(doc => tfidf.addDocument(doc));

  const vector = new Array(queryTerms.length).fill(0);
  tfidf.listTerms(0).forEach((term, idx) => {
    const termIndex = queryTerms.indexOf(term.term);
    if (termIndex >= 0) {
      vector[termIndex] = term.tfidf;
    }
  });
  return vector;
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const user = await UserModel.findById(userId).lean();
  if (!user) return null;

  const interactions = await InteractionModel.find({ userId }).lean();
  const completedCourseIds = new Set(
    interactions
      .filter(i => i.completionStatus === 'completed')
      .map(i => i.courseId.toString())
  );

  return {
    interests: user.interests || [],
    skills: user.skills || [],
    completedCourseIds,
    interactionCount: interactions.length,
  };
}

// ============================================
// CONTENT-BASED FILTERING
// ============================================
export async function getContentBasedRecommendations(
  userId: string,
  limit = 10
): Promise<CourseScore[]> {
  const userProfile = await getUserProfile(userId);
  if (!userProfile) return [];

  // Get all courses not completed by user
  const courses = await CourseModel.find({
    _id: { $nin: Array.from(userProfile.completedCourseIds) },
  }).lean();

  if (courses.length === 0) return [];

  // Build user interest/skill query terms
  const queryTerms = [
    ...userProfile.interests,
    ...userProfile.skills.map(s => s.name),
  ].filter(Boolean);

  if (queryTerms.length === 0) {
    // Cold-start fallback: return popular beginner courses
    return courses
      .filter(c => c.difficulty === 'beginner')
      .slice(0, limit)
      .map(c => ({
        courseId: c._id,
        title: c.title,
        domain: c.domain,
        difficulty: c.difficulty,
        score: 0.5,
        reason: 'Popular beginner course (cold start)',
      }));
  }

  // Build course documents for TF-IDF
  const courseDocs = courses.map(c =>
    `${c.title} ${c.description} ${c.skillsTaught.join(' ')} ${c.domain}`.toLowerCase()
  );

  // Compute TF-IDF vectors for each course against user query
  const tfidf = new TfIdf();
  courseDocs.forEach(doc => tfidf.addDocument(doc));

  const scoredCourses: CourseScore[] = [];

  courses.forEach((course, idx) => {
    let totalScore = 0;
    let matchCount = 0;

    queryTerms.forEach(term => {
      const tfidfScore = tfidf.tfidf(term.toLowerCase(), idx);
      if (tfidfScore > 0) {
        totalScore += tfidfScore;
        matchCount++;
      }
    });

    // Normalize by number of matching terms
    const normalizedScore = matchCount > 0 ? totalScore / queryTerms.length : 0;

    // Boost score for matching user's skill levels
    let skillBoost = 0;
    userProfile.skills.forEach(skill => {
      if (course.skillsTaught.includes(skill.name)) {
        const levelWeight = { beginner: 0.2, intermediate: 0.4, advanced: 0.6, expert: 0.8 }[skill.level] || 0.2;
        skillBoost += levelWeight * 0.1;
      }
    });

    // Difficulty matching bonus
    let difficultyBonus = 0;
    if (userProfile.skills.length > 0) {
      const avgSkillLevel = userProfile.skills.reduce((sum, s) => {
        const weights = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
        return sum + (weights[s.level as keyof typeof weights] || 1);
      }, 0) / userProfile.skills.length;

      const courseLevel = { beginner: 1, intermediate: 2, advanced: 3 }[course.difficulty] || 1;
      const levelDiff = Math.abs(avgSkillLevel - courseLevel);
      difficultyBonus = Math.max(0, 0.2 - levelDiff * 0.1);
    }

    const finalScore = Math.min(1, normalizedScore + skillBoost + difficultyBonus);

    scoredCourses.push({
      courseId: course._id,
      title: course.title,
      domain: course.domain,
      difficulty: course.difficulty,
      score: finalScore,
      reason: `Matches ${matchCount}/${queryTerms.length} interest areas`,
    });
  });

  // Sort by score descending and return top N
  return scoredCourses
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ============================================
// COLLABORATIVE FILTERING
// ============================================
async function buildUserCourseMatrix(): Promise<Map<string, Map<string, number>>> {
  const interactions = await InteractionModel.find().lean();

  const matrix = new Map<string, Map<string, number>>();

  interactions.forEach(interaction => {
    const userId = interaction.userId.toString();
    const courseId = interaction.courseId.toString();

    // Score based on completion status and rating
    let score = 0;
    switch (interaction.completionStatus) {
      case 'completed': score = 1.0; break;
      case 'in_progress': score = 0.5; break;
      case 'dropped': score = -0.5; break;
      default: score = 0.1;
    }

    // Boost by rating if available
    if (interaction.rating) {
      score += (interaction.rating - 3) * 0.1;
    }

    // Boost by assessment scores
    if (interaction.assessmentScores.length > 0) {
      const avgScore = interaction.assessmentScores.reduce((a, b) => a + b, 0) / interaction.assessmentScores.length;
      score += (avgScore - 50) / 100 * 0.3;
    }

    if (!matrix.has(userId)) {
      matrix.set(userId, new Map());
    }
    matrix.get(userId)!.set(courseId, score);
  });

  return matrix;
}

function computeUserSimilarity(
  userA: Map<string, number>,
  userB: Map<string, number>
): number {
  const coursesA = new Set(userA.keys());
  const coursesB = new Set(userB.keys());
  const allCourses = new Set([...coursesA, ...coursesB]);

  if (allCourses.size === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  allCourses.forEach(courseId => {
    const scoreA = userA.get(courseId) || 0;
    const scoreB = userB.get(courseId) || 0;
    dotProduct += scoreA * scoreB;
    normA += scoreA * scoreA;
    normB += scoreB * scoreB;
  });

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getCollaborativeRecommendations(
  userId: string,
  limit = 10
): Promise<CourseScore[]> {
  const matrix = await buildUserCourseMatrix();
  const targetUserCourses = matrix.get(userId);

  if (!targetUserCourses || targetUserCourses.size === 0) {
    return []; // No interactions for collaborative filtering
  }

  // Find k-nearest neighbors
  const similarities: Array<{ userId: string; similarity: number }> = [];

  matrix.forEach((courses, otherUserId) => {
    if (otherUserId === userId) return;
    const sim = computeUserSimilarity(targetUserCourses, courses);
    if (sim > 0) {
      similarities.push({ userId: otherUserId, similarity: sim });
    }
  });

  // Sort by similarity and take top k
  const k = 10;
  const neighbors = similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  if (neighbors.length === 0) return [];

  // Score uncompleted courses based on neighbor preferences
  const targetCompleted = new Set(targetUserCourses.keys());
  const courseScores = new Map<string, { score: number; weight: number }>();

  neighbors.forEach(({ userId: neighborId, similarity }) => {
    const neighborCourses = matrix.get(neighborId)!;
    neighborCourses.forEach((score, courseId) => {
      if (targetCompleted.has(courseId)) return;
      if (score <= 0) return; // Only positive signals

      const existing = courseScores.get(courseId) || { score: 0, weight: 0 };
      existing.score += score * similarity;
      existing.weight += similarity;
      courseScores.set(courseId, existing);
    });
  });

  // Normalize scores by weight
  const scoredCourses: CourseScore[] = [];
  const courseIds = Array.from(courseScores.keys());

  if (courseIds.length === 0) return [];

  // Fetch course details
  const courses = await CourseModel.find({ _id: { $in: courseIds } }).lean();
  const courseMap = new Map(courses.map(c => [c._id.toString(), c]));

  courseScores.forEach(({ score, weight }, courseId) => {
    const course = courseMap.get(courseId);
    if (!course) return;

    const normalizedScore = weight > 0 ? score / weight : 0;

    scoredCourses.push({
      courseId: course._id,
      title: course.title,
      domain: course.domain,
      difficulty: course.difficulty,
      score: Math.min(1, normalizedScore),
      reason: `Recommended by ${neighbors.length} similar learners`,
    });
  });

  return scoredCourses
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ============================================
// HYBRID RECOMMENDATIONS
// ============================================
export async function getHybridRecommendations(
  userId: string,
  limit = 10
): Promise<CourseScore[]> {
  const userProfile = await getUserProfile(userId);
  if (!userProfile) return [];

  // Cold-start: if user has < 3 interactions, use content-based with onboarding interests
  const isColdStart = userProfile.interactionCount < 3;

  if (isColdStart) {
    const contentRecs = await getContentBasedRecommendations(userId, limit);
    return contentRecs.map(rec => ({
      ...rec,
      reason: `${rec.reason} (cold-start: based on onboarding interests)`,
    }));
  }

  // Get both recommendation types
  const [contentRecs, collabRecs] = await Promise.all([
    getContentBasedRecommendations(userId, limit * 2),
    getCollaborativeRecommendations(userId, limit * 2),
  ]);

  // Combine scores with weighted aggregation
  const combinedScores = new Map<string, CourseScore>();

  // Content-based weight: 0.5
  contentRecs.forEach(rec => {
    const key = rec.courseId.toString();
    combinedScores.set(key, {
      ...rec,
      score: rec.score * 0.5,
      reason: `Content: ${rec.reason}`,
    });
  });

  // Collaborative weight: 0.5
  collabRecs.forEach(rec => {
    const key = rec.courseId.toString();
    const existing = combinedScores.get(key);
    if (existing) {
      existing.score += rec.score * 0.5;
      existing.reason = `Hybrid: ${existing.reason} + Collab: ${rec.reason}`;
    } else {
      combinedScores.set(key, {
        ...rec,
        score: rec.score * 0.5,
        reason: `Collaborative: ${rec.reason}`,
      });
    }
  });

  // Sort and return top N
  return Array.from(combinedScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}