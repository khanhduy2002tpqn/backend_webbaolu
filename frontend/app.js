/* ==========================================================================
   HYDRO & CAMIP CLOUD SIMULATION — Frontend App for Vercel + Render Backend
   - Bản Đồ GIS Google Maps (Vệ tinh, Đường phố, Địa hình, Bản đồ đêm)
   - Dữ liệu Bão Lũ Lưu vực Vu Gia – Thu Bồn & Dự báo 2–3h Điện Bàn Tây
   - Sa Bàn Mô Phỏng Trạm CamIP 60 FPS (Canvas Live + Replay 20s 10s Trước / 10s Sau)
   - Hoạt động mượt cả khi kết nối Backend Render lẫn chế độ Độc lập (Cold-start safe)
   ========================================================================== */

(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function stationKey(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  const RESERVOIRS = [
    { name: 'A Vương', key: stationKey('A Vương'), river: 'Sông Vu Gia', normal: 380, baseHtl: 354.88, qIn: 18.4, qTurb: 42.0, qSpill: 0.0, color: '#0EA5E9', lat: 15.8333, lng: 107.6167 },
    { name: 'Đăk Mi 4', key: stationKey('Đăk Mi 4'), river: 'Sông Vu Gia', normal: 258, baseHtl: 242.52, qIn: 22.1, qTurb: 56.0, qSpill: 0.0, color: '#06B6D4', lat: 15.4611, lng: 107.8222 },
    { name: 'Sông Bung 4', key: stationKey('Sông Bung 4'), river: 'Sông Vu Gia', normal: 222.5, baseHtl: 210.25, qIn: 19.6, qTurb: 48.5, qSpill: 0.0, color: '#3B82F6', lat: 15.6889, lng: 107.6028 },
    { name: 'Sông Tranh 2', key: stationKey('Sông Tranh 2'), river: 'Sông Thu Bồn', normal: 175, baseHtl: 148.10, qIn: 31.2, qTurb: 68.6, qSpill: 0.0, color: '#6366F1', lat: 15.3319, lng: 108.1464 },
  ];

  const RIVER_STATIONS = [
    { name: 'Hội An', key: 'hoi-an', river: 'Thu Bồn', color: '#F43F5E', lat: 15.8765, lng: 108.3280, bd1: 1.0, bd2: 1.5, bd3: 2.0, base: 0.68 },
    { name: 'Thành Mỹ', key: 'thanh-my', river: 'Vu Gia', color: '#F59E0B', lat: 15.7647, lng: 107.8358, bd1: 15.0, bd2: 19.0, bd3: 22.0, base: 12.15 },
    { name: 'Ái Nghĩa', key: 'ai-nghia', river: 'Vu Gia', color: '#10B981', lat: 15.8781, lng: 108.1189, bd1: 6.5, bd2: 7.8, bd3: 9.0, base: 4.18 },
    { name: 'Nông Sơn', key: 'nong-son', river: 'Thu Bồn', color: '#8B5CF6', lat: 15.6983, lng: 108.0372, bd1: 11.0, bd2: 13.0, bd3: 15.0, base: 8.45 },
    { name: 'Câu Lâu', key: 'cau-lau', river: 'Thu Bồn', color: '#EC4899', lat: 15.8569, lng: 108.2736, bd1: 2.0, bd2: 3.0, bd3: 4.0, base: 1.24 },
    { name: 'Giao Thủy', key: 'giao-thuy', river: 'Thu Bồn', color: '#14B8A6', lat: 15.8264, lng: 108.1389, bd1: 6.5, bd2: 7.5, bd3: 8.8, base: 4.62 },
    { name: 'Hội Khách', key: 'hoi-khach', river: 'Vu Gia', color: '#FB923C', lat: 15.8189, lng: 107.9686, bd1: 14.5, bd2: 15.5, bd3: 16.5, base: 11.40 },
    { name: 'Hiệp Đức', key: 'hiep-duc', river: 'Thu Bồn', color: '#A3E635', lat: 15.5681, lng: 108.0819, bd1: 26.0, bd2: 28.0, bd3: 30.0, base: 21.85 },
    { name: 'Cẩm Lệ', key: 'cam-le', river: 'Cẩm Lệ', color: '#38BDF8', lat: 16.0119, lng: 108.2064, bd1: 1.0, bd2: 1.8, bd3: 2.5, base: 0.56 },
  ];

  const FORECAST_META = [
    { key: 'ai-nghia', name: 'Ái Nghĩa', river: 'Vu Gia' },
    { key: 'thanh-my', name: 'Thành Mỹ', river: 'Vu Gia' },
    { key: 'hoi-an', name: 'Hội An', river: 'Thu Bồn' },
    { key: 'nong-son', name: 'Nông Sơn', river: 'Thu Bồn' },
    { key: 'giao-thuy', name: 'Giao Thủy', river: 'Thu Bồn' },
    { key: 'cam-le', name: 'Cẩm Lệ', river: 'Cẩm Lệ' },
    { key: 'hiep-duc', name: 'Hiệp Đức', river: 'Thu Bồn' },
    { key: 'hoi-khach', name: 'Hội Khách', river: 'Vu Gia' },
  ];

  const CAMIP_CAMERAS = [
    {
      id: 'cam-dbt-primary',
      scene: 'dbt',
      name: 'Trạm Mô Phỏng CamIP — Điện Bàn Tây (Gò Nổi)',
      shortLabel: 'CamIP Điện Bàn Tây',
      lat: 15.8625,
      lng: 108.1965,
      area: 'Bến sông Thu Bồn • Khu vực Điện Bàn Tây (Gò Nổi)',
      primary: true,
    },
    {
      id: 'cam-caulau-ha-du',
      scene: 'caulau',
      name: 'Trạm Mô Phỏng CamIP — Cầu Câu Lâu (Hạ Du)',
      shortLabel: 'CamIP Cầu Câu Lâu',
      lat: 15.8555,
      lng: 108.2720,
      area: 'Hạ lưu sông Thu Bồn • Giáp Điện Bàn',
      primary: false,
    },
  ];

  const PAGE_META = {
    overview: {
      heading: 'Trung Tâm Theo Dõi Bão Lũ & Bản Đồ Mô Phỏng CamIP',
      sub: 'Lưu vực Vu Gia – Thu Bồn & Điện Bàn Tây • Click vào Marker 🎥 trên bản đồ để mở Mô Phỏng Trạm CamIP 20s',
    },
    reservoirs: {
      heading: 'Vận Hành Hồ Thủy Điện & Mạng Lưới Trạm Sông',
      sub: 'Theo dõi chi tiết mực nước dâng bình thường (MNDBT), lưu lượng xả lũ và cấp báo động BĐ1–BĐ3',
    },
    analytics: {
      heading: 'Biểu Đồ Diễn Biến Lũ & Dự Báo Xu Thế 2–3 Giờ Tới',
      sub: 'So sánh đường quá trình mực nước thực tế và dự báo độ trễ dòng chảy về Điện Bàn Tây',
    },
    community: {
      heading: 'Cổng Thông Tin Cộng Đồng Báo Tin Ngập Lụt',
      sub: 'Cập nhật nhanh tình hình ngập thực tế từ người dân khu vực Điện Bàn Tây, Đại Lộc, Hội An, Đà Nẵng',
    },
  };

  function getDefaultApiUrl() {
    const saved = localStorage.getItem('camip_cloud_api_url');
    if (saved !== null) return saved.trim();
    const cfg = (window.CAMIP_CLOUD_CONFIG?.API_BASE_URL || '').trim();
    if (cfg) return cfg;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    return '';
  }

  const seedTime1 = new Date(Date.now() - 25 * 60000).toLocaleString('sv-SE');
  const seedTime2 = new Date(Date.now() - 105 * 60000).toLocaleString('sv-SE');

  const DEFAULT_SIM_VIDEOS = [
    {
      id: 'sim_fall_demo_02',
      filename: 'sim_fall_demo_02.webm',
      station_id: 'cam-dbt-primary',
      station_name: 'Trạm Mô Phỏng CamIP — Điện Bàn Tây',
      created_at: seedTime1,
      duration: 20.0,
      fall_time_offset: 10.0,
      fall_ratio: 0.5,
      size_mb: 2.4,
      is_test: true,
      simulation: true,
    },
    {
      id: 'sim_fall_demo_01',
      filename: 'sim_fall_demo_01.webm',
      station_id: 'cam-caulau-ha-du',
      station_name: 'Trạm Mô Phỏng CamIP — Cầu Câu Lâu',
      created_at: seedTime2,
      duration: 20.0,
      fall_time_offset: 10.0,
      fall_ratio: 0.5,
      size_mb: 2.6,
      is_test: false,
      simulation: true,
    },
  ];

  const DEFAULT_SIM_ALERTS = [
    {
      id: 'sim_fall_demo_02',
      type: 'WATER_FALL_DETECTED',
      title: '[MÔ PHỎNG] PHÁT HIỆN NGƯỜI RƠI XUỐNG NƯỚC!',
      message: 'Mô phỏng kịch bản trượt chân tại bến sông Thu Bồn — Điện Bàn Tây (10s trước & 10s sau).',
      track_id: 99,
      confidence: 0.98,
      timestamp: seedTime1,
      video_status: 'READY',
      video_duration: 20.0,
      fall_ratio: 0.5,
      is_test: true,
    },
    {
      id: 'sim_fall_demo_01',
      type: 'WATER_FALL_DETECTED',
      title: 'KỊCH BẢN MẪU: NGƯỜI RƠI VÀO VÙNG NƯỚC SÂU!',
      message: 'Kịch bản mẫu kiểm thử quy trình cảnh báo khẩn cấp & trích xuất 20s sự cố tại Cầu Câu Lâu.',
      track_id: 14,
      confidence: 0.95,
      timestamp: seedTime2,
      video_status: 'READY',
      video_duration: 20.0,
      fall_ratio: 0.5,
      is_test: false,
    },
  ];

  const state = {
    activePage: 'overview',
    apiUrl: getDefaultApiUrl(),
    renderConnected: false,
    readingsByKey: new Map(),
    thresholdsByKey: new Map(),
    reservoirFlowsByKey: new Map(),
    stationSearchQuery: '',
    chartInstance: null,
    // Map
    map: null,
    baseLayers: {},
    activeLayerFilter: 'all',
    markerGroups: { camip: [], reservoir: [], station: [] },
    hydroMarkerByKey: new Map(),
    // CamIP Simulation State
    camModalOpen: false,
    activeCamTab: 'live',
    activeCamStation: CAMIP_CAMERAS[0],
    simScene: 'dbt',
    waterZone: [
      [0.08, 0.46],
      [0.92, 0.44],
      [0.96, 0.94],
      [0.04, 0.94],
    ],
    zoneDraft: [],
    showVectorOverlay: false,
    videos: [...DEFAULT_SIM_VIDEOS],
    alerts: [...DEFAULT_SIM_ALERTS],
    videoFilter: 'all',
    videoSearch: '',
    ws: null,
    wsReconnectTimer: null,
    // Live Simulation Animation
    simRafId: null,
    simStartTs: performance.now(),
    simFallStartMs: 0, // >0 when active fall animation is playing
    simWalkWarnUntilMs: 0,
    threatLevel: 'SAFE',
    // Siren
    muted: localStorage.getItem('camip_muted') === '1',
    audioCtx: null,
    sirenInterval: null,
    sirenActive: false,
    recProgressTimer: null,
    latestEmergencyAlert: null,
    // Zone Editor
    draggingVertexIdx: -1,
    // 20s Replay Player
    replayOpen: false,
    replayItem: null,
    replayPlaying: true,
    replayCurSec: 0,
    replayDuration: 20,
    replayFallSec: 10,
    replayRates: [0.5, 1.0, 1.5],
    replayRateIdx: 1,
    replayLastTick: 0,
    replayRafId: null,
    scrubbing: false,
  };

  // Initialize default thresholds immediately
  RIVER_STATIONS.forEach((s) => {
    state.thresholdsByKey.set(s.key, {
      station_key: s.key,
      warning_level_1: s.bd1,
      warning_level_2: s.bd2,
      warning_level_3: s.bd3,
    });
  });

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function cleanApiBase() {
    const raw = (state.apiUrl || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '');
    const proto = raw.startsWith('localhost') || raw.startsWith('127.') ? 'http://' : 'https://';
    return `${proto}${raw.replace(/\/+$/, '')}`;
  }

  function buildWsUrl() {
    const base = cleanApiBase();
    if (!base) return '';
    return `${base.replace(/^http/i, 'ws')}/ws/alerts`;
  }

  async function apiFetchJson(path, options = {}) {
    const base = cleanApiBase();
    if (!base) throw new Error('STANDALONE_MODE');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6500);
    try {
      const res = await fetch(`${base}${path}`, {
        ...options,
        signal: ctrl.signal,
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function formatViTime(iso) {
    if (!iso) return 'Vừa cập nhật';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  }

  function formatSec(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function showToast(message, type = 'info') {
    const wrap = $('toastContainer');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = `toast-item ${type}`;
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      el.style.transition = 'all 0.22s ease';
      setTimeout(() => el.remove(), 240);
    }, 3400);
  }

  function startSystemClock() {
    const tick = () => {
      const el = $('systemClock');
      if (!el) return;
      const now = new Date();
      el.textContent =
        now.toLocaleTimeString('vi-VN', { hour12: false }) + ' • ' + now.toLocaleDateString('vi-VN');
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ==========================================================================
     NAVIGATION
     ========================================================================== */

  function switchPage(pageId) {
    if (!PAGE_META[pageId]) return;
    state.activePage = pageId;
    $$('.nav-btn[data-page]').forEach((btn) => btn.classList.toggle('active', btn.dataset.page === pageId));
    $$('.page-view').forEach((sec) => sec.classList.toggle('active', sec.id === `page-${pageId}`));

    const meta = PAGE_META[pageId];
    if ($('pageHeading')) $('pageHeading').textContent = meta.heading;
    if ($('pageSubheading')) $('pageSubheading').textContent = meta.sub;
    closeMobileSidebar();

    if (pageId === 'overview' && state.map) {
      setTimeout(() => state.map.invalidateSize(), 120);
    }
    if (pageId === 'analytics') {
      loadChart();
    }
  }

  function closeMobileSidebar() {
    $('sidebar')?.classList.remove('open');
    $('sidebarBackdrop')?.classList.add('hidden');
  }

  /* ==========================================================================
     GOOGLE MAPS GIS (LEAFLET)
     ========================================================================== */

  function initFloodMap() {
    const mapContainer = $('floodMap');
    if (!mapContainer || typeof L === 'undefined') return;

    state.baseLayers = {
      google_hybrid: L.tileLayer('https://mt1.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}', { maxZoom: 20 }),
      google_road: L.tileLayer('https://mt1.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}', { maxZoom: 20 }),
      google_terrain: L.tileLayer('https://mt1.google.com/vt/lyrs=p&hl=vi&x={x}&y={y}&z={z}', { maxZoom: 20 }),
      dark_command: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }),
    };

    state.map = L.map(mapContainer, {
      center: [15.79, 108.08],
      zoom: 10,
      zoomControl: true,
      layers: [state.baseLayers.google_hybrid],
    });

    if ($('cntCamMarkers')) $('cntCamMarkers').textContent = String(CAMIP_CAMERAS.length);

    CAMIP_CAMERAS.forEach((cam) => {
      const icon = L.divIcon({
        className: 'custom-gis-icon',
        html: `<div class="gis-pin-camip" title="Click để mở ${escapeHtml(cam.name)}">
          <span>🎥</span>
          <span>${escapeHtml(cam.shortLabel)}</span>
        </div>`,
        iconSize: [0, 0],
      });

      const marker = L.marker([cam.lat, cam.lng], { icon, zIndexOffset: 900 });
      marker.bindTooltip(
        `<strong>🎥 ${escapeHtml(cam.name)}</strong><br/>Click để mở Sa Bàn Mô Phỏng &amp; Replay 20s`,
        { direction: 'top', offset: [0, -18] }
      );
      marker.on('click', () => openCamIpModal(cam, 'live'));
      marker.addTo(state.map);
      state.markerGroups.camip.push(marker);
    });

    RESERVOIRS.forEach((res) => {
      const marker = L.marker([res.lat, res.lng], {
        icon: buildHydroMarkerIcon('reservoir', `⚡ ${res.name}`, '--'),
        zIndexOffset: 400,
      });
      marker.bindPopup(buildReservoirPopupHtml(res));
      marker.addTo(state.map);
      state.markerGroups.reservoir.push(marker);
      state.hydroMarkerByKey.set(res.key, { marker, type: 'reservoir', item: res });
    });

    RIVER_STATIONS.forEach((st) => {
      const marker = L.marker([st.lat, st.lng], {
        icon: buildHydroMarkerIcon('safe', st.name, '--'),
        zIndexOffset: 500,
      });
      marker.bindPopup(buildStationPopupHtml(st));
      marker.addTo(state.map);
      state.markerGroups.station.push(marker);
      state.hydroMarkerByKey.set(st.key, { marker, type: 'station', item: st });
    });

    state.map.on('popupopen', (e) => {
      const popupEl = e.popup.getElement();
      const chartBtn = popupEl?.querySelector('[data-open-chart-key]');
      if (chartBtn) {
        chartBtn.addEventListener('click', () => {
          jumpToStationChart(chartBtn.getAttribute('data-open-chart-key'));
        });
      }
    });

    $('selMapBaseLayer')?.addEventListener('change', (ev) => {
      const selKey = ev.target.value;
      Object.values(state.baseLayers).forEach((lyr) => {
        if (state.map.hasLayer(lyr)) state.map.removeLayer(lyr);
      });
      (state.baseLayers[selKey] || state.baseLayers.google_hybrid).addTo(state.map);
    });

    $$('.map-chip[data-layer]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const filter = chip.dataset.layer || 'all';
        state.activeLayerFilter = filter;
        $$('.map-chip[data-layer]').forEach((c) => c.classList.toggle('active', c === chip));
        Object.entries(state.markerGroups).forEach(([groupName, markers]) => {
          const visible = filter === 'all' || filter === groupName;
          markers.forEach((m) => {
            if (visible && !state.map.hasLayer(m)) m.addTo(state.map);
            if (!visible && state.map.hasLayer(m)) state.map.removeLayer(m);
          });
        });
      });
    });

    $('btnFlyToCamIp')?.addEventListener('click', () => {
      const primaryCam = CAMIP_CAMERAS[0];
      state.map.flyTo([primaryCam.lat, primaryCam.lng], 14, { duration: 1.0 });
      showToast('Đã định vị Trạm CamIP Điện Bàn Tây — nhấn vào Marker đỏ để mở Sa Bàn Mô Phỏng!', 'info');
    });
  }

  function buildHydroMarkerIcon(variant, label, valText) {
    return L.divIcon({
      className: 'custom-gis-icon',
      html: `<div class="gis-pin-hydro ${variant}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(valText)}</strong>
      </div>`,
      iconSize: [0, 0],
    });
  }

  function evaluateStationWarning(level, th) {
    if (level === null || level === undefined || !Number.isFinite(level)) {
      return { label: 'Chưa có số liệu', cls: 'unknown', isAlert: false, severity: 0 };
    }
    if (!th) return { label: 'An toàn', cls: 'ok', isAlert: false, severity: 0 };
    if (th.warning_level_3 != null && level >= Number(th.warning_level_3)) {
      return { label: 'BÁO ĐỘNG 3', cls: 'alert', isAlert: true, severity: 3 };
    }
    if (th.warning_level_2 != null && level >= Number(th.warning_level_2)) {
      return { label: 'BÁO ĐỘNG 2', cls: 'alert', isAlert: true, severity: 2 };
    }
    if (th.warning_level_1 != null && level >= Number(th.warning_level_1)) {
      return { label: 'BÁO ĐỘNG 1', cls: 'alert', isAlert: true, severity: 1 };
    }
    return { label: 'An toàn', cls: 'ok', isAlert: false, severity: 0 };
  }

  function buildReservoirPopupHtml(res) {
    const row = state.readingsByKey.get(res.key);
    const flows = state.reservoirFlowsByKey.get(res.key) || row?.raw_data?.flows || {};
    const lvl = Number.isFinite(Number(row?.water_level_m))
      ? `${Number(row.water_level_m).toFixed(2)} m`
      : '--';
    return `<div class="map-popup-box">
      <h4>⚡ Hồ Thủy Điện ${escapeHtml(res.name)}</h4>
      <p>Lưu vực: <strong>${escapeHtml(res.river)}</strong> • MNDBT: <strong>${res.normal} m</strong></p>
      <p>Mực nước hiện tại: <strong style="color:#38BDF8">${lvl}</strong></p>
      <p>Q đến: <strong>${flows.inflow ?? '--'} m³/s</strong> • Xả tràn: <strong>${flows.spillway ?? '--'} m³/s</strong> • Phát điện: <strong>${flows.turbine ?? '--'} m³/s</strong></p>
      <p>Cập nhật: ${escapeHtml(formatViTime(row?.observed_at))}</p>
      <button type="button" class="map-popup-btn" data-open-chart-key="${escapeHtml(res.key)}">📈 Xem biểu đồ diễn biến</button>
    </div>`;
  }

  function buildStationPopupHtml(st) {
    const row = state.readingsByKey.get(st.key);
    const th = state.thresholdsByKey.get(st.key);
    const levelNum = Number(row?.water_level_m);
    const hasLvl = row?.water_level_m != null && Number.isFinite(levelNum);
    const evalRes = evaluateStationWarning(hasLvl ? levelNum : null, th);
    return `<div class="map-popup-box">
      <h4>🌊 Trạm ${escapeHtml(st.name)} (Sông ${escapeHtml(st.river)})</h4>
      <p>Mực nước: <strong style="color:${evalRes.isAlert ? '#F87171' : '#34D399'}">${hasLvl ? `${levelNum.toFixed(2)} m` : '--'}</strong> — <strong>${escapeHtml(evalRes.label)}</strong></p>
      <p>Ngưỡng BĐ1: ${th?.warning_level_1 ?? '-'}m | BĐ2: ${th?.warning_level_2 ?? '-'}m | BĐ3: ${th?.warning_level_3 ?? '-'}m</p>
      <p>Cập nhật: ${escapeHtml(formatViTime(row?.observed_at))}</p>
      <button type="button" class="map-popup-btn" data-open-chart-key="${escapeHtml(st.key)}">📈 Xem biểu đồ diễn biến</button>
    </div>`;
  }

  function updateHydroMarkersOnMap() {
    if (!state.map) return;
    state.hydroMarkerByKey.forEach((entry, key) => {
      const row = state.readingsByKey.get(key);
      const num = Number(row?.water_level_m);
      const hasVal = row?.water_level_m != null && Number.isFinite(num);
      const valTxt = hasVal ? `${num.toFixed(2)}m` : '--';

      if (entry.type === 'reservoir') {
        entry.marker.setIcon(buildHydroMarkerIcon('reservoir', `⚡ ${entry.item.name}`, valTxt));
        entry.marker.setPopupContent(buildReservoirPopupHtml(entry.item));
      } else {
        const evalRes = evaluateStationWarning(hasVal ? num : null, state.thresholdsByKey.get(key));
        entry.marker.setIcon(buildHydroMarkerIcon(evalRes.isAlert ? 'alert' : 'safe', entry.item.name, valTxt));
        entry.marker.setPopupContent(buildStationPopupHtml(entry.item));
      }
    });
  }

  function focusHydroPointOnMap(key) {
    const entry = state.hydroMarkerByKey.get(key);
    if (!entry || !state.map) return;
    if (state.activePage !== 'overview') switchPage('overview');
    $('workspaceScroll')?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      state.map.flyTo([entry.item.lat, entry.item.lng], 12, { duration: 0.9 });
      entry.marker.openPopup();
    }, 140);
  }

  function jumpToStationChart(key) {
    if (!key) return;
    switchPage('analytics');
    const selector = $('chartStationSelector');
    const targetInput = selector?.querySelector(`input[value="${CSS.escape(key)}"]`);
    if (targetInput) targetInput.checked = true;
    loadChart();
  }

  /* ==========================================================================
     HYDROLOGY DATA (RENDER API + INSTANT CLIENT FALLBACK FOR COLD-START)
     ========================================================================== */

  function computeLocalFallbackSnapshot() {
    const nowIso = new Date().toISOString();
    const tHours = Date.now() / 3600000;
    const obs = [];

    RESERVOIRS.forEach((r, idx) => {
      const wave = 0.08 * Math.sin(tHours * 0.4 + idx);
      obs.push({
        station_key: r.key,
        station_name: r.name,
        water_level_m: Number((r.baseHtl + wave).toFixed(2)),
        observed_at: nowIso,
        raw_data: {
          flows: {
            inflow: r.qIn,
            turbine: r.qTurb,
            spillway: r.qSpill,
            river: r.qTurb + r.qSpill,
          },
        },
      });
    });

    RIVER_STATIONS.forEach((s) => {
      const tidal = 0.09 * Math.sin(tHours * (2 * Math.PI / 12.42) + s.key.length);
      const qRef = ['ai-nghia', 'thanh-my', 'hoi-khach', 'cam-le'].includes(s.key) ? 48.5 : 68.6;
      const lvl = Math.max(0.12, s.base + qRef / 320.0 + tidal);
      obs.push({
        station_key: s.key,
        station_name: s.name,
        water_level_m: Number(lvl.toFixed(2)),
        observed_at: nowIso,
      });
    });

    return obs;
  }

  function computeLocalFallbackSeries(keys, hours) {
    const out = {};
    const stepMin = hours <= 12 ? 30 : 60;
    const steps = Math.max(4, Math.min(48, Math.floor((hours * 60) / stepMin)));
    const nowMs = Date.now();

    keys.forEach((k) => {
      const res = RESERVOIRS.find((r) => r.key === k);
      const st = RIVER_STATIONS.find((s) => s.key === k);
      const arr = [];
      for (let i = steps; i >= 0; i--) {
        const ms = nowMs - i * stepMin * 60000;
        const tH = ms / 3600000;
        let val = 1.0;
        if (res) {
          val = res.baseHtl + 0.12 * Math.sin(tH * 0.35 + k.length);
        } else if (st) {
          const tidal = 0.09 * Math.sin(tH * (2 * Math.PI / 12.42) + k.length);
          const qRef = ['ai-nghia', 'thanh-my', 'hoi-khach', 'cam-le'].includes(st.key) ? 48.5 : 68.6;
          val = Math.max(0.12, st.base + qRef / 320.0 + tidal);
        }
        arr.push({
          station_key: k,
          water_level_m: Number(val.toFixed(2)),
          observed_at: new Date(ms).toISOString(),
        });
      }
      out[k] = arr;
    });
    return out;
  }

  async function loadHydrologyData() {
    let observations = [];
    let fromRender = false;
    try {
      const snap = await apiFetchJson('/api/hydrology/snapshot');
      observations = snap?.observations || [];
      (snap?.thresholds || []).forEach((t) => state.thresholdsByKey.set(t.station_key, t));
      fromRender = observations.length > 0;
    } catch {
      observations = computeLocalFallbackSnapshot();
    }

    if (!observations.length) {
      observations = computeLocalFallbackSnapshot();
    }

    state.readingsByKey.clear();
    observations.forEach((row) => {
      state.readingsByKey.set(row.station_key, row);
      if (row.raw_data?.flows) {
        state.reservoirFlowsByKey.set(row.station_key, row.raw_data.flows);
      }
    });

    renderReservoirGrids();
    renderStationGrids();
    updateHydroKpis();
    updateHydroMarkersOnMap();

    if ($('hydroDot')) $('hydroDot').className = 'led ok';
    if ($('hydroUpdatedTxt')) {
      const tStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      $('hydroUpdatedTxt').textContent = fromRender ? `${tStr} (Live)` : `${tStr} (Sim)`;
    }
  }

  function renderReservoirGrids() {
    const html = RESERVOIRS.map((r) => {
      const row = state.readingsByKey.get(r.key);
      const flows = state.reservoirFlowsByKey.get(r.key) || row?.raw_data?.flows || {};
      const lvl = Number(row?.water_level_m);
      const hasLvl = row?.water_level_m != null && Number.isFinite(lvl);
      const diff = hasLvl ? lvl - r.normal : 0;
      const overNormal = hasLvl && diff > 0;
      const diffNote = hasLvl
        ? overNormal
          ? `▲ Cao hơn MNDBT +${diff.toFixed(2)} m`
          : `▼ Thấp hơn MNDBT ${Math.abs(diff).toFixed(2)} m`
        : 'Đang đồng bộ...';

      const fmtFlow = (v) => (v != null && v !== '' ? `${Number(v).toFixed(1)} m³/s` : '--');
      const totalDown = (Number(flows.turbine) || 0) + (Number(flows.spillway) || 0);
      const hasDown = flows.turbine != null || flows.spillway != null;

      return `<article class="res-card" style="--res-color:${r.color}" data-focus-hydro="${escapeHtml(r.key)}">
        <div class="res-head">
          <div>
            <div class="res-title">⚡ Hồ ${escapeHtml(r.name)}</div>
            <div class="res-river">${escapeHtml(r.river)}</div>
          </div>
          <span class="res-mndbt mono">MNDBT ${r.normal}m</span>
        </div>
        <div class="res-reading mono">${hasLvl ? `${lvl.toFixed(2)} <small>m</small>` : `-- <small>m</small>`}</div>
        <div class="res-diff-note ${overNormal ? 'over' : ''}">${escapeHtml(diffNote)}</div>
        <div class="res-time">Quan trắc: ${escapeHtml(formatViTime(row?.observed_at))}</div>
        <div class="res-flows">
          <div class="flow-cell">Lưu lượng đến hồ<strong>${fmtFlow(flows.inflow)}</strong></div>
          <div class="flow-cell">Tổng xả về hạ du<strong>${hasDown ? `${totalDown.toFixed(1)} m³/s` : fmtFlow(flows.river)}</strong></div>
          <div class="flow-cell">Qua tràn xả lũ<strong>${fmtFlow(flows.spillway)}</strong></div>
          <div class="flow-cell">Chạy máy phát điện<strong>${fmtFlow(flows.turbine)}</strong></div>
        </div>
      </article>`;
    }).join('');

    if ($('overviewReservoirGrid')) $('overviewReservoirGrid').innerHTML = html;
    if ($('fullReservoirGrid')) $('fullReservoirGrid').innerHTML = html;

    $$('[data-focus-hydro]').forEach((card) => {
      card.addEventListener('click', () => focusHydroPointOnMap(card.getAttribute('data-focus-hydro')));
    });
  }

  function renderStationGrids() {
    const q = state.stationSearchQuery.trim().toLowerCase();
    const filtered = RIVER_STATIONS.filter((s) => !q || s.name.toLowerCase().includes(q) || s.river.toLowerCase().includes(q));

    const html = filtered.length
      ? filtered
          .map((st) => {
            const row = state.readingsByKey.get(st.key);
            const th = state.thresholdsByKey.get(st.key);
            const lvl = Number(row?.water_level_m);
            const hasLvl = row?.water_level_m != null && Number.isFinite(lvl);
            const evalRes = evaluateStationWarning(hasLvl ? lvl : null, th);

            return `<article class="st-card ${evalRes.isAlert ? 'is-alert' : ''}" data-station-card="${escapeHtml(st.key)}">
              <div class="st-top">
                <div>
                  <div class="st-name">🌊 Trạm ${escapeHtml(st.name)}</div>
                  <div class="st-river">Sông ${escapeHtml(st.river)}</div>
                </div>
                <span class="st-badge ${evalRes.cls}">${escapeHtml(evalRes.label)}</span>
              </div>
              <div class="st-level mono">${hasLvl ? `${lvl.toFixed(2)} <small>m</small>` : `-- <small>m</small>`}</div>
              <div class="res-time">Cập nhật: ${escapeHtml(formatViTime(row?.observed_at))}</div>
              <div class="st-thresholds mono">BĐ1: ${th?.warning_level_1 ?? '-'}m • BĐ2: ${th?.warning_level_2 ?? '-'}m • BĐ3: ${th?.warning_level_3 ?? '-'}m</div>
            </article>`;
          })
          .join('')
      : `<div class="empty-msg" style="grid-column:1/-1">Không tìm thấy trạm phù hợp.</div>`;

    if ($('overviewStationGrid')) $('overviewStationGrid').innerHTML = html;
    if ($('fullStationGrid')) $('fullStationGrid').innerHTML = html;

    $$('[data-station-card]').forEach((card) => {
      card.addEventListener('click', () => focusHydroPointOnMap(card.getAttribute('data-station-card')));
    });
  }

  function updateHydroKpis() {
    let activeRes = 0;
    let totalDischarge = 0;
    RESERVOIRS.forEach((r) => {
      const row = state.readingsByKey.get(r.key);
      if (row?.water_level_m != null) activeRes++;
      const flows = state.reservoirFlowsByKey.get(r.key) || row?.raw_data?.flows;
      if (flows) totalDischarge += (Number(flows.turbine) || 0) + (Number(flows.spillway) || 0);
    });

    let activeStations = 0;
    const alertStations = [];
    let maxSeverity = 0;
    RIVER_STATIONS.forEach((s) => {
      const row = state.readingsByKey.get(s.key);
      const lvl = Number(row?.water_level_m);
      const hasLvl = row?.water_level_m != null && Number.isFinite(lvl);
      if (hasLvl) activeStations++;
      const evalRes = evaluateStationWarning(hasLvl ? lvl : null, state.thresholdsByKey.get(s.key));
      if (evalRes.isAlert) {
        alertStations.push(`${s.name} (${evalRes.label})`);
        maxSeverity = Math.max(maxSeverity, evalRes.severity);
      }
    });

    if ($('kpiReservoirCount')) $('kpiReservoirCount').textContent = `${activeRes}/${RESERVOIRS.length} hồ`;
    if ($('kpiTotalDischarge')) $('kpiTotalDischarge').textContent = `Tổng Q về hạ du: ${totalDischarge.toFixed(1)} m³/s`;
    if ($('kpiStationCount')) $('kpiStationCount').textContent = `${activeStations}/${RIVER_STATIONS.length} trạm`;
    if ($('kpiAlertCount')) {
      $('kpiAlertCount').textContent = alertStations.length
        ? `⚠️ ${alertStations.length} trạm vượt báo động`
        : 'Tất cả trạm dưới mức BĐ1';
    }

    if ($('kpiBasinTitle')) {
      if (alertStations.length > 0) {
        $('kpiBasinTitle').textContent = `CẢNH BÁO LŨ (BĐ${maxSeverity})`;
        $('kpiBasinTitle').style.color = '#F87171';
        if ($('kpiBasinSub')) $('kpiBasinSub').textContent = alertStations.slice(0, 2).join(', ');
      } else {
        $('kpiBasinTitle').textContent = 'ỔN ĐỊNH • AN TOÀN';
        $('kpiBasinTitle').style.color = '#34D399';
        if ($('kpiBasinSub')) $('kpiBasinSub').textContent = 'Lưu vực Vu Gia – Thu Bồn bình thường';
      }
    }
  }

  /* ==========================================================================
     HISTORICAL CHART.JS & 2-3H FORECAST
     ========================================================================== */

  function initChartSelector() {
    const container = $('chartStationSelector');
    if (!container) return;
    const allSeries = [
      ...RESERVOIRS.map((r) => ({ ...r, badge: 'Hồ' })),
      ...RIVER_STATIONS.map((s) => ({ ...s, badge: 'Sông' })),
    ];
    const defaults = new Set(['hoi-an', 'ai-nghia', 'cau-lau']);

    container.innerHTML = allSeries
      .map(
        (item) => `<label class="chart-chip">
          <input type="checkbox" value="${escapeHtml(item.key)}" ${defaults.has(item.key) ? 'checked' : ''} />
          <span style="width:8px;height:8px;border-radius:50%;background:${item.color};display:inline-block"></span>
          <span>${escapeHtml(item.name)} (${item.badge})</span>
        </label>`
      )
      .join('');

    container.addEventListener('change', () => loadChart());
    $('selChartPeriod')?.addEventListener('change', () => loadChart());
  }

  async function loadChart() {
    const selector = $('chartStationSelector');
    const canvas = $('hydroHistoryChart');
    if (!selector || !canvas || typeof Chart === 'undefined') return;

    const checkedKeys = $$('input[type="checkbox"]:checked', selector).map((el) => el.value);
    const hours = Number($('selChartPeriod')?.value || 24);
    const selectedItems = [...RESERVOIRS, ...RIVER_STATIONS].filter((it) => checkedKeys.includes(it.key));

    if (!selectedItems.length) {
      if (state.chartInstance) {
        state.chartInstance.destroy();
        state.chartInstance = null;
      }
      $('chartEmptyNotice')?.classList.remove('hidden');
      if ($('chartEmptyNotice')) $('chartEmptyNotice').textContent = 'Hãy tích chọn ít nhất 1 trạm hoặc hồ chứa để vẽ biểu đồ.';
      return;
    }

    let seriesByKey = {};
    try {
      const resp = await apiFetchJson(`/api/hydrology/history?keys=${encodeURIComponent(checkedKeys.join(','))}&hours=${hours}`);
      seriesByKey = resp?.series || {};
    } catch {
      seriesByKey = computeLocalFallbackSeries(checkedKeys, hours);
    }

    const timeSet = new Set();
    selectedItems.forEach((it) => {
      (seriesByKey[it.key] || []).forEach((r) => {
        if (r.observed_at && r.water_level_m != null) timeSet.add(r.observed_at);
      });
    });

    const sortedIso = Array.from(timeSet).sort();
    if (!sortedIso.length) return;
    $('chartEmptyNotice')?.classList.add('hidden');

    const labels = sortedIso.map((iso) => {
      const d = new Date(iso);
      return hours <= 24
        ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    });

    const datasets = selectedItems.map((it) => {
      const mapByIso = new Map();
      (seriesByKey[it.key] || []).forEach((r) => mapByIso.set(r.observed_at, Number(r.water_level_m)));
      return {
        label: `${it.name} (m)`,
        data: sortedIso.map((iso) => (mapByIso.has(iso) ? mapByIso.get(iso) : null)),
        borderColor: it.color,
        backgroundColor: `${it.color}22`,
        borderWidth: 2.3,
        pointRadius: sortedIso.length > 50 ? 0 : 2.5,
        spanGaps: true,
        tension: 0.32,
      };
    });

    if (state.chartInstance) state.chartInstance.destroy();
    state.chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#CBD5E1' } },
          tooltip: { backgroundColor: 'rgba(8, 15, 30, 0.94)', borderColor: 'rgba(56, 189, 248, 0.35)', borderWidth: 1 },
        },
        scales: {
          x: { ticks: { color: '#94A3B8', maxTicksLimit: 10 }, grid: { color: 'rgba(148, 163, 184, 0.08)' } },
          y: { ticks: { color: '#94A3B8', callback: (v) => `${v}m` }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
        },
      },
    });
  }

  async function loadForecastTrends() {
    const grid = $('forecastCardsGrid');
    if (!grid) return;

    const keys = FORECAST_META.map((m) => m.key);
    let seriesMap = {};
    try {
      const resp = await apiFetchJson(`/api/hydrology/history?keys=${encodeURIComponent(keys.join(','))}&hours=4`);
      seriesMap = resp?.series || {};
    } catch {
      seriesMap = computeLocalFallbackSeries(keys, 4);
    }

    const diffsByKey = new Map();
    const cards = [];

    FORECAST_META.forEach((meta) => {
      const series = seriesMap[meta.key] || [];
      if (series.length < 2) return;
      const first = Number(series[0].water_level_m);
      const current = Number(series[series.length - 1].water_level_m);
      const diff = current - first;
      diffsByKey.set(meta.key, diff);
      const predicted = Math.max(0, current + diff * 0.7);

      let trendLabel = '➖ Đi ngang / Ổn định';
      let trendColor = '#34D399';
      if (diff > 0.08) {
        trendLabel = `🔺 Đang lên (+${diff.toFixed(2)}m)`;
        trendColor = '#F87171';
      } else if (diff < -0.08) {
        trendLabel = `🔻 Đang rút (${diff.toFixed(2)}m)`;
        trendColor = '#38BDF8';
      }

      const th = state.thresholdsByKey.get(meta.key);
      let note = 'Dự kiến duy trì dưới mức báo động trong 2–3h tới.';
      if (th?.warning_level_1 != null && predicted >= Number(th.warning_level_1)) {
        note = '⚠️ Chú ý: Dự báo tiệm cận hoặc vượt Báo động 1.';
      }

      cards.push(`<div class="fc-card">
        <div class="fc-name">🌊 ${escapeHtml(meta.name)} (${escapeHtml(meta.river)})</div>
        <div class="fc-trend" style="color:${trendColor}">${escapeHtml(trendLabel)}</div>
        <div class="fc-val mono">${current.toFixed(2)}m → ${predicted.toFixed(2)}m</div>
        <div class="fc-note">${escapeHtml(note)}</div>
      </div>`);
    });

    const upDiffs = [diffsByKey.get('hiep-duc'), diffsByKey.get('hoi-khach')].filter((v) => typeof v === 'number');
    const avgDiff = upDiffs.length ? upDiffs.reduce((a, b) => a + b, 0) / upDiffs.length : 0;
    const estChange = avgDiff * 0.7;

    let dbtStatus = 'Ổn định • An toàn';
    let dbtColor = '#34D399';
    let dbtAdvice = 'Mực nước thượng nguồn Hiệp Đức & Hội Khách ổn định. Vùng Gò Nổi – Điện Bàn Tây an toàn trong 2–3h tới.';
    if (estChange > 0.12) {
      dbtStatus = `Nước dâng +${estChange.toFixed(2)}m (Trễ 1–1.5h)`;
      dbtColor = '#F59E0B';
      dbtAdvice = 'Thượng nguồn đang dâng! Dự kiến sau 1–1.5h nước sẽ dồn về khu vực Điện Bàn Tây.';
    }

    if ($('kpiDbTayTrend')) {
      $('kpiDbTayTrend').textContent = dbtStatus;
      $('kpiDbTayTrend').style.color = dbtColor;
    }

    const dbtCard = `<div class="fc-card special-dbt">
      <div class="fc-name">🧭 Khu Vực Điện Bàn Tây (Gò Nổi)</div>
      <div class="fc-trend" style="color:${dbtColor}">${escapeHtml(dbtStatus)}</div>
      <div class="fc-val mono">${estChange >= 0 ? '+' : ''}${estChange.toFixed(2)} m <small style="font-size:12px;color:#94A3B8">(dự kiến)</small></div>
      <div class="fc-note">${escapeHtml(dbtAdvice)}</div>
    </div>`;

    grid.innerHTML = dbtCard + cards.join('');
  }

  /* ==========================================================================
     COMMUNITY FLOOD REPORTS (RENDER API + LOCAL FALLBACK)
     ========================================================================== */

  function getLocalCommReports() {
    try {
      const raw = localStorage.getItem('camip_cloud_comm');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [
      {
        id: 101,
        name: 'Trực ban PCTT Điện Bàn Tây (Gò Nổi)',
        content: 'Mực nước sông Thu Bồn qua khu vực Gò Nổi – Điện Bàn Tây hiện ổn định dưới Báo động 1. Sa bàn mô phỏng CamIP đang hoạt động trực tuyến.',
        created_at: new Date(Date.now() - 40 * 60000).toISOString(),
      },
      {
        id: 100,
        name: 'Anh Minh - Cầu Câu Lâu',
        content: 'Giao thông qua cầu Câu Lâu bình thường, dòng chảy hạ du thông thoáng.',
        created_at: new Date(Date.now() - 135 * 60000).toISOString(),
      },
    ];
  }

  async function loadCommunityReports() {
    const listEl = $('communityFeedList');
    if (!listEl) return;

    let items = [];
    try {
      const resp = await apiFetchJson('/api/hydrology/community');
      items = Array.isArray(resp?.reports) ? resp.reports : [];
    } catch {
      items = getLocalCommReports();
    }

    if ($('sideCommCount')) $('sideCommCount').textContent = String(items.length);

    if (!items.length) {
      listEl.innerHTML = '<div class="empty-msg">Chưa có báo cáo ngập lụt nào gần đây.</div>';
      return;
    }

    listEl.innerHTML = items
      .map(
        (item) => `<article class="comm-card">
          <div class="comm-card-top">
            <div>
              <strong>📍 ${escapeHtml(item.name)}</strong>
              <span style="color:#64748B;margin-left:8px">${escapeHtml(formatViTime(item.created_at))}</span>
            </div>
            <button type="button" class="comm-del-btn" data-del-comm="${item.id}">Xóa</button>
          </div>
          <div class="comm-body">${escapeHtml(item.content)}</div>
        </article>`
      )
      .join('');

    $$('[data-del-comm]', listEl).forEach((btn) => {
      btn.addEventListener('click', () => deleteCommunityReport(btn.getAttribute('data-del-comm')));
    });
  }

  async function submitCommunityReport(ev) {
    ev.preventDefault();
    const name = $('inpCommName')?.value.trim();
    const content = $('inpCommContent')?.value.trim();
    if (!name || !content) return;

    try {
      await apiFetchJson('/api/hydrology/community', {
        method: 'POST',
        body: JSON.stringify({ name, content }),
      });
    } catch {
      const cur = getLocalCommReports();
      cur.unshift({ id: Date.now(), name, content, created_at: new Date().toISOString() });
      localStorage.setItem('camip_cloud_comm', JSON.stringify(cur.slice(0, 30)));
    }

    if ($('inpCommContent')) $('inpCommContent').value = '';
    showToast('Đã đăng tin báo lũ cộng đồng!', 'success');
    loadCommunityReports();
  }

  async function deleteCommunityReport(id) {
    const pwd = window.prompt('Nhập mật khẩu Quản trị viên để xóa tin cộng đồng (mặc định: admin123):');
    if (pwd === null) return;
    if (pwd !== 'admin123') {
      showToast('Sai mật khẩu quản trị viên!', 'error');
      return;
    }
    try {
      await apiFetchJson(`/api/hydrology/community/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      const cur = getLocalCommReports().filter((x) => String(x.id) !== String(id));
      localStorage.setItem('camip_cloud_comm', JSON.stringify(cur));
    }
    showToast('Đã xóa báo cáo cộng đồng.', 'success');
    loadCommunityReports();
  }

  /* ==========================================================================
     60 FPS CANVAS RIVER CAMERA SIMULATOR (LIVE + ZONE STUDIO + 20s REPLAY)
     ========================================================================== */

  function drawSimulatedRiverScene(ctx, w, h, opts = {}) {
    const tSec = opts.timeSec ?? (performance.now() - state.simStartTs) / 1000;
    const scene = opts.scene || state.simScene || 'dbt';
    const poly = opts.polygon || state.waterZone;
    const mode = opts.mode || 'live'; // 'live' | 'replay' | 'static'
    const replaySec = opts.replaySec ?? 0;

    ctx.clearRect(0, 0, w, h);

    // 1. Sky / Upper Riverbank Embankment
    const bankGrad = ctx.createLinearGradient(0, 0, 0, h * 0.48);
    if (scene === 'caulau') {
      bankGrad.addColorStop(0, '#102038');
      bankGrad.addColorStop(1, '#26384d');
    } else {
      bankGrad.addColorStop(0, '#132824');
      bankGrad.addColorStop(1, '#283d34');
    }
    ctx.fillStyle = bankGrad;
    ctx.fillRect(0, 0, w, h * 0.48);

    // Concrete embankment walkway + safety railing posts
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, h * 0.34, w, h * 0.11);
    ctx.fillStyle = '#64748B';
    ctx.fillRect(0, h * 0.435, w, 5);
    for (let x = 40; x < w; x += 95) {
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(x, h * 0.38, 6, h * 0.065);
    }

    // 2. Flowing River Water (Sông Thu Bồn)
    const waterGrad = ctx.createLinearGradient(0, h * 0.44, 0, h);
    waterGrad.addColorStop(0, '#0c4a6e');
    waterGrad.addColorStop(0.55, '#075985');
    waterGrad.addColorStop(1, '#082f49');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, h * 0.44, w, h * 0.56);

    // Animated water ripples
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.22)';
    ctx.lineWidth = 1.6;
    for (let row = 0; row < 8; row++) {
      const yBase = h * (0.49 + row * 0.062);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 24) {
        const wy = yBase + Math.sin(x * 0.022 + tSec * 2.6 + row * 1.3) * 3.5;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    // 3. Draw Water Zone Polygon Overlay
    if (Array.isArray(poly) && poly.length >= 3) {
      ctx.save();
      ctx.beginPath();
      poly.forEach((pt, idx) => {
        const px = pt[0] * w;
        const py = pt[1] * h;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(14, 165, 233, 0.24)';
      ctx.fill();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Label center
      const cx = poly.reduce((s, p) => s + p[0] * w, 0) / poly.length;
      const cy = poly.reduce((s, p) => s + p[1] * h, 0) / poly.length;
      ctx.font = '700 15px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(240, 249, 255, 0.88)';
      ctx.textAlign = 'center';
      ctx.fillText('VUNG NUOC GIAM SAT (SIM)', cx, cy);
      ctx.restore();
    }

    if (mode === 'static') return;

    // 4. Simulated Person & Bounding Box Tracking
    let px = w * 0.25;
    let py = h * 0.30;
    let boxW = 54;
    let boxH = 108;
    let status = 'SAFE';
    let label = '#12 AN TOAN (95%)';

    if (mode === 'replay') {
      // 20-second deterministic incident replay:
      // 0s -> 8.5s: walking along bank
      // 8.5s -> 10.0s: slipping at bank edge
      // 10.0s -> 20.0s: fallen inside water zone with splash rings!
      if (replaySec < 8.5) {
        px = w * (0.18 + (replaySec / 8.5) * 0.34);
        py = h * 0.28;
        status = replaySec > 6.5 ? 'WARNING' : 'SAFE';
        label = status === 'WARNING' ? '#99 SAT MEP NUOC (96%)' : '#99 AN TOAN (94%)';
      } else if (replaySec < 10.0) {
        const k = (replaySec - 8.5) / 1.5;
        px = w * (0.52 + k * 0.05);
        py = h * (0.28 + k * 0.25);
        boxW = 54 + k * 28;
        boxH = 108 - k * 46;
        status = 'WARNING';
        label = '#99 TRUOT CHAN MEP SONG (97%)';
      } else {
        const post = replaySec - 10.0;
        px = w * 0.58 + Math.sin(post * 3.2) * 8;
        py = h * 0.58 + Math.cos(post * 2.5) * 5;
        boxW = 88;
        boxH = 56;
        status = 'CRITICAL';
        label = '#99 CANH BAO: ROI XUONG NUOC! (98%)';
      }
    } else {
      // Live mode
      const nowMs = performance.now();
      const fallElapsed = state.simFallStartMs > 0 ? (nowMs - state.simFallStartMs) / 1000 : -1;

      if (fallElapsed >= 0 && fallElapsed <= 11.0) {
        if (fallElapsed < 1.2) {
          const k = fallElapsed / 1.2;
          px = w * 0.54;
          py = h * (0.30 + k * 0.28);
          boxW = 56 + k * 30;
          boxH = 106 - k * 48;
          status = 'CRITICAL';
          label = '#99 ROI XUONG NUOC! (98%)';
        } else {
          px = w * 0.55 + Math.sin(fallElapsed * 4.0) * 7;
          py = h * 0.59 + Math.cos(fallElapsed * 3.0) * 5;
          boxW = 88;
          boxH = 56;
          status = 'CRITICAL';
          label = '#99 NGUY HIEM TRONG NUOC! (98%)';
        }
      } else {
        if (state.simFallStartMs > 0 && fallElapsed > 11.0) {
          state.simFallStartMs = 0;
          state.threatLevel = 'SAFE';
          updateThreatBadges('SAFE');
        }
        const walkCycle = (Math.sin(tSec * 0.55) + 1) * 0.5;
        px = w * (0.16 + walkCycle * 0.66);
        const nearEdge = nowMs < state.simWalkWarnUntilMs;
        py = nearEdge ? h * 0.35 : h * 0.27;
        status = nearEdge ? 'WARNING' : 'SAFE';
        label = nearEdge ? '#12 CANH BAO: SAT MEP NUOC (96%)' : '#12 AN TOAN (95%)';
      }
    }

    // Splash rings if in water
    if (status === 'CRITICAL') {
      for (let r = 1; r <= 3; r++) {
        const rad = ((tSec * 38 + r * 22) % 72) + 16;
        ctx.beginPath();
        ctx.ellipse(px + boxW / 2, py + boxH * 0.65, rad, rad * 0.42, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw Stylized Person Silhouette
    ctx.save();
    ctx.fillStyle = status === 'CRITICAL' ? '#FCA5A5' : '#E2E8F0';
    if (status === 'CRITICAL') {
      ctx.beginPath();
      ctx.arc(px + 22, py + 26, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(px + 34, py + 18, 40, 20);
    } else {
      ctx.beginPath();
      ctx.arc(px + boxW / 2, py + 16, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(px + boxW / 2 - 11, py + 30, 22, 44);
      ctx.fillRect(px + boxW / 2 - 10, py + 74, 8, 28);
      ctx.fillRect(px + boxW / 2 + 2, py + 74, 8, 28);
    }

    // Draw AI Bounding Box
    const boxColor = status === 'CRITICAL' ? '#EF4444' : status === 'WARNING' ? '#F59E0B' : '#22C55E';
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, boxW, boxH);

    ctx.font = '700 13px "JetBrains Mono", monospace';
    const tw = ctx.measureText(label).width + 14;
    ctx.fillStyle = boxColor;
    ctx.fillRect(px, Math.max(4, py - 24), tw, 22);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(label, px + 7, Math.max(19, py - 8));

    // Critical Red Frame Alert HUD
    if (status === 'CRITICAL') {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 7;
      ctx.strokeRect(3, 3, w - 6, h - 6);
    }

    // Top-right Timestamp OSD
    const osd = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    ctx.fillStyle = 'rgba(6, 11, 22, 0.72)';
    ctx.fillRect(w - 265, 12, 250, 28);
    ctx.fillStyle = '#93C5FD';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(`${scene === 'caulau' ? 'CAM-02 CAU LAU' : 'CAM-01 DIEN BAN TAY'} • ${osd}`, w - 255, 30);
    ctx.restore();
  }

  function startLiveSimLoop() {
    stopLiveSimLoop();
    const canvas = $('simLiveCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const step = () => {
      if (!state.camModalOpen || state.activeCamTab !== 'live') return;
      drawSimulatedRiverScene(ctx, canvas.width, canvas.height, { mode: 'live' });
      state.simRafId = requestAnimationFrame(step);
    };
    state.simRafId = requestAnimationFrame(step);
  }

  function stopLiveSimLoop() {
    if (state.simRafId) {
      cancelAnimationFrame(state.simRafId);
      state.simRafId = null;
    }
  }

  function updateThreatBadges(level) {
    state.threatLevel = level || 'SAFE';
    document.body.setAttribute('data-threat', state.threatLevel);
    const badge = $('camipModalThreatBadge');
    if (badge) {
      if (state.threatLevel === 'CRITICAL') {
        badge.className = 'threat-tag danger';
        badge.textContent = 'NGUY HIỂM: RƠI NƯỚC';
      } else if (state.threatLevel === 'WARNING') {
        badge.className = 'threat-tag warn';
        badge.textContent = 'SÁT MÉP NƯỚC';
      } else {
        badge.className = 'threat-tag safe';
        badge.textContent = 'AN TOÀN';
      }
    }
    if ($('hudFpsBadge')) {
      $('hudFpsBadge').textContent = `CLOUD SIMULATION • 60 FPS • Mức đe dọa: ${state.threatLevel}`;
    }
  }

  /* ==========================================================================
     CAMIP MODAL, SIREN, WEBSOCKET & WATER ZONE EDITOR
     ========================================================================== */

  function openCamIpModal(camStation = null, initialTab = 'live') {
    const modal = $('camipCommandModal');
    if (!modal) return;
    if (camStation) {
      state.activeCamStation = camStation;
      state.simScene = camStation.scene || 'dbt';
      if ($('selSimScene')) $('selSimScene').value = state.simScene;
    }
    const cam = state.activeCamStation || CAMIP_CAMERAS[0];
    if ($('camipModalStationName')) $('camipModalStationName').textContent = cam.name;
    if ($('camipModalLocationMeta')) {
      $('camipModalLocationMeta').textContent =
        `Tọa độ: ${cam.lat.toFixed(4)}°N, ${cam.lng.toFixed(4)}°E • ${cam.area}`;
    }

    state.camModalOpen = true;
    modal.classList.remove('hidden');
    switchCamSubTab(initialTab);
    refreshCamIpData();
  }

  function closeCamIpModal() {
    state.camModalOpen = false;
    $('camipCommandModal')?.classList.add('hidden');
    stopLiveSimLoop();
  }

  function switchCamSubTab(tabName) {
    state.activeCamTab = tabName;
    $$('.cam-tab[data-camtab]').forEach((btn) => btn.classList.toggle('active', btn.dataset.camtab === tabName));
    $$('.cam-subview').forEach((view) => view.classList.toggle('active', view.id === `camview-${tabName}`));

    if (tabName === 'live' && state.camModalOpen) {
      startLiveSimLoop();
    } else {
      stopLiveSimLoop();
    }

    if (tabName === 'zone') {
      if (!state.zoneDraft.length) {
        state.zoneDraft = state.waterZone.map((pt) => [pt[0], pt[1]]);
      }
      renderZoneEditorCanvas();
    }
  }

  function renderLiveZoneSvgOverlay() {
    const svg = $('liveZoneOverlay');
    if (!svg) return;
    svg.classList.toggle('hidden', !state.showVectorOverlay);
    if ($('hudZoneInfo')) $('hudZoneInfo').textContent = `Vùng nước: ${state.waterZone.length} đỉnh`;
    if (!state.waterZone.length) {
      svg.innerHTML = '';
      return;
    }
    const pts = state.waterZone.map((p) => `${p[0] * 1000},${p[1] * 1000}`).join(' ');
    svg.innerHTML = `<polygon points="${pts}" fill="rgba(56,189,248,0.16)" stroke="#38BDF8" stroke-width="5" stroke-dasharray="14 8" />`;
  }

  async function refreshCamIpData() {
    try {
      const [status, vidsResp, alertsResp] = await Promise.all([
        apiFetchJson('/api/status'),
        apiFetchJson('/api/videos'),
        apiFetchJson('/api/alerts'),
      ]);
      state.renderConnected = true;
      if (Array.isArray(status?.water_zone) && status.water_zone.length >= 3) {
        state.waterZone = status.water_zone;
      }
      if (Array.isArray(vidsResp?.videos)) state.videos = vidsResp.videos;
      if (Array.isArray(alertsResp?.alerts)) state.alerts = alertsResp.alerts;

      if ($('camipDot')) $('camipDot').className = 'led ok';
      if ($('camipStatusTxt')) $('camipStatusTxt').textContent = 'Render API Online';
      if ($('camipModalOnlineBadge')) {
        $('camipModalOnlineBadge').className = 'conn-pill online';
        $('camipModalOnlineBadge').textContent = 'RENDER API + SIM 60FPS';
      }
    } catch {
      state.renderConnected = false;
      if ($('camipDot')) $('camipDot').className = 'led ok';
      if ($('camipStatusTxt')) $('camipStatusTxt').textContent = 'Mô phỏng Trình duyệt';
      if ($('camipModalOnlineBadge')) {
        $('camipModalOnlineBadge').className = 'conn-pill online';
        $('camipModalOnlineBadge').textContent = 'BROWSER SIM • 60 FPS';
      }
    }

    renderLiveZoneSvgOverlay();
    renderCamFeedAndVault();
  }

  function renderCamFeedAndVault() {
    const vids = state.videos || [];
    const alerts = state.alerts || [];

    if ($('camTabVidCount')) $('camTabVidCount').textContent = String(vids.length);
    if ($('cntAllVids')) $('cntAllVids').textContent = String(vids.length);
    if ($('cntRealVids')) $('cntRealVids').textContent = String(vids.filter((v) => !v.is_test).length);
    if ($('cntTestVids')) $('cntTestVids').textContent = String(vids.filter((v) => v.is_test).length);
    if ($('kpiCamVideos')) $('kpiCamVideos').textContent = `Kho Replay: ${vids.length} sự cố 20s →`;

    const feedList = $('camLiveFeedList');
    if (feedList) {
      feedList.innerHTML = alerts.length
        ? alerts
            .slice(0, 12)
            .map(
              (a) => `<article class="feed-item">
                <div class="feed-item-top">
                  <strong>🚨 ${escapeHtml(a.title)}</strong>
                  <span class="mono">${escapeHtml(a.timestamp || '')}</span>
                </div>
                <p>${escapeHtml(a.message || '')}</p>
                <div style="margin-top:8px">
                  ${
                    a.video_status === 'READY'
                      ? `<button type="button" class="btn-top-ghost" data-play-sim-id="${escapeHtml(a.id)}">▶ Mở Phân Tích Replay 20s (10s Trước + 10s Sau)</button>`
                      : `<span class="mono" style="color:#FBBF24">⏳ Đang thu tiếp 10s sau sự cố...</span>`
                  }
                </div>
              </article>`
            )
            .join('')
        : '<div class="empty-msg">Chưa có sự cố nào. Nhấn "⚡ Giả Lập Rơi Xuống Nước" để kiểm thử!</div>';

      $$('[data-play-sim-id]', feedList).forEach((btn) => {
        btn.addEventListener('click', () => openReplayById(btn.getAttribute('data-play-sim-id')));
      });
    }

    // Video Vault Grid
    const vaultGrid = $('videoVaultGrid');
    if (vaultGrid) {
      const q = state.videoSearch.trim().toLowerCase();
      const filteredVids = vids.filter((v) => {
        if (state.videoFilter === 'real' && v.is_test) return false;
        if (state.videoFilter === 'test' && !v.is_test) return false;
        if (q && !`${v.id} ${v.created_at} ${v.station_name || ''}`.toLowerCase().includes(q)) return false;
        return true;
      });

      vaultGrid.innerHTML = filteredVids.length
        ? filteredVids
            .map(
              (v) => `<article class="glass-subcard" style="cursor:pointer" data-vault-play="${escapeHtml(v.id)}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <span class="badge-20s">REPLAY 20s</span>
                  <span class="mono" style="font-size:11px;color:#94A3B8">${escapeHtml(v.created_at || '')}</span>
                </div>
                <h4 style="margin:0 0 6px;color:#F8FAFC">${escapeHtml(v.station_name || 'Trạm Mô Phỏng CamIP')}</h4>
                <p style="font-size:12px;color:#94A3B8;margin:0 0 10px">Mã: <code>${escapeHtml(v.id)}</code> • 10s trước &amp; 10s sau mốc rơi nước</p>
                <button type="button" class="btn-primary-full">▶ Xem &amp; Tua Phân Tích 20s</button>
              </article>`
            )
            .join('')
        : '<div class="empty-msg" style="grid-column:1/-1">Không có bản ghi phù hợp bộ lọc.</div>';

      $$('[data-vault-play]', vaultGrid).forEach((card) => {
        card.addEventListener('click', () => openReplayById(card.getAttribute('data-vault-play')));
      });
    }

    // Alerts Table
    const tbody = $('alertsTableBody');
    if (tbody) {
      tbody.innerHTML = alerts
        .map(
          (a) => `<tr>
            <td><span class="sim-mode-pill">SIM</span></td>
            <td><strong>${escapeHtml(a.title)}</strong></td>
            <td>${escapeHtml(a.message)}</td>
            <td class="mono">${Math.round((Number(a.confidence) || 0.98) * 100)}%</td>
            <td class="mono">${escapeHtml(a.timestamp || '')}</td>
            <td>${
              a.video_status === 'READY'
                ? `<button type="button" class="btn-top-ghost" data-table-play="${escapeHtml(a.id)}">▶ Xem 20s</button>`
                : 'Đang thu...'
            }</td>
          </tr>`
        )
        .join('');

      $$('[data-table-play]', tbody).forEach((btn) => {
        btn.addEventListener('click', () => openReplayById(btn.getAttribute('data-table-play')));
      });
    }
  }

  /* ==========================================================================
     TRIGGER FALL SIMULATION (SYNCED WITH RENDER OR LOCAL BROWSER)
     ========================================================================== */

  function playEmergencySiren() {
    if (state.muted || state.sirenActive) return;
    state.sirenActive = true;
    const pulse = () => {
      if (state.muted || !state.sirenActive) return;
      try {
        if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = state.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(680, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1180, ctx.currentTime + 0.28);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.46);
      } catch { /* ignore autoplay restriction */ }
    };
    pulse();
    state.sirenInterval = setInterval(pulse, 620);
  }

  function stopEmergencySiren() {
    state.sirenActive = false;
    if (state.sirenInterval) {
      clearInterval(state.sirenInterval);
      state.sirenInterval = null;
    }
    $('emergencyAlertBar')?.classList.add('hidden');
  }

  function handleIncomingFallAlert(alertObj) {
    state.latestEmergencyAlert = alertObj;
    state.simFallStartMs = performance.now();
    updateThreatBadges('CRITICAL');

    if ($('emgTitle')) $('emgTitle').textContent = alertObj.title || '[MÔ PHỎNG] PHÁT HIỆN NGƯỜI RƠI XUỐNG NƯỚC!';
    if ($('emgMessage')) $('emgMessage').textContent = alertObj.message || 'Đang thu thập 10s trước & 10s sau sự cố...';
    $('emergencyAlertBar')?.classList.remove('hidden');
    playEmergencySiren();

    // Start 10s recording progress bar
    const banner = $('camRecordingNotice');
    const fill = $('camRecFill');
    const pctTxt = $('camRecPct');
    if (banner) banner.classList.remove('hidden');
    let elapsed = 0;
    if (state.recProgressTimer) clearInterval(state.recProgressTimer);
    state.recProgressTimer = setInterval(() => {
      elapsed += 0.25;
      const pct = Math.min(100, Math.round((elapsed / 10) * 100));
      if (fill) fill.style.width = `${pct}%`;
      if (pctTxt) pctTxt.textContent = `${pct}%`;
      if (elapsed >= 10) {
        clearInterval(state.recProgressTimer);
        state.recProgressTimer = null;
        if (banner) banner.classList.add('hidden');
      }
    }, 250);
  }

  async function triggerFallSimulation() {
    const cam = state.activeCamStation || CAMIP_CAMERAS[0];
    try {
      const resp = await apiFetchJson('/api/test/trigger-fall', {
        method: 'POST',
        body: JSON.stringify({ station_id: cam.id, station_name: cam.name }),
      });
      if (resp?.alert) {
        if (!state.alerts.some((a) => a.id === resp.alert.id)) {
          state.alerts.unshift(resp.alert);
        }
        handleIncomingFallAlert(resp.alert);
        renderCamFeedAndVault();
        showToast('⚡ Đã kích hoạt mô phỏng rơi xuống nước qua Render Cloud!', 'info');
      }
      return;
    } catch {
      // Standalone Browser Simulation Fallback
      const id = `sim_local_${Math.floor(Date.now() / 1000)}`;
      const ts = new Date().toLocaleString('sv-SE');
      const alertObj = {
        id,
        type: 'WATER_FALL_DETECTED',
        title: '[MÔ PHỎNG] PHÁT HIỆN NGƯỜI RƠI XUỐNG NƯỚC!',
        message: `Kích hoạt kịch bản rơi xuống nước tại ${cam.name}. Đang trích xuất 10s trước & 10s sau...`,
        track_id: 99,
        confidence: 0.98,
        timestamp: ts,
        video_status: 'RECORDING',
        is_test: true,
      };
      state.alerts.unshift(alertObj);
      handleIncomingFallAlert(alertObj);
      renderCamFeedAndVault();
      showToast('⚡ Đã kích hoạt mô phỏng rơi xuống nước (10s trước + 10s sau)!', 'info');

      setTimeout(() => {
        alertObj.video_status = 'READY';
        state.videos.unshift({
          id,
          filename: `${id}.webm`,
          station_id: cam.id,
          station_name: cam.name,
          created_at: ts,
          duration: 20.0,
          fall_time_offset: 10.0,
          fall_ratio: 0.5,
          is_test: true,
          simulation: true,
        });
        updateThreatBadges('SAFE');
        renderCamFeedAndVault();
        showToast('✅ Replay sự cố 20s (10s trước & 10s sau) đã sẵn sàng!', 'success');
      }, 10000);
    }
  }

  function connectCloudWebSocket() {
    if (state.ws) {
      try { state.ws.close(); } catch { /* ignore */ }
      state.ws = null;
    }
    const wsUrl = buildWsUrl();
    if (!wsUrl) return;

    try {
      const ws = new WebSocket(wsUrl);
      state.ws = ws;
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'WATER_FALL_DETECTED') {
            if (!state.alerts.some((a) => a.id === msg.id)) {
              state.alerts.unshift(msg);
            }
            handleIncomingFallAlert(msg);
            renderCamFeedAndVault();
          } else if (msg.type === 'VIDEO_RECORDED') {
            refreshCamIpData();
            showToast('🎬 Bản ghi mô phỏng 20s đã hoàn tất đồng bộ từ Render!', 'success');
          }
        } catch { /* ignore */ }
      };
      ws.onclose = () => {
        if (state.wsReconnectTimer) clearTimeout(state.wsReconnectTimer);
        state.wsReconnectTimer = setTimeout(connectCloudWebSocket, 6000);
      };
    } catch { /* ignore */ }
  }

  /* ==========================================================================
     WATER ZONE POLYGON STUDIO (CANVAS)
     ========================================================================== */

  function renderZoneEditorCanvas() {
    const canvas = $('waterZoneCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    drawSimulatedRiverScene(ctx, w, h, { mode: 'static', polygon: [] });

    const pts = state.zoneDraft;
    if (pts.length > 0) {
      ctx.beginPath();
      pts.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p[0] * w, p[1] * h);
        else ctx.lineTo(p[0] * w, p[1] * h);
      });
      if (pts.length >= 3) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(14, 165, 233, 0.28)';
        ctx.fill();
      }
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.6;
      ctx.stroke();

      pts.forEach((p, idx) => {
        ctx.beginPath();
        ctx.arc(p[0] * w, p[1] * h, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#0EA5E9';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 11px monospace';
        ctx.fillText(`#${idx + 1}`, p[0] * w + 10, p[1] * h - 8);
      });
    }

    const listEl = $('zoneVerticesList');
    if (listEl) {
      listEl.innerHTML = pts.length
        ? pts
            .map(
              (p, i) => `<div style="display:flex;justify-content:space-between;padding:6px 8px;border-bottom:1px solid rgba(148,163,184,0.12)">
                <span>Đỉnh #${i + 1}</span>
                <span>X: ${(p[0] * 100).toFixed(1)}% • Y: ${(p[1] * 100).toFixed(1)}%</span>
              </div>`
            )
            .join('')
        : '<div class="empty-msg">Click lên khung hình bên trái để thêm đỉnh vùng nước.</div>';
    }
  }

  function initZoneStudioEvents() {
    const canvas = $('waterZoneCanvas');
    if (!canvas) return;

    const toNorm = (ev) => {
      const rect = canvas.getBoundingClientRect();
      const nx = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const ny = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
      return [Number(nx.toFixed(3)), Number(ny.toFixed(3))];
    };

    canvas.addEventListener('pointerdown', (ev) => {
      const [nx, ny] = toNorm(ev);
      const hitIdx = state.zoneDraft.findIndex((p) => Math.hypot(p[0] - nx, p[1] - ny) < 0.035);
      if (hitIdx >= 0) {
        state.draggingVertexIdx = hitIdx;
      } else {
        state.zoneDraft.push([nx, ny]);
        renderZoneEditorCanvas();
      }
    });

    canvas.addEventListener('pointermove', (ev) => {
      const [nx, ny] = toNorm(ev);
      if ($('zoneCursorReadout')) {
        $('zoneCursorReadout').textContent = `X: ${(nx * 100).toFixed(1)}% | Y: ${(ny * 100).toFixed(1)}%`;
      }
      if (state.draggingVertexIdx >= 0) {
        state.zoneDraft[state.draggingVertexIdx] = [nx, ny];
        renderZoneEditorCanvas();
      }
    });

    window.addEventListener('pointerup', () => {
      state.draggingVertexIdx = -1;
    });
  }

  async function autoDetectWaterZoneSim() {
    $('zoneScanOverlay')?.classList.remove('hidden');
    let nextPts = [
      [0.06, 0.45],
      [0.38, 0.43],
      [0.68, 0.44],
      [0.95, 0.46],
      [0.97, 0.95],
      [0.03, 0.95],
    ];
    try {
      const res = await apiFetchJson('/api/config/water-zone/auto-detect', { method: 'POST' });
      if (Array.isArray(res?.points)) nextPts = res.points;
    } catch { /* local fallback */ }

    setTimeout(() => {
      $('zoneScanOverlay')?.classList.add('hidden');
      state.waterZone = nextPts;
      state.zoneDraft = nextPts.map((p) => [p[0], p[1]]);
      renderZoneEditorCanvas();
      renderLiveZoneSvgOverlay();
      showToast('✨ Đã tự động khớp ranh giới mặt nước sông (6 đỉnh)!', 'success');
    }, 550);
  }

  async function saveWaterZoneSim() {
    if (state.zoneDraft.length < 3) {
      showToast('Vùng nước cần tối thiểu 3 đỉnh!', 'error');
      return;
    }
    state.waterZone = state.zoneDraft.map((p) => [p[0], p[1]]);
    try {
      await apiFetchJson('/api/config/water-zone', {
        method: 'POST',
        body: JSON.stringify({ points: state.waterZone }),
      });
    } catch { /* standalone ok */ }
    renderLiveZoneSvgOverlay();
    showToast(`💾 Đã lưu Vùng Nước (${state.waterZone.length} đỉnh)!`, 'success');
  }

  /* ==========================================================================
     20-SECOND SIMULATION REPLAY ANALYZER MODAL
     ========================================================================== */

  function openReplayById(id) {
    const vid = state.videos.find((v) => v.id === id) || state.videos[0] || DEFAULT_SIM_VIDEOS[0];
    state.replayItem = vid;
    state.replayOpen = true;
    state.replayPlaying = true;
    state.replayCurSec = 0;
    state.replayDuration = Number(vid?.duration || 20);
    state.replayFallSec = Number(vid?.fall_time_offset || 10);

    if ($('playerTitle')) $('playerTitle').textContent = vid?.station_name || 'Replay Mô Phỏng 20s';
    if ($('playerTimestamp')) $('playerTimestamp').textContent = vid?.created_at || '';
    if ($('btnPlayPause')) $('btnPlayPause').textContent = '⏸';
    $('videoPlayerModal')?.classList.remove('hidden');

    state.replayLastTick = performance.now();
    startReplayLoop();
  }

  function closeReplayModal() {
    state.replayOpen = false;
    $('videoPlayerModal')?.classList.add('hidden');
    if (state.replayRafId) {
      cancelAnimationFrame(state.replayRafId);
      state.replayRafId = null;
    }
  }

  function updateReplayScrubberUi() {
    const cur = state.replayCurSec;
    const dur = state.replayDuration;
    const fallSec = state.replayFallSec;
    const pct = Math.min(100, Math.max(0, (cur / dur) * 100));

    if ($('timelineProgress')) $('timelineProgress').style.width = `${pct}%`;
    if ($('timelineThumb')) $('timelineThumb').style.left = `${pct}%`;
    if ($('fallPinMarker')) $('fallPinMarker').style.left = `${(fallSec / dur) * 100}%`;
    if ($('playerTimeReadout')) $('playerTimeReadout').textContent = `${formatSec(cur)} / ${formatSec(dur)}`;

    const badge = $('playerPhaseBadge');
    const txt = $('playerPhaseText');
    const rel = cur - fallSec;
    if (badge && txt) {
      if (Math.abs(rel) <= 0.6) {
        badge.className = 'phase-pill impact';
        txt.textContent = '⚡ KHOẢNH KHẮC RƠI XUỐNG NƯỚC (T=0.0s)';
      } else if (rel < 0) {
        badge.className = 'phase-pill before';
        txt.textContent = `TRƯỚC SỰ CỐ (${rel.toFixed(1)}s)`;
      } else {
        badge.className = 'phase-pill after';
        txt.textContent = `SAU SỰ CỐ (+${rel.toFixed(1)}s)`;
      }
    }
  }

  function startReplayLoop() {
    if (state.replayRafId) cancelAnimationFrame(state.replayRafId);
    const canvas = $('simReplayCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = (now) => {
      if (!state.replayOpen) return;
      const dt = Math.min(0.1, (now - state.replayLastTick) / 1000);
      state.replayLastTick = now;

      if (state.replayPlaying && !state.scrubbing) {
        const rate = state.replayRates[state.replayRateIdx] || 1.0;
        state.replayCurSec += dt * rate;
        if (state.replayCurSec >= state.replayDuration) {
          state.replayCurSec = 0;
        }
      }

      const scene = state.replayItem?.station_id === 'cam-caulau-ha-du' ? 'caulau' : 'dbt';
      drawSimulatedRiverScene(ctx, canvas.width, canvas.height, {
        mode: 'replay',
        scene,
        replaySec: state.replayCurSec,
        timeSec: state.replayCurSec,
      });
      updateReplayScrubberUi();
      state.replayRafId = requestAnimationFrame(loop);
    };
    state.replayRafId = requestAnimationFrame(loop);
  }

  /* ==========================================================================
     EVENT BINDINGS & STARTUP
     ========================================================================== */

  function bindAllEvents() {
    // Sidebar Navigation
    $$('.nav-btn[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => switchPage(btn.dataset.page));
    });
    $('btnMenuMobile')?.addEventListener('click', () => {
      $('sidebar')?.classList.toggle('open');
      $('sidebarBackdrop')?.classList.toggle('hidden');
    });
    $('sidebarBackdrop')?.addEventListener('click', closeMobileSidebar);

    // Open CamIP Modal triggers
    $('btnSidebarOpenCamIp')?.addEventListener('click', () => {
      closeMobileSidebar();
      openCamIpModal(CAMIP_CAMERAS[0], 'live');
    });
    $('btnTopOpenCamIp')?.addEventListener('click', () => openCamIpModal(CAMIP_CAMERAS[0], 'live'));
    $('kpiCamIpTile')?.addEventListener('click', () => openCamIpModal(CAMIP_CAMERAS[0], 'live'));
    $('btnCloseCamIpModal')?.addEventListener('click', closeCamIpModal);

    // Emergency Alert Banner buttons
    $('btnEmgOpenCamIp')?.addEventListener('click', () => {
      openCamIpModal(CAMIP_CAMERAS[0], 'live');
    });
    $('btnDismissAlarm')?.addEventListener('click', stopEmergencySiren);

    // Mute toggle
    const syncMuteUi = () => {
      $('iconSoundOn')?.classList.toggle('hidden', state.muted);
      $('iconSoundOff')?.classList.toggle('hidden', !state.muted);
    };
    syncMuteUi();
    $('btnToggleMute')?.addEventListener('click', () => {
      state.muted = !state.muted;
      localStorage.setItem('camip_muted', state.muted ? '1' : '0');
      if (state.muted) stopEmergencySiren();
      syncMuteUi();
      showToast(state.muted ? '🔇 Đã tắt còi báo động' : '🔊 Đã bật còi báo động khẩn cấp');
    });

    // Refresh All
    $('btnRefreshAll')?.addEventListener('click', async () => {
      showToast('Đang đồng bộ số liệu Thủy văn & Cloud...', 'info');
      await Promise.all([loadHydrologyData(), loadForecastTrends(), loadCommunityReports(), refreshCamIpData()]);
      if (state.activePage === 'analytics') loadChart();
    });

    // Search stations
    const onStationSearch = (ev) => {
      state.stationSearchQuery = ev.target.value || '';
      renderStationGrids();
    };
    $('inpStationSearchOverview')?.addEventListener('input', onStationSearch);
    $('inpStationSearchFull')?.addEventListener('input', onStationSearch);

    // Community form
    $('formCommunityReport')?.addEventListener('submit', submitCommunityReport);
    $('btnRefreshComm')?.addEventListener('click', loadCommunityReports);

    // CamIP Modal sub-tabs
    $$('.cam-tab[data-camtab]').forEach((btn) => {
      btn.addEventListener('click', () => switchCamSubTab(btn.dataset.camtab));
    });

    // Live simulation quick actions
    $('btnCamAiAutoScan')?.addEventListener('click', autoDetectWaterZoneSim);
    $('btnCamGoZoneTab')?.addEventListener('click', () => switchCamSubTab('zone'));
    $('btnToggleZoneSvg')?.addEventListener('click', () => {
      state.showVectorOverlay = !state.showVectorOverlay;
      renderLiveZoneSvgOverlay();
    });
    $('btnCaptureSnapshot')?.addEventListener('click', () => {
      const c = $('simLiveCanvas');
      if (!c) return;
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = `camip_sim_${Date.now()}.png`;
      a.click();
      showToast('📸 Đã tải ảnh chụp Sa Bàn Mô Phỏng!', 'success');
    });
    $('btnFullscreenStream')?.addEventListener('click', () => {
      const box = $('camStreamStage');
      if (document.fullscreenElement) document.exitFullscreen();
      else box?.requestFullscreen?.();
    });
    $('btnTriggerTestFall')?.addEventListener('click', triggerFallSimulation);
    $('btnRefreshCamData')?.addEventListener('click', refreshCamIpData);

    // Video Vault filter & search
    $$('.v-chip[data-vfilter]').forEach((chip) => {
      chip.addEventListener('click', () => {
        state.videoFilter = chip.dataset.vfilter || 'all';
        $$('.v-chip[data-vfilter]').forEach((c) => c.classList.toggle('active', c === chip));
        renderCamFeedAndVault();
      });
    });
    $('inpSearchVideos')?.addEventListener('input', (ev) => {
      state.videoSearch = ev.target.value || '';
      renderCamFeedAndVault();
    });

    // Zone Studio buttons
    initZoneStudioEvents();
    $('btnStudioAiDetect')?.addEventListener('click', autoDetectWaterZoneSim);
    $('btnReloadZoneFrame')?.addEventListener('click', renderZoneEditorCanvas);
    $('btnZoneUndo')?.addEventListener('click', () => {
      state.zoneDraft.pop();
      renderZoneEditorCanvas();
    });
    $('btnZoneClear')?.addEventListener('click', () => {
      state.zoneDraft = [];
      renderZoneEditorCanvas();
    });
    $('btnSaveZone')?.addEventListener('click', saveWaterZoneSim);

    // Cloud Config Tab
    if ($('inpServerHost')) $('inpServerHost').value = state.apiUrl;
    $('selSimScene')?.addEventListener('change', (ev) => {
      state.simScene = ev.target.value || 'dbt';
      showToast('Đã chuyển bối cảnh bờ sông mô phỏng!');
    });
    $('btnQuickSimWalkWarn')?.addEventListener('click', () => {
      state.simWalkWarnUntilMs = performance.now() + 7000;
      updateThreatBadges('WARNING');
      switchCamSubTab('live');
      setTimeout(() => {
        if (state.simFallStartMs === 0) updateThreatBadges('SAFE');
      }, 7100);
    });
    $('btnQuickSimFallNow')?.addEventListener('click', () => {
      switchCamSubTab('live');
      triggerFallSimulation();
    });
    $('btnTestSiren')?.addEventListener('click', () => {
      state.muted = false;
      syncMuteUi();
      playEmergencySiren();
      setTimeout(stopEmergencySiren, 2200);
    });
    $('btnEnablePush')?.addEventListener('click', async () => {
      if ('Notification' in window) {
        const p = await Notification.requestPermission();
        showToast(p === 'granted' ? 'Đã bật thông báo trình duyệt!' : 'Trình duyệt chưa cấp quyền thông báo');
      }
    });
    $('formServerHost')?.addEventListener('submit', (ev) => {
      ev.preventDefault();
      state.apiUrl = ($('inpServerHost')?.value || '').trim();
      localStorage.setItem('camip_cloud_api_url', state.apiUrl);
      connectCloudWebSocket();
      loadHydrologyData();
      refreshCamIpData();
      showToast('Đã lưu địa chỉ kết nối Render Cloud!', 'success');
    });
    $('btnResetServerHost')?.addEventListener('click', () => {
      localStorage.removeItem('camip_cloud_api_url');
      state.apiUrl = getDefaultApiUrl();
      if ($('inpServerHost')) $('inpServerHost').value = state.apiUrl;
      connectCloudWebSocket();
      refreshCamIpData();
      showToast('Đã khôi phục cấu hình mặc định từ config.js');
    });

    // 20s Replay Player controls
    $('btnClosePlayer')?.addEventListener('click', closeReplayModal);
    $('btnPlayPause')?.addEventListener('click', () => {
      state.replayPlaying = !state.replayPlaying;
      if ($('btnPlayPause')) $('btnPlayPause').textContent = state.replayPlaying ? '⏸' : '▶';
    });
    $('btnSeekStart')?.addEventListener('click', () => {
      state.replayCurSec = 0;
      updateReplayScrubberUi();
    });
    $('btnStepBack')?.addEventListener('click', () => {
      state.replayCurSec = Math.max(0, state.replayCurSec - 1);
      updateReplayScrubberUi();
    });
    $('btnStepFwd')?.addEventListener('click', () => {
      state.replayCurSec = Math.min(state.replayDuration, state.replayCurSec + 1);
      updateReplayScrubberUi();
    });
    $('btnJumpFall')?.addEventListener('click', () => {
      state.replayCurSec = Math.max(0, state.replayFallSec - 0.5);
      state.replayPlaying = true;
      if ($('btnPlayPause')) $('btnPlayPause').textContent = '⏸';
      updateReplayScrubberUi();
    });
    $('btnPlaybackSpeed')?.addEventListener('click', () => {
      state.replayRateIdx = (state.replayRateIdx + 1) % state.replayRates.length;
      if ($('btnPlaybackSpeed')) $('btnPlaybackSpeed').textContent = `${state.replayRates[state.replayRateIdx].toFixed(1)}x`;
    });
    $('btnDownloadSnapshotReplay')?.addEventListener('click', () => {
      const c = $('simReplayCanvas');
      if (!c) return;
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = `replay_20s_${state.replayCurSec.toFixed(1)}s.png`;
      a.click();
    });

    const scrubber = $('timelineScrubber');
    const seekFromPointer = (ev) => {
      if (!scrubber) return;
      const rect = scrubber.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      state.replayCurSec = ratio * state.replayDuration;
      updateReplayScrubberUi();
    };
    scrubber?.addEventListener('pointerdown', (ev) => {
      state.scrubbing = true;
      seekFromPointer(ev);
    });
    window.addEventListener('pointermove', (ev) => {
      if (state.scrubbing) seekFromPointer(ev);
    });
    window.addEventListener('pointerup', () => {
      state.scrubbing = false;
    });

    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        if (state.replayOpen) closeReplayModal();
        else if (state.camModalOpen) closeCamIpModal();
      }
    });
  }

  async function bootstrap() {
    startSystemClock();
    bindAllEvents();
    initFloodMap();
    initChartSelector();
    connectCloudWebSocket();

    await Promise.all([loadHydrologyData(), loadForecastTrends(), loadCommunityReports(), refreshCamIpData()]);

    // Auto-refresh hydrology every 60s
    setInterval(() => {
      loadHydrologyData();
      loadForecastTrends();
    }, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();

