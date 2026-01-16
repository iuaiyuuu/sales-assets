/**
 * AUORA CORE MONITORING - Full Script
 * Menggunakan Data dari Link CSV Baru
 */

// --- 1. KONFIGURASI DATA ---
// Link CSV Baru yang Anda berikan
const baseCSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5jwEtWeGxCR1S2sXEmHDf-NoHzzNTbvf4bg8ZDzJCZoCsJqe05UOnuXrUGzM-BZeNVarVfVPZcPX-/pub?gid=498206024&single=true&output=csv";
const logoURL = "https://jmlfavfecfnmjlznmpwk.supabase.co/storage/v1/object/public/breal/auora-removebg-preview.png";

let allData = [];
let filteredData = [];
let barChart = null;
const salesColor = {};
const palette = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e", "#6366f1", "#d946ef"];

// --- 2. INISIALISASI PETA ---
const map = L.map("map", { zoomControl: false }).setView([-3.3547, 114.6384], 12);
L.control.zoom({ position: 'bottomleft' }).addTo(map);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
const activeLayer = L.layerGroup().addTo(map);

// --- 3. FUNGSI PARSE TANGGAL ---
function parseDate(str) {
    if (!str) return null;
    const [datePart] = str.split(" ");
    const [m, d, y] = datePart.split("/").map(Number);
    return new Date(y, m - 1, d);
}

// --- 4. LOAD DATA DENGAN DEBUGGER ---
function loadSheetData() {
    // Menambahkan cache buster agar data selalu fresh
    const finalUrl = `${baseCSV}&cachebuster=${Date.now()}`;
    
    Papa.parse(finalUrl, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: (res) => {
            console.log("Data CSV Berhasil Diambil:", res.data); // DEBUG: Cek di Inspect Console
            
            allData = [];
            let colorIdx = 0;
            
            // Periksa baris pertama data setelah header
            if (res.data.length > 1) {
                console.log("Contoh Baris 1:", res.data[1]);
                console.log("Status Kolom K (index 10):", res.data[1][10]);
            }

            res.data.slice(1).forEach((r, index) => {
                // Pastikan kolom r[1] (Sales), r[5] (Lat), r[6] (Long) tidak kosong
                if (!r[1] || !r[5] || !r[6]) return;

                if (!salesColor[r[1]]) salesColor[r[1]] = palette[colorIdx++ % palette.length];

                allData.push({
                    time: r[0],
                    sales: r[1],
                    toko: r[2],
                    lat: parseFloat(r[5]),
                    lng: parseFloat(r[6]),
                    putih: parseInt(r[7] || 0),
                    biru: parseInt(r[8] || 0),
                    hitam: parseInt(r[9] || 0),
                    // Mengubah status menjadi TRUE jika kolom K berisi "TRUE" atau "Aktif"
                    status: r[10]?.toString().trim().toUpperCase() === "TRUE" || r[10]?.toString().trim() === "Aktif",
                    dateObj: parseDate(r[0])
                });
            });

            console.log("Total Data Terproses:", allData.length);
            renderCheckboxes();
            applyFilter();
        }
    });
}

// --- 5. RENDER CHECKBOX ---
function renderCheckboxes() {
    const sales = [...new Set(allData.filter(d => d.status).map(d => d.sales))].sort();
    const container = document.getElementById("salesCheckbox");
    container.innerHTML = sales.map(s => `
        <label style="color:${salesColor[s]}; font-weight:600">
            <input type="checkbox" value="${s}" checked onchange="applyFilter()"> ${s}
        </label>`).join("");
}

