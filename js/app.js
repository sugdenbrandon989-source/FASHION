/* ============================================================
   FASHION OPS — Application Logic
   ============================================================ */

let charts = {};
let poFilter = 'all';
let quoteFilter = 'all';
let labelFilter = 'all';
let selectedLabelIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
  Store.load();
  initNav();
  initTopbar();
  initModals();
  initPOModule();
  initQuoteModule();
  initLabelModule();
  initSettings();
  renderAll();
  const initialView = (location.hash||'').replace('#','') || 'dashboard';
  if(VIEW_TITLES[initialView]) switchView(initialView);
  window.addEventListener('hashchange', ()=>{
    const v = (location.hash||'').replace('#','');
    if(VIEW_TITLES[v]) switchView(v);
  });
});

/* ============================================================
   Toasts
   ============================================================ */
function toast(title, msg, type='success', icon){
  const icons = { success:'fa-circle-check', error:'fa-circle-exclamation', info:'fa-circle-info', warn:'fa-triangle-exclamation' };
  const el = document.createElement('div');
  el.className = `toast glass ${type}`;
  el.innerHTML = `
    <div class="toast-icon"><i class="fa-solid ${icon || icons[type]}"></i></div>
    <div>
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg||''}</div>
    </div>`;
  document.getElementById('toastStack').appendChild(el);
  setTimeout(()=>{ el.classList.add('hide'); setTimeout(()=>el.remove(), 400); }, 3600);
}

/* ============================================================
   Navigation
   ============================================================ */
function initNav(){
  document.querySelectorAll('.nav-item').forEach(item=>{
    item.addEventListener('click', ()=> switchView(item.dataset.view));
  });
  document.querySelectorAll('[data-view-link]').forEach(item=>{
    item.addEventListener('click', ()=> switchView(item.dataset.viewLink));
  });
  document.getElementById('btnOpenSidebar')?.addEventListener('click', ()=>{
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarBackdrop').classList.add('show');
  });
  document.getElementById('sidebarBackdrop')?.addEventListener('click', ()=>{
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarBackdrop').classList.remove('show');
  });
}

const VIEW_TITLES = {
  dashboard: ['Dashboard', 'Real-time overview of orders, quotes & label production'],
  pos: ['Purchase Orders', 'Manage supplier purchase orders across the full lifecycle'],
  pipeline: ['PO Pipeline', 'Drag & drop kanban view of every active purchase order'],
  quotes: ['Customer Quotes', 'Create, send, and track customer quotes'],
  labels: ['Label Automation', 'Auto-generated barcode, QR, care & size labels'],
  settings: ['Settings', 'Workspace preferences and automation rules'],
};

function switchView(view){
  if(location.hash.replace('#','') !== view) history.replaceState(null,'','#'+view);
  document.querySelectorAll('.nav-item').forEach(n=> n.classList.toggle('active', n.dataset.view===view));
  document.querySelectorAll('.view').forEach(v=> v.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  const [title, sub] = VIEW_TITLES[view];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSub').textContent = sub;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('show');
  if(view==='pipeline') renderKanban();
  if(view==='labels') renderLabelStudio();
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ============================================================
   Topbar
   ============================================================ */
function initTopbar(){
  document.getElementById('btnQuickAction').addEventListener('click', ()=> openPOModal());
  document.getElementById('btnResetDemo').addEventListener('click', ()=>{
    if(confirm('Reset all demo data to a fresh seeded dataset?')){
      Store.reset();
      renderAll();
      toast('Demo data reset', 'Fresh purchase orders, quotes & labels generated.', 'info', 'fa-arrows-rotate');
    }
  });
  document.getElementById('globalSearch').addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    renderPOTable(q);
    renderQuoteTable(q);
  });
}

/* ============================================================
   Modal helpers
   ============================================================ */
function initModals(){
  document.querySelectorAll('[data-close-modal]').forEach(el=>{
    el.addEventListener('click', ()=> closeModal(el.dataset.closeModal));
  });
  document.querySelectorAll('.modal-overlay').forEach(ov=>{
    ov.addEventListener('click', (e)=>{ if(e.target===ov) closeModal(ov.id); });
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Escape'){
      document.querySelectorAll('.modal-overlay.open').forEach(ov=> closeModal(ov.id));
    }
  });
  // ripple effect
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.btn-ripple');
    if(!btn) return;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty('--rx', (e.clientX-rect.left)+'px');
    btn.style.setProperty('--ry', (e.clientY-rect.top)+'px');
    btn.classList.remove('rippling');
    requestAnimationFrame(()=>btn.classList.add('rippling'));
  });
}
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

/* ============================================================
   RENDER: ALL
   ============================================================ */
function renderAll(){
  renderNavBadges();
  renderKPIs();
  renderWorkflowTrack();
  renderCharts();
  renderActivityFeed();
  renderLabelMiniStats();
  renderTopCustomers();
  renderPOTable();
  renderQuoteTable();
  renderLabelStudio();
}

function renderNavBadges(){
  document.getElementById('navPoCount').textContent = Store.data.purchaseOrders.length;
  document.getElementById('navQuoteCount').textContent = Store.data.quotes.length;
  document.getElementById('navLabelCount').textContent = Store.data.labelJobs.filter(j=>j.status!=='printed').length;
}

/* ============================================================
   DASHBOARD: KPIs
   ============================================================ */
function renderKPIs(){
  const pos = Store.data.purchaseOrders;
  const quotes = Store.data.quotes;
  const activePOValue = pos.filter(p=>p.status!=='cancelled').reduce((s,p)=>s+p.total,0);
  const openQuotesValue = quotes.filter(q=>['sent','viewed','draft'].includes(q.status)).reduce((s,q)=>s+q.total,0);
  const acceptedRate = quotes.length ? Math.round(100*quotes.filter(q=>['accepted','converted'].includes(q.status)).length/quotes.length) : 0;
  const labelStats = LabelEngine.stats();

  const kpis = [
    { label:'Active PO Value', value: fmtMoney(activePOValue), icon:'fa-file-invoice-dollar', bg:'rgba(139,92,246,0.16)', color:'var(--accent-violet-2)', trend:'+12.4%', up:true },
    { label:'Open Quote Value', value: fmtMoney(openQuotesValue), icon:'fa-file-signature', bg:'rgba(34,211,238,0.16)', color:'var(--accent-cyan)', trend:'+6.1%', up:true },
    { label:'Quote Win Rate', value: acceptedRate+'%', icon:'fa-trophy', bg:'rgba(52,211,153,0.16)', color:'var(--accent-green)', trend: acceptedRate>=40?'+3.2%':'-1.8%', up: acceptedRate>=40 },
    { label:'Label Jobs Pending', value: (labelStats.total-labelStats.printed), icon:'fa-tags', bg:'rgba(244,114,182,0.16)', color:'var(--accent-pink)', trend: labelStats.queued+' queued', up:null },
  ];

  document.getElementById('kpiRow').innerHTML = kpis.map(k=>`
    <div class="glass kpi-card">
      <div class="kpi-top">
        <div class="kpi-icon" style="background:${k.bg};color:${k.color};"><i class="fa-solid ${k.icon}"></i></div>
        ${k.up===null ? `<span class="kpi-trend up"><i class="fa-solid fa-clock"></i> ${k.trend}</span>` :
          `<span class="kpi-trend ${k.up?'up':'down'}"><i class="fa-solid fa-arrow-${k.up?'up':'down'}"></i> ${k.trend}</span>`}
      </div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
    </div>
  `).join('');
}

