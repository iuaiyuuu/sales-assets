const sheetCSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5jwEtWeGxCR1S2sXEmHDf-NoHzzNTbvf4bg8ZDzJCZoCsJqe05UOnuXrUGzM-BZeNVarVfVPZcPX-/pub?gid=498206024&single=true&output=csv";

// LOGO (Supabase public URL kamu)
const logoURL =
  "https://jmlfavfecfnmjlznmpwk.supabase.co/storage/v1/object/public/breal/auora-removebg-preview.png";

// ===== MAP =====
const markerLayer = L.layerGroup().addTo(map);
const map = L.map("map").setView([-3.35, 114.6], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(markerLayer);



// ===== DOM =====
const statsDiv = document.getElementById("stats");
const salesBox = document.getElementById("salesCheckbox");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");

// ===== DATA =====
const allData = [];
let filteredData = [];
let currentStats = {};
let currentTotal = 0;

const salesSet = new Set();
const salesColor = {};
let colorIdx = 0;
let chart;

// ===== COLORS =====
const colors = [
  "#2563eb","#dc2626","#16a34a","#f59e0b","#7c3aed",
  "#0d9488","#9333ea","#db2777","#0891b2","#4d7c0f",
  "#0ea5e9","#84cc16","#f97316","#22c55e","#a855f7"
];

// ===== HELPERS =====
function dateOnly(ts) {
  const [d] = ts.split(" ");
  const [m, day, y] = d.split("/");
  return `${y}-${m.padStart(2,"0")}-${day.padStart(2,"0")}`;
}

function addLogoPreserveRatio(pdf, img, x, y, targetWidth) {
  const p = pdf.getImageProperties(img);
  const ratio = p.height / p.width;
  const h = targetWidth * ratio;
  pdf.addImage(img, "PNG", x, y, targetWidth, h);
  return h;
}

function addWatermark(pdf, img) {
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  pdf.setGState(new pdf.GState({ opacity: 0.06 }));
  pdf.addImage(img, "PNG", w/2 - 60, h/2 - 60, 120, 120);
  pdf.setGState(new pdf.GState({ opacity: 1 }));
}

// ===== LOAD DATA =====
Papa.parse(sheetCSV, {
  download: true,
  skipEmptyLines: true,
  complete: res => {
    
     markerLayer.clearLayers();   // ⬅️ WAJIB
    allData.length = 0;
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
      if (isNaN(d.lat)) continue;

      if (!salesColor[d.sales])
        salesColor[d.sales] = colors[colorIdx++ % colors.length];

      d.marker = L.circleMarker([d.lat, d.lng], {
        radius: 7,
        color: salesColor[d.sales],
        fillOpacity: 0.9
      }).bindPopup(`
        <b>${d.toko}</b><br>
        Sales: ${d.sales}<br>
        ${d.alamat}<br>
        ${d.time}
      `).addTo(map);

      allData.push(d);
      salesSet.add(d.sales);
    }

    renderSalesCheckbox();
    applyFilter();
  }
});

// ===== UI =====
function renderSalesCheckbox() {
  salesSet.forEach(s => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${s}" checked> ${s}`;
    salesBox.appendChild(label);
  });
  salesBox.querySelectorAll("input").forEach(cb =>
    cb.addEventListener("change", applyFilter)
  );
}

function getSelectedSales() {
  return [...salesBox.querySelectorAll("input:checked")].map(i => i.value);
}

// ===== FILTER + STATS =====
function applyFilter() {
  const selected = getSelectedSales();
  const from = fromDate.value;
  const to = toDate.value;

  let stats = {};
  let bounds = [];
  filteredData = [];

  allData.forEach(d => {
    const okSales = selected.includes(d.sales);
    const okFrom = !from || d.date >= from;
    const okTo = !to || d.date <= to;

    if (okSales && okFrom && okTo) {
      d.marker.addTo(map);
      bounds.push([d.lat, d.lng]);
      stats[d.sales] = (stats[d.sales] || 0) + 1;
      filteredData.push(d);
    } else {
      map.removeLayer(d.marker);
    }
  });

  if (bounds.length) map.fitBounds(bounds, { padding: [30,30] });

  currentStats = stats;
  currentTotal = Object.values(stats).reduce((a,b)=>a+b,0);

  renderStats(stats, from, to);
  renderChart(stats);
}

function renderStats(stats, from, to) {
  let html = `<b>Periode:</b> ${from || "awal"} s/d ${to || "akhir"}<ul>`;
  for (let s in stats) html += `<li>${s}: ${stats[s]}</li>`;
  html += `</ul><b>Total Kunjungan: ${currentTotal}</b>`;
  statsDiv.innerHTML = html;
}

// ===== CHART =====
function renderChart(stats) {
  const labels = Object.keys(stats);
  const data = Object.values(stats);
  if (chart) chart.destroy();

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
  });
}

fromDate.onchange = applyFilter;
toDate.onchange = applyFilter;
document.getElementById("resetFilter").onclick = () => {
  fromDate.value = "";
  toDate.value = "";
  salesBox.querySelectorAll("input").forEach(i => i.checked = true);
  applyFilter();
};

// ===== EXPORT PDF (FINAL) =====
document.getElementById("exportPDF").onclick = () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  // WATERMARK (page 1)
  addWatermark(pdf, logoURL);

  // HEADER
  const logoH = addLogoPreserveRatio(pdf, logoURL, 14, 10, 35);
  pdf.setFontSize(14);
  pdf.text("LAPORAN KUNJUNGAN SALES", 105, 18, { align: "center" });
  pdf.setFontSize(10);
  pdf.text(
    `Periode: ${fromDate.value || "awal"} s/d ${toDate.value || "akhir"}`,
    105, 26, { align: "center" }
  );

  // RINGKASAN
  let y = 10 + logoH + 10;
  pdf.setFontSize(11);
  pdf.text("Ringkasan:", 14, y);
  y += 6;
  Object.entries(currentStats).forEach(([s, n]) => {
    pdf.text(`${s}: ${n} kunjungan`, 14, y);
    y += 5;
  });
  pdf.text(`Total Kunjungan: ${currentTotal}`, 14, y + 2);

  // GRAFIK (snapshot canvas)
  const chartCanvas = document.getElementById("salesChart");
  const chartImg = chartCanvas.toDataURL("image/png", 1.0);
  pdf.addImage(chartImg, "PNG", 110, y - 10, 80, 45);

  // TABEL DETAIL
  const tableBody = filteredData.map(d => [
    d.date, d.sales, d.toko, d.alamat
  ]);

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
    0: { cellWidth: 26 },   // tanggal
    1: { cellWidth: 26 },   // sales
    2: { cellWidth: 40 },   // toko
    3: { cellWidth: "auto" } // alamat fleksibel
  },
  didDrawPage: function () {
    addWatermark(pdf, logoURL);

    const pageH = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(9);
    pdf.text(
      `Dicetak: ${new Date().toLocaleString()}`,
      14, pageH - 10
    );
    pdf.text(
      `Halaman ${pdf.internal.getNumberOfPages()}`,
      200, pageH - 10,
      { align: "right" }
    );
  }
});


  pdf.save("laporan_kunjungan_sales.pdf");
};



