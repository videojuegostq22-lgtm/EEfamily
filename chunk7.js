
/* =========================================================================
   CSV EXPORT / IMPORT
   ========================================================================= */
function exportCSV(){
  const d = App.state.data;
  const header = 'fecha,tipo,categoria,cuenta,descripcion,importe,creado_por\n';
  const rows = d.transactions.map(t=>{
    const cat = d.categories.find(c=>c.id===t.categoryId);
    const acc = d.accounts.find(a=>a.id===t.accountId);
    const u = Family.getUserById(t.createdBy);
    const amt = t.type==='income' ? t.amount : -t.amount;
    return [t.date,t.type,cat?.name||'',acc?.name||'',(t.description||'').replace(/,/g,' '),(amt/100).toFixed(2),u?.name||''].join(',');
  }).join('\n');
  const blob = new Blob(['\ufeff'+header+rows],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'family-finance-'+todayISO()+'.csv';
  a.click(); URL.revokeObjectURL(url);
  Notif.show('CSV descargado','pos');
}
function importCSV(){
  const input = document.createElement('input');
  input.type='file'; input.accept='.csv,text/csv';
  input.onchange = e=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      const text = ev.target.result;
      const lines = text.split(/\r?\n/).filter(l=>l.trim());
      if(lines.length<2){ Notif.show('Archivo vacío','neg'); return; }
      // detect header
      const first = lines[0].toLowerCase();
      const startIdx = first.includes('fecha')||first.includes('date') ? 1 : 0;
      let added = 0, errors = 0;
      const d = App.state.data;
      const defAcc = d.accounts[0];
      if(!defAcc){ Notif.show('Primero crea al menos una cuenta','neg'); return; }
      for(let i=startIdx;i<lines.length;i++){
        const cols = lines[i].split(',').map(s=>s.trim());
        if(cols.length<5) { errors++; continue; }
        const date = cols[0];
        const type = (cols[1]||'').toLowerCase()==='income'?'income':'expense';
        const catName = cols[2]||'Otros';
        let cat = d.categories.find(c=>c.name.toLowerCase()===catName.toLowerCase()&&c.type===(type==='income'?'income':'expense'));
        if(!cat){
          cat = {id:uid('c'),name:catName,type:type==='income'?'income':'expense',color:type==='income'?'#16A34A':'#94A3B8',custom:true};
          d.categories.push(cat);
        }
        const desc = cols[4]||'';
        const amt = parseMoney(cols[5]||cols[cols.length-1]);
        if(!date||isNaN(new Date(date).getTime())||amt<=0){ errors++; continue; }
        d.transactions.push({id:uid('t'),type,amount:amt,date: date.length===10?date:date.slice(0,10),categoryId:cat.id,accountId:defAcc.id,description:desc,createdBy:App.state.user.id,createdAt:nowISO(),updatedAt:nowISO(),version:1});
        added++;
      }
      App.commit(`Importados ${added} movimientos`);
      Notif.show(`Importados ${added} movimientos${errors?' · '+errors+' con error':''}`,'pos',4000);
    };
    reader.readAsText(file);
  };
  input.click();
}

/* =========================================================================
   THEME
   ========================================================================= */
