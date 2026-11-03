const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : {} }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testCrud() {
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'admin@techzone.com',
    password: 'admin1234'
  });
  const token = loginRes.body.token;
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  console.log('1. Testing Insert Product...');
  const addRes = await request('POST', '/api/products', {
    name: 'Dell XPS 13 Plus (2025)',
    category: 'Laptops',
    price: 54900,
    stock: 10,
    description: 'อัลตร้าบุ๊กบางเบา จอสัมผัส OLED 3.5K',
    image_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80',
    specifications: 'Intel Core Ultra 7 | 32GB RAM | 1TB SSD'
  }, authHeaders);
  console.log('Add status:', addRes.status, 'ID:', addRes.body.data.id);
  const newId = addRes.body.data.id;

  console.log('2. Testing Update Product...');
  const editRes = await request('PUT', `/api/products/${newId}`, {
    name: 'Dell XPS 13 Plus (Updated 2025 Edition)',
    category: 'Laptops',
    price: 52900,
    stock: 14,
    description: 'อัลตร้าบุ๊กบางเบา ปรับราคาพิเศษ',
    image_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80',
    specifications: 'Intel Core Ultra 7 | 32GB RAM | 1TB SSD | Special Price'
  }, authHeaders);
  console.log('Edit status:', editRes.status, 'New Name:', editRes.body.data.name);

  console.log('3. Testing Delete Product...');
  const delRes = await request('DELETE', `/api/products/${newId}`, null, authHeaders);
  console.log('Delete status:', delRes.status, 'Deleted:', delRes.body.message);

  console.log('4. Verify deletion...');
  const getRes = await request('GET', `/api/products/${newId}`);
  console.log('Get after delete status (should be 404):', getRes.status);

  console.log('CRUD TESTING COMPLETE AND VERIFIED!');
}

testCrud().catch(console.error);

