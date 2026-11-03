const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'techzone-secret-key-2025';

let latestVerificationDispatches = {};

let mailTransporter = null;

async function getMailTransporter() {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  if (!mailTransporter) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      mailTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch (e) {
      mailTransporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows'
      });
    }
  }

  return mailTransporter;
}

async function sendVerificationEmail(toEmail, username, verificationCode, verificationToken, req) {
  const protocol = req.protocol;
  const host = req.get('host');
  const verificationLink = `${protocol}://${host}/verify-email?token=${verificationToken}&email=${encodeURIComponent(toEmail)}`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0b132b; color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #00d2ff; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #00d2ff; margin: 0; font-size: 26px; letter-spacing: -0.5px;">TechZone IT Store</h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">IT Innovation & Hardware Solutions Co., Ltd.</p>
      </div>

      <div style="background: #1c2541; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
        <h3 style="color: #ffffff; margin-top: 0; font-size: 18px;">สวัสดีคุณ ${username}</h3>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          ยินดีต้อนรับสู่ TechZone บริษัทจัดจำหน่ายสินค้าไอทีและฮาร์ดแวร์ เพื่อความปลอดภัยของบัญชีและการเปิดใช้งานระบบ กรุณากดยืนยันตัวตนผ่านปุ่มด้านล่างนี้:
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${verificationLink}" style="background: linear-gradient(135deg, #00d2ff 0%, #0077b6 100%); color: #0b132b; text-decoration: none; padding: 14px 32px; font-size: 16px; font-weight: bold; border-radius: 30px; display: inline-block; box-shadow: 0 4px 15px rgba(0,210,255,0.4);">
            คลิกที่นี่เพื่อยืนยันอีเมล (Verify Email)
          </a>
        </div>

        <div style="background: #0b132b; padding: 16px; border-radius: 8px; text-align: center; border: 1px dashed rgba(0,210,255,0.4);">
          <div style="color: #94a3b8; font-size: 13px; margin-bottom: 6px;">หรือกรอกรหัสยืนยัน 6 หลักในระบบเว็บ:</div>
          <div style="font-size: 28px; font-weight: bold; color: #fbbf24; letter-spacing: 6px;">${verificationCode}</div>
        </div>
      </div>

      <div style="font-size: 12px; color: #64748b; line-height: 1.6;">
        หากปุ่มด้านบนคลิกไม่ได้ สามารถคัดลอกลิงก์ด้านล่างไปวางในเว็บเบราว์เซอร์ได้โดยตรง:<br>
        <a href="${verificationLink}" style="color: #00d2ff; word-break: break-all;">${verificationLink}</a>
      </div>
      <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #475569;">
        อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ TechZone e-learning.buu.ac.th
      </div>
    </div>
  `;

  try {
    const transporter = await getMailTransporter();
    const fromSender = process.env.EMAIL_FROM || 'TechZone IT Store <no-reply@techzone.com>';
    const mailOptions = {
      from: fromSender,
      to: toEmail,
      subject: '[TechZone IT] ยืนยันการสมัครสมาชิกบัญชีของคุณ',
      html: htmlContent
    };

    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP_TIMEOUT')), 3500));
    const info = await Promise.race([sendPromise, timeoutPromise]);

    let previewUrl = null;
    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info);
    }
    return { success: true, previewUrl, verificationLink };
  } catch (mailError) {
    console.log('Mail Dispatch Status:', mailError.message);
    return { success: false, verificationLink, error: mailError.message };
  }
}

app.use(cors());
app.use(express.json());

const frontendDir = fs.existsSync(path.join(__dirname, '..', 'frontend'))
  ? path.join(__dirname, '..', 'frontend')
  : (fs.existsSync(path.join(__dirname, 'public')) ? path.join(__dirname, 'public') : path.join(__dirname, '..', 'public'));

app.use(express.static(frontendDir));

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'สิทธิ์การเข้าถึงเฉพาะผู้ดูแลระบบ (Admin) เท่านั้น' });
  }
  next();
}

app.get('/verify-email', (req, res) => {
  const { token, email } = req.query;

  if (!token || !email) {
    return res.redirect('/?verified=error&reason=missing_params');
  }

  db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()], (err, user) => {
    if (err || !user) {
      return res.redirect('/?verified=error&reason=not_found');
    }

    if (user.is_verified === 1) {
      return res.redirect(`/?verified=already&email=${encodeURIComponent(user.email)}`);
    }

    const savedToken = user.verify_token || '';
    const [savedCode, savedHash] = savedToken.split(':');

    if (savedHash !== token && savedCode !== token) {
      return res.redirect('/?verified=error&reason=invalid_token');
    }

    db.run('UPDATE users SET is_verified = 1, verify_token = NULL WHERE id = ?', [user.id], function (updateErr) {
      if (updateErr) {
        return res.redirect('/?verified=error&reason=database_error');
      }

      delete latestVerificationDispatches[email.toLowerCase().trim()];
      res.redirect(`/?verified=success&email=${encodeURIComponent(user.email)}`);
    });
  });
});

app.get('/techzone.sql', (req, res) => {
  res.download(path.join(__dirname, 'techzone.sql'), 'techzone.sql');
});

app.get('/api/database/techzone.sql', (req, res) => {
  res.download(path.join(__dirname, 'techzone.sql'), 'techzone.sql');
});

app.get('/api/company', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'TechZone Innovation & Solutions Co., Ltd.',
      slogan: 'ผู้นำเข้าและจัดจำหน่ายเทคโนโลยี IT Hardware และ Solutions ครบวงจร',
      description: 'บริษัท เทคโซน อินโนเวชั่น แอนด์ โซลูชั่นส์ จำกัด ก่อตั้งขึ้นเพื่อเป็นศูนย์กลางการจัดจำหน่ายอุปกรณ์คอมพิวเตอร์ โน้ตบุ๊ก อุปกรณ์เครือข่าย และชิ้นส่วนฮาร์ดแวร์ระดับไฮเอนด์ พร้อมบริการหลังการขายและการรับประกันมาตรฐานสากล',
      vision: 'เป็นผู้นำด้านเทคโนโลยีและฮาร์ดแวร์ดิจิทัลที่ได้รับความไว้วางใจสูงสุดในภูมิภาค',
      mission: [
        'คัดสรรอุปกรณ์ไอทีและฮาร์ดแวร์แบรนด์ชั้นนำระดับโลกที่เปี่ยมด้วยคุณภาพ',
        'ให้บริการระบบสั่งซื้อที่สะดวกรวดเร็ว ปลอดภัย และจัดส่งตรงเวลา',
        'สนับสนุนองค์กรและผู้ใช้งานทั่วไปด้วยทีมวิศวกรผู้เชี่ยวชาญด้าน IT'
      ],
      stats: {
        customers: '25,000+',
        productsSold: '120,000+',
        satisfaction: '99.4%',
        yearsInBusiness: '12 ปี'
      },
      contact: {
        phone: '02-888-9999, 089-123-4567',
        email: 'contact@techzone.co.th',
        address: '169 ถนนลงหาดบางแสน ตำบลแสนสุข อำเภอเมืองชลบุรี จังหวัดชลบุรี 20131'
      }
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }

  db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()], (err, existing) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' });
    }
    if (existing) {
      return res.status(409).json({ success: false, message: 'อีเมลนี้ถูกใช้งานในระบบแล้ว' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(24).toString('hex');
    const combinedToken = `${verificationCode}:${verificationToken}`;
    const passwordHash = bcrypt.hashSync(password, 10);

    const query = `
      INSERT INTO users (username, email, password_hash, role, is_verified, verify_token)
      VALUES (?, ?, ?, 'member', 0, ?)
    `;

    db.run(query, [username.trim(), email.toLowerCase().trim(), passwordHash, combinedToken], async function (insertErr) {
      if (insertErr) {
        return res.status(500).json({ success: false, message: 'ไม่สามารถสร้างบัญชีผู้ใช้ได้' });
      }

      const emailResult = await sendVerificationEmail(email.toLowerCase().trim(), username.trim(), verificationCode, verificationToken, req);

      latestVerificationDispatches[email.toLowerCase().trim()] = {
        code: verificationCode,
        token: verificationToken,
        verificationLink: emailResult.verificationLink,
        previewUrl: emailResult.previewUrl,
        timestamp: new Date().toISOString()
      };

      res.status(201).json({
        success: true,
        message: `สมัครสมาชิกสำเร็จ! ระบบได้ส่งอีเมลยืนยันตัวตนไปยัง ${email.trim()} เรียบร้อยแล้ว`,
        email: email.toLowerCase().trim(),
        verificationCode: verificationCode,
        verificationToken: verificationToken,
        verificationLink: emailResult.verificationLink,
        previewUrl: emailResult.previewUrl
      });
    });
  });
});

app.post('/api/auth/verify-email', (req, res) => {
  const { email, code, token } = req.body;

  if (!email || (!code && !token)) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุอีเมลและรหัสยืนยัน' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ' });
    }

    if (user.is_verified === 1) {
      return res.json({ success: true, message: 'บัญชีนี้ได้รับการยืนยันตัวตนเรียบร้อยแล้ว' });
    }

    const savedToken = user.verify_token || '';
    const [savedCode, savedHash] = savedToken.split(':');

    let isMatch = false;
    if (code && savedCode && code.trim() === savedCode.trim()) {
      isMatch = true;
    } else if (token && savedHash && token.trim() === savedHash.trim()) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'รหัสยืนยันไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
    }

    db.run('UPDATE users SET is_verified = 1, verify_token = NULL WHERE id = ?', [user.id], function (updateErr) {
      if (updateErr) {
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกสถานะ' });
      }

      delete latestVerificationDispatches[email.toLowerCase().trim()];

      const tokenPayload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };
      const authToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        success: true,
        message: 'ยืนยันตัวตนผ่านอีเมลสำเร็จ! บัญชีของคุณพร้อมใช้งานแล้ว',
        token: authToken,
        user: tokenPayload
      });
    });
  });
});

app.post('/api/auth/resend-code', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุอีเมล' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()], async (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'ไม่พบบัญชีนี้' });
    }

    if (user.is_verified === 1) {
      return res.status(400).json({ success: false, message: 'บัญชีนี้ได้รับการยืนยันไปแล้ว' });
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newToken = crypto.randomBytes(24).toString('hex');
    const combinedToken = `${newCode}:${newToken}`;

    db.run('UPDATE users SET verify_token = ? WHERE id = ?', [combinedToken, user.id], async (upErr) => {
      if (upErr) {
        return res.status(500).json({ success: false, message: 'ไม่สามารถสร้างรหัสใหม่ได้' });
      }

      const emailResult = await sendVerificationEmail(email.toLowerCase().trim(), user.username, newCode, newToken, req);

      latestVerificationDispatches[email.toLowerCase().trim()] = {
        code: newCode,
        token: newToken,
        verificationLink: emailResult.verificationLink,
        previewUrl: emailResult.previewUrl,
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        message: 'ส่งอีเมลยืนยันตัวตนใหม่เรียบร้อยแล้ว กรุณาตรวจสอบกล่องข้อความอีเมลของคุณ',
        verificationCode: newCode,
        verificationLink: emailResult.verificationLink,
        previewUrl: emailResult.previewUrl
      });
    });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    if (user.is_verified === 0) {
      const savedToken = user.verify_token || '';
      const [savedCode, savedHash] = savedToken.split(':');
      const protocol = req.protocol;
      const host = req.get('host');
      const verificationLink = `${protocol}://${host}/verify-email?token=${savedHash}&email=${encodeURIComponent(user.email)}`;

      return res.status(403).json({
        success: false,
        isUnverified: true,
        message: 'กรุณายืนยันตัวตนผ่านอีเมลก่อนเข้าใช้งานระบบ',
        email: user.email,
        verificationCode: savedCode,
        verificationLink: verificationLink
      });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: tokenPayload
    });
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get('SELECT id, username, email, role, is_verified, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้' });
    }
    res.json({ success: true, user });
  });
});

