import nodemailer from 'nodemailer';

// Expected environment variables (set in Netlify site settings):
// SMTP_HOST, SMTP_PORT, SMTP_SECURE ("true"/"false"), SMTP_USER, SMTP_PASS, CONTACT_TO, CONTACT_FROM

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body || '{}');
        const { name, email, message } = data;

        if (!name || !email || !message) {
            return { statusCode: 400, body: 'Missing required fields: name, email, message' };
        }

        const {
            SMTP_HOST,
            SMTP_PORT,
            SMTP_SECURE,
            SMTP_USER,
            SMTP_PASS,
            CONTACT_TO,
            CONTACT_FROM
        } = process.env;

        if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !CONTACT_TO) {
            return { statusCode: 500, body: 'Email service not configured' };
        }

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT || 587),
            secure: String(SMTP_SECURE || 'false') === 'true',
            auth: { user: SMTP_USER, pass: SMTP_PASS },
        });

        const fromAddress = CONTACT_FROM || SMTP_USER;
        const toAddress = CONTACT_TO;

        const info = await transporter.sendMail({
            from: `UdhyogUnity Contact <${fromAddress}>`,
            to: toAddress,
            replyTo: email,
            subject: `New contact form message from ${name}`,
            text: `From: ${name} <${email}>\n\n${message}`,
            html: `<p><b>From:</b> ${name} &lt;${email}&gt;</p><p>${message.replace(/\n/g, '<br/>')}</p>`,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ ok: true, id: info.messageId }),
            headers: { 'Content-Type': 'application/json' },
        };
    } catch (err) {
        return { statusCode: 500, body: err?.message || 'Failed to send email' };
    }
}
