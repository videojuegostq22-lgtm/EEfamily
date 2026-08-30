
/* =========================================================================
   MOVIMIENTOS
   ========================================================================= */
function renderMovimientos(){
  const d = App.state.data;
  const range = Engine.getRange(App.state.period,App.state.customRange);
  let txs = Engine.txInRange(d.transactions,range.from,range.to);
  if(App.state.filterType!=='all') txs = txs.filter(t=>t.type===App.state.filterType);
  if(App.state.filterCategory) txs = txs.filter(t=>t.categoryId===App.state.filterCategory);
  txs.sort((a,b)=> (a.date<b.date?1:-1));
  const cats = d.categories;
  const totals = Engine.totals(txs);
  return `
  <div class="card mb-16">
    <div class="tx-summary-header mb-12">
      <div class="tx-summary-info">
        <div class="small">${range.label} · ${txs.length} movimientos</div>
        <div class="tx-summary-badges">
          <span class="badge pos">Ingresos ${fmtMoney(totals.income)}</span>
          <span class="badge neg">Gastos ${fmtMoney(totals.expense)}</span>
          <span class="badge brand">Balance ${fmtMoney(totals.savings)}</span>
        </div>
      </div>
      <div class="tx-summary-actions">
        <button class="btn btn-ghost btn-sm" id="export-csv">⬇ CSV</button>
        <button class="btn btn-ghost btn-sm" id="import-csv">⬆ Importar</button>
        <button class="btn btn-soft btn-sm" id="add-tx">+ Añadir</button>
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <div class="seg">
        ${['all','income','expense','transfer'].map(t=>`<button data-type="${t}" class="${App.state.filterType===t?'active':''}">${t==='all'?'Todos':t==='income'?'Ingresos':t==='expense'?'Gastos':'Transferencias'}</button>`).join('')}
      </div>
      <select class="select" id="filter-cat" style="width:auto;padding:7px 36px 7px 12px;border-radius:9px">
        <option value="">Todas las categorías</option>
        ${cats.map(c=>`<option value="${c.id}" ${App.state.filterCategory===c.id?'selected':''}>${c.type==='income'?'↑ ':'↓ '}${h.esc(c.name)}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="card">
    ${txs.length===0?'<div class="empty"><div class="icon">📋</div><h4>Sin movimientos</h4><p>Empieza añadiendo tu primer gasto o ingreso</p><button class="btn btn-primary" id="add-tx-empty">+ Añadir</button></div>':`
    <div class="row-list">
      ${txs.map(t=>renderTxRow(t,d)).join('')}
    </div>`}
  </div>`;
}
function renderTxRow(t,d){
  const cat = d.categories.find(c=>c.id===t.categoryId);
  const acc = d.accounts.find(a=>a.id===t.accountId);
  const toAcc = t.type==='transfer'?d.accounts.find(a=>a.id===t.toAccountId):null;
  const u = Family.getUserById(t.createdBy);
  const iconCls = t.type==='income'?'tx-income':t.type==='expense'?'tx-expense':'tx-transfer';
  const amtCls = t.type==='income'?'pos':t.type==='expense'?'neg':'';
  const prefix = t.type==='income'?'+':t.type==='expense'?'−':'';
  const label = t.type==='transfer' ? `${h.esc(acc?.name||'?')} → ${h.esc(toAcc?.name||'?')}` : (cat?.name||'Sin categoría');
  return `<div class="row" data-edit-tx="${t.id}">
    <div class="icon ${iconCls}">${catIcon(cat?.name||t.type==='transfer'?'Transferencia':'')}</div>
    <div class="info">
      <b>${label}</b>
      <span>${h.esc(t.description||'')} ${t.description&&acc?' · ':''} ${acc?h.esc(acc.name):''}</span>
      <div class="who">${h.esc(u?.name||'?')} · ${h.formatDate(t.date)}</div>
    </div>
    <div class="amount ${amtCls}">${prefix}${fmtMoney(t.amount)}</div>
  </div>`;
}

/* =========================================================================
   PRESUPUESTOS
   ========================================================================= */
function renderPresupuestos(){
  const d = App.state.data;
  const now = new Date();
  const cmk = monthKey(now);
  const budgets = d.budgets.filter(b=>b.month===cmk);
  const cmFrom = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';
  const cmTo = dateToISO(now);
  const expCats = d.categories.filter(c=>c.type==='expense');
  const totalLimit = budgets.reduce((s,b)=>s+b.limit,0);
  const totalSpent = budgets.reduce((s,b)=>{
    const spent = d.transactions.filter(t=>t.type==='expense'&&t.categoryId===b.categoryId&&t.date>=cmFrom&&t.date<=cmTo).reduce((ss,t)=>ss+t.amount,0);
    return s+spent;
  },0);
  return `
  <div class="metric-row">
    <div class="metric"><div class="label">Presupuestado</div><div class="value num">${fmtMoney(totalLimit)}</div></div>
    <div class="metric neg"><div class="label">Gastado</div><div class="value num">${fmtMoney(totalSpent)}</div></div>
    <div class="metric ${(totalLimit-totalSpent)>=0?'pos':'neg'}"><div class="label">Disponible</div><div class="value num">${fmtMoney(totalLimit-totalSpent)}</div></div>
  </div>
  <div class="card">
    <div class="row-between mb-12">
      <h3 style="margin:0">Presupuestos de ${now.toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</h3>
      <button class="btn btn-primary btn-sm" id="add-budget">+ Añadir presupuesto</button>
    </div>
    ${budgets.length===0?`<div class="empty"><div class="icon">📊</div><h4>Sin presupuestos</h4><p>Define límites mensuales para tus categorías</p><button class="btn btn-primary" id="add-budget-empty">+ Crear primer presupuesto</button></div>`:`
    <div class="row-list">
      ${budgets.map(b=>renderBudgetDetail(b,d,cmFrom,cmTo)).join('')}
    </div>`}
  </div>
  <div class="card" style="margin-top:16px">
    <h3>Categorías sin presupuesto</h3>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${expCats.filter(c=>!budgets.some(b=>b.categoryId===c.id)).map(c=>`<span class="chip" data-add-budget-cat="${c.id}">${catIcon(c.name)} ${h.esc(c.name)}</span>`).join('')||'<span class="small">Todas las categorías tienen presupuesto</span>'}
    </div>
  </div>`;
}
function renderBudgetDetail(b,d,cmFrom,cmTo){
  const cat = d.categories.find(c=>c.id===b.categoryId);
  const spent = d.transactions.filter(t=>t.type==='expense'&&t.categoryId===b.categoryId&&t.date>=cmFrom&&t.date<=cmTo).reduce((s,t)=>s+t.amount,0);
  const pct = b.limit>0?Math.min(150,spent/b.limit*100):0;
  const status = pct>=100?'danger':pct>=80?'warn':'pos';
  return `<div class="row" data-edit-budget="${b.id}" style="flex-wrap:wrap">
    <div class="icon" style="background:${cat?.color||'#94A3B8'}22;color:${cat?.color||'#94A3B8'};font-size:20px">${catIcon(cat?.name||'')}</div>
    <div class="info" style="flex:1;min-width:0">
      <b>${h.esc(cat?.name||'?')}</b>
      <div class="row-between" style="margin-top:2px"><span class="small num">${fmtMoney(spent)} de ${fmtMoney(b.limit)}</span><span class="small num">${pct.toFixed(0)}%</span></div>
      <div class="progress ${status}"><div style="width:${Math.min(100,pct)}%"></div></div>
      <div class="small" style="margin-top:4px">${pct>=100?'<span class="badge neg">Superado</span>':''}${pct>=80&&pct<100?'<span class="badge warn">Cerca del límite</span>':''} ${b.limit-spent>=0?`Disponible: <b class="num">${fmtMoney(b.limit-spent)}</b>`:''}</div>
    </div>
  </div>`;
}

/* =========================================================================
   OBJETIVOS
   ========================================================================= */
function renderObjetivos(){
  const d = App.state.data;
  const totalTarget = d.goals.reduce((s,g)=>s+g.target,0);
  const totalSaved = d.goals.reduce((s,g)=>s+g.saved,0);
  const remaining = totalTarget-totalSaved;
  return `
  <div class="metric-row">
    <div class="metric brand"><div class="label">Total objetivo</div><div class="value num">${fmtMoney(totalTarget)}</div></div>
    <div class="metric pos"><div class="label">Ahorrado</div><div class="value num">${fmtMoney(totalSaved)}</div></div>
    <div class="metric"><div class="label">Faltan</div><div class="value num">${fmtMoney(Math.max(0,remaining))}</div></div>
    <div class="metric brand"><div class="label">Progreso</div><div class="value num">${totalTarget>0?(totalSaved/totalTarget*100).toFixed(0):0}%</div></div>
  </div>
  <div class="card">
    <div class="row-between mb-12">
      <h3 style="margin:0">Tus objetivos</h3>
      <button class="btn btn-primary btn-sm" id="add-goal">+ Nuevo objetivo</button>
    </div>
    ${d.goals.length===0?'<div class="empty"><div class="icon">🎯</div><h4>Sin objetivos</h4><p>Crea objetivos de ahorro para motivar a la familia</p><button class="btn btn-primary" id="add-goal-empty">+ Crear primer objetivo</button></div>':
      d.goals.map(g=>{
        const eta = Engine.goalETA(d,g);
        const pct = g.target>0?Math.min(100,g.saved/g.target*100):0;
        return `<div class="goal-card" data-edit-goal="${g.id}" style="cursor:pointer">
          <div class="top">
            <div class="emoji">${g.icon||'🎯'}</div>
            <div style="flex:1"><b>${h.esc(g.name)}</b><div class="small">Objetivo ${fmtMoney(g.target)} ${g.deadline?' · Fecha '+g.deadline:''}</div></div>
            <b class="num-big num">${pct.toFixed(0)}%</b>
          </div>
          <div class="progress pos"><div style="width:${pct}%"></div></div>
          <div class="numbers">
            <span>Ahorrado <b class="num">${fmtMoney(g.saved)}</b></span>
            <span>Faltan <b class="num">${fmtMoney(eta.remaining)}</b></span>
            <span>~${eta.months} meses al ritmo actual</span>
          </div>
          <div style="margin-top:10px;display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm" data-goal-add="${g.id}">+ Añadir ahorro</button>
            <button class="btn btn-soft btn-sm" data-goal-edit="${g.id}">Editar</button>
            <button class="btn btn-danger btn-sm" data-goal-del="${g.id}">Eliminar</button>
          </div>
        </div>`;
      }).join('')}
  </div>`;
}

/* =========================================================================
   CUENTAS
   ========================================================================= */
function renderCuentas(){
  const d = App.state.data;
  const total = d.accounts.reduce((s,a)=>s+Engine.accountBalance(d,a.id),0);
  return `
  <div class="metric-row">
    <div class="metric brand"><div class="label">Saldo total</div><div class="value num">${fmtMoney(total)}</div><div class="sub">${d.accounts.length} cuenta${d.accounts.length===1?'':'s'}</div></div>
  </div>
  <div class="card">
    <div class="row-between mb-12">
      <h3 style="margin:0">Tus cuentas</h3>
      <button class="btn btn-primary btn-sm" id="add-account">+ Nueva cuenta</button>
    </div>
    ${d.accounts.length===0?'<div class="empty"><div class="icon">🏦</div><h4>Sin cuentas</h4><button class="btn btn-primary" id="add-account-empty">+ Añadir cuenta</button></div>':`
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
      ${d.accounts.map(a=>{
        const bal = Engine.accountBalance(d,a.id);
        const typeLabel = {bank:'Banco',savings:'Ahorro',cash:'Efectivo',card:'Tarjeta',investment:'Inversión',other:'Otra'}[a.type]||a.type;
        return `<div class="card" style="padding:16px;cursor:pointer" data-edit-account="${a.id}">
          <div class="row-between">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:40px;height:40px;border-radius:12px;background:${a.color||'#6366F1'}22;color:${a.color||'#6366F1'};display:grid;place-items:center;font-size:18px">${
                {bank:'🏦',savings:'💰',cash:'💵',card:'💳',investment:'📈',other:'•'}[a.type]||'🏦'}</div>
              <div><b>${h.esc(a.name)}</b><div class="small">${h.esc(typeLabel)}</div></div>
            </div>
            <b class="num num-big" style="color:${bal>=0?'var(--pos)':'var(--neg)'}">${fmtMoney(bal)}</b>
          </div>
        </div>`;
      }).join('')}
    </div>`}
  </div>`;
}

/* =========================================================================
   PATRIMONIO
   ========================================================================= */
function renderPatrimonio(){
  const d = App.state.data;
  const assets = Engine.totalBalance(d);
  const debt = Engine.debtOutstanding(d);
  const nw = assets-debt;
  const chart = chartNetWorthTrend(d);
  return `
  <div class="metric-row">
    <div class="metric pos"><div class="label">Activos</div><div class="value num">${fmtMoney(assets)}</div></div>
    <div class="metric neg"><div class="label">Pasivos (deuda)</div><div class="value num">${fmtMoney(debt)}</div></div>
    <div class="metric brand"><div class="label">Patrimonio neto</div><div class="value num">${fmtMoney(nw)}</div></div>
  </div>
  <div class="chart c-12 mb-16">${chart}</div>
  <div class="grid-2">
    <div class="card">
      <h3>Desglose de activos</h3>
      <div class="row-list">
        ${d.accounts.map(a=>`
          <div class="row">
            <div class="icon" style="background:${a.color||'#6366F1'}22;color:${a.color||'#6366F1'};font-size:18px">${{bank:'🏦',savings:'💰',cash:'💵',card:'💳',investment:'📈'}[a.type]||'•'}</div>
            <div class="info"><b>${h.esc(a.name)}</b><span class="small">${a.type}</span></div>
            <div class="amount pos num">${fmtMoney(Engine.accountBalance(d,a.id))}</div>
          </div>`).join('')||'<div class="empty small">Sin cuentas</div>'}
      </div>
    </div>
    <div class="card">
      <h3>Deudas activas</h3>
      <div class="row-list">
        ${d.debts.map(de=>`
          <div class="row" data-edit-debt="${de.id}">
            <div class="icon" style="background:var(--neg-soft);color:var(--neg-text)">💳</div>
            <div class="info"><b>${h.esc(de.name)}</b><span class="small">${de.rate||0}% · ${fmtMoney(de.payment)}/mes</span></div>
            <div class="amount neg num">${fmtMoney(de.outstanding)}</div>
          </div>`).join('')||'<div class="empty small">Sin deudas</div>'}
      </div>
    </div>
  </div>`;
}

/* =========================================================================
   DEUDAS
   ========================================================================= */
function renderDeudas(){
  const d = App.state.data;
  const totalOut = d.debts.reduce((s,de)=>s+de.outstanding,0);
  const monthly = d.debts.reduce((s,de)=>s+(de.payment|0),0);
  return `
  <div class="metric-row">
    <div class="metric neg"><div class="label">Deuda pendiente total</div><div class="value num">${fmtMoney(totalOut)}</div></div>
    <div class="metric"><div class="label">Cuota mensual</div><div class="value num">${fmtMoney(monthly)}</div></div>
    <div class="metric brand"><div class="label">Nº deudas</div><div class="value num">${d.debts.length}</div></div>
  </div>
  <div class="card">
    <div class="row-between mb-12">
      <h3 style="margin:0">Deudas y préstamos</h3>
      <button class="btn btn-primary btn-sm" id="add-debt">+ Nueva deuda</button>
    </div>
    ${d.debts.length===0?'<div class="empty"><div class="icon">💳</div><h4>Sin deudas registradas</h4><button class="btn btn-primary" id="add-debt-empty">+ Añadir deuda</button></div>':`
    <div class="row-list">
      ${d.debts.map(de=>{
        const summary = Engine.amortizationSummary(de);
        const pctPaid = de.initial>0?Math.max(0,Math.min(100,(de.initial-de.outstanding)/de.initial*100)):0;
        return `<div class="row" data-edit-debt="${de.id}" style="flex-wrap:wrap">
          <div class="icon" style="background:var(--neg-soft);color:var(--neg-text);font-size:18px">💳</div>
          <div class="info" style="flex:1;min-width:0">
            <b>${h.esc(de.name)}</b>
            <div class="small">Interés ${de.rate||0}% · Cuota ${fmtMoney(de.payment)} · Inicio ${fmtMoney(de.initial)}</div>
            <div class="progress" style="margin-top:6px"><div style="width:${pctPaid}%"></div></div>
            <div class="small" style="margin-top:4px">Pagado ${pctPaid.toFixed(0)}% · Faltan ~${summary.monthsLeft} meses · ${summary.endDate}</div>
          </div>
          <div class="amount neg num">${fmtMoney(de.outstanding)}</div>
        </div>`;
      }).join('')}
    </div>`}
  </div>`;
}

/* =========================================================================
   SUSCRIPCIONES
   ========================================================================= */
function renderSuscripciones(){
  const d = App.state.data;
  const subs = d.subscriptions;
  const costs = Engine.subscriptionCosts(d);
  return `
  <div class="metric-row">
    <div class="metric brand"><div class="label">Coste mensual</div><div class="value num">${fmtMoney(costs.monthly)}</div></div>
    <div class="metric"><div class="label">Coste anual</div><div class="value num">${fmtMoney(costs.annual)}</div></div>
    <div class="metric"><div class="label">Activas</div><div class="value num">${costs.count}</div></div>
  </div>
  <div class="card">
    <div class="row-between mb-12">
      <h3 style="margin:0">Suscripciones</h3>
      <button class="btn btn-primary btn-sm" id="add-sub">+ Nueva suscripción</button>
    </div>
    ${subs.length===0?'<div class="empty"><div class="icon">📱</div><h4>Sin suscripciones</h4><button class="btn btn-primary" id="add-sub-empty">+ Añadir suscripción</button></div>':`
    <div class="row-list">
      ${subs.map(s=>`
        <div class="row" data-edit-sub="${s.id}">
          <div class="icon" style="background:${s.color||'#6366F1'}22;color:${s.color||'#6366F1'};font-size:18px">${catIcon(s.name)}</div>
          <div class="info">
            <b>${h.esc(s.name)} ${!s.active?'<span class="badge">Inactiva</span>':''}</b>
            <span class="small">${fmtMoney(s.amount)} / ${s.cycle==='monthly'?'mes':'año'} · Día ${s.day}</span>
          </div>
          <div class="amount num">${s.cycle==='monthly'?fmtMoney(s.amount):fmtMoney(Math.round(s.amount/12))}<div class="small">/mes</div></div>
        </div>`).join('')}
    </div>`}
  </div>`;
}

/* =========================================================================
   CALENDARIO
   ========================================================================= */
function renderCalendario(){
  const d = App.state.data;
  const mk = App.state.calMonth;
  const [y,mm] = mk.split('-').map(Number);
  const first = new Date(y,mm-1,1);
  const daysCount = daysInMonth(mk);
  const startDay = (first.getDay()+6)%7; // lunes = 0
  const todayKey = todayISO();
  const eventsByDay = {};
  // Subscriptions
  d.subscriptions.filter(s=>s.active).forEach(s=>{
    if(s.cycle==='monthly'){
      const dd = String(s.day).padStart(2,'0');
      const key = mk+'-'+dd;
      if(!eventsByDay[key]) eventsByDay[key]=[];
      eventsByDay[key].push({kind:'sub',name:s.name,amount:s.amount,color:s.color});
    } else {
      // yearly: assume same month
      const m = s.month || mk.slice(5);
      const k = mk.slice(0,5) + m + '-' + String(s.day).padStart(2,'0');
      if(k.startsWith(mk)){
        if(!eventsByDay[k]) eventsByDay[k]=[];
        eventsByDay[k].push({kind:'sub',name:s.name,amount:Math.round(s.amount/12),color:s.color});
      }
    }
  });
  // Debts
  d.debts.forEach(de=>{
    if(de.paymentDay && de.outstanding>0){
      const key = mk+'-'+String(de.paymentDay).padStart(2,'0');
      if(!eventsByDay[key]) eventsByDay[key]=[];
      eventsByDay[key].push({kind:'debt',name:de.name,amount:de.payment,color:'#DC2626'});
    }
  });
  // Recorded transactions this month
  d.transactions.forEach(t=>{
    if(t.date.startsWith(mk)){
      if(!eventsByDay[t.date]) eventsByDay[t.date]=[];
      eventsByDay[t.date].push({kind:'tx',name:t.description||d.categories.find(c=>c.id===t.categoryId)?.name||'?',amount:t.amount,color:t.type==='income'?'#16A34A':'#DC2626'});
    }
  });
  // Recurring (simple: none in demo)

  const cells = [];
  for(let i=0;i<startDay;i++) cells.push('<div class="cal-day muted"></div>');
  for(let d=1; d<=daysCount; d++){
    const iso = mk+'-'+String(d).padStart(2,'0');
    const evs = eventsByDay[iso]||[];
    const today = iso===todayKey;
    const selected = iso===App.state.selectedCalDay;
    cells.push(`<div class="cal-day ${today?'today':''} ${selected?'selected':''}" data-cal-day="${iso}">
      <div class="day-num">${d}</div>
      <div class="events">${evs.slice(0,3).map(e=>`<i style="background:${e.color||'#6366F1'}"></i>`).join('')}${evs.length>3?`<span style="font-size:10px">+${evs.length-3}</span>`:''}</div>
    </div>`);
  }
  const selected = App.state.selectedCalDay;
  const selectedEvents = selected?eventsByDay[selected]||[]:[];

  return `
  <div class="card cal-card">
    <div class="cal-head">
      <button class="icon-btn" id="cal-prev">←</button>
      <h3>${first.toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</h3>
      <button class="icon-btn" id="cal-next">→</button>
    </div>
    <div class="cal-grid">
      <div class="dn"><span class="dn-full">Lun</span><span class="dn-short">L</span></div><div class="dn"><span class="dn-full">Mar</span><span class="dn-short">M</span></div><div class="dn"><span class="dn-full">Mié</span><span class="dn-short">X</span></div><div class="dn"><span class="dn-full">Jue</span><span class="dn-short">J</span></div><div class="dn"><span class="dn-full">Vie</span><span class="dn-short">V</span></div><div class="dn"><span class="dn-full">Sáb</span><span class="dn-short">S</span></div><div class="dn"><span class="dn-full">Dom</span><span class="dn-short">D</span></div>
      ${cells.join('')}
    </div>
    ${selected?`
    <div class="cal-events">
      <h4 style="margin:0 0 8px;font-size:14px">${h.formatDateFull(selected)}</h4>
      ${selectedEvents.length===0?'<div class="small">Sin eventos programados este día</div>':
        selectedEvents.map(e=>`
          <div class="row">
            <div class="icon" style="background:${e.color||'#6366F1'}22;color:${e.color||'#6366F1'}">${e.kind==='sub'?'📱':e.kind==='debt'?'💳':'•'}</div>
            <div class="info"><b>${h.esc(e.name)}</b><span class="small">${e.kind==='sub'?'Suscripción':e.kind==='debt'?'Cuota':'Transacción'}</span></div>
            <div class="amount num ${e.kind==='sub'||e.kind==='debt'?'neg':''}">−${fmtMoney(e.amount)}</div>
          </div>`).join('')}
    </div>`:''}
  </div>
  <div class="card" style="margin-top:16px">
    <h3>Próximos pagos recurrentes</h3>
    <div class="row-list">
      ${d.subscriptions.filter(s=>s.active&&s.cycle==='monthly').map(s=>`
        <div class="row">
          <div class="icon" style="background:${s.color||'#6366F1'}22;color:${s.color||'#6366F1'}">${catIcon(s.name)}</div>
          <div class="info"><b>${h.esc(s.name)}</b><span class="small">Día ${s.day} de cada mes</span></div>
          <div class="amount neg num">−${fmtMoney(s.amount)}</div>
        </div>`).join('')||'<div class="empty small">Sin pagos recurrentes</div>'}
    </div>
  </div>`;
}

/* =========================================================================
   IA ADVISOR
   ========================================================================= */
function renderIA(){
  const d = App.state.data;
  const insights = AI.analyze(d);
  const health = Engine.healthScore(d);
  return `
  <div class="ai-card ai-card-hero">
    <h3>🤖 Asesor financiero familiar</h3>
    <p>Analizo vuestros datos reales (ingresos, gastos, presupuestos, deudas, objetivos) y os doy recomendaciones accionables. No invento información: cada sugerencia se basa en los números registrados.</p>
  </div>
  <div class="metric-row">
    <div class="metric brand"><div class="label">Salud financiera</div><div class="value num">${health.total}/100</div></div>
    <div class="metric"><div class="label">Sugerencias</div><div class="value num">${insights.length}</div></div>
    <div class="metric pos"><div class="label">Puntos fuertes</div><div class="value num">${health.parts.filter(p=>p.score/p.max>=0.7).length}</div></div>
    <div class="metric warn"><div class="label">A mejorar</div><div class="value num">${health.parts.filter(p=>p.score/p.max<0.5).length}</div></div>
  </div>
  <div class="card mb-16">
    <div class="row-between mb-12">
      <h3 style="margin:0">Recomendaciones</h3>
      <button class="btn btn-soft btn-sm" id="open-simulator">🎚 Simulador ¿Qué pasaría si...?</button>
    </div>
    ${insights.length===0?'<div class="empty"><p>¡Bien! No hay alertas activas. Seguid así.</p></div>':insights.map(renderAICard).join('')}
  </div>
  <div class="card">
    <h3>Desglose de la puntuación</h3>
    <div class="health-parts">
      ${health.parts.map(p=>`
        <div class="health-part" style="flex-direction:column;align-items:stretch">
          <div style="display:flex;justify-content:space-between"><span>${h.esc(p.label)}</span><b>${p.score}/${p.max}</b></div>
          <div class="small">${h.esc(p.detail)}</div>
          <div class="health-bar"><div style="width:${p.score/p.max*100}%"></div></div>
        </div>`).join('')}
    </div>
  </div>`;
}
function renderAICard(ins){
  const kindLabels = {warning:'Atención',neg:'Alerta',info:'Consejo',pos:'¡Bien!'};
  return `<div class="ai-card">
    <h3><span class="tag">${kindLabels[ins.kind]||'IA'}</span>${h.esc(ins.title)}</h3>
    <p>${h.esc(ins.body)}</p>
    ${ins.action?`<div class="impact">💡 ${h.esc(ins.action)}</div>`:''}
    <details><summary>¿Por qué? (explicación)</summary><div class="why">${h.esc(ins.why)}</div></details>
  </div>`;
}

/* =========================================================================
   PLANTILLAS
   ========================================================================= */
const BUILTIN_TEMPLATES = [
  {id:'tpl-family',name:'Familia estándar',desc:'Categorías y presupuestos equilibrados para pareja.',payload:{
    categories:DEFAULT_CATEGORIES.map(c=>c.name),
    budgets:{'Alimentación':60000,'Restaurantes':20000,'Transporte':15000,'Ocio':12000,'Vivienda':95000,'Suministros':15000,'Suscripciones':10000,'Compras':15000},
    goals:[{name:'Fondo de emergencia',icon:'🛡',target:1000000}],
    subscriptions:[{name:'Netflix',color:'#E50914',amount:1599,cycle:'monthly',day:8},{name:'Spotify',color:'#1DB954',amount:1099,cycle:'monthly',day:12}]
  }},
  {id:'tpl-vacation',name:'Ahorro para vacaciones',desc:'Enfocado en objetivos de viaje.',payload:{
    goals:[{name:'Vacaciones',icon:'✈',target:400000},{name:'Escapadas cortas',icon:'🏖',target:80000}]
  }},
  {id:'tpl-emergency',name:'Fondo de emergencia',desc:'Prioriza el colchón financiero.',payload:{
    goals:[{name:'Fondo de emergencia',icon:'🛡',target:1000000}],
    budgets:{'Ocio':8000,'Restaurantes':12000,'Compras':10000}
  }}
];
function renderPlantillas(){
  const d = App.state.data;
  const userTpls = d.templates||[];
  const globalTpls = DB.templates();
  return `
  <div class="card mb-16">
    <div class="row-between mb-12">
      <h3 style="margin:0">Plantillas de la comunidad</h3>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
      ${BUILTIN_TEMPLATES.map(t=>`
        <div class="card" style="padding:16px;background:var(--surface-2)">
          <b>${h.esc(t.name)}</b>
          <div class="small" style="margin:4px 0 12px">${h.esc(t.desc)}</div>
          <button class="btn btn-soft btn-sm btn-block" data-apply-tpl="${t.id}">Aplicar</button>
        </div>`).join('')}
    </div>
  </div>
  <div class="card mb-16">
    <div class="row-between mb-12">
      <h3 style="margin:0">Tus plantillas guardadas</h3>
      <button class="btn btn-primary btn-sm" id="save-tpl">+ Guardar configuración actual</button>
    </div>
    ${userTpls.length===0?'<div class="small">Aún no has guardado ninguna plantilla.</div>':`
    <div class="row-list">
      ${userTpls.map(t=>`
        <div class="row">
          <div class="icon" style="background:var(--brand-soft);color:var(--brand-text)">📋</div>
          <div class="info"><b>${h.esc(t.name)}</b><span class="small">${t.shared?'Compartida (código: '+h.esc(t.shareCode)+')':'Privada'}</span></div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" data-apply-tpl-user="${t.id}">Aplicar</button>
            ${!t.shared?`<button class="btn btn-soft btn-sm" data-share-tpl="${t.id}">Compartir</button>`:`<span class="kbd-chip">${h.esc(t.shareCode)}</span>`}
            <button class="btn btn-danger btn-sm" data-del-tpl="${t.id}">Borrar</button>
          </div>
        </div>`).join('')}
    </div>`}
  </div>
  <div class="card">
    <h3>Importar plantilla por código</h3>
    <div style="display:flex;gap:8px">
      <input class="input" id="tpl-code" placeholder="Introduce el código" style="text-transform:uppercase">
      <button class="btn btn-primary" id="import-tpl-code">Importar</button>
    </div>
  </div>`;
}

/* =========================================================================
   AJUSTES
   ========================================================================= */
function renderAjustes(){
  const u = App.state.user;
  const sp = App.state.space;
  const members = (sp?.members||[]).map(m=>({...m,u:Family.getUserById(m.userId)}));
  return `
  <div class="grid-2">
    <div class="card">
      <h3>Perfil</h3>
      <div class="field"><label>Nombre</label><input class="input" id="prof-name" value="${h.esc(u.name)}"></div>
      <div class="field"><label>Email</label><input class="input" value="${h.esc(u.email)}" disabled></div>
      <button class="btn btn-primary" id="save-prof">Guardar cambios</button>
      <hr style="border:none;border-top:1px solid var(--border);margin:18px 0">
      <h3>Cambiar contraseña</h3>
      <div class="field"><label>Contraseña actual</label><input class="input" type="password" id="pw-old"></div>
      <div class="field"><label>Nueva contraseña</label><input class="input" type="password" id="pw-new"></div>
      <button class="btn btn-ghost" id="change-pw">Actualizar</button>
    </div>
    <div class="card">
      <h3>Apariencia</h3>
      <div class="field"><label>Tema</label>
        <div class="seg">
          <button data-theme="light" ${!document.documentElement.classList.contains('dark')?'class="active"':''}>☀ Claro</button>
          <button data-theme="dark" ${document.documentElement.classList.contains('dark')?'class="active"':''}>🌙 Oscuro</button>
          <button data-theme="system">⚙ Sistema</button>
        </div>
      </div>
      <h3 style="margin-top:20px">Espacio familiar</h3>
      <div class="field"><label>Nombre</label><input class="input" id="space-name" value="${h.esc(sp?.name||'')}"></div>
      <button class="btn btn-ghost" id="save-space">Guardar</button>
      <div class="field" style="margin-top:14px"><label>Código de invitación</label>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="kbd-chip" style="font-size:15px;padding:6px 12px;letter-spacing:.15em">${h.esc(sp?.inviteCode||'')}</span>
          <button class="btn btn-ghost btn-sm" id="copy-code">Copiar</button>
        </div>
      </div>
      <h3 style="margin-top:20px">Miembros</h3>
      ${members.map(m=>`
        <div class="row">
          <div class="avatar" style="background:${stringColor(m.u?.name||'?')}">${h.esc((m.u?.name||'?')[0].toUpperCase())}</div>
          <div class="info"><b>${h.esc(m.u?.name||'?')}</b><span class="small">${h.esc(m.u?.email||'')}</span></div>
          ${m.u?.id===u.id?'<span class="badge brand">Tú</span>':'<button class="btn btn-ghost btn-sm" data-switch-user="'+m.u?.id+'">Usar como</button>'}
        </div>`).join('')}
      <button class="btn btn-ghost btn-block" style="margin-top:10px" id="switch-user">↺ Cambiar de usuario</button>
      <hr style="border:none;border-top:1px solid var(--border);margin:18px 0">
      <h3>Datos</h3>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" id="export-all">⬇ Exportar todo (CSV)</button>
        <button class="btn btn-ghost btn-sm" id="import-data">⬆ Importar</button>
        <button class="btn btn-ghost btn-sm" id="load-demo">✨ Cargar demo</button>
        <button class="btn btn-danger btn-sm" id="reset-space">🗑 Resetear datos</button>
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:18px 0">
      <button class="btn btn-danger btn-block" id="logout">Cerrar sesión</button>
    </div>
  </div>`;
}

