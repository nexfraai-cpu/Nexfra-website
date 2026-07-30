/* ==========================================
   Nexfra Landing Page Core Logic
   ========================================== */

// ------------------------------------------
// 1. DATA STATE (SHARED VIA LOCAL STORAGE)
// ------------------------------------------

const DEFAULT_STATE = {
  activeRole: 'Admin',
  customers: [
    { id: 'CUST-001', name: 'Tata Logistics Pvt Ltd', company: 'Tata Logistics', gst: '33AAACT8281M1Z5', phone: '+91 98400 12345', email: 'operations@tatalogistics.com', address: 'Plot 12, Port Road, Tuticorin, TN', vehicles: ['TN-69-AA-1234', 'TN-69-AA-5678'], outstanding: 1200000 },
    { id: 'CUST-002', name: 'Gati Mining & Minerals', company: 'Gati Minerals', gst: '27AAACG1928A2Z0', phone: '+91 99100 98765', email: 'mehta@gatimining.com', address: 'Mine Block C, Korba, Chhattisgarh', vehicles: ['CG-12-BB-9922'], outstanding: 650000 },
    { id: 'CUST-003', name: 'V-Trans Cargo India', company: 'V-Trans', gst: '24AAACV1029P3Z1', phone: '+91 98220 54321', email: 'sandeep@vtrans.com', address: 'Sarkhej Highway, Ahmedabad, Gujarat', vehicles: [], outstanding: 0 },
    { id: 'CUST-004', name: 'Golden Roadlines', company: 'Golden Roadlines', gst: '09AAACG8811K1Z2', phone: '+91 97110 22334', email: 'rajesh@goldenroadlines.com', address: 'Sanjay Gandhi Transport Nagar, Delhi', vehicles: ['DL-1G-1020', 'DL-1G-3344'], outstanding: 0 }
  ],
  products: {
    flatbed: {
      name: 'Flat Bed Trailer',
      basePrice: 850000,
      templates: ['32 Feet Flatbed', '40 Feet Flatbed'],
      specs: [
        { id: 'length', name: 'Length', default: '40 Feet', options: [
          { name: '32 Feet', priceDiff: -50000 },
          { name: '40 Feet', priceDiff: 0 }
        ]},
        { id: 'floor', name: 'Floor Thickness / Type', default: '4mm Chequered MS', options: [
          { name: '4mm Chequered MS', priceDiff: 0 },
          { name: '6mm Chequered MS', priceDiff: 15000 },
          { name: '8mm Chequered MS', priceDiff: 32000 }
        ]},
        { id: 'axles', name: 'Axles Configuration', default: '3 x 13T York Axles', options: [
          { name: '2 x 13T York Axles', priceDiff: -100000 },
          { name: '3 x 13T York Axles', priceDiff: 0 },
          { name: '3 x 16T Fuwa Heavy Axles', priceDiff: 45000 }
        ]},
        { id: 'suspension', name: 'Suspension System', default: 'Heavy Duty Mechanical', options: [
          { name: 'Heavy Duty Mechanical', priceDiff: 0 },
          { name: 'Air Suspension (Front Lift Axle)', priceDiff: 120000 }
        ]}
      ]
    },
    tiptrailer: {
      name: 'Tip Trailer',
      basePrice: 1420000,
      templates: ['32 CBM Tip Trailer', '36 CBM Tip Trailer', '40 CBM Tip Trailer'],
      specs: [
        { id: 'capacity', name: 'Volumetric Capacity', default: '32 CBM', options: [
          { name: '32 CBM', priceDiff: 0 },
          { name: '36 CBM', priceDiff: 60000 },
          { name: '40 CBM', priceDiff: 110000 }
        ]},
        { id: 'cylinder', name: 'Hydraulic Cylinder', default: 'Hyva 191 Cylinder', options: [
          { name: 'Hyva 191 Cylinder', priceDiff: 0 },
          { name: 'Hyva 202 Heavy Duty', priceDiff: 85000 }
        ]},
        { id: 'steel', name: 'Structure / Plate Grade', default: 'ST52 Steel', options: [
          { name: 'ST52 High Tensile Steel', priceDiff: 0 },
          { name: 'Hardox 450 Wear Plates', priceDiff: 180000 }
        ]},
        { id: 'suspension', name: 'Suspension System', default: 'Mechanical Leaf Spring', options: [
          { name: 'Mechanical Leaf Spring', priceDiff: 0 },
          { name: 'Air Suspension with Lift Axle', priceDiff: 120000 }
        ]}
      ]
    },
    boxbody: {
      name: 'Box Body Tipper',
      basePrice: 780000,
      templates: ['16 CBM Box Body', '23 CBM Box Body', '25 CBM Box Body'],
      specs: [
        { id: 'capacity', name: 'Volumetric Capacity', default: '16 CBM', options: [
          { name: '14 CBM', priceDiff: -25000 },
          { name: '16 CBM', priceDiff: 0 },
          { name: '23 CBM', priceDiff: 80000 },
          { name: '25 CBM', priceDiff: 115000 }
        ]},
        { id: 'floor', name: 'Floor Plate Thickness', default: '8 mm MS', options: [
          { name: '6 mm MS', priceDiff: -15000 },
          { name: '8 mm MS', priceDiff: 0 },
          { name: '10 mm MS', priceDiff: 30000 }
        ]},
        { id: 'side', name: 'Side Wall Plate Thickness', default: '6 mm MS', options: [
          { name: '4 mm MS', priceDiff: -10000 },
          { name: '6 mm MS', priceDiff: 0 },
          { name: '8 mm MS', priceDiff: 22000 }
        ]},
        { id: 'pump', name: 'Tipping Pump/PTO Type', default: 'Standard Air Controlled', options: [
          { name: 'Standard Air Controlled', priceDiff: 0 },
          { name: 'Heavy Duty Gear Pump', priceDiff: 25000 }
        ]}
      ]
    },
    rockbody: {
      name: 'Rock Body Tipper',
      basePrice: 1150000,
      templates: ['14 CBM Rock Body', '16 CBM Rock Body', '18 CBM Rock Body'],
      specs: [
        { id: 'capacity', name: 'Volumetric Capacity', default: '14 CBM', options: [
          { name: '14 CBM', priceDiff: 0 },
          { name: '16 CBM', priceDiff: 45000 },
          { name: '18 CBM', priceDiff: 90000 }
        ]},
        { id: 'steel', name: 'Hardox Grade Structure', default: 'Hardox 450', options: [
          { name: 'Hardox 450 Plate', priceDiff: 0 },
          { name: 'Hardox 500 Extreme Grade', priceDiff: 120000 }
        ]},
        { id: 'floor', name: 'Floor Plate Thickness', default: '10 mm', options: [
          { name: '10 mm Heavy Plate', priceDiff: 0 },
          { name: '12 mm Heavy Plate', priceDiff: 40000 },
          { name: '14 mm Severe Duty', priceDiff: 75000 }
        ]},
        { id: 'breakers', name: 'Integrated Rock Breakers', default: 'Standard Grated', options: [
          { name: 'Standard Grated', priceDiff: 0 },
          { name: 'Heavy-Duty Ribbed Breakers', priceDiff: 35000 }
        ]}
      ]
    }
  },
  quotations: [],
  quotationCounter: 0,
  workOrders: [],
  productionItems: [],
  sales: [],
  payments: [],
  logs: [
    { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), message: 'Nexfra ERP Production System initialized.' }
  ],
  adminPricing: {
    floor6: -15000,
    floor10: 30000,
    steelHardox: 150000,
    axle2: -100000,
    axle3_16: 80000
  },
  employees: [
    {
      id: 'EMP-000001',
      fullName: 'Administrator',
      email: 'admin@nexframfg.com',
      phone: '+91 98765 43210',
      employeeCode: 'ADM-001',
      role: 'admin',
      status: 'Active',
      password: 'admin123',
      isDeleted: false,
      createdDate: new Date().toISOString().split('T')[0],
      lastLogin: null
    }
  ],
  employeeCounter: 1
};

