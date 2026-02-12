import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle, Brain, TrendingUp, Users, BookOpen, Target } from 'lucide-react';
import questionsData from '../data/varkQuestions.json';
import { calculateVARKScores, interpretVARKResults, getStyleColor } from '../utils/varkCalculator';

export default function VarkAssessment({ onComplete }) {
    const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [responses, setResponses] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState(null);
    const [showDomainIntro, setShowDomainIntro] = useState(true);

    const domains = questionsData.domains;
    const currentDomain = domains[currentDomainIndex];
    const currentQuestion = currentDomain.questions[currentQuestionIndex];
    const totalQuestions = domains.reduce((sum, d) => sum + d.questions.length, 0);
    const answeredQuestions = responses.length;

    // Domain icons mapping
    const domainIcons = {
        information_processing: Brain,
        problem_solving: TrendingUp,
        collaboration_communication: Users,
        study_review: BookOpen,
        application_practice: Target,
    };

    const DomainIcon = domainIcons[currentDomain.id] || Brain;

    useEffect(() => {
        // Show domain intro at the start of each domain
        if (currentQuestionIndex === 0) {
            setShowDomainIntro(true);
            const timer = setTimeout(() => setShowDomainIntro(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [currentDomainIndex, currentQuestionIndex]);

    const handleAnswer = (selectedStyle) => {
        // Record response with domain weight
        const response = {
            questionId: currentQuestion.id,
            domainId: currentDomain.id,
            selectedStyle,
            domainWeight: currentDomain.weight,
        };

        const newResponses = [...responses, response];
        setResponses(newResponses);

        // Move to next question or domain
        if (currentQuestionIndex < currentDomain.questions.length - 1) {
            // Next question in current domain
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else if (currentDomainIndex < domains.length - 1) {
            // Next domain
            setCurrentDomainIndex(currentDomainIndex + 1);
            setCurrentQuestionIndex(0);
        } else {
            // Assessment complete - calculate results
            const scores = calculateVARKScores(newResponses);
            const interpretation = interpretVARKResults(scores);
            setResults({ scores, interpretation });
            setShowResults(true);
        }
    };

    const getProgressPercentage = () => {
        return (answeredQuestions / totalQuestions) * 100;
    };

    // Style colors for result cards
    const styleColors = {
        visual: { bg: 'from-purple-500 to-purple-600', icon: '👁️', name: 'Visual' },
        auditory: { bg: 'from-cyan-500 to-cyan-600', icon: '👂', name: 'Auditory' },
        reading_writing: { bg: 'from-emerald-500 to-emerald-600', icon: '📖', name: 'Reading/Writing' },
        kinesthetic: { bg: 'from-red-500 to-red-600', icon: '✋', name: 'Kinesthetic' },
    };

    if (showResults && results) {
        const sortedScores = Object.entries(results.scores).sort(([, a], [, b]) => b - a);

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-4xl mx-auto"
            >
                {/* Success Header */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-12"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
                    >
                        <CheckCircle className="w-10 h-10 text-white" />
                    </motion.div>
                    <h2 className="text-5xl font-serif font-bold text-gray-900 mb-4">
                        Assessment Complete!
                    </h2>
                    <p className="text-xl text-gray-600">
                        {results.interpretation.interpretation}
                    </p>
                </motion.div>

                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {sortedScores.map(([style, percentage], index) => {
                        const styleInfo = styleColors[style];
                        return (
                            <motion.div
                                key={style}
                                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{ delay: 0.4 + index * 0.1, type: 'spring' }}
                                className="relative bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100 overflow-hidden"
                            >
                                {/* Background gradient */}
                                <div
                                    className={`absolute inset-0 bg-gradient-to-br ${styleInfo.bg} opacity-5`}
                                ></div>

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-4xl">{styleInfo.icon}</span>
                                            <h3 className="text-xl font-serif font-bold text-gray-900">
                                                {styleInfo.name}
                                            </h3>
                                        </div>
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.6 + index * 0.1, type: 'spring', stiffness: 150 }}
                                            className="text-3xl font-bold text-gray-900"
                                        >
                                            {percentage}%
                                        </motion.div>
                                    </div>

                                    {/* Animated Progress Bar */}
                                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            transition={{ delay: 0.7 + index * 0.1, duration: 0.8, ease: 'easeOut' }}
                                            className={`h-full bg-gradient-to-r ${styleInfo.bg} rounded-full`}
                                        ></motion.div>
                                    </div>

                                    {/* Dominant/Secondary Badge */}
                                    {index === 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 1.2 }}
                                            className="mt-3 inline-block px-3 py-1 bg-amber-100 border border-amber-300 rounded-full text-xs font-semibold text-amber-800"
                                        >
                                            🏆 Dominant Style
                                        </motion.div>
                                    )}
                                    {index === 1 && percentage >= 25 && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 1.3 }}
                                            className="mt-3 inline-block px-3 py-1 bg-purple-100 border border-purple-300 rounded-full text-xs font-semibold text-purple-800"
                                        >
                                            ⭐ Secondary Style
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Description Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.4 }}
                    className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border-2 border-purple-100 mb-8"
                >
                    <h3 className="text-2xl font-serif font-bold text-gray-900 mb-4">
                        What This Means For You
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-purple-900 mb-2">
                                Your Primary Learning Style: {results.interpretation.dominant.name}
                            </h4>
                            <p className="text-gray-700 leading-relaxed">
                                {results.interpretation.dominant.description}
                            </p>
                        </div>
                        {results.interpretation.secondary && (
                            <div className="pt-4 border-t border-purple-200">
                                <h4 className="font-semibold text-purple-900 mb-2">
                                    Your Secondary Style: {results.interpretation.secondary.name}
                                </h4>
                                <p className="text-gray-700 leading-relaxed">
                                    {results.interpretation.secondary.description}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Complete Button */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onComplete(results.scores)}
                    className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold text-lg rounded-xl transition-all shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 flex items-center justify-center gap-2"
                >
                    Continue to Your Dashboard
                    <ArrowRight className="w-5 h-5" />
                </motion.button>
            </motion.div>
        );
    }

    return (
        <div className="w-full max-w-3xl mx-auto">
            {/* Progress Bar */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <span className="font-medium">
                        Question {answeredQuestions + 1} of {totalQuestions}
                    </span>
                    <span className="font-medium">{Math.round(getProgressPercentage())}% Complete</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${getProgressPercentage()}%` }}
                        transition={{ duration: 0.3 }}
                    ></motion.div>
                </div>
            </motion.div>

            <AnimatePresence mode="wait">
                {/* Domain Introduction */}
                {showDomainIntro && currentQuestionIndex === 0 && (
                    <motion.div
                        key={`domain-intro-${currentDomainIndex}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        transition={{ duration: 0.4 }}
                        className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-12 text-center text-white shadow-2xl"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
                            className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6"
                        >
                            <DomainIcon className="w-10 h-10 text-white" />
                        </motion.div>
                        <motion.h3
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl font-serif font-bold mb-3"
                        >
                            {currentDomain.name}
                        </motion.h3>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-lg text-purple-100"
                        >
                            {currentDomain.description}
                        </motion.p>
                    </motion.div>
                )}

                {/* Question Card */}
                {!showDomainIntro && (
                    <motion.div
                        key={`question-${answeredQuestions}`}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className="relative bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden"
                    >
                        {/* Geometric corner accents */}
                        <div className="absolute top-0 left-0 w-20 h-20 opacity-10">
                            <svg viewBox="0 0 80 80" className="w-full h-full">
                                <path d="M 0 0 L 80 0 L 0 80 Z" fill="#9333EA" />
                            </svg>
                        </div>
                        <div className="absolute bottom-0 right-0 w-20 h-20 opacity-10 rotate-180">
                            <svg viewBox="0 0 80 80" className="w-full h-full">
                                <path d="M 0 0 L 80 0 L 0 80 Z" fill="#9333EA" />
                            </svg>
                        </div>

                        <div className="relative z-10 p-8 md:p-10">
                            {/* Domain Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-full mb-6 text-sm font-medium text-purple-700">
                                <DomainIcon className="w-4 h-4" />
                                {currentDomain.name}
                            </div>

                            {/* Question */}
                            <h3 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-8 leading-snug">
                                {currentQuestion.question}
                            </h3>

                            {/* Options */}
                            <div className="space-y-4">
                                {currentQuestion.options.map((option, index) => (
                                    <motion.button
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * index }}
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleAnswer(option.style)}
                                        className="w-full group text-left p-5 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center gap-4"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center text-xl transition-colors flex-shrink-0">
                                            {String.fromCharCode(65 + index)}
                                        </div>
                                        <span className="text-gray-700 group-hover:text-purple-900 font-medium leading-relaxed flex-1">
                                            {option.text}
                                        </span>
                                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" />
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Decorative background blur */}
            <div className="fixed -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-purple-200 via-transparent to-blue-200 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
        </div>
    );
}
