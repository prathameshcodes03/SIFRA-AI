const { BrevoClient } = require("@getbrevo/brevo");

const brevoApiKey = process.env.BREVO_API_KEY;

if (!brevoApiKey) {
  console.error("❌ BREVO_API_KEY is not configured.");
} else {
  console.log("✅ BREVO_API_KEY detected.");
}

const client = brevoApiKey
  ? new BrevoClient({
      apiKey: brevoApiKey,
    })
  : null;

const sendOtpEmail = async (toEmail, otp) => {
  try {
    if (!client) {
      return {
        success: false,
        message: "Email service is not configured.",
      };
    }

    if (!toEmail || !otp) {
      return {
        success: false,
        message: "Recipient email and OTP are required.",
      };
    }

    const response = await client.transactionalEmails.sendTransacEmail({
      sender: {
        name: "Sifra.AI",
        email: process.env.EMAIL_SENDER,
      },
      to: [
        {
          email: toEmail,
        },
      ],
      subject: `${otp} is your Sifra.AI verification code`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <body style="
            margin: 0;
            padding: 0;
            background: #0f172a;
            font-family: Arial, sans-serif;
          ">

            <div style="
              max-width: 500px;
              margin: 40px auto;
              padding: 35px;
              background: #111827;
              border-radius: 18px;
              color: white;
            ">

              <h1>Sifra.AI</h1>

              <p style="color: #cbd5e1;">
                Verify your email address to continue creating your account.
              </p>

              <div style="
                margin: 30px 0;
                padding: 25px;
                background: #1e293b;
                border-radius: 14px;
                text-align: center;
              ">

                <p style="color: #94a3b8;">
                  Your verification code
                </p>

                <div style="
                  font-size: 36px;
                  font-weight: bold;
                  letter-spacing: 8px;
                ">
                  ${otp}
                </div>

              </div>

              <p style="color: #cbd5e1;">
                This code will expire in <strong>10 minutes</strong>.
              </p>

              <p style="
                color: #64748b;
                font-size: 13px;
              ">
                If you didn't request this code, you can safely ignore this
                email.
              </p>

              <hr style="
                border: none;
                border-top: 1px solid #334155;
                margin: 30px 0;
              ">

              <p style="
                color: #64748b;
                font-size: 12px;
                text-align: center;
              ">
                © ${new Date().getFullYear()} Sifra.AI
              </p>

            </div>

          </body>
        </html>
      `,
    });

    console.log("✅ OTP email sent through Brevo HTTP API");
    console.log("📩 Brevo response:", response);

    return {
      success: true,
      messageId: response?.messageId,
    };
  } catch (error) {
    console.error("❌ Brevo API error:", error);

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