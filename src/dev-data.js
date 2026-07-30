import { isDevelopment } from './config.js';

let _loaded = false;

export function getDefaultState() {
  return {
    activeRole: 'Admin',
    customers: [
      { id: 'CUST-001', name: 'Tata Logistics Pvt Ltd', company: 'Tata Logistics', gst: '33AAACT8281M1Z5', phone: '+91 98400 12345', email: 'operations@tatalogistics.com', address: 'Plot 12, Port Road, Tuticorin, TN', vehicles: ['TN-69-AA-1234', 'TN-69-AA-5678'], outstanding: 0 },
      { id: 'CUST-002', name: 'Gati Mining & Minerals', company: 'Gati Minerals', gst: '27AAACG1928A2Z0', phone: '+91 99100 98765', email: 'mehta@gatimining.com', address: 'Mine Block C, Korba, Chhattisgarh', vehicles: ['CG-12-BB-9922'], outstanding: 0 },
      { id: 'CUST-003', name: 'V-Trans Cargo India', company: 'V-Trans', gst: '24AAACV1029P3Z1', phone: '+91 98220 54321', email: 'sandeep@vtrans.com', address: 'Sarkhej Highway, Ahmedabad, Gujarat', vehicles: [], outstanding: 0 },
      { id: 'CUST-004', name: 'Golden Roadlines', company: 'Golden Roadlines', gst: '09AAACG8811K1Z2', phone: '+91 97110 22334', email: 'rajesh@goldenroadlines.com', address: 'Sanjay Gandhi Transport Nagar, Delhi', vehicles: ['DL-1G-1020', 'DL-1G-3344'], outstanding: 0 }
    ],
    products: getProducts(),
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
    employees: [],
    employeeCounter: 0
  };
}

function getProducts() {
  return {
    flatbed: {
      name: 'Flat Bed Trailer', basePrice: 850000,
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
      name: 'Tip Trailer', basePrice: 1420000,
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
      name: 'Box Body Tipper', basePrice: 780000,
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
      name: 'Rock Body Tipper', basePrice: 1150000,
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
  };
}