function syncStateCalculations(s) {
  if (!s || !s.sales || !s.payments || !s.customers) return;

  s.sales.forEach(sale => {
    const totalPaid = s.payments
      .filter(p => p.invoiceId === sale.invoiceId)
      .reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, sale.amount - totalPaid);
    
    if (balance <= 0) {
      sale.status = 'Paid';
    } else if (totalPaid > 0) {
      sale.status = 'Partial';
    } else {
      sale.status = 'Pending';
    }
  });

  s.customers.forEach(cust => {
    const custSales = s.sales.filter(sale => sale.customerName === cust.company);
    let due = 0;
    custSales.forEach(sale => {
      const totalPaid = s.payments
        .filter(p => p.invoiceId === sale.invoiceId)
        .reduce((sum, p) => sum + p.amount, 0);
      due += Math.max(0, sale.amount - totalPaid);
    });
    cust.outstanding = due;
  });
}

function loadState() {
  const saved = localStorage.getItem('NEXFRA_ERP_STATE');
  let st = DEFAULT_STATE;
  if (saved) {
    try {
      st = JSON.parse(saved);
          if (!st.quotations) st.quotations = [];
      if (!st.workOrders) st.workOrders = [];
      if (!st.productionItems) st.productionItems = [];
      if (!st.sales) st.sales = [];
      if (!st.payments) st.payments = [];
      if (!st.employees) st.employees = DEFAULT_STATE.employees.map(e => Object.assign({}, e));
      if (!st.employeeCounter) st.employeeCounter = DEFAULT_STATE.employeeCounter;
    } catch(e) {
      console.error("Failed to parse state, using defaults.", e);
    }
  }
  syncStateCalculations(st);
  localStorage.setItem('NEXFRA_ERP_STATE', JSON.stringify(st));
  return st;
}

