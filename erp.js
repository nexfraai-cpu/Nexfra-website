/* ==========================================
   Nexfra ERP Control Panel Core Script
   ========================================== */

// 1. AUTH CHECK & STATE INITIALIZATION
(function checkAuth() {
  if (localStorage.getItem('adminLoggedIn') !== 'true') {
    alert("Access Denied: Please log in as Administrator first.");
    window.location.href = 'index.html';
  }
})();

const STAGES = [
  'Pending',
  'Material Ordered',
  'Cutting',
  'Fabrication',
  'Welding',
  'Painting',
  'Assembly',
  'QC',
  'Ready',
  'Delivered'
];

let STATE = {};
let currentPreviewQuoteId = '';

// Product Configurator Wizard State
let wizardState = {
  currentStep: 1,
  customer: {},
  category: '',
  subtype: '',
  capacity: '',
  specs: {},
  notRequired: {},
  status: 'Draft',
  total: 0
};

// Master Vehicle Configurator Templates
const WIZARD_PRODUCT_TEMPLATES = {
  flatbed: {
    name: "Flat Bed Trailer",
    basePrice: 520000,
    dimensions: { length: "40 Feet", height: "NA", width: "98 Inches" },
    specs: [
      { id: "beam", name: "Main Beam Steel Grade", section: "material", type: "dropdown", options: ["ST52", "Hardox 450", "BSK46", "E450", "Custom"], defaultValue: "ST52", priceDiffs: { "ST52": 0, "Hardox 450": 150000, "BSK46": 40000, "E450": 60000, "Custom": 80000 } },
      { id: "floor", name: "Floor Sheet Type", section: "material", type: "dropdown", options: ["3mm Chequered", "4mm Plain", "6mm ST52", "Custom"], defaultValue: "3mm Chequered", priceDiffs: { "3mm Chequered": 0, "4mm Plain": 15000, "6mm ST52": 45000, "Custom": 60000 } },
      { id: "axles", name: "Axle Brand & Loading", section: "chassis", type: "radio", options: ["York 3x13T", "Fuwa 3x13T", "York 3x16T", "York 2x13T", "Custom"], defaultValue: "York 3x13T", priceDiffs: { "York 3x13T": 0, "Fuwa 3x13T": -10000, "York 3x16T": 80000, "York 2x13T": -100000, "Custom": 50000 } },
      { id: "suspension", name: "Suspension System", section: "chassis", type: "dropdown", options: ["Mechanical Leaf Spring", "Air Suspension", "Bogie Suspension", "Custom"], defaultValue: "Mechanical Leaf Spring", priceDiffs: { "Mechanical Leaf Spring": 0, "Air Suspension": 120000, "Bogie Suspension": 90000, "Custom": 80000 } },
      { id: "brake", name: "Brake System Pneumatic", section: "chassis", type: "dropdown", options: ["WABCO ABS", "BCS EBS", "Brake Master", "Custom"], defaultValue: "WABCO ABS", priceDiffs: { "WABCO ABS": 0, "BCS EBS": 60000, "Brake Master": 20000, "Custom": 40000 } },
      { id: "disc", name: "Wheel Disc Style", section: "chassis", type: "dropdown", options: ["Steel 10-hole", "Alloy York", "Custom"], defaultValue: "Steel 10-hole", priceDiffs: { "Steel 10-hole": 0, "Alloy York": 45000, "Custom": 25000 } },
      { id: "hook", name: "King Pin/Hook Size", section: "chassis", type: "dropdown", options: ["Standard 2-inch JOST", "Heavy Duty 3.5-inch JOST", "Custom"], defaultValue: "Standard 2-inch JOST", priceDiffs: { "Standard 2-inch JOST": 0, "Heavy Duty 3.5-inch JOST": 15000, "Custom": 10000 } },
      { id: "tyre", name: "Tyres Fitted", section: "chassis", type: "dropdown", options: ["Apollo 10.00R20", "MRF Musclerok", "JK Jetsteel", "Bridgestone", "Custom"], defaultValue: "Apollo 10.00R20", priceDiffs: { "Apollo 10.00R20": 0, "MRF Musclerok": 12000, "JK Jetsteel": -8000, "Bridgestone": 24000, "Custom": 15000 } },
      { id: "painting", name: "Surface Treatment", section: "painting", type: "dropdown", options: ["Epoxy Primer + PU Paint", "Epoxy Primer + Epoxy Paint", "Customer Choice", "Custom"], defaultValue: "Epoxy Primer + PU Paint", priceDiffs: { "Epoxy Primer + PU Paint": 0, "Epoxy Primer + Epoxy Paint": -15000, "Customer Choice": 0, "Custom": 20000 } },
      { id: "colour", name: "Finish Colour", section: "painting", type: "text", defaultValue: "Golden Green" },
      { id: "toolbox", name: "Fitted Tool Box", section: "accessories", type: "checkbox", defaultValue: "Yes", priceDiffs: { "Yes": 0, "No": -5000 } },
      { id: "spare_wheel", name: "Spare Wheel Carrier", section: "accessories", type: "checkbox", defaultValue: "Yes", priceDiffs: { "Yes": 0, "No": -8000 } }
    ]
  },
  sidewall: {
    name: "Side Wall Trailer",
    basePrice: 580000,
    dimensions: { length: "40 Feet", height: "4.5 Feet", width: "98 Inches" },
    specs: [
      { id: "beam", name: "Main Beam Steel Grade", section: "material", type: "dropdown", options: ["ST52", "Hardox 450", "BSK46", "E450", "Custom"], defaultValue: "ST52", priceDiffs: { "ST52": 0, "Hardox 450": 150000, "BSK46": 40000, "E450": 60000, "Custom": 80000 } },
      { id: "floor", name: "Floor Sheet Type", section: "material", type: "dropdown", options: ["3mm Chequered", "4mm Plain", "6mm ST52", "Custom"], defaultValue: "3mm Chequered", priceDiffs: { "3mm Chequered": 0, "4mm Plain": 15000, "6mm ST52": 45000, "Custom": 60000 } },
      { id: "side_panel", name: "Side Panel Height/Style", section: "material", type: "radio", options: ["1.5mm Corrugated", "2mm Corrugated", "Custom"], defaultValue: "1.5mm Corrugated", priceDiffs: { "1.5mm Corrugated": 0, "2mm Corrugated": 25000, "Custom": 40000 } },
      { id: "axles", name: "Axle Brand & Loading", section: "chassis", type: "radio", options: ["York 3x13T", "Fuwa 3x13T", "York 3x16T", "York 2x13T", "Custom"], defaultValue: "York 3x13T", priceDiffs: { "York 3x13T": 0, "Fuwa 3x13T": -10000, "York 3x16T": 80000, "York 2x13T": -100000, "Custom": 50000 } },
      { id: "suspension", name: "Suspension System", section: "chassis", type: "dropdown", options: ["Mechanical Leaf Spring", "Air Suspension", "Bogie Suspension", "Custom"], defaultValue: "Mechanical Leaf Spring", priceDiffs: { "Mechanical Leaf Spring": 0, "Air Suspension": 120000, "Bogie Suspension": 90000, "Custom": 80000 } },
      { id: "brake", name: "Brake System Pneumatic", section: "chassis", type: "dropdown", options: ["WABCO ABS", "BCS EBS", "Brake Master", "Custom"], defaultValue: "WABCO ABS", priceDiffs: { "WABCO ABS": 0, "BCS EBS": 60000, "Brake Master": 20000, "Custom": 40000 } },
      { id: "tyre", name: "Tyres Fitted", section: "chassis", type: "dropdown", options: ["Apollo 10.00R20", "MRF Musclerok", "JK Jetsteel", "Bridgestone", "Custom"], defaultValue: "Apollo 10.00R20", priceDiffs: { "Apollo 10.00R20": 0, "MRF Musclerok": 12000, "JK Jetsteel": -8000, "Bridgestone": 24000, "Custom": 15000 } },
      { id: "painting", name: "Surface Treatment", section: "painting", type: "dropdown", options: ["Epoxy Primer + PU Paint", "Epoxy Primer + Epoxy Paint", "Customer Choice", "Custom"], defaultValue: "Epoxy Primer + PU Paint", priceDiffs: { "Epoxy Primer + PU Paint": 0, "Epoxy Primer + Epoxy Paint": -15000, "Customer Choice": 0, "Custom": 20000 } },
      { id: "colour", name: "Finish Colour", section: "painting", type: "text", defaultValue: "Golden Green" }
    ]
  },
  tiptrailer: {
    name: "Tip Trailer",
    basePrice: 720000,
    dimensions: { length: "32 Feet", height: "4.5 Feet", width: "98 Inches" },
    specs: [
      { id: "beam", name: "Main Beam Steel Grade", section: "material", type: "dropdown", options: ["ST52", "Hardox 450", "BSK46", "E450", "Custom"], defaultValue: "ST52", priceDiffs: { "ST52": 0, "Hardox 450": 150000, "BSK46": 40000, "E450": 60000, "Custom": 80000 } },
      { id: "floor", name: "Floor Sheet thickness", section: "material", type: "dropdown", options: ["6mm MS", "8mm ST-52", "10mm ST-52", "Custom"], defaultValue: "8mm ST-52", priceDiffs: { "6mm MS": -15000, "8mm ST-52": 0, "10mm ST-52": 30000, "Custom": 45000 } },
      { id: "side_sheet", name: "Side Sheet thickness", section: "material", type: "dropdown", options: ["4mm MS", "6mm ST-52", "8mm ST-52", "Custom"], defaultValue: "6mm ST-52", priceDiffs: { "4mm MS": -10000, "6mm ST-52": 0, "8mm ST-52": 25000, "Custom": 40000 } },
      { id: "cylinder", name: "Tipping Cylinder Model", section: "hydraulic", type: "dropdown", options: ["Hyva 179-5stage", "Hyva 150-4stage", "Wipro Heavy Duty", "Custom"], defaultValue: "Hyva 179-5stage", priceDiffs: { "Hyva 179-5stage": 0, "Hyva 150-4stage": -25000, "Wipro Heavy Duty": -10000, "Custom": 20000 } },
      { id: "axles", name: "Axles Fitted", section: "chassis", type: "radio", options: ["York 3x13T", "York 3x16T", "York 2x13T", "Custom"], defaultValue: "York 3x13T", priceDiffs: { "York 3x13T": 0, "York 3x16T": 80000, "York 2x13T": -100000, "Custom": 40000 } },
      { id: "painting", name: "Surface Treatment", section: "painting", type: "dropdown", options: ["Epoxy Primer + PU Paint", "Epoxy Primer + Epoxy Paint", "Custom"], defaultValue: "Epoxy Primer + PU Paint", priceDiffs: { "Epoxy Primer + PU Paint": 0, "Epoxy Primer + Epoxy Paint": -15000, "Custom": 20000 } },
      { id: "colour", name: "Finish Colour", section: "painting", type: "text", defaultValue: "Royal Blue" },
      { id: "reflective_tape", name: "Reflective Safety Tape", section: "accessories", type: "radio", options: ["RTO std & guidelines", "Standard 3M", "Custom"], defaultValue: "RTO std & guidelines", priceDiffs: { "RTO std & guidelines": 0, "Standard 3M": 8000, "Custom": 12000 } },
      { id: "marker_lamps", name: "Safety Marker Lamps", section: "accessories", type: "dropdown", options: ["Side Marker Lamp 6 no's and top marker lamp 2 no's", "Standard 4 marker lamps", "Custom"], defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's", priceDiffs: { "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0, "Standard 4 marker lamps": -5000, "Custom": 10000 } },
      { id: "tipping_angle", name: "Maximum Tipping Angle", section: "accessories", type: "text", defaultValue: "42 to 45 degrees" }
    ]
  },
  boxbody: {
    name: "Box Body Tipper",
    basePrice: 480000,
    dimensions: { length: "20 Feet", height: "4.5 Feet", width: "98 Inches" },
    specs: [
      { id: "floor", name: "Floor Sheet thickness", section: "material", type: "dropdown", options: ["6mm MS", "8mm ST-52", "10mm ST-52", "Custom"], defaultValue: "8mm ST-52", priceDiffs: { "6mm MS": -15000, "8mm ST-52": 0, "10mm ST-52": 30000, "Custom": 45000 } },
      { id: "side_sheet", name: "Side Sheet thickness", section: "material", type: "dropdown", options: ["4mm MS", "6mm ST-52", "8mm ST-52", "Custom"], defaultValue: "6mm ST-52", priceDiffs: { "4mm MS": -10000, "6mm ST-52": 0, "8mm ST-52": 25000, "Custom": 40000 } },
      { id: "headboard", name: "Headboard Sheet thickness", section: "material", type: "dropdown", options: ["6mm ST-52", "8mm ST-52", "Custom"], defaultValue: "6mm ST-52", priceDiffs: { "6mm ST-52": 0, "8mm ST-52": 15000, "Custom": 25000 } },
      { id: "taildoor", name: "Tail Door thickness", section: "material", type: "dropdown", options: ["6mm ST-52", "8mm ST-52", "Custom"], defaultValue: "6mm ST-52", priceDiffs: { "6mm ST-52": 0, "8mm ST-52": 15000, "Custom": 25000 } },
      { id: "cylinder", name: "Tipping Cylinder Model", section: "hydraulic", type: "dropdown", options: ["Hyva 150-4stage-4520", "Hyva 179-5stage", "Wipro Heavy Duty", "Custom"], defaultValue: "Hyva 150-4stage-4520", priceDiffs: { "Hyva 150-4stage-4520": 0, "Hyva 179-5stage": 35000, "Wipro Heavy Duty": 10000, "Custom": 20000 } },
      { id: "pto", name: "Power Take-Off (PTO)", section: "hydraulic", type: "checkbox", defaultValue: "Yes", priceDiffs: { "Yes": 0, "No": -12000 } },
      { id: "pump", name: "Hydraulic Pump Type", section: "hydraulic", type: "dropdown", options: ["Included Gear Pump", "Included Piston Pump", "Custom"], defaultValue: "Included Gear Pump", priceDiffs: { "Included Gear Pump": 0, "Included Piston Pump": 28000, "Custom": 15000 } },
      { id: "lock_system", name: "Tail Door Lock System", section: "chassis", type: "radio", options: ["Horizontal Lock System", "Manual Lock", "Custom"], defaultValue: "Horizontal Lock System", priceDiffs: { "Horizontal Lock System": 0, "Manual Lock": -10000, "Custom": 15000 } },
      { id: "painting", name: "Surface Treatment", section: "painting", type: "dropdown", options: ["Epoxy Primer + PU Paint", "Epoxy Primer + Epoxy Paint", "Custom"], defaultValue: "Epoxy Primer + PU Paint", priceDiffs: { "Epoxy Primer + PU Paint": 0, "Epoxy Primer + Epoxy Paint": -15000, "Custom": 20000 } },
      { id: "colour", name: "Finish Colour", section: "painting", type: "text", defaultValue: "Golden Green" },
      { id: "reflective_tape", name: "Reflective Safety Tape", section: "accessories", type: "radio", options: ["RTO std & guidelines", "Standard 3M", "Custom"], defaultValue: "RTO std & guidelines", priceDiffs: { "RTO std & guidelines": 0, "Standard 3M": 8000, "Custom": 12000 } },
      { id: "marker_lamps", name: "Safety Marker Lamps", section: "accessories", type: "dropdown", options: ["Side Marker Lamp 6 no's and top marker lamp 2 no's", "Standard 4 marker lamps", "Custom"], defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's", priceDiffs: { "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0, "Standard 4 marker lamps": -5000, "Custom": 10000 } },
      { id: "tipping_angle", name: "Maximum Tipping Angle", section: "accessories", type: "text", defaultValue: "42 to 45 degrees" }
    ]
  },
  rockbody: {
    name: "Rock Body Tipper",
    basePrice: 650000,
    dimensions: { length: "18 Feet", height: "4.0 Feet", width: "98 Inches" },
    specs: [
      { id: "floor", name: "Floor Sheet thickness", section: "material", type: "dropdown", options: ["10mm ST-52", "12mm Hardox 450", "Custom"], defaultValue: "10mm ST-52", priceDiffs: { "10mm ST-52": 0, "12mm Hardox 450": 180000, "Custom": 80000 } },
      { id: "side_sheet", name: "Side Sheet thickness", section: "material", type: "dropdown", options: ["8mm ST-52", "10mm Hardox 450", "Custom"], defaultValue: "8mm ST-52", priceDiffs: { "8mm ST-52": 0, "10mm Hardox 450": 120000, "Custom": 60000 } },
      { id: "cylinder", name: "Tipping Cylinder Model", section: "hydraulic", type: "dropdown", options: ["Hyva 179-5stage", "Hyva 150-4stage", "Custom"], defaultValue: "Hyva 179-5stage", priceDiffs: { "Hyva 179-5stage": 0, "Hyva 150-4stage": -25000, "Custom": 20000 } },
      { id: "painting", name: "Surface Treatment", section: "painting", type: "dropdown", options: ["Epoxy Primer + PU Paint", "Epoxy Primer + Epoxy Paint", "Custom"], defaultValue: "Epoxy Primer + PU Paint", priceDiffs: { "Epoxy Primer + PU Paint": 0, "Epoxy Primer + Epoxy Paint": -15000, "Custom": 20000 } },
      { id: "colour", name: "Finish Colour", section: "painting", type: "text", defaultValue: "Crimson Red" },
      { id: "reflective_tape", name: "Reflective Safety Tape", section: "accessories", type: "radio", options: ["RTO std & guidelines", "Standard 3M", "Custom"], defaultValue: "RTO std & guidelines", priceDiffs: { "RTO std & guidelines": 0, "Standard 3M": 8000, "Custom": 12000 } },
      { id: "marker_lamps", name: "Safety Marker Lamps", section: "accessories", type: "dropdown", options: ["Side Marker Lamp 6 no's and top marker lamp 2 no's", "Standard 4 marker lamps", "Custom"], defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's", priceDiffs: { "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0, "Standard 4 marker lamps": -5000, "Custom": 10000 } }
    ]
  },
  rigid28: {
    name: "28 Feet Rigid Load Body",
    basePrice: 380000,
    dimensions: { length: "28 Feet", height: "4.0 Feet", width: "98 Inches" },
    specs: [
      { id: "floor", name: "Floor sheet", section: "material", type: "dropdown", options: ["5mm (St52)", "6mm (St52)", "3mm Chequered", "Custom"], defaultValue: "5mm (St52)", priceDiffs: { "5mm (St52)": 0, "6mm (St52)": 25000, "3mm Chequered": -15000, "Custom": 30000 } },
      { id: "side_board", name: "Side board sheet", section: "material", type: "dropdown", options: ["3mm (St52)", "4mm (St52)", "Custom"], defaultValue: "3mm (St52)", priceDiffs: { "3mm (St52)": 0, "4mm (St52)": 18000, "Custom": 25000 } },
      { id: "headboard", name: "Head board sheet", section: "material", type: "dropdown", options: ["3mm (St52)", "4mm (St52)", "Custom"], defaultValue: "3mm (St52)", priceDiffs: { "3mm (St52)": 0, "4mm (St52)": 15000, "Custom": 20000 } },
      { id: "taildoor", name: "Tail door sheet", section: "material", type: "dropdown", options: ["3mm (St52)", "4mm (St52)", "Custom"], defaultValue: "3mm (St52)", priceDiffs: { "3mm (St52)": 0, "4mm (St52)": 15000, "Custom": 20000 } },
      { id: "runner", name: "Runner", section: "chassis", type: "dropdown", options: ["ISMC 200 SAIL make", "ISMC 175", "Custom"], defaultValue: "ISMC 200 SAIL make", priceDiffs: { "ISMC 200 SAIL make": 0, "ISMC 175": -10000, "Custom": 15000 } },
      { id: "cross_members", name: "Side Board Cross members", section: "chassis", type: "text", defaultValue: "12 nos Formed Section Nexfra Standard with Horizontal Stiffener at Center" },
      { id: "floor_cross", name: "Floor Cross member", section: "chassis", type: "text", defaultValue: "Nexfra Standard" },
      { id: "painting", name: "Painting", section: "painting", type: "dropdown", options: ["Epoxy primer and PU top coat Nippon paint", "Epoxy primer and Epoxy paint", "Custom"], defaultValue: "Epoxy primer and PU top coat Nippon paint", priceDiffs: { "Epoxy primer and PU top coat Nippon paint": 0, "Epoxy primer and Epoxy paint": -10000, "Custom": 15000 } },
      { id: "reflective_tape", name: "Reflective tape", section: "accessories", type: "radio", options: ["Yes", "No"], defaultValue: "Yes" },
      { id: "marker_lamp", name: "Side Marker Lamp", section: "accessories", type: "radio", options: ["Yes", "No"], defaultValue: "Yes" },
      { id: "supd_rupd", name: "SUPD/RUPD", section: "accessories", type: "radio", options: ["Yes", "No"], defaultValue: "Yes" },
      { id: "diesel_guard", name: "Diesel Tank Guard", section: "accessories", type: "radio", options: ["Yes", "No"], defaultValue: "Yes" },
      { id: "foot_rest", name: "Foot Rest on Front Bumper", section: "accessories", type: "radio", options: ["Yes", "No"], defaultValue: "Yes" },
      { id: "cabin_carrier", name: "Cabin Carrier", section: "accessories", type: "radio", options: ["Yes", "No"], defaultValue: "Yes" }
    ]
  },
  rigid30: {
    name: "30 Feet Rigid Load Body",
    basePrice: 420000,
    dimensions: { length: "30 Feet", height: "4.0 Feet", width: "98 Inches" },
    specs: [
      { id: "floor", name: "Floor sheet", section: "material", type: "dropdown", options: ["5mm (St52)", "6mm (St52)", "3mm Chequered", "Custom"], defaultValue: "5mm (St52)", priceDiffs: { "5mm (St52)": 0, "6mm (St52)": 25000, "3mm Chequered": -15000, "Custom": 30000 } },
      { id: "side_board", name: "Side board sheet", section: "material", type: "dropdown", options: ["3mm (St52)", "4mm (St52)", "Custom"], defaultValue: "3mm (St52)", priceDiffs: { "3mm (St52)": 0, "4mm (St52)": 18000, "Custom": 25000 } },
      { id: "headboard", name: "Head board sheet", section: "material", type: "dropdown", options: ["3mm (St52)", "4mm (St52)", "Custom"], defaultValue: "3mm (St52)", priceDiffs: { "3mm (St52)": 0, "4mm (St52)": 15000, "Custom": 20000 } },
      { id: "taildoor", name: "Tail door sheet", section: "material", type: "dropdown", options: ["3mm (St52)", "4mm (St52)", "Custom"], defaultValue: "3mm (St52)", priceDiffs: { "3mm (St52)": 0, "4mm (St52)": 15000, "Custom": 20000 } },
      { id: "runner", name: "Runner", section: "chassis", type: "dropdown", options: ["ISMC 200 SAIL make", "ISMC 175", "Custom"], defaultValue: "ISMC 200 SAIL make", priceDiffs: { "ISMC 200 SAIL make": 0, "ISMC 175": -10000, "Custom": 15000 } },
      { id: "cross_members", name: "Side Board Cross members", section: "chassis", type: "text", defaultValue: "12 nos Formed Section Nexfra Standard with Horizontal Stiffener at Center" },
      { id: "floor_cross", name: "Floor Cross member", section: "chassis", type: "text", defaultValue: "Nexfra Standard" },
      { id: "painting", name: "Painting", section: "painting", type: "dropdown", options: ["Epoxy primer and PU top coat Nippon paint", "Epoxy primer and Epoxy paint", "Custom"], defaultValue: "Epoxy primer and PU top coat Nippon paint", priceDiffs: { "Epoxy primer and PU top coat Nippon paint": 0, "Epoxy primer and Epoxy paint": -10000, "Custom": 15000 } },
      { id: "reflective_tape", name: "Reflective tape", section: "accessories", type: "radio", options: ["Yes", "No"], defaultValue: "Yes" },
      { id: "marker_lamp", name: "Side Marker Lamp", section: "accessories", type: "radio", options: ["Yes", "No"], defaultValue: "Yes" },
      { id: "supd_rupd", name: "SUPD/RUPD", section: "accessories", type: "radio", options: ["Yes", "No"], defaultValue: "Yes" },
      { id: "diesel_guard", name: "Diesel Tank Guard", section: "accessories", type: "radio", options: ["Yes", "No"], defaultValue: "Yes" },
      { id: "foot_rest", name: "Foot Rest on Front Bumper", section: "accessories", type: "radio", options: ["Yes", "No"], defaultValue: "Yes" },
      { id: "cabin_carrier", name: "Cabin Carrier", section: "accessories", type: "radio", options: ["Yes", "No"], defaultValue: "Yes" }
    ]
  }
};

function syncStateCalculations() {
  if (!STATE || !STATE.sales || !STATE.payments || !STATE.customers) return;

  STATE.sales.forEach(sale => {
    const totalPaid = STATE.payments
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

  STATE.customers.forEach(cust => {
    const custSales = STATE.sales.filter(sale => sale.customerName === cust.company);
    let due = 0;
    custSales.forEach(sale => {
      const totalPaid = STATE.payments
        .filter(p => p.invoiceId === sale.invoiceId)
        .reduce((sum, p) => sum + p.amount, 0);
      due += Math.max(0, sale.amount - totalPaid);
    });
    cust.outstanding = due;
  });
}

function loadState() {
  const saved = localStorage.getItem('NEXFRA_ERP_STATE');
  if (saved) {
    try {
      STATE = JSON.parse(saved);
      syncStateCalculations();
      if (!STATE.customItemDefinitions) STATE.customItemDefinitions = [];
      return;
    } catch(e) {
      console.error("State loading error, resetting to defaults", e);
    }
  }
  alert("Database state not found, loading defaults.");
  window.location.href = 'index.html';
}

function saveState() {
  syncStateCalculations();
  localStorage.setItem('NEXFRA_ERP_STATE', JSON.stringify(STATE));
}

function logSystemActivity(message) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  STATE.logs.unshift({ time, message });
  if (STATE.logs.length > 8) STATE.logs.pop();
  saveState();
}

// ------------------------------------------
// 2. LIFECYCLE & ROUTING EVENT HANDLERS
// ------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initSidebarNav();
  initDashboardShortcuts();
  initQuotationBuilder();
  initAccountsModule();
  initAdminModule();
  initLogout();
  initPdfPreviewControls();

  // Read URL query parameter routing
  handleUrlRouting();
});

function handleUrlRouting() {
  const params = new URLSearchParams(window.location.search);
  const targetModule = params.get('module') || 'dashboard';
  const targetProduct = params.get('product');

  switchModule(targetModule);

  if (targetModule === 'quotations') {
    startNewQuotationWizard();
    if (targetProduct) {
      // Map product keys
      let mappedCat = 'trailer';
      let mappedSub = 'flatbed';
      if (targetProduct.includes('tiptrailer')) { mappedCat = 'trailer'; mappedSub = 'tiptrailer'; }
      else if (targetProduct.includes('boxbody')) { mappedCat = 'tipper'; mappedSub = 'boxbody'; }
      else if (targetProduct.includes('rockbody')) { mappedCat = 'tipper'; mappedSub = 'rockbody'; }
      
      selectProductCategory(mappedCat);
      selectProductSubtype(mappedSub);
      if (mappedCat === 'tipper') {
        selectChassisCapacity('25 CBM');
      }
      advanceWizardStep(4);
    }
  }
}

function initSidebarNav() {
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const mod = e.currentTarget.getAttribute('data-module');
      switchModule(mod);
    });
  });
}

