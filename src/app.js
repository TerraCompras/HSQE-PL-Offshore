import Chart from 'chart.js/auto';
import { supabase } from './lib/supabase.js';


/* ============ CONFIG ============ */
const TYPES = {
  NC:  {label:'No Conformidad',      color:'#7A3B9E'},
  OBS: {label:'Observación',         color:'#2C7FB8'},
  OM:  {label:'Oportunidad de Mejora', color:'#4C8C4A'},
  LA:  {label:'Lección Aprendida',   color:'#2C8C6B'},
  ACC: {label:'Accidente Personal',  color:'#C0392B'},
  INC: {label:'Incidente',           color:'#0A3A66'},
  CUA: {label:'Cuasi Accidente',     color:'#B07D0A'},
  AI:  {label:'Acto Inseguro',       color:'#B07D0A'},
  CI:  {label:'Condición Insegura',  color:'#B07D0A'},
};
const STATUS = {
  'Abierta':     '#C0392B',
  'En Progreso': '#B07D0A',
  'Cerrada':     '#1E7A4A',
};
const SEV_COLORS = {Baja:'#5B6671',Media:'#B07D0A',Alta:'#0A3A66',Crítica:'#C0392B'};
const SEV_BG = {Baja:'#EEF0F1',Media:'#FBF1D6',Alta:'#FCE4D6',Crítica:'#F7D9D3'};
const ACCION_ESTADOS = ['Abierto','En Proceso','Cerrado'];
const ACCION_ESTADO_COLOR = {'Abierto':'#C0392B','En Proceso':'#B07D0A','Cerrado':'#1E7A4A'};
const ACCION_ESTADO_BG = {'Abierto':'#F7D9D3','En Proceso':'#FBF1D6','Cerrado':'#E1EFE4'};
const CLASIF_OCIMF = ['','LTI - Lesión con Tiempo Perdido','MTI - Lesión con Tratamiento Médico','RWC - Trabajo Restringido','FAC - Primeros Auxilios','NM - Casi Accidente (Near Miss)','MTC - Daño Material'];

// Tipos que llevan Clasificación OCIMF/TMSA (solo Accidente e Incidente)
const DEFAULT_LOGOS = {
  cleansea: "/cleansea.png",
  ploffshore: "/PL.png",
};
function guessDefaultLogo(companyName){
  const n = (companyName||'').toLowerCase();
  if(n.includes('clean')) return DEFAULT_LOGOS.cleansea;
  if(n.includes('offshore') || n.includes('parana') || n.includes('paraná')) return DEFAULT_LOGOS.ploffshore;
  return null;
}
function getCompanyLogo(companyId){
  const co = DATA.companies.find(c=>c.id===companyId);
  if(!co) return null;
  if(co.logo) return co.logo;
  return guessDefaultLogo(co.name);
}

const TIPOS_CON_OCIMF = ['ACC'];

// Tipos que llevan bloque "Clasificación y Cumplimiento" (NC / Observación / Oportunidad de Mejora / Lección Aprendida)
const TIPOS_CON_CLASIF_ORIGEN = ['NC','OBS','OM','LA'];
let CLASIF_ORIGEN = ['','ISO','ISM','PNA','Inspección HSQE','Cliente','No Aplica'];

// Oportunidad de Mejora y Lección Aprendida no llevan causa raíz/acción correctiva; llevan datos de comunicación
// Solo Lección Aprendida no lleva causa raíz/acción correctiva; lleva datos de comunicación.
// Oportunidad de Mejora se trata igual que Observación / No Conformidad (con causa raíz y acción correctiva).
const TIPOS_SIN_CAUSA_ACCION = ['LA'];
const MEDIOS_COMUNICACION = ['','Reunión de Seguridad','Correo Electrónico','Cartelera / Boletín HSQE','Charla de Seguridad (Toolbox Talk)','Sistema de Gestión (SGS)','Otro'];

// Tipos que llevan campo "Lecciones Aprendidas" como parte del registro (Accidente / Incidente / Cuasi Accidente)
const TIPOS_CON_LECCIONES = ['NC','OBS','ACC','INC','CUA','AI','CI'];

// La severidad solo aplica a estos tipos; para NC/Observación/Oportunidad de Mejora/Lección Aprendida no tiene sentido.
const TIPOS_CON_SEVERIDAD = ['ACC','INC','CUA','AI','CI'];

const NATURALEZA_CUASI = ['','Personal','Material','Ambas'];

let CATEGORIAS_ACTO_INSEGURO = ['Falta de EPP','Falta de atención','Falta de control','Incumplimiento del SGS','Incumplimiento de órdenes','Otros'];
let CATEGORIAS_CONDICION_INSEGURA = ['Falta de arrancho','Arrancho inadecuado','Equipo desafectado','Equipo defectuoso','Falta de limpieza','Falta de señalización','Otros'];
let TIPIFICACION_INCIDENTE = ['Daño a la carga','Daño al buque','Daño a equipo','Derrame','Otros'];

// Tipificación de causa raíz: disponible en todos los reportes que tienen bloque de Causa Raíz / Acciones
// (NC, Observación, Oportunidad de Mejora, Accidente, Incidente, Cuasi Accidente, Acto Inseguro, Condición Insegura).
let TIPIFICACION_CAUSA_RAIZ = ['','Falta de Procedimiento','Falta de Capacitación / Entrenamiento','Falla de Equipo o Material',
  'Falta de Supervisión','Incumplimiento de Procedimiento','Factor Humano','Diseño o Ingeniería Inadecuados',
  'Mantenimiento Deficiente','Comunicación Deficiente','Otros'];

const TIPO_LESION = ['','Escoriaciones','Heridas Punzantes','Heridas Cortantes','Heridas Contusas/Anfractuosas',
  'Contusiones','Traumatismos Internos','Quemaduras Térmicas','Torceduras','Luxaciones','Fracturas Cerradas',
  'Fractura Expuesta','Intoxicaciones','Cuerpo Extraño en Ojos','Amputaciones','Enucleación Ocular','Asfixia',
  'Efectos de la Electricidad','Efecto de las Radiaciones','Quemaduras Químicas','Pérdida Auditiva','Infecciones',
  'Traumatismo de Miembros','Distensión Muscular','Desgarro','Lesiones Inflamatorias Cutáneas','Esguince','Corte',
  'Estrés','Moretón','Dermatitis','Otro'];
const PARTE_CUERPO = ['','Ojos','Antebrazo','Codo','Oído','Mano y Muñeca','Boca (lengua, dientes, labios)',
  'Dedos de la Mano','Región Craneana','Miembro Superior','Nariz','Cadera','Cara','Rodilla','Cabeza','Pierna',
  'Cuello','Tobillo','Región Cervical','Miembro Inferior','Región Dorsal','Pie','Sistema Nervioso',
  'Región Lumbosacra','Tórax','Testículos','Abdomen','Dedos de los Pies','Hombro','Brazo','Otro'];

let modalAttachments = [];
let modalLecciones = [];
let modalAccionesCorrectivas = [];
let modalAccionesPreventivas = [];
let presetCategoriaEvento = null;

let DATA = { companies: [], records: [] };
let currentTypeFilter = 'ALL';
let currentSiteFilter = 'ALL';
let editingId = null;
let charts = {};

/* ============ PERSISTENCE (Supabase) ============ */
async function loadData(){
  try{
    const [regRes, catRes, cfgRes] = await Promise.all([
      supabase.from('hsqe_registros').select('data').order('fecha', { ascending: false }),
      supabase.from('hsqe_catalogos').select('data').eq('id', 1).maybeSingle(),
      supabase.from('hsqe_config').select('data').eq('id', 1).maybeSingle(),
    ]);
    if(regRes.error) throw regRes.error;
    if(catRes.error) throw catRes.error;
    if(cfgRes.error) throw cfgRes.error;
    DATA.records   = (regRes.data || []).map(r => r.data);
    DATA.catalogos = (catRes.data && catRes.data.data) ? catRes.data.data : {};
    DATA.companies = (cfgRes.data && cfgRes.data.data && Array.isArray(cfgRes.data.data.companies)) ? cfgRes.data.data.companies : [];
    if(DATA.companies.length === 0){ seedDefaults(); await saveConfig(); }
  }catch(e){
    console.error('Error cargando datos HSQE:', e && e.message ? e.message : e);
    showToast('Error al cargar datos — verificá la conexión');
    if(!Array.isArray(DATA.companies) || DATA.companies.length === 0) seedDefaults();
  }
  ensureCatalogos();
  renderAll();
}

async function upsertRegistro(rec){
  try{
    const row = {
      id: rec.id,
      tipo: rec.tipo,
      instalacion: rec.instalacion || null,
      fecha: rec.fecha || null,
      estado: rec.estado || null,
      data: rec,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('hsqe_registros').upsert(row);
    if(error) throw error;
    return true;
  }catch(e){
    console.error('Error guardando registro:', e && e.message ? e.message : e);
    showToast('Error al guardar el registro');
    return false;
  }
}

async function deleteRegistroRow(id){
  try{
    const { error } = await supabase.from('hsqe_registros').delete().eq('id', id);
    if(error) throw error;
    return true;
  }catch(e){
    console.error('Error eliminando registro:', e && e.message ? e.message : e);
    showToast('Error al eliminar el registro');
    return false;
  }
}

async function saveCatalogos(){
  try{
    const { error } = await supabase.from('hsqe_catalogos')
      .upsert({ id: 1, data: DATA.catalogos, updated_at: new Date().toISOString() });
    if(error) throw error;
    return true;
  }catch(e){
    console.error('Error guardando catálogos:', e && e.message ? e.message : e);
    showToast('Error al guardar catálogos');
    return false;
  }
}

async function saveConfig(){
  try{
    const { error } = await supabase.from('hsqe_config')
      .upsert({ id: 1, data: { companies: DATA.companies }, updated_at: new Date().toISOString() });
    if(error) throw error;
    return true;
  }catch(e){
    console.error('Error guardando configuración:', e && e.message ? e.message : e);
    showToast('Error al guardar configuración');
    return false;
  }
}

// saveData genérico: persiste catálogos + configuración (los registros van por fila con upsertRegistro)
async function saveData(){
  await Promise.all([saveCatalogos(), saveConfig()]);
}

async function refreshData(){
  showToast('Actualizando datos...');
  await loadData();
  showToast('Datos actualizados');
}

function ensureCatalogos(){
  if(!DATA.catalogos) DATA.catalogos = {};
  const c = DATA.catalogos;
  if(!Array.isArray(c.personas)) c.personas = [];
  if(!Array.isArray(c.clasifOrigen)) c.clasifOrigen = CLASIF_ORIGEN.slice();
  if(!Array.isArray(c.categoriasActoInseguro)) c.categoriasActoInseguro = CATEGORIAS_ACTO_INSEGURO.slice();
  if(!Array.isArray(c.categoriasCondicionInsegura)) c.categoriasCondicionInsegura = CATEGORIAS_CONDICION_INSEGURA.slice();
  if(!Array.isArray(c.tipificacionIncidente)) c.tipificacionIncidente = TIPIFICACION_INCIDENTE.slice();
  if(!Array.isArray(c.tipificacionCausaRaiz)) c.tipificacionCausaRaiz = TIPIFICACION_CAUSA_RAIZ.slice();
  if(!c.dotacionMensual || typeof c.dotacionMensual !== 'object' || Array.isArray(c.dotacionMensual)) c.dotacionMensual = {};
  ordenarAlfa(c.personas);
  ordenarAlfa(c.clasifOrigen);
  ordenarAlfa(c.categoriasActoInseguro);
  ordenarAlfa(c.categoriasCondicionInsegura);
  ordenarAlfa(c.tipificacionIncidente);
  ordenarAlfa(c.tipificacionCausaRaiz);
  if(DATA.companies[0]) ordenarAlfa(DATA.companies[0].vessels);
  CLASIF_ORIGEN = c.clasifOrigen;
  CATEGORIAS_ACTO_INSEGURO = c.categoriasActoInseguro;
  CATEGORIAS_CONDICION_INSEGURA = c.categoriasCondicionInsegura;
  TIPIFICACION_INCIDENTE = c.tipificacionIncidente;
  TIPIFICACION_CAUSA_RAIZ = c.tipificacionCausaRaiz;
}
function seedDefaults(){
  DATA.companies = [
    {id:'PLO', name:'PL Offshore', vessels:['Atlantic Dama']},
  ];
  DATA.records = [];
}

/* ============ HELPERS ============ */
function uid(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }
function ordenarAlfa(arr){ arr.sort((a,b)=>a.localeCompare(b, 'es', {sensitivity:'base'})); return arr; }
function generateRecordId(tipo, fechaStr){
  const year = fechaStr ? new Date(fechaStr+'T00:00:00').getFullYear() : new Date().getFullYear();
  const count = DATA.records.filter(r => r.tipo === tipo && r.fecha && new Date(r.fecha+'T00:00:00').getFullYear() === year).length;
  const num = String(count + 1).padStart(3,'0');
  return `${tipo}-${num}-${year}`;
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function fmtDate(d){ if(!d) return '—'; const p=d.split('-'); return p.length===3? `${p[2]}/${p[1]}/${p[0]}` : d; }
function isOverdue(r){
  if(['Cerrada'].includes(r.estado)) return false;
  if(TIPOS_SIN_CAUSA_ACCION.includes(r.tipo)){
    if(!r.fecha_vencimiento) return false;
    return r.fecha_vencimiento < todayISO();
  }
  return todasAcciones(r).some(a => a.estado !== 'Cerrado' && a.vencimiento && a.vencimiento < todayISO());
}
function isDueSoon(r){
  if(['Cerrada'].includes(r.estado)) return false;
  const hoy = todayISO();
  const limite = new Date(); limite.setDate(limite.getDate()+30);
  const limiteISO = limite.toISOString().slice(0,10);
  if(TIPOS_SIN_CAUSA_ACCION.includes(r.tipo)){
    if(!r.fecha_vencimiento) return false;
    return r.fecha_vencimiento >= hoy && r.fecha_vencimiento <= limiteISO;
  }
  return todasAcciones(r).some(a => a.estado !== 'Cerrado' && a.vencimiento && a.vencimiento >= hoy && a.vencimiento <= limiteISO);
}
function todasAcciones(r){
  return [...(Array.isArray(r.acciones_correctivas)?r.acciones_correctivas:[]), ...(Array.isArray(r.acciones_preventivas)?r.acciones_preventivas:[])];
}
function accionesResumen(r){
  if(TIPOS_SIN_CAUSA_ACCION.includes(r.tipo)){
    return { responsable: r.responsable || '—', vencimiento: r.fecha_vencimiento || '' };
  }
  const acciones = todasAcciones(r);
  if(acciones.length === 0) return { responsable: '—', vencimiento: '' };
  const pendientes = acciones.filter(a => a.estado !== 'Cerrado');
  const relevantes = pendientes.length ? pendientes : acciones;
  const nombres = [...new Set(relevantes.map(a => a.responsable).filter(Boolean))];
  const fechas = relevantes.map(a => a.vencimiento).filter(Boolean).sort();
  return { responsable: nombres.length ? nombres.join(', ') : '—', vencimiento: fechas[0] || '' };
}
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display='block';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.style.display='none', 2200);
}
function allVessels(){
  let v = [];
  DATA.companies.forEach(c => c.vessels.forEach(x => v.push({company:c.name, vessel:x})));
  return v;
}

