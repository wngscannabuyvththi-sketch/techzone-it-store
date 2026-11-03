const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
const dbName = process.env.DB_NAME || 'techzone_db';
const dbPort = parseInt(process.env.DB_PORT || '3306');

let mysqlPool = null;
let useMySQL = false;
let sqliteDb = null;
let isReady = false;

try {
  mysqlPool = mysql.createPool({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    port: dbPort,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    charset: 'utf8mb4',
    connectTimeout: 4000
  });

  mysqlPool.getConnection((err, conn) => {
    if (err) {
      console.log('MySQL Connection Notice:', err.message);
      console.log('Switching to SQLite local database fallback for Production/Local');
      initSqliteFallback();
    } else {
      useMySQL = true;
      console.log('Connected to MySQL database:', dbName, 'on port', dbPort);
      conn.release();
      initMySQLTables();
    }
  });
} catch (e) {
  initSqliteFallback();
}

function initMySQLTables() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'member',
      is_verified INT DEFAULT 0,
      verify_token VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createProductsTable = `
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(100) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      stock INT NOT NULL,
      description TEXT,
      image_url TEXT,
      specifications TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createOrdersTable = `
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      customer_name VARCHAR(150) NOT NULL,
      customer_email VARCHAR(150) NOT NULL,
      customer_phone VARCHAR(50) NOT NULL,
      shipping_address TEXT NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `;

  const createOrderItemsTable = `
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      product_name VARCHAR(200) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      quantity INT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    )
  `;

  mysqlPool.query(createUsersTable, () => {
    mysqlPool.query(createProductsTable, () => {
      mysqlPool.query(createOrdersTable, () => {
        mysqlPool.query(createOrderItemsTable, () => {
          seedMySQLDefaults();
          isReady = true;
        });
      });
    });
  });
}

const initialProductsList = [
  ['ASUS ROG Zephyrus G16 (2025)', 'Laptops', 69900.00, 12, 'โน้ตบุ๊กเกมมิ่งระดับเรือธง มาพร้อมจอ OLED 240Hz และขุมพลัง Intel Core Ultra 9 พร้อม RTX 4080', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80', 'Intel Core Ultra 9 | 32GB LPDDR5X | 1TB NVMe Gen4 | RTX 4080 12GB | 16" 2.5K OLED 240Hz'],
  ['MacBook Pro 16-inch M4 Pro', 'Laptops', 89900.00, 8, 'โน้ตบุ๊กทรงพลังสำหรับนักพัฒนาและครีเอเตอร์ ชิป M4 Pro ประสิทธิภาพระดับพรีเมียม แบตเตอรี่อึดถึง 22 ชม.', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', 'Apple M4 Pro 14-core | 36GB Unified RAM | 1TB SSD | Liquid Retina XDR 120Hz ProMotion'],
  ['NVIDIA GeForce RTX 4090 OC 24GB', 'Components', 74500.00, 5, 'การ์ดจอสถาปัตยกรรม Ada Lovelace สำหรับเล่นเกม 4K Ultra และงานประมวลผล Deep Learning / AI', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80', '24GB GDDR6X 384-bit | DLSS 3.5 | 16384 CUDA Cores | PCIe 4.0 | Triple Axial-Tech Fans'],
  ['AMD Ryzen 9 9950X Processor', 'Components', 24900.00, 15, 'ซีพียูระดับท็อป 16 Cores / 32 Threads สถาปัตยกรรม Zen 5 ความเร็วสูงสุด 5.7 GHz รองรับงานหนักทุกประเภท', 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=800&q=80', '16 Cores / 32 Threads | Base 4.3 GHz, Boost 5.7 GHz | Socket AM5 | 80MB Cache | PCIe 5.0'],
  ['Samsung Odyssey OLED G9 49" Curved', 'Monitors', 45900.00, 7, 'จอมอนิเตอร์เกมมิ่งโค้ง 1800R Dual QHD 240Hz 0.03ms ให้ภาพสีสดและคอนทราสต์สมจริงไร้ที่ติ', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80', '49-inch Dual QHD (5120x1440) | 240Hz | 0.03ms | Neo Quantum Processor Pro | FreeSync Premium Pro'],
  ['Dell UltraSharp 32" 4K Video Conf', 'Monitors', 33900.00, 10, 'จอภาพ 4K IPS Black เทคโนโลยีขั้นสูง พร้อมเว็บแคม 4K Sony Starvis ในตัว เหมาะสำหรับสายทำงานมืออาชีพ', 'https://images.unsplash.com/photo-1547119957-637f8679db1e?auto=format&fit=crop&w=800&q=80', '32" 4K UHD (3840x2160) | IPS Black 2000:1 | 98% DCI-P3 | Built-in 4K Webcam | Thunderbolt 4 90W'],
  ['Keychron Q1 Max Wireless Mechanical', 'Accessories', 7990.00, 25, 'คีย์บอร์ดคัสตอมบอดี้อะลูมิเนียม CNC เชื่อมต่อแบบ Tri-mode 2.4G/BT/Type-C ซาวด์สัมผัส acoustic foam ยอดเยี่ยม', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80', '75% Layout | Gateron Jupiter Switch | Double-shot PBT | QMK/VIA Programmable | 4000mAh Battery'],
  ['Logitech G PRO X SUPERLIGHT 2 DEX', 'Accessories', 5690.00, 30, 'เมาส์เกมมิ่งไร้สายน้ำหนักเบาเพียง 60 กรัม เซนเซอร์ HERO 2 ความละเอียด 44,000 DPI พร้อม Polling Rate 8000Hz', 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80', 'HERO 2 Sensor 44K DPI | LIGHTFORCE Hybrid Optical Switches | 8K Polling Rate | 95h Battery'],
  ['Synology DiskStation DS923+ 4-Bay NAS', 'Network & Storage', 21900.00, 6, 'อุปกรณ์จัดเก็บข้อมูลเครือข่ายสำหรับสำรองข้อมูลและแชร์ไฟล์ความเร็วสูง รองรับ M.2 NVMe Cache และ 10GbE', 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?auto=format&fit=crop&w=800&q=80', 'AMD Ryzen R1600 Dual-core | 4GB DDR4 ECC (up to 32GB) | 4 Drive Bays | 2x M.2 NVMe Slots']
];

function seedMySQLDefaults() {
  mysqlPool.query('SELECT COUNT(*) as count FROM users', (err, rows) => {
    if (err || (rows && rows[0].count > 0)) return;

    const adminHash = bcrypt.hashSync('admin1234', 10);
    const memberHash = bcrypt.hashSync('member1234', 10);

    const insertSql = 'INSERT INTO users (username, email, password_hash, role, is_verified) VALUES ?';
    const values = [
      ['TechAdmin', 'admin@techzone.com', adminHash, 'admin', 1],
      ['Somsak Dev', 'member@techzone.com', memberHash, 'member', 1]
    ];
    mysqlPool.query(insertSql, [values], () => {});
  });

  mysqlPool.query('SELECT COUNT(*) as count FROM products', (err, rows) => {
    if (err || (rows && rows[0].count > 0)) return;

    const insertSql = 'INSERT INTO products (name, category, price, stock, description, image_url, specifications) VALUES ?';
    mysqlPool.query(insertSql, [initialProductsList], () => {});
  });
}

function initSqliteFallback() {
  const dbPath = path.join(__dirname, 'techzone.db');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to open SQLite database:', err.message);
      return;
    }
    console.log('SQLite database initialized successfully at:', dbPath);
    initSqliteTables();
  });
}

function initSqliteTables() {
  sqliteDb.serialize(() => {
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        is_verified INTEGER DEFAULT 0,
        verify_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL,
        description TEXT,
        image_url TEXT,
        specifications TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        shipping_address TEXT NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL
      )
    `, () => {
      seedSqliteDefaults();
      isReady = true;
    });
  });
}

