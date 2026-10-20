function getRouteData(route) {
    const dbRoutes = (typeof window !== 'undefined' && window.SCHEDULE_DATABASE) ? window.SCHEDULE_DATABASE.routes : null;
    if (!dbRoutes || !route) return null;
    const rStr = String(route).trim();
    if (dbRoutes[rStr]) return dbRoutes[rStr];
    for (const [k, rData] of Object.entries(dbRoutes)) {
        if (!rData) continue;
        if (String(rData.display_number || '').trim() === rStr || String(rData.native_number || '').trim() === rStr) {
            return rData;
        }
        if (rData.main_scheme && String(rData.main_scheme.custom_route || '').trim() === rStr) {
            return rData;
        }
        for (let i = 1; i <= 5; i++) {
            const sch = rData[`additional_scheme_${i}`] || (i === 1 ? rData.additional_scheme : null);
            if (sch && String(sch.custom_route || '').trim() === rStr) {
                return {
                    display_number: rStr,
                    native_number: rData.native_number || k,
                    transport_type: rData.transport_type || 'трамвай',
                    main_scheme: sch,
                    main_endpoints: sch.endpoints
                };
            }
        }
    }
    return null;
}

function getRouteTransportType(r) {
    if (!r) return 'трамвай';
    const rData = getRouteData(r);
    const tType = rData?.transport_type?.toLowerCase();
    if (tType && ['трамвай', 'электробус', 'автобус'].includes(tType)) return tType;

    // Check base digits (e.g. '1к' -> '1', '15к' -> '15', '4а' -> '4')
    const digits = String(r).replace(/[^0-9]/g, '');
    if (digits) {
        const baseData = getRouteData(digits);
        const baseType = baseData?.transport_type?.toLowerCase();
        if (baseType && ['трамвай', 'электробус', 'автобус'].includes(baseType)) return baseType;
        if (['1', '2', '15'].includes(digits)) return 'трамвай';
        if (['4', '5'].includes(digits)) return 'электробус';
    }
    if (['1', '2', '15'].includes(String(r))) return 'трамвай';
    if (['4', '5'].includes(String(r))) return 'электробус';
    return 'трамвай';
}

/* ======================================================================
   app.js — Трамвайное расписание Липецка
   ====================================================================== */

// ─── App Configuration & URLs ───────────────────────────────────────────
const APP_VERSION = 'X1.6';
window.APP_VERSION = APP_VERSION;
if (typeof globalThis !== 'undefined') globalThis.APP_VERSION = APP_VERSION;
const YANDEX_BASE_URL = 'https://storage.yandexcloud.net/liptramschedule';
const GITHUB_BASE_URL = 'https://feduchella.github.io/TramSchedule';

const SCHEDULE_URL = `${YANDEX_BASE_URL}/schedule.js`;
const GITHUB_SCHEDULE_URL = `${YANDEX_BASE_URL}/schedule.js`;

async function fetchFromCloud(fileName) {
    if (typeof window !== 'undefined' && window.SANDBOX_MODE) {
        if (fileName === 'schedule.js') {
            try {
                const resp = await fetch(`/schedule.js?t=${Date.now()}`, { cache: 'no-store' });
                if (resp && resp.ok) return resp;
            } catch(e) {}
        }
        return null;
    }
    try {
        const resp = await fetch(`${YANDEX_BASE_URL}/${fileName}?t=${Date.now()}`, { cache: 'no-store' });
        if (resp && resp.ok) return resp;
    } catch(e) {}
    try {
        const resp = await fetch(`${GITHUB_BASE_URL}/${fileName}?t=${Date.now()}`, { cache: 'no-store' });
        if (resp && resp.ok) return resp;
    } catch(e) {}
    return null;
}