/* ============ NAV / SIDEBAR ============ */

/* Fix de layout: evita que el contenido del sidebar (categorias + config + sesion)
   quede cortado cuando la suma de esas secciones supera el alto de la pantalla (100vh).
   Se aplica desde el codigo (no toca style.css): agrega scroll interno propio al sidebar
   y evita que el header/marca y el bloque de sesion se compriman. */
function fixSidebarLayout(){
  if(document.getElementById('sidebarScrollFix')) return;
  const style = document.createElement('style');
  style.id = 'sidebarScrollFix';
  style.textContent = `
    .sidebar{overflow-y:auto !important;overflow-x:hidden !important;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.25) transparent;}
    .sidebar::-webkit-scrollbar{width:6px;}
    .sidebar::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.18);border-radius:4px;}
    .sidebar::-webkit-scrollbar-track{background:transparent;}
    .sidebar .brand{flex-shrink:0;}
    .sidebar .session-block{flex-shrink:0;}
  `;
  document.head.appendChild(style);
}

function renderSiteSelect(){
  const sel = document.getElementById('siteFilter');
  const sitios = (DATA.companies[0] && DATA.companies[0].vessels) || [];
  sel.innerHTML = `<option value="ALL">Todos los sitios</option>` +
    sitios.map(v=>`<option value="${v}">${v}</option>`).join('');
  sel.value = currentSiteFilter;
}
function setSiteFilter(v){ currentSiteFilter = v; renderAll(); }

function renderTypeNav(){
  const wrap = document.getElementById('typeNav');
  const filtered = filteredRecords(true);
  let html = `<div class="nav-label">Categorías</div>`;
  html += navItem('ALL', 'Todos los registros', '#B7C4CE', filtered.length);
  Object.keys(TYPES).forEach(k=>{
    const c = filtered.filter(r=>r.tipo===k).length;
    html += navItem(k, TYPES[k].label, TYPES[k].color, c);
  });
  html += `<div class="nav-item ${currentTypeFilter==='KPI'?'active':''}" onclick="setTypeFilter('KPI')" style="margin-top:6px;">
    <span class="nav-dot" style="background:#0A3A66"></span>KPI HSQE
  </div>`;
  wrap.innerHTML = html;
}
function navItem(key, label, color, count){
  const active = currentTypeFilter===key ? 'active' : '';
  return `<div class="nav-item ${active}" onclick="setTypeFilter('${key}')">
    <span class="nav-dot" style="background:${color}"></span>${label}
    <span class="nav-count">${count}</span>
  </div>`;
}
function setTypeFilter(k){ currentTypeFilter = k; renderAll(); }
function clearFilters(){
  document.getElementById('searchBox').value='';
  document.getElementById('statusFilter').value='';
  document.getElementById('sevFilter').value='';
  document.getElementById('overdueFilter').value='';
  renderTable();
}

/* ============ FILTERING ============ */
function filteredRecords(bySiteOnly){
  let r = DATA.records.filter(x => currentSiteFilter==='ALL' || x.instalacion===currentSiteFilter);
  if(!bySiteOnly && currentTypeFilter!=='ALL') r = r.filter(x=>x.tipo===currentTypeFilter);
  return r;
}
function applyTableFilters(list){
  const q = (document.getElementById('searchBox')?.value||'').toLowerCase();
  const st = document.getElementById('statusFilter')?.value||'';
  const sv = document.getElementById('sevFilter')?.value||'';
  const ov = document.getElementById('overdueFilter')?.value||'';
  return list.filter(r=>{
    if(q && !(`${r.descripcion} ${r.area} ${accionesResumen(r).responsable} ${r.reportado_por}`.toLowerCase().includes(q))) return false;
    if(st && r.estado!==st) return false;
    if(sv && r.severidad!==sv) return false;
    if(ov==='overdue' && !isOverdue(r)) return false;
    return true;
  });
}

/* ============ RENDER: KPI ============ */
function renderKPIs(){
  const list = filteredRecords(false);
  const abiertas = list.filter(r=>!['Cerrada'].includes(r.estado)).length;
  const vencidas = list.filter(isOverdue).length;
  const porVencer = list.filter(isDueSoon).length;

  const cards = [
    {val:list.length, lbl:'Registros totales', alert:false},
    {val:abiertas, lbl:'Abiertas / en curso', alert:abiertas>0},
    {val:vencidas, lbl:'Acciones vencidas', alert:vencidas>0},
    {val:porVencer, lbl:'Acciones por vencer (30 días)', alert:porVencer>0},
  ];
  document.getElementById('kpiRow').innerHTML = cards.map(c=>`
    <div class="kpi-card ${c.alert?'alert':''}">
      <div class="val">${c.val}</div>
      <div class="lbl">${c.lbl}</div>
    </div>`).join('');
}

/* ============ KPI OCIMF — FRECUENCIA DE LESIONES (Marine Injury Guideline) ============
   Base de exposición fija: 12 tripulantes x 24 horas/día (a bordo, criterio OCIMF).
   Tasas expresadas cada 1.000.000 de horas-hombre (estándar OCIMF/IMCA). */
const OCIMF_EXPOSURE_CREW = 12;
const OCIMF_HOURS_PER_DAY = 24;
const OCIMF_MULTIPLIER = 1000000;

function daysBetweenInclusive(desde, hasta){
  if(!desde || !hasta) return 0;
  const d1 = new Date(desde+'T00:00:00');
  const d2 = new Date(hasta+'T00:00:00');
  const diff = Math.round((d2-d1)/(1000*60*60*24)) + 1;
  return diff > 0 ? diff : 0;
}
function crewForMonth(ym){
  const dot = (DATA.catalogos && DATA.catalogos.dotacionMensual) || {};
  return (typeof dot[ym] === 'number') ? dot[ym] : OCIMF_EXPOSURE_CREW;
}
function mesesEnRango(desde, hasta){
  const meses = [];
  if(!desde || !hasta) return meses;
  let cur = new Date(desde.slice(0,7)+'-01T00:00:00');
  const end = new Date(hasta.slice(0,7)+'-01T00:00:00');
  while(cur <= end){
    meses.push(cur.toISOString().slice(0,7));
    cur.setMonth(cur.getMonth()+1);
  }
  return meses;
}
function computeExposureHours(desde, hasta){
  let total = 0;
  let cur = new Date(desde+'T00:00:00');
  const end = new Date(hasta+'T00:00:00');
  while(cur <= end){
    const ym = cur.toISOString().slice(0,7);
    total += crewForMonth(ym) * OCIMF_HOURS_PER_DAY;
    cur.setDate(cur.getDate()+1);
  }
  return total;
}