function switchModule(moduleName) {
  const links = document.querySelectorAll('.sidebar-link');
  const views = document.querySelectorAll('.module-view');

  links.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-module') === moduleName) {
      link.classList.add('active');
    }
  });

  views.forEach(v => v.classList.remove('active'));

  const activeView = document.getElementById(`view-${moduleName}`);
  if (activeView) {
    activeView.classList.add('active');
    
    // Smooth GSAP staggered viewport load
    gsap.fromTo(activeView.children, { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.3 });

    // Refresh modules
    if (moduleName === 'dashboard') renderDashboardOverview();
    if (moduleName === 'sales') renderSalesHistoryTable();
    if (moduleName === 'workorders') renderWorkOrders();
    if (moduleName === 'status') renderProductionBoard();
    if (moduleName === 'accounts') renderAccountsLedger();
    if (moduleName === 'customers') renderCustomersDirectory();
    if (moduleName === 'admin') renderAdminSettings();
    if (moduleName === 'quotations') startNewQuotationWizard();
  }
}

function initDashboardShortcuts() {
  document.getElementById('quick-jump-production').addEventListener('click', (e) => {
    e.preventDefault();
    switchModule('status');
  });
  document.getElementById('dash-btn-new-quote').addEventListener('click', () => switchModule('quotations'));
  document.getElementById('dash-btn-payments').addEventListener('click', () => switchModule('accounts'));
  document.getElementById('dash-btn-templates').addEventListener('click', () => switchModule('admin'));
}

function initLogout() {
  document.getElementById('portal-logout-btn').addEventListener('click', () => {
    localStorage.removeItem('adminLoggedIn');
    alert("Signed out from Control Panel.");
    window.location.href = 'index.html';
  });
}

// ------------------------------------------
// 3. MODULE RENDERERS
// ------------------------------------------

function renderDashboardOverview() {
  loadState();
  
  const activeWOCount = STATE.workOrders.filter(w => w.stage !== 'Delivered' && w.stage !== 'Ready').length;
  const pendingQuotesCount = STATE.quotations.filter(q => q.status === 'Draft').length;
  
  let outstandingBalance = 0;
  STATE.customers.forEach(c => outstandingBalance += c.outstanding);

  document.getElementById('kpi-active-wo').innerText = activeWOCount;
  document.getElementById('kpi-pending-quotes').innerText = pendingQuotesCount;
  document.getElementById('kpi-receivable').innerText = `₹${(outstandingBalance/100000).toFixed(1)}L`;

  const logListContainer = document.getElementById('system-log-list');
  logListContainer.innerHTML = STATE.logs.map(log => `
    <li><span class="log-time">${log.time}</span> ${log.message}</li>
  `).join('');

  const dashWOSummary = document.getElementById('dash-wo-summary');
  const activeWOs = STATE.workOrders.filter(w => w.stage !== 'Delivered');
  
  if (activeWOs.length === 0) {
    dashWOSummary.innerHTML = '<p class="section-hint text-center py-lg">No active chassis in production pipeline.</p>';
  } else {
    dashWOSummary.innerHTML = activeWOs.map(wo => {
      const stageIdx = STAGES.indexOf(wo.stage);
      const progressPercent = Math.round((stageIdx / (STAGES.length - 1)) * 100);
      
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
    }).join('');
  }
}

function renderSalesHistoryTable() {
  loadState();
  const tbody = document.querySelector('#sales-table tbody');
  const searchInput = document.getElementById('sales-search-input');
  const filterProduct = document.getElementById('sales-filter-product');

  const render = () => {
    const query = searchInput.value.toLowerCase();
    const prodFilter = filterProduct.value;

    const filteredSales = STATE.sales.filter(sale => {
      const matchQuery = sale.invoiceId.toLowerCase().includes(query) || 
                         sale.customerName.toLowerCase().includes(query) ||
                         sale.product.toLowerCase().includes(query);
      const matchProd = prodFilter === 'all' || sale.product.includes(prodFilter);
      return matchQuery && matchProd;
    });

    tbody.innerHTML = filteredSales.map(sale => {
      const matchingQuote = STATE.quotations.find(q => {
        const cust = STATE.customers.find(c => c.id === q.customerId);
        return cust && cust.company === sale.customerName && sale.product.includes(q.productName);
      });
      const quoteIdParam = matchingQuote ? matchingQuote.id : 'QT-2026-001';

      return `
        <tr>
          <td style="font-family:var(--font-headings);font-weight:700">${sale.invoiceId}</td>
          <td>${sale.customerName}</td>
          <td>${sale.product}</td>
          <td>${sale.date}</td>
          <td style="font-family:var(--font-headings);font-weight:600">₹${sale.amount.toLocaleString('en-IN')}</td>
          <td>
            <span class="tbl-status-badge status-${sale.status.toLowerCase()}">${sale.status}</span>
          </td>
          <td>
            <button class="btn btn-outline btn-xs" onclick="openPdfPreview('${quoteIdParam}')">Invoice PDF</button>
          </td>
        </tr>
      `;
    }).join('');
  };

  searchInput.oninput = render;
  filterProduct.onchange = render;
  render();
}

