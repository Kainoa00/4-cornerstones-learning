import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Ear, FileText, Hand, ArrowLeftRight, Sparkles } from 'lucide-react';

const DEMO_STUDENTS = [
    { name: 'Sarah', style: 'visual', percentage: 52, color: 'blue', icon: Eye },
    { name: 'Marcus', style: 'auditory', percentage: 48, color: 'green', icon: Ear },
    { name: 'Emma', style: 'reading_writing', percentage: 45, color: 'purple', icon: FileText },
    { name: 'James', style: 'kinesthetic', percentage: 46, color: 'orange', icon: Hand },
];

const VARK_LABELS = {
    visual: 'Visual Learner',
    auditory: 'Auditory Learner',
    reading_writing: 'Reading/Writing Learner',
    kinesthetic: 'Kinesthetic Learner',
};

const SAMPLE_CONTENT = {
    visual: {
        title: "VISUAL: The T-Account System",
        preview: "📊 Diagrams, charts, and color-coded systems",
        content: "Think of your business as two buckets:\n🪣 LEFT bucket = Things you OWN (Assets)\n🪣 RIGHT bucket = Things you OWE (Liabilities)",
    },
    auditory: {
        title: "AUDITORY: The Money Flow Story",
        preview: "🎧 Stories, sounds, and verbal explanations",
        content: "Imagine you're starting a lemonade stand. You reach into your piggy bank and pull out $100. *Hear the coins clinking?* That's your first transaction!",
    },
    reading_writing: {
        title: "READING/WRITING: Formal Definitions",
        preview: "📖 Written text, definitions, and structured notes",
        content: "Debit (Dr.): An accounting entry that increases assets/expenses or decreases liabilities/equity.\n\nCredit (Cr.): An accounting entry that increases liabilities/equity or decreases assets/expenses.",
    },
    kinesthetic: {
        title: "KINESTHETIC: Hands-On Practice",
        preview: "✋ Physical activities and interactive exercises",
        content: "Grab your wallet right now.\n\nTransaction 1: Buy supplies for $50 cash.\n- LEFT hand: Place $50 in 'Supplies' envelope\n- RIGHT hand: Take $50 from wallet",
    },
};

export default function VARKComparisonDemo({ onClose }) {
    const [selectedStudent, setSelectedStudent] = useState(0);
    const [showComparison, setShowComparison] = useState(false);

    const currentStudent = DEMO_STUDENTS[selectedStudent];
    const Icon = currentStudent.icon;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-8 h-8" />
                            <h2 className="text-4xl font-serif font-bold">
                                VARK Personalization Demo
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-semibold transition-colors"
                        >
                            Close
                        </button>
                    </div>
                    <p className="text-xl text-white/90">
                        See how the SAME content adapts for different learning styles
                    </p>
                </div>

                <div className="p-8">
                    {/* Student Selector */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <ArrowLeftRight className="w-5 h-5" />
                            Select a Student to See Their Personalized View:
                        </h3>
                        <div className="grid grid-cols-4 gap-4">
                            {DEMO_STUDENTS.map((student, index) => {
                                const StudentIcon = student.icon;
                                const isSelected = selectedStudent === index;
                                return (
                                    <motion.button
                                        key={student.name}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedStudent(index)}
                                        className={`p-6 rounded-2xl border-3 transition-all ${
                                            isSelected
                                                ? `border-${student.color}-500 bg-${student.color}-50 shadow-lg`
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex flex-col items-center gap-3">
                                            <div className={`w-16 h-16 rounded-full bg-${student.color}-100 flex items-center justify-center`}>
                                                <StudentIcon className={`w-8 h-8 text-${student.color}-600`} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{student.name}</h4>
                                                <p className={`text-sm font-medium text-${student.color}-600`}>
                                                    {student.percentage}% {VARK_LABELS[student.style].split(' ')[0]}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Comparison Toggle */}
                    <div className="mb-6 flex items-center justify-center gap-4">
                        <button
                            onClick={() => setShowComparison(!showComparison)}
                            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-bold text-lg hover:shadow-lg transition-all flex items-center gap-3"
                        >
                            <ArrowLeftRight className="w-6 h-6" />
                            {showComparison ? 'Hide' : 'Show'} All Learning Styles Side-by-Side
                        </button>
                    </div>

                    {/* Content Display */}
                    {showComparison ? (
                        /* Side-by-Side Comparison */
                        <div className="grid grid-cols-2 gap-6">
                            {DEMO_STUDENTS.map((student) => {
                                const content = SAMPLE_CONTENT[student.style];
                                const isHighlighted = student.name === currentStudent.name;
                                return (
                                    <motion.div
                                        key={student.name}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-6 rounded-2xl ${
                                            isHighlighted
                                                ? `bg-${student.color}-50 border-4 border-${student.color}-400 shadow-xl`
                                                : 'bg-gray-50 border-2 border-gray-200'
                                        }`}
                                    >
                                        {isHighlighted && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <Sparkles className={`w-5 h-5 text-${student.color}-600`} />
                                                <span className={`font-bold text-${student.color}-600`}>
                                                    {student.name}'s Personalized View
                                                </span>
                                            </div>
                                        )}
                                        <h4 className="font-bold text-gray-900 mb-2">{content.title}</h4>
                                        <p className={`text-sm text-${student.color}-600 font-medium mb-3`}>
                                            {content.preview}
                                        </p>
                                        <p className="text-gray-700 whitespace-pre-line">{content.content}</p>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Single Student View */
                        <motion.div
                            key={currentStudent.name}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`p-8 rounded-3xl bg-gradient-to-br from-${currentStudent.color}-50 via-white to-${currentStudent.color}-50 border-4 border-${currentStudent.color}-400 shadow-2xl`}
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`w-20 h-20 rounded-full bg-${currentStudent.color}-100 flex items-center justify-center`}>
                                    <Icon className={`w-10 h-10 text-${currentStudent.color}-600`} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold text-gray-900">{currentStudent.name}'s View</h3>
                                    <p className={`text-lg font-semibold text-${currentStudent.color}-600`}>
                                        {VARK_LABELS[currentStudent.style]} ({currentStudent.percentage}%)
                                    </p>
                                </div>
                                <div className={`ml-auto bg-${currentStudent.color}-600 text-white px-6 py-3 rounded-full flex items-center gap-2`}>
                                    <Sparkles className="w-5 h-5" />
                                    <span className="font-bold">Personalized!</span>
                                </div>
                            </div>

                            <div className={`bg-white p-6 rounded-2xl border-2 border-${currentStudent.color}-200`}>
                                <h4 className="text-2xl font-bold text-gray-900 mb-3">
                                    {SAMPLE_CONTENT[currentStudent.style].title}
                                </h4>
                                <p className={`text-lg text-${currentStudent.color}-600 font-medium mb-4`}>
                                    {SAMPLE_CONTENT[currentStudent.style].preview}
                                </p>
                                <div className="prose prose-lg">
                                    <p className="whitespace-pre-line text-gray-700">
                                        {SAMPLE_CONTENT[currentStudent.style].content}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                                <p className="text-center text-gray-700">
                                    <strong>💡 Key Insight:</strong> All 4 students learn the SAME concept,
                                    but in the way that works best for THEM!
                                </p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
