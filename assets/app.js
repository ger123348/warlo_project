// ============================================
// WARLO - Sistem Informasi Geografis Longsor Lampung
// Main Application JavaScript
// ============================================

// ===== MAP INITIALIZATION =====
const map = L.map('map').setView([-4.95, 105.15], 9);

// Basemap Light (tema terang)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO | WARLO GIS',
    maxZoom: 20
}).addTo(map);

// ===== POPUP GENERATOR (PRESERVED) =====
function buatPopup(feature, layer, tipeFasilitas) {
    let namaTempat = feature.properties.name || "Fasilitas Tanpa Nama";
    let isiPopup = `
        <div class='popup-title'>${tipeFasilitas}</div>
        <b>Nama:</b> ${namaTempat}<br>
        <b>Kategori:</b> ${feature.properties.fclass || '-'}
    `;
    layer.bindPopup(isiPopup);
}

// ===== LAYER GROUPS =====
const layerGroups = {
    zonaRawan: L.layerGroup(),
    jalurEvakuasi: L.layerGroup(),
    safeZone: L.markerClusterGroup({ maxClusterRadius: 40 }),
    fasilitas: L.markerClusterGroup({ maxClusterRadius: 50 })
};
layerGroups.fasilitas.addTo(map);
layerGroups.safeZone.addTo(map);

// ===== 1. BATAS WILAYAH LAMPUNG (PRESERVED) =====
fetch('assets/data/lampung.geojson')
    .then(res => res.json())
    .then(data => {
        const layerBatas = L.geoJSON(data, {
            style: { color: '#2563EB', weight: 1.5, fillOpacity: 0.02, dashArray: '5, 5' }
        }).addTo(map);
        map.fitBounds(layerBatas.getBounds());
    }).catch(err => console.error("Gagal muat lampung.geojson:", err));

// ===== 2. TITIK FASILITAS (WARNA PRESERVED - TIDAK DIUBAH) =====
function loadTitik(url, warna, bxIcon, tipe) {
    fetch(url)
        .then(res => res.json())
        .then(data => {
            L.geoJSON(data, {
                pointToLayer: (feature, latlng) => {
                    const iconColor = warna === '#ffffff' ? '#0F172A' : '#ffffff';
                    const iconHtml = `
                        <div class="pin-wrapper">
                            <svg class="pin-shape" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 8.542 11.144 19.336 11.536 19.78.243.275.684.275.928 0C12.856 31.336 24 20.542 24 12c0-6.627-5.373-12-12-12z" fill="${warna}"/>
                            </svg>
                            <i class='bx ${bxIcon} pin-icon' style="color: ${iconColor};"></i>
                        </div>
                    `;
                    const customIcon = L.divIcon({
                        className: 'custom-div-icon',
                        html: iconHtml,
                        iconSize: [24, 32],
                        iconAnchor: [12, 32],
                        popupAnchor: [0, -30]
                    });
                    return L.marker(latlng, {icon: customIcon});
                },
                onEachFeature: (feature, layer) => buatPopup(feature, layer, tipe)
            }).addTo(layerGroups.fasilitas);
            
            // Update stats untuk Faskes
            if (url.includes('rumah_sakit')) {
                const el = document.getElementById('stat-faskes');
                if (el) el.innerText = data.features ? data.features.length : 0;
            }
        }).catch(err => console.error("Gagal muat " + url, err));
}

// WARNA TITIK TIDAK DIUBAH - PERSIS SEPERTI ASLI
loadTitik('assets/data/rumah_sakit.geojson', '#ff0000', 'bx-plus-medical', '🏥 Faskes Utama (RS/Klinik)');
loadTitik('assets/data/apotek.geojson', '#00ff00', 'bx-capsule', '💊 Apotek & Suplai Obat');
loadTitik('assets/data/dokter.geojson', '#ffd700', 'bx-health', '🩺 Praktik Dokter Mandiri');
loadTitik('assets/data/pasar.geojson', '#ff66cc', 'bx-cart', '🛒 Logistik Makanan');
loadTitik('assets/data/balai.geojson', '#ffffff', 'bxs-building', '🏢 Balai Desa / Posko');
loadTitik('assets/data/air_lampung.geojson', '#00b0ff', 'bx-water', '🚰 Sumber Air Darurat');

