// Menggunakan link CSV dari kode Anda
const sheetCSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5jwEtWeGxCR1S2sXEmHDf-NoHzzNTbvf4bg8ZDzJCZoCsJqe05UOnuXrUGzM-BZeNVarVfVPZcPX-/pub?gid=498206024&single=true&output=csv"; [cite: 115]

// LOGO (Supabase public URL kamu)
const logoURL =
  "https://jmlfavfecfnmjlznmpwk.supabase.co/storage/v1/object/public/breal/auora-removebg-preview.png"; [cite: 115]

// ===== MAP =====
const map = L.map("map").setView([-3.35, 114.6], 12); [cite: 116]
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map); [cite: 116]

// --- FITUR TAMBAHAN: LAYER GROUP ---
// Membuat grup khusus untuk marker agar bisa dihapus sekaligus
const markerGroup = L.layerGroup().addTo(map);

// ===== DOM =====
const statsDiv = document.getElementById("stats"); [cite: 116]
const salesBox = document.getElementById("salesCheckbox"); [cite: 117]
const fromDate = document.getElementById("fromDate"); [cite: 117]
const toDate = document.getElementById("toDate"); [cite: 117]

// ===== DATA =====
const allData = []; [cite: 117]
let filteredData = []; [cite: 118]
let currentStats = {}; [cite: 118]
let currentTotal = 0; [cite: 118]

const salesSet = new Set(); [cite: 118]
const salesColor = {}; [cite: 119]
let colorIdx = 0; [cite: 119]
let chart; [cite: 119]

// ===== COLORS =====
const colors = [
  "#2563eb","#dc2626","#16a34a","#f59e0b","#7c3aed",
  "#0d9488","#9333ea","#db2777","#0891b2","#4d7c0f",
  "#0ea5e9","#84cc16","#f97316","#22c55e","#a855f7"
]; [cite: 120]

// ===== HELPERS =====
function dateOnly(ts) {
  const [d] = ts.split(" ");
  const [m, day, y] = d.split("/");
  return `${y}-${m.padStart(2,"0")}-${day.padStart(2,"0")}`;
} [cite: 121, 122]

function addLogoPreserveRatio(pdf, img, x, y, targetWidth) {
  const p = pdf.getImageProperties(img);
  const ratio = p.height / p.width;
  const h = targetWidth * ratio;
  pdf.addImage(img, "PNG", x, y, targetWidth, h);
  return h;
} [cite: 122-124]

function addWatermark(pdf, img) {
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  pdf.setGState(new pdf.GState({ opacity: 0.06 }));
  pdf.addImage(img, "PNG", w/2 - 60, h/2 - 60, 120, 120);
  pdf.setGState(new pdf.GState({ opacity: 1 }));
} [cite: 124-126]

// ===== LOAD DATA =====
function loadSheetData() {
  // Tambahkan timestamp di URL agar browser tidak mengambil data lama dari cache
  const urlWithCache = sheetCSV + "&_cb=" + Date.now();
  
  Papa.parse(urlWithCache, {
    download: true,
    skipEmptyLines: true,
    complete: res => {
      // Membersihkan pin lama sebelum memproses data baru
      markerGroup.clearLayers();
      allData.length = 0; // Mengosongkan array data lama
      salesSet.clear();

      const rows = res.data;
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const d = {
          time: r[0],
          sales: r[1],
          toko: r[2],
          alamat: r[3],
          lat: +r[5],
          lng: +r[6],
          date: dateOnly(r[0])
        };
        if (isNaN(d.lat)) continue; [cite: 126, 127]

        if (!salesColor[d.sales])
          salesColor[d.sales] = colors[colorIdx++ % colors.length]; [cite: 127]

        // Membuat marker dan menyimpannya di grup (markerGroup)
        d.marker = L.circleMarker([d.lat, d.lng], {
          radius: 7,
          color: salesColor[d.sales],
          fillOpacity: 0.9
        }).bindPopup(`
          <b>${d.toko}</b><br>
          Sales: ${d.sales}<br>
          ${d.alamat}<br>
          ${d.time}
        `); [cite: 127, 128]

        allData.push(d); [cite: 128]
        salesSet.add(d.sales); [cite: 128]
      }

      renderSalesCheckbox(); [cite: 128]
      applyFilter(); [cite: 128]
    }
  });
}

// ===== UI =====
function renderSalesCheckbox() {
  salesBox.innerHTML = ""; // Membersihkan checkbox lama
  salesSet.forEach(s => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${s}" checked> ${s}`;
    salesBox.appendChild(label);
  }); [cite: 129, 130]
  salesBox.querySelectorAll("input").forEach(cb =>
    cb.addEventListener("change", applyFilter)
  ); [cite: 130]
} [cite: 130]

function getSelectedSales() {
  return [...salesBox.querySelectorAll("input:checked")].map(i => i.value);
} [cite: 131]

