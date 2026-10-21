/* ============================================================
   MÓDULO PERFIL DE VIVIENDA
   ============================================================
   Flujo:
     1. Preguntar si desea dividir por áreas.
     2a. Si SÍ → definir áreas → tabs con selector de área.
     2b. Si NO → tabs sin selector de área.
   Cálculo de demanda según Módulo M3 del anteproyecto:
     E_diaria = Σ (W × cantidad × horas/día) / 1000   [kWh/día]
   ============================================================ */

/* ---------- ESTADO GLOBAL ---------- */
const perfilState = {
  dividirPorAreas: null,       // true | false | null (sin decidir)
  areas: [],                    // [{id, nombre}]
  areaActiva: null,             // id del área activa
  lamparas: [],                 // [{id, areaId, tipo, watts, cantidad, horas}]
  aparatos: [],                 // [{id, areaId, categoria, watts, cantidad, horas}]
  cargasEsp: {
    ac: { activo: false, toneladas: 1, horas: 8 },
    calentador: { activo: false, watts: 1500, horas: 2 },
    vehiculo: { activo: false, kwhCarga: 40, cargasPorSemana: 3 },
    lavadora: { activo: false, watts: 500, horas: 1 },
    secadora: { activo: false, watts: 2000, horas: 1 }
  }
};

/* ---------- CATÁLOGOS ---------- */
const CATALOGO_LAMPARAS = [
  { tipo: 'LED', wattsDefault: 9 },
  { tipo: 'Fluorescente compacto', wattsDefault: 15 },
  { tipo: 'Incandescente', wattsDefault: 60 }
];

const CATALOGO_APARATOS = [
  { categoria: 'Refrigerador', wattsDefault: 150, horasDefault: 24 },
  { categoria: 'Congelador', wattsDefault: 200, horasDefault: 24 },
  { categoria: 'Minibar', wattsDefault: 80, horasDefault: 24 },
  { categoria: 'Ventilador de techo', wattsDefault: 75, horasDefault: 8 },
  { categoria: 'Ventilador de pared', wattsDefault: 60, horasDefault: 8 },
  { categoria: 'TV LED 32"', wattsDefault: 50, horasDefault: 4 },
  { categoria: 'TV LED 50"', wattsDefault: 100, horasDefault: 4 },
  { categoria: 'Equipo de sonido', wattsDefault: 150, horasDefault: 2 },
  { categoria: 'Consola de videojuegos', wattsDefault: 150, horasDefault: 2 },
  { categoria: 'Computadora de escritorio', wattsDefault: 200, horasDefault: 6 },
  { categoria: 'Laptop', wattsDefault: 60, horasDefault: 6 },
  { categoria: 'Router Wi-Fi', wattsDefault: 12, horasDefault: 24 },
  { categoria: 'Microondas', wattsDefault: 1100, horasDefault: 0.5 },
  { categoria: 'Horno eléctrico', wattsDefault: 2000, horasDefault: 1 },
  { categoria: 'Licuadora', wattsDefault: 400, horasDefault: 0.2 },
  { categoria: 'Extractor', wattsDefault: 200, horasDefault: 1 },
  { categoria: 'Cafetera', wattsDefault: 900, horasDefault: 0.5 },
  { categoria: 'Tostador', wattsDefault: 800, horasDefault: 0.2 },
  { categoria: 'Plancha', wattsDefault: 1200, horasDefault: 0.5 },
  { categoria: 'Bomba de agua', wattsDefault: 750, horasDefault: 1 }
];