// --- 6. APPLY FILTER & RENDER PIN ---
function applyFilter() {
    const selected = Array.from(document.querySelectorAll("#salesCheckbox input:checked")).map(i => i.value);
    const from = document.getElementById("fromDate").value ? new Date(document.getElementById("fromDate").value) : null;
    const to = document.getElementById("toDate").value ? new Date(document.getElementById("toDate").value) : null;

    activeLayer.clearLayers();
    
    filteredData = allData.filter(d => {
        const matchSales = selected.includes(d.sales);
        const matchDate = (!from || d.dateObj >= from) && (!to || d.dateObj <= to);
        // Jika d.status bermasalah, sementara bisa diganti: return matchSales && matchDate;
        return d.status && matchSales && matchDate;
    });

    const stats = {};
    const bounds = [];

    filteredData.forEach(d => {
        const popup = `
            <div style="min-width:140px; font-family:'Inter', sans-serif;">
                <b style="color:#2563eb">${d.toko}</b><br>
                <small>${d.time}</small><hr style="margin:5px 0">
                <b>Sales:</b> ${d.sales}<br>
                <div style="margin-top:5px">
                    <span style="background:#eee; padding:2px 4px; border-radius:3px">P: ${d.putih}</span>
                    <span style="background:#dbeafe; padding:2px 4px; border-radius:3px">B: ${d.biru}</span>
                    <span style="background:#1e293b; color:#fff; padding:2px 4px; border-radius:3px">H: ${d.hitam}</span>
                </div>
            </div>`;

        L.circleMarker([d.lat, d.lng], {
            radius: 8,
            fillColor: salesColor[d.sales],
            color: "#fff",
            fillOpacity: 0.9,
            weight: 2
        }).addTo(activeLayer).bindPopup(popup);

        bounds.push([d.lat, d.lng]);
        stats[d.sales] = (stats[d.sales] || 0) + 1;
    });

    if (bounds.length) map.fitBounds(bounds, { padding: [50, 50] });
    updateCharts(stats);
}

// --- 7. UPDATE CHART ---
function updateCharts(stats) {
    const labels = Object.keys(stats);
    const values = Object.values(stats);
    document.getElementById("textTotal").innerText = `Total Kunjungan: ${values.reduce((a, b) => a + b, 0)}`;

    if (barChart) barChart.destroy();
    const ctx = document.getElementById("salesChart").getContext("2d");
    barChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels.map(l => `${l} (${stats[l]})`),
            datasets: [{ data: values, backgroundColor: labels.map(l => salesColor[l]) }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

// --- 8. UI TOGGLE ---
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("mainControlBar");

menuToggle.onclick = function() {
    this.classList.toggle("open");
    sidebar.classList.toggle("hidden");
    setTimeout(() => map.invalidateSize(), 400);
};

// --- 9. EXPORT PDF DENGAN WATERMARK ---
document.getElementById("exportPDF").onclick = () => {
    const { jsPDF } = window.jspdf;
    if (!filteredData.length) return alert("Tidak ada data untuk diekspor!");

    const doc = new jsPDF("p", "mm", "a4");
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = logoURL;

    img.onload = () => {
        doc.autoTable({
            startY: 35,
            head: [["No", "Waktu", "Sales", "Toko", "P", "B", "H"]],
            body: filteredData.map((d, i) => [i + 1, d.time, d.sales, d.toko, d.putih, d.biru, d.hitam]),
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
            didDrawPage: function (data) {
                // Header Background
                doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 30, "F");
                // Logo Header
                const ratio = img.width / img.height;
                doc.addImage(img, "PNG", 15, 5, 20 * ratio, 20);
                // Title
                doc.setTextColor(255).setFontSize(14).setFont("helvetica", "bold");
                doc.text("LAPORAN MONITORING SALES", 200, 18, { align: "right" });

                // WATERMARK BESAR TENGAH
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.07 }));
                const wmWidth = 120;
                doc.addImage(img, "PNG", (210 - wmWidth) / 2, 80, wmWidth, wmWidth / ratio);
                doc.restoreGraphicsState();

                // Footer
                doc.setFontSize(8).setTextColor(150);
                doc.text(`Halaman ${doc.internal.getNumberOfPages()}`, 200, 287, { align: "right" });
            }
        });
        doc.save(`Laporan_Sales_${Date.now()}.pdf`);
    };
};

// Start
document.getElementById("btnSearch").onclick = loadSheetData;
window.onload = loadSheetData;