function seedSqliteDefaults() {
  sqliteDb.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (!err && row && row.count === 0) {
      const adminHash = bcrypt.hashSync('admin1234', 10);
      const memberHash = bcrypt.hashSync('member1234', 10);

      const stmt = sqliteDb.prepare('INSERT INTO users (username, email, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?)');
      stmt.run('TechAdmin', 'admin@techzone.com', adminHash, 'admin', 1);
      stmt.run('Somsak Dev', 'member@techzone.com', memberHash, 'member', 1);
      stmt.finalize();
      console.log('Seeded default admin and member accounts into SQLite');
    }
  });

  sqliteDb.get('SELECT COUNT(*) as count FROM products', (err, row) => {
    if (!err && row && row.count === 0) {
      const stmt = sqliteDb.prepare('INSERT INTO products (name, category, price, stock, description, image_url, specifications) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const p of initialProductsList) {
        stmt.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6]);
      }
      stmt.finalize();
      console.log('Seeded initial products into SQLite');
    }
  });
}

const db = {
  get(sql, params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    if (useMySQL && mysqlPool) {
      mysqlPool.query(sql, params, (err, rows) => {
        if (err) return cb(err);
        cb(null, rows && rows.length > 0 ? rows[0] : null);
      });
    } else if (sqliteDb) {
      sqliteDb.get(sql, params, cb);
    } else {
      setTimeout(() => db.get(sql, params, cb), 200);
    }
  },

  all(sql, params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    if (useMySQL && mysqlPool) {
      mysqlPool.query(sql, params, (err, rows) => {
        if (err) return cb(err);
        cb(null, rows || []);
      });
    } else if (sqliteDb) {
      sqliteDb.all(sql, params, cb);
    } else {
      setTimeout(() => db.all(sql, params, cb), 200);
    }
  },

  run(sql, params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    if (useMySQL && mysqlPool) {
      mysqlPool.query(sql, params, function(err, result) {
        const ctx = {
          lastID: result ? result.insertId : null,
          changes: result ? result.affectedRows : 0
        };
        if (cb) cb.call(ctx, err);
      });
    } else if (sqliteDb) {
      sqliteDb.run(sql, params, function(err) {
        if (cb) cb.call(this, err);
      });
    } else {
      setTimeout(() => db.run(sql, params, cb), 200);
    }
  },

  prepare(sql) {
    if (useMySQL && mysqlPool) {
      return {
        run(...args) {
          let cb = null;
          let params = args;
          if (typeof args[args.length - 1] === 'function') {
            cb = args.pop();
            params = args;
          }
          mysqlPool.query(sql, params, function(err, result) {
            const ctx = { lastID: result ? result.insertId : null, changes: result ? result.affectedRows : 0 };
            if (cb) cb.call(ctx, err);
          });
        },
        finalize(cb) {
          if (cb) cb();
        }
      };
    } else if (sqliteDb) {
      return sqliteDb.prepare(sql);
    }
    return { run() {}, finalize(cb) { if (cb) cb(); } };
  }
};

module.exports = db;
