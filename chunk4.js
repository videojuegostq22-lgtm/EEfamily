
/* =========================================================================
   MAIN SHELL (sidebar + bnav + content area)
   ========================================================================= */
function renderShell(content){
  const root = document.getElementById('app');
  const s = App.state.space;
  const members = (s?.members||[]).map(m=>{ const u=Family.getUserById(m.userId); return {u,...m}; }).filter(m=>m.u);
  const currentUserId = App.state.user.id;
  const period = App.state.period;
  const periodButtons = [
    {k:'this-month',l:'Este mes'},
    {k:'last-month',l:'Anterior'},
    {k:'3m',l:'3M'},
    {k:'6m',l:'6M'},
    {k:'ytd',l:'Año'},
    {k:'last-year',l:'Año ant.'}
  ];
  const navItems = [
    {k:'dashboard',l:'Dashboard',icon:'M3 12l9-9 9 9M5 10v10h14V10'},
    {k:'movimientos',l:'Movimientos',icon:'M4 6h16M4 12h16M4 18h16'},
    {k:'presupuestos',l:'Presupuestos',icon:'M3 3h18v18H3zM9 9h6v6H9z'},
    {k:'objetivos',l:'Objetivos',icon:'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z'},
    {k:'cuentas',l:'Cuentas',icon:'M3 10h18M3 6h18v12H3z'},
    {k:'patrimonio',l:'Patrimonio',icon:'M3 20V6l9-3 9 3v14M9 20v-6h6v6'},
    {k:'deudas',l:'Deudas',icon:'M4 4h16v16H4zM8 10h8M8 14h5'},
    {k:'suscripciones',l:'Suscripciones',icon:'M4 6h16M4 12h16M4 18h10'},
    {k:'calendario',l:'Calendario',icon:'M4 7h16v13H4zM8 3v4M16 3v4M4 12h16'},
    {k:'ia',l:'IA Advisor',icon:'M12 2a10 10 0 100 20 10 10 0 000-20zM8 14s1 2 4 2 4-2 4-2M9 9h.01M15 9h.01'},
    {k:'plantillas',l:'Plantillas',icon:'M4 4h16v16H4zM4 9h16M9 4v16'},
    {k:'ajustes',l:'Ajustes',icon:'M12 8a4 4 0 100 8 4 4 0 000-8zM2 12h3M19 12h3M12 2v3M12 19v3'}
  ];
  const unreadCount = (App.state.data?.notifications||[]).filter(n=>!n.read?.includes(currentUserId)).length;

  root.innerHTML = `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">FF</div><span>Family Finance</span></div>
      <div class="space-pill">
        <div class="avatars">
          ${members.map(m=>`<div class="avatar" style="background:${stringColor(m.u.name)}">${h.esc((m.u.name||'?')[0].toUpperCase())}</div>`).join('')}
        </div>
        <div class="meta"><b>${h.esc(s?.name||'Sin espacio')}</b><span>${members.length} miembro${members.length===1?'':'s'}</span></div>
      </div>
      <nav style="display:flex;flex-direction:column;gap:2px;flex:1">
        ${navItems.map(n=>`
          <a class="nav-item ${App.state.route===n.k?'active':''}" data-nav="${n.k}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${n.icon}"/></svg>
            ${h.esc(n.l)}${n.k==='ia'?'<span class="badge brand" style="margin-left:auto">AI</span>':''}
          </a>`).join('')}
      </nav>
      <div class="nav-sep"></div>
      <div class="sidebar-footer">
        <button data-nav="ajustes">⚙ Ajustes</button>
        <button id="theme-btn">${document.documentElement.classList.contains('dark')?'☀':'🌙'}</button>
        <button id="logout-btn">Salir</button>
      </div>
    </aside>
    <main class="main">
      <div class="topbar">
        <h1>${titleForRoute()}</h1>
        ${App.state.route==='dashboard'||App.state.route==='movimientos'||App.state.route==='presupuestos'?`
        <div class="period">
          ${periodButtons.map(p=>`<button class="${period===p.k?'active':''}" data-period="${p.k}">${h.esc(p.l)}</button>`).join('')}
          <button class="${period==='custom'?'active':''}" data-period="custom">⚙</button>
        </div>
        <div class="dd-wrap">
          <button class="icon-btn" id="notif-btn" title="Notificaciones" style="position:relative">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0"/></svg>
            ${unreadCount?`<span style="position:absolute;top:2px;right:2px;background:var(--neg);color:white;border-radius:99px;font-size:10px;padding:1px 5px;font-weight:700">${unreadCount}</span>`:''}
          </button>
          ${App.state.ddOpen==='notif'?renderNotifDropdown():''}
        </div>
        `:''}
      </div>
      ${content}
    </main>
  </div>
  ${App.state.bnavSheet ? '' : `<button class="fab ${App.state.fabOpen?'fab-active':''}" id="fab-main" aria-label="Añadir">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
  </button>
  <div class="fab-menu ${App.state.fabOpen?'open':''}" id="fab-menu">
    <button data-fab="expense">💸 Gasto</button>
    <button data-fab="income">💰 Ingreso</button>
    <button data-fab="transfer">🔁 Transferencia</button>
  </div>`}
  <nav class="bnav">
    <div class="bnav-inner">
      ${['dashboard','movimientos','presupuestos','ia'].map(k=>`
        <button class="${App.state.route===k?'active':''}" data-nav="${k}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${navItems.find(n=>n.k===k).icon}"/></svg>
          ${h.esc(navItems.find(n=>n.k===k).l)}
        </button>`).join('')}
      <button data-action="more" class="${App.state.bnavSheet?'active':''}" style="position:relative">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
        Más
      </button>
    </div>
  </nav>
  <div class="bnav-sheet ${App.state.bnavSheet?'open':''}" id="bnav-sheet">
    <div class="sheet">
      <div class="grip"></div>
      <h3>Más secciones</h3>
      <div class="sheet-grid">
        ${navItems.filter(n=>!['dashboard','movimientos','presupuestos','ia'].includes(n.k)).map(n=>`
          <div class="sheet-item" data-nav="${n.k}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${n.icon}"/></svg>
            <b>${h.esc(n.l)}</b>
          </div>`).join('')}
      </div>
      <button class="btn btn-ghost btn-block" id="close-sheet">Cerrar</button>
    </div>
  </div>`;

  root.querySelectorAll('[data-nav]').forEach(el=>el.addEventListener('click',e=>{
    const k = el.dataset.nav; App.state.bnavSheet=false; App.nav(k);
  }));
  root.querySelectorAll('[data-period]').forEach(el=>el.addEventListener('click',()=>{
    const k = el.dataset.period;
    if(k==='custom'){
      showCustomPeriodModal();
    } else {
      App.setPeriod(k);
    }
  }));
  root.querySelector('#fab-main')?.addEventListener('click',()=>{
    App.state.fabOpen = !App.state.fabOpen; renderMain();
  });
  root.querySelector('#fab-menu')?.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    App.state.fabOpen=false;
    openTxModal(b.dataset.fab);
  }));
  root.querySelector('#theme-btn')?.addEventListener('click',toggleTheme);
  root.querySelector('#logout-btn')?.addEventListener('click',()=>Auth.logout());
  root.querySelector('#notif-btn')?.addEventListener('click',e=>{
    e.stopPropagation();
    App.state.ddOpen = App.state.ddOpen==='notif'?null:'notif';
    if(App.state.ddOpen==='notif'){
      // mark read
      const u = App.state.user;
      App.state.data.notifications.forEach(n=>{
        if(!n.read.includes(u.id)) n.read.push(u.id);
      });
      DB.saveData(App.state.space.id,App.state.data);
    }
    renderMain();
  });
  document.addEventListener('click',()=>{ if(App.state.ddOpen){App.state.ddOpen=null; renderMain();} },{once:true});
  const sheet = root.querySelector('#bnav-sheet');
  root.querySelector('[data-action="more"]')?.addEventListener('click',()=>{
    App.state.bnavSheet=true; renderMain();
  });
  sheet?.addEventListener('click',e=>{
    if(e.target===sheet){ App.state.bnavSheet=false; renderMain(); }
  });
  root.querySelector('#close-sheet')?.addEventListener('click',()=>{
    App.state.bnavSheet=false; renderMain();
  });
}

