/**
 * VARK Assessment Scoring Calculator
 *
 * Calculates learning style percentages based on user responses
 * with domain-weighted scoring for more accurate results.
 */

/**
 * Calculate VARK scores from assessment responses
 * @param {Array} responses - Array of response objects with {questionId, selectedStyle, domainWeight}
 * @returns {Object} - Normalized percentage scores for each VARK style
 */
export function calculateVARKScores(responses) {
  // Initialize scores for each style
  const rawScores = {
    visual: 0,
    auditory: 0,
    reading_writing: 0,
    kinesthetic: 0,
  };

  // Sum up weighted scores for each style
  responses.forEach((response) => {
    const { selectedStyle, domainWeight = 1.0 } = response;
    if (selectedStyle && rawScores.hasOwnProperty(selectedStyle)) {
      rawScores[selectedStyle] += domainWeight;
    }
  });

  // Calculate total score
  const totalScore = Object.values(rawScores).reduce((sum, score) => sum + score, 0);

  // Normalize to percentages (0-100) that sum to 100
  const percentageScores = {};
  if (totalScore > 0) {
    Object.keys(rawScores).forEach((style) => {
      percentageScores[style] = Math.round((rawScores[style] / totalScore) * 100);
    });

    // Ensure scores sum to exactly 100 (handle rounding errors)
    const sum = Object.values(percentageScores).reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      // Adjust the dominant style to make it sum to 100
      const dominantStyle = Object.keys(percentageScores).reduce((a, b) =>
        percentageScores[a] > percentageScores[b] ? a : b
      );
      percentageScores[dominantStyle] += 100 - sum;
    }
  } else {
    // Default to equal distribution if no responses
    Object.keys(rawScores).forEach((style) => {
      percentageScores[style] = 25;
    });
  }

  return percentageScores;
}

/**
 * Get the dominant learning style(s)
 * @param {Object} scores - Percentage scores object
 * @param {number} threshold - Minimum percentage to be considered dominant (default: 30)
 * @returns {Array} - Array of dominant style names
 */
export function getDominantStyles(scores, threshold = 30) {
  return Object.entries(scores)
    .filter(([_, percentage]) => percentage >= threshold)
    .sort(([, a], [, b]) => b - a)
    .map(([style]) => style);
}

/**
 * Get a user-friendly interpretation of the results
 * @param {Object} scores - Percentage scores object
 * @returns {Object} - Interpretation with dominant, secondary, and description
 */
export function interpretVARKResults(scores) {
  const styleNames = {
    visual: 'Visual',
    auditory: 'Auditory',
    reading_writing: 'Reading/Writing',
    kinesthetic: 'Kinesthetic',
  };

  const styleDescriptions = {
    visual:
      'You learn best through images, diagrams, charts, and visual demonstrations. Seeing information helps you understand and remember it.',
    auditory:
      'You learn best through listening, discussions, and verbal explanations. Hearing information and talking about it helps solidify your understanding.',
    reading_writing:
      'You learn best through reading and writing. Taking detailed notes, reading textbooks, and expressing ideas in writing are your strengths.',
    kinesthetic:
      'You learn best through hands-on experiences, practical activities, and real-world applications. Doing and experiencing helps you learn.',
  };

  // Sort styles by percentage
  const sortedStyles = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([style, percentage]) => ({
      style,
      name: styleNames[style],
      percentage,
    }));

  const dominant = sortedStyles[0];
  const secondary = sortedStyles[1].percentage >= 25 ? sortedStyles[1] : null;

  // Determine if multimodal (two or more styles above 25%)
  const multimodalStyles = sortedStyles.filter((s) => s.percentage >= 25);
  const isMultimodal = multimodalStyles.length > 1;

  return {
    dominant: {
      style: dominant.style,
      name: dominant.name,
      percentage: dominant.percentage,
      description: styleDescriptions[dominant.style],
    },
    secondary: secondary
      ? {
          style: secondary.style,
          name: secondary.name,
          percentage: secondary.percentage,
          description: styleDescriptions[secondary.style],
        }
      : null,
    isMultimodal,
    multimodalStyles: isMultimodal ? multimodalStyles : null,
    allScores: sortedStyles,
    interpretation: isMultimodal
      ? `You're a multimodal learner with strengths in ${multimodalStyles.map((s) => s.name).join(' and ')}. This means you can adapt your learning approach based on the material and situation.`
      : `You're primarily a ${dominant.name} learner. ${styleDescriptions[dominant.style]}`,
  };
}

/**
 * Format style name for display
 * @param {string} style - Style name (snake_case)
 * @returns {string} - Formatted name
 */
export function formatStyleName(style) {
  const names = {
    visual: 'Visual',
    auditory: 'Auditory',
    reading_writing: 'Reading/Writing',
    kinesthetic: 'Kinesthetic',
  };
  return names[style] || style;
}

/**
 * Get color theme for a learning style
 * @param {string} style - Style name
 * @returns {Object} - Color theme object
 */
export function getStyleColor(style) {
  const colors = {
    visual: {
      primary: '#9333EA', // purple-600
      light: '#F3E8FF', // purple-100
      bg: '#FAF5FF', // purple-50
      border: '#E9D5FF', // purple-200
    },
    auditory: {
      primary: '#0891B2', // cyan-600
      light: '#CFFAFE', // cyan-100
      bg: '#ECFEFF', // cyan-50
      border: '#A5F3FC', // cyan-200
    },
    reading_writing: {
      primary: '#059669', // emerald-600
      light: '#D1FAE5', // emerald-100
      bg: '#ECFDF5', // emerald-50
      border: '#A7F3D0', // emerald-200
    },
    kinesthetic: {
      primary: '#DC2626', // red-600
      light: '#FEE2E2', // red-100
      bg: '#FEF2F2', // red-50
      border: '#FECACA', // red-200
    },
  };
  return colors[style] || colors.visual;
}
