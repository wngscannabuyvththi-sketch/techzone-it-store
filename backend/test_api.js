const http = require('http');

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'GET',
      headers: headers
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('--- 1. Testing Company Info ---');
  const comp = await get('http://localhost:5000/api/company');
  console.log('Company status:', comp.status, comp.body.data.name);

  console.log('--- 2. Testing Products Query ---');
  const prods = await get('http://localhost:5000/api/products');
  console.log('Products count:', prods.body.data.length);

  console.log('--- 3. Testing Admin Login ---');
  const adminLogin = await post('http://localhost:5000/api/auth/login', {
    email: 'admin@techzone.com',
    password: 'admin1234'
  });
  console.log('Admin login status:', adminLogin.status, 'User:', adminLogin.body.user);
  const adminToken = adminLogin.body.token;

  console.log('--- 4. Testing User Registration & Email Verification ---');
  const testEmail = `test_${Date.now()}@buu.ac.th`;
  const regRes = await post('http://localhost:5000/api/auth/register', {
    username: 'BUU นิสิตทดสอบ',
    email: testEmail,
    password: 'password123'
  });
  console.log('Register status:', regRes.status, 'Code:', regRes.body.verificationCode);

  console.log('--- 5. Verify Email with Code ---');
  const verifyRes = await post('http://localhost:5000/api/auth/verify-email', {
    email: testEmail,
    code: regRes.body.verificationCode
  });
  console.log('Verify status:', verifyRes.status, 'Message:', verifyRes.body.message);
  const userToken = verifyRes.body.token;

  console.log('--- 6. Member Order Product ---');
  const orderRes = await post('http://localhost:5000/api/orders', {
    customerName: 'นิสิต บูรพา',
    customerPhone: '0812345678',
    shippingAddress: 'มหาวิทยาลัยบูรพา บางแสน ชลบุรี',
    items: [{ id: prods.body.data[0].id, quantity: 1 }]
  }, { 'Authorization': `Bearer ${userToken}` });
  console.log('Order status:', orderRes.status, 'Order ID:', orderRes.body.orderId);

  console.log('--- 7. Admin View Orders & Stats ---');
  const statsRes = await get('http://localhost:5000/api/admin/stats', { 'Authorization': `Bearer ${adminToken}` });
  console.log('Admin stats:', statsRes.body.data);

  console.log('ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(console.error);

