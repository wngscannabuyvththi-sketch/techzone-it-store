const state = {
  currentUser: null,
  token: localStorage.getItem('techzone_token') || null,
  cart: JSON.parse(localStorage.getItem('techzone_cart') || '[]'),
  products: [],
  currentRoute: 'home',
  currentCategory: 'All',
  searchQuery: '',
  sortQuery: 'newest',
  activeDetailProduct: null,
  pendingVerifyEmail: '',
  pendingVerifyCode: ''
};

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2800,
  timerProgressBar: true
});

document.addEventListener('DOMContentLoaded', () => {
  initializeState();
  loadCompanyInfo();
  loadProducts();
  setupEventListeners();
  updateCartBadge();
  checkUrlVerificationParams();
});

function checkUrlVerificationParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const verified = urlParams.get('verified');
  const email = urlParams.get('email');

  if (verified === 'success') {
    window.history.replaceState({}, document.title, window.location.pathname);
    Swal.fire({
      icon: 'success',
      title: 'ยืนยันตัวตนผ่านอีเมลสำเร็จ!',
      html: `อีเมล <strong>${escapeHtml(email || '')}</strong> ได้รับการยืนยันแล้ว สามารถเข้าสู่ระบบได้ทันที`,
      confirmButtonText: 'เข้าสู่ระบบเลย',
      confirmButtonColor: '#00d2ff'
    }).then(() => {
      openLoginModal();
      if (email) {
        document.getElementById('loginEmail').value = email;
      }
    });
  } else if (verified === 'already') {
    window.history.replaceState({}, document.title, window.location.pathname);
    Swal.fire({
      icon: 'info',
      title: 'บัญชีนี้ได้รับการยืนยันแล้ว',
      text: 'คุณสามารถเข้าสู่ระบบเพื่อเริ่มใช้งานได้เลย',
      confirmButtonText: 'เข้าสู่ระบบ',
      confirmButtonColor: '#00d2ff'
    }).then(() => {
      openLoginModal();
    });
  } else if (verified === 'error') {
    window.history.replaceState({}, document.title, window.location.pathname);
    Swal.fire({
      icon: 'error',
      title: 'การยืนยันตัวตนไม่สำเร็จ',
      text: 'ลิงก์ยืนยันตัวตนอาจไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่อีกครั้ง'
    });
  }
}

function initializeState() {
  const savedUser = localStorage.getItem('techzone_user');
  if (savedUser && state.token) {
    try {
      state.currentUser = JSON.parse(savedUser);
      verifyCurrentSession();
    } catch (e) {
      logoutUser(false);
    }
  }
  updateAuthUI();
}

function verifyCurrentSession() {
  fetch('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${state.token}` }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success && data.user) {
      state.currentUser = data.user;
      localStorage.setItem('techzone_user', JSON.stringify(data.user));
      updateAuthUI();
    } else {
      logoutUser(false);
    }
  })
  .catch(() => {});
}

function setupEventListeners() {
  const sortSelect = document.getElementById('productSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortQuery = e.target.value;
      loadProducts();
    });
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('appSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('show');
  overlay.classList.toggle('show');
}

function navigateTo(route) {
  if (route.startsWith('admin') && (!state.currentUser || state.currentUser.role !== 'admin')) {
    toast.fire({ icon: 'warning', title: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น' });
    openLoginModal();
    return;
  }

  if (route === 'my-orders' && !state.currentUser) {
    toast.fire({ icon: 'info', title: 'กรุณาเข้าสู่ระบบเพื่อดูประวัติคำสั่งซื้อ' });
    openLoginModal();
    return;
  }

  state.currentRoute = route;

  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.add('d-none');
  });

  const activeView = document.getElementById(`view-${route}`);
  if (activeView) {
    activeView.classList.remove('d-none');
  }

  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-route') === route) {
      link.classList.add('active');
    }
  });

  const sidebar = document.getElementById('appSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar.classList.contains('show')) {
    sidebar.classList.remove('show');
    overlay.classList.remove('show');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (route === 'home') {
    renderHomeFeatured();
  } else if (route === 'products') {
    loadProducts();
  } else if (route === 'my-orders') {
    loadMyOrders();
  } else if (route === 'admin-products') {
    loadAdminProducts();
  } else if (route === 'admin-orders') {
    loadAdminOrders();
  } else if (route === 'admin-stats') {
    loadAdminStats();
  }
}

