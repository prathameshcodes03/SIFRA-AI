const nodemailer = require("nodemailer");

const getTransporter = () => {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;

  if (!user || !pass) {
    return null;
  }

  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Default to Gmail service
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
};

/**
 * Sends a 6-digit OTP email using nodemailer.
 * If SMTP credentials are not configured, prints the OTP to console for local testing.
 */
const sendOtpEmail = async (toEmail, otp) => {
  const mailTransporter = getTransporter();
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || "noreply@sifra.ai";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sifra.AI Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0b14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0b14; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width: 500px; background: linear-gradient(180deg, #161626 0%, #0d0d1a 100%); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); padding: 40px 32px; text-align: center;">
                <tr>
                  <td>
                    <!-- Brand Header -->
                    <div style="display: inline-block; padding: 8px 18px; border-radius: 9999px; background: rgba(147, 51, 234, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); margin-bottom: 24px;">
                      <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #c084fc;">
                        Sifra AI Verification
                      </span>
                    </div>

                    <h1 style="margin: 0 0 12px 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                      Verify Your Account
                    </h1>
                    <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #9ca3af;">
                      Thank you for joining Sifra.AI. Please enter the verification code below to complete your registration.
                    </p>

                    <!-- OTP Box -->
                    <div style="background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 14px; padding: 22px 10px; margin-bottom: 28px;">
                      <span style="display: block; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #a855f7; font-family: 'Courier New', Courier, monospace; margin-left: 12px;">
                        ${otp}
                      </span>
                    </div>

                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #9ca3af;">
                      This code is valid for <strong style="color: #e5e7eb;">10 minutes</strong>. Do not share this code with anyone.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                      If you did not request this code, you can safely ignore this email.
                    </p>

                    <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
                      <p style="margin: 0; font-size: 12px; color: #4b5563;">
                        © ${new Date().getFullYear()} Sifra AI. All rights reserved.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  if (!mailTransporter) {
    console.warn("\n=======================================================");
    console.warn("⚠️  NODEMAILER NOTICE: SMTP credentials not found in .env");
    console.warn(`📩  Simulated OTP email to: ${toEmail}`);
    console.warn(`🔑  OTP CODE: ${otp}`);
    console.warn("ℹ️  To send real emails, set SMTP_USER & SMTP_PASS in .env");
    console.warn("=======================================================\n");

    return {
      success: true,
      simulated: true,
      message: "OTP generated (logged in server console for development).",
    };
  }

  try {
    const info = await mailTransporter.sendMail({
      from: `"Sifra AI" <${fromEmail}>`,
      to: toEmail,
      subject: `Your Sifra.AI Verification Code: ${otp}`,
      text: `Your Sifra.AI verification code is: ${otp}. It expires in 10 minutes.`,
      html: htmlContent,
    });

    console.log(`✅ Verification email sent to ${toEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Failed to send email via nodemailer:", error.message);
    console.warn("\n=======================================================");
    console.warn(`🔑  FALLBACK OTP CODE FOR ${toEmail}: ${otp}`);
    console.warn(`⚠️  SMTP Delivery note: ${error.message}`);
    console.warn("ℹ️  Use the 6-digit OTP code above to complete verification.");
    console.warn("=======================================================\n");

    // Don't crash registration if SMTP provider fails or blocks in development
    return {
      success: true,
      simulated: true,
      otp,
      message: "Email delivery failed, but OTP was generated. Check server console.",
    };
  }
};

module.exports = {
  sendOtpEmail,
  getTransporter,
};
