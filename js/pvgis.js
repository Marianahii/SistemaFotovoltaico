/* ============================================================
   PVGIS API v5.3 — a través de proxy local (proxy.php)
   ============================================================
   Endpoint usado: seriescalc con components=1
   Devuelve:
     - Gb(i): Beam (direct) irradiance on inclined plane [W/m²]
     - Gd(i): Diffuse irradiance on inclined plane      [W/m²]
     - Gr(i): Reflected irradiance on inclined plane    [W/m²]
     - H_sun: Sun height over horizon [°]
     - T2m:   Temperature at 2 m [°C]
     - WS10m: Wind speed at 10 m [m/s]
     - Int:   Reconstruction flag [0/1]

   Nota: PVGIS NO permite components=2 en seriescalc. Para obtener
   la irradiación directa normal (Gb(n)) que grafica PVGIS oficial,
   convertimos desde Gb(i) con la fórmula:
       Gb(n) = Gb(i) / sin(H_sun)
   ============================================================ */

// Proxy local (evita bloqueos CORS del navegador)
const PVGIS_PROXY = 'proxy.php';

/* ============================================================
   SELECCIÓN DE BASE DE DATOS
   ============================================================ */
function seleccionarBaseDatosOptima(lat, lon) {
  // ERA5 tiene cobertura global, es la opción segura para cualquier sitio.
  return 'PVGIS-ERA5';
}

/* ============================================================
   CONVERSIÓN: Gb(i) → Gb(n)   (beam inclined → beam normal)
   ============================================================
   Gb(n) = Gb(i) / sin(H_sun)
   - H_sun en grados → convertir a radianes
   - Si H_sun ≤ 0 (sol bajo el horizonte), devolvemos 0
   ============================================================ */
function calcularIrradianciaDirectaNormal(Gb_i, H_sun) {
  if (H_sun <= 0 || Gb_i <= 0) return 0;

  const H_rad = H_sun * Math.PI / 180;
  const sinH = Math.sin(H_rad);

  // Evitar división por números muy pequeños (cerca del horizonte)
  if (sinH < 0.01) return 0;

  return Gb_i / sinH;
}

/* ============================================================
   CONSULTA PRINCIPAL: SERIE TEMPORAL MENSUAL (2005-2023)
   ============================================================
   Llama a seriescalc (components=1) y agrupa por año-mes
   usando Gb(n) calculado, para replicar PVGIS oficial.
   ============================================================ */
async function consultarSerieTemporal(lat, lon, anioInicio, anioFin, db, altitud = null) {
  const basesValidas = ['PVGIS-ERA5', 'PVGIS-SARAH3'];
  const baseSolicitada = basesValidas.includes(db) ? db : 'PVGIS-ERA5';
  const basesAProbar = [...new Set([baseSolicitada, 'PVGIS-ERA5', 'PVGIS-SARAH3'])];

  let ultimoError = null;

  for (const base of basesAProbar) {
    try {
      const params = new URLSearchParams({
        endpoint: 'seriescalc',
        lat: lat,
        lon: lon,
        startyear: anioInicio,
        endyear: anioFin,
        raddatabase: base,
        outputformat: 'json',
        components: '1'   // ← 0 o 1, NO 2
      });

      if (altitud) params.append('altitude', altitud);

      const url = `${PVGIS_PROXY}?${params.toString()}`;
      console.log(`🔎 [${base}] Consultando:`, url);

      const res = await fetch(url);

      const textoRespuesta = await res.text();

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${textoRespuesta.slice(0, 200)}`);
      }

      if (textoRespuesta.trim().startsWith('<')) {
        throw new Error(
          `El proxy devolvió HTML en lugar de JSON. ` +
          `Primeros 200 chars: ${textoRespuesta.slice(0, 200)}`
        );
      }

      let data;
      try {
        data = JSON.parse(textoRespuesta);
      } catch (e) {
        throw new Error(
          `JSON inválido. Primeros 200 chars: ${textoRespuesta.slice(0, 200)}`
        );
      }

      if (data.error) {
        throw new Error(`Proxy: ${data.error} ${data.detalle || ''}`);
      }

      if (!data.outputs || !data.outputs.hourly) {
        throw new Error('Respuesta sin serie horaria');
      }

      console.log(`   ✅ ${base}: ${data.outputs.hourly.length} registros horarios`);

      if (data.outputs.hourly.length > 0) {
        console.log('   🔬 Campos disponibles:', Object.keys(data.outputs.hourly[0]));
      }

      // ============================================================
      // AGRUPACIÓN POR AÑO-MES
      // ============================================================
      // Calculamos Gb(n) = Gb(i) / sin(H_sun) y lo acumulamos por mes.
      // Como cada registro es 1 hora, la suma queda en Wh/m².
      // Luego dividimos entre 1000 → kWh/m²/mes.
      // ============================================================
      const porMes = {};

      data.outputs.hourly.forEach(hora => {
        const fecha = hora.time.split(':')[0];   // "20230101"
        const anio = parseInt(fecha.slice(0, 4));
        const mes  = parseInt(fecha.slice(4, 6));
        const clave = `${anio}-${String(mes).padStart(2, '0')}`;

        // Campos de components=1
        const Gb_i = hora['Gb(i)'] || 0;
        const H_sun = hora['H_sun'] || 0;

        // Convertir a irradiancia directa normal
        const Gbn = calcularIrradianciaDirectaNormal(Gb_i, H_sun);

        if (!porMes[clave]) {
          porMes[clave] = { anio, mes, sumaWh: 0 };
        }
        porMes[clave].sumaWh += Gbn;   // Wh/m² (W/m² × 1 h)
      });

      // Convertir Wh/m² → kWh/m²
      const puntos = Object.values(porMes)
        .map(p => ({
          anio: p.anio,
          mes: p.mes,
          suma: p.sumaWh / 1000
        }))
        .sort((a, b) =>
          a.anio === b.anio ? a.mes - b.mes : a.anio - b.anio
        );

      console.log(`   📊 Meses agrupados: ${puntos.length}`);
      if (puntos.length > 0) {
        console.log(`   🔬 Ejemplo:`, puntos[0]);
        console.log(`   📏 Rango esperado: 100-260 kWh/m²/mes`);
      }

      return { puntos, bdUsada: base };

    } catch (err) {
      console.warn(`   ❌ Falló "${base}":`, err.message);
      ultimoError = err;
    }
  }

  throw new Error(`Ninguna BD respondió. Último error: ${ultimoError?.message}`);
}

/* ============================================================
   CONSULTA SECUNDARIA: IRRADIACIÓN MENSUAL PROMEDIO (MRcalc)
   ============================================================ */
async function consultarIrradiacionMensual(lat, lon, anioInicio, anioFin, db, altitud = null) {
  const params = new URLSearchParams({
    endpoint: 'MRcalc',
    lat: lat,
    lon: lon,
    startyear: anioInicio,
    endyear: anioFin,
    horirrad: 1,
    raddatabase: db,
    outputformat: 'json'
  });

  if (altitud) params.append('altitude', altitud);

  const url = `${PVGIS_PROXY}?${params.toString()}`;
  console.log('🔎 Consultando MRcalc (fallback):', url);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Proxy respondió ${res.status}`);

  const data = await res.json();
  if (!data.outputs || !data.outputs.monthly) {
    throw new Error('Respuesta sin datos mensuales');
  }

  return data.outputs.monthly;
}

/* ============================================================
   CONSULTA DE ALTITUD AUTOMÁTICA
   ============================================================ */
async function obtenerAltitud(lat, lon) {
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