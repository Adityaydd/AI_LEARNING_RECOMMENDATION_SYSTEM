import React from 'react';
import { X, Clock, BookOpen, Target, Sparkles, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { api, CourseDetail, User } from '../services/api';

interface CourseDetailModalProps {
  courseId: string;
  userId: string;
  user: User | null;
  onClose: () => void;
  onEnrollSuccess?: () => void;
}

interface SkillMatch {
  skill: string;
  inUserSkills: boolean;
  inUserInterests: boolean;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  courseId,
  userId,
  user,
  onClose,
  onEnrollSuccess,
}) => {
  const [course, setCourse] = React.useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = React.useState(false);

  // Compute skill matches client-side
  const skillMatches: SkillMatch[] = React.useMemo(() => {
    if (!course || !user) return [];
    const userSkillNames = new Set(user.skills.map(s => s.name.toLowerCase()));
    const userInterestNames = new Set(user.interests.map(i => i.toLowerCase()));

    return course.skillsTaught.map(skill => ({
      skill,
      inUserSkills: userSkillNames.has(skill.toLowerCase()),
      inUserInterests: userInterestNames.has(skill.toLowerCase()),
    }));
  }, [course, user]);

  const matchedSkills = skillMatches.filter(m => m.inUserSkills || m.inUserInterests);
  const newSkills = skillMatches.filter(m => !m.inUserSkills && !m.inUserInterests);

  React.useEffect(() => {
    const fetchCourse = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getCourse(courseId);
        setCourse(response.data.course);
      } catch (err) {
        console.error('Failed to fetch course:', err);
        setError('Failed to load course details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  const handleEnroll = async () => {
    if (!course) return;
    setIsEnrolling(true);
    try {
      // Record enroll interaction
      await api.createInteraction({
        userId,
        courseId: course.id,
        interactionType: 'enroll',
        completionStatus: 'not_started',
      });

      // Generate initial daily task for this course
      await api.generateTasks({ userId, courseId: course.id });

      onEnrollSuccess?.();
      onClose();
    } catch (err) {
      console.error('Enrollment failed:', err);
      alert('Failed to enroll. Please try again.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-center">
          <p className="text-red-600 mb-4">{error || 'Course not found'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10 rounded-t-2xl">
          <div>
            <span className={clsx('inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-2', getDifficultyColor(course.difficulty))}>
              {course.difficulty}
            </span>
            <h2 className="text-2xl font-bold text-gray-900">{course.title}</h2>
            <p className="text-gray-500 mt-1">{course.domain}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Meta info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <span>{course.moduleCount} modules</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-5 h-5 text-indigo-500" />
              <span>{formatDuration(course.totalDurationMinutes)} total</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Target className="w-5 h-5 text-indigo-500" />
              <span>{course.skillsTaught.length} skills</span>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-b border-gray-100 py-4">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{course.description}</p>
          </div>

          {/* Prerequisites */}
          {course.prerequisites.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                Prerequisites
              </h3>
              <div className="flex flex-wrap gap-2">
                {course.prerequisites.map((prereq, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm font-medium"
                  >
                    {prereq}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Modules */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              Course Modules
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {course.modules.map((module, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 font-medium">{module.title}</span>
                  </div>
                  <span className="text-sm text-gray-500">{module.durationMinutes} min</span>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Taught */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Skills You'll Learn
            </h3>
            <div className="flex flex-wrap gap-2">
              {course.skillsTaught.map((skill, i) => {
                const match = skillMatches.find(m => m.skill === skill);
                const isMatched = match?.inUserSkills || match?.inUserInterests;
                return (
                  <span
                    key={i}
                    className={clsx(
                      'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                      isMatched
                        ? 'bg-green-100 text-green-700 ring-2 ring-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {skill}
                      {isMatched && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      )}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Why Recommended Panel */}
          {matchedSkills.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Why Recommended for You
              </h3>
              <p className="text-sm text-indigo-700 mb-3">
                This course aligns with your profile based on the following matching skills and interests:
              </p>
              <div className="flex flex-wrap gap-2">
                {matchedSkills.map((match, i) => (
                  <span
                    key={i}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-sm font-medium',
                      match.inUserSkills
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {match.skill}
                      {match.inUserSkills && (
                        <span className="text-xs bg-green-200 px-1.5 py-0.5 rounded">Your Skill</span>
                      )}
                      {match.inUserInterests && !match.inUserSkills && (
                        <span className="text-xs bg-blue-200 px-1.5 py-0.5 rounded">Your Interest</span>
                      )}
                    </span>
                  </span>
                ))}
              </div>
              {newSkills.length > 0 && (
                <p className="text-xs text-indigo-600 mt-3">
                  + {newSkills.length} new skill{newSkills.length > 1 ? 's' : ''} to add to your repertoire
                </p>
              )}
            </div>
          )}

          {/* Enroll Button */}
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleEnroll}
              disabled={isEnrolling}
              className={clsx(
                'w-full py-3 px-6 rounded-xl font-semibold text-lg transition-all',
                'flex items-center justify-center gap-2',
                isEnrolling
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200'
              )}
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  Enroll & Start Learning
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-500 mt-2">
              Creates an enrollment record and generates your first daily micro-task
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};