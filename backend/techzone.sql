CREATE DATABASE IF NOT EXISTS techzone_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE techzone_db;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  is_verified INT DEFAULT 0,
  verify_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL,
  description TEXT,
  image_url TEXT,
  specifications TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_email VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  shipping_address TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL
);

INSERT INTO users (id, username, email, password_hash, role, is_verified, verify_token) VALUES
(1, 'TechAdmin', 'admin@techzone.com', '$2b$10$8Xs7fjz6WrmXsbaezBCQY.1QmVofGnCgiOIaqcqbipXYdk3cffb/G', 'admin', 1, NULL),
(2, 'Somsak Dev', 'member@techzone.com', '$2b$10$CQQY3OeeOxaBwuJS.aipI.F0ZhJOzMuqq.LVnrM72HoZEv2193SzG', 'member', 1, NULL);

INSERT INTO products (id, name, category, price, stock, description, image_url, specifications) VALUES
(1, 'ASUS ROG Zephyrus G16 (2025)', 'Laptops', 69900.00, 12, 'โน้ตบุ๊กเกมมิ่งระดับเรือธง มาพร้อมจอ OLED 240Hz และขุมพลัง Intel Core Ultra 9 พร้อม RTX 4080', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80', 'Intel Core Ultra 9 | 32GB LPDDR5X | 1TB NVMe Gen4 | RTX 4080 12GB | 16" 2.5K OLED 240Hz'),
(2, 'MacBook Pro 16-inch M4 Pro', 'Laptops', 89900.00, 8, 'โน้ตบุ๊กทรงพลังสำหรับนักพัฒนาและครีเอเตอร์ ชิป M4 Pro ประสิทธิภาพระดับพรีเมียม แบตเตอรี่อึดถึง 22 ชม.', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', 'Apple M4 Pro 14-core | 36GB Unified RAM | 1TB SSD | Liquid Retina XDR 120Hz ProMotion'),
(3, 'NVIDIA GeForce RTX 4090 OC 24GB', 'Components', 74500.00, 5, 'การ์ดจอสถาปัตยกรรม Ada Lovelace สำหรับเล่นเกม 4K Ultra และงานประมวลผล Deep Learning / AI', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80', '24GB GDDR6X 384-bit | DLSS 3.5 | 16384 CUDA Cores | PCIe 4.0 | Triple Axial-Tech Fans'),
(4, 'AMD Ryzen 9 9950X Processor', 'Components', 24900.00, 15, 'ซีพียูระดับท็อป 16 Cores / 32 Threads สถาปัตยกรรม Zen 5 ความเร็วสูงสุด 5.7 GHz รองรับงานหนักทุกประเภท', 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=800&q=80', '16 Cores / 32 Threads | Base 4.3 GHz, Boost 5.7 GHz | Socket AM5 | 80MB Cache | PCIe 5.0'),
(5, 'Samsung Odyssey OLED G9 49" Curved', 'Monitors', 45900.00, 7, 'จอมอนิเตอร์เกมมิ่งโค้ง 1800R Dual QHD 240Hz 0.03ms ให้ภาพสีสดและคอนทราสต์สมจริงไร้ที่ติ', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80', '49-inch Dual QHD (5120x1440) | 240Hz | 0.03ms | Neo Quantum Processor Pro | FreeSync Premium Pro'),
(6, 'Dell UltraSharp 32" 4K Video Conf', 'Monitors', 33900.00, 10, 'จอภาพ 4K IPS Black เทคโนโลยีขั้นสูง พร้อมเว็บแคม 4K Sony Starvis ในตัว เหมาะสำหรับสายทำงานมืออาชีพ', 'https://images.unsplash.com/photo-1547119957-637f8679db1e?auto=format&fit=crop&w=800&q=80', '32" 4K UHD (3840x2160) | IPS Black 2000:1 | 98% DCI-P3 | Built-in 4K Webcam | Thunderbolt 4 90W'),
(7, 'Keychron Q1 Max Wireless Mechanical', 'Accessories', 7990.00, 25, 'คีย์บอร์ดคัสตอมบอดี้อะลูมิเนียม CNC เชื่อมต่อแบบ Tri-mode 2.4G/BT/Type-C ซาวด์สัมผัส acoustic foam ยอดเยี่ยม', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80', '75% Layout | Gateron Jupiter Switch | Double-shot PBT | QMK/VIA Programmable | 4000mAh Battery'),
(8, 'Logitech G PRO X SUPERLIGHT 2 DEX', 'Accessories', 5690.00, 30, 'เมาส์เกมมิ่งไร้สายน้ำหนักเบาเพียง 60 กรัม เซนเซอร์ HERO 2 ความละเอียด 44,000 DPI พร้อม Polling Rate 8000Hz', 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80', 'HERO 2 Sensor 44K DPI | LIGHTFORCE Hybrid Optical Switches | 8K Polling Rate | 95h Battery'),
(9, 'Synology DiskStation DS923+ 4-Bay NAS', 'Network & Storage', 21900.00, 6, 'อุปกรณ์จัดเก็บข้อมูลเครือข่ายสำหรับสำรองข้อมูลและแชร์ไฟล์ความเร็วสูง รองรับ M.2 NVMe Cache และ 10GbE', 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?auto=format&fit=crop&w=800&q=80', 'AMD Ryzen R1600 Dual-core | 4GB DDR4 ECC (up to 32GB) | 4 Drive Bays | 2x M.2 NVMe Slots');

INSERT INTO orders (id, user_id, customer_name, customer_email, customer_phone, shipping_address, total_amount, status) VALUES
(1, 2, 'สมศักดิ์ นามสมมุติ', 'member@techzone.com', '081-234-5678', '169 ถนนลงหาดบางแสน ตำบลแสนสุข อำเภอเมืองชลบุรี ชลบุรี 20131', 89900.00, 'processing');

INSERT INTO order_items (id, order_id, product_id, product_name, price, quantity) VALUES
(1, 1, 2, 'MacBook Pro 16-inch M4 Pro', 89900.00, 1);