/* ---------- UTILIDADES ---------- */
function generarId() {
  return 'id_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Calcula kWh/día de un ítem: (W × cantidad × horas) / 1000
 */
function calcularKwhDia(watts, cantidad, horas) {
  const w = parseFloat(watts) || 0;
  const c = parseFloat(cantidad) || 0;
  const h = parseFloat(horas) || 0;
  return (w * c * h) / 1000;
}

/**
 * Calcula la demanda total actual según Módulo M3.
 */
function calcularDemandaTotal() {
  let total = 0;

  // Lámparas
  perfilState.lamparas.forEach(l => {
    total += calcularKwhDia(l.watts, l.cantidad, l.horas);
  });

  // Aparatos
  perfilState.aparatos.forEach(a => {
    total += calcularKwhDia(a.watts, a.cantidad, a.horas);
  });

  // Cargas especiales
  const ce = perfilState.cargasEsp;

  if (ce.ac.activo) {
    const wattsAC = 1200 * (ce.ac.toneladas || 1);
    total += calcularKwhDia(wattsAC, 1, ce.ac.horas);
  }
  if (ce.calentador.activo) {
    total += calcularKwhDia(ce.calentador.watts, 1, ce.calentador.horas);
  }
  if (ce.vehiculo.activo) {
    total += (ce.vehiculo.kwhCarga * ce.vehiculo.cargasPorSemana) / 7;
  }
  if (ce.lavadora.activo) {
    total += calcularKwhDia(ce.lavadora.watts, 1, ce.lavadora.horas);
  }
  if (ce.secadora.activo) {
    total += calcularKwhDia(ce.secadora.watts, 1, ce.secadora.horas);
  }

  return total;
}

/**
 * Actualiza el indicador de demanda en el header y en el módulo.
 */
function actualizarDemandaUI() {
  const total = calcularDemandaTotal();

  // Header principal
  const header = document.getElementById('demandaHeader');
  if (header) header.textContent = total.toFixed(2);

  // Indicador interno del módulo (si existe)
  const interno = document.getElementById('demandaActual');
  if (interno) interno.textContent = total.toFixed(2);

  return total;
}

/* ============================================================
   PASO 2.0: PREGUNTA ÁREAS
   ============================================================ */
function inicializarPreguntaAreas() {
  const btnSi = document.getElementById('btnSiAreas');
  const btnNo = document.getElementById('btnNoAreas');

  if (btnSi) {
    btnSi.addEventListener('click', () => {
      console.log('➡️ Usuario eligió: dividir por áreas');
      perfilState.dividirPorAreas = true;
      document.getElementById('preguntaAreas').classList.add('oculto');
      document.getElementById('definirAreas').classList.remove('oculto');

      if (perfilState.areas.length === 0) {
        agregarArea('Sala');
        agregarArea('Cocina');
        agregarArea('Recámara');
      }
      renderizarAreas();
    });
  } else {
    console.warn('⚠️ btnSiAreas no encontrado en el DOM');
  }

  if (btnNo) {
    btnNo.addEventListener('click', () => {
      console.log('➡️ Usuario eligió: sin subdivisiones');
      perfilState.dividirPorAreas = false;
      document.getElementById('preguntaAreas').classList.add('oculto');
      document.getElementById('contenidoPerfil').classList.remove('oculto');

      // Área virtual "General"
      perfilState.areas = [{ id: 'general', nombre: 'General' }];
      perfilState.areaActiva = 'general';
      renderizarTodo();
    });
  } else {
    console.warn('⚠️ btnNoAreas no encontrado en el DOM');
  }
}

/* ============================================================
   PASO 2.1: DEFINIR ÁREAS
   ============================================================ */
function agregarArea(nombre = '') {
  perfilState.areas.push({
    id: generarId(),
    nombre: nombre
  });
}

function renderizarAreas() {
  const cont = document.getElementById('listaAreas');
  if (!cont) return;
  cont.innerHTML = '';

  perfilState.areas.forEach((area, idx) => {
    const row = document.createElement('div');
    row.className = 'area-row';
    row.innerHTML = `
      <span class="num">${idx + 1}</span>
      <input type="text" value="${area.nombre}" data-id="${area.id}" placeholder="Ej. Sala, Cocina…">
      <button data-id="${area.id}" title="Eliminar">×</button>
    `;
    row.querySelector('input').addEventListener('input', (e) => {
      const a = perfilState.areas.find(x => x.id === e.target.dataset.id);
      if (a) a.nombre = e.target.value;
    });
    row.querySelector('button').addEventListener('click', (e) => {
      perfilState.areas = perfilState.areas.filter(x => x.id !== e.target.dataset.id);
      renderizarAreas();
    });
    cont.appendChild(row);
  });
}

function inicializarDefinirAreas() {
  const btnAgregar = document.getElementById('btnAgregarArea');
  const btnVolver = document.getElementById('btnVolverPregunta');
  const btnConfirmar = document.getElementById('btnConfirmarAreas');

  if (btnAgregar) {
    btnAgregar.addEventListener('click', () => {
      agregarArea('');
      renderizarAreas();
    });
  }

  if (btnVolver) {
    btnVolver.addEventListener('click', () => {
      document.getElementById('definirAreas').classList.add('oculto');
      document.getElementById('preguntaAreas').classList.remove('oculto');
    });
  }

  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', () => {
      const sinNombre = perfilState.areas.some(a => !a.nombre.trim());
      if (sinNombre || perfilState.areas.length === 0) {
        alert('⚠️ Todas las áreas deben tener un nombre.');
        return;
      }
      perfilState.areaActiva = perfilState.areas[0].id;
      document.getElementById('definirAreas').classList.add('oculto');
      document.getElementById('contenidoPerfil').classList.remove('oculto');
      renderizarTodo();
    });
  }
}

