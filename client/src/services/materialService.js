import { supabase } from '../supabaseClient';

/**
 * Material Management Service
 *
 * Handles all material-related operations including CRUD, transformations,
 * and assignments.
 */

/**
 * Get all materials for current teacher
 * @returns {Promise<Array>} Array of materials with transformation status
 */
export async function getMyMaterials() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('materials')
    .select(`
      *,
      transformations:material_transformations(count)
    `)
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching materials:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get single material by ID with all transformations
 * @param {string} materialId - Material ID
 * @returns {Promise<Object>} Material with transformations
 */
export async function getMaterialById(materialId) {
  const { data, error } = await supabase
    .from('materials')
    .select(`
      *,
      transformations:material_transformations(*)
    `)
    .eq('id', materialId)
    .single();

  if (error) {
    console.error('Error fetching material:', error);
    throw error;
  }

  return data;
}

/**
 * Update material metadata
 * @param {string} materialId - Material ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated material
 */
export async function updateMaterial(materialId, updates) {
  const { data, error } = await supabase
    .from('materials')
    .update(updates)
    .eq('id', materialId)
    .select()
    .single();

  if (error) {
    console.error('Error updating material:', error);
    throw error;
  }

  return data;
}

/**
 * Delete material (and all transformations)
 * @param {string} materialId - Material ID
 * @returns {Promise<void>}
 */
export async function deleteMaterial(materialId) {
  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', materialId);

  if (error) {
    console.error('Error deleting material:', error);
    throw error;
  }
}

/**
 * Assign material to class or specific students
 * @param {Object} assignment - Assignment details
 * @param {string} assignment.materialId - Material ID
 * @param {string} assignment.classId - Class ID
 * @param {string[]} assignment.studentIds - Optional student IDs (empty = whole class)
 * @param {string} assignment.assignmentType - 'required', 'optional', or 'supplemental'
 * @param {Date} assignment.dueDate - Optional due date
 * @param {string} assignment.teacherNotes - Optional instructions
 * @returns {Promise<Array>} Created assignment records
 */
export async function assignMaterialToClass({
  materialId,
  classId,
  studentIds = [],
  assignmentType = 'optional',
  dueDate = null,
  teacherNotes = null,
}) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // If no specific students, assign to whole class (student_id = null)
  const assignments = studentIds.length > 0
    ? studentIds.map((studentId) => ({
        material_id: materialId,
        class_id: classId,
        student_id: studentId,
        assigned_by: user.id,
        assignment_type: assignmentType,
        due_date: dueDate,
        teacher_notes: teacherNotes,
      }))
    : [
        {
          material_id: materialId,
          class_id: classId,
          student_id: null, // Whole class
          assigned_by: user.id,
          assignment_type: assignmentType,
          due_date: dueDate,
          teacher_notes: teacherNotes,
        },
      ];

  const { data, error } = await supabase
    .from('class_materials')
    .insert(assignments)
    .select();

  if (error) {
    console.error('Error assigning material:', error);
    throw error;
  }

  return data;
}

/**
 * Get materials assigned to a class
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Array of assigned materials
 */
export async function getClassMaterials(classId) {
  const { data, error } = await supabase
    .from('class_materials')
    .select(`
      *,
      material:materials(*),
      assigned_by_user:profiles!class_materials_assigned_by_fkey(username)
    `)
    .eq('class_id', classId)
    .eq('is_visible', true)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching class materials:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get materials assigned to current student
 * @returns {Promise<Array>} Array of assigned materials
 */
export async function getMyAssignedMaterials() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get student's profile to determine preferred VARK style
  const { data: profile } = await supabase
    .from('profiles')
    .select('vark_visual, vark_auditory, vark_reading_writing, vark_kinesthetic')
    .eq('id', user.id)
    .single();

  // Determine dominant learning style
  const varkScores = {
    visual: profile?.vark_visual || 0,
    auditory: profile?.vark_auditory || 0,
    reading_writing: profile?.vark_reading_writing || 0,
    kinesthetic: profile?.vark_kinesthetic || 0,
  };
  const dominantStyle = Object.keys(varkScores).reduce((a, b) =>
    varkScores[a] > varkScores[b] ? a : b
  );

  const { data, error } = await supabase
    .from('class_materials')
    .select(`
      *,
      material:materials(
        *,
        transformations:material_transformations(*)
      ),
      class:classes(id, name),
      completion:material_completions(status, progress_percentage, last_accessed_at)
    `)
    .eq('is_visible', true)
    .or(`student_id.is.null,student_id.eq.${user.id}`)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching assigned materials:', error);
    throw error;
  }

  // Attach student's preferred style to each material
  const materialsWithPreferredStyle = (data || []).map((item) => ({
    ...item,
    preferred_style: dominantStyle,
  }));

  return materialsWithPreferredStyle;
}

/**
 * Update student's material completion status
 * @param {string} classMaterialId - Class material ID
 * @param {Object} completion - Completion data
 * @param {string} completion.status - 'not_started', 'in_progress', or 'completed'
 * @param {number} completion.progressPercentage - 0-100
 * @param {string} completion.preferredStyle - VARK style viewed
 * @param {number} completion.timeSpentSeconds - Time spent on material
 * @returns {Promise<Object>} Updated completion record
 */
export async function updateMaterialCompletion(classMaterialId, completion) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if completion record exists
  const { data: existing } = await supabase
    .from('material_completions')
    .select('id')
    .eq('class_material_id', classMaterialId)
    .eq('student_id', user.id)
    .single();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('material_completions')
      .update({
        status: completion.status,
        progress_percentage: completion.progressPercentage,
        preferred_style: completion.preferredStyle,
        time_spent_seconds: completion.timeSpentSeconds,
        last_accessed_at: new Date().toISOString(),
        started_at: existing.started_at || new Date().toISOString(),
        completed_at: completion.status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('material_completions')
      .insert({
        class_material_id: classMaterialId,
        student_id: user.id,
        status: completion.status,
        progress_percentage: completion.progressPercentage,
        preferred_style: completion.preferredStyle,
        time_spent_seconds: completion.timeSpentSeconds,
        started_at: new Date().toISOString(),
        completed_at: completion.status === 'completed' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Search materials by title, description, tags
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching materials
 */
export async function searchMaterials(query) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('teacher_id', user.id)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching materials:', error);
    throw error;
  }

  return data || [];
}
