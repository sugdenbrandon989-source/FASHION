/* ============================================================
   FASHION OPS — Data Layer
   In-browser persistence via localStorage. Fully self-contained
   "1-click" demo dataset simulating a fashion brand's B2B
   purchase-order + quote + label-automation pipeline.
   ============================================================ */

const DB_KEY = 'fashionops_db_v1';

const PO_STATUSES = ['draft','pending','confirmed','production','labels','shipped','received','cancelled'];
const QUOTE_STATUSES = ['draft','sent','viewed','accepted','rejected','expired','converted'];
const LABEL_STATUSES = ['queued','generated','printed'];
const LABEL_TYPES = ['Care Label','Barcode Tag','QR Compliance Tag','Size Sticker','Hangtag'];

const STATUS_META = {
  draft:      { icon:'fa-file-pen', color:'draft' },
  pending:    { icon:'fa-hourglass-half', color:'pending' },
  confirmed:  { icon:'fa-check', color:'confirmed' },
  production: { icon:'fa-industry', color:'production' },
  labels:     { icon:'fa-tags', color:'labels' },
  shipped:    { icon:'fa-truck-fast', color:'shipped' },
  received:   { icon:'fa-box-open', color:'received' },
  cancelled:  { icon:'fa-ban', color:'cancelled' },
  sent:       { icon:'fa-paper-plane', color:'sent' },
  viewed:     { icon:'fa-eye', color:'viewed' },
  accepted:   { icon:'fa-thumbs-up', color:'accepted' },
  rejected:   { icon:'fa-thumbs-down', color:'rejected' },
  expired:    { icon:'fa-clock', color:'expired' },
  converted:  { icon:'fa-arrow-right-arrow-left', color:'converted' },
};

const PO_WORKFLOW = ['draft','pending','confirmed','production','labels','shipped','received'];

const SUPPLIERS = [
  { id:'SUP-01', name:'Anatolia Textile Mills', country:'Turkey', category:'Wovens' },
  { id:'SUP-02', name:'Kanto Denim Works', country:'Japan', category:'Denim' },
  { id:'SUP-03', name:'Dhaka Knitwear Co.', country:'Bangladesh', category:'Knits' },
  { id:'SUP-04', name:'Porto Leather Atelier', country:'Portugal', category:'Leather Goods' },
  { id:'SUP-05', name:'Guangzhou FastStitch', country:'China', category:'Fast Fashion' },
];

const CUSTOMERS = [
  { id:'CUS-01', name:'Nordic Thread Boutique', contact:'Elin Karlsson', email:'elin@nordicthread.co', tier:'Platinum' },
  { id:'CUS-02', name:'Rue Marchand Paris', contact:'Camille Dubois', email:'camille@ruemarchand.fr', tier:'Gold' },
  { id:'CUS-03', name:'Downtown Denim Co.', contact:'Marcus Reyes', email:'marcus@downtowndenim.com', tier:'Gold' },
  { id:'CUS-04', name:'Studio Halcyon', contact:'Priya Nair', email:'priya@studiohalcyon.in', tier:'Silver' },
  { id:'CUS-05', name:'Bondi Coastal Apparel', contact:'Jack Turner', email:'jack@bondicoastal.au', tier:'Platinum' },
  { id:'CUS-06', name:'Maple & Moss', contact:'Sarah Chen', email:'sarah@mapleandmoss.ca', tier:'Silver' },
];

const PRODUCTS = [
  { sku:'FS-JKT-014', name:'Oversized Wool Blazer', category:'Outerwear', price: 128.0 },
  { sku:'FS-DEN-221', name:'Vintage Wash Straight Denim', category:'Denim', price: 74.5 },
  { sku:'FS-KNT-098', name:'Ribbed Merino Sweater', category:'Knitwear', price: 62.0 },
  { sku:'FS-DRS-305', name:'Silk Slip Midi Dress', category:'Dresses', price: 95.0 },
  { sku:'FS-SHT-112', name:'Linen Relaxed Shirt', category:'Shirts', price: 48.0 },
  { sku:'FS-LTH-410', name:'Full-Grain Leather Tote', category:'Accessories', price: 210.0 },
  { sku:'FS-TEE-500', name:'Organic Cotton Boxy Tee', category:'Basics', price: 22.0 },
  { sku:'FS-CRD-155', name:'Cropped Bouclé Cardigan', category:'Knitwear', price: 58.0 },
  { sku:'FS-SKT-278', name:'Pleated Satin Midi Skirt', category:'Skirts', price: 66.0 },
  { sku:'FS-PNT-330', name:'Tailored Wide-Leg Trouser', category:'Bottoms', price: 84.0 },
];

const SIZE_RUN = ['XS','S','M','L','XL'];

