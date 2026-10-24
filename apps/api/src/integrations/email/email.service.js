const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

// Shared HTML layout. Email clients ignore most modern CSS,
// so this uses simple tables and inline styles.
const renderEmail = ({ title, intro, buttonLabel, link, notes }) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f0;font-family:Arial,Helvetica,sans-serif;color:#16211e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #dcdfd8;border-radius:10px;">
            <tr>
              <td style="padding:28px 32px 8px;">
                <div style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:#12453a;">proovix</div>
                <div style="font-size:13px;color:#5f6b67;margin-top:2px;">Prove what you can do.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0;">
                <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:24px;font-weight:600;color:#16211e;">${title}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#364540;">${intro}</p>
                <a href="${link}" style="display:inline-block;background:#12453a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:8px;">${buttonLabel}</a>
                <p style="margin:24px 0 6px;font-size:13px;color:#5f6b67;">If the button doesn't work, copy this link into your browser:</p>

                <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${link}" style="color:#12453a;">${link}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;border-top:1px solid #e9ebe5;">
                <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#5f6b67;">${notes}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:12px;color:#8d9893;">This is an automated message. Please do not reply to this email.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const sendVerificationEmail = async (email, verificationLink) => {
  await transporter.sendMail({
    from: `"Proovix" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Verify your email address | Proovix",
    text: `Proovix
Prove what you can do.

Verify your email

We received a request to create a Proovix account using this email address.

To finish creating your account, open the link below:

${verificationLink}


This link is valid for 24 hours and can be used only once.

If you did not create a Proovix account, you can safely ignore this email. Your address will not be verified unless the link is opened.

For your security, please do not share this link with anyone.

Regards,
Proovix
Evidence-Based Skill Verification Platform

This is an automated message. Please do not reply to this email.`,
    html: renderEmail({
      title: "Verify your email",
      intro:
        "We received a request to create a Proovix account with this email address. Click the button below to finish setting up your account.",
      buttonLabel: "Verify email",
      link: verificationLink,
      notes:
        "This link is valid for 24 hours and can be used only once. If you didn't create a Proovix account, you can safely ignore this email. Please don't share this link with anyone.",
    }),
  });
};

const sendPasswordResetEmail = async (email, resetLink) => {
  await transporter.sendMail({
    from: `"Proovix" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Reset your Proovix password",
    text: `Proovix
Prove what you can do.

Password Reset


We received a request to reset the password for your Proovix account.

Use the link below to create a new password:

${resetLink}

This password reset link is valid for 15 minutes and can only be used once.

If you did not request a password reset, you can safely ignore this email. Your password will not be changed unless the reset link is used.

For your security, please do not share this link with anyone.

Regards,
Proovix
Evidence-Based Skill Verification Platform

This is an automated message. Please do not reply to this email.`,
    html: renderEmail({
      title: "Reset your password",
      intro:
        "We received a request to reset the password for your Proovix account. Click the button below to choose a new one.",
      buttonLabel: "Reset password",
      link: resetLink,
      notes:
        "This link is valid for 15 minutes and can be used only once. If you didn't request a password reset, you can safely ignore this email. Your password won't change unless the link is used.",
    }),
  });
};

module.exports = {
  sendVerificationEmail,

  sendPasswordResetEmail,
};