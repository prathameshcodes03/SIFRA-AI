const coachingMessages = {
  correct: "Great form. Keep going.",

  shallow: "Go a little deeper.",

  forward_lean: "Keep your chest more upright.",

  knees_caving:
    "Keep your knees aligned with your toes.",

  pushup_correct:
    "Good push-up form. Keep going.",

  pushup_elbow_flare:
    "Keep your elbows closer to your body.",

  pushup_body_sag:
    "Keep your body straight.",

  pushup_hips_high:
    "Lower your hips and maintain a straight line.",

  plank_correct:
    "Great plank. Keep holding.",

  plank_hips_high:
    "Lower your hips slightly.",

  plank_hips_low:
    "Raise your hips slightly.",
};

const getCoachingMessage = (prediction) => {
  return coachingMessages[prediction] || null;
};

module.exports = {
  coachingMessages,
  getCoachingMessage,
};