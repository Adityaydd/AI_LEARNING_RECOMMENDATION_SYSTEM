import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle, X, Brain, Target, Clock, Loader2 } from 'lucide-react';
import { useAuthStore } from '../hooks/useAuthStore';
import { clsx } from 'clsx';

interface OnboardingQuestion {
  id: string;
  text: string;
  type: 'single' | 'multiple' | 'scale';
  options?: Array<{ value: string; label: string; description?: string }>;
  min?: number;
  max?: number;
  step?: number;
}

const questions: OnboardingQuestion[] = [
  {
    id: 'targetDomain',
    text: 'What is your primary learning goal?',
    type: 'single',
    options: [
      { value: 'Web Development', label: 'Web Development', description: 'Frontend, backend, full-stack' },
      { value: 'Data Science', label: 'Data Science', description: 'Analysis, visualization, statistics' },
      { value: 'Machine Learning', label: 'Machine Learning', description: 'ML models, deep learning, AI' },
      { value: 'DevOps & Cloud', label: 'DevOps & Cloud', description: 'Docker, Kubernetes, AWS, CI/CD' },
      { value: 'Mobile Development', label: 'Mobile Development', description: 'iOS, Android, React Native, Flutter' },
      { value: 'Cybersecurity', label: 'Cybersecurity', description: 'Security, penetration testing, compliance' },
      { value: 'Backend Engineering', label: 'Backend Engineering', description: 'APIs, databases, microservices' },
      { value: 'Frontend Engineering', label: 'Frontend Engineering', description: 'React, Vue, CSS, performance' },
    ],
  },
  {
    id: 'currentLevel',
    text: 'How would you rate your current skill level?',
    type: 'single',
    options: [
      { value: 'beginner', label: 'Beginner', description: 'Just starting out, little to no experience' },
      { value: 'intermediate', label: 'Intermediate', description: 'Some experience, can build basic projects' },
      { value: 'advanced', label: 'Advanced', description: 'Experienced, comfortable with complex systems' },
      { value: 'expert', label: 'Expert', description: 'Deep expertise, can architect large systems' },
    ],
  },
  {
    id: 'studyTime',
    text: 'How much time can you dedicate daily?',
    type: 'scale',
    min: 15,
    max: 120,
    step: 15,
  },
];

export const OnboardingView: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleAnswer = (value: string | number) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
    setError(null);
  };

  const handleNext = async () => {
    if (!answers[currentQuestion.id]) {
      setError('Please select an answer before continuing');
      return;
    }

    if (currentStep === questions.length - 1) {
      await completeOnboarding();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeOnboarding = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // In a real app, we'd send answers to the backend
      // For demo, we'll just mark onboarding as complete
      const mockUser = {
        _id: 'demo-user',
        name: 'Demo User',
        email: 'demo@example.com',
        role: 'learner' as const,
        onboardingCompleted: true,
        academicBackground: 'Self-taught',
        studyTimeMinutes: answers.studyTime as number,
        skills: [{ name: answers.targetDomain as string, level: answers.currentLevel as string }],
        interests: [answers.targetDomain as string],
        profileVector: [],
        disengagementRiskScore: 0,
      };

      setAuth({
        user: mockUser,
        accessToken: 'demo-token',
        refreshToken: 'demo-refresh',
      });

      navigate('/dashboard');
    } catch (err) {
      setError('Failed to complete onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAnswerOptions = () => {
    if (currentQuestion.type === 'scale') {
      return (
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-gray-500">
            <span>{currentQuestion.min} min</span>
            <span>{currentQuestion.max} min</span>
          </div>
          <input
            type="range"
            min={currentQuestion.min}
            max={currentQuestion.max}
            step={currentQuestion.step}
            value={answers[currentQuestion.id] as number || 30}
            onChange={(e) => handleAnswer(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <p className="text-center text-lg font-semibold text-indigo-600">
            {(answers[currentQuestion.id] as number || 30)} minutes per day
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {currentQuestion.options?.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleAnswer(option.value)}
            className={clsx(
              'p-4 rounded-xl border-2 transition-all text-left group',
              answers[currentQuestion.id] === option.value
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <div className="flex items-start space-x-3">
              <div className={clsx(
                'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                answers[currentQuestion.id] === option.value
                  ? 'bg-indigo-600 border-indigo-600'
                  : 'border-gray-300 group-hover:border-indigo-400'
              )}>
                {answers[currentQuestion.id] === option.value && (
                  <CheckCircle className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 group-hover:text-indigo-700">
                  {option.label}
                </p>
                {option.description && (
                  <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Step {currentStep + 1} of {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={clsx(
              'w-16 h-16 rounded-2xl flex items-center justify-center',
              currentStep === 0 && 'bg-blue-100',
              currentStep === 1 && 'bg-green-100',
              currentStep === 2 && 'bg-purple-100'
            )}>
              {currentStep === 0 && <Target className="w-8 h-8 text-blue-600" />}
              {currentStep === 1 && <Brain className="w-8 h-8 text-green-600" />}
              {currentStep === 2 && <Clock className="w-8 h-8 text-purple-600" />}
            </div>
          </div>

          {/* Question */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {currentQuestion.text}
          </h2>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center space-x-2">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Answer Options */}
          <div className="mb-8">
            {renderAnswerOptions()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0}
              className={clsx(
                'px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2',
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!answers[currentQuestion.id] || isSubmitting}
              className={clsx(
                'px-8 py-3 rounded-lg font-medium transition-all flex items-center space-x-2',
                !answers[currentQuestion.id] || isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Completing...</span>
                </>
              ) : currentStep === questions.length - 1 ? (
                <>
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Powered by AI-driven personalized learning
        </p>
      </div>
    </div>
  );
};