function renderOcimfKpi(){
  const panel = document.getElementById('ocimfKpiPanel');
  if(!panel) return;
  if(currentTypeFilter !== 'KPI'){ panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  const desdeEl = document.getElementById('ocimfDesde');
  const hastaEl = document.getElementById('ocimfHasta');
  if(!desdeEl.value) desdeEl.value = `${new Date().getFullYear()}-01-01`;
  if(!hastaEl.value) hastaEl.value = new Date().toISOString().slice(0,10);
  const desde = desdeEl.value, hasta = hastaEl.value;

  const list = filteredRecords(false).filter(r =>
    r.tipo === 'ACC' && r.incluir_kpi && r.fecha >= desde && r.fecha <= hasta);

  const contar = prefijo => list.filter(r => (r.clasificacion||'').startsWith(prefijo)).length;
  const lti = contar('LTI');
  const mti = contar('MTI');
  const rwc = contar('RWC');
  const fac = contar('FAC');
  const trc = lti + mti + rwc;

  const dias = daysBetweenInclusive(desde, hasta);
  const exposicionHoras = computeExposureHours(desde, hasta);
  const tasa = n => exposicionHoras > 0 ? +((n * OCIMF_MULTIPLIER) / exposicionHoras).toFixed(2) : 0;

  const ltif = tasa(lti);
  const trcf = tasa(trc);

  const cards = [
    {val: lti, lbl:'LTI — Lesión con tiempo perdido', alert: lti>0},
    {val: trc, lbl:'Casos registrables (LTI + RWC + MTI)', alert: trc>0},
    {val: ltif, lbl:'LTIF (cada 1.000.000 h-h)', alert: ltif>0},
    {val: trcf, lbl:'TRCF (cada 1.000.000 h-h)', alert: trcf>0},
  ];
  document.getElementById('ocimfKpiRow').innerHTML = cards.map(c=>`
    <div class="kpi-card ${c.alert?'alert':''}">
      <div class="val">${c.val}</div>
      <div class="lbl">${c.lbl}</div>
    </div>`).join('');

  const dot = (DATA.catalogos && DATA.catalogos.dotacionMensual) || {};
  const meses = mesesEnRango(desde, hasta);
  const dotacionTxt = meses.map(m => `${fmtMesAnio(m)}: ${crewForMonth(m)}${typeof dot[m]==='number' ? '' : ' (default)'} trip.`).join(' · ');

  document.getElementById('ocimfExposureInfo').innerHTML =
    `Período: ${dias} día(s) · Exposición total: <b>${exposicionHoras.toLocaleString('es-AR')} horas-hombre</b> (24 h/día × dotación mensual cargada en Catálogos) · ` +
    `Accidentes marcados "Incluir en KPI": ${list.length} (de los cuales ${fac} son FAC — Primeros Auxilios, informativos, no computan en LTIF/TRCF)<br>` +
    `Dotación aplicada por mes: ${dotacionTxt || '—'}`;
}

/* ============ KPI — NO CONFORMIDADES EN AUDITORÍAS ISM / ISO ============ */
function renderAuditNcKpi(){
  const panel = document.getElementById('auditNcKpiPanel');
  if(!panel) return;
  if(currentTypeFilter !== 'KPI'){ panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  const desdeEl = document.getElementById('auditNcDesde');
  const hastaEl = document.getElementById('auditNcHasta');
  if(!desdeEl.value) desdeEl.value = `${new Date().getFullYear()}-01-01`;
  if(!hastaEl.value) hastaEl.value = new Date().toISOString().slice(0,10);
  const desde = desdeEl.value, hasta = hastaEl.value;

  const list = filteredRecords(false).filter(r => r.tipo === 'NC' && r.fecha >= desde && r.fecha <= hasta);
  const cuenta = (origenes, auditoria, ambito) => list.filter(r =>
    origenes.includes(r.clasificacion_origen) && r.tipo_auditoria === auditoria && r.ambito_auditoria === ambito
  ).length;

  const cards = [
    {val: cuenta(['ISM','ISO'], 'Interna', 'Oficina'), lbl:'Auditorías Internas ISM/ISO — Oficina'},
    {val: cuenta(['ISM','ISO'], 'Externa', 'Oficina'), lbl:'Auditorías Externas ISM/ISO — Oficina'},
    {val: cuenta(['ISM'], 'Interna', 'Buques'), lbl:'Auditorías Internas ISM — Buques'},
    {val: cuenta(['ISM'], 'Externa', 'Buques'), lbl:'Auditorías Externas ISM — Buques'},
  ];
  document.getElementById('auditNcKpiRow').innerHTML = cards.map(c=>`
    <div class="kpi-card ${c.val>0?'alert':''}">
      <div class="val">${c.val}</div>
      <div class="lbl">${c.lbl}</div>
    </div>`).join('');

  const dias = daysBetweenInclusive(desde, hasta);
  document.getElementById('auditNcInfo').textContent =
    `Período: ${dias} día(s) (${fmtDate(desde)} a ${fmtDate(hasta)}) · NC en el período: ${list.length} · ` +
    `Se cuentan las NC con Clasificación = ISM o ISO y Tipo de auditoría / Ámbito cargados en cada registro. En "Buques" solo se contabiliza ISM.`;
}


/* ============ RENDER: CHARTS ============ */
function nonZeroPairs(labels, list, field){
  const pairs = labels.map(l=>({l, v:list.filter(r=>r[field]===l).length})).filter(p=>p.v>0);
  if(pairs.length===0) pairs.push({l:'Sin datos cargados', v:0});
  return {labels: pairs.map(p=>p.l), data: pairs.map(p=>p.v)};
}

function getChartSpecs(list, tipo){
  const statLabels = Object.keys(STATUS);
  const specEstado = { title:'Por estado', kind:'doughnut', labels: statLabels,
    data: statLabels.map(s=>list.filter(r=>r.estado===s).length), colors: statLabels.map(s=>STATUS[s]) };

  const sitios = (DATA.companies[0] && DATA.companies[0].vessels) || [];
  const specInstalacion = { title:'Por instalación', kind:'bar', labels: sitios,
    data: sitios.map(v=>list.filter(r=>r.instalacion===v).length), colors:['#002247'] };

  const sevLabels = ['Baja','Media','Alta','Crítica'];
  const specSeveridad = { title:'Por severidad', kind:'doughnut', labels: sevLabels,
    data: sevLabels.map(s=>list.filter(r=>r.severidad===s).length), colors: sevLabels.map(s=>SEV_COLORS[s]) };

  // Distribución por tipificación de causa raíz — aplica a todos los tipos con bloque de Causa Raíz / Acciones.
  const causaCats = TIPIFICACION_CAUSA_RAIZ.filter(c=>c);
  const causaPairs = nonZeroPairs(causaCats, list, 'tipificacion_causa');
  const specCausaRaiz = { title:'Por causa raíz', kind:'bar', indexAxis:'y', labels: causaPairs.labels, data: causaPairs.data, colors:['#7A3B9E'] };

  if(tipo === 'ALL'){
    const tipoLabels = Object.keys(TYPES);
    return { scope:'Todos los registros — diversidad de categorías', specs: [
      { title:'Registros por tipo', kind:'bar', indexAxis:'y', labels: tipoLabels.map(k=>TYPES[k].label),
        data: tipoLabels.map(k=>list.filter(r=>r.tipo===k).length), colors: tipoLabels.map(k=>TYPES[k].color) },
      specEstado, specInstalacion, specCausaRaiz,
    ]};
  }
  if(TIPOS_CON_CLASIF_ORIGEN.includes(tipo)){
    const clasifs = CLASIF_ORIGEN.filter(c=>c);
    const specs = [
      { title:'Por clasificación', kind:'doughnut', labels: clasifs,
        data: clasifs.map(c=>list.filter(r=>r.clasificacion_origen===c).length),
        colors:['#7A3B9E','#2C7FB8','#4C8C4A','#B07D0A','#C0392B','#5B6671'] },
      specEstado, specInstalacion,
    ];
    if(!TIPOS_SIN_CAUSA_ACCION.includes(tipo)) specs.push(specCausaRaiz);
    return { scope: TYPES[tipo].label, specs };
  }
  if(tipo === 'ACC'){
    const pc = nonZeroPairs(PARTE_CUERPO.filter(c=>c), list, 'parte_cuerpo');
    const tl = nonZeroPairs(TIPO_LESION.filter(c=>c), list, 'tipo_lesion');
    return { scope: TYPES[tipo].label, specs: [
      specSeveridad,
      { title:'Por parte del cuerpo afectada', kind:'bar', indexAxis:'y', labels: pc.labels, data: pc.data, colors:['#C0392B'] },
      { title:'Por tipo de lesión', kind:'bar', indexAxis:'y', labels: tl.labels, data: tl.data, colors:['#002247'] },
      specCausaRaiz,
    ]};
  }
  if(tipo === 'INC'){
    return { scope: TYPES[tipo].label, specs: [
      specSeveridad,
      { title:'Por tipificación', kind:'bar', indexAxis:'y', labels: TIPIFICACION_INCIDENTE,
        data: TIPIFICACION_INCIDENTE.map(c=>list.filter(r=>r.categoria_evento===c).length), colors:['#0A3A66'] },
      specEstado,
      specCausaRaiz,
    ]};
  }
  if(tipo === 'CUA'){
    const nat = NATURALEZA_CUASI.filter(c=>c);
    return { scope: TYPES[tipo].label, specs: [
      specSeveridad,
      { title:'Por naturaleza', kind:'doughnut', labels: nat,
        data: nat.map(n=>list.filter(r=>r.naturaleza_cuasi===n).length), colors:['#C0392B','#002247','#B07D0A'] },
      specEstado,
      specCausaRaiz,
    ]};
  }
  // Acto Inseguro / Condición Insegura — ya no llevan categorización/tipificación propia,
  // la causa raíz cubre esa necesidad de clasificación.
  if(tipo === 'AI' || tipo === 'CI'){
    return { scope: TYPES[tipo].label, specs: [ specSeveridad, specEstado, specCausaRaiz ] };
  }
  return { scope: TYPES[tipo].label, specs: [ specSeveridad, specEstado, specInstalacion ] };
}

// Divide etiquetas largas en varias lineas para que no se corten en el eje.
function wrapChartLabel(label, maxChars=16){
  const text = String(label);
  if(text.length <= maxChars) return text;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for(const w of words){
    if((line + ' ' + w).trim().length > maxChars){
      if(line) lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if(line) lines.push(line.trim());
  return lines;
}

function renderCharts(){
  const list = filteredRecords(false);
  Object.values(charts).forEach(c=>c && c.destroy());
  charts = {};

  const { scope, specs } = getChartSpecs(list, currentTypeFilter);
  document.getElementById('chartsSectionLabel').textContent = `Gráficos — ${scope}`;

  const canvasIds = ['chartTipo','chartEstado','chartEmpresa','chartCausa'];
  const titleIds = ['chartTitle1','chartTitle2','chartTitle3','chartTitle4'];
  const chartKeys = ['tipo','estado','empresa','causa'];
  const cardCausa = document.getElementById('chartCardCausa');
  if(cardCausa) cardCausa.style.display = specs.length >= 4 ? '' : 'none';

  specs.forEach((spec, i)=>{
    if(i >= canvasIds.length) return;
    document.getElementById(titleIds[i]).textContent = spec.title;

    const canvas = document.getElementById(canvasIds[i]);
    // Envolver el canvas en un contenedor de altura controlada (una sola vez).
    let host = canvas.parentElement;
    if(!host.classList.contains('chart-canvas-host')){
      host = document.createElement('div');
      host.className = 'chart-canvas-host';
      canvas.parentNode.insertBefore(host, canvas);
      host.appendChild(canvas);
    }
    // Las barras horizontales crecen segun la cantidad de categorias; el resto, altura fija.
    const isHBar = spec.kind === 'bar' && spec.indexAxis === 'y';
    host.style.height = isHBar
      ? Math.max(170, spec.labels.length * 30 + 30) + 'px'
      : '210px';

    let opts;
    if(spec.kind === 'doughnut'){
      opts = { responsive:true, maintainAspectRatio:false,
        plugins:{legend:{position:'bottom', labels:{boxWidth:10, font:{size:10}}}} };
    } else {
      const catAxis = spec.indexAxis === 'y' ? 'y' : 'x';
      const valAxis = spec.indexAxis === 'y' ? 'x' : 'y';
      opts = {
        responsive:true, maintainAspectRatio:false,
        indexAxis: spec.indexAxis || 'x',
        plugins:{legend:{display:false}},
        scales:{
          [valAxis]:{ beginAtZero:true, ticks:{precision:0} },
          [catAxis]:{ ticks:{
            autoSkip:false,
            font:{size:10},
            callback:function(value){ return wrapChartLabel(this.getLabelForValue(value)); }
          } },
        },
      };
    }

    charts[chartKeys[i]] = new Chart(canvas, {
      type: spec.kind,
      data: { labels: spec.labels, datasets:[{ data: spec.data, backgroundColor: spec.colors.length>1 ? spec.colors : spec.labels.map((_,j)=>spec.colors[j % spec.colors.length]), borderRadius: spec.kind==='bar'?2:0 }] },
      options: opts,
    });
  });
}

/* ============ RENDER: TABLE ============ */
function renderTable(){
  let list = filteredRecords(false);
  list = applyTableFilters(list);
  list.sort((a,b)=> (b.fecha||'').localeCompare(a.fecha||''));

  const title = currentTypeFilter==='ALL' ? 'Todos los registros' : TYPES[currentTypeFilter].label;
  document.getElementById('viewTitle').textContent = currentTypeFilter==='ALL' ? 'Panel General' : title;
  const siteName = currentSiteFilter==='ALL' ? 'Todos los sitios' : currentSiteFilter;
  document.getElementById('viewMeta').textContent = `${siteName} · ${list.length} registro(s)`;

  const mostrarSeveridad = currentTypeFilter === 'ALL' || TIPOS_CON_SEVERIDAD.includes(currentTypeFilter);
  const sevFilterEl = document.getElementById('sevFilter');
  if(sevFilterEl){
    sevFilterEl.style.display = mostrarSeveridad ? '' : 'none';
    if(!mostrarSeveridad) sevFilterEl.value = '';
  }

  if(list.length===0){
    document.getElementById('tableWrap').innerHTML = `
      <div class="empty-state">
        <div class="display">Sin registros</div>
        <div>No hay eventos que coincidan con los filtros actuales.</div>
      </div>`;
    return;
  }

  const rows = list.map(r=>{
    const co = DATA.companies.find(c=>c.id===r.empresa_id);
    const nAdj = (r.adjuntos||[]).length;
    const resumen = accionesResumen(r);
    const sevCell = mostrarSeveridad ? `<td>${r.severidad ? `<span class="sev-tag" style="color:${SEV_COLORS[r.severidad]};background:${SEV_BG[r.severidad]}">${r.severidad}</span>` : '<span style="color:var(--graphite-light)">—</span>'}</td>` : '';
    return `<tr onclick="openRecordForm('${r.id}')">
      <td><span class="id-tag">${r.id}</span></td>
      <td><span class="type-tag" style="background:${TYPES[r.tipo].color}20;color:${TYPES[r.tipo].color}">${TYPES[r.tipo].label}</span></td>
      <td>${co?co.name:'—'}<br><span style="font-size:11px;color:var(--graphite-light)">${r.instalacion||''}</span></td>
      <td class="mono" style="font-size:12px;white-space:nowrap;">${fmtDate(r.fecha)}</td>
      <td class="desc-cell">${(r.descripcion||'').slice(0,80)}${(r.descripcion||'').length>80?'…':''}</td>
      ${sevCell}
      <td><div class="status-cell" style="white-space:nowrap;"><span class="status-dot" style="background:${STATUS[r.estado]}"></span>${r.estado}</div></td>
      <td class="mono ${isOverdue(r)?'overdue':''}" style="font-size:12px;white-space:nowrap;">${isOverdue(r)?'⚠ ':''}${resumen.vencimiento?fmtDate(resumen.vencimiento):'—'}</td>
      <td>${resumen.responsable}</td>
      <td style="text-align:center">${nAdj>0 ? '📎 '+nAdj : '—'}</td>
      <td style="text-align:center"><button class="btn secondary" style="padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();exportRecordToWord('${r.id}')">📄</button></td>
    </tr>`;
  }).join('');

  document.getElementById('tableWrap').innerHTML = `
    <table>
      <thead><tr>
        <th>ID</th><th>Tipo</th><th>Empresa / Instalación</th><th>Fecha</th>
        <th>Descripción</th>${mostrarSeveridad ? '<th>Severidad</th>' : ''}<th>Estado</th><th>Vencimiento</th><th>Responsable</th><th>Adj.</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderBrandLogo(){
  const el = document.getElementById('brandLogo');
  if(!el) return;
  const co = DATA.companies[0];
  const logo = co ? getCompanyLogo(co.id) : null;
  el.innerHTML = logo ? `<div class="brand-logo-box"><img src="${logo}"></div>` : '';
}
// Alterna entre el panel normal (KPIs, graficos, tabla) y la vista dedicada "KPI HSQE".
function setKpiViewMode(kpiMode){
  const chartsHeader = document.getElementById('chartsSectionLabel')
    ? document.getElementById('chartsSectionLabel').parentElement : null;
  const toggles = [
    document.getElementById('kpiRow'),
    document.querySelector('.chart-row'),
    document.querySelector('.filters'),
    document.getElementById('tableWrap'),
    document.querySelector('.topbar button.btn'),
  ];
  toggles.forEach(el=>{ if(el) el.style.display = kpiMode ? 'none' : ''; });
  if(chartsHeader) chartsHeader.style.display = kpiMode ? 'none' : 'flex';
}

function renderAll(){
  renderBrandLogo();
  renderSiteSelect();
  renderTypeNav();

  const kpiMode = currentTypeFilter === 'KPI';
  setKpiViewMode(kpiMode);

  if(kpiMode){
    document.getElementById('viewTitle').textContent = 'KPI HSQE';
    document.getElementById('viewMeta').textContent = 'Indicadores OCIMF y No Conformidades en auditorias ISM/ISO';
    renderOcimfKpi();
    renderAuditNcKpi();
  } else {
    renderKPIs();
    renderOcimfKpi();
    renderAuditNcKpi();
    renderCharts();
    renderTable();
  }

  const btn = document.getElementById('printReportBtn');
  if(btn){
    btn.textContent = currentSiteFilter==='ALL' ? '🖨 Imprimir PDF — Todos los sitios' : `🖨 Imprimir PDF — ${currentSiteFilter}`;
  }
}

/* ============ FORM / MODAL ============ */
function openRecordForm(id){
  editingId = id || null;
  const r = id ? DATA.records.find(x=>x.id===id) : null;
  const co = r ? r.empresa_id : (DATA.companies[0]?.id || '');
  const tipo = r ? r.tipo : (currentTypeFilter!=='ALL'?currentTypeFilter:'OBS');

  const overlay = document.createElement('div');
  overlay.className='modal-overlay';
  overlay.id='modalOverlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h2>${r? 'Editar registro '+r.id : 'Nuevo registro'}</h2>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="section-title">Clasificación</div>
        <div class="field-row">
          <div class="field"><label>Tipo de evento</label>
            <select id="f_tipo">${Object.keys(TYPES).map(k=>`<option value="${k}" ${k===tipo?'selected':''}>${TYPES[k].label}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Empresa</label>
            <select id="f_empresa" onchange="updateVesselOptions()">${DATA.companies.map(c=>`<option value="${c.id}" ${c.id===co?'selected':''}>${c.name}</option>`).join('')}</select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Buque / Instalación</label>
            <select id="f_instalacion"></select>
          </div>
          <div class="field"><label>Fecha del evento</label>
            <input type="date" id="f_fecha" value="${r?r.fecha:todayISO()}">
          </div>
        </div>

        <div class="section-title">Descripción</div>
        <div class="field"><label>Área / Departamento</label>
          <input type="text" id="f_area" value="${r?r.area||'':''}" placeholder="Ej: Cubierta, Sala de Máquinas, Puente">
        </div>
        <div class="field"><label>Descripción del evento</label>
          <textarea id="f_descripcion" placeholder="Detalle qué ocurrió, cómo y dónde">${r?r.descripcion||'':''}</textarea>
        </div>
        <div class="field-row">
          <div class="field"><label>Reportado por</label>
            <input type="text" id="f_reportado" list="personasDatalist" value="${r?r.reportado_por||'':''}">
          </div>
        </div>

        <div id="block_ocimf">
          <div class="field-row">
            <div class="field"><label>Clasificación OCIMF/TMSA</label>
              <select id="f_clasif">${CLASIF_OCIMF.map(c=>`<option value="${c}" ${r&&r.clasificacion===c?'selected':''}>${c||'No aplica'}</option>`).join('')}</select>
            </div>
            <div class="field" style="display:flex;align-items:flex-end;padding-bottom:9px;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;color:var(--navy);">
                <input type="checkbox" id="f_incluir_kpi" ${r&&r.incluir_kpi?'checked':''} style="width:16px;height:16px;cursor:pointer;">
                Incluir en KPI OCIMF
              </label>
            </div>
          </div>
        </div>

        <div id="block_cuasi">
          <div class="section-title">Detalle del Cuasi Accidente</div>
          <div class="field-row">
            <div class="field"><label>Naturaleza del cuasi accidente</label>
              <select id="f_naturaleza_cuasi">${NATURALEZA_CUASI.map(c=>`<option value="${c}" ${r&&r.naturaleza_cuasi===c?'selected':''}>${c||'Seleccionar...'}</option>`).join('')}</select>
            </div>
          </div>
          <div class="field"><label>Daño material potencial (si aplica)</label>
            <textarea id="f_dano_material" placeholder="Qué equipo, estructura o material podría haber resultado dañado">${r?r.dano_material_potencial||'':''}</textarea>
          </div>
        </div>

        <div id="block_clasif_origen">
          <div class="section-title">Clasificación</div>
          <div class="field-row">
            <div class="field"><label>Clasificación</label>
              <select id="f_clasif_origen">${CLASIF_ORIGEN.map(c=>`<option value="${c}" ${r&&r.clasificacion_origen===c?'selected':''}>${c||'Seleccionar...'}</option>`).join('')}</select>
            </div>
          </div>
        </div>

        <div id="block_auditoria_nc">
          <div class="section-title">Origen de Auditoría (para KPI ISM / ISO)</div>
          <div class="field-row">
            <div class="field"><label>Tipo de auditoría</label>
              <select id="f_tipo_auditoria">
                ${['','Interna','Externa','No proviene de auditoría'].map(v=>`<option value="${v}" ${r&&r.tipo_auditoria===v?'selected':''}>${v||'Seleccionar...'}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Ámbito</label>
              <select id="f_ambito_auditoria">
                ${['','Oficina','Buques'].map(v=>`<option value="${v}" ${r&&r.ambito_auditoria===v?'selected':''}>${v||'Seleccionar...'}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="font-size:11px;color:var(--graphite-light);margin-top:-6px;">
            Solo se contabiliza en el KPI cuando la Clasificación de arriba es ISM o ISO. En Buques, el KPI solo toma ISM (los relevamientos ISO habitualmente se auditan en oficina).
          </div>
        </div>

        <div id="block_categoria_aici">
          <div class="section-title" id="titulo_categoria_aici">Categorización</div>
          <div class="field-row">
            <div class="field"><label id="label_categoria_aici">Categoría</label>
              <select id="f_categoria_aici" onchange="toggleCategoriaOtro()"></select>
            </div>
            <div class="field" id="field_categoria_otro" style="display:none;">
              <label>Especificar</label>
              <input type="text" id="f_categoria_otro" value="${r?r.categoria_otro_detalle||'':''}" placeholder="Detallar">
            </div>
          </div>
        </div>

        <div id="block_lesion">
          <div class="section-title">Datos de la Lesión</div>
          <div class="field-row">
            <div class="field"><label>Parte del cuerpo afectada</label>
              <select id="f_parte_cuerpo">${PARTE_CUERPO.map(c=>`<option value="${c}" ${r&&r.parte_cuerpo===c?'selected':''}>${c||'Seleccionar...'}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Tipo de lesión</label>
              <select id="f_tipo_lesion">${TIPO_LESION.map(c=>`<option value="${c}" ${r&&r.tipo_lesion===c?'selected':''}>${c||'Seleccionar...'}</option>`).join('')}</select>
            </div>
          </div>
        </div>

        <div id="block_causa_accion">
          <div class="section-title" style="margin-top:18px;padding-top:10px;border-top:1px dashed var(--line);">Causa Raíz</div>
          <div class="field-row">
            <div class="field"><label>Tipificación de la causa raíz</label>
              <select id="f_tipificacion_causa" onchange="toggleTipificacionCausaOtro()">${TIPIFICACION_CAUSA_RAIZ.map(c=>`<option value="${c}" ${r&&r.tipificacion_causa===c?'selected':''}>${c||'Seleccionar...'}</option>`).join('')}</select>
            </div>
            <div class="field" id="field_tipificacion_causa_otro" style="display:none;">
              <label>Especificar</label>
              <input type="text" id="f_tipificacion_causa_otro" value="${r?r.tipificacion_causa_otro||'':''}" placeholder="Detallar">
            </div>
          </div>
          <div class="field"><label>Descripción de causas</label>
            <textarea id="f_causa" placeholder="Detalle adicional del análisis de causa raíz">${r?r.causa_raiz||'':''}</textarea>
          </div>

          <div class="section-title with-btn">
            <span>Acciones Correctivas</span>
            <button type="button" class="btn secondary" style="padding:5px 10px;font-size:11px;" onclick="addAccion('correctiva')">+ Agregar acción correctiva</button>
          </div>
          <div id="accionesCorrectivasList"></div>

          <div class="section-title with-btn">
            <span>Acciones Preventivas</span>
            <button type="button" class="btn secondary" style="padding:5px 10px;font-size:11px;" onclick="addAccion('preventiva')">+ Agregar acción preventiva</button>
          </div>
          <div id="accionesPreventivasList"></div>
        </div>

        <div id="block_lecciones">
          <div class="section-title" style="margin-top:18px;padding-top:10px;border-top:1px dashed var(--line);">Lecciones Aprendidas</div>
          <div class="field-row">
            <div class="field" style="flex:1">
              <label>Nueva lección aprendida</label>
              <div style="display:flex;gap:6px;">
                <input type="text" id="f_leccion_nueva" placeholder="Qué se aprendió y cómo se difundirá para evitar la repetición">
                <button class="btn secondary" style="white-space:nowrap;" onclick="addLeccion()">+ Agregar</button>
              </div>
            </div>
          </div>
          <div id="leccionesList" class="badge-strip" style="margin-top:6px;"></div>
        </div>

        <div id="block_comunicacion">
          <div class="section-title" style="margin-top:18px;padding-top:10px;border-top:1px dashed var(--line);">Comunicación</div>
          <div class="field"><label>A quién comunicar</label>
            <input type="text" id="f_comunicar_a" value="${r?r.comunicar_a||'':''}" placeholder="Ej: Tripulación Atlantic Dama, Jefes de Departamento">
          </div>
          <div class="field-row">
            <div class="field"><label>A través de qué medio</label>
              <select id="f_medio_comunicacion">${MEDIOS_COMUNICACION.map(m=>`<option value="${m}" ${r&&r.medio_comunicacion===m?'selected':''}>${m||'Seleccionar...'}</option>`).join('')}</select>
            </div>
            <div class="field"><label>En qué plazo</label>
              <input type="text" id="f_plazo_comunicacion" value="${r?r.plazo_comunicacion||'':''}" placeholder="Ej: Antes de zarpar, 7 días, Próxima reunión de seguridad">
            </div>
          </div>
        </div>
        <div id="block_responsable_simple" class="field-row">
          <div class="field"><label>Responsable</label>
            <input type="text" id="f_responsable" list="personasDatalist" value="${r?r.responsable||'':''}">
          </div>
          <div class="field"><label>Fecha de vencimiento</label>
            <input type="date" id="f_vencimiento" value="${r?r.fecha_vencimiento||'':''}">
          </div>
        </div>

        <div class="section-title">Gestión</div>
        <div class="field-row">
          <div class="field" id="block_severidad"><label>Severidad</label>
            <select id="f_severidad">${['Baja','Media','Alta','Crítica'].map(s=>`<option ${r&&r.severidad===s?'selected':''}>${s}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Estado</label>
            <select id="f_estado" onchange="validateEstadoCierre(this)">${Object.keys(STATUS).map(s=>`<option ${r&&r.estado===s?'selected':''}>${s}</option>`).join('')}</select>
          </div>
        </div>
        <div class="field"><label>Fecha de cierre (si corresponde)</label>
          <input type="date" id="f_cierre" value="${r?r.fecha_cierre||'':''}">
        </div>
        <div class="field"><label>Referencia normativa (ISM / ISO / SRT / MARPOL, etc.)</label>
          <input type="text" id="f_referencia" value="${r?r.referencia_normativa||'':''}" placeholder="Ej: ISM Cód. 9, ISO 45001 Cl. 10.2">
        </div>

        <div class="section-title">Adjuntos</div>
        <div class="field-row">
          <div class="field" style="flex:1">
            <label>Adjuntar archivo</label>
            <input type="file" id="f_adjunto_file" onchange="addAttachmentFile(this)">
          </div>
          <div class="field" style="flex:1">
            <label>O referenciar documento físico/externo</label>
            <div style="display:flex;gap:6px;">
              <input type="text" id="f_adjunto_manual" placeholder="Ej: Declaración de testigos (papel)">
              <button class="btn secondary" style="white-space:nowrap;" onclick="addAttachmentManual()">+ Agregar</button>
            </div>
          </div>
        </div>
        <div id="attachmentsList" class="badge-strip" style="margin-top:6px;"></div>
        <div style="font-size:11px;color:var(--graphite-light);margin-top:6px;">
          Nota: este prototipo registra el nombre y tamaño del archivo como referencia; no almacena el contenido del archivo.
        </div>
      </div>
      <div class="modal-foot">
        <div style="display:flex;gap:8px;">
          ${r? `<button class="btn danger" onclick="deleteRecord('${r.id}')">Eliminar</button>` : ''}
          ${r? `<button class="btn secondary" onclick="exportRecordToWord('${r.id}')">📄 Descargar Word</button>` : ''}
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn secondary" onclick="closeModal()">Cancelar</button>
          <button class="btn" onclick="saveRecord()">${r?'Guardar cambios':'Crear registro'}</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  updateVesselOptions(r ? r.instalacion : (currentSiteFilter!=='ALL' ? currentSiteFilter : null));
  renderPersonasDatalist();
  modalAttachments = (r && Array.isArray(r.adjuntos)) ? JSON.parse(JSON.stringify(r.adjuntos)) : [];
  renderAttachmentsList();
  modalLecciones = leccionesFromRecord(r);
  renderLeccionesList();
  modalAccionesCorrectivas = accionesFromRecord(r, 'acciones_correctivas');
  modalAccionesPreventivas = accionesFromRecord(r, 'acciones_preventivas');
  renderAccionesBlock('correctiva');
  renderAccionesBlock('preventiva');
  document.getElementById('f_tipo').addEventListener('change', toggleConditionalFields);
  document.getElementById('f_naturaleza_cuasi').addEventListener('change', toggleLesionBlock);
  presetCategoriaEvento = r ? (r.categoria_evento || null) : null;
  toggleConditionalFields();
  toggleTipificacionCausaOtro();
}
function renderPersonasDatalist(){
  const dl = document.getElementById('personasDatalist');
  if(!dl) return;
  const personas = (DATA.catalogos && DATA.catalogos.personas) || [];
  dl.innerHTML = personas.map(p=>`<option value="${p}">`).join('');
}
function registrarPersonaSiEsNueva(nombre){
  if(!nombre) return;
  const n = nombre.trim();
  if(!n) return;
  if(!DATA.catalogos) ensureCatalogos();
  const existe = DATA.catalogos.personas.some(p=>p.toLowerCase()===n.toLowerCase());
  if(!existe){ DATA.catalogos.personas.push(n); ordenarAlfa(DATA.catalogos.personas); }
}
function leccionesFromRecord(r){
  if(!r || !r.lecciones_aprendidas) return [];
  if(Array.isArray(r.lecciones_aprendidas)) return JSON.parse(JSON.stringify(r.lecciones_aprendidas));
  // compatibilidad con registros previos donde era un único texto
  return [{texto: r.lecciones_aprendidas, la_id: r.leccion_generada_id || null}];
}
function addLeccion(){
  const inp = document.getElementById('f_leccion_nueva');
  const v = inp.value.trim();
  if(!v) return;
  modalLecciones.push({texto: v, la_id: null});
  inp.value = '';
  renderLeccionesList();
}
function removeLeccion(i){
  modalLecciones.splice(i,1);
  renderLeccionesList();
}
function renderLeccionesList(){
  const wrap = document.getElementById('leccionesList');
  if(!wrap) return;
  if(modalLecciones.length===0){ wrap.innerHTML = '<span style="font-size:12px;color:var(--graphite-light)">Sin lecciones aprendidas cargadas.</span>'; return; }
  wrap.innerHTML = modalLecciones.map((l,i)=>`
    <span class="sev-tag" style="background:var(--paper-dark);color:var(--navy);max-width:100%;white-space:normal;">
      💡 ${l.texto} ${l.la_id?`<span class="mono" style="color:var(--graphite-light);font-size:10px;">(${l.la_id})</span>`:''}
      <span style="cursor:pointer;color:var(--red);margin-left:4px;" onclick="removeLeccion(${i})">✕</span>
    </span>`).join('');
}

/* ============ ACCIONES CORRECTIVAS / PREVENTIVAS ============ */
function nuevaAccion(){
  return { id: uid(), descripcion:'', responsable:'', vencimiento:'', estado:'Abierto' };
}
function accionesFromRecord(r, campo){
  if(r && Array.isArray(r[campo])) return JSON.parse(JSON.stringify(r[campo]));
  // Compatibilidad con registros anteriores a la versión de acciones múltiples,
  // donde había una única "Acción correctiva / preventiva" de texto libre.
  if(r && campo === 'acciones_correctivas' && (r.accion_correctiva || '').trim()){
    const estadoLegacy = r.estado === 'Cerrada' ? 'Cerrado' : (r.estado === 'En Progreso' ? 'En Proceso' : 'Abierto');
    return [{ id: uid(), descripcion: r.accion_correctiva, responsable: r.responsable || '', vencimiento: r.fecha_vencimiento || '', estado: estadoLegacy }];
  }
  return [];
}
function accionesArray(tipoAccion){
  return tipoAccion === 'correctiva' ? modalAccionesCorrectivas : modalAccionesPreventivas;
}
function addAccion(tipoAccion){
  accionesArray(tipoAccion).push(nuevaAccion());
  renderAccionesBlock(tipoAccion);
}
function removeAccion(tipoAccion, i){
  accionesArray(tipoAccion).splice(i,1);
  renderAccionesBlock(tipoAccion);
}
function updateAccionField(tipoAccion, i, field, value){
  const arr = accionesArray(tipoAccion);
  if(!arr[i]) return;
  arr[i][field] = value;
  if(field === 'estado') renderAccionesBlock(tipoAccion);
}
function validateEstadoCierre(sel){
  const tipo = document.getElementById('f_tipo').value;
  if(TIPOS_SIN_CAUSA_ACCION.includes(tipo)) return;
  if(sel.value !== 'Cerrada') return;
  const pendientes = [...modalAccionesCorrectivas, ...modalAccionesPreventivas].filter(a => a.estado !== 'Cerrado');
  if(pendientes.length > 0){
    showToast('No se puede cerrar: hay acciones correctivas/preventivas sin cerrar');
    sel.value = 'En Progreso';
  }
}
function renderAccionesBlock(tipoAccion){
  const arr = accionesArray(tipoAccion);
  const wrap = document.getElementById(tipoAccion === 'correctiva' ? 'accionesCorrectivasList' : 'accionesPreventivasList');
  if(!wrap) return;
  if(arr.length === 0){
    wrap.innerHTML = `<div class="accion-empty">Sin acciones ${tipoAccion==='correctiva'?'correctivas':'preventivas'} cargadas.</div>`;
    return;
  }
  wrap.innerHTML = arr.map((a,i)=>`
    <div class="accion-row">
      <div class="accion-row-top">
        <span class="accion-num">#${i+1}</span>
        <span class="sev-tag" style="background:${ACCION_ESTADO_BG[a.estado]||'#EEF0F1'};color:${ACCION_ESTADO_COLOR[a.estado]||'#5B6671'}">${a.estado}</span>
        <span style="cursor:pointer;color:var(--red);margin-left:auto;font-size:12px;" onclick="removeAccion('${tipoAccion}',${i})">✕ Quitar</span>
      </div>
      <div class="field"><label>Descripción de la acción</label>
        <textarea oninput="updateAccionField('${tipoAccion}',${i},'descripcion',this.value)" placeholder="Qué se va a hacer / qué se hizo">${a.descripcion||''}</textarea>
      </div>
      <div class="field-row-3">
        <div class="field"><label>Responsable</label>
          <input type="text" list="personasDatalist" value="${a.responsable||''}" oninput="updateAccionField('${tipoAccion}',${i},'responsable',this.value)">
        </div>
        <div class="field"><label>Fecha de vencimiento</label>
          <input type="date" value="${a.vencimiento||''}" oninput="updateAccionField('${tipoAccion}',${i},'vencimiento',this.value)">
        </div>
        <div class="field"><label>Estado</label>
          <select onchange="updateAccionField('${tipoAccion}',${i},'estado',this.value)">
            ${ACCION_ESTADOS.map(s=>`<option ${a.estado===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>`).join('');
}
function toggleConditionalFields(){
  const tipo = document.getElementById('f_tipo').value;
  document.getElementById('block_ocimf').style.display = TIPOS_CON_OCIMF.includes(tipo) ? 'block' : 'none';
  document.getElementById('block_clasif_origen').style.display = TIPOS_CON_CLASIF_ORIGEN.includes(tipo) ? 'block' : 'none';
  document.getElementById('block_auditoria_nc').style.display = (tipo === 'NC') ? 'block' : 'none';
  document.getElementById('block_causa_accion').style.display = TIPOS_SIN_CAUSA_ACCION.includes(tipo) ? 'none' : 'block';
  document.getElementById('block_responsable_simple').style.display = TIPOS_SIN_CAUSA_ACCION.includes(tipo) ? 'grid' : 'none';
  document.getElementById('block_comunicacion').style.display = TIPOS_SIN_CAUSA_ACCION.includes(tipo) ? 'block' : 'none';
  document.getElementById('block_cuasi').style.display = (tipo === 'CUA') ? 'block' : 'none';
  document.getElementById('block_categoria_aici').style.display = (tipo === 'INC') ? 'block' : 'none';
  updateCategoriaOptions();
  document.getElementById('block_severidad').style.display = TIPOS_CON_SEVERIDAD.includes(tipo) ? 'block' : 'none';
  document.getElementById('block_lecciones').style.display = TIPOS_CON_LECCIONES.includes(tipo) ? 'block' : 'none';
  toggleLesionBlock();
}
function updateCategoriaOptions(){
  const tipo = document.getElementById('f_tipo').value;
  const sel = document.getElementById('f_categoria_aici');
  const esIncidente = tipo === 'INC';
  const lista = tipo === 'AI' ? CATEGORIAS_ACTO_INSEGURO : (tipo === 'CI' ? CATEGORIAS_CONDICION_INSEGURA : (esIncidente ? TIPIFICACION_INCIDENTE : []));
  document.getElementById('label_categoria_aici').textContent = esIncidente ? 'Tipificación' : 'Categoría';
  document.getElementById('titulo_categoria_aici').textContent = esIncidente ? 'Tipificación del Incidente' : 'Categorización';
  sel.innerHTML = '<option value="">Seleccionar...</option>' + lista.map(c=>`<option value="${c}" ${c===presetCategoriaEvento?'selected':''}>${c}</option>`).join('');
  presetCategoriaEvento = null;
  toggleCategoriaOtro();
}
function toggleCategoriaOtro(){
  const sel = document.getElementById('f_categoria_aici');
  const show = sel && sel.value === 'Otros';
  document.getElementById('field_categoria_otro').style.display = show ? 'block' : 'none';
}
function toggleTipificacionCausaOtro(){
  const sel = document.getElementById('f_tipificacion_causa');
  const show = sel && sel.value === 'Otros';
  document.getElementById('field_tipificacion_causa_otro').style.display = show ? 'block' : 'none';
}
function toggleLesionBlock(){
  const tipo = document.getElementById('f_tipo').value;
  const naturaleza = document.getElementById('f_naturaleza_cuasi') ? document.getElementById('f_naturaleza_cuasi').value : '';
  const mostrar = (tipo === 'ACC') || (tipo === 'CUA' && (naturaleza === 'Personal' || naturaleza === 'Ambas'));
  document.getElementById('block_lesion').style.display = mostrar ? 'block' : 'none';
}
function humanFileSize(bytes){
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(0) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}
async function addAttachmentFile(input){
  if(!input.files || !input.files[0]) return;
  const f = input.files[0];
  if(f.size > 15 * 1024 * 1024){ showToast('El archivo supera 15 MB'); input.value = ''; return; }
  showToast('Subiendo adjunto...');
  const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${new Date().getFullYear()}/${uid()}_${safe}`;
  try{
    const { error } = await supabase.storage.from('hsqe-adjuntos-ploffshore').upload(path, f);
    if(error) throw error;
    modalAttachments.push({nombre: f.name, tamano: humanFileSize(f.size), fecha: todayISO(), path});
    showToast('Adjunto subido');
  }catch(e){
    console.error('Error subiendo adjunto:', e && e.message ? e.message : e);
    showToast('Error al subir el adjunto');
  }
  input.value = '';
  renderAttachmentsList();
}
async function openAttachment(i){
  const a = modalAttachments[i];
  if(!a) return;
  if(!a.path){ showToast('Este adjunto es una referencia manual (sin archivo)'); return; }
  try{
    const { data, error } = await supabase.storage.from('hsqe-adjuntos-ploffshore').createSignedUrl(a.path, 300);
    if(error) throw error;
    window.open(data.signedUrl, '_blank');
  }catch(e){
    console.error('Error abriendo adjunto:', e && e.message ? e.message : e);
    showToast('No se pudo abrir el adjunto');
  }
}
function addAttachmentManual(){
  const inp = document.getElementById('f_adjunto_manual');
  const v = inp.value.trim();
  if(!v) return;
  modalAttachments.push({nombre: v, tamano: '—', fecha: todayISO()});
  inp.value = '';
  renderAttachmentsList();
}
function removeAttachment(i){
  modalAttachments.splice(i,1);
  renderAttachmentsList();
}
function renderAttachmentsList(){
  const wrap = document.getElementById('attachmentsList');
  if(!wrap) return;
  if(modalAttachments.length===0){ wrap.innerHTML = '<span style="font-size:12px;color:var(--graphite-light)">Sin adjuntos cargados.</span>'; return; }
  wrap.innerHTML = modalAttachments.map((a,i)=>`
    <span class="sev-tag" style="background:var(--paper-dark);color:var(--navy);">
      <span style="cursor:${a.path?'pointer':'default'};${a.path?'text-decoration:underline;':''}" onclick="openAttachment(${i})">📎 ${a.nombre}</span> <span style="color:var(--graphite-light)">(${a.tamano})</span>
      <span style="cursor:pointer;color:var(--red);margin-left:4px;" onclick="removeAttachment(${i})">✕</span>
    </span>`).join('');
}
function updateVesselOptions(preset){
  const coId = document.getElementById('f_empresa').value;
  const co = DATA.companies.find(c=>c.id===coId);
  const sel = document.getElementById('f_instalacion');
  sel.innerHTML = (co?co.vessels:[]).map(v=>`<option value="${v}" ${v===preset?'selected':''}>${v}</option>`).join('');
}
function closeModal(){
  const m = document.getElementById('modalOverlay');
  if(m) m.remove();
}
async function saveRecord(){
  const get = id => document.getElementById(id).value;
  const getIf = id => document.getElementById(id) ? document.getElementById(id).value : '';
  const tipoSel = get('f_tipo');
  const fechaSel = get('f_fecha');
  const tipoSinAcciones = TIPOS_SIN_CAUSA_ACCION.includes(tipoSel);
  const estadoSel = get('f_estado');

  if(!tipoSinAcciones && estadoSel === 'Cerrada'){
    const pendientes = [...modalAccionesCorrectivas, ...modalAccionesPreventivas].filter(a => a.estado !== 'Cerrado');
    if(pendientes.length > 0){
      showToast('No se puede cerrar el reporte: hay acciones correctivas/preventivas sin cerrar');
      return;
    }
  }

  const rec = {
    id: editingId || generateRecordId(tipoSel, fechaSel),
    tipo: tipoSel,
    empresa_id: get('f_empresa'),
    instalacion: get('f_instalacion'),
    fecha: fechaSel,
    area: get('f_area'),
    descripcion: get('f_descripcion'),
    reportado_por: get('f_reportado'),
    clasificacion: getIf('f_clasif'),
    incluir_kpi: (tipoSel === 'ACC' && document.getElementById('f_incluir_kpi')) ? document.getElementById('f_incluir_kpi').checked : false,
    naturaleza_cuasi: getIf('f_naturaleza_cuasi'),
    categoria_evento: (tipoSel === 'INC') ? getIf('f_categoria_aici') : '',
    categoria_otro_detalle: (tipoSel === 'INC') ? getIf('f_categoria_otro') : '',
    dano_material_potencial: getIf('f_dano_material'),
    clasificacion_origen: getIf('f_clasif_origen'),
    tipo_auditoria: (tipoSel === 'NC') ? getIf('f_tipo_auditoria') : '',
    ambito_auditoria: (tipoSel === 'NC') ? getIf('f_ambito_auditoria') : '',
    parte_cuerpo: getIf('f_parte_cuerpo'),
    tipo_lesion: getIf('f_tipo_lesion'),
    lecciones_aprendidas: JSON.parse(JSON.stringify(modalLecciones)),
    severidad: TIPOS_CON_SEVERIDAD.includes(tipoSel) ? get('f_severidad') : '',
    estado: estadoSel,
    tipificacion_causa: getIf('f_tipificacion_causa'),
    tipificacion_causa_otro: getIf('f_tipificacion_causa_otro'),
    causa_raiz: getIf('f_causa'),
    acciones_correctivas: tipoSinAcciones ? [] : JSON.parse(JSON.stringify(modalAccionesCorrectivas)),
    acciones_preventivas: tipoSinAcciones ? [] : JSON.parse(JSON.stringify(modalAccionesPreventivas)),
    comunicar_a: getIf('f_comunicar_a'),
    medio_comunicacion: getIf('f_medio_comunicacion'),
    plazo_comunicacion: getIf('f_plazo_comunicacion'),
    responsable: tipoSinAcciones ? get('f_responsable') : '',
    fecha_vencimiento: tipoSinAcciones ? get('f_vencimiento') : '',
    fecha_cierre: get('f_cierre'),
    referencia_normativa: get('f_referencia'),
    adjuntos: JSON.parse(JSON.stringify(modalAttachments)),
  };
  if(!rec.fecha || !rec.descripcion){ showToast('Completá al menos fecha y descripción'); return; }

  if(editingId){
    const idx = DATA.records.findIndex(x=>x.id===editingId);
    DATA.records[idx] = rec;
  } else {
    DATA.records.push(rec);
  }
  registrarPersonaSiEsNueva(rec.reportado_por);
  registrarPersonaSiEsNueva(rec.responsable);
  [...rec.acciones_correctivas, ...rec.acciones_preventivas].forEach(a => registrarPersonaSiEsNueva(a.responsable));
  const nuevasLA = manageLeccionesAprendidas(rec);
  const cambiados = [rec];
  (rec.lecciones_aprendidas || []).forEach(item => {
    if(item.la_id){
      const la = DATA.records.find(x => x.id === item.la_id);
      if(la) cambiados.push(la);
    }
  });
  const resultados = await Promise.all(cambiados.map(r => upsertRegistro(r)));
  await saveCatalogos(); // personas nuevas registradas
  if(resultados.some(ok => !ok)){ return; } // error ya notificado; el modal queda abierto
  closeModal();
  renderAll();
  showToast(nuevasLA>0 ? `Registro guardado — se ${nuevasLA===1?'generó 1 Lección Aprendida':'generaron '+nuevasLA+' Lecciones Aprendidas'} para seguimiento` : (editingId? 'Registro actualizado' : 'Registro creado'));
}
function manageLeccionesAprendidas(rec){
  if(!TIPOS_CON_LECCIONES.includes(rec.tipo) || !Array.isArray(rec.lecciones_aprendidas)) return 0;
  let nuevas = 0;
  rec.lecciones_aprendidas.forEach(item=>{
    const texto = (item.texto||'').trim();
    if(!texto) return;
    if(item.la_id){
      const la = DATA.records.find(x=>x.id===item.la_id && x.tipo==='LA');
      if(la){ la.descripcion = texto; return; }
    }
    const nuevaLA = {
      id: generateRecordId('LA', rec.fecha),
      tipo: 'LA',
      empresa_id: rec.empresa_id,
      instalacion: rec.instalacion,
      fecha: rec.fecha,
      area: rec.area,
      descripcion: texto,
      reportado_por: rec.reportado_por,
      clasificacion_origen: '',
      severidad: '',
      estado: 'Abierta',
      comunicar_a: '',
      medio_comunicacion: '',
      plazo_comunicacion: '',
      responsable: rec.responsable,
      fecha_vencimiento: '',
      fecha_cierre: '',
      referencia_normativa: `Generada automáticamente desde ${rec.id}`,
      adjuntos: [],
      lecciones_aprendidas: [],
      origen_automatico: true,
      origen_registro_id: rec.id,
      origen_registro_tipo: rec.tipo,
    };
    DATA.records.push(nuevaLA);
    item.la_id = nuevaLA.id;
    nuevas++;
  });
  return nuevas;
}
async function deleteRecord(id){
  if(!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  const ok = await deleteRegistroRow(id);
  if(!ok) return;
  DATA.records = DATA.records.filter(r=>r.id!==id);
  closeModal();
  renderAll();
  showToast('Registro eliminado');
}

/* ============ COMPANY MANAGER ============ */
/* ============ GESTIÓN DE CATÁLOGOS (SITIOS, PERSONAS Y CATEGORÍAS) ============ */
function openCatalogManager(){
  const overlay = document.createElement('div');
  overlay.className='modal-overlay';
  overlay.id='modalOverlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:760px;">
      <div class="modal-head"><h2>Gestionar catálogos</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
      <div class="modal-body" id="catalogManagerBody"></div>
      <div class="modal-foot">
        <div></div>
        <button class="btn secondary" onclick="closeModal()">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  renderCatalogManager();
}
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function fmtMesAnio(ym){
  const [y,m] = ym.split('-');
  return `${MESES_ES[parseInt(m,10)-1]} ${y}`;
}
function dotacionSectionHtml(){
  const dot = DATA.catalogos.dotacionMensual || {};
  const meses = Object.keys(dot).sort();
  return `
    <div class="section-title">Dotación de Tripulantes por Mes</div>
    <div style="font-size:11px;color:var(--graphite-light);margin:-4px 0 8px;">
      Cantidad de tripulantes a bordo en cada mes. Se usa como base de exposición para el KPI OCIMF (LTIF / TRCF) de Accidente Personal.
      Si un mes no tiene valor cargado, se usa el valor por defecto (${OCIMF_EXPOSURE_CREW} tripulantes).
    </div>
    <div class="badge-strip" style="margin-bottom:8px;">
      ${meses.length===0 ? '<span style="font-size:12px;color:var(--graphite-light)">Sin meses cargados — se usa el valor por defecto en todos los períodos.</span>' :
        meses.map(m=>`<span class="sev-tag" style="background:var(--paper-dark);color:var(--navy);">${fmtMesAnio(m)}: ${dot[m]} trip. <span style="cursor:pointer;color:var(--red)" onclick="removeDotacionMes('${m}')">✕</span></span>`).join('')}
    </div>
    <div class="field-row-3">
      <input type="month" id="newDotacionMes">
      <input type="number" id="newDotacionCantidad" min="0" step="1" placeholder="Cant. tripulantes">
      <button class="btn secondary" onclick="addDotacionMes()">+ Guardar</button>
    </div>`;
}
async function addDotacionMes(){
  const mesInp = document.getElementById('newDotacionMes');
  const cantInp = document.getElementById('newDotacionCantidad');
  const mes = mesInp.value;
  const cant = parseInt(cantInp.value, 10);
  if(!mes || isNaN(cant) || cant < 0){ showToast('Completá el mes y la cantidad de tripulantes'); return; }
  if(!DATA.catalogos.dotacionMensual) DATA.catalogos.dotacionMensual = {};
  DATA.catalogos.dotacionMensual[mes] = cant;
  await saveData();
  renderCatalogManager();
  renderOcimfKpi();
  showToast('Dotación guardada');
}
async function removeDotacionMes(mes){
  if(DATA.catalogos.dotacionMensual) delete DATA.catalogos.dotacionMensual[mes];
  await saveData();
  renderCatalogManager();
  renderOcimfKpi();
}
function sitiosSectionHtml(){
  const c = DATA.companies[0];
  if(!c) return '';
  return `
    <div class="section-title">${c.name} — Logo</div>
    <div class="field-row" style="align-items:center;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${getCompanyLogo(c.id) ? `<img src="${getCompanyLogo(c.id)}" style="height:40px;max-width:90px;object-fit:contain;border:1px solid var(--line);border-radius:3px;padding:3px;background:#fff;">` : `<span style="font-size:11px;color:var(--graphite-light);">Sin logo cargado</span>`}
        <input type="file" accept="image/*" onchange="setCompanyLogo(0, this)">
      </div>
    </div>
    <div class="section-title">Sitios / Buques</div>
    <div style="font-size:11px;color:var(--graphite-light);margin:-4px 0 8px;">Se usan para filtrar la plataforma y para el reporte PDF por sitio.</div>
    <div class="badge-strip" style="margin-bottom:8px;">
      ${c.vessels.length===0 ? '<span style="font-size:12px;color:var(--graphite-light)">Sin sitios/buques cargados.</span>' :
        c.vessels.map((v,vi)=>`<span class="sev-tag" style="background:var(--paper-dark);color:var(--navy);">${v} <span style="cursor:pointer;color:var(--red)" onclick="removeVessel(0,${vi})">✕</span></span>`).join('')}
    </div>
    <div class="field-row">
      <input type="text" id="newVessel_0" placeholder="Nuevo sitio/buque">
      <button class="btn secondary" onclick="addVessel(0)">+ Agregar</button>
    </div>`;
}
function setCompanyLogo(ci, input){
  if(!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    DATA.companies[ci].logo = e.target.result;
    await saveData();
    renderCatalogManager();
    renderBrandLogo();
    showToast('Logo actualizado');
  };
  reader.readAsDataURL(input.files[0]);
}
async function addVessel(ci){
  const inp = document.getElementById('newVessel_'+ci);
  const v = inp.value.trim();
  if(!v) return;
  DATA.companies[ci].vessels.push(v);
  ordenarAlfa(DATA.companies[ci].vessels);
  await saveData(); renderCatalogManager(); renderAll();
}
async function removeVessel(ci,vi){
  DATA.companies[ci].vessels.splice(vi,1);
  await saveData(); renderCatalogManager(); renderAll();
}
function catalogSectionHtml(title, hint, listKey, list){
  return `
    <div class="section-title">${title}</div>
    ${hint ? `<div style="font-size:11px;color:var(--graphite-light);margin:-4px 0 8px;">${hint}</div>` : ''}
    <div class="badge-strip" style="margin-bottom:8px;">
      ${list.length===0 ? '<span style="font-size:12px;color:var(--graphite-light)">Sin elementos cargados.</span>' :
        list.map((v,vi)=>`<span class="sev-tag" style="background:var(--paper-dark);color:var(--navy);">${v} <span style="cursor:pointer;color:var(--red)" onclick="removeCatalogItem('${listKey}',${vi})">✕</span></span>`).join('')}
    </div>
    <div class="field-row">
      <input type="text" id="newItem_${listKey}" placeholder="Agregar nuevo...">
      <button class="btn secondary" onclick="addCatalogItem('${listKey}')">+ Agregar</button>
    </div>`;
}
function renderCatalogManager(){
  const body = document.getElementById('catalogManagerBody');
  const cat = DATA.catalogos;
  body.innerHTML =
    sitiosSectionHtml() +
    dotacionSectionHtml() +
    catalogSectionHtml('Personas (Responsable / Reportado por)',
      'Se usan como sugerencia al escribir en los campos "Responsable" y "Reportado por". También se agregan solas cuando cargás un nombre nuevo.',
      'personas', cat.personas) +
    catalogSectionHtml('Tipificación — Incidente',
      'Opciones disponibles al reportar un Incidente (daño a la carga, al buque, derrame, etc.).',
      'tipificacionIncidente', cat.tipificacionIncidente) +
    catalogSectionHtml('Tipificación — Causa Raíz',
      'Opciones del campo "Tipificación de la causa raíz", disponible en todos los reportes con Causa Raíz y Acciones (NC, Observación, Oport. Mejora, Accidente Personal, Incidente, Cuasi Accidente, Acto Inseguro, Condición Insegura).',
      'tipificacionCausaRaiz', cat.tipificacionCausaRaiz.filter(c=>c)) +
    catalogSectionHtml('Clasificación — NC / Observación / Oport. Mejora / Lección Aprendida',
      'Opciones del campo "Clasificación" para estos cuatro tipos.',
      'clasifOrigen', cat.clasifOrigen.filter(c=>c));
}
async function addCatalogItem(listKey){
  const inp = document.getElementById('newItem_'+listKey);
  const v = inp.value.trim();
  if(!v) return;
  DATA.catalogos[listKey].push(v);
  ordenarAlfa(DATA.catalogos[listKey]);
  await saveData();
  renderCatalogManager();
  renderPersonasDatalist();
  showToast('Agregado');
}
async function removeCatalogItem(listKey, idx){
  // clasifOrigen y tipificacionCausaRaiz se muestran sin el "" inicial (placeholder); hay que ajustar el índice real
  const realIdx = (listKey === 'clasifOrigen' || listKey === 'tipificacionCausaRaiz') ? idx + 1 : idx;
  DATA.catalogos[listKey].splice(realIdx,1);
  await saveData();
  renderCatalogManager();
  renderPersonasDatalist();
}

/* ============ EXPORT ============ */
function exportData(){
  const blob = new Blob([JSON.stringify(DATA, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `hsqe_integra_export_${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exportación generada');
}

/* ============ REPORTE PDF DE GRÁFICOS ============ */
function printChartsReport(){
  const container = document.getElementById('printReport');
  const now = new Date();
  const fechaHora = now.toLocaleDateString('es-AR') + ' ' + now.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'});
  const co = DATA.companies[0] || null;
  const logo = co ? getCompanyLogo(co.id) : null;
  const scopeLabel = document.getElementById('chartsSectionLabel').textContent;

  // KPIs: se clona tal cual se ve en pantalla
  const kpiHtml = document.getElementById('kpiRow').outerHTML;

  // KPI OCIMF (solo si la vista actual es Accidente Personal): se clona con los valores ya calculados en pantalla
  let ocimfHtml = '';
  if(currentTypeFilter === 'KPI' && document.getElementById('ocimfKpiPanel').style.display !== 'none'){
    const desde = document.getElementById('ocimfDesde').value;
    const hasta = document.getElementById('ocimfHasta').value;
    const ocimfCardsHtml = document.getElementById('ocimfKpiRow').outerHTML;
    const ocimfInfoHtml = document.getElementById('ocimfExposureInfo').innerHTML;
    ocimfHtml = `
      <div style="margin:4px 0 18px;">
        <h3 style="font-family:'Saira';font-size:16px;color:#002247;border-bottom:2px solid #0A3A66;padding-bottom:4px;">KPI OCIMF — Frecuencia de Lesiones (${fmtDate(desde)} a ${fmtDate(hasta)})</h3>
        ${ocimfCardsHtml}
        <div style="font-size:11px;color:#5B6671;margin-top:6px;line-height:1.5;">${ocimfInfoHtml}</div>
      </div>`;
  }

  // KPI — No Conformidades en Auditorías ISM/ISO (solo si la vista actual es NC)
  let auditNcHtml = '';
  if(currentTypeFilter === 'KPI' && document.getElementById('auditNcKpiPanel').style.display !== 'none'){
    const auditDesde = document.getElementById('auditNcDesde').value;
    const auditHasta = document.getElementById('auditNcHasta').value;
    const auditNcCardsHtml = document.getElementById('auditNcKpiRow').outerHTML;
    const auditNcInfoHtml = document.getElementById('auditNcInfo').innerHTML;
    auditNcHtml = `
      <div style="margin:4px 0 18px;">
        <h3 style="font-family:'Saira';font-size:16px;color:#002247;border-bottom:2px solid #0A3A66;padding-bottom:4px;">KPI — No Conformidades en Auditorías ISM / ISO (${fmtDate(auditDesde)} a ${fmtDate(auditHasta)})</h3>
        ${auditNcCardsHtml}
        <div style="font-size:11px;color:#5B6671;margin-top:6px;line-height:1.5;">${auditNcInfoHtml}</div>
      </div>`;
  }

  // Gráficos: misma estructura chart-row / chart-card, canvas reemplazado por imagen
  const chartDefs = [
    {canvas:'chartTipo', titleEl:'chartTitle1', obj:charts.tipo},
    {canvas:'chartEstado', titleEl:'chartTitle2', obj:charts.estado},
    {canvas:'chartEmpresa', titleEl:'chartTitle3', obj:charts.empresa},
    {canvas:'chartCausa', titleEl:'chartTitle4', obj:charts.causa},
  ];
  let chartsHtml = '<div class="chart-row">';
  chartDefs.forEach(cd=>{
    const canvasEl = document.getElementById(cd.canvas);
    const title = document.getElementById(cd.titleEl).textContent;
    if(!canvasEl || !cd.obj) return;
    const img = canvasEl.toDataURL('image/png', 1.0);
    chartsHtml += `<div class="chart-card"><h3>${title}</h3><img src="${img}" style="width:100%;"></div>`;
  });
  chartsHtml += '</div>';

  // Tabla: se clona la tabla tal cual se ve en pantalla (mismos filtros aplicados), sin la columna de acción de impresión
  let tableHtml = document.getElementById('tableWrap').innerHTML;
  tableHtml = tableHtml.replace(/<th>\s*<\/th>\s*<\/tr>/, '</tr>');
  tableHtml = tableHtml.replace(/<td[^>]*>\s*<button[^>]*>📄<\/button>\s*<\/td>/g, '');

  container.innerHTML = `<div class="pr-record">
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="width:70%;vertical-align:middle;border-bottom:3px solid #002247;padding-bottom:8px;">
          <div class="pr-title">INTEGRA · MÓDULO HSQE — GRÁFICOS</div>
          <div class="pr-sub">${scopeLabel} · ${co?co.name:''}${currentSiteFilter!=='ALL' ? ' — '+currentSiteFilter : ''} · Generado el ${fechaHora}</div>
        </td>
        <td style="width:30%;text-align:right;">${logo?`<img src="${logo}" style="max-height:60px;max-width:160px;">`:''}</td>
      </tr>
    </table>
    ${kpiHtml}
    ${chartsHtml}
    ${ocimfHtml}
    ${auditNcHtml}
    <div style="margin-top:18px;">
      <h3 style="font-family:'Saira';font-size:16px;color:#002247;border-bottom:2px solid #0A3A66;padding-bottom:4px;">Registros incluidos</h3>
      ${tableHtml}
    </div>
  </div>`;
  window.print();
}

function printCompanyReport(){
  const container = document.getElementById('printReport');
  const now = new Date();
  const fechaHora = now.toLocaleDateString('es-AR') + ' ' + now.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'});

  const empresa = DATA.companies[0];
  const todosLosSitios = (empresa && empresa.vessels) || [];
  const sitiosAImprimir = currentSiteFilter === 'ALL' ? todosLosSitios : [currentSiteFilter];

  const tituloAlcance = currentSiteFilter === 'ALL'
    ? `ESTADO POR SITIO — ${empresa ? empresa.name.toUpperCase() : ''}`
    : `ESTADO — ${currentSiteFilter.toUpperCase()}`;

  const logoPrincipal = empresa ? getCompanyLogo(empresa.id) : null;

  let html = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="width:70%;vertical-align:middle;border-bottom:3px solid #002247;padding-bottom:8px;">
          <div class="pr-title">INTEGRA · MÓDULO HSQE — ${tituloAlcance}</div>
          <div class="pr-sub">Generado el ${fechaHora}</div>
        </td>
        <td style="width:30%;text-align:right;border-bottom:3px solid #002247;padding-bottom:8px;">
          ${logoPrincipal ? `<img src="${logoPrincipal}" style="max-height:60px;max-width:160px;">` : ''}
        </td>
      </tr>
    </table>`;

  sitiosAImprimir.forEach(sitio => {
    const recs = DATA.records.filter(r => r.instalacion === sitio);
    const abiertas = recs.filter(r => !['Cerrada'].includes(r.estado));
    const vencidas = recs.filter(isOverdue);
    const cerradas = recs.filter(r => ['Cerrada'].includes(r.estado));

    html += `<div class="pr-company">
      <div style="font-family:'DM Mono';font-size:10px;color:var(--graphite-light);margin-bottom:4px;">INTEGRA · Módulo HSQE — Generado el ${fechaHora}</div>
      <h2>${sitio}</h2>
      <div class="pr-kpis">
        <div class="pr-kpi"><div class="n">${recs.length}</div><div class="l">Total registros</div></div>
        <div class="pr-kpi"><div class="n">${abiertas.length}</div><div class="l">Abiertas / en curso</div></div>
        <div class="pr-kpi"><div class="n ${vencidas.length>0?'alert':''}">${vencidas.length}</div><div class="l">Acciones vencidas</div></div>
        <div class="pr-kpi"><div class="n">${cerradas.length}</div><div class="l">Cerradas / verificadas</div></div>
      </div>`;

    if(recs.length === 0){
      html += `<div class="pr-empty">Sin registros cargados para este sitio.</div>`;
    } else {
      const sorted = [...recs].sort((a,b)=>{
        const wA = !['Cerrada'].includes(a.estado) ? 0 : 1;
        const wB = !['Cerrada'].includes(b.estado) ? 0 : 1;
        if(wA!==wB) return wA-wB;
        return (b.fecha||'').localeCompare(a.fecha||'');
      });
      html += `<table class="pr-table">
        <thead><tr>
          <th>ID</th><th>Tipo</th><th>Fecha</th><th>Descripción</th><th>Estado</th><th>Responsable</th><th>Vencimiento</th>
        </tr></thead><tbody>`;
      sorted.forEach(r=>{
        const resumen = accionesResumen(r);
        html += `<tr>
          <td>${r.id}</td>
          <td>${TYPES[r.tipo]?TYPES[r.tipo].label:r.tipo}</td>
          <td>${fmtDate(r.fecha)}</td>
          <td>${(r.descripcion||'').slice(0,90)}</td>
          <td>${r.estado}${isOverdue(r)?' ⚠ VENCIDA':''}</td>
          <td>${resumen.responsable}</td>
          <td>${resumen.vencimiento?fmtDate(resumen.vencimiento):'—'}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }
    html += `</div>`;
  });

  container.innerHTML = html;
  window.print();
}
window.addEventListener('afterprint', ()=>{ document.getElementById('printReport').innerHTML = ''; });

/* ============ IMPRESIÓN DE REGISTRO INDIVIDUAL ============ */
// Convierte el logo a base64 para incrustarlo dentro del .doc (autocontenido).
// Los logos subidos por el usuario ya vienen como data URI; los logos por
// defecto (/PL.png, /cleansea.png) se descargan y se convierten al vuelo.
async function logoToDataURL(src){
  if(!src) return null;
  if(src.startsWith('data:')) return src;
  try{
    const resp = await fetch(src);
    const blob = await resp.blob();
    return await new Promise((resolve, reject)=>{
      const fr = new FileReader();
      fr.onload  = ()=>resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }catch(e){
    console.warn('No se pudo cargar el logo para el Word:', src, e);
    return null; // seguimos sin logo en vez de romper la descarga
  }
}

async function exportRecordToWord(id){
  const r = DATA.records.find(x=>x.id===id);
  if(!r){ showToast('No se encontró el registro'); return; }
  const co = DATA.companies.find(c=>c.id===r.empresa_id);
  const logo = await logoToDataURL(getCompanyLogo(r.empresa_id));
  const now = new Date();
  const fechaHora = now.toLocaleDateString('es-AR') + ' ' + now.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'});
  const tipoInfo = TYPES[r.tipo] || {label:r.tipo, color:'#333'};
  const NAVY='#002247', ORANGE='#0A3A66', GRAPH='#5B6671', LINE='#DBE0E6';

  const metaRow = (a,b) => `<tr>
    <td style="border:1px solid ${LINE};padding:6px 10px;width:33%;"><div style="font-size:8pt;text-transform:uppercase;color:${GRAPH};letter-spacing:0.5pt;">${a.l}</div><div style="font-size:10.5pt;color:${NAVY};font-weight:bold;">${a.v}</div></td>
    <td style="border:1px solid ${LINE};padding:6px 10px;width:33%;"><div style="font-size:8pt;text-transform:uppercase;color:${GRAPH};letter-spacing:0.5pt;">${b.l}</div><div style="font-size:10.5pt;color:${NAVY};font-weight:bold;">${b.v}</div></td>
  </tr>`;

  const resumenMeta = accionesResumen(r);
  let body = `
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="width:70%;vertical-align:middle;border-bottom:3px solid ${NAVY};padding-bottom:8px;">
          <div style="font-family:Arial,sans-serif;font-size:18pt;font-weight:bold;color:${NAVY};letter-spacing:1pt;">INTEGRA · MÓDULO HSQE</div>
          <div style="font-size:11pt;color:${ORANGE};font-weight:bold;letter-spacing:0.5pt;">SOLICITUD DE ACCIÓN / RESPUESTA</div>
          <div style="font-size:8.5pt;color:${GRAPH};font-family:'Courier New',monospace;margin-top:2px;">Generado el ${fechaHora}</div>
        </td>
        <td style="width:30%;text-align:right;vertical-align:middle;border-bottom:3px solid ${NAVY};padding-bottom:8px;">
          ${logo ? `<img src="${logo}" style="max-height:60px;max-width:160px;">` : ''}
        </td>
      </tr>
    </table>

    <p style="margin:0 0 10px;">
      <span style="background:${tipoInfo.color};color:#fff;font-weight:bold;padding:3px 12px;border-radius:3px;font-size:10pt;">${tipoInfo.label}</span>
      &nbsp;&nbsp;<span style="font-family:'Courier New',monospace;font-size:10.5pt;color:${GRAPH};">${r.id}</span>
    </p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      ${metaRow({l:'Empresa', v:co?co.name:'—'}, {l:'Instalación / Área', v:(r.instalacion||'—')+(r.area?' · '+r.area:'')})}
      ${metaRow({l:'Fecha del evento', v:fmtDate(r.fecha)}, {l:'Severidad', v:r.severidad||'—'})}
      ${metaRow({l:'Estado actual', v:r.estado||'—'}, {l:'Responsable', v:resumenMeta.responsable})}
      ${metaRow({l:'Reportado por', v:r.reportado_por||'—'}, {l:'Fecha de vencimiento', v:(resumenMeta.vencimiento?fmtDate(resumenMeta.vencimiento):'—')+(isOverdue(r)?' ⚠ VENCIDA':'')})}
      ${metaRow({l:'Fecha de cierre', v:fmtDate(r.fecha_cierre)}, {l:'Referencia normativa', v:r.referencia_normativa||'—'})}
    </table>

    <h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Descripción del Evento</h3>
    <p style="font-size:10.5pt;line-height:1.5;">${r.descripcion||'—'}</p>`;

  if(TIPOS_CON_OCIMF.includes(r.tipo) && r.clasificacion){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Clasificación OCIMF/TMSA</h3><p style="font-size:10.5pt;">${r.clasificacion}${r.incluir_kpi?' <i>(incluido en KPI OCIMF)</i>':''}</p>`;
  }
  if(r.tipo==='CUA' && (r.naturaleza_cuasi || r.dano_material_potencial)){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Detalle del Cuasi Accidente</h3>
      <p style="font-size:10.5pt;"><b>Naturaleza:</b> ${r.naturaleza_cuasi||'—'}</p>
      ${r.dano_material_potencial?`<p style="font-size:10.5pt;"><b>Daño material potencial:</b> ${r.dano_material_potencial}</p>`:''}`;
  }
  if(r.parte_cuerpo || r.tipo_lesion){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Datos de la Lesión</h3>
      <p style="font-size:10.5pt;"><b>Parte del cuerpo afectada:</b> ${r.parte_cuerpo||'—'} &nbsp;·&nbsp; <b>Tipo de lesión:</b> ${r.tipo_lesion||'—'}</p>`;
  }
  if((r.tipo==='AI' || r.tipo==='CI' || r.tipo==='INC') && r.categoria_evento){
    const tituloCat = r.tipo === 'INC' ? 'Tipificación' : 'Categorización';
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">${tituloCat}</h3>
      <p style="font-size:10.5pt;">${r.categoria_evento}${r.categoria_evento==='Otros' && r.categoria_otro_detalle ? ' — '+r.categoria_otro_detalle : ''}</p>`;
  }
  if(TIPOS_CON_CLASIF_ORIGEN.includes(r.tipo) && r.clasificacion_origen){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Clasificación</h3><p style="font-size:10.5pt;">${r.clasificacion_origen}</p>`;
    if(r.tipo === 'NC' && (r.tipo_auditoria || r.ambito_auditoria)){
      body += `<p style="font-size:10.5pt;"><b>Origen de auditoría:</b> ${r.tipo_auditoria||'—'} · ${r.ambito_auditoria||'—'}</p>`;
    }
  }
  if(!TIPOS_SIN_CAUSA_ACCION.includes(r.tipo) && (r.causa_raiz || r.tipificacion_causa || (r.acciones_correctivas||[]).length || (r.acciones_preventivas||[]).length)){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Análisis y Acción</h3>
      ${r.tipificacion_causa?`<p style="font-size:10.5pt;"><b>Tipificación de la causa raíz:</b> ${r.tipificacion_causa}${r.tipificacion_causa==='Otros' && r.tipificacion_causa_otro ? ' — '+r.tipificacion_causa_otro : ''}</p>`:''}
      ${r.causa_raiz?`<p style="font-size:10.5pt;"><b>Descripción de causas:</b> ${r.causa_raiz}</p>`:''}`;
    const accionRow = (titulo, lista) => {
      if(!lista || lista.length===0) return `<p style="font-size:10.5pt;"><b>${titulo}:</b> sin acciones cargadas.</p>`;
      return `<p style="font-size:10.5pt;margin-bottom:2px;"><b>${titulo}:</b></p>` + lista.map((a,i)=>
        `<p style="font-size:10pt;margin:0 0 6px 12px;">${i+1}. ${a.descripcion||'—'} <br>
          <span style="font-size:9pt;color:${GRAPH};">Responsable: ${a.responsable||'—'} · Vencimiento: ${fmtDate(a.vencimiento)} · Estado: ${a.estado||'—'}</span>
        </p>`).join('');
    };
    body += accionRow('Acciones Correctivas', r.acciones_correctivas);
    body += accionRow('Acciones Preventivas', r.acciones_preventivas);
  }
  if(TIPOS_SIN_CAUSA_ACCION.includes(r.tipo) && (r.comunicar_a || r.medio_comunicacion || r.plazo_comunicacion)){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Comunicación</h3>
      <p style="font-size:10.5pt;"><b>A quién comunicar:</b> ${r.comunicar_a||'—'}</p>
      <p style="font-size:10.5pt;"><b>Medio:</b> ${r.medio_comunicacion||'—'} &nbsp;·&nbsp; <b>Plazo:</b> ${r.plazo_comunicacion||'—'}</p>`;
  }
  if(Array.isArray(r.lecciones_aprendidas) && r.lecciones_aprendidas.length>0){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Lecciones Aprendidas</h3>` +
      r.lecciones_aprendidas.map(l=>`<p style="font-size:10.5pt;">💡 ${l.texto}${l.la_id?` <span style="font-family:'Courier New',monospace;font-size:9pt;color:${GRAPH};">(${l.la_id})</span>`:''}</p>`).join('');
  }
  if(Array.isArray(r.adjuntos) && r.adjuntos.length>0){
    body += `<h3 style="font-family:Arial;font-size:12pt;color:${NAVY};border-bottom:2px solid ${ORANGE};padding-bottom:3px;">Adjuntos</h3>` +
      r.adjuntos.map(a=>`<p style="font-size:10.5pt;">📎 ${a.nombre} (${a.tamano})</p>`).join('');
  }

  body += `
    <table style="width:100%;border:2px solid ${NAVY};border-collapse:collapse;margin-top:20px;">
      <tr><td style="padding:14px;">
        <h3 style="font-family:Arial;font-size:12pt;color:${NAVY};margin-top:0;">Respuesta del Responsable</h3>
        <p style="font-size:9pt;color:${GRAPH};">Completar y devolver a HSQE con la acción tomada, evidencia y fecha de implementación.</p>
        <p style="border-bottom:1px solid #999;height:28px;">&nbsp;</p>
        <p style="border-bottom:1px solid #999;height:28px;">&nbsp;</p>
        <p style="border-bottom:1px solid #999;height:28px;">&nbsp;</p>
        <table style="width:100%;margin-top:14px;"><tr>
          <td style="width:50%;"><p style="border-bottom:1px solid #999;height:34px;">&nbsp;</p><div style="font-size:8pt;color:${GRAPH};text-transform:uppercase;">Firma y aclaración</div></td>
          <td style="width:50%;"><p style="border-bottom:1px solid #999;height:34px;">&nbsp;</p><div style="font-size:8pt;color:${GRAPH};text-transform:uppercase;">Fecha</div></td>
        </tr></table>
      </td></tr>
    </table>`;

  const fullHtml = `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><title>${r.id}</title>
    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
    <style>body{font-family:Calibri, Arial, sans-serif;color:#222;}</style>
    </head><body>${body}</body></html>`;

  const blob = new Blob(['\ufeff', fullHtml], {type: 'application/msword'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${r.id}_${r.tipo}.doc`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Documento Word generado');
}

/* ============ INIT ============ */
Object.assign(window, { addAccion, addAttachmentFile, addAttachmentManual, addCatalogItem, addDotacionMes, addLeccion, addVessel, clearFilters, closeModal, deleteRecord, exportData, exportRecordToWord, openAttachment, openCatalogManager, openRecordForm, printChartsReport, printCompanyReport, removeAccion, removeAttachment, removeCatalogItem, removeDotacionMes, removeLeccion, removeVessel, renderAuditNcKpi, renderOcimfKpi, renderTable, saveRecord, setCompanyLogo, setSiteFilter, setTypeFilter, toggleCategoriaOtro, toggleTipificacionCausaOtro, updateAccionField, updateVesselOptions, validateEstadoCierre, refreshData, logoutHsqe });

async function logoutHsqe(){
  await supabase.auth.signOut();
  window.location.reload();
}

export function initApp(session){
  const emailEl = document.getElementById('sessionEmail');
  if(emailEl && session && session.user) emailEl.textContent = session.user.email;
  document.querySelector('.app').style.display = 'flex';
  fixSidebarLayout();
  loadData();
}
