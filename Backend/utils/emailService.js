import nodemailer from "nodemailer";

const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  console.log("Creating transporter with:", {
    user: process.env.EMAIL_USER,
    passLength: process.env.EMAIL_APP_PASSWORD?.length || 0,
  });

  return transporter;
};

export const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();

    console.log("Attempting to send OTP email to:", email);

    const mailOptions = {
      from: {
        name: "ATL Admin",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "ATL - Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; color: #FFFFFF; background-color: #202020; padding: 20px;">
          <h2 style="color: #FFFFFF;">Password Reset OTP</h2>
          
          <p style="color: #FFFFFF;">You have requested to reset your password.</p>
          
          <div style="background-color: #2A2A2A; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="font-size: 24px; font-weight: bold; color: #FFFFFF;">Your OTP: <span style="color: #3B82F6;">${otp}</span></p>
            <p style="color: #EF4444;"><strong>Note:</strong> This OTP will expire in 10 minutes.</p>
          </div>
          
          <p>If you didn't request this password reset, please ignore this email or contact the administrator.</p>
          
          <p>Best regards,<br>ATL Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("OTP email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("OTP Email sending failed:", {
      name: error.name,
      message: error.message,
      code: error.code,
      command: error.command,
    });
    throw error;
  }
};

export const sendWelcomeEmail = async (email, userData) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: "ATL Admin",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "Welcome to ATL - Your Account Details",
      html: `
        <div style="font-family: Arial, sans-serif; color: #FFFFFF; background-color: #202020; padding: 20px;">
          <h2>Welcome to ATL!</h2>
          
          <p>Hello ${userData.firstname} ${userData.lastname},</p>
          
          <p>Your account has been created successfully. Here are your login credentials:</p>
          
          <div style="background-color: #2A2A2A; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong style="color: #FFFFFF;">Username:</strong> <span style="color: #FFFFFF;">${
              userData.username
            }</span></p>
            <p><strong style="color: #FFFFFF;">Password:</strong> <span style="color: #FFFFFF;">${
              userData.password
            }</span></p>
            <p><strong style="color: #FFFFFF;">Role:</strong> <span style="color: #FFFFFF;">${
              userData.roleText
            }</span></p>
          </div>
          
          <p>Please login at: <a href="${
            process.env.FRONTEND_URL || "http://localhost:5173"
          }" style="color: #3B82F6;">ATL Portal</a></p>
          
          <p style="color: #EF4444;"><strong>Important:</strong> For security reasons, please change your password after your first login.</p>
          
          <p>If you have any questions, please contact the administrator.</p>
          
          <p>Best regards,<br>ATL Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Welcome email sent:", info.response);
    return info;
  } catch (error) {
    console.error("Welcome email sending failed:", error);
    throw error;
  }
};

export const sendDocumentsEmail = async (emailData) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: "ATL Admin",
        address: process.env.EMAIL_USER,
      },
      to: emailData.to,
      ...(emailData.cc && emailData.cc.length > 0 && { cc: emailData.cc }),
      subject: "ATL - Test Documents",
      html: `
        <div style="font-family: Arial, sans-serif; color: #FFFFFF; background-color: #202020; padding: 20px;">
          <h2>Test Documents from ATL</h2>
          
          <p>Dear ${emailData.clientName},</p>
          
          <p>Please find attached the following documents for your test (${emailData.testId}):</p>
          <ul>
            <li>ROR (Review of Request)</li>
            <li>Proforma Invoice</li>
          </ul>
          
          <p>If you have any questions, please feel free to contact us.</p>
          
          <p>Best regards,<br>ATL Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `ROR_${emailData.testId}.pdf`,
          content: emailData.rorPdf,
          encoding: "base64",
        },
        {
          filename: `Proforma_${emailData.testId}.pdf`,
          content: emailData.proformaPdf,
          encoding: "base64",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Documents email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Documents email sending failed:", error);
    throw error;
  }
};

export const sendReportEmail = async (emailData) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: "ATL Admin",
        address: process.env.EMAIL_USER,
      },
      to: emailData.to,
      ...(emailData.cc && emailData.cc.length > 0 && { cc: emailData.cc }),
      subject: "ATL - Test Report",
      html: `
        <div style="font-family: Arial, sans-serif; color: #FFFFFF; background-color: #202020; padding: 20px;">
          <h2>Test Report from ATL</h2>
          <p>Dear ${emailData.clientName},</p>
          <p>Please find attached the test report for your test (${emailData.testId}).</p>
          <p>If you have any questions, please feel free to contact us.</p>
          <p>Best regards,<br>ATL Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `Report_${emailData.testId}.pdf`,
          content: emailData.pdfBuffer,
          encoding: "base64",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Report email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Report email sending failed:", error);
    throw error;
  }
};
