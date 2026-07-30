import { CONFIG, isDevelopment, isQuickLoginEnabled, isResetDataEnabled } from './src/config.js';
import { getStorageProvider } from './src/storage/index.js';
import { AuthenticationService } from './src/services/AuthenticationService.js';
import { CustomerService } from './src/services/CustomerService.js';
import { EmployeeService } from './src/services/EmployeeService.js';
import { AdminService } from './src/services/AdminService.js';
import { Logger } from './src/utils/Logger.js';
import { getDefaultState } from './src/dev-data.js';

const storage = getStorageProvider();
const customerService = new CustomerService();
const employeeService = new EmployeeService();
const adminService = new AdminService();

let STATE = {};

async function loadState() {
  let state = await storage.getJSON(CONFIG.STORAGE_KEYS.ERP_STATE);
  if (!state) {
    state = getDefaultState();
    await storage.setJSON(CONFIG.STORAGE_KEYS.ERP_STATE, state);
  }
  STATE = state;
  await syncStateCalculations();
  return STATE;
}

async function saveState() {
  await syncStateCalculations();
  await storage.setJSON(CONFIG.STORAGE_KEYS.ERP_STATE, STATE);
}

async function syncStateCalculations() {
  if (!STATE.sales || !STATE.payments || !STATE.customers) return;
  STATE.sales.forEach(sale => {
    const totalPaid = (STATE.payments || [])
      .filter(p => p.invoiceId === sale.invoiceId)
      .reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, sale.amount - totalPaid);
    if (balance <= 0) sale.status = 'Paid';
    else if (totalPaid > 0) sale.status = 'Partial';
    else sale.status = 'Pending';
  });
  STATE.customers.forEach(cust => {
    const custSales = (STATE.sales || []).filter(sale => sale.customerName === cust.company);
    let due = 0;
    custSales.forEach(sale => {
      const totalPaid = (STATE.payments || [])
        .filter(p => p.invoiceId === sale.invoiceId)
        .reduce((sum, p) => sum + p.amount, 0);
      due += Math.max(0, sale.amount - totalPaid);
    });
    cust.outstanding = due;
  });
}

async function logSystemActivity(message) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  STATE.logs.unshift({ time, message });
  if (STATE.logs.length > CONFIG.MAX_LOG_ENTRIES) STATE.logs.pop();
  await saveState();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadState();
    initWebsiteLayout();
    initCounters();
    initEnquiryForm();
    await initPortalLogin();
    await checkLoginState();
    runIntroAnimations();
  } catch (e) {
    Logger.error('App initialization failed', e);
  }
});

function runIntroAnimations() {
  if (typeof gsap === 'undefined') return;
  gsap.from('.hero-badge', { opacity: 0, y: -20, duration: 0.8, ease: 'power2.out' });
  gsap.from('.hero-title', { opacity: 0, y: 30, duration: 1, delay: 0.2, ease: 'power3.out' });
  gsap.from('.hero-desc', { opacity: 0, y: 20, duration: 1, delay: 0.4, ease: 'power2.out' });
  gsap.from('.hero-actions', { opacity: 0, y: 15, duration: 0.8, delay: 0.6, ease: 'power2.out' });
  gsap.from('.hero-feat-card', { opacity: 0, x: 50, stagger: 0.15, duration: 0.8, delay: 0.5, ease: 'power2.out' });
  gsap.registerPlugin(ScrollTrigger);
  gsap.from('.about-text-wrap', { scrollTrigger: { trigger: '.about-section', start: 'top 80%' }, opacity: 0, x: -50, duration: 1, ease: 'power2.out' });
  gsap.from('.about-visual-wrap', { scrollTrigger: { trigger: '.about-section', start: 'top 80%' }, opacity: 0, x: 50, duration: 1, ease: 'power2.out' });
  gsap.from('.product-card', { scrollTrigger: { trigger: '.products-section', start: 'top 75%' }, opacity: 0, y: 50, stagger: 0.15, duration: 1, ease: 'power2.out' });
  gsap.from('.process-step', { scrollTrigger: { trigger: '.process-section', start: 'top 75%' }, opacity: 0, y: 30, stagger: 0.1, duration: 0.8, ease: 'power2.out' });
  gsap.from('.industry-card', { scrollTrigger: { trigger: '.industries-section', start: 'top 80%' }, opacity: 0, y: 40, stagger: 0.1, duration: 0.8, ease: 'power2.out' });
}

