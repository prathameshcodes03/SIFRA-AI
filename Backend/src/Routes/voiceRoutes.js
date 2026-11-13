const express = require("express");

const router = express.Router();

const {
  generateSpeech,
} = require("../Services/elevenLabsService");

const { voiceLimiter } = require("../Middlewares/rateLimiter");


// POST /api/voice/coaching — rate-limited to protect ElevenLabs credits.
router.post("/coaching", voiceLimiter, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    const audioBuffer = await generateSpeech(text);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
      "Cache-Control": "no-cache",
    });

    return res.send(audioBuffer);

  } catch (error) {
    console.error("Voice Coaching Error:", {
      name: error.name,
      message: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to generate voice coaching",
    });
  }
});


module.exports = router;