function updateAuthUI() {
  const authActions = document.getElementById('authActions');
  const userProfileDropdown = document.getElementById('userProfileDropdown');
  const navbarRoleBadge = document.getElementById('navbarRoleBadge');
  const navbarUserName = document.getElementById('navbarUserName');
  const navbarUserEmail = document.getElementById('navbarUserEmail');
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const sidebarUserName = document.getElementById('sidebarUserName');
  const sidebarUserRole = document.getElementById('sidebarUserRole');

  const adminElements = document.querySelectorAll('.admin-only');
  const memberElements = document.querySelectorAll('.member-only');

  if (state.currentUser && state.token) {
    authActions.classList.add('d-none');
    userProfileDropdown.classList.remove('d-none');

    const roleName = state.currentUser.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'สมาชิก (Member)';
    const badgeColor = state.currentUser.role === 'admin' ? 'bg-danger' : 'bg-primary';

    navbarRoleBadge.className = `badge ${badgeColor}`;
    navbarRoleBadge.textContent = state.currentUser.role.toUpperCase();
    navbarUserName.textContent = state.currentUser.username;
    navbarUserEmail.textContent = state.currentUser.email;

    sidebarAvatar.textContent = state.currentUser.username.charAt(0).toUpperCase();
    sidebarUserName.textContent = state.currentUser.username;
    sidebarUserRole.textContent = roleName;

    memberElements.forEach(el => el.classList.remove('d-none'));

    if (state.currentUser.role === 'admin') {
      adminElements.forEach(el => el.classList.remove('d-none'));
    } else {
      adminElements.forEach(el => el.classList.add('d-none'));
    }
  } else {
    authActions.classList.remove('d-none');
    userProfileDropdown.classList.add('d-none');

    sidebarAvatar.textContent = '?';
    sidebarUserName.textContent = 'ผู้เยี่ยมชม';
    sidebarUserRole.textContent = 'Guest';

    adminElements.forEach(el => el.classList.add('d-none'));
    memberElements.forEach(el => el.classList.add('d-none'));
  }
}

function loadCompanyInfo() {
  fetch('/api/company')
    .then(res => res.json())
    .then(res => {
      if (!res.success) return;
      const data = res.data;
      document.getElementById('companyName').textContent = data.name;
      document.getElementById('companySlogan').textContent = data.slogan;
      document.getElementById('companyDescription').textContent = data.description;
      document.getElementById('companyVision').textContent = data.vision;
      document.getElementById('companyAddress').textContent = data.contact.address;
      document.getElementById('companyPhone').textContent = data.contact.phone;
      document.getElementById('companyEmail').textContent = data.contact.email;

      const missionList = document.getElementById('companyMissionList');
      missionList.innerHTML = '';
      data.mission.forEach(m => {
        const li = document.createElement('li');
        li.className = 'mb-2';
        li.textContent = m;
        missionList.appendChild(li);
      });
    })
    .catch(() => {});
}

function loadProducts() {
  let url = `/api/products?category=${encodeURIComponent(state.currentCategory)}&sort=${state.sortQuery}`;
  if (state.searchQuery) {
    url += `&search=${encodeURIComponent(state.searchQuery)}`;
  }

  fetch(url)
    .then(res => res.json())
    .then(res => {
      if (!res.success) return;
      state.products = res.data;
      renderProductsCatalog();
      if (state.currentRoute === 'home') {
        renderHomeFeatured();
      }
    })
    .catch(() => {
      toast.fire({ icon: 'error', title: 'ไม่สามารถโหลดข้อมูลสินค้าได้' });
    });
}

function renderHomeFeatured() {
  const container = document.getElementById('homeFeaturedProducts');
  if (!container) return;

  const featured = state.products.slice(0, 4);
  if (featured.length === 0) {
    container.innerHTML = '<div class="col-12 text-center text-muted py-4">กำลังโหลดรายการสินค้าแนะนำ...</div>';
    return;
  }

  container.innerHTML = featured.map(p => createProductCardHtml(p)).join('');
}

