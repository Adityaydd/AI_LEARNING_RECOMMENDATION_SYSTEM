import React, { useState, useEffect } from 'react';
import { Target, ExternalLink, Sparkles } from 'lucide-react';
import { api, Recommendation } from '../services/api';
import { clsx } from 'clsx';

interface RecommendationFeedProps {
  userId: string;
  onCourseSelect?: (courseId: string) => void;
}

// Validation regex for MongoDB ObjectId (24 hex characters)
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const RecommendationFeed: React.FC<RecommendationFeedProps> = ({ userId, onCourseSelect }) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guard: don't fetch if userId is empty or invalid
  const isValidUserId = userId && OBJECT_ID_REGEX.test(userId);

  useEffect(() => {
    if (isValidUserId) {
      fetchRecommendations();
    } else {
      setIsLoading(false);
      setError(null);
      setRecommendations([]);
    }
  }, [userId, isValidUserId]);

  const fetchRecommendations = async () => {
    if (!isValidUserId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getRecommendations(userId, 10);
      setRecommendations(response.data.recommendations || []);
    } catch (err) {
      setError('Failed to load recommendations');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!isValidUserId) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select a user to view recommendations</h3>
        <p className="text-gray-500">Choose a demo user from the dropdown in the navbar</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{error}</p>
        <button
          onClick={fetchRecommendations}
          className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations yet</h3>
        <p className="text-gray-500">Complete your onboarding to get personalized recommendations</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recommendations.map((rec, index) => (
        <div
          key={rec.courseId}
          className="bg-white rounded-xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-lg transition-all duration-200 group"
          onClick={() => onCourseSelect?.(rec.courseId)}
        >
          <div className="flex items-start space-x-4">
            {/* Rank Badge */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {index + 1}
            </div>

            {/* Course Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {rec.title}
                </h3>
                <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getDifficultyColor(rec.difficulty))}>
                  {rec.difficulty}
                </span>
              </div>

              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{rec.domain}</p>

              {/* Match Score & Reason */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-1">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span className={clsx('font-bold', getMatchScoreColor(rec.matchScore))}>
                    {Math.round(rec.matchScore * 100)}% Match
                  </span>
                </div>
                <span className="text-xs text-gray-400 px-2 py-0.5 rounded bg-gray-50">
                  {rec.reason}
                </span>
              </div>
            </div>

            {/* Action */}
            <div className="flex-shrink-0 flex items-center space-x-2">
              <div className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold',
                index === 0 && 'bg-gradient-to-br from-yellow-400 to-orange-500',
                index === 1 && 'bg-gradient-to-br from-gray-400 to-gray-600',
                index === 2 && 'bg-gradient-to-br from-amber-700 to-amber-900',
                index > 2 && 'bg-gradient-to-br from-indigo-500 to-purple-600'
              )}>
                {Math.round(rec.matchScore * 100)}%
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
            </div>
          </div>

          {/* Expandable Reason Details */}
          <div className="mt-4 pt-4 border-t border-gray-100 hidden sm:block">
            <p className="text-sm text-gray-600">
              <strong>Why this course:</strong> {rec.reason}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};