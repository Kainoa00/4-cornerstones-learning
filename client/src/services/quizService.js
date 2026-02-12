import { supabase } from '../supabaseClient';

/**
 * Quiz Service
 *
 * Handles all quiz and assessment operations for teachers and students.
 */

// ============================================================================
// Teacher - Quiz Creation & Management
// ============================================================================

/**
 * Get all quizzes created by a teacher
 * @param {string} teacherId - Teacher ID
 * @returns {Promise<Array>} Array of quizzes
 */
export async function getTeacherQuizzes(teacherId) {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*, questions:quiz_questions(count)')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching teacher quizzes:', error);
    throw error;
  }

  return (data || []).map((quiz) => ({
    ...quiz,
    question_count: quiz.questions?.[0]?.count || 0,
  }));
}

/**
 * Get a quiz with all its questions
 * @param {string} quizId - Quiz ID
 * @returns {Promise<Object>} Quiz with questions
 */
export async function getQuizWithQuestions(quizId) {
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)
    .single();

  if (quizError) {
    console.error('Error fetching quiz:', quizError);
    throw quizError;
  }

  const { data: questions, error: questionsError } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('order_index', { ascending: true });

  if (questionsError) {
    console.error('Error fetching questions:', questionsError);
    throw questionsError;
  }

  return {
    ...quiz,
    questions: questions || [],
  };
}

/**
 * Create a new quiz
 * @param {Object} quizData - Quiz data
 * @returns {Promise<Object>} Created quiz
 */
export async function createQuiz({
  title,
  description,
  timeLimitMinutes,
  passingScore,
  allowRetakes,
  showCorrectAnswers,
  shuffleQuestions,
}) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      teacher_id: user.id,
      title,
      description,
      time_limit_minutes: timeLimitMinutes,
      passing_score: passingScore || 70,
      allow_retakes: allowRetakes !== false,
      show_correct_answers: showCorrectAnswers !== false,
      shuffle_questions: shuffleQuestions || false,
      total_points: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating quiz:', error);
    throw error;
  }

  return data;
}

/**
 * Update a quiz
 * @param {string} quizId - Quiz ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated quiz
 */
