/* ============================================================
   MÓDULO PERFIL DE VIVIENDA
   ============================================================ */

const perfilState = {
  dividirPorAreas: null,
  areas: [],
  areaActiva: null,
  lamparas: [],
  aparatos: [],
  cargasEsp: {
    ac: { activo: false, toneladas: 1, horas: 8 },
    calentador: { activo: false, watts: 1500, horas: 2 },
    vehiculo: { activo: false, kwhCarga: 40, cargasPorSemana: 3 },
    lavadora: { activo: false, watts: 500, horas: 1 },
    secadora: { activo: false, watts: 2000, horas: 1 }
  }
};

const CATALOGO_LAMPARAS = [
  { tipo: 'LED', wattsDefault: 9 },
  { tipo: 'Fluorescente compacto', wattsDefault: 15 },
  { tipo: 'Incandescente', wattsDefault: 60 }
];

const CATALOGO_APARATOS = [
  { categoria: 'Refrigerador', areaSugerida: 'Cocina', wattsDefault: 150, horasDefault: 24 },
  { categoria: 'Microondas', areaSugerida: 'Cocina', wattsDefault: 1200, horasDefault: 0.5 },
  { categoria: 'Licuadora', areaSugerida: 'Cocina', wattsDefault: 500, horasDefault: 0.2 },
  { categoria: 'Cafetera', areaSugerida: 'Cocina', wattsDefault: 900, horasDefault: 0.5 },
  { categoria: 'Tostador', areaSugerida: 'Cocina', wattsDefault: 800, horasDefault: 0.2 },
  { categoria: 'Horno eléctrico', areaSugerida: 'Cocina', wattsDefault: 2000, horasDefault: 1 },
  { categoria: 'Televisor 43"', areaSugerida: 'Entretenimiento', wattsDefault: 90, horasDefault: 4 },
  { categoria: 'Televisor 65"', areaSugerida: 'Entretenimiento', wattsDefault: 150, horasDefault: 4 },
  { categoria: 'Consola de videojuegos', areaSugerida: 'Entretenimiento', wattsDefault: 200, horasDefault: 2 },
  { categoria: 'Computadora de escritorio', areaSugerida: 'Oficina', wattsDefault: 300, horasDefault: 6 },
  { categoria: 'Laptop', areaSugerida: 'Oficina', wattsDefault: 65, horasDefault: 6 },
  { categoria: 'Router WiFi', areaSugerida: 'Oficina', wattsDefault: 15, horasDefault: 24 },
  { categoria: 'Impresora', areaSugerida: 'Oficina', wattsDefault: 400, horasDefault: 0.5 },
  { categoria: 'Plancha de ropa', areaSugerida: 'Lavandería', wattsDefault: 1500, horasDefault: 0.5 },
  { categoria: 'Aspiradora', areaSugerida: 'Limpieza', wattsDefault: 1000, horasDefault: 0.5 },
  { categoria: 'Ventilador de techo', areaSugerida: 'Climatización', wattsDefault: 75, horasDefault: 8 },
  { categoria: 'Ventilador de piso', areaSugerida: 'Climatización', wattsDefault: 55, horasDefault: 8 },
  { categoria: 'Bomba de agua', areaSugerida: 'Infraestructura', wattsDefault: 750, horasDefault: 1 },
  { categoria: 'Jacuzzi/Tina', areaSugerida: 'Recreación', wattsDefault: 3500, horasDefault: 1 },
  { categoria: 'Sistema de seguridad', areaSugerida: 'Seguridad', wattsDefault: 25, horasDefault: 24 },
  { categoria: 'Cargador de celular', areaSugerida: 'Dispositivos', wattsDefault: 20, horasDefault: 3 },
  { categoria: 'Tablet', areaSugerida: 'Dispositivos', wattsDefault: 30, horasDefault: 3 }
];

function generarId() {
  return 'id_' + Math.random().toString(36).substr(2, 9);
}

function calcularKwhDia(watts, cantidad, horas) {
  const w = parseFloat(watts) || 0;
  const c = parseFloat(cantidad) || 0;
  const h = parseFloat(horas) || 0;
  return (w * c * h) / 1000;
}