let STATE = loadState();

function saveState() {
  syncStateCalculations(STATE);
  localStorage.setItem('NEXFRA_ERP_STATE', JSON.stringify(STATE));
}

function logSystemActivity(message) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  STATE.logs.unshift({ time, message });
  if (STATE.logs.length > 8) STATE.logs.pop();
  saveState();
}

// ------------------------------------------
// 2. PAGE EVENT BINDINGS
// ------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  initWebsiteLayout();
  initCounters();
  initEnquiryForm();
  initPortalLogin();
  checkLoginState();
  runIntroAnimations();
});

// Entrance Animations (GSAP)
function runIntroAnimations() {
  if (typeof gsap !== 'undefined') {
    gsap.from('.hero-badge', { opacity: 0, y: -20, duration: 0.8, ease: 'power2.out' });
    gsap.from('.hero-title', { opacity: 0, y: 30, duration: 1, delay: 0.2, ease: 'power3.out' });
    gsap.from('.hero-desc', { opacity: 0, y: 20, duration: 1, delay: 0.4, ease: 'power2.out' });
    gsap.from('.hero-actions', { opacity: 0, y: 15, duration: 0.8, delay: 0.6, ease: 'power2.out' });
    gsap.from('.hero-feat-card', { 
      opacity: 0, 
      x: 50, 
      stagger: 0.15, 
      duration: 0.8, 
      delay: 0.5, 
      ease: 'power2.out' 
    });
    
    gsap.registerPlugin(ScrollTrigger);
    
    gsap.from('.about-text-wrap', {
      scrollTrigger: { trigger: '.about-section', start: 'top 80%' },
      opacity: 0, x: -50, duration: 1, ease: 'power2.out'
    });
    gsap.from('.about-visual-wrap', {
      scrollTrigger: { trigger: '.about-section', start: 'top 80%' },
      opacity: 0, x: 50, duration: 1, ease: 'power2.out'
    });
    
    gsap.from('.product-card', {
      scrollTrigger: { trigger: '.products-section', start: 'top 75%' },
      opacity: 0, y: 50, stagger: 0.15, duration: 1, ease: 'power2.out'
    });
    
    gsap.from('.process-step', {
      scrollTrigger: { trigger: '.process-section', start: 'top 75%' },
      opacity: 0, y: 30, stagger: 0.1, duration: 0.8, ease: 'power2.out'
    });
    
    gsap.from('.industry-card', {
      scrollTrigger: { trigger: '.industries-section', start: 'top 80%' },
      opacity: 0, y: 40, stagger: 0.1, duration: 0.8, ease: 'power2.out'
    });
  }
}

