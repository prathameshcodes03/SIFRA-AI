const express = require("express");

const router = express.Router();

const {
  generateSpeech,
} = require("../Services/elevenLabsService");


// POST /api/voice/coaching
router.post("/coaching", async (req, res) => {
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
    console.error("Voice Coaching Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate voice coaching",
      error: error.message,
    });
  }
});


module.exports = router;