function calcularDemandaTotal() {
  let total = 0;
  perfilState.lamparas.forEach(l => total += calcularKwhDia(l.watts, l.cantidad, l.horas));
  perfilState.aparatos.forEach(a => total += calcularKwhDia(a.watts, a.cantidad, a.horas));

  const ce = perfilState.cargasEsp;
  if (ce.ac.activo) total += calcularKwhDia(1200 * ce.ac.toneladas, 1, ce.ac.horas);
  if (ce.calentador.activo) total += calcularKwhDia(ce.calentador.watts, 1, ce.calentador.horas);
  if (ce.vehiculo.activo) total += (ce.vehiculo.kwhCarga * ce.vehiculo.cargasPorSemana) / 7;
  if (ce.lavadora.activo) total += calcularKwhDia(ce.lavadora.watts, 1, ce.lavadora.horas);
  if (ce.secadora.activo) total += calcularKwhDia(ce.secadora.watts, 1, ce.secadora.horas);

  return total;
}

function actualizarDemandaUI() {
  const total = calcularDemandaTotal();
  const header = document.getElementById('demandaHeader');
  if (header) header.textContent = total.toFixed(2);
  return total;
}

/* ============================================================
   PREGUNTAS Y ÁREAS
   ============================================================ */
function inicializarPreguntaAreas() {
  const btnSi = document.getElementById('btnSiAreas');
  const btnNo = document.getElementById('btnNoAreas');

  if (btnSi) btnSi.addEventListener('click', () => {
    perfilState.dividirPorAreas = true;
    document.getElementById('preguntaAreas').classList.add('oculto');
    document.getElementById('definirAreas').classList.remove('oculto');
    if (perfilState.areas.length === 0) {
      agregarArea('Sala'); agregarArea('Cocina'); agregarArea('Recámara');
    }
    renderizarAreas();
  });

  if (btnNo) btnNo.addEventListener('click', () => {
    perfilState.dividirPorAreas = false;
    document.getElementById('preguntaAreas').classList.add('oculto');
    document.getElementById('contenidoPerfil').classList.remove('oculto');
    perfilState.areas = [{ id: 'general', nombre: 'General' }];
    perfilState.areaActiva = 'general';
    renderizarTodo();
  });
}

function agregarArea(nombre = '') {
  perfilState.areas.push({ id: generarId(), nombre: nombre });
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
  document.getElementById('btnAgregarArea')?.addEventListener('click', () => {
    agregarArea(''); renderizarAreas();
  });
  document.getElementById('btnVolverPregunta')?.addEventListener('click', () => {
    document.getElementById('definirAreas').classList.add('oculto');
    document.getElementById('preguntaAreas').classList.remove('oculto');
  });
  document.getElementById('btnConfirmarAreas')?.addEventListener('click', () => {
    if (perfilState.areas.some(a => !a.nombre.trim()) || perfilState.areas.length === 0) {
      alert('⚠️ Todas las áreas deben tener un nombre.'); return;
    }
    perfilState.areaActiva = perfilState.areas[0].id;
    document.getElementById('definirAreas').classList.add('oculto');
    document.getElementById('contenidoPerfil').classList.remove('oculto');
    renderizarTodo();
  });
}

/* ============================================================
   RENDERIZADO PRINCIPAL
   ============================================================ */
function renderizarTodo() {
  renderizarLamparas();
  renderizarCatalogoAparatos(); // Catálogo estático arriba
  renderizarAparatosSeleccionados(); // Lista de seleccionados abajo
  renderizarCargasEsp();
  actualizarDemandaUI();
}

/* ---------- CATÁLOGO DE APARATOS  ---------- */
function renderizarCatalogoAparatos() {
  const cont = document.getElementById('catalogoAparatos');
  if (!cont) return;
  cont.innerHTML = ''; // Limpiar

  CATALOGO_APARATOS.forEach(cat => {
    const div = document.createElement('div');
    // Forzamos la clase 'catalogo-item'
    div.className = 'catalogo-item'; 
    div.innerHTML = `
      <strong>${cat.categoria}</strong>
      <small>${cat.areaSugerida} • ${cat.wattsDefault}W</small>
    `;
    
    div.addEventListener('click', () => {
      const existente = perfilState.aparatos.find(a => a.categoria === cat.categoria);
      if (existente) {
        existente.cantidad += 1;
      } else {
        const areaId = perfilState.dividirPorAreas ? (perfilState.areas[0]?.id || 'general') : 'general';
        perfilState.aparatos.push({
          id: generarId(),
          areaId: areaId,
          categoria: cat.categoria,
          areaSugerida: cat.areaSugerida,
          watts: cat.wattsDefault,
          cantidad: 1,
          horas: cat.horasDefault
        });
      }
      renderizarAparatosSeleccionados();
      actualizarDemandaUI();
    });
    cont.appendChild(div);
  });
}

