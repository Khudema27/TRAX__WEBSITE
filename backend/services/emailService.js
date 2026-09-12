// ==================== EMAIL SERVICE (OTP VERIFICATION) ====================
// Sends account-verification / OTP emails using SMTP credentials from .env
//
// Required .env vars (see .env.example):
//   EMAIL_HOST       e.g. smtp.gmail.com
//   EMAIL_PORT       e.g. 587
//   EMAIL_SECURE     "true" for port 465, "false" for 587/other
//   EMAIL_USER       the sending mailbox address
//   EMAIL_PASS       app password (NOT your normal account password)
//   EMAIL_FROM_NAME  display name shown to the recipient (optional)
//
// If these are not configured, the service falls back to logging the OTP
// to the console so local development still works without real email.

const nodemailer = require('nodemailer');

let transporter = null;
let emailEnabled = false;

function initTransporter() {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

    if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
        console.log('⚠️  Email service not configured (EMAIL_HOST/EMAIL_USER/EMAIL_PASS missing).');
        console.log('   OTP codes will be printed to the server console instead of emailed.');
        emailEnabled = false;
        return;
    }

    transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: Number(EMAIL_PORT) || 587,
        secure: String(process.env.EMAIL_SECURE).toLowerCase() === 'true' || Number(EMAIL_PORT) === 465,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        },
        // ---- Connection pooling: keep a small pool of SMTP connections
        // open instead of doing a fresh TCP+TLS+auth handshake for every
        // OTP. This is the single biggest lever on how fast an email
        // actually leaves our server. ----
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        // ---- Fail fast instead of hanging: if the mail server is slow
        // or unreachable, surface that in a few seconds, not minutes. ----
        connectionTimeout: 8000,   // time to establish the connection
        greetingTimeout: 8000,     // time to receive the SMTP greeting
        socketTimeout: 10000       // time for the whole send to complete
    });

    emailEnabled = true;
    console.log('✅ Email service configured (OTP verification emails enabled)');
}

initTransporter();

function otpEmailHTML(name, otp) {
    return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; background:#f4f6f8; padding: 24px;">
        <div style="background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb;">
            <div style="background:#064e3b; padding:20px 24px;">
                <h1 style="color:#fff; margin:0; font-size:20px; letter-spacing:1px;">ROUTE 3 <span style="color:#a7f3d0;">TRAX</span></h1>
            </div>
            <div style="padding:28px 24px;">
                <p style="margin:0 0 12px; color:#111827; font-size:15px;">Hi ${name || 'there'},</p>
                <p style="margin:0 0 18px; color:#374151; font-size:14px; line-height:1.5;">
                    Use the verification code below to confirm your email address and activate your TRAX account.
                </p>
                <div style="text-align:center; margin: 24px 0;">
                    <span style="display:inline-block; font-size:32px; font-weight:800; letter-spacing:10px; color:#064e3b; background:#ecfdf5; border:2px dashed #064e3b; padding:14px 20px; border-radius:8px;">
                        ${otp}
                    </span>
                </div>
                <p style="margin:0 0 6px; color:#6b7280; font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>
                <p style="margin:0; color:#6b7280; font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
            <div style="background:#f9fafb; padding:14px 24px; border-top:1px solid #eee;">
                <p style="margin:0; color:#9ca3af; font-size:11px;">ROUTE 3 TRAX Smart Logistics · Automated message, please do not reply.</p>
            </div>
        </div>
    </div>`;
}

/**
 * Sends a 6-digit OTP code to the given email address.
 * Falls back to console logging when email isn't configured, so
 * development/testing keeps working without SMTP credentials.
 */
async function sendOTPEmail(toEmail, name, otp) {
    if (!emailEnabled || !transporter) {
        console.log(`\n📧 [DEV MODE] OTP for ${toEmail}: ${otp}  (email not configured — see .env.example)\n`);
        return { sent: false, devMode: true };
    }

    try {
        await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || 'ROUTE 3 TRAX'}" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Your TRAX verification code: ${otp}`,
            html: otpEmailHTML(name, otp)
        });
        return { sent: true, devMode: false };
    } catch (error) {
        console.error('❌ Failed to send OTP email:', error.message);
        console.log(`📧 [FALLBACK] OTP for ${toEmail}: ${otp}`);
        return { sent: false, error: error.message };
    }
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

module.exports = { sendOTPEmail, generateOTP, isEmailEnabled: () => emailEnabled };