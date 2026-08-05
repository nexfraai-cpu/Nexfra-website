/* ==========================================
   Nexfra ERP Control Panel Core Script
   ========================================== */

import {
  CONFIG,
  isQuickLoginEnabled,
  isResetDataEnabled,
} from "./src/config.js";
import { getStorageProvider } from "./src/storage/index.js";
import { apiClient } from "./src/api/client.js";
import { sessionStore } from "./src/api/session.js";
import { AuthenticationService } from "./src/services/AuthenticationService.js";
import { EmployeeService } from "./src/services/EmployeeService.js";
import { CustomerService } from "./src/services/CustomerService.js";
import { QuotationService } from "./src/services/QuotationService.js";
import { WorkOrderService } from "./src/services/WorkOrderService.js";
import { ProductionService } from "./src/services/ProductionService.js";
import { FinanceService } from "./src/services/FinanceService.js";
import { AdminService } from "./src/services/AdminService.js";
import { Logger } from "./src/utils/Logger.js";

const storage = getStorageProvider();
const employeeService = new EmployeeService();
const customerService = new CustomerService();
const quotationService = new QuotationService();
const workOrderService = new WorkOrderService();
const productionService = new ProductionService();
const financeService = new FinanceService();
const adminService = new AdminService();

let _sessionRole = "admin";
let _sessionUser = "Admin";
let _sessionEmployeeId = null;

// Becomes true only after startup auth + ALL data hydration + initial render
// have finished. The loader owns the lifecycle: nothing reveals the app until
// this flag is set.
let _startupComplete = false;

window.sanitizeDisplayId = function (val, fallbackLabel = "") {
  if (!val) return fallbackLabel || "—";
  const str = String(val);
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    console.warn(
      `[DEFENSIVE WARNING] Internal UUID '${str}' was blocked from rendering in user-facing UI component.`,
    );
    return fallbackLabel || "—";
  }
  return str;
};

window.resolveQuotationDisplayNumber = function (source, fallbackSources = []) {
  const candidates = [
    source && source.quotationNumber,
    source && source.quotation_number,
    source && source.quoteNumber,
    ...fallbackSources,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const displayId = sanitizeDisplayId(candidate, "");
    if (displayId) return displayId;
  }
  const context =
    source &&
    (source.id || source.quoteId || source.quotationId || source._backendId);
  console.warn(
    "[Quotation Number Missing] quotation_number was not available for UI display.",
    { context, source },
  );
  return "Quotation number unavailable";
};

// In-memory state cache for synchronous loadState/saveState access
let _stateCache = {};

// Frontend-only configuration persisted separately from entity data.
const APP_CONFIG_KEY = "NEXFRA_ERP_APP_CONFIG";
const AUX_STATE_KEYS = [
  "logs",
  "customItemDefinitions",
  "productSpecOverrides",
  "metalPricePerKg",
  "progressionSchema",
  "dispatchFields",
  "quotationCounter",
  "employeeCounter",
];

// Signatures of the last-successfully-synced entity collections.
const _syncSignatures = {};

function _entitySig(value) {
  return JSON.stringify(value || []);
}

async function initSession() {
  try {
    const token = sessionStore.getToken();
    if (!token) {
      alert("Access Denied: Please log in first.");
      window.location.href = "index.html";
      return false;
    }
    sessionStore.setToken(token);

    const me = await apiClient.get("/api/auth/me");
    const profile = (me && me.data) || {};
    _sessionRole = profile.role || "admin";
    _sessionUser = profile.name || "Admin";
    _sessionEmployeeId = profile.id || null;

    await migrateLegacyBlobIfNeeded();
    await hydrateStateFromApi();
    return true;
  } catch (e) {
    console.error("Session init failed", e);
    if (e && (e.status === 401 || e.status === 403)) {
      sessionStore.clear();
    }
    alert("Access Denied: Please log in first.");
    window.location.href = "index.html";
    return false;
  }
}

async function loadAppConfig() {
  let config = {};
  try {
    config = (await storage.getJSON(APP_CONFIG_KEY)) || {};
  } catch (e) {
    config = {};
  }
  return config;
}

async function persistAppConfig(config) {
  try {
    await storage.setJSON(APP_CONFIG_KEY, config);
  } catch (e) {
    Logger.error("App config sync failed", e);
  }
}

function pickAuxState(state) {
  const aux = {};
  AUX_STATE_KEYS.forEach((key) => {
    if (state[key] !== undefined) aux[key] = state[key];
  });
  return aux;
}

function updateLoader(progress, statusText) {
  const bar = document.getElementById("global-loader-progress-bar");
  const statusEl = document.getElementById("global-loader-status");
  if (bar) {
    bar.style.width = `${progress}%`;
  }
  if (statusEl && statusText) {
    statusEl.innerText = statusText;
  }
}

async function hydrateStateFromApi() {
  updateLoader(10, "Connecting...");

  let completedTasks = 0;
  const totalTasks = 9;

  const onTaskComplete = (taskName) => {
    completedTasks++;
    const progress = 10 + Math.round((completedTasks / totalTasks) * 75); // 10% to 85%
    
    let message = "Loading dashboard...";
    if (progress < 25) {
      message = "Connecting...";
    } else if (progress < 45) {
      message = "Loading quotations...";
    } else if (progress < 65) {
      message = "Loading work orders...";
    } else if (progress < 85) {
      message = "Loading dashboard...";
    } else {
      message = "Almost ready...";
    }
    
    updateLoader(progress, message);
  };

  const wrapPromise = async (promise, name) => {
    try {
      const res = await promise;
      onTaskComplete(name);
      return res;
    } catch (e) {
      Logger.warn(`${name} hydrate failed`, e);
      onTaskComplete(name);
      if (name === "finance") return { sales: [], payments: [] };
      if (name === "pricing" || name === "metalPrice") return null;
      if (name === "appConfig") return {};
      return [];
    }
  };

  const customersPromise = wrapPromise(customerService.getAll(), "customers");
  const quotationsPromise = wrapPromise(
    quotationService.getAll(_sessionRole === "finance" ? { financeView: "mine" } : undefined),
    "quotations"
  );
  const workOrdersPromise = wrapPromise(workOrderService.getAll(), "workOrders");
  const financePromise = wrapPromise(financeService.hydrate(), "finance");
  const employeesPromise = wrapPromise(employeeService.getAll(), "employees");
  const appConfigPromise = wrapPromise(loadAppConfig(), "appConfig");
  const pricingPromise = wrapPromise(adminService.getPricing(), "pricing");
  const metalPricePromise = wrapPromise(adminService.getMetalPrice(), "metalPrice");
  const rawProductionPromise = wrapPromise(productionService.fetchRaw(), "production");

  const [
    customers,
    quotations,
    workOrders,
    financeData,
    employees,
    appConfig,
    pricing,
    metalPrice,
    rawProduction,
  ] = await Promise.all([
    customersPromise,
    quotationsPromise,
    workOrdersPromise,
    financePromise,
    employeesPromise,
    appConfigPromise,
    pricingPromise,
    metalPricePromise,
    rawProductionPromise,
  ]);

  const { sales, payments } = financeData || { sales: [], payments: [] };

  updateLoader(90, "Almost ready...");

  const productionItems = rawProduction.map((item) =>
    productionService.toLegacy(item, quotations)
  );

  console.log(
    "[hydrateStateFromApi] Hydrated quotations count:",
    quotations ? quotations.length : 0,
    quotations ? quotations.map((q) => q.id) : [],
  );

  _stateCache = {
    ...(appConfig || {}),
    customers,
    quotations,
    workOrders,
    productionItems,
    sales,
    payments,
    employees,
    adminPricing: pricing || _stateCache.adminPricing || {},
    metalPricePerKg:
      metalPrice != null ? metalPrice : _stateCache.metalPricePerKg,
  };

  _syncSignatures.customers = _entitySig(customers);
  _syncSignatures.quotations = _entitySig(quotations);
  _syncSignatures.workOrders = _entitySig(workOrders);
  _syncSignatures.productionItems = _entitySig(productionItems);
  _syncSignatures.sales = _entitySig(sales);
  _syncSignatures.payments = _entitySig(payments);

  updateLoader(95, "Almost ready...");
}

async function flushStateToApi() {
  if (_entitySig(STATE.customers) !== _syncSignatures.customers) {
    await customerService.syncAll(STATE.customers);
    _syncSignatures.customers = _entitySig(STATE.customers);
  }
  if (_entitySig(STATE.quotations) !== _syncSignatures.quotations) {
    await quotationService.syncAll(STATE.quotations);
    _syncSignatures.quotations = _entitySig(STATE.quotations);
  }
  if (_entitySig(STATE.workOrders) !== _syncSignatures.workOrders) {
    await workOrderService.syncAll(STATE.workOrders, STATE.quotations);
    _syncSignatures.workOrders = _entitySig(STATE.workOrders);
  }
  if (_entitySig(STATE.productionItems) !== _syncSignatures.productionItems) {
    for (const item of STATE.productionItems || []) {
      await productionService.syncItem(item, STATE.quotations);
    }
    _syncSignatures.productionItems = _entitySig(STATE.productionItems);
  }
  // Sales and payments are backend-authoritative; local edits stay in-session.
  if (_entitySig(STATE.sales) !== _syncSignatures.sales) {
    _syncSignatures.sales = _entitySig(STATE.sales);
  }
  if (_entitySig(STATE.payments) !== _syncSignatures.payments) {
    _syncSignatures.payments = _entitySig(STATE.payments);
  }
}

async function migrateLegacyBlobIfNeeded() {
  let legacy = null;
  try {
    legacy = await storage.getJSON(CONFIG.STORAGE_KEYS.ERP_STATE);
  } catch (e) {
    legacy = null;
  }
  if (!legacy || typeof legacy !== "object") return;

  const hasEntityData =
    (legacy.customers && legacy.customers.length) ||
    (legacy.quotations && legacy.quotations.length) ||
    (legacy.workOrders && legacy.workOrders.length);

  try {
    if (hasEntityData) {
      if (legacy.customers?.length)
        await customerService.syncAll(legacy.customers);
      if (legacy.quotations?.length)
        await quotationService.syncAll(legacy.quotations);
      if (legacy.workOrders?.length) {
        await workOrderService.syncAll(
          legacy.workOrders,
          legacy.quotations || [],
        );
      }
      Logger.info("Legacy NEXFRA_ERP_STATE migrated to REST APIs");
    }

    const aux = pickAuxState(legacy);
    if (Object.keys(aux).length) {
      await storage.setJSON(APP_CONFIG_KEY, aux);
    }
    await storage.remove(CONFIG.STORAGE_KEYS.ERP_STATE);
  } catch (e) {
    Logger.error("Legacy blob migration failed (state retained)", e);
  }
}

const ROLE_INFO = {
  sales: { name: "Sales", title: "Sales Representative", avatar: "S" },
  finance: { name: "Finance", title: "Finance Officer", avatar: "F" },
  manager: { name: "Manager", title: "Production Manager", avatar: "M" },
  admin: { name: "Admin", title: "Administrator", avatar: "A" },
};

const ROLE_PERMISSIONS = {
  dashboard: ["admin"],
  quotations: ["sales", "admin"],
  allquotations: ["sales", "admin"],
  approvals: ["admin"],
  status: ["manager", "admin"],
  workorders: ["manager", "admin"],
  sales: ["manager", "admin"],
  accounts: ["finance", "admin"],
  admin: ["admin"],
};

function getCurrentRole() {
  return _sessionRole;
}

function userCanAccess(moduleName) {
  const role = getCurrentRole();
  const allowed = ROLE_PERMISSIONS[moduleName];
  return allowed && allowed.includes(role);
}

function getUserDefaultModule() {
  const role = getCurrentRole();
  const defaults = {
    sales: "quotations",
    finance: "accounts",
    manager: "workorders",
    admin: "dashboard",
  };
  return defaults[role] || "dashboard";
}

const ROLE_PERMISSION_SETS = {
  admin: {
    label: "Administrator",
    canAccess: [
      "dashboard",
      "quotations",
      "allquotations",
      "approvals",
      "status",
      "workorders",
      "sales",
      "accounts",
      "admin",
    ],
    cannotAccess: [],
  },
  sales: {
    label: "Sales Representative",
    canAccess: ["dashboard", "quotations", "allquotations"],
    cannotAccess: [
      "accounts",
      "status",
      "workorders",
      "sales",
      "approvals",
      "admin",
    ],
  },
  finance: {
    label: "Finance Officer",
    canAccess: ["dashboard", "accounts"],
    cannotAccess: [
      "quotations",
      "allquotations",
      "status",
      "workorders",
      "sales",
      "approvals",
      "admin",
    ],
  },
  manager: {
    label: "Production Manager",
    canAccess: ["dashboard", "workorders", "status", "sales"],
    cannotAccess: [
      "accounts",
      "quotations",
      "allquotations",
      "approvals",
      "admin",
    ],
  },
};

const STAGES = [
  "Pending",
  "Material Ordered",
  "Cutting",
  "Fabrication",
  "Welding",
  "Painting",
  "Assembly",
  "QC",
  "Ready",
  "Delivered",
];

let STATE = {};
let currentPreviewQuoteId = "";
let _editState = null;
let _editSnapshot = null;
let _editLoading = false;
let _editSaving = false;
let _moduleFilters = {};
let _approvalsFilter = "pending";

// Product Configurator Wizard State
let wizardState = {
  currentStep: 1,
  customer: {},
  category: "",
  subtype: "",
  capacity: "",
  specs: {},
  notRequired: {},
  status: "Draft",
  total: 0,
  orderQty: 1,
  lastConfirmedQty: 1,
  terms: [
    "1) Validity – 15 days",
    "2) Delivery – 2 To 3 weeks from Date of receipt of purchase order and advance payment",
    "3) Freight - Ex Price Hosur,.. Transportation in Customers Scope & is not considered in the above Price",
    "4) Warrantee: Standard warranty against manufacturing defects of 12 Months from the date of delivery. Consumables, Glass & Rubber parts are not covered under the standard warranty",
    "5) Taxes - All taxes & duties will be billed at actual applicable rates, at the time of billing",
    "6) Payment terms – 50% advance and balance Prior to Delivery",
    "7) Inspection: By Nexfra and share the report along with invoice",
  ],
  scopeOfWork: "As Mentioned above",
  bankDetails: {
    companyName: "NEXFRA MANUFACTURING INDIA PVT LTD",
    bankName: "ICICI BANK",
    accountNumber: "060105004477",
    accountType: "CURRENT",
    ifsc: "560229033/ICIC0000156",
  },
};

// Master Vehicle Configurator Templates
const WIZARD_PRODUCT_TEMPLATES = {
  flatbed: {
    name: "Flat Bed Trailer",
    basePrice: 520000,
    dimensions: { length: "40 Feet", height: "NA", width: "98 Inches" },
    specs: [
      {
        id: "beam",
        name: "Main Beam Steel Grade",
        section: "material",
        type: "dropdown",
        options: ["ST52", "Hardox 450", "BSK46", "E450", "Custom"],
        defaultValue: "ST52",
        priceDiffs: {
          ST52: 0,
          "Hardox 450": 150000,
          BSK46: 40000,
          E450: 60000,
          Custom: 80000,
        },
      },
      {
        id: "floor",
        name: "Floor Sheet Type",
        section: "material",
        type: "dropdown",
        options: ["3mm Chequered", "4mm Plain", "6mm ST52", "Custom"],
        defaultValue: "3mm Chequered",
        priceDiffs: {
          "3mm Chequered": 0,
          "4mm Plain": 15000,
          "6mm ST52": 45000,
          Custom: 60000,
        },
      },
      {
        id: "cylinder",
        name: "Tipping Cylinder Model",
        section: "hydraulic",
        type: "dropdown",
        options: [
          "Hyva 175",
          "Hydromen 175",
          "Wipro 175",
          "Hyva 179-5stage",
          "Hyva 150-4stage",
          "Wipro Heavy Duty",
          "Custom",
        ],
        defaultValue: "Hyva 175",
        priceDiffs: {
          "Hyva 175": 0,
          "Hydromen 175": 0,
          "Wipro 175": 0,
          "Hyva 179-5stage": 15000,
          "Hyva 150-4stage": -25000,
          "Wipro Heavy Duty": -10000,
          Custom: 20000,
        },
      },
      {
        id: "axles",
        name: "Axle Brand & Loading",
        section: "chassis",
        type: "radio",
        options: [
          "York 3x13T",
          "Fuwa 3x13T",
          "York 3x16T",
          "York 2x13T",
          "Custom",
        ],
        defaultValue: "York 3x13T",
        priceDiffs: {
          "York 3x13T": 0,
          "Fuwa 3x13T": -10000,
          "York 3x16T": 80000,
          "York 2x13T": -100000,
          Custom: 50000,
        },
      },
      {
        id: "landing_leg",
        name: "Landing Leg",
        section: "chassis",
        type: "dropdown",
        options: ["York", "Fuwa", "Custom"],
        defaultValue: "York",
        priceDiffs: { York: 0, Fuwa: -10000, Custom: 15000 },
      },
      {
        id: "suspension",
        name: "Suspension System",
        section: "chassis",
        type: "dropdown",
        options: [
          "Mechanical Leaf Spring",
          "Air Suspension",
          "Bogie Suspension",
          "Custom",
        ],
        defaultValue: "Mechanical Leaf Spring",
        priceDiffs: {
          "Mechanical Leaf Spring": 0,
          "Air Suspension": 120000,
          "Bogie Suspension": 90000,
          Custom: 80000,
        },
      },
      {
        id: "brake",
        name: "Brake System Pneumatic",
        section: "chassis",
        type: "dropdown",
        options: ["WABCO ABS", "BCS EBS", "Brake Master", "Custom"],
        defaultValue: "WABCO ABS",
        priceDiffs: {
          "WABCO ABS": 0,
          "BCS EBS": 60000,
          "Brake Master": 20000,
          Custom: 40000,
        },
      },
      {
        id: "disc",
        name: "Wheel Disc Style",
        section: "chassis",
        type: "dropdown",
        options: ["Steel 10-hole", "Alloy York", "Custom"],
        defaultValue: "Steel 10-hole",
        priceDiffs: { "Steel 10-hole": 0, "Alloy York": 45000, Custom: 25000 },
      },
      {
        id: "hook",
        name: "King Pin/Hook Size",
        section: "chassis",
        type: "dropdown",
        options: ["Standard 2-inch JOST", "Heavy Duty 3.5-inch JOST", "Custom"],
        defaultValue: "Standard 2-inch JOST",
        priceDiffs: {
          "Standard 2-inch JOST": 0,
          "Heavy Duty 3.5-inch JOST": 15000,
          Custom: 10000,
        },
      },
      {
        id: "tyre",
        name: "Tyres Fitted",
        section: "chassis",
        type: "dropdown",
        options: [
          "Apollo 10.00R20",
          "MRF Musclerok",
          "JK Jetsteel",
          "Bridgestone",
          "Custom",
        ],
        defaultValue: "Apollo 10.00R20",
        priceDiffs: {
          "Apollo 10.00R20": 0,
          "MRF Musclerok": 12000,
          "JK Jetsteel": -8000,
          Bridgestone: 24000,
          Custom: 15000,
        },
      },
      {
        id: "painting",
        name: "Surface Treatment",
        section: "painting",
        type: "dropdown",
        options: [
          "Epoxy Primer + PU Paint",
          "Epoxy Primer + Epoxy Paint",
          "Customer Choice",
          "Custom",
        ],
        defaultValue: "Epoxy Primer + PU Paint",
        priceDiffs: {
          "Epoxy Primer + PU Paint": 0,
          "Epoxy Primer + Epoxy Paint": -15000,
          "Customer Choice": 0,
          Custom: 20000,
        },
      },
      {
        id: "colour",
        name: "Finish Colour",
        section: "painting",
        type: "text",
        defaultValue: "Golden Green",
      },
      {
        id: "marker_lamps",
        name: "Side Lamp",
        section: "accessories",
        type: "dropdown",
        options: [
          "Side Marker Lamp 6 no's and top marker lamp 2 no's",
          "Standard 4 marker lamps",
          "Custom",
        ],
        defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's",
        priceDiffs: {
          "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0,
          "Standard 4 marker lamps": -5000,
          Custom: 10000,
        },
      },
      {
        id: "supd_rupd",
        name: "SUPD / RUPD Protection",
        section: "accessories",
        type: "dropdown",
        options: ["Standard Heavy Duty RTO", "Custom"],
        defaultValue: "Standard Heavy Duty RTO",
        priceDiffs: { "Standard Heavy Duty RTO": 0, Custom: 8000 },
      },
    ],
  },
  sidewall: {
    name: "Side Wall Trailer",
    basePrice: 580000,
    dimensions: { length: "40 Feet", height: "4.5 Feet", width: "98 Inches" },
    specs: [
      {
        id: "beam",
        name: "Main Beam Steel Grade",
        section: "material",
        type: "dropdown",
        options: ["ST52", "Hardox 450", "BSK46", "E450", "Custom"],
        defaultValue: "ST52",
        priceDiffs: {
          ST52: 0,
          "Hardox 450": 150000,
          BSK46: 40000,
          E450: 60000,
          Custom: 80000,
        },
      },
      {
        id: "floor",
        name: "Floor Sheet Type",
        section: "material",
        type: "dropdown",
        options: ["3mm Chequered", "4mm Plain", "6mm ST52", "Custom"],
        defaultValue: "3mm Chequered",
        priceDiffs: {
          "3mm Chequered": 0,
          "4mm Plain": 15000,
          "6mm ST52": 45000,
          Custom: 60000,
        },
      },
      {
        id: "side_panel",
        name: "Side Panel Height/Style",
        section: "material",
        type: "radio",
        options: ["1.5mm Corrugated", "2mm Corrugated", "Custom"],
        defaultValue: "1.5mm Corrugated",
        priceDiffs: {
          "1.5mm Corrugated": 0,
          "2mm Corrugated": 25000,
          Custom: 40000,
        },
      },
      {
        id: "cylinder",
        name: "Tipping Cylinder Model",
        section: "hydraulic",
        type: "dropdown",
        options: [
          "Hyva 175",
          "Hydromen 175",
          "Wipro 175",
          "Hyva 179-5stage",
          "Hyva 150-4stage",
          "Wipro Heavy Duty",
          "Custom",
        ],
        defaultValue: "Hyva 175",
        priceDiffs: {
          "Hyva 175": 0,
          "Hydromen 175": 0,
          "Wipro 175": 0,
          "Hyva 179-5stage": 15000,
          "Hyva 150-4stage": -25000,
          "Wipro Heavy Duty": -10000,
          Custom: 20000,
        },
      },
      {
        id: "axles",
        name: "Axle Brand & Loading",
        section: "chassis",
        type: "radio",
        options: [
          "York 3x13T",
          "Fuwa 3x13T",
          "York 3x16T",
          "York 2x13T",
          "Custom",
        ],
        defaultValue: "York 3x13T",
        priceDiffs: {
          "York 3x13T": 0,
          "Fuwa 3x13T": -10000,
          "York 3x16T": 80000,
          "York 2x13T": -100000,
          Custom: 50000,
        },
      },
      {
        id: "landing_leg",
        name: "Landing Leg",
        section: "chassis",
        type: "dropdown",
        options: ["York", "Fuwa", "Custom"],
        defaultValue: "York",
        priceDiffs: { York: 0, Fuwa: -10000, Custom: 15000 },
      },
      {
        id: "suspension",
        name: "Suspension System",
        section: "chassis",
        type: "dropdown",
        options: [
          "Mechanical Leaf Spring",
          "Air Suspension",
          "Bogie Suspension",
          "Custom",
        ],
        defaultValue: "Mechanical Leaf Spring",
        priceDiffs: {
          "Mechanical Leaf Spring": 0,
          "Air Suspension": 120000,
          "Bogie Suspension": 90000,
          Custom: 80000,
        },
      },
      {
        id: "brake",
        name: "Brake System Pneumatic",
        section: "chassis",
        type: "dropdown",
        options: ["WABCO ABS", "BCS EBS", "Brake Master", "Custom"],
        defaultValue: "WABCO ABS",
        priceDiffs: {
          "WABCO ABS": 0,
          "BCS EBS": 60000,
          "Brake Master": 20000,
          Custom: 40000,
        },
      },
      {
        id: "tyre",
        name: "Tyres Fitted",
        section: "chassis",
        type: "dropdown",
        options: [
          "Apollo 10.00R20",
          "MRF Musclerok",
          "JK Jetsteel",
          "Bridgestone",
          "Custom",
        ],
        defaultValue: "Apollo 10.00R20",
        priceDiffs: {
          "Apollo 10.00R20": 0,
          "MRF Musclerok": 12000,
          "JK Jetsteel": -8000,
          Bridgestone: 24000,
          Custom: 15000,
        },
      },
      {
        id: "painting",
        name: "Surface Treatment",
        section: "painting",
        type: "dropdown",
        options: [
          "Epoxy Primer + PU Paint",
          "Epoxy Primer + Epoxy Paint",
          "Customer Choice",
          "Custom",
        ],
        defaultValue: "Epoxy Primer + PU Paint",
        priceDiffs: {
          "Epoxy Primer + PU Paint": 0,
          "Epoxy Primer + Epoxy Paint": -15000,
          "Customer Choice": 0,
          Custom: 20000,
        },
      },
      {
        id: "colour",
        name: "Finish Colour",
        section: "painting",
        type: "text",
        defaultValue: "Golden Green",
      },
      {
        id: "marker_lamps",
        name: "Side Lamp",
        section: "accessories",
        type: "dropdown",
        options: [
          "Side Marker Lamp 6 no's and top marker lamp 2 no's",
          "Standard 4 marker lamps",
          "Custom",
        ],
        defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's",
        priceDiffs: {
          "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0,
          "Standard 4 marker lamps": -5000,
          Custom: 10000,
        },
      },
      {
        id: "supd_rupd",
        name: "SUPD / RUPD Protection",
        section: "accessories",
        type: "dropdown",
        options: ["Standard Heavy Duty RTO", "Custom"],
        defaultValue: "Standard Heavy Duty RTO",
        priceDiffs: { "Standard Heavy Duty RTO": 0, Custom: 8000 },
      },
    ],
  },
  tiptrailer: {
    name: "Tip Trailer",
    basePrice: 720000,
    dimensions: { length: "32 Feet", height: "4.5 Feet", width: "98 Inches" },
    specs: [
      {
        id: "beam",
        name: "Main Beam Steel Grade",
        section: "material",
        type: "dropdown",
        options: ["ST52", "Hardox 450", "BSK46", "E450", "Custom"],
        defaultValue: "ST52",
        priceDiffs: {
          ST52: 0,
          "Hardox 450": 150000,
          BSK46: 40000,
          E450: 60000,
          Custom: 80000,
        },
      },
      {
        id: "floor",
        name: "Floor Sheet thickness",
        section: "material",
        type: "dropdown",
        options: ["6mm MS", "8mm ST-52", "10mm ST-52", "Custom"],
        defaultValue: "8mm ST-52",
        priceDiffs: {
          "6mm MS": -15000,
          "8mm ST-52": 0,
          "10mm ST-52": 30000,
          Custom: 45000,
        },
      },
      {
        id: "side_sheet",
        name: "Side Sheet thickness",
        section: "material",
        type: "dropdown",
        options: ["4mm MS", "6mm ST-52", "8mm ST-52", "Custom"],
        defaultValue: "6mm ST-52",
        priceDiffs: {
          "4mm MS": -10000,
          "6mm ST-52": 0,
          "8mm ST-52": 25000,
          Custom: 40000,
        },
      },
      {
        id: "cylinder",
        name: "Tipping Cylinder Model",
        section: "hydraulic",
        type: "dropdown",
        options: [
          "Hyva 175",
          "Hydromen 175",
          "Wipro 175",
          "Hyva 179-5stage",
          "Hyva 150-4stage",
          "Wipro Heavy Duty",
          "Custom",
        ],
        defaultValue: "Hyva 175",
        priceDiffs: {
          "Hyva 175": 0,
          "Hydromen 175": 0,
          "Wipro 175": 0,
          "Hyva 179-5stage": 15000,
          "Hyva 150-4stage": -25000,
          "Wipro Heavy Duty": -10000,
          Custom: 20000,
        },
      },
      {
        id: "axles",
        name: "Axles Fitted",
        section: "chassis",
        type: "radio",
        options: ["York 3x13T", "York 3x16T", "York 2x13T", "Custom"],
        defaultValue: "York 3x13T",
        priceDiffs: {
          "York 3x13T": 0,
          "York 3x16T": 80000,
          "York 2x13T": -100000,
          Custom: 40000,
        },
      },
      {
        id: "landing_leg",
        name: "Landing Leg",
        section: "chassis",
        type: "dropdown",
        options: ["York", "Fuwa", "Custom"],
        defaultValue: "York",
        priceDiffs: { York: 0, Fuwa: -10000, Custom: 15000 },
      },
      {
        id: "painting",
        name: "Surface Treatment",
        section: "painting",
        type: "dropdown",
        options: [
          "Epoxy Primer + PU Paint",
          "Epoxy Primer + Epoxy Paint",
          "Custom",
        ],
        defaultValue: "Epoxy Primer + PU Paint",
        priceDiffs: {
          "Epoxy Primer + PU Paint": 0,
          "Epoxy Primer + Epoxy Paint": -15000,
          Custom: 20000,
        },
      },
      {
        id: "colour",
        name: "Finish Colour",
        section: "painting",
        type: "text",
        defaultValue: "Royal Blue",
      },
      {
        id: "marker_lamps",
        name: "Side Lamp",
        section: "accessories",
        type: "dropdown",
        options: [
          "Side Marker Lamp 6 no's and top marker lamp 2 no's",
          "Standard 4 marker lamps",
          "Custom",
        ],
        defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's",
        priceDiffs: {
          "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0,
          "Standard 4 marker lamps": -5000,
          Custom: 10000,
        },
      },
      {
        id: "supd_rupd",
        name: "SUPD / RUPD Protection",
        section: "accessories",
        type: "dropdown",
        options: ["Standard Heavy Duty RTO", "Custom"],
        defaultValue: "Standard Heavy Duty RTO",
        priceDiffs: { "Standard Heavy Duty RTO": 0, Custom: 8000 },
      },
    ],
  },
  boxbody: {
    name: "Box Body Tipper",
    basePrice: 480000,
    dimensions: { length: "20 Feet", height: "4.5 Feet", width: "98 Inches" },
    specs: [
      {
        id: "floor",
        name: "Floor Sheet thickness",
        section: "material",
        type: "dropdown",
        options: ["6mm MS", "8mm ST-52", "10mm ST-52", "Custom"],
        defaultValue: "8mm ST-52",
        priceDiffs: {
          "6mm MS": -15000,
          "8mm ST-52": 0,
          "10mm ST-52": 30000,
          Custom: 45000,
        },
      },
      {
        id: "side_sheet",
        name: "Side Sheet thickness",
        section: "material",
        type: "dropdown",
        options: ["4mm MS", "6mm ST-52", "8mm ST-52", "Custom"],
        defaultValue: "6mm ST-52",
        priceDiffs: {
          "4mm MS": -10000,
          "6mm ST-52": 0,
          "8mm ST-52": 25000,
          Custom: 40000,
        },
      },
      {
        id: "headboard",
        name: "Headboard Sheet thickness",
        section: "material",
        type: "dropdown",
        options: ["6mm ST-52", "8mm ST-52", "Custom"],
        defaultValue: "6mm ST-52",
        priceDiffs: { "6mm ST-52": 0, "8mm ST-52": 15000, Custom: 25000 },
      },
      {
        id: "taildoor",
        name: "Tail Door thickness",
        section: "material",
        type: "dropdown",
        options: ["6mm ST-52", "8mm ST-52", "Custom"],
        defaultValue: "6mm ST-52",
        priceDiffs: { "6mm ST-52": 0, "8mm ST-52": 15000, Custom: 25000 },
      },
      {
        id: "cylinder",
        name: "Tipping Cylinder Model",
        section: "hydraulic",
        type: "dropdown",
        options: [
          "Hyva 175",
          "Hydromen 175",
          "Wipro 175",
          "Hyva 150-4stage-4520",
          "Hyva 179-5stage",
          "Wipro Heavy Duty",
          "Custom",
        ],
        defaultValue: "Hyva 175",
        priceDiffs: {
          "Hyva 175": 0,
          "Hydromen 175": 0,
          "Wipro 175": 0,
          "Hyva 150-4stage-4520": 0,
          "Hyva 179-5stage": 35000,
          "Wipro Heavy Duty": 10000,
          Custom: 20000,
        },
      },
      {
        id: "pto",
        name: "Power Take-Off (PTO)",
        section: "hydraulic",
        type: "checkbox",
        defaultValue: "Yes",
        priceDiffs: { Yes: 0, No: -12000 },
      },
      {
        id: "pump",
        name: "Hydraulic Pump Type",
        section: "hydraulic",
        type: "dropdown",
        options: ["Included Gear Pump", "Included Piston Pump", "Custom"],
        defaultValue: "Included Gear Pump",
        priceDiffs: {
          "Included Gear Pump": 0,
          "Included Piston Pump": 28000,
          Custom: 15000,
        },
      },
      {
        id: "lock_system",
        name: "Tail Door Lock System",
        section: "chassis",
        type: "radio",
        options: ["Horizontal Lock System", "Manual Lock", "Custom"],
        defaultValue: "Horizontal Lock System",
        priceDiffs: {
          "Horizontal Lock System": 0,
          "Manual Lock": -10000,
          Custom: 15000,
        },
      },
      {
        id: "landing_leg",
        name: "Landing Leg",
        section: "chassis",
        type: "dropdown",
        options: ["York", "Fuwa", "Custom"],
        defaultValue: "York",
        priceDiffs: { York: 0, Fuwa: -10000, Custom: 15000 },
      },
      {
        id: "painting",
        name: "Surface Treatment",
        section: "painting",
        type: "dropdown",
        options: [
          "Epoxy Primer + PU Paint",
          "Epoxy Primer + Epoxy Paint",
          "Custom",
        ],
        defaultValue: "Epoxy Primer + PU Paint",
        priceDiffs: {
          "Epoxy Primer + PU Paint": 0,
          "Epoxy Primer + Epoxy Paint": -15000,
          Custom: 20000,
        },
      },
      {
        id: "colour",
        name: "Finish Colour",
        section: "painting",
        type: "text",
        defaultValue: "Golden Green",
      },
      {
        id: "marker_lamps",
        name: "Side Lamp",
        section: "accessories",
        type: "dropdown",
        options: [
          "Side Marker Lamp 6 no's and top marker lamp 2 no's",
          "Standard 4 marker lamps",
          "Custom",
        ],
        defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's",
        priceDiffs: {
          "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0,
          "Standard 4 marker lamps": -5000,
          Custom: 10000,
        },
      },
      {
        id: "supd_rupd",
        name: "SUPD / RUPD Protection",
        section: "accessories",
        type: "dropdown",
        options: ["Standard Heavy Duty RTO", "Custom"],
        defaultValue: "Standard Heavy Duty RTO",
        priceDiffs: { "Standard Heavy Duty RTO": 0, Custom: 8000 },
      },
      {
        id: "subframe",
        name: "Subframe",
        section: "subframe",
        type: "dropdown",
        options: ["6mm", "8mm", "Custom"],
        defaultValue: "6mm",
        priceDiffs: { "6mm": 0, "8mm": 25000, Custom: 30000 },
      },
    ],
  },
  rockbody: {
    name: "Rock Body Tipper",
    basePrice: 650000,
    dimensions: { length: "18 Feet", height: "4.0 Feet", width: "98 Inches" },
    specs: [
      {
        id: "floor",
        name: "Floor Sheet thickness",
        section: "material",
        type: "dropdown",
        options: ["10mm ST-52", "12mm Hardox 450", "Custom"],
        defaultValue: "10mm ST-52",
        priceDiffs: {
          "10mm ST-52": 0,
          "12mm Hardox 450": 180000,
          Custom: 80000,
        },
      },
      {
        id: "side_sheet",
        name: "Side Sheet thickness",
        section: "material",
        type: "dropdown",
        options: ["8mm ST-52", "10mm Hardox 450", "Custom"],
        defaultValue: "8mm ST-52",
        priceDiffs: {
          "8mm ST-52": 0,
          "10mm Hardox 450": 120000,
          Custom: 60000,
        },
      },
      {
        id: "cylinder",
        name: "Tipping Cylinder Model",
        section: "hydraulic",
        type: "dropdown",
        options: [
          "Hyva 175",
          "Hydromen 175",
          "Wipro 175",
          "Hyva 179-5stage",
          "Hyva 150-4stage",
          "Custom",
        ],
        defaultValue: "Hyva 175",
        priceDiffs: {
          "Hyva 175": 0,
          "Hydromen 175": 0,
          "Wipro 175": 0,
          "Hyva 179-5stage": 15000,
          "Hyva 150-4stage": -25000,
          Custom: 20000,
        },
      },
      {
        id: "landing_leg",
        name: "Landing Leg",
        section: "chassis",
        type: "dropdown",
        options: ["York", "Fuwa", "Custom"],
        defaultValue: "York",
        priceDiffs: { York: 0, Fuwa: -10000, Custom: 15000 },
      },
      {
        id: "painting",
        name: "Surface Treatment",
        section: "painting",
        type: "dropdown",
        options: [
          "Epoxy Primer + PU Paint",
          "Epoxy Primer + Epoxy Paint",
          "Custom",
        ],
        defaultValue: "Epoxy Primer + PU Paint",
        priceDiffs: {
          "Epoxy Primer + PU Paint": 0,
          "Epoxy Primer + Epoxy Paint": -15000,
          Custom: 20000,
        },
      },
      {
        id: "colour",
        name: "Finish Colour",
        section: "painting",
        type: "text",
        defaultValue: "Crimson Red",
      },
      {
        id: "marker_lamps",
        name: "Side Lamp",
        section: "accessories",
        type: "dropdown",
        options: [
          "Side Marker Lamp 6 no's and top marker lamp 2 no's",
          "Standard 4 marker lamps",
          "Custom",
        ],
        defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's",
        priceDiffs: {
          "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0,
          "Standard 4 marker lamps": -5000,
          Custom: 10000,
        },
      },
      {
        id: "supd_rupd",
        name: "SUPD / RUPD Protection",
        section: "accessories",
        type: "dropdown",
        options: ["Standard Heavy Duty RTO", "Custom"],
        defaultValue: "Standard Heavy Duty RTO",
        priceDiffs: { "Standard Heavy Duty RTO": 0, Custom: 8000 },
      },
      {
        id: "subframe",
        name: "Subframe",
        section: "subframe",
        type: "dropdown",
        options: ["6mm", "8mm", "Custom"],
        defaultValue: "6mm",
        priceDiffs: { "6mm": 0, "8mm": 25000, Custom: 30000 },
      },
    ],
  },
  rigid28: {
    name: "28 Feet Rigid Load Body",
    basePrice: 380000,
    dimensions: { length: "28 Feet", height: "4.0 Feet", width: "98 Inches" },
    specs: [
      {
        id: "floor",
        name: "Floor sheet",
        section: "material",
        type: "dropdown",
        options: ["5mm (St52)", "6mm (St52)", "3mm Chequered", "Custom"],
        defaultValue: "5mm (St52)",
        priceDiffs: {
          "5mm (St52)": 0,
          "6mm (St52)": 25000,
          "3mm Chequered": -15000,
          Custom: 30000,
        },
      },
      {
        id: "side_board",
        name: "Side board sheet",
        section: "material",
        type: "dropdown",
        options: ["3mm (St52)", "4mm (St52)", "Custom"],
        defaultValue: "3mm (St52)",
        priceDiffs: { "3mm (St52)": 0, "4mm (St52)": 18000, Custom: 25000 },
      },
      {
        id: "headboard",
        name: "Head board sheet",
        section: "material",
        type: "dropdown",
        options: ["3mm (St52)", "4mm (St52)", "Custom"],
        defaultValue: "3mm (St52)",
        priceDiffs: { "3mm (St52)": 0, "4mm (St52)": 15000, Custom: 20000 },
      },
      {
        id: "taildoor",
        name: "Tail door sheet",
        section: "material",
        type: "dropdown",
        options: ["3mm (St52)", "4mm (St52)", "Custom"],
        defaultValue: "3mm (St52)",
        priceDiffs: { "3mm (St52)": 0, "4mm (St52)": 15000, Custom: 20000 },
      },
      {
        id: "cylinder",
        name: "Tipping Cylinder Model",
        section: "hydraulic",
        type: "dropdown",
        options: [
          "Hyva 175",
          "Hydromen 175",
          "Wipro 175",
          "Hyva 179-5stage",
          "Hyva 150-4stage",
          "Wipro Heavy Duty",
          "Custom",
        ],
        defaultValue: "Hyva 175",
        priceDiffs: {
          "Hyva 175": 0,
          "Hydromen 175": 0,
          "Wipro 175": 0,
          "Hyva 179-5stage": 15000,
          "Hyva 150-4stage": -25000,
          "Wipro Heavy Duty": -10000,
          Custom: 20000,
        },
      },
      {
        id: "runner",
        name: "Runner",
        section: "chassis",
        type: "dropdown",
        options: ["ISMC 200 SAIL make", "ISMC 175", "Custom"],
        defaultValue: "ISMC 200 SAIL make",
        priceDiffs: {
          "ISMC 200 SAIL make": 0,
          "ISMC 175": -10000,
          Custom: 15000,
        },
      },
      {
        id: "landing_leg",
        name: "Landing Leg",
        section: "chassis",
        type: "dropdown",
        options: ["York", "Fuwa", "Custom"],
        defaultValue: "York",
        priceDiffs: { York: 0, Fuwa: -10000, Custom: 15000 },
      },
      {
        id: "painting",
        name: "Painting",
        section: "painting",
        type: "dropdown",
        options: [
          "Epoxy primer and PU top coat Nippon paint",
          "Epoxy primer and Epoxy paint",
          "Custom",
        ],
        defaultValue: "Epoxy primer and PU top coat Nippon paint",
        priceDiffs: {
          "Epoxy primer and PU top coat Nippon paint": 0,
          "Epoxy primer and Epoxy paint": -10000,
          Custom: 15000,
        },
      },
      {
        id: "marker_lamps",
        name: "Side Lamp",
        section: "accessories",
        type: "dropdown",
        options: [
          "Side Marker Lamp 6 no's and top marker lamp 2 no's",
          "Standard 4 marker lamps",
          "Custom",
        ],
        defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's",
        priceDiffs: {
          "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0,
          "Standard 4 marker lamps": -5000,
          Custom: 10000,
        },
      },
      {
        id: "supd_rupd",
        name: "SUPD / RUPD Protection",
        section: "accessories",
        type: "dropdown",
        options: ["Standard Heavy Duty RTO", "Custom"],
        defaultValue: "Standard Heavy Duty RTO",
        priceDiffs: { "Standard Heavy Duty RTO": 0, Custom: 8000 },
      },
      {
        id: "subframe",
        name: "Subframe",
        section: "subframe",
        type: "dropdown",
        options: ["6mm", "8mm", "Custom"],
        defaultValue: "6mm",
        priceDiffs: { "6mm": 0, "8mm": 25000, Custom: 30000 },
      },
    ],
  },
  rigid30: {
    name: "30 Feet Rigid Load Body",
    basePrice: 420000,
    dimensions: { length: "30 Feet", height: "4.0 Feet", width: "98 Inches" },
    specs: [
      {
        id: "floor",
        name: "Floor sheet",
        section: "material",
        type: "dropdown",
        options: ["5mm (St52)", "6mm (St52)", "3mm Chequered", "Custom"],
        defaultValue: "5mm (St52)",
        priceDiffs: {
          "5mm (St52)": 0,
          "6mm (St52)": 25000,
          "3mm Chequered": -15000,
          Custom: 30000,
        },
      },
      {
        id: "side_board",
        name: "Side board sheet",
        section: "material",
        type: "dropdown",
        options: ["3mm (St52)", "4mm (St52)", "Custom"],
        defaultValue: "3mm (St52)",
        priceDiffs: { "3mm (St52)": 0, "4mm (St52)": 18000, Custom: 25000 },
      },
      {
        id: "headboard",
        name: "Head board sheet",
        section: "material",
        type: "dropdown",
        options: ["3mm (St52)", "4mm (St52)", "Custom"],
        defaultValue: "3mm (St52)",
        priceDiffs: { "3mm (St52)": 0, "4mm (St52)": 15000, Custom: 20000 },
      },
      {
        id: "taildoor",
        name: "Tail door sheet",
        section: "material",
        type: "dropdown",
        options: ["3mm (St52)", "4mm (St52)", "Custom"],
        defaultValue: "3mm (St52)",
        priceDiffs: { "3mm (St52)": 0, "4mm (St52)": 15000, Custom: 20000 },
      },
      {
        id: "cylinder",
        name: "Tipping Cylinder Model",
        section: "hydraulic",
        type: "dropdown",
        options: [
          "Hyva 175",
          "Hydromen 175",
          "Wipro 175",
          "Hyva 179-5stage",
          "Hyva 150-4stage",
          "Wipro Heavy Duty",
          "Custom",
        ],
        defaultValue: "Hyva 175",
        priceDiffs: {
          "Hyva 175": 0,
          "Hydromen 175": 0,
          "Wipro 175": 0,
          "Hyva 179-5stage": 15000,
          "Hyva 150-4stage": -25000,
          "Wipro Heavy Duty": -10000,
          Custom: 20000,
        },
      },
      {
        id: "runner",
        name: "Runner",
        section: "chassis",
        type: "dropdown",
        options: ["ISMC 200 SAIL make", "ISMC 175", "Custom"],
        defaultValue: "ISMC 200 SAIL make",
        priceDiffs: {
          "ISMC 200 SAIL make": 0,
          "ISMC 175": -10000,
          Custom: 15000,
        },
      },
      {
        id: "landing_leg",
        name: "Landing Leg",
        section: "chassis",
        type: "dropdown",
        options: ["York", "Fuwa", "Custom"],
        defaultValue: "York",
        priceDiffs: { York: 0, Fuwa: -10000, Custom: 15000 },
      },
      {
        id: "painting",
        name: "Painting",
        section: "painting",
        type: "dropdown",
        options: [
          "Epoxy primer and PU top coat Nippon paint",
          "Epoxy primer and Epoxy paint",
          "Custom",
        ],
        defaultValue: "Epoxy primer and PU top coat Nippon paint",
        priceDiffs: {
          "Epoxy primer and PU top coat Nippon paint": 0,
          "Epoxy primer and Epoxy paint": -10000,
          Custom: 15000,
        },
      },
      {
        id: "marker_lamps",
        name: "Side Lamp",
        section: "accessories",
        type: "dropdown",
        options: [
          "Side Marker Lamp 6 no's and top marker lamp 2 no's",
          "Standard 4 marker lamps",
          "Custom",
        ],
        defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's",
        priceDiffs: {
          "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0,
          "Standard 4 marker lamps": -5000,
          Custom: 10000,
        },
      },
      {
        id: "supd_rupd",
        name: "SUPD / RUPD Protection",
        section: "accessories",
        type: "dropdown",
        options: ["Standard Heavy Duty RTO", "Custom"],
        defaultValue: "Standard Heavy Duty RTO",
        priceDiffs: { "Standard Heavy Duty RTO": 0, Custom: 8000 },
      },
      {
        id: "subframe",
        name: "Subframe",
        section: "subframe",
        type: "dropdown",
        options: ["6mm", "8mm", "Custom"],
        defaultValue: "6mm",
        priceDiffs: { "6mm": 0, "8mm": 25000, Custom: 30000 },
      },
    ],
  },
};

// Pristine backup of original templates for reset functionality
const ORIGINAL_PRODUCT_TEMPLATES = JSON.parse(
  JSON.stringify(WIZARD_PRODUCT_TEMPLATES),
);

// Subtype groups for propagating spec changes across related subtypes
const SUBTYPE_GROUPS = {
  rigid28: "rigid_load_body",
  rigid30: "rigid_load_body",
};

function getSubtypeGroup(subtypeKey) {
  return SUBTYPE_GROUPS[subtypeKey] || subtypeKey;
}

function getGroupMembers(groupKey) {
  if (groupKey === "rigid_load_body") return ["rigid28", "rigid30"];
  return [groupKey];
}

// Apply persisted spec overrides to a template
function applyProductTemplateOverrides(template, subtypeKey) {
  if (!STATE.productSpecOverrides) STATE.productSpecOverrides = {};
  const groupKey = getSubtypeGroup(subtypeKey);
  const overrides = STATE.productSpecOverrides[groupKey];
  if (overrides && overrides.specs && overrides.specs.length > 0) {
    template.specs = overrides.specs;
  }
}

function syncStateCalculations() {
  if (!STATE || !STATE.sales || !STATE.payments || !STATE.customers) return;

  STATE.sales.forEach((sale) => {
    const totalPaid = STATE.payments
      .filter((p) => p.invoiceId === sale.invoiceId)
      .reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, sale.amount - totalPaid);

    if (balance <= 0) {
      sale.status = "Paid";
    } else if (totalPaid > 0) {
      sale.status = "Partial";
    } else {
      sale.status = "Pending";
    }
  });

  STATE.customers.forEach((cust) => {
    const custSales = STATE.sales.filter(
      (sale) => sale.customerName === cust.company,
    );
    let due = 0;
    custSales.forEach((sale) => {
      const totalPaid = STATE.payments
        .filter((p) => p.invoiceId === sale.invoiceId)
        .reduce((sum, p) => sum + p.amount, 0);
      due += Math.max(0, sale.amount - totalPaid);
    });
    cust.outstanding = due;
  });
}

function loadState() {
  STATE = Object.assign({}, _stateCache);

  if (!STATE.customers) STATE.customers = [];
  if (!STATE.quotations) STATE.quotations = [];
  if (!STATE.workOrders) STATE.workOrders = [];
  if (!STATE.productionItems) STATE.productionItems = [];
  if (!STATE.sales) STATE.sales = [];
  if (!STATE.payments) STATE.payments = [];
  if (!STATE.customItemDefinitions) STATE.customItemDefinitions = [];
  if (!STATE.employees) STATE.employees = [];
  if (!STATE.employeeCounter) STATE.employeeCounter = 0;
  if (!STATE.logs) STATE.logs = [];
  if (!STATE.adminPricing) STATE.adminPricing = {};
  if (!STATE.productSpecOverrides) STATE.productSpecOverrides = {};

  syncStateCalculations();
}

function saveState() {
  syncStateCalculations();
  _stateCache = Object.assign({}, STATE);
  flushStateToApi().catch((e) =>
    Logger.error("Background state sync failed", e),
  );
  const aux = pickAuxState(STATE);
  const auxSig = _entitySig(aux);
  if (auxSig !== _lastAuxConfigSig) {
    _lastAuxConfigSig = auxSig;
    persistAppConfig(aux);
  }
}

let _lastAuxConfigSig = _entitySig(pickAuxState(_stateCache));

window.resetAllSystemData = async function (silent = false) {
  if (!isResetDataEnabled()) {
    alert("This feature is only available in development mode.");
    return;
  }
  if (
    silent ||
    confirm(
      "Are you sure you want to clear all test quotations, work orders, payments, sales, and test customers? Sequence counters will restart from 1.",
    )
  ) {
    try {
      await adminService.resetAllSystemData();
      STATE.quotations = [];
      STATE.productionItems = [];
      STATE.workOrders = [];
      STATE.sales = [];
      STATE.payments = [];
      STATE.customers = [];
      STATE.logs = [
        {
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          message:
            "Transactional database reset to production baseline. Sequences restarted from 1.",
        },
      ];
      saveState();
      if (!silent) {
        alert(
          "Transactional test data reset successfully! All sequence counters restarted from 1.",
        );
        window.location.reload();
      }
    } catch (err) {
      alert(
        "Failed to reset test data: " +
          (err.response?.data?.error?.message || err.message || err),
      );
    }
  }
};

function logSystemActivity(message) {
  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  STATE.logs.unshift({ time, message });
  if (STATE.logs.length > CONFIG.MAX_LOG_ENTRIES) STATE.logs.pop();
  saveState();
}

// ------------------------------------------
// 2. LIFECYCLE & ROUTING EVENT HANDLERS
// ------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  bootApplication();
});

function bootApplication() {
  const startTime = Date.now();

  async function bootstrap() {
    // 1. Authenticate. This also runs full parallel startup data hydration.
    const authed = await initSession();
    if (!authed) return;

    // 2. Populate the complete in-memory application state from that data.
    await loadState();

    if (!isResetDataEnabled()) {
      document.querySelectorAll(".reset-data-btn").forEach((el) => {
        el.style.display = "none";
      });
    }

    // 3. Bind interactive behaviour (no data-bearing rendering happens here).
    filterSidebarByRole();
    updateHeaderDisplay();
    initSidebarNav();
    initDashboardShortcuts();
    initQuotationBuilder();
    initAccountsModule();
    initAdminModule();
    initLogout();
    initPdfPreviewControls();

    // 4. Render the initial module ONLY now that startup state is fully ready.
    await handleUrlRouting();

    // 5. Startup is complete → record it BEFORE revealing the app.
    _startupComplete = true;

    startVisibilityPoll();

    finalizeStartup(startTime);
  }

  bootstrap().catch((e) => {
    Logger.error("Application bootstrap failed", e);
    updateLoader(100, "Startup failed");
    alert("The control panel failed to start. Please reload the page.");
  });
}

// The ONLY place the fullscreen loader is dismissed and the app is revealed.
function finalizeStartup(startTime) {
  updateLoader(100, "Almost ready...");

  const elapsed = Date.now() - startTime;
  const minLoadingTime = 800;
  const delay = Math.max(0, minLoadingTime - elapsed);

  setTimeout(() => {
    const loader = document.getElementById("global-app-loader");
    const appContainer = document.getElementById("app-container");
    if (loader && appContainer) {
      if (window.gsap) {
        gsap.to(loader, {
          opacity: 0,
          duration: 0.5,
          ease: "power2.inOut",
          onComplete: () => {
            loader.style.display = "none";
          }
        });
        gsap.to(appContainer, {
          opacity: 1,
          duration: 0.5,
          ease: "power2.inOut",
          onStart: () => {
            appContainer.style.visibility = "visible";
          }
        });
      } else {
        loader.style.transition = "opacity 0.5s ease-in-out";
        appContainer.style.transition = "opacity 0.5s ease-in-out; visibility 0s";
        loader.style.opacity = "0";
        appContainer.style.opacity = "1";
        appContainer.style.visibility = "visible";
        setTimeout(() => {
          loader.style.display = "none";
        }, 500);
      }
    }
  }, delay);
}

// Register delegated action handlers once at startup.
// (Rendering is already complete and the loader is still covering the screen.)
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.getAttribute("data-action");
  const id = btn.getAttribute("data-id");
  if (action === "view-employee") openEmployeeView(id);
  else if (action === "edit-employee") openEmployeeForm(id);
  else if (action === "disable-employee") window.disableEmployee(id);
  else if (action === "delete-employee") window.deleteEmployee(id);
  else if (action === "reset-employee-password")
    window.resetEmployeePassword(id);
});

document.addEventListener("click", (e) => {
  document.querySelectorAll(".filter-dd").forEach((el) => {
    if (el.style.display !== "block") return;
    const moduleKey = el.id.replace("filter-dd-", "");
    const btn = document.querySelector(`[data-filter-btn="${moduleKey}"]`);
    if (!el.contains(e.target) && (!btn || !btn.contains(e.target))) {
      el.style.display = "none";
    }
  });
});

function filterSidebarByRole() {
  const role = getCurrentRole();
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    const rolesAttr = link.getAttribute("data-roles");
    if (!rolesAttr) return;
    const allowedRoles = rolesAttr.split(",").map((r) => r.trim());
    if (!allowedRoles.includes(role)) {
      link.style.display = "none";
    }
  });
}

function updateHeaderDisplay() {
  const role = getCurrentRole();
  const info = ROLE_INFO[role] || ROLE_INFO.admin;
  const userName = _sessionUser || info.name;
  const nameEl = document.getElementById("header-user-name");
  const roleEl = document.getElementById("header-user-role");
  const avatarEl = document.getElementById("header-user-avatar");
  const footerEl = document.getElementById("sidebar-footer-info");
  if (nameEl) nameEl.innerText = userName;
  if (roleEl) roleEl.innerText = info.title;
  if (avatarEl) avatarEl.innerText = userName.charAt(0).toUpperCase();
  if (footerEl) footerEl.innerText = `Signed in as ${userName} (${info.title})`;
}

function handleUrlRouting() {
  const params = new URLSearchParams(window.location.search);
  const targetModule = params.get("module") || getUserDefaultModule();
  const targetProduct = params.get("product");

  switchModule(targetModule);

  if (targetModule === "quotations") {
    startNewQuotationWizard();
    if (targetProduct) {
      // Map product keys
      let mappedCat = "trailer";
      let mappedSub = "flatbed";
      if (targetProduct.includes("tiptrailer")) {
        mappedCat = "trailer";
        mappedSub = "tiptrailer";
      } else if (targetProduct.includes("boxbody")) {
        mappedCat = "tipper";
        mappedSub = "boxbody";
      } else if (targetProduct.includes("rockbody")) {
        mappedCat = "tipper";
        mappedSub = "rockbody";
      }

      selectProductCategory(mappedCat);
      selectProductSubtype(mappedSub);
      if (mappedCat === "tipper") {
        selectChassisCapacity("25 CBM");
      }
      advanceWizardStep(4);
    }
  }
}

function initSidebarNav() {
  const links = document.querySelectorAll(".sidebar-link");
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const mod = e.currentTarget.getAttribute("data-module");
      switchModule(mod);
    });
  });
}

function switchModule(moduleName) {
  if (!userCanAccess(moduleName)) {
    const fallback = getUserDefaultModule();
    if (moduleName !== fallback) {
      switchModule(fallback);
      return;
    }
  }

  const links = document.querySelectorAll(".sidebar-link");
  const views = document.querySelectorAll(".module-view");

  links.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("data-module") === moduleName) {
      link.classList.add("active");
    }
  });

  views.forEach((v) => v.classList.remove("active"));

  const activeView = document.getElementById(`view-${moduleName}`);
  if (activeView) {
    activeView.classList.add("active");

    // Smooth GSAP staggered viewport load
    gsap.fromTo(
      activeView.children,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, stagger: 0.05, duration: 0.3 },
    );

    // Refresh modules
    if (moduleName === "dashboard") renderDashboardOverview();
    if (moduleName === "sales") renderChassisTable();
    if (moduleName === "workorders") renderWorkOrders();
    if (moduleName === "status") renderProductionBoard();
    if (moduleName === "accounts") refreshFinanceModule();
    if (moduleName === "admin") renderAdminSettings();
    if (moduleName === "quotations") startNewQuotationWizard();
    if (moduleName === "allquotations") renderAllQuotations();
    if (moduleName === "approvals") renderApprovalsList("pending");
  }
}

function initDashboardShortcuts() {
  document
    .getElementById("quick-jump-production")
    .addEventListener("click", (e) => {
      e.preventDefault();
      switchModule("status");
    });
  document
    .getElementById("dash-btn-new-quote")
    .addEventListener("click", () => switchModule("quotations"));
  document
    .getElementById("dash-btn-payments")
    .addEventListener("click", () => switchModule("accounts"));
  document
    .getElementById("dash-btn-templates")
    .addEventListener("click", () => switchModule("admin"));
}

function initLogout() {
  document
    .getElementById("portal-logout-btn")
    .addEventListener("click", async () => {
      await AuthenticationService.logout().catch(() => {});
      for (const key of [
        CONFIG.STORAGE_KEYS.AUTH_TOKEN,
        CONFIG.STORAGE_KEYS.USER_ROLE,
        CONFIG.STORAGE_KEYS.USER_NAME,
      ]) {
        await storage.remove(key).catch(() => {});
      }
      if (CONFIG.STORAGE_PROVIDER !== "api") {
        await storage.remove(APP_CONFIG_KEY).catch(() => {});
      }
      stopVisibilityPoll();
      alert("Signed out from Control Panel.");
      window.location.href = "index.html";
    });
}

// ------------------------------------------
// 3. MODULE RENDERERS
// ------------------------------------------

function renderDashboardOverview() {
  loadState();

  const activeWOCount = STATE.workOrders.filter(
    (w) => w.stage !== "Delivered" && w.stage !== "Ready",
  ).length;
  const pendingQuotesCount = STATE.quotations.filter(
    (q) => q.status === "Draft",
  ).length;

  let outstandingBalance = 0;
  STATE.customers.forEach((c) => (outstandingBalance += c.outstanding));

  document.getElementById("kpi-active-wo").innerText = activeWOCount;
  document.getElementById("kpi-pending-quotes").innerText = pendingQuotesCount;
  document.getElementById("kpi-receivable").innerText =
    `₹${(outstandingBalance / 100000).toFixed(1)}L`;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const payments = STATE.payments || [];
  const thisMonthPayments = payments.filter((p) => {
    const d = new Date(p.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const prevMonthPayments = payments.filter((p) => {
    const d = new Date(p.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  const thisMonthTotal = thisMonthPayments.reduce((s, p) => s + p.amount, 0);
  const prevMonthTotal = prevMonthPayments.reduce((s, p) => s + p.amount, 0);

  document.getElementById("kpi-monthly-billing").innerText =
    `₹${thisMonthTotal.toLocaleString("en-IN")}`;

  const trendEl = document.getElementById("kpi-billing-trend");
  if (prevMonthTotal > 0) {
    const diff = ((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
    const sign = diff >= 0 ? "+" : "";
    trendEl.innerText = `${sign}${diff.toFixed(1)}% vs last month`;
    trendEl.className = `kpi-trend ${diff >= 0 ? "trend-up" : "trend-down"}`;
  } else if (thisMonthTotal > 0) {
    trendEl.innerText = "New this month";
    trendEl.className = "kpi-trend trend-up";
  } else {
    trendEl.innerText = "No billing this month";
    trendEl.className = "kpi-trend trend-neutral";
  }

  const logListContainer = document.getElementById("system-log-list");
  logListContainer.innerHTML = STATE.logs
    .map(
      (log) => `
    <li><span class="log-time">${log.time}</span> ${log.message}</li>
  `,
    )
    .join("");

  const dashWOSummary = document.getElementById("dash-wo-summary");
  const activeWOs = STATE.workOrders.filter((w) => w.stage !== "Delivered");

  if (activeWOs.length === 0) {
    dashWOSummary.innerHTML =
      '<p class="section-hint text-center py-lg">No active chassis in production pipeline.</p>';
  } else {
    dashWOSummary.innerHTML = activeWOs
      .map((wo) => {
        const stageIdx = STAGES.indexOf(wo.stage);
        const progressPercent = Math.round(
          (stageIdx / (STAGES.length - 1)) * 100,
        );

        return `
        <div class="dash-wo-item">
          <div class="dash-wo-info">
            <span class="dash-wo-id">${wo.id} - ${wo.product}</span>
            <span class="dash-wo-customer">${wo.customerName}</span>
          </div>
          <div class="dash-wo-progress-wrap">
            <div class="dash-wo-pb">
              <div class="dash-wo-pb-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div class="dash-wo-stage">
              <span class="dash-wo-stage-name">${wo.stage}</span>
              <span class="dash-wo-percent">${progressPercent}%</span>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
  }
}

let _editingChassisId = null;

function renderChassisTable() {
  loadState();
  if (!STATE.chassisRecords) STATE.chassisRecords = [];
  var tbody = document.getElementById("chassis-tbody");
  if (!tbody) return;
  var fieldSelect = document.getElementById("ch-filter-field");
  if (fieldSelect) {
    var distinct = {},
      currentVal = fieldSelect.value;
    STATE.chassisRecords.forEach(function (r) {
      distinct[r.field] = true;
    });
    var keys = Object.keys(distinct).sort();
    fieldSelect.innerHTML =
      '<option value="all">All Fields</option>' +
      keys
        .map(function (k) {
          return (
            '<option value="' +
            k +
            '"' +
            (k === currentVal ? " selected" : "") +
            ">" +
            k +
            "</option>"
          );
        })
        .join("");
  }
  var searchQ = (
    document.getElementById("ch-search-input")?.value || ""
  ).toLowerCase();
  var fieldFilter = fieldSelect ? fieldSelect.value : "all";
  var arrivalFrom =
    document.getElementById("ch-filter-arrival-from")?.value || "";
  var arrivalTo = document.getElementById("ch-filter-arrival-to")?.value || "";
  var filtered = STATE.chassisRecords.filter(function (r) {
    if (fieldFilter !== "all" && r.field !== fieldFilter) return false;
    if (
      searchQ &&
      !r.field.toLowerCase().includes(searchQ) &&
      !r.brand.toLowerCase().includes(searchQ) &&
      !(r.model || "").toLowerCase().includes(searchQ) &&
      !r.chassisNumber.toLowerCase().includes(searchQ) &&
      !r.workOrderId.toLowerCase().includes(searchQ)
    )
      return false;
    if (arrivalFrom && (r.arrivalDate || "") < arrivalFrom) return false;
    if (arrivalTo && (r.arrivalDate || "") > arrivalTo) return false;
    return true;
  });
  tbody.innerHTML =
    filtered.length === 0
      ? '<tr><td colspan="9" style="text-align:center;color:#94A3B8;padding:40px;font-size:0.85rem;">No chassis records found.</td></tr>'
      : filtered
          .map(function (r, i) {
            var rowId = r.id;
            var isEditing = _editingChassisId === rowId;
            if (isEditing) {
              return (
                '<tr id="ch-row-' +
                rowId +
                '">' +
                '<td style="font-weight:700;">' +
                (i + 1) +
                "</td>" +
                '<td><input type="text" id="edit-ch-field-' +
                rowId +
                '" value="' +
                r.field +
                '" style="font-size:0.75rem;padding:4px 6px;width:110px;"></td>' +
                '<td><input type="text" id="edit-ch-brand-' +
                rowId +
                '" value="' +
                (r.brand || r.brandModel || "") +
                '" style="font-size:0.75rem;padding:4px 6px;width:120px;"></td>' +
                '<td><input type="text" id="edit-ch-model-' +
                rowId +
                '" value="' +
                (r.model || "") +
                '" style="font-size:0.75rem;padding:4px 6px;width:120px;"></td>' +
                '<td><input type="text" id="edit-ch-wo-' +
                rowId +
                '" value="' +
                r.workOrderId +
                '" style="font-size:0.75rem;padding:4px 6px;width:130px;"></td>' +
                '<td><input type="text" id="edit-ch-chassis-' +
                rowId +
                '" value="' +
                r.chassisNumber +
                '" style="font-size:0.75rem;padding:4px 6px;width:130px;"></td>' +
                '<td><input type="date" id="edit-ch-date-' +
                rowId +
                '" value="' +
                (r.arrivalDate || "") +
                '" style="font-size:0.75rem;padding:4px 6px;width:110px;"></td>' +
                '<td><input type="date" id="edit-ch-outdate-' +
                rowId +
                '" value="' +
                (r.outDate || "") +
                '" style="font-size:0.75rem;padding:4px 6px;width:110px;"></td>' +
                '<td style="display:flex;gap:4px;">' +
                '<button class="btn btn-primary btn-xs" onclick="saveEditChassis(\'' +
                rowId +
                '\')" style="font-size:0.65rem;padding:3px 10px;font-weight:700;">Save</button>' +
                '<button class="btn btn-outline btn-xs" onclick="cancelEditChassis()" style="font-size:0.65rem;padding:3px 10px;">Cancel</button>' +
                "</td></tr>"
              );
            }
            return (
              "<tr>" +
              '<td style="font-weight:700;">' +
              (i + 1) +
              "</td>" +
              "<td>" +
              r.field +
              "</td>" +
              "<td>" +
              (r.brand || r.brandModel || "—") +
              "</td>" +
              "<td>" +
              (r.model || "—") +
              "</td>" +
              '<td><a href="#" onclick="event.preventDefault();scrollToWo(\'' +
              r.workOrderId +
              '\')" style="color:#3B82F6;font-weight:700;text-decoration:none;">' +
              r.workOrderId +
              "</a></td>" +
              '<td style="font-family:monospace;">' +
              r.chassisNumber +
              "</td>" +
              "<td>" +
              (r.arrivalDate || "—") +
              "</td>" +
              "<td>" +
              (r.outDate || "—") +
              "</td>" +
              '<td style="display:flex;gap:4px;">' +
              '<button class="btn btn-outline btn-xs" onclick="editChassisRecord(\'' +
              rowId +
              '\')" style="font-size:0.65rem;padding:3px 8px;">✏️</button>' +
              '<button class="btn btn-outline btn-xs" onclick="deleteChassisRecord(\'' +
              rowId +
              '\')" style="font-size:0.65rem;padding:3px 8px;color:#DC2626;">🗑</button>' +
              "</td></tr>"
            );
          })
          .join("");
}

window.addChassisInput = function () {
  var container = document.getElementById("ch-chassis-container");
  var row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "6px";
  row.style.marginBottom = "4px";
  row.innerHTML =
    '<input type="text" class="form-control form-control-sm ch-chassis-input" placeholder="VIN / Chassis #" style="font-size:0.75rem;padding:6px 10px;flex:1;max-width:320px;">' +
    '<button type="button" class="btn btn-outline btn-xs" onclick="this.parentElement.remove()" style="font-size:0.65rem;padding:3px 8px;color:#DC2626;font-weight:700;">✕</button>';
  container.appendChild(row);
};

window.addChassisRecord = function () {
  loadState();
  var field = document.getElementById("ch-field-input")?.value.trim();
  var brand = document.getElementById("ch-brand-input")?.value.trim();
  var model = document.getElementById("ch-model-input")?.value.trim();
  var wo = document.getElementById("ch-wo-input")?.value.trim();
  var chassisInputs = document.querySelectorAll(".ch-chassis-input");
  var chassisList = [];
  chassisInputs.forEach(function (inp) {
    var v = inp.value.trim();
    if (v) chassisList.push(v);
  });
  var date =
    document.getElementById("ch-date-input")?.value ||
    new Date().toISOString().split("T")[0];
  var outDate = document.getElementById("ch-outdate-input")?.value || "";
  if (!field || !brand || !wo || chassisList.length === 0) {
    alert(
      "Please fill in all required fields (Field, Brand, Work Order, at least one Chassis Number).",
    );
    return;
  }
  if (!STATE.chassisRecords) STATE.chassisRecords = [];
  var baseId = "CH-" + Date.now();
  var created = [];
  chassisList.forEach(function (cn, i) {
    var id = baseId + "-" + (i + 1);
    STATE.chassisRecords.push({
      id: id,
      field: field,
      brand: brand,
      model: model || "",
      brandModel: brand + (model ? " / " + model : ""),
      workOrderId: wo,
      chassisNumber: cn,
      arrivalDate: date,
      outDate: outDate,
    });
    created.push(cn);
  });
  saveState();
  logSystemActivity(
    "Chassis " + created.join(", ") + " registered under WO " + wo + ".",
  );
  document.getElementById("ch-field-input").value = "";
  document.getElementById("ch-brand-input").value = "";
  document.getElementById("ch-model-input").value = "";
  document.getElementById("ch-wo-input").value = "";
  document.getElementById("ch-chassis-container").innerHTML =
    "" +
    '<div style="display:flex;gap:6px;margin-bottom:4px;">' +
    '<input type="text" class="form-control form-control-sm ch-chassis-input" placeholder="VIN / Chassis #" style="font-size:0.75rem;padding:6px 10px;flex:1;max-width:320px;">' +
    '<button type="button" class="btn btn-outline btn-xs" onclick="addChassisInput()" style="font-size:0.65rem;padding:3px 8px;font-weight:700;white-space:nowrap;">+ More</button>' +
    "</div>";
  document.getElementById("ch-date-input").value = "";
  document.getElementById("ch-outdate-input").value = "";
  renderChassisTable();
  showToastNotification(
    created.length + " chassis record(s) registered successfully.",
  );
};

window.onChassisWoInput = function (val) {
  loadState();
  var container = document.getElementById("ch-wo-suggestions");
  if (!container) return;
  if (!val || val.length < 1) {
    container.style.display = "none";
    return;
  }
  var matches = (STATE.workOrders || [])
    .filter(function (wo) {
      return (
        wo.id.toLowerCase().indexOf(val.toLowerCase()) !== -1 ||
        (wo.customerName || "").toLowerCase().indexOf(val.toLowerCase()) !== -1
      );
    })
    .slice(0, 8);
  if (matches.length === 0) {
    container.style.display = "none";
    return;
  }
  container.innerHTML = matches
    .map(function (wo) {
      return (
        "<div onclick=\"selectChassisWo('" +
        wo.id +
        "','" +
        (wo.customerName || "").replace(/'/g, "\\'") +
        "','" +
        (wo.product || "").replace(/'/g, "\\'") +
        '\')" style="padding:8px 12px;cursor:pointer;font-size:0.75rem;border-bottom:1px solid #F1F5F9;display:flex;justify-content:space-between;">' +
        '<span style="font-weight:700;color:#1E293B;">' +
        wo.id +
        "</span>" +
        '<span style="color:#64748B;">' +
        (wo.customerName || "") +
        " — " +
        (wo.product || "") +
        "</span>" +
        "</div>"
      );
    })
    .join("");
  container.style.display = "block";
};

window.selectChassisWo = function (woId, customer, product) {
  document.getElementById("ch-wo-input").value = woId;
  if (!document.getElementById("ch-field-input").value) {
    document.getElementById("ch-field-input").value = customer || "";
  }
  if (!document.getElementById("ch-brand-input").value) {
    document.getElementById("ch-brand-input").value = product || "";
  }
  document.getElementById("ch-wo-suggestions").style.display = "none";
};

window.editChassisRecord = function (id) {
  _editingChassisId = id;
  renderChassisTable();
};

window.saveEditChassis = function (id) {
  loadState();
  var r = (STATE.chassisRecords || []).find(function (c) {
    return c.id === id;
  });
  if (!r) return;
  r.field = document.getElementById("edit-ch-field-" + id)?.value || r.field;
  r.brand =
    document.getElementById("edit-ch-brand-" + id)?.value || r.brand || "";
  r.model = document.getElementById("edit-ch-model-" + id)?.value || "";
  r.brandModel = r.brand + (r.model ? " / " + r.model : "");
  r.workOrderId =
    document.getElementById("edit-ch-wo-" + id)?.value || r.workOrderId;
  r.chassisNumber =
    document.getElementById("edit-ch-chassis-" + id)?.value || r.chassisNumber;
  r.arrivalDate =
    document.getElementById("edit-ch-date-" + id)?.value || r.arrivalDate;
  r.outDate = document.getElementById("edit-ch-outdate-" + id)?.value || "";
  _editingChassisId = null;
  saveState();
  logSystemActivity("Chassis " + r.chassisNumber + " record updated.");
  renderChassisTable();
};

window.cancelEditChassis = function () {
  _editingChassisId = null;
  renderChassisTable();
};

window.deleteChassisRecord = function (id) {
  if (!confirm("Delete this chassis record?")) return;
  loadState();
  STATE.chassisRecords = (STATE.chassisRecords || []).filter(function (c) {
    return c.id !== id;
  });
  saveState();
  logSystemActivity("Chassis record " + id + " deleted.");
  renderChassisTable();
};

window.scrollToWo = function (woId) {
  var moduleBtn = document.querySelector('[data-module="workorders"]');
  if (moduleBtn) moduleBtn.click();
  setTimeout(function () {
    var woCard = document.querySelector(".wo-card");
    if (woCard) woCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 200);
};

// ------------------------------------------
// 4. DYNAMIC CONFIGURATOR WIZARD ENGINE
// ------------------------------------------

function initQuotationBuilder() {
  // Bind inputs auto-save visual feedback
  const autoSaveInputs = [
    "w-cust-name",
    "w-cust-company",
    "w-cust-gst",
    "w-cust-phone",
    "w-cust-email",
    "w-cust-salesperson",
    "w-cust-model",
    "w-cust-chassis",
    "w-cust-qty",
    "w-cust-address",
    "w-cust-date",
  ];

  autoSaveInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        simulateDraftAutoSave();
      });
    }
  });
}

function startNewQuotationWizard() {
  wizardState = {
    currentStep: 1,
    customer: {},
    category: "",
    subtype: "",
    capacity: "",
    specs: {},
    notRequired: {},
    status: "Draft",
    total: 0,
    orderQty: 1,
    lastConfirmedQty: 1,
    terms: [
      "1) Validity – 15 days",
      "2) Delivery – 2 To 3 weeks from Date of receipt of purchase order and advance payment",
      "3) Freight - Ex Price Hosur,.. Transportation in Customers Scope & is not considered in the above Price",
      "4) Warrantee: Standard warranty against manufacturing defects of 12 Months from the date of delivery. Consumables, Glass & Rubber parts are not covered under the standard warranty",
      "5) Taxes - All taxes & duties will be billed at actual applicable rates, at the time of billing",
      "6) Payment terms – 50% advance and balance Prior to Delivery",
      "7) Inspection: By Nexfra and share the report along with invoice",
    ],
    scopeOfWork: "As Mentioned above",
    bankDetails: {
      companyName: "NEXFRA MANUFACTURING INDIA PVT LTD",
      bankName: "ICICI BANK",
      accountNumber: "060105004477",
      accountType: "CURRENT",
      ifsc: "560229033/ICIC0000156",
    },
  };

  // Reset inputs
  document.getElementById("w-cust-name").value = "";
  document.getElementById("w-cust-company").value = "";
  document.getElementById("w-cust-gst").value = "";
  document.getElementById("w-cust-phone").value = "";
  document.getElementById("w-cust-email").value = "";
  document.getElementById("w-cust-salesperson").value = "";
  document.getElementById("w-cust-model").value = "";
  document.getElementById("w-cust-chassis").value = "";
  document.getElementById("w-cust-qty").value = "1";
  document.getElementById("w-cust-address").value = "";
  document.getElementById("w-cust-date").value = new Date()
    .toISOString()
    .split("T")[0];

  // Reset categories
  document
    .querySelectorAll(".category-card")
    .forEach((c) => c.classList.remove("selected"));
  document.getElementById("btn-cat-next").disabled = true;

  // Reset subtypes
  document
    .querySelectorAll(".subtype-card")
    .forEach((c) => c.classList.remove("selected"));
  document.getElementById("btn-sub-next").disabled = true;
  document.getElementById("capacity-selector-container").style.display = "none";
  document
    .querySelectorAll(".capacity-btn")
    .forEach((b) => b.classList.remove("selected"));
  document.getElementById("capacity-custom-input-wrap").style.display = "none";
  document.getElementById("w-custom-capacity-val").value = "";

  // A new quotation starts with a fresh, enabled Save button.
  resetWizardSaveButton();

  jumpToWizardStep(1);
}

function simulateDraftAutoSave() {
  const ind = document.getElementById("quote-autosave-ind");
  if (ind) {
    ind.style.opacity = "1";
    gsap.fromTo(ind, { scale: 0.95 }, { scale: 1, duration: 0.2 });
    setTimeout(() => {
      gsap.to(ind, { opacity: 0.6, duration: 0.4 });
    }, 1000);
  }
}

window.jumpToWizardStep = function (stepNum) {
  // Simple validation for jumps
  if (stepNum > 1 && !validateStepInputs(1)) {
    return;
  }
  if (stepNum > 2 && !wizardState.category) {
    alert("Please select a Product Category first.");
    return;
  }
  if (stepNum > 3 && !wizardState.subtype) {
    alert("Please select a Sub-product model first.");
    return;
  }

  // Hide all panels
  document.querySelectorAll(".wizard-panel").forEach((panel) => {
    panel.classList.remove("active");
  });

  // Show active panel
  const activePanel = document.getElementById(`wizard-step-${stepNum}-panel`);
  if (activePanel) {
    activePanel.classList.add("active");
  }

  // Update progress tracker nodes
  document.querySelectorAll(".wizard-step-node").forEach((node) => {
    const s = parseInt(node.getAttribute("data-step"), 10);
    node.classList.remove("active", "completed");
    if (s === stepNum) {
      node.classList.add("active");
    } else if (s < stepNum) {
      node.classList.add("completed");
    }
  });

  // Fill progress line width
  const progressFill = document.getElementById("wizard-progress-fill");
  if (progressFill) {
    const widthPercentage = ((stepNum - 1) / 4) * 100;
    progressFill.style.width = `${widthPercentage}%`;
  }

  wizardState.currentStep = stepNum;

  // Render custom section controls when entering configurator
  if (stepNum === 4) {
    const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
    if (template) {
      renderCustomItemSpecControls();
    }
    var qtyInput = document.getElementById("w-order-qty");
    if (qtyInput) qtyInput.value = wizardState.orderQty || 1;
    calculateWizardPricing();
    simulateDraftAutoSave();
  }

  // Compile final sheet if step 5
  if (stepNum === 5) {
    generateQuotationFinalReview();
  }
};

function validateStepInputs(stepNum) {
  if (stepNum === 1) {
    const name = document.getElementById("w-cust-name").value.trim();
    const phone = document.getElementById("w-cust-phone").value.trim();

    if (!name) {
      alert(
        "Customer Name is compulsory. Please enter the Customer Name to continue.",
      );
      document.getElementById("w-cust-name").focus();
      return false;
    }

    if (!phone) {
      alert(
        "Phone Number is compulsory. Please enter the Phone Number to continue.",
      );
      document.getElementById("w-cust-phone").focus();
      return false;
    }

    const company =
      document.getElementById("w-cust-company").value.trim() || name;
    const gst = document.getElementById("w-cust-gst").value.trim() || "URP";
    const email =
      document.getElementById("w-cust-email").value.trim() ||
      "customer@nexfra.in";
    const model =
      document.getElementById("w-cust-model").value.trim() ||
      "Commercial Vehicle";
    const address =
      document.getElementById("w-cust-address").value.trim() ||
      "Hosur, TN, India";

    // Save step 1 to state
    wizardState.customer = {
      name,
      company,
      gst,
      phone,
      email,
      address,
      salesperson:
        document.getElementById("w-cust-salesperson").value.trim() || "",
      model,
      chassis:
        document.getElementById("w-cust-chassis").value.trim() || "NA-CHASSIS",
      qty: parseInt(document.getElementById("w-cust-qty").value, 10) || 1,
      date:
        document.getElementById("w-cust-date").value ||
        new Date().toISOString().split("T")[0],
    };
  }
  return true;
}

window.advanceWizardStep = function (targetStep) {
  if (targetStep > wizardState.currentStep) {
    if (!validateStepInputs(wizardState.currentStep)) return;
  }
  jumpToWizardStep(targetStep);
};

// Step 2 Category select
window.selectProductCategory = function (catKey) {
  wizardState.category = catKey;

  document.querySelectorAll(".category-card").forEach((card) => {
    card.classList.remove("selected");
  });
  document.getElementById(`cat-card-${catKey}`).classList.add("selected");
  document.getElementById("btn-cat-next").disabled = false;

  // Toggle dynamic sub-panels
  document.querySelectorAll(".subtype-grid-group").forEach((grid) => {
    grid.style.display = "none";
  });
  document.getElementById(`subtypes-${catKey}-container`).style.display =
    "grid";

  simulateDraftAutoSave();
};

// Step 3 Subtype select
window.selectProductSubtype = function (subtypeKey) {
  wizardState.subtype = subtypeKey;

  document.querySelectorAll(".subtype-card").forEach((card) => {
    card.classList.remove("selected");
  });
  document.getElementById(`sub-card-${subtypeKey}`).classList.add("selected");

  const capacitySelector = document.getElementById(
    "capacity-selector-container",
  );
  if (subtypeKey === "boxbody" || subtypeKey === "rockbody") {
    capacitySelector.style.display = "block";
    // Clear capacity until clicked
    wizardState.capacity = "";
    document
      .querySelectorAll(".capacity-btn")
      .forEach((b) => b.classList.remove("selected"));
    document.getElementById("btn-sub-next").disabled = true;
  } else {
    capacitySelector.style.display = "none";
    wizardState.capacity = "NA";
    document.getElementById("btn-sub-next").disabled = false;
    loadDefaultSpecsForSubtype(subtypeKey);
  }

  simulateDraftAutoSave();
};

// Step 3.5 capacity select
window.selectChassisCapacity = function (capValue) {
  wizardState.capacity = capValue;

  document.querySelectorAll(".capacity-btn").forEach((btn) => {
    btn.classList.remove("selected");
  });

  if (capValue === "Custom") {
    document.getElementById("cap-btn-custom").classList.add("selected");
    document.getElementById("capacity-custom-input-wrap").style.display =
      "block";
    document.getElementById("btn-sub-next").disabled = true; // Wait for custom input value
  } else {
    document
      .getElementById(`cap-btn-${capValue.split(" ")[0]}`)
      .classList.add("selected");
    document.getElementById("capacity-custom-input-wrap").style.display =
      "none";
    document.getElementById("btn-sub-next").disabled = false;
    loadDefaultSpecsForSubtype(wizardState.subtype);
  }

  simulateDraftAutoSave();
};

window.updateCustomCapacityValue = function () {
  const customVal = document.getElementById("w-custom-capacity-val").value;
  if (customVal.trim().length > 0) {
    wizardState.capacity = `${customVal} CBM (Custom)`;
    document.getElementById("btn-sub-next").disabled = false;
    loadDefaultSpecsForSubtype(wizardState.subtype);
  } else {
    document.getElementById("btn-sub-next").disabled = true;
  }
};

// Step 4 Load Default specs
function loadDefaultSpecsForSubtype(subtypeKey) {
  const template = WIZARD_PRODUCT_TEMPLATES[subtypeKey];
  if (!template) return;

  // Apply persisted spec overrides for this subtype group
  applyProductTemplateOverrides(template, subtypeKey);

  // Initialize specs with defaults (built-in)
  wizardState.specs = {};
  wizardState.notRequired = {};
  template.specs.forEach((spec) => {
    wizardState.specs[spec.id] = spec.defaultValue;
  });

  // Initialize custom item specs with defaults
  const customSections = getCustomItemSpecs();
  customSections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.defaultValue) {
        wizardState.specs[field.id] = field.defaultValue;
      }
    });
  });

  // Inject Form Controls into sections
  renderConfiguratorFormInputs(template);
  calculateWizardPricing();
}

function getEffectiveSpecPriceDiff(spec, opt) {
  if (!spec || !opt) return 0;

  const customOpts = getCustomFieldOptions(spec.id);
  if (customOpts.length > 0) {
    const match = customOpts.find((c) => c.name === opt);
    if (match) return match.priceDiff;
  }

  let diff =
    spec.priceDiffs && spec.priceDiffs[opt] !== undefined
      ? spec.priceDiffs[opt]
      : 0;

  if (
    spec.id === "floor" &&
    opt.includes("6mm") &&
    STATE.adminPricing &&
    STATE.adminPricing.floor6 !== undefined
  )
    diff = STATE.adminPricing.floor6;
  if (
    spec.id === "floor" &&
    opt.includes("10mm") &&
    STATE.adminPricing &&
    STATE.adminPricing.floor10 !== undefined
  )
    diff = STATE.adminPricing.floor10;
  if (
    spec.id === "beam" &&
    opt.includes("Hardox") &&
    STATE.adminPricing &&
    STATE.adminPricing.steelHardox !== undefined
  )
    diff = STATE.adminPricing.steelHardox;
  if (
    spec.id === "axles" &&
    opt.includes("2x13T") &&
    STATE.adminPricing &&
    STATE.adminPricing.axle2 !== undefined
  )
    diff = STATE.adminPricing.axle2;
  if (
    spec.id === "axles" &&
    opt.includes("3x16T") &&
    STATE.adminPricing &&
    STATE.adminPricing.axle3_16 !== undefined
  )
    diff = STATE.adminPricing.axle3_16;

  return diff;
}

function renderConfiguratorFormInputs(template) {
  const sections = [
    "material",
    "chassis",
    "hydraulic",
    "painting",
    "accessories",
    "dimensions",
    "subframe",
  ];

  sections.forEach((secId) => {
    const container = document.getElementById(`specs-${secId}-controls-inject`);
    if (!container) return;

    // Filter specs for this section
    const secSpecs = template.specs.filter((s) => s.section === secId);

    // Hide entire section wrapper if no specs exist for this section
    const secWrapper = document.getElementById(`spec-sec-${secId}`);

    if (secSpecs.length === 0) {
      if (secWrapper && secId !== "dimensions")
        secWrapper.style.display = "none";
      return;
    }

    if (secWrapper) secWrapper.style.display = "";

    container.innerHTML = secSpecs
      .map((spec) => {
        const isNr = !!wizardState.notRequired[spec.id];
        const nrBadgeHtml = `<span class="nr-badge${isNr ? " active" : ""}" id="nr-badge-${spec.id}" onclick="toggleFieldRequired('${spec.id}')">${isNr ? "Not Required" : "Required"}</span>`;
        let controlHtml = "";

        const rawOpts =
          spec.options && Array.isArray(spec.options) && spec.options.length > 0
            ? spec.options
            : spec.priceDiffs && Object.keys(spec.priceDiffs).length > 0
              ? Object.keys(spec.priceDiffs)
              : ["Standard", "Custom"];

        const hasCustom = rawOpts.some(
          (o) => typeof o === "string" && o.toLowerCase() === "custom",
        );

        const allOpts = [
          ...rawOpts.filter(
            (o) => typeof o === "string" && o.toLowerCase() !== "custom",
          ),
        ];
        const selectedVal =
          wizardState.specs[spec.id] !== undefined
            ? wizardState.specs[spec.id]
            : spec.defaultValue;
        if (wizardState.specs[spec.id] === undefined) {
          wizardState.specs[spec.id] = selectedVal;
        }

        if (spec.type === "dropdown") {
          controlHtml = `
          <select id="w-spec-${spec.id}" class="form-control" onchange="onSpecChange('${spec.id}', this.value)" ${isNr ? "disabled" : ""} style="width:100%; font-weight:600; min-height:42px; padding:8px 12px; line-height:1.4; box-sizing:border-box;">
            ${allOpts
              .map((opt) => {
                const diff = getEffectiveSpecPriceDiff(spec, opt);
                return `<option value="${opt}" ${opt === selectedVal ? "selected" : ""}>
                ${opt} ${diff !== 0 ? `(${diff > 0 ? "+" : ""}₹${diff.toLocaleString("en-IN")})` : diff === 0 ? "" : "(Included)"}
              </option>`;
              })
              .join("")}
            ${hasCustom ? `<option value="Custom" ${selectedVal === "Custom" ? "selected" : ""}>Custom</option>` : ""}
          </select>
        `;
        } else if (spec.type === "radio") {
          controlHtml = `
          <div class="radio-group" style="display:flex; flex-wrap:wrap; gap:10px; margin-top:6px;">
            ${allOpts
              .map((opt, i) => {
                const diff = getEffectiveSpecPriceDiff(spec, opt);
                return `
                <label class="radio-label" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:0.825rem; font-weight:600; color:#334155; background:#F8FAFC; padding:6px 12px; border-radius:6px; border:1px solid #CBD5E1;">
                  <input type="radio" name="w-spec-radio-${spec.id}" value="${opt}" ${opt === selectedVal ? "checked" : ""} onchange="onSpecChange('${spec.id}', this.value)" ${isNr ? "disabled" : ""}>
                  ${opt} ${diff !== 0 ? `<span style="font-size:0.75rem; color:#64748B;">(${diff > 0 ? "+" : ""}₹${diff.toLocaleString("en-IN")})</span>` : ""}
                </label>
              `;
              })
              .join("")}
            ${
              hasCustom
                ? `
              <label class="radio-label" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:0.825rem; font-weight:600; color:#334155; background:#F8FAFC; padding:6px 12px; border-radius:6px; border:1px solid #CBD5E1;">
                <input type="radio" name="w-spec-radio-${spec.id}" value="Custom" ${selectedVal === "Custom" ? "checked" : ""} onchange="onSpecChange('${spec.id}', this.value)" ${isNr ? "disabled" : ""}>
                Custom
              </label>
            `
                : ""
            }
          </div>
        `;
        } else if (spec.type === "checkbox") {
          const checkboxOpts =
            allOpts && allOpts.length > 0 ? allOpts : ["Yes", "No"];
          controlHtml = `
          <div class="checkbox-group" style="display:flex; flex-wrap:wrap; gap:10px; margin-top:6px;">
            ${checkboxOpts
              .map((opt) => {
                const isChecked = selectedVal === opt;
                const pd = getEffectiveSpecPriceDiff(spec, opt);
                return `
                <label class="checkbox-label" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:0.825rem; font-weight:600; color:#334155; background:#F8FAFC; padding:6px 12px; border-radius:6px; border:1px solid #CBD5E1;">
                  <input type="radio" name="w-spec-radio-${spec.id}" value="${opt}" ${isChecked ? "checked" : ""} onchange="onSpecChange('${spec.id}', this.value)" ${isNr ? "disabled" : ""}>
                  ${opt} ${pd !== 0 ? `<span style="font-size:0.75rem; color:#64748B;">(${pd > 0 ? "+" : ""}₹${pd.toLocaleString("en-IN")})</span>` : ""}
                </label>
              `;
              })
              .join("")}
          </div>
        `;
        } else if (spec.type === "text") {
          controlHtml = `
          <input type="text" id="w-spec-${spec.id}" class="form-control" value="${selectedVal}" placeholder="e.g. Golden Green, Nippon PU Paint" oninput="updateSpecValueState('${spec.id}', this.value)" ${isNr ? "disabled" : ""} style="width:100%; font-weight:600; min-height:42px; padding:8px 12px; line-height:1.4; box-sizing:border-box; margin-top:4px;">
        `;
        }

        return `
        <div class="spec-control-group" style="margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <label style="font-size:0.8rem; font-weight:700; color:#1E293B; margin:0;">${spec.name}</label>
            ${nrBadgeHtml}
          </div>
          ${controlHtml}
        </div>
      `;
      })
      .join("");
  });

  // Render Dimensions section (Length, Height, Width) with Numeric Inputs & Unit Dropdowns
  const dimsContainer = document.getElementById(
    "specs-dimensions-controls-inject",
  );
  if (dimsContainer && template.dimensions) {
    const parseDim = (dimStr, defaultUnit) => {
      if (!dimStr || dimStr.toUpperCase() === "NA")
        return { num: "NA", unit: "NA" };
      const match = String(dimStr)
        .trim()
        .match(/^([\d.]+)\s*(.*)$/);
      if (match) {
        return { num: match[1], unit: match[2] || defaultUnit };
      }
      return { num: dimStr, unit: defaultUnit };
    };

    const lenObj = parseDim(template.dimensions.length, "Feet");
    const hgtObj = parseDim(template.dimensions.height, "Feet");
    const wdtObj = parseDim(template.dimensions.width, "Inches");

    dimsContainer.innerHTML = `
      <div class="spec-control-group" style="grid-column: span 2; background:#F8FAFC; padding:16px; border-radius:8px; border:1px solid #CBD5E1;">
        <h4 style="margin:0 0 12px 0; font-size:0.85rem; font-weight:700; color:#1E293B; display:flex; align-items:center; gap:6px;">
          📏 Product Dimensions (Easy Numeric Entry)
        </h4>

        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:14px;">
          <!-- LENGTH -->
          <div>
            <label style="font-size:0.775rem; font-weight:700; color:#334155; display:block; margin-bottom:6px;">Overall Length</label>
            <div style="display:flex; gap:4px;">
              <input type="number" step="0.1" id="w-dim-length-num" class="form-control" value="${lenObj.num}" placeholder="40" oninput="updateDimFullValue('length')" style="font-weight:700; height:38px;">
              <select id="w-dim-length-unit" class="form-control" onchange="updateDimFullValue('length')" style="width:90px; font-weight:600; padding:6px 20px 6px 8px; height:38px; min-height:38px;">
                <option value="Feet" ${lenObj.unit.includes("Feet") ? "selected" : ""}>Feet</option>
                <option value="Meters" ${lenObj.unit.includes("Meter") ? "selected" : ""}>Meters</option>
                <option value="Inches" ${lenObj.unit.includes("Inch") ? "selected" : ""}>Inches</option>
                <option value="mm" ${lenObj.unit.includes("mm") ? "selected" : ""}>mm</option>
              </select>
            </div>
            <div style="display:flex; gap:4px; margin-top:6px; flex-wrap:wrap;">
              <button type="button" class="btn btn-outline btn-xs" onclick="setDimPreset('length', 20, 'Feet')" style="padding:2px 6px; font-size:0.7rem;">20ft</button>
              <button type="button" class="btn btn-outline btn-xs" onclick="setDimPreset('length', 28, 'Feet')" style="padding:2px 6px; font-size:0.7rem;">28ft</button>
              <button type="button" class="btn btn-outline btn-xs" onclick="setDimPreset('length', 30, 'Feet')" style="padding:2px 6px; font-size:0.7rem;">30ft</button>
              <button type="button" class="btn btn-outline btn-xs" onclick="setDimPreset('length', 32, 'Feet')" style="padding:2px 6px; font-size:0.7rem;">32ft</button>
              <button type="button" class="btn btn-outline btn-xs" onclick="setDimPreset('length', 40, 'Feet')" style="padding:2px 6px; font-size:0.7rem;">40ft</button>
            </div>
            <input type="hidden" id="w-dim-length" value="${template.dimensions.length}">
          </div>

          <!-- HEIGHT -->
          <div>
            <label style="font-size:0.775rem; font-weight:700; color:#334155; display:block; margin-bottom:6px;">Side Wall Height</label>
            <div style="display:flex; gap:4px;">
              <input type="text" id="w-dim-height-num" class="form-control" value="${hgtObj.num}" placeholder="4.5" oninput="updateDimFullValue('height')" style="font-weight:700; height:38px;">
              <select id="w-dim-height-unit" class="form-control" onchange="updateDimFullValue('height')" style="width:90px; font-weight:600; padding:6px 20px 6px 8px; height:38px; min-height:38px;">
                <option value="Feet" ${hgtObj.unit.includes("Feet") ? "selected" : ""}>Feet</option>
                <option value="Inches" ${hgtObj.unit.includes("Inch") ? "selected" : ""}>Inches</option>
                <option value="Meters" ${hgtObj.unit.includes("Meter") ? "selected" : ""}>Meters</option>
                <option value="NA" ${hgtObj.num === "NA" || hgtObj.unit === "NA" ? "selected" : ""}>NA</option>
              </select>
            </div>
            <div style="display:flex; gap:4px; margin-top:6px; flex-wrap:wrap;">
              <button type="button" class="btn btn-outline btn-xs" onclick="setDimPreset('height', 'NA', 'NA')" style="padding:2px 6px; font-size:0.7rem;">N/A</button>
              <button type="button" class="btn btn-outline btn-xs" onclick="setDimPreset('height', 4.0, 'Feet')" style="padding:2px 6px; font-size:0.7rem;">4.0ft</button>
              <button type="button" class="btn btn-outline btn-xs" onclick="setDimPreset('height', 4.5, 'Feet')" style="padding:2px 6px; font-size:0.7rem;">4.5ft</button>
              <button type="button" class="btn btn-outline btn-xs" onclick="setDimPreset('height', 5.0, 'Feet')" style="padding:2px 6px; font-size:0.7rem;">5.0ft</button>
            </div>
            <input type="hidden" id="w-dim-height" value="${template.dimensions.height}">
          </div>

          <!-- WIDTH -->
          <div>
            <label style="font-size:0.775rem; font-weight:700; color:#334155; display:block; margin-bottom:6px;">Overall Width</label>
            <div style="display:flex; gap:4px;">
              <input type="number" step="0.5" id="w-dim-width-num" class="form-control" value="${wdtObj.num}" placeholder="98" oninput="updateDimFullValue('width')" style="font-weight:700; height:38px;">
              <select id="w-dim-width-unit" class="form-control" onchange="updateDimFullValue('width')" style="width:95px; font-weight:600; padding:6px 20px 6px 8px; height:38px; min-height:38px;">
                <option value="Inches" ${wdtObj.unit.includes("Inch") ? "selected" : ""}>Inches</option>
                <option value="Feet" ${wdtObj.unit.includes("Feet") ? "selected" : ""}>Feet</option>
                <option value="mm" ${wdtObj.unit.includes("mm") ? "selected" : ""}>mm</option>
              </select>
            </div>
            <div style="display:flex; gap:4px; margin-top:6px; flex-wrap:wrap;">
              <button type="button" class="btn btn-outline btn-xs" onclick="setDimPreset('width', 96, 'Inches')" style="padding:2px 6px; font-size:0.7rem;">96 in</button>
              <button type="button" class="btn btn-outline btn-xs" onclick="setDimPreset('width', 98, 'Inches')" style="padding:2px 6px; font-size:0.7rem;">98 in (Std)</button>
              <button type="button" class="btn btn-outline btn-xs" onclick="setDimPreset('width', 102, 'Inches')" style="padding:2px 6px; font-size:0.7rem;">102 in</button>
            </div>
            <input type="hidden" id="w-dim-width" value="${template.dimensions.width}">
          </div>
        </div>
      </div>
    `;
  }

  window.updateDimFullValue = function (dimType) {
    const numInp = document.getElementById(`w-dim-${dimType}-num`);
    const unitSelect = document.getElementById(`w-dim-${dimType}-unit`);
    const hiddenInp = document.getElementById(`w-dim-${dimType}`);

    if (!hiddenInp) return;

    const num = numInp ? numInp.value.trim() : "";
    const unit = unitSelect ? unitSelect.value : "";

    if (!num || num.toUpperCase() === "NA" || unit === "NA") {
      hiddenInp.value = "NA";
      if (numInp) numInp.value = "NA";
      if (unitSelect) unitSelect.value = "NA";
    } else {
      hiddenInp.value = `${num} ${unit}`;
    }

    simulateDraftAutoSave();
  };

  window.setDimPreset = function (dimType, numVal, unitVal) {
    const numInp = document.getElementById(`w-dim-${dimType}-num`);
    const unitSelect = document.getElementById(`w-dim-${dimType}-unit`);

    if (numInp) numInp.value = numVal;
    if (unitSelect) unitSelect.value = unitVal;

    updateDimFullValue(dimType);
  };

  // Render Custom Item Sections
  renderCustomItemSpecControls();
}

function renderCustomItemSpecControls() {
  const customSections = getCustomItemSpecs();

  // Ensure a container for custom sections exists
  let customContainer = document.getElementById("specs-custom-controls-inject");
  if (!customContainer) {
    // Create a container right after the dimensions section
    const dimsSec = document.getElementById("spec-sec-dimensions");
    if (dimsSec) {
      const containerDiv = document.createElement("div");
      containerDiv.id = "specs-custom-controls-inject";
      dimsSec.parentNode.insertBefore(containerDiv, dimsSec.nextSibling);
    }
    customContainer = document.getElementById("specs-custom-controls-inject");
  }
  if (!customContainer) return;

  if (!customSections || customSections.length === 0) {
    customContainer.innerHTML = "";
    return;
  }

  customContainer.innerHTML = customSections
    .map((section, secIdx) => {
      const secId = `spec-sec-custom-${section.id}`;

      const fieldsHtml = section.fields
        .map((field) => {
          const selectedVal =
            wizardState.specs[field.id] || field.defaultValue || "";
          if (wizardState.specs[field.id] === undefined && field.defaultValue) {
            wizardState.specs[field.id] = field.defaultValue;
          }
          const isNr = !!wizardState.notRequired[field.id];
          const nrBadgeHtml = `<span class="nr-badge${isNr ? " active" : ""}" id="nr-badge-${field.id}" onclick="toggleFieldRequired('${field.id}')">${isNr ? "Not Required" : "Required"}</span>`;
          let controlHtml = "";

          const hasCustom =
            field.options &&
            field.options.some((o) => o.toLowerCase() === "custom");

          const allOpts = [
            ...(field.options || []).filter(
              (o) => o.toLowerCase() !== "custom",
            ),
          ];

          if (field.type === "dropdown") {
            controlHtml = `
          <select id="w-spec-${field.id}" class="form-control" onchange="onSpecChange('${field.id}', this.value)" ${isNr ? "disabled" : ""}>
            ${allOpts
              .map((opt) => {
                const diff =
                  field.priceDiffs && field.priceDiffs[opt] !== undefined
                    ? field.priceDiffs[opt]
                    : 0;
                return `<option value="${opt}" ${opt === selectedVal ? "selected" : ""}>
                ${opt} ${diff !== 0 ? `(${diff > 0 ? "+" : ""}₹${diff.toLocaleString("en-IN")})` : ""}
              </option>`;
              })
              .join("")}
            ${hasCustom ? `<option value="Custom" ${selectedVal === "Custom" ? "selected" : ""}>Custom</option>` : ""}
          </select>
        `;
          } else if (field.type === "radio") {
            controlHtml = `
          <div class="radio-group">
            ${allOpts
              .map((opt, i) => {
                const diff =
                  field.priceDiffs && field.priceDiffs[opt] !== undefined
                    ? field.priceDiffs[opt]
                    : 0;
                return `
                <label class="radio-label">
                  <input type="radio" name="w-spec-radio-${field.id}" value="${opt}" ${opt === selectedVal ? "checked" : ""} onchange="onSpecChange('${field.id}', this.value)" ${isNr ? "disabled" : ""}>
                  ${opt} ${diff !== 0 ? `<span style="font-size:0.75rem;color:var(--color-text-muted);">(${diff > 0 ? "+" : ""}₹${diff.toLocaleString("en-IN")})</span>` : ""}
                </label>
              `;
              })
              .join("")}
            ${
              hasCustom
                ? `
              <label class="radio-label">
                <input type="radio" name="w-spec-radio-${field.id}" value="Custom" ${selectedVal === "Custom" ? "checked" : ""} onchange="onSpecChange('${field.id}', this.value)" ${isNr ? "disabled" : ""}>
                Custom
              </label>
            `
                : ""
            }
          </div>
        `;
          } else if (field.type === "number") {
            controlHtml = `
          <input type="number" id="w-spec-${field.id}" class="form-control" value="${selectedVal}" oninput="updateSpecValueState('${field.id}', this.value)" ${isNr ? "disabled" : ""}>
        `;
          } else {
            // text type (default)
            controlHtml = `
          <input type="text" id="w-spec-${field.id}" class="form-control" value="${selectedVal}" oninput="updateSpecValueState('${field.id}', this.value)" ${isNr ? "disabled" : ""}>
        `;
          }

          return `
        <div class="spec-control-group">
          <label style="font-size:0.775rem;font-weight:600;color:var(--color-text-dark);">
            ${field.name}
            <span class="aci-section-tag" style="margin-left:6px;">${field.type}</span>
            ${nrBadgeHtml}
          </label>
          ${controlHtml}
        </div>
      `;
        })
        .join("");

      if (!fieldsHtml) return "";

      return `
      <div class="collapsible-section" id="${secId}" style="margin-top:16px;">
        <div class="collapse-header" onclick="toggleCollapseSection('${secId}')">
          <span>${section.name} <span class="aci-section-tag">Custom</span></span>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="nr-badge" id="nr-badge-sec-${section.id}" onclick="event.stopPropagation();toggleSectionRequired('${secId}')">Section Required</span>
            <svg class="collapse-header-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <div class="collapse-content">
          <div class="spec-grid-control">
            ${fieldsHtml}
          </div>
        </div>
      </div>
    `;
    })
    .filter(Boolean)
    .join("");
}

window.toggleCollapseSection = function (secId) {
  const el = document.getElementById(secId);
  if (el) {
    el.classList.toggle("collapsed");
  }
};

window.updateSpecValueState = function (specId, val) {
  wizardState.specs[specId] = val;
  calculateWizardPricing();
  simulateDraftAutoSave();
};

window.onSpecChange = function (specId, val) {
  updateSpecValueState(specId, val);
  const details = document.getElementById(`custom-details-${specId}`);
  if (details) {
    details.style.display = val === "Custom" ? "flex" : "none";
  }
};

window.updateSpecCustomDesc = function (specId, val) {
  wizardState.specs[specId + "_custom_desc"] = val;
  calculateWizardPricing();
  simulateDraftAutoSave();
};

window.updateSpecCustomPrice = function (specId, val) {
  wizardState.specs[specId + "_custom_price"] = parseFloat(val) || 0;
  calculateWizardPricing();
  simulateDraftAutoSave();
};

function getCustomOptPriceDiff(specId, optName) {
  const opts = getCustomFieldOptions(specId);
  if (!opts) return 0;
  const match = opts.find((c) => c.name === optName);
  return match ? match.priceDiff : 0;
}

function getCustomFieldKey(specId) {
  return (wizardState.subtype || "default") + "_" + specId;
}

function getCustomFieldOptions(specId) {
  return (
    STATE.adminPricing?.customFieldOptions?.[getCustomFieldKey(specId)] || []
  );
}

window.toggleFieldRequired = function (specId) {
  const wasNotRequired = wizardState.notRequired[specId];
  if (wasNotRequired) {
    delete wizardState.notRequired[specId];
  } else {
    wizardState.notRequired[specId] = true;
  }
  const badge = document.getElementById(`nr-badge-${specId}`);
  const control = document.getElementById(`w-spec-${specId}`);
  if (badge) {
    badge.classList.toggle("active");
    badge.textContent = badge.classList.contains("active")
      ? "Not Required"
      : "Required";
  }
  if (control) {
    control.disabled = badge.classList.contains("active");
  }
  const radios = document.querySelectorAll(
    `input[name="w-spec-radio-${specId}"]`,
  );
  radios.forEach((r) => (r.disabled = badge.classList.contains("active")));
  updateSectionNrBadgeFromFields(specId);
  calculateWizardPricing();
  simulateDraftAutoSave();
};

window.toggleSectionRequired = function (sectionId) {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) return;
  const secName = sectionId.replace("spec-sec-", "");
  const secSpecs = template.specs.filter((s) => s.section === secName);
  if (secSpecs.length === 0) return;

  const allNr = secSpecs.every((s) => wizardState.notRequired[s.id]);
  const newState = !allNr;

  secSpecs.forEach((spec) => {
    if (newState) {
      wizardState.notRequired[spec.id] = true;
    } else {
      delete wizardState.notRequired[spec.id];
    }
    const badge = document.getElementById(`nr-badge-${spec.id}`);
    const control = document.getElementById(`w-spec-${spec.id}`);
    if (badge) {
      badge.classList.toggle("active", newState);
      badge.textContent = newState ? "Not Required" : "Required";
    }
    if (control) {
      control.disabled = newState;
    }
    const radios = document.querySelectorAll(
      `input[name="w-spec-radio-${spec.id}"]`,
    );
    radios.forEach((r) => (r.disabled = newState));
  });

  const secBadge = document.getElementById(`nr-badge-sec-${secName}`);
  if (secBadge) {
    secBadge.classList.toggle("active", newState);
    secBadge.textContent = newState
      ? "Section Not Required"
      : "Section Required";
  }

  const isCustom = sectionId.startsWith("spec-sec-custom-");
  if (isCustom) {
    const customSections = getCustomItemSpecs();
    const section = customSections.find(
      (s) => `spec-sec-custom-${s.id}` === sectionId,
    );
    if (section) {
      section.fields.forEach((field) => {
        if (newState) {
          wizardState.notRequired[field.id] = true;
        } else {
          delete wizardState.notRequired[field.id];
        }
        const badge = document.getElementById(`nr-badge-${field.id}`);
        const control = document.getElementById(`w-spec-${field.id}`);
        if (badge) {
          badge.classList.toggle("active", newState);
          badge.textContent = newState ? "Not Required" : "Required";
        }
        if (control) {
          control.disabled = newState;
        }
        const radios = document.querySelectorAll(
          `input[name="w-spec-radio-${field.id}"]`,
        );
        radios.forEach((r) => (r.disabled = newState));
      });
    }
  }

  calculateWizardPricing();
  simulateDraftAutoSave();
};

function updateSectionNrBadgeFromFields(specId) {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) return;
  const spec = template.specs.find((s) => s.id === specId);
  if (!spec) return;
  const secName = spec.section;
  const secSpecs = template.specs.filter((s) => s.section === secName);
  if (secSpecs.length === 0) return;
  const allNr = secSpecs.every((s) => wizardState.notRequired[s.id]);
  const anyNr = secSpecs.some((s) => wizardState.notRequired[s.id]);
  const secBadge = document.getElementById(`nr-badge-sec-${secName}`);
  if (secBadge) {
    secBadge.classList.toggle("active", allNr);
    secBadge.textContent = allNr
      ? "Section Not Required"
      : anyNr
        ? "Mixed"
        : "Section Required";
  }
}

// -------------------------------------------------------
// OPTION CHOICE ROW HELPERS (shared across modals)
// -------------------------------------------------------
function ensureCustomItemDefinitions() {
  if (!STATE.customItemDefinitions) STATE.customItemDefinitions = [];
}

window.addOptionChoiceRow = function (
  fieldRowId,
  defaultName = "",
  defaultPrice = 0,
  isDefault = false,
) {
  const table = document.getElementById(`aci-opt-table-${fieldRowId}`);
  if (!table) return;

  const choiceId = `opt-choice-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const html = `
    <div class="aci-opt-choice-row" id="${choiceId}" style="display:grid; grid-template-columns: 2fr 1.2fr 80px 32px; gap:8px; align-items:center; background:#FFFFFF; padding:8px 10px; border-radius:6px; border:1px solid #CBD5E1; margin-bottom:6px;">
      <div>
        <span style="font-size:0.7rem; font-weight:600; color:#64748B; display:block;">Option / Choice Name</span>
        <input type="text" class="form-control form-control-sm aci-opt-name" placeholder="e.g. Air Suspension, Fuwa 3x13T" value="${defaultName}">
      </div>
      <div>
        <span style="font-size:0.7rem; font-weight:600; color:#64748B; display:block;">Price Diff (₹)</span>
        <div style="display:flex; align-items:center; gap:2px;">
          <span style="font-size:0.75rem; color:#64748B;">₹</span>
          <input type="number" class="form-control form-control-sm aci-opt-price" placeholder="0" value="${defaultPrice}">
        </div>
      </div>
      <div style="text-align:center;">
        <span style="font-size:0.7rem; font-weight:600; color:#64748B; display:block;">Default</span>
        <input type="radio" name="default-opt-${fieldRowId}" class="aci-opt-is-default" ${isDefault ? "checked" : ""} style="cursor:pointer;">
      </div>
      <div>
        <button type="button" onclick="removeOptionChoiceRow('${choiceId}')" style="background:none; border:none; color:#EF4444; cursor:pointer; padding:4px;" title="Remove Option">
          <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `;
  table.insertAdjacentHTML("beforeend", html);
};

window.removeOptionChoiceRow = function (choiceId) {
  const row = document.getElementById(choiceId);
  if (row) row.remove();
};

function extractFieldOptionsAndPrices(fieldRowEl, fieldRowId) {
  const choiceRows = fieldRowEl.querySelectorAll(".aci-opt-choice-row");
  let options = [];
  let priceDiffs = {};
  let defaultVal = "";

  choiceRows.forEach((cRow) => {
    const optName = cRow.querySelector(".aci-opt-name")?.value.trim();
    const optPrice =
      parseFloat(cRow.querySelector(".aci-opt-price")?.value) || 0;
    const isDefault = cRow.querySelector(".aci-opt-is-default")?.checked;

    if (optName) {
      options.push(optName);
      priceDiffs[optName] = optPrice;
      if (isDefault || !defaultVal) {
        defaultVal = optName;
      }
    }
  });

  return { options, priceDiffs, defaultVal };
}

window.toggleFieldOptionsInput = function (select) {
  const row = select.closest(".aci-field-row");
  const optsContainer = row.querySelector(".aci-options-builder-container");
  const defaultTextGroup = row.querySelector(".aci-default-text-group");

  if (select.value === "text" || select.value === "checkbox") {
    if (optsContainer) optsContainer.style.display = "none";
    if (defaultTextGroup) defaultTextGroup.style.display = "block";
  } else {
    if (optsContainer) optsContainer.style.display = "block";
    if (defaultTextGroup) defaultTextGroup.style.display = "none";
  }
};

// Render custom sections in the configurator
function getCustomItemSpecs() {
  loadState();
  ensureCustomItemDefinitions();
  return STATE.customItemDefinitions || [];
}

function resolveSpecName(k, template) {
  if (template) {
    var si = template.specs.find(function (s) {
      return s.id === k;
    });
    if (si) return si.name;
  }
  var customSections = getCustomItemSpecs();
  for (var ci = 0; ci < customSections.length; ci++) {
    var fields = customSections[ci].fields || [];
    for (var fi = 0; fi < fields.length; fi++) {
      if (fields[fi].id === k) return fields[fi].name;
    }
  }
  return k;
}

// -------------------------------------------------------
// EDIT COMPONENTS MODAL — Unified Editor for All Sections
// -------------------------------------------------------

window.openEditComponentsModal = function () {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) {
    alert("Please select a product category & subtype first.");
    return;
  }

  const container = document.getElementById("edit-components-modal-body");
  if (!container) return;

  // Group specs by section
  const sectionOrder = [
    "material",
    "chassis",
    "hydraulic",
    "painting",
    "accessories",
    "dimensions",
    "subframe",
  ];
  const sectionNames = {
    material: "Steel Sheets & Material Grade",
    chassis: "Structural Axil & Suspension",
    hydraulic: "Tipping Hydraulics & Cylinder Kit",
    painting: "Primer, Coatings & Finishing Colour",
    accessories: "Fitted Accessories & Safety Marker Lights",
    dimensions: "Product Dimensions (Feet/Inches)",
    subframe: "Subframe",
  };

  const sections = {};
  template.specs.forEach((spec) => {
    const sec = spec.section || "general";
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(spec);
  });

  // Add custom sections from STATE.customItemDefinitions
  const customSections = getCustomItemSpecs();
  customSections.forEach((cs) => {
    const secId = `custom-${cs.id}`;
    sections[secId] = cs.fields.map((f, i) => ({
      id: f.id,
      name: f.name,
      section: secId,
      type: f.type,
      options: f.options || [],
      defaultValue: f.defaultValue || "",
      priceDiffs: f.priceDiffs || {},
      _customSectionName: cs.name,
    }));
  });

  let html = `
    <div style="margin-bottom:16px; padding:12px; background:#EFF6FF; border-left:4px solid #3B82F6; border-radius:6px;">
      <h4 style="margin:0; font-size:0.85rem; color:#1E40AF;">Editing Components for: <strong>${template.name}</strong></h4>
      <p style="margin:4px 0 0 0; font-size:0.75rem; color:#1D4ED8;">Add, edit, or remove sections and specs. Each spec can be a dropdown, radio, checkbox, or text field with custom options and pricing.</p>
    </div>
    <div style="margin-bottom:16px; padding:12px 16px; background:#FFF7ED; border:1.5px solid #FDBA74; border-radius:8px; display:flex; align-items:center; gap:12px;">
      <label style="font-size:0.85rem; font-weight:700; color:#9A3412; white-space:nowrap;">Metal Price (₹/kg)</label>
      <input type="text" id="ec-metal-price" class="form-control form-control-sm" value="${STATE.metalPricePerKg || 100}" step="1" min="1" inputmode="decimal" oninput="this.value=this.value.replace(/[^0-9.]/g,'')" style="width:120px; text-align:right; font-weight:700; border:1px solid #FDBA74;">
      <span style="font-size:0.75rem; color:#9A3412;">Used as the per-kilogram rate for steel and raw material costing.</span>
    </div>
    <div id="ec-sections-container">
  `;

  // Render built-in sections
  sectionOrder.forEach((secId) => {
    const specs = sections[secId] || [];
    if ((secId === "dimensions" || secId === "subframe") && !specs.length)
      return;
    const displayName = sectionNames[secId] || secId;
    html += buildEditSectionCard(secId, displayName, specs, false);
  });

  // Render custom sections
  Object.keys(sections).forEach((secId) => {
    if (sectionOrder.includes(secId)) return;
    const specs = sections[secId];
    const displayName = specs[0]?._customSectionName || secId;
    html += buildEditSectionCard(secId, displayName, specs, true);
  });

  html += "</div>";

  html += `
    <div style="margin-top:16px; text-align:center;">
      <button type="button" class="btn btn-outline btn-sm" onclick="addEditSectionCard()" style="font-weight:700; border-color:#0F172A; color:#0F172A; padding:8px 20px;">
        <svg style="width:14px;height:14px;margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add New Section
      </button>
    </div>
  `;

  container.innerHTML = html;
  document.getElementById("edit-components-modal").classList.add("active");
  document.getElementById("edit-components-modal").style.display = "flex";
};

function buildEditSectionCard(secId, displayName, specs, isCustom) {
  const cardId = `ec-section-${secId}`;
  let specsHtml = "";
  specs.forEach((spec, idx) => {
    const fieldRowId = `ec-field-${secId}-${idx}`;
    specsHtml += buildEditSpecRow(spec, fieldRowId, idx);
  });

  return `
    <div class="ec-section-card" id="${cardId}" style="background:#F8FAFC; border:1.5px solid #CBD5E1; border-radius:10px; padding:16px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
        <div style="display:flex; align-items:center; gap:8px; flex:1;">
          <div style="display:flex; gap:4px;">
            <button type="button" onclick="moveEditSection(this, -1)" title="Move up" style="background:none; border:1px solid #CBD5E1; border-radius:4px; cursor:pointer; padding:2px 6px; font-size:0.65rem; color:#475569;">▲</button>
            <button type="button" onclick="moveEditSection(this, 1)" title="Move down" style="background:none; border:1px solid #CBD5E1; border-radius:4px; cursor:pointer; padding:2px 6px; font-size:0.65rem; color:#475569;">▼</button>
          </div>
          <span style="font-weight:700; font-size:0.9rem; color:#1E293B;">${displayName}</span>
          ${isCustom ? '<span style="font-size:0.65rem; font-weight:600; color:#059669; background:#DCFCE7; padding:2px 8px; border-radius:4px;">custom</span>' : ""}
          <span class="section-hint" style="font-size:0.7rem; color:#64748B;">${specs.length} spec(s)</span>
        </div>
        <input type="hidden" class="ec-section-id" value="${secId}">
        <input type="hidden" class="ec-section-custom" value="${isCustom ? "1" : "0"}">
        <button type="button" onclick="removeEditSectionCard(this)" style="background:none; border:1px solid #FCA5A5; color:#EF4444; border-radius:4px; padding:4px 10px; font-size:0.75rem; cursor:pointer; font-weight:600;">
          ✕ Remove Section
        </button>
      </div>
      <div class="ec-specs-container" data-section="${secId}">
        ${specsHtml || '<p style="text-align:center; color:#94A3B8; font-size:0.8rem; padding:8px;">No specs in this section.</p>'}
      </div>
      <div style="margin-top:10px;">
        <button type="button" class="btn btn-outline btn-xs" onclick="addSpecToEditSection(this)" style="font-weight:600; border-color:#0284C7; color:#0284C7;">
          <svg style="width:12px;height:12px;margin-right:2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Spec
        </button>
      </div>
    </div>
  `;
}

function buildEditSpecRow(spec, fieldRowId, idx) {
  const optRows =
    spec.options && spec.options.length > 0
      ? spec.options
          .map((opt, oi) => {
            const pDiff =
              spec.priceDiffs && spec.priceDiffs[opt] !== undefined
                ? spec.priceDiffs[opt]
                : 0;
            const isDef = spec.defaultValue === opt;
            const choiceId = `ec-opt-${fieldRowId}-${oi}-${Date.now()}`;
            return `
          <div class="aci-opt-choice-row" id="${choiceId}" style="display:grid; grid-template-columns: 2fr 1.2fr 80px 32px; gap:8px; align-items:center; background:#FFFFFF; padding:8px 10px; border-radius:6px; border:1px solid #CBD5E1; margin-bottom:6px;">
            <div>
              <span style="font-size:0.7rem; font-weight:600; color:#64748B; display:block;">Option / Choice Name</span>
              <input type="text" class="form-control form-control-sm aci-opt-name" value="${opt}">
            </div>
            <div>
              <span style="font-size:0.7rem; font-weight:600; color:#64748B; display:block;">Price Diff (₹)</span>
              <div style="display:flex; align-items:center; gap:2px;">
                <span style="font-size:0.75rem; color:#64748B;">₹</span>
                <input type="number" class="form-control form-control-sm aci-opt-price" value="${pDiff}">
              </div>
            </div>
            <div style="text-align:center;">
              <span style="font-size:0.7rem; font-weight:600; color:#64748B; display:block;">Default</span>
              <input type="radio" name="default-opt-${fieldRowId}" class="aci-opt-is-default" ${isDef ? "checked" : ""} style="cursor:pointer;">
            </div>
            <div>
              <button type="button" onclick="removeOptionChoiceRow('${choiceId}')" style="background:none; border:none; color:#EF4444; cursor:pointer; padding:4px;" title="Remove Option">
                <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        `;
          })
          .join("")
      : "";

  const isTextOrCheckbox = spec.type === "text" || spec.type === "checkbox";
  return `
    <div class="aci-field-row ec-field-row" id="${fieldRowId}" style="background:#FFFFFF; border:1px solid #CBD5E1; border-radius:8px; padding:14px; margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <button type="button" onclick="moveEditSpecRow(this, -1)" title="Move up" style="background:none; border:1px solid #CBD5E1; border-radius:3px; cursor:pointer; padding:1px 5px; font-size:0.6rem; color:#475569;">▲</button>
          <button type="button" onclick="moveEditSpecRow(this, 1)" title="Move down" style="background:none; border:1px solid #CBD5E1; border-radius:3px; cursor:pointer; padding:1px 5px; font-size:0.6rem; color:#475569;">▼</button>
          <span style="font-weight:700; font-size:0.8rem; color:#1E293B;">Spec #${idx + 1}</span>
        </div>
        <button type="button" onclick="removeSpecFromEditSection(this)" style="background:none; border:1px solid #FCA5A5; color:#EF4444; border-radius:4px; padding:2px 8px; font-size:0.7rem; cursor:pointer; font-weight:600;">
          ✕ Remove
        </button>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:10px;">
        <div>
          <label style="font-size:0.7rem; font-weight:700; color:#334155; display:block; margin-bottom:3px;">Spec Name *</label>
          <input type="text" class="form-control form-control-sm ec-field-name" value="${spec.name}" style="font-weight:600;">
        </div>
        <div>
          <label style="font-size:0.7rem; font-weight:700; color:#334155; display:block; margin-bottom:3px;">Control Type *</label>
          <select class="form-control form-control-sm ec-field-type" onchange="toggleFieldOptionsInput(this)">
            <option value="dropdown" ${spec.type === "dropdown" ? "selected" : ""}>Dropdown</option>
            <option value="radio" ${spec.type === "radio" ? "selected" : ""}>Radio Buttons</option>
            <option value="checkbox" ${spec.type === "checkbox" ? "selected" : ""}>Checkbox</option>
            <option value="text" ${spec.type === "text" ? "selected" : ""}>Text Input</option>
            <option value="number" ${spec.type === "number" ? "selected" : ""}>Number</option>
          </select>
        </div>
      </div>
      <div class="aci-default-text-group" style="${isTextOrCheckbox ? "" : "display:none;"} margin-bottom:10px;">
        <label style="font-size:0.7rem; font-weight:700; color:#334155; display:block; margin-bottom:3px;">Default Value</label>
        <input type="text" class="form-control form-control-sm ec-field-default" value="${spec.defaultValue || ""}">
      </div>
      <div class="aci-options-builder-container" style="background:#F1F5F9; border:1px solid #CBD5E1; border-radius:8px; padding:12px; ${isTextOrCheckbox ? "display:none;" : ""}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <label style="font-size:0.75rem; font-weight:700; color:#1E293B;">Options & Price Differentials</label>
          </div>
          <button type="button" class="btn btn-outline btn-xs" onclick="addOptionChoiceRow('${fieldRowId}')" style="background:#0284C7; color:#FFFFFF; border:none; font-weight:700; padding:4px 10px; border-radius:4px;">
            + Add Option
          </button>
        </div>
        <div class="aci-option-items-table" id="aci-opt-table-${fieldRowId}">
          ${optRows}
        </div>
      </div>
    </div>
  `;
}

window.addSpecToEditSection = function (btn) {
  const sectionCard = btn.closest(".ec-section-card");
  const specsContainer = sectionCard.querySelector(".ec-specs-container");
  const secId = sectionCard.querySelector(".ec-section-id")?.value || "general";
  const idx = specsContainer.querySelectorAll(".ec-field-row").length;
  const fieldRowId = `ec-field-${secId}-${idx}-${Date.now()}`;

  const emptySpec = {
    id: `new_${fieldRowId}`,
    name: "",
    section: secId,
    type: "dropdown",
    options: ["Option 1 (Standard)"],
    defaultValue: "Option 1 (Standard)",
    priceDiffs: { "Option 1 (Standard)": 0 },
  };

  const rowHtml = buildEditSpecRow(emptySpec, fieldRowId, idx);

  // Remove "No specs" message if present
  const noSpecsMsg = specsContainer.querySelector("p");
  if (noSpecsMsg && specsContainer.children.length === 1) {
    specsContainer.innerHTML = "";
  }

  specsContainer.insertAdjacentHTML("beforeend", rowHtml);
  // Add an initial option row
  addOptionChoiceRow(fieldRowId, "Option 1 (Standard)", 0, true);
  addOptionChoiceRow(fieldRowId, "Option 2 (Upgrade)", 15000, false);
};

window.removeSpecFromEditSection = function (btn) {
  const row = btn.closest(".ec-field-row");
  if (row) row.remove();
};

window.addEditSectionCard = function () {
  const container = document.getElementById("ec-sections-container");
  if (!container) return;
  const ts = Date.now();
  const secId = `new-section-${ts}`;
  const cardId = `ec-section-${secId}`;

  const html = `
    <div class="ec-section-card" id="${cardId}" style="background:#F8FAFC; border:1.5px solid #CBD5E1; border-radius:10px; padding:16px; margin-bottom:16px; border-color:#059669;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
        <div style="display:flex; align-items:center; gap:8px; flex:1;">
          <div style="display:flex; gap:4px;">
            <button type="button" onclick="moveEditSection(this, -1)" title="Move up" style="background:none; border:1px solid #CBD5E1; border-radius:4px; cursor:pointer; padding:2px 6px; font-size:0.65rem; color:#475569;">▲</button>
            <button type="button" onclick="moveEditSection(this, 1)" title="Move down" style="background:none; border:1px solid #CBD5E1; border-radius:4px; cursor:pointer; padding:2px 6px; font-size:0.65rem; color:#475569;">▼</button>
          </div>
          <input type="text" class="form-control form-control-sm ec-section-name-input" placeholder="Enter section name..." value="New Section" style="font-weight:700; font-size:0.9rem; max-width:300px;">
          <span style="font-size:0.65rem; font-weight:600; color:#059669; background:#DCFCE7; padding:2px 8px; border-radius:4px;">new</span>
        </div>
        <input type="hidden" class="ec-section-id" value="${secId}">
        <input type="hidden" class="ec-section-custom" value="1">
        <button type="button" onclick="removeEditSectionCard(this)" style="background:none; border:1px solid #FCA5A5; color:#EF4444; border-radius:4px; padding:4px 10px; font-size:0.75rem; cursor:pointer; font-weight:600;">
          ✕ Remove Section
        </button>
      </div>
      <div class="ec-specs-container" data-section="${secId}">
        <p style="text-align:center; color:#94A3B8; font-size:0.8rem; padding:8px;">No specs yet. Click "Add Spec" below.</p>
      </div>
      <div style="margin-top:10px;">
        <button type="button" class="btn btn-outline btn-xs" onclick="addSpecToEditSection(this)" style="font-weight:600; border-color:#0284C7; color:#0284C7;">
          <svg style="width:12px;height:12px;margin-right:2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Spec
        </button>
      </div>
    </div>
  `;
  container.insertAdjacentHTML("beforeend", html);
};

window.removeEditSectionCard = function (btn) {
  const card = btn.closest(".ec-section-card");
  if (card && confirm("Remove this section and all its specs?")) {
    card.remove();
  }
};

window.moveEditSection = function (btn, direction) {
  const card = btn.closest(".ec-section-card");
  if (!card) return;
  const parent = card.parentElement;
  if (!parent) return;
  const siblings = [...parent.querySelectorAll(":scope > .ec-section-card")];
  const idx = siblings.indexOf(card);
  const target = idx + direction;
  if (target < 0 || target >= siblings.length) return;
  if (direction < 0) {
    parent.insertBefore(card, siblings[target]);
  } else {
    parent.insertBefore(card, siblings[target].nextElementSibling);
  }
};

window.moveEditSpecRow = function (btn, direction) {
  const row = btn.closest(".ec-field-row");
  if (!row) return;
  const parent = row.parentElement;
  if (!parent) return;
  const siblings = [...parent.querySelectorAll(":scope > .ec-field-row")];
  const idx = siblings.indexOf(row);
  const target = idx + direction;
  if (target < 0 || target >= siblings.length) return;
  if (direction < 0) {
    parent.insertBefore(row, siblings[target]);
  } else {
    parent.insertBefore(row, siblings[target].nextElementSibling);
  }
};

window.saveEditComponentsModal = function () {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) return;

  const sectionCards = document.querySelectorAll(
    "#edit-components-modal-body .ec-section-card",
  );
  const newSpecs = [];
  const newCustomSections = [];

  sectionCards.forEach((card) => {
    const secId = card.querySelector(".ec-section-id")?.value || "general";
    const isCustom = card.querySelector(".ec-section-custom")?.value === "1";
    const customSecName = isCustom
      ? card.querySelector(".ec-section-name-input")?.value.trim() ||
        "Custom Section"
      : "";

    const fieldRows = card.querySelectorAll(".ec-field-row");
    const secSpecs = [];

    fieldRows.forEach((row, idx) => {
      const name = row.querySelector(".ec-field-name")?.value.trim();
      if (!name) return;

      const type = row.querySelector(".ec-field-type")?.value || "dropdown";
      const rowId = row.id;

      let options = [];
      let priceDiffs = {};
      let defaultVal = "";

      if (type === "dropdown" || type === "radio") {
        const extracted = extractFieldOptionsAndPrices(row, rowId);
        options = extracted.options;
        priceDiffs = extracted.priceDiffs;
        defaultVal = extracted.defaultVal;

        if (options.length === 0) {
          options = ["Standard", "Custom"];
          priceDiffs = { Standard: 0, Custom: 15000 };
          defaultVal = "Standard";
        }
      } else if (type === "checkbox") {
        defaultVal = "Yes";
      } else {
        defaultVal = row.querySelector(".ec-field-default")?.value.trim() || "";
      }

      const specId = `ec_${secId}_${idx}`;
      secSpecs.push({
        id: specId,
        name,
        section: secId,
        type,
        options: options.length > 0 ? options : [],
        defaultValue: defaultVal,
        priceDiffs: Object.keys(priceDiffs).length > 0 ? priceDiffs : undefined,
      });
    });

    if (isCustom) {
      newCustomSections.push({
        id: secId.replace("new-section-", "custom-"),
        name: customSecName,
        fields: secSpecs,
      });
    } else {
      newSpecs.push(...secSpecs);
    }
  });

  // Save metal price per kg
  const metalPriceInput = document.getElementById("ec-metal-price");
  if (metalPriceInput) {
    STATE.metalPricePerKg = parseFloat(metalPriceInput.value) || 100;
    adminService
      .setMetalPrice(STATE.metalPricePerKg)
      .catch((e) => Logger.warn("Metal price sync failed", e));
  }

  // Save to STATE
  loadState();
  if (!STATE.productSpecOverrides) STATE.productSpecOverrides = {};
  const groupKey = getSubtypeGroup(wizardState.subtype);
  STATE.productSpecOverrides[groupKey] = { specs: newSpecs };

  // Save custom sections
  if (!STATE.customItemDefinitions) STATE.customItemDefinitions = [];
  STATE.customItemDefinitions = newCustomSections;

  saveState();

  // Apply to all group members
  const members = getGroupMembers(groupKey);
  members.forEach((memberKey) => {
    if (WIZARD_PRODUCT_TEMPLATES[memberKey]) {
      WIZARD_PRODUCT_TEMPLATES[memberKey].specs = newSpecs.map((s) => ({
        ...s,
      }));
    }
  });

  closeEditComponentsModal();
  renderConfiguratorFormInputs(template);
  calculateWizardPricing();
  logSystemActivity(`Updated components for ${template.name}.`);
};

window.closeEditComponentsModal = function () {
  document.getElementById("edit-components-modal").classList.remove("active");
  document.getElementById("edit-components-modal").style.display = "";
};

window.resetEditComponentsModal = function () {
  if (
    !confirm(
      "Reset all sections, specs, and pricing to the original defaults for this product category? This cannot be undone.",
    )
  )
    return;

  const groupKey = getSubtypeGroup(wizardState.subtype);

  loadState();
  if (STATE.productSpecOverrides) {
    delete STATE.productSpecOverrides[groupKey];
  }
  STATE.customItemDefinitions = [];
  delete STATE.metalPricePerKg;
  saveState();

  // Restore original templates in memory
  Object.keys(ORIGINAL_PRODUCT_TEMPLATES).forEach((key) => {
    WIZARD_PRODUCT_TEMPLATES[key] = JSON.parse(
      JSON.stringify(ORIGINAL_PRODUCT_TEMPLATES[key]),
    );
  });
  openEditComponentsModal();
};

window.updateManualBasePrice = function (val) {
  wizardState.customBasePrice = parseFloat(val) || 0;
  calculateWizardPricing();
};

window.saveCurrentBasePriceAsDefault = function () {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) return;

  const currentBase =
    wizardState.customBasePrice !== undefined
      ? wizardState.customBasePrice
      : template.basePrice;

  if (!STATE.adminPricing) STATE.adminPricing = {};
  if (!STATE.adminPricing.basePrices) STATE.adminPricing.basePrices = {};

  STATE.adminPricing.basePrices[wizardState.subtype] = currentBase;
  saveState();
  adminService
    .updatePricing({ ...STATE.adminPricing })
    .catch((e) => Logger.warn("Base price sync failed", e));
  logSystemActivity(
    `Admin set market base price for ${wizardState.subtype} to ₹${currentBase.toLocaleString("en-IN")}.`,
  );
  alert(
    `₹${currentBase.toLocaleString("en-IN")} saved as market baseline default price for ${template.name}!`,
  );
};

// Step 4 pricing calculator
function calculateWizardPricing() {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) return;

  let defaultPrice =
    STATE.adminPricing &&
    STATE.adminPricing.basePrices &&
    STATE.adminPricing.basePrices[wizardState.subtype]
      ? STATE.adminPricing.basePrices[wizardState.subtype]
      : template.basePrice;
  let basePrice =
    wizardState.customBasePrice !== undefined
      ? wizardState.customBasePrice
      : defaultPrice;

  let upgradesHtml = "";
  let upgradesTotal = 0;

  // Calculate Spec Upgrades (built-in)
  template.specs.forEach((spec) => {
    if (wizardState.notRequired[spec.id]) return;
    const selectedVal = wizardState.specs[spec.id];
    if (selectedVal) {
      let diff = getEffectiveSpecPriceDiff(spec, selectedVal);
      let label = spec.name;

      // If Custom is selected, use custom description and price if provided
      if (selectedVal.toLowerCase() === "custom") {
        const customDesc = wizardState.specs[spec.id + "_custom_desc"];
        const customPrice = wizardState.specs[spec.id + "_custom_price"];
        if (customDesc) label += ` (${customDesc})`;
        if (customPrice) diff = customPrice;
      }

      upgradesTotal += diff;
      upgradesHtml += `
        <div class="preview-row indent">
          <span>+ Upgrade: ${label} (${selectedVal})</span>
          <span>${diff > 0 ? "+" : ""}₹${diff.toLocaleString("en-IN")}</span>
        </div>
      `;
    }
  });

  // Calculate Custom Item Spec Upgrades
  const customSections = getCustomItemSpecs();
  customSections.forEach((section) => {
    section.fields.forEach((field) => {
      if (wizardState.notRequired[field.id]) return;
      const selectedVal = wizardState.specs[field.id];
      if (
        selectedVal &&
        field.priceDiffs &&
        field.priceDiffs[selectedVal] !== undefined
      ) {
        let diff = field.priceDiffs[selectedVal];
        let label = field.name;

        // If Custom is selected, use custom description and price if provided
        if (selectedVal.toLowerCase() === "custom") {
          const customDesc = wizardState.specs[field.id + "_custom_desc"];
          const customPrice = wizardState.specs[field.id + "_custom_price"];
          if (customDesc) label += ` (${customDesc})`;
          if (customPrice) diff = customPrice;
        }

        upgradesTotal += diff;
        upgradesHtml += `
          <div class="preview-row indent">
            <span>+ [${section.name}] ${label} (${selectedVal})</span>
            <span>${diff > 0 ? "+" : ""}₹${diff.toLocaleString("en-IN")}</span>
          </div>
        `;
      }
    });
  });

  const qty = wizardState.orderQty || 1;
  const unitPrice = basePrice + upgradesTotal;
  const basicAmount = unitPrice * qty;
  const gstVal = Math.round(basicAmount * 0.18);
  const grandTotal = basicAmount + gstVal;

  wizardState.total = grandTotal;

  // Update base price input value
  const basePriceInput = document.getElementById("w-override-base-price");
  if (basePriceInput && !basePriceInput.disabled) {
    basePriceInput.value = basePrice;
  }

  // Render summary panel (dynamic parts only)
  const summarySheet = document.getElementById("w-live-summary-sheet");
  if (summarySheet) {
    summarySheet.innerHTML = `
      ${
        upgradesHtml
          ? `
        <div class="mb-xs mt-xs"><span style="font-size:0.7rem;color:var(--color-text-muted);text-transform:uppercase;">Technical Parameters Upgrades:</span></div>
        ${upgradesHtml}
      `
          : ""
      }

      <div class="preview-row" style="border-top: 1px dashed rgba(0,0,0,0.15); padding-top:10px;">
        <span>Vehicles × Unit Price</span>
        <span>${qty} × ₹${Math.round(unitPrice).toLocaleString("en-IN")}</span>
      </div>
      <div class="preview-row mt-md">
        <span>Chassis Basic Total</span>
        <span>₹${basicAmount.toLocaleString("en-IN")}</span>
      </div>
      <div class="preview-row">
        <span>GST (18%)</span>
        <span>₹${gstVal.toLocaleString("en-IN")}</span>
      </div>
      <div class="preview-row total" style="color:var(--color-primary)">
        <span>Grand Total</span>
        <span>₹${grandTotal.toLocaleString("en-IN")}</span>
      </div>
    `;
  }
}

window.openTermsModal = function () {
  const textarea = document.getElementById("terms-editor");
  if (textarea && wizardState.terms) {
    textarea.value = wizardState.terms.join("\n");
  }
  document.getElementById("terms-modal").style.display = "flex";
};

window.closeTermsModal = function () {
  document.getElementById("terms-modal").style.display = "none";
};

window.saveTermsFromModal = function () {
  const textarea = document.getElementById("terms-editor");
  if (textarea) {
    wizardState.terms = textarea.value
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s);
  }
  closeTermsModal();
};

window.openScopeModal = function () {
  const textarea = document.getElementById("scope-editor");
  if (textarea && wizardState.scopeOfWork) {
    textarea.value = wizardState.scopeOfWork;
  }
  document.getElementById("scope-modal").style.display = "flex";
};

window.closeScopeModal = function () {
  document.getElementById("scope-modal").style.display = "none";
};

window.saveScopeFromModal = function () {
  const textarea = document.getElementById("scope-editor");
  if (textarea) {
    wizardState.scopeOfWork = textarea.value.trim() || "As Mentioned above";
  }
  closeScopeModal();
};

window.openBankModal = function () {
  const bd = wizardState.bankDetails || {};
  document.getElementById("bank-company").value = bd.companyName || "";
  document.getElementById("bank-name").value = bd.bankName || "";
  document.getElementById("bank-account").value = bd.accountNumber || "";
  document.getElementById("bank-type").value = bd.accountType || "CURRENT";
  document.getElementById("bank-ifsc").value = bd.ifsc || "";
  document.getElementById("bank-modal").style.display = "flex";
};

window.closeBankModal = function () {
  document.getElementById("bank-modal").style.display = "none";
};

window.saveBankFromModal = function () {
  if (!wizardState.bankDetails) wizardState.bankDetails = {};
  wizardState.bankDetails.companyName =
    document.getElementById("bank-company").value.trim() ||
    "NEXFRA MANUFACTURING INDIA PVT LTD";
  wizardState.bankDetails.bankName =
    document.getElementById("bank-name").value.trim() || "ICICI BANK";
  wizardState.bankDetails.accountNumber =
    document.getElementById("bank-account").value.trim() || "060105004477";
  wizardState.bankDetails.accountType =
    document.getElementById("bank-type").value || "CURRENT";
  wizardState.bankDetails.ifsc =
    document.getElementById("bank-ifsc").value.trim() ||
    "560229033/ICIC0000156";
  closeBankModal();
};

window.onOrderQtyChange = function (val) {
  wizardState.orderQty = parseInt(val, 10) || 1;
  if (
    wizardState.currentStep >= 4 &&
    typeof calculateWizardPricing === "function"
  )
    calculateWizardPricing();
  const btn = document.getElementById("w-qty-save-btn");
  if (btn) {
    btn.disabled = wizardState.orderQty === (wizardState.lastConfirmedQty || 1);
    btn.textContent = "Save";
  }
};

window.saveOrderQty = function () {
  var inp = document.getElementById("w-order-qty");
  if (inp) {
    wizardState.orderQty = parseInt(inp.value, 10) || 1;
    if (typeof calculateWizardPricing === "function") calculateWizardPricing();
    simulateDraftAutoSave();
    wizardState.lastConfirmedQty = wizardState.orderQty;
    var btn = document.getElementById("w-qty-save-btn");
    if (btn) {
      btn.textContent = "Saved ✓";
      btn.disabled = true;
      setTimeout(function () {
        btn.textContent = "Save";
        btn.disabled = true;
      }, 1500);
    }
  }
};

window.onCustQtyChange = function (val) {
  wizardState.orderQty = parseInt(val, 10) || 1;
};

// Helper: extract initials from customer name (e.g. "Chena Reddy" → "CR")
function getInitials(name) {
  if (!name) return "XX";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0).toUpperCase() || "X";
  const last =
    parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : "X";
  return first + last;
}

// Helper: generate quotation REF number (e.g. "CR/001/2026")
function generateRefNumber(name, counter) {
  const initials = getInitials(name);
  const year = new Date().getFullYear();
  return `${initials}/${String(counter).padStart(3, "0")}/${year}`;
}

// Step 5: Final Quotation Mock Preview Populate
function generateQuotationFinalReview() {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) return;

  const c = wizardState.customer;
  const nextCounter = (STATE.quotationCounter || 0) + 1;
  const previewRef = generateRefNumber(c.name, nextCounter);

  // Pre-calculations
  const wQty = wizardState.orderQty || 1;
  const grandTotal = wizardState.total;
  const basicAmount = Math.round(grandTotal / 1.18);
  const unitAmount = Math.round(basicAmount / wQty);
  const gstAmount = grandTotal - basicAmount;
  const unitGst = Math.round(unitAmount * 0.18);
  const unitTotal = unitAmount + unitGst;

  document.getElementById("w-pdf-table-qty").innerText =
    wQty + " No" + (wQty > 1 ? "s" : "");
  document.getElementById("w-pdf-gst-label").innerText = "GST 18%";

  // Set standard PDF preview tags
  document.getElementById("w-pdf-ref-no").innerText = `REF:- ${previewRef}`;
  document.getElementById("w-pdf-date-val").innerText =
    `DATE: ${new Date(c.date).toLocaleDateString("en-GB").replace(/\//g, ".")}`;

  document.getElementById("w-pdf-to-company").innerText =
    `M/s ${c.company.toUpperCase()}`;
  document.getElementById("w-pdf-to-address-1").innerText = c.address.substring(
    0,
    45,
  );
  document.getElementById("w-pdf-to-address-2").innerText =
    c.address.substring(45) || "Registered Office";
  document.getElementById("w-pdf-to-gst").innerText = `GST NO: ${c.gst}`;

  const capacityLabel =
    wizardState.capacity && wizardState.capacity !== "NA"
      ? `${wizardState.capacity} `
      : "";

  // Build descriptor: conditionally include subframe and hydraulic kit
  const hasSubframeSpec = template.specs.some((s) => s.id === "subframe");
  const subframeRequired =
    hasSubframeSpec && !wizardState.notRequired["subframe"];
  const hasCylinderSpec = template.specs.some((s) => s.id === "cylinder");
  const cylBadge = document.getElementById("nr-badge-cylinder");
  const badgeRequired = !cylBadge || !cylBadge.classList.contains("active");
  const stateRequired = !wizardState.notRequired["cylinder"];
  const hydraulicRequired = hasCylinderSpec && (badgeRequired || stateRequired);
  const lenVal = document.getElementById("w-dim-length")
    ? document.getElementById("w-dim-length").value
    : template.dimensions.length;
  const heightVal = document.getElementById("w-dim-height")
    ? document.getElementById("w-dim-height").value
    : template.dimensions.height;
  const widthVal = document.getElementById("w-dim-width")
    ? document.getElementById("w-dim-width").value
    : template.dimensions.width;
  const extras = [];
  if (subframeRequired) extras.push("subframe");
  if (hydraulicRequired) extras.push("Hydraulic Kit");
  const extrasStr = extras.length > 0 ? ` with ${extras.join(" & ")}` : "";

  const dimsStr = `${lenVal} L × ${widthVal} W × ${heightVal} H`;
  document.getElementById("w-pdf-subj-text").innerText =
    `Subject: Quotation for -${c.model.toUpperCase()} , ${capacityLabel}${template.name.toUpperCase()} (${dimsStr})${extrasStr}`;

  const descExtras = [];
  if (subframeRequired) descExtras.push("WITH SUBFRAME");
  if (hydraulicRequired) descExtras.push("CYLINDER KIT");
  const descExtrasStr =
    descExtras.length > 0 ? ` ${descExtras.join(" & ")}` : "";
  document.getElementById("w-pdf-table-desc").innerHTML =
    `${capacityLabel}${template.name.toUpperCase()}${descExtrasStr}<br>Regular TAIL DOOR ${c.model}`;

  // Price columns
  document.getElementById("w-pdf-table-basic").innerText =
    formatPdfPrice(unitAmount);
  document.getElementById("w-pdf-table-gst").innerText =
    formatPdfPrice(unitGst);
  document.getElementById("w-pdf-table-total").innerText =
    formatPdfPrice(basicAmount);
  document.getElementById("w-pdf-table-gst-total").innerText =
    formatPdfPrice(gstAmount);

  document.getElementById("w-pdf-grand-total-label").innerText =
    formatPdfPrice(unitTotal);
  document.getElementById("w-pdf-grand-total-val").innerText =
    formatPdfPrice(grandTotal);

  document.getElementById("w-pdf-words-val").innerText =
    priceToIndianWords(grandTotal);

  // Specifications
  const specsContainer = document.getElementById("w-pdf-specs-list-container");
  let specsListHtml = "";
  let count = 1;

  // Add category dimensions

  // Populate spec list elements dynamically (built-in specs)
  Object.keys(wizardState.specs).forEach((key) => {
    if (wizardState.notRequired[key]) return;
    if (key.endsWith("_custom_desc") || key.endsWith("_custom_price")) return;
    const specInfo = template.specs.find((s) => s.id === key);
    if (specInfo) {
      let val = wizardState.specs[key];
      if (val.toLowerCase() === "custom") {
        const desc = wizardState.specs[key + "_custom_desc"];
        if (desc) val += ` - ${desc}`;
      }
      specsListHtml += `
        <div class="pdf-specs-item">
          <span style="font-weight:bold; min-width: 26px;">${count++}.</span>
          <span>${specInfo.name} = ${val}</span>
        </div>
      `;
    }
  });

  // Populate custom item specs
  const customSections = getCustomItemSpecs();
  customSections.forEach((section) => {
    section.fields.forEach((field) => {
      if (wizardState.notRequired[field.id]) return;
      const val = wizardState.specs[field.id];
      if (val) {
        let displayVal = val;
        if (val.toLowerCase() === "custom") {
          const desc = wizardState.specs[field.id + "_custom_desc"];
          if (desc) displayVal += ` - ${desc}`;
        }
        specsListHtml += `
          <div class="pdf-specs-item">
            <span style="font-weight:bold; min-width: 26px;">${count++}.</span>
            <span>[${section.name}] ${field.name} = ${displayVal}</span>
          </div>
        `;
      }
    });
  });

  // Add dimensions to specs checklist
  specsListHtml += `
    <div class="pdf-specs-item"><span style="font-weight:bold; min-width: 26px;">${count++}.</span><span>Overall Length Dimension = ${lenVal}</span></div>
    <div class="pdf-specs-item"><span style="font-weight:bold; min-width: 26px;">${count++}.</span><span>Side Gate Height Dimension = ${heightVal}</span></div>
    <div class="pdf-specs-item"><span style="font-weight:bold; min-width: 26px;">${count++}.</span><span>Overall Frame Width Dimension = ${widthVal}</span></div>
  `;

  if (specsContainer) {
    specsContainer.innerHTML = specsListHtml;
  }

  // Populate Terms & Conditions from wizardState
  const termsList = document.getElementById("w-pdf-terms-list");
  if (termsList && wizardState.terms) {
    termsList.innerHTML = wizardState.terms
      .map((t) => `<li>${t}</li>`)
      .join("");
  }

  // Populate Scope of Work from wizardState
  const scopeVal = document.getElementById("w-pdf-scope-val");
  if (scopeVal && wizardState.scopeOfWork) {
    scopeVal.innerText = wizardState.scopeOfWork;
  }

  // Set salesperson name
  const spEl = document.getElementById("w-pdf-salesperson");
  if (spEl) spEl.innerText = c.salesperson || "";

  // Populate Bank Details from wizardState
  const bd = wizardState.bankDetails || {};
  const bankMap = {
    "w-pdf-bank-company": "companyName",
    "w-pdf-bank-name": "bankName",
    "w-pdf-bank-account": "accountNumber",
    "w-pdf-bank-type": "accountType",
    "w-pdf-bank-ifsc": "ifsc",
  };
  Object.keys(bankMap).forEach((id) => {
    const el = document.getElementById(id);
    if (el && bd[bankMap[id]]) el.innerText = bd[bankMap[id]];
  });

  // Toggle Work Order conversion block
  updateQuotationStatusState();
}

window.updateQuotationStatusState = function () {
  const status = document.getElementById("w-quote-status").value;
  wizardState.status = status;

  const woBox = document.getElementById("w-convert-wo-box");
  if (status === "Approved") {
    woBox.style.display = "block";
  } else {
    woBox.style.display = "none";
  }
};

window.showToastNotification = function (message, type = "success") {
  let container = document.getElementById("erp-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "erp-toast-container";
    container.style.cssText =
      "position:fixed; top:20px; right:20px; z-index:999999; display:flex; flex-direction:column; gap:10px; pointer-events:none;";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  const bg =
    type === "success" ? "#059669" : type === "error" ? "#DC2626" : "#2563EB";
  toast.style.cssText = `background:${bg}; color:white; padding:14px 22px; border-radius:8px; font-weight:700; font-size:0.9rem; box-shadow:0 10px 25px rgba(0,0,0,0.25); pointer-events:auto; transition:all 0.3s ease; transform:translateY(-10px); opacity:0; font-family:'Outfit',sans-serif; display:flex; align-items:center; gap:10px; border:1px solid rgba(255,255,255,0.2);`;
  toast.innerHTML = `<span style="font-size:1.1rem;">${type === "success" ? "✓" : "ℹ"}</span> <span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  }, 10);

  setTimeout(() => {
    toast.style.transform = "translateY(-10px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// ===== INLINE QUOTATION EDIT SYSTEM (APPROVALS PAGE) =====

window.editQuotation = async function (quoteId) {
  if (_editLoading) return;

  loadState();

  const container = document.getElementById("approvals-cards-container");
  _editLoading = true;
  if (container) {
    container.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:48px 20px;color:#94A3B8;font-size:0.9rem;font-weight:600;">Loading quotation…</div>';
  }

  let q;
  try {
    q = await quotationService.getById(quoteId);
  } catch (err) {
    Logger.error("Failed to load quotation for edit:", err);
    _editLoading = false;
    showToastNotification("Failed to load quotation for editing.", "error");
    renderApprovalsList(_approvalsFilter || "pending");
    return;
  }

  if (!q) {
    _editLoading = false;
    showToastNotification("Quotation not found.", "error");
    renderApprovalsList(_approvalsFilter || "pending");
    return;
  }

  const template = q.subtype ? WIZARD_PRODUCT_TEMPLATES[q.subtype] : null;
  if (!template) {
    _editLoading = false;
    showToastNotification("Product template not found.", "error");
    renderApprovalsList(_approvalsFilter || "pending");
    return;
  }

  const categoryMap = {
    flatbed: "trailer",
    sidewall: "trailer",
    tiptrailer: "trailer",
    boxbody: "tipper",
    rockbody: "tipper",
    rigid28: "rigid",
    rigid30: "rigid",
  };

  const specs = [];
  const seenSpecs = {};
  (q.specList || []).forEach(function (sv) {
    if (!sv || !sv.id) return;
    seenSpecs[sv.id] = true;
    specs.push({
      id: sv.id,
      name: sv.name,
      section: sv.section || "General",
      value: sv.value,
      isNotRequired: !!sv.isNotRequired,
      customDescription: sv.customDescription ?? null,
      customPrice: sv.customPrice != null ? Number(sv.customPrice) : null,
      effectivePriceDiff:
        q._specDiffs && q._specDiffs[sv.id] != null
          ? Number(q._specDiffs[sv.id])
          : null,
    });
  });
  if (template && template.specs) {
    template.specs.forEach(function (s) {
      if (seenSpecs[s.id]) return;
      specs.push({
        id: s.id,
        name: s.name,
        section: s.section || "General",
        value:
          s.defaultValue || (s.options && s.options[0]) || "Standard",
        isNotRequired: false,
        customDescription: null,
        customPrice: null,
        effectivePriceDiff: null,
      });
    });
  }

  _editState = {
    quoteId: quoteId,
    subtype: q.subtype,
    capacity: q.capacity || "NA",
    category: categoryMap[q.subtype] || "",
    specs: specs,
    model: q.model || "Commercial Vehicle",
    customerName: q.customerName || "",
    date: q.date || new Date().toISOString().split("T")[0],
    total: q.total || 0,
    manualTotal:
      q.manualTotal != null ? Number(q.manualTotal) : null,
    gstRate: q.gstRate != null ? q.gstRate : 18,
    dimensions: JSON.parse(
      JSON.stringify(q.dimensions || template.dimensions || {}),
    ),
    scopeOfWork: q.scopeOfWork || "As Mentioned above",
    terms: q.terms ? q.terms.slice() : [],
    orderQty: q.orderQty || 1,
    qtySnapshot: {
      qty: q.orderQty || 1,
      total: q.total || 0,
      gst: q.gstRate != null ? q.gstRate : 18,
    },
    customItems: (q.customItems || []).map((ci) => ({
      name: ci.name,
      qty: ci.qty,
      price: ci.price,
    })),
  };

  _editSnapshot = JSON.stringify(normalizeEditForCompare(_editState));
  window.removeEventListener("beforeunload", onEditBeforeUnload);
  window.addEventListener("beforeunload", onEditBeforeUnload);

  _editLoading = false;
  renderInlineEditForm(quoteId, template);
};

function renderInlineEditForm(quoteId, template) {
  const container = document.getElementById("approvals-cards-container");
  if (!container) return;
  const e = _editState;

  if (!e) return;

  const sectionLabels = {
    material: "Steel Sheets & Material Grade",
    chassis: "Chassis & Body Structure",
    hydraulic: "Hydraulic System Configuration",
    painting: "Painting & Finish",
    accessories: "Accessories & add-ons",
    subframe: "Subframe Configuration",
  };

  const templateDefs = {};
  (template.specs || []).forEach(function (s) {
    templateDefs[s.id] = s;
  });

  const specOrder = [];
  const specGroups = {};
  (e.specs || []).forEach(function (spec) {
    if (!spec || !spec.id) return;
    const section = spec.section || "General";
    if (!specGroups[section]) {
      specGroups[section] = [];
      specOrder.push(section);
    }
    const def = templateDefs[spec.id] || {};
    specGroups[section].push({
      id: spec.id,
      name: spec.name || def.name || spec.id,
      section: section,
      type: def.type || "text",
      options: def.options,
      priceDiffs: def.priceDiffs,
      defaultValue: def.defaultValue,
      value: spec.value,
      isNotRequired: !!spec.isNotRequired,
      customDescription: spec.customDescription,
      customPrice: spec.customPrice,
    });
  });

  let specsHtml = "";
  specOrder.forEach(function (secId) {
    const secSpecs = specGroups[secId];
    if (!secSpecs || secSpecs.length === 0) return;
    specsHtml +=
      '<div class="spec-section-card" style="background:#ffffff;border:1.5px solid #CBD5E1;border-radius:10px;padding:18px;margin-bottom:16px;">';
    specsHtml +=
      '<h4 style="margin:0 0 14px 0;font-size:0.85rem;font-weight:700;color:#0F172A;">' +
      escHtml(sectionLabels[secId] || secId) +
      "</h4>";
    specsHtml +=
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;">';
    secSpecs.forEach(function (spec) {
      specsHtml += buildEditSpecControl(spec);
    });
    specsHtml += "</div></div>";
  });

  const dims = e.dimensions || {};
  const pd = (v) => {
    if (!v) return { n: "", u: "Feet" };
    const m = String(v).match(/^([\d.]+)\s*(.*)$/);
    return m ? { n: m[1], u: m[2] || "Feet" } : { n: v, u: "Feet" };
  };
  const l = pd(dims.length),
    h = pd(dims.height),
    w = pd(dims.width);

  const sel = (v, o) =>
    v.includes(o) ? "selected" : o === "Feet" && !v ? "selected" : "";

  container.innerHTML =
    '<div style="grid-column:1/-1;background:#ffffff;border-radius:12px;border:1.5px solid #CBD5E1;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;">' +
    '<div><h2 style="margin:0;font-size:1.1rem;font-weight:800;color:#0F172A;">Editing: ' +
    quoteId +
    "</h2>" +
    '<p style="margin:2px 0 0 0;font-size:0.8rem;color:#64748B;">' +
    template.name +
    " — Modify specs, dimensions, and price below</p></div>" +
    '<button onclick="cancelEditQuotation()" style="background:none;border:1px solid #CBD5E1;border-radius:6px;padding:8px 14px;cursor:pointer;font-size:0.85rem;font-weight:600;color:#475569;">✕ Cancel</button></div>' +
    '<div style="padding:20px;max-height:calc(100vh - 280px);overflow-y:auto;">' +
    // Customer
    '<div class="spec-section-card" style="background:#ffffff;border:1.5px solid #CBD5E1;border-radius:10px;padding:18px;margin-bottom:16px;">' +
    '<h4 style="margin:0 0 14px 0;font-size:0.85rem;font-weight:700;color:#0F172A;">Customer Details</h4>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;">' +
    '<div><label style="font-size:0.75rem;font-weight:700;color:#334155;margin-bottom:4px;display:block;">Customer Name</label>' +
    '<input type="text" id="edit-cust-name" class="form-control" value="' +
    escHtml(e.customerName) +
    '" oninput="onEditCustChange(\'customerName\',this.value)" style="font-weight:600;"></div>' +
    '<div><label style="font-size:0.75rem;font-weight:700;color:#334155;margin-bottom:4px;display:block;">Model / Chassis</label>' +
    '<input type="text" class="form-control" value="' +
    escHtml(e.model) +
    '" oninput="onEditCustChange(\'model\',this.value)" style="font-weight:600;"></div>' +
    '<div><label style="font-size:0.75rem;font-weight:700;color:#334155;margin-bottom:4px;display:block;">Date</label>' +
    '<input type="date" class="form-control" value="' +
    e.date +
    '" oninput="onEditCustChange(\'date\',this.value)" style="font-weight:600;"></div>' +
    "</div></div>" +
    // Specs
    specsHtml +
    // Dimensions
    '<div class="spec-section-card" style="background:#ffffff;border:1.5px solid #CBD5E1;border-radius:10px;padding:18px;margin-bottom:16px;">' +
    '<h4 style="margin:0 0 14px 0;font-size:0.85rem;font-weight:700;color:#0F172A;">\uD83D\uDCCF Product Dimensions</h4>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;">' +
    '<div><label style="font-size:0.75rem;font-weight:700;color:#334155;display:block;margin-bottom:6px;">Overall Length</label>' +
    '<div style="display:flex;gap:4px;"><input type="number" step="0.1" id="e-dim-l-n" class="form-control" value="' +
    l.n +
    '" oninput="onEditDim(\'length\')" style="font-weight:700;height:38px;">' +
    '<select id="e-dim-l-u" class="form-control" onchange="onEditDim(\'length\')" style="width:90px;font-weight:600;height:38px;">' +
    '<option value="Feet" ' +
    sel(l.u, "Feet") +
    '>Feet</option><option value="Meters" ' +
    sel(l.u, "Meter") +
    ">Meters</option>" +
    '<option value="Inches" ' +
    sel(l.u, "Inch") +
    '>Inches</option><option value="mm" ' +
    sel(l.u, "mm") +
    ">mm</option></select></div></div>" +
    '<div><label style="font-size:0.75rem;font-weight:700;color:#334155;display:block;margin-bottom:6px;">Side Wall Height</label>' +
    '<div style="display:flex;gap:4px;"><input type="text" id="e-dim-h-n" class="form-control" value="' +
    h.n +
    '" oninput="onEditDim(\'height\')" style="font-weight:700;height:38px;">' +
    '<select id="e-dim-h-u" class="form-control" onchange="onEditDim(\'height\')" style="width:90px;font-weight:600;height:38px;">' +
    '<option value="Feet" ' +
    sel(h.u, "Feet") +
    '>Feet</option><option value="Inches" ' +
    sel(h.u, "Inch") +
    ">Inches</option>" +
    '<option value="Meters" ' +
    sel(h.u, "Meter") +
    '>Meters</option><option value="NA" ' +
    (h.n === "NA" || h.u === "NA" ? "selected" : "") +
    ">NA</option></select></div></div>" +
    '<div><label style="font-size:0.75rem;font-weight:700;color:#334155;display:block;margin-bottom:6px;">Overall Width</label>' +
    '<div style="display:flex;gap:4px;"><input type="number" step="0.5" id="e-dim-w-n" class="form-control" value="' +
    w.n +
    '" oninput="onEditDim(\'width\')" style="font-weight:700;height:38px;">' +
    '<select id="e-dim-w-u" class="form-control" onchange="onEditDim(\'width\')" style="width:95px;font-weight:600;height:38px;">' +
    '<option value="Inches" ' +
    sel(w.u, "Inch") +
    '>Inches</option><option value="Feet" ' +
    sel(w.u, "Feet") +
    ">Feet</option>" +
    '<option value="mm" ' +
    sel(w.u, "mm") +
    ">mm</option></select></div></div></div></div>" +
    // Price
    '<div class="spec-section-card" style="background:#ffffff;border:1.5px solid #CBD5E1;border-radius:10px;padding:18px;margin-bottom:16px;">' +
    '<h4 style="margin:0 0 14px 0;font-size:0.85rem;font-weight:700;color:#0F172A;">\uD83D\uDCB0 Final Price</h4>' +
    '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">' +
    '<div style="flex:1;min-width:200px;"><label style="font-size:0.75rem;font-weight:700;color:#334155;margin-bottom:4px;display:block;">Override Final Price (\u20B9)</label>' +
    '<div style="display:flex;gap:6px;align-items:center;"><input type="number" id="e-price-input" class="form-control" placeholder="Use calculated" value="' +
    (e.manualTotal != null ? e.manualTotal : "") +
    '" oninput="onEditPriceChange(this.value)" style="flex:1;font-weight:700;">' +
    "<button type=\"button\" id=\"e-price-reset-btn\" onclick=\"resetEditPrice()\" style=\"background:none;border:1px solid #CBD5E1;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:0.75rem;font-weight:600;color:#64748B;\">\u2715 Reset</button></div>" +
    '<small style="color:#94A3B8;font-size:0.7rem;">Leave empty for auto-calculated price</small></div>' +
    '<div style="min-width:100px;"><label style="font-size:0.75rem;font-weight:700;color:#334155;margin-bottom:4px;display:block;">GST (%)</label>' +
    '<input type="number" id="e-gst-input" class="form-control" value="' +
    (e.gstRate || 18) +
    '" oninput="onEditGstChange(this.value)" min="0" max="100" step="0.1" style="font-weight:700;width:90px;"></div>' +
    '<div style="min-width:100px;"><label style="font-size:0.75rem;font-weight:700;color:#334155;margin-bottom:4px;display:block;">Vehicles</label>' +
    '<input type="number" id="e-qty-input" class="form-control" value="' +
    (e.orderQty || 1) +
    '" oninput="onEditQtyChange(this.value)" min="1" step="1" style="font-weight:700;width:90px;">' +
    '</div>' +
    '<div style="padding:12px 24px;background:#F0FDF4;border-radius:8px;border:1px solid #BBF7D0;text-align:center;">' +
    '<span style="font-size:0.7rem;font-weight:600;color:#059669;display:block;">Final Price</span>' +
    '<span id="e-price-display" style="font-size:1.3rem;font-weight:800;color:#059669;">\u20B9' +
    (e.total || 0).toLocaleString("en-IN") +
    "</span></div></div></div>" +
    // Terms & Scope
    '<div class="spec-section-card" style="background:#ffffff;border:1.5px solid #CBD5E1;border-radius:10px;padding:18px;margin-bottom:16px;">' +
    '<h4 style="margin:0 0 14px 0;font-size:0.85rem;font-weight:700;color:#0F172A;">\uD83D\uDCCB Scope & Terms</h4>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
    '<div><label style="font-size:0.75rem;font-weight:700;color:#334155;margin-bottom:4px;display:block;">Scope of Work</label>' +
    '<textarea class="form-control" rows="4" oninput="onEditScopeChange(this.value)" style="font-weight:600;">' +
    escHtml(e.scopeOfWork) +
    "</textarea></div>" +
    '<div><label style="font-size:0.75rem;font-weight:700;color:#334155;margin-bottom:4px;display:block;">Terms & Conditions</label>' +
    '<textarea class="form-control" rows="4" oninput="onEditTermsChange(this.value)" style="font-weight:600;">' +
    escHtml(e.terms.join("\n")) +
    "</textarea></div></div></div>" +
    // End
    "</div>" +
    // Footer
    '<div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;padding:16px 20px;background:#F8FAFC;border-top:1px solid #E2E8F0;">' +
    '<span id="e-edit-dirty-label" style="margin-right:auto;font-size:0.78rem;font-weight:600;color:#94A3B8;">No changes</span>' +
    '<button onclick="cancelEditQuotation()" class="btn btn-secondary" style="font-weight:700;padding:10px 24px;">Cancel</button>' +
    '<button onclick="saveEditQuotation(true)" class="btn btn-primary" style="font-weight:700;padding:10px 24px;background:#0284C7;color:white;border:none;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 4px rgba(2,132,199,0.2);">\uD83D\uDCC4 Save &amp; View PDF</button>' +
    '<button onclick="saveEditQuotation()" id="e-save-changes-btn" class="btn btn-primary" disabled style="font-weight:700;padding:10px 24px;background:#059669;color:white;border:none;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 4px rgba(5,150,105,0.2);">\u2713 Save Changes</button>' +
    "</div></div>";

  updateEditPriceDisplay();
  _updateEditSaveState();
}

function normEditStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

function normalizeEditForCompare(state) {
  if (!state) return null;
  return {
    subtype: state.subtype,
    capacity: normEditStr(state.capacity),
    model: normEditStr(state.model),
    customerName: normEditStr(state.customerName),
    date: normEditStr(state.date),
    manualTotal: state.manualTotal != null ? Number(state.manualTotal) : null,
    gstRate: state.gstRate != null ? Number(state.gstRate) : null,
    orderQty: state.orderQty || 1,
    scopeOfWork: normEditStr(state.scopeOfWork),
    terms: (state.terms || []).map(normEditStr),
    dimensions: {
      length: normEditStr(state.dimensions && state.dimensions.length),
      height: normEditStr(state.dimensions && state.dimensions.height),
      width: normEditStr(state.dimensions && state.dimensions.width),
    },
    specs: (state.specs || [])
      .map(function (s) {
        return {
          id: s.id,
          value: normEditStr(s.value),
          isNotRequired: !!s.isNotRequired,
          customDescription: normEditStr(s.customDescription),
          customPrice: s.customPrice != null ? Number(s.customPrice) : null,
          effectivePriceDiff: s.effectivePriceDiff != null ? Number(s.effectivePriceDiff) : null,
        };
      })
      .sort(function (a, b) {
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      }),
    customItems: (state.customItems || []).map(function (ci) {
      return {
        name: normEditStr(ci.name),
        qty: ci.qty,
        price: ci.price,
      };
    }),
  };
}

function editHasChanges() {
  if (!_editState) return false;
  const cur = JSON.stringify(normalizeEditForCompare(_editState));
  return cur !== _editSnapshot;
}

function editPricingBasis(state) {
  return {
    specs: (state.specs || [])
      .map(function (s) {
        return {
          id: s.id,
          v: normEditStr(s.value),
          cd: normEditStr(s.customDescription),
          cp: s.customPrice != null ? Number(s.customPrice) : null,
          d: s.effectivePriceDiff != null ? Number(s.effectivePriceDiff) : null,
        };
      })
      .sort(function (a, b) {
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      }),
    items: (state.customItems || []).map(function (ci) {
      return { n: normEditStr(ci.name), q: ci.qty, p: ci.price };
    }),
  };
}

function editPricingBasisChanged() {
  if (!_editState || !_editSnapshot) return false;
  let snap;
  try {
    snap = JSON.parse(_editSnapshot);
  } catch (e) {
    return false;
  }
  const cur = JSON.stringify(editPricingBasis(_editState));
  const stored = JSON.stringify(editPricingBasis(snap));
  return cur !== stored;
}

function onEditBeforeUnload(e) {
  if (editHasChanges()) {
    e.preventDefault();
    e.returnValue = "";
  }
}

function _updateEditSaveState() {
  if (!_editState) return;
  const dirty = editHasChanges();
  const btn = document.getElementById("e-save-changes-btn");
  const label = document.getElementById("e-edit-dirty-label");
  if (btn) btn.disabled = !dirty;
  if (label) {
    label.textContent = dirty ? "Unsaved changes" : "No changes";
    label.style.color = dirty ? "#D97706" : "#94A3B8";
  }
}

function closeEditQuotation() {
  window.removeEventListener("beforeunload", onEditBeforeUnload);
  _editSnapshot = null;
  _editState = null;
  renderApprovalsList(_approvalsFilter || "pending");
}

function showDiscardChangesConfirm() {
  ensureEditStyles();
  let ov = document.getElementById("edit-discard-overlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "edit-discard-overlay";
    ov.style.cssText =
      "position:fixed;inset:0;z-index:1000000;background:rgba(15,23,42,0.45);display:flex;align-items:center;justify-content:center;";
    ov.innerHTML =
      '<div style="background:#ffffff;border-radius:12px;padding:24px 28px;width:360px;box-shadow:0 12px 40px rgba(0,0,0,0.2);">' +
      '<h3 style="margin:0 0 10px 0;font-size:1rem;font-weight:800;color:#0F172A;">Discard your changes?</h3>' +
      '<p style="margin:0 0 18px 0;font-size:0.85rem;color:#64748B;">You have unsaved changes. Leaving this editor will discard them.</p>' +
      '<div style="display:flex;justify-content:flex-end;gap:10px;">' +
      '<button id="edit-discard-continue" class="btn btn-secondary" style="font-weight:700;padding:8px 18px;">Continue Editing</button>' +
      '<button id="edit-discard-confirm" class="btn btn-primary" style="font-weight:700;padding:8px 18px;background:#DC2626;color:white;border:none;border-radius:6px;cursor:pointer;">Discard Changes</button>' +
      "</div></div>";
    document.body.appendChild(ov);
  }
  ov.style.display = "flex";
  const cont = document.getElementById("edit-discard-continue");
  const conf = document.getElementById("edit-discard-confirm");
  if (cont) cont.onclick = function () { ov.style.display = "none"; };
  if (conf) conf.onclick = function () { ov.style.display = "none"; closeEditQuotation(); };
}

function escHtml(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEditSpecControl(spec) {
  if (!_editState) return "";
  const isNr = !!spec.isNotRequired;
  const selectedVal =
    spec.value !== undefined && spec.value !== null
      ? spec.value
      : spec.defaultValue || "";
  const rawOpts =
    spec.options && spec.options.length
      ? spec.options
      : spec.priceDiffs && Object.keys(spec.priceDiffs).length
        ? Object.keys(spec.priceDiffs)
        : ["Standard", "Custom"];
  const hasCustom = rawOpts.some(
    (o) => typeof o === "string" && o.toLowerCase() === "custom",
  );
  const allOpts = rawOpts.filter(
    (o) => typeof o === "string" && o.toLowerCase() !== "custom",
  );

  let ctrl = "";
  if (spec.type === "dropdown") {
    ctrl =
      '<select class="form-control" onchange="onEditSpecChange(\'' +
      spec.id +
      "',this.value)\" " +
      (isNr ? "disabled" : "") +
      ' style="width:100%;font-weight:600;min-height:42px;padding:8px 12px;">' +
      allOpts
        .map(
          (o) =>
            '<option value="' +
            escHtml(o) +
            '" ' +
            (o === selectedVal ? "selected" : "") +
            ">" +
            escHtml(o) +
            "</option>",
        )
        .join("") +
      (hasCustom
        ? '<option value="Custom" ' +
          (selectedVal === "Custom" ? "selected" : "") +
          ">Custom</option>"
        : "") +
      "</select>";
  } else if (spec.type === "radio" || spec.type === "checkbox") {
    ctrl =
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">' +
      allOpts
        .map(
          (o) =>
            '<label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:0.8rem;font-weight:600;color:#334155;background:#F8FAFC;padding:4px 10px;border-radius:6px;border:1px solid #CBD5E1;">' +
            '<input type="radio" name="e-spec-' +
            spec.id +
            '" value="' +
            escHtml(o) +
            '" ' +
            (o === selectedVal ? "checked" : "") +
            " onchange=\"onEditSpecChange('" +
            spec.id +
            "',this.value)\" " +
            (isNr ? "disabled" : "") +
            ">" +
            escHtml(o) +
            "</label>",
        )
        .join("") +
      (hasCustom
        ? '<label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:0.8rem;font-weight:600;color:#334155;background:#F8FAFC;padding:4px 10px;border-radius:6px;border:1px solid #CBD5E1;">' +
          '<input type="radio" name="e-spec-' +
          spec.id +
          '" value="Custom" ' +
          (selectedVal === "Custom" ? "checked" : "") +
          " onchange=\"onEditSpecChange('" +
          spec.id +
          "',this.value)\" " +
          (isNr ? "disabled" : "") +
          ">Custom</label>"
        : "") +
      "</div>";
  } else if (spec.type === "text") {
    ctrl =
      '<input type="text" class="form-control" value="' +
      escHtml(selectedVal) +
      '" oninput="onEditSpecChange(\'' +
      spec.id +
      "',this.value)\" " +
      (isNr ? "disabled" : "") +
      ' style="width:100%;font-weight:600;min-height:42px;padding:8px 12px;margin-top:4px;">';
  } else if (spec.type === "number") {
    ctrl =
      '<input type="number" step="any" class="form-control" value="' +
      escHtml(selectedVal) +
      '" oninput="onEditSpecChange(\'' +
      spec.id +
      "',this.value)\" " +
      (isNr ? "disabled" : "") +
      ' style="width:100%;font-weight:600;min-height:42px;padding:8px 12px;margin-top:4px;">';
  }

  return (
    '<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
    '<label style="font-size:0.8rem;font-weight:700;color:#1E293B;margin:0;">' +
    escHtml(spec.name) +
    "</label>" +
    '<span style="font-size:0.65rem;font-weight:600;padding:1px 6px;border-radius:4px;cursor:pointer;background:' +
    (isNr ? "#FEE2E2" : "#F1F5F9") +
    ";color:" +
    (isNr ? "#DC2626" : "#64748B") +
    ';" onclick="onEditToggleNr(\'' +
    spec.id +
    "')\">" +
    (isNr ? "Not Required" : "Required") +
    "</span></div>" +
    ctrl +
    "</div>"
  );
}

window.onEditSpecChange = function (id, val) {
  if (!_editState) return;
  const spec = (_editState.specs || []).find((s) => s.id === id);
  if (spec) spec.value = val;
  _updateEditSaveState();
};

window.onEditToggleNr = function (id) {
  if (!_editState) return;
  const spec = (_editState.specs || []).find((s) => s.id === id);
  if (!spec) return;
  spec.isNotRequired = !spec.isNotRequired;
  const t = WIZARD_PRODUCT_TEMPLATES[_editState.subtype];
  if (t) renderInlineEditForm(_editState.quoteId, t);
};

window.onEditCustChange = function (field, val) {
  if (_editState) _editState[field] = val;
  _updateEditSaveState();
};

window.onEditDim = function (dim) {
  if (!_editState) return;
  const nEl = document.getElementById("e-dim-" + dim.charAt(0) + "-n");
  const uEl = document.getElementById("e-dim-" + dim.charAt(0) + "-u");
  if (nEl && uEl) _editState.dimensions[dim] = nEl.value + " " + uEl.value;
  _updateEditSaveState();
};

window.onEditPriceChange = function (val) {
  if (!_editState) return;
  _editState.manualTotal = val !== "" && val !== null ? parseFloat(val) : null;
  updateEditPriceDisplay();
  _updateEditSaveState();
};

window.onEditGstChange = function (val) {
  if (!_editState) return;
  _editState.gstRate = val !== "" && val !== null ? parseFloat(val) : 18;
  updateEditPriceDisplay();
  _updateEditSaveState();
};

window.onEditQtyChange = function (val) {
  if (!_editState) return;
  _editState.orderQty = val !== "" && val !== null ? parseInt(val, 10) || 1 : 1;
  updateEditPriceDisplay();
  _updateEditSaveState();
};

window.resetEditPrice = function () {
  if (!_editState) return;
  _editState.manualTotal = null;
  const inp = document.getElementById("e-price-input");
  if (inp) inp.value = "";
  updateEditPriceDisplay();
  _updateEditSaveState();
};

function computeEditDisplayPrice() {
  const e = _editState;
  if (!e) return 0;
  if (e.manualTotal != null) return Number(e.manualTotal) || 0;
  const qty = e.orderQty || 1;
  const gst = e.gstRate || 18;
  const snap = e.qtySnapshot || {};
  const snapQty = snap.qty || 1;
  const snapTotal = snap.total || e.total || 0;
  const snapGst = snap.gst != null ? snap.gst : 18;
  if (snapQty <= 0 || snapTotal <= 0) return e.total || 0;
  const unitBasic = snapTotal / (1 + snapGst / 100) / snapQty;
  return Math.round(unitBasic * qty * (1 + gst / 100));
}

function updateEditPriceDisplay() {
  if (!_editState) return;
  const d = document.getElementById("e-price-display");
  const resetBtn = document.getElementById("e-price-reset-btn");
  const t = computeEditDisplayPrice();
  if (d) d.textContent = "\u20B9" + (t || 0).toLocaleString("en-IN");
  if (resetBtn) {
    resetBtn.disabled = _editState.manualTotal == null;
    resetBtn.style.opacity = resetBtn.disabled ? "0.45" : "1";
    resetBtn.style.cursor = resetBtn.disabled ? "not-allowed" : "pointer";
  }
}

window.onEditScopeChange = function (val) {
  if (_editState) _editState.scopeOfWork = val;
  _updateEditSaveState();
};

window.onEditTermsChange = function (val) {
  if (_editState) _editState.terms = val.split("\n").filter((t) => t.trim());
  _updateEditSaveState();
};

window.cancelEditQuotation = function () {
  if (_editLoading || _editSaving) return;
  if (_editState && editHasChanges()) {
    showDiscardChangesConfirm();
    return;
  }
  closeEditQuotation();
};

function serializeEditPayload() {
  const e = _editState;
  const specs = {};
  const notRequired = {};
  const specDiffs = {};
  (e.specs || []).forEach(function (s) {
    if (!s || !s.id) return;
    specs[s.id] = s.value !== undefined && s.value !== null ? s.value : "";
    if (s.customDescription) specs[s.id + "_custom_desc"] = s.customDescription;
    if (s.customPrice != null) specs[s.id + "_custom_price"] = s.customPrice;
    if (s.isNotRequired) notRequired[s.id] = true;
    if (s.effectivePriceDiff != null) specDiffs[s.id] = Number(s.effectivePriceDiff);
  });

  // Only send the previewed grand total when the unit-price basis (spec
  // choices, custom item prices) is UNCHANGED. Then quantity acts purely as a
  // multiplier of the existing unit price and the backend stores that total
  // verbatim instead of re-deriving the unit price. When specs/custom items
  // changed, omit `total` so the backend recalcs from the new diffs.
  let previewTotal;
  if (!editPricingBasisChanged()) {
    previewTotal = computeEditDisplayPrice();
  }

  return {
    customerName: e.customerName || "",
    manualTotal: e.manualTotal,
    total: previewTotal !== undefined ? previewTotal : null,
    gstRate: e.gstRate || 18,
    orderQty: e.orderQty || 1,
    scopeOfWork: e.scopeOfWork || "",
    terms: e.terms ? e.terms.slice() : [],
    dimensions: e.dimensions || {},
    subtype: e.subtype || null,
    specs: specs,
    notRequired: notRequired,
    _specDiffs: specDiffs,
    customItems: (e.customItems || []).map(function (ci) {
      return { name: ci.name, qty: ci.qty, price: ci.price };
    }),
  };
}

function setEditInputsDisabled(disabled) {
  const container = document.getElementById("approvals-cards-container");
  if (!container) return;
  container.querySelectorAll("input, select, textarea, button").forEach(function (el) {
    el.disabled = disabled;
  });
}

function ensureEditStyles() {
  if (document.getElementById("edit-polish-styles")) return;
  const style = document.createElement("style");
  style.id = "edit-polish-styles";
  style.textContent =
    ".edit-spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:currentColor;border-radius:50%;animation:edit-spin .6s linear infinite;vertical-align:-2px;}" +
    "@keyframes edit-spin{to{transform:rotate(360deg)}}" +
    ".edit-active-spinner{display:inline-block;width:12px;height:12px;border:2px solid rgba(2,132,199,.25);border-top-color:#0284C7;border-radius:50%;animation:edit-spin .6s linear infinite;vertical-align:-1px;}" +
    ".edit-check-pop{display:inline-flex;width:16px;height:16px;align-items:center;justify-content:center;animation:edit-pop .35s ease;}" +
    "@keyframes edit-pop{0%{transform:scale(0.3);opacity:0;}100%{transform:scale(1);opacity:1;}}";
  document.head.appendChild(style);
}

function ensureEditSavingOverlay() {
  ensureEditStyles();
  let ov = document.getElementById("edit-saving-overlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "edit-saving-overlay";
    ov.style.cssText =
      "position:fixed;inset:0;z-index:999999;background:rgba(15,23,42,0.45);display:flex;align-items:center;justify-content:center;";
    ov.innerHTML =
      '<div style="background:#ffffff;border-radius:12px;padding:24px 28px;width:340px;box-shadow:0 12px 40px rgba(0,0,0,0.2);">' +
      '<h3 style="margin:0 0 14px 0;font-size:1rem;font-weight:800;color:#0F172A;">Saving Quotation</h3>' +
      '<div id="edit-saving-steps-list"></div>' +
      "</div>";
    document.body.appendChild(ov);
  }
  return ov;
}

function setEditSavingVisible(visible) {
  const ov = document.getElementById("edit-saving-overlay");
  if (ov) ov.style.display = visible ? "flex" : "none";
}

function renderEditSavingSteps(activeIndex) {
  const steps = [
    "Saving…",
    "Validating quotation…",
    "Saving quotation…",
    "Refreshing quotation…",
    "Success",
  ];
  const container = document.getElementById("edit-saving-steps-list");
  if (!container) return;
  let html = "";
  steps.forEach(function (label, i) {
    let prefix, color;
    if (i < activeIndex) {
      prefix = "\u2713";
      color = "#059669";
    } else if (i === activeIndex) {
      if (i === steps.length - 1) {
        prefix =
          '<span class="edit-check-pop"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5 11-11" stroke="#059669" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
      } else {
        prefix = '<span class="edit-active-spinner"></span>';
      }
      color = i === steps.length - 1 ? "#059669" : "#0284C7";
    } else {
      prefix = "\u25CB";
      color = "#CBD5E1";
    }
    html +=
      '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;color:' +
      color +
      ';font-size:0.85rem;font-weight:600;">' +
      prefix +
      " " +
      escHtml(label) +
      "</div>";
  });
  container.innerHTML = html;
}

window.saveEditQuotation = async function (showPdf) {
  if (_editSaving) return;

  loadState();
  const e = _editState;
  if (!e || !e.quoteId) return;

  const q = STATE.quotations.find(
    (x) => x.id === e.quoteId || x._backendId === e.quoteId,
  );
  if (!q) {
    showToastNotification("Quotation not found for saving.", "error");
    return;
  }

  const backendId = q._backendId || q.id;

  _editSaving = true;
  setEditInputsDisabled(true);
  ensureEditSavingOverlay();
  setEditSavingVisible(true);
  renderEditSavingSteps(0);
  const saveBtn = document.getElementById("e-save-changes-btn");
  if (saveBtn) {
    saveBtn.innerHTML = '<span class="edit-spinner"></span> Saving\u2026';
    saveBtn.disabled = true;
  }
  await new Promise(function (r) {
    setTimeout(r, 80);
  });

  try {
    renderEditSavingSteps(1);
    await new Promise(function (r) {
      setTimeout(r, 80);
    });

    const payload = serializeEditPayload();

    renderEditSavingSteps(2);
    const updated = await quotationService.update(backendId, payload);

    renderEditSavingSteps(3);
    const idx = STATE.quotations.findIndex(
      (x) => x._backendId === backendId || x.id === q.id,
    );
    if (idx >= 0) {
      STATE.quotations[idx] = updated;
    }
    saveState();
    window.removeEventListener("beforeunload", onEditBeforeUnload);
    _editSnapshot = null;
    _editState = null;

    await new Promise(function (r) {
      setTimeout(r, 80);
    });
    renderEditSavingSteps(4);
    await new Promise(function (r) {
      setTimeout(r, 300);
    });

    setEditSavingVisible(false);
    _editSaving = false;
    setEditInputsDisabled(false);

    showToastNotification(`Quotation ${updated.id} updated successfully!`);
    if (showPdf) {
      setTimeout(function () {
        renderPdfFromQuote(updated, null);
      }, 200);
    } else {
      renderApprovalsList(_approvalsFilter || "pending");
    }
  } catch (err) {
    Logger.error("Save edit quotation error:", err);
    const msg =
      err.response?.data?.error?.message ||
      err.message ||
      "Failed to update quotation on server";

    setEditSavingVisible(false);
    _editSaving = false;
    setEditInputsDisabled(false);

    const t = WIZARD_PRODUCT_TEMPLATES[e.subtype];
    if (t) renderInlineEditForm(e.quoteId, t);

    showToastNotification(`Failed to update quotation: ${msg}`, "error");
    alert(
      `Failed to update quotation on server: ${msg}\n\nEdits were NOT saved.\nYour changes have been preserved — you can retry.`,
    );
  }
};

function renderPdfFromQuote(quote, client) {
  if (!quote) return;
  currentPreviewQuoteId = quote.id;

  var clientAddr = client ? client.address : "";
  var clientGst = client ? client.gst : "";
  var clientCo = client ? client.company : "";

  var template = quote.subtype
    ? WIZARD_PRODUCT_TEMPLATES[quote.subtype]
    : Object.values(WIZARD_PRODUCT_TEMPLATES).find(function (t) {
        return t.name === quote.productName;
      });

  var gstRate = quote.gstRate || 18;
  var qty = quote.orderQty || 1;
  // quote.total is the saved grand total (GST-inclusive) exactly as previewed when saved
  var grandTotalVal = quote.total || 0;
  var basicVal = Math.round(grandTotalVal / (1 + gstRate / 100));
  var unitVal = basicVal > 0 ? Math.round(basicVal / qty) : 0;
  var gstVal = grandTotalVal - basicVal;
  var unitGst = Math.round((unitVal * gstRate) / 100);
  var unitTotal = unitVal + unitGst;

  document.getElementById("pdf-gst-label").innerText = "GST " + gstRate + "%";
  document.getElementById("pdf-table-qty").innerText =
    qty + " No" + (qty > 1 ? "s" : "");

  document.getElementById("pdf-ref-no").innerText = "REF:- " + quote.id;
  document.getElementById("pdf-date-val").innerText =
    "DATE: " +
    new Date(quote.date).toLocaleDateString("en-GB").replace(/\//g, ".");
  document.getElementById("pdf-to-company").innerText =
    "M/s " + (clientCo || quote.customerName || "Valued Client").toUpperCase();
  document.getElementById("pdf-to-address-1").innerText =
    (clientAddr || "").substring(0, 45) || "Registered Office";
  document.getElementById("pdf-to-address-2").innerText =
    (clientAddr || "").substring(45) || "GST Registered Address";
  document.getElementById("pdf-to-gst").innerText =
    "GST NO: " + (clientGst || "Pending");

  if (template) {
    var capacityLabel =
      quote.capacity && quote.capacity !== "NA" ? quote.capacity + " " : "";
    var dims = quote.dimensions || template.dimensions;
    var nr = quote.notRequired || {};
    var subframeReq =
      template.specs.some(function (s) {
        return s.id === "subframe";
      }) && !nr["subframe"];
    var hydraulicReq =
      template.specs.some(function (s) {
        return s.id === "cylinder";
      }) && !nr["cylinder"];
    var extras = [];
    if (subframeReq) extras.push("subframe");
    if (hydraulicReq) extras.push("Hydraulic Kit");
    var extrasStr = extras.length ? " with " + extras.join(" & ") : "";
    var dimsStr =
      (dims.length || "") +
      " L \u00D7 " +
      (dims.width || "") +
      " W \u00D7 " +
      (dims.height || "") +
      " H";
    var modelLabel = (
      quote.model ||
      quote.customerName ||
      "Commercial Vehicle"
    ).toUpperCase();
    document.getElementById("pdf-subj-text").innerText =
      "Subject: Quotation for -" +
      modelLabel +
      " , " +
      capacityLabel +
      template.name.toUpperCase() +
      " (" +
      dimsStr +
      ")" +
      extrasStr;
    var descExtras = [];
    if (subframeReq) descExtras.push("WITH SUBFRAME");
    if (hydraulicReq) descExtras.push("CYLINDER KIT");
    var descExtrasStr = descExtras.length ? " " + descExtras.join(" & ") : "";
    document.getElementById("pdf-table-desc").innerHTML =
      capacityLabel +
      template.name.toUpperCase() +
      descExtrasStr +
      "<br>Regular TAIL DOOR " +
      modelLabel;

    var specsContainer = document.getElementById("pdf-specs-list-container");
    var sHtml = "";
    var cnt = 1;
    Object.keys(quote.specs || {}).forEach(function (k) {
      if (nr[k]) return;
      if (k.endsWith("_custom_desc") || k.endsWith("_custom_price")) return;
      var si = template.specs.find(function (s) {
        return s.id === k;
      });
      if (si) {
        var v = quote.specs[k];
        if (typeof v === "string" && v.toLowerCase() === "custom") {
          var d = quote.specs[k + "_custom_desc"];
          if (d) v += " - " + d;
        }
        sHtml +=
          '<div class="pdf-specs-item"><span style="font-weight:bold;min-width:26px;">' +
          cnt++ +
          ".</span><span>" +
          si.name +
          " = " +
          v +
          "</span></div>";
      }
    });
    // Add dimension specs (matching wizard PDF behavior)
    sHtml +=
      '<div class="pdf-specs-item"><span style="font-weight:bold;min-width:26px;">' +
      cnt++ +
      ".</span><span>Overall Length Dimension = " +
      (dims.length || "NA") +
      "</span></div>";
    sHtml +=
      '<div class="pdf-specs-item"><span style="font-weight:bold;min-width:26px;">' +
      cnt++ +
      ".</span><span>Side Gate Height Dimension = " +
      (dims.height || "NA") +
      "</span></div>";
    sHtml +=
      '<div class="pdf-specs-item"><span style="font-weight:bold;min-width:26px;">' +
      cnt++ +
      ".</span><span>Overall Frame Width Dimension = " +
      (dims.width || "NA") +
      "</span></div>";
    // Add custom items if present
    if (quote.customItems && quote.customItems.length) {
      quote.customItems.forEach(function (item) {
        sHtml +=
          '<div class="pdf-specs-item"><span style="font-weight:bold;min-width:26px;">' +
          cnt++ +
          ".</span><span>Accessory = " +
          item.name +
          " (Qty: " +
          item.qty +
          ")</span></div>";
      });
    }
    if (specsContainer) specsContainer.innerHTML = sHtml;
  }

  document.getElementById("pdf-table-basic").innerText =
    formatPdfPrice(unitVal);
  document.getElementById("pdf-table-gst").innerText = formatPdfPrice(unitGst);
  document.getElementById("pdf-table-total").innerText =
    formatPdfPrice(basicVal);
  document.getElementById("pdf-table-gst-total").innerText =
    formatPdfPrice(gstVal);
  document.getElementById("pdf-grand-total-label").innerText =
    formatPdfPrice(unitTotal);
  document.getElementById("pdf-grand-total-val").innerText =
    formatPdfPrice(grandTotalVal);
  document.getElementById("pdf-words-val").innerText =
    priceToIndianWords(grandTotalVal);

  document.getElementById("pdf-terms-list").innerHTML = (quote.terms || [])
    .map(function (t) {
      return "<li>" + t + "</li>";
    })
    .join("");
  var scopeEl = document.getElementById("pdf-scope-val");
  if (scopeEl) scopeEl.innerText = quote.scopeOfWork || "As Mentioned above";

  var spEl = document.getElementById("pdf-salesperson");
  if (spEl) spEl.innerText = quote.salesperson || "";

  var bd = quote.bankDetails || {};
  var bMap = {
    "pdf-bank-company": "companyName",
    "pdf-bank-name": "bankName",
    "pdf-bank-account": "accountNumber",
    "pdf-bank-type": "accountType",
    "pdf-bank-ifsc": "ifsc",
  };
  Object.keys(bMap).forEach(function (id) {
    var el = document.getElementById(id);
    if (el && bd[bMap[id]]) el.innerText = bd[bMap[id]];
  });

  document.getElementById("pdf-preview-modal").classList.add("active");
}

// Frontend submission lock: guarantees ONLY ONE save request can ever be in
// flight, regardless of double-clicks, Enter key, or repeated shortcut triggers.
window._wizardSaveLock = false;

let _WizardSaveButtonHtml = null;
function getWizardSaveButtonHtml() {
  if (!_WizardSaveButtonHtml) {
    const btn = document.getElementById("w-save-quotation-btn");
    if (btn) _WizardSaveButtonHtml = btn.innerHTML;
  }
  return _WizardSaveButtonHtml || "Save Quotation Registry";
}

// Restore the save button so a fresh quotation can be saved again after a
// previous save (e.g. when a new wizard is started).
function resetWizardSaveButton() {
  const btn = document.getElementById("w-save-quotation-btn");
  if (!btn) return;
  if (!_WizardSaveButtonHtml) _WizardSaveButtonHtml = btn.innerHTML;
  btn.disabled = false;
  btn.innerHTML = _WizardSaveButtonHtml;
}

function ensureWizardSaveStyles() {
  const id = "wizard-save-styles";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent =
    ".wz-spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:currentColor;border-radius:50%;animation:wz-spin .6s linear infinite;vertical-align:-2px;}" +
    "@keyframes wz-spin{to{transform:rotate(360deg)}}" +
    ".wz-active-spinner{display:inline-block;width:13px;height:13px;border:2px solid rgba(2,132,199,.25);border-top-color:#0284C7;border-radius:50%;animation:wz-spin .6s linear infinite;vertical-align:-1px;}";
  document.head.appendChild(style);
}

function ensureWizardSaveOverlay() {
  ensureWizardSaveStyles();
  let ov = document.getElementById("wizard-save-overlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "wizard-save-overlay";
    ov.style.cssText = "position:fixed;inset:0;z-index:999999;display:none;align-items:center;justify-content:center;pointer-events:none;";
    ov.innerHTML =
      '<div style="pointer-events:auto;background:#ffffff;border-radius:12px;padding:20px 24px;min-width:340px;box-shadow:0 12px 40px rgba(0,0,0,0.18);border:1px solid #E2E8F0;">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
      '<span class="wz-active-spinner" id="wizard-save-spin"></span>' +
      '<span id="wizard-save-title" style="font-size:0.95rem;font-weight:800;color:var(--color-text-dark);">Saving quotation…</span>' +
      "</div>" +
      '<div id="wizard-save-steps"></div>' +
      '<div id="wizard-save-error" style="display:none;margin-top:12px;padding:10px 12px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;color:#B91C1C;font-size:0.8rem;font-weight:600;"></div>' +
      '<div id="wizard-save-actions" style="margin-top:14px;text-align:right;display:none;"></div>' +
      "</div>";
    document.body.appendChild(ov);
  }
  return ov;
}

function setWizardSaveError(errorMsg) {
  const errEl = document.getElementById("wizard-save-error");
  const actionsEl = document.getElementById("wizard-save-actions");
  if (errEl) {
    errEl.style.display = "block";
    errEl.textContent = errorMsg || "Failed to save quotation to server.";
  }
  // Provide a manual retry (lock is released, so a fresh request is allowed).
  if (actionsEl) {
    actionsEl.style.display = "block";
    actionsEl.innerHTML =
      '<button type="button" class="btn btn-outline btn-sm" onclick="saveWizardQuotation()" style="font-weight:700;">Retry save</button>';
  }
}

function renderWizardSaveStepList(activeIndex) {
  const container = document.getElementById("wizard-save-steps");
  if (!container) return;
  const steps = [
    "Validating quotation",
    "Saving quotation",
    "Waiting for server",
    "Finalizing quotation",
    "Quotation saved successfully",
  ];
  let html = "";
  steps.forEach(function (label, i) {
    let prefix, color;
    if (i < activeIndex) {
      prefix = "\u2713";
      color = "#059669";
    } else if (i === activeIndex) {
      if (i === steps.length - 1) {
        prefix = "\u2713";
        color = "#059669";
      } else {
        prefix = '<span class="wz-active-spinner"></span>';
        color = "#0284C7";
      }
    } else {
      prefix = "\u25CB";
      color = "#CBD5E1";
    }
    html +=
      '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;color:' +
      color +
      ";font-size:0.84rem;font-weight:600;" +
      '">' +
      prefix +
      " " +
      escHtml(label) +
      "</div>";
  });
  container.innerHTML = html;
}

function setWizardSaveOverlayVisible(visible) {
  const ov = document.getElementById("wizard-save-overlay");
  if (ov) ov.style.display = visible ? "flex" : "none";
}

function setWizardSaveButtonState(state, originalHtml) {
  const btn = document.getElementById("w-save-quotation-btn");
  if (!btn) return;
  if (state === "busy") {
    btn.disabled = true;
    btn.innerHTML =
      '<span class="wz-spinner"></span> Saving quotation\u2026';
  } else if (state === "success") {
    btn.disabled = true;
    btn.innerHTML =
      '<span style="color:#059669;">\u2713</span> Quotation Saved Successfully';
  } else {
    // idle / error → restore the original button (values remain in the form)
    btn.disabled = false;
    btn.innerHTML = originalHtml || "Save Quotation Registry";
  }
}

async function runWizardQuotationSave() {
  // Original quotation generation logic. Kept EXACTLY as before — only the
  // surrounding save UX is managed by saveWizardQuotation() below.
  loadState();

  if (typeof calculateWizardPricing === "function") {
    calculateWizardPricing();
  }

  // Robust customer data capture from form or state
  if (!wizardState.customer) wizardState.customer = {};

  const nameVal =
    (document.getElementById("w-cust-name")?.value || "").trim() ||
    wizardState.customer.name ||
    "Valued Client";
  const companyVal =
    (document.getElementById("w-cust-company")?.value || "").trim() ||
    wizardState.customer.company ||
    nameVal;
  const phoneVal =
    (document.getElementById("w-cust-phone")?.value || "").trim() ||
    wizardState.customer.phone ||
    "";
  const emailVal =
    (document.getElementById("w-cust-email")?.value || "").trim() ||
    wizardState.customer.email ||
    "";
  const addressVal =
    (document.getElementById("w-cust-address")?.value || "").trim() ||
    wizardState.customer.address ||
    "";
  const dateVal =
    document.getElementById("w-cust-date")?.value ||
    wizardState.customer.date ||
    new Date().toISOString().split("T")[0];

  wizardState.customer = {
    name: nameVal,
    company: companyVal,
    phone: phoneVal,
    email: emailVal,
    address: addressVal,
    date: dateVal,
    model: wizardState.customer.model || "Commercial Vehicle",
  };

  const c = wizardState.customer;
  const subtype = wizardState.subtype || "flatbed";
  const template =
    WIZARD_PRODUCT_TEMPLATES[subtype] || WIZARD_PRODUCT_TEMPLATES["flatbed"];

  // Generate sequential quotation REF number (e.g. CR/001/2026)
  STATE.quotationCounter = (STATE.quotationCounter || 0) + 1;
  const quoteId = generateRefNumber(c.name, STATE.quotationCounter);

  // 1. Create/Update Client Profile
  if (!STATE.customers) STATE.customers = [];
  let client = STATE.customers.find(
    (x) =>
      x.company &&
      x.company.toLowerCase() === (c.company || "").toLowerCase(),
  );
  if (!client) {
    try {
      client = await customerService.create({
        name: c.name,
        company: c.company,
        phone: c.phone,
        email: c.email,
        address: c.address,
      });
      STATE.customers.push(client);
    } catch (custErr) {
      client = {
        id: null,
        name: c.name,
        company: c.company,
        phone: c.phone,
        email: c.email,
        address: c.address,
      };
    }
  }

// 2. Build quotation payload
  const quotePayload = {
    customerId: client.id || null,
    customerName: client.company || client.name,
    model: wizardState.customer.model || "Commercial Vehicle",
    productName: template ? template.name : "Custom Trailer",
    productKey: wizardState.category || "trailer",
    templateKey: subtype,
    date: c.date,
    total: wizardState.total || (template ? template.basePrice : 520000),
    status: "Pending Approval",
    specs: JSON.parse(JSON.stringify(wizardState.specs || {})),
    notRequired: JSON.parse(JSON.stringify(wizardState.notRequired || {})),
    capacity: wizardState.capacity || "NA",
    dimensions: {
      length:
        document.getElementById("w-dim-length")?.value ||
        template?.dimensions?.length,
      height:
        document.getElementById("w-dim-height")?.value ||
        template?.dimensions?.height,
      width:
        document.getElementById("w-dim-width")?.value ||
        template?.dimensions?.width,
    },
    scopeOfWork: wizardState.scopeOfWork || "As Mentioned above",
    terms: wizardState.terms || [],
    orderQty: wizardState.orderQty || 1,
    bankDetails: JSON.parse(JSON.stringify(wizardState.bankDetails || {})),
  };

  // 3. Synchronous REST API creation call to Supabase backend
  const createdQuote = await quotationService.create(quotePayload);
  const submittedQuote = await quotationService.submit(
    createdQuote._backendId,
  );
  const finalQuote = submittedQuote;

  // 4. Update STATE ONLY upon API SUCCESS
  if (!STATE.quotations) STATE.quotations = [];
  const idx = STATE.quotations.findIndex(
    (q) =>
      q._backendId === createdQuote._backendId || q.id === createdQuote.id,
  );
  if (idx >= 0) {
    STATE.quotations[idx] = createdQuote;
  } else {
    STATE.quotations.push(createdQuote);
  }

  logSystemActivity(
    `Quotation ${createdQuote.id} created & saved to database.`,
  );
  saveState();

  return createdQuote;
}

window.saveWizardQuotation = async function () {
  if (window._wizardSaveLock) return; // ignore duplicate clicks / Enter / shortcuts
  window._wizardSaveLock = true;

  // Capture the pristine button HTML once so restores keep the original icon.
  const originalHtml = getWizardSaveButtonHtml();

  // 1. Immediate UI feedback on the very first click.
  setWizardSaveButtonState("busy", originalHtml);

  // 2. Non-blocking progress overlay (async, non-blocking).
  ensureWizardSaveOverlay();
  const errEl = document.getElementById("wizard-save-error");
  const actionsEl = document.getElementById("wizard-save-actions");
  if (errEl) errEl.style.display = "none";
  if (actionsEl) actionsEl.style.display = "none";
  setWizardSaveOverlayVisible(true);

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    renderWizardSaveStepList(0); // Validating quotation
    await wait(160);
    renderWizardSaveStepList(1); // Saving quotation
    await wait(160);
    renderWizardSaveStepList(2); // Waiting for server (during the real request)

    const createdQuote = await runWizardQuotationSave();

    renderWizardSaveStepList(3); // Finalizing quotation
    await wait(160);
    renderWizardSaveStepList(4); // ✓ Saved successfully

    // 4. Success state visible ~around for the requested duration.
    setWizardSaveButtonState("success");
    await wait(800);
    setWizardSaveOverlayVisible(false);

    // Continue with the existing success flow (notification + approvals page).
    showToastNotification(
      `Quotation ${createdQuote.id} saved! Sent to Approval page.`,
    );
    switchModule("approvals");
    if (window.renderApprovalsList) renderApprovalsList("pending");
  } catch (err) {
    Logger.error("Save quotation error:", err);
    const errorMsg =
      err.response?.data?.error?.message ||
      err.message ||
      "Failed to save quotation to server.";

    // 5. Failure → restore button, keep entered values, clear error, allow retry.
    setWizardSaveButtonState("idle", originalHtml);
    setWizardSaveError(errorMsg);
    showToastNotification(`Failed to save: ${errorMsg}`, "error");
    // DO NOT navigate away. DO NOT push to STATE.quotations.
    // Non-blocking overlay remains visible with the retry action.
  } finally {
    window._wizardSaveLock = false;
  }
};

window.convertWizardToWorkOrder = function () {
  loadState();
  const c = wizardState.customer;
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  STATE.quotationCounter = (STATE.quotationCounter || 0) + 1;
  const quoteId = generateRefNumber(c ? c.name : "", STATE.quotationCounter);
  const woId = `WO-2026-${String(STATE.quotationCounter).padStart(3, "0")}`;

  // Compile spec dump details so production team never re-enters data
  const specDetails = [];
  Object.keys(wizardState.specs).forEach((key) => {
    if (wizardState.notRequired[key]) return;
    if (key.endsWith("_custom_desc") || key.endsWith("_custom_price")) return;
    const specInfo = template.specs.find((s) => s.id === key);
    if (specInfo) {
      let val = wizardState.specs[key];
      if (val.toLowerCase() === "custom") {
        const desc = wizardState.specs[key + "_custom_desc"];
        if (desc) val += ` - ${desc}`;
      }
      specDetails.push(`${specInfo.name}: ${val}`);
    }
  });

  // Add custom item specs
  const customSections = getCustomItemSpecs();
  customSections.forEach((section) => {
    section.fields.forEach((field) => {
      if (wizardState.notRequired[field.id]) return;
      const val = wizardState.specs[field.id];
      if (val) {
        let displayVal = val;
        if (val.toLowerCase() === "custom") {
          const desc = wizardState.specs[field.id + "_custom_desc"];
          if (desc) displayVal += ` - ${desc}`;
        }
        specDetails.push(`[${section.name}] ${field.name}: ${displayVal}`);
      }
    });
  });

  STATE.workOrders.push({
    id: woId,
    quoteId,
    customerName: c.company,
    product: template.name,
    date: c.date,
    stage: "Pending",
    progress: 0,
    specs: specDetails,
    notes: `Configured dynamically via ERP Wizard. Sales rep: ${c.salesperson}`,
    dueDate: null,
    urgent: false,
  });

  logSystemActivity(
    `Work Order ${woId} successfully dispatched for quote: ${quoteId}.`,
  );
  saveState();

  alert(
    `Work Order ${woId} generated successfully! Dispatched to the shop floor factory production pipeline.`,
  );
  switchModule("status");
};

window.downloadWizardPdf = function () {
  const element = document.getElementById("w-pdf-sheet-render");
  const c = wizardState.customer;
  const nextCounter = (STATE.quotationCounter || 0) + 1;
  const previewRef = generateRefNumber(c ? c.name : "", nextCounter);
  const safeRef = previewRef.replace(/\//g, "-");
  const opt = {
    margin: [0, 0, 0, 0],
    filename: `NEXFRA_Quotation_${safeRef}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: false,
      scrollY: 0,
      onclone: (clonedDoc) => {
        const sheet = clonedDoc.getElementById("w-pdf-sheet-render");
        if (sheet) {
          sheet.style.transform = "none";
          sheet.style.scale = "1";
        }
        clonedDoc.querySelectorAll(".pdf-page, .pdf-page *").forEach((el) => {
          el.style.fontFamily = "Arial, Helvetica, sans-serif";
          el.style.wordSpacing = "0.15em";
          el.style.letterSpacing = "normal";
          el.style.whiteSpace = "normal";
        });
      },
    },
    jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] },
  };

  if (typeof html2pdf !== "undefined") {
    html2pdf().set(opt).from(element).save();
  } else {
    alert("PDF library loading error. Try printing vector.");
  }
};

window.printWizardPdf = function () {
  window.print();
};

// ------------------------------------------
// 5. WORK ORDERS RENDERER
// ------------------------------------------

// --- Filter helpers (shared across Work Orders, Production Board, Approvals) ---

function getProductCategory(productName) {
  const n = (productName || "").toLowerCase();
  if (
    n.includes("flat bed") ||
    n.includes("side wall") ||
    n.includes("tip trailer")
  )
    return "COMMERCIAL TRAILER";
  if (n.includes("box body") || n.includes("rock body"))
    return "TIPPER DUMPER BODY";
  if (n.includes("rigid load body")) return "RIGID LOAD BODY";
  return "OTHER";
}

function toggleModuleFilter(moduleName) {
  const dd = document.getElementById("filter-dd-" + moduleName);
  if (!dd) return;
  const isVisible = dd.style.display === "block";
  // Close all other filter dropdowns
  document
    .querySelectorAll(".filter-dd")
    .forEach((el) => (el.style.display = "none"));
  if (!isVisible) {
    const f = _moduleFilters[moduleName] || {};
    const fromEl = document.getElementById("filter-" + moduleName + "-from");
    const toEl = document.getElementById("filter-" + moduleName + "-to");
    const catEl = document.getElementById("filter-" + moduleName + "-cat");
    const urgentEl = document.getElementById(
      "filter-" + moduleName + "-urgent",
    );
    if (fromEl) fromEl.value = f.dateFrom || "";
    if (toEl) toEl.value = f.dateTo || "";
    if (catEl) catEl.value = f.category || "All";
    if (urgentEl) urgentEl.checked = f.urgent === "1";
    const btn = document.querySelector(`[data-filter-btn="${moduleName}"]`);
    if (btn) {
      const r = btn.getBoundingClientRect();
      dd.style.position = "fixed";
      dd.style.top = r.bottom + 6 + "px";
      dd.style.right = window.innerWidth - r.right + "px";
      dd.style.left = "auto";
      dd.style.bottom = "auto";
      dd.style.zIndex = 2147483647;
      // Move to body to avoid any parent stacking context clipping
      if (dd.parentElement !== document.body) {
        document.body.appendChild(dd);
      }
    }
    dd.style.display = "block";
  }
}

function setDatePreset(moduleName, months) {
  const now = new Date();
  const from = new Date(now);
  if (months === 12) {
    from.setFullYear(from.getFullYear() - 1);
  } else {
    from.setMonth(from.getMonth() - months);
  }
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = now.toISOString().slice(0, 10);
  const fromEl = document.getElementById("filter-" + moduleName + "-from");
  const toEl = document.getElementById("filter-" + moduleName + "-to");
  if (fromEl) fromEl.value = fromStr;
  if (toEl) toEl.value = toStr;
  if (!_moduleFilters[moduleName]) _moduleFilters[moduleName] = {};
  _moduleFilters[moduleName].dateFrom = fromStr;
  _moduleFilters[moduleName].dateTo = toStr;
  if (moduleName === "workorders") renderWorkOrders();
  else if (moduleName === "production") renderProductionBoard();
  else if (moduleName === "approvals")
    renderApprovalsList(_approvalsFilter || "pending");
}

function setModuleFilter(moduleName, field, value) {
  if (!_moduleFilters[moduleName]) _moduleFilters[moduleName] = {};
  _moduleFilters[moduleName][field] = value;
  if (moduleName === "workorders") renderWorkOrders();
  else if (moduleName === "production") renderProductionBoard();
  else if (moduleName === "approvals")
    renderApprovalsList(_approvalsFilter || "pending");
}

function clearModuleFilters(moduleName) {
  delete _moduleFilters[moduleName];
  const searchEl = document.getElementById("search-" + moduleName);
  if (searchEl) searchEl.value = "";
  if (moduleName === "workorders") renderWorkOrders();
  else if (moduleName === "production") renderProductionBoard();
  else if (moduleName === "approvals")
    renderApprovalsList(_approvalsFilter || "pending");
}

function applyModuleFilter(
  moduleName,
  items,
  dateField,
  productField,
  searchFields,
) {
  const f = _moduleFilters[moduleName] || {};
  const searchTerm = (f.search || "").toLowerCase().trim();
  if (
    !f.dateFrom &&
    !f.dateTo &&
    (!f.category || f.category === "All") &&
    !searchTerm
  )
    return items;
  return items.filter((item) => {
    const d = item[dateField] || "";
    if (f.dateFrom && d < f.dateFrom) return false;
    if (f.dateTo && d > f.dateTo) return false;
    if (
      f.category &&
      f.category !== "All" &&
      getProductCategory(item[productField]) !== f.category
    )
      return false;
    if (searchTerm && searchFields) {
      const match = searchFields.some((field) => {
        const val = item[field];
        return val && String(val).toLowerCase().includes(searchTerm);
      });
      if (!match) return false;
    }
    return true;
  });
}
// --- End filter helpers ---

window.renderAllQuotations = function () {
  loadState();
  const container = document.getElementById("allquotations-cards-container");
  if (!container) return;
  if (!STATE.quotations) STATE.quotations = [];

  const filtered = applyModuleFilter(
    "allquotations",
    STATE.quotations,
    "date",
    "productName",
    ["id", "customerName", "productName"],
  );

  if (filtered.length === 0) {
    container.innerHTML =
      '<div style="text-align:center; padding:60px 20px; color:#94A3B8; font-size:0.9rem; font-weight:600;">No quotations found.</div>';
    return;
  }

  container.innerHTML = filtered
    .map((q) => {
      const wo = STATE.workOrders.find((w) => w.quoteId === q.id);
      const prod = STATE.productionItems
        ? STATE.productionItems.find((p) => p.quoteId === q.id)
        : null;
      const pct = prod ? prod.progressPct || 0 : wo ? wo.progress || 0 : 0;
      const formattedPrice = "₹" + (q.total || 0).toLocaleString("en-IN");

      let statusColor = "#D97706";
      let statusText = q.status || "Draft";
      if (q.status === "Approved") {
        statusColor = "#059669";
      } else if (q.status === "Denied") {
        statusColor = "#DC2626";
      } else if (q.status === "Pending Approval") {
        statusColor = "#D97706";
      }

      return `
      <div style="background:#ffffff; border:1.5px solid #CBD5E1; border-radius:8px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.04);">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px; background:#F8FAFC;">
          <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
            <span style="background:#0F172A; color:#ffffff; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:4px;">${q.id}</span>
            ${wo ? `<span style="background:#1E40AF; color:#ffffff; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:4px;">${wo.id}</span>` : ""}
            <span style="font-weight:700; font-size:0.85rem; color:#1E293B;">${q.productName || "Custom Vehicle"}</span>
            <span style="font-size:0.7rem; font-weight:600; color:#64748B;">${q.customerName || ""}</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="display:inline-flex; align-items:center; gap:6px;">
              <span style="width:50px; height:6px; background:#E2E8F0; border-radius:3px; overflow:hidden; display:inline-block;">
                <span style="display:block; width:${Math.min(pct, 100)}%; height:100%; background:${pct >= 100 ? "#10B981" : "#3B82F6"}; border-radius:3px;"></span>
              </span>
              <span style="font-size:0.7rem; font-weight:700; color:${pct >= 100 ? "#059669" : "#2563EB"};">${pct}%</span>
            </span>
            <span style="font-size:0.7rem; font-weight:700; color:${statusColor};">${statusText}</span>
            <span style="font-size:0.75rem; font-weight:600; color:#475569;">${formattedPrice}</span>
            <button class="btn btn-outline btn-xs" onclick="event.stopPropagation(); openPdfPreview('${q.id}')" style="font-weight:700; padding:4px 12px; font-size:0.7rem;">
              View Quotation
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
};

function renderWorkOrders() {
  loadState();
  const container = document.getElementById("workorders-container");
  if (!container) return;

  if (STATE.workOrders.length === 0) {
    container.innerHTML =
      '<p class="section-hint text-center py-lg col-span-2">No active work orders in shop queue.</p>';
    return;
  }

  const filtered = applyModuleFilter(
    "workorders",
    STATE.workOrders,
    "date",
    "product",
    ["id", "quoteId", "customerName", "product"],
  );
  const urgentOnly =
    _moduleFilters &&
    _moduleFilters.workorders &&
    _moduleFilters.workorders.urgent === "1";
  const displayItems = urgentOnly
    ? filtered.filter((wo) => wo.urgent)
    : filtered;
  container.innerHTML = displayItems
    .map((wo) => {
      const collapsed = wo._collapsed !== false;
      const todayStr = new Date().toISOString().split("T")[0];
      let dueStatus = "";
      let daysUntil = null;
      if (wo.urgent) {
        dueStatus = "URGENT";
      } else if (wo.dueDate) {
        daysUntil = Math.ceil(
          (new Date(wo.dueDate) - new Date(todayStr)) / (1000 * 60 * 60 * 24),
        );
        dueStatus = daysUntil <= 3 ? "URGENT" : "ON SCHEDULE";
      }
      var woProdHtml = "";
      var woStage = wo.stage;
      var woProgress = wo.progress;
      (function () {
        var pi = STATE.productionItems
          ? STATE.productionItems.find(function (p) {
              return p.quoteId === wo.quoteId;
            })
          : null;
        if (pi) {
          woStage = pi.columnStatus || wo.stage;
          woProgress =
            typeof pi.progressPct === "number" ? pi.progressPct : wo.progress;
        }
        if (!pi) return;
        var schema = getProgressionSchema();
        var map = pi.progressionMap || {};
        var stages = schema.map(function (sec) {
          var allDone = true;
          sec.subsections.forEach(function (sub) {
            sub.items.forEach(function (item) {
              var key = sec.id + "_" + sub.id + "_" + item.id;
              if (!map[key]) allDone = false;
            });
          });
          return { name: sec.name.replace(/^\d+\.\s*/, ""), done: allDone };
        });
        if (stages.length === 0) return;
        var lineHtml = "";
        stages.forEach(function (s, i) {
          lineHtml +=
            '<div style="display:flex;align-items:center;flex-shrink:0;">';
          lineHtml +=
            '<span style="padding:4px 10px;border-radius:4px;font-size:0.7rem;font-weight:700;white-space:nowrap;background:' +
            (s.done ? "#10B981" : "#E2E8F0") +
            ";color:" +
            (s.done ? "#fff" : "#64748B") +
            ';">' +
            s.name +
            "</span>";
          if (i < stages.length - 1) {
            lineHtml +=
              '<div style="width:16px;height:3px;background:' +
              (s.done ? "#10B981" : "#E2E8F0") +
              ';margin:0 3px;flex-shrink:0;"></div>';
          }
          lineHtml += "</div>";
        });
        woProdHtml =
          '<div class="wo-prod-box" style="background:#F1F5F9;padding:12px;border-radius:6px;margin-bottom:12px;">' +
          '<h4 style="margin:0 0 8px 0;font-size:0.8rem;font-weight:800;color:#1E293B;">PRODUCTION</h4>' +
          '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0;">' +
          lineHtml +
          "</div></div>";
      })();
      var woQuote = (STATE.quotations || []).find(function (q) {
        return (
          q.id === wo.quoteId ||
          q._backendId === wo.quoteId ||
          q.id === wo._backendQuoteId
        );
      });
      var woQty = woQuote ? woQuote.orderQty || 1 : 1;
      var displayWoId = sanitizeDisplayId(
        wo.workOrderNumber || wo.id,
        "WO-000000",
      );
      var displayQuoteId = resolveQuotationDisplayNumber(wo, [
        woQuote ? woQuote.id : null,
      ]);
      return `
      <div class="wo-card" style="margin-bottom:10px; border:1.5px solid #CBD5E1; border-radius:8px; overflow:hidden; background:#ffffff; box-shadow:0 1px 4px rgba(0,0,0,0.04);">
        <div class="wo-header" onclick="toggleWorkOrder('${wo.id}')" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#F8FAFC; cursor:pointer; border-bottom:${collapsed ? "none" : "1px solid #E2E8F0"}; transition:background 0.15s;">
          <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
            <span style="background:#0F172A; color:#ffffff; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:4px;">${displayWoId}</span>
            <span style="font-weight:700; font-size:0.85rem; color:#1E293B;">${displayQuoteId}</span>
            <span style="font-size:0.75rem; font-weight:600; color:var(--color-primary);">${wo.product}</span>
            <span style="font-size:0.7rem; font-weight:600; color:#64748B;">Qty: ${woQty}</span>
            <span style="font-size:0.7rem; font-weight:600; color:#64748B;">Stage: ${woStage}</span>
            <span style="display:inline-flex; align-items:center; gap:6px;"><span style="width:60px; height:6px; background:#E2E8F0; border-radius:3px; overflow:hidden; display:inline-block;"><span style="display:block; width:${Math.min(parseInt(woProgress) || 0, 100)}%; height:100%; background:${parseInt(woProgress) >= 100 ? "#10B981" : "#3B82F6"}; border-radius:3px; transition:width 0.3s;"></span></span><span style="font-size:0.7rem; font-weight:700; color:${parseInt(woProgress) >= 100 ? "#059669" : "#2563EB"};">${woProgress}% Complete</span></span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            ${wo.approvedDate ? `<span style="font-size:0.7rem; font-weight:600; color:#475569;">Approved: ${wo.approvedDate}</span>` : ""}
            ${wo.dueDate ? `<span style="font-size:0.7rem; font-weight:700; color:#475569;">Due: ${wo.dueDate}</span>` : `<span style="font-size:0.7rem; color:#94A3B8;">${wo.date}</span>`}
            ${dueStatus ? `<span style="font-size:0.65rem; font-weight:800; padding:2px 8px; border-radius:4px; ${dueStatus === "URGENT" ? "background:#FEE2E2; color:#DC2626;" : "background:#D1FAE5; color:#059669;"}">${dueStatus}</span>` : ""}
            <span style="font-size:0.75rem; color:#64748B; transition:transform 0.2s; ${collapsed ? "" : "transform:rotate(180deg);"}">▼</span>
          </div>
        </div>
        <div class="wo-body" style="${collapsed ? "display:none;" : ""} padding:16px;">
          <div class="wo-specs-box" style="background:#F1F5F9; padding:12px; border-radius:6px; margin-bottom:12px;">
            <h4 style="margin:0 0 8px 0; font-size:0.8rem; font-weight:800; color:#1E293B;">TECHNICAL SPECIFICATIONS PRINT</h4>
            <ul style="margin:0; padding-left:20px; display:flex; flex-wrap:wrap; gap:4px 20px;">
              ${wo.specs.map((spec) => `<li style="font-size:0.78rem; color:#475569; min-width:180px;"><span>${spec}</span></li>`).join("")}
            </ul>
          </div>
          ${(function () {
            var chRecords = (STATE.chassisRecords || []).filter(function (cr) {
              return cr.workOrderId === wo.id;
            });
            if (chRecords.length === 0) return "";
            return (
              '<div class="wo-chassis-box" style="background:#F0F9FF;padding:12px;border-radius:6px;margin-bottom:12px;border:1px solid #BAE6FD;"><h4 style="margin:0 0 8px 0;font-size:0.8rem;font-weight:800;color:#0369A1;">ALLOCATED CHASSIS</h4>' +
              chRecords
                .map(function (cr) {
                  return (
                    '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:0.78rem;"><span style="font-weight:600;color:#1E293B;">' +
                    cr.chassisNumber +
                    '</span><span style="color:#64748B;">' +
                    (cr.brand || cr.brandModel || "") +
                    (cr.model ? " / " + cr.model : "") +
                    " — " +
                    cr.field +
                    (cr.outDate ? " — Out: " + cr.outDate : "") +
                    "</span></div>"
                  );
                })
                .join("") +
              "</div>"
            );
          })()}
          ${woProdHtml}
          <div class="wo-notes" style="font-size:0.8rem; color:#475569; margin-bottom:12px;">
            <strong>Factory Notes:</strong> ${wo.notes}
          </div>
          <div class="wo-due" style="display:flex; align-items:center; gap:8px; margin-bottom:12px; padding:8px 12px; background:#F8FAFC; border-radius:6px; border:1px solid #E2E8F0;">
            <span style="font-size:0.75rem; font-weight:700; color:#475569;">Due Date:</span>
            <input type="date" id="due-${wo.id}" value="${wo.dueDate || ""}" min="${new Date().toISOString().split("T")[0]}" style="font-size:0.75rem; padding:2px 6px; border:1px solid #CBD5E1; border-radius:4px;">
            <button type="button" class="btn btn-primary btn-xs" onclick="event.stopPropagation(); setWorkOrderDueDate('${wo.id}')" style="font-size:0.7rem; padding:3px 10px; font-weight:700;">Save</button>
            ${wo.dueDate ? `<button type="button" class="btn btn-outline btn-xs" onclick="event.stopPropagation(); clearWorkOrderDueDate('${wo.id}')" style="font-size:0.7rem; padding:3px 10px; color:#EF4444; border-color:#FCA5A5; font-weight:700;">Clear</button>` : ""}
          </div>
          <div class="wo-footer" style="display:flex; gap:12px;">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openOrderProgressionModal('${wo.quoteId}')" style="background:#0F172A; border:none; color:#fff; padding:6px 14px; font-size:0.75rem; font-weight:700; border-radius:6px;">Track Order</button>
            <button class="btn btn-sm" onclick="event.stopPropagation(); printWorkOrder('${wo.id}')" style="background:#F8FAFC; border:1.5px solid #CBD5E1; color:#1E293B; padding:6px 14px; font-size:0.75rem; font-weight:700; border-radius:6px; cursor:pointer;">🖨 Print</button>
            <button class="btn btn-sm" onclick="event.stopPropagation(); toggleWorkOrderUrgent('${wo.id}')" style="background:${wo.urgent ? "#DC2626" : "#F1F5F9"}; border:1.5px solid ${wo.urgent ? "#DC2626" : "#CBD5E1"}; color:${wo.urgent ? "#fff" : "#475569"}; padding:6px 14px; font-size:0.75rem; font-weight:700; border-radius:6px; cursor:pointer;">${wo.urgent ? "✓ Urgent" : "Set Urgent"}</button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

window.toggleWorkOrder = function (id) {
  const wo = STATE.workOrders.find((w) => w.id === id);
  if (wo) {
    wo._collapsed = wo._collapsed !== false ? false : true;
    saveState();
    renderWorkOrders();
  }
};

window.toggleWorkOrderUrgent = function (id) {
  const wo = STATE.workOrders.find((w) => w.id === id);
  if (!wo) return;
  wo.urgent = !wo.urgent;
  // Sync to production item if it exists
  const prod = STATE.productionItems
    ? STATE.productionItems.find((p) => p.quoteId === wo.quoteId)
    : null;
  if (prod) prod.urgent = wo.urgent;
  saveState();
  renderWorkOrders();
};

window.printWorkOrder = function (woId) {
  loadState();
  var wo = STATE.workOrders.find(function (w) {
    return w.id === woId;
  });
  if (!wo) return;
  var q = STATE.quotations
    ? STATE.quotations.find(function (qt) {
        return qt.id === wo.quoteId;
      })
    : null;
  var chassisRecords = (STATE.chassisRecords || []).filter(function (cr) {
    return cr.workOrderId === woId;
  });
  var content = document.getElementById("wo-print-content");
  content.innerHTML =
    "" +
    '<div style="text-align:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #E5E7EB;">' +
    '<div style="font-weight:800;font-size:1rem;color:#0F172A;">NEXFRA HEAVY ENGINEERING</div>' +
    '<div style="font-size:0.7rem;color:#64748B;">Work Order Print</div>' +
    "</div>" +
    '<div style="font-size:0.75rem;color:#64748B;text-align:center;margin-bottom:12px;">Status: ' +
    (wo.stage || "Pending") +
    " | Progress: " +
    (wo.progress || 0) +
    "%</div>" +
    '<div class="section" style="margin-bottom:16px;"><h3 style="margin:0 0 8px 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;color:#475569;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">Order Information</h3>' +
    '<table style="width:100%;border-collapse:collapse;font-size:0.82rem;">' +
    '<tr><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:600;color:#64748B;width:130px;">Work Order</td><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:700;color:#1E293B;">' +
    woId +
    "</td></tr>" +
    '<tr><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:600;color:#64748B;">Order Date</td><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:700;color:#1E293B;">' +
    (wo.date || "—") +
    "</td></tr>" +
    '<tr><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:600;color:#64748B;">Approved Date</td><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:700;color:#1E293B;">' +
    (wo.approvedDate || "—") +
    "</td></tr>" +
    '<tr><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:600;color:#64748B;">Due Date</td><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:700;color:#1E293B;">' +
    (wo.dueDate || "Not set") +
    "</td></tr>" +
    '<tr><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:600;color:#64748B;">Customer</td><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:700;color:#1E293B;">' +
    (wo.customerName || "—") +
    "</td></tr>" +
    '<tr><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:600;color:#64748B;">Quotation Ref</td><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:700;color:#1E293B;">' +
    wo.quoteId +
    "</td></tr>" +
    "</table></div>" +
    '<div class="section" style="margin-bottom:16px;"><h3 style="margin:0 0 8px 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;color:#475569;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">Vehicle</h3>' +
    '<table style="width:100%;border-collapse:collapse;font-size:0.82rem;">' +
    '<tr><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:600;color:#64748B;width:130px;">Product</td><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:700;color:#1E293B;">' +
    (wo.product || "—") +
    "</td></tr>" +
    '<tr><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:600;color:#64748B;">Model</td><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:700;color:#1E293B;">' +
    (q ? q.model || "—" : "—") +
    "</td></tr>" +
    '<tr><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:600;color:#64748B;">Quantity</td><td style="padding:5px 8px;border-bottom:1px solid #F1F5F9;font-weight:700;color:#1E293B;">' +
    (q ? q.orderQty || 1 : 1) +
    "</td></tr>" +
    "</table></div>" +
    '<div class="section" style="margin-bottom:16px;"><h3 style="margin:0 0 8px 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;color:#475569;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">Technical Specifications</h3>' +
    '<ul style="list-style:none;padding:0;margin:0;">' +
    (wo.specs || [])
      .map(function (s) {
        return (
          '<li style="padding:4px 0;font-size:0.8rem;color:#475569;border-bottom:1px solid #F1F5F9;">' +
          s +
          "</li>"
        );
      })
      .join("") +
    "</ul></div>" +
    (chassisRecords.length > 0
      ? '<div class="section" style="margin-bottom:16px;"><h3 style="margin:0 0 8px 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;color:#475569;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">Allocated Chassis</h3>' +
        chassisRecords
          .map(function (cr) {
            return (
              '<div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:6px;padding:10px;margin-bottom:6px;font-size:0.8rem;"><strong>' +
              cr.chassisNumber +
              "</strong> — " +
              (cr.brand || cr.brandModel || "") +
              (cr.model ? " / " + cr.model : "") +
              " (" +
              cr.field +
              ")" +
              (cr.outDate ? " — Out: " + cr.outDate : "") +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      : "") +
    '<div class="section" style="margin-bottom:8px;"><h3 style="margin:0 0 8px 0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;color:#475569;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">Factory Notes</h3><p style="font-size:0.82rem;color:#475569;margin:0;">' +
    (wo.notes || "—") +
    "</p></div>" +
    '<div style="margin-top:12px;padding-top:8px;border-top:1px solid #E5E7EB;font-size:0.65rem;color:#94A3B8;text-align:center;">Generated on ' +
    new Date().toLocaleDateString("en-GB") +
    " at " +
    new Date().toLocaleTimeString("en-GB") +
    "</div>";
  document.getElementById("wo-print-modal").style.display = "flex";
};

window.closeWorkOrderPrintModal = function () {
  document.getElementById("wo-print-modal").style.display = "none";
};

window.printWorkOrderContent = function () {
  var content = document.getElementById("wo-print-content").innerHTML;
  var win = window.open("", "_blank");
  win.document.write(
    "<html><head><title>Work Order</title><style>" +
      "body{font-family:Arial,sans-serif;padding:40px;color:#1E293B;}" +
      "table{width:100%;border-collapse:collapse;}" +
      "td{padding:5px 8px;border-bottom:1px solid #F1F5F9;}" +
      "ul{list-style:none;padding:0;margin:0;}" +
      "li{padding:4px 0;font-size:0.8rem;color:#475569;border-bottom:1px solid #F1F5F9;}" +
      ".section{margin-bottom:16px;}" +
      ".section h3{font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;color:#475569;border-bottom:1px solid #E2E8F0;padding-bottom:6px;}" +
      "@media print{body{padding:20px;}}</style></head><body>" +
      content +
      "</body></html>",
  );
  win.document.close();
  win.focus();
  setTimeout(function () {
    win.print();
  }, 300);
};

window.downloadWorkOrderPdf = function () {
  var content = document.getElementById("wo-print-content").innerHTML;
  var win = window.open("", "_blank");
  win.document.write(
    "<html><head><title>Work Order</title><style>" +
      "body{font-family:Arial,sans-serif;padding:40px;color:#1E293B;}" +
      "table{width:100%;border-collapse:collapse;}" +
      "td{padding:5px 8px;border-bottom:1px solid #F1F5F9;}" +
      "ul{list-style:none;padding:0;margin:0;}" +
      "li{padding:4px 0;font-size:0.8rem;color:#475569;border-bottom:1px solid #F1F5F9;}" +
      ".section{margin-bottom:16px;}" +
      ".section h3{font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;color:#475569;border-bottom:1px solid #E2E8F0;padding-bottom:6px;}" +
      "@media print{body{padding:20px;}}</style></head><body>" +
      content +
      "</body></html>",
  );
  win.document.close();
  win.focus();
  setTimeout(function () {
    win.print();
  }, 300);
};

window.setWorkOrderDueDate = function (id) {
  const wo = STATE.workOrders.find((w) => w.id === id);
  if (!wo) return;
  const input = document.getElementById("due-" + id);
  if (!input || !input.value) return;
  const today = new Date().toISOString().split("T")[0];
  if (input.value < today) {
    alert(
      "Due date cannot be in the past. Please select today or a future date.",
    );
    return;
  }
  wo.dueDate = input.value;
  ensureProductionItem(wo.quoteId, input.value);
  saveState();
  renderWorkOrders();
};

window.clearWorkOrderDueDate = function (id) {
  const wo = STATE.workOrders.find((w) => w.id === id);
  if (!wo) return;
  wo.dueDate = null;
  wo.stage = "Pending";
  wo.progress = 0;
  if (STATE.productionItems) {
    STATE.productionItems = STATE.productionItems.filter(
      (p) => p.quoteId !== wo.quoteId,
    );
  }
  saveState();
  renderWorkOrders();
};

function ensureProductionItem(quoteId, dueDate) {
  if (!STATE.productionItems) STATE.productionItems = [];
  const existing = STATE.productionItems.find((p) => p.quoteId === quoteId);
  if (existing) {
    existing.dueDate = dueDate;
    return;
  }
  const quote = STATE.quotations.find((q) => q.id === quoteId);
  const wo = STATE.workOrders.find((w) => w.quoteId === quoteId);
  STATE.productionItems.push({
    id: quoteId,
    quoteId: quoteId,
    customerName: quote ? quote.customerName : wo ? wo.customerName : "Client",
    product: quote ? quote.productName : wo ? wo.product : "Custom Body",
    date: quote
      ? quote.date
      : wo
        ? wo.date
        : new Date().toISOString().split("T")[0],
    columnStatus: "Not Started",
    progressPct: 0,
    progressionMap: {},
    remarks: {},
    dueDate: dueDate,
    urgent: wo ? !!wo.urgent : false,
  });
}

// ------------------------------------------
// 6. REDESIGNED PRODUCTION BOARD & ORDER PROGRESSION
// ------------------------------------------

function getDefaultProgressionSchema() {
  return [
    {
      id: "sec_design",
      name: "1. Design",
      subsections: [
        {
          id: "sub_design_items",
          name: "General Design Tasks",
          items: [
            { id: "scopeClear", name: "Scope Clear" },
            { id: "assemblyDesign", name: "Assembly Design" },
            { id: "custom", name: "Custom Requirements" },
          ],
        },
      ],
    },
    {
      id: "sec_procurement",
      name: "2. Procurement",
      subsections: [
        {
          id: "sub_steel_plates",
          name: "Steel Plates",
          items: [
            { id: "steelPlates_ordered", name: "Ordered" },
            { id: "steelPlates_received", name: "Received" },
          ],
        },
        {
          id: "sub_steel_section_bars",
          name: "Steel Section and Bars",
          items: [
            { id: "steelSection_ordered", name: "Ordered" },
            { id: "steelSection_received", name: "Received" },
          ],
        },
        {
          id: "sub_aclass_bop",
          name: "A Class BOP",
          items: [
            { id: "aClassBop_ordered", name: "Ordered" },
            { id: "aClassBop_received", name: "Received" },
          ],
        },
        {
          id: "sub_bclass_bop",
          name: "B Class BOP",
          items: [
            { id: "bClassBop_ordered", name: "Ordered" },
            { id: "bClassBop_received", name: "Received" },
          ],
        },
        {
          id: "sub_cclass_bop",
          name: "C Class BOP",
          items: [
            { id: "cClassBop_ordered", name: "Ordered" },
            { id: "cClassBop_received", name: "Received" },
          ],
        },
      ],
    },
    {
      id: "sec_cutting_bending",
      name: "3. Cutting & Bending",
      subsections: [
        {
          id: "sub_cb_parts",
          name: "Parts Cutting & Bending",
          items: [
            { id: "floor_cb", name: "Floor" },
            { id: "sb_cb", name: "Side Board (S/B)" },
            { id: "hb_cb", name: "Head Board (H/B)" },
            { id: "tp_cb", name: "Tail Plate / Tail Door (T/P)" },
          ],
        },
      ],
    },
    {
      id: "sec_fabrication",
      name: "4. Fabrication (SKD Level)",
      subsections: [
        {
          id: "sub_skd_assemblies",
          name: "SKD Level Assemblies",
          items: [
            { id: "floor_fab", name: "Floor Fabrication" },
            { id: "sideboard_fab", name: "Sideboard" },
            { id: "headboard_fab", name: "Headboard" },
            { id: "taildoor_fab", name: "Taildoor" },
            { id: "subframe_fab", name: "Subframe / Main Beam" },
            { id: "accessories_fab", name: "Accessories Fitment" },
          ],
        },
      ],
    },
    {
      id: "sec_welding",
      name: "5. Cubing & Welding",
      subsections: [
        {
          id: "sub_cubing_status",
          name: "Cubing Process",
          items: [{ id: "cubing_done", name: "Cubing Done" }],
        },
      ],
    },
    {
      id: "sec_grinding",
      name: "6. Grinding",
      subsections: [
        {
          id: "sub_grinding_status",
          name: "Grinding & Finishing",
          items: [{ id: "grinding_done", name: "Grinding Done" }],
        },
      ],
    },
    {
      id: "sec_biw_painting",
      name: "7. BIW & Painting",
      subsections: [
        {
          id: "sub_biw_paint_stages",
          name: "Body & Surface Coating",
          items: [
            { id: "biw_inspection", name: "Body in White (BIW) Inspection" },
            { id: "pu_painting", name: "Epoxy Primer & PU Painting" },
          ],
        },
      ],
    },
    {
      id: "sec_trimming",
      name: "8. Trimming",
      subsections: [
        {
          id: "sub_trimming_fitment",
          name: "Electrical & Fittings",
          items: [
            { id: "wiring_harness", name: "Electrical Wiring Harness" },
            { id: "light_fitting", name: "Light Fitting & Marker Lamps" },
          ],
        },
      ],
    },
    {
      id: "sec_hydraulics",
      name: "9. Hydraulics",
      subsections: [
        {
          id: "sub_tipping_cylinder",
          name: "Tipping Cylinder Model",
          items: [
            { id: "hyva_175", name: "Hyva 175" },
            { id: "hydromen_175", name: "Hydromen 175" },
            { id: "wipro_175", name: "Wipro 175" },
          ],
        },
        {
          id: "sub_hydraulics_testing",
          name: "Hydraulic System Testing",
          items: [
            {
              id: "hydraulics_done",
              name: "Hydraulics Fitment & Cylinder Testing Done",
            },
          ],
        },
      ],
    },
    {
      id: "sec_qc_dispatch",
      name: "10. Quality Check & Dispatch",
      subsections: [
        {
          id: "sub_qc_checks",
          name: "QC Checks",
          items: [
            { id: "qc_dimensions", name: "Dimensions" },
            { id: "qc_welding", name: "Welding" },
            { id: "qc_hydraulic", name: "Hydraulic" },
            { id: "qc_functional", name: "Functional" },
            { id: "qc_painting", name: "Painting" },
            { id: "qc_visuals", name: "Visuals" },
          ],
        },
        {
          id: "sub_final_dispatch",
          name: "Final Delivery Stages",
          items: [
            { id: "qc_approved", name: "Quality Check Approved" },
            { id: "dispatched", name: "Dispatched" },
          ],
        },
      ],
    },
  ];
}

function getDefaultDispatchFields() {
  return [
    {
      id: "vehicleNo",
      label: "Vehicle Number",
      placeholder: "e.g. TN 01 AB 1234",
      type: "text",
    },
    {
      id: "chassisNo",
      label: "Chassis Number",
      placeholder: "e.g. 1234567890",
      type: "text",
    },
    {
      id: "driverName",
      label: "Driver Name",
      placeholder: "e.g. Rajesh Kumar",
      type: "text",
    },
    {
      id: "driverNo",
      label: "Driver Number",
      placeholder: "e.g. 9876543210",
      type: "text",
    },
    {
      id: "dispatchedAt",
      label: "Date & Time of Dispatch",
      placeholder: "",
      type: "datetime-local",
    },
  ];
}

function getDispatchFields() {
  if (
    !STATE.dispatchFields ||
    !Array.isArray(STATE.dispatchFields) ||
    STATE.dispatchFields.length === 0
  ) {
    STATE.dispatchFields = getDefaultDispatchFields();
    saveState();
  }
  return STATE.dispatchFields;
}

function getProgressionSchema() {
  if (!STATE.progressionSchema || STATE.progressionSchema.length === 0) {
    STATE.progressionSchema = getDefaultProgressionSchema();
    saveState();
  }
  return STATE.progressionSchema;
}

let tempProgressionSchema = null;
let tempDispatchFields = null;

window.openProgressionSettingsModal = function () {
  loadState();
  tempProgressionSchema = JSON.parse(JSON.stringify(getProgressionSchema()));
  tempDispatchFields = JSON.parse(JSON.stringify(getDispatchFields()));
  renderPipelineSettingsEditor();
  document
    .getElementById("progression-pipeline-settings-modal")
    .classList.add("active");
};

window.closeProgressionSettingsModal = function () {
  const modal = document.getElementById("progression-pipeline-settings-modal");
  if (modal) modal.classList.remove("active");
};

window.resetDefaultProgressionSchema = function () {
  if (
    confirm(
      "Reset progression pipeline to default 10 manufacturing sections? Custom edits will be restored.",
    )
  ) {
    tempProgressionSchema = getDefaultProgressionSchema();
    tempDispatchFields = getDefaultDispatchFields();
    renderPipelineSettingsEditor();
  }
};

function escapeHtml(str) {
  return String(str || "")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderPipelineSettingsEditor() {
  const body = document.getElementById("pipeline-settings-editor-body");
  if (!body || !tempProgressionSchema) return;

  if (tempProgressionSchema.length === 0) {
    body.innerHTML = `
      <div style="text-align:center; padding:40px; color:#64748B;">
        <p>No sections defined in the progression pipeline.</p>
        <button type="button" class="btn btn-primary btn-sm" onclick="addNewPipelineSection()">+ Add First Section</button>
      </div>
    `;
    return;
  }

  body.innerHTML =
    tempProgressionSchema
      .map(
        (sec, secIdx) => `
    <div class="card" style="margin-bottom:16px; padding:16px; background:#ffffff; border:1.5px solid #CBD5E1; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.03);">

      <!-- Section Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
        <div style="display:flex; align-items:center; gap:8px; flex:1; margin-right:12px;">
          <span style="font-weight:800; font-size:0.85rem; color:#64748B;">#${secIdx + 1}</span>
          <input type="text" value="${escapeHtml(sec.name)}" class="form-control" style="font-weight:800; font-size:0.9rem; color:#0F172A;" onchange="tempProgressionSchema[${secIdx}].name = this.value">
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button type="button" class="btn btn-outline btn-xs" onclick="movePipelineSection(${secIdx}, -1)" ${secIdx === 0 ? "disabled" : ""} style="padding:2px 8px;">▲ Up</button>
          <button type="button" class="btn btn-outline btn-xs" onclick="movePipelineSection(${secIdx}, 1)" ${secIdx === tempProgressionSchema.length - 1 ? "disabled" : ""} style="padding:2px 8px;">▼ Down</button>
          <button type="button" class="btn btn-outline btn-xs" onclick="addNewPipelineSubsection(${secIdx})" style="background:#EFF6FF; border-color:#93C5FD; color:#1D4ED8; font-weight:700; padding:2px 10px;">+ Add Sub-section</button>
          <button type="button" class="btn btn-outline btn-xs" onclick="deletePipelineSection(${secIdx})" style="background:#FEF2F2; border-color:#FCA5A5; color:#DC2626; padding:2px 8px;">🗑️ Delete</button>
        </div>
      </div>

      <!-- Sub-sections List -->
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${sec.subsections
          .map(
            (sub, subIdx) => `
          <div style="background:#F8FAFC; padding:12px; border-radius:6px; border:1px solid #E2E8F0;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <div style="display:flex; align-items:center; gap:6px; flex:1; margin-right:8px;">
                <span style="font-size:0.75rem; font-weight:700; color:#64748B;">Sub-section:</span>
                <input type="text" value="${escapeHtml(sub.name)}" class="form-control form-control-sm" style="font-weight:700; font-size:0.8rem; height:32px;" onchange="tempProgressionSchema[${secIdx}].subsections[${subIdx}].name = this.value">
              </div>
              <div style="display:flex; gap:6px;">
                <button type="button" class="btn btn-outline btn-xs" onclick="addNewPipelineItem(${secIdx}, ${subIdx})" style="font-size:0.7rem; font-weight:700; padding:2px 8px;">+ Add Checkbox Item</button>
                <button type="button" class="btn btn-outline btn-xs" onclick="deletePipelineSubsection(${secIdx}, ${subIdx})" style="color:#DC2626; border-color:#FCA5A5; padding:2px 6px;">✕ Delete</button>
              </div>
            </div>

            <!-- Items List -->
            <div style="display:flex; flex-wrap:wrap; gap:8px; padding-top:4px;">
              ${sub.items
                .map(
                  (item, itemIdx) => `
                <div style="display:flex; align-items:center; gap:4px; background:#ffffff; border:1px solid #CBD5E1; padding:4px 8px; border-radius:4px;">
                  <span style="font-size:0.7rem; color:#94A3B8;">☑</span>
                  <input type="text" value="${escapeHtml(item.name)}" class="form-control form-control-sm" style="width:140px; height:26px; font-size:0.75rem; font-weight:600; padding:2px 6px;" onchange="tempProgressionSchema[${secIdx}].subsections[${subIdx}].items[${itemIdx}].name = this.value">
                  <button type="button" onclick="deletePipelineItem(${secIdx}, ${subIdx}, ${itemIdx})" style="background:none; border:none; color:#EF4444; font-weight:700; cursor:pointer; font-size:0.75rem; padding:0 4px;">✕</button>
                </div>
              `,
                )
                .join("")}
              ${sub.items.length === 0 ? '<span style="font-size:0.7rem; color:#94A3B8; font-style:italic;">No items yet. Click "+ Add Checkbox Item"</span>' : ""}
            </div>
          </div>
        `,
          )
          .join("")}
        ${sec.subsections.length === 0 ? '<div style="font-size:0.75rem; color:#94A3B8; text-align:center; padding:8px;">No sub-sections in this section. Click "+ Add Sub-section"</div>' : ""}
      </div>

    </div>
  `,
      )
      .join("") +
    `
    <!-- Dispatch Fields Customizer -->
    <div class="card" style="margin-bottom:16px; padding:16px; background:#ffffff; border:2px solid #0F172A; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
        <h4 style="margin:0; font-size:0.9rem; font-weight:800; color:#0F172A; display:flex; align-items:center; gap:8px;">
          🚛 11. Dispatched — Custom Fields
        </h4>
        <span style="font-size:0.7rem; color:#64748B;">Rename, add, or remove dispatch sub-fields</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${tempDispatchFields
          .map(
            (f, fi) => `
          <div style="display:flex; align-items:center; gap:8px; background:#F8FAFC; padding:8px 12px; border-radius:6px; border:1px solid #E2E8F0;">
            <input type="text" value="${escapeHtml(f.label)}" class="form-control form-control-sm" style="flex:2; font-weight:700; font-size:0.8rem; height:32px;" onchange="tempDispatchFields[${fi}].label = this.value">
            <select class="form-control form-control-sm" style="width:140px; height:32px; font-size:0.75rem; font-weight:600;" onchange="tempDispatchFields[${fi}].type = this.value">
              <option value="text" ${f.type === "text" ? "selected" : ""}>Text</option>
              <option value="datetime-local" ${f.type === "datetime-local" ? "selected" : ""}>Date & Time</option>
            </select>
            <input type="text" value="${escapeHtml(f.placeholder || "")}" placeholder="Placeholder" class="form-control form-control-sm" style="flex:2; font-size:0.75rem; height:32px;" onchange="tempDispatchFields[${fi}].placeholder = this.value">
            <button type="button" onclick="deleteTempDispatchField(${fi})" style="background:none; border:none; color:#EF4444; font-weight:700; cursor:pointer; font-size:0.85rem; padding:4px 8px;">✕</button>
          </div>
        `,
          )
          .join("")}
      </div>
      <button type="button" class="btn btn-outline btn-xs" onclick="addTempDispatchField()" style="margin-top:10px; font-weight:700; border-color:#0F172A; color:#0F172A;">+ Add Dispatch Field</button>
    </div>
  `;
}

window.addNewPipelineSection = function () {
  if (!tempProgressionSchema) return;
  const newSecNum = tempProgressionSchema.length + 1;
  tempProgressionSchema.push({
    id: `sec_custom_${Date.now()}`,
    name: `${newSecNum}. Custom Section`,
    subsections: [
      {
        id: `sub_custom_${Date.now()}`,
        name: "General Sub-section",
        items: [
          { id: `item_${Date.now()}_1`, name: "Task 1 Done" },
          { id: `item_${Date.now()}_2`, name: "Task 2 Done" },
        ],
      },
    ],
  });
  renderPipelineSettingsEditor();
};

window.deletePipelineSection = function (secIdx) {
  if (confirm(`Delete section "${tempProgressionSchema[secIdx].name}"?`)) {
    tempProgressionSchema.splice(secIdx, 1);
    renderPipelineSettingsEditor();
  }
};

window.movePipelineSection = function (secIdx, dir) {
  const targetIdx = secIdx + dir;
  if (targetIdx < 0 || targetIdx >= tempProgressionSchema.length) return;
  const temp = tempProgressionSchema[secIdx];
  tempProgressionSchema[secIdx] = tempProgressionSchema[targetIdx];
  tempProgressionSchema[targetIdx] = temp;
  renderPipelineSettingsEditor();
};

window.addNewPipelineSubsection = function (secIdx) {
  tempProgressionSchema[secIdx].subsections.push({
    id: `sub_custom_${Date.now()}`,
    name: "New Sub-section",
    items: [
      { id: `item_${Date.now()}_1`, name: "Ordered" },
      { id: `item_${Date.now()}_2`, name: "Received" },
    ],
  });
  renderPipelineSettingsEditor();
};

window.deletePipelineSubsection = function (secIdx, subIdx) {
  tempProgressionSchema[secIdx].subsections.splice(subIdx, 1);
  renderPipelineSettingsEditor();
};

window.addNewPipelineItem = function (secIdx, subIdx) {
  tempProgressionSchema[secIdx].subsections[subIdx].items.push({
    id: `item_${Date.now()}`,
    name: "New Checkbox Item",
  });
  renderPipelineSettingsEditor();
};

window.deletePipelineItem = function (secIdx, subIdx, itemIdx) {
  tempProgressionSchema[secIdx].subsections[subIdx].items.splice(itemIdx, 1);
  renderPipelineSettingsEditor();
};

window.addTempDispatchField = function () {
  if (!tempDispatchFields) return;
  tempDispatchFields.push({
    id: "custom_" + Date.now(),
    label: "New Field",
    placeholder: "",
    type: "text",
  });
  renderPipelineSettingsEditor();
};

window.deleteTempDispatchField = function (fi) {
  if (!tempDispatchFields) return;
  tempDispatchFields.splice(fi, 1);
  renderPipelineSettingsEditor();
};

window.saveProgressionSchemaSettings = function () {
  if (!tempProgressionSchema) return;
  STATE.progressionSchema = JSON.parse(JSON.stringify(tempProgressionSchema));
  STATE.dispatchFields = JSON.parse(JSON.stringify(tempDispatchFields));
  saveState();
  closeProgressionSettingsModal();
  renderProductionBoard();
  if (typeof renderWorkOrders === "function") renderWorkOrders();
  alert("Progression Pipeline structure updated successfully!");
};

function getInitialProgressionState() {
  return {};
}

window.renderApprovalsList = function (filter = "pending") {
  _approvalsFilter = filter;
  loadState();

  const container = document.getElementById("approvals-cards-container");
  const badge = document.getElementById("approvals-pending-badge");

  if (!STATE.quotations) STATE.quotations = [];

  const pendingQuotes = STATE.quotations.filter(
    (q) => q.status !== "Approved" && q.status !== "Denied",
  );
  if (badge) {
    badge.innerText = `${pendingQuotes.length} Pending`;
  }

  if (!container) return;

  let quotes = STATE.quotations;
  if (filter === "pending") {
    quotes = pendingQuotes;
  }

  const filtered = applyModuleFilter(
    "approvals",
    quotes,
    "date",
    "productName",
    ["id", "customerName", "productName"],
  );

  if (quotes.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: white; border-radius: 12px; border: 1px dashed #CBD5E1; color: #64748B;">
        <svg style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        <h3 style="margin: 0 0 6px 0; color: #1E293B;">No Quotations ${filter === "pending" ? "Pending Approval" : "Found"}</h3>
        <p style="margin: 0; font-size: 0.85rem;">Generated quotations waiting for review will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((q) => {
      const isPending = q.status !== "Approved" && q.status !== "Denied";
      const isApproved = q.status === "Approved";
      const isDenied = q.status === "Denied";

      let statusBadgeClass = "background:#FEF3C7; color:#D97706;";
      let statusText = "Pending Approval";
      if (isApproved) {
        statusBadgeClass = "background:#D1FAE5; color:#059669;";
        statusText = "Approved";
      } else if (isDenied) {
        statusBadgeClass = "background:#FEE2E2; color:#DC2626;";
        statusText = "Denied";
      }

      const formattedPrice = `₹${(q.total || 0).toLocaleString("en-IN")}`;
      const createdDate = q.createdAt
        ? new Date(q.createdAt).toLocaleString("en-GB")
        : q.date || "";

      return `
      <div class="card approvals-card" data-quote-id="${q.id}" style="border: 1px solid #E2E8F0; border-radius: 12px; background: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden;">
        <div onclick="toggleApprovalCard('${q.id}')" style="display:flex; justify-content:space-between; align-items:center; padding: 1px 8px; cursor:pointer; user-select:none;">
          <div>
            <div style="font-size:0.77rem; font-weight:700; color:#64748B; letter-spacing:0.5px; text-transform:uppercase; line-height:1.1;">Quotation Number</div>
            <div style="margin:0; font-size:1.12rem; color:#0F172A; font-weight:800; line-height:1.2;">${q.id}</div>
            <div style="font-size:0.77rem; color:#94A3B8; line-height:1.1;">${createdDate}</div>
          </div>
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:0.77rem; font-weight:700; padding:1px 6px; border-radius:6px; ${statusBadgeClass}">
              ${statusText}
            </span>
            <span class="approvals-chevron" style="font-size:1.05rem; color:#94A3B8; transition:transform 0.2s;">▾</span>
          </div>
        </div>

        <div class="approvals-body" style="max-height:0; overflow:hidden; transition:max-height 0.3s ease, padding 0.3s ease; padding:0 20px;">
          <div style="padding: 14px; background: #F8FAFC; border-radius: 8px; font-size: 0.9rem; display: flex; flex-direction: column; gap: 8px; border: 1px solid #F1F5F9; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:#64748B; font-weight:600;">Customer Name:</span>
              <strong style="color:#1E293B; font-size:0.95rem;">${q.customerName || "Valued Client"}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:#64748B; font-weight:600;">Product:</span>
              <strong style="color:#334155;">${q.productName || "Commercial Vehicle"}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; padding-top:8px; border-top:1px dashed #CBD5E1;">
              <span style="color:#64748B; font-weight:600;">Quotation Total:</span>
              <strong style="color:#059669; font-size:1.05rem;">${formattedPrice}</strong>
            </div>
          </div>

          <div style="display:flex; gap:10px; padding-bottom:16px;">
            ${
              isPending
                ? `
              <button onclick="approveQuotation('${q._backendId || q.id}')" class="btn" style="flex:1; background:#059669; color:white; font-weight:700; border:none; padding:10px 16px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.9rem; box-shadow:0 2px 4px rgba(5,150,105,0.2);">
                ✓ Approve
              </button>
              <button onclick="denyQuotation('${q._backendId || q.id}')" class="btn" style="flex:1; background:#DC2626; color:white; font-weight:700; border:none; padding:10px 16px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.9rem; box-shadow:0 2px 4px rgba(220,38,38,0.2);">
                ✕ Deny
              </button>
            `
                : `
              <button onclick="setQuotationPending('${q._backendId || q.id}')" class="btn" style="flex:1; background:#D97706; color:white; font-weight:700; border:none; padding:10px 16px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.85rem; box-shadow:0 2px 4px rgba(217,119,6,0.2);">
                ↺ Set Pending
              </button>
            `
            }
            <button onclick="editQuotation('${q._backendId || q.id}')" class="btn" style="flex:0; background:#F59E0B; color:white; font-weight:700; border:none; padding:10px 14px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; font-size:0.85rem; box-shadow:0 2px 4px rgba(245,158,11,0.2);" title="Edit Quotation Details">
              ✏️ Edit
            </button>
            <button onclick="showQuotationFromBoard('${q._backendId || q.id}')" class="btn btn-secondary" style="padding:10px 14px; font-size:0.85rem; font-weight:600;" title="View Full Quotation PDF">
              📄 Show PDF
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
};

window.toggleApprovalCard = function (quoteId) {
  const card = document.querySelector(
    `.approvals-card[data-quote-id="${quoteId}"]`,
  );
  if (!card) return;
  const body = card.querySelector(".approvals-body");
  const chevron = card.querySelector(".approvals-chevron");
  const isOpen = body.style.maxHeight && body.style.maxHeight !== "0px";
  if (isOpen) {
    body.style.maxHeight = "0px";
    body.style.padding = "0 20px";
    if (chevron) chevron.style.transform = "rotate(0deg)";
  } else {
    body.style.maxHeight = body.scrollHeight + 80 + "px";
    body.style.padding = "16px 20px";
    if (chevron) chevron.style.transform = "rotate(180deg)";
  }
};

window.toggleBoardCard = function (quoteId) {
  const card = document.querySelector(
    `.board-card[data-quote-id="${quoteId}"]`,
  );
  if (!card) return;
  const body = card.querySelector(".board-card-body");
  const chevron = card.querySelector(".board-chevron");
  const isOpen = body.style.maxHeight && body.style.maxHeight !== "0px";
  if (isOpen) {
    body.style.maxHeight = "0px";
    body.style.padding = "0 10px";
    if (chevron) chevron.style.transform = "rotate(0deg)";
  } else {
    body.style.maxHeight = body.scrollHeight + 80 + "px";
    body.style.padding = "10px";
    if (chevron) chevron.style.transform = "rotate(180deg)";
  }
};

window.approveQuotation = async function (quoteId, comment = "") {
  loadState();
  const q = (STATE.quotations || []).find(
    (x) => x.id === quoteId || x._backendId === quoteId,
  );
  if (q && !q._backendId) {
    try {
      await quotationService._syncOne(q);
      saveState();
    } catch (syncErr) {
      console.warn(
        "[approveQuotation] Auto-sync before approve notice:",
        syncErr,
      );
    }
  }
  const backendId = q?._backendId || quoteId;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      backendId,
    );

  if (!backendId || !isUuid) {
    alert(
      "Quotation cannot be approved because backend database record is missing. Please refresh or re-save the quotation.",
    );
    return;
  }

  // Transactional Step 1: Send approval PATCH to API and await response
  try {
    await quotationService.approve(backendId, comment || "");
    if (q) {
      q.status = "Approved";
      q._backendStatus = "Approved";
    }
  } catch (err) {
    console.error("[approveQuotation] Approval API call failed:", err);
    const msg = err.message || "Approval request failed";
    alert(`Failed to approve quotation: ${msg}`);
    if (typeof showToastNotification === "function") {
      showToastNotification(`Approval failed: ${msg}`, "error");
    }
    // STOP IMMEDIATELY! Do NOT create work order, do NOT sync, do NOT continue.
    return;
  }

  // Transactional Step 2: Create work order for the approved quotation
  try {
    await workOrderService.createFromQuotation(backendId);
  } catch (err) {
    console.warn("[approveQuotation] Work order creation notice:", err.message);
  }

  // Transactional Step 3: Refresh state from API and update UI
  await refreshQuotationsFromApi().catch(() => {});
  const refreshedWO = await workOrderService.getAll().catch(() => []);
  if (refreshedWO && refreshedWO.length) STATE.workOrders = refreshedWO;

  logSystemActivity(
    `Quotation ${quoteId} approved and dispatched to Work Orders.`,
  );
  showToastNotification(
    `Quotation ${quoteId} Approved! Dispatched to Work Orders List.`,
  );
  renderApprovalsList("pending");
  if (typeof renderWorkOrders === "function") renderWorkOrders();
};

window.denyQuotation = function (quoteId) {
  loadState();
  const q = STATE.quotations.find(
    (x) => x.id === quoteId || x._backendId === quoteId,
  );
  if (!q) return;

  q.status = "Denied";

  // Remove from production board if present
  if (STATE.productionItems) {
    STATE.productionItems = STATE.productionItems.filter(
      (p) => p.quoteId !== quoteId && p.id !== quoteId,
    );
  }

  // Remove from work orders list if present
  if (STATE.workOrders) {
    STATE.workOrders = STATE.workOrders.filter((w) => w.quoteId !== quoteId);
  }

  logSystemActivity(`Quotation ${quoteId} was Denied.`);
  saveState();

  alert(`Quotation ${quoteId} Denied.`);
  renderApprovalsList("pending");
  if (typeof renderWorkOrders === "function") renderWorkOrders();
  if (typeof renderProductionBoard === "function") renderProductionBoard();
};

window.setQuotationPending = function (quoteId) {
  loadState();
  const q = STATE.quotations.find(
    (x) => x.id === quoteId || x._backendId === quoteId,
  );
  if (!q) return;

  q.status = "Pending Approval";

  if (STATE.workOrders) {
    STATE.workOrders = STATE.workOrders.filter((w) => w.quoteId !== quoteId);
  }

  if (STATE.productionItems) {
    STATE.productionItems = STATE.productionItems.filter(
      (p) => p.quoteId !== quoteId && p.id !== quoteId,
    );
  }

  if (STATE.customers) {
    const client = STATE.customers.find(
      (c) =>
        c.id === q.customerId ||
        (c.company &&
          c.company.toLowerCase() === (q.customerName || "").toLowerCase()),
    );
    if (client) {
      client.outstanding = Math.max(
        0,
        (client.outstanding || 0) - (q.total || 0),
      );
    }
  }

  logSystemActivity(`Quotation ${quoteId} reverted to Pending Approval.`);
  saveState();
  showToastNotification(`Quotation ${quoteId} moved back to Pending Approval.`);
  renderApprovalsList(_approvalsFilter || "pending");
  if (typeof renderWorkOrders === "function") renderWorkOrders();
  if (typeof renderFinanceLedger === "function") renderFinanceLedger();
};

window.showQuotationFromBoard = function (quoteId) {
  openPdfPreview(quoteId);
};

function syncProductionItemsWithQuotations() {
  // No-op: production items are now created only when a due date is set on a work order.
}

function renderProductionBoard() {
  loadState();

  const container = document.getElementById("production-board-container");
  if (!container) return;

  const boardItems = (STATE.productionItems || []).filter((item) => {
    if (item.dueDate) return true;
    const wo = (STATE.workOrders || []).find(
      (w) =>
        w.quoteId === item.quoteId ||
        w._backendQuoteId === item.quoteId ||
        w.quoteNumber === item.quoteId,
    );
    return !!(wo && wo.dueDate);
  });
  const filteredItems = applyModuleFilter(
    "production",
    boardItems,
    "date",
    "product",
    ["id", "quoteId", "customerName", "product"],
  );
  const urgentOnly =
    _moduleFilters &&
    _moduleFilters.production &&
    _moduleFilters.production.urgent === "1";
  const displayItems = urgentOnly
    ? filteredItems.filter((item) => item.urgent)
    : filteredItems;

  const columns = [
    {
      title: "Not Started",
      status: "Not Started",
      headerBg: "#F1F5F9",
      border: "#CBD5E1",
      countBg: "#64748B",
    },
    {
      title: "Work in Progress",
      status: "Work in Progress",
      headerBg: "#DBEAFE",
      border: "#93C5FD",
      countBg: "#2563EB",
    },
    {
      title: "Finished",
      status: "Finished",
      headerBg: "#D1FAE5",
      border: "#6EE7B7",
      countBg: "#059669",
    },
  ];

  let boardHtml = "";

  columns.forEach((col) => {
    const items = displayItems.filter(
      (p) => (p.columnStatus || "Not Started") === col.status,
    );

    const cardsHtml = items
      .map((item) => {
        const pct = item.progressPct || 0;
        const woForItem = STATE.workOrders
          ? STATE.workOrders.find(
              (w) =>
                w.quoteId === item.quoteId ||
                w._backendQuoteId === item.quoteId ||
                w.quoteNumber === item.quoteId,
            )
          : null;
        const itemDueDate =
          item.dueDate || (woForItem && woForItem.dueDate) || null;
        const isOverdue = itemDueDate
          ? (() => {
              const d = new Date(itemDueDate + "T00:00:00");
              const t = new Date();
              t.setHours(0, 0, 0, 0);
              return d < t;
            })()
          : false;
        const itemQuote = STATE.quotations
          ? STATE.quotations.find(
              (q) => q.id === item.quoteId || q._backendId === item.quoteId,
            )
          : null;
        const displayQuoteId = resolveQuotationDisplayNumber(item, [
          itemQuote ? itemQuote.id : null,
        ]);
        const displayWoId = woForItem
          ? sanitizeDisplayId(
              woForItem.workOrderNumber || woForItem.id,
              "WO-000000",
            )
          : "";
        return `
        <div class="board-card" data-quote-id="${item.quoteId}" style="background:#ffffff; border-radius:8px; border:1.5px solid #CBD5E1; margin-bottom:12px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
          <div onclick="toggleBoardCard('${item.quoteId}')" style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; cursor:pointer; user-select:none;">
            <span style="background:#0F172A; color:#ffffff; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:4px; font-family:'Outfit',sans-serif;">${displayQuoteId}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:0.7rem; font-weight:800; color:${col.status === "Finished" ? "#059669" : col.status === "Work in Progress" ? "#2563EB" : "#64748B"};">${pct}% Complete</span>
              <span class="board-chevron" style="font-size:0.75rem; color:#94A3B8; transition:transform 0.2s;">▾</span>
            </div>
          </div>

          <div class="board-card-body" style="max-height:0; overflow:hidden; transition:max-height 0.3s ease, padding 0.3s ease; padding:0 10px;">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              ${woForItem ? `<span style="background:#0F172A; color:#fff; font-weight:800; font-size:0.7rem; padding:2px 8px; border-radius:4px;">${displayWoId}</span>` : ""}
              <div style="font-weight:700; font-size:0.875rem; color:#1E293B;">${isOverdue ? '<span style="color:#DC2626;">Due date passed</span>' : itemDueDate ? `Due: ${itemDueDate}` : "No due date"}</div>
              ${item.urgent ? '<span style="font-size:0.6rem; font-weight:800; padding:2px 7px; border-radius:4px; background:#FEE2E2; color:#DC2626; letter-spacing:0.5px;">URGENT</span>' : ""}
            </div>
            <div style="font-size:0.775rem; font-weight:600; color:var(--color-primary); margin-bottom:10px; text-transform:uppercase;">${item.product}</div>

            <div style="width:100%; height:6px; background:#E2E8F0; border-radius:3px; overflow:hidden; margin-bottom:12px;">
              <div style="width:${pct}%; height:100%; background:${col.status === "Finished" ? "#10B981" : "#3B82F6"}; transition:width 0.3s ease;"></div>
            </div>

            <div style="display:flex; justify-content:flex-end; align-items:center; border-top:1px solid #F1F5F9; padding:10px 0;" onclick="event.stopPropagation()">
              <button type="button" class="btn btn-primary btn-xs" onclick="openOrderProgressionModal('${item.quoteId}')" style="font-size:0.7rem; font-weight:700; padding:3px 10px; background:#0F172A; border:none; color:white;">
                Track Order &rarr;
              </button>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    boardHtml += `
      <div class="board-col" style="background:#F8FAFC; border:1.5px solid ${col.border}; border-radius:10px; overflow:hidden;">
        <div class="board-col-header" style="background:${col.headerBg}; padding:14px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid ${col.border};">
          <h3 style="margin:0; font-size:0.85rem; font-weight:800; color:#0F172A; text-transform:uppercase; letter-spacing:0.5px;">${col.title}</h3>
          <span style="background:${col.countBg}; color:#ffffff; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:10px;">${items.length}</span>
        </div>
        <div class="board-col-cards" style="padding:14px; min-height:320px;">
          ${cardsHtml || `<div style="text-align:center; padding:40px 10px; color:#94A3B8; font-size:0.8rem; font-weight:600;">No vehicle orders in ${col.title}</div>`}
        </div>
      </div>
    `;
  });

  container.innerHTML = boardHtml;
}

window.openOrderProgressionModal = function (quoteId) {
  loadState();

  const prodItem = STATE.productionItems.find(
    (p) => p.quoteId === quoteId || p.id === quoteId,
  );
  if (!prodItem) return;

  const quote = STATE.quotations.find(
    (q) => q.id === quoteId || q._backendId === quoteId,
  );
  const subtitleText = `${quote ? quote.customerName || "Client" : prodItem.customerName} • ${prodItem.product} • Order Date: ${new Date(prodItem.date).toLocaleDateString("en-GB")}`;
  const displayQuoteId = resolveQuotationDisplayNumber(prodItem, [
    quote ? quote.id : null,
  ]);

  document.getElementById("opm-title").innerHTML = `
    <span style="background:#3B82F6; color:white; padding:2px 10px; border-radius:6px; font-size:0.85rem; font-weight:800;">${displayQuoteId}</span>
    Order Progression Tracker
  `;
  document.getElementById("opm-subtitle").innerText = subtitleText;

  document.getElementById("opm-view-quote-btn").onclick = function () {
    openPdfPreview(quoteId);
  };

  renderOrderProgressionBody(prodItem);
  document.getElementById("order-progression-modal").classList.add("active");
};

window.closeOrderProgressionModal = function () {
  const modal = document.getElementById("order-progression-modal");
  if (modal) modal.classList.remove("active");
};

let _remarkContext = null;

window.openRemarkModal = function (quoteId, secId) {
  loadState();
  const prodItem = STATE.productionItems.find(
    (p) => p.quoteId === quoteId || p.id === quoteId,
  );
  if (!prodItem) return;
  if (!prodItem.remarks) prodItem.remarks = {};

  _remarkContext = { quoteId, secId };

  const overlay = document.getElementById("remark-modal-overlay");
  const textarea = document.getElementById("remark-textarea");
  const title = document.getElementById("remark-modal-title");

  if (title) {
    const schema = getProgressionSchema();
    const sec = schema.find((s) => s.id === secId);
    title.innerText = "Remark" + (sec ? " for " + sec.name : "");
  }

  if (textarea) {
    textarea.value = prodItem.remarks[secId] || "";
  }

  if (overlay) {
    overlay.style.display = "flex";
  }
};

window.closeRemarkModal = function () {
  const overlay = document.getElementById("remark-modal-overlay");
  if (overlay) overlay.style.display = "none";
  _remarkContext = null;
};

window.saveRemark = function () {
  if (!_remarkContext) return;
  loadState();
  const prodItem = STATE.productionItems.find(
    (p) =>
      p.quoteId === _remarkContext.quoteId || p.id === _remarkContext.quoteId,
  );
  if (!prodItem) return;

  if (!prodItem.remarks) prodItem.remarks = {};
  const textarea = document.getElementById("remark-textarea");
  prodItem.remarks[_remarkContext.secId] = textarea ? textarea.value : "";

  saveState();
  closeRemarkModal();
  renderOrderProgressionBody(prodItem);
  renderProductionBoard();
  if (typeof renderWorkOrders === "function") renderWorkOrders();
};

function renderOrderProgressionBody(prodItem) {
  const schema = getProgressionSchema();
  if (!prodItem.progressionMap) prodItem.progressionMap = {};
  const map = prodItem.progressionMap;

  // Collect all schema checkbox keys
  let allSchemaItems = [];
  schema.forEach((sec) => {
    sec.subsections.forEach((sub) => {
      sub.items.forEach((item) => {
        allSchemaItems.push({
          secId: sec.id,
          subId: sub.id,
          itemId: item.id,
          key: `${sec.id}_${sub.id}_${item.id}`,
        });
      });
    });
  });

  const totalCount = allSchemaItems.length;
  let checked = 0;
  allSchemaItems.forEach((i) => {
    if (map[i.key]) checked++;
  });

  const pct = totalCount > 0 ? Math.round((checked / totalCount) * 100) : 0;

  // Dynamic Column Status Movement
  let status = "Not Started";
  if (checked > 0 && checked < totalCount) {
    status = "Work in Progress";
  } else if (totalCount > 0 && checked === totalCount) {
    status = "Finished";
  }

  prodItem.columnStatus = status;
  prodItem.progressPct = pct;

  // Sync to matching work order for consistent display across modules
  const wo = STATE.workOrders.find((w) => w.quoteId === prodItem.quoteId);
  if (wo) {
    wo.stage = status;
    wo.progress = pct;
  }
  saveState();

  // Update Header UI
  const badgeEl = document.getElementById("opm-status-badge");
  const pctTextEl = document.getElementById("opm-pct-text");
  const progressBarEl = document.getElementById("opm-progress-bar");

  if (badgeEl) {
    badgeEl.innerText = status;
    badgeEl.style.background =
      status === "Finished"
        ? "#10B981"
        : status === "Work in Progress"
          ? "#3B82F6"
          : "#64748B";
  }
  if (pctTextEl) pctTextEl.innerText = `${pct}%`;
  if (progressBarEl) progressBarEl.style.width = `${pct}%`;

  // Render Sections dynamically from schema
  const bodyEl = document.getElementById("opm-sections-body");
  if (!bodyEl) return;

  bodyEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      ${schema
        .map((sec) => {
          // Collect all items for this section to determine if section is completed
          let secItemKeys = [];
          sec.subsections.forEach((sub) => {
            sub.items.forEach((item) => {
              secItemKeys.push(`${sec.id}_${sub.id}_${item.id}`);
            });
          });

          const isSecDone =
            secItemKeys.length > 0 && secItemKeys.every((k) => !!map[k]);

          return `
          <div class="card" style="padding:14px; background:${isSecDone ? "#F0FDF4" : "#F8FAFC"}; border:1.5px solid ${isSecDone ? "#86EFAC" : "#CBD5E1"}; transition:all 0.2s ease;">

            <!-- Section Header with Section Completed Checkbox -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid ${isSecDone ? "#DCFCE7" : "#E2E8F0"}; padding-bottom:8px;">
              <h4 style="margin:0; font-size:0.85rem; font-weight:800; color:${isSecDone ? "#166534" : "#1E293B"}; text-transform:uppercase;">${sec.name}</h4>
              <label style="display:inline-flex; align-items:center; gap:6px; font-size:0.775rem; font-weight:800; padding:4px 10px; border-radius:14px; background:${isSecDone ? "#10B981" : "#E2E8F0"}; color:${isSecDone ? "#ffffff" : "#475569"}; cursor:pointer; transition:all 0.2s ease;">
                <input type="checkbox" ${isSecDone ? "checked" : ""} onchange="toggleEntireSectionDone('${prodItem.quoteId}', '${sec.id}', this.checked)">
                ${isSecDone ? "✓ Section Completed" : "Section Status: Pending"}
              </label>
            </div>

            <!-- Sub-sections & Checkbox Items -->
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${sec.subsections
                .map(
                  (sub) => `
                <div style="background:#ffffff; padding:10px; border-radius:6px; border:1px solid #E2E8F0;">
                  ${sub.name && sub.name !== "General Sub-section" ? `<strong style="font-size:0.8rem; display:block; margin-bottom:6px; color:#334155;">${sub.name}:</strong>` : ""}
                  <div style="display:flex; flex-wrap:wrap; gap:14px;">
                    ${sub.items
                      .map((item) => {
                        const key = `${sec.id}_${sub.id}_${item.id}`;
                        const isChecked = !!map[key];
                        return `
                        <label style="display:inline-flex; align-items:center; gap:6px; font-size:0.8rem; font-weight:600; color:#334155; cursor:pointer;">
                          <input type="checkbox" ${isChecked ? "checked" : ""} onchange="toggleProgressionMapKey('${prodItem.quoteId}', '${key}', this.checked)">
                          ${item.name}
                        </label>
                      `;
                      })
                      .join("")}
                  </div>
                </div>
              `,
                )
                .join("")}
              <div style="background:#ffffff; padding:10px; border-radius:6px; border:1px solid #E2E8F0;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <strong style="font-size:0.8rem; color:#334155;">Remark:</strong>
                  <button type="button" onclick="openRemarkModal('${prodItem.quoteId}','${sec.id}')" style="font-size:0.7rem; font-weight:600; padding:2px 10px; border-radius:4px; border:1.5px solid #CBD5E1; background:#fff; color:#0F172A; cursor:pointer;">
                    ${prodItem.remarks && prodItem.remarks[sec.id] ? "Edit Remark" : "+ Add Remark"}
                  </button>
                </div>
                ${prodItem.remarks && prodItem.remarks[sec.id] ? `<p style="margin:6px 0 0 0; font-size:0.75rem; color:#475569; padding:6px 8px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:4px; white-space:pre-wrap;">${escapeHtml(prodItem.remarks[sec.id])}</p>` : ""}
              </div>
            </div>

          </div>
        `;
        })
        .join("")}
    </div>

    <!-- 11. Dispatched Section (from config) -->
    <div class="card" style="padding:16px; background:#F8FAFC; border:1.5px solid #CBD5E1; border-radius:10px;">
      <h4 style="margin:0 0 12px 0; font-size:0.85rem; font-weight:800; color:#1E293B; text-transform:uppercase; border-bottom:1px solid #E2E8F0; padding-bottom:8px;">11. Dispatched</h4>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        ${(function () {
          var df = getDispatchFields();
          return df
            .map(function (f) {
              var val =
                (prodItem.dispatchedData && prodItem.dispatchedData[f.id]) ||
                "";
              var ph = f.placeholder
                ? 'placeholder="' + escapeHtml(f.placeholder) + '"'
                : "";
              var colspan =
                f.type === "datetime-local"
                  ? ' style="grid-column:span 2;"'
                  : "";
              return (
                "<div" +
                colspan +
                ">" +
                '<label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">' +
                escapeHtml(f.label) +
                "</label>" +
                '<input type="' +
                f.type +
                '" class="form-control" value="' +
                escapeHtml(val) +
                '" ' +
                ph +
                " onchange=\"updateDispatchedData('" +
                prodItem.quoteId +
                "', '" +
                f.id +
                '\', this.value)" style="font-size:0.8rem;">' +
                "</div>"
              );
            })
            .join("");
        })()}
      </div>
    </div>
  `;
}

window.toggleEntireSectionDone = function (quoteId, secId, markDone) {
  loadState();
  const prodItem = STATE.productionItems.find(
    (p) => p.quoteId === quoteId || p.id === quoteId,
  );
  if (!prodItem) return;

  if (!prodItem.progressionMap) prodItem.progressionMap = {};

  const schema = getProgressionSchema();
  const sec = schema.find((s) => s.id === secId);
  if (sec) {
    sec.subsections.forEach((sub) => {
      sub.items.forEach((item) => {
        const key = `${sec.id}_${sub.id}_${item.id}`;
        prodItem.progressionMap[key] = markDone;
      });
    });
  }

  saveState();
  renderOrderProgressionBody(prodItem);
  renderProductionBoard();
  productionService.updateItem(prodItem);
  if (typeof renderWorkOrders === "function") renderWorkOrders();
};

window.toggleProgressionMapKey = function (quoteId, key, isChecked) {
  loadState();
  const prodItem = STATE.productionItems.find(
    (p) => p.quoteId === quoteId || p.id === quoteId,
  );
  if (!prodItem) return;

  if (!prodItem.progressionMap) prodItem.progressionMap = {};
  prodItem.progressionMap[key] = isChecked;

  saveState();
  renderOrderProgressionBody(prodItem);
  renderProductionBoard();
  productionService.updateItem(prodItem);
  if (typeof renderWorkOrders === "function") renderWorkOrders();
};

window.updateDispatchedData = function (quoteId, field, value) {
  loadState();
  const prodItem = STATE.productionItems.find(
    (p) => p.quoteId === quoteId || p.id === quoteId,
  );
  if (!prodItem) return;
  if (!prodItem.dispatchedData) prodItem.dispatchedData = {};
  prodItem.dispatchedData[field] = value;
  saveState();
  productionService.updateItem(prodItem);
};

// ------------------------------------------
// 7. ACCOUNTS & CLIENT DIRECTORY
// ------------------------------------------

function initAccountsModule() {
  // Configure the finance tab state WITHOUT rendering any placeholder content.
  // The finance view is only rendered once the dashboard is visible and the user
  // actually opens it, so the boot never paints an empty/"Loading…" ledger.
  financeTab = "inbox";
  var buttons = document.querySelectorAll("[data-finance-tab]");
  buttons.forEach(function (b) {
    b.classList.toggle(
      "active",
      b.getAttribute("data-finance-tab") === financeTab,
    );
  });
  var inboxPanel = document.getElementById("finance-tab-inbox");
  var minePanel = document.getElementById("finance-tab-mine");
  if (inboxPanel)
    inboxPanel.style.display = financeTab === "inbox" ? "block" : "none";
  if (minePanel)
    minePanel.style.display = financeTab === "mine" ? "block" : "none";
}

// Active finance ledger tab: 'inbox' (All Quotations) or 'mine' (My Quotations).
var financeTab = "inbox";

function refreshFinanceModule() {
  if (financeTab === "inbox") renderFinanceInbox();
  else renderFinanceLedger();
}

window.switchFinanceTab = function (tab) {
  financeTab = tab === "mine" ? "mine" : "inbox";
  var buttons = document.querySelectorAll("[data-finance-tab]");
  buttons.forEach(function (b) {
    b.classList.toggle(
      "active",
      b.getAttribute("data-finance-tab") === financeTab,
    );
  });
  var inboxPanel = document.getElementById("finance-tab-inbox");
  var minePanel = document.getElementById("finance-tab-mine");
  if (inboxPanel)
    inboxPanel.style.display = financeTab === "inbox" ? "block" : "none";
  if (minePanel)
    minePanel.style.display = financeTab === "mine" ? "block" : "none";
  refreshFinanceModule();
};

window.renderFinanceInbox = async function () {
  var container = document.getElementById("finance-inbox-container");
  if (!container) return;
  container.innerHTML =
    '<div style="text-align:center;padding:48px 20px;color:#94A3B8;font-size:0.9rem;font-weight:600;">Loading quotations…</div>';

  var quotes = [];
  try {
    quotes = await quotationService.getAll({ financeView: "inbox" });
  } catch (e) {
    Logger.warn("Finance inbox load failed", e);
    container.innerHTML =
      '<div style="text-align:center;padding:48px 20px;color:#DC2626;font-size:0.9rem;font-weight:600;">Failed to load quotations.</div>';
    return;
  }

  if (quotes.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;padding:60px 20px;color:#94A3B8;font-size:0.9rem;font-weight:600;">No approved quotations awaiting finance.</div>';
    return;
  }

  var html = "";
  quotes.forEach(function (q) {
    var ownerName = "";
    var claimedBadge = "";
    if (q.financeOwner) {
      var emp = (STATE.employees || []).find(function (e) {
        return e._backendId === q.financeOwner || e.id === q.financeOwner;
      });
      ownerName = emp ? emp.name || "Finance" : "Finance";
      claimedBadge =
        '<span style="background:#ECFDF5;color:#059669;font-size:0.6rem;font-weight:800;padding:2px 8px;border-radius:3px;text-transform:uppercase;letter-spacing:0.3px;">Claimed by ' +
        ownerName +
        "</span>";
    }
    var canClaim = !q.financeOwner;
    html +=
      "" +
      '<div style="background:#ffffff;border:1.5px solid #CBD5E1;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);">' +
      '<div class="finance-bar" onclick="toggleFinanceInboxDetails(\'' +
      q.id +
      '\')" style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;cursor:pointer;user-select:none;transition:background 0.15s;">' +
      '<div style="display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap;">' +
      '<span style="background:#0F172A;color:#fff;font-weight:800;font-size:0.75rem;padding:3px 8px;border-radius:4px;">' +
      q.id +
      "</span>" +
      '<span style="font-weight:600;font-size:0.85rem;color:#1E293B;min-width:140px;">' +
      (q.customerName || "Valued Client") +
      "</span>" +
      '<span class="tbl-status-badge status-pending" style="font-size:0.65rem;padding:3px 8px;">APPROVED</span>' +
      claimedBadge +
      "</div>" +
      '<div style="display:flex;align-items:center;gap:16px;">' +
      '<span style="font-size:0.75rem;font-weight:700;color:#475569;">Total: ₹' +
      (q.total || 0).toLocaleString("en-IN") +
      "</span>" +
      '<svg style="width:16px;height:16px;color:#94A3B8;transition:transform 0.2s;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>' +
      "</div>" +
      "</div>" +
      '<div class="finance-details" id="finance-inbox-details-' +
      q.id +
      '" style="display:none;border-top:1px solid #E2E8F0;padding:20px 24px;background:#FAFBFC;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">' +
      '<div style="display:flex;flex-direction:column;gap:6px;">' +
      '<span style="font-size:0.8rem;color:#475569;"><strong>Customer:</strong> ' +
      (q.customerName || "Valued Client") +
      "</span>" +
      '<span style="font-size:0.8rem;color:#475569;"><strong>Quotation:</strong> ' +
      q.id +
      "</span>" +
      '<span style="font-size:0.8rem;color:#475569;"><strong>Approved:</strong> ' +
      (q.date || "—") +
      "</span>" +
      "</div>" +
      (canClaim
        ? '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
          '<label style="font-size:0.7rem;font-weight:700;color:#475569;">Payment Due:</label>' +
          '<input type="date" id="inbox-due-date-' +
          (q._backendId || q.id) +
          '" data-quote-id="' +
          (q._backendId || q.id) +
          '" class="form-control form-control-sm" style="font-size:0.7rem;padding:4px 8px;width:140px;">' +
          '<button class="btn btn-primary btn-sm" onclick="claimFinanceQuotation(\'' +
          (q._backendId || q.id) +
          '\', this)" style="padding:6px 16px;font-size:0.72rem;white-space:nowrap;font-weight:700;">Claim</button>' +
          "</div>"
        : '<span style="font-size:0.75rem;color:#64748B;">This quotation is already claimed.</span>') +
      "</div>" +
      "</div>" +
      "</div>";
  });

  container.innerHTML = html;
};

window.toggleFinanceInboxDetails = function (quoteId) {
  var el = document.getElementById("finance-inbox-details-" + quoteId);
  if (!el) return;
  el.style.display = el.style.display !== "none" ? "none" : "block";
};

window.claimFinanceQuotation = async function (quoteId, btnEl) {
  loadState();

  var inputEl = document.getElementById("inbox-due-date-" + quoteId);
  if (!inputEl && btnEl && btnEl.parentElement) {
    inputEl = btnEl.parentElement.querySelector('input[type="date"]');
  }

  if (!inputEl) {
    var q = (STATE.quotations || []).find(function (x) {
      return x.id === quoteId || x._backendId === quoteId;
    });
    if (q) {
      inputEl =
        document.getElementById("inbox-due-date-" + q.id) ||
        document.getElementById("inbox-due-date-" + q._backendId);
    }
  }

  var paymentDueDate = inputEl ? inputEl.value.trim() : "";

  // Log quotationId and paymentDueDate before validation as required
  console.log({ quotationId: quoteId, paymentDueDate: paymentDueDate });

  if (!paymentDueDate) {
    alert("Please set a payment due date to claim this quotation.");
    return;
  }

  try {
    var updated = await quotationService.claim(quoteId, paymentDueDate);
    if (!STATE.quotations) STATE.quotations = [];
    var idx = STATE.quotations.findIndex(function (x) {
      return x._backendId === quoteId || x.id === quoteId;
    });
    if (idx >= 0) STATE.quotations[idx] = updated;
    else STATE.quotations.push(updated);

    saveState();
    logSystemActivity(
      "Quotation " +
        (updated.id || quoteId) +
        " claimed by " +
        (_sessionUser || "finance") +
        " with due date " +
        paymentDueDate +
        ".",
    );
    if (typeof showToastNotification === "function") {
      showToastNotification("Quotation claimed successfully.");
    }
    renderFinanceInbox();
    renderFinanceLedger();
    switchFinanceTab("mine");
  } catch (e) {
    console.error("[claimFinanceQuotation] Claim failed:", e);
    alert("Claim failed: " + (e.message || "Unknown error"));
    renderFinanceInbox();
  }
};

// Finance ledger filter state
var financeFilters = {};

window.toggleFinanceFilter = function () {
  var dd = document.getElementById("filter-dd-finance");
  if (!dd) return;
  var isVisible = dd.style.display === "block";
  document.querySelectorAll(".filter-dd").forEach(function (el) {
    el.style.display = "none";
  });
  if (!isVisible) {
    var f = financeFilters;
    var fromEl = document.getElementById("filter-finance-from");
    var toEl = document.getElementById("filter-finance-to");
    var sortEl = document.getElementById("filter-finance-sort");
    if (fromEl) fromEl.value = f.dateFrom || "";
    if (toEl) toEl.value = f.dateTo || "";
    if (sortEl) sortEl.value = f.sort || "newest";
    var btn = document.querySelector('[data-filter-btn="finance"]');
    if (btn) {
      var r = btn.getBoundingClientRect();
      dd.style.position = "fixed";
      dd.style.top = r.bottom + 6 + "px";
      dd.style.right = window.innerWidth - r.right + "px";
      dd.style.left = "auto";
      dd.style.bottom = "auto";
      dd.style.zIndex = 2147483647;
      if (dd.parentElement !== document.body) {
        document.body.appendChild(dd);
      }
    }
    dd.style.display = "block";
  }
};

window.setFinanceFilter = function (field, value) {
  financeFilters[field] = value;
  renderFinanceLedger();
};

window.setFinanceDatePreset = function (months) {
  var now = new Date();
  var from = new Date(now);
  from.setMonth(from.getMonth() - months);
  var fromStr = from.toISOString().slice(0, 10);
  var toStr = now.toISOString().slice(0, 10);
  document.getElementById("filter-finance-from").value = fromStr;
  document.getElementById("filter-finance-to").value = toStr;
  financeFilters.dateFrom = fromStr;
  financeFilters.dateTo = toStr;
  renderFinanceLedger();
};

window.toggleFinanceUrgentFilter = function () {
  var isActive = financeFilters.urgent === "1";
  if (isActive) {
    delete financeFilters.urgent;
    var urgBtn = document.getElementById("btn-urgent-filter");
    if (urgBtn) {
      urgBtn.style.background = "#FEF2F2";
      urgBtn.style.color = "#DC2626";
      urgBtn.style.borderColor = "#FCA5A5";
    }
  } else {
    financeFilters.urgent = "1";
    var urgBtn = document.getElementById("btn-urgent-filter");
    if (urgBtn) {
      urgBtn.style.background = "#DC2626";
      urgBtn.style.color = "#fff";
      urgBtn.style.borderColor = "#DC2626";
    }
  }
  renderFinanceLedger();
};

window.clearFinanceFilters = function () {
  financeFilters = {};
  document.getElementById("filter-finance-from").value = "";
  document.getElementById("filter-finance-to").value = "";
  document.getElementById("filter-finance-sort").value = "newest";
  var urgBtn = document.getElementById("btn-urgent-filter");
  if (urgBtn) {
    urgBtn.style.background = "#FEF2F2";
    urgBtn.style.color = "#DC2626";
    urgBtn.style.borderColor = "#FCA5A5";
  }
  renderFinanceLedger();
};

function buildPaymentRowHtml(p) {
  return (
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#F8FAFC;border-radius:4px;font-size:0.75rem;" id="payment-row-' +
    p.id +
    '">' +
    "<div>" +
    "<strong>" +
    p.date +
    "</strong>" +
    (p.time ? " at " + p.time : "") +
    '<span style="color:#64748B;margin-left:8px;">' +
    (p.mode || "") +
    (p.ref ? " · " + p.ref : "") +
    "</span>" +
    "</div>" +
    '<div style="display:flex;align-items:center;gap:8px;">' +
    '<span style="font-weight:700;color:var(--color-success);">₹' +
    p.amount.toLocaleString("en-IN") +
    "</span>" +
    "<button onclick=\"editPayment('" +
    p.id +
    '\')" style="background:none;border:none;cursor:pointer;padding:2px;color:#94A3B8;font-size:0.8rem;" title="Edit Payment">✏️</button>' +
    "</div>" +
    "</div>"
  );
}

function renderPaymentsList(quoteId) {
  loadState();
  var container = document.getElementById("payments-list-" + quoteId);
  if (!container) return;
  var payments = (STATE.payments || []).filter(function (p) {
    return p.quoteId === quoteId;
  });
  container.innerHTML =
    payments.length > 0
      ? payments
          .map(function (p) {
            return buildPaymentRowHtml(p);
          })
          .join("")
      : '<div style="color:#94A3B8;font-size:0.75rem;padding:8px 0;">No payments recorded yet.</div>';
}

window.editPayment = function (paymentId) {
  loadState();
  var row = document.getElementById("payment-row-" + paymentId);
  if (!row) return;
  var payment = (STATE.payments || []).find(function (p) {
    return p.id === paymentId;
  });
  if (!payment) return;
  var modes = ["RTGS", "NEFT", "Cheque", "Cash"];
  var modeOptions = modes
    .map(function (m) {
      return (
        '<option value="' +
        m +
        '"' +
        (payment.mode === m ? " selected" : "") +
        ">" +
        m +
        "</option>"
      );
    })
    .join("");
  row.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:6px;padding:4px 0;width:100%;">' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
    '<input type="date" id="edit-pay-date-' +
    paymentId +
    '" value="' +
    (payment.date || "") +
    '" style="font-size:0.7rem;padding:4px 8px;width:130px;">' +
    '<input type="time" id="edit-pay-time-' +
    paymentId +
    '" value="' +
    (payment.time || "") +
    '" style="font-size:0.7rem;padding:4px 8px;width:100px;">' +
    '<input type="number" id="edit-pay-amount-' +
    paymentId +
    '" value="' +
    payment.amount +
    '" style="font-size:0.7rem;padding:4px 8px;width:120px;">' +
    '<select id="edit-pay-mode-' +
    paymentId +
    '" style="font-size:0.7rem;padding:4px 8px;">' +
    modeOptions +
    "</select>" +
    '<input type="text" id="edit-pay-ref-' +
    paymentId +
    '" value="' +
    (payment.ref || "") +
    '" placeholder="Ref/UTR" style="font-size:0.7rem;padding:4px 8px;width:120px;">' +
    "</div>" +
    '<div style="display:flex;gap:6px;justify-content:flex-end;">' +
    "<button onclick=\"saveEditPayment('" +
    paymentId +
    '\')" style="background:#059669;color:#fff;border:none;padding:4px 12px;border-radius:4px;font-size:0.7rem;font-weight:700;cursor:pointer;">Save</button>' +
    "<button onclick=\"cancelEditPayment('" +
    paymentId +
    '\')" style="background:#64748B;color:#fff;border:none;padding:4px 12px;border-radius:4px;font-size:0.7rem;cursor:pointer;">Cancel</button>' +
    "</div>" +
    "</div>";
};

window.saveEditPayment = function (paymentId) {
  loadState();
  var payment = (STATE.payments || []).find(function (p) {
    return p.id === paymentId;
  });
  if (!payment) return;
  var date = document.getElementById("edit-pay-date-" + paymentId)?.value;
  var time = document.getElementById("edit-pay-time-" + paymentId)?.value;
  var amount = parseFloat(
    document.getElementById("edit-pay-amount-" + paymentId)?.value,
  );
  var mode = document.getElementById("edit-pay-mode-" + paymentId)?.value;
  var ref = document.getElementById("edit-pay-ref-" + paymentId)?.value || "";
  if (!amount || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }
  payment.date = date || payment.date;
  payment.time = time || "";
  payment.amount = amount;
  payment.mode = mode || "RTGS";
  payment.ref = ref;
  logSystemActivity(
    "Payment " +
      paymentId +
      " updated to ₹" +
      amount.toLocaleString("en-IN") +
      ".",
  );
  saveState();
  renderPaymentsList(payment.quoteId);
  renderFinanceLedger();
};

window.cancelEditPayment = function (paymentId) {
  loadState();
  var payment = (STATE.payments || []).find(function (p) {
    return p.id === paymentId;
  });
  if (payment) renderPaymentsList(payment.quoteId);
};

window.renderFinanceLedger = function () {
  loadState();
  var container = document.getElementById("finance-ledger-container");
  if (!container) return;

  var allQuotations = (STATE.quotations || []).filter(function (q) {
    return q.status === "Approved";
  });
  var allPayments = STATE.payments || [];

  var totalAmount = 0;
  var totalCollected = 0;
  var totalOutstanding = 0;
  for (var i = 0; i < allQuotations.length; i++) {
    var q = allQuotations[i];
    totalAmount += q.total || 0;
    var paid = 0;
    for (var j = 0; j < allPayments.length; j++) {
      if (allPayments[j].quoteId === q.id) paid += allPayments[j].amount;
    }
    totalOutstanding += Math.max(0, (q.total || 0) - paid);
  }
  for (var k = 0; k < allPayments.length; k++) {
    totalCollected += allPayments[k].amount;
  }

  document.getElementById("kpi-total-amount").innerText =
    "₹" + totalAmount.toLocaleString("en-IN");
  document.getElementById("kpi-collected").innerText =
    "₹" + totalCollected.toLocaleString("en-IN");
  document.getElementById("kpi-outstanding").innerText =
    "₹" + totalOutstanding.toLocaleString("en-IN");
  document.getElementById("kpi-order-count").innerText = allQuotations.length;

  var searchQ = (
    document.getElementById("search-finance")?.value || ""
  ).toLowerCase();
  var statusFilter =
    document.getElementById("filter-finance-status")?.value || "all";
  var f = financeFilters;

  var quotations = allQuotations;

  // Apply date filter
  if (f.dateFrom || f.dateTo) {
    quotations = quotations.filter(function (q) {
      var d = q.date || "";
      if (f.dateFrom && d < f.dateFrom) return false;
      if (f.dateTo && d > f.dateTo) return false;
      return true;
    });
  }

  // Apply search
  if (searchQ) {
    quotations = quotations.filter(function (q) {
      return (
        (q.id || "").toLowerCase().indexOf(searchQ) !== -1 ||
        (q.customerName || "").toLowerCase().indexOf(searchQ) !== -1
      );
    });
  }

  // Apply urgent filter
  if (f.urgent === "1") {
    quotations = quotations.filter(function (q) {
      var paid = 0;
      for (var pi = 0; pi < allPayments.length; pi++) {
        if (allPayments[pi].quoteId === q.id) paid += allPayments[pi].amount;
      }
      var outstanding = Math.max(0, (q.total || 0) - paid);
      if (outstanding <= 0) return false;
      var prodItem = STATE.productionItems
        ? STATE.productionItems.find(function (p) {
            return p.quoteId === q.id;
          })
        : null;
      var prodNearlyDone = prodItem && (prodItem.progressPct || 0) >= 80;
      var dueDate = q.paymentDueDate || "";
      var dueSoon = false;
      if (dueDate) {
        var dueMs = new Date(dueDate).getTime();
        var nowMs = new Date().getTime();
        dueSoon = (dueMs - nowMs) / (1000 * 60 * 60 * 24) <= 2;
      }
      return prodNearlyDone || dueSoon;
    });
  }

  // Apply status filter (header dropdown)
  if (statusFilter !== "all") {
    quotations = quotations.filter(function (q) {
      var paid = 0;
      for (var pi = 0; pi < allPayments.length; pi++) {
        if (allPayments[pi].quoteId === q.id) paid += allPayments[pi].amount;
      }
      var outstanding = Math.max(0, (q.total || 0) - paid);
      var status = outstanding <= 0 ? "paid" : paid > 0 ? "partial" : "pending";
      return status === statusFilter;
    });
  }

  // Apply sort
  var sortKey = f.sort || "newest";
  quotations.sort(function (a, b) {
    if (sortKey === "oldest") return (a.date || "") < (b.date || "") ? -1 : 1;
    if (sortKey === "amount-high") return (b.total || 0) - (a.total || 0);
    if (sortKey === "amount-low") return (a.total || 0) - (b.total || 0);
    if (sortKey === "outstanding-high" || sortKey === "outstanding-low") {
      var aPaid = 0,
        bPaid = 0;
      for (var pi = 0; pi < allPayments.length; pi++) {
        if (allPayments[pi].quoteId === a.id) aPaid += allPayments[pi].amount;
        if (allPayments[pi].quoteId === b.id) bPaid += allPayments[pi].amount;
      }
      var aOut = Math.max(0, (a.total || 0) - aPaid);
      var bOut = Math.max(0, (b.total || 0) - bPaid);
      return sortKey === "outstanding-high" ? bOut - aOut : aOut - bOut;
    }
    // newest first (default)
    return (a.date || "") > (b.date || "") ? -1 : 1;
  });

  if (quotations.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;padding:60px 20px;color:#94A3B8;font-size:0.9rem;font-weight:600;">No quotations found.</div>';
    return;
  }

  let html = "";
  quotations.forEach((q) => {
    const totalWithGst = q.total || 0;
    const principal = Math.round(totalWithGst / 1.18);
    const payments = (STATE.payments || []).filter((p) => p.quoteId === q.id);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const outstanding = Math.max(0, totalWithGst - totalPaid);
    const status =
      outstanding <= 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Pending";

    if (statusFilter !== "all" && status.toLowerCase() !== statusFilter) return;

    const customer = (STATE.customers || []).find((c) => c.id === q.customerId);
    const phone = customer ? customer.phone || "—" : "—";
    const company = customer
      ? customer.company || q.customerName
      : q.customerName;
    const totalPaidFmt = "₹" + totalPaid.toLocaleString("en-IN");
    const outstandingFmt = "₹" + outstanding.toLocaleString("en-IN");
    const totalFmt = "₹" + totalWithGst.toLocaleString("en-IN");
    const principalFmt = "₹" + principal.toLocaleString("en-IN");

    const badgeClass =
      status === "Paid"
        ? "status-paid"
        : status === "Partial"
          ? "status-partial"
          : "status-pending";

    var dueDate = q.paymentDueDate || "";
    var todayStr = new Date().toISOString().split("T")[0];
    var isOverdue = dueDate && dueDate < todayStr && outstanding > 0;
    var prodItem = STATE.productionItems
      ? STATE.productionItems.find(function (p) {
          return p.quoteId === q.id;
        })
      : null;
    var prodNearlyDone = prodItem && (prodItem.progressPct || 0) >= 80;
    var dueSoon = false;
    if (dueDate && outstanding > 0) {
      var dueMs = new Date(dueDate).getTime();
      var nowMs = new Date().getTime();
      var diffDays = (dueMs - nowMs) / (1000 * 60 * 60 * 24);
      dueSoon = diffDays <= 2;
    }
    var showUrgent = (prodNearlyDone || dueSoon) && outstanding > 0;

    const paymentsListHtml =
      payments.length > 0
        ? payments.map((p) => buildPaymentRowHtml(p)).join("")
        : '<div style="color:#94A3B8;font-size:0.75rem;padding:8px 0;">No payments recorded yet.</div>';

    html += `
      <div style="background:#ffffff;border:1.5px solid #CBD5E1;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);${showUrgent ? "border-color:#DC2626;" : ""}">
        <div class="finance-bar" onclick="toggleFinanceDetails('${q.id}')" style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;cursor:pointer;user-select:none;transition:background 0.15s;">
          <div style="display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap;">
            <span style="background:#0F172A;color:#fff;font-weight:800;font-size:0.75rem;padding:3px 8px;border-radius:4px;">${q.id}</span>
            <span style="font-weight:600;font-size:0.85rem;color:#1E293B;min-width:140px;">${company}</span>
            ${showUrgent ? '<span style="background:#DC2626;color:#fff;font-size:0.6rem;font-weight:800;padding:2px 8px;border-radius:3px;text-transform:uppercase;letter-spacing:0.3px;">Urgent Collect Payment</span>' : ""}
            ${isOverdue ? '<span style="color:#DC2626;font-size:0.65rem;font-weight:700;">Due: ' + dueDate + "</span>" : ""}
            ${dueDate && !isOverdue && outstanding > 0 ? '<span style="color:#64748B;font-size:0.65rem;">Due: ' + dueDate + "</span>" : ""}
          </div>
          <div style="display:flex;align-items:center;gap:16px;">
            <span style="font-size:0.75rem;font-weight:700;color:#475569;">Total: ${totalFmt}</span>
            <span style="font-size:0.75rem;font-weight:700;color:${outstanding > 0 ? "#DC2626" : "#059669"};">Outstanding: ${outstandingFmt}</span>
            <span class="tbl-status-badge ${badgeClass}" style="font-size:0.65rem;padding:3px 8px;">${status.toUpperCase()}</span>
            <svg style="width:16px;height:16px;color:#94A3B8;transition:transform 0.2s;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <div class="finance-details" id="finance-details-${q.id}" style="display:none;border-top:1px solid #E2E8F0;padding:20px 24px;background:#FAFBFC;">
          <div class="grid grid-2-col gap-lg" style="margin-bottom:20px;">
            <div>
              <h4 style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;color:#64748B;margin-bottom:12px;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">Financial Summary</h4>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F1F5F9;font-size:0.8rem;">
                  <span style="color:#64748B;">Principal Amount (excl. GST)</span>
                  <span style="font-weight:700;">${principalFmt}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F1F5F9;font-size:0.8rem;">
                  <span style="color:#64748B;">GST (18%)</span>
                  <span style="font-weight:700;">₹${(totalWithGst - principal).toLocaleString("en-IN")}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F1F5F9;font-size:0.8rem;">
                  <span style="color:#64748B;">Total Amount (incl. GST)</span>
                  <span style="font-weight:700;">${totalFmt}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F1F5F9;font-size:0.8rem;">
                  <span style="color:#64748B;">Amount Paid</span>
                  <span style="font-weight:700;color:var(--color-success);">${totalPaidFmt}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.8rem;background:${outstanding > 0 ? "#FEF2F2" : "#F0FDF4"};padding:8px 10px;border-radius:4px;margin-top:4px;">
                  <span style="font-weight:700;">Outstanding Balance</span>
                  <span style="font-weight:700;color:${outstanding > 0 ? "#DC2626" : "#059669"};">${outstandingFmt}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;color:#64748B;margin-bottom:12px;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">Customer Details</h4>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F1F5F9;font-size:0.8rem;">
                  <span style="color:#64748B;">Name / Company</span>
                  <span style="font-weight:600;">${company}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F1F5F9;font-size:0.8rem;">
                  <span style="color:#64748B;">Contact Number</span>
                  <span style="font-weight:600;">${phone}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.8rem;">
                  <span style="color:#64748B;">Quotation Reference</span>
                  <span style="font-weight:600;">${q.id}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid #E2E8F0;margin-top:4px;padding-top:10px;font-size:0.8rem;">
                  <span style="color:#64748B;">Payment Due Date</span>
                  <div style="display:flex;gap:6px;align-items:center;">
                    <input type="date" id="due-date-input-${q.id}" class="form-control form-control-sm" value="${dueDate}" style="font-size:0.7rem;padding:4px 8px;width:140px;">
                    <button class="btn btn-sm" onclick="setPaymentDueDate('${q.id}')" style="background:#0F172A;color:#fff;border:none;font-size:0.65rem;padding:4px 10px;border-radius:4px;font-weight:700;cursor:pointer;">Set</button>
                  </div>
                </div>
                ${isOverdue ? '<div style="color:#DC2626;font-size:0.7rem;font-weight:600;padding:4px 8px;background:#FEF2F2;border-radius:4px;text-align:center;">⚠ Overdue — payment was due on ' + dueDate + "</div>" : ""}
                ${showUrgent ? '<div style="color:#DC2626;font-size:0.7rem;font-weight:700;padding:4px 8px;background:#FEF2F2;border-radius:4px;text-align:center;border:1px solid #FCA5A5;">🚨 Production at ' + (prodItem.progressPct || 0) + "% — Collect payment urgently</div>" : ""}
              </div>
            </div>
          </div>

          <div style="border-top:1px solid #E2E8F0;padding-top:16px;margin-top:8px;">
            <h4 style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;color:#64748B;margin-bottom:12px;">Payment History</h4>
            <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;" id="payments-list-${q.id}">
              ${paymentsListHtml}
            </div>

            <div style="background:#F1F5F9;border-radius:8px;padding:16px;margin-top:12px;">
              <h5 style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:#475569;margin-bottom:10px;">Log Payment</h5>
              <div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap;">
                <div style="flex:1;min-width:140px;">
                  <label style="font-size:0.65rem;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Date</label>
                  <input type="date" id="pay-date-${q.id}" class="form-control form-control-sm" value="${new Date().toISOString().split("T")[0]}" style="font-size:0.75rem;padding:6px 10px;">
                </div>
                <div style="flex:0 0 100px;">
                  <label style="font-size:0.65rem;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Time</label>
                  <input type="time" id="pay-time-${q.id}" class="form-control form-control-sm" value="${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}" style="font-size:0.75rem;padding:6px 10px;">
                </div>
                <div style="flex:1;min-width:140px;">
                  <label style="font-size:0.65rem;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Amount (₹)</label>
                  <input type="number" id="pay-amount-${q.id}" class="form-control form-control-sm" placeholder="Enter amount" min="1" style="font-size:0.75rem;padding:6px 10px;">
                </div>
                <div style="flex:1;min-width:120px;">
                  <label style="font-size:0.65rem;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Mode</label>
                  <select id="pay-mode-${q.id}" class="form-control form-control-sm" style="font-size:0.75rem;padding:6px 10px;">
                    <option value="RTGS">RTGS</option>
                    <option value="NEFT">NEFT</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div style="flex:1;min-width:140px;">
                  <label style="font-size:0.65rem;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Reference / UTR</label>
                  <input type="text" id="pay-ref-${q.id}" class="form-control form-control-sm" placeholder="Optional" style="font-size:0.75rem;padding:6px 10px;">
                </div>
                <button class="btn btn-primary btn-sm" onclick="logQuotationPayment('${q.id}')" style="padding:6px 18px;font-size:0.75rem;white-space:nowrap;margin-bottom:1px;">+ Log Payment</button>
              </div>
            </div>

            <div style="display:flex;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid #E2E8F0;">
              <button class="btn btn-sm" style="background:#0F172A;color:#fff;border:none;font-size:0.7rem;padding:6px 14px;border-radius:6px;font-weight:700;cursor:pointer;" onclick="showReceiptModal('${q.id}')">Print Receipt</button>
              <button class="btn btn-outline btn-sm" onclick="openPdfPreview('${q.id}')" style="font-size:0.7rem;padding:6px 14px;">View Quotation</button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
};

window.toggleFinanceDetails = function (quoteId) {
  const el = document.getElementById("finance-details-" + quoteId);
  if (!el) return;
  const isOpen = el.style.display !== "none";
  el.style.display = isOpen ? "none" : "block";
};

window.logQuotationPayment = function (quoteId) {
  loadState();
  const date = document.getElementById("pay-date-" + quoteId)?.value;
  const time = document.getElementById("pay-time-" + quoteId)?.value;
  const amount = parseFloat(
    document.getElementById("pay-amount-" + quoteId)?.value,
  );
  const mode = document.getElementById("pay-mode-" + quoteId)?.value;
  const ref = document.getElementById("pay-ref-" + quoteId)?.value || "";

  if (!amount || amount <= 0) {
    alert("Please enter a valid payment amount.");
    return;
  }

  const quote = (STATE.quotations || []).find((q) => q.id === quoteId);
  if (!quote) {
    alert("Quotation not found.");
    return;
  }

  const alreadyPaid = (STATE.payments || [])
    .filter((p) => p.quoteId === quoteId)
    .reduce((s, p) => s + p.amount, 0);
  const maxAllowed = Math.max(0, (quote.total || 0) - alreadyPaid);

  if (amount > maxAllowed) {
    alert(
      "Payment amount (₹" +
        amount.toLocaleString("en-IN") +
        ") exceeds the outstanding balance of ₹" +
        maxAllowed.toLocaleString("en-IN") +
        ".",
    );
    return;
  }

  const pId = "TXN-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  if (!STATE.payments) STATE.payments = [];
  STATE.payments.push({
    id: pId,
    quoteId: quoteId,
    invoiceId: quoteId,
    date: date || new Date().toISOString().split("T")[0],
    time: time || "",
    amount: amount,
    mode: mode || "RTGS",
    ref: ref,
  });

  logSystemActivity(
    "Payment ₹" +
      amount.toLocaleString("en-IN") +
      " logged for quotation " +
      quoteId +
      " via " +
      (mode || "RTGS") +
      ".",
  );
  saveState();

  document.getElementById("pay-amount-" + quoteId).value = "";
  document.getElementById("pay-ref-" + quoteId).value = "";

  renderFinanceLedger();

  const detailEl = document.getElementById("finance-details-" + quoteId);
  if (detailEl) detailEl.style.display = "block";
};

window.setPaymentDueDate = async function (quoteId) {
  loadState();
  var quote = (STATE.quotations || []).find(function (q) {
    return q.id === quoteId;
  });
  if (!quote) return;
  var dateVal =
    document.getElementById("due-date-input-" + quoteId)?.value || "";
  quote.paymentDueDate = dateVal;
  saveState();
  logSystemActivity(
    "Payment due date set to " + (dateVal || "none") + " for " + quoteId,
  );
  // Persist to the backend so the due date survives reloads. Finance ownership
  // is claimed when a finance employee sets the due date on their quotation.
  if (quote.financeOwner) {
    try {
      await quotationService.claim(quoteId, dateVal);
    } catch (e) {
      Logger.warn("Payment due date persist failed", e);
    }
  }
  renderFinanceLedger();
  var detailEl = document.getElementById("finance-details-" + quoteId);
  if (detailEl) detailEl.style.display = "block";
};

window.showReceiptModal = function (quoteId) {
  loadState();
  const quote = (STATE.quotations || []).find((q) => q.id === quoteId);
  if (!quote) return;

  const payments = (STATE.payments || [])
    .filter((p) => p.quoteId === quoteId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = Math.max(0, (quote.total || 0) - totalPaid);
  const customer = (STATE.customers || []).find(
    (c) => c.id === quote.customerId,
  );
  const company = customer
    ? customer.company || quote.customerName
    : quote.customerName;
  const phone = customer ? customer.phone || "—" : "—";

  const paymentsHtml =
    payments.length > 0
      ? payments
          .map(
            (p, i) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;font-size:0.75rem;">${i + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;font-size:0.75rem;">${p.date}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;font-size:0.75rem;">${p.time || "—"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;font-size:0.75rem;font-weight:700;">₹${p.amount.toLocaleString("en-IN")}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;font-size:0.75rem;">${p.mode || "—"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;font-size:0.75rem;color:#64748B;">${p.ref || "—"}</td>
    </tr>
  `,
          )
          .join("")
      : '<tr><td colspan="6" style="padding:20px;text-align:center;color:#94A3B8;font-size:0.8rem;">No payments recorded.</td></tr>';

  const content = document.getElementById("receipt-content");
  content.innerHTML = `
    <div style="text-align:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #E5E7EB;">
      <div style="font-weight:800;font-size:1rem;color:#1E7D32;">NEXFRA HEAVY ENGINEERING</div>
      <div style="font-size:0.7rem;color:#64748B;">Payment Receipt</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:12px;">
      <div>
        <div style="font-weight:700;">${company}</div>
        <div style="color:#64748B;">${phone}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:700;">${quote.id}</div>
        <div style="color:#64748B;">${quote.productName || ""}</div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px dashed #CBD5E1;border-bottom:1px dashed #CBD5E1;margin-bottom:12px;font-size:0.8rem;">
      <span>Total Quotation Value: <strong>₹${(quote.total || 0).toLocaleString("en-IN")}</strong></span>
      <span>Total Paid: <strong style="color:var(--color-success);">₹${totalPaid.toLocaleString("en-IN")}</strong></span>
      <span>Outstanding: <strong style="color:${outstanding > 0 ? "#DC2626" : "#059669"};">₹${outstanding.toLocaleString("en-IN")}</strong></span>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#F1F5F9;">
          <th style="padding:6px 8px;text-align:left;font-size:0.65rem;text-transform:uppercase;color:#64748B;">#</th>
          <th style="padding:6px 8px;text-align:left;font-size:0.65rem;text-transform:uppercase;color:#64748B;">Date</th>
          <th style="padding:6px 8px;text-align:left;font-size:0.65rem;text-transform:uppercase;color:#64748B;">Time</th>
          <th style="padding:6px 8px;text-align:left;font-size:0.65rem;text-transform:uppercase;color:#64748B;">Amount</th>
          <th style="padding:6px 8px;text-align:left;font-size:0.65rem;text-transform:uppercase;color:#64748B;">Mode</th>
          <th style="padding:6px 8px;text-align:left;font-size:0.65rem;text-transform:uppercase;color:#64748B;">Ref</th>
        </tr>
      </thead>
      <tbody>
        ${paymentsHtml}
      </tbody>
    </table>
    <div style="margin-top:12px;padding-top:8px;border-top:1px solid #E5E7EB;font-size:0.65rem;color:#94A3B8;text-align:center;">
      Generated on ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB")}
    </div>
  `;

  document.getElementById("receipt-modal").style.display = "flex";
};

window.closeReceiptModal = function () {
  document.getElementById("receipt-modal").style.display = "none";
};

window.printReceipt = function () {
  const content = document.getElementById("receipt-content").innerHTML;
  const win = window.open("", "_blank");
  win.document.write(`
    <html>
    <head><title>Payment Receipt</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #F1F5F9; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748B; }
      td { padding: 8px; border-bottom: 1px solid #E5E7EB; font-size: 12px; }
      @media print { body { padding: 20px; } }
    </style>
    </head>
    <body>${content}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
};

window.downloadReceiptPdf = function () {
  var quoteId = document.querySelector(
    "#receipt-content div:nth-child(3) div:last-child div:first-child",
  )?.innerText;
  var element = document.getElementById("receipt-content");
  if (!element) return;
  var safeRef = (quoteId || "receipt").replace(/\//g, "-");
  var opt = {
    margin: [10, 10, 10, 10],
    filename: "NEXFRA_Payment_Receipt_" + safeRef + ".pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: false,
      scrollY: 0,
    },
    jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
  };
  if (typeof html2pdf !== "undefined") {
    html2pdf().set(opt).from(element).save();
  } else {
    alert("PDF library loading, please try printing directly.");
  }
};

// ------------------------------------------
// 8. PRICING PARAMETERS CONFIG (ADMIN)
// ------------------------------------------

function initAdminModule() {
  const form = document.getElementById("admin-pricing-form");
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();

      STATE.adminPricing.floor6 = parseFloat(
        document.getElementById("admin-p-floor-6").value,
      );
      STATE.adminPricing.floor10 = parseFloat(
        document.getElementById("admin-p-floor-10").value,
      );
      STATE.adminPricing.steelHardox = parseFloat(
        document.getElementById("admin-p-steel-hardox").value,
      );
      STATE.adminPricing.axle2 = parseFloat(
        document.getElementById("admin-p-axle-2").value,
      );
      STATE.adminPricing.axle3_16 = parseFloat(
        document.getElementById("admin-p-axle-3-16").value,
      );

      try {
        await adminService.updatePricing({ ...STATE.adminPricing });
        logSystemActivity(`Admin updated raw material pricing coefficients.`);
        alert("Pricing parameters updated successfully in database.");
      } catch (err) {
        Logger.error("Pricing sync failed", err);
        alert("Failed to save pricing parameters: " + err.message);
      }

      renderAdminSettings();
    };
  }

  const addBtn = document.getElementById("btn-add-employee");
  if (addBtn) {
    addBtn.onclick = () => openEmployeeForm(null);
  }
}

function renderAdminSettings() {
  loadState();
  initAdminTabs();
  renderEmployeeManagement();
  renderRolePermissions();
  renderAdminProductsTab();
  document.getElementById("admin-p-floor-6").value = STATE.adminPricing.floor6;
  document.getElementById("admin-p-floor-10").value =
    STATE.adminPricing.floor10;
  document.getElementById("admin-p-steel-hardox").value =
    STATE.adminPricing.steelHardox;
  document.getElementById("admin-p-axle-2").value = STATE.adminPricing.axle2;
  document.getElementById("admin-p-axle-3-16").value =
    STATE.adminPricing.axle3_16;

  const auditContainer = document.getElementById("admin-audit-logs");
  if (auditContainer) {
    auditContainer.innerHTML =
      (STATE.logs || [])
        .map(
          (log) => `
      <li><span class="audit-time">${log.time}</span> ${log.message}</li>
    `,
        )
        .join("") ||
      `
      <li><span class="audit-time">10:42 AM</span> Admin updated baseline pricing matrix coefficients.</li>
      <li><span class="audit-time">09:15 AM</span> Sales approved Quote #2026-002 for Tata Logistics.</li>
      <li><span class="audit-time">08:00 AM</span> System synchronized database instances (4 active modules).</li>
    `;
  }
}

function initAdminTabs() {
  const tabs = document.querySelectorAll("#admin-tabs .admin-tab");
  if (!tabs.length) return;
  tabs.forEach((tab) => {
    tab.onclick = () => {
      const tabName = tab.getAttribute("data-tab");
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document
        .querySelectorAll(".admin-tab-panel")
        .forEach((p) => p.classList.remove("active"));
      const panel = document.getElementById("admin-tab-" + tabName);
      if (panel) panel.classList.add("active");
    };
  });
}

function renderAdminProductsTab() {
  const productList = document.getElementById("admin-product-list");
  const customItemsList = document.getElementById("admin-custom-items-list");
  if (productList) {
    productList.innerHTML = Object.entries(STATE.products || {})
      .map(
        ([key, p]) => `
      <div style="background:var(--color-bg);border:1px solid var(--color-border);padding:16px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong style="font-size:0.85rem">${p.name}</strong>
          <div style="font-size:0.75rem;color:var(--color-text-muted)">Base: ₹${(p.basePrice || 0).toLocaleString("en-IN")} · ${(p.templates || []).length} templates</div>
        </div>
        <span style="font-size:0.7rem;background:var(--color-primary-light);color:var(--color-primary-dark);padding:4px 8px;font-weight:600">${key}</span>
      </div>
    `,
      )
      .join("");
  }
  if (customItemsList) {
    const items = STATE.customItemDefinitions || [];
    if (items.length === 0) {
      customItemsList.innerHTML =
        '<p class="section-hint">No custom item definitions yet.</p>';
    } else {
      customItemsList.innerHTML = items
        .map(
          (item) => `
        <div style="background:var(--color-bg);border:1px solid var(--color-border);padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <strong style="font-size:0.8rem">${escHtml(item.name || "Unnamed")}</strong>
            <div style="font-size:0.7rem;color:var(--color-text-muted)">₹${(item.price || 0).toLocaleString("en-IN")}</div>
          </div>
        </div>
      `,
        )
        .join("");
    }
  }
}

// ------------------------------------------
// 8b. EMPLOYEE MANAGEMENT
// ------------------------------------------

function renderEmployeeManagement() {
  const tbody = document.getElementById("employees-tbody");
  if (!tbody) return;
  const employees = (STATE.employees || []).filter((e) => !e.isDeleted);
  tbody.innerHTML = employees
    .map((emp) => {
      const roleInfo = ROLE_INFO[emp.role] || {
        name: emp.role,
        title: emp.role,
      };
      const loginDate = emp.lastLogin
        ? new Date(emp.lastLogin).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";
      return `
      <tr>
        <td style="font-family:var(--font-headings);font-weight:600;font-size:0.8rem">${emp.id}</td>
        <td><strong>${escHtml(emp.fullName)}</strong></td>
        <td style="font-size:0.8rem;color:var(--color-text-muted)">${escHtml(emp.email)}</td>
        <td style="font-size:0.8rem">${emp.employeeCode ? escHtml(emp.employeeCode) : '<span class="section-hint">—</span>'}</td>
        <td><span class="tbl-status-badge" style="background:${emp.role === "admin" ? "#FEE2E2" : emp.role === "sales" ? "#DBEAFE" : emp.role === "finance" ? "#FEF3C7" : "#E0F2FE"};color:${emp.role === "admin" ? "#991B1B" : emp.role === "sales" ? "#1E40AF" : emp.role === "finance" ? "#92400E" : "#075985"}">${roleInfo.name}</span></td>
        <td><span class="tbl-status-badge ${emp.status === "Active" ? "status-paid" : "status-unpaid"}">${emp.status}</span></td>
        <td style="font-size:0.8rem">${emp.createdDate || "—"}</td>
        <td style="font-size:0.8rem;color:var(--color-text-muted)">${loginDate}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap" data-employee-actions="${emp.id}">
            <button class="btn btn-outline btn-xs" data-action="view-employee" data-id="${emp.id}" title="View">👁</button>
            <button class="btn btn-outline btn-xs" data-action="edit-employee" data-id="${emp.id}" title="Edit">✏️</button>
            <button class="btn btn-outline btn-xs" data-action="disable-employee" data-id="${emp.id}" title="${emp.status === "Active" ? "Disable" : "Enable"}" style="color:${emp.status === "Active" ? "#D97706" : "#15803D"}">${emp.status === "Active" ? "🔒" : "🔓"}</button>
            <button class="btn btn-outline btn-xs" data-action="reset-employee-password" data-id="${emp.id}" title="Reset Password">🔑</button>
            <button class="btn btn-outline btn-xs" data-action="delete-employee" data-id="${emp.id}" title="Delete" style="color:#DC2626">🗑</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderRolePermissions() {
  const grid = document.getElementById("role-permissions-grid");
  if (!grid) return;
  grid.innerHTML = Object.entries(ROLE_PERMISSION_SETS)
    .map(
      ([key, set]) => `
    <div class="card" style="padding:20px;margin:0">
      <h4 style="font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:1.5px solid var(--color-border)">${set.label}</h4>
      <div style="font-size:0.75rem">
        <div style="margin-bottom:8px">
          <span style="font-weight:600;color:var(--color-success)">Can access:</span>
          <ul style="margin-top:4px;padding-left:16px;list-style:disc">
            ${set.canAccess.map((m) => `<li style="margin-bottom:2px">${m.charAt(0).toUpperCase() + m.slice(1)}</li>`).join("")}
          </ul>
        </div>
        ${
          set.cannotAccess.length
            ? `
        <div>
          <span style="font-weight:600;color:var(--color-danger)">Cannot access:</span>
          <ul style="margin-top:4px;padding-left:16px;list-style:disc;color:var(--color-text-muted)">
            ${set.cannotAccess.map((m) => `<li style="margin-bottom:2px">${m.charAt(0).toUpperCase() + m.slice(1)}</li>`).join("")}
          </ul>
        </div>`
            : '<div style="color:var(--color-primary);font-weight:600;margin-top:4px">Full system access</div>'
        }
      </div>
    </div>
  `,
    )
    .join("");
}

function openEmployeeForm(empId) {
  const modal = document.getElementById("employee-form-modal");
  const title = document.getElementById("employee-form-title");
  const submitBtn = document.getElementById("emp-form-submit-btn");
  const idField = document.getElementById("emp-form-id");
  if (empId) {
    const emp = (STATE.employees || []).find((e) => e.id === empId);
    if (!emp) return;
    title.innerText = "Edit Employee";
    submitBtn.innerText = "Update Employee";
    idField.value = emp.id;
    document.getElementById("emp-form-fullName").value = emp.fullName || "";
    document.getElementById("emp-form-email").value = emp.email || "";
    document.getElementById("emp-form-phone").value = emp.phone || "";
    document.getElementById("emp-form-code").value = emp.employeeCode || "";
    document.getElementById("emp-form-role").value = emp.role || "sales";
    document.getElementById("emp-form-status").value = emp.status || "Active";
    document.getElementById("emp-form-password").value = "";
  } else {
    title.innerText = "Add Employee";
    submitBtn.innerText = "Save Employee";
    idField.value = "";
    document.getElementById("emp-form-fullName").value = "";
    document.getElementById("emp-form-email").value = "";
    document.getElementById("emp-form-phone").value = "";
    document.getElementById("emp-form-code").value = "";
    document.getElementById("emp-form-role").value = "sales";
    document.getElementById("emp-form-status").value = "Active";
    document.getElementById("emp-form-password").value = "";
  }
  modal.classList.add("active");
}

function closeEmployeeForm() {
  document.getElementById("employee-form-modal").classList.remove("active");
}

async function saveEmployeeForm(e) {
  e.preventDefault();
  const id = document.getElementById("emp-form-id").value;
  const data = {
    fullName: document.getElementById("emp-form-fullName").value.trim(),
    email: document.getElementById("emp-form-email").value.trim(),
    phone: document.getElementById("emp-form-phone").value.trim(),
    employeeCode: document.getElementById("emp-form-code").value.trim(),
    role: document.getElementById("emp-form-role").value,
    status: document.getElementById("emp-form-status").value,
  };
  const password = document.getElementById("emp-form-password").value.trim();

  if (!data.fullName || !data.email) {
    alert("Full Name and Email are required.");
    return;
  }

  try {
    if (id) {
      if (password) data.password = password;
      await employeeService.update(id, data);
      await refreshEmployeesFromApi().catch((e) =>
        Logger.warn("Employee list refresh failed", e),
      );
      logSystemActivity("Employee " + data.fullName + " updated.");
    } else {
      if (!password) {
        alert("Password is required for new employees.");
        return;
      }
      data.password = password;
      await employeeService.create(data);
      await refreshEmployeesFromApi().catch((e) =>
        Logger.warn("Employee list refresh failed", e),
      );
      logSystemActivity("Employee " + data.fullName + " created.");
    }
  } catch (err) {
    Logger.error("Employee save failed", err);
    alert("Failed to save employee: " + err.message);
    return;
  }

  loadState();
  closeEmployeeForm();
  renderAdminSettings();
}

async function refreshEmployeesFromApi() {
  const employees = await employeeService.getAll();
  STATE.employees = employees;
  _stateCache = Object.assign({}, _stateCache, { employees });
}

function _legacyToBackendStatus(status) {
  return status === "Pending Approval" ? "Pending" : status;
}

function _backendToLegacyStatus(status) {
  return status === "Pending" ? "Pending Approval" : status;
}

// Reconcile quotation statuses from the backend. Local-only fields (specs,
// terms, etc.) and unsynced local rows are never overwritten or dropped; a
// backend status change (e.g. Admin approval) is only adopted when the local
// row has no pending unsynced transition. Returns true when STATE changed.
async function refreshQuotationsFromApi() {
  const quotations = await quotationService.getAll(
    _sessionRole === "finance" ? { financeView: "mine" } : undefined,
  );
  console.log(
    "[refreshQuotationsFromApi] fetched from API:",
    quotations.map((q) => q.id),
    "current STATE.quotations:",
    STATE.quotations ? STATE.quotations.map((q) => q.id) : [],
  );
  if (!STATE.quotations) STATE.quotations = [];
  const wasDirty = _entitySig(STATE.quotations) !== _syncSignatures.quotations;
  let changed = false;
  for (const backend of quotations) {
    const local = STATE.quotations.find(
      (q) =>
        (q._backendId && q._backendId === backend._backendId) ||
        q.id === backend.id ||
        q.id === backend._backendId,
    );
    if (!local) {
      const full = await quotationService
        .getById(backend._backendId)
        .catch(() => null);
      const stillMissing =
        full &&
        !STATE.quotations.some(
          (q) =>
            (q._backendId && q._backendId === full._backendId) ||
            q.id === full.id ||
            q.id === full._backendId,
        );
      if (stillMissing) {
        STATE.quotations.push(full);
        changed = true;
      }
      continue;
    }
    if (!local._backendId && backend._backendId) {
      local._backendId = backend._backendId;
      local.id = backend.id;
      changed = true;
    }
    const localSynced =
      _legacyToBackendStatus(local.status) === local._backendStatus;
    if (
      localSynced &&
      backend._backendStatus &&
      backend._backendStatus !== local._backendStatus
    ) {
      local._backendStatus = backend._backendStatus;
      local.status = _backendToLegacyStatus(backend._backendStatus);
      changed = true;
    }
  }
  _stateCache = Object.assign({}, _stateCache, {
    quotations: STATE.quotations,
  });
  if (!wasDirty) {
    _syncSignatures.quotations = _entitySig(STATE.quotations);
  }
  return changed;
}

// Backend-authoritative finance views. Refreshes the inbox ("All Quotations",
// approved + unclaimed) and the current user's claimed quotations, and merges
// the latter into STATE so the "My Quotations" ledger stays current. Ownership
// scoping lives in the backend queries — nothing here filters by owner.
let _financeSig = null;

async function refreshFinanceFromApi() {
  let inbox = [];
  let mine = [];
  try {
    inbox = await quotationService.getAll({ financeView: "inbox" });
    mine = await quotationService.getAll({ financeView: "mine" });
  } catch (e) {
    Logger.warn("Finance refresh failed", e);
    return false;
  }
  const sig =
    JSON.stringify(inbox.map((q) => q._backendId)) +
    "|" +
    JSON.stringify(mine.map((q) => q._backendId));
  if (sig === _financeSig) return false;
  _financeSig = sig;
  if (_sessionRole === "finance") {
    if (!STATE.quotations) STATE.quotations = [];
    for (const q of mine) {
      const idx = STATE.quotations.findIndex(
        (x) =>
          (x._backendId && x._backendId === q._backendId) ||
          x.id === q._backendId,
      );
      if (idx >= 0) {
        const existing = STATE.quotations[idx];
        const detailed = ["specs", "notRequired", "_specDiffs", "customItems", "terms", "scopeOfWork", "bankDetails", "dimensions"];
        const merged = Object.assign({}, q);
        detailed.forEach((k) => {
          if (existing[k] !== undefined) merged[k] = existing[k];
        });
        STATE.quotations[idx] = merged;
      } else STATE.quotations.push(q);
    }
    _stateCache = Object.assign({}, _stateCache, {
      quotations: STATE.quotations,
    });
  }
  return true;
}

// Add backend-created work orders (e.g. freshly approved quotations) so every
// manager sees every work order, and reconcile their backend status. Returns
// true when STATE changed.
async function refreshWorkOrdersFromApi() {
  const workOrders = await workOrderService.getAll();
  if (!STATE.workOrders) STATE.workOrders = [];
  const wasDirty = _entitySig(STATE.workOrders) !== _syncSignatures.workOrders;
  const local = STATE.workOrders;
  let changed = false;
  for (const backend of workOrders) {
    const existingLocal = local.find(
      (w) =>
        (w._backendId && w._backendId === backend._backendId) ||
        w.id === backend.id ||
        w.id === backend._backendId,
    );
    if (!existingLocal) {
      local.push(backend);
      changed = true;
      continue;
    }
    if (
      backend._backendStatus &&
      backend._backendStatus !== existingLocal._backendStatus
    ) {
      existingLocal._backendStatus = backend._backendStatus;
      changed = true;
    }
  }
  _stateCache = Object.assign({}, _stateCache, {
    workOrders: STATE.workOrders,
  });
  if (!wasDirty) {
    _syncSignatures.workOrders = _entitySig(STATE.workOrders);
  }
  return changed;
}

let _visibilityPollTimer = null;

function startVisibilityPoll() {
  if (_visibilityPollTimer) return;
  _visibilityPollTimer = setInterval(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      if (
        userCanAccess("approvals") ||
        userCanAccess("quotations") ||
        userCanAccess("allquotations")
      ) {
        const changed = await refreshQuotationsFromApi();
        if (changed) {
          renderAllQuotations();
          renderApprovalsList(_approvalsFilter || "pending");
        }
      }
      if (userCanAccess("workorders")) {
        const changed = await refreshWorkOrdersFromApi();
        if (changed) renderWorkOrders();
      }
      if (userCanAccess("accounts")) {
        const changed = await refreshFinanceFromApi();
        if (changed) refreshFinanceModule();
      }
    } catch (e) {
      Logger.warn("Visibility refresh failed", e);
    }
  }, 15000);
}

function stopVisibilityPoll() {
  if (_visibilityPollTimer) {
    clearInterval(_visibilityPollTimer);
    _visibilityPollTimer = null;
  }
}

function openEmployeeView(empId) {
  const emp = (STATE.employees || []).find((e) => e.id === empId);
  if (!emp) return;
  const roleInfo = ROLE_INFO[emp.role] || { name: emp.role, title: emp.role };
  const loginDate = emp.lastLogin
    ? new Date(emp.lastLogin).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";
  const permSet = ROLE_PERMISSION_SETS[emp.role];
  const content = document.getElementById("employee-view-content");
  content.innerHTML = `
    <div style="background:#374151;padding:24px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
        <div style="width:48px;height:48px;background:${emp.role === "admin" ? "#DC2626" : emp.role === "sales" ? "#2563EB" : emp.role === "finance" ? "#D97706" : "#0891B2"};color:#fff;font-family:var(--font-headings);font-weight:700;font-size:1.25rem;display:flex;align-items:center;justify-content:center">${emp.fullName.charAt(0).toUpperCase()}</div>
        <div>
          <div style="font-size:1.15rem;font-weight:700;color:#fff">${escHtml(emp.fullName)}</div>
          <div style="font-size:0.8rem;color:#9CA3AF">${emp.id}</div>
        </div>
        <div style="margin-left:auto">
          <span class="tbl-status-badge ${emp.status === "Active" ? "status-paid" : "status-unpaid"}">${emp.status}</span>
        </div>
      </div>
      <div class="grid grid-2-col gap-md" style="font-size:0.85rem">
        <div><span style="color:#9CA3AF">Email:</span><br><span style="color:#fff">${escHtml(emp.email)}</span></div>
        <div><span style="color:#9CA3AF">Phone:</span><br><span style="color:#fff">${emp.phone || "—"}</span></div>
        <div><span style="color:#9CA3AF">Employee Code:</span><br><span style="color:#fff">${emp.employeeCode || "—"}</span></div>
        <div><span style="color:#9CA3AF">Role:</span><br><span style="color:#fff">${roleInfo.title}</span></div>
        <div><span style="color:#9CA3AF">Created:</span><br><span style="color:#fff">${emp.createdDate || "—"}</span></div>
        <div><span style="color:#9CA3AF">Last Login:</span><br><span style="color:#fff">${loginDate}</span></div>
      </div>
    </div>
    ${
      permSet
        ? `
    <div style="background:#374151;padding:24px">
      <h4 style="font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;color:#fff;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1)">Permissions</h4>
      <div style="font-size:0.8rem">
        <div style="margin-bottom:12px">
          <span style="font-weight:600;color:#10B981">Can access:</span>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
            ${permSet.canAccess.map((m) => `<span style="background:rgba(16,185,129,0.15);color:#10B981;padding:4px 10px;font-size:0.7rem;font-weight:600">${m.charAt(0).toUpperCase() + m.slice(1)}</span>`).join("")}
          </div>
        </div>
        ${
          permSet.cannotAccess.length
            ? `
        <div>
          <span style="font-weight:600;color:#EF4444">Cannot access:</span>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
            ${permSet.cannotAccess.map((m) => `<span style="background:rgba(239,68,68,0.1);color:#FCA5A5;padding:4px 10px;font-size:0.7rem;font-weight:600">${m.charAt(0).toUpperCase() + m.slice(1)}</span>`).join("")}
          </div>
        </div>`
            : '<div style="color:#10B981;font-weight:600;margin-top:4px">✓ Full system access</div>'
        }
      </div>
    </div>`
        : ""
    }
  `;
  document.getElementById("employee-view-modal").classList.add("active");
}

function closeEmployeeView() {
  document.getElementById("employee-view-modal").classList.remove("active");
}

window.openEmployeeView = openEmployeeView;
window.closeEmployeeView = closeEmployeeView;
window.openEmployeeForm = openEmployeeForm;
window.closeEmployeeForm = closeEmployeeForm;
window.saveEmployeeForm = saveEmployeeForm;

window.disableEmployee = async function (empId) {
  const emp = (STATE.employees || []).find((e) => e.id === empId);
  if (!emp) return;
  const newStatus = emp.status === "Active" ? "disable" : "enable";
  if (
    !confirm(
      "Are you sure you want to " +
        newStatus +
        " employee " +
        emp.fullName +
        "?",
    )
  )
    return;
  try {
    await employeeService.disable(empId);
    await refreshEmployeesFromApi().catch((e) =>
      Logger.warn("Employee list refresh failed", e),
    );
    logSystemActivity(
      "Employee " +
        emp.fullName +
        " " +
        (emp.status === "Active" ? "disabled" : "enabled") +
        ".",
    );
    renderAdminSettings();
  } catch (err) {
    Logger.error("Failed to disable employee", err);
    alert("Operation failed.");
  }
};

window.deleteEmployee = async function (empId) {
  const emp = (STATE.employees || []).find((e) => e.id === empId);
  if (!emp) return;
  if (
    !confirm(
      "Soft-delete employee " +
        emp.fullName +
        "? They can be restored from storage.",
    )
  )
    return;
  try {
    await employeeService.delete(empId);
    await refreshEmployeesFromApi().catch((e) =>
      Logger.warn("Employee list refresh failed", e),
    );
    logSystemActivity("Employee " + emp.fullName + " deleted (soft).");
    renderAdminSettings();
  } catch (err) {
    Logger.error("Failed to delete employee", err);
    alert("Operation failed.");
  }
};

window.resetEmployeePassword = async function (empId) {
  const emp = (STATE.employees || []).find((e) => e.id === empId);
  if (!emp) return;
  const newPwd = prompt("Enter new password for " + emp.fullName + ":");
  if (!newPwd || newPwd.trim() === "") return;
  try {
    await employeeService.resetPassword(empId, newPwd.trim());
    await refreshEmployeesFromApi().catch((e) =>
      Logger.warn("Employee list refresh failed", e),
    );
    logSystemActivity("Password reset for employee " + emp.fullName + ".");
    alert("Password updated successfully.");
  } catch (err) {
    Logger.error("Failed to reset password", err);
    alert("Operation failed.");
  }
};

// ------------------------------------------
// 9. HIGH-FIDELITY PDF PREVIEW GENERATOR
// ------------------------------------------

function initPdfPreviewControls() {
  const closeBtn = document.getElementById("btn-close-pdf");
  const printBtn = document.getElementById("btn-print-pdf");
  const downloadBtn = document.getElementById("btn-download-pdf");

  if (closeBtn) closeBtn.onclick = closePdfPreview;
  if (printBtn) printBtn.onclick = printPdf;

  if (downloadBtn) {
    downloadBtn.onclick = () => {
      downloadPdf(currentPreviewQuoteId);
    };
  }
}

function closePdfPreview() {
  const modal = document.getElementById("pdf-preview-modal");
  if (modal) {
    modal.classList.remove("active");
  }
}

function printPdf() {
  window.print();
}

function downloadPdf(quoteId) {
  const element = document.getElementById("pdf-content-to-print");
  const safeRef = quoteId.replace(/\//g, "-");
  const opt = {
    margin: [0, 0, 0, 0],
    filename: `NEXFRA_Quotation_${safeRef}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: false,
      scrollY: 0,
      onclone: (clonedDoc) => {
        const sheet = clonedDoc.getElementById("pdf-content-to-print");
        if (sheet) {
          sheet.style.transform = "none";
          sheet.style.scale = "1";
        }
        clonedDoc.querySelectorAll(".pdf-page, .pdf-page *").forEach((el) => {
          el.style.fontFamily = "Arial, Helvetica, sans-serif";
          el.style.wordSpacing = "0.15em";
          el.style.letterSpacing = "normal";
          el.style.whiteSpace = "normal";
        });
      },
    },
    jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] },
  };

  if (typeof html2pdf !== "undefined") {
    html2pdf().set(opt).from(element).save();
  } else {
    alert("PDF generation library is loading, please try printing directly.");
  }
}

// Format numbers like 3,80,000/-
function formatPdfPrice(num) {
  return num.toLocaleString("en-IN") + "/-";
}

function priceToIndianWords(num) {
  if (num === 0) return "zero";
  const a = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const b = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];

  const convertThreeDigit = (n) => {
    let word = "";
    if (n >= 100) {
      word += a[Math.floor(n / 100)] + " hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        word += a[n];
      } else {
        word += b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
      }
    }
    return word.trim();
  };

  let wordStr = "";
  if (num >= 10000000) {
    wordStr += convertThreeDigit(Math.floor(num / 10000000)) + " crore ";
    num %= 10000000;
  }
  if (num >= 100000) {
    wordStr += convertThreeDigit(Math.floor(num / 100000)) + " lakh ";
    num %= 100000;
  }
  if (num >= 1000) {
    wordStr += convertThreeDigit(Math.floor(num / 1000)) + " thousand ";
    num %= 1000;
  }
  if (num > 0) {
    wordStr += convertThreeDigit(num);
  }

  let finalResult = wordStr.trim();
  finalResult =
    finalResult.charAt(0).toUpperCase() + finalResult.slice(1) + " only";
  return finalResult.replace(/\s+/g, " ");
}

// Global modal preview populator
window.openPdfPreview = function (quoteId) {
  loadState();
  var q = STATE.quotations
    ? STATE.quotations.find(function (x) {
        return x.id === quoteId || x._backendId === quoteId;
      })
    : null;
  if (!q) return;
  var client = STATE.customers
    ? STATE.customers.find(function (c) {
        return (
          c.id === q.customerId || (c.company && c.company === q.customerName)
        );
      })
    : null;
  renderPdfFromQuote(q, client);
};