/* ---------- LÁMPARAS  ---------- */
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
      <div class="campo-item"><label>Watts</label><input type="number" class="inp-watts" data-id="${l.id}" value="${l.watts}" min="0"></div>
      <div class="campo-item"><label>Cantidad</label><input type="number" class="inp-cantidad" data-id="${l.id}" value="${l.cantidad}" min="0"></div>
      <div class="campo-item"><label>Horas/día</label><input type="number" class="inp-horas" data-id="${l.id}" value="${l.horas}" min="0" step="0.1"></div>
      <button class="btn-eliminar" data-id="${l.id}">×</button>
      <div class="detalle-kwh">${kwh.toFixed(3)} kWh/día</div>
    `;
    cont.appendChild(card);
  });

  // Listeners de lámparas
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

/* ---------- APARATOS SELECCIONADOS ---------- */
function renderizarAparatosSeleccionados() {
  const cont = document.getElementById('listaAparatos');
  if (!cont) return;
  cont.innerHTML = '';

  if (perfilState.aparatos.length === 0) {
    cont.innerHTML = '<p style="color:#6b7280; font-size:0.9rem; padding: 10px;">No has seleccionado ningún aparato aún. Haz clic en el catálogo de arriba para agregarlos.</p>';
    return;
  }

  perfilState.aparatos.forEach(a => {
    const kwh = calcularKwhDia(a.watts, a.cantidad, a.horas);
    
    // Forzamos la clase 'item-card-seleccionado'
    const card = document.createElement('div');
    card.className = 'item-card-seleccionado'; 
    
    card.innerHTML = `
      <div class="info-item">
        <strong>${a.categoria}</strong>
        <small>${a.areaSugerida || 'General'} • ${a.watts}W</small>
      </div>
      
      <div class="controles-item">
        <div class="control-group">
          <label>Cantidad</label>
          <input type="number" class="inp-cantidad" data-id="${a.id}" value="${a.cantidad}" min="0">
        </div>
        <div class="control-group">
          <label>Horas/día</label>
          <input type="number" class="inp-horas" data-id="${a.id}" value="${a.horas}" min="0" step="0.1">
        </div>
        
        <div class="kwh-display">
          ${kwh.toFixed(3)} kWh/día
        </div>
        
        <button class="btn-eliminar" data-id="${a.id}" title="Eliminar">×</button>
      </div>
    `;
    cont.appendChild(card);
  });

  // Listeners para los inputs
  cont.querySelectorAll('.inp-cantidad, .inp-horas').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const id = e.target.dataset.id;
      const a = perfilState.aparatos.find(x => x.id === id);
      if (!a) return;
      
      if (e.target.classList.contains('inp-cantidad')) {
        a.cantidad = parseFloat(e.target.value) || 0;
      } else {
        a.horas = parseFloat(e.target.value) || 0;
      }
      
      const kwh = calcularKwhDia(a.watts, a.cantidad, a.horas);
      const parentCard = e.target.closest('.item-card-seleccionado');
      if (parentCard) {
        parentCard.querySelector('.kwh-display').textContent = `${kwh.toFixed(3)} kWh/día`;
      }
      actualizarDemandaUI();
    });
  });

  cont.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      perfilState.aparatos = perfilState.aparatos.filter(x => x.id !== e.target.dataset.id);
      renderizarAparatosSeleccionados();
      actualizarDemandaUI();
    });
  });
}

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

/* ---------- CARGAS ESPECIALES ---------- */
function renderizarCargasEsp() {
  const ce = perfilState.cargasEsp;

  // AC
  const detAC = document.getElementById('detalleAC');
  if (ce.ac.activo) {
    detAC.classList.remove('oculto');
    detAC.innerHTML = `
      <div class="campo-item">
        <label>Toneladas de refrigeración</label>
        <input type="number" id="acTon" value="${ce.ac.toneladas}" min="0.5" step="0.5">
      </div>
      <div class="campo-item">
        <label>Horas/día</label>
        <input type="number" id="acHoras" value="${ce.ac.horas}" min="0" max="24">
      </div>
    `;
    bindInput('acTon', ce.ac, 'toneladas');
    bindInput('acHoras', ce.ac, 'horas');
  } else { detAC.classList.add('oculto'); }

  // Calentador
  const detCal = document.getElementById('detalleCalentador');
  if (ce.calentador.activo) {
    detCal.classList.remove('oculto');
    detCal.innerHTML = `
      <div class="campo-item"><label>Watts</label><input type="number" id="calWatts" value="${ce.calentador.watts}" min="0"></div>
      <div class="campo-item"><label>Horas/día</label><input type="number" id="calHoras" value="${ce.calentador.horas}" min="0"></div>
    `;
    bindInput('calWatts', ce.calentador, 'watts');
    bindInput('calHoras', ce.calentador, 'horas');
  } else { detCal.classList.add('oculto'); }

  // Vehículo
  const detVE = document.getElementById('detalleVE');
  if (ce.vehiculo.activo) {
    detVE.classList.remove('oculto');
    detVE.innerHTML = `
      <div class="campo-item"><label>kWh por carga</label><input type="number" id="veKwh" value="${ce.vehiculo.kwhCarga}" min="5" step="5"></div>
      <div class="campo-item"><label>Cargas por semana</label><input type="number" id="veSemana" value="${ce.vehiculo.cargasPorSemana}" min="1" max="7"></div>
    `;
    bindInput('veKwh', ce.vehiculo, 'kwhCarga');
    bindInput('veSemana', ce.vehiculo, 'cargasPorSemana');
  } else { detVE.classList.add('oculto'); }

  // Lavadora
  const detLav = document.getElementById('detalleLavadora');
  if (ce.lavadora.activo) {
    detLav.classList.remove('oculto');
    detLav.innerHTML = `
      <div class="campo-item"><label>Watts</label><input type="number" id="lavWatts" value="${ce.lavadora.watts}" min="0"></div>
      <div class="campo-item"><label>Horas/día</label><input type="number" id="lavHoras" value="${ce.lavadora.horas}" min="0" step="0.5"></div>
    `;
    bindInput('lavWatts', ce.lavadora, 'watts');
    bindInput('lavHoras', ce.lavadora, 'horas');
  } else { detLav.classList.add('oculto'); }

  // Secadora
  const detSec = document.getElementById('detalleSecadora');
  if (ce.secadora.activo) {
    detSec.classList.remove('oculto');
    detSec.innerHTML = `
      <div class="campo-item"><label>Watts</label><input type="number" id="secWatts" value="${ce.secadora.watts}" min="0"></div>
      <div class="campo-item"><label>Horas/día</label><input type="number" id="secHoras" value="${ce.secadora.horas}" min="0" step="0.5"></div>
    `;
    bindInput('secWatts', ce.secadora, 'watts');
    bindInput('secHoras', ce.secadora, 'horas');
  } else { detSec.classList.add('oculto'); }
}

function bindInput(id, obj, key) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', (e) => {
      obj[key] = parseFloat(e.target.value) || 0;
      actualizarDemandaUI();
    });
  }
}

/* ============================================================
   INICIALIZACIÓN GENERAL
   ============================================================ */
function inicializarPerfilVivienda() {
  inicializarPreguntaAreas();
  inicializarDefinirAreas();

  document.querySelectorAll('.tab-perfil').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-perfil').forEach(t => t.classList.remove('activo'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('activo'));
      tab.classList.add('activo');
      const target = document.getElementById('tab-' + tab.dataset.tab);
      if (target) target.classList.add('activo');
    });
  });

  document.getElementById('btnAgregarLampara')?.addEventListener('click', () => {
    const areaId = perfilState.dividirPorAreas ? (perfilState.areas[0]?.id || null) : 'general';
    perfilState.lamparas.push({ id: generarId(), areaId: areaId, tipo: 'LED', watts: 9, cantidad: 1, horas: 4 });
    renderizarLamparas();
    actualizarDemandaUI();
  });

  const bindCheck = (chkId, key) => {
    document.getElementById(chkId)?.addEventListener('change', (e) => {
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

  ['tipoVivienda', 'numIntegrantes', 'numRecamaras', 'numBanos', 'numAreasRec', 'areaSala', 'areaCocina', 'areaComedor'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', actualizarDemandaUI);
  });

  document.getElementById('btnAtrasPerfil')?.addEventListener('click', () => {
    document.getElementById('contenidoPerfil').classList.add('oculto');
    document.getElementById('preguntaAreas').classList.remove('oculto');
  });

  document.getElementById('btnContinuarPerfil')?.addEventListener('click', () => {
    const demanda = calcularDemandaTotal();
    window.perfilVivienda = {
      demandaDiaria: demanda,
      areas: perfilState.areas,
      lamparas: perfilState.lamparas,
      aparatos: perfilState.aparatos,
      cargasEsp: perfilState.cargasEsp
    };
    alert(`✅ Perfil guardado.\n\nDemanda diaria total: ${demanda.toFixed(2)} kWh/día`);
    document.querySelector('.modulo-btn[data-modulo="modulo3"]')?.click();
  });
}

window.inicializarPerfilVivienda = inicializarPerfilVivienda;