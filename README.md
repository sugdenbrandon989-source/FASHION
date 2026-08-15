# FASHION OPS — Purchase Orders, Quotes & Label Automation Dashboard

An ultra-modern, **dark-mode glassmorphism** interactive web dashboard for a fashion brand's B2B operations team: manage supplier **Purchase Orders**, **Customer Quotes**, and the **label automation workflow** (barcode / QR / care-label / size-sticker generation) that fires automatically when a PO is confirmed.

This is a **1-click, zero-install, static** web app — open `index.html` and it works. All data is generated and persisted client-side (localStorage), so it's fully interactive out of the box with realistic seeded demo data (26 POs, 20 quotes, 200+ label jobs).

## ✨ Highlights

- **Glassmorphism design system** — frosted glass cards, animated gradient blobs, noise overlay, glow shadows, smooth `cubic-bezier` transitions throughout.
- **Dashboard** — KPI cards (Active PO Value, Open Quote Value, Quote Win Rate, Label Jobs Pending), order-lifecycle stage tracker, revenue trend + status-mix charts (Chart.js), activity feed, top customers.
- **Purchase Orders** — full CRUD with a dynamic line-item editor (SKU, unit price, qty, live totals), status/priority filters, CSV export, detail drawer with one-click stage advancement.
- **PO Pipeline** — drag-and-drop Kanban board across all lifecycle stages (Draft → Pending → Confirmed → Production → Labels → Shipped → Received, plus Cancelled).
- **Customer Quotes** — CRUD with discounting, status lifecycle (draft → sent → viewed → accepted/rejected/expired), and a **1-Click "Convert to PO"** action that auto-spins a confirmed purchase order from an accepted quote.
- **Label Automation Studio** — the core "label automation workflow": the moment a PO is confirmed (via save, kanban drag, or quote conversion), the system auto-queues a Barcode Tag, Care Label, and QR Compliance Tag / Size Sticker job **per SKU**. Jobs render real scannable **CODE128 barcodes** (JsBarcode) and **QR codes** (qrcode.js), support batch select → Generate → Print, and print to a dedicated print-only label sheet layout.
- **Settings** — org preferences, configurable label-automation rules, reseed/wipe demo data.
- Fully responsive (mobile slide-in sidebar), toast notifications, empty states, keyboard (Esc) modal handling, deep-linkable views via URL hash.

## 🗂 Project Structure

```
webapp/
├── index.html          # App shell + all view markup + modals
├── css/
│   └── style.css       # Dark glassmorphism design system
├── js/
│   ├── data.js         # Domain model, seed data generator, localStorage Store
│   ├── labels.js       # Label automation engine (barcode/QR rendering, job lifecycle)
│   └── app.js          # UI logic: navigation, rendering, CRUD, charts, kanban, modals
└── assets/              # (reserved for static assets)
```

## 🏷️ Label Automation Workflow (modeled)

```
PO Draft → Pending → CONFIRMED  ─┐
                                  ├─▶ auto-queue label jobs per SKU:
                                  │     • Barcode Tag   (CODE128)
                                  │     • Care Label
                                  │     • QR Compliance Tag  or  Size Sticker
                                  ▼
                        Production → Labels → Shipped → Received
```

Trigger points implemented:
1. Creating/editing a PO and setting its status to **Confirmed** (or beyond).
2. Dragging a PO card into the **Confirmed** column on the Kanban pipeline.
3. **1-Click Convert** a Customer Quote into a Purchase Order (auto-confirmed).

Each label job flows through **Queued → Generated → Printed**, with batch multi-select, "Generate Selected," "Print Selected," and a dedicated print stylesheet (`@media print`) that lays out a clean label sheet grid.

## ▶️ Running locally

No build step required.

```bash
cd webapp
python3 -m http.server 8000
# open http://localhost:8000
```

## 🧱 Tech

Vanilla HTML/CSS/JS (no framework/build tooling) + CDN libraries:
- [Chart.js](https://www.chartjs.org/) — revenue & status charts
- [JsBarcode](https://github.com/lindell/JsBarcode) — CODE128 barcode rendering
- [qrcode.js](https://github.com/davidshimjs/qrcodejs) — QR code rendering
- [Font Awesome 6](https://fontawesome.com/) — iconography
- Google Fonts — Plus Jakarta Sans

All state lives in `localStorage` (`fashionops_db_v1`) — use **Settings → Reseed Demo Data** or **Wipe All Data** to reset.