function renderWorkflowTrack(){
  const pos = Store.data.purchaseOrders;
  const stageIcons = { draft:'fa-file-pen', pending:'fa-hourglass-half', confirmed:'fa-check', production:'fa-industry', labels:'fa-tags', shipped:'fa-truck-fast', received:'fa-box-open' };
  const stageLabels = { draft:'Draft', pending:'Pending', confirmed:'Confirmed', production:'Production', labels:'Labels', shipped:'Shipped', received:'Received' };
  document.getElementById('workflowTrack').innerHTML = PO_WORKFLOW.map((stage,i)=>{
    const count = pos.filter(p=>p.status===stage).length;
    const doneIdx = PO_WORKFLOW.indexOf('production'); // just visual marker up to production as "done" band example
    const cls = i < 3 ? 'done' : (i===3 ? 'current' : '');
    return `
    <div class="wf-step ${count>0 ? (i<=3?'done':'') : ''} ${i===2?'current':''}">
      <div class="wf-line"></div>
      <div class="wf-node"><i class="fa-solid ${stageIcons[stage]}"></i></div>
      <b>${stageLabels[stage]}</b>
      <span>stage</span>
      <div class="wf-count">${count}</div>
    </div>`;
  }).join('');
}

/* ============================================================
   DASHBOARD: Charts
   ============================================================ */
function renderCharts(){
  renderRevenueChart();
  renderStatusChart();
}

function weekBuckets(items, dateField, valueField, weeks=8){
  const buckets = new Array(weeks).fill(0);
  const now = Date.now();
  items.forEach(it=>{
    const t = new Date(it[dateField]).getTime();
    const diffWeeks = Math.floor((now - t)/(7*86400000));
    if(diffWeeks>=0 && diffWeeks<weeks){
      buckets[weeks-1-diffWeeks] += it[valueField];
    }
  });
  return buckets;
}

function renderRevenueChart(){
  const ctx = document.getElementById('chartRevenue');
  const poBuckets = weekBuckets(Store.data.purchaseOrders.filter(p=>['confirmed','production','labels','shipped','received'].includes(p.status)), 'createdAt', 'total');
  const quoteBuckets = weekBuckets(Store.data.quotes.filter(q=>['accepted','converted'].includes(q.status)), 'createdAt', 'total');
  const labels = poBuckets.map((_,i)=> `W-${poBuckets.length-1-i}`).reverse().map((_,i)=> i===poBuckets.length-1?'This wk':`${poBuckets.length-1-i}w ago`).reverse();

  if(charts.revenue) charts.revenue.destroy();
  charts.revenue = new Chart(ctx, {
    type:'line',
    data:{
      labels,
      datasets:[
        { label:'Confirmed PO Value', data:poBuckets, borderColor:'#8b5cf6', backgroundColor:'rgba(139,92,246,0.18)', fill:true, tension:0.4, pointRadius:3, pointBackgroundColor:'#8b5cf6' },
        { label:'Accepted Quote Value', data:quoteBuckets, borderColor:'#22d3ee', backgroundColor:'rgba(34,211,238,0.14)', fill:true, tension:0.4, pointRadius:3, pointBackgroundColor:'#22d3ee' },
      ]
    },
    options: chartBaseOptions({ money:true })
  });
}

function renderStatusChart(){
  const ctx = document.getElementById('chartStatus');
  const counts = {};
  PO_STATUSES.forEach(s=> counts[s]=0);
  Store.data.purchaseOrders.forEach(p=> counts[p.status]++);
  const colors = { draft:'#8b90ad', pending:'#fbbf24', confirmed:'#60a5fa', production:'#a78bfa', labels:'#f472b6', shipped:'#22d3ee', received:'#34d399', cancelled:'#fb7185' };
  const labels = Object.keys(counts).filter(k=>counts[k]>0);
  const data = labels.map(l=>counts[l]);

  if(charts.status) charts.status.destroy();
  charts.status = new Chart(ctx, {
    type:'doughnut',
    data:{ labels: labels.map(l=>l[0].toUpperCase()+l.slice(1)), datasets:[{ data, backgroundColor: labels.map(l=>colors[l]), borderWidth:0, hoverOffset:8 }] },
    options:{
      cutout:'68%',
      plugins:{ legend:{ position:'bottom', labels:{ color:'#c7cbe0', font:{size:11, family:'Plus Jakarta Sans'}, boxWidth:10, padding:12 } } },
      maintainAspectRatio:false
    }
  });
}

function chartBaseOptions({money=false}={}){
  return {
    maintainAspectRatio:false,
    interaction:{ mode:'index', intersect:false },
    plugins:{
      legend:{ position:'bottom', labels:{ color:'#c7cbe0', font:{size:11, family:'Plus Jakarta Sans'}, boxWidth:10, padding:14 } },
      tooltip:{
        backgroundColor:'rgba(15,18,32,0.95)', borderColor:'rgba(255,255,255,0.1)', borderWidth:1,
        titleColor:'#fff', bodyColor:'#c7cbe0', padding:10, cornerRadius:10,
        callbacks: money ? { label:(c)=> ` ${c.dataset.label}: ${fmtMoney(c.raw)}` } : undefined
      }
    },
    scales:{
      x:{ grid:{ color:'rgba(255,255,255,0.05)' }, ticks:{ color:'#5c6183', font:{size:11} } },
      y:{ grid:{ color:'rgba(255,255,255,0.05)' }, ticks:{ color:'#5c6183', font:{size:11}, callback: v => money ? '$'+v : v } }
    }
  };
}

/* ============================================================
   DASHBOARD: Activity / Mini-stats / Top customers
   ============================================================ */
function renderActivityFeed(){
  const list = Store.data.activity;
  const colorMap = { violet:'var(--accent-violet-2)', cyan:'var(--accent-cyan)', pink:'var(--accent-pink)', green:'var(--accent-green)', amber:'var(--accent-amber)' };
  document.getElementById('activityFeed').innerHTML = list.length ? list.map(a=>`
    <div class="flex gap-12" style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <div class="kpi-icon" style="width:34px;height:34px;font-size:13px;background:rgba(255,255,255,0.05);color:${colorMap[a.color]||'#fff'};flex-shrink:0;"><i class="fa-solid ${a.icon}"></i></div>
      <div style="flex:1;min-width:0;">
        <div class="text-sm" style="font-weight:600;">${a.msg}</div>
        <div class="cell-muted">${timeAgo(a.at)}</div>
      </div>
    </div>`).join('') : `<div class="empty-state"><i class="fa-solid fa-clock-rotate-left"></i><h4>No activity yet</h4></div>`;
}

