import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Calendar,
    BookOpen,
    CheckCircle,
    Clock,
    Eye,
    Loader2,
    AlertTriangle,
} from 'lucide-react';
import { getMyAssignedMaterials, updateMaterialCompletion } from '../services/materialService';
import { getMaterialById } from '../services/materialService';

export default function StudentMaterials() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [viewingMaterial, setViewingMaterial] = useState(false);

    useEffect(() => {
        loadAssignments();
    }, []);

    const loadAssignments = async () => {
        try {
            const data = await getMyAssignedMaterials();
            setAssignments(data);
        } catch (error) {
            console.error('Error loading assignments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = async (assignment) => {
        try {
            const material = await getMaterialById(assignment.material.id);
            setSelectedMaterial({ ...material, assignment });
            setViewingMaterial(true);

            // Mark as in progress
            if (!assignment.completion || assignment.completion[0]?.status === 'not_started') {
                await updateMaterialCompletion(assignment.id, {
                    status: 'in_progress',
                    progressPercentage: 10,
                    preferredStyle: assignment.preferred_style,
                    timeSpentSeconds: 0,
                });
            }
        } catch (error) {
            console.error('Error viewing material:', error);
        }
    };

    const handleComplete = async (assignment) => {
        try {
            await updateMaterialCompletion(assignment.id, {
                status: 'completed',
                progressPercentage: 100,
                preferredStyle: assignment.preferred_style,
                timeSpentSeconds: 0, // Would track this in real implementation
            });
            await loadAssignments();
        } catch (error) {
            console.error('Error marking complete:', error);
        }
    };

    const getStatusBadge = (assignment) => {
        const completion = assignment.completion?.[0];
        const status = completion?.status || 'not_started';

        const badges = {
            not_started: { text: 'Not Started', color: 'gray', icon: Clock },
            in_progress: { text: 'In Progress', color: 'blue', icon: BookOpen },
            completed: { text: 'Completed', color: 'green', icon: CheckCircle },
        };

        return badges[status] || badges.not_started;
    };

    const isDueSoon = (dueDate) => {
        if (!dueDate) return false;
        const due = new Date(dueDate);
        const now = new Date();
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        return diffDays <= 3 && diffDays >= 0;
    };

    const isOverdue = (dueDate) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {assignments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-gray-100">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">No assignments yet</h3>
                    <p className="text-gray-600">
                        Your teacher will share learning materials with you soon
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {assignments.map((assignment, index) => {
                        const material = assignment.material;
                        const badge = getStatusBadge(assignment);
                        const StatusIcon = badge.icon;
                        const dueSoon = isDueSoon(assignment.due_date);
                        const overdue = isOverdue(assignment.due_date);

                        return (
                            <motion.div
                                key={assignment.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 * index }}
                                className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all"
                            >
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    {/* Content */}
                                    <div className="flex-1">
                                        {/* Header */}
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <FileText className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-serif font-bold text-gray-900 mb-1">
                                                    {material.title}
                                                </h3>
                                                {material.description && (
                                                    <p className="text-sm text-gray-600 line-clamp-2">
                                                        {material.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Metadata */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                                {assignment.class.name}
                                            </span>
                                            {material.subject && (
                                                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                                    {material.subject}
                                                </span>
                                            )}
                                            <span
                                                className={`px-3 py-1 text-xs font-medium rounded-full ${
                                                    assignment.assignment_type === 'required'
                                                        ? 'bg-red-100 text-red-700'
                                                        : assignment.assignment_type === 'optional'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-purple-100 text-purple-700'
                                                }`}
                                            >
                                                {assignment.assignment_type.charAt(0).toUpperCase() +
                                                    assignment.assignment_type.slice(1)}
                                            </span>
                                        </div>

                                        {/* Teacher Notes */}
                                        {assignment.teacher_notes && (
                                            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                                <p className="text-xs text-purple-600 font-medium mb-1">
                                                    Teacher's Note
                                                </p>
                                                <p className="text-sm text-gray-700">{assignment.teacher_notes}</p>
                                            </div>
                                        )}

                                        {/* Footer Info */}
                                        <div className="flex flex-wrap items-center gap-4 text-sm">
                                            {/* Status */}
                                            <div className="flex items-center gap-2">
                                                <StatusIcon
                                                    className={`w-4 h-4 ${
                                                        badge.color === 'green'
                                                            ? 'text-green-600'
                                                            : badge.color === 'blue'
                                                            ? 'text-blue-600'
                                                            : 'text-gray-400'
                                                    }`}
                                                />
                                                <span
                                                    className={`font-medium ${
                                                        badge.color === 'green'
                                                            ? 'text-green-700'
                                                            : badge.color === 'blue'
                                                            ? 'text-blue-700'
                                                            : 'text-gray-500'
                                                    }`}
                                                >
                                                    {badge.text}
                                                </span>
                                            </div>

                                            {/* Due Date */}
                                            {assignment.due_date && (
                                                <div
                                                    className={`flex items-center gap-2 ${
                                                        overdue
                                                            ? 'text-red-600'
                                                            : dueSoon
                                                            ? 'text-amber-600'
                                                            : 'text-gray-600'
                                                    }`}
                                                >
                                                    {overdue ? (
                                                        <AlertTriangle className="w-4 h-4" />
                                                    ) : (
                                                        <Calendar className="w-4 h-4" />
                                                    )}
                                                    <span className="font-medium">
                                                        {overdue
                                                            ? 'Overdue'
                                                            : dueSoon
                                                            ? 'Due Soon'
                                                            : 'Due'}{' '}
                                                        {new Date(assignment.due_date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Learning Style */}
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <span className="text-sm">
                                                    {
                                                        {
                                                            visual: '👁️ Visual',
                                                            auditory: '👂 Auditory',
                                                            reading_writing: '📖 Reading/Writing',
                                                            kinesthetic: '✋ Kinesthetic',
                                                        }[assignment.preferred_style]
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex md:flex-col gap-2">
                                        <button
                                            onClick={() => handleView(assignment)}
                                            className="flex-1 md:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View
                                        </button>
                                        {badge.text !== 'Completed' && (
                                            <button
                                                onClick={() => handleComplete(assignment)}
                                                className="flex-1 md:flex-none px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Mark Complete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Material Viewer Modal */}
            {viewingMaterial && selectedMaterial && (
                <MaterialViewerModal
                    material={selectedMaterial}
                    onClose={() => {
                        setViewingMaterial(false);
                        setSelectedMaterial(null);
                        loadAssignments(); // Refresh to update status
                    }}
                />
            )}
        </div>
    );
}

// Material Viewer Modal Component
function MaterialViewerModal({ material, onClose }) {
    const assignment = material.assignment;
    const preferredStyle = assignment.preferred_style;
    const transformation = material.transformations?.find((t) => t.learning_style === preferredStyle);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                        >
                            ✕
                        </button>
                        <h2 className="text-2xl font-serif font-bold mb-1">{material.title}</h2>
                        <p className="text-blue-100 text-sm">
                            Optimized for your{' '}
                            {
                                {
                                    visual: 'Visual',
                                    auditory: 'Auditory',
                                    reading_writing: 'Reading/Writing',
                                    kinesthetic: 'Kinesthetic',
                                }[preferredStyle]
                            }{' '}
                            learning style
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                        {transformation ? (
                            <div className="prose prose-lg max-w-none">
                                <div className="whitespace-pre-wrap">{transformation.transformed_content}</div>

                                {/* Additional Suggestions */}
                                {transformation.image_suggestions && transformation.image_suggestions.length > 0 && (
                                    <div className="mt-8 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                        <h3 className="text-lg font-semibold text-purple-900 mb-2">
                                            📌 Visual Aids
                                        </h3>
                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                            {transformation.image_suggestions.map((suggestion, i) => (
                                                <li key={i}>{suggestion}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {transformation.audio_suggestions && transformation.audio_suggestions.length > 0 && (
                                    <div className="mt-4 p-4 bg-cyan-50 border border-cyan-200 rounded-xl">
                                        <h3 className="text-lg font-semibold text-cyan-900 mb-2">
                                            🎧 Audio Activities
                                        </h3>
                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                            {transformation.audio_suggestions.map((suggestion, i) => (
                                                <li key={i}>{suggestion}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {transformation.activity_suggestions &&
                                    transformation.activity_suggestions.length > 0 && (
                                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                                            <h3 className="text-lg font-semibold text-green-900 mb-2">
                                                ✋ Hands-On Activities
                                            </h3>
                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                {transformation.activity_suggestions.map((suggestion, i) => (
                                                    <li key={i}>{suggestion}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
                                </div>
                                <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">
                                    Preparing Your Material...
                                </h3>
                                <p className="text-gray-600">
                                    AI is transforming this content to match your learning style
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-gray-50 border-t border-gray-100">
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