function titleForRoute(){
  const m = {dashboard:'Dashboard',movimientos:'Movimientos',presupuestos:'Presupuestos',objetivos:'Objetivos',cuentas:'Cuentas',patrimonio:'Patrimonio',deudas:'Deudas',suscripciones:'Suscripciones',calendario:'Calendario',ia:'IA Advisor',plantillas:'Plantillas',ajustes:'Ajustes'};
  return m[App.state.route]||'Family Finance';
}
function stringColor(s){
  const colors=['#6366F1','#EC4899','#F59E0B','#10B981','#0EA5E9','#A855F7','#EF4444','#14B8A6'];
  let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))&0x7fffffff;
  return colors[h%colors.length];
}

function renderNotifDropdown(){
  const notifs = App.state.data.notifications.slice(0,15);
  return `<div class="dd">
    ${notifs.length===0?'<div class="dd-empty">Sin notificaciones</div>':
      notifs.map(n=>`
        <div class="dd-item">
          <div style="font-size:16px">${n.kind==='pos'?'✅':n.kind==='neg'?'⚠️':n.kind==='warning'?'⚡':'ℹ️'}</div>
          <div><b>${h.esc(n.text)}</b><time>${h.timeAgo(n.at)}</time></div>
        </div>`).join('')}
  </div>`;
}

