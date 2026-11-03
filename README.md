# TechZone IT Store - เว็บแอปพลิเคชันสำหรับบริษัทขายสินค้าไอที

เว็บแอปพลิเคชัน Fullstack ครบวงจรสำหรับบริษัทจัดจำหน่ายสินค้าไอทีและฮาร์ดแวร์ พัฒนาขึ้นตามเกณฑ์การประเมิน 40 คะแนนเต็ม (Frontend, Backend, Database, Authentication & Token, Production Cloud Deployment)

---

## ฟังก์ชันการทำงานหลักของระบบ

1. **ระบบยืนยันตัวตนและการจัดการสิทธิ์ (Authentication & Authorization)**
   - สมัครสมาชิกใหม่ (Register) พร้อมระบบตรวจสอบอีเมลและรหัสผ่าน
   - ระบบส่งรหัสยืนยันตัวตนผ่านอีเมล (Email Verification with 6-digit OTP & Token Link) พร้อมกล่องจำลองอีเมล (Email Simulator Box) เพื่อความสะดวกในการทดสอบ
   - ระบบเข้าสู่ระบบ (Sign In) ด้วย JSON Web Token (JWT) และความปลอดภัยรหัสผ่านระดับ Bcrypt Hashing
   - แบ่งระดับผู้ใช้งานชัดเจน: **Admin (ผู้ดูแลระบบ)** และ **Member (ผู้ใช้ทั่วไป)**

2. **ระบบหน้าแรกและข้อมูลบริษัท (Home & Corporate Profile)**
   - ข้อมูลบริษัท TechZone Innovation & Solutions Co., Ltd.
   - วิสัยทัศน์ (Vision), พันธกิจ (Mission), บริการด้านไอทีโซลูชัน และช่องทางติดต่อ
   - แบนเนอร์เทคโนโลยีและสินค้าไอทีแนะนำยอดนิยม

3. **ระบบผู้ใช้ทั่วไป (Member)**
   - ดูแคตตาล็อกสินค้าไอทีทั้งหมด
   - กรองสินค้าตามหมวดหมู่ (Laptops, Components, Monitors, Accessories, Network & Storage)
   - ค้นหาสินค้าแบบ Real-time และเรียงลำดับราคา
   - ดูรายละเอียดสเปกฮาร์ดแวร์เชิงลึก
   - เพิ่มสินค้าลงในตะกร้าสินค้า (Cart Management) ปรับจำนวน ลบสินค้า และคำนวณราคารวม
   - สั่งซื้อสินค้า (Checkout) บันทึกชื่อ เบอร์โทร และที่อยู่จัดส่ง
   - ระบบตัดสต็อกสินค้าอัตโนมัติแบบ Real-time
   - ดูประวัติคำสั่งซื้อของตนเอง พร้อมสถานะการจัดส่ง

4. **ระบบผู้ดูแลระบบ (Admin Management)**
   - **จัดการสินค้า (CRUD):**
     - Query: ดูรายการสินค้าทั้งหมดในคลัง พร้อมสเปกและรูปภาพ
     - Insert: เพิ่มสินค้าไอทีใหม่เข้าสู่ระบบ
     - Update: แก้ไขข้อมูล ราคา สต็อก และรายละเอียดสินค้า
     - Delete: ลบรายการสินค้าออกจากระบบ พร้อมกล่องยืนยัน SweetAlert2
   - **จัดการคำสั่งซื้อ (Order Management):** ดูคำสั่งซื้อของลูกค้าทั้งหมด และปรับเปลี่ยนสถานะ (Pending -> Processing -> Shipped -> Completed -> Cancelled)
   - **รายงานและสถิติ (Admin Dashboard & Analytics):** สรุปยอดขายรวม สถิติจำนวนคำสั่งซื้อ จำนวนสินค้าในคลัง และจำนวนสมาชิก

---

## บัญชีสำหรับทดสอบระบบ (Default Accounts)

1. **ผู้ดูแลระบบ (Admin)**
   - **Email:** `admin@techzone.com`
   - **Password:** `admin1234`
   - สิทธิ์: ดูแลคลังสินค้า (เพิ่ม/แก้ไข/ลบ), จัดการออเดอร์, ดูสถิติธุรกิจ

2. **สมาชิกทั่วไป (Member)**
   - **Email:** `member@techzone.com`
   - **Password:** `member1234`
   - สิทธิ์: ค้นหา ดูสินค้า ใส่ตะกร้า สั่งซื้อ และตรวจสอบประวัติคำสั่งซื้อ

---

## ขั้นตอนการติดตั้งและรันระบบบนเครื่อง (Localhost)

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. เริ่มต้นรันเซิร์ฟเวอร์
npm start
```

เปิดเว็บเบราว์เซอร์แล้วเข้าสู่:
**http://localhost:5000**

---

## ขั้นตอนการนำขึ้น Production บน Cloud Server (ฟรี 100%)

### วิธีที่ 1: Deploy ผ่าน Render.com (แนะนำ - ง่ายที่สุด)
1. อัปโหลดโฟลเดอร์โปรเจกต์นี้ขึ้น GitHub Repository ของคุณ
2. สมัครหรือล็อกอินที่ [https://render.com](https://render.com)
3. กดปุ่ม **New +** เลือก **Web Service**
4. เชื่อมต่อกับ GitHub Repository ที่อัปโหลดไว้
5. ตั้งค่า:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. กด **Deploy Web Service**
7. รอประมาณ 1-2 นาที คุณจะได้ URL เช่น `https://techzone-it-store.onrender.com` นำส่งใน e-learning ได้ทันที

### วิธีที่ 2: Deploy ผ่าน Railway.app
1. เข้าไปที่ [https://railway.app](https://railway.app)
2. เลือก **New Project** -> **Deploy from GitHub repo**
3. ระบบจะตรวจจับ `package.json` และรันอัตโนมัติ ได้ URL พร้อมใช้งานทันที