function initTheme(){
  const saved = localStorage.getItem('ff_theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = saved==='dark' || (saved==null && systemDark);
  document.documentElement.classList.toggle('dark',dark);
}
function toggleTheme(){
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('ff_theme', isDark?'dark':'light');
  App.render();
}
function setTheme(theme){
  if(theme==='system'){
    localStorage.removeItem('ff_theme');
    document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
  } else {
    localStorage.setItem('ff_theme',theme);
    document.documentElement.classList.toggle('dark', theme==='dark');
  }
  App.render();
}

/* =========================================================================
   TEMPLATES ACTIONS
   ========================================================================= */
function applyTemplate(tpl){
  const d = App.state.data;
  const cmk = monthKey(new Date());
  if(tpl.payload.budgets){
    Object.entries(tpl.payload.budgets).forEach(([name,limit])=>{
      const cat = d.categories.find(c=>c.name===name);
      if(cat){
        const existing = d.budgets.find(b=>b.categoryId===cat.id && b.month===cmk);
        if(existing) existing.limit = limit;
        else d.budgets.push({id:uid('b'),categoryId:cat.id,month:cmk,limit,createdBy:App.state.user.id,updatedAt:nowISO(),version:1});
      }
    });
  }
  if(tpl.payload.goals){
    tpl.payload.goals.forEach(g=>{
      if(!d.goals.some(x=>x.name===g.name)){
        d.goals.push({id:uid('g'),name:g.name,icon:g.icon||'🎯',target:g.target||500000,saved:0,deadline:null,color:'#6366F1',createdBy:App.state.user.id,createdAt:nowISO()});
      }
    });
  }
  if(tpl.payload.subscriptions){
    tpl.payload.subscriptions.forEach(s=>{
      if(!d.subscriptions.some(x=>x.name===s.name)){
        d.subscriptions.push({id:uid('s'),name:s.name,category:null,amount:s.amount,cycle:s.cycle,day:s.day,color:s.color||'#6366F1',createdBy:App.state.user.id,active:true});
      }
    });
  }
  App.commit('Plantilla aplicada: '+tpl.name);
}

/* =========================================================================
   DEMO DATA
   ========================================================================= */
async function loadDemoAndEnter(){
  Notif.show('Cargando datos de demostración...','info',1500);
  const demoUsers = [];
  const saltD = randBytes(8), saltM = randBytes(8);
  const hashD = await hashPassword('demo1234',saltD);
  const hashM = await hashPassword('demo1234',saltM);
  const daniel = {id:uid('u'),name:'Daniel',email:'daniel@demo.es',hash:hashD,salt:saltD,createdAt:nowISO()};
  const maria = {id:uid('u'),name:'María',email:'maria@demo.es',hash:hashM,salt:saltM,createdAt:nowISO()};
  demoUsers.push(daniel,maria);
  const existing = DB.users();
  const final = [...existing.filter(u=>u.email!=='daniel@demo.es'&&u.email!=='maria@demo.es'),...demoUsers];
  DB.saveUsers(final);

  const sp = Family.createSpace('Economía de Daniel y María',daniel.id);
  sp.members.push({userId:maria.id,joinedAt:nowISO()});
  const spaces = DB.spaces();
  const idx = spaces.findIndex(s=>s.id===sp.id);
  spaces[idx] = sp; DB.saveSpaces(spaces);

  const d = DB.data(sp.id);
  // accounts
  const accNomina = {id:uid('a'),name:'Cuenta Nómina',type:'bank',initialBalance:180000,color:'#6366F1',createdBy:daniel.id,createdAt:nowISO(),archived:false};
  const accAhorro = {id:uid('a'),name:'Cuenta Ahorro',type:'savings',initialBalance:80000,color:'#10B981',createdBy:daniel.id,createdAt:nowISO(),archived:false};
  const accEfect = {id:uid('a'),name:'Efectivo',type:'cash',initialBalance:20000,color:'#F59E0B',createdBy:daniel.id,createdAt:nowISO(),archived:false};
  d.accounts.push(accNomina,accAhorro,accEfect);

  // debt
  d.debts.push({id:uid('d'),name:'Hipoteca',type:'mortgage',initial:18000000,outstanding:16200000,rate:2.9,payment:72000,paymentDay:5,createdBy:daniel.id});

  // goals
  d.goals.push({id:uid('g'),name:'Vacaciones',icon:'✈',target:400000,saved:240000,deadline:null,color:'#F59E0B',createdBy:daniel.id,createdAt:nowISO()});
  d.goals.push({id:uid('g'),name:'Coche nuevo',icon:'🚗',target:1200000,saved:350000,deadline:null,color:'#3B82F6',createdBy:maria.id,createdAt:nowISO()});
  d.goals.push({id:uid('g'),name:'Fondo emergencia',icon:'🛡',target:1000000,saved:650000,deadline:null,color:'#10B981',createdBy:daniel.id,createdAt:nowISO()});

  // subscriptions
  const subs = [
    {name:'Netflix',color:'#E50914',amount:1599,cycle:'monthly',day:8},
    {name:'Spotify',color:'#1DB954',amount:1099,cycle:'monthly',day:12},
    {name:'Gimnasio',color:'#6366F1',amount:4500,cycle:'monthly',day:2},
    {name:'Internet',color:'#0EA5E9',amount:4500,cycle:'monthly',day:6},
    {name:'Móvil',color:'#A855F7',amount:3000,cycle:'monthly',day:10},
    {name:'Seguro hogar',color:'#64748B',amount:2850,cycle:'monthly',day:15}
  ];
  subs.forEach(s=>d.subscriptions.push({id:uid('s'),...s,category:null,createdBy:maria.id,active:true}));

  // generate 8 months of transactions deterministically
  const rng = mulberry32(42);
  const now = new Date();
  for(let m=7;m>=0;m--){
    const base = new Date(now.getFullYear(),now.getMonth()-m,1);
    const mk = monthKey(base);
    const last = daysInMonth(mk);
    // Income
    d.transactions.push({id:uid('t'),type:'income',amount:240000,categoryId:d.categories.find(c=>c.name==='Sueldo').id,accountId:accNomina.id,date:mk+'-01',description:'Sueldo Daniel',createdBy:daniel.id,createdAt:nowISO(),updatedAt:nowISO(),version:1});
    d.transactions.push({id:uid('t'),type:'income',amount:190000,categoryId:d.categories.find(c=>c.name==='Sueldo').id,accountId:accNomina.id,date:mk+'-01',description:'Sueldo María',createdBy:maria.id,createdAt:nowISO(),updatedAt:nowISO(),version:1});
    // Expenses deterministic
    const exp = [
      {cat:'Vivienda',desc:'Alquiler',amt:95000,day:3,user:daniel},
      {cat:'Suministros',desc:'Luz',amt:Math.round(8000+rng()*4000),day:5,user:maria},
      {cat:'Suministros',desc:'Agua',amt:3500,day:10,user:daniel},
      {cat:'Transporte',desc:'Gasolina',amt:Math.round(8000+rng()*2000),day:Math.min(8,last),user:daniel},
      {cat:'Alimentación',desc:'Supermercado',amt:Math.round(9000+rng()*2000),day:Math.min(4,last),user:maria},
      {cat:'Alimentación',desc:'Supermercado',amt:Math.round(11000+rng()*2000),day:Math.min(12,last),user:daniel},
      {cat:'Alimentación',desc:'Supermercado',amt:Math.round(8500+rng()*2500),day:Math.min(20,last),user:maria},
      {cat:'Alimentación',desc:'Supermercado',amt:Math.round(10000+rng()*2500),day:Math.min(27,last),user:daniel},
      {cat:'Restaurantes',desc:'Cena fuera',amt:Math.round(4000+rng()*3000),day:Math.min(8,last),user:maria},
      {cat:'Restaurantes',desc:'Comida con amigos',amt:Math.round(5000+rng()*4000),day:Math.min(22,last),user:daniel},
      {cat:'Ocio',desc:'Cine / eventos',amt:Math.round(3000+rng()*4000),day:Math.min(15,last),user:maria},
      {cat:'Compras',desc:'Amazon',amt:Math.round(3000+rng()*6000),day:Math.min(18,last),user:maria},
      {cat:'Salud',desc:'Farmacia',amt:Math.round(1500+rng()*1500),day:Math.min(12,last),user:daniel},
      {cat:'Mascotas',desc:'Comida perro',amt:4000,day:Math.min(7,last),user:maria},
      {cat:'Seguros',desc:'Seguro coche',amt:6000,day:Math.min(1,last),user:daniel}
    ];
    // make last month restaurant spike for AI demo
    if(m===0){
      exp.push({cat:'Restaurantes',desc:'Cenas especiales (mes actual)',amt:25000,day:Math.min(25,last),user:maria});
    }
    exp.forEach(e=>{
      const day = String(e.day).padStart(2,'0');
      const date = mk+'-'+day;
      if(date>todayISO()) return; // skip future
      d.transactions.push({id:uid('t'),type:'expense',amount:e.amt,categoryId:d.categories.find(c=>c.name===e.cat).id,accountId:accNomina.id,date,description:e.desc,createdBy:e.user.id,createdAt:nowISO(),updatedAt:nowISO(),version:1});
    });
    // subscriptions
    subs.forEach(s=>{
      const day = String(s.day).padStart(2,'0');
      const date = mk+'-'+day;
      if(date>todayISO()) return;
      d.transactions.push({id:uid('t'),type:'expense',amount:s.amount,categoryId:d.categories.find(c=>c.name==='Suscripciones').id,accountId:accNomina.id,date,description:s.name,createdBy:maria.id,createdAt:nowISO(),updatedAt:nowISO(),version:1});
    });
    // debt installment
    if(('0'+5).slice(-2)<='28'){
      const date = mk+'-05';
      if(date<=todayISO()) d.transactions.push({id:uid('t'),type:'expense',amount:72000,categoryId:d.categories.find(c=>c.name==='Deudas').id,accountId:accNomina.id,date,description:'Cuota hipoteca',createdBy:daniel.id,createdAt:nowISO(),updatedAt:nowISO(),version:1});
    }
    // monthly transfer to savings
    const dateSave = mk+'-28';
    if(dateSave<=todayISO()){
      d.transactions.push({id:uid('t'),type:'transfer',amount:70000,accountId:accNomina.id,toAccountId:accAhorro.id,date:dateSave,description:'Ahorro mensual',createdBy:daniel.id,createdAt:nowISO(),updatedAt:nowISO(),version:1});
    }
  }

  // Budgets this month
  const cmk = monthKey(new Date());
  const budgets = [
    {name:'Alimentación',limit:60000},
    {name:'Restaurantes',limit:25000},
    {name:'Transporte',limit:15000},
    {name:'Ocio',limit:12000},
    {name:'Compras',limit:15000},
    {name:'Vivienda',limit:100000},
    {name:'Suministros',limit:15000},
    {name:'Suscripciones',limit:13000}
  ];
  budgets.forEach(b=>{
    const cat = d.categories.find(c=>c.name===b.name);
    if(cat) d.budgets.push({id:uid('b'),categoryId:cat.id,month:cmk,limit:b.limit,createdBy:daniel.id,updatedAt:nowISO(),version:1});
  });

  // Activity
  Activity.log(d,sp.id,{userId:daniel.id,verb:'creó',entity:'family',label:'Economía familiar'});
  Activity.log(d,sp.id,{userId:maria.id,verb:'añadió',entity:'tx',label:'Supermercado — '+fmtMoney(8400)});
  Activity.log(d,sp.id,{userId:daniel.id,verb:'actualizó',entity:'budget',label:'Presupuesto Alimentación 500 € → 600 €'});

  DB.saveData(sp.id,d);

  // Auto login as Daniel
  await Auth.login({email:'daniel@demo.es',password:'demo1234',remember:true});
  App.state.user = daniel;
  Auth.joinSpace(sp.id);
  App.state.space = sp;
  App.state.data = d;
  App.nav('dashboard');
  Notif.show('Datos de demostración cargados. Puedes iniciar sesión también como María (maria@demo.es / demo1234)','pos',6000);
}

/* =========================================================================
   EVENT BINDINGS (delegated)
   ========================================================================= */
document.addEventListener('click', e=>{
  const el = e.target.closest('[data-edit-tx],[data-edit-budget],[data-edit-goal],[data-goal-add],[data-goal-edit],[data-goal-del],[data-edit-account],[data-edit-debt],[data-edit-sub],[data-add-budget-cat],[data-apply-tpl],[data-apply-tpl-user],[data-share-tpl],[data-del-tpl],[data-cal-day],[data-theme],[data-switch-user]');
  if(!el) return;
  const d = App.state.data;
  if(el.dataset.editTx) openTxModal(null, el.dataset.editTx);
  else if(el.dataset.editBudget) openBudgetModal(el.dataset.editBudget);
  else if(el.dataset.editGoal) openGoalModal(el.dataset.editGoal);
  else if(el.dataset.goalAdd) openGoalAddModal(el.dataset.goalAdd);
  else if(el.dataset.goalEdit) openGoalModal(el.dataset.goalEdit);
  else if(el.dataset.goalDel){
    if(confirm('¿Eliminar este objetivo?')){
      d.goals = d.goals.filter(g=>g.id!==el.dataset.goalDel);
      App.commit('Objetivo eliminado');
    }
  }
  else if(el.dataset.editAccount) openAccountModal(el.dataset.editAccount);
  else if(el.dataset.editDebt) openDebtModal(el.dataset.editDebt);
  else if(el.dataset.editSub) openSubModal(el.dataset.editSub);
  else if(el.dataset.addBudgetCat){
    openBudgetModal(null);
    // prefill after modal renders
    setTimeout(()=>{
      const sel = document.querySelector('#b-cat');
      if(sel) sel.value = el.dataset.addBudgetCat;
    },0);
  }
  else if(el.dataset.applyTpl){
    const tpl = BUILTIN_TEMPLATES.find(t=>t.id===el.dataset.applyTpl);
    if(tpl){ if(confirm('Aplicar plantilla "'+tpl.name+'"? Se fusionará con tus datos actuales.')) applyTemplate(tpl); }
  }
  else if(el.dataset.applyTplUser){
    const tpl = d.templates.find(t=>t.id===el.dataset.applyTplUser);
    if(tpl){ if(confirm('Aplicar plantilla?')) applyTemplate(tpl); }
  }
  else if(el.dataset.shareTpl){
    const tpl = d.templates.find(t=>t.id===el.dataset.shareTpl);
    if(tpl){
      tpl.shared = true;
      tpl.shareCode = Math.random().toString(36).slice(2,8).toUpperCase();
      App.commit('Plantilla compartida: '+tpl.shareCode);
      Notif.show('Código: '+tpl.shareCode,'pos',5000);
    }
  }
  else if(el.dataset.delTpl){
    if(confirm('¿Borrar esta plantilla?')){
      d.templates = d.templates.filter(t=>t.id!==el.dataset.delTpl);
      App.commit('Plantilla eliminada');
    }
  }
  else if(el.dataset.calDay){
    App.state.selectedCalDay = el.dataset.calDay;
    App.render();
  }
  else if(el.dataset.theme){ setTheme(el.dataset.theme); }
  else if(el.dataset.switchUser){ /* handled separately */ }
}, true);

/* =========================================================================
   RENDER + SECONDARY BINDINGS (after render)
   ========================================================================= */
App.render = function(){
  this.load();
  if(!this.state.user){ renderAuth(); return; }
  if(!this.state.space){
    if(this.state.route==='onboarding') renderOnboarding();
    else if(this.state.route==='invite') renderInvite();
    else renderOnboarding();
    return;
  }
  if(!this.state.data){
    this.state.data = DB.data(this.state.space.id);
    // Run migration
    if(this.state.data && Family.migrateCategories(this.state.data)){
      DB.saveData(this.state.space.id, this.state.data);
    }
  }
  if(this.state.route==='onboarding'){ renderOnboarding(); return; }
  if(this.state.route==='invite'){ renderInvite(); return; }
  renderMain();
  bindAfterRender();
};

function bindAfterRender(){
  const d = App.state.data;
  const sp = App.state.space;
  // Top-level buttons
  document.getElementById('add-tx')?.addEventListener('click',()=>openTxModal('expense'));
  document.getElementById('add-tx-empty')?.addEventListener('click',()=>openTxModal('expense'));
  document.getElementById('add-budget')?.addEventListener('click',()=>openBudgetModal());
  document.getElementById('add-budget-empty')?.addEventListener('click',()=>openBudgetModal());
  document.getElementById('add-goal')?.addEventListener('click',()=>openGoalModal());
  document.getElementById('add-goal-empty')?.addEventListener('click',()=>openGoalModal());
  document.getElementById('add-account')?.addEventListener('click',()=>openAccountModal());
  document.getElementById('add-account-empty')?.addEventListener('click',()=>openAccountModal());
  document.getElementById('add-debt')?.addEventListener('click',()=>openDebtModal());
  document.getElementById('add-debt-empty')?.addEventListener('click',()=>openDebtModal());
  document.getElementById('add-sub')?.addEventListener('click',()=>openSubModal());
  document.getElementById('add-sub-empty')?.addEventListener('click',()=>openSubModal());
  document.getElementById('open-simulator')?.addEventListener('click',openSimulator);
  document.getElementById('export-csv')?.addEventListener('click',exportCSV);
  document.getElementById('import-csv')?.addEventListener('click',importCSV);

  // Movimientos filters
  document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>{
    App.state.filterType = b.dataset.type;
    App.render();
  }));
  document.getElementById('filter-cat')?.addEventListener('change',e=>{
    App.state.filterCategory = e.target.value||null;
    App.render();
  });

  // Ajustes bindings
  document.getElementById('save-prof')?.addEventListener('click',async ()=>{
    const name = document.getElementById('prof-name').value.trim();
    if(!name) return;
    await Auth.updateName(name);
    Notif.show('Perfil actualizado','pos');
    App.render();
  });
  document.getElementById('change-pw')?.addEventListener('click',async ()=>{
    const oldPw = document.getElementById('pw-old').value;
    const newPw = document.getElementById('pw-new').value;
    if(newPw.length<6){ Notif.show('Mínimo 6 caracteres','neg'); return; }
    try{ await Auth.changePassword(oldPw,newPw); Notif.show('Contraseña actualizada','pos'); }
    catch(e){ Notif.show(e.message,'neg'); }
  });
  document.getElementById('save-space')?.addEventListener('click',()=>{
    const name = document.getElementById('space-name').value.trim();
    if(!name) return;
    const spaces = DB.spaces();
    const s = spaces.find(x=>x.id===sp.id);
    s.name = name; DB.saveSpaces(spaces);
    Notif.show('Espacio actualizado','pos');
    App.render();
  });
  document.getElementById('copy-code')?.addEventListener('click',()=>{
    navigator.clipboard?.writeText(sp.inviteCode); Notif.show('Código copiado','pos');
  });
  document.getElementById('switch-user')?.addEventListener('click',()=>Auth.switchUser());
  document.getElementById('export-all')?.addEventListener('click',exportCSV);
  document.getElementById('import-data')?.addEventListener('click',importCSV);
  document.getElementById('load-demo')?.addEventListener('click',async ()=>{
    if(confirm('Se cargarán los datos de demostración además de los actuales. ¿Continuar?')){
      await loadDemoAndEnter();
    }
  });
  document.getElementById('reset-space')?.addEventListener('click',()=>{
    if(confirm('¿Seguro? Se borrarán TODOS los datos de esta economía familiar. Esta acción se sincronizará con los demás miembros.')){
      const fresh = Family.emptyData();
      // Preserve categories to keep the structure consistent
      // (user can reconfigure via templates if needed)
      App.state.data = fresh;
      App.commit('Reset completo de la economía familiar');
      Notif.show('Economía reseteada. Los cambios se sincronizarán con tu pareja.','info',3500);
    }
  });
  document.getElementById('logout')?.addEventListener('click',()=>Auth.logout());

  // Templates
  document.getElementById('save-tpl')?.addEventListener('click',()=>{
    const name = prompt('Nombre de la plantilla:');
    if(!name) return;
    const payload = {
      budgets: Object.fromEntries(d.budgets.filter(b=>b.month===monthKey(new Date())).map(b=>{
        const c = d.categories.find(x=>x.id===b.categoryId);
        return c?[c.name,b.limit]:[null,0];
      }).filter(([k])=>k)),
      goals: d.goals.map(g=>({name:g.name,icon:g.icon,target:g.target})),
      subscriptions: d.subscriptions.filter(s=>s.active).map(s=>({name:s.name,color:s.color,amount:s.amount,cycle:s.cycle,day:s.day}))
    };
    d.templates = d.templates||[];
    d.templates.push({id:uid('tpl'),name,payload,shared:false,createdAt:nowISO()});
    App.commit('Plantilla guardada');
  });
  document.getElementById('import-tpl-code')?.addEventListener('click',()=>{
    const code = document.getElementById('tpl-code').value.trim().toUpperCase();
    if(!code) return;
    // search all spaces' data for template with this shareCode
    let found = null;
    DB.spaces().forEach(s=>{
      const data = DB.data(s.id);
      if(data?.templates){
        const t = data.templates.find(t=>t.shared && t.shareCode===code);
        if(t) found = t;
      }
    });
    if(found){
      if(confirm('Importar plantilla "'+found.name+'"?')){
        d.templates = d.templates||[];
        d.templates.push({id:uid('tpl'),name:found.name+' (importada)',payload:found.payload,shared:false,createdAt:nowISO()});
        applyTemplate(found);
        Notif.show('Plantilla importada','pos');
      }
    } else Notif.show('Código no válido','neg');
  });

  // Calendar
  document.getElementById('cal-prev')?.addEventListener('click',()=>{
    App.state.calMonth = addMonthsKey(App.state.calMonth,-1);
    App.state.selectedCalDay = null;
    App.render();
  });
  document.getElementById('cal-next')?.addEventListener('click',()=>{
    App.state.calMonth = addMonthsKey(App.state.calMonth,1);
    App.state.selectedCalDay = null;
    App.render();
  });
}

