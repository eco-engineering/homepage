const nodemailer = require('nodemailer');

function getEnv(name) {
  return process.env[name] || '';
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function normalizePort(port) {
  const parsed = Number(port);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatKST(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (value) => String(value).padStart(2, '0');
  const year = kst.getUTCFullYear();
  const month = pad(kst.getUTCMonth() + 1);
  const day = pad(kst.getUTCDate());
  const hour = pad(kst.getUTCHours());
  const minute = pad(kst.getUTCMinutes());
  const second = pad(kst.getUTCSeconds());
  return `${year}-${month}-${day} ${hour}:${minute}:${second} (KST)`;
}

function createReceiptId(date) {
  const stamp = date.getTime();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ECO-${stamp}-${rand}`;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Method Not Allowed' }));
    return;
  }

  const body = parseBody(req.body);
  const name = (body.name || '').trim();
  const phone = (body.phone || '').trim();
  const email = (body.email || '').trim();
  const productType = (body.product_type || '').trim();
  const message = (body.message || '').trim();
  const page = (body.page || '').trim();

  if (!name || !phone || !productType) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: '필수 항목이 누락되었습니다.' }));
    return;
  }

  const smtpHost = getEnv('SMTP_HOST');
  const smtpPort = normalizePort(getEnv('SMTP_PORT'));
  const smtpUser = getEnv('SMTP_USER');
  const smtpPass = getEnv('SMTP_PASS');
  const mailTo = getEnv('MAIL_TO');
  const mailFrom = getEnv('MAIL_FROM') || smtpUser;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !mailTo || !mailFrom) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: '메일 서버 설정이 필요합니다.' }));
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  const now = new Date();
  const receiptId = createReceiptId(now);
  const receivedAt = formatKST(now);
  const subject = `[에코] ${productType} | ${name} | ${phone}`;
  const text = [
    '상담문의 접수',
    `접수번호: ${receiptId}`,
    `접수시간: ${receivedAt}`,
    '',
    `이름: ${name}`,
    `연락처: ${phone}`,
    `이메일: ${email || '미입력'}`,
    `제품 종류: ${productType}`,
    '',
    '문의 내용:',
    `${message || '문의 내용 없음'}`,
    page ? '' : null,
    page ? `접수 페이지: ${page}` : null
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2 style="margin: 0 0 12px;">상담문의 접수</h2>
      <p style="margin: 0 0 12px; color: #6b7280;">
        <strong>접수번호:</strong> ${receiptId}<br>
        <strong>접수시간:</strong> ${receivedAt}
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr>
          <th style="text-align: left; padding: 8px 0; color: #6b7280; width: 120px;">이름</th>
          <td style="padding: 8px 0;">${name}</td>
        </tr>
        <tr>
          <th style="text-align: left; padding: 8px 0; color: #6b7280;">연락처</th>
          <td style="padding: 8px 0;">${phone}</td>
        </tr>
        <tr>
          <th style="text-align: left; padding: 8px 0; color: #6b7280;">이메일</th>
          <td style="padding: 8px 0;">${email || '미입력'}</td>
        </tr>
        <tr>
          <th style="text-align: left; padding: 8px 0; color: #6b7280;">제품 종류</th>
          <td style="padding: 8px 0;">${productType}</td>
        </tr>
      </table>
      <div style="padding: 12px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb;">
        <strong>문의 내용</strong>
        <p style="margin: 8px 0 0;">${(message || '문의 내용 없음').replace(/\n/g, '<br>')}</p>
      </div>
      ${page ? `<p style="margin-top: 16px; color: #6b7280;"><strong>접수 페이지:</strong> ${page}</p>` : ''}
    </div>
  `;

  try {
    await transporter.sendMail({
      from: mailFrom,
      to: mailTo,
      replyTo: email && email !== '미입력' ? email : undefined,
      subject,
      text,
      html
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    console.error('Email send failed:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: '메일 전송에 실패했습니다.' }));
  }
};
