/* ============================================================
   FASHION OPS — Label Automation Engine
   Simulates the brand's real-world workflow:
   PO confirmed -> auto-generate label jobs (barcode/QR/care/size)
   -> render CODE128 barcodes + QR compliance codes -> batch print.
   Uses JsBarcode + qrcode.js (loaded via CDN in index.html).
   ============================================================ */

const LabelEngine = {

  /** Auto-trigger label job creation the moment a PO becomes "confirmed" or later */
  autoGenerateForPO(po){
    const existing = Store.data.labelJobs.filter(j => j.poId === po.id);
    if(existing.length) return existing;
    const jobs = generateLabelJobsForPO(po);
    Store.data.labelJobs.push(...jobs);
    Store.save();
    Store.logActivity(`Label automation triggered: ${jobs.length} label jobs queued for ${po.id}`, 'fa-tags', 'pink', 'label', po.id);
    return jobs;
  },

  jobsForPO(poId){
    return Store.data.labelJobs.filter(j => j.poId === poId);
  },

  setStatus(jobId, status){
    const job = Store.data.labelJobs.find(j=>j.id===jobId);
    if(job){ job.status = status; Store.save(); }
    return job;
  },

  bulkSetStatus(jobIds, status){
    Store.data.labelJobs.forEach(j=>{ if(jobIds.includes(j.id)) j.status = status; });
    Store.save();
  },

  stats(){
    const jobs = Store.data.labelJobs;
    return {
      total: jobs.length,
      queued: jobs.filter(j=>j.status==='queued').length,
      generated: jobs.filter(j=>j.status==='generated').length,
      printed: jobs.filter(j=>j.status==='printed').length,
    };
  },

  /** Render a barcode into a canvas element using JsBarcode */
  renderBarcode(canvasEl, code){
    try{
      JsBarcode(canvasEl, code, {
        format: "CODE128",
        lineColor: "#0a0a0a",
        width: 2,
        height: 42,
        displayValue: false,
        margin: 4,
        background: "#ffffff"
      });
    }catch(e){ console.warn('barcode render failed', e); }
  },

  /** Render a QR code into a target div using qrcode.js */
  renderQR(targetEl, text){
    targetEl.innerHTML = '';
    try{
      new QRCode(targetEl, {
        text,
        width: 84,
        height: 84,
        colorDark: "#0a0a0a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    }catch(e){ console.warn('qr render failed', e); }
  },

  labelIconFor(type){
    switch(type){
      case 'Care Label': return 'fa-shirt';
      case 'Barcode Tag': return 'fa-barcode';
      case 'QR Compliance Tag': return 'fa-qrcode';
      case 'Size Sticker': return 'fa-ruler';
      case 'Hangtag': return 'fa-tag';
      default: return 'fa-tag';
    }
  }
};