function isRouteAllowedForCurrentVersion(route) {
    if (!route) return false;
    const rData = getRouteData(route);
    if (!rData) return true;
    let allowed = rData.app_versions || rData.versions || rData.allowed_versions;
    if (!allowed) return true;

    if (typeof allowed === 'string') {
        allowed = allowed.split(';').map(s => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(allowed) || allowed.length === 0) return true;

    const curVer = (typeof window !== 'undefined' && window.APP_VERSION) ? String(window.APP_VERSION).trim() : 'X1.6';
    const curNorm = curVer.toLowerCase();
    const curNum = curNorm.replace(/^[vx]/i, '');

    // Check platform tags if any: apk, vk, web
    const isApk = typeof window !== 'undefined' && (!!window.AndroidInsets || !!window.AndroidBridge);
    const isVk = typeof window !== 'undefined' && (!!window.vkBridge || (typeof location !== 'undefined' && location.search.includes('vk_')));
    const isWeb = !isApk && !isVk;

    return allowed.some(item => {
        const t = String(item).trim().toLowerCase();
        if (!t) return false;
        if (t === curNorm) return true;
        if (curNum && t.replace(/^[vx]/i, '') === curNum) return true;
        if (t === 'apk' && isApk) return true;
        if (t === 'vk' && isVk) return true;
        if (t === 'web' && isWeb) return true;
        return false;
    });
}

// ─── Dynamic Routing & Direction Helpers ───────────────────────────────
function getRoutesAtStop(stop, direction) {
    if (!scheduleData || !scheduleData[stop]) return [];
    const data = scheduleData[stop]?.[direction];
    if (!data) return [];
    const routes = new Set();
    for (const day of Object.values(data))
        for (const hour of Object.values(day))
            for (const dep of hour) {
                if (isRouteAllowedForCurrentVersion(dep.route)) {
                    routes.add(dep.route);
                }
            }
    return Array.from(routes).sort((a, b) => parseInt(a) - parseInt(b));
}

function getRouteDestination(route, dir, stop) {
    const dbRoutes = (typeof window !== 'undefined' && window.SCHEDULE_DATABASE) ? window.SCHEDULE_DATABASE.routes : null;
    if (dbRoutes && dbRoutes[route]?.main_scheme) {
        const ms = dbRoutes[route].main_scheme;
        if (dir === 'в центр') {
            const dest = ms.first_stop || (ms.reverse_stops && ms.reverse_stops[ms.reverse_stops.length - 1]);
            if (dest) return dest;
        } else {
            const dest = ms.last_stop || (ms.direct_stops && ms.direct_stops[ms.direct_stops.length - 1]);
            if (dest) return dest;
        }
    }
    if (ROUTE_INFO[route]?.destinations?.[dir]) {
        return ROUTE_INFO[route].destinations[dir];
    }
    return dir === 'в центр' ? 'Центр' : 'Конечная';
}

function formatEndpointsWithQuotes(ep) {
    if (!ep) return '';
    if (ep.includes('«')) return ep;
    if (ep.includes(' — ')) {
        return ep.split(' — ').map(s => `«${s.trim()}»`).join(' — ');
    }
    if (ep.includes(' - ')) {
        return ep.split(' - ').map(s => `«${s.trim()}»`).join(' — ');
    }
    return `«${ep}»`;
}

function getRoutePath(route, dir, stop) {
    const rData = getRouteData(route);
    if (rData) {
        const ms = rData.main_scheme;
        if (ms) {
            const first = ms.first_stop || (ms.direct_stops && ms.direct_stops[0]);
            const last = ms.last_stop || (ms.direct_stops && ms.direct_stops[ms.direct_stops.length - 1]);
            if (first && last) {
                if (dir === 'в центр') {
                    return `«${last}» — «${first}»`;
                } else {
                    return `«${first}» — «${last}»`;
                }
            } else if (ms.endpoints) {
                return formatEndpointsWithQuotes(ms.endpoints);
            }
        }
        if (rData.main_endpoints) {
            return formatEndpointsWithQuotes(rData.main_endpoints);
        }
    }
    const info = ROUTE_INFO[route];
    return info ? (info[dir] || info['от центра'] || '') : '';
}

function formatStopWithOst(name) {
    if (!name) return '';
    const clean = name.replace(/[«»"]/g, '').trim();
    return `ост. «${clean}»`;
}

function formatRoutesByType(routes) {
    const tram = [];
    const electro = [];
    const bus = [];
    const other = [];

    for (const r of routes) {
        const tType = getRouteTransportType(r);
        if (tType === 'трамвай') {
            tram.push(r);
        } else if (tType === 'электробус') {
            electro.push(r);
        } else if (tType === 'автобус') {
            bus.push(r);
        } else {
            other.push(r);
        }
    }
    const parts = [];
    if (tram.length > 0) parts.push(`Трамвайные: ${tram.join(', ')}`);
    if (electro.length > 0) parts.push(`Электробусные: ${electro.join(', ')}`);
    if (bus.length > 0) parts.push(`Автобусные: ${bus.join(', ')}`);
    if (other.length > 0) parts.push(`Маршруты: ${other.join(', ')}`);
    return parts.length > 0 ? parts.join('<br>') : `Маршруты: ${routes.join(', ')}`;
}

function getNextStopsForStopDir(stop, dir) {
    const routes = getRoutesAtStop(stop, dir);
    const nextStops = [];
    const dbRoutes = (typeof window !== 'undefined' && window.SCHEDULE_DATABASE) ? window.SCHEDULE_DATABASE.routes : null;

    for (const r of routes) {
        let found = false;
        if (dbRoutes && dbRoutes[r]) {
            const ms = dbRoutes[r].main_scheme;
            const seq = (dir === 'в центр') ? ms?.reverse_stops : ms?.direct_stops;
            if (seq && Array.isArray(seq)) {
                const idx = seq.indexOf(stop);
                if (idx !== -1 && idx + 1 < seq.length) {
                    const nextS = seq[idx + 1];
                    if (nextS && !nextStops.includes(nextS)) {
                        nextStops.push(nextS);
                        found = true;
                    }
                }
            }
        }
        if (!found) {
            const nextMap = _networkTransitions[r]?.[dir]?.[stop];
            if (nextMap && nextMap.size > 0) {
                for (const [nextStop] of Array.from(nextMap.entries()).sort((a, b) => b[1] - a[1])) {
                    if (nextStop && nextStop !== stop && !nextStops.includes(nextStop)) {
                        nextStops.push(nextStop);
                    }
                }
            }
        }
    }
    return nextStops;
}

function getActiveDirectionsForStop(stop) {
    if (!scheduleData || !scheduleData[stop]) return [];
    const dirs = Object.keys(scheduleData[stop]);
    return dirs.filter(d => {
        const days = scheduleData[stop][d];
        if (!days) return false;
        let count = 0;
        for (const dt of Object.keys(days)) {
            const hours = days[dt];
            if (!hours) continue;
            for (const h of Object.keys(hours)) {
                if (Array.isArray(hours[h]) && hours[h].length > 0) {
                    count += hours[h].length;
                }
            }
        }
        return count > 0;
    });
}

function getDirectionLabel(stop, dir) {
    const nextStops = getNextStopsForStopDir(stop, dir);
    if (nextStops.length > 0) {
        return `через ${nextStops.map(s => formatStopWithOst(s)).join(', ')}`;
    }
    const routes = getRoutesAtStop(stop, dir);
    const dest = routes.length > 0 ? getRouteDestination(routes[0], dir, stop) : null;
    return dest && dest !== stop ? `В сторону ${formatStopWithOst(dest)}` : (dir === 'в центр' ? 'В центр' : 'От центра');
}

// ─── Constants & Globals ───────────────────────────────────────────────
const safeStorage = {
    get: function(key) {
        try { return localStorage.getItem(key); } catch(e) { return null; }
    },
    set: function(key, value) {
        try { localStorage.setItem(key, value); } catch(e) {}
    }
};

let scheduleData = null;
let currentView = 'stops';
let selectedStop = '';
let selectedDirection = '';
let selectedDayType = '';
let selectedRoutesFilter = new Set();
let clockInterval = null;

// Modal state
let modalVisible = false;
let modalRoute = '';
let modalRun = '';
let modalMinute = '';

// Run schedule state
let runRoute = '';
let runRunNum = '';

// ─── OTA Updater ─────────────────────────────────────────────────────────

const dbPromise = new Promise((resolve, reject) => {
    try {
        if (typeof indexedDB === 'undefined') {
            resolve(null);
            return;
        }
        const req = indexedDB.open('TramScheduleDB', 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore('schedule');
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
});

async function saveScheduleToIDB(text) {
    try {
        const db = await dbPromise;
        if (!db) return;
        return new Promise((resolve) => {
            const tx = db.transaction('schedule', 'readwrite');
            tx.objectStore('schedule').put(text, 'latest_schedule');
            tx.oncomplete = resolve;
        });
    } catch(e) {}
}

async function getScheduleFromIDB() {
    try {
        const db = await dbPromise;
        if (!db) return null;
        return new Promise((resolve) => {
            const tx = db.transaction('schedule', 'readonly');
            const req = tx.objectStore('schedule').get('latest_schedule');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    } catch(e) { return null; }
}

async function saveSchemeToIDB(theme, blob) {
    try {
        const db = await dbPromise;
        if (!db) return;
        return new Promise((resolve) => {
            const tx = db.transaction('schedule', 'readwrite');
            tx.objectStore('schedule').put(blob, 'scheme_blob_' + theme);
            tx.oncomplete = resolve;
        });
    } catch(e) {}
}

async function getSchemeFromIDB(theme) {
    try {
        const db = await dbPromise;
        if (!db) return null;
        return new Promise((resolve) => {
            const tx = db.transaction('schedule', 'readonly');
            const req = tx.objectStore('schedule').get('scheme_blob_' + theme);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch(e) { return null; }
}

function parseScheduleText(text) {
    if (!text) return null;
    // 1. Try Function sandbox execution
    try {
        const fakeWindow = { APP_VERSION: APP_VERSION };
        const fn = new Function('window', text + '\n; return { data: window.SCHEDULE_DATA || (typeof SCHEDULE_DATA !== "undefined" ? SCHEDULE_DATA : null), version: window.SCHEDULE_VERSION || (typeof SCHEDULE_VERSION !== "undefined" ? SCHEDULE_VERSION : null), database: window.SCHEDULE_DATABASE || (typeof SCHEDULE_DATABASE !== "undefined" ? SCHEDULE_DATABASE : null) };');
        const res = fn(fakeWindow);
        if (res && res.data && typeof res.data === 'object' && Object.keys(res.data).length > 0) {
            if (res.database && typeof window !== 'undefined') {
                window.SCHEDULE_DATABASE = res.database;
            }
            return {
                version: res.version || 'импорт',
                data: res.data,
                database: res.database || null
            };
        }
    } catch(e) {}

    // 2. Try parsing as raw JSON
    try {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            const parsedJson = JSON.parse(trimmed);
            if (parsedJson.data && typeof parsedJson.data === 'object') {
                if (parsedJson.database && typeof window !== 'undefined') {
                    window.SCHEDULE_DATABASE = parsedJson.database;
                }
                return {
                    version: parsedJson.version || 'импорт',
                    data: parsedJson.data,
                    database: parsedJson.database || null
                };
            } else if (parsedJson.SCHEDULE_DATA) {
                if (parsedJson.SCHEDULE_DATABASE && typeof window !== 'undefined') {
                    window.SCHEDULE_DATABASE = parsedJson.SCHEDULE_DATABASE;
                }
                return {
                    version: parsedJson.SCHEDULE_VERSION || 'импорт',
                    data: parsedJson.SCHEDULE_DATA,
                    database: parsedJson.SCHEDULE_DATABASE || null
                };
            } else if (Object.keys(parsedJson).length > 0) {
                return {
                    version: 'ручная загрузка',
                    data: parsedJson
                };
            }
        }
    } catch(e) {}

    // 3. Fallback regex
    try {
        const versionMatch = text.match(/SCHEDULE_VERSION\s*=\s*["']([^"']+)["']/);
        const dataMatch = text.match(/SCHEDULE_DATA\s*=\s*({[\s\S]*});?/);
        if (versionMatch && dataMatch) {
            return {
                version: versionMatch[1],
                data: JSON.parse(dataMatch[1])
            };
        }
    } catch(e) {}

    return null;
}

async function checkForUpdates() {
    if (typeof window !== 'undefined' && window.SANDBOX_MODE) return;
    try {
        if (!navigator.onLine) return;
        const resp = await fetchFromCloud('schedule.js');
        if (!resp) return;
        const text = await resp.text();
        const parsed = parseScheduleText(text);
        if (!parsed) return;
        
        // Update if the fetched version is different from the currently running version
        if (parsed.version !== window.SCHEDULE_VERSION) {
            if (safeStorage.get('tram-declined-version') === parsed.version) {
                document.getElementById('update-banner').style.display = 'block';
                return;
            }

            document.getElementById('update-modal-backdrop').style.display = 'flex';
            
            document.getElementById('btn-update-yes').onclick = async () => {
                document.getElementById('update-modal-backdrop').style.display = 'none';
                document.getElementById('update-banner').style.display = 'none';
                await saveScheduleToIDB(text);
                
                window.SCHEDULE_VERSION = parsed.version;
                window.SCHEDULE_DATA = parsed.data;
                window.SCHEDULE_SOURCE = 'обновленное';
        safeStorage.set('tram-schedule-version', parsed.version);
                
                const toast = document.getElementById('update-toast');
                toast.style.display = 'block';
                setTimeout(() => { toast.style.display = 'none'; }, 3000);
                
                scheduleData = normalizeSchedule(window.SCHEDULE_DATA);
                buildShortenedCache(scheduleData);
                render();
            };
            
            document.getElementById('btn-update-no').onclick = () => {
                document.getElementById('update-modal-backdrop').style.display = 'none';
                safeStorage.set('tram-declined-version', parsed.version);
                document.getElementById('update-banner').style.display = 'block';
            };
        } else {
            // If up to date, hide any banner
            document.getElementById('update-banner').style.display = 'none';
            safeStorage.set('tram-declined-version', '');
        }
    } catch(e) { console.error('OTA Update Error', e); }
}

// ─── Theme ─────────────────────────────────────────────────────────────
function updateThemeColor(theme) {
    if (window.AndroidInsets && window.AndroidInsets.setAppTheme) {
        try {
            window.AndroidInsets.setAppTheme(theme);
        } catch (e) {}
    }
}
function getTheme() {
    const saved = safeStorage.get('tram-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.AndroidInsets && window.AndroidInsets.isNightMode) {
        try {
            return window.AndroidInsets.isNightMode() ? 'dark' : 'light';
        } catch (e) {}
    }
    return document.documentElement.getAttribute('data-theme') || 'light';
}
function setTheme(theme) {
    safeStorage.set('tram-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeColor(theme);
    if (typeof schemeModalVisible !== 'undefined' && schemeModalVisible) {
        requestSchemeRender();
    }
}
function toggleTheme() {
    setTheme(getTheme() === 'light' ? 'dark' : 'light');
    render();
}
function themeIcon() {
    return getTheme() === 'light' ? '🌙' : '☀️';
}

// ─── Data normalization ────────────────────────────────────────────────
function normalizeSchedule(raw) {
    const result = {};
    for (const [rawStop, directions] of Object.entries(raw)) {
        const stopName = rawStop.trim();
        for (const [dir, days] of Object.entries(directions)) {
            for (const [day, hours] of Object.entries(days)) {
                for (const [hour, deps] of Object.entries(hours)) {
                    for (const dep of deps) {
                        if (!isRouteAllowedForCurrentVersion(dep.route)) continue;
                        if (!result[stopName]) result[stopName] = {};
                        if (!result[stopName][dir]) result[stopName][dir] = {};
                        if (!result[stopName][dir][day]) result[stopName][dir][day] = {};
                        if (!result[stopName][dir][day][hour]) result[stopName][dir][day][hour] = [];
                        const exists = result[stopName][dir][day][hour].some(
                            d => d.minute === dep.minute && d.route === dep.route && d.run === dep.run
                        );
                        if (!exists) result[stopName][dir][day][hour].push(dep);
                    }
                }
            }
        }
    }
    for (const stop of Object.values(result))
        for (const dir of Object.values(stop))
            for (const day of Object.values(dir))
                for (const hour of Object.keys(day))
                    day[hour].sort((a, b) => parseInt(a.minute) - parseInt(b.minute));
    return result;
}

/// ─── Dynamic Transit Network Topology & Routing ───────────────────────
let ROUTE_INFO = {}; // route -> { name, destinations: { [dir]: string }, endpoints: { [dir]: string } }
let _shortenedCache = {}; // `${stop}|${dir}|${dayType}|${hour}|${minute}|${route}|${run}` => destination
let _networkTransitions = {}; // route -> dir -> fromStop -> Map(toStop -> count)
let _prevTransitions = {}; // route -> dir -> toStop -> Map(fromStop -> count)
let _tripTransitions = {}; // route -> dir -> fromStop -> Map(toStop -> count)

function analyzeTransitNetwork(data) {
    ROUTE_INFO = {};
    _shortenedCache = {};
    _networkTransitions = {};
    _prevTransitions = {};
    _tripTransitions = {};

    if (!data || typeof data !== 'object') return;

    // 1. Group all departures chronologically by vehicle run: route|run|dayType
    const runs = {};
    const allRoutes = new Set();

    for (const [stop, dirs] of Object.entries(data)) {
        for (const [dir, days] of Object.entries(dirs)) {
            for (const [dayType, hours] of Object.entries(days)) {
                for (const [hour, deps] of Object.entries(hours)) {
                    for (const dep of deps) {
                        if (!isRouteAllowedForCurrentVersion(dep.route)) continue;
                        allRoutes.add(dep.route);
                        const key = `${dep.route}|${dep.run}|${dayType}`;
                        if (!runs[key]) runs[key] = [];
                        runs[key].push({
                            stop, dir, dayType,
                            hour: parseInt(hour), minute: dep.minute,
                            totalMin: parseInt(hour) * 60 + parseInt(dep.minute),
                            route: dep.route, run: dep.run
                        });
                    }
                }
            }
        }
    }

    // 2. Break runs into chronological trips / legs
    const allLegs = [];
    for (const [key, deps] of Object.entries(runs)) {
        deps.sort((a, b) => a.totalMin - b.totalMin);
        let curLeg = [];
        for (let i = 0; i < deps.length; i++) {
            const dep = deps[i];
            if (curLeg.length === 0) {
                curLeg.push(dep);
            } else {
                const last = curLeg[curLeg.length - 1];
                if (dep.dir !== last.dir || (dep.totalMin - last.totalMin > 45)) {
                    allLegs.push(curLeg);
                    curLeg = [dep];
                } else {
                    curLeg.push(dep);
                }
            }
        }
        if (curLeg.length > 0) allLegs.push(curLeg);
    }

    // 3. Build stop transition graph (forward and backward)
    for (let l = 0; l < allLegs.length; l++) {
        const leg = allLegs[l];
        const route = leg[0].route;
        const dir = leg[0].dir;

        for (let i = 0; i < leg.length - 1; i++) {
            const cur = leg[i].stop;
            const nxt = leg[i + 1].stop;
            if (cur === nxt) continue;
            _addTransition(route, dir, cur, nxt);
        }

        // Cross-leg transition (penultimate stop of trip to next starting stop)
        // Stored in _tripTransitions so trip destinations are discovered without polluting in-leg "через ост." labels
        if (l + 1 < allLegs.length) {
            const nextLeg = allLegs[l + 1];
            const last = leg[leg.length - 1];
            const nextStart = nextLeg[0];
            if (last.run === nextStart.run && (nextStart.totalMin - last.totalMin <= 60) && last.stop !== nextStart.stop) {
                if (!_tripTransitions[route]) _tripTransitions[route] = {};
                if (!_tripTransitions[route][dir]) _tripTransitions[route][dir] = {};
                if (!_tripTransitions[route][dir][last.stop]) _tripTransitions[route][dir][last.stop] = new Map();
                _tripTransitions[route][dir][last.stop].set(nextStart.stop, (_tripTransitions[route][dir][last.stop].get(nextStart.stop) || 0) + 1);
            }
        }
    }

    function _addTransition(route, dir, from, to) {
        if (!_networkTransitions[route]) _networkTransitions[route] = {};
        if (!_networkTransitions[route][dir]) _networkTransitions[route][dir] = {};
        if (!_networkTransitions[route][dir][from]) _networkTransitions[route][dir][from] = new Map();
        _networkTransitions[route][dir][from].set(to, (_networkTransitions[route][dir][from].get(to) || 0) + 1);

        if (!_prevTransitions[route]) _prevTransitions[route] = {};
        if (!_prevTransitions[route][dir]) _prevTransitions[route][dir] = {};
        if (!_prevTransitions[route][dir][to]) _prevTransitions[route][dir][to] = new Map();
        _prevTransitions[route][dir][to].set(from, (_prevTransitions[route][dir][to].get(from) || 0) + 1);
    }

    function _getLegDest(l) {
        const leg = allLegs[l];
        const route = leg[0].route;
        const dir = leg[0].dir;
        const lastDep = leg[leg.length - 1];
        if (l + 1 < allLegs.length) {
            const nextLeg = allLegs[l + 1];
            const nextStart = nextLeg[0];
            if (lastDep.route === nextStart.route && lastDep.run === nextStart.run && lastDep.dayType === nextStart.dayType &&
                (nextStart.totalMin - lastDep.totalMin <= 15) && leg.length > 2 && nextLeg.length > 2) {
                // If nextStart was NOT in the current leg, the vehicle is arriving at nextStart as its terminus (e.g. Октябрьский рынок -> Улица Катукова, or Стадион -> мкр. Елецкий)
                if (!leg.some(d => d.stop === nextStart.stop)) {
                    return nextStart.stop;
                }
                return lastDep.stop;
            }
        }
        const nextMap = _tripTransitions[route]?.[dir]?.[lastDep.stop] || _networkTransitions[route]?.[dir]?.[lastDep.stop];
        let legDest = lastDep.stop;
        if (nextMap && nextMap.size > 0) {
            legDest = Array.from(nextMap.entries()).sort((a, b) => b[1] - a[1])[0][0];
        }
        return legDest;
    }

    // 4. Automatically compute route endpoints and destinations for each direction
    const routeDirLegs = {};
    for (let l = 0; l < allLegs.length; l++) {
        const leg = allLegs[l];
        const r = leg[0].route;
        const d = leg[0].dir;
        if (!routeDirLegs[r]) routeDirLegs[r] = {};
        if (!routeDirLegs[r][d]) routeDirLegs[r][d] = [];
        routeDirLegs[r][d].push(l);
    }

    for (const [route, dirs] of Object.entries(routeDirLegs)) {
        ROUTE_INFO[route] = { name: route, endpoints: {}, destinations: {} };
        for (const [dir, legIndices] of Object.entries(dirs)) {
            const destCounts = {};

            for (const l of legIndices) {
                const finalStop = _getLegDest(l);
                destCounts[finalStop] = (destCounts[finalStop] || 0) + 1;
            }

            const topDest = Object.entries(destCounts).sort((a, b) => b[1] - a[1])[0][0];
            ROUTE_INFO[route].destinations[dir] = topDest;
        }

        const dOut = ROUTE_INFO[route].destinations['от центра'];
        const dIn = ROUTE_INFO[route].destinations['в центр'];
        if (dOut && dIn) {
            ROUTE_INFO[route].endpoints['от центра'] = `«${dIn}» — «${dOut}»`;
            ROUTE_INFO[route]['от центра'] = `«${dIn}» — «${dOut}»`;
            ROUTE_INFO[route].endpoints['в центр'] = `«${dOut}» — «${dIn}»`;
            ROUTE_INFO[route]['в центр'] = `«${dOut}» — «${dIn}»`;
        } else {
            for (const [dir, d] of Object.entries(ROUTE_INFO[route].destinations)) {
                ROUTE_INFO[route].endpoints[dir] = `«${d}»`;
                ROUTE_INFO[route][dir] = `«${d}»`;
            }
        }

        // Override endpoints with database main_scheme if configured
        const dbRoutes = (typeof window !== 'undefined' && window.SCHEDULE_DATABASE) ? window.SCHEDULE_DATABASE.routes : null;
        if (dbRoutes && dbRoutes[route]?.main_scheme) {
            const ms = dbRoutes[route].main_scheme;
            const first = ms.first_stop || (ms.direct_stops && ms.direct_stops[0]);
            const last = ms.last_stop || (ms.direct_stops && ms.direct_stops[ms.direct_stops.length - 1]);
            if (first && last) {
                ROUTE_INFO[route].destinations['от центра'] = last;
                ROUTE_INFO[route].destinations['в центр'] = first;
                ROUTE_INFO[route].endpoints['от центра'] = `«${first}» — «${last}»`;
                ROUTE_INFO[route].endpoints['в центр'] = `«${last}» — «${first}»`;
                ROUTE_INFO[route]['от центра'] = `«${first}» — «${last}»`;
                ROUTE_INFO[route]['в центр'] = `«${last}» — «${first}»`;
            }
        }
    }

    // 5. Match trips strictly to additional schemes (additional_scheme_1, additional_scheme_2)
    const dbRoutes = (typeof window !== 'undefined' && window.SCHEDULE_DATABASE) ? window.SCHEDULE_DATABASE.routes : null;

    for (let l = 0; l < allLegs.length; l++) {
        const leg = allLegs[l];
        const route = leg[0].route;
        const dir = leg[0].dir;
        const rData = dbRoutes ? dbRoutes[route] : null;
        if (!rData) continue;

        const ms = rData.main_scheme;
        const msTerm = (dir === 'в центр')
            ? (ms?.first_stop || (ms?.reverse_stops && ms?.reverse_stops[ms?.reverse_stops.length - 1]) || (ms?.direct_stops && ms?.direct_stops[0]))
            : (ms?.last_stop || (ms?.direct_stops && ms?.direct_stops[ms?.direct_stops.length - 1]));
        const msOrigin = (dir === 'в центр')
            ? (ms?.last_stop || (ms?.reverse_stops && ms?.reverse_stops[0]) || (ms?.direct_stops && ms?.direct_stops[ms?.direct_stops.length - 1]))
            : (ms?.first_stop || (ms?.direct_stops && ms?.direct_stops[0]));

        let legDest = _getLegDest(l);
        if (l + 1 < allLegs.length) {
            const nextLeg = allLegs[l + 1];
            const lastDep = leg[leg.length - 1];
            const nextStart = nextLeg[0];
            if (lastDep.route === nextStart.route && lastDep.run === nextStart.run && lastDep.dayType === nextStart.dayType &&
                (nextStart.totalMin - lastDep.totalMin <= 3) && (leg.length <= 2 || nextLeg.length <= 2)) {
                legDest = _getLegDest(l + 1);
            }
        }

        const legStart = leg[0].stop;
        const legEnd = leg[leg.length - 1].stop;

        // Check all additional schemes (up to 5 schemes)
        const schemesToCheck = [];
        for (let i = 1; i <= 5; i++) {
            const sch = rData[`additional_scheme_${i}`] || (i === 1 ? rData.additional_scheme : null);
            if (sch && (sch.custom_route || (sch.direct_stops && sch.direct_stops.length) || sch.endpoints)) {
                schemesToCheck.push({ key: `additional_scheme_${i}`, data: sch });
            }
        }
        if (rData.additional_schemes && Array.isArray(rData.additional_schemes)) {
            for (let i = 0; i < rData.additional_schemes.length; i++) {
                const sch = rData.additional_schemes[i];
                if (sch && !schemesToCheck.some(s => s.data === sch)) {
                    schemesToCheck.push({ key: `additional_scheme_${i+1}`, data: sch });
                }
            }
        }

        let matched = null;
        for (const item of schemesToCheck) {
            const sch = item.data;
            if (!sch) continue;
            const schFirst = sch.first_stop || (sch.direct_stops && sch.direct_stops[0]);
            const schLast = sch.last_stop || (sch.direct_stops && sch.direct_stops[sch.direct_stops.length - 1]);
            const schTerm = (dir === 'в центр')
                ? (schFirst || (sch.reverse_stops && sch.reverse_stops[sch.reverse_stops.length - 1]))
                : (schLast || (sch.direct_stops && sch.direct_stops[sch.direct_stops.length - 1]));
            const schOrigin = (dir === 'в центр')
                ? (schLast || (sch.reverse_stops && sch.reverse_stops[0]))
                : (schFirst || (sch.direct_stops && sch.direct_stops[0]));

            if (!schTerm && !schOrigin) continue;

            let isMatch = false;
            // 1. Destination matches additional scheme terminus and is different from main scheme
            if (schTerm && (legDest === schTerm || legEnd === schTerm) && schTerm !== msTerm) {
                isMatch = true;
            }
            // 2. Starting stop matches additional scheme origin and is different from main scheme
            else if (schOrigin && legStart === schOrigin && schOrigin !== msOrigin) {
                isMatch = true;
            }
            // 3. Explicit stop list subset match
            else {
                const schStops = (dir === 'в центр') ? sch.reverse_stops : sch.direct_stops;
                if (schStops && schStops.length > 1) {
                    const legStopNames = leg.map(d => d.stop);
                    const allInSch = legStopNames.every(s => schStops.includes(s));
                    const msCount = dir === 'в центр' ? (ms?.reverse_stops?.length || 999) : (ms?.direct_stops?.length || 999);
                    if (allInSch && schStops.length < msCount) {
                        isMatch = true;
                    }
                }
            }

            if (isMatch) {
                matched = { key: item.key, data: sch, term: schTerm || legDest, origin: schOrigin || legStart };
                break;
            }
        }

        if (matched) {
            const customRoute = (matched.data.custom_route || '').trim();
            if (customRoute) {
                allRoutes.add(customRoute);
                // Endpoints are strictly first and last lines of stop lists
                const schDirect = matched.data.direct_stops || [];
                const schReverse = matched.data.reverse_stops || [];
                const originStop = schDirect[0] || (schReverse.length ? schReverse[schReverse.length - 1] : matched.origin);
                const termStop = (schDirect.length ? schDirect[schDirect.length - 1] : '') || (schReverse.length ? schReverse[0] : matched.term);
                const revFirst = schReverse[0] || termStop;
                const revLast = (schReverse.length ? schReverse[schReverse.length - 1] : '') || originStop;
                const ep = matched.data.endpoints || `${originStop} — ${termStop}`;

                if (dbRoutes) {
                    if (!dbRoutes[customRoute] || dbRoutes[customRoute].main_scheme?.endpoints !== ep) {
                        dbRoutes[customRoute] = {
                            display_number: customRoute,
                            transport_type: rData.transport_type || 'трамвай',
                            main_endpoints: ep,
                            main_scheme: {
                                custom_route: customRoute,
                                first_stop: originStop,
                                last_stop: termStop,
                                endpoints: ep,
                                direct_stops: schDirect,
                                reverse_stops: schReverse
                            }
                        };
                    }
                }
                if (!ROUTE_INFO[customRoute]) {
                    ROUTE_INFO[customRoute] = { name: customRoute, endpoints: {}, destinations: {} };
                }
                ROUTE_INFO[customRoute].destinations['от центра'] = termStop;
                ROUTE_INFO[customRoute].destinations['в центр'] = revLast;
                ROUTE_INFO[customRoute].endpoints['от центра'] = `«${originStop}» — «${termStop}»`;
                ROUTE_INFO[customRoute].endpoints['в центр'] = `«${revFirst}» — «${revLast}»`;
                ROUTE_INFO[customRoute]['от центра'] = `«${originStop}» — «${termStop}»`;
                ROUTE_INFO[customRoute]['в центр'] = `«${revFirst}» — «${revLast}»`;

                for (const dep of leg) {
                    dep.route = customRoute;
                    const hourStr = (dep.hour !== undefined ? dep.hour : dep.hour_computed).toString();
                    const dayObj = data[dep.stop]?.[dep.dir]?.[dep.dayType]?.[hourStr];
                    if (Array.isArray(dayObj)) {
                        const target = dayObj.find(d => d.minute === dep.minute && d.run === dep.run);
                        if (target) target.route = customRoute;
                    }
                }
            } else {
                for (const dep of leg) {
                    const key = `${dep.stop}|${dep.dir}|${dep.dayType}|${dep.hour}|${dep.minute}|${dep.route}|${dep.run}`;
                    _shortenedCache[key] = matched.term;
                }
            }
        }
    }

    injectDynamicRouteStyles(Array.from(allRoutes));
}

function buildShortenedCache(data) {
    analyzeTransitNetwork(data);
}

function injectDynamicRouteStyles(routes) {
    const styleId = 'dynamic-route-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
    }
    
    const hardcoded = ['1', '2', '15'];
    let css = '';
    
    routes.forEach(route => {
        if (hardcoded.includes(route)) return;
        
        let hash = 0;
        for (let i = 0; i < route.length; i++) {
            hash = route.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash * 137) % 360;
        
        css += `
        .route-circle-${route} {
            background: linear-gradient(145deg, hsl(${hue}, 80%, 95%), hsl(${hue}, 80%, 90%));
            color: hsl(${hue}, 70%, 40%);
            border-color: hsl(${hue}, 80%, 80%);
        }
        [data-theme="dark"] .route-circle-${route} {
            background: linear-gradient(145deg, hsl(${hue}, 50%, 15%), hsl(${hue}, 50%, 25%));
            color: hsl(${hue}, 80%, 75%);
            border-color: hsl(${hue}, 40%, 35%);
        }
        `;
    });
    
    styleEl.textContent = css;
}

function getShortenedLabelForDep(dep, stop, dir, dayType) {
    const h = dep.hour !== undefined ? dep.hour : dep.hour_computed;
    const key = `${stop}|${dir}|${dayType}|${h}|${dep.minute}|${dep.route}|${dep.run}`;
    let label = _shortenedCache[key] || null;
    return label;
}

// ─── Helpers ───────────────────────────────────────────────────────────
function getCurrentTime() {
    const now = new Date();
    return {
        hours: now.getHours(), minutes: now.getMinutes(),
        formatted: now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
    };
}

function getCurrentDayType() {
    // Shift the boundary by 2 hours (so 01:30 AM is considered previous day)
    const adjustedDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const d = adjustedDate.getDay();
    return (d === 0 || d === 6) ? 'выходные' : 'будни';
}

function getAllNextDepartures(stop, direction, dayType) {
    const data = scheduleData[stop]?.[direction]?.[dayType];
    if (!data) return [];
    const now = getCurrentTime();
    let ch = now.hours; if (ch < 3) ch += 24;
    const ct = ch * 60 + now.minutes;
    const deps = [];
    const hasFilter = selectedRoutesFilter.size > 0;
    for (const [hourStr, hourDeps] of Object.entries(data)) {
        const h = parseInt(hourStr);
        for (const dep of hourDeps) {
            if (!isRouteAllowedForCurrentVersion(dep.route)) continue;
            if (hasFilter && !selectedRoutesFilter.has(dep.route)) continue;
            const m = parseInt(dep.minute);
            if (h * 60 + m >= ct) {
                const dh = h >= 24 ? h - 24 : h;
                deps.push({ time: dh.toString().padStart(2,'0') + ':' + dep.minute.padStart(2,'0'),
                             hour: h, minute: dep.minute,
                             totalMin: h*60+m, route: dep.route, run: dep.run });
            }
        }
    }
    deps.sort((a, b) => a.totalMin - b.totalMin);
    return deps.slice(0, 6);
}

function getRunSchedule(route, run, direction, dayType) {
    const result = [];
    const directions = ['от центра', 'в центр'];
    for (const [stop, dirs] of Object.entries(scheduleData)) {
        for (const dir of directions) {
            const dayData = dirs[dir]?.[dayType];
            if (!dayData) continue;
            for (const [hour, deps] of Object.entries(dayData)) {
                for (const dep of deps) {
                    if (dep.route === route && dep.run === run) {
                        const h = parseInt(hour);
                        const dh = h >= 24 ? h - 24 : h;
                        result.push({
                            stop, time: dh.toString().padStart(2,'0') + ':' + dep.minute.padStart(2,'0'),
                            sortKey: h * 60 + parseInt(dep.minute),
                            dir, dayType, hour, minute: dep.minute, route, run
                        });
                    }
                }
            }
        }
    }
    result.sort((a, b) => a.sortKey - b.sortKey);
    
    // Check if the final departure is part of a shortened run to the depot or elsewhere
    if (result.length > 0) {
        const last = result[result.length - 1];
        const key = `${last.stop}|${last.dir}|${last.dayType}|${last.hour}|${last.minute}|${last.route}|${last.run}`;
        const dest = _shortenedCache[key];
        if (dest && dest !== last.stop) {
            result.push({
                stop: dest,
                time: 'приб.',
                sortKey: last.sortKey + 1
            });
        }
    }
    
    return result;
}

function formatHour(h) { const n = parseInt(h); return (n >= 24 ? n-24 : n).toString().padStart(2,'0'); }
function escapeHtml(s) { const d = document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML; }
function capitalizeFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function routeCircle(route, extraClass) {
    const multiCls = String(route).length >= 2 ? ' route-circle-multi' : '';
    const cls = 'route-circle route-circle-' + route + multiCls + (extraClass ? ' ' + extraClass : '');
    return `<span class="${cls}">${route}</span>`;
}

// ─── Schedule update ───────────────────────────────────────────────────
let isUpdating = false;

function getScheduleVersion() {
    if (window.SCHEDULE_VERSION) return window.SCHEDULE_VERSION;
    const saved = localStorage.getItem('tram-schedule-version');
    if (saved) return saved;
    if (typeof SCHEDULE_VERSION !== 'undefined') return SCHEDULE_VERSION;
    return 'встроенное';
}

function getScheduleSource() {
    return window.SCHEDULE_SOURCE || 'встроенное';
}

async function updateSchedule() {
    if (isUpdating) return;
    isUpdating = true;
    render();

    try {
        const response = await fetchFromCloud('schedule.js');
        if (!response || !response.ok) throw new Error('Не удалось загрузить файл с сервера');
        const text = await response.text();

        // Parse: execute in a sandboxed way to extract SCHEDULE_DATA and SCHEDULE_VERSION
        let newData = null;
        let newVersion = null;
        const fakeWindow = {};
        const fn = new Function('window', text + '; return { data: window.SCHEDULE_DATA || (typeof SCHEDULE_DATA !== "undefined" ? SCHEDULE_DATA : null), version: window.SCHEDULE_VERSION || (typeof SCHEDULE_VERSION !== "undefined" ? SCHEDULE_VERSION : null), database: window.SCHEDULE_DATABASE || (typeof SCHEDULE_DATABASE !== "undefined" ? SCHEDULE_DATABASE : null) };');
        const result = fn(fakeWindow);
        newData = fakeWindow.SCHEDULE_DATA || result.data;
        newVersion = fakeWindow.SCHEDULE_VERSION || result.version;
        const newDatabase = fakeWindow.SCHEDULE_DATABASE || result.database;
        if (newDatabase) window.SCHEDULE_DATABASE = newDatabase;

        if (!newData) throw new Error('Ошибка парсинга расписания');

        await saveScheduleToIDB(text);
        
        window.SCHEDULE_VERSION = newVersion;
        window.SCHEDULE_DATA = newData;
        window.SCHEDULE_SOURCE = 'обновленное';

        const banner = document.getElementById('update-banner');
        if (banner) banner.style.display = 'none';

        scheduleData = normalizeSchedule(newData);
        buildShortenedCache(scheduleData);

        // Принудительно загружаем также обновлённые схемы маршрутов
        let schemesUpdated = false;
        try {
            for (const t of ['light', 'dark']) {
                const candidates = t === 'dark' ? ['dark.png', 'scheme_dark.png'] : ['light.png', 'scheme_light.png'];
                for (const remoteFile of candidates) {
                    const resp = await fetchFromCloud(remoteFile);
                    if (resp && resp.ok) {
                        const blob = await resp.blob();
                        if (blob && blob.size > 1000) {
                            await saveSchemeToIDB(t, blob);
                            applySchemeBlob(t, blob);
                            schemesUpdated = true;
                            break;
                        }
                    }
                }
            }
        } catch(schemeErr) {
            console.warn('Scheme download error:', schemeErr);
        }

        isUpdating = false;
        currentView = 'stops';
        render();
        showToast(schemesUpdated ? 'Расписание и схемы обновлены!' : 'Расписание обновлено!');
    } catch (e) {
        isUpdating = false;
        render();
        showToast('Ошибка: ' + e.message);
    }
}

function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('toast-visible');
    setTimeout(() => toast.classList.remove('toast-visible'), 3000);
}


function formatScheduleVersion(version) {
    if (!version) return '';
    let v = String(version).trim();
    v = v.replace(/Z$/i, '');
    v = v.replace('T', ' ');
    v = v.replace(/(\d{2}:\d{2}:\d{2})\.\d+/, '$1');
    return v;
}


// ─── Footer ────────────────────────────────────────────────────────────
function renderFooter() {
    const version = getScheduleVersion();
    const source = getScheduleSource();
    const btnText = isUpdating ? '⏳ Обновление...' : '🔄 Обновить расписание';
    const btnDisabled = isUpdating ? 'disabled' : '';

    return `
        <div class="app-footer">
            <button class="update-btn" onclick="updateSchedule()" ${btnDisabled}>${btnText}</button>
            <div class="footer-version">Расписание: ${escapeHtml(formatScheduleVersion(version))}</div>
            <div class="footer-app-version">Версия приложения: ${APP_VERSION}</div>
            <img src="logo.png" alt="Липецкий трамвай" class="footer-logo">
            <div class="footer-text">
                Приложение создано и работает на любви энтузиастов из «Липецкого трамвая», 
                а также на движке Vanilla&nbsp;JS и нейросетях Gemini и Claude&nbsp;;)
            </div>
            <div class="footer-tech">2026</div>
        </div>
    `;
}

// ─── Modal ─────────────────────────────────────────────────────────────
let modalHour = '';

function openDepModal(route, run, minute, hour) {
    modalVisible = true;
    modalRoute = route;
    modalRun = run;
    modalMinute = minute;
    modalHour = hour || '';
    renderModal();
}

function closeModal() {
    modalVisible = false;
    const el = document.getElementById('modal-root');
    if (el) el.innerHTML = '';
}

function renderModal() {
    let root = document.getElementById('modal-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'modal-root';
        document.body.appendChild(root);
    }
    if (!modalVisible) { root.innerHTML = ''; return; }

    const dayType = selectedDayType || getCurrentDayType();
    const shortLabel = getShortenedLabelForDep(
        { minute: modalMinute, route: modalRoute, run: modalRun, hour: modalHour },
        selectedStop, selectedDirection, dayType
    );
    const cleanShort = shortLabel ? shortLabel.replace(/[«»"]/g, '').trim() : '';
    const dest = cleanShort ? `до ост. «${cleanShort}»` : getRouteDestination(modalRoute, selectedDirection, selectedStop);

    root.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="closeModal()">&times;</button>
                <div class="modal-info">Выход № ${escapeHtml(modalRun)}</div>
                <div class="modal-info-sub">
                    Маршрут ${routeCircle(modalRoute)} • ${escapeHtml(dest)}
                </div>
                <button class="modal-action-btn" onclick="showRunSchedule('${modalRoute}','${modalRun}')">
                    Показать расписание выхода
                </button>
            </div>
        </div>
    `;
}

function showRunSchedule(route, run) {
    closeModal();
    runRoute = route;
    runRunNum = run;
    currentView = 'runSchedule';
    render();
}

function goBackFromRun() {
    currentView = 'schedule';
    render();
}

// ─── Scheme Modal (Ultra-HD Canvas Pan & Pinch-to-Zoom) ───────────────
let schemeModalVisible = false;
let schemeScale = 1.0;
let schemeTranslateX = 0;
let schemeTranslateY = 0;

// Gesture state variables
let isPinching = false;
let isPanning = false;
let startPinchDist = 0;
let startScale = 1.0;
let startMidX = 0;
let startMidY = 0;
let startTx = 0;
let startTy = 0;
let lastTouchX = 0;
let lastTouchY = 0;
let lastTapTime = 0;

// Mouse state variables
let isMouseDown = false;
let mouseStartX = 0;
let mouseStartY = 0;

// Render loop & image cache variables
let schemeAnimFrame = null;
let schemeTweenAnim = null;
const schemeImageCache = {};
const schemeObjectUrls = {};

function applySchemeBlob(theme, blob) {
    if (schemeObjectUrls[theme]) {
        try { URL.revokeObjectURL(schemeObjectUrls[theme]); } catch(e) {}
    }
    const url = URL.createObjectURL(blob);
    schemeObjectUrls[theme] = url;
    const img = new Image();
    img.src = url;
    img.onload = () => {
        if (typeof schemeModalVisible !== 'undefined' && schemeModalVisible) {
            requestSchemeRender();
        }
    };
    schemeImageCache[theme] = img;
}

async function initCachedSchemes() {
    for (const t of ['light', 'dark']) {
        try {
            const blob = await getSchemeFromIDB(t);
            if (blob) applySchemeBlob(t, blob);
        } catch(e) {}
    }
}

function getSchemeImg(theme) {
    const t = theme || getTheme();
    if (!schemeImageCache[t]) {
        const img = new Image();
        img.src = t === 'dark' ? 'scheme_dark.png' : 'scheme_light.png';
        schemeImageCache[t] = img;
    }
    return schemeImageCache[t];
}

let isCheckingSchemes = false;
async function checkSchemeUpdates() {
    if (isCheckingSchemes) return;
    isCheckingSchemes = true;
    try {
        let info = null;
        try {
            const metaResp = await fetchFromCloud('scheme_info.json');
            if (metaResp && metaResp.ok) {
                info = await metaResp.json();
            }
        } catch(e) {}

        for (const t of ['light', 'dark']) {
            const remoteFile = t === 'dark' ? 'dark.png' : 'light.png';
            const localStamp = safeStorage.get(`tram-scheme-stamp-${t}`);

            if (info && info[t] && info[t].timestamp && String(info[t].timestamp) === String(localStamp)) {
                continue;
            }

            const resp = await fetchFromCloud(remoteFile);
            if (!resp || !resp.ok) continue;

            const etag = resp.headers.get('ETag') || resp.headers.get('Last-Modified') || resp.headers.get('Content-Length');
            const cachedEtag = safeStorage.get(`tram-scheme-etag-${t}`);
            if (!info && etag && etag === cachedEtag) {
                continue;
            }

            const blob = await resp.blob();
            if (blob && blob.size > 1000) {
                await saveSchemeToIDB(t, blob);
                if (etag) safeStorage.set(`tram-scheme-etag-${t}`, etag);
                if (info && info[t] && info[t].timestamp) {
                    safeStorage.set(`tram-scheme-stamp-${t}`, String(info[t].timestamp));
                }
                applySchemeBlob(t, blob);
            }
        }
    } catch(err) {
        console.warn('Scheme check error:', err);
    } finally {
        isCheckingSchemes = false;
    }
}

function openSchemeModal() {
    schemeModalVisible = true;
    schemeScale = 1.0;
    schemeTranslateX = 0;
    schemeTranslateY = 0;
    renderSchemeModal();
}

function closeSchemeModal() {
    schemeModalVisible = false;
    window.removeEventListener('mousemove', onSchemeMouseMove);
    window.removeEventListener('mouseup', onSchemeMouseUp);
    if (schemeAnimFrame) {
        cancelAnimationFrame(schemeAnimFrame);
        schemeAnimFrame = null;
    }
    if (schemeTweenAnim) {
        cancelAnimationFrame(schemeTweenAnim);
        schemeTweenAnim = null;
    }
    const el = document.getElementById('scheme-modal-root');
    if (el) el.innerHTML = '';
}

function renderSchemeCanvas() {
    if (!schemeModalVisible) return;
    const canvas = document.getElementById('schemeCanvas');
    const viewport = document.getElementById('schemeViewport');
    if (!canvas || !viewport) return;

    const img = getSchemeImg();
    if (!img.complete || img.naturalWidth === 0) {
        img.onload = () => {
            if (schemeModalVisible) renderSchemeCanvas();
        };
        return;
    }

    // Use device pixel ratio for true Retina / high-DPI crispness
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (vw <= 0 || vh <= 0) return;

    const targetW = Math.round(vw * dpr);
    const targetH = Math.round(vh * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Highest quality filtering directly from source 3508x3780 texture
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.scale(dpr, dpr);

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const baseScale = Math.min((vw * 0.96) / nw, (vh * 0.96) / nh);
    const baseW = nw * baseScale;
    const baseH = nh * baseScale;

    ctx.translate(vw / 2 + schemeTranslateX, vh / 2 + schemeTranslateY);
    ctx.scale(schemeScale, schemeScale);

    ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);

    ctx.restore();
}

function requestSchemeRender() {
    if (schemeAnimFrame) cancelAnimationFrame(schemeAnimFrame);
    schemeAnimFrame = requestAnimationFrame(renderSchemeCanvas);
}

function animateSchemeTo(targetScale, targetTx, targetTy, duration = 220) {
    if (schemeTweenAnim) cancelAnimationFrame(schemeTweenAnim);
    const startScale = schemeScale;
    const startTx = schemeTranslateX;
    const startTy = schemeTranslateY;
    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1.0);
        const ease = 1 - Math.pow(1 - progress, 3);

        schemeScale = startScale + (targetScale - startScale) * ease;
        schemeTranslateX = startTx + (targetTx - startTx) * ease;
        schemeTranslateY = startTy + (targetTy - startTy) * ease;

        renderSchemeCanvas();

        if (progress < 1.0) {
            schemeTweenAnim = requestAnimationFrame(step);
        } else {
            schemeTweenAnim = null;
            clampSchemeBounds();
            renderSchemeCanvas();
        }
    }
    schemeTweenAnim = requestAnimationFrame(step);
}

function clampSchemeBounds() {
    if (schemeScale <= 1.0) {
        schemeScale = 1.0;
        schemeTranslateX = 0;
        schemeTranslateY = 0;
        return;
    }
    if (schemeScale > 6.0) {
        schemeScale = 6.0;
    }

    const viewport = document.getElementById('schemeViewport');
    const img = getSchemeImg();
    if (!viewport || !img || !img.naturalWidth) return;

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const baseScale = Math.min((vw * 0.96) / nw, (vh * 0.96) / nh);
    const baseW = nw * baseScale;
    const baseH = nh * baseScale;

    const scaledW = baseW * schemeScale;
    const scaledH = baseH * schemeScale;

    const maxPanX = Math.max(0, (scaledW - vw) / 2 + 60);
    const maxPanY = Math.max(0, (scaledH - vh) / 2 + 60);

    if (schemeTranslateX > maxPanX) schemeTranslateX = maxPanX;
    if (schemeTranslateX < -maxPanX) schemeTranslateX = -maxPanX;
    if (schemeTranslateY > maxPanY) schemeTranslateY = maxPanY;
    if (schemeTranslateY < -maxPanY) schemeTranslateY = -maxPanY;
}

function zoomSchemeAt(clientX, clientY, targetScale) {
    const newScale = Math.min(Math.max(targetScale, 1.0), 6.0);
    const viewport = document.getElementById('schemeViewport');
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const fx = clientX - cx;
    const fy = clientY - cy;

    let targetTx, targetTy;
    if (newScale === 1.0) {
        targetTx = 0;
        targetTy = 0;
    } else {
        targetTx = fx - (fx - schemeTranslateX) * (newScale / schemeScale);
        targetTy = fy - (fy - schemeTranslateY) * (newScale / schemeScale);
    }
    animateSchemeTo(newScale, targetTx, targetTy, 140);
}

function schemeZoomIn() {
    const viewport = document.getElementById('schemeViewport');
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    zoomSchemeAt(rect.left + rect.width / 2, rect.top + rect.height / 2, schemeScale * 1.4);
}

function schemeZoomOut() {
    const viewport = document.getElementById('schemeViewport');
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    zoomSchemeAt(rect.left + rect.width / 2, rect.top + rect.height / 2, schemeScale / 1.4);
}

function resetSchemeTransform() {
    animateSchemeTo(1.0, 0, 0);
}

function handleSchemeDoubleTap(clientX, clientY) {
    if (schemeScale > 1.3) {
        animateSchemeTo(1.0, 0, 0);
    } else {
        const viewport = document.getElementById('schemeViewport');
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const fx = clientX - cx;
        const fy = clientY - cy;
        const targetScale = 2.8;
        const targetTx = fx - fx * targetScale;
        const targetTy = fy - fy * targetScale;
        animateSchemeTo(targetScale, targetTx, targetTy);
    }
}

// Touch Event Handlers
function onSchemeTouchStart(e) {
    if (e.touches.length === 2) {
        isPinching = true;
        isPanning = false;
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        startPinchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        startScale = schemeScale;
        startMidX = (t0.clientX + t1.clientX) / 2;
        startMidY = (t0.clientY + t1.clientY) / 2;
        startTx = schemeTranslateX;
        startTy = schemeTranslateY;
    } else if (e.touches.length === 1) {
        isPinching = false;
        isPanning = true;
        const t = e.touches[0];
        lastTouchX = t.clientX;
        lastTouchY = t.clientY;

        const now = Date.now();
        if (now - lastTapTime < 300) {
            handleSchemeDoubleTap(t.clientX, t.clientY);
            lastTapTime = 0;
            isPanning = false;
            return;
        }
        lastTapTime = now;
    }
}

function onSchemeTouchMove(e) {
    if (isPinching && e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        if (startPinchDist <= 0) return;

        const factor = currentDist / startPinchDist;
        const newScale = Math.min(Math.max(startScale * factor, 0.8), 6.0);

        const viewport = document.getElementById('schemeViewport');
        if (viewport) {
            const rect = viewport.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const fx = startMidX - cx;
            const fy = startMidY - cy;

            const currentMidX = (t0.clientX + t1.clientX) / 2;
            const currentMidY = (t0.clientY + t1.clientY) / 2;
            const moveDeltaX = currentMidX - startMidX;
            const moveDeltaY = currentMidY - startMidY;

            schemeScale = newScale;
            schemeTranslateX = fx - (fx - startTx) * (newScale / startScale) + moveDeltaX;
            schemeTranslateY = fy - (fy - startTy) * (newScale / startScale) + moveDeltaY;
            requestSchemeRender();
        }
    } else if (isPanning && e.touches.length === 1) {
        if (schemeScale > 1.0) {
            e.preventDefault();
            const t = e.touches[0];
            const dx = t.clientX - lastTouchX;
            const dy = t.clientY - lastTouchY;
            lastTouchX = t.clientX;
            lastTouchY = t.clientY;

            schemeTranslateX += dx;
            schemeTranslateY += dy;
            clampSchemeBounds();
            requestSchemeRender();
        }
    }
}

function onSchemeTouchEnd(e) {
    if (e.touches.length === 0) {
        isPinching = false;
        isPanning = false;
        if (schemeScale < 1.05) {
            animateSchemeTo(1.0, 0, 0);
        } else {
            clampSchemeBounds();
            animateSchemeTo(schemeScale, schemeTranslateX, schemeTranslateY);
        }
    } else if (e.touches.length === 1) {
        isPinching = false;
        isPanning = true;
        const t = e.touches[0];
        lastTouchX = t.clientX;
        lastTouchY = t.clientY;
    }
}

// Mouse Event Handlers
function onSchemeMouseDown(e) {
    if (e.button !== 0) return;
    isMouseDown = true;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    const vp = document.getElementById('schemeViewport');
    if (vp && schemeScale > 1.0) vp.classList.add('grabbing');
}

function onSchemeMouseMove(e) {
    if (!isMouseDown) return;
    const dx = e.clientX - mouseStartX;
    const dy = e.clientY - mouseStartY;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;

    if (schemeScale > 1.0) {
        schemeTranslateX += dx;
        schemeTranslateY += dy;
        clampSchemeBounds();
        requestSchemeRender();
    }
}

function onSchemeMouseUp() {
    if (!isMouseDown) return;
    isMouseDown = false;
    const vp = document.getElementById('schemeViewport');
    if (vp) vp.classList.remove('grabbing');
    clampSchemeBounds();
    animateSchemeTo(schemeScale, schemeTranslateX, schemeTranslateY);
}

function onSchemeWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    zoomSchemeAt(e.clientX, e.clientY, schemeScale * factor);
}

function onSchemeDblClick(e) {
    handleSchemeDoubleTap(e.clientX, e.clientY);
}

function renderSchemeModal() {
    let root = document.getElementById('scheme-modal-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'scheme-modal-root';
        document.body.appendChild(root);
    }
    if (!schemeModalVisible) { root.innerHTML = ''; return; }

    root.innerHTML = `
        <div class="scheme-modal-overlay" onclick="closeSchemeModal()">
            <div class="scheme-modal-container" onclick="event.stopPropagation()">
                <div class="scheme-modal-header">
                    <div class="scheme-modal-title">Схема маршрутов</div>
                    <div class="scheme-modal-actions">
                        <button class="scheme-modal-close" onclick="closeSchemeModal()" title="Закрыть">&times;</button>
                    </div>
                </div>
                <div class="scheme-viewport" id="schemeViewport">
                    <canvas id="schemeCanvas" class="scheme-canvas"></canvas>
                    <div class="scheme-zoom-controls" onclick="event.stopPropagation()">
                        <button class="scheme-zoom-btn" onclick="schemeZoomIn()" title="Приблизить">+</button>
                        <div class="scheme-zoom-divider"></div>
                        <button class="scheme-zoom-btn" onclick="schemeZoomOut()" title="Отдалить">−</button>
                        <div class="scheme-zoom-divider"></div>
                        <button class="scheme-zoom-btn" onclick="resetSchemeTransform()" title="Сбросить" style="font-size:12px; font-weight:700;">1:1</button>
                    </div>
                </div>
                <div class="scheme-modal-footer">
                    <span class="scheme-hint">Перемещение одним пальцем • масштаб двумя</span>
                </div>
            </div>
        </div>
    `;

    const vp = document.getElementById('schemeViewport');
    if (vp) {
        vp.addEventListener('touchstart', onSchemeTouchStart, { passive: false });
        vp.addEventListener('touchmove', onSchemeTouchMove, { passive: false });
        vp.addEventListener('touchend', onSchemeTouchEnd, { passive: false });
        vp.addEventListener('touchcancel', onSchemeTouchEnd, { passive: false });

        vp.addEventListener('mousedown', onSchemeMouseDown);
        window.addEventListener('mousemove', onSchemeMouseMove);
        window.addEventListener('mouseup', onSchemeMouseUp);
        vp.addEventListener('wheel', onSchemeWheel, { passive: false });
        vp.addEventListener('dblclick', onSchemeDblClick);
    }

    requestSchemeRender();
}

// ─── Rendering ─────────────────────────────────────────────────────────
function render() {
    const app = document.getElementById('app');
    switch (currentView) {
        case 'stops':       renderStopsScreen(app); break;
        case 'directions':  renderDirectionsScreen(app); break;
        case 'schedule':    renderScheduleScreen(app); break;
        case 'runSchedule': renderRunScheduleScreen(app); break;
    }
}

function getFavorites() {
    try {
        const favs = safeStorage.get('tram-favorites');
        return favs ? JSON.parse(favs) : [];
    } catch(e) { return []; }
}

function toggleFavorite(event, stop) {
    event.stopPropagation();
    let favs = getFavorites();
    if (favs.includes(stop)) {
        favs = favs.filter(s => s !== stop);
    } else {
        favs.push(stop);
    }
    safeStorage.set('tram-favorites', JSON.stringify(favs));
    // Check if we have an active search query to preserve it after render
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value : '';
    render();
    // Restore search and re-filter
    const newSearchInput = document.getElementById('searchInput');
    if (newSearchInput && query) {
        newSearchInput.value = query;
        filterStops();
    }
}

function filterStops() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const items = document.querySelectorAll('.stop-item');
    let visibleCount = 0;
    
    items.forEach(item => {
        const stopName = item.getAttribute('data-stop-name').toLowerCase();
        if (stopName.includes(query)) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    // Toggle section titles based on search
    const titles = document.querySelectorAll('.stops-section-title');
    if (query.length > 0) {
        titles.forEach(t => t.style.display = 'none');
    } else {
        titles.forEach(t => {
            if (t.classList.contains('flex-title')) t.style.display = 'flex';
            else t.style.display = 'block';
        });
    }
}

function toggleFavSection() {
    const list = document.getElementById('favList');
    const arrow = document.getElementById('favArrow');
    if (!list) return;
    const isExpanded = !list.classList.contains('collapsed');
    if (isExpanded) {
        list.classList.add('collapsed');
        arrow.textContent = '▼';
        safeStorage.set('tram-fav-expanded', 'false');
    } else {
        list.classList.remove('collapsed');
        arrow.textContent = '▲';
        safeStorage.set('tram-fav-expanded', 'true');
    }
}


// ─── Announcements System (Offline-first & Persistent) ────────────────
const ANNOUNCEMENT_URL = 'https://feduchella.github.io/TramSchedule/announcement.json';
let activeAnnouncement = null;
let isAnnouncementDismissed = false;

function loadCachedAnnouncement() {
    try {
        const raw = safeStorage.get('tram-cached-announcement');
        if (raw) {
            const data = JSON.parse(raw);
            if (data && data.active && data.text) {
                activeAnnouncement = data;
                const dismissedId = safeStorage.get('tram-dismissed-announcement');
                isAnnouncementDismissed = (dismissedId === String(data.id));
            }
        }
    } catch(e) {}
}

async function checkAnnouncements() {
    try {
        const resp = await fetchFromCloud('announcement.json');
        if (!resp) return;
        const data = await resp.json();

        if (data && data.active && data.text) {
            const prevRaw = safeStorage.get('tram-cached-announcement');
            let isNewOrUpdated = true;
            if (prevRaw) {
                try {
                    const prev = JSON.parse(prevRaw);
                    if (prev && String(prev.id) === String(data.id) && prev.text === data.text && prev.title === data.title) {
                        isNewOrUpdated = false;
                    }
                } catch(e) {}
            }

            // Save to persistent storage (like schedule)
            safeStorage.set('tram-cached-announcement', JSON.stringify(data));
            activeAnnouncement = data;

            // If it's a new or updated announcement, reset dismissed status so user won't miss it!
            if (isNewOrUpdated) {
                safeStorage.set('tram-dismissed-announcement', '');
                isAnnouncementDismissed = false;
                render();
            } else {
                const dismissedId = safeStorage.get('tram-dismissed-announcement');
                isAnnouncementDismissed = (dismissedId === String(data.id));
                const card = document.getElementById('announcementCard');
                if (!isAnnouncementDismissed && !card) {
                    render();
                }
            }
        } else {
            // Announcement inactive or removed on server
            const wasActive = activeAnnouncement && activeAnnouncement.active;
            safeStorage.set('tram-cached-announcement', JSON.stringify({ active: false }));
            activeAnnouncement = null;
            isAnnouncementDismissed = false;
            if (wasActive) {
                render();
            }
        }
    } catch(e) {
        // Offline or fetch failed: keep previously saved announcement from cache!
    }
}

function dismissAnnouncement(id) {
    safeStorage.set('tram-dismissed-announcement', String(id));
    isAnnouncementDismissed = true;
    const card = document.getElementById('announcementCard');
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(-8px)';
        setTimeout(() => render(), 250);
    } else {
        render();
    }
}

function reopenAnnouncement() {
    safeStorage.set('tram-dismissed-announcement', '');
    isAnnouncementDismissed = false;
    render();
}

function renderAnnouncementHTML() {
    if (!activeAnnouncement || !activeAnnouncement.active || !activeAnnouncement.text || isAnnouncementDismissed) return '';
    const type = activeAnnouncement.type || 'info';
    const icon = type === 'warning' ? '⚠️' : (type === 'alert' ? '🚨' : '📢');
    const title = activeAnnouncement.title || 'Важная информация';
    const id = activeAnnouncement.id || '1';
    return `
        <div class="announcement-card announcement-${type}" id="announcementCard">
            <div class="announcement-header">
                <span class="announcement-icon">${icon}</span>
                <span class="announcement-title">${escapeHtml(title)}</span>
                <button class="announcement-close" onclick="dismissAnnouncement('${escapeHtml(String(id))}')" title="Скрыть">✕</button>
            </div>
            <div class="announcement-body">${escapeHtml(activeAnnouncement.text)}</div>
        </div>
    `;
}

function renderStopsScreen(container) {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }

    const stops = Object.keys(scheduleData).sort((a, b) => a.localeCompare(b, 'ru'));
    const favs = getFavorites();
    const favStops = stops.filter(s => favs.includes(s));
    const otherStops = stops.filter(s => !favs.includes(s));
    const favExpanded = safeStorage.get('tram-fav-expanded') !== 'false'; // default true

    let html = `
        <div class="header">
            <div class="header-title">Трамваи Липецка<div class="header-subtitle">Расписание движения</div></div>
            <div class="header-actions">
                ${(activeAnnouncement && activeAnnouncement.active && activeAnnouncement.text && isAnnouncementDismissed) ? `
                    <button class="theme-toggle" onclick="reopenAnnouncement()" title="Показать объявление" style="position:relative; font-size:15px;">
                        📢<span class="announcement-badge-dot"></span>
                    </button>
                ` : ''}
                <button class="theme-toggle" onclick="openSchemeModal()" title="Схема маршрутов" style="font-size:16px;">🗺️</button>
                <button class="theme-toggle" onclick="toggleTheme()" title="Сменить тему">${themeIcon()}</button>
            </div>
        </div>
        <div id="banner-placeholder"></div>${renderAnnouncementHTML()}
        <div class="search-container">
            <input type="text" id="searchInput" class="search-input" placeholder="Поиск остановки..." oninput="filterStops()">
        </div>
        <div class="stops-list fade-in" id="stopsList">`;

    function buildStopItem(stop, isFav) {
        const allRoutes = new Set();
        for (const dir of Object.keys(scheduleData[stop]))
            for (const r of getRoutesAtStop(stop, dir)) allRoutes.add(r);
        const sorted = Array.from(allRoutes).sort((a,b) => parseInt(a)-parseInt(b));

        const star = isFav ? '★' : '☆';
        const starClass = isFav ? 'favorite-btn' : 'favorite-btn unfilled';

        return `<div class="stop-item" data-stop-name="${escapeHtml(stop)}" onclick="selectStop('${escapeHtml(stop)}')">
            <div class="stop-content">
                <span class="stop-name">${escapeHtml(stop)}</span>
                <div class="stop-routes">${sorted.map(r => routeCircle(r)).join('')}</div>
            </div>
            <div style="display:flex;align-items:center;">
                <button class="${starClass}" onclick="toggleFavorite(event, '${escapeHtml(stop)}')">${star}</button>
                <span class="stop-arrow" style="margin-left: 12px;">›</span>
            </div>
        </div>`;
    }

    if (favStops.length > 0) {
        const arrow = favExpanded ? '▲' : '▼';
        html += `<div class="stops-section-title flex-title" onclick="toggleFavSection()" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; -webkit-tap-highlight-color: transparent;">
            <span>Мои остановки</span>
            <button id="favArrow" style="background:none; border:none; font-size:16px; color:var(--text-secondary); cursor:pointer; padding:0 8px;">${arrow}</button>
        </div>`;
        html += `<div id="favList" class="fav-list-wrapper${favExpanded ? '' : ' collapsed'}"><div class="fav-list-inner">`;
        for (const stop of favStops) html += buildStopItem(stop, true);
        html += `</div></div>`;
        html += `<div class="stops-section-title">Все остановки</div>`;
    }

    for (const stop of otherStops) {
        html += buildStopItem(stop, false);
    }

    html += '</div>' + renderFooter();
    
    const banner = document.getElementById('update-banner');
    if (banner) document.body.appendChild(banner); // protect banner
    container.innerHTML = html;
    const placeholder = document.getElementById('banner-placeholder');
    if (placeholder && banner) placeholder.appendChild(banner);
}

function renderDirectionsScreen(container) {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    const directions = getActiveDirectionsForStop(selectedStop);

    let html = `
        <div class="header">
            <button class="header-back" onclick="goBack()">‹</button>
            <div class="header-title">${escapeHtml(selectedStop)}</div>
            <div class="header-actions">
                <button class="theme-toggle" onclick="openSchemeModal()" title="Схема маршрутов" style="font-size:16px;">🗺️</button>
                <button class="theme-toggle" onclick="toggleTheme()" title="Сменить тему">${themeIcon()}</button>
            </div>
        </div>
        <div id="banner-placeholder"></div>
        <div class="fade-in">`;

    for (const dir of directions) {
        const routes = getRoutesAtStop(selectedStop, dir);
        const dirLabel = getDirectionLabel(selectedStop, dir);
        html += `<div class="direction-card" onclick="selectDirection('${escapeHtml(dir)}')">
            <div class="direction-label">${escapeHtml(dirLabel)}</div>
            <div class="direction-desc">${formatRoutesByType(routes)}</div></div>`;
    }
    html += '</div>';

    const banner = document.getElementById('update-banner');
    if (banner) document.body.appendChild(banner);
    container.innerHTML = html;
    const placeholder = document.getElementById('banner-placeholder');
    if (placeholder && banner) placeholder.appendChild(banner);
}

function renderScheduleScreen(container) {
    const time = getCurrentTime();
    const dayType = selectedDayType || getCurrentDayType();
    selectedDayType = dayType;
    const routes = getRoutesAtStop(selectedStop, selectedDirection);
    const data = scheduleData[selectedStop]?.[selectedDirection]?.[dayType] || {};
    const nextDeps = getAllNextDepartures(selectedStop, selectedDirection, dayType);
    const days = Object.keys(scheduleData[selectedStop]?.[selectedDirection] || {});
    const dirLabel = getDirectionLabel(selectedStop, selectedDirection);

    const dirs = getActiveDirectionsForStop(selectedStop);
    const otherDir = dirs.length > 1 ? dirs.find(d => d !== selectedDirection) : null;
    const dirToggleHtml = otherDir ? `
        <div style="margin-top: 4px;">
            <button class="dir-toggle-btn" onclick="toggleDirection()" title="Сменить направление">
                ⇄ ${escapeHtml(getDirectionLabel(selectedStop, otherDir))}
            </button>
        </div>
    ` : '';

    let html = `
        <div class="header">
            <button class="header-back" onclick="goBack()">‹</button>
            <div class="header-title">${escapeHtml(selectedStop)}
                <div class="header-subtitle">${escapeHtml(dirLabel)}</div>
                ${dirToggleHtml}
            </div>
            <div class="header-actions">
                <button class="theme-toggle" onclick="openSchemeModal()" title="Схема маршрутов" style="font-size:16px;">🗺️</button>
                <button class="theme-toggle" onclick="toggleTheme()" title="Сменить тему">${themeIcon()}</button>
            </div>
        </div>
        <div id="banner-placeholder"></div>
        <div class="schedule-screen fade-in">`;

    // Routes info split into Трамвайные (1, 2, 15) and Электробусные (4, 5)
    const hasFilter = selectedRoutesFilter.size > 0;
    const isInteractive = routes.length > 1;
    html += '<div class="routes-info"><div class="section-title">Проходящие маршруты</div>';

    const tramRoutes = [];
    const electroRoutes = [];
    const busRoutes = [];
    const otherRoutes = [];

    for (const r of routes) {
        const tType = getRouteTransportType(r);
        if (tType === 'трамвай') {
            tramRoutes.push(r);
        } else if (tType === 'электробус') {
            electroRoutes.push(r);
        } else if (tType === 'автобус') {
            busRoutes.push(r);
        } else {
            otherRoutes.push(r);
        }
    }

    function renderRouteLine(r) {
        const routePath = getRoutePath(r, selectedDirection, selectedStop);
        const isSelected = selectedRoutesFilter.has(r);
        const filterCls = isInteractive
            ? (' route-info-clickable' + (hasFilter ? (isSelected ? ' route-info-active' : ' route-info-dimmed') : ''))
            : '';
        const clickAttr = isInteractive ? ` onclick="toggleRouteFilter('${r}')"` : '';
        return `<div class="route-info-line${filterCls}"${clickAttr}>${routeCircle(r, 'route-circle-lg')}<span class="route-info-text">${escapeHtml(routePath)}</span></div>`;
    }

    if (tramRoutes.length > 0) {
        html += '<div class="route-category-title">Трамвайные</div>';
        for (const r of tramRoutes) html += renderRouteLine(r);
    }
    if (electroRoutes.length > 0) {
        html += '<div class="route-category-title">Электробусные</div>';
        for (const r of electroRoutes) html += renderRouteLine(r);
    }
    if (busRoutes.length > 0) {
        html += '<div class="route-category-title">Автобусные</div>';
        for (const r of busRoutes) html += renderRouteLine(r);
    }
    if (otherRoutes.length > 0) {
        html += '<div class="route-category-title">Другие</div>';
        for (const r of otherRoutes) html += renderRouteLine(r);
    }
    html += '</div>';

    // Current time
    html += `<div class="current-time-block"><span class="current-time-icon">🕐</span>
        <div><div class="current-time-label">Текущее время</div>
        <div class="current-time-value" id="clock">${time.formatted}</div></div></div>`;

    // Day selector
    html += '<div class="day-selector">';
    for (const d of days) html += `<button class="day-btn ${d===dayType?'active':''}" onclick="switchDayType('${escapeHtml(d)}')">${capitalizeFirst(d)}</button>`;
    html += '</div>';

    // Nearest
    html += '<div class="nearest-section"><div class="section-title">Ближайшие рейсы</div><div class="nearest-list">';
    if (nextDeps.length === 0) {
        html += '<div class="nearest-empty">На сегодня рейсов больше нет</div>';
    } else {
        for (const dep of nextDeps) {
            const shortLabel = getShortenedLabelForDep(dep, selectedStop, selectedDirection, dayType);
            const cleanStop = shortLabel ? shortLabel.replace(/[«»"]/g, '').trim() : '';
            const shortHtml = cleanStop ? `<span class="shortened-label">до ост. «${escapeHtml(cleanStop)}»</span>` : '';
            html += `<div class="nearest-item" onclick="openDepModal('${dep.route}','${dep.run}','${dep.minute}','${dep.hour}')"><span class="nearest-time">${dep.time}</span>${routeCircle(dep.route)}${shortHtml}</div>`;
        }
    }
    html += '</div></div>';

    // Schedule table
    const sortedHours = Object.keys(data).sort((a,b) => parseInt(a)-parseInt(b));
    html += `<div class="schedule-table-section"><div class="section-title">Расписание на день</div>
        <div class="schedule-table-header">
            <div class="schedule-col-hours schedule-col-label">Часы</div>
            <div class="schedule-col-minutes schedule-col-label">Минуты</div>
        </div>`;

    for (const hour of sortedHours) {
        const deps = hasFilter ? data[hour].filter(dep => selectedRoutesFilter.has(dep.route)) : data[hour];
        if (deps.length === 0) continue;
        html += `<div class="schedule-row"><div class="schedule-hour">${formatHour(hour)}</div><div class="schedule-minutes">`;
        for (const dep of deps) {
            const shortLabel = getShortenedLabelForDep({...dep, hour}, selectedStop, selectedDirection, dayType);
            const cleanStop = shortLabel ? shortLabel.replace(/[«»"]/g, '').trim() : '';
            const shortCls = shortLabel ? ' dep-cell-shortened' : '';
            const shortTitle = cleanStop ? ` title="до ост. «${escapeHtml(cleanStop)}»"` : '';
            const shortMark = shortLabel ? `<span class="dep-short-mark">↩</span>` : '';
            html += `<div class="dep-cell${shortCls}" onclick="openDepModal('${dep.route}','${dep.run}','${dep.minute}','${hour}')"${shortTitle}>
                <span class="dep-cell-minute">${dep.minute.padStart(2,'0')}</span>
                <span class="dep-cell-badge">${routeCircle(dep.route, 'route-circle-sm')}</span>
                ${shortMark}
            </div>`;
        }
        html += '</div></div>';
    }
    html += '</div></div>';

    const banner = document.getElementById('update-banner');
    if (banner) document.body.appendChild(banner);
    container.innerHTML = html;
    const placeholder = document.getElementById('banner-placeholder');
    if (placeholder && banner) placeholder.appendChild(banner);

    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(() => {
        const el = document.getElementById('clock');
        if (el) el.textContent = getCurrentTime().formatted;
    }, 10000);
}

function renderRunScheduleScreen(container) {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    const dayType = selectedDayType || getCurrentDayType();
    const runData = getRunSchedule(runRoute, runRunNum, selectedDirection, dayType);
    const info = ROUTE_INFO[runRoute];

    let html = `
        <div class="header">
            <button class="header-back" onclick="goBackFromRun()">‹</button>
            <div class="header-title">Выход № ${escapeHtml(runRunNum)}
                <div class="header-subtitle">Маршрут ${runRoute} • ${capitalizeFirst(dayType)}</div>
            </div>
            <div class="header-actions">
                <button class="theme-toggle" onclick="openSchemeModal()" title="Схема маршрутов" style="font-size:16px;">🗺️</button>
                <button class="theme-toggle" onclick="toggleTheme()" title="Сменить тему">${themeIcon()}</button>
            </div>
        </div>
        <div id="banner-placeholder"></div>
        <div class="fade-in">`;

    if (info) {
        const routePath = info[selectedDirection] || info['от центра'] || '';
        html += `<div class="routes-info">
            <div class="route-info-line">${routeCircle(runRoute, 'route-circle-lg')}<span class="route-info-text">${escapeHtml(routePath)}</span></div>
        </div>`;
    }

    html += '<div class="run-schedule-section"><div class="section-title">Расписание выхода</div>';

    if (runData.length === 0) {
        html += '<div class="nearest-empty">Данные не найдены</div>';
    } else {
        html += '<table class="run-table"><thead><tr><th>Время</th><th>Остановка</th></tr></thead><tbody>';
        for (const item of runData)
            html += `<tr><td class="run-time">${item.time}</td><td class="run-stop">${escapeHtml(item.stop)}</td></tr>`;
        html += '</tbody></table>';
    }
    html += '</div></div>';

    const banner = document.getElementById('update-banner');
    if (banner) document.body.appendChild(banner);
    container.innerHTML = html;
    const placeholder = document.getElementById('banner-placeholder');
    if (placeholder && banner) placeholder.appendChild(banner);
}

// ─── Navigation ────────────────────────────────────────────────────────
function selectStop(stop) {
    selectedStop = stop;
    selectedRoutesFilter.clear();
    const dirs = getActiveDirectionsForStop(stop);
    if (dirs.length <= 1) {
        selectedDirection = dirs[0] || '';
        selectedDayType = getCurrentDayType();
        currentView = 'schedule';
    } else {
        currentView = 'directions';
    }
    render();
}

function selectDirection(dir) {
    selectedDirection = dir;
    selectedRoutesFilter.clear();
    selectedDayType = getCurrentDayType();
    currentView = 'schedule';
    render();
}

function toggleDirection() {
    const dirs = getActiveDirectionsForStop(selectedStop);
    if (dirs.length > 1) {
        selectedDirection = dirs.find(d => d !== selectedDirection);
        selectedRoutesFilter.clear();
        render();
    }
}

function toggleRouteFilter(route) {
    const routes = getRoutesAtStop(selectedStop, selectedDirection);
    if (routes.length <= 1) return;
    if (selectedRoutesFilter.has(route)) {
        selectedRoutesFilter.delete(route);
    } else {
        selectedRoutesFilter.add(route);
        if (selectedRoutesFilter.size >= routes.length) {
            selectedRoutesFilter.clear();
        }
    }
    render();
}

function switchDayType(day) { selectedDayType = day; render(); }

function goBack() {
    if (currentView === 'schedule') {
        const dirs = getActiveDirectionsForStop(selectedStop);
        currentView = dirs.length <= 1 ? 'stops' : 'directions';
    } else if (currentView === 'directions') {
        currentView = 'stops';
    }
    render();
}

function goBackFromRun() {
    currentView = 'schedule';
    render();
}

// ─── Android Back Button Bridge ────────────────────────────────────────
window.handleAndroidBack = function() {
    if (typeof schemeModalVisible !== 'undefined' && schemeModalVisible) {
        closeSchemeModal();
        return true;
    }
    if (typeof modalVisible !== 'undefined' && modalVisible) {
        closeModal();
        return true;
    }
    if (typeof currentView !== 'undefined' && currentView !== 'stops') {
        if (currentView === 'runSchedule') {
            goBackFromRun();
        } else {
            goBack();
        }
        return true;
    }
    return false;
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (typeof schemeModalVisible !== 'undefined' && schemeModalVisible) {
            closeSchemeModal();
        } else if (typeof modalVisible !== 'undefined' && modalVisible) {
            closeModal();
        }
    }
});

window.addEventListener('resize', () => {
    if (typeof schemeModalVisible !== 'undefined' && schemeModalVisible) {
        requestSchemeRender();
    }
});


async function loadInitialSchedule() {
    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.innerHTML = `
            <div class="first-launch-container">
                <div class="first-launch-spinner"></div>
                <div class="first-launch-title">Первый запуск</div>
                <div class="first-launch-text">Загружаем актуальное расписание...</div>
            </div>
        `;
    }

    try {
        const response = await fetchFromCloud('schedule.js');
        if (!response || !response.ok) throw new Error('Ошибка загрузки расписания с сервера');
        const text = await response.text();

        const parsed = parseScheduleText(text);
        let newData = null;
        let newVersion = null;
        if (parsed && parsed.data) {
            newData = parsed.data;
            newVersion = parsed.version;
        } else {
            const fakeWindow = {};
            const fn = new Function('window', text + '; return { data: window.SCHEDULE_DATA || (typeof SCHEDULE_DATA !== "undefined" ? SCHEDULE_DATA : null), version: window.SCHEDULE_VERSION || (typeof SCHEDULE_VERSION !== "undefined" ? SCHEDULE_VERSION : null), database: window.SCHEDULE_DATABASE || (typeof SCHEDULE_DATABASE !== "undefined" ? SCHEDULE_DATABASE : null) };');
            const result = fn(fakeWindow);
            newData = fakeWindow.SCHEDULE_DATA || result.data;
            newVersion = fakeWindow.SCHEDULE_VERSION || result.version;
            const newDatabase = fakeWindow.SCHEDULE_DATABASE || result.database;
            if (newDatabase) window.SCHEDULE_DATABASE = newDatabase;
        }

        if (!newData) throw new Error('Ошибка парсинга расписания');

        if (!window.SANDBOX_MODE) {
            await saveScheduleToIDB(text);
        }

        window.SCHEDULE_VERSION = newVersion;
        window.SCHEDULE_DATA = newData;
        safeStorage.set('tram-schedule-version', newVersion);

        scheduleData = normalizeSchedule(newData);
        buildShortenedCache(scheduleData);
        render();
    } catch (e) {
        if (appContainer) {
            appContainer.innerHTML = `
                <div class="first-launch-container">
                    <div class="first-launch-icon">⚠️</div>
                    <div class="first-launch-title">Не удалось загрузить расписание</div>
                    <div class="first-launch-text">Для первой работы приложения требуется подключение к интернету или корректный файл расписания.</div>
                    <button class="update-btn update-btn-yes" style="max-width:240px;" onclick="loadInitialSchedule()">Повторить попытку</button>
                </div>
            `;
        }
    }
}
window.loadInitialSchedule = loadInitialSchedule;

// ─── Init ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Notify VK that app is loaded and ready
    if (window.vkBridge) {
        vkBridge.send('VKWebAppInit');
    }

    // Fetch insets from Android interface if available
    if (window.AndroidInsets) {
        try {
            const bottom = window.AndroidInsets.getBottomInset();
            const top = window.AndroidInsets.getTopInset();
            document.documentElement.style.setProperty('--android-safe-area-bottom', bottom + 'px');
            document.documentElement.style.setProperty('--android-safe-area-top', top + 'px');
        } catch (e) {
            console.error('Error fetching Android insets', e);
        }
    }

    setTheme(getTheme());

    // Build shortened run cache after data is loaded
    const _initSchedule = (data) => {
        scheduleData = normalizeSchedule(data);
        buildShortenedCache(scheduleData);
        render();
    };

    (async () => {
        // 0. Immediately load cached announcement and schemes from storage so user sees them right away
        loadCachedAnnouncement();
        initCachedSchemes();

        if (window.SANDBOX_MODE) {
            await loadInitialSchedule();
            return;
        }

        // 1. Try to load from IDB first (OTA update / cache)
        const cachedText = await getScheduleFromIDB();
        if (cachedText) {
            const parsed = parseScheduleText(cachedText);
            if (parsed && parsed.data) {
                window.SCHEDULE_VERSION = parsed.version;
                window.SCHEDULE_DATA = parsed.data;
                _initSchedule(window.SCHEDULE_DATA);
                setTimeout(checkForUpdates, 1500);
                setTimeout(checkAnnouncements, 2000);
                return;
            }
        }

        // 2. If no cache in IDB (first launch / clean start), fetch dynamically from network
        await loadInitialSchedule();
        setTimeout(checkAnnouncements, 1500);
    })();
});

window.addEventListener('popstate', () => goBack());
