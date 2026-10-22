import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle, Target, Brain, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../hooks/useAuthStore';
import { api } from '../services/api';
import { clsx } from 'clsx';

interface DomainOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

const domainOptions: DomainOption[] = [
  { value: 'Web Development', label: 'Web Development', description: 'Frontend, backend, full-stack', icon: '🌐' },
  { value: 'Data Science', label: 'Data Science', description: 'Analysis, visualization, statistics', icon: '📊' },
  { value: 'Machine Learning', label: 'Machine Learning', description: 'ML models, deep learning, AI', icon: '🤖' },
  { value: 'DevOps & Cloud', label: 'DevOps & Cloud', description: 'Docker, Kubernetes, AWS, CI/CD', icon: '☁️' },
  { value: 'Mobile Development', label: 'Mobile Development', description: 'iOS, Android, React Native, Flutter', icon: '📱' },
  { value: 'Cybersecurity', label: 'Cybersecurity', description: 'Security, penetration testing, compliance', icon: '🔒' },
  { value: 'Backend Engineering', label: 'Backend Engineering', description: 'APIs, databases, microservices', icon: '⚙️' },
  { value: 'Frontend Engineering', label: 'Frontend Engineering', description: 'React, Vue, CSS, performance', icon: '🎨' },
  { value: 'Database Systems', label: 'Database Systems', description: 'SQL, NoSQL, optimization, scaling', icon: '🗄️' },
  { value: 'Software Architecture', label: 'Software Architecture', description: 'System design, patterns, scalability', icon: '🏗️' },
];

const SKILLS_BY_DOMAIN: Record<string, string[]> = {
  'Web Development': ['JavaScript', 'TypeScript', 'React', 'Vue.js', 'Node.js', 'Express', 'Next.js', 'HTML/CSS', 'Tailwind CSS', 'GraphQL', 'REST APIs', 'Webpack', 'Vite'],
  'Data Science': ['Python', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'Jupyter', 'SQL', 'Data Visualization', 'Statistics', 'ETL', 'Data Cleaning'],
  'Machine Learning': ['TensorFlow', 'PyTorch', 'Scikit-learn', 'Deep Learning', 'NLP', 'Computer Vision', 'Model Deployment', 'MLOps', 'Feature Engineering', 'Transformers'],
  'DevOps & Cloud': ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD', 'Linux', 'Bash', 'Monitoring', 'Infrastructure as Code'],
  'Mobile Development': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android', 'Mobile UI/UX', 'App Store Deployment'],
  'Cybersecurity': ['Network Security', 'Cryptography', 'Penetration Testing', 'OWASP', 'Security Auditing', 'Incident Response', 'Compliance'],
  'Backend Engineering': ['Go', 'Java', 'Spring Boot', 'PostgreSQL', 'MongoDB', 'Redis', 'Microservices', 'Message Queues', 'System Design'],
  'Frontend Engineering': ['React', 'TypeScript', 'CSS', 'Tailwind CSS', 'Vue.js', 'Next.js', 'State Management', 'Testing', 'Accessibility', 'Performance'],
  'Database Systems': ['SQL', 'NoSQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Data Modeling', 'Query Optimization', 'Replication'],
  'Software Architecture': ['System Design', 'Design Patterns', 'Domain-Driven Design', 'Event-Driven Architecture', 'Scalability', 'Performance Optimization'],
};