function renderProductsCatalog() {
  const grid = document.getElementById('productsCatalogGrid');
  const emptyBox = document.getElementById('noProductsFound');

  if (state.products.length === 0) {
    grid.innerHTML = '';
    emptyBox.classList.remove('d-none');
    return;
  }

  emptyBox.classList.add('d-none');
  grid.innerHTML = state.products.map(p => createProductCardHtml(p)).join('');
}

function createProductCardHtml(product) {
  const formattedPrice = Number(product.price).toLocaleString('th-TH');
  const isOutOfStock = product.stock <= 0;

  return `
    <div class="col-xl-3 col-lg-4 col-md-6 col-12">
      <div class="tech-card">
        <div class="product-img-wrapper" onclick="openProductDetail(${product.id})" style="cursor: pointer;">
          <img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'">
          <span class="product-category-tag">${escapeHtml(product.category)}</span>
        </div>
        <div class="flex-grow-1 d-flex flex-column">
          <h6 class="fw-bold text-white mb-2 text-truncate" title="${escapeHtml(product.name)}">
            ${escapeHtml(product.name)}
          </h6>
          <p class="small text-muted mb-2 text-truncate-2" style="font-size: 0.8rem; line-height: 1.4; height: 36px; overflow: hidden;">
            ${escapeHtml(product.description || '')}
          </p>
          <div class="mt-auto">
            <div class="d-flex justify-content-between align-items-baseline mb-2">
              <span class="product-price">฿${formattedPrice}</span>
              <span class="product-stock-tag ${isOutOfStock ? 'text-danger fw-bold' : ''}">
                ${isOutOfStock ? 'สินค้าหมด' : `คงเหลือ ${product.stock} ชิ้น`}
              </span>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-cyan btn-sm flex-grow-1" onclick="openProductDetail(${product.id})">
                <i class="bi bi-eye me-1"></i> รายละเอียด
              </button>
              <button class="btn btn-cyan btn-sm" ${isOutOfStock ? 'disabled' : ''} onclick="addToCart(${product.id})">
                <i class="bi bi-cart-plus"></i> สั่งซื้อ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function setCategoryFilter(category, element) {
  state.currentCategory = category;
  document.querySelectorAll('#categoryFilters .filter-pill').forEach(pill => {
    pill.classList.remove('active');
  });
  element.classList.add('active');
  loadProducts();
}

function handleGlobalSearch(event) {
  state.searchQuery = event.target.value;
  if (state.currentRoute !== 'products') {
    navigateTo('products');
  }
  loadProducts();
}

function resetProductFilters() {
  state.searchQuery = '';
  state.currentCategory = 'All';
  state.sortQuery = 'newest';
  const topInput = document.getElementById('topSearchInput');
  if (topInput) topInput.value = '';

  document.querySelectorAll('#categoryFilters .filter-pill').forEach((pill, idx) => {
    if (idx === 0) pill.classList.add('active');
    else pill.classList.remove('active');
  });

  const sortSelect = document.getElementById('productSortSelect');
  if (sortSelect) sortSelect.value = 'newest';

  loadProducts();
}

function openProductDetail(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  state.activeDetailProduct = product;
  document.getElementById('detailProductName').textContent = product.name;
  document.getElementById('detailProductImage').src = product.image_url;
  document.getElementById('detailProductCategory').textContent = product.category;
  document.getElementById('detailProductPrice').textContent = `฿${Number(product.price).toLocaleString('th-TH')}`;
  document.getElementById('detailProductStock').textContent = product.stock;
  document.getElementById('detailProductDesc').textContent = product.description || 'ไม่มีคำอธิบายเพิ่มเติม';
  document.getElementById('detailProductSpecs').textContent = product.specifications || 'มาตรฐานผู้ผลิต';

  const addBtn = document.getElementById('detailAddToCartBtn');
  if (product.stock <= 0) {
    addBtn.disabled = true;
    addBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i> สินค้าหมดชั่วคราว';
  } else {
    addBtn.disabled = false;
    addBtn.innerHTML = '<i class="bi bi-cart-plus me-1"></i> เพิ่มลงตะกร้าสินค้า';
  }

  const modal = new bootstrap.Modal(document.getElementById('productDetailModal'));
  modal.show();
}

function addProductFromDetail() {
  if (state.activeDetailProduct) {
    addToCart(state.activeDetailProduct.id);
    const modalEl = document.getElementById('productDetailModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  }
}

function addToCart(productId, qty = 1) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  if (product.stock <= 0) {
    toast.fire({ icon: 'error', title: 'ขออภัย สินค้านี้หมดชั่วคราว' });
    return;
  }

  const existingIndex = state.cart.findIndex(i => i.id === productId);
  if (existingIndex > -1) {
    const currentQty = state.cart[existingIndex].quantity;
    if (currentQty + qty > product.stock) {
      toast.fire({ icon: 'warning', title: `ไม่สามารถสั่งซื้อเกินจำนวนสต็อกที่มี (${product.stock} ชิ้น)` });
      return;
    }
    state.cart[existingIndex].quantity += qty;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      stock: product.stock,
      quantity: qty
    });
  }

  saveCart();
  updateCartBadge();
  toast.fire({ icon: 'success', title: `เพิ่ม "${product.name}" ลงในตะกร้าแล้ว` });
}

function updateCartQuantity(productId, delta) {
  const item = state.cart.find(i => i.id === productId);
  if (!item) return;

  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }

  if (newQty > item.stock) {
    toast.fire({ icon: 'warning', title: `สต็อกคงเหลือเพียง ${item.stock} ชิ้น` });
    return;
  }

  item.quantity = newQty;
  saveCart();
  renderCart();
  updateCartBadge();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(i => i.id !== productId);
  saveCart();
  renderCart();
  updateCartBadge();
}

function saveCart() {
  localStorage.setItem('techzone_cart', JSON.stringify(state.cart));
}

function updateCartBadge() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('headerCartCount');
  if (badge) {
    badge.textContent = count;
  }
}

function openCartModal() {
  renderCart();
  if (state.currentUser) {
    const nameInput = document.getElementById('orderCustomerName');
    if (nameInput && !nameInput.value) {
      nameInput.value = state.currentUser.username;
    }
  }
  const modal = new bootstrap.Modal(document.getElementById('cartModal'));
  modal.show();
}

function renderCart() {
  const emptyState = document.getElementById('cartEmptyState');
  const filledState = document.getElementById('cartFilledState');
  const tbody = document.getElementById('cartTableBody');
  const totalDisplay = document.getElementById('cartTotalAmount');

  if (state.cart.length === 0) {
    emptyState.classList.remove('d-none');
    filledState.classList.add('d-none');
    return;
  }

  emptyState.classList.add('d-none');
  filledState.classList.remove('d-none');

  let total = 0;
  tbody.innerHTML = state.cart.map(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <img src="${escapeHtml(item.image_url)}" class="rounded" width="45" height="45" style="object-fit: cover;">
            <div>
              <div class="fw-semibold text-white small">${escapeHtml(item.name)}</div>
              <small class="text-muted">สต็อก: ${item.stock}</small>
            </div>
          </div>
        </td>
        <td class="text-nowrap text-light">฿${Number(item.price).toLocaleString('th-TH')}</td>
        <td>
          <div class="input-group input-group-sm" style="width: 105px;">
            <button class="btn btn-dark border-secondary text-white" onclick="updateCartQuantity(${item.id}, -1)">-</button>
            <input type="text" class="form-control text-center p-0 bg-dark text-white border-secondary" readonly value="${item.quantity}">
            <button class="btn btn-dark border-secondary text-white" onclick="updateCartQuantity(${item.id}, 1)">+</button>
          </div>
        </td>
        <td class="text-cyan fw-bold text-nowrap">฿${Number(itemTotal).toLocaleString('th-TH')}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${item.id})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  totalDisplay.textContent = `฿${Number(total).toLocaleString('th-TH')}`;
}

function handleCheckoutSubmit(event) {
  event.preventDefault();

  if (!state.currentUser) {
    bootstrap.Modal.getInstance(document.getElementById('cartModal')).hide();
    Swal.fire({
      icon: 'info',
      title: 'กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อ',
      text: 'เฉพาะสมาชิก (Member) จึงจะสามารถดำเนินการสั่งซื้อและบันทึกประวัติการสั่งซื้อได้',
      confirmButtonText: 'เข้าสู่ระบบทันที',
      confirmButtonColor: '#00d2ff'
    }).then(result => {
      if (result.isConfirmed) {
        openLoginModal();
      }
    });
    return;
  }

  const customerName = document.getElementById('orderCustomerName').value;
  const customerPhone = document.getElementById('orderCustomerPhone').value;
  const shippingAddress = document.getElementById('orderShippingAddress').value;

  const payload = {
    customerName,
    customerPhone,
    shippingAddress,
    items: state.cart.map(item => ({ id: item.id, quantity: item.quantity }))
  };

  fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      Swal.fire({ icon: 'error', title: 'ไม่สามารถสั่งซื้อได้', text: data.message });
      return;
    }

    state.cart = [];
    saveCart();
    updateCartBadge();

    const cartModal = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
    if (cartModal) cartModal.hide();

    Swal.fire({
      icon: 'success',
      title: 'สั่งซื้อสำเร็จ!',
      html: `
        <div class="text-start">
          <p class="mb-1"><strong>หมายเลขคำสั่งซื้อ:</strong> #${data.orderId}</p>
          <p class="mb-1"><strong>ยอดรวมสุทธิ:</strong> ฿${Number(data.totalAmount).toLocaleString('th-TH')}</p>
          <p class="mb-1"><strong>ผู้รับ:</strong> ${escapeHtml(customerName)}</p>
          <p class="mb-0"><strong>ที่อยู่จัดส่ง:</strong> ${escapeHtml(shippingAddress)}</p>
        </div>
      `,
      confirmButtonText: 'ดูประวัติคำสั่งซื้อ',
      confirmButtonColor: '#00d2ff'
    }).then(() => {
      loadProducts();
      navigateTo('my-orders');
    });
  })
  .catch(() => {
    toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
  });
}

function loadMyOrders() {
  if (!state.currentUser) return;

  fetch('/api/orders/my-orders', {
    headers: { 'Authorization': `Bearer ${state.token}` }
  })
  .then(res => res.json())
  .then(res => {
    if (!res.success) return;
    renderMyOrders(res.data);
  })
  .catch(() => {
    toast.fire({ icon: 'error', title: 'ไม่สามารถดึงข้อมูลประวัติคำสั่งซื้อได้' });
  });
}

function renderMyOrders(orders) {
  const container = document.getElementById('myOrdersList');
  const emptyMsg = document.getElementById('noOrdersMessage');

  if (orders.length === 0) {
    container.innerHTML = '';
    emptyMsg.classList.remove('d-none');
    return;
  }

  emptyMsg.classList.add('d-none');
  container.innerHTML = orders.map(order => {
    const formattedDate = new Date(order.created_at).toLocaleString('th-TH');
    const itemsHtml = order.items.map(item => `
      <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-secondary">
        <div>
          <span class="text-white fw-semibold">${escapeHtml(item.product_name)}</span>
          <span class="text-muted small ms-2">x ${item.quantity}</span>
        </div>
        <div class="text-cyan fw-bold">฿${Number(item.price * item.quantity).toLocaleString('th-TH')}</div>
      </div>
    `).join('');

    return `
      <div class="card bg-card border-secondary rounded-4 p-4 mb-3 shadow">
        <div class="d-flex flex-wrap justify-content-between align-items-center border-bottom border-secondary pb-3 mb-3 gap-2">
          <div>
            <span class="fw-bold text-white fs-5">คำสั่งซื้อ #${order.id}</span>
            <small class="text-muted ms-2"><i class="bi bi-clock me-1"></i>${formattedDate}</small>
          </div>
          <div>
            <span class="status-badge ${order.status}">${formatStatusLabel(order.status)}</span>
          </div>
        </div>

        <div class="mb-3">
          ${itemsHtml}
        </div>

        <div class="row align-items-center">
          <div class="col-md-7">
            <small class="text-muted d-block"><i class="bi bi-geo-alt me-1 text-cyan"></i>สถานที่จัดส่ง: ${escapeHtml(order.shipping_address)}</small>
            <small class="text-muted d-block"><i class="bi bi-telephone me-1 text-cyan"></i>เบอร์ติดต่อ: ${escapeHtml(order.customer_phone)}</small>
          </div>
          <div class="col-md-5 text-md-end mt-2 mt-md-0">
            <small class="text-muted">ยอดรวมทั้งหมด:</small>
            <h4 class="text-cyan fw-bold mb-0">฿${Number(order.total_amount).toLocaleString('th-TH')}</h4>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function loadAdminProducts() {
  fetch('/api/products')
    .then(res => res.json())
    .then(res => {
      if (!res.success) return;
      const tbody = document.getElementById('adminProductsTableBody');
      tbody.innerHTML = res.data.map(p => `
        <tr>
          <td>
            <img src="${escapeHtml(p.image_url)}" class="rounded" width="50" height="50" style="object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'">
          </td>
          <td>
            <div class="fw-bold text-white">${escapeHtml(p.name)}</div>
            <small class="text-muted">${escapeHtml(p.specifications || '')}</small>
          </td>
          <td><span class="badge bg-secondary">${escapeHtml(p.category)}</span></td>
          <td class="text-cyan fw-bold">฿${Number(p.price).toLocaleString('th-TH')}</td>
          <td>
            <span class="badge ${p.stock > 5 ? 'bg-success' : (p.stock > 0 ? 'bg-warning' : 'bg-danger')}">
              ${p.stock} ชิ้น
            </span>
          </td>
          <td>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-info" onclick="openEditProductModal(${p.id})">
                <i class="bi bi-pencil-square"></i> แก้ไข
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id})">
                <i class="bi bi-trash"></i> ลบ
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    });
}

function openAddProductModal() {
  document.getElementById('productManageForm').reset();
  document.getElementById('manageProductId').value = '';
  document.getElementById('productFormTitle').innerHTML = '<i class="bi bi-plus-circle text-cyan me-2"></i>เพิ่มสินค้าใหม่';
  const modal = new bootstrap.Modal(document.getElementById('productFormModal'));
  modal.show();
}

function openEditProductModal(id) {
  fetch(`/api/products/${id}`)
    .then(res => res.json())
    .then(res => {
      if (!res.success) return;
      const p = res.data;
      document.getElementById('manageProductId').value = p.id;
      document.getElementById('manageProductName').value = p.name;
      document.getElementById('manageProductCategory').value = p.category;
      document.getElementById('manageProductPrice').value = p.price;
      document.getElementById('manageProductStock').value = p.stock;
      document.getElementById('manageProductImage').value = p.image_url;
      document.getElementById('manageProductDesc').value = p.description || '';
      document.getElementById('manageProductSpecs').value = p.specifications || '';

      document.getElementById('productFormTitle').innerHTML = `<i class="bi bi-pencil-square text-cyan me-2"></i>แก้ไขสินค้า: #${p.id}`;
      const modal = new bootstrap.Modal(document.getElementById('productFormModal'));
      modal.show();
    });
}

function handleProductFormSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('manageProductId').value;
  const payload = {
    name: document.getElementById('manageProductName').value,
    category: document.getElementById('manageProductCategory').value,
    price: parseFloat(document.getElementById('manageProductPrice').value),
    stock: parseInt(document.getElementById('manageProductStock').value),
    image_url: document.getElementById('manageProductImage').value,
    description: document.getElementById('manageProductDesc').value,
    specifications: document.getElementById('manageProductSpecs').value
  };

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/products/${id}` : '/api/products';

  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      toast.fire({ icon: 'error', title: data.message });
      return;
    }

    bootstrap.Modal.getInstance(document.getElementById('productFormModal')).hide();
    toast.fire({ icon: 'success', title: data.message });
    loadAdminProducts();
    loadProducts();
  })
  .catch(() => {
    toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสินค้า' });
  });
}

function deleteProduct(id) {
  const p = state.products.find(item => item.id === id);
  const name = p ? p.name : `ID #${id}`;
  Swal.fire({
    title: 'ยืนยันการลบสินค้า?',
    text: `ต้องการลบรายการ "${name}" หรือไม่ การกระทำนี้ไม่สามารถย้อนกลับได้`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#3a506b',
    confirmButtonText: 'ลบรายการสินค้านี้',
    cancelButtonText: 'ยกเลิก'
  }).then(result => {
    if (result.isConfirmed) {
      fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${state.token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.fire({ icon: 'success', title: data.message });
          loadAdminProducts();
          loadProducts();
        } else {
          toast.fire({ icon: 'error', title: data.message });
        }
      });
    }
  });
}

