import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Check,
    Loader2,
    AlertCircle,
    Calendar,
    FileText,
    Users as UsersIcon,
} from 'lucide-react';
import { assignMaterialToClass } from '../services/materialService';

export default function ShareMaterialModal({ material, classes, onClose, onShare }) {
    const [selectedClass, setSelectedClass] = useState('');
    const [assignmentType, setAssignmentType] = useState('optional');
    const [dueDate, setDueDate] = useState('');
    const [teacherNotes, setTeacherNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleShare = async () => {
        if (!selectedClass) {
            setError('Please select a class');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await assignMaterialToClass({
                materialId: material.id,
                classId: selectedClass,
                assignmentType,
                dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                teacherNotes: teacherNotes || null,
            });

            onShare();
        } catch (err) {
            console.error('Error sharing material:', err);
            setError(err.message || 'Failed to share material. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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
                    className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-serif font-bold">Share Material</h2>
                                <p className="text-purple-100 text-sm">Assign to a class</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                        {/* Material Preview */}
                        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                            <p className="text-sm text-purple-600 font-medium mb-1">Material</p>
                            <p className="font-semibold text-gray-900">{material.title}</p>
                            {material.description && (
                                <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                            )}
                        </div>

                        <div className="space-y-5">
                            {/* Select Class */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Assign to Class *
                                </label>
                                <div className="relative">
                                    <UsersIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <select
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none appearance-none bg-white"
                                        required
                                    >
                                        <option value="">Choose a class...</option>
                                        {classes.map((cls) => (
                                            <option key={cls.id} value={cls.id}>
                                                {cls.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Assignment Type */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Assignment Type
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'required', label: 'Required', color: 'red' },
                                        { value: 'optional', label: 'Optional', color: 'blue' },
                                        { value: 'supplemental', label: 'Supplemental', color: 'purple' },
                                    ].map((type) => (
                                        <button
                                            key={type.value}
                                            onClick={() => setAssignmentType(type.value)}
                                            className={`p-3 rounded-xl border-2 font-medium transition-all ${
                                                assignmentType === type.value
                                                    ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                            }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Due Date (Optional) */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Due Date (Optional)
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Teacher Notes */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Instructions for Students (Optional)
                                </label>
                                <textarea
                                    value={teacherNotes}
                                    onChange={(e) => setTeacherNotes(e.target.value)}
                                    placeholder="Add any special instructions or context..."
                                    rows={4}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                                />
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl"
                                >
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-gray-50 border-t border-gray-100">
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 border-2 border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleShare}
                                disabled={loading || !selectedClass}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Sharing...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Share Material
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