export async function updateQuiz(quizId, updates) {
  const { data, error } = await supabase
    .from('quizzes')
    .update(updates)
    .eq('id', quizId)
    .select()
    .single();

  if (error) {
    console.error('Error updating quiz:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a quiz
 * @param {string} quizId - Quiz ID
 * @returns {Promise<void>}
 */
export async function deleteQuiz(quizId) {
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quizId);

  if (error) {
    console.error('Error deleting quiz:', error);
    throw error;
  }
}

/**
 * Add a question to a quiz
 * @param {Object} questionData - Question data
 * @returns {Promise<Object>} Created question
 */
export async function addQuizQuestion({
  quizId,
  questionText,
  questionType,
  orderIndex,
  points,
  options,
  correctAnswer,
}) {
  const { data, error } = await supabase
    .from('quiz_questions')
    .insert({
      quiz_id: quizId,
      question_text: questionText,
      question_type: questionType,
      order_index: orderIndex,
      points: points || 1,
      options: questionType === 'multiple_choice' ? options : null,
      correct_answer: questionType !== 'multiple_choice' ? correctAnswer : null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding question:', error);
    throw error;
  }

  // Update total points for quiz
  await updateQuizTotalPoints(quizId);

  return data;
}

/**
 * Update a quiz question
 * @param {string} questionId - Question ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated question
 */
export async function updateQuizQuestion(questionId, updates) {
  const { data, error } = await supabase
    .from('quiz_questions')
    .update(updates)
    .eq('id', questionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating question:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a quiz question
 * @param {string} questionId - Question ID
 * @param {string} quizId - Quiz ID
 * @returns {Promise<void>}
 */
export async function deleteQuizQuestion(questionId, quizId) {
  const { error } = await supabase
    .from('quiz_questions')
    .delete()
    .eq('id', questionId);

  if (error) {
    console.error('Error deleting question:', error);
    throw error;
  }

  // Update total points for quiz
  await updateQuizTotalPoints(quizId);
}

/**
 * Update total points for a quiz
 * @param {string} quizId - Quiz ID
 * @returns {Promise<void>}
 */
async function updateQuizTotalPoints(quizId) {
  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('points')
    .eq('quiz_id', quizId);

  const totalPoints = (questions || []).reduce((sum, q) => sum + (q.points || 0), 0);

  await supabase
    .from('quizzes')
    .update({ total_points: totalPoints })
    .eq('id', quizId);
}

/**
 * Assign a quiz to a class
 * @param {Object} assignmentData - Assignment data
 * @returns {Promise<Object>} Created assignment
 */
export async function assignQuizToClass({
  quizId,
  classId,
  dueDate,
  timeLimitOverride,
}) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('quiz_assignments')
    .insert({
      quiz_id: quizId,
      class_id: classId,
      assigned_by: user.id,
      due_date: dueDate,
      time_limit_override: timeLimitOverride,
      is_published: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Quiz is already assigned to this class');
    }
    console.error('Error assigning quiz:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// Student - Quiz Taking
// ============================================================================

/**
 * Get all quiz assignments for a class
 * @param {string} classId - Class ID
 * @returns {Promise<Array>} Array of quiz assignments
 */
export async function getClassQuizzes(classId) {
  const { data, error } = await supabase
    .from('quiz_assignments')
    .select(`
      *,
      quiz:quizzes(
        *,
        teacher:profiles!quizzes_teacher_id_fkey(username)
      )
    `)
    .eq('class_id', classId)
    .eq('is_published', true)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching class quizzes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get student's quiz attempts
 * @param {string} quizAssignmentId - Quiz assignment ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} Array of quiz responses
 */
export async function getStudentQuizAttempts(quizAssignmentId, studentId) {
  const { data, error } = await supabase
    .from('quiz_responses')
    .select('*')
    .eq('quiz_assignment_id', quizAssignmentId)
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Error fetching quiz attempts:', error);
    throw error;
  }

  return data || [];
}

/**
 * Start a quiz attempt
 * @param {Object} attemptData - Attempt data
 * @returns {Promise<Object>} Created quiz response
 */
export async function startQuizAttempt({ quizAssignmentId }) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get previous attempts count
  const { data: previousAttempts } = await supabase
    .from('quiz_responses')
    .select('attempt_number')
    .eq('quiz_assignment_id', quizAssignmentId)
    .eq('student_id', user.id)
    .order('attempt_number', { ascending: false })
    .limit(1);

  const attemptNumber = previousAttempts?.[0]?.attempt_number
    ? previousAttempts[0].attempt_number + 1
    : 1;

  const { data, error } = await supabase
    .from('quiz_responses')
    .insert({
      quiz_assignment_id: quizAssignmentId,
      student_id: user.id,
      answers: [],
      score: 0,
      total_possible: 0,
      attempt_number: attemptNumber,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error starting quiz attempt:', error);
    throw error;
  }

  return data;
}

/**
 * Submit a quiz attempt
 * @param {Object} submissionData - Submission data
 * @returns {Promise<Object>} Submitted quiz response
 */
export async function submitQuizAttempt({
  responseId,
  answers,
  timeSpentSeconds,
}) {
  // Calculate score
  let score = 0;
  let totalPossible = 0;

  answers.forEach((answer) => {
    totalPossible += answer.points || 0;
    if (answer.is_correct) {
      score += answer.points || 0;
    }
  });

  // Check if needs manual grading (has short answer questions)
  const needsGrading = answers.some(
    (a) => a.question_type === 'short_answer' && a.is_correct === null
  );

  const { data, error } = await supabase
    .from('quiz_responses')
    .update({
      answers,
      score,
      total_possible: totalPossible,
      time_spent_seconds: timeSpentSeconds,
      submitted_at: new Date().toISOString(),
      is_graded: !needsGrading,
    })
    .eq('id', responseId)
    .select()
    .single();

  if (error) {
    console.error('Error submitting quiz:', error);
    throw error;
  }

  return data;
}

/**
 * Get quiz results for a student
 * @param {string} responseId - Quiz response ID
 * @returns {Promise<Object>} Quiz results with feedback
 */
export async function getQuizResults(responseId) {
  const { data, error } = await supabase
    .from('quiz_responses')
    .select(`
      *,
      quiz_assignment:quiz_assignments(
        *,
        quiz:quizzes(*)
      )
    `)
    .eq('id', responseId)
    .single();

  if (error) {
    console.error('Error fetching quiz results:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// Teacher - Grading
// ============================================================================

/**
 * Get all responses for a quiz assignment
 * @param {string} quizAssignmentId - Quiz assignment ID
 * @returns {Promise<Array>} Array of responses with student info
 */
export async function getQuizResponses(quizAssignmentId) {
  const { data, error } = await supabase
    .from('quiz_responses')
    .select(`
      *,
      student:profiles!quiz_responses_student_id_fkey(id, username, avatar_url)
    `)
    .eq('quiz_assignment_id', quizAssignmentId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Error fetching quiz responses:', error);
    throw error;
  }

  return data || [];
}

/**
 * Grade a quiz response manually
 * @param {string} responseId - Response ID
 * @param {Array} gradedAnswers - Updated answers with scores
 * @returns {Promise<Object>} Updated response
 */
export async function gradeQuizResponse(responseId, gradedAnswers) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Calculate final score
  let score = 0;
  let totalPossible = 0;

  gradedAnswers.forEach((answer) => {
    totalPossible += answer.points || 0;
    if (answer.is_correct) {
      score += answer.points || 0;
    }
  });

  const { data, error } = await supabase
    .from('quiz_responses')
    .update({
      answers: gradedAnswers,
      score,
      total_possible: totalPossible,
      is_graded: true,
      graded_by: user.id,
      graded_at: new Date().toISOString(),
    })
    .eq('id', responseId)
    .select()
    .single();

  if (error) {
    console.error('Error grading quiz:', error);
    throw error;
  }

  return data;
}

/**
 * Get quiz statistics for a teacher
 * @param {string} quizAssignmentId - Quiz assignment ID
 * @returns {Promise<Object>} Quiz statistics
 */
export async function getQuizStatistics(quizAssignmentId) {
  const responses = await getQuizResponses(quizAssignmentId);

  const completedResponses = responses.filter((r) => r.submitted_at !== null);
  const gradedResponses = completedResponses.filter((r) => r.is_graded);

  const stats = {
    total_assigned: responses.length,
    total_completed: completedResponses.length,
    total_graded: gradedResponses.length,
    completion_rate: responses.length > 0
      ? Math.round((completedResponses.length / responses.length) * 100)
      : 0,
    avg_score: gradedResponses.length > 0
      ? gradedResponses.reduce((sum, r) => sum + (r.percentage || 0), 0) / gradedResponses.length
      : 0,
    avg_time_minutes: completedResponses.length > 0
      ? completedResponses.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / completedResponses.length / 60
      : 0,
    passing_count: gradedResponses.filter((r) => r.percentage >= 70).length,
    failing_count: gradedResponses.filter((r) => r.percentage < 70).length,
  };

  return stats;
}
