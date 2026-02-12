import { supabase } from '../supabaseClient';

/**
 * Discussion Service
 *
 * Handles all discussion-related operations for collaborative learning.
 */

/**
 * Get all discussions for a class or specific material
 * @param {string} classId - Class ID
 * @param {string} materialId - Optional material ID (null for class-wide discussions)
 * @returns {Promise<Array>} Array of discussions
 */
export async function getDiscussions(classId, materialId = null) {
  let query = supabase
    .from('discussions')
    .select(`
      *,
      author:profiles!discussions_author_id_fkey(id, username, avatar_url),
      material:materials(id, title)
    `)
    .eq('class_id', classId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (materialId) {
    query = query.eq('material_id', materialId);
  } else {
    query = query.is('material_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching discussions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single discussion with all replies
 * @param {string} discussionId - Discussion ID
 * @returns {Promise<Object>} Discussion with nested replies
 */
export async function getDiscussionWithReplies(discussionId) {
  // Get discussion
  const { data: discussion, error: discError } = await supabase
    .from('discussions')
    .select(`
      *,
      author:profiles!discussions_author_id_fkey(id, username, avatar_url),
      material:materials(id, title)
    `)
    .eq('id', discussionId)
    .single();

  if (discError) {
    console.error('Error fetching discussion:', discError);
    throw discError;
  }

  // Get all replies
  const { data: replies, error: repliesError } = await supabase
    .from('discussion_replies')
    .select(`
      *,
      author:profiles!discussion_replies_author_id_fkey(id, username, avatar_url)
    `)
    .eq('discussion_id', discussionId)
    .order('created_at', { ascending: true });

  if (repliesError) {
    console.error('Error fetching replies:', repliesError);
    throw repliesError;
  }

  // Nest replies into tree structure
  const replyMap = {};
  const topLevelReplies = [];

  replies.forEach((reply) => {
    replyMap[reply.id] = { ...reply, children: [] };
  });

  replies.forEach((reply) => {
    if (reply.parent_reply_id) {
      const parent = replyMap[reply.parent_reply_id];
      if (parent) {
        parent.children.push(replyMap[reply.id]);
      }
    } else {
      topLevelReplies.push(replyMap[reply.id]);
    }
  });

  return {
    ...discussion,
    replies: topLevelReplies,
  };
}

/**
 * Create a new discussion
 * @param {Object} discussionData - Discussion data
 * @returns {Promise<Object>} Created discussion
 */
export async function createDiscussion({ classId, materialId, title, content }) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('discussions')
    .insert({
      class_id: classId,
      material_id: materialId,
      author_id: user.id,
      title,
      content,
    })
    .select(`
      *,
      author:profiles!discussions_author_id_fkey(id, username, avatar_url)
    `)
    .single();

  if (error) {
    console.error('Error creating discussion:', error);
    throw error;
  }

  return data;
}

/**
 * Create a reply to a discussion or another reply
 * @param {Object} replyData - Reply data
 * @returns {Promise<Object>} Created reply
 */
export async function createReply({ discussionId, parentReplyId, content }) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('discussion_replies')
    .insert({
      discussion_id: discussionId,
      parent_reply_id: parentReplyId,
      author_id: user.id,
      content,
    })
    .select(`
      *,
      author:profiles!discussion_replies_author_id_fkey(id, username, avatar_url)
    `)
    .single();

  if (error) {
    console.error('Error creating reply:', error);
    throw error;
  }

  return data;
}

/**
 * Toggle like on a reply
 * @param {string} replyId - Reply ID
 * @returns {Promise<boolean>} True if liked, false if unliked
 */
export async function toggleReplyLike(replyId) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if already liked
  const { data: existingLike, error: checkError } = await supabase
    .from('reply_likes')
    .select('id')
    .eq('reply_id', replyId)
    .eq('user_id', user.id)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error checking like:', checkError);
    throw checkError;
  }

  if (existingLike) {
    // Unlike
    const { error: deleteError } = await supabase
      .from('reply_likes')
      .delete()
      .eq('id', existingLike.id);

    if (deleteError) {
      console.error('Error removing like:', deleteError);
      throw deleteError;
    }

    return false;
  } else {
    // Like
    const { error: insertError } = await supabase
      .from('reply_likes')
      .insert({
        reply_id: replyId,
        user_id: user.id,
      });

    if (insertError) {
      console.error('Error adding like:', insertError);
      throw insertError;
    }

    return true;
  }
}

/**
 * Check if user has liked specific replies
 * @param {Array<string>} replyIds - Array of reply IDs
 * @returns {Promise<Set>} Set of liked reply IDs
 */
export async function getUserLikes(replyIds) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !replyIds.length) {
    return new Set();
  }

  const { data, error } = await supabase
    .from('reply_likes')
    .select('reply_id')
    .eq('user_id', user.id)
    .in('reply_id', replyIds);

  if (error) {
    console.error('Error fetching user likes:', error);
    throw error;
  }

  return new Set(data.map((like) => like.reply_id));
}

/**
 * Pin/unpin a discussion (teachers only)
 * @param {string} discussionId - Discussion ID
 * @param {boolean} isPinned - Pin state
 * @returns {Promise<Object>} Updated discussion
 */
export async function updateDiscussionPin(discussionId, isPinned) {
  const { data, error } = await supabase
    .from('discussions')
    .update({ is_pinned: isPinned })
    .eq('id', discussionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating pin:', error);
    throw error;
  }

  return data;
}

/**
 * Lock/unlock a discussion (teachers only)
 * @param {string} discussionId - Discussion ID
 * @param {boolean} isLocked - Lock state
 * @returns {Promise<Object>} Updated discussion
 */
export async function updateDiscussionLock(discussionId, isLocked) {
  const { data, error } = await supabase
    .from('discussions')
    .update({ is_locked: isLocked })
    .eq('id', discussionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating lock:', error);
    throw error;
  }

  return data;
}

/**
 * Mark a reply as best answer (teachers only)
 * @param {string} replyId - Reply ID
 * @param {boolean} isBestAnswer - Best answer state
 * @returns {Promise<Object>} Updated reply
 */
export async function updateBestAnswer(replyId, isBestAnswer) {
  const { data, error } = await supabase
    .from('discussion_replies')
    .update({ is_best_answer: isBestAnswer })
    .eq('id', replyId)
    .select()
    .single();

  if (error) {
    console.error('Error updating best answer:', error);
    throw error;
  }

  return data;
}

/**
 * Subscribe to real-time discussion updates
 * @param {string} classId - Class ID
 * @param {Function} onDiscussionChange - Callback for discussion changes
 * @param {Function} onReplyChange - Callback for reply changes
 * @returns {Object} Subscription object with unsubscribe method
 */
export function subscribeToDiscussions(classId, onDiscussionChange, onReplyChange) {
  // Subscribe to discussions table
  const discussionSubscription = supabase
    .channel(`discussions:${classId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'discussions',
        filter: `class_id=eq.${classId}`,
      },
      (payload) => {
        onDiscussionChange(payload);
      }
    )
    .subscribe();

  // Subscribe to replies table
  const replySubscription = supabase
    .channel(`replies:${classId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'discussion_replies',
      },
      (payload) => {
        onReplyChange(payload);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(discussionSubscription);
      supabase.removeChannel(replySubscription);
    },
  };
}