function initWebsiteLayout() {
  const header = document.querySelector('.main-header');
  const toggle = document.querySelector('.mobile-nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav-overlay');
  const mobileLinks = document.querySelectorAll('.mobile-link');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
    highlightNavOnScroll();
  });
  toggle?.addEventListener('click', () => {
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
    if (window.scrollY >= sec.offsetTop - 150) currentSec = sec.getAttribute('id') || currentSec;
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${currentSec}`);
  });
}

function initCounters() {
  const statsSection = document.querySelector('.about-section');
  const counters = document.querySelectorAll('.stat-number');
  let animated = false;
  const countUp = () => {
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'), 10);
      const updateCount = () => {
        const count = parseInt(counter.innerText, 10) || 0;
        if (count < target) {
          counter.innerText = Math.ceil(count + target / 60);
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
      if (entry.isIntersecting && !animated) { countUp(); animated = true; }
    });
  }, { threshold: 0.3 });
  if (statsSection) observer.observe(statsSection);
}

function initEnquiryForm() {
  const form = document.getElementById('enquiry-form');
  const successAlert = document.getElementById('enquiry-success');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const name = document.getElementById('contact-name').value;
      const email = document.getElementById('contact-email').value;
      const phone = document.getElementById('contact-phone').value;
      const company = document.getElementById('contact-company').value;
      const productVal = document.getElementById('contact-product').value;
      const message = document.getElementById('contact-message').value;
      await loadState();
      await customerService.create({ name, company, phone, email, address: 'Lead via Web Form' });
      await logSystemActivity(`Lead created: ${company} (${name}) submitted website enquiry.`);
      form.reset();
      successAlert.style.display = 'block';
      if (typeof gsap !== 'undefined') gsap.fromTo(successAlert, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
      setTimeout(() => {
        if (typeof gsap !== 'undefined') gsap.to(successAlert, { opacity: 0, y: -10, duration: 0.4, onComplete: () => { successAlert.style.display = 'none'; } });
      }, 6000);
    } catch (err) {
      Logger.error('Enquiry form submission failed', err);
      alert('Failed to submit enquiry. Please try again.');
    }
  });
}

async function initPortalLogin() {
  const portal = document.getElementById('erp-portal');
  const openBtn = document.getElementById('open-portal-btn');
  const openMobileBtn = document.getElementById('open-portal-mobile-btn');
  const openFooterBtn = document.getElementById('open-portal-footer-btn');
  const closeBtn = document.getElementById('close-portal-btn');
  const loginForm = document.getElementById('portal-login-form');
  const logoutBtn = document.getElementById('admin-logout-btn');
  const configureButtons = document.querySelectorAll('.configure-product-btn');

  const openErpPage = (url) => { window.location.href = url || 'erp.html?module=dashboard'; };
  const openPortal = () => {
    if (AuthenticationService.isLoggedIn) {
      openErpPage('erp.html?module=dashboard');
      return;
    }
    portal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (typeof gsap !== 'undefined') gsap.fromTo(portal, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  };
  const closePortal = () => {
    if (typeof gsap !== 'undefined') gsap.to(portal, { opacity: 0, duration: 0.3, onComplete: () => {
      portal.style.display = 'none';
      document.body.style.overflow = '';
    }});
  };
  [openBtn, openMobileBtn, openFooterBtn].forEach(btn => btn?.addEventListener('click', openPortal));
  closeBtn?.addEventListener('click', closePortal);

  configureButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const prodCode = btn.getAttribute('data-product');
      if (AuthenticationService.isLoggedIn) {
        openErpPage(`erp.html?module=quotations&product=${prodCode}`);
      } else {
        openPortal();
        storage.set(CONFIG.STORAGE_KEYS.REDIRECT_AFTER_LOGIN, `erp.html?module=quotations&product=${prodCode}`);
      }
    });
  });

  const roleSelector = document.getElementById('role-selector');
  if (roleSelector && isQuickLoginEnabled()) {
    roleSelector.style.display = 'grid';
    roleSelector.addEventListener('click', async (e) => {
      const roleCard = e.target.closest('.role-card');
      if (!roleCard) return;
      const role = roleCard.getAttribute('data-role');
      try {
        await AuthenticationService.loginByRole(role);
        await persistSession();
        await logSystemActivity((AuthenticationService.userName || role) + ' quick-login.');
        await checkLoginState();
        const redirectTarget = await storage.get(CONFIG.STORAGE_KEYS.REDIRECT_AFTER_LOGIN);
        if (redirectTarget) { await storage.remove(CONFIG.STORAGE_KEYS.REDIRECT_AFTER_LOGIN); openErpPage(redirectTarget); }
        else { openErpPage(); }
      } catch (err) {
        Logger.warn('Quick login fallback', err);
        await fallbackQuickLogin(role, openErpPage);
      }
    });
  } else if (roleSelector) {
    roleSelector.style.display = 'none';
  }

  const devQuickLoginSection = document.querySelector('.role-selector')?.closest('div');
  if (devQuickLoginSection && !isQuickLoginEnabled()) {
    devQuickLoginSection.style.display = 'none';
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();
      if (!email || !password) { alert('Please enter your email and password.'); return; }
      try {
        await AuthenticationService.login(email, password);
        await persistSession();
        await logSystemActivity(`${AuthenticationService.userName} (${AuthenticationService.userRole}) signed in.`);
        await checkLoginState();
        const redirectTarget = await storage.get(CONFIG.STORAGE_KEYS.REDIRECT_AFTER_LOGIN);
        if (redirectTarget) { await storage.remove(CONFIG.STORAGE_KEYS.REDIRECT_AFTER_LOGIN); openErpPage(redirectTarget); }
        else { openErpPage(); }
      } catch (err) {
        Logger.error('Login failed', err);
        alert(err.message || 'Invalid credentials or account is disabled.');
      }
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      AuthenticationService.logout();
      await checkLoginState();
      alert('Logged out from Admin Portal.');
    });
  }
}

async function fallbackQuickLogin(role, openErpPage) {
  await storage.set('NEXFRA_AUTH_TOKEN', 'true');
  await storage.set('NEXFRA_USER_ROLE', role);
  await storage.set('NEXFRA_USER_NAME', role.charAt(0).toUpperCase() + role.slice(1));
  await checkLoginState();
  const redirectTarget = await storage.get(CONFIG.STORAGE_KEYS.REDIRECT_AFTER_LOGIN);
  if (redirectTarget) { await storage.remove(CONFIG.STORAGE_KEYS.REDIRECT_AFTER_LOGIN); openErpPage(redirectTarget); }
  else { openErpPage(); }
}

async function persistSession() {
  await storage.set('NEXFRA_AUTH_TOKEN', 'true');
  await storage.set('NEXFRA_USER_ROLE', AuthenticationService.userRole);
  await storage.set('NEXFRA_USER_NAME', AuthenticationService.userName);
  await AuthenticationService.persistSession();
}

async function checkLoginState() {
  const adminBar = document.getElementById('admin-top-bar');
  const loginBtns = [
    document.getElementById('open-portal-btn'),
    document.getElementById('open-portal-mobile-btn'),
    document.getElementById('open-portal-footer-btn')
  ];
  const token = await storage.get(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  const isLoggedIn = token === 'true' || AuthenticationService.isLoggedIn;
  if (isLoggedIn) {
    document.body.classList.add('admin-logged-in');
    if (adminBar) adminBar.style.display = 'flex';
    loginBtns.forEach(btn => {
      if (btn) btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> Admin Portal`;
    });
  } else {
    document.body.classList.remove('admin-logged-in');
    if (adminBar) adminBar.style.display = 'none';
    loginBtns.forEach(btn => {
      if (btn) btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg> Employee Login`;
    });
  }
}
