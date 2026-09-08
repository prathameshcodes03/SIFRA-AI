const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (toEmail, otp) => {
  try {
    const info = await transporter.sendMail({
      from: `"Sifra.AI" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `${otp} is your Sifra.AI verification code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px;">
          <h1>Sifra.AI</h1>
          <p>Your verification code is:</p>
          <h2 style="letter-spacing: 8px;">${otp}</h2>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });

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

module.exports = {
  sendOtpEmail,
};