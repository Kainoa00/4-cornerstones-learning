import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Plus,
    Pin,
    Lock,
    Unlock,
    ThumbsUp,
    Reply,
    CheckCircle,
    Send,
    X,
    Loader2,
    PinOff,
} from 'lucide-react';
import {
    getDiscussions,
    getDiscussionWithReplies,
    createDiscussion,
    createReply,
    toggleReplyLike,
    getUserLikes,
    updateDiscussionPin,
    updateDiscussionLock,
    updateBestAnswer,
    subscribeToDiscussions,
} from '../services/discussionService';

export default function DiscussionBoard({ classId, materialId, isTeacher, currentUserId }) {
    const [discussions, setDiscussions] = useState([]);
    const [selectedDiscussion, setSelectedDiscussion] = useState(null);
    const [showNewDiscussion, setShowNewDiscussion] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userLikes, setUserLikes] = useState(new Set());

    useEffect(() => {
        loadDiscussions();
    }, [classId, materialId]);

    useEffect(() => {
        // Subscribe to real-time updates
        const subscription = subscribeToDiscussions(
            classId,
            handleDiscussionChange,
            handleReplyChange
        );

        return () => subscription.unsubscribe();
    }, [classId]);

    const loadDiscussions = async () => {
        try {
            const data = await getDiscussions(classId, materialId);
            setDiscussions(data);
        } catch (error) {
            console.error('Error loading discussions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDiscussionChange = (payload) => {
        if (payload.eventType === 'INSERT') {
            loadDiscussions();
        } else if (payload.eventType === 'UPDATE') {
            setDiscussions((prev) =>
                prev.map((d) =>
                    d.id === payload.new.id ? { ...d, ...payload.new } : d
                )
            );
        } else if (payload.eventType === 'DELETE') {
            setDiscussions((prev) => prev.filter((d) => d.id !== payload.old.id));
        }
    };

    const handleReplyChange = (payload) => {
        // Reload selected discussion if it's open
        if (selectedDiscussion && payload.new?.discussion_id === selectedDiscussion.id) {
            loadDiscussionDetails(selectedDiscussion.id);
        }
    };

    const loadDiscussionDetails = async (discussionId) => {
        try {
            const data = await getDiscussionWithReplies(discussionId);
            setSelectedDiscussion(data);

            // Load user likes for all replies
            const replyIds = extractReplyIds(data.replies);
            const likes = await getUserLikes(replyIds);
            setUserLikes(likes);
        } catch (error) {
            console.error('Error loading discussion details:', error);
        }
    };

    const extractReplyIds = (replies) => {
        let ids = [];
        replies.forEach((reply) => {
            ids.push(reply.id);
            if (reply.children?.length > 0) {
                ids = [...ids, ...extractReplyIds(reply.children)];
            }
        });
        return ids;
    };

    const handleCreateDiscussion = async (data) => {
        try {
            await createDiscussion({
                classId,
                materialId,
                ...data,
            });
            setShowNewDiscussion(false);
            loadDiscussions();
        } catch (error) {
            console.error('Error creating discussion:', error);
            alert('Failed to create discussion');
        }
    };

    const handlePinToggle = async (discussionId, currentState) => {
        try {
            await updateDiscussionPin(discussionId, !currentState);
            loadDiscussions();
        } catch (error) {
            console.error('Error toggling pin:', error);
        }
    };

    const handleLockToggle = async (discussionId, currentState) => {
        try {
            await updateDiscussionLock(discussionId, !currentState);
            if (selectedDiscussion?.id === discussionId) {
                loadDiscussionDetails(discussionId);
            }
            loadDiscussions();
        } catch (error) {
            console.error('Error toggling lock:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                    <h2 className="text-2xl font-serif font-bold text-gray-900">
                        Discussions
                    </h2>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowNewDiscussion(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Discussion
                </motion.button>
            </div>

            {/* Discussion List */}
            {discussions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No discussions yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                        Start a conversation with your classmates
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {discussions.map((discussion) => (
                        <DiscussionCard
                            key={discussion.id}
                            discussion={discussion}
                            isTeacher={isTeacher}
                            onSelect={() => loadDiscussionDetails(discussion.id)}
                            onPinToggle={handlePinToggle}
                            onLockToggle={handleLockToggle}
                        />
                    ))}
                </div>
            )}

            {/* New Discussion Modal */}
            <AnimatePresence>
                {showNewDiscussion && (
                    <NewDiscussionModal
                        onClose={() => setShowNewDiscussion(false)}
                        onCreate={handleCreateDiscussion}
                    />
                )}
            </AnimatePresence>

            {/* Discussion Detail Modal */}
            <AnimatePresence>
                {selectedDiscussion && (
                    <DiscussionDetailModal
                        discussion={selectedDiscussion}
                        isTeacher={isTeacher}
                        currentUserId={currentUserId}
                        userLikes={userLikes}
                        onClose={() => setSelectedDiscussion(null)}
                        onReply={async (data) => {
                            await createReply(data);
                            loadDiscussionDetails(selectedDiscussion.id);
                        }}
                        onLike={async (replyId) => {
                            const isLiked = await toggleReplyLike(replyId);
                            setUserLikes((prev) => {
                                const newSet = new Set(prev);
                                if (isLiked) {
                                    newSet.add(replyId);
                                } else {
                                    newSet.delete(replyId);
                                }
                                return newSet;
                            });
                            loadDiscussionDetails(selectedDiscussion.id);
                        }}
                        onMarkBestAnswer={async (replyId, currentState) => {
                            await updateBestAnswer(replyId, !currentState);
                            loadDiscussionDetails(selectedDiscussion.id);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function DiscussionCard({ discussion, isTeacher, onSelect, onPinToggle, onLockToggle }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100 hover:border-purple-200 transition-colors cursor-pointer"
            onClick={onSelect}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        {discussion.is_pinned && (
                            <Pin className="w-4 h-4 text-purple-600 fill-purple-600" />
                        )}
                        {discussion.is_locked && (
                            <Lock className="w-4 h-4 text-gray-500" />
                        )}
                        <h3 className="text-lg font-serif font-bold text-gray-900">
                            {discussion.title}
                        </h3>
                    </div>
                    <p className="text-gray-600 line-clamp-2 mb-3">
                        {discussion.content}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="font-medium text-purple-600">
                            {discussion.author?.username || 'Unknown'}
                        </span>
                        <span>•</span>
                        <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{discussion.view_count || 0} views</span>
                    </div>
                </div>

                {/* Teacher Moderation Controls */}
                {isTeacher && (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => onPinToggle(discussion.id, discussion.is_pinned)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title={discussion.is_pinned ? 'Unpin' : 'Pin'}
                        >
                            {discussion.is_pinned ? (
                                <PinOff className="w-4 h-4 text-purple-600" />
                            ) : (
                                <Pin className="w-4 h-4 text-gray-400" />
                            )}
                        </button>
                        <button
                            onClick={() => onLockToggle(discussion.id, discussion.is_locked)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title={discussion.is_locked ? 'Unlock' : 'Lock'}
                        >
                            {discussion.is_locked ? (
                                <Lock className="w-4 h-4 text-gray-500" />
                            ) : (
                                <Unlock className="w-4 h-4 text-gray-400" />
                            )}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function NewDiscussionModal({ onClose, onCreate }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [creating, setCreating] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        setCreating(true);
        try {
            await onCreate({ title, content });
        } finally {
            setCreating(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-serif font-bold text-gray-900">
                        New Discussion
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What's your question or topic?"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Content
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Provide more details about your discussion..."
                            rows={6}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors resize-none"
                            required
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creating || !title.trim() || !content.trim()}
                            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Post Discussion
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

function DiscussionDetailModal({
    discussion,
    isTeacher,
    currentUserId,
    userLikes,
    onClose,
    onReply,
    onLike,
    onMarkBestAnswer,
}) {
    const [replyContent, setReplyContent] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleReply = async () => {
        if (!replyContent.trim()) return;

        setSubmitting(true);
        try {
            await onReply({
                discussionId: discussion.id,
                parentReplyId: replyingTo,
                content: replyContent,
            });
            setReplyContent('');
            setReplyingTo(null);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b-2 border-gray-100">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                {discussion.is_pinned && (
                                    <Pin className="w-4 h-4 text-purple-600 fill-purple-600" />
                                )}
                                {discussion.is_locked && (
                                    <Lock className="w-4 h-4 text-gray-500" />
                                )}
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">
                                {discussion.title}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span className="font-medium text-purple-600">
                                    {discussion.author?.username || 'Unknown'}
                                </span>
                                <span>•</span>
                                <span>{new Date(discussion.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-gray-700 mt-4">{discussion.content}</p>
                </div>

                {/* Replies */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {discussion.replies?.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p>No replies yet. Be the first to respond!</p>
                        </div>
                    ) : (
                        discussion.replies?.map((reply) => (
                            <ReplyThread
                                key={reply.id}
                                reply={reply}
                                isTeacher={isTeacher}
                                currentUserId={currentUserId}
                                userLikes={userLikes}
                                onReply={(replyId) => setReplyingTo(replyId)}
                                onLike={onLike}
                                onMarkBestAnswer={onMarkBestAnswer}
                            />
                        ))
                    )}
                </div>

                {/* Reply Input */}
                {!discussion.is_locked && (
                    <div className="p-6 border-t-2 border-gray-100">
                        {replyingTo && (
                            <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                                <Reply className="w-4 h-4" />
                                <span>Replying to a comment</span>
                                <button
                                    onClick={() => setReplyingTo(null)}
                                    className="text-purple-600 hover:text-purple-700 font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder={replyingTo ? 'Write a reply...' : 'Write a comment...'}
                                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleReply();
                                    }
                                }}
                            />
                            <button
                                onClick={handleReply}
                                disabled={submitting || !replyContent.trim()}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

function ReplyThread({ reply, isTeacher, currentUserId, userLikes, onReply, onLike, onMarkBestAnswer }) {
    const isLiked = userLikes.has(reply.id);

    return (
        <div className="space-y-3">
            <div className={`bg-gray-50 rounded-xl p-4 ${reply.is_best_answer ? 'border-2 border-green-500' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-900">
                            {reply.author?.username || 'Unknown'}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-500">
                            {new Date(reply.created_at).toLocaleString()}
                        </span>
                        {reply.is_best_answer && (
                            <>
                                <span className="text-gray-500">•</span>
                                <span className="flex items-center gap-1 text-green-600 font-medium">
                                    <CheckCircle className="w-4 h-4" />
                                    Best Answer
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <p className="text-gray-700 mb-3">{reply.content}</p>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onLike(reply.id)}
                        className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                            isLiked
                                ? 'text-purple-600'
                                : 'text-gray-500 hover:text-purple-600'
                        }`}
                    >
                        <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-purple-600' : ''}`} />
                        <span>{reply.likes_count || 0}</span>
                    </button>
                    <button
                        onClick={() => onReply(reply.id)}
                        className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-purple-600 transition-colors"
                    >
                        <Reply className="w-4 h-4" />
                        Reply
                    </button>
                    {isTeacher && !reply.is_best_answer && (
                        <button
                            onClick={() => onMarkBestAnswer(reply.id, reply.is_best_answer)}
                            className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-green-600 transition-colors"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Mark as Best
                        </button>
                    )}
                </div>
            </div>

            {/* Nested Replies */}
            {reply.children?.length > 0 && (
                <div className="ml-8 space-y-3">
                    {reply.children.map((childReply) => (
                        <ReplyThread
                            key={childReply.id}
                            reply={childReply}
                            isTeacher={isTeacher}
                            currentUserId={currentUserId}
                            userLikes={userLikes}
                            onReply={onReply}
                            onLike={onLike}
                            onMarkBestAnswer={onMarkBestAnswer}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