function renderLabelMiniStats(){
  const s = LabelEngine.stats();
  const pct = s.total ? Math.round(100*s.printed/s.total) : 0;
  document.getElementById('labelMiniStats').innerHTML = `
    <div class="flex" style="justify-content:space-between;margin-bottom:8px;">
      <span class="text-sm text-muted">Printed progress</span><span class="text-sm" style="font-weight:800;">${pct}%</span>
    </div>
    <div class="progress-bar"><span style="width:${pct}%"></span></div>
    <div class="grid grid-3 mt-16" style="gap:8px;">
      <div style="text-align:center;"><div style="font-size:18px;font-weight:800;color:var(--accent-amber);">${s.queued}</div><div class="cell-muted">Queued</div></div>
      <div style="text-align:center;"><div style="font-size:18px;font-weight:800;color:var(--accent-blue);">${s.generated}</div><div class="cell-muted">Generated</div></div>
      <div style="text-align:center;"><div style="font-size:18px;font-weight:800;color:var(--accent-green);">${s.printed}</div><div class="cell-muted">Printed</div></div>
    </div>`;
}

function renderTopCustomers(){
  const byCustomer = {};
  Store.data.quotes.forEach(q=>{
    byCustomer[q.customerName] = (byCustomer[q.customerName]||0) + q.total;
  });
  const top = Object.entries(byCustomer).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const max = top.length ? top[0][1] : 1;
  document.getElementById('topCustomers').innerHTML = top.map(([name,val])=>`
    <div class="mt-12">
      <div class="flex" style="justify-content:space-between;font-size:12.5px;margin-bottom:5px;">
        <span style="font-weight:700;">${name}</span><span class="text-muted">${fmtMoney(val)}</span>
      </div>
      <div class="progress-bar"><span style="width:${Math.round(100*val/max)}%;background:var(--grad-warm);"></span></div>
    </div>`).join('') || `<div class="empty-state"><i class="fa-solid fa-users"></i><h4>No quotes yet</h4></div>`;
}

/* ============================================================
   PURCHASE ORDERS MODULE
   ============================================================ */
function initPOModule(){
  document.querySelectorAll('[data-po-filter]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      document.querySelectorAll('[data-po-filter]').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      poFilter = chip.dataset.poFilter;
      renderPOTable();
    });
  });
  document.getElementById('btnNewPO').addEventListener('click', ()=> openPOModal());
  document.getElementById('btnNewPOFromPipeline').addEventListener('click', ()=> openPOModal());
  document.getElementById('btnAddPoItem').addEventListener('click', ()=> addPOItemRow());
  document.getElementById('btnSavePO').addEventListener('click', savePO);
  document.getElementById('btnExportPO').addEventListener('click', ()=> exportCSV(Store.data.purchaseOrders.map(p=>({
    PO:p.id, Supplier:p.supplierName, Items:p.items.length, Total:p.total, Status:p.status, Priority:p.priority, Expected:fmtDate(p.expectedDate)
  })), 'purchase_orders.csv'));

  // populate supplier + status selects
  const supSel = document.getElementById('poSupplier');
  supSel.innerHTML = SUPPLIERS.map(s=>`<option value="${s.id}">${s.name} — ${s.country}</option>`).join('');
  const statSel = document.getElementById('poStatus');
  statSel.innerHTML = PO_STATUSES.map(s=>`<option value="${s}">${s[0].toUpperCase()+s.slice(1)}</option>`).join('');
}

