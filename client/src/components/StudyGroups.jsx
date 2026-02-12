import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Plus,
    MessageCircle,
    UserPlus,
    LogOut,
    Send,
    X,
    Loader2,
    Crown,
    Lock,
    Globe,
} from 'lucide-react';
import {
    getStudyGroups,
    getMyStudyGroups,
    getStudyGroupDetails,
    createStudyGroup,
    joinStudyGroup,
    leaveStudyGroup,
    sendGroupMessage,
    subscribeToGroupMessages,
    subscribeToStudyGroups,
} from '../services/studyGroupService';

export default function StudyGroups({ classId, currentUserId }) {
    const [allGroups, setAllGroups] = useState([]);
    const [myGroups, setMyGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('my'); // 'my' or 'all'

    useEffect(() => {
        loadGroups();
    }, [classId]);

    useEffect(() => {
        // Subscribe to real-time study group updates
        const subscription = subscribeToStudyGroups(classId, handleGroupChange);
        return () => subscription.unsubscribe();
    }, [classId]);

    const loadGroups = async () => {
        try {
            const [all, my] = await Promise.all([
                getStudyGroups(classId),
                getMyStudyGroups(classId),
            ]);
            setAllGroups(all);
            setMyGroups(my);
        } catch (error) {
            console.error('Error loading study groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGroupChange = (payload) => {
        loadGroups();
    };

    const handleCreateGroup = async (data) => {
        try {
            await createStudyGroup({ classId, ...data });
            setShowNewGroup(false);
            loadGroups();
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Failed to create study group');
        }
    };

    const handleJoinGroup = async (groupId) => {
        try {
            await joinStudyGroup(groupId);
            loadGroups();
        } catch (error) {
            console.error('Error joining group:', error);
            alert(error.message || 'Failed to join study group');
        }
    };

    const handleLeaveGroup = async (groupId) => {
        if (!confirm('Are you sure you want to leave this study group?')) return;

        try {
            await leaveStudyGroup(groupId);
            setSelectedGroup(null);
            loadGroups();
        } catch (error) {
            console.error('Error leaving group:', error);
            alert('Failed to leave study group');
        }
    };

    const handleOpenGroup = async (group) => {
        try {
            const details = await getStudyGroupDetails(group.id);
            setSelectedGroup(details);
        } catch (error) {
            console.error('Error loading group details:', error);
            alert('Failed to load group details');
        }
    };

    const myGroupIds = new Set(myGroups.map((g) => g.id));

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
                    <Users className="w-6 h-6 text-purple-600" />
                    <h2 className="text-2xl font-serif font-bold text-gray-900">
                        Study Groups
                    </h2>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowNewGroup(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Group
                </motion.button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b-2 border-gray-100">
                <button
                    onClick={() => setActiveTab('my')}
                    className={`px-4 py-3 font-semibold transition-colors relative ${
                        activeTab === 'my'
                            ? 'text-purple-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    My Groups ({myGroups.length})
                    {activeTab === 'my' && (
                        <motion.div
                            layoutId="groupTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"
                        />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-3 font-semibold transition-colors relative ${
                        activeTab === 'all'
                            ? 'text-purple-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    All Groups ({allGroups.length})
                    {activeTab === 'all' && (
                        <motion.div
                            layoutId="groupTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600"
                        />
                    )}
                </button>
            </div>

            {/* Group List */}
            {activeTab === 'my' ? (
                myGroups.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No study groups yet</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Create or join a group to collaborate with classmates
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {myGroups.map((group) => (
                            <GroupCard
                                key={group.id}
                                group={group}
                                isMember={true}
                                onOpen={handleOpenGroup}
                                onJoin={handleJoinGroup}
                            />
                        ))}
                    </div>
                )
            ) : (
                allGroups.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No study groups available</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Be the first to create a study group
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allGroups.map((group) => (
                            <GroupCard
                                key={group.id}
                                group={group}
                                isMember={myGroupIds.has(group.id)}
                                onOpen={handleOpenGroup}
                                onJoin={handleJoinGroup}
                            />
                        ))}
                    </div>
                )
            )}

            {/* New Group Modal */}
            <AnimatePresence>
                {showNewGroup && (
                    <NewGroupModal
                        onClose={() => setShowNewGroup(false)}
                        onCreate={handleCreateGroup}
                    />
                )}
            </AnimatePresence>

            {/* Group Chat Modal */}
            <AnimatePresence>
                {selectedGroup && (
                    <GroupChatModal
                        group={selectedGroup}
                        currentUserId={currentUserId}
                        onClose={() => setSelectedGroup(null)}
                        onLeave={handleLeaveGroup}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function GroupCard({ group, isMember, onOpen, onJoin }) {
    const isFull = group.member_count >= group.max_members;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100 hover:border-purple-200 transition-colors"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        {group.is_public ? (
                            <Globe className="w-4 h-4 text-green-600" />
                        ) : (
                            <Lock className="w-4 h-4 text-gray-500" />
                        )}
                        <h3 className="text-lg font-serif font-bold text-gray-900">
                            {group.name}
                        </h3>
                    </div>
                    {group.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {group.description}
                        </p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{group.member_count}/{group.max_members}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                            <Crown className="w-4 h-4 text-amber-500" />
                            <span>{group.creator?.username || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                {isMember ? (
                    <button
                        onClick={() => onOpen(group)}
                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <MessageCircle className="w-4 h-4" />
                        Open Chat
                    </button>
                ) : (
                    <button
                        onClick={() => onJoin(group.id)}
                        disabled={isFull}
                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        {isFull ? 'Full' : 'Join Group'}
                    </button>
                )}
            </div>
        </motion.div>
    );
}

function NewGroupModal({ onClose, onCreate }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [maxMembers, setMaxMembers] = useState(10);
    const [isPublic, setIsPublic] = useState(true);
    const [creating, setCreating] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setCreating(true);
        try {
            await onCreate({ name, description, maxMembers, isPublic });
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
                        Create Study Group
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
                            Group Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Chapter 5 Study Group"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What will your group focus on?"
                            rows={3}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Max Members
                        </label>
                        <input
                            type="number"
                            value={maxMembers}
                            onChange={(e) => setMaxMembers(Math.max(2, Math.min(50, parseInt(e.target.value) || 10)))}
                            min="2"
                            max="50"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="isPublic"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                            Public group (anyone in class can join)
                        </label>
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
                            disabled={creating || !name.trim()}
                            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Create Group
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

function GroupChatModal({ group, currentUserId, onClose, onLeave }) {
    const [messages, setMessages] = useState(group.messages || []);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Subscribe to new messages
        const subscription = subscribeToGroupMessages(group.id, (message) => {
            // Fetch full message with author details
            setMessages((prev) => [...prev, message]);
        });

        return () => subscription.unsubscribe();
    }, [group.id]);

    useEffect(() => {
        // Scroll to bottom when new messages arrive
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            await sendGroupMessage({
                groupId: group.id,
                message: newMessage,
            });
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const isCreator = group.creator_id === currentUserId;
    const isAdmin = group.members?.find((m) => m.student_id === currentUserId)?.role === 'admin';

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
                            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">
                                {group.name}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>{group.members?.length || 0} members</span>
                                </div>
                                {group.description && (
                                    <>
                                        <span>•</span>
                                        <span>{group.description}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isCreator && (
                                <button
                                    onClick={() => onLeave(group.id)}
                                    className="px-3 py-2 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Leave
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <MessageBubble
                                key={message.id || index}
                                message={message}
                                isOwn={message.author_id === currentUserId}
                            />
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-6 border-t-2 border-gray-100">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={sending || !newMessage.trim()}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {sending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

function MessageBubble({ message, isOwn }) {
    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] ${isOwn ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-3`}>
                {!isOwn && (
                    <p className="text-xs font-semibold mb-1 opacity-70">
                        {message.author?.username || 'Unknown'}
                    </p>
                )}
                <p className="text-sm">{message.message}</p>
                <p className={`text-xs mt-1 ${isOwn ? 'text-purple-200' : 'text-gray-500'}`}>
                    {new Date(message.created_at).toLocaleTimeString()}
                </p>
            </div>
        </div>
    );
}
