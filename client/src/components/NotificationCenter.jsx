import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    X,
    Check,
    CheckCheck,
    Trash2,
    Settings,
    Loader2,
} from 'lucide-react';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    subscribeToNotifications,
    getNotificationStyle,
} from '../services/notificationService';

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all' or 'unread'
    const panelRef = useRef(null);

    useEffect(() => {
        loadNotifications();
        loadUnreadCount();

        // Subscribe to real-time notifications
        const subscription = subscribeToNotifications(handleNewNotification);

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        // Load notifications when filter changes
        if (isOpen) {
            loadNotifications();
        }
    }, [filter]);

    useEffect(() => {
        // Close panel when clicking outside
        function handleClickOutside(event) {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const data = await getNotifications(50, filter === 'unread');
            setNotifications(data);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUnreadCount = async () => {
        try {
            const count = await getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Error loading unread count:', error);
        }
    };

    const handleNewNotification = (notification) => {
        // Add new notification to the list
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/icon-192.png',
            });
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await markAsRead(notificationId);
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId ? { ...n, is_read: true } : n
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, is_read: true }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            await deleteNotification(notificationId);
            setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleDeleteAllRead = async () => {
        if (!confirm('Delete all read notifications?')) return;

        try {
            await deleteAllRead();
            setNotifications((prev) => prev.filter((n) => !n.is_read));
        } catch (error) {
            console.error('Error deleting read notifications:', error);
        }
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            loadNotifications();
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Notification Bell Button */}
            <button
                onClick={handleToggle}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-purple-600' : 'text-gray-600'}`} />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                )}
            </button>

            {/* Notification Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-12 w-96 max-w-[90vw] bg-white rounded-2xl shadow-2xl border-2 border-gray-100 z-50 flex flex-col max-h-[600px]"
                    >
                        {/* Header */}
                        <div className="p-4 border-b-2 border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-serif font-bold text-gray-900">
                                    Notifications
                                </h3>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Mark all as read"
                                        >
                                            <CheckCheck className="w-4 h-4 text-gray-600" />
                                        </button>
                                    )}
                                    <button
                                        onClick={handleDeleteAllRead}
                                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Delete read"
                                    >
                                        <Trash2 className="w-4 h-4 text-gray-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Filter Tabs */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                        filter === 'all'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilter('unread')}
                                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                        filter === 'unread'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    Unread ({unreadCount})
                                </button>
                            </div>
                        </div>

                        {/* Notification List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center py-12">
                                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-600 font-medium">
                                        {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        You're all caught up!
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {notifications.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onMarkRead={handleMarkAsRead}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function NotificationItem({ notification, onMarkRead, onDelete }) {
    const style = getNotificationStyle(notification.type);
    const [showActions, setShowActions] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer relative ${
                !notification.is_read ? 'bg-purple-50/30' : ''
            }`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full ${style.color} flex items-center justify-center text-lg flex-shrink-0`}>
                    {style.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">
                            {notification.title}
                        </h4>
                        {!notification.is_read && (
                            <span className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-1" />
                        )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                        {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {formatNotificationTime(notification.created_at)}
                    </p>
                </div>
            </div>

            {/* Actions (show on hover) */}
            <AnimatePresence>
                {showActions && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-2 right-2 flex items-center gap-1 bg-white rounded-lg shadow-md border border-gray-200 p-1"
                    >
                        {!notification.is_read && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkRead(notification.id);
                                }}
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                title="Mark as read"
                            >
                                <Check className="w-3.5 h-3.5 text-green-600" />
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(notification.id);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title="Delete"
                        >
                            <X className="w-3.5 h-3.5 text-red-600" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function formatNotificationTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return time.toLocaleDateString();
}