export const OnboardingView: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<'domain' | 'skills'>('domain');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domainSkills, setDomainSkills] = useState<string[]>([]);

  // Check if user already has onboarding answers
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const res = await api.getOnboardingStatus();
        const { onboardingCompleted, currentStep: step, answers } = res.data;

        if (onboardingCompleted) {
          navigate('/dashboard', { replace: true });
          return;
        }

        if (step === 'skills' && answers.targetDomain) {
          setSelectedDomain(answers.targetDomain);
          setDomainSkills(SKILLS_BY_DOMAIN[answers.targetDomain] || []);
          if (answers.skills && answers.skills.length > 0) {
            setSelectedSkills(answers.skills);
          }
          setCurrentStep('skills');
        }
      } catch (err) {
        console.error('Failed to check onboarding status:', err);
      }
    };

    checkOnboardingStatus();
  }, [navigate]);

  const handleDomainSelect = (domain: string) => {
    setSelectedDomain(domain);
    setError(null);
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
    setError(null);
  };

  const handleNext = async () => {
    if (currentStep === 'domain') {
      if (!selectedDomain) {
        setError('Please select a learning domain');
        return;
      }

      setIsSubmitting(true);
      try {
        // Save domain to backend
        const res = await api.submitOnboardingStep1({ targetDomain: selectedDomain });
        setDomainSkills(res.data.skills);
        setCurrentStep('skills');
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to save domain. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else if (currentStep === 'skills') {
      if (selectedSkills.length === 0) {
        setError('Please select at least one skill');
        return;
      }

      setIsSubmitting(true);
      try {
        // Save skills to backend
        await api.submitOnboardingStep2({ skills: selectedSkills });
        // Complete onboarding
        await completeOnboarding();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to save skills. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const completeOnboarding = async () => {
    try {
      const res = await api.completeOnboarding();
      if (res.data.success && res.data.user) {
        // Update auth store with completed user data
        const state = useAuthStore.getState();
        setAuth({
          user: res.data.user,
          accessToken: state.accessToken || '',
          refreshToken: state.refreshToken || '',
        });
        navigate('/recommendations', { replace: true });
      } else {
        setError('Onboarding completed but failed to get user data');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete onboarding');
    }
  };

  const handleBack = () => {
    if (currentStep === 'skills') {
      setCurrentStep('domain');
    }
  };

  const renderDomainStep = () => (
    <div className="space-y-4">
      <p className="text-gray-600 text-center mb-4">
        Choose your primary learning goal to personalize your experience
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {domainOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleDomainSelect(option.value)}
            className={clsx(
              'p-4 rounded-xl border-2 transition-all text-left group relative',
              selectedDomain === option.value
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <div className="flex items-start space-x-3">
              <div className={clsx(
                'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors',
                selectedDomain === option.value
                  ? 'bg-indigo-100'
                  : 'bg-gray-100 group-hover:bg-indigo-50'
              )}>
                {option.icon}
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
            {selectedDomain === option.value && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const renderSkillsStep = () => {
    const skills = domainSkills.length > 0 ? domainSkills : SKILLS_BY_DOMAIN[selectedDomain] || [];

    return (
      <div className="space-y-4">
        <p className="text-gray-600 text-center mb-4">
          Select skills you want to learn or improve in <strong className="text-indigo-600">{selectedDomain}</strong>
        </p>
        <div className="max-h-96 overflow-y-auto">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => handleSkillToggle(skill)}
                className={clsx(
                  'p-3 rounded-lg border transition-all text-left group',
                  selectedSkills.includes(skill)
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className={clsx(
                    'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                    selectedSkills.includes(skill)
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'border-gray-300 group-hover:border-indigo-400'
                  )}>
                    {selectedSkills.includes(skill) && (
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-indigo-700 text-sm">
                    {skill}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
        {selectedSkills.length > 0 && (
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
            <p className="text-sm text-indigo-700">
              <strong>{selectedSkills.length}</strong> skill{selectedSkills.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}
      </div>
    );
  };

  const stepIcons = {
    domain: <Target className="w-8 h-8 text-blue-600" />,
    skills: <Brain className="w-8 h-8 text-green-600" />,
  };

  const stepColors = {
    domain: 'bg-blue-100',
    skills: 'bg-green-100',
  };

  const stepTitles = {
    domain: 'Learning Goal',
    skills: 'Skills',
  };

  const stepDescriptions = {
    domain: 'What do you want to learn?',
    skills: 'Which skills interest you?',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Step {currentStep === 'domain' ? 1 : 2} of 2</span>
            <span>{currentStep === 'domain' ? 50 : 100}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
              style={{ width: `${currentStep === 'domain' ? 50 : 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className={clsx(
              'w-16 h-16 rounded-2xl flex items-center justify-center',
              stepColors[currentStep]
            )}>
              {stepIcons[currentStep]}
            </div>
          </div>

          {/* Question */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">
            {stepTitles[currentStep]}
          </h2>
          <p className="text-gray-500 text-center mb-6">
            {stepDescriptions[currentStep]}
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Answer Options */}
          <div className="mb-8">
            {currentStep === 'domain' ? renderDomainStep() : renderSkillsStep()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 'domain' || isSubmitting}
              className={clsx(
                'px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2',
                currentStep === 'domain' || isSubmitting
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
              disabled={
                (currentStep === 'domain' && !selectedDomain) ||
                (currentStep === 'skills' && selectedSkills.length === 0) ||
                isSubmitting
              }
              className={clsx(
                'px-8 py-3 rounded-lg font-medium transition-all flex items-center space-x-2',
                ((currentStep === 'domain' && !selectedDomain) ||
                (currentStep === 'skills' && selectedSkills.length === 0) ||
                isSubmitting)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{currentStep === 'skills' ? 'Completing...' : 'Continue'}</span>
                </>
              ) : currentStep === 'skills' ? (
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