function uid(prefix){
  return `${prefix}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
}
function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function pick(arr){ return arr[randInt(0,arr.length-1)]; }
function daysAgo(n){ const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString(); }
function daysFromNow(n){ const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString(); }
function fmtMoney(v){ return '$' + Number(v||0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function fmtDate(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function fmtDateShort(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}
function timeAgo(iso){
  const s = Math.floor((Date.now() - new Date(iso).getTime())/1000);
  if(s<60) return 'just now';
  if(s<3600) return Math.floor(s/60)+'m ago';
  if(s<86400) return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
}

function buildLineItems(n){
  const items = [];
  const chosen = new Set();
  for(let i=0;i<n;i++){
    let p = pick(PRODUCTS);
    let tries=0;
    while(chosen.has(p.sku) && tries<10){ p = pick(PRODUCTS); tries++; }
    chosen.add(p.sku);
    const sizes = {};
    SIZE_RUN.forEach(sz => { sizes[sz] = randInt(0,40); });
    const qty = Object.values(sizes).reduce((a,b)=>a+b,0) || randInt(20,120);
    items.push({
      id: uid('LI'),
      sku: p.sku, name: p.name, category: p.category,
      unitPrice: p.price, sizes, qty,
      total: +(qty * p.price).toFixed(2)
    });
  }
  return items;
}

function computeTotal(items){
  return +items.reduce((sum,i)=> sum + i.total, 0).toFixed(2);
}

function generateLabelJobsForPO(po){
  const jobs = [];
  po.items.forEach(item => {
    const typesForItem = ['Barcode Tag','Care Label', Math.random()>0.4 ? 'QR Compliance Tag' : 'Size Sticker'];
    typesForItem.forEach(type => {
      jobs.push({
        id: uid('LBL'),
        poId: po.id,
        sku: item.sku,
        productName: item.name,
        type,
        qty: item.qty,
        status: po.status === 'labels' || po.status === 'shipped' || po.status === 'received'
          ? pick(['generated','printed','printed'])
          : 'queued',
        createdAt: po.createdAt,
        code: item.sku + '-' + Math.floor(Math.random()*900+100),
      });
    });
  });
  return jobs;
}

function seedPurchaseOrders(){
  const pos = [];
  const now = Date.now();
  for(let i=0;i<26;i++){
    const supplier = pick(SUPPLIERS);
    const items = buildLineItems(randInt(2,5));
    const createdOffset = randInt(1,75);
    const status = pick(PO_WORKFLOW.concat(['cancelled','cancelled']));
    const po = {
      id: `PO-${2400+i}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierCountry: supplier.country,
      status,
      items,
      total: computeTotal(items),
      createdAt: daysAgo(createdOffset),
      expectedDate: daysFromNow(randInt(-10,45)),
      priority: pick(['Standard','Rush','Standard','Bulk']),
      notes: pick([
        'Requires GOTS compliance labels.',
        'First run for new denim wash — QC hold on arrival.',
        'Repeat order, use same size ratio as PO-2391.',
        'Confirm hangtag artwork before printing.',
        ''
      ]),
    };
    pos.push(po);
  }
  return pos.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
}

function seedQuotes(){
  const quotes = [];
  for(let i=0;i<20;i++){
    const customer = pick(CUSTOMERS);
    const items = buildLineItems(randInt(1,4));
    const status = pick(QUOTE_STATUSES.concat(['sent','viewed']));
    const createdOffset = randInt(1,60);
    const discount = pick([0,5,10,15]);
    const subtotal = computeTotal(items);
    const total = +(subtotal * (1-discount/100)).toFixed(2);
    quotes.push({
      id: `QT-${5100+i}`,
      customerId: customer.id,
      customerName: customer.name,
      customerContact: customer.contact,
      customerEmail: customer.email,
      customerTier: customer.tier,
      status,
      items,
      subtotal,
      discount,
      total,
      createdAt: daysAgo(createdOffset),
      validUntil: daysFromNow(randInt(-5,30)),
      convertedPoId: status === 'converted' ? `PO-${2400+randInt(0,25)}` : null,
    });
  }
  return quotes.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
}

function seedActivity(pos, quotes){
  const acts = [];
  pos.slice(0,10).forEach(po=>{
    acts.push({ id:uid('ACT'), type:'po', refId: po.id, msg:`Purchase Order ${po.id} marked as ${po.status}`, at: po.createdAt, icon:'fa-file-invoice', color:'violet' });
  });
  quotes.slice(0,10).forEach(q=>{
    acts.push({ id:uid('ACT'), type:'quote', refId:q.id, msg:`Quote ${q.id} for ${q.customerName} is ${q.status}`, at: q.createdAt, icon:'fa-file-signature', color:'cyan' });
  });
  return acts.sort((a,b)=> new Date(b.at)-new Date(a.at)).slice(0,14);
}

function seedFreshDB(){
  const purchaseOrders = seedPurchaseOrders();
  const quotes = seedQuotes();
  const labelJobs = purchaseOrders.flatMap(generateLabelJobsForPO);
  const activity = seedActivity(purchaseOrders, quotes);
  return {
    purchaseOrders,
    quotes,
    labelJobs,
    activity,
    settings: { orgName:'FASHION Ops', theme:'dark', autoLabelOnConfirm:true },
    meta: { seededAt: new Date().toISOString() }
  };
}

const Store = {
  data: null,
  load(){
    try{
      const raw = localStorage.getItem(DB_KEY);
      if(raw){ this.data = JSON.parse(raw); }
      else { this.data = seedFreshDB(); this.save(); }
    }catch(e){
      console.warn('Store load failed, reseeding', e);
      this.data = seedFreshDB();
      this.save();
    }
    return this.data;
  },
  save(){
    localStorage.setItem(DB_KEY, JSON.stringify(this.data));
  },
  reset(){
    this.data = seedFreshDB();
    this.save();
    return this.data;
  },
  wipe(){
    this.data = { purchaseOrders:[], quotes:[], labelJobs:[], activity:[], settings:this.data.settings, meta:{} };
    this.save();
    return this.data;
  },
  logActivity(msg, icon='fa-circle-info', color='violet', type='system', refId=''){
    this.data.activity.unshift({ id:uid('ACT'), type, refId, msg, at:new Date().toISOString(), icon, color });
    this.data.activity = this.data.activity.slice(0,40);
    this.save();
  }
};