// ===== 3. ZONA KERAWANAN LONGSOR =====
const zonaColors = { 'Tinggi': '#EF4444', 'Sedang': '#F59E0B', 'Rendah': '#22C55E' };
fetch('assets/data/zona_rawan.geojson')
    .then(res => res.json())
    .then(data => {
        L.geoJSON(data, {
            style: (feature) => ({
                fillColor: zonaColors[feature.properties.tingkat] || '#ccc',
                fillOpacity: 0.25, color: zonaColors[feature.properties.tingkat] || '#ccc',
                weight: 2, dashArray: '4,4'
            }),
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`
                    <div class='popup-title'>⚠️ Zona Kerawanan Longsor</div>
                    <b>Tingkat:</b> ${feature.properties.tingkat}<br>
                    <b>Deskripsi:</b> ${feature.properties.deskripsi}
                `);
            }
        }).addTo(layerGroups.zonaRawan);
        layerGroups.zonaRawan.addTo(map);
        
        // Update stats
        const el = document.getElementById('stat-zona');
        if (el) el.innerText = data.features ? data.features.length : 0;
    }).catch(err => console.error("Gagal muat zona_rawan.geojson:", err));

// ===== 4. JALUR EVAKUASI =====
fetch('assets/data/jalur_evakuasi.geojson')
    .then(res => res.json())
    .then(data => {
        L.geoJSON(data, {
            style: (feature) => ({
                color: feature.properties.tipe === 'utama' ? '#2563EB' : '#0EA5E9',
                weight: feature.properties.tipe === 'utama' ? 4 : 3,
                dashArray: feature.properties.tipe === 'utama' ? null : '8,6',
                opacity: 0.8
            }),
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`
                    <div class='popup-title'>🛤️ Jalur Evakuasi</div>
                    <b>Nama:</b> ${feature.properties.nama}<br>
                    <b>Tipe:</b> ${feature.properties.tipe === 'utama' ? 'Jalur Utama' : 'Jalur Alternatif'}<br>
                    <b>Panjang:</b> ${feature.properties.panjang_km} km<br>
                    <b>Ket:</b> ${feature.properties.keterangan}
                `);
            }
        }).addTo(layerGroups.jalurEvakuasi);
        layerGroups.jalurEvakuasi.addTo(map);
    }).catch(err => console.error("Gagal muat jalur_evakuasi.geojson:", err));

// ===== 5. SAFE ZONE (POSKO & TITIK KUMPUL) =====
fetch('assets/data/safe_zone.geojson')
    .then(res => res.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: (feature, latlng) => {
                const isPosko = feature.properties.tipe === 'posko';
                const warna = isPosko ? '#EA580C' : '#16A34A';
                const bxIcon = isPosko ? 'bx-home-heart' : 'bx-group';
                const iconHtml = `
                    <div class="pin-wrapper">
                        <svg class="pin-shape" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 8.542 11.144 19.336 11.536 19.78.243.275.684.275.928 0C12.856 31.336 24 20.542 24 12c0-6.627-5.373-12-12-12z" fill="${warna}"/>
                        </svg>
                        <i class='bx ${bxIcon} pin-icon'></i>
                    </div>
                `;
                const customIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: iconHtml,
                    iconSize: [24, 32],
                    iconAnchor: [12, 32],
                    popupAnchor: [0, -30]
                });
                return L.marker(latlng, {icon: customIcon});
            },
            onEachFeature: (feature, layer) => {
                const icon = feature.properties.tipe === 'posko' ? '🏕️' : '📍';
                layer.bindPopup(`
                    <div class='popup-title'>${icon} ${feature.properties.tipe === 'posko' ? 'Posko Evakuasi' : 'Titik Kumpul'}</div>
                    <b>Nama:</b> ${feature.properties.nama}<br>
                    <b>Kapasitas:</b> ${feature.properties.kapasitas} orang<br>
                    <b>Kabupaten:</b> ${feature.properties.kabupaten}
                `);
            }
        }).addTo(layerGroups.safeZone);
        layerGroups.safeZone.addTo(map);
        
        // Update stats
        const el = document.getElementById('stat-posko');
        if (el) el.innerText = data.features ? data.features.length : 0;
    }).catch(err => console.error("Gagal muat safe_zone.geojson:", err));

// ===== SIDEBAR NAVIGATION =====
const allNavItems = document.querySelectorAll('.nav-item:not(.nav-toggle)');
const panels = document.querySelectorAll('.side-panel');
const statsBar = document.querySelector('.stats-bar');

function closeAllPanels() {
    panels.forEach(p => p.classList.remove('open'));
}

allNavItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all
        allNavItems.forEach(n => n.classList.remove('active'));
        // Add active to clicked item
        item.classList.add('active');

        const targetId = item.dataset.panel;
        const targetPanel = document.getElementById(targetId);

        closeAllPanels();
        
        // Pastikan stats bar selalu tampil saat berada di Dashboard
        if (statsBar) {
            statsBar.style.display = ''; 
            setTimeout(() => map.invalidateSize(), 300);
        }
        
        if (targetPanel) {
            targetPanel.classList.add('open');
        } else {
            // Action buttons like dashboard
            if (item.dataset.action === 'dashboard') {
                map.setView([-4.95, 105.15], 9);
            }
        }
        
        // Close mobile sidebar
        document.querySelector('.sidebar').classList.remove('mobile-open');
        document.querySelector('.sidebar-overlay').classList.remove('show');
    });
});

// Panel close buttons
document.querySelectorAll('.panel-close').forEach(btn => {
    btn.addEventListener('click', () => {
        closeAllPanels();
        // Reset active state to dashboard if a panel is closed via the X button
        allNavItems.forEach(n => n.classList.remove('active'));
        document.querySelector('.nav-item[data-action="dashboard"]')?.classList.add('active');
        if (statsBar) {
            statsBar.style.display = '';
            setTimeout(() => map.invalidateSize(), 300);
        }
    });
});

// ===== EDUKASI SUB-MENU TOGGLE =====
document.querySelectorAll('.nav-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
        const sub = toggle.nextElementSibling;
        const chevron = toggle.querySelector('.nav-chevron');
        sub.classList.toggle('open');
        chevron?.classList.toggle('rotated');
    });
});

// ===== MOBILE MENU =====
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const overlay = document.querySelector('.sidebar-overlay');

menuToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('show');
});
overlay?.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('show');
});

// ===== LAYER CONTROLS =====
const layerBtn = document.getElementById('layerToggleBtn');
const layerDrop = document.getElementById('layerDropdown');
layerBtn?.addEventListener('click', () => layerDrop.classList.toggle('open'));

document.getElementById('toggleZona')?.addEventListener('change', function() {
    this.checked ? map.addLayer(layerGroups.zonaRawan) : map.removeLayer(layerGroups.zonaRawan);
});
document.getElementById('toggleJalur')?.addEventListener('change', function() {
    this.checked ? map.addLayer(layerGroups.jalurEvakuasi) : map.removeLayer(layerGroups.jalurEvakuasi);
});
document.getElementById('toggleSafe')?.addEventListener('change', function() {
    this.checked ? map.addLayer(layerGroups.safeZone) : map.removeLayer(layerGroups.safeZone);
});

// ===== HISTORY TIMELINE ITEM CLICK =====
document.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('click', () => {
        const lat = parseFloat(item.dataset.lat);
        const lng = parseFloat(item.dataset.lng);
        if (lat && lng) {
            map.setView([lat, lng], 12);
            closeAllPanels();
        }
    });
});

// Update stats Total Kejadian dari jumlah item di timeline
const statKejadian = document.getElementById('stat-kejadian');
const timelineItems = document.querySelectorAll('.timeline-item');
if (statKejadian) {
    statKejadian.innerText = timelineItems.length;
}

// ===== GEOLOCATION (LOCATE ME) =====
let userMarker = null;

const locateBtn = document.getElementById('locateMeBtn');
if (locateBtn) {
    locateBtn.addEventListener('click', () => {
        locateBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i>";
        map.locate({setView: true, maxZoom: 16});
    });
}

map.on('locationfound', function(e) {
    if (locateBtn) locateBtn.innerHTML = "<i class='bx bx-target-lock'></i>";
    
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    
    const pulseHtml = `<div class="pulse-dot"></div>`;
    const pulseIcon = L.divIcon({
        className: 'pulse-locator',
        html: pulseHtml,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
    
    userMarker = L.marker(e.latlng, {icon: pulseIcon}).addTo(map);
    userMarker.bindPopup("<div class='popup-title'>📍 Info</div><b>Posisi Anda Saat Ini</b>").openPopup();
});

map.on('locationerror', function(e) {
    if (locateBtn) locateBtn.innerHTML = "<i class='bx bx-target-lock'></i>";
    alert("Gagal mendapatkan lokasi Anda. Pastikan GPS aktif dan Anda memberikan izin lokasi pada browser.");
});