/* =========================================================================
   HASH ROUTING
   ========================================================================= */
function handleHash(){
  const h = location.hash.replace(/^#\/?/,'');
  const route = h || 'dashboard';
  if(['dashboard','movimientos','presupuestos','objetivos','cuentas','patrimonio','deudas','suscripciones','calendario','ia','plantillas','ajustes'].includes(route)){
    App.state.route = route;
    if(App.state.user && App.state.space) App.render();
  }
}
window.addEventListener('hashchange',handleHash);

/* =========================================================================
   INIT
   ========================================================================= */
(async function init(){
  initTheme();
  Auth.init();
  Cloud.init();
  
  // Show loading screen if cloud is enabled
  if(Cloud.enabled()){
    const root = document.getElementById('app');
    root.innerHTML = `
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;background:var(--bg)">
      <div style="text-align:center">
        <div class="brand-mark" style="width:64px;height:64px;font-size:24px;margin:0 auto 16px">FF</div>
        <div style="font-size:18px;font-weight:600;margin-bottom:8px">Cargando...</div>
        <div style="font-size:13px;color:var(--text-2)">Conectando con la nube</div>
      </div>
    </div>`;
    try{
      await App.loadFromCloud();
    }catch(e){
      console.error('Cloud load error:', e);
      Notif.show('Error al cargar desde la nube: '+e.message,'neg');
    }
  } else {
    App.load();
  }
  
  Sync.init((spaceId)=>{
    // refresh from storage (only in local mode)
    if(!Cloud.enabled() && App.state.space && (!spaceId || spaceId===App.state.space.id)){
      App.refreshData();
      App.render();
      Notif.show('Datos actualizados por otro miembro','info',1800);
    }
  });
  handleHash();
  App.render();
})();

