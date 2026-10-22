import React, { useState, useEffect } from 'react';
import { Check, CheckCircle, ChevronDown, ChevronUp, Clock, Loader2, Trophy } from 'lucide-react';
import { api, DailyTask } from '../services/api';
import { clsx } from 'clsx';

interface DailyTaskWidgetProps {
  userId: string;
  onTaskComplete?: () => void;
}

export const DailyTaskWidget: React.FC<DailyTaskWidgetProps> = ({ userId, onTaskComplete }) => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [userId]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const response = await api.getTodaysTasks(userId);
      setTasks(response.data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleUnitComplete = async (taskId: string, unitIndex: number) => {
    setCompletingTask(taskId);
    try {
      await api.completeTaskUnit(taskId, unitIndex);
      setTasks(prev => prev.map(task => {
        if (task._id !== taskId) return task;
        const updatedUnits = task.microUnits.map((unit, i) =>
          i === unitIndex ? { ...unit, completed: true } : unit
        );
        const allComplete = updatedUnits.every(u => u.completed);
        return {
          ...task,
          microUnits: updatedUnits,
          status: allComplete ? 'completed' : task.status,
        };
      }));
      onTaskComplete?.();
    } catch (err) {
      console.error('Failed to complete unit:', err);
    } finally {
      setCompletingTask(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center">
        <Clock className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks for today</h3>
        <p className="text-gray-500 mb-4">Generate your personalized daily tasks to get started</p>
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          onClick={() => window.location.href = '/recommendations'}
        >
          Get Recommendations
        </button>
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Today's Tasks</h2>
          <p className="text-sm text-gray-500">
            {completedCount} of {totalCount} completed
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / Math.max(totalCount, 1)) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600">
            {Math.round((completedCount / Math.max(totalCount, 1)) * 100)}%
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const isExpanded = expandedTasks.has(task._id);
          const completedUnits = task.microUnits.filter(u => u.completed).length;
          const totalUnits = task.microUnits.length;

          return (
            <div
              key={task._id}
              className={clsx(
                'bg-white rounded-xl border p-4 transition-all',
                task.status === 'completed' && 'border-green-200 bg-green-50',
                task.status === 'in_progress' && 'border-blue-200 bg-blue-50',
                task.status === 'pending' && 'border-gray-100'
              )}
            >
              {/* Task Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(task.status))}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', getDifficultyColor(task.difficultyLevel))}>
                      {task.difficultyLevel}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {task.courseId?.title || 'Course'} • {task.estimatedMinutes} min
                  </p>
                </div>
                <button
                  onClick={() => toggleTaskExpansion(task._id)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>

              {/* Micro Units */}
              <div className={clsx('mt-3 space-y-2 transition-all duration-200', !isExpanded && 'hidden')}>
                {task.microUnits.map((unit, index) => (
                  <div
                    key={index}
                    className={clsx(
                      'flex items-center space-x-3 p-3 rounded-lg transition-colors',
                      unit.completed && 'bg-green-50 border border-green-100',
                      !unit.completed && 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                    )}
                  >
                    <button
                      onClick={() => !unit.completed && handleUnitComplete(task._id, index)}
                      disabled={unit.completed || completingTask === task._id}
                      className={clsx(
                        'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                        unit.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 text-transparent hover:border-indigo-400'
                      )}
                    >
                      {unit.completed && <Check className="w-3.5 h-3.5" />}
                      {completingTask === task._id && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                    </button>
                    <span className={clsx(
                      'flex-1 text-sm',
                      unit.completed && 'text-gray-500 line-through',
                      !unit.completed && 'text-gray-700'
                    )}>
                      {unit.step}
                    </span>
                    {unit.completed && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                  </div>
                ))}

                {/* Unit Progress */}
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
                      style={{ width: `${(completedUnits / Math.max(totalUnits, 1)) * 100}%` }}
                    />
                  </div>
                  <span>{completedUnits}/{totalUnits} steps</span>
                </div>
              </div>

              {/* Expand/Collapse Summary */}
              {!isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                  <span>{completedUnits}/{totalUnits} steps completed</span>
                  <span className="text-indigo-600 font-medium">Click to expand</span>
                </div>
              )}

              {isExpanded && completedUnits === totalUnits && totalUnits > 0 && (
                <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-700">All steps completed! Great job!</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {completedCount === totalCount && totalCount > 0 && (
        <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl text-center">
          <Trophy className="w-10 h-10 mx-auto text-green-500 mb-2" />
          <h3 className="font-semibold text-green-800">All tasks completed!</h3>
          <p className="text-sm text-green-600 mt-1">Keep up the momentum tomorrow!</p>
        </div>
      )}
    </div>
  );
};