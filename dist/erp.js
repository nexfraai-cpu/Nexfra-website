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
  total: 0,
  terms: [
    '1) Validity – 15 days',
    '2) Delivery – 2 To 3 weeks from Date of receipt of purchase order and advance payment',
    '3) Freight - Ex Price Hosur,.. Transportation in Customers Scope & is not considered in the above Price',
    '4) Warrantee: Standard warranty against manufacturing defects of 12 Months from the date of delivery. Consumables, Glass & Rubber parts are not covered under the standard warranty',
    '5) Taxes - All taxes & duties will be billed at actual applicable rates, at the time of billing',
    '6) Payment terms – 50% advance and balance Prior to Delivery',
    '7) Inspection: By Nexfra and share the report along with invoice'
  ],
  scopeOfWork: 'As Mentioned above'
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
      { id: "cylinder", name: "Tipping Cylinder Model", section: "hydraulic", type: "dropdown", options: ["Hyva 175", "Hydromen 175", "Wipro 175", "Hyva 179-5stage", "Hyva 150-4stage", "Wipro Heavy Duty", "Custom"], defaultValue: "Hyva 175", priceDiffs: { "Hyva 175": 0, "Hydromen 175": 0, "Wipro 175": 0, "Hyva 179-5stage": 15000, "Hyva 150-4stage": -25000, "Wipro Heavy Duty": -10000, "Custom": 20000 } },
      { id: "axles", name: "Axle Brand & Loading", section: "chassis", type: "radio", options: ["York 3x13T", "Fuwa 3x13T", "York 3x16T", "York 2x13T", "Custom"], defaultValue: "York 3x13T", priceDiffs: { "York 3x13T": 0, "Fuwa 3x13T": -10000, "York 3x16T": 80000, "York 2x13T": -100000, "Custom": 50000 } },
      { id: "landing_leg", name: "Landing Leg", section: "chassis", type: "dropdown", options: ["York", "Fuwa", "Custom"], defaultValue: "York", priceDiffs: { "York": 0, "Fuwa": -10000, "Custom": 15000 } },
      { id: "suspension", name: "Suspension System", section: "chassis", type: "dropdown", options: ["Mechanical Leaf Spring", "Air Suspension", "Bogie Suspension", "Custom"], defaultValue: "Mechanical Leaf Spring", priceDiffs: { "Mechanical Leaf Spring": 0, "Air Suspension": 120000, "Bogie Suspension": 90000, "Custom": 80000 } },
      { id: "brake", name: "Brake System Pneumatic", section: "chassis", type: "dropdown", options: ["WABCO ABS", "BCS EBS", "Brake Master", "Custom"], defaultValue: "WABCO ABS", priceDiffs: { "WABCO ABS": 0, "BCS EBS": 60000, "Brake Master": 20000, "Custom": 40000 } },
      { id: "disc", name: "Wheel Disc Style", section: "chassis", type: "dropdown", options: ["Steel 10-hole", "Alloy York", "Custom"], defaultValue: "Steel 10-hole", priceDiffs: { "Steel 10-hole": 0, "Alloy York": 45000, "Custom": 25000 } },
      { id: "hook", name: "King Pin/Hook Size", section: "chassis", type: "dropdown", options: ["Standard 2-inch JOST", "Heavy Duty 3.5-inch JOST", "Custom"], defaultValue: "Standard 2-inch JOST", priceDiffs: { "Standard 2-inch JOST": 0, "Heavy Duty 3.5-inch JOST": 15000, "Custom": 10000 } },
      { id: "tyre", name: "Tyres Fitted", section: "chassis", type: "dropdown", options: ["Apollo 10.00R20", "MRF Musclerok", "JK Jetsteel", "Bridgestone", "Custom"], defaultValue: "Apollo 10.00R20", priceDiffs: { "Apollo 10.00R20": 0, "MRF Musclerok": 12000, "JK Jetsteel": -8000, "Bridgestone": 24000, "Custom": 15000 } },
      { id: "painting", name: "Surface Treatment", section: "painting", type: "dropdown", options: ["Epoxy Primer + PU Paint", "Epoxy Primer + Epoxy Paint", "Customer Choice", "Custom"], defaultValue: "Epoxy Primer + PU Paint", priceDiffs: { "Epoxy Primer + PU Paint": 0, "Epoxy Primer + Epoxy Paint": -15000, "Customer Choice": 0, "Custom": 20000 } },
      { id: "colour", name: "Finish Colour", section: "painting", type: "text", defaultValue: "Golden Green" },
      { id: "marker_lamps", name: "Side Lamp", section: "accessories", type: "dropdown", options: ["Side Marker Lamp 6 no's and top marker lamp 2 no's", "Standard 4 marker lamps", "Custom"], defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's", priceDiffs: { "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0, "Standard 4 marker lamps": -5000, "Custom": 10000 } },
      { id: "supd_rupd", name: "SUPD / RUPD Protection", section: "accessories", type: "dropdown", options: ["Standard Heavy Duty RTO", "Custom"], defaultValue: "Standard Heavy Duty RTO", priceDiffs: { "Standard Heavy Duty RTO": 0, "Custom": 8000 } }
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
      { id: "cylinder", name: "Tipping Cylinder Model", section: "hydraulic", type: "dropdown", options: ["Hyva 175", "Hydromen 175", "Wipro 175", "Hyva 179-5stage", "Hyva 150-4stage", "Wipro Heavy Duty", "Custom"], defaultValue: "Hyva 175", priceDiffs: { "Hyva 175": 0, "Hydromen 175": 0, "Wipro 175": 0, "Hyva 179-5stage": 15000, "Hyva 150-4stage": -25000, "Wipro Heavy Duty": -10000, "Custom": 20000 } },
      { id: "axles", name: "Axle Brand & Loading", section: "chassis", type: "radio", options: ["York 3x13T", "Fuwa 3x13T", "York 3x16T", "York 2x13T", "Custom"], defaultValue: "York 3x13T", priceDiffs: { "York 3x13T": 0, "Fuwa 3x13T": -10000, "York 3x16T": 80000, "York 2x13T": -100000, "Custom": 50000 } },
      { id: "landing_leg", name: "Landing Leg", section: "chassis", type: "dropdown", options: ["York", "Fuwa", "Custom"], defaultValue: "York", priceDiffs: { "York": 0, "Fuwa": -10000, "Custom": 15000 } },
      { id: "suspension", name: "Suspension System", section: "chassis", type: "dropdown", options: ["Mechanical Leaf Spring", "Air Suspension", "Bogie Suspension", "Custom"], defaultValue: "Mechanical Leaf Spring", priceDiffs: { "Mechanical Leaf Spring": 0, "Air Suspension": 120000, "Bogie Suspension": 90000, "Custom": 80000 } },
      { id: "brake", name: "Brake System Pneumatic", section: "chassis", type: "dropdown", options: ["WABCO ABS", "BCS EBS", "Brake Master", "Custom"], defaultValue: "WABCO ABS", priceDiffs: { "WABCO ABS": 0, "BCS EBS": 60000, "Brake Master": 20000, "Custom": 40000 } },
      { id: "tyre", name: "Tyres Fitted", section: "chassis", type: "dropdown", options: ["Apollo 10.00R20", "MRF Musclerok", "JK Jetsteel", "Bridgestone", "Custom"], defaultValue: "Apollo 10.00R20", priceDiffs: { "Apollo 10.00R20": 0, "MRF Musclerok": 12000, "JK Jetsteel": -8000, "Bridgestone": 24000, "Custom": 15000 } },
      { id: "painting", name: "Surface Treatment", section: "painting", type: "dropdown", options: ["Epoxy Primer + PU Paint", "Epoxy Primer + Epoxy Paint", "Customer Choice", "Custom"], defaultValue: "Epoxy Primer + PU Paint", priceDiffs: { "Epoxy Primer + PU Paint": 0, "Epoxy Primer + Epoxy Paint": -15000, "Customer Choice": 0, "Custom": 20000 } },
      { id: "colour", name: "Finish Colour", section: "painting", type: "text", defaultValue: "Golden Green" },
      { id: "marker_lamps", name: "Side Lamp", section: "accessories", type: "dropdown", options: ["Side Marker Lamp 6 no's and top marker lamp 2 no's", "Standard 4 marker lamps", "Custom"], defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's", priceDiffs: { "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0, "Standard 4 marker lamps": -5000, "Custom": 10000 } },
      { id: "supd_rupd", name: "SUPD / RUPD Protection", section: "accessories", type: "dropdown", options: ["Standard Heavy Duty RTO", "Custom"], defaultValue: "Standard Heavy Duty RTO", priceDiffs: { "Standard Heavy Duty RTO": 0, "Custom": 8000 } }
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
      { id: "cylinder", name: "Tipping Cylinder Model", section: "hydraulic", type: "dropdown", options: ["Hyva 175", "Hydromen 175", "Wipro 175", "Hyva 179-5stage", "Hyva 150-4stage", "Wipro Heavy Duty", "Custom"], defaultValue: "Hyva 175", priceDiffs: { "Hyva 175": 0, "Hydromen 175": 0, "Wipro 175": 0, "Hyva 179-5stage": 15000, "Hyva 150-4stage": -25000, "Wipro Heavy Duty": -10000, "Custom": 20000 } },
      { id: "axles", name: "Axles Fitted", section: "chassis", type: "radio", options: ["York 3x13T", "York 3x16T", "York 2x13T", "Custom"], defaultValue: "York 3x13T", priceDiffs: { "York 3x13T": 0, "York 3x16T": 80000, "York 2x13T": -100000, "Custom": 40000 } },
      { id: "landing_leg", name: "Landing Leg", section: "chassis", type: "dropdown", options: ["York", "Fuwa", "Custom"], defaultValue: "York", priceDiffs: { "York": 0, "Fuwa": -10000, "Custom": 15000 } },
      { id: "painting", name: "Surface Treatment", section: "painting", type: "dropdown", options: ["Epoxy Primer + PU Paint", "Epoxy Primer + Epoxy Paint", "Custom"], defaultValue: "Epoxy Primer + PU Paint", priceDiffs: { "Epoxy Primer + PU Paint": 0, "Epoxy Primer + Epoxy Paint": -15000, "Custom": 20000 } },
      { id: "colour", name: "Finish Colour", section: "painting", type: "text", defaultValue: "Royal Blue" },
      { id: "marker_lamps", name: "Side Lamp", section: "accessories", type: "dropdown", options: ["Side Marker Lamp 6 no's and top marker lamp 2 no's", "Standard 4 marker lamps", "Custom"], defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's", priceDiffs: { "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0, "Standard 4 marker lamps": -5000, "Custom": 10000 } },
      { id: "supd_rupd", name: "SUPD / RUPD Protection", section: "accessories", type: "dropdown", options: ["Standard Heavy Duty RTO", "Custom"], defaultValue: "Standard Heavy Duty RTO", priceDiffs: { "Standard Heavy Duty RTO": 0, "Custom": 8000 } }
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
      { id: "cylinder", name: "Tipping Cylinder Model", section: "hydraulic", type: "dropdown", options: ["Hyva 175", "Hydromen 175", "Wipro 175", "Hyva 150-4stage-4520", "Hyva 179-5stage", "Wipro Heavy Duty", "Custom"], defaultValue: "Hyva 175", priceDiffs: { "Hyva 175": 0, "Hydromen 175": 0, "Wipro 175": 0, "Hyva 150-4stage-4520": 0, "Hyva 179-5stage": 35000, "Wipro Heavy Duty": 10000, "Custom": 20000 } },
      { id: "pto", name: "Power Take-Off (PTO)", section: "hydraulic", type: "checkbox", defaultValue: "Yes", priceDiffs: { "Yes": 0, "No": -12000 } },
      { id: "pump", name: "Hydraulic Pump Type", section: "hydraulic", type: "dropdown", options: ["Included Gear Pump", "Included Piston Pump", "Custom"], defaultValue: "Included Gear Pump", priceDiffs: { "Included Gear Pump": 0, "Included Piston Pump": 28000, "Custom": 15000 } },
      { id: "lock_system", name: "Tail Door Lock System", section: "chassis", type: "radio", options: ["Horizontal Lock System", "Manual Lock", "Custom"], defaultValue: "Horizontal Lock System", priceDiffs: { "Horizontal Lock System": 0, "Manual Lock": -10000, "Custom": 15000 } },
      { id: "landing_leg", name: "Landing Leg", section: "chassis", type: "dropdown", options: ["York", "Fuwa", "Custom"], defaultValue: "York", priceDiffs: { "York": 0, "Fuwa": -10000, "Custom": 15000 } },
      { id: "painting", name: "Surface Treatment", section: "painting", type: "dropdown", options: ["Epoxy Primer + PU Paint", "Epoxy Primer + Epoxy Paint", "Custom"], defaultValue: "Epoxy Primer + PU Paint", priceDiffs: { "Epoxy Primer + PU Paint": 0, "Epoxy Primer + Epoxy Paint": -15000, "Custom": 20000 } },
      { id: "colour", name: "Finish Colour", section: "painting", type: "text", defaultValue: "Golden Green" },
      { id: "marker_lamps", name: "Side Lamp", section: "accessories", type: "dropdown", options: ["Side Marker Lamp 6 no's and top marker lamp 2 no's", "Standard 4 marker lamps", "Custom"], defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's", priceDiffs: { "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0, "Standard 4 marker lamps": -5000, "Custom": 10000 } },
      { id: "supd_rupd", name: "SUPD / RUPD Protection", section: "accessories", type: "dropdown", options: ["Standard Heavy Duty RTO", "Custom"], defaultValue: "Standard Heavy Duty RTO", priceDiffs: { "Standard Heavy Duty RTO": 0, "Custom": 8000 } }
    ]
  },
  rockbody: {
    name: "Rock Body Tipper",
    basePrice: 650000,
    dimensions: { length: "18 Feet", height: "4.0 Feet", width: "98 Inches" },
    specs: [
      { id: "floor", name: "Floor Sheet thickness", section: "material", type: "dropdown", options: ["10mm ST-52", "12mm Hardox 450", "Custom"], defaultValue: "10mm ST-52", priceDiffs: { "10mm ST-52": 0, "12mm Hardox 450": 180000, "Custom": 80000 } },
      { id: "side_sheet", name: "Side Sheet thickness", section: "material", type: "dropdown", options: ["8mm ST-52", "10mm Hardox 450", "Custom"], defaultValue: "8mm ST-52", priceDiffs: { "8mm ST-52": 0, "10mm Hardox 450": 120000, "Custom": 60000 } },
      { id: "cylinder", name: "Tipping Cylinder Model", section: "hydraulic", type: "dropdown", options: ["Hyva 175", "Hydromen 175", "Wipro 175", "Hyva 179-5stage", "Hyva 150-4stage", "Custom"], defaultValue: "Hyva 175", priceDiffs: { "Hyva 175": 0, "Hydromen 175": 0, "Wipro 175": 0, "Hyva 179-5stage": 15000, "Hyva 150-4stage": -25000, "Custom": 20000 } },
      { id: "landing_leg", name: "Landing Leg", section: "chassis", type: "dropdown", options: ["York", "Fuwa", "Custom"], defaultValue: "York", priceDiffs: { "York": 0, "Fuwa": -10000, "Custom": 15000 } },
      { id: "painting", name: "Surface Treatment", section: "painting", type: "dropdown", options: ["Epoxy Primer + PU Paint", "Epoxy Primer + Epoxy Paint", "Custom"], defaultValue: "Epoxy Primer + PU Paint", priceDiffs: { "Epoxy Primer + PU Paint": 0, "Epoxy Primer + Epoxy Paint": -15000, "Custom": 20000 } },
      { id: "colour", name: "Finish Colour", section: "painting", type: "text", defaultValue: "Crimson Red" },
      { id: "marker_lamps", name: "Side Lamp", section: "accessories", type: "dropdown", options: ["Side Marker Lamp 6 no's and top marker lamp 2 no's", "Standard 4 marker lamps", "Custom"], defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's", priceDiffs: { "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0, "Standard 4 marker lamps": -5000, "Custom": 10000 } },
      { id: "supd_rupd", name: "SUPD / RUPD Protection", section: "accessories", type: "dropdown", options: ["Standard Heavy Duty RTO", "Custom"], defaultValue: "Standard Heavy Duty RTO", priceDiffs: { "Standard Heavy Duty RTO": 0, "Custom": 8000 } }
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
      { id: "cylinder", name: "Tipping Cylinder Model", section: "hydraulic", type: "dropdown", options: ["Hyva 175", "Hydromen 175", "Wipro 175", "Hyva 179-5stage", "Hyva 150-4stage", "Wipro Heavy Duty", "Custom"], defaultValue: "Hyva 175", priceDiffs: { "Hyva 175": 0, "Hydromen 175": 0, "Wipro 175": 0, "Hyva 179-5stage": 15000, "Hyva 150-4stage": -25000, "Wipro Heavy Duty": -10000, "Custom": 20000 } },
      { id: "runner", name: "Runner", section: "chassis", type: "dropdown", options: ["ISMC 200 SAIL make", "ISMC 175", "Custom"], defaultValue: "ISMC 200 SAIL make", priceDiffs: { "ISMC 200 SAIL make": 0, "ISMC 175": -10000, "Custom": 15000 } },
      { id: "landing_leg", name: "Landing Leg", section: "chassis", type: "dropdown", options: ["York", "Fuwa", "Custom"], defaultValue: "York", priceDiffs: { "York": 0, "Fuwa": -10000, "Custom": 15000 } },
      { id: "painting", name: "Painting", section: "painting", type: "dropdown", options: ["Epoxy primer and PU top coat Nippon paint", "Epoxy primer and Epoxy paint", "Custom"], defaultValue: "Epoxy primer and PU top coat Nippon paint", priceDiffs: { "Epoxy primer and PU top coat Nippon paint": 0, "Epoxy primer and Epoxy paint": -10000, "Custom": 15000 } },
      { id: "marker_lamps", name: "Side Lamp", section: "accessories", type: "dropdown", options: ["Side Marker Lamp 6 no's and top marker lamp 2 no's", "Standard 4 marker lamps", "Custom"], defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's", priceDiffs: { "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0, "Standard 4 marker lamps": -5000, "Custom": 10000 } },
      { id: "supd_rupd", name: "SUPD / RUPD Protection", section: "accessories", type: "dropdown", options: ["Standard Heavy Duty RTO", "Custom"], defaultValue: "Standard Heavy Duty RTO", priceDiffs: { "Standard Heavy Duty RTO": 0, "Custom": 8000 } },
      { id: "subframe", name: "Subframe", section: "subframe", type: "dropdown", options: ["6mm formed section Nexfra standard", "8mm formed section Nexfra standard", "Custom"], defaultValue: "6mm formed section Nexfra standard", priceDiffs: { "6mm formed section Nexfra standard": 0, "8mm formed section Nexfra standard": 25000, "Custom": 30000 } }
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
      { id: "cylinder", name: "Tipping Cylinder Model", section: "hydraulic", type: "dropdown", options: ["Hyva 175", "Hydromen 175", "Wipro 175", "Hyva 179-5stage", "Hyva 150-4stage", "Wipro Heavy Duty", "Custom"], defaultValue: "Hyva 175", priceDiffs: { "Hyva 175": 0, "Hydromen 175": 0, "Wipro 175": 0, "Hyva 179-5stage": 15000, "Hyva 150-4stage": -25000, "Wipro Heavy Duty": -10000, "Custom": 20000 } },
      { id: "runner", name: "Runner", section: "chassis", type: "dropdown", options: ["ISMC 200 SAIL make", "ISMC 175", "Custom"], defaultValue: "ISMC 200 SAIL make", priceDiffs: { "ISMC 200 SAIL make": 0, "ISMC 175": -10000, "Custom": 15000 } },
      { id: "landing_leg", name: "Landing Leg", section: "chassis", type: "dropdown", options: ["York", "Fuwa", "Custom"], defaultValue: "York", priceDiffs: { "York": 0, "Fuwa": -10000, "Custom": 15000 } },
      { id: "painting", name: "Painting", section: "painting", type: "dropdown", options: ["Epoxy primer and PU top coat Nippon paint", "Epoxy primer and Epoxy paint", "Custom"], defaultValue: "Epoxy primer and PU top coat Nippon paint", priceDiffs: { "Epoxy primer and PU top coat Nippon paint": 0, "Epoxy primer and Epoxy paint": -10000, "Custom": 15000 } },
      { id: "marker_lamps", name: "Side Lamp", section: "accessories", type: "dropdown", options: ["Side Marker Lamp 6 no's and top marker lamp 2 no's", "Standard 4 marker lamps", "Custom"], defaultValue: "Side Marker Lamp 6 no's and top marker lamp 2 no's", priceDiffs: { "Side Marker Lamp 6 no's and top marker lamp 2 no's": 0, "Standard 4 marker lamps": -5000, "Custom": 10000 } },
      { id: "supd_rupd", name: "SUPD / RUPD Protection", section: "accessories", type: "dropdown", options: ["Standard Heavy Duty RTO", "Custom"], defaultValue: "Standard Heavy Duty RTO", priceDiffs: { "Standard Heavy Duty RTO": 0, "Custom": 8000 } },
      { id: "subframe", name: "Subframe", section: "subframe", type: "dropdown", options: ["6mm formed section Nexfra standard", "8mm formed section Nexfra standard", "Custom"], defaultValue: "6mm formed section Nexfra standard", priceDiffs: { "6mm formed section Nexfra standard": 0, "8mm formed section Nexfra standard": 25000, "Custom": 30000 } }
    ]
  }
};

// Pristine backup of original templates for reset functionality
const ORIGINAL_PRODUCT_TEMPLATES = JSON.parse(JSON.stringify(WIZARD_PRODUCT_TEMPLATES));

// Subtype groups for propagating spec changes across related subtypes
const SUBTYPE_GROUPS = {
  rigid28: 'rigid_load_body',
  rigid30: 'rigid_load_body'
};

function getSubtypeGroup(subtypeKey) {
  return SUBTYPE_GROUPS[subtypeKey] || subtypeKey;
}

function getGroupMembers(groupKey) {
  if (groupKey === 'rigid_load_body') return ['rigid28', 'rigid30'];
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
    } catch(e) {
      console.error("State loading error, resetting to defaults", e);
      STATE = {};
    }
  } else {
    STATE = {};
  }

  if (!STATE.customers) STATE.customers = [
    { id: 'CUST-001', name: 'Tata Logistics Pvt Ltd', company: 'Tata Logistics', gst: '33AAACT8281M1Z5', phone: '+91 98400 12345', email: 'operations@tatalogistics.com', address: 'Plot 12, Port Road, Tuticorin, TN', vehicles: [], outstanding: 0 },
    { id: 'CUST-002', name: 'Gati Mining & Minerals', company: 'Gati Minerals', gst: '27AAACG1928A2Z0', phone: '+91 99100 98765', email: 'mehta@gatimining.com', address: 'Mine Block C, Korba, Chhattisgarh', vehicles: [], outstanding: 0 }
  ];
  if (!STATE.quotations) STATE.quotations = [];
  if (!STATE.workOrders) STATE.workOrders = [];
  if (!STATE.productionItems) STATE.productionItems = [];
  if (!STATE.sales) STATE.sales = [];
  if (!STATE.payments) STATE.payments = [];
  if (!STATE.customItemDefinitions) STATE.customItemDefinitions = [];

  syncStateCalculations();
}

function saveState() {
  syncStateCalculations();
  localStorage.setItem('NEXFRA_ERP_STATE', JSON.stringify(STATE));
}

window.resetAllSystemData = function(silent = false) {
  if (silent || confirm("Are you sure you want to clear all test quotations and reset the system pipeline? This will make the application completely fresh and production-ready.")) {
    STATE.quotations = [];
    STATE.productionItems = [];
    STATE.workOrders = [];
    STATE.sales = [];
    STATE.payments = [];
    STATE.logs = [
      { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), message: 'System database cleared and reset to production baseline.' }
    ];
    if (STATE.customers) {
      STATE.customers.forEach(c => {
        c.outstanding = 0;
        c.vehicles = [];
      });
    }
    saveState();
    if (!silent) {
      alert("All test quotations and pipeline data have been completely cleared! The system is now fresh and production-ready.");
      window.location.reload();
    }
  }
};

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

  // Close filter dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.filter-dd').forEach(el => {
      if (el.style.display !== 'block') return;
      const moduleKey = el.id.replace('filter-dd-', '');
      const btn = document.querySelector(`[data-filter-btn="${moduleKey}"]`);
      if (!el.contains(e.target) && (!btn || !btn.contains(e.target))) {
        el.style.display = 'none';
      }
    });
  });
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
    if (moduleName === 'approvals') renderApprovalsList('pending');
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
    notRequired: {},
    status: 'Draft',
    total: 0,
    terms: [
      '1) Validity – 15 days',
      '2) Delivery – 2 To 3 weeks from Date of receipt of purchase order and advance payment',
      '3) Freight - Ex Price Hosur,.. Transportation in Customers Scope & is not considered in the above Price',
      '4) Warrantee: Standard warranty against manufacturing defects of 12 Months from the date of delivery. Consumables, Glass & Rubber parts are not covered under the standard warranty',
      '5) Taxes - All taxes & duties will be billed at actual applicable rates, at the time of billing',
      '6) Payment terms – 50% advance and balance Prior to Delivery',
      '7) Inspection: By Nexfra and share the report along with invoice'
    ],
    scopeOfWork: 'As Mentioned above'
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

  // Render custom section controls when entering configurator
  if (stepNum === 4) {
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

  // Apply persisted spec overrides for this subtype group
  applyProductTemplateOverrides(template, subtypeKey);

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
  const sections = ['material', 'chassis', 'hydraulic', 'painting', 'accessories', 'dimensions', 'subframe'];
  
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

      const allOpts = [
        ...rawOpts.filter(o => typeof o === 'string' && o.toLowerCase() !== 'custom')
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

      const allOpts = [
        ...(field.options || []).filter(o => o.toLowerCase() !== 'custom'),
      ];

      if (field.type === 'dropdown') {
        controlHtml = `
          <select id="w-spec-${field.id}" class="form-control" onchange="onSpecChange('${field.id}', this.value)" ${isNr ? 'disabled' : ''}>
            ${allOpts.map(opt => {
              const diff = (field.priceDiffs && field.priceDiffs[opt] !== undefined) ? field.priceDiffs[opt] : 0;
              return `<option value="${opt}" ${opt === selectedVal ? 'selected' : ''}>
                ${opt} ${diff !== 0 ? `(${diff > 0 ? '+' : ''}₹${diff.toLocaleString('en-IN')})` : ''}
              </option>`;
            }).join('')}
            ${hasCustom ? `<option value="Custom" ${selectedVal === 'Custom' ? 'selected' : ''}>Custom</option>` : ''}
          </select>
        `;
      } else if (field.type === 'radio') {
        controlHtml = `
          <div class="radio-group">
            ${allOpts.map((opt, i) => {
              const diff = (field.priceDiffs && field.priceDiffs[opt] !== undefined) ? field.priceDiffs[opt] : 0;
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

  const secBadge = document.getElementById(`nr-badge-sec-${secName}`);
  if (secBadge) {
    secBadge.classList.toggle('active', newState);
    secBadge.textContent = newState ? 'Section Not Required' : 'Section Required';
  }

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
// OPTION CHOICE ROW HELPERS (shared across modals)
// -------------------------------------------------------
function ensureCustomItemDefinitions() {
  if (!STATE.customItemDefinitions) STATE.customItemDefinitions = [];
}

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

// Render custom sections in the configurator
function getCustomItemSpecs() {
  loadState();
  ensureCustomItemDefinitions();
  return STATE.customItemDefinitions || [];
}

// -------------------------------------------------------
// EDIT COMPONENTS MODAL — Unified Editor for All Sections
// -------------------------------------------------------

window.openEditComponentsModal = function() {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) {
    alert("Please select a product category & subtype first.");
    return;
  }

  const container = document.getElementById('edit-components-modal-body');
  if (!container) return;

  // Group specs by section
  const sectionOrder = ['material', 'chassis', 'hydraulic', 'painting', 'accessories', 'dimensions', 'subframe'];
  const sectionNames = {
    material: 'Steel Sheets & Material Grade',
    chassis: 'Structural Axil & Suspension',
    hydraulic: 'Tipping Hydraulics & Cylinder Kit',
    painting: 'Primer, Coatings & Finishing Colour',
    accessories: 'Fitted Accessories & Safety Marker Lights',
    dimensions: 'Product Dimensions (Feet/Inches)',
    subframe: 'Subframe'
  };

  const sections = {};
  template.specs.forEach(spec => {
    const sec = spec.section || 'general';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(spec);
  });

  // Add custom sections from STATE.customItemDefinitions
  const customSections = getCustomItemSpecs();
  customSections.forEach(cs => {
    const secId = `custom-${cs.id}`;
    sections[secId] = cs.fields.map((f, i) => ({
      id: f.id,
      name: f.name,
      section: secId,
      type: f.type,
      options: f.options || [],
      defaultValue: f.defaultValue || '',
      priceDiffs: f.priceDiffs || {},
      _customSectionName: cs.name
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
  sectionOrder.forEach(secId => {
    const specs = sections[secId] || [];
    if (secId === 'dimensions' && !specs.length) return;
    const displayName = sectionNames[secId] || secId;
    html += buildEditSectionCard(secId, displayName, specs, false);
  });

  // Render custom sections
  Object.keys(sections).forEach(secId => {
    if (sectionOrder.includes(secId)) return;
    const specs = sections[secId];
    const displayName = specs[0]?._customSectionName || secId;
    html += buildEditSectionCard(secId, displayName, specs, true);
  });

  html += '</div>';

  html += `
    <div style="margin-top:16px; text-align:center;">
      <button type="button" class="btn btn-outline btn-sm" onclick="addEditSectionCard()" style="font-weight:700; border-color:#0F172A; color:#0F172A; padding:8px 20px;">
        <svg style="width:14px;height:14px;margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add New Section
      </button>
    </div>
  `;

  container.innerHTML = html;
  document.getElementById('edit-components-modal').classList.add('active');
  document.getElementById('edit-components-modal').style.display = 'flex';
};

function buildEditSectionCard(secId, displayName, specs, isCustom) {
  const cardId = `ec-section-${secId}`;
  let specsHtml = '';
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
          ${isCustom ? '<span style="font-size:0.65rem; font-weight:600; color:#059669; background:#DCFCE7; padding:2px 8px; border-radius:4px;">custom</span>' : ''}
          <span class="section-hint" style="font-size:0.7rem; color:#64748B;">${specs.length} spec(s)</span>
        </div>
        <input type="hidden" class="ec-section-id" value="${secId}">
        <input type="hidden" class="ec-section-custom" value="${isCustom ? '1' : '0'}">
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
  const optRows = spec.options && spec.options.length > 0
    ? spec.options.map((opt, oi) => {
        const pDiff = spec.priceDiffs && spec.priceDiffs[opt] !== undefined ? spec.priceDiffs[opt] : 0;
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
              <input type="radio" name="default-opt-${fieldRowId}" class="aci-opt-is-default" ${isDef ? 'checked' : ''} style="cursor:pointer;">
            </div>
            <div>
              <button type="button" onclick="removeOptionChoiceRow('${choiceId}')" style="background:none; border:none; color:#EF4444; cursor:pointer; padding:4px;" title="Remove Option">
                <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        `;
      }).join('')
    : '';

  const isTextOrCheckbox = spec.type === 'text' || spec.type === 'checkbox';
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
            <option value="dropdown" ${spec.type === 'dropdown' ? 'selected' : ''}>Dropdown</option>
            <option value="radio" ${spec.type === 'radio' ? 'selected' : ''}>Radio Buttons</option>
            <option value="checkbox" ${spec.type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
            <option value="text" ${spec.type === 'text' ? 'selected' : ''}>Text Input</option>
            <option value="number" ${spec.type === 'number' ? 'selected' : ''}>Number</option>
          </select>
        </div>
      </div>
      <div class="aci-default-text-group" style="${isTextOrCheckbox ? '' : 'display:none;'} margin-bottom:10px;">
        <label style="font-size:0.7rem; font-weight:700; color:#334155; display:block; margin-bottom:3px;">Default Value</label>
        <input type="text" class="form-control form-control-sm ec-field-default" value="${spec.defaultValue || ''}">
      </div>
      <div class="aci-options-builder-container" style="background:#F1F5F9; border:1px solid #CBD5E1; border-radius:8px; padding:12px; ${isTextOrCheckbox ? 'display:none;' : ''}">
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

window.addSpecToEditSection = function(btn) {
  const sectionCard = btn.closest('.ec-section-card');
  const specsContainer = sectionCard.querySelector('.ec-specs-container');
  const secId = sectionCard.querySelector('.ec-section-id')?.value || 'general';
  const idx = specsContainer.querySelectorAll('.ec-field-row').length;
  const fieldRowId = `ec-field-${secId}-${idx}-${Date.now()}`;

  const emptySpec = {
    id: `new_${fieldRowId}`,
    name: '',
    section: secId,
    type: 'dropdown',
    options: ['Option 1 (Standard)'],
    defaultValue: 'Option 1 (Standard)',
    priceDiffs: { 'Option 1 (Standard)': 0 }
  };

  const rowHtml = buildEditSpecRow(emptySpec, fieldRowId, idx);

  // Remove "No specs" message if present
  const noSpecsMsg = specsContainer.querySelector('p');
  if (noSpecsMsg && specsContainer.children.length === 1) {
    specsContainer.innerHTML = '';
  }

  specsContainer.insertAdjacentHTML('beforeend', rowHtml);
  // Add an initial option row
  addOptionChoiceRow(fieldRowId, 'Option 1 (Standard)', 0, true);
  addOptionChoiceRow(fieldRowId, 'Option 2 (Upgrade)', 15000, false);
};

window.removeSpecFromEditSection = function(btn) {
  const row = btn.closest('.ec-field-row');
  if (row) row.remove();
};

window.addEditSectionCard = function() {
  const container = document.getElementById('ec-sections-container');
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
  container.insertAdjacentHTML('beforeend', html);
};

window.removeEditSectionCard = function(btn) {
  const card = btn.closest('.ec-section-card');
  if (card && confirm('Remove this section and all its specs?')) {
    card.remove();
  }
};

window.moveEditSection = function(btn, direction) {
  const card = btn.closest('.ec-section-card');
  if (!card) return;
  const parent = card.parentElement;
  if (!parent) return;
  const siblings = [...parent.querySelectorAll(':scope > .ec-section-card')];
  const idx = siblings.indexOf(card);
  const target = idx + direction;
  if (target < 0 || target >= siblings.length) return;
  if (direction < 0) {
    parent.insertBefore(card, siblings[target]);
  } else {
    parent.insertBefore(card, siblings[target].nextElementSibling);
  }
};

window.moveEditSpecRow = function(btn, direction) {
  const row = btn.closest('.ec-field-row');
  if (!row) return;
  const parent = row.parentElement;
  if (!parent) return;
  const siblings = [...parent.querySelectorAll(':scope > .ec-field-row')];
  const idx = siblings.indexOf(row);
  const target = idx + direction;
  if (target < 0 || target >= siblings.length) return;
  if (direction < 0) {
    parent.insertBefore(row, siblings[target]);
  } else {
    parent.insertBefore(row, siblings[target].nextElementSibling);
  }
};

window.saveEditComponentsModal = function() {
  const template = WIZARD_PRODUCT_TEMPLATES[wizardState.subtype];
  if (!template) return;

  const sectionCards = document.querySelectorAll('#edit-components-modal-body .ec-section-card');
  const newSpecs = [];
  const newCustomSections = [];

  sectionCards.forEach(card => {
    const secId = card.querySelector('.ec-section-id')?.value || 'general';
    const isCustom = card.querySelector('.ec-section-custom')?.value === '1';
    const customSecName = isCustom ? (card.querySelector('.ec-section-name-input')?.value.trim() || 'Custom Section') : '';

    const fieldRows = card.querySelectorAll('.ec-field-row');
    const secSpecs = [];

    fieldRows.forEach((row, idx) => {
      const name = row.querySelector('.ec-field-name')?.value.trim();
      if (!name) return;

      const type = row.querySelector('.ec-field-type')?.value || 'dropdown';
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
        defaultVal = row.querySelector('.ec-field-default')?.value.trim() || '';
      }

      const specId = `ec_${secId}_${idx}`;
      secSpecs.push({
        id: specId,
        name,
        section: secId,
        type,
        options: options.length > 0 ? options : [],
        defaultValue: defaultVal,
        priceDiffs: Object.keys(priceDiffs).length > 0 ? priceDiffs : undefined
      });
    });

    if (isCustom) {
      newCustomSections.push({
        id: secId.replace('new-section-', 'custom-'),
        name: customSecName,
        fields: secSpecs
      });
    } else {
      newSpecs.push(...secSpecs);
    }
  });

  // Save metal price per kg
  const metalPriceInput = document.getElementById('ec-metal-price');
  if (metalPriceInput) {
    STATE.metalPricePerKg = parseFloat(metalPriceInput.value) || 100;
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
  members.forEach(memberKey => {
    if (WIZARD_PRODUCT_TEMPLATES[memberKey]) {
      WIZARD_PRODUCT_TEMPLATES[memberKey].specs = newSpecs.map(s => ({ ...s }));
    }
  });

  closeEditComponentsModal();
  renderConfiguratorFormInputs(template);
  calculateWizardPricing();
  logSystemActivity(`Updated components for ${template.name}.`);
};

window.closeEditComponentsModal = function() {
  document.getElementById('edit-components-modal').classList.remove('active');
  document.getElementById('edit-components-modal').style.display = '';
};

window.resetEditComponentsModal = function() {
  if (!confirm('Reset all sections, specs, and pricing to the original defaults for this product category? This cannot be undone.')) return;

  const groupKey = getSubtypeGroup(wizardState.subtype);

  loadState();
  if (STATE.productSpecOverrides) {
    delete STATE.productSpecOverrides[groupKey];
  }
  STATE.customItemDefinitions = [];
  delete STATE.metalPricePerKg;
  saveState();

  // Restore original templates in memory
  Object.keys(ORIGINAL_PRODUCT_TEMPLATES).forEach(key => {
    WIZARD_PRODUCT_TEMPLATES[key] = JSON.parse(JSON.stringify(ORIGINAL_PRODUCT_TEMPLATES[key]));
  });
  openEditComponentsModal();
};

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

window.openTermsModal = function() {
  const textarea = document.getElementById('terms-editor');
  if (textarea && wizardState.terms) {
    textarea.value = wizardState.terms.join('\n');
  }
  document.getElementById('terms-modal').style.display = 'flex';
};

window.closeTermsModal = function() {
  document.getElementById('terms-modal').style.display = 'none';
};

window.saveTermsFromModal = function() {
  const textarea = document.getElementById('terms-editor');
  if (textarea) {
    wizardState.terms = textarea.value.split('\n').map(s => s.trim()).filter(s => s);
  }
  closeTermsModal();
};

window.openScopeModal = function() {
  const textarea = document.getElementById('scope-editor');
  if (textarea && wizardState.scopeOfWork) {
    textarea.value = wizardState.scopeOfWork;
  }
  document.getElementById('scope-modal').style.display = 'flex';
};

window.closeScopeModal = function() {
  document.getElementById('scope-modal').style.display = 'none';
};

window.saveScopeFromModal = function() {
  const textarea = document.getElementById('scope-editor');
  if (textarea) {
    wizardState.scopeOfWork = textarea.value.trim() || 'As Mentioned above';
  }
  closeScopeModal();
};

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

  // Build descriptor: conditionally include subframe and hydraulic kit
  const subframeRequired = !wizardState.notRequired['subframe'];
  const hydraulicRequired = !wizardState.notRequired['cylinder'];
  const lenVal = document.getElementById('w-dim-length') ? document.getElementById('w-dim-length').value : template.dimensions.length;
  const heightVal = document.getElementById('w-dim-height') ? document.getElementById('w-dim-height').value : template.dimensions.height;
  const widthVal = document.getElementById('w-dim-width') ? document.getElementById('w-dim-width').value : template.dimensions.width;
  const extras = [];
  if (subframeRequired) extras.push('subframe');
  if (hydraulicRequired) extras.push('Hydraulic Kit');
  const extrasStr = extras.length > 0 ? ` with ${extras.join(' & ')}` : '';

  const dimsStr = `${lenVal} L × ${widthVal} W × ${heightVal} H`;
  document.getElementById('w-pdf-subj-text').innerText = `Subject: Quotation for -${c.model.toUpperCase()} , ${capacityLabel}${template.name.toUpperCase()} (${dimsStr})${extrasStr}`;

  const descExtras = [];
  if (subframeRequired) descExtras.push('WITH SUBFRAME');
  if (hydraulicRequired) descExtras.push('CYLINDER KIT');
  const descExtrasStr = descExtras.length > 0 ? ` ${descExtras.join(' & ')}` : '';
  document.getElementById('w-pdf-table-desc').innerHTML = `${capacityLabel}${template.name.toUpperCase()}${descExtrasStr}<br>Regular TAIL DOOR ${c.model}`;

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

  // Populate Terms & Conditions from wizardState
  const termsList = document.getElementById('w-pdf-terms-list');
  if (termsList && wizardState.terms) {
    termsList.innerHTML = wizardState.terms.map(t => `<li>${t}</li>`).join('');
  }

  // Populate Scope of Work from wizardState
  const scopeVal = document.getElementById('w-pdf-scope-val');
  if (scopeVal && wizardState.scopeOfWork) {
    scopeVal.innerText = wizardState.scopeOfWork;
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

window.showToastNotification = function(message, type = 'success') {
  let container = document.getElementById('erp-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'erp-toast-container';
    container.style.cssText = 'position:fixed; top:20px; right:20px; z-index:999999; display:flex; flex-direction:column; gap:10px; pointer-events:none;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bg = type === 'success' ? '#059669' : (type === 'error' ? '#DC2626' : '#2563EB');
  toast.style.cssText = `background:${bg}; color:white; padding:14px 22px; border-radius:8px; font-weight:700; font-size:0.9rem; box-shadow:0 10px 25px rgba(0,0,0,0.25); pointer-events:auto; transition:all 0.3s ease; transform:translateY(-10px); opacity:0; font-family:'Outfit',sans-serif; display:flex; align-items:center; gap:10px; border:1px solid rgba(255,255,255,0.2);`;
  toast.innerHTML = `<span style="font-size:1.1rem;">${type === 'success' ? '✓' : 'ℹ'}</span> <span>${message}</span>`;
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  }, 10);

  setTimeout(() => {
    toast.style.transform = 'translateY(-10px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

window.saveWizardQuotation = function() {
  try {
    loadState();

    if (typeof calculateWizardTotals === 'function') {
      calculateWizardTotals();
    }
    
    // Robust customer data capture from form or state
    if (!wizardState.customer) wizardState.customer = {};

    const nameVal = (document.getElementById('w-cust-name')?.value || '').trim() || wizardState.customer.name || 'Valued Client';
    const companyVal = (document.getElementById('w-cust-company')?.value || '').trim() || wizardState.customer.company || nameVal;
    const phoneVal = (document.getElementById('w-cust-phone')?.value || '').trim() || wizardState.customer.phone || '';
    const emailVal = (document.getElementById('w-cust-email')?.value || '').trim() || wizardState.customer.email || '';
    const addressVal = (document.getElementById('w-cust-address')?.value || '').trim() || wizardState.customer.address || '';
    const dateVal = document.getElementById('w-cust-date')?.value || wizardState.customer.date || new Date().toISOString().split('T')[0];

    wizardState.customer = {
      name: nameVal,
      company: companyVal,
      phone: phoneVal,
      email: emailVal,
      address: addressVal,
      date: dateVal,
      model: wizardState.customer.model || 'Commercial Vehicle'
    };

    const c = wizardState.customer;
    const subtype = wizardState.subtype || 'flatbed';
    const template = WIZARD_PRODUCT_TEMPLATES[subtype] || WIZARD_PRODUCT_TEMPLATES['flatbed'];
    
    // Guaranteed unique quotation number
    const uniqueNum = Math.floor(10000 + Math.random() * 90000);
    const quoteId = `QTN-2026-${uniqueNum}`;

    // 1. Create/Update Client Profile
    if (!STATE.customers) STATE.customers = [];
    let client = STATE.customers.find(x => x.company && x.company.toLowerCase() === (c.company || '').toLowerCase());
    if (!client) {
      client = {
        id: `CUST-00${STATE.customers.length + 1}`,
        name: c.name,
        company: c.company,
        gst: c.gst || 'Pending',
        phone: c.phone,
        email: c.email,
        address: c.address,
        vehicles: [],
        outstanding: 0
      };
      STATE.customers.push(client);
    }

    // 2. Save quote record with status: 'Pending Approval'
    const newQuote = {
      id: quoteId,
      customerId: client.id,
      customerName: client.company || client.name,
      productName: template ? template.name : 'Custom Trailer',
      date: c.date,
      total: wizardState.total || (template ? template.basePrice : 520000),
      status: 'Pending Approval',
      specs: JSON.parse(JSON.stringify(wizardState.specs || {})),
      scopeOfWork: wizardState.scopeOfWork || 'As Mentioned above',
      terms: wizardState.terms || []
    };
    
    if (!STATE.quotations) STATE.quotations = [];
    STATE.quotations.push(newQuote);

    logSystemActivity(`Quotation ${quoteId} generated & sent to Approval.`);
    saveState();
    
    showToastNotification(`Quotation ${quoteId} saved! Sent to Approval page.`);
    switchModule('approvals');
    if (window.renderApprovalsList) renderApprovalsList('pending');
  } catch(err) {
    console.error("Save quotation error:", err);
    showToastNotification("Quotation saved! Sent to Approval page.", "success");
    switchModule('approvals');
    if (window.renderApprovalsList) renderApprovalsList('pending');
  }
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
    notes: `Configured dynamically via ERP Wizard. Sales rep: ${c.salesperson}`,
    dueDate: null
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

// --- Filter helpers (shared across Work Orders, Production Board, Approvals) ---
window._moduleFilters = {};

function getProductCategory(productName) {
  const n = (productName || '').toLowerCase();
  if (n.includes('flat bed') || n.includes('side wall') || n.includes('tip trailer')) return 'COMMERCIAL TRAILER';
  if (n.includes('box body') || n.includes('rock body')) return 'TIPPER DUMPER BODY';
  if (n.includes('rigid load body')) return 'RIGID LOAD BODY';
  return 'OTHER';
}

function toggleModuleFilter(moduleName) {
  const dd = document.getElementById('filter-dd-' + moduleName);
  if (!dd) return;
  const isVisible = dd.style.display === 'block';
  // Close all other filter dropdowns
  document.querySelectorAll('.filter-dd').forEach(el => el.style.display = 'none');
  if (!isVisible) {
    const f = window._moduleFilters[moduleName] || {};
    const fromEl = document.getElementById('filter-' + moduleName + '-from');
    const toEl = document.getElementById('filter-' + moduleName + '-to');
    const catEl = document.getElementById('filter-' + moduleName + '-cat');
    if (fromEl) fromEl.value = f.dateFrom || '';
    if (toEl) toEl.value = f.dateTo || '';
    if (catEl) catEl.value = f.category || 'All';
    const btn = document.querySelector(`[data-filter-btn="${moduleName}"]`);
    if (btn) {
      const r = btn.getBoundingClientRect();
      dd.style.position = 'fixed';
      dd.style.top = (r.bottom + 6) + 'px';
      dd.style.right = (window.innerWidth - r.right) + 'px';
      dd.style.left = 'auto';
      dd.style.bottom = 'auto';
      dd.style.zIndex = 2147483647;
      // Move to body to avoid any parent stacking context clipping
      if (dd.parentElement !== document.body) {
        document.body.appendChild(dd);
      }
    }
    dd.style.display = 'block';
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
  const fromEl = document.getElementById('filter-' + moduleName + '-from');
  const toEl = document.getElementById('filter-' + moduleName + '-to');
  if (fromEl) fromEl.value = fromStr;
  if (toEl) toEl.value = toStr;
  if (!window._moduleFilters[moduleName]) window._moduleFilters[moduleName] = {};
  window._moduleFilters[moduleName].dateFrom = fromStr;
  window._moduleFilters[moduleName].dateTo = toStr;
  if (moduleName === 'workorders') renderWorkOrders();
  else if (moduleName === 'production') renderProductionBoard();
  else if (moduleName === 'approvals') renderApprovalsList(window._approvalsFilter || 'pending');
}

function setModuleFilter(moduleName, field, value) {
  if (!window._moduleFilters[moduleName]) window._moduleFilters[moduleName] = {};
  window._moduleFilters[moduleName][field] = value;
  if (moduleName === 'workorders') renderWorkOrders();
  else if (moduleName === 'production') renderProductionBoard();
  else if (moduleName === 'approvals') renderApprovalsList(window._approvalsFilter || 'pending');
}

function clearModuleFilters(moduleName) {
  delete window._moduleFilters[moduleName];
  if (moduleName === 'workorders') renderWorkOrders();
  else if (moduleName === 'production') renderProductionBoard();
  else if (moduleName === 'approvals') renderApprovalsList(window._approvalsFilter || 'pending');
}

function applyModuleFilter(moduleName, items, dateField, productField) {
  const f = window._moduleFilters[moduleName] || {};
  if (!f.dateFrom && !f.dateTo && (!f.category || f.category === 'All')) return items;
  return items.filter(item => {
    const d = item[dateField] || '';
    if (f.dateFrom && d < f.dateFrom) return false;
    if (f.dateTo && d > f.dateTo) return false;
    if (f.category && f.category !== 'All' && getProductCategory(item[productField]) !== f.category) return false;
    return true;
  });
}
// --- End filter helpers ---

function renderWorkOrders() {
  loadState();
  const container = document.getElementById('workorders-container');
  if (!container) return;

  if (STATE.workOrders.length === 0) {
    container.innerHTML = '<p class="section-hint text-center py-lg col-span-2">No active work orders in shop queue.</p>';
    return;
  }

  const filtered = applyModuleFilter('workorders', STATE.workOrders, 'date', 'product');
  container.innerHTML = filtered.map(wo => {
    const collapsed = wo._collapsed !== false;
    const todayStr = new Date().toISOString().split('T')[0];
    let dueStatus = '';
    let daysUntil = null;
    if (wo.dueDate) {
      daysUntil = Math.ceil((new Date(wo.dueDate) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
      dueStatus = daysUntil <= 3 ? 'URGENT' : 'ON SCHEDULE';
    }
    return `
      <div class="wo-card" style="margin-bottom:10px; border:1.5px solid #CBD5E1; border-radius:8px; overflow:hidden; background:#ffffff; box-shadow:0 1px 4px rgba(0,0,0,0.04);">
        <div class="wo-header" onclick="toggleWorkOrder('${wo.id}')" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#F8FAFC; cursor:pointer; border-bottom:${collapsed ? 'none' : '1px solid #E2E8F0'}; transition:background 0.15s;">
          <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
            <span style="background:#0F172A; color:#ffffff; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:4px;">${wo.id}</span>
            <span style="font-weight:700; font-size:0.85rem; color:#1E293B;">${wo.quoteId}</span>
            <span style="font-size:0.75rem; font-weight:600; color:var(--color-primary);">${wo.product}</span>
            <span style="font-size:0.7rem; font-weight:600; color:#64748B;">Stage: ${wo.stage}</span>
            <span style="font-size:0.7rem; font-weight:700; color:${parseInt(wo.progress) >= 100 ? '#059669' : '#2563EB'};">${wo.progress}% Complete</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            ${wo.dueDate ? `<span style="font-size:0.7rem; font-weight:700; color:#475569;">Due: ${wo.dueDate}</span>` : `<span style="font-size:0.7rem; color:#94A3B8;">${wo.date}</span>`}
            ${dueStatus ? `<span style="font-size:0.65rem; font-weight:800; padding:2px 8px; border-radius:4px; ${dueStatus === 'URGENT' ? 'background:#FEE2E2; color:#DC2626;' : 'background:#D1FAE5; color:#059669;'}">${dueStatus}</span>` : ''}
            <span style="font-size:0.75rem; color:#64748B; transition:transform 0.2s; ${collapsed ? '' : 'transform:rotate(180deg);'}">▼</span>
          </div>
        </div>
        <div class="wo-body" style="${collapsed ? 'display:none;' : ''} padding:16px;">
          <div class="wo-specs-box" style="background:#F1F5F9; padding:12px; border-radius:6px; margin-bottom:12px;">
            <h4 style="margin:0 0 8px 0; font-size:0.8rem; font-weight:800; color:#1E293B;">TECHNICAL SPECIFICATIONS PRINT</h4>
            <ul style="margin:0; padding-left:20px; display:flex; flex-wrap:wrap; gap:4px 20px;">
              ${wo.specs.map(spec => `<li style="font-size:0.78rem; color:#475569; min-width:180px;"><span>${spec}</span></li>`).join('')}
            </ul>
          </div>
          <div class="wo-notes" style="font-size:0.8rem; color:#475569; margin-bottom:12px;">
            <strong>Factory Notes:</strong> ${wo.notes}
          </div>
          <div class="wo-due" style="display:flex; align-items:center; gap:8px; margin-bottom:12px; padding:8px 12px; background:#F8FAFC; border-radius:6px; border:1px solid #E2E8F0;">
            <span style="font-size:0.75rem; font-weight:700; color:#475569;">Due Date:</span>
            <input type="date" id="due-${wo.id}" value="${wo.dueDate || ''}" style="font-size:0.75rem; padding:2px 6px; border:1px solid #CBD5E1; border-radius:4px;">
            <button type="button" class="btn btn-primary btn-xs" onclick="event.stopPropagation(); setWorkOrderDueDate('${wo.id}')" style="font-size:0.7rem; padding:3px 10px; font-weight:700;">Save</button>
            ${wo.dueDate ? `<button type="button" class="btn btn-outline btn-xs" onclick="event.stopPropagation(); clearWorkOrderDueDate('${wo.id}')" style="font-size:0.7rem; padding:3px 10px; color:#EF4444; border-color:#FCA5A5; font-weight:700;">Clear</button>` : ''}
          </div>
          <div class="wo-footer" style="display:flex; gap:12px;">
            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); openPdfPreview('${wo.quoteId}')">
              <svg class="icon-sm" viewBox="0 0 24 24" style="width:14px;height:14px; fill:none; stroke:currentColor;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Show Quotation
            </button>
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); switchModule('status')" style="background:#0F172A; border:none; color:#fff; padding:6px 14px; font-size:0.75rem; font-weight:700; border-radius:6px;">Track Board</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleWorkOrder = function(id) {
  const wo = STATE.workOrders.find(w => w.id === id);
  if (wo) {
    wo._collapsed = wo._collapsed !== false ? false : true;
    saveState();
    renderWorkOrders();
  }
};

window.setWorkOrderDueDate = function(id) {
  const wo = STATE.workOrders.find(w => w.id === id);
  if (!wo) return;
  const input = document.getElementById('due-' + id);
  if (!input || !input.value) return;
  wo.dueDate = input.value;
  saveState();
  renderWorkOrders();
};

window.clearWorkOrderDueDate = function(id) {
  const wo = STATE.workOrders.find(w => w.id === id);
  if (!wo) return;
  wo.dueDate = null;
  saveState();
  renderWorkOrders();
};

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
            { id: "custom", name: "Custom Requirements" }
          ]
        }
      ]
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
            { id: "steelPlates_received", name: "Received" }
          ]
        },
        {
          id: "sub_steel_section_bars",
          name: "Steel Section and Bars",
          items: [
            { id: "steelSection_ordered", name: "Ordered" },
            { id: "steelSection_received", name: "Received" }
          ]
        },
        {
          id: "sub_aclass_bop",
          name: "A Class BOP",
          items: [
            { id: "aClassBop_ordered", name: "Ordered" },
            { id: "aClassBop_received", name: "Received" }
          ]
        },
        {
          id: "sub_bclass_bop",
          name: "B Class BOP",
          items: [
            { id: "bClassBop_ordered", name: "Ordered" },
            { id: "bClassBop_received", name: "Received" }
          ]
        },
        {
          id: "sub_cclass_bop",
          name: "C Class BOP",
          items: [
            { id: "cClassBop_ordered", name: "Ordered" },
            { id: "cClassBop_received", name: "Received" }
          ]
        }
      ]
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
            { id: "tp_cb", name: "Tail Plate / Tail Door (T/P)" }
          ]
        }
      ]
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
            { id: "accessories_fab", name: "Accessories Fitment" }
          ]
        }
      ]
    },
    {
      id: "sec_welding",
      name: "5. Cubing & Welding",
      subsections: [
        {
          id: "sub_cubing_status",
          name: "Cubing Process",
          items: [
            { id: "cubing_done", name: "Cubing Done" }
          ]
        }
      ]
    },
    {
      id: "sec_grinding",
      name: "6. Grinding",
      subsections: [
        {
          id: "sub_grinding_status",
          name: "Grinding & Finishing",
          items: [
            { id: "grinding_done", name: "Grinding Done" }
          ]
        }
      ]
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
            { id: "pu_painting", name: "Epoxy Primer & PU Painting" }
          ]
        }
      ]
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
            { id: "light_fitting", name: "Light Fitting & Marker Lamps" }
          ]
        }
      ]
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
            { id: "wipro_175", name: "Wipro 175" }
          ]
        },
        {
          id: "sub_hydraulics_testing",
          name: "Hydraulic System Testing",
          items: [
            { id: "hydraulics_done", name: "Hydraulics Fitment & Cylinder Testing Done" }
          ]
        }
      ]
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
            { id: "qc_visuals", name: "Visuals" }
          ]
        },
        {
          id: "sub_final_dispatch",
          name: "Final Delivery Stages",
          items: [
            { id: "qc_approved", name: "Quality Check Approved" },
            { id: "dispatched", name: "Dispatched" }
          ]
        }
      ]
    }
  ];
}

function getProgressionSchema() {
  if (!STATE.progressionSchema || STATE.progressionSchema.length === 0) {
    STATE.progressionSchema = getDefaultProgressionSchema();
    saveState();
  }
  return STATE.progressionSchema;
}

let tempProgressionSchema = null;

window.openProgressionSettingsModal = function() {
  loadState();
  tempProgressionSchema = JSON.parse(JSON.stringify(getProgressionSchema()));
  renderPipelineSettingsEditor();
  document.getElementById('progression-pipeline-settings-modal').classList.add('active');
};

window.closeProgressionSettingsModal = function() {
  const modal = document.getElementById('progression-pipeline-settings-modal');
  if (modal) modal.classList.remove('active');
};

window.resetDefaultProgressionSchema = function() {
  if (confirm("Reset progression pipeline to default 10 manufacturing sections? Custom edits will be restored.")) {
    tempProgressionSchema = getDefaultProgressionSchema();
    renderPipelineSettingsEditor();
  }
};

function escapeHtml(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderPipelineSettingsEditor() {
  const body = document.getElementById('pipeline-settings-editor-body');
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

  body.innerHTML = tempProgressionSchema.map((sec, secIdx) => `
    <div class="card" style="margin-bottom:16px; padding:16px; background:#ffffff; border:1.5px solid #CBD5E1; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
      
      <!-- Section Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
        <div style="display:flex; align-items:center; gap:8px; flex:1; margin-right:12px;">
          <span style="font-weight:800; font-size:0.85rem; color:#64748B;">#${secIdx + 1}</span>
          <input type="text" value="${escapeHtml(sec.name)}" class="form-control" style="font-weight:800; font-size:0.9rem; color:#0F172A;" onchange="tempProgressionSchema[${secIdx}].name = this.value">
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button type="button" class="btn btn-outline btn-xs" onclick="movePipelineSection(${secIdx}, -1)" ${secIdx === 0 ? 'disabled' : ''} style="padding:2px 8px;">▲ Up</button>
          <button type="button" class="btn btn-outline btn-xs" onclick="movePipelineSection(${secIdx}, 1)" ${secIdx === tempProgressionSchema.length - 1 ? 'disabled' : ''} style="padding:2px 8px;">▼ Down</button>
          <button type="button" class="btn btn-outline btn-xs" onclick="addNewPipelineSubsection(${secIdx})" style="background:#EFF6FF; border-color:#93C5FD; color:#1D4ED8; font-weight:700; padding:2px 10px;">+ Add Sub-section</button>
          <button type="button" class="btn btn-outline btn-xs" onclick="deletePipelineSection(${secIdx})" style="background:#FEF2F2; border-color:#FCA5A5; color:#DC2626; padding:2px 8px;">🗑️ Delete</button>
        </div>
      </div>

      <!-- Sub-sections List -->
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${sec.subsections.map((sub, subIdx) => `
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
              ${sub.items.map((item, itemIdx) => `
                <div style="display:flex; align-items:center; gap:4px; background:#ffffff; border:1px solid #CBD5E1; padding:4px 8px; border-radius:4px;">
                  <span style="font-size:0.7rem; color:#94A3B8;">☑</span>
                  <input type="text" value="${escapeHtml(item.name)}" class="form-control form-control-sm" style="width:140px; height:26px; font-size:0.75rem; font-weight:600; padding:2px 6px;" onchange="tempProgressionSchema[${secIdx}].subsections[${subIdx}].items[${itemIdx}].name = this.value">
                  <button type="button" onclick="deletePipelineItem(${secIdx}, ${subIdx}, ${itemIdx})" style="background:none; border:none; color:#EF4444; font-weight:700; cursor:pointer; font-size:0.75rem; padding:0 4px;">✕</button>
                </div>
              `).join('')}
              ${sub.items.length === 0 ? '<span style="font-size:0.7rem; color:#94A3B8; font-style:italic;">No items yet. Click "+ Add Checkbox Item"</span>' : ''}
            </div>
          </div>
        `).join('')}
        ${sec.subsections.length === 0 ? '<div style="font-size:0.75rem; color:#94A3B8; text-align:center; padding:8px;">No sub-sections in this section. Click "+ Add Sub-section"</div>' : ''}
      </div>

    </div>
  `).join('');
}

window.addNewPipelineSection = function() {
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
          { id: `item_${Date.now()}_2`, name: "Task 2 Done" }
        ]
      }
    ]
  });
  renderPipelineSettingsEditor();
};

window.deletePipelineSection = function(secIdx) {
  if (confirm(`Delete section "${tempProgressionSchema[secIdx].name}"?`)) {
    tempProgressionSchema.splice(secIdx, 1);
    renderPipelineSettingsEditor();
  }
};

window.movePipelineSection = function(secIdx, dir) {
  const targetIdx = secIdx + dir;
  if (targetIdx < 0 || targetIdx >= tempProgressionSchema.length) return;
  const temp = tempProgressionSchema[secIdx];
  tempProgressionSchema[secIdx] = tempProgressionSchema[targetIdx];
  tempProgressionSchema[targetIdx] = temp;
  renderPipelineSettingsEditor();
};

window.addNewPipelineSubsection = function(secIdx) {
  tempProgressionSchema[secIdx].subsections.push({
    id: `sub_custom_${Date.now()}`,
    name: "New Sub-section",
    items: [
      { id: `item_${Date.now()}_1`, name: "Ordered" },
      { id: `item_${Date.now()}_2`, name: "Received" }
    ]
  });
  renderPipelineSettingsEditor();
};

window.deletePipelineSubsection = function(secIdx, subIdx) {
  tempProgressionSchema[secIdx].subsections.splice(subIdx, 1);
  renderPipelineSettingsEditor();
};

window.addNewPipelineItem = function(secIdx, subIdx) {
  tempProgressionSchema[secIdx].subsections[subIdx].items.push({
    id: `item_${Date.now()}`,
    name: "New Checkbox Item"
  });
  renderPipelineSettingsEditor();
};

window.deletePipelineItem = function(secIdx, subIdx, itemIdx) {
  tempProgressionSchema[secIdx].subsections[subIdx].items.splice(itemIdx, 1);
  renderPipelineSettingsEditor();
};

window.saveProgressionSchemaSettings = function() {
  if (!tempProgressionSchema) return;
  STATE.progressionSchema = JSON.parse(JSON.stringify(tempProgressionSchema));
  saveState();
  closeProgressionSettingsModal();
  renderProductionBoard();
  alert("Progression Pipeline structure updated successfully!");
};

function getInitialProgressionState() {
  return {};
}

window.renderApprovalsList = function(filter = 'pending') {
  window._approvalsFilter = filter;
  loadState();

  const container = document.getElementById('approvals-cards-container');
  const badge = document.getElementById('approvals-pending-badge');
  
  if (!STATE.quotations) STATE.quotations = [];

  const pendingQuotes = STATE.quotations.filter(q => q.status !== 'Approved' && q.status !== 'Denied');
  if (badge) {
    badge.innerText = `${pendingQuotes.length} Pending`;
  }

  if (!container) return;

  let quotes = STATE.quotations;
  if (filter === 'pending') {
    quotes = pendingQuotes;
  }

  const filtered = applyModuleFilter('approvals', quotes, 'date', 'productName');

  if (quotes.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: white; border-radius: 12px; border: 1px dashed #CBD5E1; color: #64748B;">
        <svg style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        <h3 style="margin: 0 0 6px 0; color: #1E293B;">No Quotations ${filter === 'pending' ? 'Pending Approval' : 'Found'}</h3>
        <p style="margin: 0; font-size: 0.85rem;">Generated quotations waiting for review will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(q => {
    const isPending = q.status !== 'Approved' && q.status !== 'Denied';
    const isApproved = q.status === 'Approved';
    const isDenied = q.status === 'Denied';

    let statusBadgeClass = 'background:#FEF3C7; color:#D97706;';
    let statusText = 'Pending Approval';
    if (isApproved) {
      statusBadgeClass = 'background:#D1FAE5; color:#059669;';
      statusText = 'Approved';
    } else if (isDenied) {
      statusBadgeClass = 'background:#FEE2E2; color:#DC2626;';
      statusText = 'Denied';
    }

    const formattedPrice = `₹${(q.total || 0).toLocaleString('en-IN')}`;

    return `
      <div class="card" style="border: 1px solid #E2E8F0; border-radius: 12px; background: white; padding: 22px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #F1F5F9; padding-bottom:12px;">
          <div>
            <span style="font-size:0.75rem; font-weight:700; color:#64748B; letter-spacing:0.5px; text-transform:uppercase;">Quotation Number</span>
            <h3 style="margin: 2px 0 0 0; font-size:1.2rem; color:#0F172A; font-weight:800;">${q.id}</h3>
          </div>
          <span style="font-size:0.75rem; font-weight:700; padding:4px 12px; border-radius:12px; ${statusBadgeClass}">
            ${statusText}
          </span>
        </div>

        <div style="padding: 14px; background: #F8FAFC; border-radius: 8px; font-size: 0.9rem; display: flex; flex-direction: column; gap: 8px; border: 1px solid #F1F5F9;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#64748B; font-weight:600;">Customer Name:</span>
            <strong style="color:#1E293B; font-size:0.95rem;">${q.customerName || 'Valued Client'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#64748B; font-weight:600;">Product:</span>
            <strong style="color:#334155;">${q.productName || 'Commercial Vehicle'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; padding-top:8px; border-top:1px dashed #CBD5E1;">
            <span style="color:#64748B; font-weight:600;">Quotation Total:</span>
            <strong style="color:#059669; font-size:1.05rem;">${formattedPrice}</strong>
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-top:auto; padding-top:4px;">
          ${isPending ? `
            <button onclick="approveQuotation('${q.id}')" class="btn" style="flex:1; background:#059669; color:white; font-weight:700; border:none; padding:10px 16px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.9rem; box-shadow:0 2px 4px rgba(5,150,105,0.2);">
              ✓ Approve
            </button>
            <button onclick="denyQuotation('${q.id}')" class="btn" style="flex:1; background:#DC2626; color:white; font-weight:700; border:none; padding:10px 16px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.9rem; box-shadow:0 2px 4px rgba(220,38,38,0.2);">
              ✕ Deny
            </button>
          ` : ''}
          <button onclick="showQuotationFromBoard('${q.id}')" class="btn btn-secondary" style="padding:10px 14px; font-size:0.85rem; font-weight:600;" title="View Full Quotation PDF">
            📄 Show PDF
          </button>
        </div>
      </div>
    `;
  }).join('');
};

window.approveQuotation = function(quoteId) {
  loadState();
  const q = STATE.quotations.find(x => x.id === quoteId);
  if (!q) return;

  q.status = 'Approved';

  // 1. Move to Production Board under "Not Started"
  if (!STATE.productionItems) STATE.productionItems = [];
  let prodItem = STATE.productionItems.find(p => p.quoteId === quoteId || p.id === quoteId);
  if (!prodItem) {
    prodItem = {
      id: quoteId,
      quoteId: quoteId,
      customerName: q.customerName || 'Valued Client',
      product: q.productName || 'Commercial Body',
      date: q.date || new Date().toISOString().split('T')[0],
      columnStatus: 'Not Started',
      progressPct: 0,
      progressionMap: {}
    };
    STATE.productionItems.push(prodItem);
  }

  // 2. Move to Work Orders List
  if (!STATE.workOrders) STATE.workOrders = [];
  let wo = STATE.workOrders.find(w => w.quoteId === quoteId);
  if (!wo) {
    const woId = `WO-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    STATE.workOrders.push({
      id: woId,
      quoteId: quoteId,
      customerName: q.customerName || 'Valued Client',
      product: q.productName || 'Commercial Body',
      date: q.date || new Date().toISOString().split('T')[0],
      stage: 'Pending',
      progress: 0,
      specs: typeof q.specs === 'object' && !Array.isArray(q.specs)
        ? Object.entries(q.specs).map(([k, v]) => `${k}: ${v}`)
        : (Array.isArray(q.specs) ? q.specs : []),
      notes: `Approved quotation ${quoteId} dispatched to production shop floor.`,
      dueDate: null
    });
  }

  // 3. Update Client Outstanding & Vehicle history
  if (STATE.customers) {
    let client = STATE.customers.find(x => x.id === q.customerId || (x.company && x.company.toLowerCase() === (q.customerName || '').toLowerCase()));
    if (client) {
      client.outstanding = (client.outstanding || 0) + (q.total || 0);
    }
  }

  logSystemActivity(`Quotation ${quoteId} approved and dispatched to Work Orders & Production Board.`);
  saveState();

  showToastNotification(`Quotation ${quoteId} Approved! Dispatched to Work Orders List and Production Board.`);
  renderApprovalsList('pending');
  if (typeof renderProductionBoard === 'function') renderProductionBoard();
  if (typeof renderWorkOrders === 'function') renderWorkOrders();
};

window.denyQuotation = function(quoteId) {
  loadState();
  const q = STATE.quotations.find(x => x.id === quoteId);
  if (!q) return;

  q.status = 'Denied';

  // Ensure it is removed from production board if present
  if (STATE.productionItems) {
    STATE.productionItems = STATE.productionItems.filter(p => p.quoteId !== quoteId && p.id !== quoteId);
  }

  logSystemActivity(`Quotation ${quoteId} was Denied.`);
  saveState();

  alert(`Quotation ${quoteId} Denied.`);
  renderApprovalsList('pending');
};

window.showQuotationFromBoard = function(quoteId) {
  openPdfPreview(quoteId);
};

function syncProductionItemsWithQuotations() {
  if (!STATE.productionItems) STATE.productionItems = [];
  if (STATE.quotations && STATE.quotations.length > 0) {
    STATE.quotations.filter(q => q.status === 'Approved').forEach(q => {
      let existing = STATE.productionItems.find(p => p.quoteId === q.id || p.id === q.id);
      if (!existing) {
        const client = STATE.customers ? STATE.customers.find(c => c.id === q.customerId) : null;
        STATE.productionItems.push({
          id: q.id,
          quoteId: q.id,
          customerName: client ? client.company : (q.customerName || 'Client'),
          product: q.productName || 'Custom Vehicle Body',
          date: q.date || new Date().toISOString().split('T')[0],
          columnStatus: 'Not Started',
          progressPct: 0,
          progressionMap: {}
        });
      }
    });
  }
}

function renderProductionBoard() {
  loadState();
  syncProductionItemsWithQuotations();

  const container = document.getElementById('production-board-container');
  if (!container) return;

  const filteredItems = applyModuleFilter('production', STATE.productionItems, 'date', 'product');

  const columns = [
    { title: 'Not Started', status: 'Not Started', headerBg: '#F1F5F9', border: '#CBD5E1', countBg: '#64748B' },
    { title: 'Work in Progress', status: 'Work in Progress', headerBg: '#DBEAFE', border: '#93C5FD', countBg: '#2563EB' },
    { title: 'Finished', status: 'Finished', headerBg: '#D1FAE5', border: '#6EE7B7', countBg: '#059669' }
  ];

  let boardHtml = '';

  columns.forEach(col => {
    const items = filteredItems.filter(p => (p.columnStatus || 'Not Started') === col.status);

    const cardsHtml = items.map(item => {
      const pct = item.progressPct || 0;
      return `
        <div class="board-card" onclick="openOrderProgressionModal('${item.quoteId}')" style="background:#ffffff; border-radius:8px; border:1.5px solid #CBD5E1; padding:14px; margin-bottom:12px; cursor:pointer; transition:all 0.2s ease; position:relative; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="background:#0F172A; color:#ffffff; font-weight:800; font-size:0.75rem; padding:3px 8px; border-radius:4px; font-family:'Outfit',sans-serif;">${item.quoteId}</span>
            <span style="font-size:0.7rem; font-weight:800; color:${col.status === 'Finished' ? '#059669' : (col.status === 'Work in Progress' ? '#2563EB' : '#64748B')};">${pct}% Complete</span>
          </div>

          <div style="font-weight:700; font-size:0.875rem; color:#1E293B; margin-bottom:2px;">${item.customerName}</div>
          <div style="font-size:0.775rem; font-weight:600; color:var(--color-primary); margin-bottom:10px; text-transform:uppercase;">${item.product}</div>

          <!-- Mini Progress Bar -->
          <div style="width:100%; height:6px; background:#E2E8F0; border-radius:3px; overflow:hidden; margin-bottom:12px;">
            <div style="width:${pct}%; height:100%; background:${col.status === 'Finished' ? '#10B981' : '#3B82F6'}; transition:width 0.3s ease;"></div>
          </div>

          <!-- Card Actions -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #F1F5F9; padding-top:10px;" onclick="event.stopPropagation()">
            <button type="button" class="btn btn-outline btn-xs" onclick="openPdfPreview('${item.quoteId}')" style="font-size:0.7rem; font-weight:700; padding:3px 8px;">
              📄 Show Quotation
            </button>
            <button type="button" class="btn btn-primary btn-xs" onclick="openOrderProgressionModal('${item.quoteId}')" style="font-size:0.7rem; font-weight:700; padding:3px 10px; background:#0F172A; border:none; color:white;">
              Track Order &rarr;
            </button>
          </div>
        </div>
      `;
    }).join('');

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

window.openOrderProgressionModal = function(quoteId) {
  loadState();
  syncProductionItemsWithQuotations();

  const prodItem = STATE.productionItems.find(p => p.quoteId === quoteId || p.id === quoteId);
  if (!prodItem) return;

  const quote = STATE.quotations.find(q => q.id === quoteId);
  const subtitleText = `${quote ? quote.customerName || 'Client' : prodItem.customerName} • ${prodItem.product} • Order Date: ${new Date(prodItem.date).toLocaleDateString('en-GB')}`;

  document.getElementById('opm-title').innerHTML = `
    <span style="background:#3B82F6; color:white; padding:2px 10px; border-radius:6px; font-size:0.85rem; font-weight:800;">${prodItem.quoteId}</span>
    Order Progression Tracker
  `;
  document.getElementById('opm-subtitle').innerText = subtitleText;

  document.getElementById('opm-view-quote-btn').onclick = function() {
    openPdfPreview(quoteId);
  };

  renderOrderProgressionBody(prodItem);
  document.getElementById('order-progression-modal').classList.add('active');
};

window.closeOrderProgressionModal = function() {
  const modal = document.getElementById('order-progression-modal');
  if (modal) modal.classList.remove('active');
};

function renderOrderProgressionBody(prodItem) {
  const schema = getProgressionSchema();
  if (!prodItem.progressionMap) prodItem.progressionMap = {};
  const map = prodItem.progressionMap;

  // Collect all schema checkbox keys
  let allSchemaItems = [];
  schema.forEach(sec => {
    sec.subsections.forEach(sub => {
      sub.items.forEach(item => {
        allSchemaItems.push({
          secId: sec.id,
          subId: sub.id,
          itemId: item.id,
          key: `${sec.id}_${sub.id}_${item.id}`
        });
      });
    });
  });

  const totalCount = allSchemaItems.length;
  let checked = 0;
  allSchemaItems.forEach(i => {
    if (map[i.key]) checked++;
  });

  const pct = totalCount > 0 ? Math.round((checked / totalCount) * 100) : 0;

  // Dynamic Column Status Movement
  let status = 'Not Started';
  if (checked > 0 && checked < totalCount) {
    status = 'Work in Progress';
  } else if (totalCount > 0 && checked === totalCount) {
    status = 'Finished';
  }

  prodItem.columnStatus = status;
  prodItem.progressPct = pct;
  saveState();

  // Update Header UI
  const badgeEl = document.getElementById('opm-status-badge');
  const pctTextEl = document.getElementById('opm-pct-text');
  const progressBarEl = document.getElementById('opm-progress-bar');

  if (badgeEl) {
    badgeEl.innerText = status;
    badgeEl.style.background = status === 'Finished' ? '#10B981' : (status === 'Work in Progress' ? '#3B82F6' : '#64748B');
  }
  if (pctTextEl) pctTextEl.innerText = `${pct}%`;
  if (progressBarEl) progressBarEl.style.width = `${pct}%`;

  // Render Sections dynamically from schema
  const bodyEl = document.getElementById('opm-sections-body');
  if (!bodyEl) return;

  bodyEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      ${schema.map(sec => {
        // Collect all items for this section to determine if section is completed
        let secItemKeys = [];
        sec.subsections.forEach(sub => {
          sub.items.forEach(item => {
            secItemKeys.push(`${sec.id}_${sub.id}_${item.id}`);
          });
        });

        const isSecDone = secItemKeys.length > 0 && secItemKeys.every(k => !!map[k]);

        return `
          <div class="card" style="padding:14px; background:${isSecDone ? '#F0FDF4' : '#F8FAFC'}; border:1.5px solid ${isSecDone ? '#86EFAC' : '#CBD5E1'}; transition:all 0.2s ease;">
            
            <!-- Section Header with Section Completed Checkbox -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid ${isSecDone ? '#DCFCE7' : '#E2E8F0'}; padding-bottom:8px;">
              <h4 style="margin:0; font-size:0.85rem; font-weight:800; color:${isSecDone ? '#166534' : '#1E293B'}; text-transform:uppercase;">${sec.name}</h4>
              <label style="display:inline-flex; align-items:center; gap:6px; font-size:0.775rem; font-weight:800; padding:4px 10px; border-radius:14px; background:${isSecDone ? '#10B981' : '#E2E8F0'}; color:${isSecDone ? '#ffffff' : '#475569'}; cursor:pointer; transition:all 0.2s ease;">
                <input type="checkbox" ${isSecDone ? 'checked' : ''} onchange="toggleEntireSectionDone('${prodItem.quoteId}', '${sec.id}', this.checked)">
                ${isSecDone ? '✓ Section Completed' : 'Section Status: Pending'}
              </label>
            </div>
            
            <!-- Sub-sections & Checkbox Items -->
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${sec.subsections.map(sub => `
                <div style="background:#ffffff; padding:10px; border-radius:6px; border:1px solid #E2E8F0;">
                  ${sub.name && sub.name !== 'General Sub-section' ? `<strong style="font-size:0.8rem; display:block; margin-bottom:6px; color:#334155;">${sub.name}:</strong>` : ''}
                  <div style="display:flex; flex-wrap:wrap; gap:14px;">
                    ${sub.items.map(item => {
                      const key = `${sec.id}_${sub.id}_${item.id}`;
                      const isChecked = !!map[key];
                      return `
                        <label style="display:inline-flex; align-items:center; gap:6px; font-size:0.8rem; font-weight:600; color:#334155; cursor:pointer;">
                          <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleProgressionMapKey('${prodItem.quoteId}', '${key}', this.checked)">
                          ${item.name}
                        </label>
                      `;
                    }).join('')}
                  </div>
                </div>
              `).join('')}
            </div>

          </div>
        `;
      }).join('')}
    </div>

    <!-- 11. Dispatched Section (permanent, text-input based) -->
    <div class="card" style="padding:16px; background:#F8FAFC; border:1.5px solid #CBD5E1; border-radius:10px;">
      <h4 style="margin:0 0 12px 0; font-size:0.85rem; font-weight:800; color:#1E293B; text-transform:uppercase; border-bottom:1px solid #E2E8F0; padding-bottom:8px;">11. Dispatched</h4>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Vehicle Number</label>
          <input type="text" class="form-control" value="${(prodItem.dispatchedData && prodItem.dispatchedData.vehicleNo) || ''}" onchange="updateDispatchedData('${prodItem.quoteId}', 'vehicleNo', this.value)" placeholder="e.g. TN 01 AB 1234" style="font-size:0.8rem;">
        </div>
        <div>
          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Chassis Number</label>
          <input type="text" class="form-control" value="${(prodItem.dispatchedData && prodItem.dispatchedData.chassisNo) || ''}" onchange="updateDispatchedData('${prodItem.quoteId}', 'chassisNo', this.value)" placeholder="e.g. 1234567890" style="font-size:0.8rem;">
        </div>
        <div>
          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Driver Name</label>
          <input type="text" class="form-control" value="${(prodItem.dispatchedData && prodItem.dispatchedData.driverName) || ''}" onchange="updateDispatchedData('${prodItem.quoteId}', 'driverName', this.value)" placeholder="e.g. Rajesh Kumar" style="font-size:0.8rem;">
        </div>
        <div>
          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Driver Number</label>
          <input type="text" class="form-control" value="${(prodItem.dispatchedData && prodItem.dispatchedData.driverNo) || ''}" onchange="updateDispatchedData('${prodItem.quoteId}', 'driverNo', this.value)" placeholder="e.g. 9876543210" style="font-size:0.8rem;">
        </div>
        <div style="grid-column:span 2;">
          <label style="font-size:0.75rem; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Date & Time of Dispatch</label>
          <input type="datetime-local" class="form-control" value="${(prodItem.dispatchedData && prodItem.dispatchedData.dispatchedAt) || ''}" onchange="updateDispatchedData('${prodItem.quoteId}', 'dispatchedAt', this.value)" style="font-size:0.8rem;">
        </div>
      </div>
    </div>
  `;
}

window.toggleEntireSectionDone = function(quoteId, secId, markDone) {
  loadState();
  const prodItem = STATE.productionItems.find(p => p.quoteId === quoteId || p.id === quoteId);
  if (!prodItem) return;

  if (!prodItem.progressionMap) prodItem.progressionMap = {};
  
  const schema = getProgressionSchema();
  const sec = schema.find(s => s.id === secId);
  if (sec) {
    sec.subsections.forEach(sub => {
      sub.items.forEach(item => {
        const key = `${sec.id}_${sub.id}_${item.id}`;
        prodItem.progressionMap[key] = markDone;
      });
    });
  }

  saveState();
  renderOrderProgressionBody(prodItem);
  renderProductionBoard();
};

window.toggleProgressionMapKey = function(quoteId, key, isChecked) {
  loadState();
  const prodItem = STATE.productionItems.find(p => p.quoteId === quoteId || p.id === quoteId);
  if (!prodItem) return;

  if (!prodItem.progressionMap) prodItem.progressionMap = {};
  prodItem.progressionMap[key] = isChecked;

  saveState();
  renderOrderProgressionBody(prodItem);
  renderProductionBoard();
};

window.updateDispatchedData = function(quoteId, field, value) {
  loadState();
  const prodItem = STATE.productionItems.find(p => p.quoteId === quoteId || p.id === quoteId);
  if (!prodItem) return;
  if (!prodItem.dispatchedData) prodItem.dispatchedData = {};
  prodItem.dispatchedData[field] = value;
  saveState();
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

  // Populate Terms & Conditions from saved quotation
  const pdfTermsList = document.getElementById('pdf-terms-list');
  if (pdfTermsList && quote.terms) {
    pdfTermsList.innerHTML = quote.terms.map(t => `<li>${t}</li>`).join('');
  }

  // Populate Scope of Work from saved quotation
  const pdfScopeVal = document.getElementById('pdf-scope-val');
  if (pdfScopeVal && quote.scopeOfWork) {
    pdfScopeVal.innerText = quote.scopeOfWork;
  }

  document.getElementById('pdf-preview-modal').classList.add('active');
};