app.get('/api/auth/latest-verification', (req, res) => {
  const email = req.query.email;
  if (email && latestVerificationDispatches[email.toLowerCase().trim()]) {
    return res.json({
      success: true,
      data: latestVerificationDispatches[email.toLowerCase().trim()]
    });
  }
  res.json({ success: true, data: latestVerificationDispatches });
});

app.get('/api/products', (req, res) => {
  const { search, category, sort } = req.query;

  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ? OR specifications LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (sort === 'price-asc') {
    query += ' ORDER BY price ASC';
  } else if (sort === 'price-desc') {
    query += ' ORDER BY price DESC';
  } else if (sort === 'name') {
    query += ' ORDER BY name ASC';
  } else {
    query += ' ORDER BY id DESC';
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลสินค้าได้' });
    }
    res.json({ success: true, data: rows });
  });
});

app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, product) => {
    if (err || !product) {
      return res.status(404).json({ success: false, message: 'ไม่พบสินค้ารายการนี้' });
    }
    res.json({ success: true, data: product });
  });
});

app.post('/api/products', authenticateToken, requireAdmin, (req, res) => {
  const { name, category, price, stock, description, image_url, specifications } = req.body;

  if (!name || !category || price === undefined || stock === undefined) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลสินค้าให้ครบถ้วน (ชื่อ, หมวดหมู่, ราคา, สต็อก)' });
  }

  const query = `
    INSERT INTO products (name, category, price, stock, description, image_url, specifications)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const fallbackImage = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80';
  const finalImage = (image_url && image_url.trim() !== '') ? image_url.trim() : fallbackImage;

  db.run(query, [
    name.trim(),
    category.trim(),
    parseFloat(price),
    parseInt(stock),
    description || '',
    finalImage,
    specifications || ''
  ], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'ไม่สามารถเพิ่มสินค้าได้' });
    }

    db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (getErr, newProduct) => {
      res.status(201).json({
        success: true,
        message: 'เพิ่มสินค้าใหม่ลงในระบบเรียบร้อยแล้ว',
        data: newProduct
      });
    });
  });
});

app.put('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  const { name, category, price, stock, description, image_url, specifications } = req.body;
  const productId = req.params.id;

  if (!name || !category || price === undefined || stock === undefined) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลสินค้าให้ครบถ้วน' });
  }

  const query = `
    UPDATE products
    SET name = ?, category = ?, price = ?, stock = ?, description = ?, image_url = ?, specifications = ?
    WHERE id = ?
  `;

  db.run(query, [
    name.trim(),
    category.trim(),
    parseFloat(price),
    parseInt(stock),
    description || '',
    image_url || '',
    specifications || '',
    productId
  ], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'ไม่สามารถอัปเดตข้อมูลสินค้าได้' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบสินค้าที่ต้องการแก้ไข' });
    }

    db.get('SELECT * FROM products WHERE id = ?', [productId], (getErr, updatedProduct) => {
      res.json({
        success: true,
        message: 'แก้ไขข้อมูลสินค้าสำเร็จ',
        data: updatedProduct
      });
    });
  });
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  const productId = req.params.id;

  db.run('DELETE FROM products WHERE id = ?', [productId], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'ไม่สามารถลบสินค้าได้' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบสินค้าที่ต้องการลบ' });
    }
    res.json({
      success: true,
      message: 'ลบรายการสินค้าเรียบร้อยแล้ว',
      deletedId: productId
    });
  });
});

app.post('/api/orders', authenticateToken, (req, res) => {
  const { items, customerName, customerPhone, shippingAddress } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'ไม่มีรายการสินค้าในตะกร้า' });
  }

  if (!customerName || !shippingAddress || !customerPhone) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลชื่อ เบอร์โทร และที่อยู่จัดส่ง' });
  }

  const productIds = items.map(i => i.id);
  const placeholders = productIds.map(() => '?').join(',');

  db.all(`SELECT id, name, price, stock FROM products WHERE id IN (${placeholders})`, productIds, (err, productRows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบสต็อก' });
    }

    const productMap = {};
    productRows.forEach(p => { productMap[p.id] = p; });

    let totalAmount = 0;
    for (const item of items) {
      const p = productMap[item.id];
      if (!p) {
        return res.status(400).json({ success: false, message: `ไม่พบสินค้า ID: ${item.id}` });
      }
      if (p.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `สินค้า ${p.name} มีสต็อกไม่เพียงพอ (คงเหลือ ${p.stock} ชิ้น)` });
      }
      totalAmount += p.price * item.quantity;
    }

    const orderQuery = `
      INSERT INTO orders (user_id, customer_name, customer_email, customer_phone, shipping_address, total_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `;

    db.run(orderQuery, [
      req.user.id,
      customerName.trim(),
      req.user.email,
      customerPhone.trim(),
      shippingAddress.trim(),
      totalAmount
    ], function (orderErr) {
      if (orderErr) {
        return res.status(500).json({ success: false, message: 'ไม่สามารถสร้างรายการสั่งซื้อได้' });
      }

      const orderId = this.lastID;
      const itemStmt = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
        VALUES (?, ?, ?, ?, ?)
      `);

      const stockStmt = db.prepare(`
        UPDATE products SET stock = stock - ? WHERE id = ?
      `);

      items.forEach(item => {
        const p = productMap[item.id];
        itemStmt.run(orderId, p.id, p.name, p.price, item.quantity);
        stockStmt.run(item.quantity, p.id);
      });

      itemStmt.finalize();
      stockStmt.finalize();

      res.status(201).json({
        success: true,
        message: 'สั่งซื้อสินค้าสำเร็จ ขอบคุณที่ไว้วางใจ TechZone!',
        orderId: orderId,
        totalAmount: totalAmount
      });
    });
  });
});