function renderPOTable(searchQuery=''){
  const tbody = document.getElementById('poTableBody');
  let list = Store.data.purchaseOrders;
  if(poFilter!=='all') list = list.filter(p=>p.status===poFilter);
  if(searchQuery) list = list.filter(p=> (p.id+p.supplierName).toLowerCase().includes(searchQuery));

  document.getElementById('poEmptyState').style.display = list.length ? 'none':'block';

  tbody.innerHTML = list.map(po=>{
    const meta = STATUS_META[po.status];
    return `
    <tr>
      <td class="cell-strong pointer" data-open-po="${po.id}">${po.id}</td>
      <td>
        <div style="font-weight:700;">${po.supplierName}</div>
        <div class="cell-muted">${po.supplierCountry}</div>
      </td>
      <td>${po.items.length} SKUs</td>
      <td class="cell-strong">${fmtMoney(po.total)}</td>
      <td><span class="text-sm">${po.priority}</span></td>
      <td><span class="badge badge-${meta.color}"><span class="bdot"></span>${po.status}</span></td>
      <td class="cell-muted">${fmtDate(po.expectedDate)}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-glass btn-icon btn-sm" data-open-po="${po.id}" title="View"><i class="fa-solid fa-eye"></i></button>
          <button class="btn btn-glass btn-icon btn-sm" data-edit-po="${po.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-open-po]').forEach(el=> el.addEventListener('click', ()=> openPODetail(el.dataset.openPo)));
  tbody.querySelectorAll('[data-edit-po]').forEach(el=> el.addEventListener('click', ()=> openPOModal(el.dataset.editPo)));
}

function addPOItemRow(item={}){
  const tbody = document.getElementById('poItemsBody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td style="min-width:190px;">
      <select class="po-item-sku">
        ${PRODUCTS.map(p=>`<option value="${p.sku}" data-price="${p.price}" data-name="${p.name}" ${p.sku===item.sku?'selected':''}>${p.sku} — ${p.name}</option>`).join('')}
      </select>
    </td>
    <td style="width:100px;"><input type="number" class="po-item-price" value="${item.unitPrice ?? PRODUCTS[0].price}" step="0.5" style="width:90px;"></td>
    <td style="width:90px;"><input type="number" class="po-item-qty" value="${item.qty ?? 50}" style="width:80px;"></td>
    <td class="po-item-total" style="width:100px;font-weight:800;">${fmtMoney((item.unitPrice ?? PRODUCTS[0].price)*(item.qty ?? 50))}</td>
    <td><i class="fa-solid fa-trash pointer" style="color:var(--accent-red);" data-remove-row></i></td>
  `;
  document.getElementById('poItemsBody').appendChild(row);

  const skuSel = row.querySelector('.po-item-sku');
  const priceInput = row.querySelector('.po-item-price');
  const qtyInput = row.querySelector('.po-item-qty');
  const totalCell = row.querySelector('.po-item-total');

  function recalcRow(){
    const total = (+priceInput.value||0) * (+qtyInput.value||0);
    totalCell.textContent = fmtMoney(total);
    recalcPOTotal();
  }
  skuSel.addEventListener('change', ()=>{
    const opt = skuSel.selectedOptions[0];
    priceInput.value = opt.dataset.price;
    recalcRow();
  });
  priceInput.addEventListener('input', recalcRow);
  qtyInput.addEventListener('input', recalcRow);
  row.querySelector('[data-remove-row]').addEventListener('click', ()=>{ row.remove(); recalcPOTotal(); });
  recalcPOTotal();
}

function recalcPOTotal(){
  let total = 0;
  document.querySelectorAll('#poItemsBody tr').forEach(row=>{
    const price = +row.querySelector('.po-item-price').value || 0;
    const qty = +row.querySelector('.po-item-qty').value || 0;
    total += price*qty;
  });
  document.getElementById('poTotalPreview').textContent = fmtMoney(total);
}

function openPOModal(poId=null){
  document.getElementById('poItemsBody').innerHTML = '';
  document.getElementById('poEditId').value = poId || '';
  if(poId){
    const po = Store.data.purchaseOrders.find(p=>p.id===poId);
    document.getElementById('poModalTitle').textContent = `Edit ${po.id}`;
    document.getElementById('poSupplier').value = po.supplierId;
    document.getElementById('poPriority').value = po.priority;
    document.getElementById('poStatus').value = po.status;
    document.getElementById('poExpectedDate').value = po.expectedDate.slice(0,10);
    document.getElementById('poNotes').value = po.notes || '';
    po.items.forEach(it=> addPOItemRow(it));
  }else{
    document.getElementById('poModalTitle').textContent = 'New Purchase Order';
    document.getElementById('poSupplier').selectedIndex = 0;
    document.getElementById('poPriority').value = 'Standard';
    document.getElementById('poStatus').value = 'draft';
    document.getElementById('poExpectedDate').value = daysFromNow(21).slice(0,10);
    document.getElementById('poNotes').value = '';
    addPOItemRow();
  }
  openModal('modalPO');
}

function savePO(){
  const id = document.getElementById('poEditId').value;
  const supplierSel = document.getElementById('poSupplier');
  const supplier = SUPPLIERS.find(s=>s.id===supplierSel.value);
  const status = document.getElementById('poStatus').value;
  const priority = document.getElementById('poPriority').value;
  const expectedDate = document.getElementById('poExpectedDate').value || new Date().toISOString();
  const notes = document.getElementById('poNotes').value;

  const items = [...document.querySelectorAll('#poItemsBody tr')].map(row=>{
    const opt = row.querySelector('.po-item-sku').selectedOptions[0];
    const price = +row.querySelector('.po-item-price').value || 0;
    const qty = +row.querySelector('.po-item-qty').value || 0;
    const product = PRODUCTS.find(p=>p.sku===opt.value);
    return { id: uid('LI'), sku: opt.value, name: opt.dataset.name, category: product?.category||'General', unitPrice: price, qty, sizes:{}, total: +(price*qty).toFixed(2) };
  });

  if(!items.length){ toast('Missing items', 'Add at least one line item.', 'error'); return; }

  let po;
  let wasConfirmedBefore = false;
  if(id){
    po = Store.data.purchaseOrders.find(p=>p.id===id);
    wasConfirmedBefore = po.status !== 'draft' && po.status !== 'pending';
    po.supplierId = supplier.id; po.supplierName = supplier.name; po.supplierCountry = supplier.country;
    po.status = status; po.priority = priority; po.expectedDate = new Date(expectedDate).toISOString();
    po.notes = notes; po.items = items; po.total = computeTotal(items);
    Store.logActivity(`Purchase Order ${po.id} updated (status: ${status})`, 'fa-pen', 'violet', 'po', po.id);
  }else{
    po = {
      id: `PO-${2400+Store.data.purchaseOrders.length+Math.floor(Math.random()*90)}`,
      supplierId: supplier.id, supplierName: supplier.name, supplierCountry: supplier.country,
      status, items, total: computeTotal(items), createdAt: new Date().toISOString(),
      expectedDate: new Date(expectedDate).toISOString(), priority, notes
    };
    Store.data.purchaseOrders.unshift(po);
    Store.logActivity(`New Purchase Order ${po.id} created for ${supplier.name}`, 'fa-file-invoice', 'violet', 'po', po.id);
  }
  Store.save();

  // Automation trigger: PO reaches confirmed (or beyond) -> auto-generate labels
  const triggerStatuses = ['confirmed','production','labels','shipped','received'];
  const autoOn = document.getElementById('chkAutoLabel')?.checked ?? true;
  if(autoOn && triggerStatuses.includes(po.status)){
    const jobs = LabelEngine.autoGenerateForPO(po);
    if(jobs.length) toast('Label automation triggered', `${jobs.length} label jobs auto-queued for ${po.id}.`, 'info', 'fa-tags');
  }

  closeModal('modalPO');
  toast('Purchase Order saved', `${po.id} — ${fmtMoney(po.total)}`, 'success');
  renderAll();
}

function openPODetail(poId){
  const po = Store.data.purchaseOrders.find(p=>p.id===poId);
  if(!po) return;
  document.getElementById('poDetailTitle').textContent = `${po.id} · ${po.supplierName}`;
  const meta = STATUS_META[po.status];
  const jobs = LabelEngine.jobsForPO(po.id);

  document.getElementById('poDetailBody').innerHTML = `
    <div class="flex gap-16" style="flex-wrap:wrap;margin-bottom:16px;">
      <span class="badge badge-${meta.color}"><span class="bdot"></span>${po.status}</span>
      <span class="text-sm text-muted"><i class="fa-solid fa-globe"></i> ${po.supplierCountry}</span>
      <span class="text-sm text-muted"><i class="fa-solid fa-calendar"></i> Expected ${fmtDate(po.expectedDate)}</span>
      <span class="text-sm text-muted"><i class="fa-solid fa-flag"></i> ${po.priority}</span>
    </div>
    ${po.notes ? `<div class="glass card" style="padding:12px 14px;margin-bottom:16px;"><i class="fa-solid fa-note-sticky" style="color:var(--accent-amber);margin-right:8px;"></i>${po.notes}</div>` : ''}

    <table class="line-items-table">
      <thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
      <tbody>
        ${po.items.map(i=>`<tr><td class="cell-strong">${i.sku}</td><td>${i.name}</td><td>${i.qty}</td><td>${fmtMoney(i.unitPrice)}</td><td class="cell-strong">${fmtMoney(i.total)}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="flex mt-12" style="justify-content:flex-end;">
      <div style="font-size:19px;font-weight:800;">Total: ${fmtMoney(po.total)}</div>
    </div>

    <hr class="sep">
    <div class="card-title" style="font-size:13.5px;"><i class="fa-solid fa-tags" style="color:var(--accent-pink);"></i> Label Jobs (${jobs.length})</div>
    <div class="flex gap-8 mt-8" style="flex-wrap:wrap;">
      ${jobs.length ? jobs.map(j=>`<span class="badge badge-${j.status}"><span class="bdot"></span>${j.type}: ${j.status}</span>`).join('') : `<span class="text-sm text-muted">No label jobs yet — confirm this PO to trigger automation.</span>`}
    </div>
  `;

  const workflowIdx = PO_WORKFLOW.indexOf(po.status);
  const nextStage = workflowIdx>=0 && workflowIdx<PO_WORKFLOW.length-1 ? PO_WORKFLOW[workflowIdx+1] : null;

  document.getElementById('poDetailFooter').innerHTML = `
    ${po.status!=='cancelled' ? `<button class="btn btn-danger btn-sm" id="btnCancelPOInline"><i class="fa-solid fa-ban"></i> Cancel PO</button>` : ''}
    <div class="spacer" style="flex:1;"></div>
    <button class="btn btn-glass" id="btnEditPOInline"><i class="fa-solid fa-pen"></i> Edit</button>
    ${nextStage ? `<button class="btn btn-primary btn-ripple" id="btnAdvancePOInline"><i class="fa-solid fa-arrow-right"></i> Advance to ${nextStage}</button>` : ''}
  `;

  document.getElementById('btnEditPOInline')?.addEventListener('click', ()=>{ closeModal('modalPODetail'); openPOModal(po.id); });
  document.getElementById('btnCancelPOInline')?.addEventListener('click', ()=>{
    po.status='cancelled'; Store.save(); Store.logActivity(`Purchase Order ${po.id} cancelled`, 'fa-ban', 'amber', 'po', po.id);
    closeModal('modalPODetail'); renderAll(); toast('PO cancelled', po.id, 'warn');
  });
  document.getElementById('btnAdvancePOInline')?.addEventListener('click', ()=>{
    po.status = nextStage; Store.save();
    Store.logActivity(`Purchase Order ${po.id} advanced to ${nextStage}`, 'fa-forward', 'violet', 'po', po.id);
    const autoOn = document.getElementById('chkAutoLabel')?.checked ?? true;
    if(autoOn && ['confirmed','production','labels','shipped','received'].includes(nextStage)){
      const jobs2 = LabelEngine.autoGenerateForPO(po);
      if(jobs2.length) toast('Label automation triggered', `${jobs2.length} label jobs auto-queued for ${po.id}.`, 'info', 'fa-tags');
    }
    closeModal('modalPODetail'); renderAll(); toast('Stage advanced', `${po.id} → ${nextStage}`, 'success');
  });

  openModal('modalPODetail');
}

/* ============================================================
   PIPELINE (KANBAN)
   ============================================================ */
function renderKanban(){
  const stages = PO_WORKFLOW.concat(['cancelled']);
  const board = document.getElementById('kanbanBoard');
  board.innerHTML = stages.map(stage=>{
    const items = Store.data.purchaseOrders.filter(p=>p.status===stage);
    return `
    <div class="kanban-col">
      <div class="kanban-col-head">
        <b>${stage[0].toUpperCase()+stage.slice(1)}</b>
        <span class="count">${items.length}</span>
      </div>
      <div class="kanban-body" data-stage="${stage}">
        ${items.map(po=>`
          <div class="kanban-card glass" draggable="true" data-po-id="${po.id}">
            <div class="kc-top"><span class="kc-po">${po.id}</span><i class="fa-solid fa-grip-vertical" style="color:var(--text-3);"></i></div>
            <div class="kc-title">${po.supplierName}</div>
            <div class="cell-muted">${po.items.length} SKUs · ${po.priority}</div>
            <div class="kc-meta"><span>${fmtDateShort(po.expectedDate)}</span><span class="kc-value">${fmtMoney(po.total)}</span></div>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  // Drag events
  board.querySelectorAll('.kanban-card').forEach(card=>{
    card.addEventListener('dragstart', ()=> card.classList.add('dragging'));
    card.addEventListener('dragend', ()=> card.classList.remove('dragging'));
    card.addEventListener('click', ()=> openPODetail(card.dataset.poId));
  });
  board.querySelectorAll('.kanban-body').forEach(zone=>{
    zone.addEventListener('dragover', (e)=>{ e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', ()=> zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e)=>{
      e.preventDefault();
      zone.classList.remove('drag-over');
      const dragging = board.querySelector('.dragging');
      if(!dragging) return;
      const poId = dragging.dataset.poId;
      const newStage = zone.dataset.stage;
      const po = Store.data.purchaseOrders.find(p=>p.id===poId);
      if(po && po.status !== newStage){
        po.status = newStage; Store.save();
        Store.logActivity(`Purchase Order ${po.id} moved to ${newStage} (drag & drop)`, 'fa-hand', 'cyan', 'po', po.id);
        const autoOn = document.getElementById('chkAutoLabel')?.checked ?? true;
        if(autoOn && ['confirmed','production','labels','shipped','received'].includes(newStage)){
          const jobs = LabelEngine.autoGenerateForPO(po);
          if(jobs.length) toast('Label automation triggered', `${jobs.length} jobs queued for ${po.id}.`, 'info', 'fa-tags');
        }
        renderKanban();
        renderNavBadges(); renderKPIs(); renderWorkflowTrack();
        toast('Stage updated', `${po.id} → ${newStage}`, 'success');
      }
    });
  });
}

/* ============================================================
   CUSTOMER QUOTES MODULE
   ============================================================ */
function initQuoteModule(){
  document.querySelectorAll('[data-quote-filter]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      document.querySelectorAll('[data-quote-filter]').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      quoteFilter = chip.dataset.quoteFilter;
      renderQuoteTable();
    });
  });
  document.getElementById('btnNewQuote').addEventListener('click', ()=> openQuoteModal());
  document.getElementById('btnAddQuoteItem').addEventListener('click', ()=> addQuoteItemRow());
  document.getElementById('btnSaveQuote').addEventListener('click', saveQuote);
  document.getElementById('quoteDiscount').addEventListener('input', recalcQuoteTotal);
  document.getElementById('btnExportQuotes').addEventListener('click', ()=> exportCSV(Store.data.quotes.map(q=>({
    Quote:q.id, Customer:q.customerName, Items:q.items.length, Subtotal:q.subtotal, Discount:q.discount+'%', Total:q.total, Status:q.status, ValidUntil:fmtDate(q.validUntil)
  })), 'customer_quotes.csv'));

  const custSel = document.getElementById('quoteCustomer');
  custSel.innerHTML = CUSTOMERS.map(c=>`<option value="${c.id}">${c.name} (${c.tier})</option>`).join('');
  const statSel = document.getElementById('quoteStatus');
  statSel.innerHTML = QUOTE_STATUSES.map(s=>`<option value="${s}">${s[0].toUpperCase()+s.slice(1)}</option>`).join('');
}

function renderQuoteTable(searchQuery=''){
  const tbody = document.getElementById('quoteTableBody');
  let list = Store.data.quotes;
  if(quoteFilter!=='all') list = list.filter(q=>q.status===quoteFilter);
  if(searchQuery) list = list.filter(q=> (q.id+q.customerName).toLowerCase().includes(searchQuery));

  document.getElementById('quoteEmptyState').style.display = list.length ? 'none':'block';

  tbody.innerHTML = list.map(q=>{
    const meta = STATUS_META[q.status];
    const initials = q.customerName.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    return `
    <tr>
      <td class="cell-strong pointer" data-open-quote="${q.id}">${q.id}</td>
      <td>
        <div class="flex gap-10">
          <div class="avatar-chip" style="background:var(--grad-warm);color:#fff;">${initials}</div>
          <div><div style="font-weight:700;">${q.customerName}</div><div class="cell-muted">${q.customerTier}</div></div>
        </div>
      </td>
      <td>${q.items.length} SKUs</td>
      <td class="cell-strong">${fmtMoney(q.total)}${q.discount?`<div class="cell-muted">-${q.discount}% off</div>`:''}</td>
      <td class="cell-muted">${fmtDate(q.validUntil)}</td>
      <td><span class="badge badge-${meta.color}"><span class="bdot"></span>${q.status}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn btn-glass btn-icon btn-sm" data-open-quote="${q.id}" title="View"><i class="fa-solid fa-eye"></i></button>
          <button class="btn btn-glass btn-icon btn-sm" data-edit-quote="${q.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-open-quote]').forEach(el=> el.addEventListener('click', ()=> openQuoteDetail(el.dataset.openQuote)));
  tbody.querySelectorAll('[data-edit-quote]').forEach(el=> el.addEventListener('click', ()=> openQuoteModal(el.dataset.editQuote)));
}

function addQuoteItemRow(item={}){
  const tbody = document.getElementById('quoteItemsBody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td style="min-width:190px;">
      <select class="q-item-sku">
        ${PRODUCTS.map(p=>`<option value="${p.sku}" data-price="${p.price}" data-name="${p.name}" ${p.sku===item.sku?'selected':''}>${p.sku} — ${p.name}</option>`).join('')}
      </select>
    </td>
    <td style="width:100px;"><input type="number" class="q-item-price" value="${item.unitPrice ?? PRODUCTS[0].price}" step="0.5" style="width:90px;"></td>
    <td style="width:90px;"><input type="number" class="q-item-qty" value="${item.qty ?? 20}" style="width:80px;"></td>
    <td class="q-item-total" style="width:100px;font-weight:800;">${fmtMoney((item.unitPrice ?? PRODUCTS[0].price)*(item.qty ?? 20))}</td>
    <td><i class="fa-solid fa-trash pointer" style="color:var(--accent-red);" data-remove-row></i></td>
  `;
  tbody.appendChild(row);
  const skuSel = row.querySelector('.q-item-sku');
  const priceInput = row.querySelector('.q-item-price');
  const qtyInput = row.querySelector('.q-item-qty');
  const totalCell = row.querySelector('.q-item-total');
  function recalcRow(){
    totalCell.textContent = fmtMoney((+priceInput.value||0)*(+qtyInput.value||0));
    recalcQuoteTotal();
  }
  skuSel.addEventListener('change', ()=>{ priceInput.value = skuSel.selectedOptions[0].dataset.price; recalcRow(); });
  priceInput.addEventListener('input', recalcRow);
  qtyInput.addEventListener('input', recalcRow);
  row.querySelector('[data-remove-row]').addEventListener('click', ()=>{ row.remove(); recalcQuoteTotal(); });
  recalcQuoteTotal();
}

function recalcQuoteTotal(){
  let subtotal = 0;
  document.querySelectorAll('#quoteItemsBody tr').forEach(row=>{
    subtotal += (+row.querySelector('.q-item-price').value||0) * (+row.querySelector('.q-item-qty').value||0);
  });
  const discount = +document.getElementById('quoteDiscount').value || 0;
  const total = subtotal * (1-discount/100);
  document.getElementById('quoteSubtotalPreview').textContent = fmtMoney(subtotal);
  document.getElementById('quoteTotalPreview').textContent = fmtMoney(total);
}

function openQuoteModal(quoteId=null){
  document.getElementById('quoteItemsBody').innerHTML = '';
  document.getElementById('quoteEditId').value = quoteId || '';
  if(quoteId){
    const q = Store.data.quotes.find(x=>x.id===quoteId);
    document.getElementById('quoteModalTitle').textContent = `Edit ${q.id}`;
    document.getElementById('quoteCustomer').value = q.customerId;
    document.getElementById('quoteStatus').value = q.status;
    document.getElementById('quoteValidUntil').value = q.validUntil.slice(0,10);
    document.getElementById('quoteDiscount').value = q.discount;
    q.items.forEach(it=> addQuoteItemRow(it));
  }else{
    document.getElementById('quoteModalTitle').textContent = 'New Customer Quote';
    document.getElementById('quoteCustomer').selectedIndex = 0;
    document.getElementById('quoteStatus').value = 'draft';
    document.getElementById('quoteValidUntil').value = daysFromNow(21).slice(0,10);
    document.getElementById('quoteDiscount').value = 0;
    addQuoteItemRow();
  }
  openModal('modalQuote');
}

function saveQuote(){
  const id = document.getElementById('quoteEditId').value;
  const customer = CUSTOMERS.find(c=>c.id===document.getElementById('quoteCustomer').value);
  const status = document.getElementById('quoteStatus').value;
  const validUntil = document.getElementById('quoteValidUntil').value || new Date().toISOString();
  const discount = +document.getElementById('quoteDiscount').value || 0;

  const items = [...document.querySelectorAll('#quoteItemsBody tr')].map(row=>{
    const opt = row.querySelector('.q-item-sku').selectedOptions[0];
    const price = +row.querySelector('.q-item-price').value || 0;
    const qty = +row.querySelector('.q-item-qty').value || 0;
    const product = PRODUCTS.find(p=>p.sku===opt.value);
    return { id: uid('LI'), sku: opt.value, name: opt.dataset.name, category: product?.category||'General', unitPrice: price, qty, sizes:{}, total: +(price*qty).toFixed(2) };
  });
  if(!items.length){ toast('Missing items', 'Add at least one line item.', 'error'); return; }

  const subtotal = computeTotal(items);
  const total = +(subtotal*(1-discount/100)).toFixed(2);

  let q;
  if(id){
    q = Store.data.quotes.find(x=>x.id===id);
    q.customerId=customer.id; q.customerName=customer.name; q.customerContact=customer.contact; q.customerEmail=customer.email; q.customerTier=customer.tier;
    q.status=status; q.validUntil=new Date(validUntil).toISOString(); q.discount=discount; q.items=items; q.subtotal=subtotal; q.total=total;
    Store.logActivity(`Quote ${q.id} updated (status: ${status})`, 'fa-pen', 'cyan', 'quote', q.id);
  }else{
    q = {
      id:`QT-${5100+Store.data.quotes.length+Math.floor(Math.random()*90)}`,
      customerId:customer.id, customerName:customer.name, customerContact:customer.contact, customerEmail:customer.email, customerTier:customer.tier,
      status, items, subtotal, discount, total, createdAt: new Date().toISOString(), validUntil: new Date(validUntil).toISOString(), convertedPoId:null
    };
    Store.data.quotes.unshift(q);
    Store.logActivity(`New Quote ${q.id} created for ${customer.name}`, 'fa-file-signature', 'cyan', 'quote', q.id);
  }
  Store.save();
  closeModal('modalQuote');
  toast('Quote saved', `${q.id} — ${fmtMoney(q.total)}`, 'success');
  renderAll();
}

function openQuoteDetail(quoteId){
  const q = Store.data.quotes.find(x=>x.id===quoteId);
  if(!q) return;
  const meta = STATUS_META[q.status];
  document.getElementById('quoteDetailTitle').textContent = `${q.id} · ${q.customerName}`;
  document.getElementById('quoteDetailBody').innerHTML = `
    <div class="flex gap-16" style="flex-wrap:wrap;margin-bottom:16px;">
      <span class="badge badge-${meta.color}"><span class="bdot"></span>${q.status}</span>
      <span class="text-sm text-muted"><i class="fa-solid fa-user"></i> ${q.customerContact}</span>
      <span class="text-sm text-muted"><i class="fa-solid fa-envelope"></i> ${q.customerEmail}</span>
      <span class="text-sm text-muted"><i class="fa-solid fa-calendar"></i> Valid until ${fmtDate(q.validUntil)}</span>
    </div>
    <table class="line-items-table">
      <thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
      <tbody>${q.items.map(i=>`<tr><td class="cell-strong">${i.sku}</td><td>${i.name}</td><td>${i.qty}</td><td>${fmtMoney(i.unitPrice)}</td><td class="cell-strong">${fmtMoney(i.total)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="flex mt-12" style="justify-content:flex-end;gap:20px;">
      <div class="text-sm text-muted">Subtotal ${fmtMoney(q.subtotal)} ${q.discount?`· -${q.discount}%`:''}</div>
      <div style="font-size:19px;font-weight:800;">Total: ${fmtMoney(q.total)}</div>
    </div>
    ${q.convertedPoId ? `<div class="glass card mt-12" style="padding:10px 14px;"><i class="fa-solid fa-arrow-right-arrow-left" style="color:var(--accent-green);margin-right:8px;"></i>Converted to <b>${q.convertedPoId}</b></div>` : ''}
  `;

  document.getElementById('quoteDetailFooter').innerHTML = `
    ${!['converted','rejected','expired'].includes(q.status) ? `<button class="btn btn-glass btn-sm" id="btnSendQuoteInline"><i class="fa-solid fa-paper-plane"></i> Mark Sent</button>` : ''}
    ${q.status==='sent'||q.status==='viewed' ? `<button class="btn btn-success btn-sm" id="btnAcceptQuoteInline"><i class="fa-solid fa-check"></i> Mark Accepted</button>` : ''}
    <div style="flex:1;"></div>
    ${!q.convertedPoId && q.status!=='rejected' ? `<button class="btn btn-primary btn-ripple" id="btnConvertQuoteInline"><i class="fa-solid fa-bolt"></i> 1-Click Convert to PO</button>` : ''}
  `;

  document.getElementById('btnSendQuoteInline')?.addEventListener('click', ()=>{
    q.status='sent'; Store.save(); Store.logActivity(`Quote ${q.id} sent to ${q.customerName}`, 'fa-paper-plane', 'cyan', 'quote', q.id);
    closeModal('modalQuoteDetail'); renderAll(); toast('Quote sent', q.id, 'success');
  });
  document.getElementById('btnAcceptQuoteInline')?.addEventListener('click', ()=>{
    q.status='accepted'; Store.save(); Store.logActivity(`Quote ${q.id} accepted by ${q.customerName}`, 'fa-thumbs-up', 'cyan', 'quote', q.id);
    closeModal('modalQuoteDetail'); renderAll(); toast('Quote accepted', q.id, 'success');
  });
  document.getElementById('btnConvertQuoteInline')?.addEventListener('click', ()=> convertQuoteToPO(q));

  openModal('modalQuoteDetail');
}

function convertQuoteToPO(q){
  const supplier = pick(SUPPLIERS);
  const items = q.items.map(i=> ({...i, id:uid('LI')}));
  const po = {
    id:`PO-${2400+Store.data.purchaseOrders.length+Math.floor(Math.random()*90)}`,
    supplierId:supplier.id, supplierName:supplier.name, supplierCountry:supplier.country,
    status:'confirmed', items, total: q.total, createdAt:new Date().toISOString(),
    expectedDate: daysFromNow(30), priority:'Standard',
    notes:`Auto-converted from customer quote ${q.id} (${q.customerName}).`
  };
  Store.data.purchaseOrders.unshift(po);
  q.status='converted'; q.convertedPoId=po.id;
  Store.save();
  Store.logActivity(`Quote ${q.id} converted to Purchase Order ${po.id}`, 'fa-arrow-right-arrow-left', 'green', 'quote', q.id);

  const autoOn = document.getElementById('chkAutoLabel')?.checked ?? true;
  if(autoOn){
    const jobs = LabelEngine.autoGenerateForPO(po);
    if(jobs.length) Store.logActivity(`Label automation triggered: ${jobs.length} jobs for ${po.id}`, 'fa-tags', 'pink', 'label', po.id);
  }

  closeModal('modalQuoteDetail');
  renderAll();
  toast('Converted to Purchase Order', `${q.id} → ${po.id} (${fmtMoney(po.total)})`, 'success', 'fa-bolt');
}

/* ============================================================
   LABEL AUTOMATION MODULE
   ============================================================ */
function initLabelModule(){
  document.querySelectorAll('[data-label-filter]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      document.querySelectorAll('[data-label-filter]').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      labelFilter = chip.dataset.labelFilter;
      renderLabelStudio();
    });
  });
  document.getElementById('chkSelectAllLabels').addEventListener('change', (e)=>{
    const cards = document.querySelectorAll('#labelJobsGrid [data-job-checkbox]');
    cards.forEach(cb=>{ cb.checked = e.target.checked; toggleLabelSelection(cb.dataset.jobCheckbox, e.target.checked); });
  });
  document.getElementById('btnGenerateSelected').addEventListener('click', ()=>{
    if(!selectedLabelIds.size){ toast('Nothing selected', 'Select label jobs first.', 'error'); return; }
    LabelEngine.bulkSetStatus([...selectedLabelIds], 'generated');
    Store.logActivity(`${selectedLabelIds.size} label jobs generated (barcode/QR rendered)`, 'fa-wand-magic-sparkles', 'pink', 'label');
    toast('Labels generated', `${selectedLabelIds.size} jobs rendered.`, 'success');
    selectedLabelIds.clear();
    renderLabelStudio(); renderAll();
  });
  document.getElementById('btnPrintSelected').addEventListener('click', ()=>{
    if(!selectedLabelIds.size){ toast('Nothing selected', 'Select label jobs first.', 'error'); return; }
    printLabelJobs([...selectedLabelIds]);
  });
}

function renderLabelStudio(){
  const stats = LabelEngine.stats();
  document.getElementById('lblTotalJobs').textContent = stats.total;
  document.getElementById('lblQueuedJobs').textContent = stats.queued;
  document.getElementById('lblGeneratedJobs').textContent = stats.generated;
  document.getElementById('lblPrintedJobs').textContent = stats.printed;

  let jobs = Store.data.labelJobs;
  if(labelFilter!=='all') jobs = jobs.filter(j=>j.status===labelFilter);
  jobs = jobs.slice().sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)).slice(0,60);

  document.getElementById('labelEmptyState').style.display = jobs.length ? 'none':'block';
  const grid = document.getElementById('labelJobsGrid');
  grid.innerHTML = jobs.map(j=>`
    <div class="glass label-job-card" data-job-card="${j.id}">
      <div class="lj-top">
        <div>
          <div class="lj-type"><i class="fa-solid ${LabelEngine.labelIconFor(j.type)}"></i> ${j.type}</div>
          <div class="text-sm" style="font-weight:700;margin-top:2px;">${j.sku}</div>
        </div>
        <label class="checkbox-wrap"><input type="checkbox" data-job-checkbox="${j.id}"></label>
      </div>
      <div class="lj-preview-holder"></div>
      <div class="lj-meta"><span>${j.poId}</span><span>Qty ${j.qty}</span></div>
      <div class="flex" style="justify-content:space-between;">
        <span class="badge badge-${j.status}"><span class="bdot"></span>${j.status}</span>
        <div class="lj-actions">
          ${j.status==='queued' ? `<button class="btn btn-glass btn-sm" data-generate-job="${j.id}"><i class="fa-solid fa-wand-magic-sparkles"></i></button>` : ''}
          ${j.status==='generated' ? `<button class="btn btn-primary btn-sm" data-print-job="${j.id}"><i class="fa-solid fa-print"></i></button>` : ''}
          ${j.status==='printed' ? `<button class="btn btn-glass btn-sm" data-view-job="${j.id}"><i class="fa-solid fa-eye"></i></button>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  // render preview (barcode/qr) for generated+printed jobs, placeholder for queued
  jobs.forEach(j=>{
    const card = grid.querySelector(`[data-job-card="${j.id}"] .lj-preview-holder`);
    if(!card) return;
    if(j.status==='queued'){
      card.innerHTML = `<div class="lj-placeholder"><i class="fa-solid fa-hourglass-half"></i>Awaiting generation</div>`;
    }else{
      card.innerHTML = `<div class="lj-preview"></div>`;
      renderLabelPreviewInto(card.querySelector('.lj-preview'), j);
    }
  });

  grid.querySelectorAll('[data-job-checkbox]').forEach(cb=>{
    cb.checked = selectedLabelIds.has(cb.dataset.jobCheckbox);
    cb.addEventListener('change', ()=> toggleLabelSelection(cb.dataset.jobCheckbox, cb.checked));
  });
  grid.querySelectorAll('[data-generate-job]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      LabelEngine.setStatus(btn.dataset.generateJob, 'generated');
      Store.logActivity(`Label job generated: ${btn.dataset.generateJob}`, 'fa-wand-magic-sparkles', 'pink', 'label');
      renderLabelStudio(); renderAll();
      toast('Label generated', 'Barcode/QR rendered successfully.', 'success');
    });
  });
  grid.querySelectorAll('[data-print-job]').forEach(btn=>{
    btn.addEventListener('click', ()=> printLabelJobs([btn.dataset.printJob]));
  });
  grid.querySelectorAll('[data-view-job]').forEach(btn=>{
    btn.addEventListener('click', ()=> openLabelPreviewModal(btn.dataset.viewJob));
  });
}

