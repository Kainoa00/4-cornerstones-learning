import { supabase } from '../supabaseClient';

/**
 * Analytics Service
 *
 * Handles all analytics-related operations for teacher dashboards.
 */

/**
 * Get analytics overview for a specific class
 * @param {string} classId - Class ID
 * @returns {Promise<Object>} Class analytics data
 */
export async function getClassAnalytics(classId) {
  const { data, error } = await supabase
    .from('class_analytics')
    .select('*')
    .eq('class_id', classId)
    .single();

  if (error) {
    console.error('Error fetching class analytics:', error);
    throw error;
  }

  return data;
}

/**
 * Get all students' performance in a class
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Array of student performance data
 */
export async function getStudentPerformance(classId) {
  const { data, error } = await supabase
    .from('student_class_performance')
    .select('*')
    .eq('class_id', classId)
    .order('completion_rate', { ascending: false });

  if (error) {
    console.error('Error fetching student performance:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get struggling students in a class
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Array of struggling students
 */
export async function getStrugglingStudents(classId) {
  const { data, error } = await supabase
    .rpc('get_struggling_students', { p_class_id: classId });

  if (error) {
    console.error('Error fetching struggling students:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get learning style distribution for a class
 * @param {string} classId - Class ID
 * @returns {Promise<Object>} Learning style distribution
 */
export async function getClassLearningStyles(classId) {
  const { data, error } = await supabase
    .from('class_learning_styles')
    .select('*')
    .eq('class_id', classId)
    .single();

  if (error) {
    console.error('Error fetching learning styles:', error);
    throw error;
  }

  return data;
}

/**
 * Get material effectiveness metrics
 * @param {string} teacherId - Teacher ID (optional, filters to teacher's materials)
 * @returns {Promise<Array>} Array of material effectiveness data
 */
export async function getMaterialEffectiveness(teacherId = null) {
  let query = supabase
    .from('material_effectiveness')
    .select('*')
    .order('completion_rate', { ascending: false });

  if (teacherId) {
    query = query.eq('teacher_id', teacherId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching material effectiveness:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get material performance breakdown (VARK style views)
 * @param {string} materialId - Material ID
 * @returns {Promise<Array>} VARK style view breakdown
 */
export async function getMaterialPerformance(materialId) {
  const { data, error } = await supabase
    .rpc('get_material_performance', { p_material_id: materialId });

  if (error) {
    console.error('Error fetching material performance:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get class engagement metrics
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Array of engagement metrics
 */
export async function getClassEngagement(classId) {
  const { data, error } = await supabase
    .rpc('get_class_engagement', { p_class_id: classId });

  if (error) {
    console.error('Error fetching class engagement:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get recent activity feed for a class
 * @param {string} classId - Class ID
 * @param {number} limit - Number of recent activities to fetch (default: 20)
 * @returns {Promise<Array>} Array of recent activities
 */
export async function getRecentActivity(classId, limit = 20) {
  const { data, error } = await supabase
    .rpc('get_recent_activity', {
      p_class_id: classId,
      p_limit: limit,
    });

  if (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get detailed student analytics
 * @param {string} studentId - Student ID
 * @param {string} classId - Class ID
 * @returns {Promise<Object>} Detailed student analytics
 */
export async function getStudentDetailAnalytics(studentId, classId) {
  // Get student performance
  const { data: performance, error: perfError } = await supabase
    .from('student_class_performance')
    .select('*')
    .eq('student_id', studentId)
    .eq('class_id', classId)
    .single();

  if (perfError) {
    console.error('Error fetching student detail:', perfError);
    throw perfError;
  }

  // Get student's material completions
  const { data: completions, error: compError } = await supabase
    .from('material_completions')
    .select(`
      *,
      class_material:class_materials(
        *,
        material:materials(title, subject, content_type)
      )
    `)
    .eq('student_id', studentId)
    .order('last_accessed_at', { ascending: false });

  if (compError) {
    console.error('Error fetching completions:', compError);
    // Don't throw, just return empty array
  }

  return {
    ...performance,
    completions: completions || [],
  };
}

/**
 * Get aggregate analytics for all teacher's classes
 * @param {string} teacherId - Teacher ID
 * @returns {Promise<Object>} Aggregate analytics
 */
export async function getTeacherAnalytics(teacherId) {
  const { data, error } = await supabase
    .from('class_analytics')
    .select('*')
    .eq('teacher_id', teacherId);

  if (error) {
    console.error('Error fetching teacher analytics:', error);
    throw error;
  }

  // Aggregate across all classes
  const aggregate = {
    total_classes: data.length,
    total_students: data.reduce((sum, c) => sum + (c.total_students || 0), 0),
    total_materials: data.reduce((sum, c) => sum + (c.total_materials_assigned || 0), 0),
    avg_completion_rate: data.length > 0
      ? Math.round(data.reduce((sum, c) => sum + (c.completion_rate || 0), 0) / data.length)
      : 0,
    total_time_spent: data.reduce((sum, c) => sum + (c.total_time_spent_seconds || 0), 0),
    classes: data,
  };

  return aggregate;
}

/**
 * Export class analytics as CSV data
 * @param {string} classId - Class ID
 * @returns {Promise<string>} CSV formatted data
 */
export async function exportClassAnalytics(classId) {
  const students = await getStudentPerformance(classId);

  // Create CSV header
  const headers = [
    'Student Name',
    'Total Assignments',
    'Completed',
    'In Progress',
    'Not Started',
    'Completion Rate (%)',
    'Avg Progress (%)',
    'Total Time (minutes)',
    'Overdue Count',
    'Last Activity',
  ];

  // Create CSV rows
  const rows = students.map((student) => [
    student.username || 'N/A',
    student.total_assignments || 0,
    student.completed_count || 0,
    student.in_progress_count || 0,
    student.not_started_count || 0,
    student.completion_rate || 0,
    student.avg_progress || 0,
    Math.round((student.total_time_spent || 0) / 60),
    student.overdue_count || 0,
    student.last_activity_date
      ? new Date(student.last_activity_date).toLocaleDateString()
      : 'Never',
  ]);

  // Combine into CSV string
  const csv = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csv;
}
