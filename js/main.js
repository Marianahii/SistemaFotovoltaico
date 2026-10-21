/* ============================================================
   INICIALIZACIÓN GENERAL Y FLUJO PRINCIPAL
   ============================================================
   Este archivo se encarga de:
     - Inicializar la navegación entre los 4 módulos principales
     - Llenar los selectores de año (2005-2023)
     - Activar el menú lateral (Conectado a Red, FV, etc.)
     - Configurar checkboxes
     - Inicializar el módulo Perfil de Vivienda
     - Coordinar la consulta a PVGIS y el dibujado de la gráfica
     - Exportar CSV / JSON
   ============================================================ */

const MESES_MAIN = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

let datosActuales = null;

/* ============================================================
   NAVEGACIÓN ENTRE MÓDULOS PRINCIPALES
   ============================================================ */
function inicializarMenuModulos() {
  const botones = document.querySelectorAll('.modulo-btn');
  const paneles = document.querySelectorAll('.modulo-panel');

  console.log(`🔧 Inicializando menú de módulos (${botones.length} botones, ${paneles.length} paneles)`);

  botones.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.modulo;
      console.log(`➡️ Cambiando a: ${targetId}`);

      // Activar botón pulsado
      botones.forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');

      // Mostrar solo el panel correspondiente
      paneles.forEach(p => p.classList.remove('activo'));
      const target = document.getElementById(targetId);
      if (target) {
        target.classList.add('activo');
        console.log(`   ✅ Panel "${targetId}" activado`);
      } else {
        console.warn(`   ⚠️ Panel "${targetId}" no encontrado`);
      }

      // Scroll al inicio
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

/* ============================================================
   LLENAR SELECTORES DE AÑO (2005-2023)
   ============================================================ */
function inicializarSelectoresAnio() {
  const ini = document.getElementById('anioInicio');
  const fin = document.getElementById('anioFin');

  if (!ini || !fin) return;

  ini.innerHTML = '<option value="">— Selecciona —</option>';
  fin.innerHTML = '<option value="">— Selecciona —</option>';

  for (let a = 2005; a <= 2023; a++) {
    const optIni = document.createElement('option');
    optIni.value = a;
    optIni.textContent = a;
    ini.appendChild(optIni);

    const optFin = document.createElement('option');
    optFin.value = a;
    optFin.textContent = a;
    fin.appendChild(optFin);
  }
}

/* ============================================================
   MENÚ LATERAL (Conectado a Red, FV Seguimiento, etc.)
   ============================================================ */
function inicializarMenuLateral() {
  const items = document.querySelectorAll('.menu-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('activo'));
      item.classList.add('activo');
    });
  });
}

/* ============================================================
   CHECKBOXES (Irradiación con ángulo, etc.)
   ============================================================ */
function inicializarCheckboxes() {
  const chkAngulo = document.getElementById('irrAngulo');
  const inputAngulo = document.getElementById('angulo');
  if (chkAngulo && inputAngulo) {
    chkAngulo.addEventListener('change', () => {
      inputAngulo.disabled = !chkAngulo.checked;
    });
  }
}

/* ============================================================
   CONSULTA PRINCIPAL A PVGIS
   ============================================================ */
async function visualizarResultados() {
  const lat = parseFloat(document.getElementById('lat').value);
  const lon = parseFloat(document.getElementById('lon').value);
  const alt = parseFloat(document.getElementById('alt').value) || null;
  const anioInicio = document.getElementById('anioInicio').value;
  const anioFin    = document.getElementById('anioFin').value;
  const db         = document.getElementById('baseDatos').value;

  // ---- Validaciones ----
  if (isNaN(lat) || isNaN(lon)) {
    alert('⚠️ Selecciona coordenadas en el mapa o ingrésalas manualmente.');
    return;
  }
  if (!anioInicio || !anioFin) {
    alert('⚠️ Debes seleccionar año inicial y año final.');
    return;
  }
  if (parseInt(anioInicio) > parseInt(anioFin)) {
    alert('⚠️ El año inicial no puede ser mayor al año final.');
    return;
  }

  const btn = document.getElementById('btnVisualizar');
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Consultando PVGIS (puede tardar 15-30 s)...';

  try {
    console.log('➡️ Consultando serie temporal...');

    const resultado = await consultarSerieTemporal(
      lat, lon, anioInicio, anioFin, db, alt
    );

    console.log('✅ Resultado:', resultado);
    console.log('   Puntos:', resultado.puntos.length);

    if (!resultado.puntos || resultado.puntos.length === 0) {
      throw new Error('No se obtuvieron datos para el rango seleccionado.');
    }

    datosActuales = resultado.puntos;

    document.getElementById('seccionResultados').classList.remove('oculto');
    document.getElementById('res-latlon').textContent =
      `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    document.getElementById('res-db').textContent = resultado.bdUsada;
    document.getElementById('res-anio-ini').textContent = anioInicio;
    document.getElementById('res-anio-fin').textContent = anioFin;

    dibujarGraficaSerieTemporal(resultado.puntos);

    document.getElementById('seccionResultados')
      .scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error('❌ Error completo:', err);
    alert(`❌ Error al consultar PVGIS: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}

/* ============================================================
   EXPORTAR CSV / JSON
   ============================================================ */
function exportarJSON() {
  if (!datosActuales) { alert('Primero consulta los datos.'); return; }
  const blob = new Blob([JSON.stringify(datosActuales, null, 2)],
    { type: 'application/json' });
  descargarBlob(blob, 'pvgis_serie.json');
}

function exportarCSV() {
  if (!datosActuales) { alert('Primero consulta los datos.'); return; }

  let csv = 'Año,Mes,Irradiación (kWh/m²)\n';
  datosActuales.forEach(p => {
    csv += `${p.anio},${p.mes},${p.suma.toFixed(2)}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  descargarBlob(blob, 'pvgis_serie.csv');
}

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================================================
   INICIALIZACIÓN AL CARGAR EL DOM
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Iniciando aplicación…');

  // 1) Navegación entre los 4 módulos principales
  inicializarMenuModulos();

  // 2) Módulo 1: PVGIS, gráfica, mapa
  inicializarSelectoresAnio();
  inicializarMenuLateral();
  inicializarCheckboxes();

  // 3) Módulo 2: Perfil de Vivienda
  if (typeof window.inicializarPerfilVivienda === 'function') {
    window.inicializarPerfilVivienda();
  } else {
    console.warn('⚠️ window.inicializarPerfilVivienda no está definida. Revisa que perfilVivienda.js se haya cargado antes que main.js.');
  }

  // 4) Botones de acción del módulo 1
  const btnVisualizar = document.getElementById('btnVisualizar');
  if (btnVisualizar) btnVisualizar.addEventListener('click', visualizarResultados);

  const btnCSV = document.getElementById('btnCSV');
  if (btnCSV) btnCSV.addEventListener('click', exportarCSV);

  const btnJSON = document.getElementById('btnJSON');
  if (btnJSON) btnJSON.addEventListener('click', exportarJSON);

  console.log('✅ Aplicación inicializada');
});