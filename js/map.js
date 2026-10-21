/* ============================================================
   MAPA: inicialización, marcador, altitud y captura de clics
   ============================================================ */

const mapa = L.map('mapa', {
  worldCopyJump: true,
  minZoom: 2,
  maxZoom: 18
}).setView([23.6345, -102.5528], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19
}).addTo(mapa);

let marcador = null;

/* ============================================================
   CONSULTAR ALTITUD — Open-Meteo (fallback: OpenTopoData)
   ============================================================ */
async function consultarAltitud(lat, lon) {
  // API 1: Open-Meteo
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.elevation && data.elevation.length > 0) {
        const alt = Math.round(data.elevation[0]);
        console.log('✅ Altitud (Open-Meteo):', alt, 'm');
        return alt;
      }
    }
  } catch (err) {
    console.warn('Open-Meteo falló, probando OpenTopoData…', err);
  }

  // API 2: OpenTopoData
  try {
    const url = `https://api.opentopodata.org/v1/eudem25m?locations=${lat},${lon}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results[0] && data.results[0].elevation !== null) {
        const alt = Math.round(data.results[0].elevation);
        console.log('✅ Altitud (OpenTopoData):', alt, 'm');
        return alt;
      }
    }
  } catch (err) {
    console.warn('OpenTopoData también falló:', err);
  }

  console.warn('⚠️ No se pudo obtener la altitud');
  return null;
}

/* ============================================================
   COLOCAR / MOVER MARCADOR
   ============================================================ */
async function colocarMarcador(lat, lon) {
  if (marcador) {
    marcador.setLatLng([lat, lon]);
  } else {
    marcador = L.marker([lat, lon], { draggable: true }).addTo(mapa);

    marcador.on('dragend', async (e) => {
      const pos = e.target.getLatLng();
      await actualizarTodo(pos.lat, pos.lng);
    });
  }

  await actualizarTodo(lat, lon);
}

/* ============================================================
   ACTUALIZAR TODO: inputs + cursor + altitud
   ============================================================ */
async function actualizarTodo(lat, lon) {
  const inputLat = document.getElementById('lat');
  const inputLon = document.getElementById('lon');
  const inputAlt = document.getElementById('alt');
  const display = document.getElementById('latlon-display');
  const cursorCoords = document.getElementById('cursor-coords');
  const cursorElev = document.getElementById('cursor-elev');

  inputLat.value = lat.toFixed(6);
  inputLon.value = lon.toFixed(6);
  if (display) display.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  if (cursorCoords) cursorCoords.textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

  [inputLat, inputLon].forEach(el => {
    el.classList.add('actualizado');
    setTimeout(() => el.classList.remove('actualizado'), 500);
  });

  if (cursorElev) cursorElev.textContent = '⏳…';
  const alt = await consultarAltitud(lat, lon);

  if (alt !== null && !isNaN(alt)) {
    inputAlt.value = alt;
    if (cursorElev) cursorElev.textContent = alt;
    inputAlt.classList.add('actualizado');
    setTimeout(() => inputAlt.classList.remove('actualizado'), 500);
  } else {
    inputAlt.value = '';
    if (cursorElev) cursorElev.textContent = '—';
  }
}

/* ============================================================
   EVENTO: CLIC EN EL MAPA
   ============================================================ */
mapa.on('click', async (e) => {
  const { lat, lng } = e.latlng;
  await colocarMarcador(lat, lng);
});

/* ============================================================
   BOTÓN "IR" + SINCRONIZACIÓN DE INPUTS
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const btnIr = document.querySelector('.btn-ir');
  const inputDir = document.getElementById('direccion');

  if (btnIr && inputDir) {
    btnIr.addEventListener('click', async () => {
      const q = inputDir.value.trim();
      if (!q) return;

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
        const data = await res.json();

        if (data && data.length > 0) {
          const latN = parseFloat(data[0].lat);
          const lonN = parseFloat(data[0].lon);
          mapa.setView([latN, lonN], 10);
          await colocarMarcador(latN, lonN);
        } else {
          alert('No se encontró la dirección.');
        }
      } catch (err) {
        console.error('Error geocodificando:', err);
      }
    });
  }

  const inputLat = document.getElementById('lat');
  const inputLon = document.getElementById('lon');

  async function sincronizarDesdeInputs() {
    const lat = parseFloat(inputLat.value);
    const lon = parseFloat(inputLon.value);

    if (!isNaN(lat) && !isNaN(lon) &&
        lat >= -90 && lat <= 90 &&
        lon >= -180 && lon <= 180) {
      mapa.setView([lat, lon], Math.max(mapa.getZoom(), 8));
      await colocarMarcador(lat, lon);
    }
  }

  inputLat.addEventListener('change', sincronizarDesdeInputs);
  inputLon.addEventListener('change', sincronizarDesdeInputs);
});