// Scrolled sticky navigation states
function initWebsiteLayout() {
  const header = document.querySelector('.main-header');
  const toggle = document.querySelector('.mobile-nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav-overlay');
  const mobileLinks = document.querySelectorAll('.mobile-link');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    highlightNavOnScroll();
  });

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    mobileNav.classList.toggle('open');
    document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

function highlightNavOnScroll() {
  const sections = document.querySelectorAll('section, main');
  const navLinks = document.querySelectorAll('.nav-link');
  
  let currentSec = 'home';
  sections.forEach(sec => {
    const secTop = sec.offsetTop - 150;
    if (window.scrollY >= secTop) {
      currentSec = sec.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${currentSec}`) {
      link.classList.add('active');
    }
  });
}

// Numbers Count-up observer
function initCounters() {
  const statsSection = document.querySelector('.about-section');
  const counters = document.querySelectorAll('.stat-number');
  let animated = false;

  const countUp = () => {
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'), 10);
      const updateCount = () => {
        const count = parseInt(counter.innerText, 10) || 0;
        const speed = target / 60;
        
        if (count < target) {
          counter.innerText = Math.ceil(count + speed);
          setTimeout(updateCount, 15);
        } else {
          counter.innerText = target;
        }
      };
      updateCount();
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        countUp();
        animated = true;
      }
    });
  }, { threshold: 0.3 });

  if (statsSection) observer.observe(statsSection);
}

// Submit website lead triggers
function initEnquiryForm() {
  const form = document.getElementById('enquiry-form');
  const successAlert = document.getElementById('enquiry-success');
  
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('contact-name').value;
      const email = document.getElementById('contact-email').value;
      const phone = document.getElementById('contact-phone').value;
      const company = document.getElementById('contact-company').value;
      const productVal = document.getElementById('contact-product').value;
      const message = document.getElementById('contact-message').value;

      STATE = loadState();

      const newCustId = `CUST-00${STATE.customers.length + 1}`;
      STATE.customers.push({
        id: newCustId,
        name: name,
        company: company,
        gst: 'Pending Registration',
        phone: phone,
        email: email,
        address: 'Lead via Web Form',
        vehicles: [],
        outstanding: 0
      });

      logSystemActivity(`Lead created: ${company} (${name}) submitted website enquiry.`);
      saveState();

      form.reset();
      successAlert.style.display = 'block';
      gsap.fromTo(successAlert, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
      
      setTimeout(() => {
        gsap.to(successAlert, { opacity: 0, y: -10, duration: 0.4, onComplete: () => {
          successAlert.style.display = 'none';
        }});
      }, 6000);
    });
  }
}

// ------------------------------------------
// 3. ADMIN PORTAL LOGIN LOGIC
// ------------------------------------------

function initPortalLogin() {
  const portal = document.getElementById('erp-portal');
  const openBtn = document.getElementById('open-portal-btn');
  const openMobileBtn = document.getElementById('open-portal-mobile-btn');
  const openFooterBtn = document.getElementById('open-portal-footer-btn');
  const closeBtn = document.getElementById('close-portal-btn');
  const loginForm = document.getElementById('portal-login-form');
  const logoutBtn = document.getElementById('admin-logout-btn');
  const configureButtons = document.querySelectorAll('.configure-product-btn');

  const openPortal = () => {
    if (localStorage.getItem('adminLoggedIn') === 'true') {
      window.location.href = 'erp.html?module=dashboard';
      return;
    }

    portal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    gsap.fromTo(portal, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  };

  const openErpPage = (url) => {
    window.location.href = url || 'erp.html?module=dashboard';
  };

  const closePortal = () => {
    gsap.to(portal, { opacity: 0, duration: 0.3, onComplete: () => {
      portal.style.display = 'none';
      document.body.style.overflow = '';
    }});
  };

  [openBtn, openMobileBtn, openFooterBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        openPortal();
      });
    }
  });

  closeBtn && closeBtn.addEventListener('click', closePortal);

  // Configure & Quote button handlers
  configureButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prodCode = e.currentTarget.getAttribute('data-product');
      if (localStorage.getItem('adminLoggedIn') === 'true') {
        openErpPage(`erp.html?module=quotations&product=${prodCode}`);
      } else {
        openPortal();
        // Save targeted configuration to auto-redirect after successful login
        localStorage.setItem('redirectAfterLogin', `erp.html?module=quotations&product=${prodCode}`);
      }
    });
  });

  // Dev quick-login role selector
  const roleSelector = document.getElementById('role-selector');
  if (roleSelector) {
    roleSelector.addEventListener('click', (e) => {
      const roleCard = e.target.closest('.role-card');
      if (!roleCard) return;
      const role = roleCard.getAttribute('data-role');
      const st = loadState();
      const emp = (st.employees || []).find(e => e.role === role && !e.isDeleted && e.status === 'Active');
      if (emp) {
        emp.lastLogin = new Date().toISOString();
        saveState();
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('erpUserRole', emp.role);
        localStorage.setItem('erpUserName', emp.fullName);
        logSystemActivity(emp.fullName + ' (' + emp.role + ') quick-login.');
      } else {
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('erpUserRole', role);
        localStorage.setItem('erpUserName', role.charAt(0).toUpperCase() + role.slice(1));
      }
      checkLoginState();
      const redirectTarget = localStorage.getItem('redirectAfterLogin');
      if (redirectTarget) {
        localStorage.removeItem('redirectAfterLogin');
        openErpPage(redirectTarget);
      } else {
        openErpPage();
      }
    });
  }

  // Employee login form submit
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();
      if (!email || !password) {
        alert('Please enter your email and password.');
        return;
      }
      const st = loadState();
      const emp = (st.employees || []).find(e =>
        e.email === email && e.password === password && !e.isDeleted && e.status === 'Active'
      );
      if (emp) {
        emp.lastLogin = new Date().toISOString();
        saveState();
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('erpUserRole', emp.role);
        localStorage.setItem('erpUserName', emp.fullName);
        logSystemActivity(emp.fullName + ' (' + emp.role + ') signed in.');
        checkLoginState();
        const redirectTarget = localStorage.getItem('redirectAfterLogin');
        if (redirectTarget) {
          localStorage.removeItem('redirectAfterLogin');
          openErpPage(redirectTarget);
        } else {
          openErpPage();
        }
      } else {
        alert('Invalid credentials or account is disabled.');
      }
    });
  }

  // Admin logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('adminLoggedIn');
      localStorage.removeItem('erpUserRole');
      localStorage.removeItem('erpUserName');
      logSystemActivity('Admin logged out.');
      checkLoginState();
      alert('Logged out from Admin Portal.');
    });
  }
}

// Inspect if admin is logged in to render top-bar dashboard tools
function checkLoginState() {
  const adminBar = document.getElementById('admin-top-bar');
  const loginBtns = [
    document.getElementById('open-portal-btn'),
    document.getElementById('open-portal-mobile-btn'),
    document.getElementById('open-portal-footer-btn')
  ];

  if (localStorage.getItem('adminLoggedIn') === 'true') {
    document.body.classList.add('admin-logged-in');
    if (adminBar) adminBar.style.display = 'flex';
    
    // Customize button labels to point directly to active control hub
    loginBtns.forEach(btn => {
      if (btn) {
        btn.innerHTML = `
          <svg class="icon" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          Admin Portal
        `;
      }
    });
  } else {
    document.body.classList.remove('admin-logged-in');
    if (adminBar) adminBar.style.display = 'none';
    
    loginBtns.forEach(btn => {
      if (btn) {
        btn.innerHTML = `
          <svg class="icon" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
          Employee Login
        `;
      }
    });
  }
}