function renderMain(){
  const content = renderRoute();
  renderShell(content);
}

function renderRoute(){
  switch(App.state.route){
    case 'dashboard': return renderDashboard();
    case 'movimientos': return renderMovimientos();
    case 'presupuestos': return renderPresupuestos();
    case 'objetivos': return renderObjetivos();
    case 'cuentas': return renderCuentas();
    case 'patrimonio': return renderPatrimonio();
    case 'deudas': return renderDeudas();
    case 'suscripciones': return renderSuscripciones();
    case 'calendario': return renderCalendario();
    case 'ia': return renderIA();
    case 'plantillas': return renderPlantillas();
    case 'ajustes': return renderAjustes();
    default: return renderDashboard();
  }
}

/* =========================================================================
   DASHBOARD
   ========================================================================= */
function renderDashboard(){
  const d = App.state.data;
  const range = Engine.getRange(App.state.period, App.state.customRange);
  App.state.periodLabel = range.label;
  const txs = Engine.txInRange(d.transactions, range.from, range.to);
  const totals = Engine.totals(txs);
  const health = Engine.healthScore(d);
  const cmk = monthKey(new Date());

  // Charts
  const chart1 = chartIncomeExpenseSavings();
  const chart2 = chartByCategory(txs,d);
  const chart3 = chartSavingsTrend(d);
  const chart4 = chartNetWorthTrend(d);
  const chart5 = chartBudgetVsSpent(d,cmk);

  const budgetsThisMonth = d.budgets.filter(b=>b.month===cmk);
  const goals = d.goals.slice(0,3);

  const recentActivity = d.activity.slice(0,6);

  const aiInsights = AI.analyze(d).slice(0,3);

  return `
  <div class="metric-row">
    <div class="metric pos"><div class="label">Ingresos</div><div class="value num">${fmtMoney(totals.income)}</div><div class="sub">${range.label}</div></div>
    <div class="metric neg"><div class="label">Gastos</div><div class="value num">${fmtMoney(totals.expense)}</div><div class="sub">${range.label}</div></div>
    <div class="metric ${totals.savings>=0?'pos':'neg'}"><div class="label">Ahorro</div><div class="value num">${fmtMoney(totals.savings)}</div><div class="sub">Ingresos − Gastos</div></div>
    <div class="metric brand"><div class="label">Tasa de ahorro</div><div class="value num">${(totals.rate*100).toFixed(1)}%</div><div class="sub">${totals.income>0?'Ahorro / Ingresos':'Sin ingresos'}</div></div>
  </div>

  <div class="health-card">
    <div class="health-main">
      <div class="health-ring">
        <svg viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" fill="none" stroke="var(--border)" stroke-width="12"/>
          <circle cx="80" cy="80" r="70" fill="none" stroke="var(--brand)" stroke-width="12"
            stroke-linecap="round" stroke-dasharray="${(health.total/health.max)*440} 440"
            transform="rotate(-90 80 80)"/>
        </svg>
        <div class="score"><b>${health.total}</b><span>de 100</span></div>
      </div>
      <div class="health-body" style="flex:1;min-width:0">
        <h2>Salud financiera</h2>
        <p>${healthLabel(health.total)}</p>
        <div class="health-parts">
          ${health.parts.map(p=>`
            <div class="health-part">
              <div style="flex:1">
                <div>${h.esc(p.label)}</div>
                <div class="small">${h.esc(p.detail)}</div>
                <div class="health-bar"><div style="width:${(p.score/p.max)*100}%"></div></div>
              </div>
              <b>${p.score}/${p.max}</b>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </div>

  <div class="charts-grid">
    <div class="chart c-8">${chart1}</div>
    <div class="chart c-4">${chart2}</div>
    <div class="chart c-6">${chart3}</div>
    <div class="chart c-6">${chart4}</div>
    <div class="chart c-12">${chart5}</div>
  </div>

  <div class="grid-2-1" style="margin-top:4px">
    <div>
      ${budgetsThisMonth.length?`
      <div class="card mb-16">
        <div class="row-between mb-12">
          <h3 style="margin:0">Presupuestos este mes</h3>
          <button class="btn btn-ghost btn-sm" data-nav="presupuestos">Ver todos →</button>
        </div>
        <div class="row-list">
          ${budgetsThisMonth.slice(0,5).map(b=>renderBudgetRow(b,d)).join('')}
        </div>
      </div>`:''}
      ${goals.length?`
      <div class="card mb-16">
        <div class="row-between mb-12">
          <h3 style="margin:0">Objetivos</h3>
          <button class="btn btn-ghost btn-sm" data-nav="objetivos">Ver todos →</button>
        </div>
        ${goals.map(g=>renderGoalCard(g)).join('')}
      </div>`:''}
      ${aiInsights.length?`
      <div class="mb-16">
        <h3 style="font-size:16px;margin:0 0 10px;display:flex;align-items:center;gap:8px">🤖 Sugerencias de la IA</h3>
        ${aiInsights.map(renderAICard).join('')}
        <button class="btn btn-ghost btn-sm" data-nav="ia">Ver análisis completo →</button>
      </div>`:''}
    </div>
    <div>
      <div class="card mb-16">
        <div class="row-between mb-12">
          <h3 style="margin:0">Actividad reciente</h3>
        </div>
        ${recentActivity.length===0?'<div class="empty"><div class="icon">📝</div><p>Aún no hay actividad</p></div>':
          recentActivity.map(a=>{
            const u = Family.getUserById(a.userId);
            return `<div class="activity">
              <div class="ava" style="background:${stringColor(u?.name||'?')};color:white">${h.esc((u?.name||'?')[0].toUpperCase())}</div>
              <div><b>${h.esc(u?.name||'Usuario')}</b> ${h.esc(a.verb)} <b>${h.esc(a.label)}</b><br><time>${h.timeAgo(a.at)}</time></div>
            </div>`;
          }).join('')}
      </div>
      <div class="card">
        <h3>Resumen rápido</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:13.5px">
          <div class="row-between"><span>Cuentas</span><b class="num">${fmtMoney(Engine.totalBalance(d))}</b></div>
          <div class="row-between"><span>Patrimonio neto</span><b class="num">${fmtMoney(Engine.netWorth(d))}</b></div>
          <div class="row-between"><span>Deuda pendiente</span><b class="num">${fmtMoney(Engine.debtOutstanding(d))}</b></div>
          <div class="row-between"><span>Suscripciones (mensual)</span><b class="num">${fmtMoney(Engine.subscriptionCosts(d).monthly)}</b></div>
        </div>
      </div>
    </div>
  </div>
  `;
}

function healthLabel(total){
  if(total>=85) return 'Excelente. Estáis gestionando muy bien vuestra economía.';
  if(total>=70) return 'Buena salud financiera. Hay pequeños ajustes que pueden mejorarla.';
  if(total>=50) return 'Salud razonable. Algunas áreas necesitan atención.';
  return 'Hay varias áreas que requieren revisión y mejora.';
}

function renderBudgetRow(b,d){
  const cat = d.categories.find(c=>c.id===b.categoryId);
  const now = new Date();
  const cmk = monthKey(now);
  const cmFrom = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';
  const cmTo = dateToISO(now);
  const spent = d.transactions.filter(t=>t.type==='expense'&&t.categoryId===b.categoryId&&t.date>=cmFrom&&t.date<=cmTo).reduce((s,t)=>s+t.amount,0);
  const pct = b.limit>0 ? Math.min(150, spent/b.limit*100) : 0;
  const status = pct>=100?'danger':pct>=80?'warn':'pos';
  return `<div class="row" data-edit-budget="${b.id}">
    <div class="icon" style="background:${cat?.color||'#94A3B8'}22;color:${cat?.color||'#94A3B8'}">${catIcon(cat?.name||'')}</div>
    <div class="info" style="flex:1">
      <b>${h.esc(cat?.name||'Categoría')}</b>
      <div class="row-between" style="margin-top:2px"><span class="small num">${fmtMoney(spent)} de ${fmtMoney(b.limit)}</span><span class="small num">${pct.toFixed(0)}%</span></div>
      <div class="progress ${status}"><div style="width:${pct}%"></div></div>
    </div>
  </div>`;
}
function renderGoalCard(g){
  const pct = g.target>0 ? Math.min(100, g.saved/g.target*100) : 0;
  const eta = Engine.goalETA(App.state.data,g);
  return `<div class="goal-card">
    <div class="top">
      <div class="emoji">${g.icon||'🎯'}</div>
      <div style="flex:1"><b>${h.esc(g.name)}</b><div class="small">Objetivo: ${fmtMoney(g.target)}</div></div>
      <b class="num-big num">${pct.toFixed(0)}%</b>
    </div>
    <div class="progress pos"><div style="width:${pct}%"></div></div>
    <div class="numbers">
      <span>Ahorrado <b class="num">${fmtMoney(g.saved)}</b></span>
      <span>Faltan <b class="num">${fmtMoney(eta.remaining)}</b></span>
      <span>${g.deadline?'Plazo '+g.deadline:'~'+eta.months+' meses'}</span>
    </div>
  </div>`;
}

/* =========================================================================
   CHARTS (SVG)
   ========================================================================= */
function chartIncomeExpenseSavings(){
  const d = App.state.data;
  const series = Engine.savingsRateHistory(d,6);
  const max = Math.max(1, ...series.flatMap(m=>[m.income,m.expense]));
  const W=560,H=220,pad=32;
  const barW = (W-pad*2)/series.length/3 - 2;
  let bars = '';
  series.forEach((m,i)=>{
    const x = pad + i*(W-pad*2)/series.length;
    const hI = (m.income/max)*(H-pad*2);
    const hE = (m.expense/max)*(H-pad*2);
    const hS = (Math.max(0,m.savings)/max)*(H-pad*2);
    bars += `
      <rect x="${x}" y="${H-pad-hI}" width="${barW}" height="${hI}" rx="3" fill="#16A34A" opacity=".85"/>
      <rect x="${x+barW+2}" y="${H-pad-hE}" width="${barW}" height="${hE}" rx="3" fill="#DC2626" opacity=".85"/>
      <rect x="${x+2*barW+4}" y="${H-pad-hS}" width="${barW}" height="${hS}" rx="3" fill="#6366F1" opacity=".85"/>
      <text x="${x+1.5*barW+2}" y="${H-12}" text-anchor="middle" font-size="10" fill="var(--text-3)">${m.mk.slice(5)}</text>
    `;
  });
  return `<h3>Ingresos vs gastos vs ahorro</h3>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      ${[0,.25,.5,.75,1].map(t=>`<line x1="${pad}" x2="${W-pad}" y1="${pad+(H-2*pad)*t}" y2="${pad+(H-2*pad)*t}" stroke="var(--border)" stroke-dasharray="2 3"/>`).join('')}
      ${bars}
    </svg>
    <div class="legend">
      <span><span class="dot" style="background:#16A34A"></span>Ingresos</span>
      <span><span class="dot" style="background:#DC2626"></span>Gastos</span>
      <span><span class="dot" style="background:#6366F1"></span>Ahorro</span>
    </div>`;
}
function chartByCategory(txs,d){
  const byCat = Engine.byCategory(txs).filter(c=>c.expense>0).sort((a,b)=>b.expense-a.expense).slice(0,6);
  const total = byCat.reduce((s,c)=>s+c.expense,0);
  if(!byCat.length) return `<h3>Gastos por categoría</h3><div class="empty"><p>Sin gastos en el periodo</p></div>`;
  const R=80, cx=110, cy=90;
  let start = -Math.PI/2, paths='';
  byCat.forEach(c=>{
    const cat = d.categories.find(x=>x.id===c.categoryId);
    const ang = (c.expense/total)*Math.PI*2;
    const end = start+ang;
    const large = ang>Math.PI?1:0;
    const x1=cx+R*Math.cos(start), y1=cy+R*Math.sin(start);
    const x2=cx+R*Math.cos(end), y2=cy+R*Math.sin(end);
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z" fill="${cat?.color||'#94A3B8'}" stroke="var(--surface)" stroke-width="2"/>`;
    start = end;
  });
  const legend = byCat.map(c=>{
    const cat = d.categories.find(x=>x.id===c.categoryId);
    const pct = (c.expense/total*100).toFixed(0);
    return `<span><span class="dot" style="background:${cat?.color||'#94A3B8'}"></span>${h.esc(cat?.name||'?')} ${pct}%</span>`;
  }).join('');
  return `<h3>Gastos por categoría</h3>
    <svg viewBox="0 0 220 180">${paths}<circle cx="${cx}" cy="${cy}" r="45" fill="var(--surface)"/><text x="${cx}" y="${cy-4}" text-anchor="middle" font-size="11" fill="var(--text-3)">Total</text><text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text)">${fmtMoney(total)}</text></svg>
    <div class="legend">${legend}</div>`;
}
function chartSavingsTrend(d){
  const series = Engine.savingsRateHistory(d,12);
  if(!series.length) return `<h3>Evolución del ahorro</h3><div class="empty"><p>Sin datos</p></div>`;
  const W=520,H=200,pad=32;
  const vals = series.map(s=>s.savings);
  const minV = Math.min(0,...vals);
  const maxV = Math.max(1,...vals);
  const range = maxV-minV || 1;
  const pts = series.map((s,i)=>{
    const x = pad + i*((W-pad*2)/(series.length-1||1));
    const y = H-pad - ((s.savings-minV)/range)*(H-pad*2);
    return `${x},${y}`;
  });
  const zeroY = H-pad - ((0-minV)/range)*(H-pad*2);
  return `<h3>Evolución del ahorro</h3>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <line x1="${pad}" x2="${W-pad}" y1="${zeroY}" y2="${zeroY}" stroke="var(--border)" stroke-dasharray="2 3"/>
      <polyline points="${pts.join(' ')}" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${series.map((s,i)=>{
        const x = pad + i*((W-pad*2)/(series.length-1||1));
        const y = H-pad - ((s.savings-minV)/range)*(H-pad*2);
        return `<circle cx="${x}" cy="${y}" r="3" fill="var(--brand)"/>`;
      }).join('')}
      ${[0,Math.floor(series.length/2),series.length-1].map(i=>{
        const x = pad + i*((W-pad*2)/(series.length-1||1));
        return `<text x="${x}" y="${H-12}" text-anchor="middle" font-size="10" fill="var(--text-3)">${series[i].mk.slice(5)}</text>`;
      }).join('')}
    </svg>
    <div class="legend"><span><span class="dot" style="background:var(--brand)"></span>Ahorro mensual</span></div>`;
}
function chartNetWorthTrend(d){
  const series = [];
  const now = new Date();
  for(let i=11;i>=0;i--){
    const dt = new Date(now.getFullYear(),now.getMonth()-i+1,0); // last day of month i months ago
    const iso = dateToISO(dt);
    const assets = d.accounts.reduce((s,a)=>s+Engine.accountBalance(d,a.id,iso),0);
    // Approximate debt: current outstanding + sum of installments paid since iso
    const debtPaymentsSince = d.debts.reduce((s,de)=>{
      const txs = d.transactions.filter(t=>t.type==='expense'&&t.categoryId===d.categories.find(c=>c.name==='Deudas')?.id&&t.date>iso);
      return s + txs.reduce((ss,t)=>ss+t.amount,0); // rough
    },0);
    const debt = Math.max(0, Engine.debtOutstanding(d) - debtPaymentsSince);
    series.push({mk:iso.slice(0,7),nw:assets-debt});
  }
  const W=520,H=200,pad=32;
  const vals = series.map(s=>s.nw);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV-minV || 1;
  const pts = series.map((s,i)=>{
    const x = pad + i*((W-pad*2)/(series.length-1||1));
    const y = H-pad - ((s.nw-minV)/range)*(H-pad*2);
    return `${x},${y}`;
  }).join(' ');
  const area = `M${pad},${H-pad} L${series.map((s,i)=>{
    const x = pad + i*((W-pad*2)/(series.length-1||1));
    const y = H-pad - ((s.nw-minV)/range)*(H-pad*2);
    return `${x},${y}`;
  }).join(' L')} L${W-pad},${H-pad} Z`;
  return `<h3>Evolución del patrimonio</h3>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <path d="${area}" fill="var(--brand)" opacity=".12"/>
      <polyline points="${pts}" fill="none" stroke="var(--brand)" stroke-width="2.5"/>
      ${[0,Math.floor(series.length/2),series.length-1].map(i=>{
        const x = pad + i*((W-pad*2)/(series.length-1||1));
        return `<text x="${x}" y="${H-12}" text-anchor="middle" font-size="10" fill="var(--text-3)">${series[i].mk.slice(5)}</text>`;
      }).join('')}
    </svg>
    <div class="legend"><span><span class="dot" style="background:var(--brand)"></span>Patrimonio neto actual: ${fmtMoney(Engine.netWorth(d))}</span></div>`;
}
function chartBudgetVsSpent(d,cmk){
  const budgets = d.budgets.filter(b=>b.month===cmk);
  if(!budgets.length) return `<h3>Presupuesto vs gasto</h3><div class="empty"><p>Define presupuestos para este mes para ver comparativa</p></div>`;
  const now = new Date();
  const cmFrom = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';
  const cmTo = dateToISO(now);
  const items = budgets.map(b=>{
    const cat = d.categories.find(c=>c.id===b.categoryId);
    const spent = d.transactions.filter(t=>t.type==='expense'&&t.categoryId===b.categoryId&&t.date>=cmFrom&&t.date<=cmTo).reduce((s,t)=>s+t.amount,0);
    return {name:cat?.name||'?',limit:b.limit,spent,color:cat?.color||'#94A3B8'};
  }).sort((a,b)=>b.limit-a.limit);
  const max = Math.max(1,...items.map(i=>Math.max(i.limit,i.spent)));
  const W=640, barH=22, rowH=barH+14;
  const H = items.length*rowH + 40;
  const pad = 120;
  let rows = '';
  items.forEach((it,i)=>{
    const y = i*rowH + 20;
    const wL = (it.limit/max)*(W-pad-30);
    const wS = (it.spent/max)*(W-pad-30);
    const over = it.spent>it.limit;
    rows += `
      <text x="${pad-8}" y="${y+barH/2+4}" text-anchor="end" font-size="12" fill="var(--text)">${h.esc(it.name)}</text>
      <rect x="${pad}" y="${y}" width="${wL}" height="${barH}" rx="4" fill="var(--surface-3)"/>
      <rect x="${pad}" y="${y}" width="${wS}" height="${barH}" rx="4" fill="${over?'#DC2626':it.color}" opacity=".9"/>
      <text x="${pad+wS+6}" y="${y+barH/2+4}" font-size="11" fill="var(--text-2)" font-variant-numeric="tabular-nums">${fmtMoney(it.spent)} / ${fmtMoney(it.limit)}</text>
    `;
  });
  return `<h3>Presupuesto vs gasto (este mes)</h3><svg viewBox="0 0 ${W} ${H}">${rows}</svg>`;
}

