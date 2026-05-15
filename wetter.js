const LAT = 50.25, LON = 8.9;

const WMO_DESC = {
    0:'Klar', 1:'Überwiegend klar', 2:'Teilweise bewölkt', 3:'Bedeckt',
    45:'Nebel', 48:'Raureif-Nebel',
    51:'Leichter Sprühregen', 53:'Mäßiger Sprühregen', 55:'Starker Sprühregen',
    61:'Leichter Regen', 63:'Mäßiger Regen', 65:'Starker Regen',
    71:'Leichter Schneefall', 73:'Mäßiger Schneefall', 75:'Starker Schneefall',
    77:'Schneekörner',
    80:'Leichte Schauer', 81:'Mäßige Schauer', 82:'Starke Schauer',
    85:'Leichte Schneeschauer', 86:'Starke Schneeschauer',
    95:'Gewitter', 96:'Gewitter mit Hagel', 99:'Heftiges Gewitter'
};

const WMO_ICON = {
    0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
    45:'🌫️', 48:'🌫️',
    51:'🌦️', 53:'🌧️', 55:'🌧️',
    61:'🌧️', 63:'🌧️', 65:'🌧️',
    71:'🌨️', 73:'❄️', 75:'❄️', 77:'🌨️',
    80:'🌦️', 81:'🌧️', 82:'⛈️',
    85:'🌨️', 86:'❄️',
    95:'⛈️', 96:'⛈️', 99:'⛈️'
};

const DAYS   = ['So','Mo','Di','Mi','Do','Fr','Sa'];
const MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

function icon(code) { return WMO_ICON[code]  || '🌡️'; }
function desc(code) { return WMO_DESC[code]  || 'Unbekannt'; }

function windDir(deg) {
    const dirs = ['N','NO','O','SO','S','SW','W','NW'];
    return dirs[Math.round(deg / 45) % 8];
}

async function load() {
    const params = new URLSearchParams({
        latitude: LAT, longitude: LON,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation,surface_pressure',
        hourly: 'temperature_2m,precipitation_probability,weather_code,wind_speed_10m',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset',
        timezone: 'Europe/Berlin',
        forecast_days: 7,
        wind_speed_unit: 'kmh'
    });

    try {
        const res  = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        render(data);
    } catch (e) {
        document.getElementById('content').innerHTML =
            `<div class="error"><i class="ti ti-alert-triangle" aria-hidden="true" style="margin-right:6px"></i>
     Fehler beim Laden der Wetterdaten (${e.message}). Bitte Seite neu laden.</div>`;
    }
}

function render(d) {
    const c   = d.current;
    const h   = d.hourly;
    const day = d.daily;
    const now = new Date();

    /* ── stündlich: aktueller Index ── */
    const nowH = now.getHours();
    let start = h.time.findIndex(t => {
        const td = new Date(t);
        return td.getHours() === nowH && td.toDateString() === now.toDateString();
    });
    if (start < 0) start = 0;

    /* ── Stunden-Karten ── */
    let hourlyHTML = '';
    for (let i = start; i < Math.min(start + 24, h.time.length); i++) {
        const t     = new Date(h.time[i]);
        const isNow = i === start;
        const label = isNow ? 'Jetzt' : `${String(t.getHours()).padStart(2,'0')}:00`;
        const rain  = h.precipitation_probability[i];
        hourlyHTML += `
    <div class="hour-card${isNow ? ' now' : ''}">
      <div class="hour-time">${label}</div>
      <div class="hour-icon">${icon(h.weather_code[i])}</div>
      <div class="hour-temp">${Math.round(h.temperature_2m[i])}°</div>
      <div class="hour-rain" ${rain > 10 ? '' : 'style="visibility:hidden"'}>
        <i class="ti ti-droplet" aria-hidden="true"></i>${rain}%
      </div>
    </div>`;
    }

    /* ── 7-Tage-Vorhersage ── */
    let dailyHTML = '';
    for (let i = 0; i < day.time.length; i++) {
        const dt    = new Date(day.time[i]);
        const today = dt.toDateString() === now.toDateString();
        const name  = today   ? 'Heute'
            : i === 1 ? 'Morgen'
            : `${DAYS[dt.getDay()]}, ${dt.getDate()}. ${MONTHS[dt.getMonth()]}`;
        const rain  = day.precipitation_sum[i];
        dailyHTML += `
    <div class="day-row">
      <div class="day-name">${name}</div>
      <div class="day-icon">${icon(day.weather_code[i])}</div>
      <div class="day-desc">${desc(day.weather_code[i])}</div>
      <div class="day-temps">
        <span class="day-max">${Math.round(day.temperature_2m_max[i])}°</span>
        <span class="day-min">${Math.round(day.temperature_2m_min[i])}°</span>
      </div>
      <div class="day-rain" ${rain > 0 ? '' : 'style="color:var(--text-tertiary)"'}>
        ${rain > 0 ? `<i class="ti ti-droplet" aria-hidden="true"></i>${rain.toFixed(1)} mm` : '–'}
      </div>
    </div>`;
    }

    /* ── Sonnenauf/-untergang ── */
    const sr  = new Date(day.sunrise[0]);
    const ss  = new Date(day.sunset[0]);
    const fmt = dt => `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;

    document.getElementById('content').innerHTML = `
  <div class="current-card">
    <div class="current-temp">${Math.round(c.temperature_2m)}°C</div>
    <div class="current-details">
      <div class="current-desc">${icon(c.weather_code)} ${desc(c.weather_code)}</div>
      <div class="current-meta">
        <span class="meta-item"><i class="ti ti-thermometer" aria-hidden="true"></i>Gefühlt ${Math.round(c.apparent_temperature)}°C</span>
        <span class="meta-item"><i class="ti ti-droplet" aria-hidden="true"></i>${c.relative_humidity_2m} %</span>
        <span class="meta-item"><i class="ti ti-wind" aria-hidden="true"></i>${Math.round(c.wind_speed_10m)} km/h ${windDir(c.wind_direction_10m)}</span>
        <span class="meta-item"><i class="ti ti-gauge" aria-hidden="true"></i>${Math.round(c.surface_pressure)} hPa</span>
        <span class="meta-item"><i class="ti ti-sunrise" aria-hidden="true"></i>${fmt(sr)} Uhr</span>
        <span class="meta-item"><i class="ti ti-sunset" aria-hidden="true"></i>${fmt(ss)} Uhr</span>
      </div>
    </div>
  </div>

  <div class="section-title">Heute stündlich</div>
  <div class="hourly-scroll"><div class="hourly-track">${hourlyHTML}</div></div>

  <div class="section-title">7-Tage-Vorhersage</div>
  <div class="daily-list">${dailyHTML}</div>

  <div class="updated">
    Aktualisiert: ${now.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} Uhr ·
    <a href="https://open-meteo.com" target="_blank" rel="noopener" style="color:inherit">Open-Meteo API</a>
  </div>`;
}

load();
