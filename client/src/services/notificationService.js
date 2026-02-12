import { supabase } from '../supabaseClient';

/**
 * Notification Service
 *
 * Handles all notification operations for the learning platform.
 */

/**
 * Get all notifications for the current user
 * @param {number} limit - Maximum number of notifications to fetch
 * @param {boolean} unreadOnly - Only fetch unread notifications
 * @returns {Promise<Array>} Array of notifications
 */
export async function getNotifications(limit = 50, unreadOnly = false) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get unread notification count
 * @returns {Promise<number>} Count of unread notifications
 */
export async function getUnreadCount() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Updated notification
 */
export async function markAsRead(notificationId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }

  return data;
}

/**
 * Mark all notifications as read
 * @returns {Promise<void>}
 */
export async function markAllAsRead() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
}

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise<void>}
 */
export async function deleteNotification(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

/**
 * Delete all read notifications
 * @returns {Promise<void>}
 */
export async function deleteAllRead() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id)
    .eq('is_read', true);

  if (error) {
    console.error('Error deleting read notifications:', error);
    throw error;
  }
}

/**
 * Get user's notification preferences
 * @returns {Promise<Object>} Notification preferences
 */
export async function getNotificationPreferences() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No preferences found, return defaults
      return {
        preferences: {
          assignment_new: { app: true, email: false },
          assignment_due_soon: { app: true, email: true },
          assignment_overdue: { app: true, email: true },
          discussion_reply: { app: true, email: false },
          discussion_mention: { app: true, email: true },
          group_message: { app: true, email: false },
          quiz_graded: { app: true, email: true },
          struggling_alert: { app: true, email: true },
        },
      };
    }
    console.error('Error fetching preferences:', error);
    throw error;
  }

  return data;
}

/**
 * Update user's notification preferences
 * @param {Object} preferences - New preferences object
 * @returns {Promise<Object>} Updated preferences
 */
export async function updateNotificationPreferences(preferences) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // First, try to update existing preferences
  const { data: existingPrefs } = await supabase
    .from('notification_preferences')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existingPrefs) {
    // Update existing
    const { data, error } = await supabase
      .from('notification_preferences')
      .update({ preferences })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }

    return data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('notification_preferences')
      .insert({
        user_id: user.id,
        preferences,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating preferences:', error);
      throw error;
    }

    return data;
  }
}

/**
 * Create a notification (typically used by backend triggers, but can be called manually)
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notification
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  linkType,
  linkId,
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      link_type: linkType,
      link_id: linkId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }

  return data;
}

/**
 * Subscribe to real-time notifications
 * @param {Function} onNotification - Callback for new notifications
 * @returns {Object} Subscription object with unsubscribe method
 */
export function subscribeToNotifications(onNotification) {
  const subscription = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        onNotification(payload.new);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(subscription);
    },
  };
}

/**
 * Get notification icon and color based on type
 * @param {string} type - Notification type
 * @returns {Object} Icon component and color classes
 */
export function getNotificationStyle(type) {
  const styles = {
    assignment_new: {
      color: 'text-blue-600 bg-blue-100',
      icon: '📚',
    },
    assignment_due_soon: {
      color: 'text-amber-600 bg-amber-100',
      icon: '⏰',
    },
    assignment_overdue: {
      color: 'text-red-600 bg-red-100',
      icon: '❗',
    },
    discussion_reply: {
      color: 'text-purple-600 bg-purple-100',
      icon: '💬',
    },
    discussion_mention: {
      color: 'text-purple-600 bg-purple-100',
      icon: '@',
    },
    group_invite: {
      color: 'text-green-600 bg-green-100',
      icon: '👥',
    },
    group_message: {
      color: 'text-cyan-600 bg-cyan-100',
      icon: '✉️',
    },
    quiz_graded: {
      color: 'text-green-600 bg-green-100',
      icon: '✅',
    },
    struggling_alert: {
      color: 'text-red-600 bg-red-100',
      icon: '⚠️',
    },
    material_shared: {
      color: 'text-blue-600 bg-blue-100',
      icon: '📄',
    },
    announcement: {
      color: 'text-gray-600 bg-gray-100',
      icon: '📢',
    },
  };

  return styles[type] || styles.announcement;
}
