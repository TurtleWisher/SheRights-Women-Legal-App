const db = require('../config/db');

// ─────────────────────────────────────────
// GET ALL LEARNING MODULES
// GET /api/learn
// Returns all available comics, videos, stories
// ─────────────────────────────────────────
const getAllModules = async (req, res) => {
  const user_id = req.user.user_id;

  // Fetch all modules along with whether this user has started/completed them
  const [modules] = await db.query(
    `SELECT 
      lm.*,
      ua.status AS user_status,
      ua.score_earned,
      ua.completed_at
     FROM learning_modules lm
     LEFT JOIN user_achievements ua 
       ON lm.module_id = ua.module_id AND ua.user_id = ?
     ORDER BY lm.module_id ASC`,
    [user_id]
  );

  return res.status(200).json({
    status: 'success',
    count: modules.length,
    data: modules
  });
};


// ─────────────────────────────────────────
// GET ONE MODULE WITH ITS QUIZ
// GET /api/learn/:id
// Returns module details + quiz questions + options
// ─────────────────────────────────────────
const getModuleById = async (req, res) => {
  const { id } = req.params;

  // Fetch the module
  const [modules] = await db.query(
    'SELECT * FROM learning_modules WHERE module_id = ?',
    [id]
  );

  if (modules.length === 0) {
    return res.status(404).json({
      status: 'error',
      message: 'Module not found'
    });
  }

  // Fetch the quiz attached to this module
  const [quizzes] = await db.query(
    'SELECT * FROM quizzes WHERE module_id = ?',
    [id]
  );

  let quiz = null;

  if (quizzes.length > 0) {
    const quiz_id = quizzes[0].quiz_id;

    // Fetch all questions for this quiz
    const [questions] = await db.query(
      'SELECT * FROM quiz_questions WHERE quiz_id = ?',
      [quiz_id]
    );

    // Fetch options for each question
    const questionsWithOptions = await Promise.all(
      questions.map(async (question) => {
        const [options] = await db.query(
          // We never send is_correct to the frontend — that would be cheating
          'SELECT option_id, option_text FROM quiz_options WHERE question_id = ?',
          [question.question_id]
        );
        return { ...question, options };
      })
    );

    quiz = { ...quizzes[0], questions: questionsWithOptions };
  }

  return res.status(200).json({
    status: 'success',
    data: {
      ...modules[0],
      quiz
    }
  });
};


// ─────────────────────────────────────────
// MARK MODULE AS STARTED
// POST /api/learn/:id/start
// Records that the user opened this module
// ─────────────────────────────────────────
const startModule = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.user_id;

  // Check if already started or completed
  const [existing] = await db.query(
    'SELECT * FROM user_achievements WHERE user_id = ? AND module_id = ?',
    [user_id, id]
  );

  if (existing.length > 0) {
    return res.status(200).json({
      status: 'success',
      message: 'Module already in progress',
      data: existing[0]
    });
  }

  // Create a new achievement record with Started status
  await db.query(
    `INSERT INTO user_achievements (user_id, module_id, status)
     VALUES (?, ?, 'Started')`,
    [user_id, id]
  );

  return res.status(201).json({
    status: 'success',
    message: 'Module started'
  });
};


// ─────────────────────────────────────────
// SUBMIT QUIZ ANSWERS
// POST /api/learn/:id/submit
// Checks answers, calculates score, awards points
// ─────────────────────────────────────────
const submitQuiz = async (req, res) => {
  const { id } = req.params; // module_id
  const user_id = req.user.user_id;
  const { answers } = req.body;
  // answers format: [{ question_id: 1, option_id: 3 }, ...]

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Answers array is required'
    });
  }

  // Fetch the quiz for this module
  const [quizzes] = await db.query(
    'SELECT * FROM quizzes WHERE module_id = ?',
    [id]
  );

  if (quizzes.length === 0) {
    return res.status(404).json({
      status: 'error',
      message: 'No quiz found for this module'
    });
  }

  const quiz = quizzes[0];

  // Fetch all questions with their correct answers
  const [questions] = await db.query(
    'SELECT * FROM quiz_questions WHERE quiz_id = ?',
    [quiz.quiz_id]
  );

  let score = 0;
  const results = [];

  // Check each submitted answer against the correct one
  for (const answer of answers) {
    const question = questions.find(q => q.question_id === answer.question_id);
    if (!question) continue;

    // Fetch the correct option for this question
    const [correctOption] = await db.query(
      'SELECT option_id FROM quiz_options WHERE question_id = ? AND is_correct = TRUE',
      [answer.question_id]
    );

    const isCorrect =
      correctOption.length > 0 &&
      correctOption[0].option_id === answer.option_id;

    if (isCorrect) score += question.points;

    results.push({
      question_id: answer.question_id,
      correct: isCorrect,
      points_earned: isCorrect ? question.points : 0
    });
  }

  const passed = score >= quiz.passing_score;

  // Update the user's achievement record
  await db.query(
    `INSERT INTO user_achievements (user_id, module_id, status, score_earned, completed_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       score_earned = VALUES(score_earned),
       completed_at = VALUES(completed_at)`,
    [
      user_id, id,
      passed ? 'Completed' : 'Started',
      score,
      passed ? new Date() : null
    ]
  );

  // If passed, add the module's reward points to the citizen's total
  if (passed) {
    const [modules] = await db.query(
      'SELECT points_reward FROM learning_modules WHERE module_id = ?',
      [id]
    );

    if (modules.length > 0) {
      await db.query(
        `UPDATE citizen_profiles 
         SET total_gamification_points = total_gamification_points + ?
         WHERE user_id = ?`,
        [modules[0].points_reward, user_id]
      );
    }
  }

  return res.status(200).json({
    status: 'success',
    data: {
      score,
      passing_score: quiz.passing_score,
      passed,
      results
    }
  });
};


// ─────────────────────────────────────────
// GET USER'S POINTS AND ACHIEVEMENTS
// GET /api/learn/my-progress
// ─────────────────────────────────────────
const getMyProgress = async (req, res) => {
  const user_id = req.user.user_id;

  // Fetch total points from citizen profile
  const [profile] = await db.query(
    'SELECT total_gamification_points FROM citizen_profiles WHERE user_id = ?',
    [user_id]
  );

  // Fetch all completed modules
  const [achievements] = await db.query(
    `SELECT 
      ua.status, ua.score_earned, ua.completed_at,
      lm.title, lm.content_type, lm.points_reward
     FROM user_achievements ua
     JOIN learning_modules lm ON ua.module_id = lm.module_id
     WHERE ua.user_id = ?
     ORDER BY ua.completed_at DESC`,
    [user_id]
  );

  return res.status(200).json({
    status: 'success',
    data: {
      total_points: profile[0]?.total_gamification_points || 0,
      achievements
    }
  });
};


module.exports = {
  getAllModules,
  getModuleById,
  startModule,
  submitQuiz,
  getMyProgress
};