function toggleLabelSelection(id, checked){
  if(checked) selectedLabelIds.add(id); else selectedLabelIds.delete(id);
}

function renderLabelPreviewInto(container, job){
  container.innerHTML = `<div class="lj-sku">${job.code}</div>`;
  if(job.type === 'QR Compliance Tag'){
    const qrDiv = document.createElement('div');
    container.appendChild(qrDiv);
    LabelEngine.renderQR(qrDiv, `${job.poId}|${job.sku}|${job.code}`);
  }else{
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    LabelEngine.renderBarcode(canvas, job.code);
  }
  const label = document.createElement('div');
  label.style.fontSize = '9.5px'; label.style.marginTop='2px'; label.style.fontWeight='700';
  label.textContent = job.type;
  container.appendChild(label);
}

function openLabelPreviewModal(jobId){
  const job = Store.data.labelJobs.find(j=>j.id===jobId);
  if(!job) return;
  const body = document.getElementById('labelPreviewBody');
  body.innerHTML = `<div class="lj-preview" style="width:220px;"></div>`;
  renderLabelPreviewInto(body.querySelector('.lj-preview'), job);
  document.getElementById('btnPrintSingleLabel').onclick = ()=> printLabelJobs([jobId]);
  openModal('modalLabelPreview');
}

