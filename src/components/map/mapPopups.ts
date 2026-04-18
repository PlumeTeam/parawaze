import { BS_COMPASS } from './mapFeatures';

// Observation and Forecast popup generator
export function createObservationPopupHTML(props: Record<string, any>): string {
  const reportType = props.report_type || 'observation';
  const windSpeed = props.wind_speed_kmh != null ? Number(props.wind_speed_kmh) : null;
  const windGust = props.wind_gust_kmh != null ? Number(props.wind_gust_kmh) : null;
  const windDir = props.wind_direction != null ? props.wind_direction : null;
  const thermal = props.thermal_quality != null ? Number(props.thermal_quality) : null;
  const location = props.location_name || '—';
  const altitude = props.altitude_m ? ` · ${props.altitude_m}m` : '';
  const createdAt = props.created_at
    ? new Date(props.created_at).toLocaleString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    : '—';

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:220px">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">👁️ ${
        reportType === 'observation' ? 'Observation' : reportType === 'forecast' ? 'Prévision' : 'Partage'
      }</div>
      ${props.author ? `<div style="color:#666;font-size:12px;margin-bottom:6px">par ${props.author}</div>` : ''}
      <div style="color:#555;font-size:12px;margin-bottom:4px">${location}${altitude}</div>
      ${windSpeed != null ? `<div style="margin-bottom:2px">💨 Vent: <b>${Math.round(windSpeed)} km/h</b></div>` : ''}
      ${windGust != null ? `<div style="margin-bottom:2px">🌪️ Rafales: ${Math.round(windGust)} km/h</div>` : ''}
      ${windDir != null ? `<div style="margin-bottom:2px">🧭 Direction: ${windDir}</div>` : ''}
      ${thermal != null ? `<div style="margin-bottom:2px">📈 Thermique: ${thermal.toFixed(1)}m/s</div>` : ''}
      ${
        props.description && props.description !== 'null'
          ? `<div style="margin-bottom:6px;color:#555;font-size:12px"><i>${props.description.substring(0, 100)}${
              props.description.length > 100 ? '…' : ''
            }</i></div>`
          : ''
      }
      <div style="margin-bottom:2px;color:#666;font-size:11px">🕐 ${createdAt}</div>
    </div>
  `;
}

// Forecast popup generator
export function createForecastPopupHTML(props: Record<string, any>): string {
  const windSpeed = props.wind_speed_kmh != null ? Number(props.wind_speed_kmh) : null;
  const windGust = props.wind_gust_kmh != null ? Number(props.wind_gust_kmh) : null;
  const windDir = props.wind_direction != null ? props.wind_direction : null;
  const location = props.location_name || '—';
  const altitude = props.altitude_m ? ` · ${props.altitude_m}m` : '';
  const createdAt = props.created_at
    ? new Date(props.created_at).toLocaleString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    : '—';

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:220px">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">📊 Prévision</div>
      ${props.author ? `<div style="color:#666;font-size:12px;margin-bottom:6px">par ${props.author}</div>` : ''}
      <div style="color:#555;font-size:12px;margin-bottom:4px">${location}${altitude}</div>
      ${windSpeed != null ? `<div style="margin-bottom:2px">💨 Vent: <b>${Math.round(windSpeed)} km/h</b></div>` : ''}
      ${windGust != null ? `<div style="margin-bottom:2px">🌪️ Rafales: ${Math.round(windGust)} km/h</div>` : ''}
      ${windDir != null ? `<div style="margin-bottom:2px">🧭 Direction: ${windDir}</div>` : ''}
      <div style="margin-bottom:2px;color:#666;font-size:11px">🕐 ${createdAt}</div>
    </div>
  `;
}