app.get('/api/orders/my-orders', authenticateToken, (req, res) => {
  const query = `
    SELECT * FROM orders
    WHERE user_id = ?
    ORDER BY id DESC
  `;

  db.all(query, [req.user.id], (err, orders) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'ไม่สามารถดึงประวัติการสั่งซื้อได้' });
    }

    if (orders.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const orderIds = orders.map(o => o.id);
    const placeholders = orderIds.map(() => '?').join(',');

    db.all(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`, orderIds, (itemsErr, items) => {
      if (itemsErr) {
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดรายการสินค้า' });
      }

      const itemsByOrder = {};
      items.forEach(item => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      });

      const fullOrders = orders.map(order => ({
        ...order,
        items: itemsByOrder[order.id] || []
      }));

      res.json({ success: true, data: fullOrders });
    });
  });
});

app.get('/api/orders', authenticateToken, requireAdmin, (req, res) => {
  const query = 'SELECT * FROM orders ORDER BY id DESC';

  db.all(query, [], (err, orders) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลรายการสั่งซื้อได้' });
    }

    if (orders.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const orderIds = orders.map(o => o.id);
    const placeholders = orderIds.map(() => '?').join(',');

    db.all(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`, orderIds, (itemsErr, items) => {
      if (itemsErr) {
        return res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลสินค้าในออเดอร์ได้' });
      }

      const itemsByOrder = {};
      items.forEach(item => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      });

      const fullOrders = orders.map(order => ({
        ...order,
        items: itemsByOrder[order.id] || []
      }));

      res.json({ success: true, data: fullOrders });
    });
  });
});

app.put('/api/orders/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
  }

  db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'ไม่สามารถอัปเดตสถานะได้' });
    }
    res.json({
      success: true,
      message: `อัปเดตสถานะออเดอร์ #${req.params.id} เป็น "${status}" เรียบร้อยแล้ว`
    });
  });
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  const stats = {};

  db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
    stats.totalProducts = row ? row.count : 0;

    db.get('SELECT COUNT(*) as count FROM users WHERE role = "member"', (err2, row2) => {
      stats.totalMembers = row2 ? row2.count : 0;

      db.get('SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as totalRevenue FROM orders', (err3, row3) => {
        stats.totalOrders = row3 ? row3.count : 0;
        stats.totalRevenue = row3 ? row3.totalRevenue : 0;

        res.json({ success: true, data: stats });
      });
    });
  });
});

app.use((req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TechZone IT Server running on port ${PORT}`);
  console.log(`Local Access: http://localhost:${PORT}`);
});
