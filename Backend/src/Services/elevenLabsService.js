const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

const generateSpeech = async (text) => {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  if (!process.env.ELEVENLABS_VOICE_ID) {
    throw new Error("ELEVENLABS_VOICE_ID is not configured");
  }

  if (!text || typeof text !== "string") {
    throw new Error("Text is required");
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  const modelId =
    process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5";

  const response = await fetch(
    `${ELEVENLABS_API_URL}/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },

      body: JSON.stringify({
        text,
        model_id: modelId,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error("ElevenLabs API Error:", errorText);

    throw new Error(
      `ElevenLabs API failed with status ${response.status}`
    );
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());

  return audioBuffer;
};

module.exports = {
  generateSpeech,
};