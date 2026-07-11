import React, { useState, useEffect, useRef } from 'react';
import {
  Plane, Radio, Fuel, Users, AlertTriangle, CheckCircle2, XCircle,
  Clock, MapPin, Heart, Wind, Cloud, Activity, Power, RotateCcw,
  ChevronRight, Zap, AlertCircle, TrendingUp, FileText, ClipboardList,
  Hospital, ArrowRightLeft, Settings
} from 'lucide-react';

// Auto-generated texture bundle — Grok-produced images, base64 encoded.
// See /textures folder for deploy-time equivalents.
const TEX = {
  paper: "/textures/paper.jpg",
  pencilRed: "/textures/pencil-red.jpg",
  pencilYellow: "/textures/pencil-yellow.jpg",
  pencilBlue: "/textures/pencil-blue.jpg",
  trainingStamp: "/textures/training-stamp.png",
  patch: "/textures/patch.png",
  aircraft: "/textures/aircraft.jpg",
  occBackdrop: "/textures/occ-backdrop.jpg",
};


// ─────────────────────────────────────────────────────────────────────────────
// DATA: Airport pool within ~230 NM of KGJT (distances are approximate —
// always verify against ForeFlight / actual flight plan before launch)
// ─────────────────────────────────────────────────────────────────────────────
const AIRPORTS = [
  { icao: 'KRIL', name: 'Rifle Garfield County', dist: 49, rwy: 7000, city: 'Rifle, CO', lat: 39.5263, lon: -107.7268 },
  { icao: 'KMTJ', name: 'Montrose Regional', dist: 54, rwy: 10000, city: 'Montrose, CO', lat: 38.5098, lon: -107.8941 },
  { icao: 'KCNY', name: 'Canyonlands Regional', dist: 62, rwy: 7100, city: 'Moab, UT', lat: 38.7551, lon: -109.7549 },
  { icao: 'KVEL', name: 'Vernal Regional', dist: 91, rwy: 7000, city: 'Vernal, UT', lat: 40.4400, lon: -109.5099 },
  { icao: 'KCEZ', name: 'Cortez Municipal', dist: 109, rwy: 7205, city: 'Cortez, CO', lat: 37.3030, lon: -108.6281 },
  { icao: 'KHDN', name: 'Yampa Valley Regional', dist: 112, rwy: 10000, city: 'Hayden, CO', lat: 40.4812, lon: -107.2176 },
  { icao: 'KDWX', name: 'Dixon Airport', dist: 124, rwy: 6340, city: 'Dixon, WY', lat: 41.0270, lon: -107.4980 },
  { icao: 'KFMN', name: 'Four Corners Regional', dist: 127, rwy: 6501, city: 'Farmington, NM', lat: 36.7411, lon: -108.2300 },
  { icao: 'KDRO', name: 'Durango–La Plata County', dist: 141, rwy: 9201, city: 'Durango, CO', lat: 37.1515, lon: -107.7538 },
  { icao: 'KPUC', name: 'Carbon County Regional', dist: 145, rwy: 8316, city: 'Price, UT', lat: 39.6139, lon: -110.7508 },
  { icao: 'KRKS', name: 'Rock Springs–Sweetwater', dist: 157, rwy: 10000, city: 'Rock Springs, WY', lat: 41.5942, lon: -109.0651 },
  { icao: 'KBDG', name: 'Blanding Municipal', dist: 168, rwy: 5781, city: 'Blanding, UT', lat: 37.5833, lon: -109.4833 },
  { icao: 'KEVW', name: 'Evanston–Uinta County', dist: 195, rwy: 7300, city: 'Evanston, WY', lat: 41.2748, lon: -111.0347 },
  { icao: 'KPVU', name: 'Provo Municipal', dist: 198, rwy: 8599, city: 'Provo, UT', lat: 40.2192, lon: -111.7227 },
];

const TRANSFER_FACILITIES = [
  { icao: 'KSLC', name: 'Univ. of Utah Hospital', region: 'Salt Lake', distFromGJT: 188 },
  { icao: 'U42', name: 'Intermountain Medical Ctr', region: 'Salt Lake', distFromGJT: 178 },
  { icao: 'KAPA', name: 'Sky Ridge / Swedish', region: 'Denver', distFromGJT: 192 },
  { icao: 'KBJC', name: 'St. Anthony Hospital', region: 'Denver', distFromGJT: 197 },
];

const PATIENT_CONDITIONS = [
  { cond: 'Acute MI – cath lab transfer needed', tier: 'critical' },
  { cond: 'Suspected stroke, GCS 13', tier: 'critical' },
  { cond: 'Polytrauma from MVC, stable', tier: 'urgent' },
  { cond: 'GI bleed with active hypotension', tier: 'critical' },
  { cond: 'Acute pancreatitis, deteriorating', tier: 'urgent' },
  { cond: 'Diabetic ketoacidosis, AMS', tier: 'urgent' },
  { cond: 'Complex orthopedic fracture', tier: 'routine' },
  { cond: 'Post-seizure, unstable airway', tier: 'critical' },
  { cond: 'Septic shock, on pressors', tier: 'critical' },
  { cond: 'Pediatric respiratory distress', tier: 'critical' },
  { cond: 'Burn patient, 25% TBSA', tier: 'critical' },
  { cond: 'Head trauma, GCS 11', tier: 'critical' },
];

const DECLINE_REASONS = [
  'Weather below minimums',
  'No longer medically necessary',
  'Ground unit transported patient',
  'Crew duty/fatigue',
  'Aircraft unserviceable',
  'Patient weight/fuel limits exceeded',
  'Other',
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uniq = (arr) => [...new Set(arr)];
const fmtTime = (d) => d.toTimeString().slice(0, 5);
const fmtClock = (d) =>
  `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
const lbToKg = (lb) => Math.round(lb / 2.205);

// Haversine distance in nautical miles
const haversineNM = (lat1, lon1, lat2, lon2) => {
  const R = 3440.07; // earth radius in NM
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// Live METAR fetcher with nearest-station fallback.
// NO SIMULATED DATA — if nothing live is available, returns source 'unavailable'
// and the UI must display an honest "no data" state.
// Returns { raw, source: 'live' | 'nearest' | 'unavailable', station, distance? }
const fetchMETAR = async (airport) => {
  // Step 1: try the airport's own ICAO
  try {
    const url = `https://aviationweather.gov/api/data/metar?ids=${airport.icao}&format=raw&hours=2`;
    const res = await fetch(url);
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text && text.length > 10) {
        const raw = text.split('\n')[0].trim();
        return { raw, source: 'live', station: airport.icao };
      }
    }
  } catch (err) {
    // fall through to nearest-station search
  }

  // Step 2: search for nearest reporting station via bounding box
  if (airport.lat != null && airport.lon != null) {
    try {
      const pad = 1.0; // ~60 NM box
      const bbox = [
        airport.lat - pad, airport.lon - pad,
        airport.lat + pad, airport.lon + pad,
      ].join(',');
      const url = `https://aviationweather.gov/api/data/metar?bbox=${bbox}&format=json&hours=2`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Compute distance for each, sort ascending
          const ranked = data
            .filter((m) => m.lat != null && m.lon != null && m.rawOb)
            .map((m) => ({
              ...m,
              _dist: haversineNM(airport.lat, airport.lon, m.lat, m.lon),
            }))
            .filter((m) => m.icaoId !== airport.icao)
            .sort((a, b) => a._dist - b._dist);
          if (ranked.length > 0) {
            const n = ranked[0];
            return {
              raw: n.rawOb,
              source: 'nearest',
              station: n.icaoId,
              distance: Math.round(n._dist),
            };
          }
        }
      }
    } catch (err) {
      // fall through
    }
  }

  // Step 3: NO data available — be honest about it. Never fabricate weather.
  return { raw: null, source: 'unavailable', station: airport.icao };
};

// Live TAF fetcher — Aviation Weather Center (FAA) public API
// KGJT base reference
const KGJT = { icao: 'KGJT', name: 'Grand Junction Regional', lat: 39.1224, lon: -108.5267 };

// Major medical centers for interfacility transfers
const MED_CENTERS = [
  { icao: 'KSLC', name: 'Univ. of Utah Hospital', region: 'Salt Lake', lat: 40.7884, lon: -111.9778, distFromGJT: 188 },
  { icao: 'U42', name: 'Intermountain Medical', region: 'Salt Lake', lat: 40.6190, lon: -111.9930, distFromGJT: 178 },
  { icao: 'KAPA', name: 'Sky Ridge / Swedish', region: 'Denver', lat: 39.5701, lon: -104.8497, distFromGJT: 192 },
  { icao: 'KBJC', name: 'St. Anthony / Good Sam.', region: 'Denver', lat: 39.9088, lon: -105.1172, distFromGJT: 197 },
  { icao: 'KCPR', name: 'Wyoming Medical Center', region: 'Casper', lat: 42.9080, lon: -106.4644, distFromGJT: 245 },
];

// MMOPA-style FRAT scoring config
// HAA FRAT structure per FAA AC 135-14B Appendix A (Sample Risk Analysis Tools).
// Med-Trans and other GMR-family operators build their internal FRATs against
// this AC + 14 CFR §135.617. The four categories below mirror the AC's required
// risk factors: Pilot/Crew, Weather, Aircraft, and Mission/Environment.
const FRAT_FIELDS = {
  pilot: {
    title: 'Pilot & Crew',
    items: [
      { id: 'hoursInType', type: 'tier', label: 'Hours in type',
        tiers: [[100, 10], [300, 5], [500, 2], [Infinity, 0]], default: 200, suffix: 'hrs' },
      { id: 'hours90', type: 'tier', label: 'Hours flown in last 90 days',
        tiers: [[10, 10], [20, 5], [30, 2], [Infinity, 0]], default: 10, suffix: 'hrs' },
      { id: 'monthsTraining', type: 'tier', label: 'Months since last recurrent training',
        tiers: [[6, 0], [12, 3], [18, 5], [Infinity, 10]], default: 1, suffix: 'mo' },
      { id: 'hoursAwake', type: 'tier', label: 'Hours since wake-up (PIC)',
        tiers: [[8, 0], [12, 2], [14, 5], [Infinity, 10]], default: 4, suffix: 'hrs' },
      { id: 'tiredIll', type: 'toggle', label: 'Crew member tired, ill, or under significant stress?', whenYes: 10 },
      { id: 'pressure', type: 'toggle', label: 'Undue external pressure to complete the flight?', whenYes: 5 },
      { id: 'unfamCrew', type: 'toggle', label: 'Crew has not flown together recently?', whenYes: 3 },
      { id: 'cfiiAtp', type: 'toggle', label: 'PIC is CFII or ATP rated?', whenYes: -2 },
      { id: 'secondPilot', type: 'toggle', label: 'Second IFR-qualified pilot in seat?', whenYes: -3 },
    ],
  },
  weather: {
    title: 'Weather',
    items: [
      { id: 'depCeilVis', type: 'toggle', label: 'Departure ceiling & vis exceed 1,000\u2032 / 3 SM?', whenNo: 5 },
      { id: 'wxReporting', type: 'toggle', label: 'Approved weather reporting at destination?', whenNo: 5 },
      { id: 'destCeilVis', type: 'toggle', label: 'Destination ceiling & vis exceed 1,000\u2032 / 3 SM?', whenNo: 5 },
      { id: 'approach', type: 'cycle', label: 'Approach type at destination',
        options: [['Precision', 0], ['Non-Precision', 2], ['Visual', 0], ['Circling', 3]], default: 0 },
      { id: 'altSelected', type: 'toggle', label: 'Alternate airport selected & briefed?', whenNo: 5 },
      { id: 'altMarginal', type: 'toggle', label: 'Marginal weather at alternate?', whenYes: 5 },
      { id: 'icing', type: 'toggle', label: 'Moderate or severe icing reported / forecast?', whenYes: 10 },
      { id: 'thunderstorms', type: 'toggle', label: 'Thunderstorms, heavy precip, or severe turbulence?', whenYes: 10 },
      { id: 'highWinds', type: 'toggle', label: 'Surface winds > 30 kt or crosswind > 15 kt?', whenYes: 5 },
      { id: 'imcEnroute', type: 'toggle', label: 'Forecast IMC or marginal VFR enroute (VFR ops)?', whenYes: 5 },
      { id: 'winterOps', type: 'toggle', label: 'Winter operations — contaminated runway?', whenYes: 5 },
      { id: 'smokeHaze', type: 'toggle', label: 'Smoke, haze, or active wildfire along route?', whenYes: 3 },
      { id: 'nightOps', type: 'toggle', label: 'Night operating segments?', whenYes: 3 },
    ],
  },
  aircraft: {
    title: 'Aircraft',
    items: [
      { id: 'firstAfterMx', type: 'toggle', label: 'First flight after maintenance?', whenYes: 3 },
      { id: 'after15Days', type: 'toggle', label: 'First flight after 15+ days non-use or outside storage?', whenYes: 3 },
      { id: 'newAvionics', type: 'toggle', label: 'Less than 25 hours with newly-installed avionics?', whenYes: 3 },
      { id: 'mxDiscrep', type: 'toggle', label: 'Known maintenance discrepancies (open MEL items)?', whenYes: 5 },
      { id: 'noAutopilot', type: 'toggle', label: 'Inoperative or no autopilot for IFR flight?', whenYes: 5 },
      { id: 'tawsInop', type: 'toggle', label: 'Inoperative TAWS / EGPWS / radar altimeter?', whenYes: 5 },
      { id: 'overdueAnnual', type: 'toggle', label: 'More than 6 months since annual / 100-hr inspection?', whenYes: 2 },
    ],
  },
  mission: {
    title: 'Mission & Environment',
    items: [
      { id: 'highTerrain', type: 'toggle', label: 'High terrain along route or near destination?', whenYes: 3 },
      { id: 'highDA', type: 'toggle', label: 'High density altitude with max-weight takeoff?', whenYes: 3 },
      { id: 'shortRwy', type: 'toggle', label: 'Runway length less than 1.5\u00d7 accelerate-stop?', whenYes: 5 },
      { id: 'unfamAirport', type: 'toggle', label: 'Uncontrolled and/or unfamiliar airport?', whenYes: 3 },
      { id: 'helishopping', type: 'toggle', label: 'Mission previously declined by another operator?', whenYes: 10 },
      { id: 'lowReserve', type: 'toggle', label: 'Projected reserve fuel below 1 hour?', whenYes: 5 },
      { id: 'patientPressure', type: 'toggle', label: 'Patient acuity creating crew time pressure?', whenYes: 3 },
    ],
  },
};

// Computes total FRAT score from a state object { fieldId: value }
const calcFRAT = (data) => {
  let total = 0;
  const breakdown = {};
  for (const section of Object.keys(FRAT_FIELDS)) {
    breakdown[section] = 0;
    for (const item of FRAT_FIELDS[section].items) {
      const v = data[item.id];
      let pts = 0;
      if (item.type === 'toggle') {
        if (v === true && item.whenYes != null) pts = item.whenYes;
        if (v === false && item.whenNo != null) pts = item.whenNo;
        if (v === undefined && item.whenNo != null) pts = item.whenNo;
      } else if (item.type === 'tier') {
        const num = typeof v === 'number' ? v : item.default;
        for (const [threshold, points] of item.tiers) {
          if (num < threshold) { pts = points; break; }
        }
      } else if (item.type === 'cycle') {
        const idx = typeof v === 'number' ? v : (item.default ?? 0);
        pts = item.options[idx]?.[1] ?? 0;
      }
      total += pts;
      breakdown[section] += pts;
    }
  }
  return { total, breakdown };
};

// AC 135-14B-aligned thresholds. HAA programs typically have three tiers
// with PIC-only authority below the lower threshold, supervisor concurrence
// in the middle, and director-level approval (or refusal) above the upper.
const fratStatus = (score) => {
  if (score > 30) return { label: 'NO-GO', color: '#ef4444', bg: '#1f0f0f', text: '#fca5a5',
    advice: 'Director-level approval required. Default action: decline or mitigate.' };
  if (score > 15) return { label: 'CAUTION', color: '#f59e0b', bg: '#1f1a0d', text: '#fcd34d',
    advice: 'OCC supervisor concurrence required before launch. Mitigate where possible.' };
  return { label: 'GO', color: '#10b981', bg: '#0d1f17', text: '#6ee7b7',
    advice: 'PIC authority. Continue normal pre-flight planning.' };
};

// Storage helpers — wraps window.storage with safe fallback
const STORAGE_KEY = 'ems_sim_state_v1';
const HISTORY_KEY = 'ems_sim_history_v1';
const HISTORY_LIMIT = 500;
const PRESETS_KEY = 'ems_sim_frat_presets_v1';
const TOTALS_KEY = 'ems_sim_aircraft_totals_v1';
const SETTINGS_KEY = 'ems_sim_settings_v1';
const ROSTER_KEY = 'ems_sim_crew_roster_v1';
const CREW_STATS_KEY = 'ems_sim_crew_stats_v1';

// Defaults for app preferences
const DEFAULT_SETTINGS = {
  cdr: 'Herman G. Gerhardt',
  plt: 'Brandon Price',
  med: 'Ryan Chamberlain',
  tail: 'N72ET',
  fuel: 75,
  baseColor: 'yellow',
  start: '08:00',
  end: '13:00',
};

// Crew roster — expandable pool per role. Apollo 12 crew added as MED options per request.
const DEFAULT_ROSTER = {
  cdr: ['Herman G. Gerhardt'],
  plt: ['Brandon Price'],
  med: ['Ryan Chamberlain', 'Pete Conrad', 'Dick Gordon', 'Alan Bean'],
};

const saveState = async (state) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (err) { /* silent */ }
};
const loadState = async () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) return JSON.parse(v);
  } catch (err) { /* silent */ }
  return null;
};
const clearState = async () => {
  try { localStorage.removeItem(STORAGE_KEY); }
  catch (err) { /* silent */ }
};

const loadHistory = async () => {
  try {
    const v = localStorage.getItem(HISTORY_KEY);
    if (v) return JSON.parse(v);
  } catch (err) { /* silent */ }
  return [];
};
const saveHistory = async (history) => {
  try {
    const capped = history.slice(0, HISTORY_LIMIT);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(capped));
  } catch (err) { /* silent */ }
};

const fetchTAF = async (icao) => {
  try {
    const url = `https://aviationweather.gov/api/data/taf?ids=${icao}&format=raw`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = (await res.text()).trim();
    if (text && text.length > 10) {
      return { raw: text, source: 'live' };
    }
    return { raw: null, source: 'unavailable' };
  } catch (err) {
    return { raw: null, source: 'unavailable' };
  }
};

// Batch METAR fetch for the area weather overlay — one API call for many ICAOs
const fetchMETARBatch = async (icaos) => {
  try {
    const ids = icaos.join(',');
    const url = `https://aviationweather.gov/api/data/metar?ids=${ids}&format=raw&hours=2`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = (await res.text()).trim();
    const lines = text.split('\n').filter(l => l.trim().length > 10);
    // Match each line to its ICAO (first 4 chars)
    const result = {};
    for (const line of lines) {
      const icao = line.trim().split(/\s+/)[0];
      if (icao && icao.length === 4) result[icao] = line.trim();
    }
    return result;
  } catch (err) {
    return {};
  }
};

