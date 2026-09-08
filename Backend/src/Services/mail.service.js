const nodemailer = require("nodemailer");

// ==========================================
// GMAIL TRANSPORTER
// ==========================================

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ==========================================
// SEND OTP EMAIL
// ==========================================

const sendOtpEmail = async (toEmail, otp) => {
  try {
    const mailOptions = {
      from: `"Sifra.AI" <${process.env.EMAIL_USER}>`,

      to: toEmail,

      subject: `${otp} is your Sifra.AI verification code`,

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 40px auto;
          padding: 30px;
          background: #f8fafc;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
        ">

          <h1 style="
            margin: 0 0 20px;
            color: #111827;
          ">
            Sifra.AI
          </h1>

          <p style="
            color: #4b5563;
            font-size: 16px;
          ">
            Hello,
          </p>

          <p style="
            color: #4b5563;
            font-size: 16px;
          ">
            Use the following verification code to complete
            your Sifra.AI registration:
          </p>

          <div style="
            margin: 30px 0;
            padding: 20px;
            text-align: center;
            background: #ffffff;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
          ">

            <span style="
              font-size: 34px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #111827;
            ">
              ${otp}
            </span>

          </div>

          <p style="
            color: #6b7280;
            font-size: 14px;
          ">
            This verification code will expire in 10 minutes.
          </p>

          <p style="
            color: #6b7280;
            font-size: 14px;
          ">
            If you did not request this code, you can safely
            ignore this email.
          </p>

          <hr style="
            margin: 30px 0;
            border: none;
            border-top: 1px solid #e5e7eb;
          " />

          <p style="
            color: #9ca3af;
            font-size: 12px;
            text-align: center;
          ">
            © Sifra.AI
          </p>

        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ OTP email sent successfully");
    console.log("📩 Message ID:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };

  } catch (error) {

    console.error("❌ Nodemailer error:", error);

    return {
      success: false,
      message: "Failed to send verification email.",
      error: error.message,
    };
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  sendOtpEmail,
};