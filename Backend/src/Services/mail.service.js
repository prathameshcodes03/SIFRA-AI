const { BrevoClient } = require("@getbrevo/brevo");

// ==========================================
// BREVO CONFIGURATION
// ==========================================

const brevoApiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.EMAIL_SENDER;

// Check environment variables
if (!brevoApiKey) {
  console.error("❌ BREVO_API_KEY is not configured.");
} else {
  console.log("✅ BREVO_API_KEY detected.");
}

if (!senderEmail) {
  console.error("❌ EMAIL_SENDER is not configured.");
} else {
  console.log("✅ EMAIL_SENDER configured.");
}

// Create Brevo client
const client = brevoApiKey
  ? new BrevoClient({
      apiKey: brevoApiKey,
    })
  : null;

// ==========================================
// SEND OTP EMAIL
// ==========================================

const sendOtpEmail = async (toEmail, otp) => {
  try {
    // Check Brevo client
    if (!client) {
      return {
        success: false,
        message: "Email service is not configured.",
      };
    }

    // Check sender
    if (!senderEmail) {
      return {
        success: false,
        message: "EMAIL_SENDER is not configured.",
      };
    }

    // Check recipient
    if (!toEmail) {
      return {
        success: false,
        message: "Recipient email is required.",
      };
    }

    // Check OTP
    if (!otp) {
      return {
        success: false,
        message: "OTP is required.",
      };
    }

    // ==========================================
    // SEND THROUGH BREVO HTTP API
    // ==========================================

    const response =
      await client.transactionalEmails.sendTransacEmail({
        sender: {
          name: "Sifra.AI",
          email: senderEmail,
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

          <head>
            <meta charset="UTF-8">
            <title>Sifra.AI Verification Code</title>
          </head>

          <body style="
            margin: 0;
            padding: 0;
            background-color: #0f172a;
            font-family: Arial, Helvetica, sans-serif;
          ">

            <div style="
              max-width: 500px;
              margin: 40px auto;
              padding: 35px;
              background-color: #111827;
              border-radius: 18px;
              color: #ffffff;
            ">

              <h1 style="
                margin: 0 0 15px 0;
                font-size: 30px;
              ">
                Sifra.AI
              </h1>

              <p style="
                color: #cbd5e1;
                font-size: 16px;
                line-height: 1.6;
              ">
                Verify your email address to continue
                creating your Sifra.AI account.
              </p>

              <div style="
                margin: 30px 0;
                padding: 25px;
                background-color: #1e293b;
                border-radius: 14px;
                text-align: center;
              ">

                <p style="
                  margin: 0 0 12px 0;
                  color: #94a3b8;
                  font-size: 14px;
                ">
                  Your verification code
                </p>

                <div style="
                  font-size: 36px;
                  font-weight: bold;
                  letter-spacing: 8px;
                  color: #ffffff;
                ">
                  ${otp}
                </div>

              </div>

              <p style="
                color: #cbd5e1;
                font-size: 15px;
              ">
                This verification code will expire in
                <strong>10 minutes</strong>.
              </p>

              <p style="
                color: #64748b;
                font-size: 13px;
                line-height: 1.5;
              ">
                If you didn't request this code,
                you can safely ignore this email.
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

    // ==========================================
    // SUCCESS
    // ==========================================

    console.log("✅ OTP email sent through Brevo HTTP API");

    return {
      success: true,
      message: "OTP email sent successfully.",
      messageId: response?.messageId,
    };

  } catch (error) {

    // ==========================================
    // ERROR
    // ==========================================

    console.error("❌ Brevo API error:", error);

    return {
      success: false,
      message: "Failed to send verification email.",
      error: error.message,
    };
  }
};

// ==========================================
// SEND PASSWORD RESET EMAIL
// ==========================================

const sendPasswordResetEmail = async (toEmail, resetUrl) => {
  try {
    if (!client) {
      return { success: false, message: "Email service is not configured." };
    }
    if (!senderEmail) {
      return { success: false, message: "EMAIL_SENDER is not configured." };
    }
    if (!toEmail || !resetUrl) {
      return { success: false, message: "Recipient and reset URL are required." };
    }

    const response = await client.transactionalEmails.sendTransacEmail({
      sender: { name: "Sifra.AI", email: senderEmail },
      to: [{ email: toEmail }],
      subject: "Reset your Sifra.AI password",
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>Sifra.AI Password Reset</title></head>
        <body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
          <div style="max-width:500px;margin:40px auto;padding:35px;background-color:#111827;border-radius:18px;color:#ffffff;">
            <h1 style="margin:0 0 15px 0;font-size:30px;">Sifra.AI</h1>
            <p style="color:#cbd5e1;font-size:16px;line-height:1.6;">
              We received a request to reset your password. Click the button below to set a new password. This link expires in 15 minutes.
            </p>
            <div style="margin:30px 0;text-align:center;">
              <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background-color:#4F46E5;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Reset Password</a>
            </div>
            <p style="color:#94a3b8;font-size:13px;line-height:1.6;">
              If you did not request this, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    return { success: true, message: "Email sent." };
  } catch (error) {
    console.error("PASSWORD RESET EMAIL ERROR:", error?.message || error);
    return { success: false, message: "Failed to send reset email." };
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  sendOtpEmail,
  sendPasswordResetEmail,
};