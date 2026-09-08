const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOtpEmail = async (toEmail, otp) => {
  try {
    const response = await resend.emails.send({
      from: "Sifra.AI <onboarding@resend.dev>",
      to: [toEmail],
      subject: `${otp} is your Sifra.AI verification code`,
      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 500px;
          margin: auto;
          padding: 30px;
          border-radius: 16px;
          background: #111827;
          color: white;
        ">
          <h1 style="margin-bottom: 10px;">Sifra.AI</h1>

          <p>Your verification code is:</p>

          <div style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            padding: 20px;
            text-align: center;
            background: #1f2937;
            border-radius: 12px;
          ">
            ${otp}
          </div>

          <p style="margin-top: 20px;">
            This code will expire in 10 minutes.
          </p>

          <p style="color: #9ca3af;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log("✅ OTP email sent through Resend");
    console.log("📩 Resend response:", response);

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error) {
    console.error("❌ Resend HTTP API error:", error);

    return {
      success: false,
      message: "Failed to send verification email.",
      error: error.message,
    };
  }
};

module.exports = {
  sendOtpEmail,
};