/* ============================================================
   RENDERIZADO PRINCIPAL
   ============================================================ */
function renderizarTodo() {
  renderizarLamparas();
  renderizarAparatos();
  renderizarCargasEsp();
  actualizarDemandaUI();
}

/* ---------- SELECTOR DE ÁREA ---------- */
function htmlSelectArea(idItem, areaActual) {
  if (!perfilState.dividirPorAreas) return '';

  const opciones = perfilState.areas.map(a =>
    `<option value="${a.id}" ${a.id === areaActual ? 'selected' : ''}>${a.nombre || 'Sin nombre'}</option>`
  ).join('');

  return `
    <div class="campo-item">
      <label>Espacio</label>
      <select class="select-area" data-id="${idItem}">${opciones}</select>
    </div>
  `;
}

/* ---------- LÁMPARAS ---------- */
function renderizarLamparas() {
  const cont = document.getElementById('listaLamparas');
  if (!cont) return;
  cont.innerHTML = '';

  perfilState.lamparas.forEach(l => {
    const kwh = calcularKwhDia(l.watts, l.cantidad, l.horas);
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      ${htmlSelectArea(l.id, l.areaId)}
      <div class="campo-item">
        <label>Tipo</label>
        <select class="sel-tipo" data-id="${l.id}">
          ${CATALOGO_LAMPARAS.map(c => `<option value="${c.tipo}" ${c.tipo === l.tipo ? 'selected' : ''}>${c.tipo}</option>`).join('')}
        </select>
      </div>
      <div class="campo-item">
        <label>Watts</label>
        <input type="number" class="inp-watts" data-id="${l.id}" value="${l.watts}" min="0">
      </div>
      <div class="campo-item">
        <label>Cantidad</label>
        <input type="number" class="inp-cantidad" data-id="${l.id}" value="${l.cantidad}" min="0">
      </div>
      <div class="campo-item">
        <label>Horas/día</label>
        <input type="number" class="inp-horas" data-id="${l.id}" value="${l.horas}" min="0" step="0.1">
      </div>
      <button class="btn-eliminar" data-id="${l.id}">×</button>
      <div class="detalle-kwh">${kwh.toFixed(3)} kWh/día</div>
    `;
    cont.appendChild(card);
  });

  cont.querySelectorAll('.inp-watts, .inp-cantidad, .inp-horas').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const id = e.target.dataset.id;
      const l = perfilState.lamparas.find(x => x.id === id);
      if (!l) return;
      l.watts = parseFloat(cont.querySelector(`.inp-watts[data-id="${id}"]`).value) || 0;
      l.cantidad = parseFloat(cont.querySelector(`.inp-cantidad[data-id="${id}"]`).value) || 0;
      l.horas = parseFloat(cont.querySelector(`.inp-horas[data-id="${id}"]`).value) || 0;
      renderizarLamparas();
      actualizarDemandaUI();
    });
  });

  cont.querySelectorAll('.sel-tipo').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const l = perfilState.lamparas.find(x => x.id === e.target.dataset.id);
      if (!l) return;
      l.tipo = e.target.value;
      const cat = CATALOGO_LAMPARAS.find(c => c.tipo === l.tipo);
      if (cat) l.watts = cat.wattsDefault;
      renderizarLamparas();
      actualizarDemandaUI();
    });
  });

  cont.querySelectorAll('.select-area').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const l = perfilState.lamparas.find(x => x.id === e.target.dataset.id);
      if (l) l.areaId = e.target.value;
    });
  });

  cont.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      perfilState.lamparas = perfilState.lamparas.filter(x => x.id !== e.target.dataset.id);
      renderizarLamparas();
      actualizarDemandaUI();
    });
  });
}

/* ---------- APARATOS ---------- */
function renderizarAparatos() {
  const cont = document.getElementById('listaAparatos');
  if (!cont) return;
  cont.innerHTML = '';

  perfilState.aparatos.forEach(a => {
    const kwh = calcularKwhDia(a.watts, a.cantidad, a.horas);
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      ${htmlSelectArea(a.id, a.areaId)}
      <div class="campo-item">
        <label>Aparato</label>
        <select class="sel-cat" data-id="${a.id}">
          ${CATALOGO_APARATOS.map(c => `<option value="${c.categoria}" ${c.categoria === a.categoria ? 'selected' : ''}>${c.categoria}</option>`).join('')}
        </select>
      </div>
      <div class="campo-item">
        <label>Watts</label>
        <input type="number" class="inp-watts" data-id="${a.id}" value="${a.watts}" min="0">
      </div>
      <div class="campo-item">
        <label>Cantidad</label>
        <input type="number" class="inp-cantidad" data-id="${a.id}" value="${a.cantidad}" min="0">
      </div>
      <div class="campo-item">
        <label>Horas/día</label>
        <input type="number" class="inp-horas" data-id="${a.id}" value="${a.horas}" min="0" step="0.1">
      </div>
      <button class="btn-eliminar" data-id="${a.id}">×</button>
      <div class="detalle-kwh">${kwh.toFixed(3)} kWh/día</div>
    `;
    cont.appendChild(card);
  });

  cont.querySelectorAll('.inp-watts, .inp-cantidad, .inp-horas').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const id = e.target.dataset.id;
      const a = perfilState.aparatos.find(x => x.id === id);
      if (!a) return;
      a.watts = parseFloat(cont.querySelector(`.inp-watts[data-id="${id}"]`).value) || 0;
      a.cantidad = parseFloat(cont.querySelector(`.inp-cantidad[data-id="${id}"]`).value) || 0;
      a.horas = parseFloat(cont.querySelector(`.inp-horas[data-id="${id}"]`).value) || 0;
      renderizarAparatos();
      actualizarDemandaUI();
    });
  });

  cont.querySelectorAll('.sel-cat').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const a = perfilState.aparatos.find(x => x.id === e.target.dataset.id);
      if (!a) return;
      a.categoria = e.target.value;
      const cat = CATALOGO_APARATOS.find(c => c.categoria === a.categoria);
      if (cat) {
        a.watts = cat.wattsDefault;
        a.horas = cat.horasDefault;
      }
      renderizarAparatos();
      actualizarDemandaUI();
    });
  });

  cont.querySelectorAll('.select-area').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const a = perfilState.aparatos.find(x => x.id === e.target.dataset.id);
      if (a) a.areaId = e.target.value;
    });
  });

  cont.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      perfilState.aparatos = perfilState.aparatos.filter(x => x.id !== e.target.dataset.id);
      renderizarAparatos();
      actualizarDemandaUI();
    });
  });
}