function loadAdminOrders() {
  fetch('/api/orders', {
    headers: { 'Authorization': `Bearer ${state.token}` }
  })
  .then(res => res.json())
  .then(res => {
    if (!res.success) return;
    const tbody = document.getElementById('adminOrdersTableBody');
    tbody.innerHTML = res.data.map(order => `
      <tr>
        <td class="fw-bold text-white">#${order.id}</td>
        <td>
          <div class="fw-semibold text-white">${escapeHtml(order.customer_name)}</div>
          <small class="text-muted">${escapeHtml(order.customer_email)}</small>
        </td>
        <td>
          <small class="text-light d-block">${escapeHtml(order.customer_phone)}</small>
          <small class="text-muted">${escapeHtml(order.shipping_address)}</small>
        </td>
        <td class="text-cyan fw-bold">฿${Number(order.total_amount).toLocaleString('th-TH')}</td>
        <td><span class="status-badge ${order.status}">${formatStatusLabel(order.status)}</span></td>
        <td>
          <select class="form-select form-select-sm bg-dark text-white border-secondary" style="width: 140px;" onchange="updateOrderStatus(${order.id}, this.value)">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending (รอดำเนินการ)</option>
            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing (กำลังจัดเตรียม)</option>
            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped (จัดส่งแล้ว)</option>
            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed (สำเร็จ)</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled (ยกเลิก)</option>
          </select>
        </td>
      </tr>
    `).join('');
  });
}