// ------------------------------------------
// 4. DYNAMIC CONFIGURATOR WIZARD ENGINE
// ------------------------------------------

function initQuotationBuilder() {
  // Bind inputs auto-save visual feedback
  const autoSaveInputs = [
    'w-cust-name', 'w-cust-company', 'w-cust-gst', 'w-cust-phone',
    'w-cust-email', 'w-cust-salesperson', 'w-cust-model', 'w-cust-chassis',
    'w-cust-qty', 'w-cust-address', 'w-cust-date'
  ];
  
  autoSaveInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        simulateDraftAutoSave();
      });
    }
  });
}

function startNewQuotationWizard() {
  wizardState = {
    currentStep: 1,
    customer: {},
    category: '',
    subtype: '',
    capacity: '',
    specs: {},
    status: 'Draft',
    total: 0
  };

  // Reset inputs
  document.getElementById('w-cust-name').value = '';
  document.getElementById('w-cust-company').value = '';
  document.getElementById('w-cust-gst').value = '';
  document.getElementById('w-cust-phone').value = '';
  document.getElementById('w-cust-email').value = '';
  document.getElementById('w-cust-salesperson').value = 'Prashanth kumar M P';
  document.getElementById('w-cust-model').value = '';
  document.getElementById('w-cust-chassis').value = '';
  document.getElementById('w-cust-qty').value = '1';
  document.getElementById('w-cust-address').value = '';
  document.getElementById('w-cust-date').value = new Date().toISOString().split('T')[0];

  // Reset categories
  document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('btn-cat-next').disabled = true;

  // Reset subtypes
  document.querySelectorAll('.subtype-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('btn-sub-next').disabled = true;
  document.getElementById('capacity-selector-container').style.display = 'none';
  document.querySelectorAll('.capacity-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('capacity-custom-input-wrap').style.display = 'none';
  document.getElementById('w-custom-capacity-val').value = '';

  jumpToWizardStep(1);
}

function simulateDraftAutoSave() {
  const ind = document.getElementById('quote-autosave-ind');
  if (ind) {
    ind.style.opacity = '1';
    gsap.fromTo(ind, { scale: 0.95 }, { scale: 1, duration: 0.2 });
    setTimeout(() => {
      gsap.to(ind, { opacity: 0.6, duration: 0.4 });
    }, 1000);
  }
}

window.jumpToWizardStep = function(stepNum) {
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
  document.querySelectorAll('.wizard-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  // Show active panel
  const activePanel = document.getElementById(`wizard-step-${stepNum}-panel`);
  if (activePanel) {
    activePanel.classList.add('active');
  }

  // Update progress tracker nodes
  document.querySelectorAll('.wizard-step-node').forEach(node => {
    const s = parseInt(node.getAttribute('data-step'), 10);
    node.classList.remove('active', 'completed');
    if (s === stepNum) {
      node.classList.add('active');
    } else if (s < stepNum) {
      node.classList.add('completed');
    }
  });

  // Fill progress line width
  const progressFill = document.getElementById('wizard-progress-fill');
  if (progressFill) {
    const widthPercentage = ((stepNum - 1) / 4) * 100;
    progressFill.style.width = `${widthPercentage}%`;
  }

  wizardState.currentStep = stepNum;

  // Render custom section controls and list when entering configurator
  if (stepNum === 4) {
    renderCustomSectionsList();
    // Ensure custom item controls are rendered in the configurator
    const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
    if (template) {
      renderCustomItemSpecControls();
    }
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
    const name = document.getElementById('w-cust-name').value.trim();
    const phone = document.getElementById('w-cust-phone').value.trim();

    if (!name) {
      alert("Customer Name is compulsory. Please enter the Customer Name to continue.");
      document.getElementById('w-cust-name').focus();
      return false;
    }

    if (!phone) {
      alert("Phone Number is compulsory. Please enter the Phone Number to continue.");
      document.getElementById('w-cust-phone').focus();
      return false;
    }

    const company = document.getElementById('w-cust-company').value.trim() || name;
    const gst = document.getElementById('w-cust-gst').value.trim() || 'URP';
    const email = document.getElementById('w-cust-email').value.trim() || 'customer@nexfra.in';
    const model = document.getElementById('w-cust-model').value.trim() || 'Commercial Vehicle';
    const address = document.getElementById('w-cust-address').value.trim() || 'Hosur, TN, India';

    // Save step 1 to state
    wizardState.customer = {
      name,
      company,
      gst,
      phone,
      email,
      address,
      salesperson: document.getElementById('w-cust-salesperson').value.trim() || 'Prashanth kumar M P',
      model,
      chassis: document.getElementById('w-cust-chassis').value.trim() || 'NA-CHASSIS',
      qty: parseInt(document.getElementById('w-cust-qty').value, 10) || 1,
      date: document.getElementById('w-cust-date').value || new Date().toISOString().split('T')[0]
    };
  }
  return true;
}

window.advanceWizardStep = function(targetStep) {
  if (targetStep > wizardState.currentStep) {
    if (!validateStepInputs(wizardState.currentStep)) return;
  }
  jumpToWizardStep(targetStep);
};

// Step 2 Category select
window.selectProductCategory = function(catKey) {
  wizardState.category = catKey;
  
  document.querySelectorAll('.category-card').forEach(card => {
    card.classList.remove('selected');
  });
  document.getElementById(`cat-card-${catKey}`).classList.add('selected');
  document.getElementById('btn-cat-next').disabled = false;

  // Toggle dynamic sub-panels
  document.querySelectorAll('.subtype-grid-group').forEach(grid => {
    grid.style.display = 'none';
  });
  document.getElementById(`subtypes-${catKey}-container`).style.display = 'grid';

  simulateDraftAutoSave();
};

// Step 3 Subtype select
window.selectProductSubtype = function(subtypeKey) {
  wizardState.subtype = subtypeKey;
  
  document.querySelectorAll('.subtype-card').forEach(card => {
    card.classList.remove('selected');
  });
  document.getElementById(`sub-card-${subtypeKey}`).classList.add('selected');

  const capacitySelector = document.getElementById('capacity-selector-container');
  if (subtypeKey === 'boxbody' || subtypeKey === 'rockbody') {
    capacitySelector.style.display = 'block';
    // Clear capacity until clicked
    wizardState.capacity = '';
    document.querySelectorAll('.capacity-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('btn-sub-next').disabled = true;
  } else {
    capacitySelector.style.display = 'none';
    wizardState.capacity = 'NA';
    document.getElementById('btn-sub-next').disabled = false;
    loadDefaultSpecsForSubtype(subtypeKey);
  }

  simulateDraftAutoSave();
};

// Step 3.5 capacity select
window.selectChassisCapacity = function(capValue) {
  wizardState.capacity = capValue;
  
  document.querySelectorAll('.capacity-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  if (capValue === 'Custom') {
    document.getElementById('cap-btn-custom').classList.add('selected');
    document.getElementById('capacity-custom-input-wrap').style.display = 'block';
    document.getElementById('btn-sub-next').disabled = true; // Wait for custom input value
  } else {
    document.getElementById(`cap-btn-${capValue.split(' ')[0]}`).classList.add('selected');
    document.getElementById('capacity-custom-input-wrap').style.display = 'none';
    document.getElementById('btn-sub-next').disabled = false;
    loadDefaultSpecsForSubtype(wizardState.subtype);
  }

  simulateDraftAutoSave();
};

window.updateCustomCapacityValue = function() {
  const customVal = document.getElementById('w-custom-capacity-val').value;
  if (customVal.trim().length > 0) {
    wizardState.capacity = `${customVal} CBM (Custom)`;
    document.getElementById('btn-sub-next').disabled = false;
    loadDefaultSpecsForSubtype(wizardState.subtype);
  } else {
    document.getElementById('btn-sub-next').disabled = true;
  }
};

// Step 4 Load Default specs
function loadDefaultSpecsForSubtype(subtypeKey) {
  const template = WIZARD_PRODUCT_TEMPLATES[subtypeKey];
  if (!template) return;

  // Initialize specs with defaults (built-in)
  wizardState.specs = {};
  wizardState.notRequired = {};
  template.specs.forEach(spec => {
    wizardState.specs[spec.id] = spec.defaultValue;
  });

  // Initialize custom item specs with defaults
  const customSections = getCustomItemSpecs();
  customSections.forEach(section => {
    section.fields.forEach(field => {
      if (field.defaultValue) {
        wizardState.specs[field.id] = field.defaultValue;
      }
    });
  });

  // Inject Form Controls into sections
  renderConfiguratorFormInputs(template);
  renderCustomSectionsList();
  calculateWizardPricing();
}

function getEffectiveSpecPriceDiff(spec, opt) {
  if (!spec || !opt) return 0;

  const customOpts = getCustomFieldOptions(spec.id);
  if (customOpts.length > 0) {
    const match = customOpts.find(c => c.name === opt);
    if (match) return match.priceDiff;
  }

  let diff = (spec.priceDiffs && spec.priceDiffs[opt] !== undefined) ? spec.priceDiffs[opt] : 0;

  if (spec.id === 'floor' && opt.includes('6mm') && STATE.adminPricing && STATE.adminPricing.floor6 !== undefined) diff = STATE.adminPricing.floor6;
  if (spec.id === 'floor' && opt.includes('10mm') && STATE.adminPricing && STATE.adminPricing.floor10 !== undefined) diff = STATE.adminPricing.floor10;
  if (spec.id === 'beam' && opt.includes('Hardox') && STATE.adminPricing && STATE.adminPricing.steelHardox !== undefined) diff = STATE.adminPricing.steelHardox;
  if (spec.id === 'axles' && opt.includes('2x13T') && STATE.adminPricing && STATE.adminPricing.axle2 !== undefined) diff = STATE.adminPricing.axle2;
  if (spec.id === 'axles' && opt.includes('3x16T') && STATE.adminPricing && STATE.adminPricing.axle3_16 !== undefined) diff = STATE.adminPricing.axle3_16;

  return diff;
}

function renderConfiguratorFormInputs(template) {
  const sections = ['material', 'chassis', 'hydraulic', 'painting', 'accessories', 'dimensions'];
  
  sections.forEach(secId => {
    const container = document.getElementById(`specs-${secId}-controls-inject`);
    if (!container) return;

    // Filter specs for this section
    const secSpecs = template.specs.filter(s => s.section === secId);
    
    if (secSpecs.length === 0) {
      container.innerHTML = '<span class="section-hint col-span-2" style="font-size:0.8rem; color:#64748B; padding:8px 0; display:block;">No extra modifications needed for this module.</span>';
      return;
    }

    container.innerHTML = secSpecs.map(spec => {
      const isNr = !!wizardState.notRequired[spec.id];
      const nrBadgeHtml = `<span class="nr-badge${isNr ? ' active' : ''}" id="nr-badge-${spec.id}" onclick="toggleFieldRequired('${spec.id}')">${isNr ? 'Not Required' : 'Required'}</span>`;
      let controlHtml = '';

      const rawOpts = (spec.options && Array.isArray(spec.options) && spec.options.length > 0)
        ? spec.options 
        : (spec.priceDiffs && Object.keys(spec.priceDiffs).length > 0)
          ? Object.keys(spec.priceDiffs)
          : ['Standard', 'Custom'];

      const hasCustom = rawOpts.some(o => typeof o === 'string' && o.toLowerCase() === 'custom');
      const customOpts = getCustomFieldOptions(spec.id);
      const curCustomDesc = wizardState.specs[spec.id + '_custom_desc'] || '';
      const curCustomPrice = wizardState.specs[spec.id + '_custom_price'] || '';
      const customDetailsHtml = hasCustom ? `
        <div id="custom-details-${spec.id}" class="custom-details-wrap" style="display:${wizardState.specs[spec.id] === 'Custom' ? 'flex' : 'none'}; gap:8px; margin-top:8px;">
          <input type="text" id="w-spec-${spec.id}-custom-desc" class="form-control form-control-sm" placeholder="Describe the custom specification..." value="${curCustomDesc}" style="flex:1;" oninput="updateSpecCustomDesc('${spec.id}', this.value)">
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <span style="font-size:0.75rem;color:var(--color-text-muted);">₹</span>
            <input type="number" id="w-spec-${spec.id}-custom-price" class="form-control form-control-sm" placeholder="Price" value="${curCustomPrice}" style="width:100px;text-align:right;font-weight:700;" oninput="updateSpecCustomPrice('${spec.id}', this.value)">
          </div>
          <button type="button" onclick="addCustomFieldOption('${spec.id}', '${spec.name}')" style="flex-shrink:0;padding:4px 14px;font-size:0.7rem;font-weight:700;border-radius:4px;border:none;background:#059669;color:white;cursor:pointer;">
            + Add Option
          </button>
        </div>
      ` : '';

      const allOpts = [
        ...rawOpts.filter(o => typeof o === 'string' && o.toLowerCase() !== 'custom'),
        ...customOpts.map(c => c.name)
      ];
      const selectedVal = wizardState.specs[spec.id] !== undefined ? wizardState.specs[spec.id] : spec.defaultValue;
      if (wizardState.specs[spec.id] === undefined) {
        wizardState.specs[spec.id] = selectedVal;
      }

      if (spec.type === 'dropdown') {
        controlHtml = `
          <select id="w-spec-${spec.id}" class="form-control" onchange="onSpecChange('${spec.id}', this.value)" ${isNr ? 'disabled' : ''} style="width:100%; font-weight:600; min-height:42px; padding:8px 12px; line-height:1.4; box-sizing:border-box;">
            ${allOpts.map(opt => {
              const diff = getEffectiveSpecPriceDiff(spec, opt);
              return `<option value="${opt}" ${opt === selectedVal ? 'selected' : ''}>
                ${opt} ${diff !== 0 ? `(${diff > 0 ? '+' : ''}₹${diff.toLocaleString('en-IN')})` : diff === 0 ? '' : '(Included)'}
              </option>`;
            }).join('')}
            ${hasCustom ? `<option value="Custom" ${selectedVal === 'Custom' ? 'selected' : ''}>Custom</option>` : ''}
          </select>
          ${customDetailsHtml}
        `;
      } else if (spec.type === 'radio') {
        controlHtml = `
          <div class="radio-group" style="display:flex; flex-wrap:wrap; gap:10px; margin-top:6px;">
            ${allOpts.map((opt, i) => {
              const diff = getEffectiveSpecPriceDiff(spec, opt);
              return `
                <label class="radio-label" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:0.825rem; font-weight:600; color:#334155; background:#F8FAFC; padding:6px 12px; border-radius:6px; border:1px solid #CBD5E1;">
                  <input type="radio" name="w-spec-radio-${spec.id}" value="${opt}" ${opt === selectedVal ? 'checked' : ''} onchange="onSpecChange('${spec.id}', this.value)" ${isNr ? 'disabled' : ''}>
                  ${opt} ${diff !== 0 ? `<span style="font-size:0.75rem; color:#64748B;">(${diff > 0 ? '+' : ''}₹${diff.toLocaleString('en-IN')})</span>` : ''}
                </label>
              `;
            }).join('')}
            ${hasCustom ? `
              <label class="radio-label" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:0.825rem; font-weight:600; color:#334155; background:#F8FAFC; padding:6px 12px; border-radius:6px; border:1px solid #CBD5E1;">
                <input type="radio" name="w-spec-radio-${spec.id}" value="Custom" ${selectedVal === 'Custom' ? 'checked' : ''} onchange="onSpecChange('${spec.id}', this.value)" ${isNr ? 'disabled' : ''}>
                Custom
              </label>
            ` : ''}
          </div>
          ${customDetailsHtml}
        `;
      } else if (spec.type === 'checkbox') {
        const checkboxOpts = (allOpts && allOpts.length > 0) ? allOpts : ["Yes", "No"];
        controlHtml = `
          <div class="checkbox-group" style="display:flex; flex-wrap:wrap; gap:10px; margin-top:6px;">
            ${checkboxOpts.map(opt => {
              const isChecked = selectedVal === opt;
              const pd = getEffectiveSpecPriceDiff(spec, opt);
              return `
                <label class="checkbox-label" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:0.825rem; font-weight:600; color:#334155; background:#F8FAFC; padding:6px 12px; border-radius:6px; border:1px solid #CBD5E1;">
                  <input type="radio" name="w-spec-radio-${spec.id}" value="${opt}" ${isChecked ? 'checked' : ''} onchange="onSpecChange('${spec.id}', this.value)" ${isNr ? 'disabled' : ''}>
                  ${opt} ${pd !== 0 ? `<span style="font-size:0.75rem; color:#64748B;">(${pd > 0 ? '+' : ''}₹${pd.toLocaleString('en-IN')})</span>` : ''}
                </label>
              `;
            }).join('')}
          </div>
        `;
      } else if (spec.type === 'text') {
        controlHtml = `
          <input type="text" id="w-spec-${spec.id}" class="form-control" value="${selectedVal}" placeholder="e.g. Golden Green, Nippon PU Paint" oninput="updateSpecValueState('${spec.id}', this.value)" ${isNr ? 'disabled' : ''} style="width:100%; font-weight:600; min-height:42px; padding:8px 12px; line-height:1.4; box-sizing:border-box; margin-top:4px;">
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
    }).join('');
  });

  // Render Dimensions section (Length, Height, Width) with Numeric Inputs & Unit Dropdowns
  const dimsContainer = document.getElementById('specs-dimensions-controls-inject');
  if (dimsContainer && template.dimensions) {
    const parseDim = (dimStr, defaultUnit) => {
      if (!dimStr || dimStr.toUpperCase() === 'NA') return { num: 'NA', unit: 'NA' };
      const match = String(dimStr).trim().match(/^([\d.]+)\s*(.*)$/);
      if (match) {
        return { num: match[1], unit: match[2] || defaultUnit };
      }
      return { num: dimStr, unit: defaultUnit };
    };

    const lenObj = parseDim(template.dimensions.length, 'Feet');
    const hgtObj = parseDim(template.dimensions.height, 'Feet');
    const wdtObj = parseDim(template.dimensions.width, 'Inches');

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
                <option value="Feet" ${lenObj.unit.includes('Feet') ? 'selected' : ''}>Feet</option>
                <option value="Meters" ${lenObj.unit.includes('Meter') ? 'selected' : ''}>Meters</option>
                <option value="Inches" ${lenObj.unit.includes('Inch') ? 'selected' : ''}>Inches</option>
                <option value="mm" ${lenObj.unit.includes('mm') ? 'selected' : ''}>mm</option>
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
                <option value="Feet" ${hgtObj.unit.includes('Feet') ? 'selected' : ''}>Feet</option>
                <option value="Inches" ${hgtObj.unit.includes('Inch') ? 'selected' : ''}>Inches</option>
                <option value="Meters" ${hgtObj.unit.includes('Meter') ? 'selected' : ''}>Meters</option>
                <option value="NA" ${hgtObj.num === 'NA' || hgtObj.unit === 'NA' ? 'selected' : ''}>NA</option>
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
                <option value="Inches" ${wdtObj.unit.includes('Inch') ? 'selected' : ''}>Inches</option>
                <option value="Feet" ${wdtObj.unit.includes('Feet') ? 'selected' : ''}>Feet</option>
                <option value="mm" ${wdtObj.unit.includes('mm') ? 'selected' : ''}>mm</option>
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

window.updateDimFullValue = function(dimType) {
  const numInp = document.getElementById(`w-dim-${dimType}-num`);
  const unitSelect = document.getElementById(`w-dim-${dimType}-unit`);
  const hiddenInp = document.getElementById(`w-dim-${dimType}`);

  if (!hiddenInp) return;

  const num = numInp ? numInp.value.trim() : '';
  const unit = unitSelect ? unitSelect.value : '';

  if (!num || num.toUpperCase() === 'NA' || unit === 'NA') {
    hiddenInp.value = 'NA';
    if (numInp) numInp.value = 'NA';
    if (unitSelect) unitSelect.value = 'NA';
  } else {
    hiddenInp.value = `${num} ${unit}`;
  }

  simulateDraftAutoSave();
};

window.setDimPreset = function(dimType, numVal, unitVal) {
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
  let customContainer = document.getElementById('specs-custom-controls-inject');
  if (!customContainer) {
    // Create a container right after the dimensions section
    const dimsSec = document.getElementById('spec-sec-dimensions');
    if (dimsSec) {
      const containerDiv = document.createElement('div');
      containerDiv.id = 'specs-custom-controls-inject';
      dimsSec.parentNode.insertBefore(containerDiv, dimsSec.nextSibling);
    }
    customContainer = document.getElementById('specs-custom-controls-inject');
  }
  if (!customContainer) return;

  if (!customSections || customSections.length === 0) {
    customContainer.innerHTML = '';
    return;
  }

  customContainer.innerHTML = customSections.map((section, secIdx) => {
    const secId = `spec-sec-custom-${section.id}`;

    const fieldsHtml = section.fields.map(field => {
      const selectedVal = wizardState.specs[field.id] || field.defaultValue || '';
      if (wizardState.specs[field.id] === undefined && field.defaultValue) {
        wizardState.specs[field.id] = field.defaultValue;
      }
      const isNr = !!wizardState.notRequired[field.id];
      const nrBadgeHtml = `<span class="nr-badge${isNr ? ' active' : ''}" id="nr-badge-${field.id}" onclick="toggleFieldRequired('${field.id}')">${isNr ? 'Not Required' : 'Required'}</span>`;
      let controlHtml = '';

      const hasCustom = field.options && field.options.some(o => o.toLowerCase() === 'custom');
      const customOpts = getCustomFieldOptions(field.id);
      const curCustomDesc = wizardState.specs[field.id + '_custom_desc'] || '';
      const curCustomPrice = wizardState.specs[field.id + '_custom_price'] || '';
      const customDetailsHtml = hasCustom ? `
        <div id="custom-details-${field.id}" class="custom-details-wrap" style="display:${wizardState.specs[field.id] === 'Custom' ? 'flex' : 'none'}; gap:8px; margin-top:8px;">
          <input type="text" id="w-spec-${field.id}-custom-desc" class="form-control form-control-sm" placeholder="Describe the custom specification..." value="${curCustomDesc}" style="flex:1;" oninput="updateSpecCustomDesc('${field.id}', this.value)">
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <span style="font-size:0.75rem;color:var(--color-text-muted);">₹</span>
            <input type="number" id="w-spec-${field.id}-custom-price" class="form-control form-control-sm" placeholder="Price" value="${curCustomPrice}" style="width:100px;text-align:right;font-weight:700;" oninput="updateSpecCustomPrice('${field.id}', this.value)">
          </div>
          <button type="button" onclick="addCustomFieldOption('${field.id}', '${field.name}')" style="flex-shrink:0;padding:4px 14px;font-size:0.7rem;font-weight:700;border-radius:4px;border:none;background:#059669;color:white;cursor:pointer;">
            + Add Option
          </button>
        </div>
      ` : '';

      const allOpts = [
        ...(field.options || []).filter(o => o.toLowerCase() !== 'custom'),
        ...customOpts.map(c => c.name)
      ];

      if (field.type === 'dropdown') {
        controlHtml = `
          <select id="w-spec-${field.id}" class="form-control" onchange="onSpecChange('${field.id}', this.value)" ${isNr ? 'disabled' : ''}>
            ${allOpts.map(opt => {
              const diff = (field.priceDiffs && field.priceDiffs[opt] !== undefined) ? field.priceDiffs[opt] : (getCustomOptPriceDiff(field.id, opt) || 0);
              return `<option value="${opt}" ${opt === selectedVal ? 'selected' : ''}>
                ${opt} ${diff !== 0 ? `(${diff > 0 ? '+' : ''}₹${diff.toLocaleString('en-IN')})` : ''}
              </option>`;
            }).join('')}
            ${hasCustom ? `<option value="Custom" ${selectedVal === 'Custom' ? 'selected' : ''}>Custom</option>` : ''}
          </select>
          ${customDetailsHtml}
        `;
      } else if (field.type === 'radio') {
        controlHtml = `
          <div class="radio-group">
            ${allOpts.map((opt, i) => {
              const diff = (field.priceDiffs && field.priceDiffs[opt] !== undefined) ? field.priceDiffs[opt] : (getCustomOptPriceDiff(field.id, opt) || 0);
              return `
                <label class="radio-label">
                  <input type="radio" name="w-spec-radio-${field.id}" value="${opt}" ${opt === selectedVal ? 'checked' : ''} onchange="onSpecChange('${field.id}', this.value)" ${isNr ? 'disabled' : ''}>
                  ${opt} ${diff !== 0 ? `<span style="font-size:0.75rem;color:var(--color-text-muted);">(${diff > 0 ? '+' : ''}₹${diff.toLocaleString('en-IN')})</span>` : ''}
                </label>
              `;
            }).join('')}
            ${hasCustom ? `
              <label class="radio-label">
                <input type="radio" name="w-spec-radio-${field.id}" value="Custom" ${selectedVal === 'Custom' ? 'checked' : ''} onchange="onSpecChange('${field.id}', this.value)" ${isNr ? 'disabled' : ''}>
                Custom
              </label>
            ` : ''}
          </div>
          ${customDetailsHtml}
        `;
      } else if (field.type === 'number') {
        controlHtml = `
          <input type="number" id="w-spec-${field.id}" class="form-control" value="${selectedVal}" oninput="updateSpecValueState('${field.id}', this.value)" ${isNr ? 'disabled' : ''}>
        `;
      } else {
        // text type (default)
        controlHtml = `
          <input type="text" id="w-spec-${field.id}" class="form-control" value="${selectedVal}" oninput="updateSpecValueState('${field.id}', this.value)" ${isNr ? 'disabled' : ''}>
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
    }).join('');

    if (!fieldsHtml) return '';

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
  }).filter(Boolean).join('');
}

window.toggleCollapseSection = function(secId) {
  const el = document.getElementById(secId);
  if (el) {
    el.classList.toggle('collapsed');
  }
};

window.updateSpecValueState = function(specId, val) {
  wizardState.specs[specId] = val;
  calculateWizardPricing();
  simulateDraftAutoSave();
};

window.onSpecChange = function(specId, val) {
  updateSpecValueState(specId, val);
  const details = document.getElementById(`custom-details-${specId}`);
  if (details) {
    details.style.display = val === 'Custom' ? 'flex' : 'none';
  }
};

window.updateSpecCustomDesc = function(specId, val) {
  wizardState.specs[specId + '_custom_desc'] = val;
  calculateWizardPricing();
  simulateDraftAutoSave();
};

window.updateSpecCustomPrice = function(specId, val) {
  wizardState.specs[specId + '_custom_price'] = parseFloat(val) || 0;
  calculateWizardPricing();
  simulateDraftAutoSave();
};

function getCustomOptPriceDiff(specId, optName) {
  const opts = getCustomFieldOptions(specId);
  if (!opts) return 0;
  const match = opts.find(c => c.name === optName);
  return match ? match.priceDiff : 0;
}

function getCustomFieldKey(specId) {
  return (wizardState.subtype || 'default') + '_' + specId;
}

function getCustomFieldOptions(specId) {
  return STATE.adminPricing?.customFieldOptions?.[getCustomFieldKey(specId)] || [];
}

window.addCustomFieldOption = function(specId, specName) {
  loadState();
  if (!STATE.adminPricing) STATE.adminPricing = {};
  if (!STATE.adminPricing.customFieldOptions) STATE.adminPricing.customFieldOptions = {};
  const key = getCustomFieldKey(specId);
  if (!STATE.adminPricing.customFieldOptions[key]) STATE.adminPricing.customFieldOptions[key] = [];

  const desc = document.getElementById(`w-spec-${specId}-custom-desc`)?.value?.trim();
  const price = parseFloat(document.getElementById(`w-spec-${specId}-custom-price`)?.value) || 0;

  if (!desc) { alert('Please enter a description for the custom option.'); return; }

  const existing = STATE.adminPricing.customFieldOptions[key].find(c => c.name === desc);
  if (existing) {
    existing.priceDiff = price;
  } else {
    STATE.adminPricing.customFieldOptions[key].push({ name: desc, priceDiff: price });
  }

  document.getElementById(`w-spec-${specId}-custom-desc`).value = '';
  document.getElementById(`w-spec-${specId}-custom-price`).value = '';
  wizardState.specs[specId] = desc;
  delete wizardState.specs[specId + '_custom_desc'];
  delete wizardState.specs[specId + '_custom_price'];

  saveState();
  renderConfiguratorFormInputs(WIZARD_PRODUCT_TEMPLATES[wizardState.subtype]);
  calculateWizardPricing();
  simulateDraftAutoSave();
};

window.deleteCustomFieldOption = function(specId, optName) {
  if (!confirm(`Delete custom option "${optName}"?`)) return;
  loadState();
  const key = getCustomFieldKey(specId);
  const opts = STATE.adminPricing?.customFieldOptions?.[key];
  if (!opts) return;
  const idx = opts.findIndex(c => c.name === optName);
  if (idx !== -1) {
    opts.splice(idx, 1);
    if (wizardState.specs[specId] === optName) {
      wizardState.specs[specId] = '';
    }
    saveState();
    renderConfiguratorFormInputs(WIZARD_PRODUCT_TEMPLATES[wizardState.subtype]);
    calculateWizardPricing();
    // Refresh whichever modal is open
    if (document.getElementById('custom-items-manager-modal')?.classList.contains('active')) {
      openCustomItemsManagerModal();
    } else {
      window.openPartPricingMatrixModal();
    }
  }
};

window.openCustomItemsManagerModal = function() {
  loadState();
  const allOpts = STATE.adminPricing?.customFieldOptions || {};
  const prefix = getCustomFieldKey('');
  // Only show items for current subtype
  const opts = {};
  Object.keys(allOpts).forEach(k => {
    if (k.startsWith(prefix)) {
      const specId = k.slice(prefix.length);
      opts[specId] = allOpts[k];
    }
  });
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  const container = document.getElementById('custom-items-manager-body');
  if (!container) return;

  const allSpecs = template ? template.specs : [];
  const customSections = getCustomItemSpecs();

  // Build specId → name lookup
  const specNames = {};
  allSpecs.forEach(s => { specNames[s.id] = s.name; });
  customSections.forEach(sec => {
    sec.fields.forEach(f => { specNames[f.id] = `[${sec.name}] ${f.name}`; });
  });

  const keys = Object.keys(opts);
  let totalCount = 0;
  keys.forEach(k => { totalCount += opts[k].length; });

  if (totalCount === 0) {
    container.innerHTML = `
      <div style="padding:40px; text-align:center;">
        <p style="font-size:0.9rem; color:#64748B; margin-bottom:8px;">No custom items have been added yet.</p>
        <p style="font-size:0.75rem; color:#94A3B8;">Select "Custom" in any spec field, fill in a description and price, then click "+ Add Option".</p>
      </div>
    `;
  } else {
    let html = '<div style="display:flex; flex-direction:column; gap:12px;">';
    keys.forEach(specId => {
      const items = opts[specId];
      if (!items || items.length === 0) return;
      const label = specNames[specId] || specId;
      html += `
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; overflow:hidden;">
          <div style="background:#F1F5F9; padding:8px 14px; font-size:0.75rem; font-weight:700; color:#475569; text-transform:uppercase; border-bottom:1px solid #E2E8F0;">${label}</div>
          <div style="padding:8px 14px;">
      `;
      items.forEach(item => {
        html += `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #F1F5F9;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:600; font-size:0.85rem; color:#334155;">${item.name}</span>
              <span style="font-size:0.75rem; font-weight:700; color:#059669;">${item.priceDiff > 0 ? '+' : ''}₹${(item.priceDiff || 0).toLocaleString('en-IN')}</span>
            </div>
            <button type="button" onclick="deleteCustomFieldOption('${specId}', '${item.name}')" style="background:none;border:none;color:#DC2626;cursor:pointer;font-size:0.7rem;font-weight:700;padding:4px 10px;border-radius:4px;">✕ Delete</button>
          </div>
        `;
      });
      html += `</div></div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  document.getElementById('custom-items-manager-modal').classList.add('active');
};

window.closeCustomItemsManagerModal = function() {
  document.getElementById('custom-items-manager-modal').classList.remove('active');
};

window.toggleFieldRequired = function(specId) {
  const wasNotRequired = wizardState.notRequired[specId];
  if (wasNotRequired) {
    delete wizardState.notRequired[specId];
  } else {
    wizardState.notRequired[specId] = true;
  }
  const badge = document.getElementById(`nr-badge-${specId}`);
  const control = document.getElementById(`w-spec-${specId}`);
  if (badge) {
    badge.classList.toggle('active');
    badge.textContent = badge.classList.contains('active') ? 'Not Required' : 'Required';
  }
  if (control) {
    control.disabled = badge.classList.contains('active');
  }
  // For radio groups, disable all inputs
  const radios = document.querySelectorAll(`input[name="w-spec-radio-${specId}"]`);
  radios.forEach(r => r.disabled = badge.classList.contains('active'));
  updateSectionNrBadgeFromFields(specId);
  calculateWizardPricing();
  simulateDraftAutoSave();
};

window.toggleSectionRequired = function(sectionId) {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) return;
  const secName = sectionId.replace('spec-sec-', '');
  const secSpecs = template.specs.filter(s => s.section === secName);
  if (secSpecs.length === 0) return;

  // Determine if all are already not required
  const allNr = secSpecs.every(s => wizardState.notRequired[s.id]);
  const newState = !allNr;

  secSpecs.forEach(spec => {
    if (newState) {
      wizardState.notRequired[spec.id] = true;
    } else {
      delete wizardState.notRequired[spec.id];
    }
    const badge = document.getElementById(`nr-badge-${spec.id}`);
    const control = document.getElementById(`w-spec-${spec.id}`);
    if (badge) {
      badge.classList.toggle('active', newState);
      badge.textContent = newState ? 'Not Required' : 'Required';
    }
    if (control) {
      control.disabled = newState;
    }
    const radios = document.querySelectorAll(`input[name="w-spec-radio-${spec.id}"]`);
    radios.forEach(r => r.disabled = newState);
  });

  // Update the section-level NR badge
  const secBadge = document.getElementById(`nr-badge-sec-${secName}`);
  if (secBadge) {
    secBadge.classList.toggle('active', newState);
    secBadge.textContent = newState ? 'Section Not Required' : 'Section Required';
  }

  // Also toggle custom fields in this section if it's a custom section
  const isCustom = sectionId.startsWith('spec-sec-custom-');
  if (isCustom) {
    const customSections = getCustomItemSpecs();
    const section = customSections.find(s => `spec-sec-custom-${s.id}` === sectionId);
    if (section) {
      section.fields.forEach(field => {
        if (newState) {
          wizardState.notRequired[field.id] = true;
        } else {
          delete wizardState.notRequired[field.id];
        }
        const badge = document.getElementById(`nr-badge-${field.id}`);
        const control = document.getElementById(`w-spec-${field.id}`);
        if (badge) {
          badge.classList.toggle('active', newState);
          badge.textContent = newState ? 'Not Required' : 'Required';
        }
        if (control) {
          control.disabled = newState;
        }
        const radios = document.querySelectorAll(`input[name="w-spec-radio-${field.id}"]`);
        radios.forEach(r => r.disabled = newState);
      });
    }
  }

  calculateWizardPricing();
  simulateDraftAutoSave();
};

function updateSectionNrBadgeFromFields(specId) {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) return;
  const spec = template.specs.find(s => s.id === specId);
  if (!spec) return;
  const secName = spec.section;
  const secSpecs = template.specs.filter(s => s.section === secName);
  if (secSpecs.length === 0) return;
  const allNr = secSpecs.every(s => wizardState.notRequired[s.id]);
  const anyNr = secSpecs.some(s => wizardState.notRequired[s.id]);
  const secBadge = document.getElementById(`nr-badge-sec-${secName}`);
  if (secBadge) {
    secBadge.classList.toggle('active', allNr);
    secBadge.textContent = allNr ? 'Section Not Required' : (anyNr ? 'Mixed' : 'Section Required');
  }
}

// -------------------------------------------------------
// CUSTOM ITEM SECTION MANAGEMENT (Add Item Feature)
// -------------------------------------------------------

// Ensure customItemDefinitions exists
function ensureCustomItemDefinitions() {
  if (!STATE.customItemDefinitions) STATE.customItemDefinitions = [];
}

window.openAddCustomItemSectionModal = function() {
  loadState();
  ensureCustomItemDefinitions();
  document.getElementById('aci-section-name').value = '';
  const container = document.getElementById('aci-fields-container');
  container.innerHTML = '';
  document.getElementById('aci-no-fields-msg').style.display = 'block';
  document.getElementById('add-custom-item-modal').classList.add('active');
};

window.closeAddCustomItemSectionModal = function() {
  document.getElementById('add-custom-item-modal').classList.remove('active');
};

window.addOptionChoiceRow = function(fieldRowId, defaultName = '', defaultPrice = 0, isDefault = false) {
  const table = document.getElementById(`aci-opt-table-${fieldRowId}`);
  if (!table) return;

  const choiceId = `opt-choice-${Date.now()}-${Math.floor(Math.random()*10000)}`;

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
        <input type="radio" name="default-opt-${fieldRowId}" class="aci-opt-is-default" ${isDefault ? 'checked' : ''} style="cursor:pointer;">
      </div>
      <div>
        <button type="button" onclick="removeOptionChoiceRow('${choiceId}')" style="background:none; border:none; color:#EF4444; cursor:pointer; padding:4px;" title="Remove Option">
          <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `;
  table.insertAdjacentHTML('beforeend', html);
};

window.removeOptionChoiceRow = function(choiceId) {
  const row = document.getElementById(choiceId);
  if (row) row.remove();
};

function extractFieldOptionsAndPrices(fieldRowEl, fieldRowId) {
  const choiceRows = fieldRowEl.querySelectorAll('.aci-opt-choice-row');
  let options = [];
  let priceDiffs = {};
  let defaultVal = '';

  choiceRows.forEach(cRow => {
    const optName = cRow.querySelector('.aci-opt-name')?.value.trim();
    const optPrice = parseFloat(cRow.querySelector('.aci-opt-price')?.value) || 0;
    const isDefault = cRow.querySelector('.aci-opt-is-default')?.checked;

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

window.addFieldRowToModal = function() {
  const container = document.getElementById('aci-fields-container');
  const msg = document.getElementById('aci-no-fields-msg');
  if (msg) msg.style.display = 'none';
  const idx = container.children.length;
  const rowId = `aci-field-${Date.now()}-${Math.floor(Math.random()*1000)}`;

  const html = `
    <div class="aci-field-row" id="${rowId}" style="background:#F8FAFC; border:1px solid #CBD5E1; border-radius:8px; padding:16px; margin-bottom:16px;">
      <div class="aci-field-row-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;">
        <span style="font-weight:700; font-size:0.85rem; color:#1E293B;">Field #${idx + 1}</span>
        <button type="button" onclick="removeFieldRowFromModal(this)" style="background:none; border:1px solid #FCA5A5; color:#EF4444; border-radius:4px; padding:4px 8px; font-size:0.75rem; cursor:pointer; font-weight:600;">
          ✕ Remove Field
        </button>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
        <div>
          <label style="font-size:0.75rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Field / Parameter Name *</label>
          <input type="text" class="form-control form-control-sm aci-field-name" placeholder="e.g. Suspension System, Axle Brand & Loading" style="font-weight:600;">
        </div>
        <div>
          <label style="font-size:0.75rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Control Type (Display Format) *</label>
          <select class="form-control form-control-sm aci-field-type" onchange="toggleFieldOptionsInput(this)">
            <option value="dropdown">Dropdown Select Menu (e.g. Mechanical Leaf Spring, Air Suspension)</option>
            <option value="radio">Selectable Radio Buttons (e.g. York 3x13T, Fuwa 3x13T)</option>
            <option value="checkbox">Checkbox (Yes/No)</option>
            <option value="text">Text Input Field</option>
          </select>
        </div>
      </div>

      <div class="aci-default-text-group" style="display:none; margin-bottom:12px;">
        <label style="font-size:0.75rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Default Value</label>
        <input type="text" class="form-control form-control-sm aci-field-default" placeholder="e.g. Standard Assembly">
      </div>

      <!-- VISUAL OPTIONS & PRICING TABLE BUILDER -->
      <div class="aci-options-builder-container" style="background:#F1F5F9; border:1px solid #CBD5E1; border-radius:8px; padding:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <label style="font-size:0.775rem; font-weight:700; color:#1E293B;">Options & Price Differentials List</label>
            <span class="section-hint" style="font-size:0.7rem; color:#64748B; display:block;">Enter choice names and their exact price addition (+) or discount (-).</span>
          </div>
          <button type="button" class="btn btn-outline btn-xs" onclick="addOptionChoiceRow('${rowId}')" style="background:#0284C7; color:#FFFFFF; border:none; font-weight:700; padding:4px 10px; border-radius:4px;">
            + Add Option Row
          </button>
        </div>

        <div class="aci-option-items-table" id="aci-opt-table-${rowId}">
          <!-- Option Choice Rows Injected Here -->
        </div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);

  // Add initial default option rows for quick entry
  addOptionChoiceRow(rowId, 'Option 1 (Standard)', 0, true);
  addOptionChoiceRow(rowId, 'Option 2 (Upgrade)', 15000, false);
};

window.removeFieldRowFromModal = function(btn) {
  const row = btn.closest('.aci-field-row');
  if (row) {
    row.remove();
    const container = document.getElementById('aci-fields-container');
    if (container && container.children.length === 0) {
      const msg = document.getElementById('aci-no-fields-msg');
      if (msg) msg.style.display = 'block';
    }
  }
};

window.toggleFieldOptionsInput = function(select) {
  const row = select.closest('.aci-field-row');
  const optsContainer = row.querySelector('.aci-options-builder-container');
  const defaultTextGroup = row.querySelector('.aci-default-text-group');

  if (select.value === 'text' || select.value === 'checkbox') {
    if (optsContainer) optsContainer.style.display = 'none';
    if (defaultTextGroup) defaultTextGroup.style.display = 'block';
  } else {
    if (optsContainer) optsContainer.style.display = 'block';
    if (defaultTextGroup) defaultTextGroup.style.display = 'none';
  }
};

window.saveCustomItemSection = function() {
  const sectionName = document.getElementById('aci-section-name').value.trim();
  if (!sectionName) {
    alert('Please enter a section name.');
    return;
  }

  const fieldRows = document.querySelectorAll('#aci-fields-container .aci-field-row');
  if (fieldRows.length === 0) {
    alert('Please add at least one field.');
    return;
  }

  loadState();
  ensureCustomItemDefinitions();

  const section = {
    id: `custom-${Date.now()}`,
    name: sectionName,
    fields: []
  };

  fieldRows.forEach((row, idx) => {
    const name = row.querySelector('.aci-field-name').value.trim();
    if (!name) return;

    const type = row.querySelector('.aci-field-type').value;
    const rowId = row.id;
    let options = [];
    let priceDiffs = {};
    let defaultVal = '';

    if (type === 'dropdown' || type === 'radio') {
      const extracted = extractFieldOptionsAndPrices(row, rowId);
      options = extracted.options;
      priceDiffs = extracted.priceDiffs;
      defaultVal = extracted.defaultVal;

      if (options.length === 0) {
        options = ['Standard', 'Custom'];
        priceDiffs = { 'Standard': 0, 'Custom': 15000 };
        defaultVal = 'Standard';
      }
    } else if (type === 'checkbox') {
      defaultVal = 'Yes';
    } else {
      defaultVal = row.querySelector('.aci-field-default')?.value.trim() || 'Standard';
    }

    section.fields.push({
      id: `cf_${section.id}_${idx}`,
      name,
      type,
      options: options.length > 0 ? options : [],
      defaultValue: defaultVal,
      priceDiffs: Object.keys(priceDiffs).length > 0 ? priceDiffs : undefined
    });
  });

  if (section.fields.length === 0) {
    alert('Please fill in at least one valid field.');
    return;
  }

  STATE.customItemDefinitions.push(section);
  saveState();
  closeAddCustomItemSectionModal();
  renderCustomSectionsList();
  renderConfiguratorFormInputs(WIZARD_PRODUCT_TEMPLATES[wizardState.subtype]);
  calculateWizardPricing();
  logSystemActivity(`Added custom spec section: "${sectionName}" with ${section.fields.length} field(s).`);
  alert(`Custom section "${sectionName}" saved successfully!`);
};

window.deleteCustomItemSection = function(id) {
  if (!confirm('Delete this custom spec section? This cannot be undone.')) return;
  loadState();
  ensureCustomItemDefinitions();
  const idx = STATE.customItemDefinitions.findIndex(s => s.id === id);
  if (idx !== -1) {
    const section = STATE.customItemDefinitions[idx];
    const name = section.name;
    section.fields.forEach(field => {
      delete wizardState.specs[field.id];
    });
    STATE.customItemDefinitions.splice(idx, 1);
    saveState();
    renderCustomSectionsList();
    renderConfiguratorFormInputs(WIZARD_PRODUCT_TEMPLATES[wizardState.subtype]);
    calculateWizardPricing();
    logSystemActivity(`Deleted custom spec section: "${name}".`);
  }
};

function renderCustomSectionsList() {
  const container = document.getElementById('w-custom-items-sections-list');
  if (!container) return;
  loadState();
  ensureCustomItemDefinitions();

  if (STATE.customItemDefinitions.length === 0) {
    container.innerHTML = '<p class="section-hint">No custom sections defined. Click "Add Custom Spec Section" to create one.</p>';
    return;
  }

  container.innerHTML = STATE.customItemDefinitions.map(section => `
    <div class="custom-section-card">
      <div class="custom-section-card-info">
        <span class="custom-section-card-name">${section.name}</span>
        <span class="custom-section-card-count">${section.fields.length} field(s) · ${section.fields.map(f => f.name).join(', ')}</span>
      </div>
      <div class="custom-section-card-actions">
        <button type="button" class="btn-edit-section" onclick="openEditCustomItemSectionModal('${section.id}')" title="Edit section">
          <svg style="width:14px;height:14px;" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button type="button" class="btn-delete-section" onclick="deleteCustomItemSection('${section.id}')" title="Delete section">
          <svg style="width:14px;height:14px;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

// ------------------------------------------
// EDIT CUSTOM ITEM SECTION
// ------------------------------------------
let _editSectionId = null;

window.openEditCustomItemSectionModal = function(id) {
  loadState();
  ensureCustomItemDefinitions();
  const section = STATE.customItemDefinitions.find(s => s.id === id);
  if (!section) { alert('Section not found.'); return; }

  _editSectionId = id;
  const container = document.getElementById('edit-custom-item-modal-body');

  let fieldsHtml = section.fields.map((field, idx) => {
    const rowId = `edit-field-${Date.now()}-${idx}`;

    return `
      <div class="aci-field-row" id="${rowId}" data-field-idx="${idx}" style="background:#F8FAFC; border:1px solid #CBD5E1; border-radius:8px; padding:16px; margin-bottom:16px;">
        <div class="aci-field-row-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;">
          <span style="font-weight:700; font-size:0.85rem; color:#1E293B;">Field #${idx + 1}</span>
          <button type="button" onclick="removeEditFieldRow(this)" style="background:none; border:1px solid #FCA5A5; color:#EF4444; border-radius:4px; padding:4px 8px; font-size:0.75rem; cursor:pointer; font-weight:600;">
            ✕ Remove Field
          </button>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label style="font-size:0.75rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Field Name *</label>
            <input type="text" class="form-control form-control-sm edit-field-name" value="${field.name}" style="font-weight:600;">
          </div>
          <div>
            <label style="font-size:0.75rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Control Type *</label>
            <select class="form-control form-control-sm edit-field-type" onchange="toggleEditFieldOptions(this)">
              <option value="dropdown" ${field.type === 'dropdown' ? 'selected' : ''}>Dropdown Select Menu</option>
              <option value="radio" ${field.type === 'radio' ? 'selected' : ''}>Selectable Radio Buttons</option>
              <option value="checkbox" ${field.type === 'checkbox' ? 'selected' : ''}>Checkbox (Yes/No)</option>
              <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text Input Field</option>
            </select>
          </div>
        </div>

        <div class="aci-default-text-group" style="${field.type === 'text' || field.type === 'checkbox' ? '' : 'display:none;'} margin-bottom:12px;">
          <label style="font-size:0.75rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Default Value</label>
          <input type="text" class="form-control form-control-sm edit-field-default" value="${field.defaultValue || ''}">
        </div>

        <div class="aci-options-builder-container" style="background:#F1F5F9; border:1px solid #CBD5E1; border-radius:8px; padding:12px; ${field.type === 'text' || field.type === 'checkbox' ? 'display:none;' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div>
              <label style="font-size:0.775rem; font-weight:700; color:#1E293B;">Options & Price Differentials List</label>
              <span class="section-hint" style="font-size:0.7rem; color:#64748B; display:block;">Enter choice names and their exact price addition (+) or discount (-).</span>
            </div>
            <button type="button" class="btn btn-outline btn-xs" onclick="addOptionChoiceRow('${rowId}')" style="background:#0284C7; color:#FFFFFF; border:none; font-weight:700; padding:4px 10px; border-radius:4px;">
              + Add Option Row
            </button>
          </div>

          <div class="aci-option-items-table" id="aci-opt-table-${rowId}">
            <!-- Option Choice Rows Injected Here -->
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <label style="font-weight:700; font-size:0.85rem; display:block; margin-bottom:6px;">Section Name</label>
      <input type="text" id="edit-section-name" class="form-control" value="${section.name}" style="font-weight:600;">
    </div>
    <div style="margin-bottom:16px; display:flex; align-items:center; justify-content:space-between;">
      <label style="font-weight:700; font-size:0.85rem;">Fields / Specs</label>
      <button type="button" class="btn btn-outline btn-xs" onclick="addEditFieldRow()" style="display:inline-flex;align-items:center;gap:4px;">
        <svg style="width:12px;height:12px;" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Field
      </button>
    </div>
    <div id="edit-fields-container">
      ${fieldsHtml || '<p style="padding:20px; text-align:center; color:#64748B; font-size:0.85rem;">No fields.</p>'}
    </div>
  `;

  // Pre-populate Option rows for existing fields
  section.fields.forEach((field, idx) => {
    const rowId = `edit-field-${Date.now()}-${idx}`;
    if (field.options && field.options.length > 0) {
      field.options.forEach(opt => {
        const pDiff = field.priceDiffs && field.priceDiffs[opt] !== undefined ? field.priceDiffs[opt] : 0;
        const isDef = field.defaultValue === opt;
        addOptionChoiceRow(rowId, opt, pDiff, isDef);
      });
    } else if (field.type === 'dropdown' || field.type === 'radio') {
      addOptionChoiceRow(rowId, 'Option 1', 0, true);
    }
  });

  document.getElementById('edit-custom-item-modal').classList.add('active');
};

window.closeEditCustomItemSectionModal = function() {
  document.getElementById('edit-custom-item-modal').classList.remove('active');
  _editSectionId = null;
};

window.removeEditFieldRow = function(btn) {
  const row = btn.closest('.aci-field-row');
  if (row) row.remove();
};

window.addEditFieldRow = function() {
  const container = document.getElementById('edit-fields-container');
  const idx = container.querySelectorAll('.aci-field-row').length;
  const rowId = `edit-field-${Date.now()}-${idx}`;

  const html = `
    <div class="aci-field-row" id="${rowId}" style="background:#F8FAFC; border:1px solid #CBD5E1; border-radius:8px; padding:16px; margin-bottom:16px;">
      <div class="aci-field-row-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;">
        <span style="font-weight:700; font-size:0.85rem; color:#1E293B;">Field #${idx + 1}</span>
        <button type="button" onclick="removeEditFieldRow(this)" style="background:none; border:1px solid #FCA5A5; color:#EF4444; border-radius:4px; padding:4px 8px; font-size:0.75rem; cursor:pointer; font-weight:600;">
          ✕ Remove Field
        </button>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
        <div>
          <label style="font-size:0.75rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Field Name *</label>
          <input type="text" class="form-control form-control-sm edit-field-name" placeholder="e.g. Battery Voltage" style="font-weight:600;">
        </div>
        <div>
          <label style="font-size:0.75rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Control Type *</label>
          <select class="form-control form-control-sm edit-field-type" onchange="toggleEditFieldOptions(this)">
            <option value="dropdown">Dropdown Select Menu</option>
            <option value="radio">Selectable Radio Buttons</option>
            <option value="checkbox">Checkbox (Yes/No)</option>
            <option value="text">Text Input Field</option>
          </select>
        </div>
      </div>

      <div class="aci-default-text-group" style="display:none; margin-bottom:12px;">
        <label style="font-size:0.75rem; font-weight:700; color:#334155; display:block; margin-bottom:4px;">Default Value</label>
        <input type="text" class="form-control form-control-sm edit-field-default" placeholder="e.g. Standard">
      </div>

      <div class="aci-options-builder-container" style="background:#F1F5F9; border:1px solid #CBD5E1; border-radius:8px; padding:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <label style="font-size:0.775rem; font-weight:700; color:#1E293B;">Options & Price Differentials List</label>
            <span class="section-hint" style="font-size:0.7rem; color:#64748B; display:block;">Enter choice names and their exact price addition (+) or discount (-).</span>
          </div>
          <button type="button" class="btn btn-outline btn-xs" onclick="addOptionChoiceRow('${rowId}')" style="background:#0284C7; color:#FFFFFF; border:none; font-weight:700; padding:4px 10px; border-radius:4px;">
            + Add Option Row
          </button>
        </div>

        <div class="aci-option-items-table" id="aci-opt-table-${rowId}">
          <!-- Option Choice Rows Injected Here -->
        </div>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
  addOptionChoiceRow(rowId, 'Option 1', 0, true);
};

window.toggleEditFieldOptions = function(select) {
  const row = select.closest('.aci-field-row');
  const optsContainer = row.querySelector('.aci-options-builder-container');
  const defaultTextGroup = row.querySelector('.aci-default-text-group');

  if (select.value === 'text' || select.value === 'checkbox') {
    if (optsContainer) optsContainer.style.display = 'none';
    if (defaultTextGroup) defaultTextGroup.style.display = 'block';
  } else {
    if (optsContainer) optsContainer.style.display = 'block';
    if (defaultTextGroup) defaultTextGroup.style.display = 'none';
  }
};

window.saveEditedCustomItemSection = function() {
  const sectionName = document.getElementById('edit-section-name').value.trim();
  if (!sectionName) { alert('Please enter a section name.'); return; }

  const fieldRows = document.querySelectorAll('#edit-fields-container .aci-field-row');
  if (fieldRows.length === 0) { alert('Please add at least one field.'); return; }

  loadState();
  ensureCustomItemDefinitions();
  const section = STATE.customItemDefinitions.find(s => s.id === _editSectionId);
  if (!section) { alert('Section not found.'); return; }

  section.name = sectionName;
  section.fields = [];

  fieldRows.forEach((row, idx) => {
    const name = row.querySelector('.edit-field-name').value.trim();
    if (!name) return;
    const type = row.querySelector('.edit-field-type').value;
    const rowId = row.id;
    let options = [];
    let priceDiffs = {};
    let defaultVal = '';

    if (type === 'dropdown' || type === 'radio') {
      const extracted = extractFieldOptionsAndPrices(row, rowId);
      options = extracted.options;
      priceDiffs = extracted.priceDiffs;
      defaultVal = extracted.defaultVal;

      if (options.length === 0) {
        options = ['Standard', 'Custom'];
        priceDiffs = { 'Standard': 0, 'Custom': 15000 };
        defaultVal = 'Standard';
      }
    } else if (type === 'checkbox') {
      defaultVal = 'Yes';
    } else {
      defaultVal = row.querySelector('.edit-field-default')?.value.trim() || 'Standard';
    }

    section.fields.push({
      id: `cf_${_editSectionId}_${idx}`,
      name,
      type,
      options: options.length > 0 ? options : [],
      defaultValue: defaultVal,
      priceDiffs: Object.keys(priceDiffs).length > 0 ? priceDiffs : undefined
    });
  });

  if (section.fields.length === 0) { alert('Please fill in at least one valid field.'); return; }

  saveState();
  closeEditCustomItemSectionModal();
  renderCustomSectionsList();
  renderConfiguratorFormInputs(WIZARD_PRODUCT_TEMPLATES[wizardState.subtype]);
  calculateWizardPricing();
  logSystemActivity(`Edited custom spec section: "${sectionName}".`);
  alert(`Custom section "${sectionName}" updated successfully!`);
};

// Render custom sections in the configurator
function getCustomItemSpecs() {
  loadState();
  ensureCustomItemDefinitions();
  return STATE.customItemDefinitions || [];
}

window.updateManualBasePrice = function(val) {
  wizardState.customBasePrice = parseFloat(val) || 0;
  calculateWizardPricing();
};

window.saveCurrentBasePriceAsDefault = function() {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) return;

  const currentBase = wizardState.customBasePrice !== undefined 
    ? wizardState.customBasePrice 
    : template.basePrice;

  if (!STATE.adminPricing) STATE.adminPricing = {};
  if (!STATE.adminPricing.basePrices) STATE.adminPricing.basePrices = {};

  STATE.adminPricing.basePrices[wizardState.subtype] = currentBase;
  saveState();
  logSystemActivity(`Admin set market base price for ${wizardState.subtype} to ₹${currentBase.toLocaleString('en-IN')}.`);
  alert(`₹${currentBase.toLocaleString('en-IN')} saved as market baseline default price for ${template.name}!`);
};

window.openPartPricingMatrixModal = function() {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) {
    alert("Please select a product category & subtype first.");
    return;
  }

  const container = document.getElementById('part-pricing-modal-body');
  if (!container) return;

  if (!STATE.adminPricing) STATE.adminPricing = {};

  let html = `
    <div style="margin-bottom:16px; padding:12px; background:#EFF6FF; border-left:4px solid #3B82F6; border-radius:6px;">
      <h4 style="margin:0; font-size:0.85rem; color:#1E40AF;">Managing Component Part Prices for: <strong>${template.name}</strong></h4>
      <p style="margin:4px 0 0 0; font-size:0.75rem; color:#1D4ED8;">Adjust the price differential (₹) for each customization option. Positive values add cost (+), negative values give a discount (-).</p>
    </div>

    <!-- Metal Price per kg -->
    <div style="margin-bottom:20px; padding:16px; background:#FFF7ED; border:1.5px solid #FED7AA; border-radius:8px;">
      <h5 style="margin:0 0 12px 0; font-size:0.85rem; font-weight:700; color:#9A3412; text-transform:uppercase; display:flex; align-items:center; gap:6px;">
        <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
        Metal Price
      </h5>
      <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px; background:#ffffff; padding:8px 14px; border-radius:6px; border:1px solid #FED7AA;">
          <span style="font-size:0.8rem; font-weight:600; color:#78350F; white-space:nowrap;">Steel (₹/kg)</span>
          <input type="number" id="metal-price-steel" class="form-control form-control-sm" value="${STATE.adminPricing.metalPriceSteel || 0}" style="width:100px; text-align:right; font-weight:700; padding:4px 8px;" placeholder="0">
        </div>
        <div style="display:flex; align-items:center; gap:8px; background:#ffffff; padding:8px 14px; border-radius:6px; border:1px solid #FED7AA;">
          <span style="font-size:0.8rem; font-weight:600; color:#78350F; white-space:nowrap;">Hardox (₹/kg)</span>
          <input type="number" id="metal-price-hardox" class="form-control form-control-sm" value="${STATE.adminPricing.metalPriceHardox || 0}" style="width:100px; text-align:right; font-weight:700; padding:4px 8px;" placeholder="0">
        </div>
      </div>
    </div>

    <div style="margin-bottom:20px; position:relative;">
      <input type="text" id="part-pricing-search-input" class="form-control" placeholder="Search component or option (e.g. Axle, Air Suspension, Floor, Hardox)..." oninput="filterPartPricingMatrixItems(this.value)" style="padding-left:36px; height:40px; border-radius:6px; font-size:0.85rem; border:1px solid #CBD5E1;">
      <svg style="position:absolute; left:12px; top:12px; width:16px; height:16px; color:#64748B;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
    </div>
  `;

  template.specs.forEach(spec => {
    if (spec.options && spec.options.length > 0) {
      html += `
        <div class="part-spec-group-section" data-spec-name="${spec.name.toLowerCase()}" style="margin-bottom:18px; padding-bottom:12px; border-bottom:1px solid #E2E8F0;">
          <h5 style="margin:0 0 8px 0; font-size:0.825rem; font-weight:700; color:#334155; text-transform:uppercase;">${spec.name} Options</h5>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
      `;

      spec.options.forEach(opt => {
        let currentDiff = getEffectiveSpecPriceDiff(spec, opt);

        html += `
          <div class="part-price-item-card" data-option-name="${opt.toLowerCase()}" style="display:flex; align-items:center; justify-content:space-between; background:#F8FAFC; padding:6px 10px; border-radius:6px; border:1px solid #E2E8F0;">
            <span style="font-size:0.775rem; font-weight:600; color:#475569;">${opt}</span>
            <div style="display:flex; align-items:center; gap:4px;">
              <span style="font-size:0.75rem; color:#64748B;">₹</span>
              <input type="number" class="form-control form-control-sm part-price-diff-input" data-spec-id="${spec.id}" data-option="${opt}" value="${currentDiff}" style="width:105px; text-align:right; font-weight:bold; padding:2px 6px;">
            </div>
          </div>
        `;
      });

      // Show custom options in pricing matrix with delete
      const customOpts = getCustomFieldOptions(spec.id);
      customOpts.forEach(opt => {
        html += `
          <div class="part-price-item-card" data-option-name="${opt.name.toLowerCase()}" style="display:flex; align-items:center; justify-content:space-between; background:#F0FDF4; padding:6px 10px; border-radius:6px; border:1px solid #BBF7D0;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:0.775rem; font-weight:600; color:#166534;">${opt.name}</span>
              <span style="font-size:0.6rem; font-weight:600; color:#15803D; background:#DCFCE7; padding:1px 6px; border-radius:3px;">custom</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:0.75rem; color:#64748B;">₹</span>
              <input type="number" class="form-control form-control-sm part-price-diff-input" data-spec-id="${spec.id}" data-option="${opt.name}" value="${opt.priceDiff}" style="width:105px; text-align:right; font-weight:bold; padding:2px 6px;">
              <button type="button" onclick="deleteCustomFieldOption('${spec.id}', '${opt.name}')" style="background:none;border:none;color:#DC2626;cursor:pointer;padding:2px;" title="Delete custom option">
                <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        `;
      });

      html += `</div></div>`;
    }
  });

  container.innerHTML = html;
  document.getElementById('part-pricing-modal').classList.add('active');
  setTimeout(() => {
    const searchInp = document.getElementById('part-pricing-search-input');
    if (searchInp) searchInp.focus();
  }, 100);
};

window.filterPartPricingMatrixItems = function(query) {
  const q = (query || '').toLowerCase().trim();
  const specSections = document.querySelectorAll('#part-pricing-modal-body .part-spec-group-section');

  specSections.forEach(section => {
    const sectionName = section.getAttribute('data-spec-name') || '';
    const items = section.querySelectorAll('.part-price-item-card');
    let hasVisibleItem = false;

    items.forEach(item => {
      const optName = item.getAttribute('data-option-name') || '';
      const match = !q || sectionName.includes(q) || optName.includes(q);

      if (match) {
        item.style.display = 'flex';
        hasVisibleItem = true;
      } else {
        item.style.display = 'none';
      }
    });

    if (hasVisibleItem) {
      section.style.display = 'block';
    } else {
      section.style.display = 'none';
    }
  });
};

window.closePartPricingMatrixModal = function() {
  document.getElementById('part-pricing-modal').classList.remove('active');
};

window.saveComponentPartPricingFromModal = function() {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) return;

  // Save metal prices per kg
  if (!STATE.adminPricing) STATE.adminPricing = {};
  STATE.adminPricing.metalPriceSteel = parseFloat(document.getElementById('metal-price-steel')?.value) || 0;
  STATE.adminPricing.metalPriceHardox = parseFloat(document.getElementById('metal-price-hardox')?.value) || 0;

  const inputs = document.querySelectorAll('#part-pricing-modal-body .part-price-diff-input');
  inputs.forEach(input => {
    const specId = input.getAttribute('data-spec-id');
    const option = input.getAttribute('data-option');
    const val = parseFloat(input.value) || 0;

    const spec = template.specs.find(s => s.id === specId);
    if (spec) {
      if (!spec.priceDiffs) spec.priceDiffs = {};
      spec.priceDiffs[option] = val;

      if (specId === 'floor' && option.includes('6mm')) STATE.adminPricing.floor6 = val;
      if (specId === 'floor' && option.includes('10mm')) STATE.adminPricing.floor10 = val;
      if (specId === 'beam' && option.includes('Hardox')) STATE.adminPricing.steelHardox = val;
      if (specId === 'axles' && option.includes('2x13T')) STATE.adminPricing.axle2 = val;
      if (specId === 'axles' && option.includes('3x16T')) STATE.adminPricing.axle3_16 = val;
    }

    // Also save custom option prices
    const customOpts = STATE.adminPricing?.customFieldOptions?.[getCustomFieldKey(specId)];
    if (customOpts) {
      const match = customOpts.find(c => c.name === option);
      if (match) match.priceDiff = val;
    }
  });

  saveState();
  renderConfiguratorFormInputs(template);
  calculateWizardPricing();
  closePartPricingMatrixModal();
  logSystemActivity(`Updated component part pricing matrix for ${template.name}.`);
  alert(`Component part prices updated and saved as system market defaults for ${template.name}!`);
};

// Step 4 pricing calculator
function calculateWizardPricing() {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) return;

  let defaultPrice = (STATE.adminPricing && STATE.adminPricing.basePrices && STATE.adminPricing.basePrices[wizardState.subtype])
    ? STATE.adminPricing.basePrices[wizardState.subtype]
    : template.basePrice;
  let basePrice = (wizardState.customBasePrice !== undefined) ? wizardState.customBasePrice : defaultPrice;

  let upgradesHtml = '';
  let upgradesTotal = 0;

  // Calculate Spec Upgrades (built-in)
  template.specs.forEach(spec => {
    if (wizardState.notRequired[spec.id]) return;
    const selectedVal = wizardState.specs[spec.id];
    if (selectedVal) {
      let diff = getEffectiveSpecPriceDiff(spec, selectedVal);
      let label = spec.name;

      // If Custom is selected, use custom description and price if provided
      if (selectedVal.toLowerCase() === 'custom') {
        const customDesc = wizardState.specs[spec.id + '_custom_desc'];
        const customPrice = wizardState.specs[spec.id + '_custom_price'];
        if (customDesc) label += ` (${customDesc})`;
        if (customPrice) diff = customPrice;
      }

      upgradesTotal += diff;
      upgradesHtml += `
        <div class="preview-row indent">
          <span>+ Upgrade: ${label} (${selectedVal})</span>
          <span>${diff > 0 ? '+' : ''}₹${diff.toLocaleString('en-IN')}</span>
        </div>
      `;
    }
  });

  // Calculate Custom Item Spec Upgrades
  const customSections = getCustomItemSpecs();
  customSections.forEach(section => {
    section.fields.forEach(field => {
      if (wizardState.notRequired[field.id]) return;
      const selectedVal = wizardState.specs[field.id];
      if (selectedVal && field.priceDiffs && field.priceDiffs[selectedVal] !== undefined) {
        let diff = field.priceDiffs[selectedVal];
        let label = field.name;

        // If Custom is selected, use custom description and price if provided
        if (selectedVal.toLowerCase() === 'custom') {
          const customDesc = wizardState.specs[field.id + '_custom_desc'];
          const customPrice = wizardState.specs[field.id + '_custom_price'];
          if (customDesc) label += ` (${customDesc})`;
          if (customPrice) diff = customPrice;
        }

        upgradesTotal += diff;
        upgradesHtml += `
          <div class="preview-row indent">
            <span>+ [${section.name}] ${label} (${selectedVal})</span>
            <span>${diff > 0 ? '+' : ''}₹${diff.toLocaleString('en-IN')}</span>
          </div>
        `;
      }
    });
  });

  const basicAmount = basePrice + upgradesTotal;
  const gstVal = Math.round(basicAmount * 0.18);
  const grandTotal = basicAmount + gstVal;
  
  wizardState.total = grandTotal;

  // Update base price input value
  const basePriceInput = document.getElementById('w-override-base-price');
  if (basePriceInput && !basePriceInput.disabled) {
    basePriceInput.value = basePrice;
  }

  // Render summary panel (dynamic parts only)
  const summarySheet = document.getElementById('w-live-summary-sheet');
  if (summarySheet) {
    summarySheet.innerHTML = `
      ${upgradesHtml ? `
        <div class="mb-xs mt-xs"><span style="font-size:0.7rem;color:var(--color-text-muted);text-transform:uppercase;">Technical Parameters Upgrades:</span></div>
        ${upgradesHtml}
      ` : ''}

      <div class="preview-row mt-md" style="border-top: 1px dashed rgba(0,0,0,0.15); padding-top:10px;">
        <span>Chassis Basic Total</span>
        <span>₹${basicAmount.toLocaleString('en-IN')}</span>
      </div>
      <div class="preview-row">
        <span>GST (18%)</span>
        <span>₹${gstVal.toLocaleString('en-IN')}</span>
      </div>
      <div class="preview-row total" style="color:var(--color-primary)">
        <span>Grand Total</span>
        <span>₹${grandTotal.toLocaleString('en-IN')}</span>
      </div>
    `;
  }
}

// Step 5: Final Quotation Mock Preview Populate
function generateQuotationFinalReview() {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) return;

  const quoteId = `QT-2026-00${STATE.quotations.length + 1}`;
  const c = wizardState.customer;

  // Pre-calculations
  const grandTotal = wizardState.total;
  const basicAmount = Math.round(grandTotal / 1.18);
  const gstAmount = grandTotal - basicAmount;

  // Set standard PDF preview tags
  document.getElementById('w-pdf-ref-no').innerText = `REF:- NEXFRA-QTN/2026/${STATE.quotations.length + 1}`;
  document.getElementById('w-pdf-date-val').innerText = `DATE: ${new Date(c.date).toLocaleDateString('en-GB').replace(/\//g,'.')}`;
  
  document.getElementById('w-pdf-to-company').innerText = `M/s ${c.company.toUpperCase()}`;
  document.getElementById('w-pdf-to-address-1').innerText = c.address.substring(0, 45);
  document.getElementById('w-pdf-to-address-2').innerText = c.address.substring(45) || 'Registered Office';
  document.getElementById('w-pdf-to-gst').innerText = `GST NO: ${c.gst}`;

  const capacityLabel = wizardState.capacity && wizardState.capacity !== 'NA' ? `${wizardState.capacity} ` : '';
  document.getElementById('w-pdf-subj-text').innerText = `Subject: Quotation for -${c.model.toUpperCase()} , ${capacityLabel}${template.name.toUpperCase()} with sub frame and Hydraulic Kit`;
  document.getElementById('w-pdf-table-desc').innerHTML = `${capacityLabel}${template.name.toUpperCase()} WITH SUBFRAME and CYLINDER KIT<br>Regular TAIL DOOR ${c.model}`;

  // Price columns
  document.getElementById('w-pdf-table-basic').innerText = formatPdfPrice(basicAmount);
  document.getElementById('w-pdf-table-gst').innerText = formatPdfPrice(gstAmount);
  document.getElementById('w-pdf-table-total').innerText = formatPdfPrice(basicAmount);
  document.getElementById('w-pdf-table-gst-total').innerText = formatPdfPrice(gstAmount);

  document.getElementById('w-pdf-grand-total-label').innerText = formatPdfPrice(grandTotal);
  document.getElementById('w-pdf-grand-total-val').innerText = formatPdfPrice(grandTotal);

  document.getElementById('w-pdf-words-val').innerText = priceToIndianWords(grandTotal);

  // Specifications
  const specsContainer = document.getElementById('w-pdf-specs-list-container');
  let specsListHtml = '';
  let count = 1;

  // Add category dimensions
  const lenVal = document.getElementById('w-dim-length') ? document.getElementById('w-dim-length').value : template.dimensions.length;
  const heightVal = document.getElementById('w-dim-height') ? document.getElementById('w-dim-height').value : template.dimensions.height;
  const widthVal = document.getElementById('w-dim-width') ? document.getElementById('w-dim-width').value : template.dimensions.width;

  // Populate spec list elements dynamically (built-in specs)
  Object.keys(wizardState.specs).forEach(key => {
    if (wizardState.notRequired[key]) return;
    if (key.endsWith('_custom_desc') || key.endsWith('_custom_price')) return;
    const specInfo = template.specs.find(s => s.id === key);
    if (specInfo) {
      let val = wizardState.specs[key];
      if (val.toLowerCase() === 'custom') {
        const desc = wizardState.specs[key + '_custom_desc'];
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
  customSections.forEach(section => {
    section.fields.forEach(field => {
      if (wizardState.notRequired[field.id]) return;
      const val = wizardState.specs[field.id];
      if (val) {
        let displayVal = val;
        if (val.toLowerCase() === 'custom') {
          const desc = wizardState.specs[field.id + '_custom_desc'];
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

  // Toggle Work Order conversion block
  updateQuotationStatusState();
}

window.updateQuotationStatusState = function() {
  const status = document.getElementById('w-quote-status').value;
  wizardState.status = status;

  const woBox = document.getElementById('w-convert-wo-box');
  if (status === 'Approved') {
    woBox.style.display = 'block';
  } else {
    woBox.style.display = 'none';
  }
};

window.saveWizardQuotation = function() {
  loadState();
  const c = wizardState.customer;
  const quoteId = `QT-2026-00${STATE.quotations.length + 1}`;

  // 1. Create/Update Client Profile
  let client = STATE.customers.find(x => x.company.toLowerCase() === c.company.toLowerCase());
  if (!client) {
    client = {
      id: `CUST-00${STATE.customers.length + 1}`,
      name: c.name,
      company: c.company,
      gst: c.gst,
      phone: c.phone,
      email: c.email,
      address: c.address,
      vehicles: [],
      outstanding: wizardState.status === 'Approved' ? wizardState.total : 0
    };
    STATE.customers.push(client);
  } else {
    if (wizardState.status === 'Approved') {
      client.outstanding += wizardState.total;
    }
  }

  // Add chassis model to client vehicles if approved
  if (wizardState.status === 'Approved' && !client.vehicles.includes(c.model)) {
    client.vehicles.push(c.model);
  }

  // 2. Save quote record
  STATE.quotations.push({
    id: quoteId,
    customerId: client.id,
    productName: WIZARD_PRODUCT_TEMPLATES[wizardState.subtype].name,
    date: c.date,
    total: wizardState.total,
    status: wizardState.status,
    specs: wizardState.specs
  });

  // 3. Save invoice if approved
  if (wizardState.status === 'Approved') {
    const invoiceId = `INV-2026-${Math.floor(883 + Math.random()*100)}`;
    STATE.sales.push({
      invoiceId,
      customerName: c.company,
      product: `${WIZARD_PRODUCT_TEMPLATES[wizardState.subtype].name} (${wizardState.capacity})`,
      date: c.date,
      amount: wizardState.total,
      status: 'Unpaid'
    });
    logSystemActivity(`Quotation ${quoteId} approved & Invoice ${invoiceId} logged.`);
  } else {
    logSystemActivity(`Quotation registry ${quoteId} saved as: ${wizardState.status}.`);
  }

  saveState();
  alert(`Quotation ${quoteId} successfully saved to Nexfra Database with status: ${wizardState.status}.`);
  switchModule('dashboard');
};

window.convertWizardToWorkOrder = function() {
  loadState();
  const c = wizardState.customer;
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  const quoteId = `QT-2026-00${STATE.quotations.length}`;
  const woId = `WO-2026-00${STATE.workOrders.length + 1}`;

  // Compile spec dump details so production team never re-enters data
  const specDetails = [];
  Object.keys(wizardState.specs).forEach(key => {
    if (wizardState.notRequired[key]) return;
    if (key.endsWith('_custom_desc') || key.endsWith('_custom_price')) return;
    const specInfo = template.specs.find(s => s.id === key);
    if (specInfo) {
      let val = wizardState.specs[key];
      if (val.toLowerCase() === 'custom') {
        const desc = wizardState.specs[key + '_custom_desc'];
        if (desc) val += ` - ${desc}`;
      }
      specDetails.push(`${specInfo.name}: ${val}`);
    }
  });

  // Add custom item specs
  const customSections = getCustomItemSpecs();
  customSections.forEach(section => {
    section.fields.forEach(field => {
      if (wizardState.notRequired[field.id]) return;
      const val = wizardState.specs[field.id];
      if (val) {
        let displayVal = val;
        if (val.toLowerCase() === 'custom') {
          const desc = wizardState.specs[field.id + '_custom_desc'];
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
    stage: 'Pending',
    progress: 0,
    specs: specDetails,
    notes: `Configured dynamically via ERP Wizard. Sales rep: ${c.salesperson}`
  });

  logSystemActivity(`Work Order ${woId} successfully dispatched for quote: ${quoteId}.`);
  saveState();
  
  alert(`Work Order ${woId} generated successfully! Dispatched to the shop floor factory production pipeline.`);
  switchModule('status');
};

window.downloadWizardPdf = function() {
  const element = document.getElementById('w-pdf-sheet-render');
  const quoteId = `QT-2026-00${STATE.quotations.length + 1}`;
  const opt = {
    margin:       [0, 0, 0, 0],
    filename:     `NEXFRA_Quotation_${quoteId}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true, 
      letterRendering: false, 
      scrollY: 0,
      onclone: (clonedDoc) => {
        const sheet = clonedDoc.getElementById('w-pdf-sheet-render');
        if (sheet) {
          sheet.style.transform = 'none';
          sheet.style.scale = '1';
        }
        clonedDoc.querySelectorAll('.pdf-page, .pdf-page *').forEach(el => {
          el.style.fontFamily = 'Arial, Helvetica, sans-serif';
          el.style.wordSpacing = '0.15em';
          el.style.letterSpacing = 'normal';
          el.style.whiteSpace = 'normal';
        });
      }
    },
    jsPDF:        { unit: 'pt', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['css', 'legacy'] }
  };
  
  if (typeof html2pdf !== 'undefined') {
    html2pdf().set(opt).from(element).save();
  } else {
    alert("PDF library loading error. Try printing vector.");
  }
};

window.printWizardPdf = function() {
  window.print();
};

// ------------------------------------------
// 5. WORK ORDERS RENDERER
// ------------------------------------------

function renderWorkOrders() {
  loadState();
  const container = document.getElementById('workorders-container');
  if (!container) return;

  if (STATE.workOrders.length === 0) {
    container.innerHTML = '<p class="section-hint text-center py-lg col-span-2">No active work orders in shop queue.</p>';
    return;
  }

  container.innerHTML = STATE.workOrders.map(wo => {
    return `
      <div class="wo-card">
        <div class="wo-header">
          <span class="wo-id">${wo.id}</span>
          <span class="wo-date">Allocated: ${wo.date}</span>
        </div>
        <div class="wo-body">
          <div class="wo-meta">
            <div class="wo-meta-item">
              <strong>Client Account</strong>
              ${wo.customerName}
            </div>
            <div class="wo-meta-item">
              <strong>Vehicle Target</strong>
              ${wo.product}
            </div>
            <div class="wo-meta-item">
              <strong>Production Phase</strong>
              <span style="color:var(--color-primary);font-weight:700">${wo.stage}</span>
            </div>
            <div class="wo-meta-item">
              <strong>Assembly Progress</strong>
              ${wo.progress}%
            </div>
          </div>
          
          <div class="wo-specs-box">
            <h4>TECHNICAL SPECIFICATIONS PRINT</h4>
            <ul>
              ${wo.specs.map(spec => `<li><span>${spec}</span></li>`).join('')}
            </ul>
          </div>
          
          <div class="wo-notes">
            <strong>Factory Notes:</strong> ${wo.notes}
          </div>
        </div>
        <div class="wo-footer">
          <button class="btn btn-outline btn-sm" onclick="alert('Print triggers sent to local printer successfully.')">
            <svg class="icon-sm" viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print WO Card
          </button>
          <button class="btn class-primary btn-sm" onclick="switchModule('status')" style="background-color: var(--color-primary); color: #fff; padding: 8px 16px; border: none; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; border-radius: 2px;">Track Board</button>
        </div>
      </div>
    `;
  }).join('');
}

// ------------------------------------------
// 6. PRODUCTION BOARD (KANBAN BOARD)
// ------------------------------------------

function renderProductionBoard() {
  loadState();
  const container = document.getElementById('production-board-container');
  if (!container) return;

  const boardStages = STAGES.filter(s => s !== 'Delivered');
  let boardHtml = '';

  boardStages.forEach(stage => {
    const stageWOs = STATE.workOrders.filter(wo => wo.stage === stage);
    const cardsHtml = stageWOs.map(wo => `
      <div class="board-card" id="board-card-${wo.id}">
        <div class="board-card-id">${wo.id}</div>
        <div class="board-card-cust">${wo.customerName}</div>
        <div class="board-card-product">${wo.product}</div>
        <div class="board-card-action">
          <button class="btn btn-primary btn-xs" onclick="advanceWorkOrderStage('${wo.id}')">
            Advance &rarr;
          </button>
        </div>
      </div>
    `).join('');

    boardHtml += `
      <div class="board-col">
        <div class="board-col-header">
          <h3>${stage}</h3>
          <span class="board-col-count">${stageWOs.length}</span>
        </div>
        <div class="board-col-cards">
          ${cardsHtml || '<div class="section-hint text-center py-sm" style="font-size:0.75rem">No vehicles</div>'}
        </div>
      </div>
    `;
  });

  container.innerHTML = boardHtml;
}

window.advanceWorkOrderStage = function(woId) {
  const wo = STATE.workOrders.find(w => w.id === woId);
  if (!wo) return;

  const currentIdx = STAGES.indexOf(wo.stage);
  if (currentIdx < STAGES.length - 1) {
    const nextStage = STAGES[currentIdx + 1];
    wo.stage = nextStage;
    wo.progress = Math.round(((currentIdx + 1) / (STAGES.length - 1)) * 100);
    
    logSystemActivity(`Work Order ${woId} advanced to phase: ${nextStage} (${wo.progress}%).`);

    const card = document.getElementById(`board-card-${woId}`);
    if (card && typeof gsap !== 'undefined') {
      gsap.to(card, { scale: 0.8, opacity: 0, duration: 0.25, onComplete: () => {
        renderProductionBoard();
      }});
    } else {
      renderProductionBoard();
    }
  } else {
    alert(`Work Order ${woId} has already completed delivery workflows.`);
  }
};

// ------------------------------------------
// 7. ACCOUNTS & CLIENT DIRECTORY
// ------------------------------------------

function initAccountsModule() {
  const payForm = document.getElementById('payment-log-form');
  if (payForm) {
    payForm.onsubmit = (e) => {
      e.preventDefault();
      
      const invoiceId = document.getElementById('pay-order-select').value;
      const amount = parseFloat(document.getElementById('pay-amount').value);
      const mode = document.getElementById('pay-mode').value;
      const ref = document.getElementById('pay-reference').value;

      const sale = STATE.sales.find(s => s.invoiceId === invoiceId);
      if (!sale) return;

      const pId = `TXN-${Math.floor(902104 + Math.random()*1000)}`;
      STATE.payments.push({
        id: pId,
        invoiceId,
        date: new Date().toISOString().split('T')[0],
        amount,
        mode,
        ref
      });

      logSystemActivity(`Logged payment ₹${amount.toLocaleString('en-IN')} for invoice ${invoiceId} via ${mode}.`);
      saveState();
      alert(`Payment logged successfully. Txn Ref: ${pId}.`);
      
      payForm.reset();
      renderAccountsLedger();
    };
  }
}

function renderAccountsLedger() {
  loadState();
  const tbody = document.querySelector('#accounts-ledger-table tbody');
  const paySelect = document.getElementById('pay-order-select');
  const txnHistoryList = document.getElementById('payment-history-list');
  
  if (!tbody) return;

  tbody.innerHTML = STATE.sales.map(sale => {
    const totalPaid = STATE.payments
      .filter(p => p.invoiceId === sale.invoiceId)
      .reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, sale.amount - totalPaid);
    const status = balance <= 0 ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending');
    const badgeClass = status === 'Paid' ? 'status-paid' : (status === 'Partial' ? 'status-partial' : 'status-pending');
    
    return `
      <tr>
        <td style="font-family:var(--font-headings);font-weight:700">${sale.invoiceId}</td>
        <td>${sale.customerName}</td>
        <td style="font-weight:600">₹${sale.amount.toLocaleString('en-IN')}</td>
        <td style="color:var(--color-success);font-weight:600">₹${totalPaid.toLocaleString('en-IN')}</td>
        <td style="color:${balance > 0 ? 'var(--color-danger)' : 'var(--color-text-dark)'};font-weight:600">₹${balance.toLocaleString('en-IN')}</td>
        <td>
          <span class="tbl-status-badge ${badgeClass}">${status.toUpperCase()}</span>
        </td>
        <td>
          ${balance > 0 
            ? `<button class="btn btn-outline btn-xs" onclick="populatePaymentDetails('${sale.invoiceId}')">Log Pay</button>`
            : `<span class="tbl-status-badge status-paid" style="font-size:0.7rem;padding:4px 8px;">COMPLETED</span>`
          }
        </td>
      </tr>
    `;
  }).join('');

  const unpaidSales = STATE.sales.filter(s => {
    const paid = STATE.payments.filter(p => p.invoiceId === s.invoiceId).reduce((sum, p) => sum + p.amount, 0);
    return (s.amount - paid) > 0;
  });

  if (unpaidSales.length === 0) {
    paySelect.innerHTML = '<option value="">All Invoices Fully Paid</option>';
  } else {
    paySelect.innerHTML = unpaidSales.map(s => {
      const paid = STATE.payments.filter(p => p.invoiceId === s.invoiceId).reduce((sum, p) => sum + p.amount, 0);
      const due = s.amount - paid;
      return `<option value="${s.invoiceId}">${s.invoiceId} - ${s.customerName} (Due: ₹${due.toLocaleString('en-IN')})</option>`;
    }).join('');
  }

  txnHistoryList.innerHTML = STATE.payments.slice(0, 5).map(txn => {
    const sale = STATE.sales.find(s => s.invoiceId === txn.invoiceId);
    return `
      <li>
        <div class="tx-details">
          <strong>${sale ? sale.customerName : 'Client Account'}</strong>
          <span class="tx-ref">Ref: ${txn.ref} | Mode: ${txn.mode}</span>
        </div>
        <span class="tx-amount">+ ₹${txn.amount.toLocaleString('en-IN')}</span>
      </li>
    `;
  }).join('');
}

window.populatePaymentDetails = function(invoiceId) {
  const select = document.getElementById('pay-order-select');
  select.value = invoiceId;
  document.getElementById('pay-amount').focus();
};

function renderCustomersDirectory() {
  loadState();
  const tbody = document.querySelector('#customers-table tbody');
  if (!tbody) return;

  tbody.innerHTML = STATE.customers.map(c => `
    <tr>
      <td style="font-weight:600">${c.company}</td>
      <td style="font-family:var(--font-headings)">${c.gst}</td>
      <td>
        <div>${c.name}</div>
        <div style="font-size:0.75rem;color:var(--color-text-muted)">${c.phone} | ${c.email}</div>
      </td>
      <td style="font-size:0.8rem;color:var(--color-text-muted)">${c.address}</td>
      <td>
        ${c.vehicles.map(v => `<span class="tbl-status-badge status-paid" style="font-size:0.65rem;margin-right:4px">${v}</span>`).join('') || '<span class="section-hint" style="font-size:0.75rem">None</span>'}
      </td>
      <td style="font-family:var(--font-headings);font-weight:700;color:${c.outstanding > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">
        ₹${c.outstanding.toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');
}

// ------------------------------------------
// 8. PRICING PARAMETERS CONFIG (ADMIN)
// ------------------------------------------

function initAdminModule() {
  const form = document.getElementById('admin-pricing-form');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      
      STATE.adminPricing.floor6 = parseFloat(document.getElementById('admin-p-floor-6').value);
      STATE.adminPricing.floor10 = parseFloat(document.getElementById('admin-p-floor-10').value);
      STATE.adminPricing.steelHardox = parseFloat(document.getElementById('admin-p-steel-hardox').value);
      STATE.adminPricing.axle2 = parseFloat(document.getElementById('admin-p-axle-2').value);
      STATE.adminPricing.axle3_16 = parseFloat(document.getElementById('admin-p-axle-3-16').value);

      logSystemActivity(`Admin updated raw material pricing coefficients.`);
      alert('Pricing parameters updated successfully in database.');
      
      renderAdminSettings();
    };
  }
}

function renderAdminSettings() {
  loadState();
  document.getElementById('admin-p-floor-6').value = STATE.adminPricing.floor6;
  document.getElementById('admin-p-floor-10').value = STATE.adminPricing.floor10;
  document.getElementById('admin-p-steel-hardox').value = STATE.adminPricing.steelHardox;
  document.getElementById('admin-p-axle-2').value = STATE.adminPricing.axle2;
  document.getElementById('admin-p-axle-3-16').value = STATE.adminPricing.axle3_16;

  const auditContainer = document.getElementById('admin-audit-logs');
  if (auditContainer) {
    auditContainer.innerHTML = `
      <li><span class="audit-time">10:42 AM</span> Admin updated baseline pricing matrix coefficients.</li>
      <li><span class="audit-time">09:15 AM</span> Sales approved Quote #2026-002 for Tata Logistics.</li>
      <li><span class="audit-time">08:00 AM</span> System synchronized database instances (4 active modules).</li>
    `;
  }
}

// ------------------------------------------
// 9. HIGH-FIDELITY PDF PREVIEW GENERATOR
// ------------------------------------------

function initPdfPreviewControls() {
  const closeBtn = document.getElementById('btn-close-pdf');
  const printBtn = document.getElementById('btn-print-pdf');
  const downloadBtn = document.getElementById('btn-download-pdf');

  if (closeBtn) closeBtn.onclick = closePdfPreview;
  if (printBtn) printBtn.onclick = printPdf;
  
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      downloadPdf(currentPreviewQuoteId);
    };
  }
}

function closePdfPreview() {
  const modal = document.getElementById('pdf-preview-modal');
  if (modal) {
    modal.classList.remove('active');
    switchModule('status');
  }
}

function printPdf() {
  window.print();
}

function downloadPdf(quoteId) {
  const element = document.getElementById('pdf-content-to-print');
  const opt = {
    margin:       [0, 0, 0, 0],
    filename:     `NEXFRA_Quotation_${quoteId}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true, 
      letterRendering: false, 
      scrollY: 0,
      onclone: (clonedDoc) => {
        const sheet = clonedDoc.getElementById('pdf-content-to-print');
        if (sheet) {
          sheet.style.transform = 'none';
          sheet.style.scale = '1';
        }
        clonedDoc.querySelectorAll('.pdf-page, .pdf-page *').forEach(el => {
          el.style.fontFamily = 'Arial, Helvetica, sans-serif';
          el.style.wordSpacing = '0.15em';
          el.style.letterSpacing = 'normal';
          el.style.whiteSpace = 'normal';
        });
      }
    },
    jsPDF:        { unit: 'pt', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['css', 'legacy'] }
  };
  
  if (typeof html2pdf !== 'undefined') {
    html2pdf().set(opt).from(element).save();
  } else {
    alert("PDF generation library is loading, please try printing directly.");
  }
}

// Format numbers like 3,80,000/-
function formatPdfPrice(num) {
  return num.toLocaleString('en-IN') + '/-';
}

function priceToIndianWords(num) {
  if (num === 0) return 'zero';
  const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  const convertThreeDigit = (n) => {
    let word = '';
    if (n >= 100) {
      word += a[Math.floor(n / 100)] + ' hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        word += a[n];
      } else {
        word += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      }
    }
    return word.trim();
  };

  let wordStr = '';
  if (num >= 10000000) {
    wordStr += convertThreeDigit(Math.floor(num / 10000000)) + ' crore ';
    num %= 10000000;
  }
  if (num >= 100000) {
    wordStr += convertThreeDigit(Math.floor(num / 100000)) + ' lakh ';
    num %= 100000;
  }
  if (num >= 1000) {
    wordStr += convertThreeDigit(Math.floor(num / 1000)) + ' thousand ';
    num %= 1000;
  }
  if (num > 0) {
    wordStr += convertThreeDigit(num);
  }

  let finalResult = wordStr.trim();
  finalResult = finalResult.charAt(0).toUpperCase() + finalResult.slice(1) + ' only';
  return finalResult.replace(/\s+/g, ' ');
}

// Global modal preview populator
window.openPdfPreview = function(quoteId) {
  loadState();
  const quote = STATE.quotations.find(q => q.id === quoteId);
  if (!quote) return;

  currentPreviewQuoteId = quoteId;

  const client = STATE.customers.find(c => c.id === quote.customerId);
  const clientCompany = client ? client.company : 'Company Name';
  const clientAddress = client ? client.address : 'Registered Address';
  const clientGst = client ? client.gst : 'Pending';

  // Math variables
  const grandTotalVal = quote.total;
  const basicVal = Math.round(grandTotalVal / 1.18);
  const gstVal = grandTotalVal - basicVal;

  // Ref details
  document.getElementById('pdf-ref-no').innerText = `REF:- NEXFRA-QTN/007.26/${quoteId.replace('QT-2026-','')}`;
  document.getElementById('pdf-date-val').innerText = `DATE: ${new Date(quote.date).toLocaleDateString('en-GB').replace(/\//g,'.')}`;
  
  document.getElementById('pdf-to-company').innerText = `M/s ${clientCompany.toUpperCase()}`;
  document.getElementById('pdf-to-address-1').innerText = clientAddress.substring(0, 45);
  document.getElementById('pdf-to-address-2').innerText = clientAddress.substring(45) || 'GST Registered Address';
  document.getElementById('pdf-to-gst').innerText = `GST NO: ${clientGst}`;

  let chassisName = 'EICHER-6035XPT';
  let capacityName = '25 CBM';
  let productFamilyText = 'TIPPER BOX BODY';

  if (quote.productName.includes('Flat Bed')) {
    chassisName = 'HEAVY HAULER';
    capacityName = '40 Ft';
    productFamilyText = 'FLAT BED TRAILER';
  } else if (quote.productName.includes('Tip')) {
    chassisName = 'TATA PRIMA';
    capacityName = '36 CBM';
    productFamilyText = 'TIP TRAILER';
  } else if (quote.productName.includes('Rock')) {
    chassisName = 'CAT-777G';
    capacityName = '16 CBM';
    productFamilyText = 'ROCK BODY TIPPER';
  }

  document.getElementById('pdf-subj-text').innerText = `Subject: Quotation for -${chassisName} , ${capacityName} ${productFamilyText} with sub frame and Hydraulic Kit`;
  document.getElementById('pdf-table-desc').innerHTML = `${capacityName} ${productFamilyText} WITH SUBFRAME and CYLINDER KIT<br>Regular TAIL DOOR ${chassisName}`;

  document.getElementById('pdf-table-basic').innerText = formatPdfPrice(basicVal);
  document.getElementById('pdf-table-gst').innerText = formatPdfPrice(gstVal);
  document.getElementById('pdf-table-total').innerText = formatPdfPrice(basicVal);
  document.getElementById('pdf-table-gst-total').innerText = formatPdfPrice(gstVal);
  
  document.getElementById('pdf-grand-total-label').innerText = formatPdfPrice(grandTotalVal);
  document.getElementById('pdf-grand-total-val').innerText = formatPdfPrice(grandTotalVal);

  document.getElementById('pdf-words-val').innerText = priceToIndianWords(grandTotalVal);
  
  const specsContainer = document.getElementById('pdf-specs-list-container');
  let specsHtml = '';
  let count = 1;

  Object.keys(quote.specs).forEach(key => {
    specsHtml += `
      <div class="pdf-specs-item">
        <span style="font-weight:bold; min-width: 26px;">${count++}.</span>
        <span>${key.toUpperCase()} = ${quote.specs[key]}</span>
      </div>
    `;
  });

  if (quote.customItems && quote.customItems.length > 0) {
    quote.customItems.forEach(item => {
      specsHtml += `
        <div class="pdf-specs-item">
          <span style="font-weight:bold; min-width: 26px;">${count++}.</span>
          <span>Accessory = ${item.name} (Qty: ${item.qty})</span>
        </div>
      `;
    });
  }

  if (specsContainer) {
    specsContainer.innerHTML = specsHtml;
  }
  document.getElementById('pdf-preview-modal').classList.add('active');
};