function printLabelJobs(jobIds){
  const jobs = Store.data.labelJobs.filter(j=>jobIds.includes(j.id));
  if(!jobs.length) return;
  const printArea = document.getElementById('printArea');
  printArea.innerHTML = `<div class="print-label-sheet">${jobs.map(j=>`
    <div class="print-label">
      <div style="font-size:10px;font-weight:800;">${j.type}</div>
      <div style="font-size:11px;margin:4px 0;">${j.sku}</div>
      <div class="print-code-${j.id}" style="display:flex;flex-direction:column;align-items:center;"></div>
      <div style="font-size:9px;margin-top:4px;">${j.poId} · Qty ${j.qty}</div>
    </div>`).join('')}</div>`;

  jobs.forEach(j=>{
    const holder = printArea.querySelector(`.print-code-${j.id}`);
    if(j.type === 'QR Compliance Tag'){
      LabelEngine.renderQR(holder, `${j.poId}|${j.sku}|${j.code}`);
    }else{
      const canvas = document.createElement('canvas');
      holder.appendChild(canvas);
      LabelEngine.renderBarcode(canvas, j.code);
    }
  });

  LabelEngine.bulkSetStatus(jobIds, 'printed');
  Store.logActivity(`${jobIds.length} label(s) sent to printer`, 'fa-print', 'green', 'label');
  selectedLabelIds.clear();
  renderLabelStudio(); renderAll();
  toast('Print job sent', `${jobIds.length} label(s) marked as printed.`, 'success', 'fa-print');

  setTimeout(()=>{ window.print(); }, 200);
}

/* ============================================================
   SETTINGS
   ============================================================ */
function initSettings(){
  document.getElementById('btnSaveSettings').addEventListener('click', ()=>{
    Store.data.settings.orgName = document.getElementById('settOrgName').value;
    Store.save();
    toast('Settings saved', 'Preferences updated.', 'success');
  });
  document.getElementById('btnReseedData').addEventListener('click', ()=>{
    if(confirm('Reseed all demo data? This will replace current records.')){
      Store.reset(); renderAll(); toast('Data reseeded', 'Fresh dataset generated.', 'info');
    }
  });
  document.getElementById('btnWipeData').addEventListener('click', ()=>{
    if(confirm('Wipe ALL purchase orders, quotes, and label jobs? This cannot be undone.')){
      Store.wipe(); renderAll(); toast('Data wiped', 'All records cleared.', 'warn');
    }
  });
}

/* ============================================================
   CSV EXPORT
   ============================================================ */
function exportCSV(rows, filename){
  if(!rows.length){ toast('Nothing to export', '', 'error'); return; }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')].concat(
    rows.map(r=> headers.map(h=> `"${String(r[h]).replace(/"/g,'""')}"`).join(','))
  ).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast('Export ready', filename, 'success', 'fa-file-export');
}
