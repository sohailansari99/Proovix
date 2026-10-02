const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

const sendVerificationEmail = async (email, verificationCode) => {
  await transporter.sendMail({
    from: `"Proovix" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Verify your email address | Proovix",
    text: `Proovix
Prove what you can do.

Email Verification

We received a request to create a Proovix account using this email address.

To complete your registration, enter the verification code below:

${verificationCode}

This verification code is valid for 10 minutes and can be used only once.

If you did not initiate this registration, no action is required. Your email address will not be verified unless the verification code is entered.

For your security, please do not share this code with anyone.

Regards,
Proovix
Evidence-Based Skill Verification Platform

This is an automated message. Please do not reply to this email.`,
  });
};

module.exports = {
  sendVerificationEmail,
};