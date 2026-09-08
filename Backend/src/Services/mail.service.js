const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOtpEmail = async (toEmail, otp) => {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured.");
    return {
      success: false,
      message: "Email service is not configured.",
    };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Sifra.AI Verification</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background: #09090b;
        font-family: Arial, Helvetica, sans-serif;
        color: #ffffff;
      ">

        <div style="
          max-width: 520px;
          margin: 40px auto;
          padding: 32px;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 16px;
        ">

          <h1 style="
            margin: 0 0 10px;
            color: #ffffff;
            font-size: 26px;
          ">
            Sifra<span style="color:#8b5cf6">.AI</span>
          </h1>

          <p style="
            color: #a1a1aa;
            font-size: 14px;
            line-height: 1.6;
          ">
            Use the verification code below to complete your registration.
          </p>

          <div style="
            margin: 28px 0;
            padding: 20px;
            background: #27272a;
            border-radius: 12px;
            text-align: center;
          ">

            <div style="
              color: #a1a1aa;
              font-size: 12px;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 2px;
            ">
              Verification Code
            </div>

            <div style="
              color: #ffffff;
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
            ">
              ${otp}
            </div>

          </div>

          <p style="
            color: #71717a;
            font-size: 12px;
            line-height: 1.5;
          ">
            This code expires in 10 minutes.
            If you didn't request this code, you can safely ignore this email.
          </p>

          <div style="
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid #27272a;
            color: #52525b;
            font-size: 11px;
          ">
            © Sifra.AI
          </div>

        </div>

      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: "Sifra.AI <onboarding@resend.dev>",
      to: [toEmail],
      subject: `${otp} is your Sifra.AI verification code`,
      html: htmlContent,
    });

    if (error) {
      console.error("RESEND EMAIL ERROR:", error);

      return {
        success: false,
        message: "Failed to send verification email.",
        error: error.message || "Unknown email error",
      };
    }

    console.log(
      `Verification email sent to ${toEmail}. Resend ID: ${data.id}`
    );

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error("RESEND EMAIL EXCEPTION:", error);

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