/* ---------- CARGAS ESPECIALES ---------- */
function renderizarCargasEsp() {
  const cont = document.getElementById('detalleCargasEsp');
  if (!cont) return;

  const ce = perfilState.cargasEsp;
  let html = '';

  if (ce.ac.activo) {
    html += `
      <div class="item-card">
        <div class="campo-item">
          <label>Toneladas de refrigeración</label>
          <input type="number" id="acTon" value="${ce.ac.toneladas}" min="0.5" step="0.5">
        </div>
        <div class="campo-item">
          <label>Horas/día</label>
          <input type="number" id="acHoras" value="${ce.ac.horas}" min="0" max="24">
        </div>
        <div class="detalle-kwh">${calcularKwhDia(1200 * ce.ac.toneladas, 1, ce.ac.horas).toFixed(2)} kWh/día</div>
      </div>
    `;
  }
  if (ce.calentador.activo) {
    html += `
      <div class="item-card">
        <div class="campo-item">
          <label>Watts</label>
          <input type="number" id="calWatts" value="${ce.calentador.watts}" min="0">
        </div>
        <div class="campo-item">
          <label>Horas/día</label>
          <input type="number" id="calHoras" value="${ce.calentador.horas}" min="0">
        </div>
        <div class="detalle-kwh">${calcularKwhDia(ce.calentador.watts, 1, ce.calentador.horas).toFixed(2)} kWh/día</div>
      </div>
    `;
  }
  if (ce.vehiculo.activo) {
    html += `
      <div class="item-card">
        <div class="campo-item">
          <label>kWh por carga</label>
          <input type="number" id="veKwh" value="${ce.vehiculo.kwhCarga}" min="5" step="5">
        </div>
        <div class="campo-item">
          <label>Cargas por semana</label>
          <input type="number" id="veSemana" value="${ce.vehiculo.cargasPorSemana}" min="1" max="7">
        </div>
        <div class="detalle-kwh">${((ce.vehiculo.kwhCarga * ce.vehiculo.cargasPorSemana) / 7).toFixed(2)} kWh/día</div>
      </div>
    `;
  }
  if (ce.lavadora.activo) {
    html += `
      <div class="item-card">
        <div class="campo-item">
          <label>Watts</label>
          <input type="number" id="lavWatts" value="${ce.lavadora.watts}" min="0">
        </div>
        <div class="campo-item">
          <label>Horas/día</label>
          <input type="number" id="lavHoras" value="${ce.lavadora.horas}" min="0" step="0.5">
        </div>
        <div class="detalle-kwh">${calcularKwhDia(ce.lavadora.watts, 1, ce.lavadora.horas).toFixed(2)} kWh/día</div>
      </div>
    `;
  }
  if (ce.secadora.activo) {
    html += `
      <div class="item-card">
        <div class="campo-item">
          <label>Watts</label>
          <input type="number" id="secWatts" value="${ce.secadora.watts}" min="0">
        </div>
        <div class="campo-item">
          <label>Horas/día</label>
          <input type="number" id="secHoras" value="${ce.secadora.horas}" min="0" step="0.5">
        </div>
        <div class="detalle-kwh">${calcularKwhDia(ce.secadora.watts, 1, ce.secadora.horas).toFixed(2)} kWh/día</div>
      </div>
    `;
  }

  cont.innerHTML = html;

  const bind = (id, obj, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      obj[key] = parseFloat(e.target.value) || 0;
      renderizarCargasEsp();
      actualizarDemandaUI();
    });
  };

  bind('acTon', ce.ac, 'toneladas');
  bind('acHoras', ce.ac, 'horas');
  bind('calWatts', ce.calentador, 'watts');
  bind('calHoras', ce.calentador, 'horas');
  bind('veKwh', ce.vehiculo, 'kwhCarga');
  bind('veSemana', ce.vehiculo, 'cargasPorSemana');
  bind('lavWatts', ce.lavadora, 'watts');
  bind('lavHoras', ce.lavadora, 'horas');
  bind('secWatts', ce.secadora, 'watts');
  bind('secHoras', ce.secadora, 'horas');
}

