router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check cooldown
    const cooldown = checkCooldown(normalizedEmail);

    if (!cooldown.allowed) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${cooldown.remainingSeconds} seconds before requesting another OTP.`,
      });
    }

    // Generate OTP
    const otp = generateAndStoreOTP(normalizedEmail);

    // Send email
    const emailResult = await sendOtpEmail(normalizedEmail, otp);

    // IMPORTANT:
    // Don't tell the frontend that the email was sent if it failed.
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Unable to send OTP. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully.",
    });

  } catch (error) {
    console.error("SEND OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending OTP.",
    });
  }
});