function updateOrderStatus(orderId, newStatus) {
  fetch(`/api/orders/${orderId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    },
    body: JSON.stringify({ status: newStatus })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      toast.fire({ icon: 'success', title: data.message });
      loadAdminOrders();
    } else {
      toast.fire({ icon: 'error', title: data.message });
    }
  });
}

function loadAdminStats() {
  fetch('/api/admin/stats', {
    headers: { 'Authorization': `Bearer ${state.token}` }
  })
  .then(res => res.json())
  .then(res => {
    if (!res.success) return;
    const stats = res.data;
    document.getElementById('statRevenue').textContent = `฿${Number(stats.totalRevenue).toLocaleString('th-TH')}`;
    document.getElementById('statOrders').textContent = stats.totalOrders;
    document.getElementById('statProducts').textContent = stats.totalProducts;
    document.getElementById('statMembers').textContent = stats.totalMembers;
  });
}

function openLoginModal() {
  const modal = new bootstrap.Modal(document.getElementById('loginModal'));
  modal.show();
}

function openRegisterModal() {
  const modal = new bootstrap.Modal(document.getElementById('registerModal'));
  modal.show();
}

function switchToRegister() {
  bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
  openRegisterModal();
}

function switchToLogin() {
  bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
  openLoginModal();
}

function quickFillLogin(email, password) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = password;
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      if (data.isUnverified) {
        bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
        openVerifyModal(data.email, data.verificationCode, data.verificationLink);
        Swal.fire({
          icon: 'warning',
          title: 'ยังไม่ผ่านการยืนยันอีเมล',
          text: 'กรุณากดปุ่มยืนยันในอีเมลของคุณ หรือกรอกรหัส 6 หลักเพื่อเปิดใช้งานบัญชี'
        });
        return;
      }
      Swal.fire({ icon: 'error', title: 'เข้าสู่ระบบไม่สำเร็จ', text: data.message });
      return;
    }

    state.token = data.token;
    state.currentUser = data.user;
    localStorage.setItem('techzone_token', data.token);
    localStorage.setItem('techzone_user', JSON.stringify(data.user));

    bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
    updateAuthUI();

    toast.fire({ icon: 'success', title: `ยินดีต้อนรับคุณ ${data.user.username}!` });
  })
  .catch(() => {
    toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
  });
}

function handleRegisterSubmit(event) {
  event.preventDefault();
  const username = document.getElementById('regUsername').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;

  fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      Swal.fire({ icon: 'error', title: 'การสมัครสมาชิกล้มเหลว', text: data.message });
      return;
    }

    bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
    openVerifyModal(data.email, data.verificationCode, data.verificationLink, data.previewUrl);

    Swal.fire({
      icon: 'success',
      title: 'สมัครสมาชิกสำเร็จ!',
      html: `ระบบได้ส่งอีเมลยืนยันตัวตนไปยัง <strong>${escapeHtml(email)}</strong> แล้ว<br><small class="text-light">กรุณาเปิดกล่องจดหมายอีเมลของคุณและกดยืนยัน หรือคลิกปุ่มเปิดลิงก์ในหน้าต่างที่แสดงขึ้นมา</small>`,
      confirmButtonText: 'รับทราบ',
      confirmButtonColor: '#00d2ff'
    });
  })
  .catch(() => {
    toast.fire({ icon: 'error', title: 'ไม่สามารถส่งคำขอสมัครสมาชิกได้' });
  });
}

function openVerifyModal(email, code, verificationLink, previewUrl) {
  state.pendingVerifyEmail = email;
  state.pendingVerifyCode = code;

  document.getElementById('verifyTargetEmail').textContent = email;
  document.getElementById('simulatedCodeText').textContent = code || '123456';
  document.getElementById('verifyCodeInput').value = code || '';

  const linkBtn = document.getElementById('directVerifyEmailLink');
  if (linkBtn) {
    linkBtn.href = verificationLink || '#';
  }

  const modal = new bootstrap.Modal(document.getElementById('verifyEmailModal'));
  modal.show();
}

function autoFillVerificationCode() {
  document.getElementById('verifyCodeInput').value = state.pendingVerifyCode;
}

function handleVerifySubmit(event) {
  event.preventDefault();
  const code = document.getElementById('verifyCodeInput').value;

  fetch('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: state.pendingVerifyEmail, code: code })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      Swal.fire({ icon: 'error', title: 'รหัสยืนยันไม่ถูกต้อง', text: data.message });
      return;
    }

    state.token = data.token;
    state.currentUser = data.user;
    localStorage.setItem('techzone_token', data.token);
    localStorage.setItem('techzone_user', JSON.stringify(data.user));

    bootstrap.Modal.getInstance(document.getElementById('verifyEmailModal')).hide();
    updateAuthUI();

    Swal.fire({
      icon: 'success',
      title: 'ยืนยันตัวตนสำเร็จ!',
      text: 'ยินดีต้อนรับสู่ TechZone บัญชีสมาชิกของคุณพร้อมใช้งานแล้ว',
      confirmButtonColor: '#00d2ff'
    });
  })
  .catch(() => {
    toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการยืนยัน' });
  });
}

function resendVerificationCode() {
  fetch('/api/auth/resend-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: state.pendingVerifyEmail })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      state.pendingVerifyCode = data.verificationCode;
      document.getElementById('simulatedCodeText').textContent = data.verificationCode;
      const linkBtn = document.getElementById('directVerifyEmailLink');
      if (linkBtn && data.verificationLink) {
        linkBtn.href = data.verificationLink;
      }
      toast.fire({ icon: 'success', title: 'ส่งอีเมลยืนยันตัวตนใหม่แล้ว' });
    }
  });
}

function logoutUser(showNotification = true) {
  state.token = null;
  state.currentUser = null;
  localStorage.removeItem('techzone_token');
  localStorage.removeItem('techzone_user');

  updateAuthUI();
  navigateTo('home');

  if (showNotification) {
    toast.fire({ icon: 'info', title: 'ออกจากระบบเรียบร้อยแล้ว' });
  }
}

function formatStatusLabel(status) {
  const map = {
    'pending': 'รอดำเนินการ',
    'processing': 'กำลังจัดเตรียมสินค้า',
    'shipped': 'ส่งมอบให้บริษัทขนส่งแล้ว',
    'completed': 'จัดส่งสำเร็จเรียบร้อย',
    'cancelled': 'ยกเลิกคำสั่งซื้อ'
  };
  return map[status] || status;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