// Pioupiou popup generator
export function createPioupiouPopupHTML(props: Record<string, any>, isToday: boolean): string {
  if (!isToday) {
    return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px"><b>${props.name || 'Pioupiou ' + props.id}</b></div>`;
  }

  const isOnline = props.isOnline === true || props.isOnline === 'true';
  const windAvg = props.windAvg != null && props.windAvg !== '' ? Number(props.windAvg) : null;
  const windMin = props.windMin != null && props.windMin !== '' ? Number(props.windMin) : null;
  const windMax = props.windMax != null && props.windMax !== '' ? Number(props.windMax) : null;
  const heading = props.windHeading != null && props.windHeading !== '' ? Number(props.windHeading) : null;

  const dirLabel = heading != null ? `${Math.round(heading)}°` : '—';
  const statusLabel = isOnline ? '🟢 En ligne' : '🔴 Hors ligne';
  const lastUp = props.lastUpdate
    ? new Date(props.lastUpdate).toLocaleString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    : '—';

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:180px">
      <div style="font-weight:700;font-size:14px;margin-bottom:6px">${props.name || 'Pioupiou ' + props.id}</div>
      <div style="margin-bottom:2px">💨 Moy: <b>${windAvg != null ? Math.round(windAvg) + ' km/h' : '—'}</b></div>
      <div style="margin-bottom:2px">📉 Min: ${windMin != null ? Math.round(windMin) + ' km/h' : '—'} · 📈 Max: ${windMax != null ? Math.round(windMax) + ' km/h' : '—'}</div>
      <div style="margin-bottom:2px">🧭 Direction: ${dirLabel}</div>
      <div style="margin-bottom:2px">${statusLabel}</div>
      <div style="margin-bottom:6px;color:#666">🕐 ${lastUp}</div>
      <a href="https://www.openwindmap.org/PP${props.id}" target="_blank" rel="noopener"
         style="color:#0ea5e9;text-decoration:underline;font-size:12px">
        Voir sur OpenWindMap ↗
      </a>
    </div>
  `;
}

// FFVL popup generator
export function createFFVLPopupHTML(props: Record<string, any>, isToday: boolean): string {
  if (!isToday) {
    return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px"><b>${props.name || 'FFVL ' + props.id}</b></div>`;
  }

  const windAvg = props.windAvg != null && props.windAvg !== '' ? Number(props.windAvg) : null;
  const windMin = props.windMin != null && props.windMin !== '' ? Number(props.windMin) : null;
  const windMax = props.windMax != null && props.windMax !== '' ? Number(props.windMax) : null;
  const windDir = props.windDirection != null && props.windDirection !== '' ? Number(props.windDirection) : null;
  const temp = props.temperature != null && props.temperature !== '' ? Number(props.temperature) : null;
  const humidity = props.humidity != null && props.humidity !== '' ? Number(props.humidity) : null;
  const alt = props.altitude != null && props.altitude !== '' ? Number(props.altitude) : null;

  const lastUp = props.lastUpdate
    ? new Date(props.lastUpdate).toLocaleString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    : '—';
  const stationUrl = props.url && props.url !== 'null' ? props.url : `https://www.balisemeteo.com/balise.php?idBalise=${props.id}`;

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:190px">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">${props.name || 'FFVL ' + props.id}</div>
      ${alt != null ? `<div style="color:#666;font-size:12px;margin-bottom:6px">⛰️ ${alt} m${props.departement && props.departement !== 'null' ? ' · ' + props.departement : ''}</div>` : ''}
      <div style="margin-bottom:2px">💨 Moy: <b>${windAvg != null ? Math.round(windAvg) + ' km/h' : '—'}</b></div>
      <div style="margin-bottom:2px">📉 Min: ${windMin != null ? Math.round(windMin) + ' km/h' : '—'} · 📈 Max: ${windMax != null ? Math.round(windMax) + ' km/h' : '—'}</div>
      <div style="margin-bottom:2px">🧭 Direction: ${windDir != null ? Math.round(windDir) + '°' : '—'}</div>
      ${temp != null ? `<div style="margin-bottom:2px">🌡️ Température: ${temp.toFixed(1)} °C</div>` : ''}
      ${humidity != null ? `<div style="margin-bottom:2px">💧 Humidité: ${Math.round(humidity)} %</div>` : ''}
      <div style="margin-bottom:6px;color:#666">🕐 ${lastUp}</div>
      <a href="${stationUrl}" target="_blank" rel="noopener"
         style="color:#0ea5e9;text-decoration:underline;font-size:12px">
        Voir sur balisemeteo.com ↗
      </a>
    </div>
  `;
}

// Winds.mobi popup generator
export function createWindsMobiPopupHTML(props: Record<string, any>, isToday: boolean): string {
  if (!isToday) {
    return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px"><b>${props.name || props.id}</b></div>`;
  }

  const windAvg = props.windAvg != null && props.windAvg !== '' ? Number(props.windAvg) : null;
  const windMax = props.windMax != null && props.windMax !== '' ? Number(props.windMax) : null;
  const windDir = props.windDirection != null && props.windDirection !== '' ? Number(props.windDirection) : null;
  const temp = props.temperature != null && props.temperature !== '' ? Number(props.temperature) : null;
  const alt = props.altitude != null && props.altitude !== '' ? Number(props.altitude) : null;

  const lastUp = props.lastUpdate
    ? new Date(Number(props.lastUpdate) * 1000).toLocaleString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    : '—';

  const stationUrl = props.url && props.url !== 'null' ? props.url : `https://winds.mobi/station/${encodeURIComponent(props.id)}`;

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:190px">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">${props.name || props.id}</div>
      ${alt != null ? `<div style="color:#666;font-size:12px;margin-bottom:6px">⛰️ ${alt} m · <span style="color:#888">${props.pvName || props.pvCode || ''}</span></div>` : `<div style="color:#888;font-size:12px;margin-bottom:6px">${props.pvName || props.pvCode || ''}</div>`}
      <div style="margin-bottom:2px">💨 Moy: <b>${windAvg != null ? Math.round(windAvg) + ' km/h' : '—'}</b></div>
      <div style="margin-bottom:2px">📈 Rafales: ${windMax != null ? Math.round(windMax) + ' km/h' : '—'}</div>
      <div style="margin-bottom:2px">🧭 Direction: ${windDir != null ? Math.round(windDir) + '°' : '—'}</div>
      ${temp != null ? `<div style="margin-bottom:2px">🌡️ Température: ${temp.toFixed(1)} °C</div>` : ''}
      <div style="margin-bottom:6px;color:#666">🕐 ${lastUp}</div>
      <a href="${stationUrl}" target="_blank" rel="noopener"
         style="color:#0ea5e9;text-decoration:underline;font-size:12px">
        Voir sur winds.mobi ↗
      </a>
    </div>
  `;
}

// GeoSphere popup generator
export function createGeoSpherePopupHTML(props: Record<string, any>, isToday: boolean): string {
  if (!isToday) {
    return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px"><b>${props.name || props.id}</b></div>`;
  }

  const windAvg = props.windAvg != null && props.windAvg !== '' ? Number(props.windAvg) : null;
  const windGust = props.windGust != null && props.windGust !== '' ? Number(props.windGust) : null;
  const windDir = props.windDirection != null && props.windDirection !== '' ? Number(props.windDirection) : null;
  const temp = props.temperature != null && props.temperature !== '' ? Number(props.temperature) : null;
  const alt = props.altitude != null && props.altitude !== '' ? Number(props.altitude) : null;
  const state = props.state && props.state !== 'null' ? props.state : null;

  const lastUp = props.timestamp
    ? new Date(props.timestamp).toLocaleString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    : '—';

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:190px">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">${props.name || props.id}</div>
      <div style="color:#6366f1;font-size:11px;font-weight:600;letter-spacing:0.03em;margin-bottom:4px">GeoSphere Austria</div>
      ${alt != null ? `<div style="color:#666;font-size:12px;margin-bottom:6px">⛰️ ${alt} m${state ? ' · ' + state : ''}</div>` : state ? `<div style="color:#666;font-size:12px;margin-bottom:6px">${state}</div>` : ''}
      <div style="margin-bottom:2px">💨 Moy: <b>${windAvg != null ? Math.round(windAvg) + ' km/h' : '—'}</b></div>
      <div style="margin-bottom:2px">📈 Rafales: ${windGust != null ? Math.round(windGust) + ' km/h' : '—'}</div>
      <div style="margin-bottom:2px">🧭 Direction: ${windDir != null ? Math.round(windDir) + '°' : '—'}</div>
      ${temp != null ? `<div style="margin-bottom:2px">🌡️ Température: ${temp.toFixed(1)} °C</div>` : ''}
      <div style="margin-bottom:6px;color:#666">🕐 ${lastUp}</div>
      <a href="https://geosphere.at" target="_blank" rel="noopener"
         style="color:#6366f1;text-decoration:underline;font-size:12px">
        GeoSphere Austria ↗
      </a>
    </div>
  `;
}

// BrightSky popup generator
export function createBrightSkyPopupHTML(props: Record<string, any>, isToday: boolean): string {
  if (!isToday) {
    return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px"><b>${props.name}</b></div>`;
  }

  const dirLabel = props.windDirection != null ? BS_COMPASS[Math.round(Number(props.windDirection) / 22.5) % 16] : '—';
  const timeLabel = props.timestamp
    ? new Date(props.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';
  const demoUrl = `https://brightsky.dev/demo/#lat=${props.lat}&lon=${props.lon}&zoom=12`;

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.5;min-width:190px">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">${props.name}</div>
      ${props.altitude != null ? `<div style="color:#666;font-size:12px;margin-bottom:6px">⛰️ ${props.altitude} m · DWD via Bright Sky</div>` : ''}
      <div style="margin-bottom:2px">💨 Vent moy: <b>${Math.round(Number(props.windAvg))} km/h</b></div>
      <div style="margin-bottom:2px">📈 Rafale: ${props.windGust != null ? Math.round(Number(props.windGust)) + ' km/h' : '—'}</div>
      <div style="margin-bottom:2px">🧭 Direction: ${dirLabel} · ${props.windDirection != null ? Math.round(Number(props.windDirection)) + '°' : '—'}</div>
      ${props.temperature != null ? `<div style="margin-bottom:2px">🌡️ Température: ${Number(props.temperature).toFixed(1)} °C</div>` : ''}
      ${timeLabel ? `<div style="margin-bottom:6px;color:#666">🕐 Obs. ${timeLabel}</div>` : ''}
      <a href="${demoUrl}" target="_blank" rel="noopener"
         style="color:#0ea5e9;text-decoration:underline;font-size:12px">
        Voir sur Bright Sky ↗
      </a>
    </div>
  `;
}