// ===== FILTER + STATS =====
function applyFilter() {
  const selected = getSelectedSales(); [cite: 131]
  const from = fromDate.value; [cite: 131]
  const to = toDate.value; [cite: 132]

  // Bersihkan semua pin di peta melalui grup
  markerGroup.clearLayers();

  let stats = {}; [cite: 132]
  let bounds = []; [cite: 132]
  filteredData = []; [cite: 132]

  allData.forEach(d => {
    const okSales = selected.includes(d.sales); [cite: 133]
    const okFrom = !from || d.date >= from; [cite: 133]
    const okTo = !to || d.date <= to; [cite: 133]

    if (okSales && okFrom && okTo) {
      // Masukkan marker ke dalam grup agar muncul di peta
      d.marker.addTo(markerGroup); [cite: 133]
      bounds.push([d.lat, d.lng]); [cite: 133]
      stats[d.sales] = (stats[d.sales] || 0) + 1; [cite: 133]
      filteredData.push(d); [cite: 133]
    }
  }); [cite: 133]

  if (bounds.length) map.fitBounds(bounds, { padding: [30,30] }); [cite: 134]

  currentStats = stats; [cite: 134]
  currentTotal = Object.values(stats).reduce((a,b)=>a+b,0); [cite: 134]

  renderStats(stats, from, to); [cite: 134]
  renderChart(stats); [cite: 134]
} [cite: 135]

function renderStats(stats, from, to) {
  let html = `<b>Periode:</b> ${from || "awal"} s/d ${to || "akhir"}<ul>`; [cite: 135]
  for (let s in stats) html += `<li>${s}: ${stats[s]}</li>`; [cite: 136]
  html += `</ul><b>Total Kunjungan: ${currentTotal}</b>`; [cite: 136]
  statsDiv.innerHTML = html; [cite: 136]
} [cite: 137]

// ===== CHART =====
function renderChart(stats) {
  const labels = Object.keys(stats); [cite: 137]
  const data = Object.values(stats); [cite: 137]
  if (chart) chart.destroy(); [cite: 137]

  chart = new Chart(document.getElementById("salesChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map(l => salesColor[l])
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      responsive: true
    }
  }); [cite: 138, 139]
} [cite: 139]

fromDate.onchange = applyFilter; [cite: 139]
toDate.onchange = applyFilter; [cite: 139]
document.getElementById("resetFilter").onclick = () => {
  fromDate.value = "";
  toDate.value = "";
  salesBox.querySelectorAll("input").forEach(i => i.checked = true);
  applyFilter();
}; [cite: 139, 140]

// ===== EXPORT PDF (FINAL) =====
document.getElementById("exportPDF").onclick = () => {
  const { jsPDF } = window.jspdf; [cite: 140]
  const pdf = new jsPDF(); [cite: 141]

  addWatermark(pdf, logoURL); [cite: 141]
  const logoH = addLogoPreserveRatio(pdf, logoURL, 14, 10, 35); [cite: 142]
  pdf.setFontSize(14); [cite: 142]
  pdf.text("LAPORAN KUNJUNGAN SALES", 105, 18, { align: "center" }); [cite: 143]
  pdf.setFontSize(10); [cite: 143]
  pdf.text(
    `Periode: ${fromDate.value || "awal"} s/d ${toDate.value || "akhir"}`,
    105, 26, { align: "center" }
  ); [cite: 143, 144]

  let y = 10 + logoH + 10; [cite: 145]
  pdf.setFontSize(11); [cite: 145]
  pdf.text("Ringkasan:", 14, y); [cite: 145]
  y += 6; [cite: 145]
  Object.entries(currentStats).forEach(([s, n]) => {
    pdf.text(`${s}: ${n} kunjungan`, 14, y);
    y += 5;
  }); [cite: 146]
  pdf.text(`Total Kunjungan: ${currentTotal}`, 14, y + 2); [cite: 147]

  const chartCanvas = document.getElementById("salesChart"); [cite: 147]
  const chartImg = chartCanvas.toDataURL("image/png", 1.0); [cite: 148]
  pdf.addImage(chartImg, "PNG", 110, y - 10, 80, 45); [cite: 148]

  const tableBody = filteredData.map(d => [
    d.date, d.sales, d.toko, d.alamat
  ]); [cite: 149]

  pdf.autoTable({
    startY: y + 20,
    head: [["Tanggal", "Sales", "Nama Toko", "Alamat"]],
    body: tableBody,
    styles: {
      fontSize: 9,
      cellPadding: 2,
      overflow: "linebreak"
    },
    tableWidth: "auto",
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 26 },
      2: { cellWidth: 40 },
      3: { cellWidth: "auto" }
    },
    didDrawPage: function () {
      addWatermark(pdf, logoURL);
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(9);
      pdf.text(`Dicetak: ${new Date().toLocaleString()}`, 14, pageH - 10);
      pdf.text(`Halaman ${pdf.internal.getNumberOfPages()}`, 200, pageH - 10, { align: "right" });
    }
  }); [cite: 150, 151]

  pdf.save("laporan_kunjungan_sales.pdf"); [cite: 152]
};

// Inisialisasi awal
window.onload = loadSheetData;