// Parse METAR for flight category (VFR / MVFR / IFR / LIFR)
// Returns { category, vis, ceiling, wind, temp, dewp } where defined
const parseMETAR = (raw) => {
  if (!raw) return null;
  const out = { category: 'UNKN' };
  // Visibility — look for `N`SM or `1/2SM` etc.
  const visMatch = raw.match(/\b(\d+(?:\s+\d+\/\d+)?(?:\/\d+)?)SM\b/) || raw.match(/\bM?(\d+\/\d+)SM\b/);
  if (visMatch) {
    let v = visMatch[1];
    // Convert "1 1/2" or "1/2" to decimal
    if (v.includes(' ')) {
      const [whole, frac] = v.split(' ');
      const [n, d] = frac.split('/');
      v = parseInt(whole) + parseInt(n) / parseInt(d);
    } else if (v.includes('/')) {
      const [n, d] = v.split('/');
      v = parseInt(n) / parseInt(d);
    } else {
      v = parseFloat(v);
    }
    out.vis = v;
  }
  // Ceiling — lowest BKN or OVC cloud layer, in hundreds of feet
  const cloudMatches = [...raw.matchAll(/\b(BKN|OVC|VV)(\d{3})\b/g)];
  if (cloudMatches.length > 0) {
    const lowest = Math.min(...cloudMatches.map(m => parseInt(m[2]) * 100));
    out.ceiling = lowest;
  }
  // Wind — direction and speed
  const windMatch = raw.match(/\b(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  if (windMatch) {
    out.wind = {
      dir: windMatch[1] === 'VRB' ? 'VRB' : parseInt(windMatch[1]),
      speed: parseInt(windMatch[2]),
      gust: windMatch[3] ? parseInt(windMatch[3]) : null,
    };
  }
  // Temp/dew point — `M`-prefixed for negative
  const tempMatch = raw.match(/\s(M?\d{2})\/(M?\d{2})\s/);
  if (tempMatch) {
    out.temp = tempMatch[1].startsWith('M') ? -parseInt(tempMatch[1].slice(1)) : parseInt(tempMatch[1]);
    out.dewp = tempMatch[2].startsWith('M') ? -parseInt(tempMatch[2].slice(1)) : parseInt(tempMatch[2]);
  }
  // Flight category logic per FAA standards
  const ceil = out.ceiling ?? 9999;
  const vis = out.vis ?? 99;
  if (ceil < 500 || vis < 1) out.category = 'LIFR';
  else if (ceil < 1000 || vis < 3) out.category = 'IFR';
  else if (ceil < 3000 || vis < 5) out.category = 'MVFR';
  else out.category = 'VFR';
  // Density altitude estimate (rough): DA = PA + 120 * (OAT - ISA)
  // We don't have field elev here, caller can compute with elevation
  return out;
};

// Phase-based fuel burn for the Cirrus SR22 TN.
// Climb burn ~35 GPH (full rich for ~5 min), cruise 17 GPH LOP, descent ~14 GPH.
// Assumes typical climb of 5 min and descent of 5 min, rest at cruise.
const calcFuelBurn = (eteMinutes) => {
  const climbMin = Math.min(5, eteMinutes * 0.25);
  const descentMin = Math.min(5, eteMinutes * 0.2);
  const cruiseMin = Math.max(0, eteMinutes - climbMin - descentMin);
  const climbGal = (climbMin / 60) * 35;
  const cruiseGal = (cruiseMin / 60) * 17;
  const descentGal = (descentMin / 60) * 14;
  return Math.round((climbGal + cruiseGal + descentGal) * 10) / 10;
};

// Fetch PIREPs within a bounding box (aviationweather.gov)
const fetchPireps = async (bbox) => {
  try {
    // bbox: "latSW,lonSW,latNE,lonNE"
    const url = `https://aviationweather.gov/api/data/pirep?bbox=${bbox}&format=raw&age=2`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = (await res.text()).trim();
    if (!text) return [];
    return text.split('\n').map(l => l.trim()).filter(l => l.length > 10);
  } catch (err) {
    return null;
  }
};

// Fetch AIRMETs and SIGMETs
const fetchAirSigmet = async () => {
  try {
    const url = `https://aviationweather.gov/api/data/airsigmet?format=raw`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = (await res.text()).trim();
    if (!text) return [];
    // Filter to bulletins mentioning our operating area (Rocky Mountain / High Plains / SLC / Denver / DEN / SLC ARTCC)
    const bulletins = text.split('\n\n').filter(b => b.trim().length > 30);
    const relevant = bulletins.filter(b => {
      const upper = b.toUpperCase();
      return /\b(SLC|DEN|ZLC|ZDV|COLORADO|UTAH|WYOMING|WESTERN|MOUNTAIN|CO|UT|WY|NM)\b/.test(upper);
    });
    return relevant.slice(0, 8); // cap
  } catch (err) {
    return null;
  }
};

// Fetch winds aloft — regional bulletin (SLC region covers KGJT)
const fetchWindsAloft = async (region = 'slc') => {
  try {
    // 06-hour forecast, low altitude (surface–24k)
    const url = `https://aviationweather.gov/api/data/windtemp?region=${region}&fcst=06&level=low&format=raw`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = (await res.text()).trim();
    if (!text || text.length < 20) return null;
    return text;
  } catch (err) {
    return null;
  }
};

// Sunrise, sunset, civil twilight — via api.sunrise-sunset.org (CORS-enabled, no key)
const fetchSunEvents = async (lat, lon, date) => {
  try {
    const dstr = date ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=${dstr}&formatted=0`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'OK') return null;
    return {
      sunrise: new Date(data.results.sunrise),
      sunset: new Date(data.results.sunset),
      civilBegin: new Date(data.results.civil_twilight_begin),
      civilEnd: new Date(data.results.civil_twilight_end),
    };
  } catch (err) {
    return null;
  }
};

// Fetch active TFRs from FAA — note: many CORS restrictions, so we attempt via aviationweather.gov proxy
const fetchTfrs = async () => {
  try {
    // Try aviationweather.gov's TFR/CWA proxy
    const url = `https://aviationweather.gov/api/data/cwa?format=raw`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = (await res.text()).trim();
    if (!text) return [];
    const items = text.split('\n\n').filter(b => b.trim().length > 20);
    return items.slice(0, 5);
  } catch (err) {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA LINK SELF-TEST — pings every live source and reports status + latency.
// Each test validates not just HTTP 200 but that the payload looks sane.
// ─────────────────────────────────────────────────────────────────────────────
const DATA_LINK_TESTS = [
  {
    id: 'metar',
    label: 'METAR (KGJT)',
    host: 'aviationweather.gov',
    run: async () => {
      const res = await fetch('https://aviationweather.gov/api/data/metar?ids=KGJT&format=raw&hours=2');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = (await res.text()).trim();
      if (!text || text.length < 10 || !text.includes('KGJT')) throw new Error('Empty/invalid payload');
      return text.split('\n')[0].slice(0, 40) + '…';
    },
  },
  {
    id: 'taf',
    label: 'TAF (KGJT)',
    host: 'aviationweather.gov',
    run: async () => {
      const res = await fetch('https://aviationweather.gov/api/data/taf?ids=KGJT&format=raw');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = (await res.text()).trim();
      if (!text || text.length < 10) throw new Error('Empty payload');
      return text.split('\n')[0].slice(0, 40) + '…';
    },
  },
  {
    id: 'batch',
    label: 'BATCH METAR (AREA)',
    host: 'aviationweather.gov',
    run: async () => {
      const res = await fetch('https://aviationweather.gov/api/data/metar?ids=KGJT,KASE,KMTJ&format=raw&hours=2');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = (await res.text()).trim();
      const lines = text.split('\n').filter(l => l.trim().length > 10);
      if (lines.length === 0) throw new Error('No stations returned');
      return `${lines.length} stations`;
    },
  },
  {
    id: 'pirep',
    label: 'PIREPS',
    host: 'aviationweather.gov',
    run: async () => {
      const res = await fetch('https://aviationweather.gov/api/data/pirep?bbox=36.0,-112.5,42.5,-105.5&format=raw&age=2');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = (await res.text()).trim();
      // Zero PIREPs is valid — reachability is what we're testing
      const count = text ? text.split('\n').filter(l => l.trim().length > 10).length : 0;
      return `${count} reports (0 is normal)`;
    },
  },
  {
    id: 'airsigmet',
    label: 'AIRMET / SIGMET',
    host: 'aviationweather.gov',
    run: async () => {
      const res = await fetch('https://aviationweather.gov/api/data/airsigmet?format=raw');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = (await res.text()).trim();
      const count = text ? text.split('\n\n').filter(b => b.trim().length > 30).length : 0;
      return `${count} bulletins`;
    },
  },
  {
    id: 'winds',
    label: 'WINDS ALOFT (SLC)',
    host: 'aviationweather.gov',
    run: async () => {
      const res = await fetch('https://aviationweather.gov/api/data/windtemp?region=slc&fcst=06&level=low&format=raw');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = (await res.text()).trim();
      if (!text || text.length < 20) throw new Error('Empty payload');
      return 'FB bulletin OK';
    },
  },
  {
    id: 'sun',
    label: 'SUN / TWILIGHT',
    host: 'api.sunrise-sunset.org',
    run: async () => {
      const res = await fetch('https://api.sunrise-sunset.org/json?lat=39.1224&lng=-108.5267&formatted=0');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status !== 'OK') throw new Error(`API status: ${data.status}`);
      return 'Ephemeris OK';
    },
  },
];

const runDataLinkTest = async (onProgress) => {
  const results = [];
  for (const test of DATA_LINK_TESTS) {
    const started = performance.now();
    let result;
    try {
      const detail = await Promise.race([
        test.run(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout (10s)')), 10000)),
      ]);
      result = {
        id: test.id, label: test.label, host: test.host,
        ok: true, ms: Math.round(performance.now() - started), detail,
      };
    } catch (err) {
      result = {
        id: test.id, label: test.label, host: test.host,
        ok: false, ms: Math.round(performance.now() - started),
        detail: err.message || 'Failed',
      };
    }
    results.push(result);
    if (onProgress) onProgress([...results]);
  }
  return results;
};

// Flight category color coding (FAA standard: green VFR, blue MVFR, red IFR, magenta LIFR)
const flightCatColor = (cat) => {
  switch (cat) {
    case 'VFR': return { bg: '#0d1f17', text: '#34d399', border: '#10b981' };
    case 'MVFR': return { bg: '#0c1b22', text: '#67e8f9', border: '#22d3ee' };
    case 'IFR': return { bg: '#1f0f0f', text: '#f87171', border: '#ef4444' };
    case 'LIFR': return { bg: '#1f0d1f', text: '#f0abfc', border: '#d946ef' };
    default: return { bg: '#16181f', text: '#a8a29e', border: '#57534e' };
  }
};

const generateMission = (count, baseColor) => {
  const pickup = pick(AIRPORTS);
  const cond = pick(PATIENT_CONDITIONS);
  const ptLb = rand(120, 215);
  const yr = String(new Date().getFullYear()).slice(2);
  return {
    id: `AR-${yr}-${String(count).padStart(3, '0')}`,
    pickup,
    destination: 'KGJT',
    patient: { weightLb: ptLb, weightKg: lbToKg(ptLb), condition: cond.cond, tier: cond.tier },
    metar: null,
    metarSource: 'loading',
    metarStation: null,
    metarDistance: null,
    taf: null,
    tafSource: 'idle',
    baseMetar: null,
    baseMetarSource: 'idle',
    fra: null,
    crew: { CDR: null, PLT: null, MED: null },
    status: 'pending',
    receivedAt: new Date(),
    responseLimitMin: baseColor === 'yellow' ? 65 : 45,
    fuelAtDispatch: null,
    declineReason: null,
    timeline: [],
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function EmsDispatchSimulator() {
  // Inject fonts once
  useEffect(() => {
    const link = document.createElement('link');
    link.href =
      'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;500;700&family=Archivo:wght@400;500;700;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // Phase: setup | active | ended
  const [phase, setPhase] = useState('setup');
  const [shift, setShift] = useState({
    start: '08:00', end: '13:00',
    tail: 'N72ET',
    cdr: 'Herman G. Gerhardt',
    plt: 'Brandon Price',
    med: 'Ryan Chamberlain',
    fuel: 75,
    baseColor: 'yellow',
  });

  // Paper mode — UI preference, persisted across sessions
  const [paperMode, setPaperMode] = useState(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem('ems_sim_paper_mode_v1');
      if (v === 'true') setPaperMode(true);
    } catch (err) { /* silent */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem('ems_sim_paper_mode_v1', String(paperMode)); }
    catch (err) { /* silent */ }
  }, [paperMode]);

  const [now, setNow] = useState(new Date());
  const [missionCount, setMissionCount] = useState(0);
  const [currentMission, setCurrentMission] = useState(null);
  const [missionLog, setMissionLog] = useState([]);
  const [fuelOnBoard, setFuelOnBoard] = useState(60);
  const [baseColor, setBaseColor] = useState('yellow');
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReasonChoice, setDeclineReasonChoice] = useState('Weather below minimums');
  const [showDepartureModal, setShowDepartureModal] = useState(false);
  const [departureLeg, setDepartureLeg] = useState('outbound'); // outbound | inbound | toTransfer
  const [departureForm, setDepartureForm] = useState({ souls: 3, fuel: 75, ete: 45 });
  const [missionPhase, setMissionPhase] = useState('idle'); // idle | outbound | onscene | inbound | transferOffered | enrouteTransfer | atTransfer
  const [sceneArrivalAt, setSceneArrivalAt] = useState(null);
  const [transferDest, setTransferDest] = useState(null);

  // FRAT modal state
  const [showFRAT, setShowFRAT] = useState(false);
  const [fratData, setFratData] = useState({});

  // History viewer
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [detailMission, setDetailMission] = useState(null); // mission object | null
  const [confirmDelete, setConfirmDelete] = useState(null); // {mission, source: 'log'|'history'} | null

  // Area weather overlay
  const [showAreaWx, setShowAreaWx] = useState(false);
  const [areaWx, setAreaWx] = useState({ data: {}, loadedAt: null, loading: false });

  // Live ops feeds: PIREPs, AIRMET/SIGMET, winds aloft, sun events, TFRs/CWAs
  const [liveOps, setLiveOps] = useState({
    pireps: null, airsigmet: null, winds: null, sunKGJT: null, tfrs: null,
    loadedAt: null, loading: false,
  });

  // FRAT presets — save/load named snapshots of FRAT data
  const [fratPresets, setFratPresets] = useState([]);

  // Aircraft total time tracker (cumulative across all shifts)
  const [aircraftTotalMin, setAircraftTotalMin] = useState(0);

  // Shift export
  const [showExport, setShowExport] = useState(false);

  // AI Briefing prompt modal
  const [showAiPrompt, setShowAiPrompt] = useState(false);

  // Settings, map, mission briefing modals
  const [showSettings, setShowSettings] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Crew roster + per-crew-member stats
  const [roster, setRoster] = useState(DEFAULT_ROSTER);
  const [crewStats, setCrewStats] = useState({});

  // Duty time tracking (Part 135 — 2 pilot ops: 10h flight, 14h duty)
  const [shiftStartedAt, setShiftStartedAt] = useState(null);
  const [flightMinutes, setFlightMinutes] = useState(0);

  // KGJT base METAR
  const [baseMetar, setBaseMetar] = useState({ raw: null, source: 'idle', station: null, distance: null });

  // Persistence: load on mount
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      const saved = await loadState();
      if (saved && saved.phase === 'active') {
        setPhase(saved.phase);
        setShift(saved.shift);
        setFuelOnBoard(saved.fuelOnBoard);
        setBaseColor(saved.baseColor);
        setMissionCount(saved.missionCount);
        setMissionLog(saved.missionLog || []);
        setShiftStartedAt(saved.shiftStartedAt ? new Date(saved.shiftStartedAt) : null);
        setFlightMinutes(saved.flightMinutes || 0);
        if (saved.cooldownUntil) setCooldownUntil(new Date(saved.cooldownUntil));
        if (saved.currentMission) {
          const cm = saved.currentMission;
          if (cm.receivedAt) cm.receivedAt = new Date(cm.receivedAt);
          if (cm.timeline) cm.timeline = cm.timeline.map(t => ({ ...t, time: new Date(t.time) }));
          setCurrentMission(cm);
          setMissionPhase(saved.missionPhase || 'idle');
          if (saved.sceneArrivalAt) setSceneArrivalAt(new Date(saved.sceneArrivalAt));
          if (saved.transferDest) setTransferDest(saved.transferDest);
        }
      }
      // Load all-time history
      const h = await loadHistory();
      setHistory(h);
      // Load FRAT presets
      try {
        const v = localStorage.getItem(PRESETS_KEY);
        if (v) setFratPresets(JSON.parse(v));
      } catch (err) { /* silent */ }
      // Load aircraft totals
      try {
        const v = localStorage.getItem(TOTALS_KEY);
        if (v) {
          const totals = JSON.parse(v);
          const tail = shift.tail || 'N72ET';
          setAircraftTotalMin(totals[tail] || 0);
        }
      } catch (err) { /* silent */ }
      // Load app settings; if no in-progress shift exists, apply defaults to shift
      try {
        const v = localStorage.getItem(SETTINGS_KEY);
        if (v) {
          const s = { ...DEFAULT_SETTINGS, ...JSON.parse(v) };
          setSettings(s);
          // Only override shift if we didn't restore an in-progress shift above
          if (!saved) {
            setShift((cur) => ({ ...cur,
              cdr: s.cdr, plt: s.plt, med: s.med,
              tail: s.tail, fuel: s.fuel,
              baseColor: s.baseColor,
              start: s.start, end: s.end,
            }));
          }
        }
      } catch (err) { /* silent */ }
      // Load crew roster — merge with defaults so newly-added defaults surface
      try {
        const v = localStorage.getItem(ROSTER_KEY);
        if (v) {
          const saved = JSON.parse(v);
          setRoster({
            cdr: uniq([...DEFAULT_ROSTER.cdr, ...(saved.cdr || [])]),
            plt: uniq([...DEFAULT_ROSTER.plt, ...(saved.plt || [])]),
            med: uniq([...DEFAULT_ROSTER.med, ...(saved.med || [])]),
          });
        }
      } catch (err) { /* silent */ }
      // Load crew stats
      try {
        const v = localStorage.getItem(CREW_STATS_KEY);
        if (v) setCrewStats(JSON.parse(v));
      } catch (err) { /* silent */ }
      setHasLoaded(true);
    })();
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    if (!hasLoaded) return;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
    catch (err) { /* silent */ }
  }, [settings, hasLoaded]);

  // Save roster
  useEffect(() => {
    if (!hasLoaded) return;
    try { localStorage.setItem(ROSTER_KEY, JSON.stringify(roster)); }
    catch (err) { /* silent */ }
  }, [roster, hasLoaded]);

  // Save crew stats
  useEffect(() => {
    if (!hasLoaded) return;
    try { localStorage.setItem(CREW_STATS_KEY, JSON.stringify(crewStats)); }
    catch (err) { /* silent */ }
  }, [crewStats, hasLoaded]);

  // Save FRAT presets when they change
  useEffect(() => {
    if (!hasLoaded) return;
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(fratPresets)); }
    catch (err) { /* silent */ }
  }, [fratPresets, hasLoaded]);

  // Persistence: save on relevant changes
  useEffect(() => {
    if (!hasLoaded) return;
    if (phase !== 'active') {
      if (phase === 'ended') clearState();
      return;
    }
    saveState({
      phase, shift, fuelOnBoard, baseColor,
      missionCount, missionLog, currentMission, missionPhase,
      sceneArrivalAt: sceneArrivalAt?.toISOString(),
      shiftStartedAt: shiftStartedAt?.toISOString(),
      flightMinutes,
      cooldownUntil: cooldownUntil?.toISOString(),
      transferDest,
    });
  }, [phase, shift, fuelOnBoard, baseColor, missionCount, missionLog,
      currentMission, missionPhase, sceneArrivalAt, shiftStartedAt,
      flightMinutes, cooldownUntil, transferDest, hasLoaded]);

  // Tick clock every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ───────────── ACTIONS ─────────────
  const startShift = async () => {
    setFuelOnBoard(shift.fuel);
    setBaseColor(shift.baseColor);
    setPhase('active');
    setMissionLog([]);
    setMissionCount(0);
    setShiftStartedAt(new Date());
    setFlightMinutes(0);
    // Pull live KGJT METAR up front
    setBaseMetar({ raw: null, source: 'loading', station: null, distance: null });
    const r = await fetchMETAR(KGJT);
    setBaseMetar({ raw: r.raw, source: r.source, station: r.station, distance: r.distance ?? null });
    // Pull sun events for KGJT so header can show sunset countdown
    fetchSunEvents(39.1224, -108.5267).then((sunKGJT) => {
      if (sunKGJT) setLiveOps((prev) => ({ ...prev, sunKGJT }));
    });
  };

  const refreshBaseMetar = async () => {
    setBaseMetar((p) => ({ ...p, source: 'loading' }));
    const r = await fetchMETAR(KGJT);
    setBaseMetar({ raw: r.raw, source: r.source, station: r.station, distance: r.distance ?? null });
  };

  const dispatchNow = async () => {
    if (baseColor === 'red') {
      alert('Base is RED — no dispatches allowed.');
      return;
    }
    // Duty time enforcement (Part 135, 2-pilot ops)
    if (flightMinutes >= 600) {
      alert('Maximum flight time (10 hr) reached. RTB required — no further missions.');
      return;
    }
    if (shiftStartedAt && (now - shiftStartedAt) / 60000 >= 840) {
      alert('Maximum duty time (14 hr) reached. Shift must end.');
      return;
    }
    if (cooldownUntil && now < cooldownUntil) {
      const ok = confirm(
        `Manual cooldown active until ${fmtTime(cooldownUntil)}. Override?`
      );
      if (!ok) return;
    }
    const newCount = missionCount + 1;
    setMissionCount(newCount);
    const m = generateMission(newCount, baseColor);
    m.fuelAtDispatch = fuelOnBoard;
    m.tail = shift.tail;
    // Training mode auto-flags every mission as test
    if (shift.trainingMode) m.isTest = true;
    // 25% chance this is a KGJT-originating interfacility transfer
    if (Math.random() < 0.25) {
      const center = pick(MED_CENTERS);
      m.isOriginTransfer = true;
      m.transferTo = center;
    }
    setCurrentMission(m);
    setCooldownUntil(null);

    // Fetch live METAR
    const metarResult = await fetchMETAR(m.pickup);
    setCurrentMission((prev) => prev && prev.id === m.id
      ? {
          ...prev,
          metar: metarResult.raw,
          metarSource: metarResult.source,
          metarStation: metarResult.station,
          metarDistance: metarResult.distance ?? null,
        }
      : prev);
  };

  const refreshMETAR = async () => {
    if (!currentMission) return;
    setCurrentMission((m) => ({ ...m, metarSource: 'loading' }));
    const metarResult = await fetchMETAR(currentMission.pickup);
    setCurrentMission((prev) => prev
      ? {
          ...prev,
          metar: metarResult.raw,
          metarSource: metarResult.source,
          metarStation: metarResult.station,
          metarDistance: metarResult.distance ?? null,
        }
      : prev);
  };

  const loadTAF = async () => {
    if (!currentMission) return;
    setCurrentMission((m) => ({ ...m, tafSource: 'loading' }));
    const tafResult = await fetchTAF(currentMission.pickup.icao);
    setCurrentMission((prev) => prev
      ? { ...prev, taf: tafResult.raw, tafSource: tafResult.source }
      : prev);
  };

  const loadBaseMETAR = async () => {
    if (!currentMission) return;
    setCurrentMission((m) => ({ ...m, baseMetarSource: 'loading' }));
    const result = await fetchMETAR({ icao: 'KGJT', lat: 39.1224, lon: -108.5267 });
    setCurrentMission((prev) => prev
      ? {
          ...prev,
          baseMetar: result.raw,
          baseMetarSource: result.source,
          baseMetarStation: result.station,
          baseMetarDistance: result.distance ?? null,
        }
      : prev);
  };

  const updateCrew = (role, val) => {
    setCurrentMission((m) => ({ ...m, crew: { ...m.crew, [role]: val } }));
  };

  const updateFRA = (val) => {
    setCurrentMission((m) => ({ ...m, fra: val }));
  };

  const toggleTest = () => {
    setCurrentMission((m) => ({ ...m, isTest: !m.isTest }));
  };

  const acceptMission = () => {
    const m = currentMission;
    if (m.fra === null || m.fra > 30) {
      alert('FRA must be entered and ≤30 to accept (>30 = NO-GO per HAA threshold).');
      return;
    }
    if (Object.values(m.crew).some((v) => v !== 'YES')) {
      alert('All three crew members must say YES to accept.');
      return;
    }
    setMissionPhase('outbound');
    setDepartureLeg('outbound');
    setDepartureForm({ souls: 3, fuel: fuelOnBoard, ete: Math.round(m.pickup.dist / 185 * 60) });
    setShowDepartureModal(true);
  };

  const declineMission = () => {
    setShowDeclineModal(true);
  };

  const confirmDecline = () => {
    const m = { ...currentMission, status: 'declined', declineReason: declineReasonChoice };
    setMissionLog((log) => [...log, m]);
    setCurrentMission(null);
    setShowDeclineModal(false);
    // 5–10 min cooldown after decline
    const cd = new Date(Date.now() + rand(5, 10) * 60 * 1000);
    setCooldownUntil(cd);
    setMissionPhase('idle');
  };

  const confirmDeparture = () => {
    const m = { ...currentMission };
    const burn = calcFuelBurn(departureForm.ete);
    const projLanding = departureForm.fuel - burn;
    m.timeline.push({
      leg: departureLeg,
      time: new Date(),
      souls: departureForm.souls,
      fuel: departureForm.fuel,
      ete: departureForm.ete,
      projLanding,
    });
    setCurrentMission(m);
    setShowDepartureModal(false);
    // Accumulate flight time as soon as we depart
    setFlightMinutes((prev) => prev + departureForm.ete);
    if (departureLeg === 'outbound') {
      // If KGJT-originating transfer, the destination IS the med center
      setMissionPhase('outbound');
    } else if (departureLeg === 'toTransfer') {
      setMissionPhase('enrouteTransfer');
    } else {
      setMissionPhase('inbound');
      // Auto-fetch KGJT METAR for the return leg
      setTimeout(() => loadBaseMETAR(), 100);
    }
  };

  const arriveOnScene = () => {
    setSceneArrivalAt(new Date());
    setMissionPhase('onscene');
  };

  const departScene = () => {
    // KGJT-originating transfer: scene becomes the only stop, then return to KGJT
    if (currentMission?.isOriginTransfer) {
      setDepartureLeg('inbound');
      const lastFuel = currentMission.timeline[0].projLanding;
      setDepartureForm({
        souls: 3,
        fuel: Math.round(lastFuel),
        ete: Math.round(currentMission.pickup.dist / 185 * 60),
      });
      setShowDepartureModal(true);
      return;
    }
    // 25% chance the receiving facility wants the patient at a higher level of care
    if (Math.random() < 0.25) {
      // Pick the closest med center to the pickup
      const sorted = [...MED_CENTERS]
        .map((c) => ({ ...c, _d: haversineNM(currentMission.pickup.lat, currentMission.pickup.lon, c.lat, c.lon) }))
        .sort((a, b) => a._d - b._d);
      const offer = sorted[0];
      setTransferDest({ ...offer, distFromPickup: Math.round(offer._d) });
      setMissionPhase('transferOffered');
      return;
    }
    // Normal return-to-base
    setDepartureLeg('inbound');
    const lastFuel = currentMission.timeline[0].projLanding;
    setDepartureForm({
      souls: 4,
      fuel: Math.round(lastFuel),
      ete: Math.round(currentMission.pickup.dist / 185 * 60),
    });
    setShowDepartureModal(true);
  };

  const acceptTransfer = () => {
    setDepartureLeg('toTransfer');
    const lastFuel = currentMission.timeline[0].projLanding;
    setDepartureForm({
      souls: 4,
      fuel: Math.round(lastFuel),
      ete: Math.round(transferDest.distFromPickup / 185 * 60),
    });
    setShowDepartureModal(true);
  };

  const declineTransfer = () => {
    setTransferDest(null);
    setDepartureLeg('inbound');
    const lastFuel = currentMission.timeline[0].projLanding;
    setDepartureForm({
      souls: 4,
      fuel: Math.round(lastFuel),
      ete: Math.round(currentMission.pickup.dist / 185 * 60),
    });
    setShowDepartureModal(true);
  };

  const arriveAtTransfer = () => {
    // Now departing transfer back to KGJT
    setMissionPhase('atTransfer');
  };

  const departTransfer = () => {
    setDepartureLeg('inbound');
    const lastFuel = currentMission.timeline[currentMission.timeline.length - 1].projLanding;
    setDepartureForm({
      souls: 3,
      fuel: Math.round(lastFuel),
      ete: Math.round(transferDest.distFromGJT / 185 * 60),
    });
    setShowDepartureModal(true);
  };

  const completeMission = () => {
    const m = { ...currentMission, status: 'completed', transferDest };

    if (m.isTest) {
      // Test/sim mission — reverse any flight time accumulated and skip log/fuel/cooldown
      const totalEte = (m.timeline || []).reduce((sum, leg) => sum + (leg.ete || 0), 0);
      setFlightMinutes((prev) => Math.max(0, prev - totalEte));
      setCurrentMission(null);
      setMissionPhase('idle');
      setSceneArrivalAt(null);
      setTransferDest(null);
      // Don't add to log, don't change fuel, don't trigger cooldown
      return;
    }

    setMissionLog((log) => [...log, m]);
    const finalFuel = m.timeline[m.timeline.length - 1]?.projLanding ?? fuelOnBoard;
    setFuelOnBoard(Math.max(0, Math.round(finalFuel)));
    setCurrentMission(null);
    setMissionPhase('idle');
    setSceneArrivalAt(null);
    setTransferDest(null);
    // 30–45 min cooldown after completion
    const cd = new Date(Date.now() + rand(30, 45) * 60 * 1000);
    setCooldownUntil(cd);
  };

  const endShift = () => {
    if (currentMission || missionPhase !== 'idle') {
      const ok = confirm('Mission still in progress. End shift anyway?');
      if (!ok) return;
    }
    // Archive this shift's missions into all-time history with shift metadata
    if (missionLog.length > 0) {
      const shiftId = shiftStartedAt
        ? shiftStartedAt.toISOString()
        : new Date().toISOString();
      const shiftLabel = shiftStartedAt
        ? `${shiftStartedAt.toISOString().slice(0, 10)} ${shift.start}–${shift.end}`
        : new Date().toISOString().slice(0, 10);
      const archived = missionLog.map((m) => ({
        ...m,
        shiftId,
        shiftLabel,
        archivedAt: new Date().toISOString(),
      }));
      const updated = [...archived, ...history];
      setHistory(updated);
      saveHistory(updated);
    }
    // Accumulate completed flight time on this aircraft's total
    if (flightMinutes > 0 && shift.tail) {
      try {
        const v = localStorage.getItem(TOTALS_KEY);
        const totals = v ? JSON.parse(v) : {};
        totals[shift.tail] = (totals[shift.tail] || 0) + flightMinutes;
        localStorage.setItem(TOTALS_KEY, JSON.stringify(totals));
        setAircraftTotalMin(totals[shift.tail]);
      } catch (err) { /* silent */ }
    }
    // Accumulate per-crew stats (only if not training mode)
    if (!shift.trainingMode) {
      const completedNonTest = missionLog.filter(m => m.status === 'completed' && !m.isTest);
      const declinedAll = missionLog.filter(m => m.status === 'declined' && !m.isTest);
      const totalNonTest = missionLog.filter(m => !m.isTest);
      const missionMinutes = completedNonTest.reduce((s, m) => {
        const round = 2 * Math.round((m.pickup?.dist || 0) / 185 * 60);
        return s + round;
      }, 0);
      const fraScores = totalNonTest.filter(m => m.fra != null).map(m => m.fra);

      setCrewStats((prev) => {
        const next = { ...prev };
        const roles = [
          { name: shift.cdr, role: 'cdr' },
          { name: shift.plt, role: 'plt' },
          { name: shift.med, role: 'med' },
        ];
        roles.forEach(({ name, role }) => {
          if (!name || !name.trim()) return;
          const existing = next[name] || {
            missions: { total: 0, completed: 0, declined: 0 },
            flightMinutes: 0,
            fraScoresSum: 0,
            fraScoresCount: 0,
            rolesFlown: { cdr: 0, plt: 0, med: 0 },
            shifts: 0,
            lastShift: null,
          };
          next[name] = {
            ...existing,
            missions: {
              total: existing.missions.total + totalNonTest.length,
              completed: existing.missions.completed + completedNonTest.length,
              declined: existing.missions.declined + declinedAll.length,
            },
            flightMinutes: existing.flightMinutes + missionMinutes,
            fraScoresSum: existing.fraScoresSum + fraScores.reduce((a, b) => a + b, 0),
            fraScoresCount: existing.fraScoresCount + fraScores.length,
            rolesFlown: {
              ...existing.rolesFlown,
              [role]: existing.rolesFlown[role] + 1,
            },
            shifts: existing.shifts + 1,
            lastShift: new Date().toISOString().slice(0, 10),
          };
        });
        return next;
      });
    }
    setPhase('ended');
    clearState();
  };

  const newShift = () => {
    setPhase('setup');
    setMissionLog([]);
    setMissionCount(0);
    setCurrentMission(null);
    setCooldownUntil(null);
    setMissionPhase('idle');
    setSceneArrivalAt(null);
    setFlightMinutes(0);
    setShiftStartedAt(null);
    setTransferDest(null);
    // Re-apply current settings defaults to the shift form
    setShift({
      start: settings.start, end: settings.end,
      tail: settings.tail,
      cdr: settings.cdr, plt: settings.plt, med: settings.med,
      fuel: settings.fuel,
      baseColor: settings.baseColor,
    });
    setFuelOnBoard(settings.fuel);
  };

  // Remove a mission from the current shift's log
  const removeFromLog = (missionId) => {
    setMissionLog((log) => log.filter((m) => m.id !== missionId));
  };

  // Remove a mission from all-time history
  const removeFromHistory = (missionId) => {
    setHistory((h) => {
      const updated = h.filter((m) => m.id !== missionId);
      saveHistory(updated);
      return updated;
    });
  };

  // Clear all history (with confirmation in caller)
  const clearAllHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  // Fetch METAR for all area airports + KGJT
  const fetchAreaWx = async () => {
    setAreaWx({ data: {}, loadedAt: null, loading: true });
    setLiveOps((prev) => ({ ...prev, loading: true }));
    const allIcaos = ['KGJT', ...AIRPORTS.map(a => a.icao), ...MED_CENTERS.map(c => c.icao)];
    // Bounding box for PIREPs: encompasses KGJT + all dispatch airports
    const latSW = 36.0, lonSW = -112.5, latNE = 42.5, lonNE = -105.5;
    const bbox = `${latSW},${lonSW},${latNE},${lonNE}`;
    // Fire them all off in parallel
    const [data, pireps, airsigmet, winds, sunKGJT, tfrs] = await Promise.all([
      fetchMETARBatch(allIcaos),
      fetchPireps(bbox),
      fetchAirSigmet(),
      fetchWindsAloft('slc'),
      fetchSunEvents(39.1224, -108.5267),
      fetchTfrs(),
    ]);
    setAreaWx({ data, loadedAt: new Date(), loading: false });
    setLiveOps({ pireps, airsigmet, winds, sunKGJT, tfrs, loadedAt: new Date(), loading: false });
  };

  // FRAT preset actions
  const saveFratPreset = () => {
    const name = prompt('Name this preset:\n(e.g. "Winter Western Slope", "Summer monsoon")');
    if (!name) return;
    const preset = {
      id: Date.now().toString(),
      name: name.trim(),
      data: { ...fratData },
      savedAt: new Date().toISOString(),
    };
    setFratPresets((prev) => [...prev, preset]);
  };
  const loadFratPreset = (preset) => {
    setFratData({ ...preset.data });
  };
  const deleteFratPreset = (id) => {
    setFratPresets((prev) => prev.filter(p => p.id !== id));
  };

  // Build text summary of the current shift for export
  const buildShiftExport = () => {
    const lines = [];
    const dt = (shiftStartedAt || new Date()).toISOString().slice(0, 10);
    lines.push('═══════════════════════════════════════');
    lines.push('  SOUTHEAST TEXAS AIR RESCUE');
    lines.push('  KGJT BASE · SHIFT SUMMARY');
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push(`Date:        ${dt}`);
    lines.push(`Shift:       ${shift.start}–${shift.end} MDT`);
    lines.push(`Aircraft:    ${shift.tail || 'N72ET'} (Cirrus SR22 TN)`);
    lines.push(`Crew:`);
    lines.push(`  CDR:       ${shift.cdr}`);
    lines.push(`  PLT:       ${shift.plt}`);
    lines.push(`  MED:       ${shift.med}`);
    lines.push('');
    const flightH = Math.floor(flightMinutes / 60);
    const flightM = flightMinutes % 60;
    lines.push(`Flight time: ${flightH}:${String(flightM).padStart(2, '0')}`);
    const completed = missionLog.filter(m => m.status === 'completed');
    const declined = missionLog.filter(m => m.status === 'declined');
    lines.push(`Missions:    ${missionLog.length} (${completed.length} completed, ${declined.length} declined)`);
    const totalNM = completed.reduce((s, m) => s + (m.pickup?.dist || 0) * 2, 0);
    lines.push(`Distance:    ${totalNM} NM (round-trip estimate)`);
    lines.push('');
    lines.push('───────────────────────────────────────');
    lines.push('  MISSION LOG');
    lines.push('───────────────────────────────────────');
    if (missionLog.length === 0) {
      lines.push('  No missions this shift.');
    } else {
      missionLog.forEach((m) => {
        lines.push('');
        lines.push(`${m.id} · ${m.pickup?.icao} · ${m.pickup?.dist} NM`);
        lines.push(`  ${m.status === 'completed' ? '✓ COMPLETED' : '✗ DECLINED'}`);
        if (m.fra != null) lines.push(`  FRA: ${m.fra} (${m.fra > 30 ? 'NO-GO' : m.fra > 15 ? 'CAUTION' : 'GO'})`);
        if (m.declineReason) lines.push(`  Reason: ${m.declineReason}`);
        if (m.patient) lines.push(`  Patient: ${m.patient.tier?.toUpperCase()} — ${m.patient.condition}, ${m.patient.weightLb} lb`);
        if (m.isOriginTransfer && m.transferTo) lines.push(`  Transfer to: ${m.transferTo.icao} (${m.transferTo.region})`);
        if (m.transferDest && !m.isOriginTransfer) lines.push(`  Diverted to: ${m.transferDest.icao} (${m.transferDest.region})`);
      });
    }
    lines.push('');
    lines.push('───────────────────────────────────────');
    lines.push(`  Aircraft total (${shift.tail || 'N72ET'}): ${Math.floor((aircraftTotalMin + flightMinutes) / 60)}:${String((aircraftTotalMin + flightMinutes) % 60).padStart(2, '0')}`);
    lines.push('───────────────────────────────────────');
    lines.push('');
    lines.push('Training simulator output — not an operational record.');
    lines.push(`Generated ${new Date().toISOString()}`);
    return lines.join('\n');
  };

  // ───────────── AI BRIEFING PROMPT BUILDER ─────────────
  // Produces a copy-paste-ready prompt for ChatGPT, Grok, or any LLM.
  // Includes full mission/shift context + a role instruction up top.
  const buildAiPrompt = (role) => {
    const lines = [];
    const roleBlocks = {
      instructor: `You are a Part 135 Air Medical (EMS) dispatch instructor and a senior fixed-wing pilot familiar with FAA AC 135-14B, 14 CFR Part 135, and the Cirrus SR22 TN (Tornado Alley turbonormalized). I am running a personal-use dispatch simulator for the Southeast Texas Air Rescue scenario based out of KGJT. Below is the briefing for a mission/shift. Review it like you're sitting beside me in OCC. Flag anything you'd push back on, anything I should dig deeper on, and what you'd say to the pilot before launch. Do not be polite — be direct and operationally grounded.`,
      copilot: `You are my SIC/copilot for a Cirrus SR22 TN single-pilot IFR Part 135 EMS flight out of KGJT for Southeast Texas Air Rescue. We're crewing together. Walk me through this briefing turn by turn. What's our plan, what are our weights and fuel state, what are the threats, what's our out if things go sideways? Talk to me like a pilot — fuel/weather/route/weight first, patient comfort second.`,
      chief: `You are my Director of Operations / Chief Pilot for Southeast Texas Air Rescue (Part 135 fixed-wing EMS, Cirrus SR22 TN). Critique the decisions reflected in this briefing. If I declined a flight, was the call defensible? If I accepted, was the FRAT honest? What patterns in my shift would you bring up in a quarterly review? Don't soften it.`,
      dispatch: `You are a Part 135 EMS Operations Control Center (OCC) coordinator. Below is an active mission briefing in my hands. Help me sanity-check the dispatch: weather decision, weight & balance plausibility, fuel reserve adequacy, transfer routing logic, and any risk-management items I might have missed. Reference the actual FAA reg or POH item when relevant.`,
    };
    lines.push('# ROLE');
    lines.push(roleBlocks[role] || roleBlocks.instructor);
    lines.push('');
    lines.push('# OPERATIONAL CONTEXT');
    lines.push('Operator:    Southeast Texas Air Rescue (Beaumont, TX HQ)');
    lines.push('Base:        Grand Junction Regional (KGJT) — Western Slope, Colorado');
    lines.push(`Aircraft:    ${shift.tail || 'N72ET'} (Cirrus SR22 TN, Tornado Alley turbonormalized IO-550-N)`);
    lines.push('Performance: 185 KTAS cruise, 17 GPH cruise LOP, 81 gal usable, 25,000 ft service ceiling');
    lines.push('             3400 lb MTOW, 2250 lb empty, 1150 lb useful load');
    lines.push('Crew model:  CDR + PLT + MED (2-pilot Part 135: 10h flight / 14h duty / 10h rest)');
    lines.push('Mission radius: 230 NM. Response window: 45 min Green / 65 min Yellow / Red = no dispatch');
    lines.push('');
    lines.push('# CURRENT SHIFT');
    const dt = (shiftStartedAt || new Date()).toISOString().slice(0, 10);
    lines.push(`Date:        ${dt}`);
    lines.push(`Window:      ${shift.start}–${shift.end} MDT`);
    lines.push(`Base color:  ${shift.baseColor.toUpperCase()}`);
    lines.push(`CDR:         ${shift.cdr}`);
    lines.push(`PLT:         ${shift.plt}`);
    lines.push(`MED:         ${shift.med}`);
    lines.push(`Fuel on board: ${fuelOnBoard} gal`);
    const flightH = Math.floor(flightMinutes / 60);
    const flightM = flightMinutes % 60;
    lines.push(`Flight time:   ${flightH}:${String(flightM).padStart(2, '0')} (limit 10:00)`);
    if (shift.trainingMode) lines.push('TRAINING MODE — practice only, no real record');
    if (liveOps.sunKGJT) {
      const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      lines.push(`Sunrise/sunset (KGJT): ${fmt(liveOps.sunKGJT.sunrise)} / ${fmt(liveOps.sunKGJT.sunset)}`);
      lines.push(`Civil twilight: ${fmt(liveOps.sunKGJT.civilBegin)} / ${fmt(liveOps.sunKGJT.civilEnd)}`);
    }
    lines.push('');

    // Active mission
    if (currentMission) {
      const m = currentMission;
      lines.push('# ACTIVE MISSION BRIEFING');
      lines.push(`Mission ID:  ${m.id}`);
      lines.push(`Tier:        ${(m.patient?.tier || '').toUpperCase()}`);
      lines.push(`Patient:     ${m.patient?.condition}, ${m.patient?.weightLb} lb`);
      lines.push('');
      lines.push('## ROUTING');
      lines.push(`Pickup:      ${m.pickup?.icao} — ${m.pickup?.name}, ${m.pickup?.city}`);
      lines.push(`Distance:    ${m.pickup?.dist} NM from KGJT`);
      lines.push(`Runway:      ${m.pickup?.rwy} ft`);
      lines.push(`Estimated ETE (one-way at 185 KTAS): ${Math.round(m.pickup?.dist / 185 * 60)} min`);
      if (m.isOriginTransfer && m.transferTo) {
        lines.push('');
        lines.push(`## INTERFACILITY TRANSFER (post-pickup destination)`);
        lines.push(`Destination: ${m.transferTo.icao} — ${m.transferTo.name}, ${m.transferTo.region}`);
        lines.push(`Pickup → destination: ${m.transferTo.distFromPickup} NM`);
      }
      lines.push('');
      lines.push('## WEATHER');
      if (m.metar && m.metarSource !== 'unavailable') {
        const srcNote = m.metarSource === 'nearest'
          ? ` (nearest station ${m.metarStation}, ${m.metarDistance} NM from field — no METAR at ${m.pickup?.icao})`
          : ' (live, aviationweather.gov)';
        lines.push(`Pickup METAR${srcNote}: ${m.metar}`);
      } else if (m.metarSource === 'unavailable') {
        lines.push('Pickup METAR: NO LIVE DATA AVAILABLE — treat weather as unknown, this is a risk factor');
      } else {
        lines.push('Pickup METAR: not yet fetched');
      }
      if (m.taf && m.tafSource === 'live') lines.push(`Pickup TAF: ${m.taf}`);
      lines.push('');
      lines.push('## FRAT');
      if (m.fra != null) {
        const status = m.fra > 30 ? 'NO-GO (>30 → Director approval required)'
          : m.fra > 15 ? 'CAUTION (16-30 → OCC supervisor)'
          : 'GO (≤15 → PIC authority)';
        lines.push(`Score: ${m.fra} — ${status}`);
      } else {
        lines.push('Not yet completed.');
      }
      lines.push('');
      if (m.status === 'declined') {
        lines.push(`## DECLINED`);
        lines.push(`Reason: ${m.declineReason || 'unspecified'}`);
      }
    } else {
      lines.push('# CURRENT STATE');
      lines.push('No active mission. Standing by.');
    }

    // Recent missions summary
    if (missionLog.length > 0) {
      lines.push('');
      lines.push('# SHIFT SO FAR');
      const completed = missionLog.filter(m => m.status === 'completed');
      const declined = missionLog.filter(m => m.status === 'declined');
      lines.push(`${missionLog.length} missions dispatched — ${completed.length} completed, ${declined.length} declined`);
      missionLog.slice(0, 5).forEach(m => {
        const tag = m.status === 'completed' ? '✓' : '✗';
        const fraTxt = m.fra != null ? ` (FRA ${m.fra})` : '';
        const reasonTxt = m.declineReason ? ` — ${m.declineReason}` : '';
        lines.push(`  ${tag} ${m.id} ${m.pickup?.icao} ${m.pickup?.dist}NM${fraTxt}${reasonTxt}`);
      });
    }

    lines.push('');
    lines.push('# WHAT I WANT FROM YOU');
    if (role === 'instructor') {
      lines.push('Treat this as a teaching moment. Walk through the briefing, flag risks, and ask me questions that test my decision-making. Cite the relevant FAA reg or POH item when you push back.');
    } else if (role === 'copilot') {
      lines.push('Brief it with me. Make sure I haven\'t missed anything. If something feels off, say so. Suggest the actual numbers (fuel reserves, weight, FRAT factors).');
    } else if (role === 'chief') {
      lines.push('Audit the decision-making in this shift. If I cut corners, say so. If I made the right call for the wrong reason, say so. I want the brutal version, not the polite one.');
    } else {
      lines.push('Sanity-check the dispatch. Walk weather, weight, fuel, routing, FRAT. Flag what I missed. Suggest alternates.');
    }
    lines.push('');
    lines.push('---');
    lines.push('(Generated by Southeast Texas Air Rescue dispatch simulator — training tool, not operational.)');
    return lines.join('\n');
  };

  // ───────────── RENDER ─────────────
  const fontStack = { fontFamily: "'Archivo', system-ui, sans-serif" };
  const monoFont = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };
  const displayFont = { fontFamily: "'Bebas Neue', 'Archivo', sans-serif", letterSpacing: '0.04em' };

  // Splash screen — shows briefly on app load
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 1600);
    return () => clearTimeout(t);
  }, []);

  if (!splashDone || !hasLoaded) {
    return <SplashScreen displayFont={displayFont} monoFont={monoFont} />;
  }

  if (phase === 'setup') {
    return <SetupScreen shift={shift} setShift={setShift} startShift={startShift}
      paperMode={paperMode} setPaperMode={setPaperMode}
      roster={roster} setRoster={setRoster} crewStats={crewStats}
      fontStack={fontStack} monoFont={monoFont} displayFont={displayFont} />;
  }

  if (phase === 'ended') {
    return <EndedScreen log={missionLog} shift={shift} newShift={newShift}
      paperMode={paperMode}
      fontStack={fontStack} monoFont={monoFont} displayFont={displayFont} />;
  }

  // ACTIVE
  const accepted = missionLog.filter((m) => m.status === 'completed').length;
  const declined = missionLog.filter((m) => m.status === 'declined').length;

  return (
    <div
      className={'min-h-screen text-stone-100 ' + (paperMode ? 'paper-mode' : '')}
      style={{ ...fontStack, backgroundColor: '#0a0b0f' }}
    >
      <PaperModeStyles />
      <PaperModeToggle paperMode={paperMode} setPaperMode={setPaperMode} />
      {/* Top status strip */}
      <div className="border-b-2" style={{ borderColor: '#c8202c66', backgroundColor: '#1e2952' }}>
        <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <img src={TEX.patch} alt="Air Rescue" className="w-10 h-10 shrink-0"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
            <div>
              <div style={displayFont} className="flex items-baseline gap-1.5 leading-none">
                <span className="text-2xl" style={{
                  color: '#f5c518',
                  WebkitTextStroke: '0.5px #fafaf9',
                  textShadow: '1px 1px 0 #000',
                }}>AIR</span>
                <span className="text-2xl" style={{
                  color: '#c8202c',
                  WebkitTextStroke: '0.5px #fafaf9',
                  letterSpacing: '0.02em',
                  textShadow: '1px 1px 0 #000',
                }}>RESCUE</span>
              </div>
              <div style={monoFont} className="text-[9px] tracking-[0.25em] uppercase mt-1 flex items-center gap-1.5 flex-wrap">
                <span style={{ color: '#f5c518' }}>SOUTHEAST TX</span>
                <span style={{ color: '#57534e' }}>·</span>
                <span style={{ color: '#fafaf9' }}>KGJT BASE</span>
                <span style={{ color: '#57534e' }}>·</span>
                <span style={{ color: '#c0c4c8' }}>{shift.tail || 'N72ET'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div style={monoFont} className="text-2xl tracking-wider text-stone-50 font-bold">{fmtClock(now)}</div>
              <div style={monoFont} className="text-[10px] text-stone-300 uppercase tracking-widest">
                {now.toLocaleDateString()} · MDT
              </div>
              {liveOps.sunKGJT && (
                <div className="text-[9px] uppercase tracking-widest mt-1 font-bold"
                  style={{ ...monoFont, color: '#fcd34d' }}>
                  {(() => {
                    const set = liveOps.sunKGJT.sunset;
                    const civilEnd = liveOps.sunKGJT.civilEnd;
                    if (now < set) {
                      const mins = Math.round((set - now) / 60000);
                      const h = Math.floor(mins / 60), m = mins % 60;
                      return `SUNSET IN ${h}:${String(m).padStart(2,'0')}`;
                    } else if (now < civilEnd) {
                      return `CIVIL TWILIGHT · SUNSET ${set.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
                    } else {
                      return `NIGHT · SUNRISE ${liveOps.sunKGJT.sunrise > now ? liveOps.sunKGJT.sunrise.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '——'}`;
                    }
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ backgroundColor: '#c8202c20' }}>
        <StatusTile
          label="BASE STATUS"
          value={baseColor.toUpperCase()}
          accent={baseColor}
          onChange={(v) => setBaseColor(v)}
          options={['green', 'yellow', 'red']}
          mono={monoFont}
        />
        <StatusTile
          label="FUEL ONBOARD"
          value={`${fuelOnBoard} GAL`}
          accent={fuelOnBoard < 30 ? 'red' : fuelOnBoard < 50 ? 'yellow' : 'green'}
          editable
          numeric
          onValueChange={(v) => setFuelOnBoard(parseInt(v) || 0)}
          mono={monoFont}
        />
        <StatusTile
          label="SHIFT"
          value={`${shift.start}–${shift.end}`}
          accent="dim"
          mono={monoFont}
        />
        <StatusTile
          label="FLIGHT TIME"
          value={`${Math.floor(flightMinutes / 60)}:${String(flightMinutes % 60).padStart(2, '0')}`}
          accent={flightMinutes >= 600 ? 'red' : flightMinutes >= 480 ? 'yellow' : 'dim'}
          mono={monoFont}
        />
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Training mode banner — visible whole shift when enabled */}
        {shift.trainingMode && (
          <div className="relative border-2 px-4 py-3 overflow-hidden"
            style={{ borderColor: '#8a1e2c', backgroundColor: 'rgba(240,220,190,0.15)' }}>
            <img src={TEX.trainingStamp} alt="TRAINING"
              className="absolute -right-4 top-1/2 h-16 opacity-40 pointer-events-none"
              style={{ transform: 'translateY(-50%) rotate(-4deg)' }} />
            <div className="flex items-center gap-3 relative">
              <img src={TEX.trainingStamp} alt="TRAINING" className="h-8"
                style={{ transform: 'rotate(-6deg)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />
              <div style={{ ...monoFont, color: '#c85050' }} className="text-[10px] font-bold tracking-widest flex-1">
                All missions auto-flagged as TEST · nothing logged
              </div>
            </div>
          </div>
        )}

        {/* KGJT METAR banner */}
        <BaseMetarBanner metar={baseMetar} onRefresh={refreshBaseMetar} mono={monoFont} />

        {/* Cooldown banner */}
        {cooldownUntil && now < cooldownUntil && !currentMission && (
          <div
            className="border-2 border-amber-500/50 px-4 py-2 flex items-center gap-3"
            style={{ backgroundColor: '#1f1a0d' }}
          >
            <Clock className="w-4 h-4" style={{ color: '#fbbf24' }} />
            <div style={{ ...monoFont, color: '#fcd34d' }} className="text-xs font-bold">
              COOLDOWN ACTIVE · DISPATCH ELIGIBLE AT {fmtTime(cooldownUntil)}
            </div>
          </div>
        )}

        {/* Duty time warnings */}
        {flightMinutes >= 600 && (
          <div className="border-2 px-4 py-2 flex items-center gap-3"
            style={{ borderColor: '#ef4444', backgroundColor: '#1f0f0f' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: '#f87171' }} />
            <div style={{ ...monoFont, color: '#fca5a5' }} className="text-xs font-bold">
              MAX FLIGHT TIME REACHED · NO FURTHER MISSIONS · RTB
            </div>
          </div>
        )}
        {flightMinutes < 600 && flightMinutes >= 480 && (
          <div className="border-2 px-4 py-2 flex items-center gap-3"
            style={{ borderColor: '#f59e0b', backgroundColor: '#1f1a0d' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: '#fbbf24' }} />
            <div style={{ ...monoFont, color: '#fcd34d' }} className="text-xs font-bold">
              APPROACHING FLIGHT TIME LIMIT · {Math.floor((600 - flightMinutes) / 60)}H {(600 - flightMinutes) % 60}M REMAINING
            </div>
          </div>
        )}

        {/* Mission panel or idle */}
        {currentMission ? (
          <MissionPanel
            m={currentMission}
            missionPhase={missionPhase}
            sceneArrivalAt={sceneArrivalAt}
            transferDest={transferDest}
            now={now}
            updateCrew={updateCrew}
            updateFRA={updateFRA}
            toggleTest={toggleTest}
            openFRAT={() => setShowFRAT(true)}
            acceptMission={acceptMission}
            declineMission={declineMission}
            arriveOnScene={arriveOnScene}
            departScene={departScene}
            acceptTransfer={acceptTransfer}
            declineTransfer={declineTransfer}
            arriveAtTransfer={arriveAtTransfer}
            departTransfer={departTransfer}
            completeMission={completeMission}
            refreshMETAR={refreshMETAR}
            loadTAF={loadTAF}
            loadBaseMETAR={loadBaseMETAR}
            mono={monoFont}
            display={displayFont}
          />
        ) : (
          <IdlePanel
            dispatchNow={dispatchNow}
            baseColor={baseColor}
            cooldownUntil={cooldownUntil}
            now={now}
            mono={monoFont}
            display={displayFont}
          />
        )}

        {/* Mission log */}
        <MissionLog log={missionLog}
          onView={(m) => setDetailMission(m)}
          onDelete={(m) => setConfirmDelete({ mission: m, source: 'log' })}
          mono={monoFont} display={displayFont} />

        {/* Bottom actions */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={() => { setShowAreaWx(true); if (!areaWx.loadedAt) fetchAreaWx(); }}
            className="border-2 px-4 py-3 transition-all font-bold"
            style={{ ...monoFont, borderColor: '#10b981', backgroundColor: '#0d1f17', color: '#34d399' }}
          >
            <Cloud className="w-4 h-4 inline mr-2" />
            <span className="text-xs tracking-widest">AREA WX</span>
          </button>
          <button
            onClick={() => setShowMap(true)}
            className="border-2 px-4 py-3 transition-all font-bold"
            style={{ ...monoFont, borderColor: '#fbbf24', backgroundColor: '#1c1505', color: '#fcd34d' }}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            <span className="text-xs tracking-widest">AREA MAP</span>
          </button>
          {currentMission && (
            <button
              onClick={() => setShowBriefing(true)}
              className="border-2 px-4 py-3 transition-all font-bold col-span-2"
              style={{ ...monoFont, borderColor: '#f5c518', backgroundColor: '#1a1505', color: '#fcd34d' }}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              <span className="text-xs tracking-widest">DISPATCH BRIEFING</span>
            </button>
          )}
          <button
            onClick={() => setShowHistory(true)}
            className="border-2 px-4 py-3 transition-all font-bold"
            style={{ ...monoFont, borderColor: '#22d3ee', backgroundColor: '#0c1b22', color: '#67e8f9' }}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            <span className="text-xs tracking-widest">FLIGHT HISTORY ({history.length})</span>
          </button>
          <button
            onClick={() => setShowAiPrompt(true)}
            className="border-2 px-4 py-3 transition-all font-bold"
            style={{ ...monoFont, borderColor: '#a78bfa', backgroundColor: '#1a132a', color: '#c4b5fd' }}
          >
            <Radio className="w-4 h-4 inline mr-2" />
            <span className="text-xs tracking-widest">AI BRIEFING</span>
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="border-2 px-4 py-3 transition-all font-bold"
            style={{ ...monoFont, borderColor: '#84cc16', backgroundColor: '#0f1605', color: '#bef264' }}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            <span className="text-xs tracking-widest">EXPORT SHIFT</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="border-2 px-4 py-3 transition-all font-bold"
            style={{ ...monoFont, borderColor: '#78716c', backgroundColor: '#1c1917', color: '#d6d3d1' }}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            <span className="text-xs tracking-widest">SETTINGS</span>
          </button>
          <button
            onClick={endShift}
            className="border-2 border-stone-600 hover:border-red-500 px-4 py-3 transition-all font-bold col-span-2"
            style={{ ...monoFont, backgroundColor: '#1c1917', color: '#e7e5e4' }}
          >
            <Power className="w-4 h-4 inline mr-2" />
            <span className="text-xs tracking-widest">END SHIFT</span>
          </button>
        </div>

        <div className="pt-4 pb-6 border-t" style={{ borderColor: '#c8202c22' }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span style={{ ...displayFont, color: '#f5c518',
              WebkitTextStroke: '0.5px #fafaf9', textShadow: '1px 1px 0 #000' }} className="text-base">AIR</span>
            <span style={{ ...displayFont, color: '#c8202c',
              WebkitTextStroke: '0.5px #fafaf9', textShadow: '1px 1px 0 #000' }} className="text-base">RESCUE</span>
          </div>
          <div className="text-[9px] text-center font-bold tracking-[0.3em]" style={{ ...monoFont, color: '#c0c4c8' }}>
            SOUTHEAST TEXAS · BEAUMONT, TX
          </div>
          <div className="text-[9px] text-center mt-1 font-bold tracking-widest" style={{ ...monoFont, color: '#78716c' }}>
            KGJT OCC · CIRRUS SR22 TN · v1.3
          </div>
          {aircraftTotalMin > 0 && (
            <div className="text-[9px] text-center mt-1 font-bold tracking-widest" style={{ ...monoFont, color: '#c0c4c8' }}>
              {shift.tail || 'N72ET'} TOTAL: {Math.floor((aircraftTotalMin + flightMinutes) / 60)}:{String((aircraftTotalMin + flightMinutes) % 60).padStart(2, '0')}
              {flightMinutes > 0 && (
                <span style={{ color: '#57534e' }}> · +{Math.floor(flightMinutes / 60)}:{String(flightMinutes % 60).padStart(2, '0')} THIS SHIFT</span>
              )}
            </div>
          )}
          <div className="text-[9px] text-center mt-2 font-bold tracking-widest" style={{ ...monoFont, color: '#f87171' }}>
            ⚠ TRAINING SIMULATOR · NOT FOR OPERATIONAL USE
          </div>
          <div className="text-[9px] text-center mt-1 font-bold tracking-widest" style={{ ...monoFont, color: '#57534e' }}>
            DISTANCES APPROXIMATE · ALWAYS VERIFY VIA FOREFLIGHT
          </div>
          <div className="text-[8px] text-center mt-2 tracking-widest" style={{ ...monoFont, color: '#44403c' }}>
            © Southeast Texas Air Rescue
          </div>
        </div>
      </div>

      {/* DECLINE MODAL */}
      {showDeclineModal && (
        <Modal>
          <div className="border-2 border-red-600 p-6 max-w-md w-full" style={{ backgroundColor: '#16181f' }}>
            <div style={{ ...displayFont, color: '#c8202c' }} className="text-2xl mb-1 font-bold">DECLINE MISSION</div>
            <div style={{ ...monoFont, color: '#e7e5e4' }} className="text-xs tracking-widest mb-5 font-bold">
              {currentMission?.id} · {currentMission?.pickup.icao}
            </div>
            <div style={{ ...monoFont, color: '#fca5a5' }} className="text-xs mb-2 tracking-wider font-bold">REASON</div>
            <div className="space-y-1 mb-5">
              {DECLINE_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setDeclineReasonChoice(r)}
                  className="w-full text-left px-3 py-2 border-2 text-sm transition-all font-bold"
                  style={declineReasonChoice === r
                    ? { borderColor: '#c8202c', backgroundColor: '#180a0d', color: '#fca5a5' }
                    : { borderColor: '#44403c', backgroundColor: '#1c1917', color: '#d6d3d1' }
                  }
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 border-2 px-4 py-3 font-bold"
                style={{ ...monoFont, borderColor: '#57534e', backgroundColor: '#1c1917', color: '#e7e5e4' }}
              >
                <span className="text-xs tracking-widest">CANCEL</span>
              </button>
              <button
                onClick={confirmDecline}
                className="flex-1 border-2 px-4 py-3 font-bold"
                style={{ ...monoFont, borderColor: '#ef4444', backgroundColor: '#ef4444', color: '#000' }}
              >
                <span className="text-xs tracking-widest">CONFIRM DECLINE</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* DEPARTURE MODAL */}
      {showDepartureModal && (
        <Modal>
          <div className="border-2 border-red-600 p-6 max-w-md w-full" style={{ backgroundColor: '#16181f' }}>
            <div style={{ ...displayFont, color: '#c8202c' }} className="text-2xl mb-1 font-bold">
              DEPARTURE · {departureLeg === 'outbound' ? 'OUTBOUND' : 'INBOUND'}
            </div>
            <div style={{ ...monoFont, color: '#e7e5e4' }} className="text-xs tracking-widest mb-5 font-bold">
              {departureLeg === 'outbound'
                ? `KGJT → ${currentMission?.pickup.icao}`
                : `${currentMission?.pickup.icao} → KGJT`}
            </div>
            <div className="space-y-3 mb-5">
              <DepInput label="SOULS ON BOARD" value={departureForm.souls}
                onChange={(v) => setDepartureForm({ ...departureForm, souls: parseInt(v) || 0 })}
                mono={monoFont} />
              <DepInput label="FUEL (GAL)" value={departureForm.fuel}
                onChange={(v) => setDepartureForm({ ...departureForm, fuel: parseInt(v) || 0 })}
                mono={monoFont} />
              <DepInput label="ETE (MIN)" value={departureForm.ete}
                onChange={(v) => setDepartureForm({ ...departureForm, ete: parseInt(v) || 0 })}
                mono={monoFont} />
            </div>
            {/* Fuel preview */}
            <FuelPreview form={departureForm} mono={monoFont} />
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowDepartureModal(false)}
                className="flex-1 border-2 px-4 py-3 font-bold"
                style={{ ...monoFont, borderColor: '#57534e', backgroundColor: '#1c1917', color: '#e7e5e4' }}
              >
                <span className="text-xs tracking-widest">CANCEL</span>
              </button>
              <button
                onClick={confirmDeparture}
                className="flex-1 border-2 px-4 py-3 font-bold"
                style={{ ...monoFont, borderColor: '#c8202c', backgroundColor: '#c8202c', color: '#000' }}
              >
                <span className="text-xs tracking-widest">DEPART</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* FRAT MODAL */}
      {showFRAT && (
        <FRATModal
          fratData={fratData}
          setFratData={setFratData}
          presets={fratPresets}
          onSavePreset={saveFratPreset}
          onLoadPreset={loadFratPreset}
          onDeletePreset={deleteFratPreset}
          onApply={(score) => { updateFRA(score); setShowFRAT(false); }}
          onClose={() => setShowFRAT(false)}
          mono={monoFont}
          display={displayFont}
        />
      )}

      {/* HISTORY MODAL */}
      {showHistory && (
        <HistoryModal
          history={history}
          onClose={() => setShowHistory(false)}
          onView={(m) => setDetailMission(m)}
          onDelete={(m) => setConfirmDelete({ mission: m, source: 'history' })}
          onClearAll={() => {
            if (confirm(`Permanently clear all ${history.length} historical records? This cannot be undone.`)) {
              clearAllHistory();
            }
          }}
          mono={monoFont}
          display={displayFont}
        />
      )}

      {/* AREA WEATHER OVERLAY */}
      {showAreaWx && (
        <AreaWxModal
          areaWx={areaWx}
          liveOps={liveOps}
          airports={AIRPORTS}
          medCenters={MED_CENTERS}
          onRefresh={fetchAreaWx}
          onClose={() => setShowAreaWx(false)}
          mono={monoFont}
          display={displayFont}
        />
      )}

      {/* SHIFT EXPORT MODAL */}
      {showExport && (
        <ExportModal
          text={buildShiftExport()}
          onClose={() => setShowExport(false)}
          mono={monoFont}
          display={displayFont}
        />
      )}

      {/* AI BRIEFING PROMPT MODAL */}
      {showAiPrompt && (
        <AiPromptModal
          buildPrompt={buildAiPrompt}
          onClose={() => setShowAiPrompt(false)}
          mono={monoFont}
          display={displayFont}
        />
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          setSettings={setSettings}
          paperMode={paperMode}
          setPaperMode={setPaperMode}
          history={history}
          aircraftTotalMin={aircraftTotalMin}
          tail={shift.tail || 'N72ET'}
          roster={roster}
          setRoster={setRoster}
          crewStats={crewStats}
          setCrewStats={setCrewStats}
          onClearHistory={() => {
            if (confirm(`Permanently clear all ${history.length} historical records?`)) clearAllHistory();
          }}
          onResetTotals={() => {
            if (confirm(`Reset aircraft total time for all tails?`)) {
              try { localStorage.removeItem(TOTALS_KEY); setAircraftTotalMin(0); } catch (e) {}
            }
          }}
          onClose={() => setShowSettings(false)}
          mono={monoFont}
          display={displayFont}
        />
      )}

      {/* AREA MAP MODAL */}
      {showMap && (
        <MapModal
          airports={AIRPORTS}
          medCenters={MED_CENTERS}
          mission={currentMission}
          transferDest={transferDest}
          onClose={() => setShowMap(false)}
          mono={monoFont}
          display={displayFont}
        />
      )}

      {/* DISPATCH BRIEFING MODAL */}
      {showBriefing && currentMission && (
        <BriefingModal
          mission={currentMission}
          shift={shift}
          fuelOnBoard={fuelOnBoard}
          flightMinutes={flightMinutes}
          baseColor={baseColor}
          transferDest={transferDest}
          onClose={() => setShowBriefing(false)}
          mono={monoFont}
          display={displayFont}
        />
      )}

      {/* MISSION DETAIL MODAL */}
      {detailMission && (
        <MissionDetailModal
          mission={detailMission}
          onClose={() => setDetailMission(null)}
          mono={monoFont}
          display={displayFont}
        />
      )}

      {/* DELETE CONFIRM MODAL */}
      {confirmDelete && (
        <Modal>
          <div className="border-2 max-w-sm w-full"
            style={{ borderColor: '#ef4444', backgroundColor: '#0a0b0f' }}>
            <div className="px-4 py-3 border-b-2 flex items-center gap-2"
              style={{ borderColor: '#ef4444', backgroundColor: '#1f0f0f' }}>
              <AlertTriangle className="w-4 h-4" style={{ color: '#fca5a5' }} />
              <div style={{ ...displayFont, color: '#fca5a5' }} className="text-lg font-bold">
                CONFIRM RECORD REMOVAL
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div style={{ ...monoFont, color: '#fafaf9' }} className="text-xs leading-relaxed">
                You are about to permanently remove the following flight record from the
                {confirmDelete.source === 'log' ? ' current shift log' : ' all-time history'}:
              </div>
              <div className="border-2 p-3"
                style={{ borderColor: '#57534e', backgroundColor: '#1c1917' }}>
                <div style={{ ...monoFont, color: '#c8202c' }} className="text-xs font-bold tracking-widest mb-1">
                  {confirmDelete.mission.id}
                </div>
                <div style={{ ...monoFont, color: '#fafaf9' }} className="text-xs">
                  {confirmDelete.mission.pickup?.icao} · {confirmDelete.mission.pickup?.name}
                </div>
                <div style={{ ...monoFont, color: '#a8a29e' }} className="text-[10px] mt-1">
                  {confirmDelete.mission.status === 'completed' ? '✓ COMPLETED' : '✗ DECLINED'}
                  {confirmDelete.mission.shiftLabel && ` · ${confirmDelete.mission.shiftLabel}`}
                </div>
              </div>
              <div style={{ ...monoFont, color: '#fca5a5' }} className="text-[10px] tracking-wider font-bold">
                ⚠ THIS ACTION CANNOT BE UNDONE
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => setConfirmDelete(null)}
                  className="border-2 py-3 font-bold"
                  style={{ ...monoFont, borderColor: '#57534e', backgroundColor: '#1c1917', color: '#e7e5e4' }}>
                  <span className="text-[10px] tracking-widest">CANCEL</span>
                </button>
                <button onClick={() => {
                  if (confirmDelete.source === 'log') {
                    removeFromLog(confirmDelete.mission.id);
                  } else {
                    removeFromHistory(confirmDelete.mission.id);
                  }
                  setConfirmDelete(null);
                }}
                  className="border-2 py-3 font-bold"
                  style={{ ...monoFont, borderColor: '#ef4444', backgroundColor: '#ef4444', color: '#000' }}>
                  <span className="text-[10px] tracking-widest">REMOVE</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function SetupScreen({ shift, setShift, startShift, paperMode, setPaperMode, roster, setRoster, crewStats, fontStack, monoFont, displayFont }) {
  return (
    <div className={'min-h-screen bg-black text-stone-100 p-4 flex items-center justify-center ' + (paperMode ? 'paper-mode' : '')} style={fontStack}>
      <PaperModeStyles />
      <PaperModeToggle paperMode={paperMode} setPaperMode={setPaperMode} />
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <img src={TEX.patch} alt="Southeast Texas Air Rescue"
            className="w-40 h-40 mx-auto"
            style={{ filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))' }} />
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-8" style={{ backgroundColor: '#c8202c' }} />
            <div className="text-[9px] tracking-[0.3em] uppercase" style={{ ...monoFont, color: '#c0c4c8' }}>
              Beaumont, TX · KGJT Base
            </div>
            <div className="h-px w-8" style={{ backgroundColor: '#c8202c' }} />
          </div>
          <div style={monoFont} className="text-[10px] text-stone-500 tracking-[0.3em] mt-2 uppercase">
            Pre-Shift Briefing
          </div>
        </div>

        <div className="border-2 p-6 space-y-5 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
          style={{ borderColor: '#c8202c66', backgroundColor: '#1e2952' }}>
          <div>
            <div className="text-[11px] tracking-[0.25em] mb-2 font-semibold" style={{ ...monoFont, color: '#f5c518' }}>SHIFT WINDOW (MDT)</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="time" value={shift.start}
                onChange={(e) => setShift({ ...shift, start: e.target.value })}
                className="bg-black border-2 border-stone-600 focus:border-red-600 outline-none px-3 py-2 text-stone-100 text-base" style={monoFont} />
              <input type="time" value={shift.end}
                onChange={(e) => setShift({ ...shift, end: e.target.value })}
                className="bg-black border-2 border-stone-600 focus:border-red-600 outline-none px-3 py-2 text-stone-100 text-base" style={monoFont} />
            </div>
          </div>

          <div>
            <div className="text-[11px] tracking-[0.25em] mb-2 font-semibold" style={{ ...monoFont, color: '#f5c518' }}>AIRCRAFT</div>
            <div className="border-2 px-3 py-2 flex items-center justify-between"
              style={{ borderColor: '#57534e', backgroundColor: '#000' }}>
              <input value={shift.tail || ''}
                placeholder="N72ET"
                onChange={(e) => setShift({ ...shift, tail: e.target.value.toUpperCase() })}
                className="bg-transparent outline-none text-base font-bold tracking-widest w-32"
                style={{ ...monoFont, color: '#fafaf9' }} />
              <div className="text-[10px] tracking-widest font-bold"
                style={{ ...monoFont, color: '#c0c4c8' }}>
                CIRRUS SR22 TN
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] tracking-[0.25em] mb-2 font-semibold" style={{ ...monoFont, color: '#f5c518' }}>CREW</div>
            <div className="space-y-2">
              <CrewPicker label="CDR" role="cdr" val={shift.cdr}
                roster={roster} setRoster={setRoster} crewStats={crewStats}
                onChange={(v) => setShift({ ...shift, cdr: v })} mono={monoFont} />
              <CrewPicker label="PLT" role="plt" val={shift.plt}
                roster={roster} setRoster={setRoster} crewStats={crewStats}
                onChange={(v) => setShift({ ...shift, plt: v })} mono={monoFont} />
              <CrewPicker label="MED" role="med" val={shift.med}
                roster={roster} setRoster={setRoster} crewStats={crewStats}
                onChange={(v) => setShift({ ...shift, med: v })} mono={monoFont} />
            </div>
          </div>

          <div>
            <div className="text-[11px] tracking-[0.25em] mb-2 font-semibold flex items-center justify-between" style={{ ...monoFont, color: '#f5c518' }}>
              <span>FUEL ON BOARD (GAL)</span>
              <span style={{ color: '#78716c' }} className="text-[9px]">MAX USABLE 81</span>
            </div>
            <input type="number" value={shift.fuel} max="81"
              onChange={(e) => setShift({ ...shift, fuel: Math.min(81, parseInt(e.target.value) || 0) })}
              className="w-full bg-black border-2 border-stone-600 focus:border-red-600 outline-none px-3 py-2 text-stone-100 text-base" style={monoFont} />
          </div>

          <div>
            <div className="text-[11px] tracking-[0.25em] mb-2 font-semibold" style={{ ...monoFont, color: '#f5c518' }}>BASE STATUS</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 'green', label: 'GREEN', desc: 'NORMAL' },
                { v: 'yellow', label: 'YELLOW', desc: '+20 MIN' },
                { v: 'red', label: 'RED', desc: 'OOS' },
              ].map((b) => (
                <button key={b.v}
                  onClick={() => setShift({ ...shift, baseColor: b.v })}
                  className={`py-3 border-2 transition-all ${
                    shift.baseColor === b.v
                      ? b.v === 'green' ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                        : b.v === 'yellow' ? 'border-amber-400 bg-amber-400/20 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                        : 'border-red-400 bg-red-400/20 text-red-200 shadow-[0_0_15px_rgba(248,113,113,0.3)]'
                      : 'border-stone-700 bg-black text-stone-400 hover:border-stone-500 hover:text-stone-200'
                  }`}
                  style={monoFont}>
                  <div className="text-sm tracking-widest font-bold">{b.label}</div>
                  <div className="text-[9px] mt-1 opacity-70">{b.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* TRAINING MODE TOGGLE */}
          <div>
            <button
              onClick={() => setShift({ ...shift, trainingMode: !shift.trainingMode })}
              className="w-full border-2 px-3 py-3 flex items-center gap-3 transition-all"
              style={{
                borderColor: shift.trainingMode ? '#f0abfc' : '#57534e',
                backgroundColor: shift.trainingMode ? '#2a0d2a' : '#0a0b0f',
              }}>
              <div className="relative shrink-0">
                <div className="w-10 h-6 rounded-full transition-all"
                  style={{ backgroundColor: shift.trainingMode ? '#f0abfc' : '#44403c' }} />
                <div className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                  style={{
                    left: shift.trainingMode ? 'calc(100% - 22px)' : '2px',
                    backgroundColor: '#fafaf9',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  }} />
              </div>
              <div className="text-left flex-1">
                <div style={{ ...monoFont, color: shift.trainingMode ? '#f5d0fe' : '#d6d3d1' }} className="text-[11px] tracking-[0.25em] font-bold">
                  TRAINING MODE
                </div>
                <div style={{ ...monoFont, color: shift.trainingMode ? '#c4b5fd' : '#78716c' }} className="text-[9px] mt-0.5">
                  {shift.trainingMode
                    ? 'All missions flagged as TEST · nothing logged'
                    : 'Normal shift — missions log to history'}
                </div>
              </div>
            </button>
          </div>

          <button onClick={startShift}
            className="w-full py-4 border-2 transition-all"
            style={{
              ...displayFont,
              borderColor: shift.trainingMode ? '#f0abfc' : '#c8202c',
              backgroundColor: shift.trainingMode ? '#f0abfc' : '#c8202c',
              color: shift.trainingMode ? '#000' : '#fafaf9',
              boxShadow: shift.trainingMode
                ? '0 0 30px rgba(240,171,252,0.5)'
                : '0 0 30px rgba(220,38,38,0.5)',
            }}>
            <span className="text-2xl tracking-[0.2em] font-bold">
              {shift.trainingMode ? 'START TRAINING SHIFT' : 'START SHIFT'}
            </span>
          </button>
        </div>

        <div className="text-[10px] text-stone-500 text-center mt-4" style={monoFont}>
          DISTANCES APPROXIMATE · VERIFY VIA FOREFLIGHT
        </div>
      </div>
    </div>
  );
}

function SetupRow({ label, val, onChange, mono }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 text-xs tracking-widest font-bold" style={{ ...mono, color: '#f5c518' }}>{label}</div>
      <input value={val} onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-black border-2 border-stone-600 focus:border-red-600 outline-none px-3 py-2 text-base text-stone-100" style={mono} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CrewPicker — tap to expand a picker of roster members for the given role.
// Includes "+ ADD NEW" input and shows quick stats badge per member.
// ─────────────────────────────────────────────────────────────────────────────
function CrewPicker({ label, role, val, roster, setRoster, crewStats, onChange, mono }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const options = roster[role] || [];

  const commit = (name) => {
    onChange(name);
    setOpen(false);
    setAdding(false);
    setNewName('');
  };

  const addNew = () => {
    const n = newName.trim();
    if (!n) { setAdding(false); return; }
    setRoster((prev) => ({ ...prev, [role]: uniq([...(prev[role] || []), n]) }));
    commit(n);
  };

  const remove = (name) => {
    // Never delete a name that's a factory default (protects the Apollo 12 crew + Gerhardt/Price/Chamberlain)
    if ((DEFAULT_ROSTER[role] || []).includes(name)) {
      alert(`${name} is a default roster member and can't be deleted. You can leave them off a shift instead.`);
      return;
    }
    if (!confirm(`Remove "${name}" from ${label} roster?\n(Stats stay in the database.)`)) return;
    setRoster((prev) => ({ ...prev, [role]: (prev[role] || []).filter(n => n !== name) }));
    if (val === name && options.length > 1) commit(options.find(n => n !== name) || '');
  };

  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 border-2 border-stone-600 focus:border-red-600 bg-black px-3 py-2 text-left transition-all"
        style={mono}>
        <div className="w-12 text-xs tracking-widest font-bold shrink-0" style={{ color: '#f5c518' }}>{label}</div>
        <div className="flex-1 text-base font-bold" style={{ color: val ? '#fafaf9' : '#78716c' }}>
          {val || 'Tap to pick'}
        </div>
        <div className="text-[10px] font-bold shrink-0" style={{ color: '#78716c' }}>
          {open ? '▲' : '▼'}
        </div>
      </button>

      {open && (
        <div className="mt-1 border-2 border-stone-700"
          style={{ backgroundColor: '#0f1115' }}>
          {options.length === 0 && (
            <div className="px-3 py-2 text-[10px] italic" style={{ ...mono, color: '#78716c' }}>
              No {label} on roster yet — add one below.
            </div>
          )}
          {options.map((name) => {
            const s = crewStats[name];
            const selected = val === name;
            return (
              <div key={name}
                className="flex items-stretch border-b border-stone-800 last:border-b-0"
                style={{ backgroundColor: selected ? '#1c1917' : 'transparent' }}>
                <button type="button" onClick={() => commit(name)}
                  className="flex-1 px-3 py-2 text-left">
                  <div className="flex items-baseline gap-2">
                    <span style={{ ...mono, color: selected ? '#fcd34d' : '#fafaf9' }} className="text-xs font-bold">
                      {selected ? '✓' : ' '} {name}
                    </span>
                  </div>
                  {s && s.shifts > 0 && (
                    <div className="flex gap-2 mt-1" style={{ ...mono, color: '#78716c' }}>
                      <span className="text-[9px] tracking-wider font-bold">{s.shifts} SHIFT{s.shifts !== 1 ? 'S' : ''}</span>
                      <span className="text-[9px] tracking-wider font-bold">
                        {s.missions.completed}/{s.missions.total} MSN
                      </span>
                      {s.fraScoresCount > 0 && (
                        <span className="text-[9px] tracking-wider font-bold">
                          AVG FRA {Math.round(s.fraScoresSum / s.fraScoresCount)}
                        </span>
                      )}
                    </div>
                  )}
                </button>
                <button type="button" onClick={() => remove(name)}
                  className="px-3 border-l border-stone-800"
                  style={{ ...mono, color: '#a8302c' }}
                  title="Remove from roster">
                  <span className="text-xs font-bold">×</span>
                </button>
              </div>
            );
          })}
          {adding ? (
            <div className="flex items-stretch border-t-2" style={{ borderColor: '#f5c518' }}>
              <input value={newName} autoFocus
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addNew(); if (e.key === 'Escape') setAdding(false); }}
                placeholder={`New ${label} name…`}
                className="flex-1 bg-black outline-none px-3 py-2 text-sm text-stone-100 font-bold"
                style={mono} />
              <button type="button" onClick={addNew}
                className="px-3 font-bold"
                style={{ ...mono, backgroundColor: '#1a1505', color: '#fcd34d' }}>
                <span className="text-[10px] tracking-widest">ADD</span>
              </button>
              <button type="button" onClick={() => { setAdding(false); setNewName(''); }}
                className="px-2 border-l border-stone-800"
                style={{ ...mono, color: '#a8a29e' }}>
                <span className="text-[10px]">✕</span>
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)}
              className="w-full px-3 py-2 border-t-2 text-left"
              style={{ ...mono, borderColor: '#f5c518', backgroundColor: '#1a1505', color: '#fcd34d' }}>
              <span className="text-[10px] tracking-widest font-bold">+ ADD NEW {label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusTile({ label, value, accent, options, onChange, mono, editable, numeric, onValueChange }) {
  const tileColors = {
    green: { bg: '#0d1f17', text: '#34d399', border: '#10b981' },
    yellow: { bg: '#1f1a0d', text: '#fcd34d', border: '#f59e0b' },
    red: { bg: '#1f0f0f', text: '#f87171', border: '#ef4444' },
    dim: { bg: '#16181f', text: '#f5f5f4', border: '#57534e' },
  };
  const c = tileColors[accent] || tileColors.dim;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value);

  return (
    <div
      className="p-3 border-l-4"
      style={{ backgroundColor: c.bg, borderLeftColor: c.border }}
    >
      <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-[0.25em] mb-1 font-bold">{label}</div>
      {options ? (
        <div className="relative">
          <button onClick={() => setOpen(!open)}
            className="text-lg font-bold flex items-center gap-1"
            style={{ ...mono, color: c.text }}>
            {value} <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1 z-10 min-w-[100px] border-2"
              style={{ backgroundColor: '#16181f', borderColor: '#57534e' }}>
              {options.map((o) => (
                <button key={o}
                  onClick={() => { onChange(o); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:opacity-80"
                  style={{ ...mono, color: tileColors[o].text, backgroundColor: tileColors[o].bg }}>
                  {o.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : editable ? (
        editing ? (
          <input
            autoFocus
            type={numeric ? 'number' : 'text'}
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={() => { onValueChange(editVal); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onValueChange(editVal); setEditing(false); } }}
            className="border-b-2 text-lg w-20 outline-none font-bold"
            style={{ ...mono, color: c.text, backgroundColor: 'transparent', borderBottomColor: c.border }}
          />
        ) : (
          <button onClick={() => { setEditVal(parseInt(value) || value); setEditing(true); }}
            className="text-lg font-bold"
            style={{ ...mono, color: c.text }}>
            {value}
          </button>
        )
      ) : (
        <div className="text-lg font-bold" style={{ ...mono, color: c.text }}>{value}</div>
      )}
    </div>
  );
}

function IdlePanel({ dispatchNow, baseColor, mono, display }) {
  return (
    <div
      className="border-2 p-8 text-center relative overflow-hidden"
      style={{ borderColor: '#c8202c33', backgroundColor: '#1e2952' }}
    >
      {/* Diagonal accent stripe — echoes Air Rescue livery */}
      <div className="absolute top-0 right-0 h-full w-1/3 pointer-events-none opacity-10"
        style={{
          background: 'linear-gradient(135deg, transparent 50%, #c8202c 50%, #c8202c 60%, transparent 60%, transparent 65%, #fafaf9 65%, #fafaf9 67%, transparent 67%)',
        }} />
      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #c8202c, transparent)' }} />

      <div className="relative">
        <div className="inline-block relative mb-4">
          <Plane className="w-12 h-12" style={{ color: '#c8202c' }} />
          <div className="absolute inset-0 animate-ping opacity-30">
            <Plane className="w-12 h-12" style={{ color: '#c8202c' }} />
          </div>
        </div>
        <div style={{ ...display, color: '#fafaf9' }} className="text-3xl mb-1 font-bold tracking-wider">STANDING BY</div>
        <div style={{ ...mono, color: '#fca5a5' }} className="text-[10px] tracking-[0.4em] mb-1 font-bold">
          SE TX AIR RESCUE · KGJT
        </div>
        <div style={{ ...mono, color: '#a8a29e' }} className="text-[10px] tracking-[0.3em] mb-6 font-bold">
          ALL SYSTEMS NOMINAL · AWAITING DISPATCH
        </div>
        <button
          onClick={dispatchNow}
          disabled={baseColor === 'red'}
          className="px-8 py-3 border-2 transition-all font-bold"
          style={baseColor === 'red'
            ? { ...mono, borderColor: '#44403c', color: '#57534e', cursor: 'not-allowed' }
            : { ...mono, borderColor: '#c8202c', backgroundColor: '#c8202c', color: '#fafaf9' }
          }
        >
          <Zap className="w-4 h-4 inline mr-2" />
          <span className="text-xs tracking-[0.3em]">DISPATCH NOW</span>
        </button>
        {baseColor === 'red' && (
          <div style={{ ...mono, color: '#f87171' }} className="text-[10px] mt-3 tracking-widest font-bold">
            BASE OUT OF SERVICE
          </div>
        )}
      </div>
    </div>
  );
}

function MissionPanel({ m, missionPhase, sceneArrivalAt, transferDest, now, updateCrew, updateFRA,
  toggleTest, openFRAT, acceptMission, declineMission, arriveOnScene, departScene,
  acceptTransfer, declineTransfer, arriveAtTransfer, departTransfer,
  completeMission, refreshMETAR, loadTAF, loadBaseMETAR, mono, display }) {

  const tierColor = {
    critical: 'text-red-400 border-red-400/30',
    urgent: 'text-amber-300 border-red-600/30',
    routine: 'text-emerald-300 border-emerald-400/30',
  }[m.patient.tier];

  const sceneMin = sceneArrivalAt ? Math.floor((now - sceneArrivalAt) / 60000) : 0;
  const sceneReady = sceneMin >= 45;

  return (
    <div className="border-2" style={{
      borderColor: m.isTest ? '#f0abfc' : '#c8202c99',
      backgroundColor: '#16181f',
    }}>
      {/* Header */}
      <div
        className="border-b-2 px-4 py-2 flex items-center justify-between"
        style={{
          borderColor: m.isTest ? '#f0abfc66' : '#c8202c66',
          backgroundColor: m.isTest ? '#1f0d1f' : '#180a0d',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full animate-pulse shrink-0"
            style={{ backgroundColor: m.isTest ? '#f0abfc' : '#c8202c' }} />
          <span style={{ ...mono, color: m.isTest ? '#f5d0fe' : '#c8202c' }} className="text-xs tracking-[0.3em] font-bold truncate">
            {missionPhase === 'idle' && (m.isOriginTransfer ? 'INTERFACILITY · KGJT TRANSFER' : 'INCOMING DISPATCH')}
            {missionPhase === 'outbound' && 'EN ROUTE — OUTBOUND'}
            {missionPhase === 'onscene' && 'ON SCENE'}
            {missionPhase === 'transferOffered' && 'TRANSFER REQUEST'}
            {missionPhase === 'enrouteTransfer' && 'EN ROUTE — TRANSFER'}
            {missionPhase === 'atTransfer' && 'AT TRANSFER FACILITY'}
            {missionPhase === 'inbound' && 'EN ROUTE — INBOUND'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={toggleTest}
            className="border-2 px-2 py-0.5 text-[9px] tracking-widest font-bold"
            style={{ ...mono,
              borderColor: m.isTest ? '#f0abfc' : '#57534e',
              backgroundColor: m.isTest ? '#f0abfc' : '#1c1917',
              color: m.isTest ? '#000' : '#a8a29e',
            }}
            title="Toggle TEST/SIM — flights marked TEST are not logged">
            {m.isTest ? '● TEST' : 'MARK TEST'}
          </button>
          <span style={{ ...mono, color: '#e7e5e4' }} className="text-xs font-bold">{m.id}</span>
        </div>
      </div>

      {/* TEST/SIM banner */}
      {m.isTest && (
        <div className="px-4 py-2 border-b-2 flex items-center gap-2"
          style={{ borderColor: '#f0abfc66', backgroundColor: '#2a0d2a' }}>
          <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#f0abfc' }} />
          <div style={{ ...mono, color: '#f5d0fe' }} className="text-[10px] font-bold tracking-wider">
            TEST / SIMULATED FLIGHT — WILL NOT BE LOGGED · NO FUEL DEDUCTED · NO FLIGHT TIME
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Origin transfer banner */}
        {m.isOriginTransfer && missionPhase === 'idle' && (
          <div className="border-2 p-3" style={{ borderColor: '#a78bfa', backgroundColor: '#1a132a' }}>
            <div className="flex items-center gap-2 mb-1">
              <Hospital className="w-4 h-4" style={{ color: '#c4b5fd' }} />
              <span style={{ ...mono, color: '#c4b5fd' }} className="text-[10px] tracking-[0.25em] font-bold">
                TRANSFER → {m.transferTo?.icao}
              </span>
            </div>
            <div style={{ color: '#fafaf9' }} className="text-sm font-bold">
              KGJT → {m.pickup.icao} → {m.transferTo?.icao} ({m.transferTo?.region})
            </div>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[10px] mt-1">
              {m.transferTo?.name}
            </div>
          </div>
        )}

        {/* Pickup */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="PICKUP" mono={mono}>
            <div style={{ ...display, color: '#fafaf9' }} className="text-2xl font-bold">{m.pickup.icao}</div>
            <div className="text-xs" style={{ color: '#e7e5e4' }}>{m.pickup.name}</div>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[10px]">{m.pickup.city}</div>
          </Field>
          <Field label="DISTANCE" mono={mono}>
            <div style={{ ...display, color: '#c8202c' }} className="text-2xl font-bold">{m.pickup.dist} NM</div>
            <div style={{ ...mono, color: '#d6d3d1' }} className="text-[10px]">RWY {m.pickup.rwy.toLocaleString()} ft</div>
            <div style={{ ...mono, color: '#c8202c' }} className="text-[9px] mt-1 font-bold">⚠ VERIFY IN FOREFLIGHT</div>
          </Field>
        </div>

        {/* Patient */}
        <div className="border-2 border-stone-600 p-3" style={{ backgroundColor: '#1c1917' }}>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-3 h-3 text-red-400" />
            <span style={{ ...mono, color: '#e7e5e4' }} className="text-[10px] tracking-[0.25em] font-bold">PATIENT</span>
            <span
              style={{
                ...mono,
                color: m.patient.tier === 'critical' ? '#fca5a5' : m.patient.tier === 'urgent' ? '#fca5a5' : '#6ee7b7',
                borderColor: m.patient.tier === 'critical' ? '#ef4444' : m.patient.tier === 'urgent' ? '#f59e0b' : '#10b981',
                backgroundColor: m.patient.tier === 'critical' ? '#1f0f0f' : m.patient.tier === 'urgent' ? '#180a0d' : '#0d1f17',
              }}
              className="text-[10px] tracking-widest px-2 py-0.5 border-2 ml-auto font-bold"
            >
              {m.patient.tier.toUpperCase()}
            </span>
          </div>
          <div className="text-sm font-bold mb-2" style={{ color: '#fafaf9' }}>{m.patient.condition}</div>
          <div className="flex gap-4 text-xs font-bold" style={{ ...mono, color: '#e7e5e4' }}>
            <span>{m.patient.weightLb} LB</span>
            <span style={{ color: '#78716c' }}>·</span>
            <span>{m.patient.weightKg} KG</span>
          </div>
        </div>

        {/* METAR */}
        <div className="border-2 border-stone-600 p-3" style={{ backgroundColor: '#0f1115' }}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Cloud className="w-3 h-3 text-cyan-400" />
            <span style={{ ...mono, color: '#e7e5e4' }} className="text-[10px] tracking-[0.25em] font-bold">
              METAR · {m.pickup.icao}
            </span>
            {m.metarSource === 'live' && (
              <span style={mono} className="text-[9px] tracking-widest px-1.5 py-0.5 border border-emerald-400/40 text-emerald-300 bg-emerald-400/5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            )}
            {m.metarSource === 'nearest' && (
              <BarberPoleFlag
                mono={mono}
                variant="yellow"
                label={m.metarStation}
                sublabel={`${m.metarDistance} NM`}
              />
            )}
            {m.metarSource === 'unavailable' && <BarberPoleFlag mono={mono} />}
            {m.metarSource === 'loading' && (
              <span style={mono} className="text-[9px] tracking-widest text-stone-500">
                FETCHING…
              </span>
            )}
            <button
              onClick={refreshMETAR}
              disabled={m.metarSource === 'loading'}
              className="ml-auto text-stone-500 hover:text-cyan-300 disabled:opacity-30"
              title="Refresh METAR"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
          {m.metarSource === 'loading' ? (
            <div style={{ ...mono, color: '#a8a29e' }} className="text-xs italic">Fetching from aviationweather.gov…</div>
          ) : m.metarSource === 'unavailable' ? (
            <div style={{ ...mono, color: '#f87171' }} className="text-xs font-bold">
              —— NO METAR AVAILABLE ——
            </div>
          ) : (
            <div style={{
              ...mono,
              color: m.metarSource === 'nearest' ? '#fca5a5' : '#67e8f9',
            }} className="text-xs break-all font-bold">{m.metar}</div>
          )}
          {m.metarSource === 'nearest' && (
            <div style={{ ...mono, color: '#c8202c' }} className="text-[9px] mt-2 tracking-wider font-bold">
              ⚠ NO METAR AT {m.pickup.icao} — USING {m.metarStation} ({m.metarDistance} NM AWAY)
            </div>
          )}
          {m.metarSource === 'unavailable' && (
            <div style={{ ...mono, color: '#f87171' }} className="text-[9px] mt-2 tracking-wider font-bold">
              ⚠ NO LIVE WEATHER DATA — OBTAIN ACTUAL CONDITIONS VIA FSS / FOREFLIGHT BEFORE ANY DECISION
            </div>
          )}
          {m.metarSource === 'live' && (
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] mt-1">
              SOURCE: AVIATIONWEATHER.GOV (FAA)
            </div>
          )}

          {/* TAF section */}
          <div className="mt-3 pt-3 border-t-2 border-stone-700">
            {m.tafSource === 'idle' && (
              <button
                onClick={loadTAF}
                style={{ ...mono, color: '#22d3ee' }}
                className="text-[10px] hover:opacity-80 tracking-widest font-bold"
              >
                + LOAD TAF FORECAST
              </button>
            )}
            {m.tafSource === 'loading' && (
              <div style={{ ...mono, color: '#a8a29e' }} className="text-[10px] italic">Fetching forecast…</div>
            )}
            {m.tafSource === 'unavailable' && (
              <div className="flex items-center gap-2">
                <BarberPoleFlag mono={mono} compact />
                <span style={{ ...mono, color: '#d6d3d1' }} className="text-[10px] font-bold">NO TAF AVAILABLE FOR THIS STATION</span>
              </div>
            )}
            {m.tafSource === 'live' && m.taf && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span style={mono} className="text-[10px] text-stone-400 tracking-[0.25em]">TAF</span>
                  <span style={mono} className="text-[9px] tracking-widest px-1.5 py-0.5 border border-emerald-400/40 text-emerald-300 bg-emerald-400/5">
                    LIVE
                  </span>
                </div>
                <pre style={mono} className="text-[10px] text-cyan-200/70 whitespace-pre-wrap break-all leading-relaxed">
{m.taf}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Base METAR — appears during inbound phase */}
        {missionPhase === 'inbound' && (
          <div className="border border-emerald-400/20 bg-emerald-400/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Cloud className="w-3 h-3 text-emerald-400" />
              <span style={mono} className="text-[10px] text-stone-300 tracking-[0.25em]">
                METAR · KGJT (BASE)
              </span>
              {m.baseMetarSource === 'live' && (
                <span style={mono} className="text-[9px] tracking-widest px-1.5 py-0.5 border border-emerald-400/40 text-emerald-300 bg-emerald-400/5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              )}
              {m.baseMetarSource === 'nearest' && (
                <BarberPoleFlag
                  mono={mono}
                  variant="yellow"
                  label={m.baseMetarStation}
                  sublabel={`${m.baseMetarDistance} NM`}
                />
              )}
              {m.baseMetarSource === 'unavailable' && <BarberPoleFlag mono={mono} />}
              {m.baseMetarSource === 'loading' && (
                <span style={mono} className="text-[9px] tracking-widest text-stone-500">FETCHING…</span>
              )}
              <button
                onClick={loadBaseMETAR}
                disabled={m.baseMetarSource === 'loading'}
                className="ml-auto text-stone-500 hover:text-emerald-300 disabled:opacity-30"
                title="Refresh base METAR"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
            {m.baseMetarSource === 'loading' ? (
              <div style={mono} className="text-xs text-stone-600 italic">Fetching KGJT…</div>
            ) : m.baseMetarSource === 'unavailable' ? (
              <div style={{ ...mono, color: '#f87171' }} className="text-xs font-bold">—— NO METAR AVAILABLE ——</div>
            ) : (
              <div style={mono} className="text-xs text-emerald-200/80 break-all">{m.baseMetar}</div>
            )}
          </div>
        )}

        {/* Decision controls (only when pending) */}
        {missionPhase === 'idle' && (
          <>
            <div className="border-2 border-stone-600 p-3" style={{ backgroundColor: '#1c1917' }}>
              <div style={{ ...mono, color: '#c8202c' }} className="text-[10px] tracking-[0.25em] mb-3 font-bold">CREW CONSENSUS</div>
              <div className="space-y-2">
                {['CDR', 'PLT', 'MED'].map((role) => (
                  <CrewToggle key={role} role={role} val={m.crew[role]} onChange={(v) => updateCrew(role, v)} mono={mono} />
                ))}
              </div>
            </div>

            <div className="border-2 border-stone-600 p-3" style={{ backgroundColor: '#1c1917' }}>
              <div style={{ ...mono, color: '#c8202c' }} className="text-[10px] tracking-[0.25em] mb-2 font-bold">
                FLIGHT RISK ASSESSMENT (≤26 TO ACCEPT)
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="number" min="0" max="50"
                  value={m.fra ?? ''}
                  onChange={(e) => updateFRA(parseInt(e.target.value) || null)}
                  placeholder="0–50"
                  className="border-2 px-3 py-2 w-20 text-base font-bold outline-none focus:border-red-600"
                  style={{ ...mono, backgroundColor: '#000', borderColor: '#57534e', color: '#fafaf9' }}
                />
                <button
                  onClick={openFRAT}
                  className="border-2 px-3 py-2 font-bold flex items-center gap-1.5"
                  style={{ ...mono, borderColor: '#22d3ee', backgroundColor: '#0c1b22', color: '#67e8f9' }}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span className="text-[10px] tracking-widest">OPEN FRAT</span>
                </button>
                {m.fra !== null && (
                  <div className="text-sm tracking-widest font-bold px-3 py-1"
                    style={{ ...mono,
                      color: '#000',
                      backgroundColor: m.fra > 30 ? '#ef4444' : m.fra > 15 ? '#f59e0b' : '#10b981',
                    }}>
                    {m.fra > 30 ? 'NO-GO' : m.fra > 15 ? 'CAUTION' : 'GO'}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={declineMission}
                className="border-2 py-3 font-bold"
                style={{ ...mono, borderColor: '#ef4444', backgroundColor: '#ef4444', color: '#000' }}>
                <XCircle className="w-4 h-4 inline mr-2" />
                <span className="text-xs tracking-widest">DECLINE</span>
              </button>
              <button onClick={acceptMission}
                className="border-2 py-3 font-bold"
                style={{ ...mono, borderColor: '#10b981', backgroundColor: '#10b981', color: '#000' }}>
                <CheckCircle2 className="w-4 h-4 inline mr-2" />
                <span className="text-xs tracking-widest">ACCEPT</span>
              </button>
            </div>
          </>
        )}

        {/* Outbound state */}
        {missionPhase === 'outbound' && (
          <div className="border-2 border-red-600 p-4 text-center" style={{ backgroundColor: '#180a0d' }}>
            <Plane className="w-8 h-8 text-red-500 mx-auto mb-2" style={{ transform: 'rotate(-45deg)' }} />
            <div style={{ ...display, color: '#fca5a5' }} className="text-xl mb-1 font-bold">EN ROUTE TO PICKUP</div>
            <div style={{ ...mono, color: '#e7e5e4' }} className="text-[10px] tracking-widest mb-4 font-bold">
              PROJ LANDING FUEL: {m.timeline[0]?.projLanding?.toFixed(1)} GAL
            </div>
            <button onClick={arriveOnScene}
              className="px-6 py-3 border-2 font-bold"
              style={{ ...mono, borderColor: '#c8202c', backgroundColor: '#c8202c', color: '#000' }}>
              <span className="text-xs tracking-widest">ARRIVED ON SCENE</span>
            </button>
          </div>
        )}

        {/* On scene */}
        {missionPhase === 'onscene' && (
          <div className="border-2 border-cyan-400 p-4 text-center" style={{ backgroundColor: '#0c1b22' }}>
            <Activity className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <div style={{ ...display, color: '#67e8f9' }} className="text-xl mb-1 font-bold">ON SCENE · {m.pickup.icao}</div>
            <div style={{ ...mono, color: '#e7e5e4' }} className="text-[10px] tracking-widest mb-1 font-bold">
              SCENE TIME: {sceneMin} MIN
            </div>
            <div style={{ ...mono, color: sceneReady ? '#34d399' : '#c8202c' }} className="text-[10px] tracking-widest mb-4 font-bold">
              {sceneReady ? '✓ MIN SCENE TIME MET' : `MIN 45 MIN — ${45 - sceneMin} REMAINING`}
            </div>
            <button onClick={departScene}
              className="px-6 py-3 border-2 font-bold"
              style={{ ...mono, borderColor: '#06b6d4', backgroundColor: '#06b6d4', color: '#000' }}>
              <span className="text-xs tracking-widest">DEPART SCENE</span>
            </button>
          </div>
        )}

        {/* Transfer Offered */}
        {missionPhase === 'transferOffered' && transferDest && (
          <div className="border-2 p-4 text-center" style={{ borderColor: '#a78bfa', backgroundColor: '#1a132a' }}>
            <Hospital className="w-8 h-8 mx-auto mb-2" style={{ color: '#c4b5fd' }} />
            <div style={{ ...display, color: '#c4b5fd' }} className="text-xl mb-1 font-bold">INTERFACILITY TRANSFER</div>
            <div style={{ ...mono, color: '#e7e5e4' }} className="text-xs mb-1 font-bold">
              Patient requires higher level of care
            </div>
            <div style={{ ...mono, color: '#c4b5fd' }} className="text-sm mb-1 font-bold tracking-widest">
              → {transferDest.icao} · {transferDest.region.toUpperCase()}
            </div>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[10px] mb-3 font-bold">
              {transferDest.name} · {transferDest.distFromPickup} NM from {m.pickup.icao}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={declineTransfer}
                className="border-2 py-3 font-bold"
                style={{ ...mono, borderColor: '#57534e', backgroundColor: '#1c1917', color: '#e7e5e4' }}>
                <span className="text-xs tracking-widest">DECLINE · RTB</span>
              </button>
              <button onClick={acceptTransfer}
                className="border-2 py-3 font-bold"
                style={{ ...mono, borderColor: '#a78bfa', backgroundColor: '#a78bfa', color: '#000' }}>
                <ArrowRightLeft className="w-4 h-4 inline mr-1" />
                <span className="text-xs tracking-widest">ACCEPT</span>
              </button>
            </div>
          </div>
        )}

        {/* Enroute to Transfer */}
        {missionPhase === 'enrouteTransfer' && transferDest && (
          <div className="border-2 p-4 text-center" style={{ borderColor: '#a78bfa', backgroundColor: '#1a132a' }}>
            <Plane className="w-8 h-8 mx-auto mb-2" style={{ color: '#c4b5fd', transform: 'rotate(-45deg)' }} />
            <div style={{ ...display, color: '#c4b5fd' }} className="text-xl mb-1 font-bold">
              EN ROUTE → {transferDest.icao}
            </div>
            <div style={{ ...mono, color: '#e7e5e4' }} className="text-[10px] tracking-widest mb-4 font-bold">
              PROJ LANDING FUEL: {m.timeline[m.timeline.length - 1]?.projLanding?.toFixed(1)} GAL
            </div>
            <button onClick={arriveAtTransfer}
              className="px-6 py-3 border-2 font-bold"
              style={{ ...mono, borderColor: '#a78bfa', backgroundColor: '#a78bfa', color: '#000' }}>
              <span className="text-xs tracking-widest">ARRIVED · {transferDest.icao}</span>
            </button>
          </div>
        )}

        {/* At Transfer Facility */}
        {missionPhase === 'atTransfer' && transferDest && (
          <div className="border-2 p-4 text-center" style={{ borderColor: '#a78bfa', backgroundColor: '#1a132a' }}>
            <Hospital className="w-8 h-8 mx-auto mb-2" style={{ color: '#c4b5fd' }} />
            <div style={{ ...display, color: '#c4b5fd' }} className="text-xl mb-1 font-bold">
              AT {transferDest.icao}
            </div>
            <div style={{ ...mono, color: '#e7e5e4' }} className="text-[10px] tracking-widest mb-1 font-bold">
              PATIENT TRANSFERRED
            </div>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[10px] tracking-widest mb-4 font-bold">
              {transferDest.distFromGJT} NM TO KGJT
            </div>
            <button onClick={departTransfer}
              className="px-6 py-3 border-2 font-bold"
              style={{ ...mono, borderColor: '#10b981', backgroundColor: '#10b981', color: '#000' }}>
              <span className="text-xs tracking-widest">DEPART → KGJT</span>
            </button>
          </div>
        )}

        {/* Inbound */}
        {missionPhase === 'inbound' && (
          <div className="border-2 border-emerald-400 p-4 text-center" style={{ backgroundColor: '#0d1f17' }}>
            <Plane className="w-8 h-8 text-emerald-400 mx-auto mb-2" style={{ transform: 'rotate(45deg)' }} />
            <div style={{ ...display, color: '#6ee7b7' }} className="text-xl mb-1 font-bold">RETURNING TO BASE</div>
            <div style={{ ...mono, color: '#e7e5e4' }} className="text-[10px] tracking-widest mb-4 font-bold">
              PROJ LANDING FUEL: {m.timeline[m.timeline.length - 1]?.projLanding?.toFixed(1)} GAL
            </div>
            <button onClick={completeMission}
              className="px-6 py-3 border-2 font-bold"
              style={{ ...mono, borderColor: '#10b981', backgroundColor: '#10b981', color: '#000' }}>
              <span className="text-xs tracking-widest">LANDED · COMPLETE</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BarberPoleFlag({ mono, compact = false, variant = 'red', label, sublabel }) {
  // Classic candy-stripe diagonal flag — red for data-unavailable, yellow for nearest-station
  const colors = variant === 'yellow'
    ? { stripe: '#c8202c', border: 'rgba(251,191,36,0.5)', text: 'text-amber-200' }
    : { stripe: '#c8202c', border: 'rgba(220,38,38,0.5)', text: 'text-red-300' };
  const defaultLabel = variant === 'yellow'
    ? (compact ? 'NEAR' : 'NEAREST')
    : (compact ? 'NO DATA' : 'NO DATA');
  const stripes = `repeating-linear-gradient(
    -45deg,
    ${colors.stripe} 0px,
    ${colors.stripe} 4px,
    #fafafa 4px,
    #fafafa 8px
  )`;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-1.5 py-0.5 border"
      style={{
        background: 'rgba(0,0,0,0.4)',
        borderColor: colors.border,
      }}
      title={variant === 'yellow'
        ? 'Using nearest reporting station — not the destination field'
        : 'No live weather data available for this station'}
    >
      <span
        aria-hidden
        style={{
          backgroundImage: stripes,
          backgroundSize: '11.3px 11.3px',
          width: '14px',
          height: '14px',
          display: 'inline-block',
          animation: 'barberpole 1.2s linear infinite',
          border: '1px solid rgba(0,0,0,0.4)',
        }}
      />
      <span style={mono} className={`text-[9px] tracking-widest font-bold ${colors.text}`}>
        {label || defaultLabel}
      </span>
      {sublabel && (
        <span style={mono} className={`text-[9px] tracking-widest ${colors.text} opacity-70`}>
          {sublabel}
        </span>
      )}
      <style>{`
        @keyframes barberpole {
          0%   { background-position: 0 0; }
          100% { background-position: 0 -22.6px; }
        }
      `}</style>
    </span>
  );
}

function CrewToggle({ role, val, onChange, mono }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 text-xs tracking-widest font-bold" style={{ ...mono, color: '#c8202c' }}>{role}</div>
      <button onClick={() => onChange('YES')}
        className="flex-1 py-2 border-2 text-xs tracking-widest transition-all font-bold"
        style={val === 'YES'
          ? { ...mono, borderColor: '#10b981', backgroundColor: '#10b981', color: '#000' }
          : { ...mono, borderColor: '#44403c', backgroundColor: '#1c1917', color: '#a8a29e' }
        }>YES</button>
      <button onClick={() => onChange('NO')}
        className="flex-1 py-2 border-2 text-xs tracking-widest transition-all font-bold"
        style={val === 'NO'
          ? { ...mono, borderColor: '#ef4444', backgroundColor: '#ef4444', color: '#000' }
          : { ...mono, borderColor: '#44403c', backgroundColor: '#1c1917', color: '#a8a29e' }
        }>NO</button>
    </div>
  );
}

function Field({ label, children, mono }) {
  return (
    <div className="border-2 border-stone-600 p-3" style={{ backgroundColor: '#1c1917' }}>
      <div style={{ ...mono, color: '#e7e5e4' }} className="text-[10px] tracking-[0.25em] mb-1 font-bold">{label}</div>
      {children}
    </div>
  );
}

function DepInput({ label, value, onChange, mono }) {
  return (
    <div>
      <div style={{ ...mono, color: '#e7e5e4' }} className="text-[10px] tracking-[0.25em] mb-1 font-bold">{label}</div>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border-2 px-3 py-2 text-base font-bold outline-none focus:border-red-600"
        style={{ ...mono, backgroundColor: '#000', borderColor: '#57534e', color: '#fafaf9' }} />
    </div>
  );
}

function FuelPreview({ form, mono }) {
  const burn = calcFuelBurn(form.ete);
  const proj = form.fuel - burn;
  const ok = proj >= 25;
  const pref = proj >= 30;
  return (
    <div className="border-2 border-stone-600 p-3 space-y-1" style={{ ...mono, backgroundColor: '#0f1115' }}>
      <div className="flex justify-between text-xs font-bold" style={{ color: '#e7e5e4' }}>
        <span>BURN</span><span>{burn.toFixed(1)} GAL</span>
      </div>
      <div className="flex justify-between text-xs font-bold">
        <span style={{ color: '#e7e5e4' }}>PROJ LANDING</span>
        <span style={{ color: pref ? '#34d399' : ok ? '#c8202c' : '#f87171' }}>
          {proj.toFixed(1)} GAL
        </span>
      </div>
      {!ok && (
        <div className="text-[10px] pt-1 tracking-widest font-bold" style={{ color: '#f87171' }}>
          ⚠ BELOW 25 GAL MINIMUM
        </div>
      )}
      {ok && !pref && (
        <div className="text-[10px] pt-1 tracking-widest font-bold" style={{ color: '#c8202c' }}>
          ⚠ BELOW 30 GAL PREFERRED
        </div>
      )}
    </div>
  );
}

function MissionLog({ log, onView, onDelete, mono, display }) {
  if (log.length === 0) return null;
  return (
    <div className="border-2 border-stone-600" style={{ backgroundColor: '#0f1115' }}>
      <div className="border-b-2 border-stone-600 px-4 py-2 flex items-center gap-2" style={{ backgroundColor: '#16181f' }}>
        <FileText className="w-3 h-3 text-red-500" />
        <span style={{ ...mono, color: '#c8202c' }} className="text-[10px] tracking-[0.3em] font-bold">SHIFT LOG · {log.length} ENTRIES</span>
        <span style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-widest font-bold ml-auto">TAP FOR DETAIL</span>
      </div>
      <div>
        {log.slice().reverse().map((m, i) => (
          <div key={m.id} className="flex items-stretch border-b border-stone-800"
            style={{ backgroundColor: i % 2 === 0 ? '#16181f' : '#1c1917' }}>
            <button onClick={() => onView && onView(m)}
              className="flex-1 px-4 py-2 flex items-center gap-3 text-xs text-left hover:opacity-90 active:opacity-70 min-w-0">
              <span style={{ ...mono, color: '#e7e5e4' }} className="w-16 font-bold shrink-0">{m.id}</span>
              <span style={{ ...mono, color: '#fafaf9' }} className="w-14 font-bold shrink-0">{m.pickup.icao}</span>
              <span style={{ ...mono, color: '#c8202c' }} className="w-14 font-bold shrink-0 text-right">{m.pickup.dist} NM</span>
              {m.status === 'completed' ? (
                <span style={{ ...mono, color: '#34d399' }} className="tracking-widest text-[10px] font-bold shrink-0">✓ COMPLETED</span>
              ) : (
                <>
                  <span style={{ ...mono, color: '#f87171' }} className="tracking-widest text-[10px] font-bold shrink-0">✗ DECLINED</span>
                  <span style={{ color: '#d6d3d1' }} className="truncate text-[10px]">— {m.declineReason}</span>
                </>
              )}
            </button>
            {onDelete && (
              <button onClick={() => onDelete(m)}
                className="px-3 border-l border-stone-800 hover:bg-red-900/30 active:bg-red-900/50 transition-colors"
                style={{ color: '#f87171' }}
                title="Remove from log">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EndedScreen({ log, shift, newShift, paperMode, fontStack, monoFont, displayFont }) {
  const completed = log.filter((m) => m.status === 'completed').length;
  const declined = log.filter((m) => m.status === 'declined').length;
  const declineCounts = log
    .filter((m) => m.status === 'declined')
    .reduce((acc, m) => {
      acc[m.declineReason] = (acc[m.declineReason] || 0) + 1;
      return acc;
    }, {});

  return (
    <div className={'min-h-screen p-4 ' + (paperMode ? 'paper-mode' : '')} style={{ ...fontStack, backgroundColor: '#0a0b0f', color: '#fafaf9' }}>
      <PaperModeStyles />
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-8">
          <div style={{ ...displayFont, color: '#c8202c' }} className="text-4xl font-bold">SHIFT COMPLETE</div>
          <div style={{ ...monoFont, color: '#e7e5e4' }} className="text-[10px] tracking-[0.3em] mt-2 font-bold">
            {shift.start}–{shift.end} MDT · KGJT
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="DISPATCHED" val={log.length} color="stone" mono={monoFont} display={displayFont} />
          <Stat label="COMPLETED" val={completed} color="emerald" mono={monoFont} display={displayFont} />
          <Stat label="DECLINED" val={declined} color="red" mono={monoFont} display={displayFont} />
        </div>

        {Object.keys(declineCounts).length > 0 && (
          <div className="border-2 border-stone-600 p-4 mb-6" style={{ backgroundColor: '#16181f' }}>
            <div style={{ ...monoFont, color: '#c8202c' }} className="text-[10px] tracking-[0.3em] mb-3 font-bold">DECLINE REASONS</div>
            {Object.entries(declineCounts).map(([reason, count]) => (
              <div key={reason} className="flex justify-between text-xs py-1 font-bold" style={monoFont}>
                <span style={{ color: '#fafaf9' }}>{reason}</span>
                <span style={{ color: '#c8202c' }}>×{count}</span>
              </div>
            ))}
          </div>
        )}

        {log.length > 0 && (
          <div className="border-2 border-stone-600 mb-6" style={{ backgroundColor: '#0f1115' }}>
            <div className="px-4 py-2 border-b-2 border-stone-600" style={{ ...monoFont, backgroundColor: '#16181f' }}>
              <span style={{ color: '#c8202c' }} className="text-[10px] tracking-[0.3em] font-bold">FULL LOG</span>
            </div>
            <div>
              {log.map((m, i) => (
                <div key={m.id} className="px-4 py-2 text-xs flex gap-3 border-b border-stone-800 font-bold"
                  style={{ ...monoFont, backgroundColor: i % 2 === 0 ? '#16181f' : '#1c1917' }}>
                  <span style={{ color: '#e7e5e4' }} className="w-14">{m.id}</span>
                  <span style={{ color: '#fafaf9' }} className="w-14">{m.pickup.icao}</span>
                  <span style={{ color: '#c8202c' }} className="w-12">{m.pickup.dist}NM</span>
                  <span className="tracking-widest text-[10px]"
                    style={{ color: m.status === 'completed' ? '#34d399' : '#f87171' }}>
                    {m.status === 'completed' ? '✓ DONE' : '✗ DECL'}
                  </span>
                  {m.declineReason && <span style={{ color: '#d6d3d1' }} className="text-[10px] truncate">{m.declineReason}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={newShift}
          className="w-full border-2 py-4 font-bold"
          style={{ ...displayFont, borderColor: '#c8202c', backgroundColor: '#c8202c', color: '#000' }}>
          <RotateCcw className="w-5 h-5 inline mr-3" />
          <span className="text-xl tracking-[0.2em]">NEW SHIFT</span>
        </button>
      </div>
    </div>
  );
}

function Stat({ label, val, color, mono, display }) {
  const colors = {
    emerald: { text: '#34d399', border: '#10b981', bg: '#0d1f17' },
    red: { text: '#f87171', border: '#ef4444', bg: '#1f0f0f' },
    stone: { text: '#fafaf9', border: '#78716c', bg: '#1c1917' },
  };
  const c = colors[color];
  return (
    <div className="border-2 p-4 text-center" style={{ borderColor: c.border, backgroundColor: c.bg }}>
      <div style={{ ...display, color: c.text }} className="text-4xl font-bold">{val}</div>
      <div style={{ ...mono, color: '#e7e5e4' }} className="text-[9px] tracking-[0.25em] mt-1 font-bold">{label}</div>
    </div>
  );
}

function Modal({ children }) {
  return (
    <div
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
    >
      {children}
    </div>
  );
}

function BaseMetarBanner({ metar, onRefresh, mono }) {
  if (metar.source === 'idle') return null;
  return (
    <div className="border-2 p-3 flex items-start gap-3"
      style={{
        borderColor: metar.source === 'live' ? '#10b981'
          : metar.source === 'nearest' ? '#f59e0b'
          : metar.source === 'unavailable' ? '#ef4444'
          : '#57534e',
        backgroundColor: '#0f1115',
      }}>
      <Cloud className="w-4 h-4 mt-0.5 shrink-0"
        style={{ color: metar.source === 'live' ? '#34d399'
          : metar.source === 'nearest' ? '#fbbf24'
          : metar.source === 'unavailable' ? '#f87171'
          : '#a8a29e' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ ...mono, color: '#c8202c' }} className="text-[10px] tracking-[0.25em] font-bold">
            BASE WX · KGJT
          </span>
          {metar.source === 'live' && (
            <span style={{ ...mono, color: '#34d399' }} className="text-[9px] tracking-widest font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          )}
          {metar.source === 'nearest' && (
            <BarberPoleFlag mono={mono} variant="yellow" label={metar.station}
              sublabel={metar.distance ? `${metar.distance} NM` : undefined} />
          )}
          {metar.source === 'unavailable' && <BarberPoleFlag mono={mono} />}
          {metar.source === 'loading' && (
            <span style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-widest font-bold">
              FETCHING…
            </span>
          )}
        </div>
        {metar.source === 'loading' ? (
          <div style={{ ...mono, color: '#a8a29e' }} className="text-xs italic mt-0.5">
            Querying aviationweather.gov…
          </div>
        ) : metar.source === 'unavailable' ? (
          <div style={{ ...mono, color: '#f87171' }} className="text-xs font-bold mt-0.5">
            —— NO METAR AVAILABLE · CHECK CONNECTIVITY OR TRY REFRESH ——
          </div>
        ) : (
          <div style={{ ...mono, color: '#67e8f9' }} className="text-xs break-all font-bold mt-0.5">
            {metar.raw}
          </div>
        )}
      </div>
      <button onClick={onRefresh}
        disabled={metar.source === 'loading'}
        className="text-stone-400 hover:text-cyan-300 disabled:opacity-30 shrink-0"
        title="Refresh">
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function FRATModal({ fratData, setFratData, presets, onSavePreset, onLoadPreset, onDeletePreset, onApply, onClose, mono, display }) {
  const { total, breakdown } = calcFRAT(fratData);
  const status = fratStatus(total);

  const setField = (id, val) => setFratData((d) => ({ ...d, [id]: val }));
  const reset = () => setFratData({});

  return (
    <Modal>
      <div className="border-2 max-w-lg w-full max-h-[90vh] flex flex-col"
        style={{ borderColor: '#22d3ee', backgroundColor: '#0a0b0f' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b-2 flex items-center justify-between shrink-0"
          style={{ borderColor: '#22d3ee', backgroundColor: '#0c1b22' }}>
          <div>
            <div style={{ ...display, color: '#67e8f9' }} className="text-xl font-bold leading-none">
              FLIGHT RISK ASSESSMENT
            </div>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-[0.3em] mt-1 font-bold">
              HAA · FAA AC 135-14B FRAMEWORK
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onSavePreset}
              className="border-2 px-2 py-1 font-bold"
              style={{ ...mono, borderColor: '#f5c518', backgroundColor: '#1a1505', color: '#fcd34d' }}>
              <span className="text-[9px] tracking-widest">SAVE</span>
            </button>
            <button onClick={reset}
              style={{ ...mono, color: '#a8a29e' }}
              className="text-[10px] tracking-widest font-bold hover:opacity-70">
              RESET
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Presets bar */}
          {presets && presets.length > 0 && (
            <div className="border-2 p-2" style={{ borderColor: '#f5c51866', backgroundColor: '#1a1505' }}>
              <div style={{ ...mono, color: '#fcd34d' }} className="text-[9px] tracking-widest font-bold mb-1.5">
                LOAD PRESET
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <div key={p.id} className="flex items-stretch">
                    <button onClick={() => onLoadPreset(p)}
                      className="border-2 border-r-0 px-2 py-1 font-bold"
                      style={{ ...mono, borderColor: '#f5c51866', backgroundColor: '#000', color: '#fcd34d' }}>
                      <span className="text-[10px]">{p.name}</span>
                    </button>
                    <button onClick={() => { if (confirm(`Delete preset "${p.name}"?`)) onDeletePreset(p.id); }}
                      className="border-2 px-1.5 font-bold"
                      style={{ ...mono, borderColor: '#f5c51866', backgroundColor: '#1a0d0d', color: '#f87171' }}
                      title="Delete preset">
                      <span className="text-[10px]">×</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-l-2 px-3 py-2"
            style={{ borderColor: '#22d3ee', backgroundColor: '#0c1b22' }}>
            <div style={{ ...mono, color: '#67e8f9' }} className="text-[9px] tracking-widest font-bold mb-1">
              ABOUT THIS TOOL
            </div>
            <div style={{ ...mono, color: '#d6d3d1' }} className="text-[10px] leading-relaxed">
              Risk factors and category structure are based on FAA Advisory Circular 135-14B (Helicopter
              Air Ambulance Operations), Appendix A "Sample Risk Analysis Tools," and 14 CFR §135.617.
              This is the same framework Med-Trans / Global Medical Response and other Part 135 HAA
              operators use to develop their proprietary FRATs. Their internal tools are not published
              publicly, so weighting here is illustrative — calibrate to your program's own minima.
            </div>
          </div>

          {Object.entries(FRAT_FIELDS).map(([sectionKey, section]) => (
            <div key={sectionKey} className="border-2 border-stone-600"
              style={{ backgroundColor: '#1c1917' }}>
              <div className="px-3 py-2 border-b-2 border-stone-600 flex items-center justify-between"
                style={{ backgroundColor: '#16181f' }}>
                <span style={{ ...mono, color: '#c8202c' }} className="text-[10px] tracking-[0.25em] font-bold">
                  {section.title.toUpperCase()}
                </span>
                <span style={{ ...mono, color: '#fafaf9' }} className="text-sm font-bold">
                  {breakdown[sectionKey]}
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: '#44403c' }}>
                {section.items.map((item) => (
                  <FRATRow key={item.id} item={item}
                    value={fratData[item.id]}
                    onChange={(v) => setField(item.id, v)}
                    mono={mono} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer — score + actions */}
        <div className="border-t-2 shrink-0" style={{ borderColor: status.color, backgroundColor: status.bg }}>
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-[0.3em] font-bold">
                TOTAL SCORE
              </div>
              <div className="flex items-baseline gap-3">
                <span style={{ ...display, color: status.text }} className="text-4xl font-bold leading-none">
                  {total}
                </span>
                <span style={{ ...mono, color: status.text }} className="text-base tracking-widest font-bold">
                  {status.label}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="border-2 px-3 py-2 font-bold"
                style={{ ...mono, borderColor: '#57534e', backgroundColor: '#1c1917', color: '#e7e5e4' }}>
                <span className="text-[10px] tracking-widest">CANCEL</span>
              </button>
              <button onClick={() => onApply(total)}
                className="border-2 px-3 py-2 font-bold"
                style={{ ...mono, borderColor: status.color, backgroundColor: status.color, color: '#000' }}>
                <span className="text-[10px] tracking-widest">APPLY · {total}</span>
              </button>
            </div>
          </div>
          <div className="px-4 pb-3" style={{ ...mono, color: status.text }}>
            <div className="text-[10px] tracking-wider mb-1">{status.advice}</div>
            <div className="text-[9px] tracking-widest font-bold opacity-80">
              ≤15 GO (PIC) · 16–30 CAUTION (OCC SUP) · &gt;30 NO-GO (DIRECTOR)
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function FRATRow({ item, value, onChange, mono }) {
  // Compute current points for this row
  let pts = 0;
  if (item.type === 'toggle') {
    if (value === true && item.whenYes != null) pts = item.whenYes;
    if (value === false && item.whenNo != null) pts = item.whenNo;
    if (value === undefined && item.whenNo != null) pts = item.whenNo;
  } else if (item.type === 'tier') {
    const num = typeof value === 'number' ? value : item.default;
    for (const [threshold, points] of item.tiers) {
      if (num < threshold) { pts = points; break; }
    }
  } else if (item.type === 'cycle') {
    const idx = typeof value === 'number' ? value : (item.default ?? 0);
    pts = item.options[idx]?.[1] ?? 0;
  }

  const ptsColor = pts >= 5 ? '#f87171' : pts >= 3 ? '#c8202c' : pts > 0 ? '#fca5a5' : pts < 0 ? '#34d399' : '#a8a29e';

  return (
    <div className="px-3 py-2.5 flex items-center gap-2 border-t" style={{ borderColor: '#44403c' }}>
      <div className="flex-1 min-w-0">
        <div style={{ color: '#fafaf9' }} className="text-xs leading-snug font-bold">
          {item.label}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {item.type === 'toggle' && (
          <FRATToggle value={value === true} onChange={(v) => onChange(v)} />
        )}
        {item.type === 'tier' && (
          <input
            type="number"
            value={typeof value === 'number' ? value : item.default}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            className="border-2 px-2 py-1 w-16 text-sm font-bold outline-none focus:border-red-600 text-right"
            style={{ ...mono, backgroundColor: '#000', borderColor: '#57534e', color: '#fafaf9' }}
          />
        )}
        {item.type === 'cycle' && (
          <button
            onClick={() => {
              const idx = typeof value === 'number' ? value : (item.default ?? 0);
              const next = (idx + 1) % item.options.length;
              onChange(next);
            }}
            className="border-2 px-2 py-1 text-[10px] font-bold tracking-widest min-w-[80px]"
            style={{ ...mono, backgroundColor: '#0c1b22', borderColor: '#22d3ee', color: '#67e8f9' }}
          >
            {item.options[typeof value === 'number' ? value : (item.default ?? 0)][0].toUpperCase()}
          </button>
        )}
        <span style={{ ...mono, color: ptsColor }} className="w-7 text-right text-sm font-bold">
          {pts > 0 ? `+${pts}` : pts}
        </span>
      </div>
    </div>
  );
}

function FRATToggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-12 h-6 transition-all"
      style={{
        backgroundColor: value ? '#10b981' : '#44403c',
        borderRadius: '999px',
      }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 transition-all"
        style={{
          left: value ? 'calc(100% - 22px)' : '2px',
          backgroundColor: '#fafaf9',
          borderRadius: '999px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLIGHT HISTORY MODAL — all-time archive of completed/declined missions
// ─────────────────────────────────────────────────────────────────────────────
function HistoryModal({ history, onClose, onView, onDelete, onClearAll, mono, display }) {
  const [filter, setFilter] = useState('all'); // all | completed | declined
  const [search, setSearch] = useState('');

  const filtered = history.filter((m) => {
    if (filter === 'completed' && m.status !== 'completed') return false;
    if (filter === 'declined' && m.status !== 'declined') return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [m.id, m.pickup?.icao, m.pickup?.name, m.pickup?.city, m.declineReason, m.shiftLabel]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Aggregate stats from filtered set
  const stats = {
    total: filtered.length,
    completed: filtered.filter((m) => m.status === 'completed').length,
    declined: filtered.filter((m) => m.status === 'declined').length,
    nmTotal: filtered
      .filter((m) => m.status === 'completed')
      .reduce((sum, m) => sum + (m.pickup?.dist || 0) * 2, 0),
  };

  // Group by shiftLabel for display
  const grouped = filtered.reduce((acc, m) => {
    const key = m.shiftLabel || 'Unarchived';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped);

  return (
    <Modal>
      <div className="border-2 max-w-2xl w-full max-h-[92vh] flex flex-col"
        style={{ borderColor: '#22d3ee', backgroundColor: '#0a0b0f' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b-2 flex items-center justify-between shrink-0"
          style={{ borderColor: '#22d3ee', backgroundColor: '#0c1b22' }}>
          <div>
            <div style={{ ...display, color: '#67e8f9' }} className="text-xl font-bold leading-none">
              FLIGHT HISTORY
            </div>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-[0.3em] mt-1 font-bold">
              ALL-TIME ARCHIVE · {history.length} TOTAL RECORDS
            </div>
          </div>
          <button onClick={onClose}
            className="border-2 px-3 py-1.5 font-bold"
            style={{ ...mono, borderColor: '#57534e', backgroundColor: '#1c1917', color: '#e7e5e4' }}>
            <span className="text-[10px] tracking-widest">CLOSE</span>
          </button>
        </div>

        {/* Stats strip */}
        <div className="px-4 py-2 border-b-2 grid grid-cols-4 gap-2 shrink-0"
          style={{ borderColor: '#1f2937', backgroundColor: '#0f1115' }}>
          <HistoryStat label="SHOWN" value={stats.total} color="#fafaf9" mono={mono} display={display} />
          <HistoryStat label="✓ DONE" value={stats.completed} color="#34d399" mono={mono} display={display} />
          <HistoryStat label="✗ DECL" value={stats.declined} color="#f87171" mono={mono} display={display} />
          <HistoryStat label="NM FLOWN" value={stats.nmTotal.toLocaleString()} color="#c8202c" mono={mono} display={display} />
        </div>

        {/* Filters */}
        <div className="px-4 py-2 border-b-2 flex items-center gap-2 flex-wrap shrink-0"
          style={{ borderColor: '#1f2937', backgroundColor: '#0f1115' }}>
          <input
            type="text"
            placeholder="Search ICAO, city, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[140px] border-2 px-2 py-1.5 text-xs outline-none focus:border-cyan-400"
            style={{ ...mono, backgroundColor: '#000', borderColor: '#57534e', color: '#fafaf9' }}
          />
          <div className="flex gap-1">
            {['all', 'completed', 'declined'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className="border-2 px-2 py-1 font-bold"
                style={{ ...mono,
                  borderColor: filter === f ? '#22d3ee' : '#57534e',
                  backgroundColor: filter === f ? '#22d3ee' : '#1c1917',
                  color: filter === f ? '#000' : '#a8a29e',
                }}>
                <span className="text-[9px] tracking-widest">{f.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {history.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: '#44403c' }} />
              <div style={{ ...mono, color: '#a8a29e' }} className="text-xs font-bold">
                NO HISTORICAL RECORDS YET
              </div>
              <div style={{ ...mono, color: '#78716c' }} className="text-[10px] mt-1">
                Completed shifts will be archived here.
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div style={{ ...mono, color: '#a8a29e' }} className="text-xs font-bold">
                NO RECORDS MATCH FILTERS
              </div>
            </div>
          ) : (
            groupKeys.map((shiftLabel) => (
              <div key={shiftLabel}>
                <div className="px-4 py-1.5 sticky top-0 border-b border-stone-800 flex items-center gap-2"
                  style={{ backgroundColor: '#0f1115' }}>
                  <Clock className="w-3 h-3" style={{ color: '#c8202c' }} />
                  <span style={{ ...mono, color: '#c8202c' }} className="text-[10px] tracking-widest font-bold">
                    {shiftLabel}
                  </span>
                  <span style={{ ...mono, color: '#78716c' }} className="text-[9px] tracking-widest font-bold ml-auto">
                    {grouped[shiftLabel].length} REC
                  </span>
                </div>
                {grouped[shiftLabel].map((m, i) => (
                  <div key={m.id} className="flex items-stretch border-b border-stone-800"
                    style={{ backgroundColor: i % 2 === 0 ? '#16181f' : '#1c1917' }}>
                    <button onClick={() => onView && onView(m)}
                      className="flex-1 px-4 py-2 flex items-center gap-3 text-xs text-left hover:opacity-90 active:opacity-70 min-w-0">
                      <span style={{ ...mono, color: '#e7e5e4' }} className="w-16 font-bold shrink-0">{m.id}</span>
                      <span style={{ ...mono, color: '#fafaf9' }} className="w-14 font-bold shrink-0">{m.pickup?.icao}</span>
                      <span style={{ ...mono, color: '#c8202c' }} className="w-14 font-bold shrink-0 text-right">{m.pickup?.dist} NM</span>
                      {m.status === 'completed' ? (
                        <span style={{ ...mono, color: '#34d399' }} className="tracking-widest text-[10px] font-bold shrink-0">✓ DONE</span>
                      ) : (
                        <>
                          <span style={{ ...mono, color: '#f87171' }} className="tracking-widest text-[10px] font-bold shrink-0">✗ DECL</span>
                          <span style={{ color: '#d6d3d1' }} className="truncate text-[10px]">— {m.declineReason}</span>
                        </>
                      )}
                    </button>
                    {onDelete && (
                      <button onClick={() => onDelete(m)}
                        className="px-3 border-l border-stone-800 hover:bg-red-900/30 active:bg-red-900/50 transition-colors"
                        style={{ color: '#f87171' }}
                        title="Remove from history">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="px-4 py-2 border-t-2 flex items-center justify-between shrink-0"
            style={{ borderColor: '#1f2937', backgroundColor: '#0f1115' }}>
            <div style={{ ...mono, color: '#78716c' }} className="text-[9px] tracking-widest font-bold">
              ARCHIVE CAPPED AT {500} RECORDS
            </div>
            <button onClick={onClearAll}
              className="border-2 px-3 py-1 font-bold"
              style={{ ...mono, borderColor: '#7f1d1d', backgroundColor: '#1f0f0f', color: '#fca5a5' }}>
              <span className="text-[9px] tracking-widest">CLEAR ALL</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function HistoryStat({ label, value, color, mono, display }) {
  return (
    <div className="border-l-2 pl-2" style={{ borderColor: color }}>
      <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-widest font-bold">{label}</div>
      <div style={{ ...display, color }} className="text-lg font-bold leading-none mt-0.5">{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSION DETAIL MODAL — full flight record per HEMS documentation standard
// ─────────────────────────────────────────────────────────────────────────────
function MissionDetailModal({ mission, onClose, mono, display }) {
  const m = mission;
  const isCompleted = m.status === 'completed';
  const accent = isCompleted ? '#10b981' : '#ef4444';
  const accentText = isCompleted ? '#6ee7b7' : '#fca5a5';
  const accentBg = isCompleted ? '#0d1f17' : '#1f0f0f';

  // Compute block times from timeline
  const timeline = (m.timeline || []).map((leg) => ({
    ...leg,
    time: leg.time instanceof Date ? leg.time : new Date(leg.time),
  }));

  const fmtT = (d) => {
    if (!d || isNaN(d.getTime())) return '——';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const fraStatus = m.fra != null
    ? (m.fra > 30 ? 'NO-GO' : m.fra > 15 ? 'CAUTION' : 'GO')
    : '——';

  return (
    <Modal>
      <div className="border-2 max-w-lg w-full max-h-[92vh] flex flex-col"
        style={{ borderColor: accent, backgroundColor: '#0a0b0f' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b-2 flex items-center justify-between shrink-0"
          style={{ borderColor: accent, backgroundColor: accentBg }}>
          <div className="min-w-0">
            <div style={{ ...display, color: accentText }} className="text-xl font-bold leading-none">
              FLIGHT RECORD
            </div>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-[0.3em] mt-1 font-bold truncate">
              {m.id} · {isCompleted ? 'COMPLETED' : 'DECLINED'}
              {m.shiftLabel && ` · ${m.shiftLabel}`}
            </div>
          </div>
          <button onClick={onClose}
            className="border-2 px-3 py-1.5 font-bold shrink-0"
            style={{ ...mono, borderColor: '#57534e', backgroundColor: '#1c1917', color: '#e7e5e4' }}>
            <span className="text-[10px] tracking-widest">CLOSE</span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {/* Status banner */}
          <div className="border-2 px-3 py-2"
            style={{ borderColor: accent, backgroundColor: accentBg }}>
            <div style={{ ...mono, color: accentText }} className="text-xs font-bold tracking-widest">
              {isCompleted ? '✓ MISSION COMPLETED' : '✗ MISSION DECLINED'}
            </div>
            {m.declineReason && (
              <div style={{ ...mono, color: '#fafaf9' }} className="text-xs font-bold mt-1">
                Reason: {m.declineReason}
              </div>
            )}
          </div>

          {/* Aircraft */}
          {m.tail && (
            <DetailSection title="AIRCRAFT" mono={mono}>
              <DetailRow label="Tail" value={m.tail} mono={mono} accent="#fafaf9" />
              <DetailRow label="Operator" value="SE TX AIR RESCUE · KGJT" mono={mono} accent="#f5c518" />
            </DetailSection>
          )}

          {/* Route */}
          <DetailSection title="ROUTING" mono={mono}>
            <DetailRow label="Pickup" value={`${m.pickup?.icao} · ${m.pickup?.name}`} mono={mono} />
            <DetailRow label="City" value={m.pickup?.city} mono={mono} />
            <DetailRow label="Distance" value={`${m.pickup?.dist} NM`} mono={mono} />
            <DetailRow label="Runway" value={`${m.pickup?.rwy?.toLocaleString()} ft`} mono={mono} />
            {m.isOriginTransfer && m.transferTo && (
              <DetailRow label="Transfer to" value={`${m.transferTo.icao} (${m.transferTo.region})`} mono={mono} accent="#c4b5fd" />
            )}
            {m.transferDest && !m.isOriginTransfer && (
              <DetailRow label="Diverted to" value={`${m.transferDest.icao} (${m.transferDest.region})`} mono={mono} accent="#c4b5fd" />
            )}
          </DetailSection>

          {/* Patient */}
          {m.patient && (
            <DetailSection title="PATIENT" mono={mono}>
              <DetailRow label="Acuity" value={m.patient.tier?.toUpperCase()} mono={mono}
                accent={m.patient.tier === 'critical' ? '#fca5a5' : m.patient.tier === 'urgent' ? '#fcd34d' : '#6ee7b7'} />
              <DetailRow label="Condition" value={m.patient.condition} mono={mono} />
              <DetailRow label="Weight" value={`${m.patient.weightLb} lb / ${Math.round(m.patient.weightLb / 2.205)} kg`} mono={mono} />
            </DetailSection>
          )}

          {/* Risk Assessment */}
          <DetailSection title="RISK ASSESSMENT" mono={mono}>
            <DetailRow label="FRA Score" value={m.fra != null ? String(m.fra) : '——'} mono={mono} />
            <DetailRow label="Disposition" value={fraStatus} mono={mono}
              accent={m.fra > 30 ? '#fca5a5' : m.fra > 15 ? '#fca5a5' : '#6ee7b7'} />
          </DetailSection>

          {/* Crew */}
          {m.crew && (
            <DetailSection title="CREW CONCURRENCE" mono={mono}>
              {Object.entries(m.crew).map(([role, val]) => (
                <DetailRow key={role} label={role} value={val}
                  accent={val === 'YES' ? '#6ee7b7' : val === 'NO' ? '#fca5a5' : '#a8a29e'}
                  mono={mono} />
              ))}
            </DetailSection>
          )}

          {/* Block times / Timeline */}
          {timeline.length > 0 && (
            <DetailSection title="BLOCK TIMES" mono={mono}>
              <div className="border-2 p-2" style={{ borderColor: '#44403c', backgroundColor: '#0f1115' }}>
                <div className="grid gap-1 text-[10px]" style={{ ...mono, color: '#e7e5e4' }}>
                  <div className="grid grid-cols-[80px_60px_50px_50px_60px] gap-2 pb-1 border-b font-bold"
                    style={{ borderColor: '#44403c', color: '#c8202c' }}>
                    <span>LEG</span>
                    <span>OUT</span>
                    <span className="text-right">SOULS</span>
                    <span className="text-right">FUEL</span>
                    <span className="text-right">ETE</span>
                  </div>
                  {timeline.map((leg, i) => (
                    <div key={i} className="grid grid-cols-[80px_60px_50px_50px_60px] gap-2">
                      <span className="font-bold" style={{ color: '#fafaf9' }}>{leg.leg?.toUpperCase()}</span>
                      <span>{fmtT(leg.time)}</span>
                      <span className="text-right">{leg.souls}</span>
                      <span className="text-right">{leg.fuel}g</span>
                      <span className="text-right">{leg.ete}m</span>
                    </div>
                  ))}
                </div>
              </div>
            </DetailSection>
          )}

          {/* Fuel */}
          {(m.fuelAtDispatch != null || timeline.length > 0) && (
            <DetailSection title="FUEL" mono={mono}>
              {m.fuelAtDispatch != null && (
                <DetailRow label="At dispatch" value={`${m.fuelAtDispatch} gal`} mono={mono} />
              )}
              {timeline.length > 0 && (
                <DetailRow label="Final landing (proj)"
                  value={`${timeline[timeline.length - 1]?.projLanding?.toFixed(1)} gal`}
                  mono={mono} />
              )}
            </DetailSection>
          )}

          {/* Weather */}
          {m.metar && (
            <DetailSection title="WEATHER ON FILE" mono={mono}>
              <div className="border-l-2 pl-2 py-0.5" style={{ borderColor: '#67e8f9' }}>
                <div style={{ ...mono, color: '#67e8f9' }} className="text-[10px] break-all font-bold">
                  {m.metar}
                </div>
                {m.metarSource && (
                  <div style={{ ...mono, color: '#78716c' }} className="text-[9px] mt-0.5 tracking-widest font-bold">
                    SOURCE: {m.metarSource.toUpperCase()}
                    {m.metarStation && m.metarStation !== m.pickup?.icao && ` · ${m.metarStation}`}
                  </div>
                )}
              </div>
            </DetailSection>
          )}

          {m.archivedAt && (
            <div style={{ ...mono, color: '#78716c' }} className="text-[9px] tracking-widest font-bold pt-2">
              ARCHIVED {new Date(m.archivedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function DetailSection({ title, children, mono }) {
  return (
    <div>
      <div style={{ ...mono, color: '#c8202c' }} className="text-[10px] tracking-[0.25em] font-bold mb-1">
        {title}
      </div>
      <div className="border-2 divide-y" style={{ borderColor: '#44403c', backgroundColor: '#1c1917' }}>
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value, accent, mono }) {
  return (
    <div className="px-3 py-1.5 flex items-center gap-3" style={{ borderColor: '#44403c' }}>
      <span style={{ ...mono, color: '#a8a29e' }} className="text-[10px] tracking-wider font-bold w-32 shrink-0">
        {label}
      </span>
      <span style={{ ...mono, color: accent || '#fafaf9' }} className="text-xs font-bold flex-1 text-right break-all">
        {value || '——'}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPLASH SCREEN — branded intro shown briefly on app load
// ─────────────────────────────────────────────────────────────────────────────
function SplashScreen({ displayFont, monoFont }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#0d1429' }}>
      {/* Aircraft photo backdrop, darkened */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: `url("${TEX.aircraft}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.35) saturate(1.1)',
        }} />
      {/* Deep vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(13,20,41,0.2) 0%, rgba(0,0,0,0.85) 100%)',
        }} />

      <div className="relative text-center animate-in fade-in zoom-in duration-500 px-4">
        {/* Real embroidered patch */}
        <img src={TEX.patch} alt="Southeast Texas Air Rescue"
          className="w-56 h-56 mx-auto mb-6"
          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.7))' }} />

        <div className="mt-2 flex items-center justify-center gap-3">
          <div className="h-px w-16" style={{ backgroundColor: '#c8202c' }} />
          <div style={{ ...monoFont, color: '#c0c4c8' }} className="text-[11px] tracking-[0.4em] font-bold">
            BEAUMONT · KGJT BASE
          </div>
          <div className="h-px w-16" style={{ backgroundColor: '#c8202c' }} />
        </div>
        <div style={{ ...monoFont, color: '#a8a29e' }} className="text-[10px] tracking-[0.4em] mt-3 font-bold">
          OPERATIONS CONTROL CENTER
        </div>
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#c8202c' }} />
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#f5c518', animationDelay: '200ms' }} />
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#c8202c', animationDelay: '400ms' }} />
        </div>
      </div>
      <div className="absolute bottom-6 left-0 right-0 text-center"
        style={{ ...monoFont, color: '#a8a29e' }}>
        <div className="text-[9px] tracking-widest font-bold">v1.4 · CIRRUS SR22 TN · N72ET · TRAINING SIMULATOR</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA WEATHER MODAL — METAR overlay for every airport in dispatch range
// ─────────────────────────────────────────────────────────────────────────────
function AreaWxModal({ areaWx, liveOps, airports, medCenters, onRefresh, onClose, mono, display }) {
  // Build merged list grouped by section
  const all = [
    { icao: 'KGJT', name: 'Grand Junction Regional · BASE', dist: 0, group: 'BASE' },
    ...airports.map(a => ({ ...a, group: 'DISPATCH RANGE' })),
    ...medCenters.map(c => ({
      icao: c.icao, name: `${c.name} · ${c.region}`,
      dist: c.distFromGJT, group: 'TRANSFER CENTERS'
    })),
  ];

  // Group and sort
  const groups = {};
  for (const a of all) {
    if (!groups[a.group]) groups[a.group] = [];
    groups[a.group].push({ ...a, metar: areaWx.data[a.icao] });
  }
  Object.values(groups).forEach(g => g.sort((a, b) => a.dist - b.dist));

  // Summary tally
  const cats = { VFR: 0, MVFR: 0, IFR: 0, LIFR: 0, UNKN: 0 };
  for (const a of all) {
    const parsed = parseMETAR(areaWx.data[a.icao]);
    cats[parsed?.category || 'UNKN']++;
  }

  return (
    <Modal>
      <div className="border-2 max-w-2xl w-full max-h-[92vh] flex flex-col"
        style={{ borderColor: '#10b981', backgroundColor: '#0a0b0f' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b-2 flex items-center justify-between shrink-0"
          style={{ borderColor: '#10b981', backgroundColor: '#0d1f17' }}>
          <div>
            <div style={{ ...display, color: '#6ee7b7' }} className="text-xl font-bold leading-none">
              AREA WEATHER
            </div>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-[0.3em] mt-1 font-bold">
              METAR · LIVE FROM AVIATIONWEATHER.GOV
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRefresh}
              disabled={areaWx.loading}
              className="border-2 px-3 py-1.5 font-bold disabled:opacity-50"
              style={{ ...mono, borderColor: '#10b981', backgroundColor: '#0d1f17', color: '#34d399' }}>
              <RotateCcw className={'w-3 h-3 inline mr-1 ' + (areaWx.loading ? 'animate-spin' : '')} />
              <span className="text-[9px] tracking-widest">REFRESH</span>
            </button>
            <button onClick={onClose}
              className="border-2 px-3 py-1.5 font-bold"
              style={{ ...mono, borderColor: '#57534e', backgroundColor: '#1c1917', color: '#e7e5e4' }}>
              <span className="text-[10px] tracking-widest">CLOSE</span>
            </button>
          </div>
        </div>

        {/* Category tally */}
        <div className="px-4 py-2 border-b-2 grid grid-cols-4 gap-2 shrink-0"
          style={{ borderColor: '#1f2937', backgroundColor: '#0f1115' }}>
          <CatChip label="VFR" count={cats.VFR} cat="VFR" mono={mono} display={display} />
          <CatChip label="MVFR" count={cats.MVFR} cat="MVFR" mono={mono} display={display} />
          <CatChip label="IFR" count={cats.IFR} cat="IFR" mono={mono} display={display} />
          <CatChip label="LIFR" count={cats.LIFR} cat="LIFR" mono={mono} display={display} />
        </div>

        {/* Loading state */}
        {areaWx.loading && Object.keys(areaWx.data).length === 0 ? (
          <div className="flex-1 p-8 text-center">
            <div style={{ ...mono, color: '#a8a29e' }} className="text-xs font-bold tracking-widest">
              QUERYING AVIATIONWEATHER.GOV…
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {Object.entries(groups).map(([groupName, items]) => (
              <div key={groupName}>
                <div className="px-4 py-1.5 sticky top-0 border-b border-stone-800"
                  style={{ backgroundColor: '#0f1115' }}>
                  <span style={{ ...mono, color: '#f5c518' }} className="text-[10px] tracking-widest font-bold">
                    {groupName}
                  </span>
                </div>
                {items.map((a, i) => {
                  const parsed = parseMETAR(a.metar);
                  const cat = parsed?.category || 'UNKN';
                  const c = flightCatColor(cat);
                  return (
                    <div key={a.icao} className="px-4 py-2 border-b border-stone-800"
                      style={{ backgroundColor: i % 2 === 0 ? '#16181f' : '#1c1917' }}>
                      <div className="flex items-baseline gap-3 mb-1">
                        <span style={{ ...mono, color: '#fafaf9' }} className="text-sm font-bold tracking-wider w-14">
                          {a.icao}
                        </span>
                        <span className="border-2 px-1.5 py-0.5 text-[9px] tracking-widest font-bold"
                          style={{ ...mono, borderColor: c.border, backgroundColor: c.bg, color: c.text }}>
                          {cat}
                        </span>
                        {a.dist > 0 && (
                          <span style={{ ...mono, color: '#a8a29e' }} className="text-[10px] font-bold ml-auto shrink-0">
                            {a.dist} NM
                          </span>
                        )}
                      </div>
                      <div style={{ ...mono, color: '#c0c4c8' }} className="text-[10px] mb-1">
                        {a.name}
                      </div>
                      {a.metar ? (
                        <div style={{ ...mono, color: '#67e8f9' }} className="text-[10px] break-all font-bold leading-snug">
                          {a.metar}
                        </div>
                      ) : (
                        <div style={{ ...mono, color: '#57534e' }} className="text-[10px] italic">
                          No METAR available
                        </div>
                      )}
                      {parsed && (
                        <div className="flex gap-3 mt-1 flex-wrap" style={{ ...mono, color: '#a8a29e' }}>
                          {parsed.ceiling != null && (
                            <span className="text-[9px] font-bold tracking-wider">
                              CIG {parsed.ceiling.toLocaleString()}′
                            </span>
                          )}
                          {parsed.vis != null && (
                            <span className="text-[9px] font-bold tracking-wider">
                              VIS {parsed.vis}SM
                            </span>
                          )}
                          {parsed.wind && (
                            <span className="text-[9px] font-bold tracking-wider">
                              {parsed.wind.dir === 'VRB' ? 'VRB' : String(parsed.wind.dir).padStart(3, '0')}
                              @{parsed.wind.speed}{parsed.wind.gust ? `G${parsed.wind.gust}` : ''}KT
                            </span>
                          )}
                          {parsed.temp != null && (
                            <span className="text-[9px] font-bold tracking-wider">
                              {parsed.temp}°/{parsed.dewp}°C
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* ─── LIVE OPS DATA ─── */}
            <LiveOpsBlock liveOps={liveOps} mono={mono} display={display} />
          </div>
        )}

        {/* Footer */}
        {areaWx.loadedAt && (
          <div className="px-4 py-2 border-t-2 shrink-0 flex items-center justify-between"
            style={{ borderColor: '#1f2937', backgroundColor: '#0f1115' }}>
            <div style={{ ...mono, color: '#78716c' }} className="text-[9px] tracking-widest font-bold">
              UPDATED {areaWx.loadedAt.toLocaleTimeString()}
            </div>
            <div style={{ ...mono, color: '#78716c' }} className="text-[9px] tracking-widest font-bold">
              {Object.keys(areaWx.data).length} STATIONS · LIVE FEEDS
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Live ops data block appended to bottom of area wx modal
function LiveOpsBlock({ liveOps, mono, display }) {
  const fmtLocal = (d) => d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '——';

  return (
    <>
      {/* SUN / TWILIGHT */}
      {liveOps?.sunKGJT && (
        <div>
          <div className="px-4 py-1.5 sticky top-0 border-b border-stone-800"
            style={{ backgroundColor: '#0f1115' }}>
            <span style={{ ...mono, color: '#f5c518' }} className="text-[10px] tracking-widest font-bold">
              KGJT · SUN / TWILIGHT
            </span>
          </div>
          <div className="px-4 py-3 grid grid-cols-4 gap-2" style={{ backgroundColor: '#16181f' }}>
            <SunCell label="CIVIL BEG" val={fmtLocal(liveOps.sunKGJT.civilBegin)} mono={mono} display={display} />
            <SunCell label="SUNRISE"   val={fmtLocal(liveOps.sunKGJT.sunrise)}    mono={mono} display={display} />
            <SunCell label="SUNSET"    val={fmtLocal(liveOps.sunKGJT.sunset)}     mono={mono} display={display} />
            <SunCell label="CIVIL END" val={fmtLocal(liveOps.sunKGJT.civilEnd)}   mono={mono} display={display} />
          </div>
        </div>
      )}

      {/* AIRMET / SIGMET */}
      <div>
        <div className="px-4 py-1.5 sticky top-0 border-b border-stone-800"
          style={{ backgroundColor: '#0f1115' }}>
          <span style={{ ...mono, color: '#f5c518' }} className="text-[10px] tracking-widest font-bold">
            AIRMETS · SIGMETS · CWA (WESTERN US)
          </span>
        </div>
        {liveOps?.airsigmet == null && liveOps?.loading ? (
          <div className="px-4 py-3" style={{ ...mono, color: '#78716c', backgroundColor: '#16181f' }}>
            <span className="text-[10px] italic">Loading…</span>
          </div>
        ) : liveOps?.airsigmet?.length > 0 ? (
          liveOps.airsigmet.map((b, i) => (
            <div key={i} className="px-4 py-2 border-b border-stone-800"
              style={{ backgroundColor: i % 2 === 0 ? '#16181f' : '#1c1917' }}>
              <div style={{ ...mono, color: '#67e8f9' }} className="text-[10px] break-all font-bold leading-snug whitespace-pre-wrap">
                {b.trim()}
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-3" style={{ backgroundColor: '#16181f' }}>
            <span style={{ ...mono, color: '#78716c' }} className="text-[10px] italic">
              No active AIRMET/SIGMET affecting Western US operations.
            </span>
          </div>
        )}
      </div>

      {/* PIREPs */}
      <div>
        <div className="px-4 py-1.5 sticky top-0 border-b border-stone-800"
          style={{ backgroundColor: '#0f1115' }}>
          <span style={{ ...mono, color: '#f5c518' }} className="text-[10px] tracking-widest font-bold">
            PIREPS · LAST 2 HR · WESTERN CO / UT / WY / NM
          </span>
        </div>
        {liveOps?.pireps == null && liveOps?.loading ? (
          <div className="px-4 py-3" style={{ ...mono, color: '#78716c', backgroundColor: '#16181f' }}>
            <span className="text-[10px] italic">Loading…</span>
          </div>
        ) : liveOps?.pireps?.length > 0 ? (
          liveOps.pireps.slice(0, 15).map((p, i) => (
            <div key={i} className="px-4 py-2 border-b border-stone-800"
              style={{ backgroundColor: i % 2 === 0 ? '#16181f' : '#1c1917' }}>
              <div style={{ ...mono, color: '#c4b5fd' }} className="text-[10px] break-all font-bold leading-snug">
                {p}
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-3" style={{ backgroundColor: '#16181f' }}>
            <span style={{ ...mono, color: '#78716c' }} className="text-[10px] italic">
              No recent PIREPs in operating area.
            </span>
          </div>
        )}
      </div>

      {/* WINDS ALOFT */}
      {liveOps?.winds && (
        <div>
          <div className="px-4 py-1.5 sticky top-0 border-b border-stone-800"
            style={{ backgroundColor: '#0f1115' }}>
            <span style={{ ...mono, color: '#f5c518' }} className="text-[10px] tracking-widest font-bold">
              WINDS ALOFT · SLC REGION · +06 HR FCST
            </span>
          </div>
          <div className="px-4 py-2" style={{ backgroundColor: '#16181f' }}>
            <pre style={{ ...mono, color: '#67e8f9' }} className="text-[9px] whitespace-pre-wrap font-bold leading-snug break-all">
              {liveOps.winds}
            </pre>
            <div style={{ ...mono, color: '#78716c' }} className="text-[9px] mt-2 italic">
              Format: DDDSST±TT — Dir/Speed(kt) ± TempC. 9900 = light &amp; variable.
            </div>
          </div>
        </div>
      )}

      {/* CENTER WEATHER ADVISORIES (CWA — used as TFR-adjacent for now) */}
      {liveOps?.tfrs?.length > 0 && (
        <div>
          <div className="px-4 py-1.5 sticky top-0 border-b border-stone-800"
            style={{ backgroundColor: '#0f1115' }}>
            <span style={{ ...mono, color: '#f5c518' }} className="text-[10px] tracking-widest font-bold">
              CENTER WEATHER ADVISORIES
            </span>
          </div>
          {liveOps.tfrs.map((c, i) => (
            <div key={i} className="px-4 py-2 border-b border-stone-800"
              style={{ backgroundColor: i % 2 === 0 ? '#16181f' : '#1c1917' }}>
              <div style={{ ...mono, color: '#fca5a5' }} className="text-[10px] break-all font-bold leading-snug whitespace-pre-wrap">
                {c.trim()}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function SunCell({ label, val, mono, display }) {
  return (
    <div className="text-center">
      <div style={{ ...mono, color: '#78716c' }} className="text-[8px] tracking-widest font-bold mb-0.5">
        {label}
      </div>
      <div style={{ ...display, color: '#fcd34d' }} className="text-base font-bold leading-none">
        {val}
      </div>
    </div>
  );
}

function CatChip({ label, count, cat, mono, display }) {
  const c = flightCatColor(cat);
  return (
    <div className="border-2 px-2 py-1 text-center"
      style={{ borderColor: c.border, backgroundColor: c.bg }}>
      <div style={{ ...display, color: c.text }} className="text-lg font-bold leading-none">{count}</div>
      <div style={{ ...mono, color: c.text }} className="text-[9px] tracking-widest font-bold mt-0.5">{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT MODAL — copy text or print PDF
// ─────────────────────────────────────────────────────────────────────────────
function ExportModal({ text, onClose, mono, display }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback — show prompt for older browsers / no clipboard permission
      alert('Copy failed. Long-press the text and copy manually.');
    }
  };

  const handlePrint = () => {
    // Open a print-friendly window
    const w = window.open('', '_blank');
    if (!w) {
      alert('Pop-up blocked. Allow pop-ups to print/save as PDF.');
      return;
    }
    w.document.write(`<!DOCTYPE html><html><head><title>Air Rescue Shift Summary</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 11px; padding: 24px; white-space: pre-wrap; line-height: 1.5; color: #000; }
  @media print { body { padding: 0; } }
</style></head><body>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 200);
  };

  return (
    <Modal>
      <div className="border-2 max-w-2xl w-full max-h-[92vh] flex flex-col"
        style={{ borderColor: '#f5c518', backgroundColor: '#0a0b0f' }}>
        <div className="px-4 py-3 border-b-2 flex items-center justify-between shrink-0"
          style={{ borderColor: '#f5c518', backgroundColor: '#1a1505' }}>
          <div>
            <div style={{ ...display, color: '#fcd34d' }} className="text-xl font-bold leading-none">
              SHIFT EXPORT
            </div>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-[0.3em] mt-1 font-bold">
              COPY · PRINT · SAVE PDF
            </div>
          </div>
          <button onClick={onClose}
            className="border-2 px-3 py-1.5 font-bold"
            style={{ ...mono, borderColor: '#57534e', backgroundColor: '#1c1917', color: '#e7e5e4' }}>
            <span className="text-[10px] tracking-widest">CLOSE</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <pre className="text-[10px] leading-relaxed font-bold whitespace-pre-wrap break-words"
            style={{ ...mono, color: '#c0c4c8' }}>
            {text}
          </pre>
        </div>

        <div className="px-4 py-3 border-t-2 shrink-0 grid grid-cols-2 gap-2"
          style={{ borderColor: '#1f2937', backgroundColor: '#0f1115' }}>
          <button onClick={handleCopy}
            className="border-2 py-3 font-bold"
            style={{ ...mono, borderColor: copied ? '#10b981' : '#22d3ee',
              backgroundColor: copied ? '#0d1f17' : '#0c1b22',
              color: copied ? '#34d399' : '#67e8f9' }}>
            <span className="text-xs tracking-widest">{copied ? '✓ COPIED' : 'COPY TEXT'}</span>
          </button>
          <button onClick={handlePrint}
            className="border-2 py-3 font-bold"
            style={{ ...mono, borderColor: '#f5c518', backgroundColor: '#1a1505', color: '#fcd34d' }}>
            <span className="text-xs tracking-widest">PRINT / PDF</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI BRIEFING PROMPT MODAL — generate copy-paste prompt for ChatGPT or Grok
// ─────────────────────────────────────────────────────────────────────────────
function AiPromptModal({ buildPrompt, onClose, mono, display }) {
  const [role, setRole] = useState('instructor');
  const [copied, setCopied] = useState(false);
  const text = buildPrompt(role);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      alert('Copy failed. Long-press the text and copy manually.');
    }
  };

  const openChatGPT = () => {
    handleCopy();
    setTimeout(() => window.open('https://chatgpt.com/', '_blank'), 200);
  };
  const openGrok = () => {
    handleCopy();
    setTimeout(() => window.open('https://grok.com/', '_blank'), 200);
  };

  const roles = [
    { id: 'instructor', label: 'INSTRUCTOR', desc: 'Teaches & flags risks' },
    { id: 'copilot',    label: 'COPILOT',    desc: 'Briefs alongside you' },
    { id: 'chief',      label: 'CHIEF PILOT', desc: 'Audits decision-making' },
    { id: 'dispatch',   label: 'OCC',         desc: 'Sanity-checks dispatch' },
  ];

  return (
    <Modal>
      <div className="border-2 max-w-2xl w-full max-h-[92vh] flex flex-col"
        style={{ borderColor: '#a78bfa', backgroundColor: '#0a0b0f' }}>
        <div className="px-4 py-3 border-b-2 flex items-center justify-between shrink-0"
          style={{ borderColor: '#a78bfa', backgroundColor: '#1a132a' }}>
          <div>
            <div style={{ ...display, color: '#c4b5fd' }} className="text-xl font-bold leading-none">
              AI BRIEFING PROMPT
            </div>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-[0.3em] mt-1 font-bold">
              CHATGPT · GROK · COPY-PASTE READY
            </div>
          </div>
          <button onClick={onClose}
            className="border-2 px-3 py-1.5 font-bold"
            style={{ ...mono, borderColor: '#57534e', backgroundColor: '#1c1917', color: '#e7e5e4' }}>
            <span className="text-[10px] tracking-widest">CLOSE</span>
          </button>
        </div>

        {/* Role selector chips */}
        <div className="px-4 py-3 border-b-2 shrink-0 space-y-2"
          style={{ borderColor: '#1f2937', backgroundColor: '#0f1115' }}>
          <div style={{ ...mono, color: '#c4b5fd' }} className="text-[9px] tracking-[0.25em] font-bold">
            AI ROLE
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {roles.map((r) => (
              <button key={r.id}
                onClick={() => setRole(r.id)}
                className="border-2 px-2 py-1.5 text-left transition-all"
                style={{
                  ...mono,
                  borderColor: role === r.id ? '#a78bfa' : '#44403c',
                  backgroundColor: role === r.id ? '#1a132a' : '#16181f',
                  color: role === r.id ? '#c4b5fd' : '#a8a29e',
                }}>
                <div className="text-[10px] tracking-widest font-bold">{r.label}</div>
                <div className="text-[9px] opacity-70 mt-0.5">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt preview */}
        <div className="overflow-y-auto flex-1 p-4">
          <pre className="text-[10px] leading-relaxed font-bold whitespace-pre-wrap break-words"
            style={{ ...mono, color: '#c0c4c8' }}>
            {text}
          </pre>
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 border-t-2 shrink-0 space-y-2"
          style={{ borderColor: '#1f2937', backgroundColor: '#0f1115' }}>
          <button onClick={handleCopy}
            className="w-full border-2 py-3 font-bold"
            style={{ ...mono, borderColor: copied ? '#10b981' : '#a78bfa',
              backgroundColor: copied ? '#0d1f17' : '#1a132a',
              color: copied ? '#34d399' : '#c4b5fd' }}>
            <span className="text-xs tracking-widest">{copied ? '✓ COPIED TO CLIPBOARD' : 'COPY PROMPT'}</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={openChatGPT}
              className="border-2 py-2.5 font-bold"
              style={{ ...mono, borderColor: '#10b981', backgroundColor: '#0d1f17', color: '#34d399' }}>
              <span className="text-[10px] tracking-widest">COPY + OPEN CHATGPT</span>
            </button>
            <button onClick={openGrok}
              className="border-2 py-2.5 font-bold"
              style={{ ...mono, borderColor: '#22d3ee', backgroundColor: '#0c1b22', color: '#67e8f9' }}>
              <span className="text-[10px] tracking-widest">COPY + OPEN GROK</span>
            </button>
          </div>
          <div style={{ ...mono, color: '#78716c' }} className="text-[9px] tracking-widest text-center font-bold">
            PASTE INTO THE CHAT WINDOW AFTER IT OPENS
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS MODAL — global app preferences
// ─────────────────────────────────────────────────────────────────────────────
function SettingsModal({ settings, setSettings, paperMode, setPaperMode, history, aircraftTotalMin, tail, roster, setRoster, crewStats, setCrewStats, onClearHistory, onResetTotals, onClose, mono, display }) {
  const upd = (k, v) => setSettings({ ...settings, [k]: v });

  // DATA LINK self-test state
  const [linkResults, setLinkResults] = useState(null); // null | array of results
  const [linkTesting, setLinkTesting] = useState(false);
  const runLinkTest = async () => {
    setLinkTesting(true);
    setLinkResults([]);
    await runDataLinkTest((partial) => setLinkResults(partial));
    setLinkTesting(false);
  };

  return (
    <Modal>
      <div className="border-2 max-w-lg w-full max-h-[92vh] flex flex-col"
        style={{ borderColor: '#78716c', backgroundColor: '#0a0b0f' }}>
        <div className="px-4 py-3 border-b-2 flex items-center justify-between shrink-0"
          style={{ borderColor: '#78716c', backgroundColor: '#1c1917' }}>
          <div>
            <div style={{ ...display, color: '#d6d3d1' }} className="text-xl font-bold leading-none">
              SETTINGS
            </div>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-[0.3em] mt-1 font-bold">
              DEFAULTS · PREFERENCES · DATA
            </div>
          </div>
          <button onClick={onClose}
            className="border-2 px-3 py-1.5 font-bold"
            style={{ ...mono, borderColor: '#57534e', backgroundColor: '#0a0b0f', color: '#e7e5e4' }}>
            <span className="text-[10px] tracking-widest">CLOSE</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {/* Appearance */}
          <Section title="APPEARANCE" mono={mono}>
            <div className="flex items-center justify-between p-2"
              style={{ backgroundColor: '#16181f', border: '2px solid #44403c' }}>
              <div>
                <div style={{ ...mono, color: '#fafaf9' }} className="text-xs font-bold tracking-widest">PAPER MODE</div>
                <div style={{ ...mono, color: '#a8a29e' }} className="text-[10px] mt-1">Cream paper with color-pencil accents</div>
              </div>
              <button onClick={() => setPaperMode(!paperMode)}
                className="relative w-12 h-7 rounded-full transition-all shrink-0"
                style={{ backgroundColor: paperMode ? '#8b6e4d' : '#44403c' }}>
                <div className="absolute top-0.5 w-6 h-6 rounded-full transition-all"
                  style={{
                    left: paperMode ? 'calc(100% - 26px)' : '2px',
                    backgroundColor: '#fafaf9',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  }} />
              </button>
            </div>
          </Section>

          {/* Default Crew */}
          <Section title="DEFAULT CREW" mono={mono}>
            <SettingsField label="CDR" val={settings.cdr} onChange={(v) => upd('cdr', v)} mono={mono} />
            <SettingsField label="PLT" val={settings.plt} onChange={(v) => upd('plt', v)} mono={mono} />
            <SettingsField label="MED" val={settings.med} onChange={(v) => upd('med', v)} mono={mono} />
            <div style={{ ...mono, color: '#78716c' }} className="text-[9px] italic mt-1">
              Names used as default selections when starting a new shift. Full roster below.
            </div>
          </Section>

          {/* Roster & Stats */}
          <Section title="CREW ROSTER & STATS" mono={mono}>
            {['cdr', 'plt', 'med'].map((role) => {
              const label = role.toUpperCase();
              const names = roster[role] || [];
              return (
                <div key={role} className="border-2 p-2 space-y-1"
                  style={{ borderColor: '#44403c', backgroundColor: '#16181f' }}>
                  <div style={{ ...mono, color: '#f5c518' }} className="text-[10px] tracking-widest font-bold">
                    {label} ({names.length})
                  </div>
                  {names.length === 0 && (
                    <div style={{ ...mono, color: '#78716c' }} className="text-[10px] italic">
                      No {label} on roster.
                    </div>
                  )}
                  {names.map((name) => {
                    const s = crewStats[name];
                    const isDefault = (DEFAULT_ROSTER[role] || []).includes(name);
                    return (
                      <div key={name} className="border px-2 py-1.5"
                        style={{ borderColor: '#44403c', backgroundColor: '#0f1115' }}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span style={{ ...mono, color: '#fafaf9' }} className="text-xs font-bold">
                            {name}
                          </span>
                          {!isDefault && (
                            <button onClick={() => {
                              if (!confirm(`Remove "${name}" from ${label} roster?\n(Stats stay in the database.)`)) return;
                              setRoster((prev) => ({ ...prev, [role]: (prev[role] || []).filter(n => n !== name) }));
                            }} style={{ ...mono, color: '#a8302c' }} className="text-xs font-bold">
                              ×
                            </button>
                          )}
                        </div>
                        {s && s.shifts > 0 ? (
                          <div className="grid grid-cols-4 gap-1 mt-1">
                            <StatCell label="SHIFTS" val={s.shifts} mono={mono} />
                            <StatCell label="MSN" val={`${s.missions.completed}/${s.missions.total}`} mono={mono} />
                            <StatCell label="HRS" val={`${(s.flightMinutes / 60).toFixed(1)}`} mono={mono} />
                            <StatCell label="AVG FRA" val={s.fraScoresCount > 0
                              ? Math.round(s.fraScoresSum / s.fraScoresCount) : '—'} mono={mono} />
                          </div>
                        ) : (
                          <div style={{ ...mono, color: '#78716c' }} className="text-[9px] italic mt-1">
                            No flight time logged yet.
                          </div>
                        )}
                        {s?.lastShift && (
                          <div style={{ ...mono, color: '#57534e' }} className="text-[9px] mt-1">
                            Last shift: {s.lastShift}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <button onClick={() => {
              if (confirm(`Reset ALL crew stats to zero?\n(Roster names stay.)`)) setCrewStats({});
            }} className="w-full border-2 py-2 font-bold"
              style={{ ...mono, borderColor: '#a8302c', backgroundColor: '#180a0d', color: '#fca5a5' }}>
              <span className="text-[10px] tracking-widest">RESET ALL CREW STATS</span>
            </button>
          </Section>

          {/* Aircraft & Fuel */}
          <Section title="AIRCRAFT" mono={mono}>
            <SettingsField label="TAIL" val={settings.tail}
              onChange={(v) => upd('tail', v.toUpperCase())} mono={mono} />
            <div className="flex items-center gap-2">
              <div className="w-12 text-xs tracking-widest font-bold" style={{ ...mono, color: '#f5c518' }}>FUEL</div>
              <input type="number" max="81" value={settings.fuel}
                onChange={(e) => upd('fuel', Math.min(81, parseInt(e.target.value) || 0))}
                className="flex-1 bg-black border-2 border-stone-600 focus:border-yellow-600 outline-none px-3 py-2 text-base text-stone-100"
                style={mono} />
              <span style={{ ...mono, color: '#a8a29e' }} className="text-[10px] tracking-widest font-bold">
                GAL (MAX 81)
              </span>
            </div>
            <div className="border-2 px-3 py-2" style={{ borderColor: '#44403c', backgroundColor: '#16181f' }}>
              <div style={{ ...mono, color: '#a8a29e' }} className="text-[10px] tracking-widest font-bold mb-1">
                {tail} CUMULATIVE FLIGHT TIME
              </div>
              <div style={{ ...display, color: '#fafaf9' }} className="text-2xl font-bold">
                {Math.floor(aircraftTotalMin / 60)}:{String(aircraftTotalMin % 60).padStart(2, '0')}
              </div>
            </div>
          </Section>

          {/* Shift defaults */}
          <Section title="DEFAULT SHIFT" mono={mono}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] tracking-widest mb-1 font-bold" style={{ ...mono, color: '#f5c518' }}>START</div>
                <input type="time" value={settings.start} onChange={(e) => upd('start', e.target.value)}
                  className="w-full bg-black border-2 border-stone-600 focus:border-yellow-600 outline-none px-3 py-2 text-stone-100" style={mono} />
              </div>
              <div>
                <div className="text-[10px] tracking-widest mb-1 font-bold" style={{ ...mono, color: '#f5c518' }}>END</div>
                <input type="time" value={settings.end} onChange={(e) => upd('end', e.target.value)}
                  className="w-full bg-black border-2 border-stone-600 focus:border-yellow-600 outline-none px-3 py-2 text-stone-100" style={mono} />
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-widest mb-1 font-bold" style={{ ...mono, color: '#f5c518' }}>BASE STATUS DEFAULT</div>
              <div className="grid grid-cols-3 gap-2">
                {['green', 'yellow', 'red'].map((c) => (
                  <button key={c} onClick={() => upd('baseColor', c)}
                    className={`py-2 border-2 font-bold transition-all ${
                      settings.baseColor === c
                        ? c === 'green' ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200'
                          : c === 'yellow' ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                          : 'border-red-400 bg-red-400/20 text-red-200'
                        : 'border-stone-700 bg-black text-stone-400'
                    }`}
                    style={mono}>
                    <span className="text-xs tracking-widest">{c.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Data Link Self-Test */}
          <Section title="DATA LINK" mono={mono}>
            <button onClick={runLinkTest} disabled={linkTesting}
              className="w-full border-2 py-2.5 font-bold disabled:opacity-50"
              style={{ ...mono, borderColor: '#10b981', backgroundColor: '#0d1f17', color: '#34d399' }}>
              <span className="text-[10px] tracking-widest">
                {linkTesting ? `TESTING… (${linkResults?.length || 0}/${DATA_LINK_TESTS.length})` : 'RUN DATA LINK TEST'}
              </span>
            </button>
            {linkResults && linkResults.length > 0 && (
              <div className="border-2 divide-y" style={{ borderColor: '#44403c', backgroundColor: '#0f1115' }}>
                {linkResults.map((r) => (
                  <div key={r.id} className="px-2.5 py-2 flex items-center gap-2"
                    style={{ borderColor: '#1f2937' }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: r.ok ? '#10b981' : '#ef4444',
                        boxShadow: r.ok ? '0 0 6px rgba(16,185,129,0.6)' : '0 0 6px rgba(239,68,68,0.6)' }} />
                    <div className="flex-1 min-w-0">
                      <div style={{ ...mono, color: '#fafaf9' }} className="text-[10px] font-bold tracking-wider">
                        {r.label}
                      </div>
                      <div style={{ ...mono, color: r.ok ? '#78716c' : '#f87171' }} className="text-[9px] break-all">
                        {r.detail}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div style={{ ...mono, color: r.ok ? '#34d399' : '#f87171' }} className="text-[10px] font-bold">
                        {r.ok ? 'PASS' : 'FAIL'}
                      </div>
                      <div style={{ ...mono, color: '#57534e' }} className="text-[9px]">
                        {r.ms} ms
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {linkResults && !linkTesting && linkResults.length === DATA_LINK_TESTS.length && (
              <div className="border-2 px-2.5 py-2"
                style={{
                  borderColor: linkResults.every(r => r.ok) ? '#10b981' : linkResults.some(r => r.ok) ? '#f59e0b' : '#ef4444',
                  backgroundColor: linkResults.every(r => r.ok) ? '#0d1f17' : linkResults.some(r => r.ok) ? '#1f1a0d' : '#1f0f0f',
                }}>
                <div style={{ ...mono, color: linkResults.every(r => r.ok) ? '#34d399' : linkResults.some(r => r.ok) ? '#fbbf24' : '#f87171' }}
                  className="text-[10px] font-bold tracking-widest">
                  {linkResults.every(r => r.ok)
                    ? '✓ ALL FEEDS OPERATIONAL — FULL LIVE DATA'
                    : linkResults.some(r => r.ok)
                      ? `⚠ PARTIAL — ${linkResults.filter(r => !r.ok).length} FEED(S) DOWN`
                      : '✗ NO CONNECTIVITY — CHECK NETWORK / CONTENT BLOCKERS'}
                </div>
                {!linkResults.every(r => r.ok) && (
                  <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] mt-1 leading-relaxed">
                    {linkResults.every(r => !r.ok)
                      ? 'Every feed failed — likely no internet, or this preview environment blocks outbound requests. On your deployed iPad app this should pass.'
                      : linkResults.filter(r => !r.ok).every(r => r.host === 'aviationweather.gov')
                        ? 'aviationweather.gov unreachable — government API may be in maintenance, or the domain is blocked by a content filter (Pi-hole / NextDNS / AdGuard).'
                        : 'Check whether the failing host is blocked by your DNS or content filter.'}
                  </div>
                )}
              </div>
            )}
            <div style={{ ...mono, color: '#78716c' }} className="text-[9px] italic">
              Tests every live source: METAR, TAF, batch area weather, PIREPs, AIRMET/SIGMET, winds aloft, sun/twilight.
            </div>
          </Section>

          {/* Data Management */}
          <Section title="DATA MANAGEMENT" mono={mono}>
            <div className="flex items-center justify-between text-xs p-2"
              style={{ backgroundColor: '#16181f', border: '2px solid #44403c' }}>
              <span style={{ ...mono, color: '#a8a29e' }} className="font-bold tracking-widest">
                HISTORY RECORDS
              </span>
              <span style={{ ...mono, color: '#fafaf9' }} className="font-bold tracking-widest">
                {history.length}
              </span>
            </div>
            <button onClick={onClearHistory}
              className="w-full border-2 py-2.5 font-bold"
              style={{ ...mono, borderColor: '#a8302c', backgroundColor: '#180a0d', color: '#fca5a5' }}>
              <span className="text-[10px] tracking-widest">CLEAR ALL HISTORY ({history.length})</span>
            </button>
            <button onClick={onResetTotals}
              className="w-full border-2 py-2.5 font-bold"
              style={{ ...mono, borderColor: '#a8302c', backgroundColor: '#180a0d', color: '#fca5a5' }}>
              <span className="text-[10px] tracking-widest">RESET AIRCRAFT TOTAL TIME</span>
            </button>
          </Section>

          {/* About */}
          <Section title="ABOUT" mono={mono}>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[10px] leading-relaxed">
              <div>Southeast Texas Air Rescue · KGJT Dispatch Simulator</div>
              <div className="mt-1">Cirrus SR22 TN · Tornado Alley Turbonormalized</div>
              <div className="mt-1">v1.4 · Training tool, not operational</div>
              <div className="mt-2" style={{ color: '#78716c' }}>FRAT framework: FAA AC 135-14B</div>
              <div style={{ color: '#78716c' }}>Performance: Cirrus POH + TAT STC Report 215-6</div>
            </div>
          </Section>
        </div>
      </div>
    </Modal>
  );
}

function Section({ title, mono, children }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.3em] font-bold" style={{ ...mono, color: '#f5c518' }}>{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function SettingsField({ label, val, onChange, mono }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 text-xs tracking-widest font-bold" style={{ ...mono, color: '#f5c518' }}>{label}</div>
      <input value={val} onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-black border-2 border-stone-600 focus:border-yellow-600 outline-none px-3 py-2 text-base text-stone-100"
        style={mono} />
    </div>
  );
}

function StatCell({ label, val, mono }) {
  return (
    <div className="text-center border" style={{ borderColor: '#44403c', backgroundColor: '#16181f' }}>
      <div style={{ ...mono, color: '#78716c' }} className="text-[8px] tracking-widest font-bold pt-0.5">{label}</div>
      <div style={{ ...mono, color: '#fafaf9' }} className="text-xs font-bold pb-0.5">{val}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA MAP MODAL — SVG map of all airports in operating range
// ─────────────────────────────────────────────────────────────────────────────
function MapModal({ airports, medCenters, mission, transferDest, onClose, mono, display }) {
  // KGJT center
  const KGJT_LAT = 39.1224;
  const KGJT_LON = -108.5267;

  // Collect all points
  const allPoints = [
    { icao: 'KGJT', name: 'Grand Junction Regional', lat: KGJT_LAT, lon: KGJT_LON, dist: 0, type: 'base' },
    ...airports.map(a => ({ ...a, type: 'airport' })),
    ...medCenters.map(c => ({ icao: c.icao, name: c.name, lat: c.lat, lon: c.lon, dist: c.distFromGJT, type: 'med' })),
  ];

  // Bounding box of all coords
  const lats = allPoints.map(p => p.lat);
  const lons = allPoints.map(p => p.lon);
  const minLat = Math.min(...lats) - 0.5;
  const maxLat = Math.max(...lats) + 0.5;
  const minLon = Math.min(...lons) - 0.5;
  const maxLon = Math.max(...lons) + 0.5;

  // SVG viewport
  const W = 600, H = 600;
  const PAD = 30;
  // Project lat/lon → x/y (note: y inverted because SVG y grows downward; higher lat = top)
  const proj = (lat, lon) => ({
    x: PAD + ((lon - minLon) / (maxLon - minLon)) * (W - 2 * PAD),
    y: PAD + ((maxLat - lat) / (maxLat - minLat)) * (H - 2 * PAD),
  });

  const kgjtPt = proj(KGJT_LAT, KGJT_LON);

  // Range rings — approximate scale: 1° lat ≈ 60 NM
  const latRange = maxLat - minLat;
  const pxPerNm = (H - 2 * PAD) / (latRange * 60);
  const ringNm = [50, 100, 150, 200, 230];

  // Mission route line
  let pickupPt = null, transferPt = null;
  if (mission?.pickup) pickupPt = proj(mission.pickup.lat, mission.pickup.lon);
  if (transferDest?.lat) transferPt = proj(transferDest.lat, transferDest.lon);

  return (
    <Modal>
      <div className="border-2 max-w-2xl w-full max-h-[92vh] flex flex-col"
        style={{ borderColor: '#fbbf24', backgroundColor: '#0a0b0f' }}>
        <div className="px-4 py-3 border-b-2 flex items-center justify-between shrink-0"
          style={{ borderColor: '#fbbf24', backgroundColor: '#1c1505' }}>
          <div>
            <div style={{ ...display, color: '#fcd34d' }} className="text-xl font-bold leading-none">
              OPERATING AREA
            </div>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-[0.3em] mt-1 font-bold">
              KGJT BASE · DISPATCH AIRPORTS · TRANSFER CENTERS
            </div>
          </div>
          <button onClick={onClose}
            className="border-2 px-3 py-1.5 font-bold"
            style={{ ...mono, borderColor: '#57534e', backgroundColor: '#1c1917', color: '#e7e5e4' }}>
            <span className="text-[10px] tracking-widest">CLOSE</span>
          </button>
        </div>

        <div className="overflow-auto flex-1 p-3" style={{ backgroundColor: '#0a0b0f' }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f2937" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width={W} height={H} fill="#0d1115" />
            <rect width={W} height={H} fill="url(#grid)" />

            {/* Range rings around KGJT */}
            {ringNm.map((nm) => {
              const r = nm * pxPerNm;
              return (
                <g key={nm}>
                  <circle cx={kgjtPt.x} cy={kgjtPt.y} r={r} fill="none" stroke="#c8202c33" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={kgjtPt.x + r * 0.707} y={kgjtPt.y - r * 0.707 + 4}
                    fontSize="9" fill="#c8202c66" fontFamily="monospace" fontWeight="bold">
                    {nm}NM
                  </text>
                </g>
              );
            })}

            {/* Mission route line */}
            {pickupPt && (
              <line x1={kgjtPt.x} y1={kgjtPt.y} x2={pickupPt.x} y2={pickupPt.y}
                stroke="#fbbf24" strokeWidth="2" strokeDasharray="6 3" />
            )}
            {pickupPt && transferPt && (
              <line x1={pickupPt.x} y1={pickupPt.y} x2={transferPt.x} y2={transferPt.y}
                stroke="#c4b5fd" strokeWidth="2" strokeDasharray="6 3" />
            )}

            {/* Airport markers */}
            {allPoints.map((p) => {
              const pt = proj(p.lat, p.lon);
              const isBase = p.type === 'base';
              const isMed = p.type === 'med';
              const isPickup = mission?.pickup?.icao === p.icao;
              const isTransfer = transferDest?.icao === p.icao;
              const isMissionTransfer = mission?.transferTo?.icao === p.icao;
              const r = isBase ? 8 : (isPickup || isTransfer || isMissionTransfer) ? 7 : 4;
              const fill = isBase ? '#c8202c'
                : isPickup ? '#fbbf24'
                : (isTransfer || isMissionTransfer) ? '#c4b5fd'
                : isMed ? '#a78bfa'
                : '#67e8f9';
              const stroke = isBase ? '#fef2f2'
                : isPickup ? '#fef3c7'
                : (isTransfer || isMissionTransfer) ? '#ede9fe'
                : '#fafaf9';
              return (
                <g key={p.icao}>
                  <circle cx={pt.x} cy={pt.y} r={r} fill={fill} stroke={stroke} strokeWidth="1.5" />
                  <text x={pt.x + r + 3} y={pt.y - 2}
                    fontSize="10" fill="#fafaf9" fontFamily="monospace" fontWeight="bold">
                    {p.icao}
                  </text>
                  {p.dist > 0 && (
                    <text x={pt.x + r + 3} y={pt.y + 9}
                      fontSize="8" fill="#a8a29e" fontFamily="monospace">
                      {p.dist}NM
                    </text>
                  )}
                </g>
              );
            })}

            {/* Compass rose */}
            <g transform={`translate(${W - 60}, ${H - 60})`}>
              <circle r="22" fill="#0a0b0f" stroke="#44403c" strokeWidth="1" />
              <text x="0" y="-12" textAnchor="middle" fontSize="11" fill="#fbbf24" fontFamily="monospace" fontWeight="bold">N</text>
              <text x="0" y="18" textAnchor="middle" fontSize="9" fill="#a8a29e" fontFamily="monospace">S</text>
              <text x="-15" y="3" textAnchor="middle" fontSize="9" fill="#a8a29e" fontFamily="monospace">W</text>
              <text x="15" y="3" textAnchor="middle" fontSize="9" fill="#a8a29e" fontFamily="monospace">E</text>
              <line x1="0" y1="-8" x2="0" y2="8" stroke="#fbbf24" strokeWidth="1" />
              <line x1="-8" y1="0" x2="8" y2="0" stroke="#44403c" strokeWidth="0.5" />
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="px-4 py-3 border-t-2 grid grid-cols-2 gap-2 shrink-0"
          style={{ borderColor: '#1f2937', backgroundColor: '#0f1115' }}>
          <LegendDot color="#c8202c" label="KGJT BASE" mono={mono} />
          <LegendDot color="#67e8f9" label="DISPATCH AIRPORT" mono={mono} />
          <LegendDot color="#a78bfa" label="TRANSFER CENTER" mono={mono} />
          <LegendDot color="#fbbf24" label="ACTIVE MISSION" mono={mono} />
        </div>
      </div>
    </Modal>
  );
}

function LegendDot({ color, label, mono }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span style={{ ...mono, color: '#d6d3d1' }} className="text-[10px] tracking-widest font-bold">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCH BRIEFING MODAL — printable form-like briefing for the current mission
// ─────────────────────────────────────────────────────────────────────────────
function BriefingModal({ mission, shift, fuelOnBoard, flightMinutes, baseColor, transferDest, onClose, mono, display }) {
  const m = mission;
  const ete = Math.round((m.pickup?.dist || 0) / 185 * 60);
  const fuelBurn = Math.round(((ete / 60) * 17) * 10) / 10;
  const fraStatus = m.fra != null
    ? (m.fra > 30 ? { label: 'NO-GO', color: '#a8302c' }
      : m.fra > 15 ? { label: 'CAUTION', color: '#d97706' }
      : { label: 'GO', color: '#10b981' })
    : { label: 'NOT ASSESSED', color: '#78716c' };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) { alert('Pop-up blocked. Allow pop-ups to print.'); return; }
    const html = `<!DOCTYPE html><html><head><title>Dispatch Briefing ${m.id}</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 11px; padding: 36px; color: #000; line-height: 1.5; }
  h1 { font-size: 18px; letter-spacing: 0.15em; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 16px; }
  h2 { font-size: 11px; letter-spacing: 0.2em; background: #000; color: #fff; padding: 3px 8px; margin: 18px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  td { padding: 3px 6px; border-bottom: 1px dotted #999; vertical-align: top; }
  td.lbl { width: 30%; font-weight: bold; color: #555; letter-spacing: 0.1em; font-size: 9px; }
  .frat { font-size: 14px; font-weight: bold; padding: 6px 10px; border: 2px solid #000; margin: 8px 0; }
  .sig { margin-top: 36px; border-top: 1px solid #000; padding-top: 4px; font-size: 9px; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>SOUTHEAST TEXAS AIR RESCUE — DISPATCH BRIEFING</h1>
<table>
  <tr><td class="lbl">MISSION</td><td>${m.id}</td><td class="lbl">DATE</td><td>${new Date().toISOString().slice(0,10)}</td></tr>
  <tr><td class="lbl">AIRCRAFT</td><td>${shift.tail} (Cirrus SR22 TN)</td><td class="lbl">BASE</td><td>KGJT</td></tr>
  <tr><td class="lbl">CDR</td><td>${shift.cdr}</td><td class="lbl">PLT</td><td>${shift.plt}</td></tr>
  <tr><td class="lbl">MED</td><td>${shift.med}</td><td class="lbl">FUEL ON BOARD</td><td>${fuelOnBoard} gal</td></tr>
</table>
<h2>PATIENT</h2>
<table>
  <tr><td class="lbl">TIER</td><td>${(m.patient?.tier || '').toUpperCase()}</td></tr>
  <tr><td class="lbl">CONDITION</td><td>${m.patient?.condition || ''}</td></tr>
  <tr><td class="lbl">WEIGHT</td><td>${m.patient?.weightLb || ''} lb</td></tr>
</table>
<h2>ROUTING</h2>
<table>
  <tr><td class="lbl">PICKUP</td><td>${m.pickup?.icao} — ${m.pickup?.name}, ${m.pickup?.city}</td></tr>
  <tr><td class="lbl">DISTANCE</td><td>${m.pickup?.dist} NM</td><td class="lbl">RUNWAY</td><td>${m.pickup?.rwy} ft</td></tr>
  <tr><td class="lbl">ETE (one-way)</td><td>${ete} min @ 185 KTAS</td><td class="lbl">FUEL BURN (est)</td><td>${fuelBurn} gal one-way</td></tr>
  ${m.transferTo ? `<tr><td class="lbl">DESTINATION</td><td>${m.transferTo.icao} — ${m.transferTo.name}, ${m.transferTo.region} (${m.transferTo.distFromPickup} NM from pickup)</td></tr>` : ''}
  ${transferDest && !m.isOriginTransfer ? `<tr><td class="lbl">POST-PICKUP DIVERT</td><td>${transferDest.icao} — ${transferDest.name}, ${transferDest.region}</td></tr>` : ''}
</table>
<h2>WEATHER</h2>
<table>
  ${m.metar && m.metarSource !== 'unavailable' ? `<tr><td class="lbl">PICKUP METAR</td><td>${m.metar}${m.metarSource === 'nearest' ? ` (nearest stn ${m.metarStation}, ${m.metarDistance} NM)` : ''}</td></tr>` : '<tr><td class="lbl">PICKUP METAR</td><td>NO LIVE DATA AVAILABLE</td></tr>'}
  ${m.taf && m.tafSource === 'live' ? `<tr><td class="lbl">PICKUP TAF</td><td>${m.taf}</td></tr>` : ''}
  <tr><td class="lbl">BASE COLOR</td><td>${baseColor.toUpperCase()}</td></tr>
</table>
<h2>RISK ASSESSMENT (FRAT)</h2>
<div class="frat">SCORE: ${m.fra != null ? m.fra : '—'} &nbsp;&nbsp;|&nbsp;&nbsp; ${fraStatus.label}</div>
<div class="sig">
  <strong>PIC CONCURRENCE</strong> &nbsp; ___________________ &nbsp;&nbsp;
  <strong>OCC</strong> &nbsp; ___________________ &nbsp;&nbsp;
  <strong>TIME</strong> &nbsp; ___________________
</div>
<p style="margin-top:36px;font-size:9px;color:#666;">Training simulator output — not an operational record. Distances approximate; verify via ForeFlight before launch.</p>
</body></html>`;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 200);
  };

  return (
    <Modal>
      <div className="border-2 max-w-2xl w-full max-h-[92vh] flex flex-col"
        style={{ borderColor: '#f5c518', backgroundColor: '#0a0b0f' }}>
        <div className="px-4 py-3 border-b-2 flex items-center justify-between shrink-0"
          style={{ borderColor: '#f5c518', backgroundColor: '#1a1505' }}>
          <div>
            <div style={{ ...display, color: '#fcd34d' }} className="text-xl font-bold leading-none">
              DISPATCH BRIEFING
            </div>
            <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-[0.3em] mt-1 font-bold">
              {m.id} · {m.pickup?.icao}
            </div>
          </div>
          <button onClick={onClose}
            className="border-2 px-3 py-1.5 font-bold"
            style={{ ...mono, borderColor: '#57534e', backgroundColor: '#1c1917', color: '#e7e5e4' }}>
            <span className="text-[10px] tracking-widest">CLOSE</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {/* Header card */}
          <div className="border-2 p-3" style={{ borderColor: '#44403c', backgroundColor: '#16181f' }}>
            <div className="grid grid-cols-2 gap-3 text-[11px]" style={mono}>
              <Row label="MISSION" val={m.id} mono={mono} />
              <Row label="DATE" val={new Date().toISOString().slice(0,10)} mono={mono} />
              <Row label="AIRCRAFT" val={`${shift.tail} (SR22 TN)`} mono={mono} />
              <Row label="BASE" val={`KGJT (${baseColor.toUpperCase()})`} mono={mono} />
              <Row label="CDR" val={shift.cdr} mono={mono} />
              <Row label="PLT" val={shift.plt} mono={mono} />
              <Row label="MED" val={shift.med} mono={mono} />
              <Row label="FUEL ON BOARD" val={`${fuelOnBoard} gal`} mono={mono} />
            </div>
          </div>

          <BriefingSection title="PATIENT" mono={mono} display={display}>
            <Row label="TIER" val={(m.patient?.tier || '').toUpperCase()} mono={mono} />
            <Row label="CONDITION" val={m.patient?.condition} mono={mono} />
            <Row label="WEIGHT" val={`${m.patient?.weightLb} lb`} mono={mono} />
          </BriefingSection>

          <BriefingSection title="ROUTING" mono={mono} display={display}>
            <Row label="PICKUP" val={`${m.pickup?.icao} — ${m.pickup?.name}`} mono={mono} />
            <Row label="CITY" val={m.pickup?.city} mono={mono} />
            <Row label="DISTANCE" val={`${m.pickup?.dist} NM`} mono={mono} />
            <Row label="RUNWAY" val={`${m.pickup?.rwy} ft`} mono={mono} />
            <Row label="ETE" val={`${ete} min @ 185 KTAS`} mono={mono} />
            <Row label="FUEL BURN (one-way)" val={`${fuelBurn} gal`} mono={mono} />
            {m.transferTo && (
              <Row label="DESTINATION" val={`${m.transferTo.icao} — ${m.transferTo.name}, ${m.transferTo.region} (${m.transferTo.distFromPickup} NM)`} mono={mono} />
            )}
            {transferDest && !m.isOriginTransfer && (
              <Row label="POST-PICKUP DIVERT" val={`${transferDest.icao} — ${transferDest.name}`} mono={mono} />
            )}
          </BriefingSection>

          <BriefingSection title="WEATHER" mono={mono} display={display}>
            <Row label="PICKUP METAR" val={m.metar && m.metarSource !== 'unavailable' ? m.metar : 'NO LIVE DATA AVAILABLE'} mono={mono} wide />
            {m.taf && m.tafSource === 'live' && <Row label="PICKUP TAF" val={m.taf} mono={mono} wide />}
          </BriefingSection>

          <BriefingSection title="RISK ASSESSMENT" mono={mono} display={display}>
            <div className="border-2 p-3 flex items-center justify-between"
              style={{ borderColor: fraStatus.color, backgroundColor: '#000' }}>
              <div>
                <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-widest font-bold mb-1">FRAT SCORE</div>
                <div style={{ ...display, color: '#fafaf9' }} className="text-3xl font-bold leading-none">
                  {m.fra != null ? m.fra : '—'}
                </div>
              </div>
              <div className="text-right">
                <div style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-widest font-bold mb-1">STATUS</div>
                <div style={{ ...display, color: fraStatus.color }} className="text-2xl font-bold leading-none">
                  {fraStatus.label}
                </div>
              </div>
            </div>
          </BriefingSection>

          <div className="border-t-2 border-dashed pt-3 mt-4"
            style={{ borderColor: '#44403c' }}>
            <div className="grid grid-cols-3 gap-3 text-center" style={mono}>
              <div>
                <div className="border-t pt-1" style={{ borderColor: '#78716c' }}>
                  <div style={{ color: '#a8a29e' }} className="text-[9px] tracking-widest font-bold">PIC</div>
                </div>
              </div>
              <div>
                <div className="border-t pt-1" style={{ borderColor: '#78716c' }}>
                  <div style={{ color: '#a8a29e' }} className="text-[9px] tracking-widest font-bold">OCC</div>
                </div>
              </div>
              <div>
                <div className="border-t pt-1" style={{ borderColor: '#78716c' }}>
                  <div style={{ color: '#a8a29e' }} className="text-[9px] tracking-widest font-bold">TIME</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t-2 shrink-0 grid grid-cols-2 gap-2"
          style={{ borderColor: '#1f2937', backgroundColor: '#0f1115' }}>
          <button onClick={handlePrint}
            className="border-2 py-3 font-bold"
            style={{ ...mono, borderColor: '#f5c518', backgroundColor: '#1a1505', color: '#fcd34d' }}>
            <span className="text-xs tracking-widest">PRINT BRIEFING</span>
          </button>
          <button onClick={onClose}
            className="border-2 py-3 font-bold"
            style={{ ...mono, borderColor: '#57534e', backgroundColor: '#1c1917', color: '#e7e5e4' }}>
            <span className="text-xs tracking-widest">CLOSE</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

function BriefingSection({ title, mono, display, children }) {
  return (
    <div>
      <div className="px-2 py-1 mb-1.5" style={{ backgroundColor: '#fafaf9' }}>
        <div style={{ ...mono, color: '#000' }} className="text-[10px] tracking-[0.25em] font-bold">{title}</div>
      </div>
      <div className="border-2 px-3 py-2 space-y-1" style={{ borderColor: '#44403c', backgroundColor: '#16181f' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, val, mono, wide }) {
  return (
    <div className={wide ? 'flex flex-col gap-1' : 'flex items-baseline gap-2'}>
      <span style={{ ...mono, color: '#a8a29e' }} className="text-[9px] tracking-widest font-bold shrink-0">
        {label}
      </span>
      <span style={{ ...mono, color: '#fafaf9' }} className="text-[11px] font-bold break-all">
        {val || '——'}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAPER MODE — cream paper aesthetic with color-pencil accents
// ─────────────────────────────────────────────────────────────────────────────
function PaperModeToggle({ paperMode, setPaperMode }) {
  return (
    <button
      onClick={() => setPaperMode(!paperMode)}
      className="fixed top-2 right-2 z-50 border-2 px-2 py-1 font-bold transition-all"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        borderColor: paperMode ? '#8b6e4d' : '#c8202c',
        backgroundColor: paperMode ? '#f5efd9' : '#0f1729',
        color: paperMode ? '#2a2520' : '#fafaf9',
        fontSize: '9px',
        letterSpacing: '0.15em',
      }}
      title="Toggle paper / OCC mode">
      {paperMode ? '📋 PAPER' : '⬛ OCC'}
    </button>
  );
}

function PaperModeStyles() {
  return (
    <style dangerouslySetInnerHTML={{__html: `
      @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Caveat:wght@500;700&family=Special+Elite&display=swap');

      /* ─── CREAM PAPER BASE — real photograph of aged paper ─── */
      .paper-mode {
        background-color: #e6d4a3 !important;
        color: #1a1410 !important;
        font-family: 'Special Elite', 'Courier Prime', 'Courier New', monospace !important;
        background-image: url("${TEX.paper}") !important;
        background-size: cover !important;
        background-position: center !important;
        background-attachment: fixed !important;
        background-repeat: no-repeat !important;
      }

      /* ─── Subtle vignette + secondary tonal wash to blend paper into any panel size ─── */
      .paper-mode::before {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 9997;
        background:
          radial-gradient(ellipse 900px 700px at 22% 18%, rgba(150,105,55,0.06), transparent 65%),
          radial-gradient(ellipse 800px 600px at 78% 72%, rgba(150,105,55,0.10), transparent 65%),
          radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(80,50,20,0.15) 120%);
      }
      .paper-mode > * { position: relative; z-index: 1; }

      /* ─── BACKGROUND OVERRIDES — panels blend into paper via translucent creams ─── */
      .paper-mode [style*="background-color: rgb(10, 11, 15)"],
      .paper-mode [style*="background-color: #0a0b0f"],
      .paper-mode [style*="background-color: #0d1429"],
      .paper-mode [style*="background-color: #0a0f1c"],
      .paper-mode [style*="background-color: rgb(0, 0, 0)"],
      .paper-mode [style*="background-color: #000"],
      .paper-mode .bg-black {
        background-color: transparent !important;
      }
      .paper-mode [style*="background-color: #1e2952"],
      .paper-mode [style*="background-color: #0f1729"],
      .paper-mode [style*="background-color: #0f1115"] {
        background-color: rgba(220,200,155,0.4) !important;
        backdrop-filter: blur(0.5px) !important;
      }
      .paper-mode [style*="background-color: #16181f"],
      .paper-mode [style*="background-color: #1c1917"] {
        background-color: rgba(225,205,160,0.42) !important;
      }
      .paper-mode [style*="background-color: #1f1a0d"],
      .paper-mode [style*="background-color: #180a0d"],
      .paper-mode [style*="background-color: #1a1505"] {
        background-color: rgba(232,200,130,0.5) !important;
      }
      .paper-mode [style*="background-color: #0d1f17"] {
        background-color: rgba(180,210,170,0.4) !important;
      }
      .paper-mode [style*="background-color: #0c1b22"] {
        background-color: rgba(180,200,215,0.35) !important;
      }
      .paper-mode [style*="background-color: #1f0f0f"] {
        background-color: rgba(220,165,150,0.4) !important;
      }
      .paper-mode [style*="background-color: #1a132a"],
      .paper-mode [style*="background-color: #2a0d2a"] {
        background-color: rgba(210,180,210,0.4) !important;
      }

      /* ─── PENCIL FILL OVERLAYS via ::after — layered on any bordered/colored element ─── */
      /* Red-bordered panels get red pencil shading */
      .paper-mode [style*="borderColor: #c8202c"] > *:first-child::before,
      .paper-mode [style*="border-color: #c8202c"] > *:first-child::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: url("${TEX.pencilRed}");
        background-size: 300px 300px;
        mix-blend-mode: multiply;
        opacity: 0.18;
        pointer-events: none;
        z-index: 0;
      }

      /* ─── TEXT COLORS — ink brown for "white" text ─── */
      .paper-mode [style*="color: #fafaf9"],
      .paper-mode [style*="color: #f5f5f4"],
      .paper-mode [style*="color: #e7e5e4"],
      .paper-mode [style*="color: #d6d3d1"],
      .paper-mode [style*="color: #c0c4c8"],
      .paper-mode .text-stone-100,
      .paper-mode .text-stone-50 {
        color: #1a1410 !important;
        text-shadow: 0 0 1px rgba(60,40,20,0.15);
      }
      .paper-mode [style*="color: #a8a29e"],
      .paper-mode [style*="color: #78716c"],
      .paper-mode [style*="color: #57534e"],
      .paper-mode [style*="color: #44403c"] {
        color: #6e5d40 !important;
      }

      /* ─── COLOR PENCIL PALETTE for text ─── */
      .paper-mode [style*="color: #f5c518"],
      .paper-mode [style*="color: #fcd34d"],
      .paper-mode [style*="color: #fbbf24"],
      .paper-mode [style*="color: #f59e0b"],
      .paper-mode [style*="color: #eab308"] {
        color: #a8801a !important;
        text-shadow: 0 0 1px rgba(120,80,15,0.3);
      }
      .paper-mode [style*="color: #c8202c"],
      .paper-mode [style*="color: #dc2626"],
      .paper-mode [style*="color: #fca5a5"],
      .paper-mode [style*="color: #f87171"],
      .paper-mode [style*="color: #ef4444"],
      .paper-mode [style*="color: #b91c1c"] {
        color: #9a2828 !important;
        text-shadow: 0 0 1px rgba(120,30,30,0.3);
      }
      .paper-mode [style*="color: #10b981"],
      .paper-mode [style*="color: #34d399"],
      .paper-mode [style*="color: #6ee7b7"] {
        color: #3a6845 !important;
      }
      .paper-mode [style*="color: #22d3ee"],
      .paper-mode [style*="color: #67e8f9"] {
        color: #234a66 !important;
      }
      .paper-mode [style*="color: #c4b5fd"],
      .paper-mode [style*="color: #f0abfc"],
      .paper-mode [style*="color: #f5d0fe"],
      .paper-mode [style*="color: #d946ef"] {
        color: #5e3070 !important;
      }

      /* ─── INKED BORDERS ─── */
      .paper-mode [style*="borderColor: #c8202c"],
      .paper-mode [style*="borderColor: #ef4444"],
      .paper-mode .border-red-600, .paper-mode .border-red-500, .paper-mode .border-red-400 {
        border-color: #7d1e1e !important;
        box-shadow: 0 0 0 0.5px rgba(90,20,20,0.35), 0 1px 2px rgba(90,20,20,0.15) !important;
      }
      .paper-mode [style*="borderColor: #f5c518"],
      .paper-mode [style*="borderColor: #f59e0b"] {
        border-color: #866312 !important;
        box-shadow: 0 0 0 0.5px rgba(120,90,15,0.35), 0 1px 2px rgba(120,90,15,0.15) !important;
      }
      .paper-mode [style*="borderColor: #10b981"],
      .paper-mode [style*="borderColor: #34d399"], .paper-mode .border-emerald-400 {
        border-color: #2f5638 !important;
        box-shadow: 0 0 0 0.5px rgba(40,80,40,0.3), 0 1px 2px rgba(40,80,40,0.15) !important;
      }
      .paper-mode [style*="borderColor: #22d3ee"] {
        border-color: #234a66 !important;
        box-shadow: 0 0 0 0.5px rgba(20,60,100,0.3), 0 1px 2px rgba(20,60,100,0.15) !important;
      }
      .paper-mode [style*="borderColor: #57534e"],
      .paper-mode [style*="borderColor: #44403c"],
      .paper-mode .border-stone-600, .paper-mode .border-stone-700, .paper-mode .border-stone-800 {
        border-color: #6e5d40 !important;
        box-shadow: 0 0 0 0.5px rgba(80,60,30,0.25), 0 1px 2px rgba(80,60,30,0.12) !important;
      }
      .paper-mode [style*="borderColor: #a78bfa"],
      .paper-mode [style*="borderColor: #f0abfc"] {
        border-color: #5e3070 !important;
        box-shadow: 0 0 0 0.5px rgba(80,40,100,0.3), 0 1px 2px rgba(80,40,100,0.15) !important;
      }

      /* ─── HANDWRITTEN inputs ─── */
      .paper-mode input[type="text"],
      .paper-mode input[type="number"],
      .paper-mode input[type="time"],
      .paper-mode textarea,
      .paper-mode .handwritten {
        font-family: 'Kalam', 'Caveat', cursive !important;
        font-weight: 700 !important;
        color: #1e3a5c !important;
        background-color: transparent !important;
        background-image: linear-gradient(to bottom, transparent calc(100% - 2px), rgba(80,60,30,0.55) 100%) !important;
        font-size: 1.15em !important;
        letter-spacing: 0.02em !important;
        text-shadow: 0 0 1px rgba(20,40,80,0.2);
      }

      .paper-mode [style*="font-family: 'Bebas Neue'"] {
        font-family: 'Kalam', 'Caveat', cursive !important;
        font-weight: 700 !important;
        letter-spacing: 0.01em !important;
      }

      /* Digital glow shadows → paper soft-drop */
      .paper-mode [style*="boxShadow"],
      .paper-mode [class*="shadow-"] {
        box-shadow: 0 1px 2px rgba(80,60,30,0.18), 0 2px 4px rgba(80,60,30,0.08) !important;
      }

      /* Kill pulsing animations */
      .paper-mode .animate-pulse,
      .paper-mode .animate-ping {
        animation: none !important;
      }

      /* Diagonal digital stripes fade */
      .paper-mode [style*="linear-gradient"] {
        opacity: 0.3 !important;
      }

      /* Buttons: subtle press */
      .paper-mode button {
        transition: transform 0.08s ease, box-shadow 0.08s ease !important;
      }
      .paper-mode button:active {
        transform: translateY(1px) !important;
      }

      /* Splash/setup wordmark art in paper mode: hide since we show the patch image */
      .paper-mode .patch-hero-hidden { display: none !important; }
    `}} />
  );
}
