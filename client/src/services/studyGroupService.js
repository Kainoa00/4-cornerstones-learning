import { supabase } from '../supabaseClient';

/**
 * Study Group Service
 *
 * Handles all study group operations for collaborative learning.
 */

/**
 * Get all study groups for a class
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Array of study groups with member counts
 */
export async function getStudyGroups(classId) {
  const { data, error } = await supabase
    .from('study_groups')
    .select(`
      *,
      creator:profiles!study_groups_creator_id_fkey(id, username, avatar_url),
      memberships:group_memberships(count)
    `)
    .eq('class_id', classId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching study groups:', error);
    throw error;
  }

  // Add member count to each group
  return (data || []).map((group) => ({
    ...group,
    member_count: group.memberships?.[0]?.count || 0,
  }));
}

/**
 * Get study groups that the current user is a member of
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Array of user's study groups
 */
export async function getMyStudyGroups(classId) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('group_memberships')
    .select(`
      *,
      group:study_groups(
        *,
        creator:profiles!study_groups_creator_id_fkey(id, username, avatar_url)
      )
    `)
    .eq('student_id', user.id);

  if (error) {
    console.error('Error fetching my study groups:', error);
    throw error;
  }

  // Filter by class and return groups
  return (data || [])
    .filter((membership) => membership.group?.class_id === classId)
    .map((membership) => membership.group);
}

/**
 * Get detailed study group info with members and messages
 * @param {string} groupId - Study group ID
 * @returns {Promise<Object>} Study group with members and recent messages
 */
export async function getStudyGroupDetails(groupId) {
  // Get group info
  const { data: group, error: groupError } = await supabase
    .from('study_groups')
    .select(`
      *,
      creator:profiles!study_groups_creator_id_fkey(id, username, avatar_url)
    `)
    .eq('id', groupId)
    .single();

  if (groupError) {
    console.error('Error fetching group details:', groupError);
    throw groupError;
  }

  // Get members
  const { data: members, error: membersError } = await supabase
    .from('group_memberships')
    .select(`
      *,
      student:profiles!group_memberships_student_id_fkey(id, username, avatar_url)
    `)
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (membersError) {
    console.error('Error fetching members:', membersError);
    throw membersError;
  }

  // Get recent messages
  const { data: messages, error: messagesError } = await supabase
    .from('group_messages')
    .select(`
      *,
      author:profiles!group_messages_author_id_fkey(id, username, avatar_url)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (messagesError) {
    console.error('Error fetching messages:', messagesError);
    throw messagesError;
  }

  return {
    ...group,
    members: members || [],
    messages: (messages || []).reverse(), // Oldest first for chat display
  };
}

/**
 * Create a new study group
 * @param {Object} groupData - Study group data
 * @returns {Promise<Object>} Created study group
 */
export async function createStudyGroup({ classId, name, description, maxMembers, isPublic }) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Create group
  const { data: group, error: groupError } = await supabase
    .from('study_groups')
    .insert({
      class_id: classId,
      name,
      description,
      creator_id: user.id,
      max_members: maxMembers || 10,
      is_public: isPublic !== false,
    })
    .select(`
      *,
      creator:profiles!study_groups_creator_id_fkey(id, username, avatar_url)
    `)
    .single();

  if (groupError) {
    console.error('Error creating study group:', groupError);
    throw groupError;
  }

  // Auto-join creator as admin
  const { error: membershipError } = await supabase
    .from('group_memberships')
    .insert({
      group_id: group.id,
      student_id: user.id,
      role: 'creator',
    });

  if (membershipError) {
    console.error('Error adding creator to group:', membershipError);
    // Don't throw - group is created, just membership failed
  }

  return group;
}

/**
 * Join a study group
 * @param {string} groupId - Study group ID
 * @returns {Promise<Object>} Membership record
 */
export async function joinStudyGroup(groupId) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if group is full
  const { data: group, error: groupError } = await supabase
    .from('study_groups')
    .select('max_members, memberships:group_memberships(count)')
    .eq('id', groupId)
    .single();

  if (groupError) {
    console.error('Error checking group capacity:', groupError);
    throw groupError;
  }

  const currentMembers = group.memberships?.[0]?.count || 0;
  if (currentMembers >= group.max_members) {
    throw new Error('Group is full');
  }

  // Join group
  const { data, error } = await supabase
    .from('group_memberships')
    .insert({
      group_id: groupId,
      student_id: user.id,
      role: 'member',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation - already a member
      throw new Error('Already a member of this group');
    }
    console.error('Error joining group:', error);
    throw error;
  }

  return data;
}

/**
 * Leave a study group
 * @param {string} groupId - Study group ID
 * @returns {Promise<void>}
 */
export async function leaveStudyGroup(groupId) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('group_memberships')
    .delete()
    .eq('group_id', groupId)
    .eq('student_id', user.id);

  if (error) {
    console.error('Error leaving group:', error);
    throw error;
  }
}

/**
 * Send a message to a study group
 * @param {Object} messageData - Message data
 * @returns {Promise<Object>} Created message
 */
export async function sendGroupMessage({ groupId, message, attachmentUrl, attachmentType }) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('group_messages')
    .insert({
      group_id: groupId,
      author_id: user.id,
      message,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
    })
    .select(`
      *,
      author:profiles!group_messages_author_id_fkey(id, username, avatar_url)
    `)
    .single();

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }

  return data;
}

/**
 * Update study group details (creator/admin only)
 * @param {string} groupId - Study group ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated study group
 */
export async function updateStudyGroup(groupId, updates) {
  const { data, error } = await supabase
    .from('study_groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single();

  if (error) {
    console.error('Error updating study group:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a study group (creator only)
 * @param {string} groupId - Study group ID
 * @returns {Promise<void>}
 */
export async function deleteStudyGroup(groupId) {
  const { error } = await supabase
    .from('study_groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error('Error deleting study group:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time group messages
 * @param {string} groupId - Study group ID
 * @param {Function} onMessage - Callback for new messages
 * @returns {Object} Subscription object with unsubscribe method
 */
export function subscribeToGroupMessages(groupId, onMessage) {
  const subscription = supabase
    .channel(`group_messages:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        onMessage(payload.new);
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
 * Subscribe to study group changes in a class
 * @param {string} classId - Class ID
 * @param {Function} onGroupChange - Callback for group changes
 * @returns {Object} Subscription object with unsubscribe method
 */
export function subscribeToStudyGroups(classId, onGroupChange) {
  const subscription = supabase
    .channel(`study_groups:${classId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'study_groups',
        filter: `class_id=eq.${classId}`,
      },
      (payload) => {
        onGroupChange(payload);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(subscription);
    },
  };
}
