import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Users,
    BookOpen,
    Loader2,
    ExternalLink,
    UserCircle,
    Check,
    AlertCircle,
    MessageSquare,
} from 'lucide-react';
import { getMyClasses, joinClassWithCode } from '../services/classService';
import { supabase } from '../supabaseClient';
import { formatStyleName } from '../utils/varkCalculator';
// import StudentMaterials from '../components/StudentMaterials';
// import NotificationCenter from '../components/NotificationCenter';
import DiscussionBoard from '../components/DiscussionBoard';
import StudyGroups from '../components/StudyGroups';
import ClassMaterialsViewer from '../components/ClassMaterialsViewer';

export default function StudentDashboard() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [profile, setProfile] = useState(null);
    const [selectedClassForDiscussions, setSelectedClassForDiscussions] = useState(null);
    const [selectedClassForGroups, setSelectedClassForGroups] = useState(null);
    const [viewingClass, setViewingClass] = useState(null);

    useEffect(() => {
        loadClasses();
        loadProfile();
    }, []);

    const loadProfile = async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            setProfile(data);
        }
    };

    const loadClasses = async () => {
        try {
            const data = await getMyClasses();
            setClasses(data);
        } catch (error) {
            console.error('Error loading classes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinClass = async (inviteCode) => {
        await joinClassWithCode(inviteCode);
        await loadClasses();
        setShowJoinModal(false);
    };

    const getDominantStyle = () => {
        if (!profile) return null;
        const styles = {
            visual: profile.vark_visual || 0,
            auditory: profile.vark_auditory || 0,
            reading_writing: profile.vark_reading_writing || 0,
            kinesthetic: profile.vark_kinesthetic || 0,
        };
        const dominant = Object.keys(styles).reduce((a, b) =>
            styles[a] > styles[b] ? a : b
        );
        return { style: dominant, percentage: styles[dominant] };
    };

    const styleIcons = {
        visual: '👁️',
        auditory: '👂',
        reading_writing: '📖',
        kinesthetic: '✋',
    };

    const dominantStyle = getDominantStyle();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-500 rounded-lg"></div>
                            <span className="font-serif font-bold text-xl tracking-tight">4 Cornerstones</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* <NotificationCenter /> */}
                            <button
                                onClick={async () => {
                                    // Clear custom session
                                    localStorage.removeItem('supabase.auth.token');
                                    // Clear Supabase session
                                    await supabase.auth.signOut();
                                    // Redirect to login
                                    window.location.href = '/';
                                }}
                                className="text-sm text-gray-500 hover:text-red-500 transition-colors font-medium"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">
                                My Learning
                            </h1>
                            <p className="text-gray-600">
                                Your personalized learning journey
                            </p>
                        </div>
                        {dominantStyle && dominantStyle.percentage > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200 }}
                                className="flex items-center gap-3 px-5 py-3 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl"
                            >
                                <span className="text-3xl">
                                    {styleIcons[dominantStyle.style]}
                                </span>
                                <div>
                                    <p className="text-xs text-purple-600 font-medium uppercase tracking-wider">
                                        Your Learning Style
                                    </p>
                                    <p className="text-lg font-serif font-bold text-purple-900">
                                        {formatStyleName(dominantStyle.style)}
                                    </p>
                                </div>
                                <div className="text-2xl font-bold text-purple-700">
                                    {dominantStyle.percentage}%
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-12"
                >
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowJoinModal(true)}
                        className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 font-semibold text-lg"
                    >
                        <Plus className="w-6 h-6" />
                        Join a New Class
                    </motion.button>
                </motion.div>

                {/* My Materials Section - Temporarily disabled */}
                {/* <div className="mb-12">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
                        My Materials
                    </h2>
                    <StudentMaterials />
                </div> */}

                {/* Classes Section */}
                <div className="mb-8">
                    <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
                        My Classes
                        {classes.length > 0 && (
                            <span className="ml-3 text-lg font-normal text-gray-500">
                                ({classes.length})
                            </span>
                        )}
                    </h2>

                    {classes.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-2xl p-12 text-center shadow-xl border-2 border-gray-100"
                        >
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <BookOpen className="w-10 h-10 text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3">
                                Ready to Start Learning?
                            </h3>
                            <p className="text-gray-600 mb-8 max-w-md mx-auto">
                                Join your first class to access personalized learning materials tailored to
                                your learning style
                            </p>
                            <button
                                onClick={() => setShowJoinModal(true)}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Join Your First Class
                            </button>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {classes.map((classItem, index) => (
                                <motion.div
                                    key={classItem.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * index }}
                                    whileHover={{ y: -4 }}
                                    className="group relative bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all overflow-hidden"
                                >
                                    {/* Geometric corner accent */}
                                    <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                                        <svg viewBox="0 0 80 80" className="w-full h-full">
                                            <path d="M 0 0 L 80 0 L 0 80 Z" fill="#3B82F6" />
                                        </svg>
                                    </div>

                                    <div className="relative z-10 p-6">
                                        {/* Class Header */}
                                        <div className="mb-4">
                                            <h3 className="text-xl font-serif font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                                                {classItem.name}
                                            </h3>
                                            {classItem.description && (
                                                <p className="text-sm text-gray-600 line-clamp-2">
                                                    {classItem.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Teacher Info */}
                                        {classItem.teacher && (
                                            <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                                                <UserCircle className="w-4 h-4" />
                                                <span>
                                                    {classItem.teacher.username || 'Instructor'}
                                                </span>
                                            </div>
                                        )}

                                        {/* Member Count */}
                                        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                                            <Users className="w-4 h-4" />
                                            <span>
                                                {classItem.memberships?.length || 0} student
                                                {(classItem.memberships?.length || 0) !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        {/* Action Button */}
                                        <button
                                            onClick={() => {
                                                console.log('Open Class clicked:', classItem);
                                                setViewingClass(classItem);
                                            }}
                                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Open Class
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Discussions Section */}
                {classes.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
                            Discussions
                        </h2>

                        {/* Class Selector for Discussions */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Select Class
                            </label>
                            <select
                                value={selectedClassForDiscussions || ''}
                                onChange={(e) => setSelectedClassForDiscussions(e.target.value)}
                                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white min-w-[300px]"
                            >
                                <option value="">Choose a class...</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedClassForDiscussions ? (
                            <DiscussionBoard
                                classId={selectedClassForDiscussions}
                                materialId={null}
                                isTeacher={false}
                                currentUserId={profile?.id}
                            />
                        ) : (
                            <div className="text-center py-12 bg-white rounded-2xl border-2 border-gray-100">
                                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600 font-medium">Select a class to view discussions</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Join class conversations and collaborate with peers
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Study Groups Section */}
                {classes.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
                            Study Groups
                        </h2>

                        {/* Class Selector for Study Groups */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Select Class
                            </label>
                            <select
                                value={selectedClassForGroups || ''}
                                onChange={(e) => setSelectedClassForGroups(e.target.value)}
                                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white min-w-[300px]"
                            >
                                <option value="">Choose a class...</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedClassForGroups ? (
                            <StudyGroups
                                classId={selectedClassForGroups}
                                currentUserId={profile?.id}
                            />
                        ) : (
                            <div className="text-center py-12 bg-white rounded-2xl border-2 border-gray-100">
                                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600 font-medium">Select a class to view study groups</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Create or join study groups to collaborate with classmates
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Class Materials Viewer */}
            {viewingClass && (
                <>
                    {console.log('Rendering ClassMaterialsViewer with:', viewingClass, dominantStyle)}
                    <ClassMaterialsViewer
                        classId={viewingClass.id}
                        className={viewingClass.name}
                        onClose={() => setViewingClass(null)}
                        dominantStyle={dominantStyle?.style}
                    />
                </>
            )}

            {/* Join Class Modal */}
            <JoinClassModal
                isOpen={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                onJoin={handleJoinClass}
            />
        </div>
    );
}

// Join Class Modal Component
function JoinClassModal({ isOpen, onClose, onJoin }) {
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await onJoin(inviteCode.toUpperCase());
            setInviteCode('');
        } catch (err) {
            setError(err.message || 'Failed to join class. Please check the invite code.');
        } finally {
            setLoading(false);
        }
    };

    const handleCodeChange = (e) => {
        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (value.length <= 6) {
            setInviteCode(value);
            setError('');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            {/* Geometric corner accents */}
                            <div className="absolute top-0 left-0 w-16 h-16 opacity-10">
                                <svg viewBox="0 0 64 64" className="w-full h-full">
                                    <path d="M 0 0 L 64 0 L 0 64 Z" fill="#3B82F6" />
                                </svg>
                            </div>
                            <div className="absolute bottom-0 right-0 w-16 h-16 opacity-10 rotate-180">
                                <svg viewBox="0 0 64 64" className="w-full h-full">
                                    <path d="M 0 0 L 64 0 L 0 64 Z" fill="#3B82F6" />
                                </svg>
                            </div>

                            <div className="relative z-10 p-8">
                                <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">
                                    Join a Class
                                </h2>
                                <p className="text-gray-600 mb-6">
                                    Enter the 6-character invite code provided by your teacher
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Invite Code
                                        </label>
                                        <input
                                            type="text"
                                            value={inviteCode}
                                            onChange={handleCodeChange}
                                            placeholder="ABC123"
                                            className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-center text-2xl font-mono font-bold tracking-[0.5em] uppercase"
                                            maxLength={6}
                                            required
                                        />
                                        <p className="text-xs text-gray-500 mt-2 text-center">
                                            {inviteCode.length}/6 characters
                                        </p>
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

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 py-3 px-4 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading || inviteCode.length !== 6}
                                            className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Joining...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-5 h-5" />
                                                    Join Class
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
