import React from 'react';
import { Flame, Clock, Award, TrendingUp, Brain, Target } from 'lucide-react';
import { clsx } from 'clsx';

interface ProgressSummaryProps {
  streak: number;
  totalHours: number;
  tier: string;
  skills: Array<{ skill: string; level: number; trend: 'up' | 'down' | 'stable' }>;
  isLoading?: boolean;
}

export const ProgressSummary: React.FC<ProgressSummaryProps> = ({
  streak,
  totalHours,
  tier,
  skills,
  isLoading = false,
}) => {
  const metricCards = [
    {
      icon: Flame,
      color: 'text-orange-500 bg-orange-100',
      value: streak,
      label: 'Day Streak',
      subtitle: streak === 1 ? 'day' : 'days in a row',
    },
    {
      icon: Clock,
      color: 'text-blue-500 bg-blue-100',
      value: totalHours,
      label: 'Total Hours',
      subtitle: 'learning time',
    },
    {
      icon: Award,
      color: 'text-purple-500 bg-purple-100',
      value: tier,
      label: 'Current Tier',
      subtitle: 'learner level',
    },
    {
      icon: TrendingUp,
      color: 'text-green-500 bg-green-100',
      value: skills.filter(s => s.trend === 'up').length,
      label: 'Improving Skills',
      subtitle: 'trending upward',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-full mb-3" />
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-1" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-5 border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{metric.subtitle}</p>
              </div>
              <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', metric.color)}>
                <metric.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Skills Progress */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 flex items-center space-x-2 mb-4">
          <Brain className="w-5 h-5 text-indigo-600" />
          <span>Skill Progress</span>
        </h3>

        {skills.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p>Complete onboarding to track skill progress</p>
          </div>
        ) : (
          <div className="space-y-4">
            {skills.map((skill) => (
              <div key={skill.skill} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">{skill.skill}</span>
                    <span className={clsx(
                      'px-1.5 py-0.5 rounded text-xs font-medium',
                      skill.level >= 70 ? 'bg-green-100 text-green-700' :
                      skill.level >= 40 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    )}>
                      {skill.level}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {skill.trend === 'up' && (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    )}
                    {skill.trend === 'down' && (
                      <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
                    )}
                    {skill.trend === 'stable' && (
                      <span className="w-4 h-4 text-gray-400">—</span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-500',
                      skill.level >= 70 && 'bg-gradient-to-r from-green-400 to-green-600',
                      skill.level >= 40 && skill.level < 70 && 'bg-gradient-to-r from-yellow-400 to-yellow-600',
                      skill.level < 40 && 'bg-gradient-to-r from-red-400 to-red-600'
                    )}
                    style={{ width: `${skill.level}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tier Progress */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
            <Award className="w-5 h-5 text-purple-600" />
            <span>Tier Progress</span>
          </h3>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
            {tier}
          </span>
        </div>

        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
          {/* Example: 45% to next tier */}
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: '45%' }}
          />
        </div>

        <div className="flex justify-between text-sm text-gray-500">
          <span>Current: {tier}</span>
          <span>Next: Expert (55% to go)</span>
        </div>
      </div>
    </div>
  );
};