/* ============================================================
   INICIALIZACIÓN GENERAL DEL MÓDULO
   ============================================================ */
function inicializarPerfilVivienda() {
  console.log('🔧 Inicializando Perfil de Vivienda…');

  // Diagnóstico: verificar que los elementos clave existen
  const checks = [
    'preguntaAreas', 'definirAreas', 'contenidoPerfil',
    'btnSiAreas', 'btnNoAreas',
    'btnAgregarArea', 'btnVolverPregunta', 'btnConfirmarAreas',
    'btnAgregarLampara', 'btnAgregarAparato',
    'chkAC', 'chkCalentador', 'chkVE', 'chkLavadora', 'chkSecadora',
    'btnAtrasPerfil', 'btnContinuarPerfil'
  ];
  const faltantes = checks.filter(id => !document.getElementById(id));
  if (faltantes.length > 0) {
    console.warn('⚠️ Elementos faltantes en el DOM:', faltantes);
  } else {
    console.log('✅ Todos los elementos del Módulo 2 existen en el DOM');
  }

  inicializarPreguntaAreas();
  inicializarDefinirAreas();

  /* ---------- TABS ---------- */
  document.querySelectorAll('.tab-perfil').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-perfil').forEach(t => t.classList.remove('activo'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('activo'));
      tab.classList.add('activo');
      const target = document.getElementById('tab-' + tab.dataset.tab);
      if (target) target.classList.add('activo');
    });
  });

  /* ---------- BOTONES AGREGAR ---------- */
  const btnAgregarLampara = document.getElementById('btnAgregarLampara');
  if (btnAgregarLampara) {
    btnAgregarLampara.addEventListener('click', () => {
      const areaId = perfilState.dividirPorAreas
        ? (perfilState.areas[0]?.id || null)
        : 'general';
      perfilState.lamparas.push({
        id: generarId(),
        areaId: areaId,
        tipo: 'LED',
        watts: 9,
        cantidad: 1,
        horas: 4
      });
      renderizarLamparas();
      actualizarDemandaUI();
    });
  }

  const btnAgregarAparato = document.getElementById('btnAgregarAparato');
  if (btnAgregarAparato) {
    btnAgregarAparato.addEventListener('click', () => {
      const areaId = perfilState.dividirPorAreas
        ? (perfilState.areas[0]?.id || null)
        : 'general';
      const first = CATALOGO_APARATOS[0];
      perfilState.aparatos.push({
        id: generarId(),
        areaId: areaId,
        categoria: first.categoria,
        watts: first.wattsDefault,
        cantidad: 1,
        horas: first.horasDefault
      });
      renderizarAparatos();
      actualizarDemandaUI();
    });
  }

  /* ---------- CHECKBOXES CARGAS ESP. ---------- */
  const bindCheck = (chkId, key) => {
    const el = document.getElementById(chkId);
    if (!el) return;
    el.addEventListener('change', (e) => {
      perfilState.cargasEsp[key].activo = e.target.checked;
      renderizarCargasEsp();
      actualizarDemandaUI();
    });
  };

  bindCheck('chkAC', 'ac');
  bindCheck('chkCalentador', 'calentador');
  bindCheck('chkVE', 'vehiculo');
  bindCheck('chkLavadora', 'lavadora');
  bindCheck('chkSecadora', 'secadora');

  /* ---------- CAMPOS VIVIENDA ---------- */
  ['tipoVivienda', 'numIntegrantes', 'numRecamaras', 'numBanos', 'numAreasRec',
   'areaSala', 'areaCocina', 'areaComedor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', actualizarDemandaUI);
  });

  /* ---------- BOTONES NAVEGACIÓN ---------- */
  const btnAtras = document.getElementById('btnAtrasPerfil');
  if (btnAtras) {
    btnAtras.addEventListener('click', () => {
      document.getElementById('contenidoPerfil').classList.add('oculto');
      document.getElementById('preguntaAreas').classList.remove('oculto');
    });
  }

  const btnContinuar = document.getElementById('btnContinuarPerfil');
  if (btnContinuar) {
    btnContinuar.addEventListener('click', () => {
      const demanda = calcularDemandaTotal();

      console.log('✅ Demanda total:', demanda.toFixed(2), 'kWh/día');
      console.log('   Áreas:', perfilState.areas);
      console.log('   Lámparas:', perfilState.lamparas);
      console.log('   Aparatos:', perfilState.aparatos);
      console.log('   Cargas esp.:', perfilState.cargasEsp);

      // Exponer para el módulo M3 (motor de cálculo FV)
      window.perfilVivienda = {
        demandaDiaria: demanda,
        areas: perfilState.areas,
        lamparas: perfilState.lamparas,
        aparatos: perfilState.aparatos,
        cargasEsp: perfilState.cargasEsp
      };

      alert(`✅ Perfil guardado.\n\nDemanda diaria total: ${demanda.toFixed(2)} kWh/día`);

      // Ir al módulo 3
      const btnModulo3 = document.querySelector('.modulo-btn[data-modulo="modulo3"]');
      if (btnModulo3) btnModulo3.click();
    });
  }

  console.log('✅ Perfil de Vivienda inicializado correctamente');
}

window.inicializarPerfilVivienda = inicializarPerfilVivienda;