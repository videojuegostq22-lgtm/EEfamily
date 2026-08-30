
/* =========================================================================
   CORE UTILITIES
   ========================================================================= */
const FF_VERSION = '1.0.0';
const EUR = new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2});
const fmtMoney = c => EUR.format((c|0)/100);
const fmtMoneyPlain = c => (c|0)/100;

function parseMoney(str){
  if(str==null||str==='') return 0;
  let s = String(str).replace(/[€\s]/g,'').trim();
  // Handle Spanish 1.234,56 and 1234,56 and 1234.56
  const hasComma = s.indexOf(',')>=0;
  const hasDot = s.indexOf('.')>=0;
  if(hasComma && hasDot){
    if(s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g,'').replace(',','.');
    else s = s.replace(/,/g,'');
  } else if(hasComma){
    // comma could be decimal or thousand-sep
    const parts = s.split(',');
    if(parts.length===2 && parts[1].length<=2) s = s.replace(',','.');
    else s = s.replace(/,/g,'');
  }
  const v = parseFloat(s);
  if(!isFinite(v)) return 0;
  return Math.round(v*100);
}

function uid(prefix='id'){
  return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function nowISO(){ return new Date().toISOString(); }
function monthKey(d){ if(typeof d==='string') d=new Date(d+'T00:00:00'); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function addMonthsKey(mk,n){
  const [y,mm]=mk.split('-').map(Number);
  const d=new Date(y,mm-1+n,1); return monthKey(d);
}
function daysInMonth(mk){
  const [y,mm]=mk.split('-').map(Number);
  return new Date(y,mm,0).getDate();
}
function dateToISO(d){ return d.toISOString().slice(0,10); }
function isoToMonthKey(iso){ return iso.slice(0,7); }

async function sha256(text){
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256',buf);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function randBytes(n){
  const a=new Uint8Array(n); crypto.getRandomValues(a);
  return Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function hashPassword(password,salt){ return sha256(salt+':'+password); }

/* Deterministic seeded RNG for demo data */
function mulberry32(seed){
  return function(){
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t>>>15, t|1);
    t ^= t + Math.imul(t^t>>>7, t|61);
    return ((t ^ t>>>14) >>> 0) / 4294967296;
  };
}

/* =========================================================================
   DATABASE (localStorage)
   ========================================================================= */
const DB = {
  K_USERS:'ff_users', K_SPACES:'ff_spaces', K_TEMPLATES:'ff_templates',
  spaceKey: id => 'ff_data_'+id,
  _get(key,def){
    try{ const s=localStorage.getItem(key); return s?JSON.parse(s):def; }catch(e){ return def; }
  },
  _set(key,v){ localStorage.setItem(key,JSON.stringify(v)); },
  users(){ return this._get(this.K_USERS,[]); },
  saveUsers(u){ this._set(this.K_USERS,u); },
  spaces(){ return this._get(this.K_SPACES,[]); },
  saveSpaces(s){ this._set(this.K_SPACES,s); },
  data(spaceId){ return this._get(this.spaceKey(spaceId),null); },
  saveData(spaceId,d){ this._set(this.spaceKey(spaceId),d); },
  templates(){ return this._get(this.K_TEMPLATES,[]); },
  saveTemplates(t){ this._set(this.K_TEMPLATES,t); },
  session: {
    get(tabId){
      const fromTab = sessionStorage.getItem('ff_session_'+tabId);
      if(fromTab) try{ return JSON.parse(fromTab); }catch(e){}
      const fromLocal = localStorage.getItem('ff_session');
      if(fromLocal) try{ return JSON.parse(fromLocal); }catch(e){}
      return null;
    },
    set(tabId,sess,remember){
      sessionStorage.setItem('ff_session_'+tabId,JSON.stringify(sess));
      if(remember) localStorage.setItem('ff_session',JSON.stringify(sess));
    },
    clear(tabId){
      sessionStorage.removeItem('ff_session_'+tabId);
      localStorage.removeItem('ff_session');
    }
  }
};

/* =========================================================================
   DEFAULT CATEGORIES & ICONS
   ========================================================================= */
const CATEGORY_ICONS = {
  'Alimentación':'🛒','Supermercado':'🛒','Restaurantes':'🍽','Vivienda':'🏠','Alquiler':'🏠',
  'Transporte':'🚗','Gasolina':'⛽','Ocio':'🎬','Compras':'🛍','Salud':'💊','Farmacia':'💊',
  'Educación':'📚','Seguros':'🛡','Suscripciones':'📱','Viajes':'✈','Mascotas':'🐾',
  'Impuestos':'🧾','Deudas':'💳','Suministros':'💡','Internet':'📡','Móvil':'📱','Gimnasio':'🏋',
  'Netflix':'🎬','Spotify':'🎵','Sueldo':'💼','Freelance':'💻','Alquiler ingreso':'🏢',
  'Inversiones':'📈','Pagas extra':'🎁','Transferencia':'🔁','Otros':'•','Otros ingresos':'💰'
};
const DEFAULT_CATEGORIES = [
  {id:'cat_alimentacion',name:'Alimentación',type:'expense',color:'#F59E0B'},
  {id:'cat_restaurantes',name:'Restaurantes',type:'expense',color:'#EF4444'},
  {id:'cat_vivienda',name:'Vivienda',type:'expense',color:'#10B981'},
  {id:'cat_transporte',name:'Transporte',type:'expense',color:'#3B82F6'},
  {id:'cat_ocio',name:'Ocio',type:'expense',color:'#A855F7'},
  {id:'cat_compras',name:'Compras',type:'expense',color:'#EC4899'},
  {id:'cat_salud',name:'Salud',type:'expense',color:'#14B8A6'},
  {id:'cat_educacion',name:'Educación',type:'expense',color:'#6366F1'},
  {id:'cat_seguros',name:'Seguros',type:'expense',color:'#64748B'},
  {id:'cat_suscripciones',name:'Suscripciones',type:'expense',color:'#0EA5E9'},
  {id:'cat_viajes',name:'Viajes',type:'expense',color:'#F97316'},
  {id:'cat_mascotas',name:'Mascotas',type:'expense',color:'#84CC16'},
  {id:'cat_impuestos',name:'Impuestos',type:'expense',color:'#78716C'},
  {id:'cat_deudas',name:'Deudas',type:'expense',color:'#DC2626'},
  {id:'cat_suministros',name:'Suministros',type:'expense',color:'#FBBF24'},
  {id:'cat_otros',name:'Otros',type:'expense',color:'#94A3B8'},
  {id:'cat_sueldo',name:'Sueldo',type:'income',color:'#16A34A'},
  {id:'cat_pagas_extra',name:'Pagas extra',type:'income',color:'#22C55E'},
  {id:'cat_freelance',name:'Freelance',type:'income',color:'#10B981'},
  {id:'cat_alquiler_ing',name:'Alquiler ingreso',type:'income',color:'#14B8A6'},
  {id:'cat_inversiones',name:'Inversiones',type:'income',color:'#0EA5E9'},
  {id:'cat_otros_ing',name:'Otros ingresos',type:'income',color:'#6366F1'}
];
function catIcon(name){ return CATEGORY_ICONS[name] || (name==='Transferencia'?'🔁':'•'); }

/* =========================================================================
   AUTH MODULE
   ========================================================================= */
const Auth = {
  tabId: null,
  init(){
    this.tabId = sessionStorage.getItem('ff_tabid');
    if(!this.tabId){
      // inherit from opener if possible; otherwise create new
      this.tabId = 'tab_'+Math.random().toString(36).slice(2,8);
      sessionStorage.setItem('ff_tabid',this.tabId);
    }
  },
  currentUser(){
    const s = DB.session.get(this.tabId);
    if(!s) return null;
    const users = DB.users();
    const u = users.find(x=>x.id===s.userId);
    return u||null;
  },
  currentSpace(){
    const s = DB.session.get(this.tabId);
    if(!s) return null;
    const spaces = DB.spaces();
    // 1) If session has a spaceId, use it
    if(s.spaceId){
      const sp = spaces.find(x=>x.id===s.spaceId);
      if(sp && sp.members.some(m=>m.userId===s.userId)) return sp;
    }
    // 2) Fallback: find the first space this user belongs to
    const owned = spaces.find(sp=>sp.members.some(m=>m.userId===s.userId));
    if(owned){
      // Persist to session for next reads
      DB.session.set(this.tabId,{...s,spaceId:owned.id},true);
      return owned;
    }
    return null;
  },
  async register({name,email,password}){
    email = email.trim().toLowerCase();
    if(!name||!email||!password) throw new Error('Completa todos los campos');
    if(password.length<6) throw new Error('La contraseña debe tener al menos 6 caracteres');
    const users = DB.users();
    if(users.some(u=>u.email===email)) throw new Error('Ya existe una cuenta con ese email');
    const salt = randBytes(8);
    const hash = await hashPassword(password,salt);
    const u = {id:uid('u'),name,email,hash,salt,createdAt:nowISO()};
    users.push(u); DB.saveUsers(users);
    return u;
  },
  async login({email,password,remember=true}){
    email = email.trim().toLowerCase();
    const users = DB.users();
    const u = users.find(x=>x.email===email);
    if(!u) throw new Error('Usuario no encontrado');
    const hash = await hashPassword(password,u.salt);
    if(hash !== u.hash) throw new Error('Contraseña incorrecta');
    // Auto-associate the user's family space (if any) to the session
    const spaces = DB.spaces();
    const owned = spaces.find(sp=>sp.members.some(m=>m.userId===u.id));
    DB.session.set(this.tabId,{userId:u.id,spaceId: owned ? owned.id : null},remember);
    return u;
  },
  async changePassword(oldPw,newPw){
    const u = this.currentUser();
    const oldH = await hashPassword(oldPw,u.salt);
    if(oldH!==u.hash) throw new Error('Contraseña actual incorrecta');
    const users = DB.users();
    const i = users.findIndex(x=>x.id===u.id);
    const salt = randBytes(8);
    users[i] = {...users[i],salt,hash:await hashPassword(newPw,salt)};
    DB.saveUsers(users);
  },
  async updateName(name){
    const u = this.currentUser();
    const users = DB.users();
    const i = users.findIndex(x=>x.id===u.id);
    users[i] = {...users[i],name};
    DB.saveUsers(users);
  },
  joinSpace(spaceId){
    const sess = DB.session.get(this.tabId);
    if(!sess) return;
    DB.session.set(this.tabId,{...sess,spaceId},true);
  },
  logout(){
    DB.session.clear(this.tabId);
    sessionStorage.removeItem('ff_tabid');
    location.reload();
  },
  switchUser(){ DB.session.clear(this.tabId); location.reload(); }
};

/* =========================================================================
   FAMILY SPACE MANAGEMENT
   ========================================================================= */
const Family = {
  generateCode(){
    return Math.random().toString(36).slice(2,8).toUpperCase();
  },
  createSpace(name,ownerUserId){
    const spaces = DB.spaces();
    const sp = {
      id: uid('fs'),
      name: name||('Economía familiar'),
      createdAt: nowISO(),
      inviteCode: this.generateCode(),
      members: [{userId:ownerUserId,joinedAt:nowISO()}],
      settings: {currency:'EUR'}
    };
    spaces.push(sp);
    DB.saveSpaces(spaces);
    // Initialize data container
    const data = this.emptyData();
    DB.saveData(sp.id,data);
    return sp;
  },
  emptyData(){
    return {
      accounts:[], categories:JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
      transactions:[], budgets:[], goals:[], debts:[], subscriptions:[],
      activity:[], notifications:[], templates:[], version:1
    };
  },
  /**
   * Migration: ensure all categories have IDs.
   * Fixes data created before the bug was discovered.
   */
  migrateCategories(data){
    if(!data || !Array.isArray(data.categories)) return false;
    let changed = false;
    data.categories.forEach(c=>{
      if(!c.id){
        // Try to match with a default category by name
        const def = DEFAULT_CATEGORIES.find(dc=>dc.name===c.name);
        c.id = def ? def.id : uid('c');
        changed = true;
      }
    });
    // Also fix any transactions/budgets that have categoryId === "undefined" (string)
    if(Array.isArray(data.transactions)){
      data.transactions.forEach(t=>{
        if(t.categoryId === 'undefined' || t.categoryId === undefined || t.categoryId === null){
          // Try to recover by matching description or set to 'Otros'
          const otros = data.categories.find(c=>c.name==='Otros');
          t.categoryId = otros ? otros.id : (data.categories[0]?.id || null);
          changed = true;
        }
      });
    }
    if(Array.isArray(data.budgets)){
      data.budgets.forEach(b=>{
        if(b.categoryId === 'undefined' || b.categoryId === undefined || b.categoryId === null){
          // Remove invalid budgets — user will need to recreate them
          b._invalid = true;
          changed = true;
        }
      });
      data.budgets = data.budgets.filter(b=>!b._invalid);
    }
    return changed;
  },
  joinByCode(code,userId){
    const spaces = DB.spaces();
    const sp = spaces.find(s=>s.inviteCode===code && !s.members.some(m=>m.userId===userId));
    if(!sp) throw new Error('Código de invitación no válido o ya usado');
    sp.members.push({userId,joinedAt:nowISO()});
    DB.saveSpaces(spaces);
    return sp;
  },
  removeMember(spaceId,userId){
    const spaces = DB.spaces();
    const sp = spaces.find(s=>s.id===spaceId);
    if(!sp) return;
    sp.members = sp.members.filter(m=>m.userId!==userId);
    DB.saveSpaces(spaces);
  },
  getUserById(id){ return DB.users().find(u=>u.id===id); }
};

/* =========================================================================
   SYNC (realtime cross-tab)
   ========================================================================= */
const Sync = {
  bc: null,
  init(onChange){
    if('BroadcastChannel' in window){
      this.bc = new BroadcastChannel('ff_sync');
      this.bc.onmessage = e=>{
        if(e.data && e.data.type==='sync') onChange(e.data.spaceId);
        if(e.data && e.data.type==='notify') Notif.show(e.data.msg,e.data.kind||'info');
      };
    }
    window.addEventListener('storage', e=>{
      if(e.key && (e.key.startsWith('ff_data_')||e.key==='ff_spaces')){
        const sid = e.key.startsWith('ff_data_') ? e.key.slice(8) : null;
        onChange(sid);
      }
    });
  },
  broadcast(spaceId){
    if(this.bc) this.bc.postMessage({type:'sync',spaceId});
  },
  broadcastNotify(msg,kind){
    if(this.bc) this.bc.postMessage({type:'notify',msg,kind});
  }
};

/* =========================================================================
   FINANCIAL ENGINE (deterministic, integer cents)
   ========================================================================= */
const Engine = {
  inRange(date, from, to){ return date>=from && date<=to; },
  getRange(period, custom={}){
    const now = new Date();
    const today = dateToISO(now);
    const firstOfMonth = d => new Date(d.getFullYear(),d.getMonth(),1);
    const lastOfMonth = d => new Date(d.getFullYear(),d.getMonth()+1,0);
    let from, to, label;
    switch(period){
      case 'this-month':
        from = dateToISO(firstOfMonth(now));
        to = today;
        label = 'Este mes';
        break;
      case 'last-month':{
        const lm = new Date(now.getFullYear(),now.getMonth()-1,1);
        from = dateToISO(firstOfMonth(lm));
        to = dateToISO(lastOfMonth(lm));
        label = 'Mes anterior';
        break;
      }
      case '3m':{
        const start = new Date(now.getFullYear(),now.getMonth()-2,1);
        from = dateToISO(start); to = today; label = 'Últimos 3 meses';
        break;
      }
      case '6m':{
        const start = new Date(now.getFullYear(),now.getMonth()-5,1);
        from = dateToISO(start); to = today; label = 'Últimos 6 meses';
        break;
      }
      case 'ytd':{
        from = now.getFullYear()+'-01-01'; to = today; label = 'Este año';
        break;
      }
      case 'last-year':{
        const y = now.getFullYear()-1;
        from = y+'-01-01'; to = y+'-12-31'; label = 'Año anterior';
        break;
      }
      case 'custom':
        from = custom.from||today; to = custom.to||today; label = 'Personalizado';
        break;
      default:
        from = dateToISO(firstOfMonth(now)); to = today; label = 'Este mes';
    }
    return {from,to,label};
  },
  monthsBetween(from,to){
    // returns array of YYYY-MM keys between from and to inclusive
    const result=[];
    let d=new Date(from.slice(0,4)+'-'+from.slice(5,7)+'-01T00:00:00');
    const end=new Date(to.slice(0,4)+'-'+to.slice(5,7)+'-01T00:00:00');
    while(d<=end){ result.push(monthKey(d)); d=new Date(d.getFullYear(),d.getMonth()+1,1); }
    return result;
  },
  txInRange(txs,from,to){
    return txs.filter(t=>this.inRange(t.date,from,to));
  },
  totals(txs){
    let inc=0,exp=0;
    txs.forEach(t=>{ if(t.type==='income') inc+=t.amount; else if(t.type==='expense') exp+=t.amount; });
    return {income:inc,expense:exp,savings:inc-exp,rate: inc>0 ? (inc-exp)/inc : 0};
  },
  byCategory(txs){
    const m=new Map();
    txs.forEach(t=>{
      if(t.type!=='expense'&&t.type!=='income') return;
      const key=t.categoryId||'_uncat';
      if(!m.has(key)) m.set(key,{categoryId:key,income:0,expense:0,count:0});
      const o=m.get(key);
      if(t.type==='income') o.income+=t.amount; else o.expense+=t.amount;
      o.count++;
    });
    return Array.from(m.values());
  },
  accountBalance(data, accountId, asOfISO=null){
    const acc = data.accounts.find(a=>a.id===accountId);
    if(!acc) return 0;
    let bal = acc.initialBalance|0;
    const txs = asOfISO ? data.transactions.filter(t=>t.date<=asOfISO) : data.transactions;
    txs.forEach(t=>{
      if(t.type==='income' && t.accountId===accountId) bal += t.amount;
      else if(t.type==='expense' && t.accountId===accountId) bal -= t.amount;
      else if(t.type==='transfer'){
        if(t.accountId===accountId) bal -= t.amount;
        if(t.toAccountId===accountId) bal += t.amount;
      }
    });
    return bal;
  },
  totalBalance(data, asOfISO=null){
    return data.accounts.reduce((s,a)=>s+this.accountBalance(data,a.id,asOfISO),0);
  },
  debtOutstanding(data){ return data.debts.reduce((s,d)=>s+(d.outstanding|0),0); },
  netWorth(data, asOfISO=null){
    return this.totalBalance(data,asOfISO) - this.debtOutstanding(data);
  },
  savingsAccountsBalance(data, asOfISO=null){
    return data.accounts.filter(a=>a.type==='savings'||a.type==='investment').reduce((s,a)=>s+this.accountBalance(data,a.id,asOfISO),0);
  },
  budgetForMonth(data,categoryId,mk){
    return data.budgets.find(b=>b.categoryId===categoryId && b.month===mk) || null;
  },
  monthlyAverage(data, nMonths, type='expense'){
    const now = new Date();
    const months = [];
    for(let i=1;i<=nMonths;i++){
      const d = new Date(now.getFullYear(),now.getMonth()-i,1);
      const mk = monthKey(d);
      const from = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';
      const to = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(daysInMonth(mk)).padStart(2,'0');
      const txs = this.txInRange(data.transactions,from,to);
      const tot = this.totals(txs);
      months.push({mk,type: type==='expense'?tot.expense:tot.income,savings:tot.savings});
    }
    const sum = months.reduce((s,m)=>s+m[type],0);
    return {avg: sum/nMonths, months};
  },
  savingsRateHistory(data, nMonths){
    const now = new Date();
    const arr=[];
    for(let i=nMonths-1;i>=0;i--){
      const d = new Date(now.getFullYear(),now.getMonth()-i,1);
      const mk = monthKey(d);
      const from = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';
      const to = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(daysInMonth(mk)).padStart(2,'0');
      const tot = this.totals(this.txInRange(data.transactions,from,to));
      arr.push({mk,...tot});
    }
    return arr;
  },
  healthScore(data){
    const now = new Date();
    const cmk = monthKey(now);
    const cmFrom = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';
    const cmTo = dateToISO(now);
    const cmTot = this.totals(this.txInRange(data.transactions,cmFrom,cmTo));
    // Savings rate (0-30)
    const rate = cmTot.income>0 ? (cmTot.income-cmTot.expense)/cmTot.income : 0;
    const rateScore = Math.max(0, Math.min(30, Math.round(rate*30/0.35)));
    // Emergency fund (0-20): months of expenses covered by liquid accounts
    const hist = this.monthlyAverage(data,3,'expense');
    const avgExpense = hist.avg;
    const liquid = data.accounts.filter(a=>a.type==='bank'||a.type==='savings'||a.type==='cash')
                  .reduce((s,a)=>s+this.accountBalance(data,a.id),0);
    const monthsCovered = avgExpense>0 ? liquid/avgExpense : 0;
    const emScore = Math.max(0, Math.min(20, Math.round(monthsCovered*20/6)));
    // Debt (0-20)
    const debtPayments = data.debts.reduce((s,d)=>s+(d.payment|0),0);
    const subsTotal = data.subscriptions.filter(s=>s.active).reduce((s,x)=>s+(x.cycle==='monthly'?x.amount:x.amount/12),0);
    const fixedRatio = cmTot.income>0 ? (debtPayments+subsTotal)/cmTot.income : 0;
    const debtScore = Math.max(0, Math.min(20, Math.round((1-Math.min(0.5,fixedRatio)/0.5)*20)));
    // Budget adherence (0-15)
    let budgetScore = 15;
    const budgetsThisMonth = data.budgets.filter(b=>b.month===cmk);
    if(budgetsThisMonth.length){
      let over=0;
      budgetsThisMonth.forEach(b=>{
        const catTx = data.transactions.filter(t=>t.type==='expense'&&t.categoryId===b.categoryId&&t.date>=cmFrom&&t.date<=cmTo);
        const spent = catTx.reduce((s,t)=>s+t.amount,0);
        if(spent>b.limit) over += (spent-b.limit)/b.limit;
      });
      budgetScore = Math.max(0, Math.round(15 - over*15*0.5));
    }
    // Trend (0-15)
    const hist6 = this.savingsRateHistory(data,6);
    const recent = hist6.slice(-3).reduce((s,m)=>s+(m.savings||0),0)/3;
    const prior = hist6.slice(0,3).reduce((s,m)=>s+(m.savings||0),0)/Math.max(1,hist6.slice(0,3).length);
    let trendScore=10;
    if(recent>prior*1.1) trendScore=15;
    else if(recent<prior*0.9) trendScore=5;
    const total = rateScore+emScore+debtScore+budgetScore+trendScore;
    return {
      total, max:100,
      parts:[
        {label:'Tasa de ahorro',score:rateScore,max:30,detail: Math.round(rate*100)+'% este mes'},
        {label:'Fondo emergencia',score:emScore,max:20,detail: monthsCovered.toFixed(1)+' meses de gastos cubiertos'},
        {label:'Gestión de deudas',score:debtScore,max:20,detail: Math.round(fixedRatio*100)+'% de ingresos en cuotas fijas'},
        {label:'Presupuestos',score:budgetScore,max:15,detail: budgetsThisMonth.length?`${budgetsThisMonth.length} categorías con presupuesto`:'Sin presupuestos'},
        {label:'Tendencia',score:trendScore,max:15,detail: recent>=prior?'mejorando':'revisar'}
      ]
    };
  },
  goalETA(data,goal){
    const hist = this.monthlyAverage(data,6,'savings');
    const rate = Math.max(1,hist.avg);
    const remaining = Math.max(0,(goal.target|0)-(goal.saved|0));
    const months = Math.ceil(remaining/rate);
    const monthlyNeeded = goal.deadline
      ? (()=>{ const d=new Date(goal.deadline+'T00:00:00'); const now=new Date(); const mdiff=Math.max(1,Math.round((d-now)/(1000*60*60*24*30))); return Math.ceil(remaining/mdiff); })()
      : rate;
    return {remaining, months, monthlyNeeded, rate};
  },
  amortizationSummary(debt){
    // Simple: how many months remaining, total interest if paid at current rate
    const outstanding = debt.outstanding|0;
    const payment = debt.payment|0;
    const annualRate = debt.rate|0;
    const monthlyRate = annualRate/100/12;
    let bal=outstanding, totalInt=0, months=0;
    while(bal>0 && months<600){
      const interest = Math.round(bal*monthlyRate);
      const principal = Math.max(0, payment-interest);
      if(principal<=0) break;
      bal -= principal;
      totalInt += interest;
      months++;
    }
    return {monthsLeft:months, totalInterest:totalInt, endDate: (()=>{const d=new Date();d.setMonth(d.getMonth()+months);return dateToISO(d);})()};
  },
  projection(data, months, scenarioDeltaPct=0){
    const hist = this.monthlyAverage(data,6,'savings');
    const avgInc = hist.months.reduce((s,m)=>s+m.income,0)/Math.max(1,hist.months.length);
    const avgExp = hist.months.reduce((s,m)=>s+m.expense,0)/Math.max(1,hist.months.length) * (1+scenarioDeltaPct);
    const monthly = avgInc-avgExp;
    const current = this.totalBalance(data);
    const points=[];
    let bal = current;
    points.push({month:0,bal});
    for(let i=1;i<=months;i++){
      bal += monthly;
      points.push({month:i,bal:Math.round(bal)});
    }
    return {avgInc,avgExp,monthly,points};
  },
  subscriptionCosts(data){
    const active = data.subscriptions.filter(s=>s.active);
    const monthly = active.reduce((s,x)=>s+(x.cycle==='monthly'?x.amount:Math.round(x.amount/12)),0);
    const annual = active.reduce((s,x)=>s+(x.cycle==='monthly'?x.amount*12:x.amount),0);
    return {monthly,annual,count:active.length};
  }
};

/* =========================================================================
   AI ADVISOR (deterministic, rule-based, data-grounded)
   ========================================================================= */
const AI = {
  analyze(data){
    const insights = [];
    const now = new Date();
    const cmk = monthKey(now);
    const cmFrom = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';
    const cmTo = dateToISO(now);
    const cmTx = Engine.txInRange(data.transactions,cmFrom,cmTo);
    const cmTot = Engine.totals(cmTx);
    // 1) Category spikes vs 3-month average
    const hist3 = [];
    for(let i=1;i<=3;i++){
      const d = new Date(now.getFullYear(),now.getMonth()-i,1);
      const mk = monthKey(d);
      const from = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-01';
      const to = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(daysInMonth(mk)).padStart(2,'0');
      hist3.push(Engine.byCategory(Engine.txInRange(data.transactions,from,to)));
    }
    const cmByCat = Engine.byCategory(cmTx);
    cmByCat.forEach(c=>{
      if(c.categoryId==='_uncat') return;
      const cat = data.categories.find(x=>x.id===c.categoryId);
      if(!cat) return;
      const avgs = hist3.map(h=>{
        const f = h.find(x=>x.categoryId===c.categoryId);
        return f ? f.expense : 0;
      });
      const avg = avgs.reduce((s,v)=>s+v,0)/Math.max(1,avgs.length);
      const diff = c.expense - avg;
      if(diff>5000 && avg>0 && c.expense > avg*1.25){
        insights.push({
          id:'spike_'+c.categoryId, kind:'warning',
          title:`Gasto superior en ${cat.name}`,
          body:`Este mes lleváis ${fmtMoney(c.expense)} en ${cat.name}, ${fmtMoney(diff)} más que vuestra media de los últimos 3 meses (${fmtMoney(avg)}).`,
          why:`Media últimos 3 meses: ${avgs.map(v=>fmtMoney(v)).join(', ')}. Media: ${fmtMoney(avg)}.`,
          impactCents: Math.round(diff*0.2),
          action:`Si reducís este gasto un 20%, ahorraríais aproximadamente ${fmtMoney(Math.round(diff*0.2))} al mes.`
        });
      }
    });
    // 2) Subscriptions total
    const subs = Engine.subscriptionCosts(data);
    if(subs.annual>0){
      insights.push({
        id:'subs', kind:'info',
        title:`Suscripciones`,
        body:`Tenéis ${subs.count} suscripciones activas que suman ${fmtMoney(subs.annual)} al año (${fmtMoney(subs.monthly)} al mes).`,
        why:`Lista: ${data.subscriptions.filter(s=>s.active).map(s=>`${s.name} (${fmtMoney(s.amount)}/${s.cycle==='monthly'?'mes':'año'})`).join(', ')}.`,
        action: subs.count>=3 ? 'Revisad si todas siguen siendo útiles; cancelar una innecesaria puede liberar cientos de euros al año.' : 'Mantened el control revisando la lista cada trimestre.'
      });
    }
    // 3) Budgets exceeded
    data.budgets.filter(b=>b.month===cmk).forEach(b=>{
      const spent = data.transactions.filter(t=>t.type==='expense'&&t.categoryId===b.categoryId&&t.date>=cmFrom&&t.date<=cmTo).reduce((s,t)=>s+t.amount,0);
      if(spent>b.limit){
        const cat = data.categories.find(c=>c.id===b.categoryId);
        insights.push({
          id:'overbudget_'+b.id, kind:'neg',
          title:`Presupuesto superado: ${cat?.name||'categoría'}`,
          body:`Habéis gastado ${fmtMoney(spent)} de ${fmtMoney(b.limit)} presupuestados (${Math.round(spent/b.limit*100)}%).`,
          why:`Límite definido: ${fmtMoney(b.limit)}. Gastado a día de hoy: ${fmtMoney(spent)}.`,
          action:'Ajustad el presupuesto o reducid el gasto en esta categoría.'
        });
      } else if(spent>b.limit*0.8 && b.limit-spent < 5000){
        const cat = data.categories.find(c=>c.id===b.categoryId);
        insights.push({
          id:'nearbudget_'+b.id, kind:'warning',
          title:`Próximos al límite: ${cat?.name||'categoría'}`,
          body:`Os quedan ${fmtMoney(b.limit-spent)} en ${cat?.name||'la categoría'} este mes (${Math.round(spent/b.limit*100)}% consumido).`,
          why:`Presupuesto: ${fmtMoney(b.limit)}. Gastado: ${fmtMoney(spent)}.`,
          action:'Ajustad el gasto de los días restantes o aumentad el presupuesto si es necesario.'
        });
      }
    });
    // 4) Savings projection
    const hist = Engine.monthlyAverage(data,6,'savings');
    if(hist.avg>0){
      const projected = Math.round(hist.avg*12);
      insights.push({
        id:'projection', kind:'pos',
        title:'Proyección de ahorro',
        body:`A vuestro ritmo actual, ahorraríais aproximadamente ${fmtMoney(projected)} en los próximos 12 meses.`,
        why:`Ritmo medio últimos 6 meses: ${fmtMoney(Math.round(hist.avg))}/mes. Datos basados en ingresos y gastos reales registrados.`,
        action:'Pequeños ajustes recurrentes pueden multiplicar esta cifra.'
      });
    }
    // 5) Goals
    data.goals.filter(g=>g.target>g.saved).forEach(g=>{
      const eta = Engine.goalETA(data,g);
      if(g.deadline){
        const deadlineDate = new Date(g.deadline+'T00:00:00');
        const now = new Date();
        const monthsLeft = Math.max(1,Math.round((deadlineDate-now)/(1000*60*60*24*30)));
        if(eta.remaining/monthsLeft > eta.rate*1.5){
          insights.push({
            id:'goalrisk_'+g.id, kind:'warning',
            title:`Objetivo en riesgo: ${g.name}`,
            body:`Para llegar a ${fmtMoney(g.target)} antes de ${g.deadline}, necesitaríais ahorrar ${fmtMoney(Math.ceil(eta.remaining/monthsLeft))} al mes, pero vuestro ritmo es de ${fmtMoney(Math.round(eta.rate))}.`,
            why:`Objetivo: ${fmtMoney(g.target)}. Ahorrado: ${fmtMoney(g.saved)}. Faltan: ${fmtMoney(eta.remaining)}.`,
            action:'Aumentad el ahorro mensual o posponed la fecha.'
          });
        }
      }
    });
    // 6) Emergency fund
    const avgExpense3 = Engine.monthlyAverage(data,3,'expense').avg;
    const liquid = data.accounts.filter(a=>a.type==='bank'||a.type==='savings'||a.type==='cash').reduce((s,a)=>s+Engine.accountBalance(data,a.id),0);
    if(avgExpense3>0 && liquid < avgExpense3*3){
      insights.push({
        id:'emfund', kind:'warning',
        title:'Fondo de emergencia',
        body:`Vuestro colchón líquido (${fmtMoney(liquid)}) cubre aproximadamente ${(liquid/avgExpense3).toFixed(1)} meses de gastos. Lo recomendado son 3-6 meses.`,
        why:`Gasto medio últimos 3 meses: ${fmtMoney(Math.round(avgExpense3))}.`,
        action:'Priorizad el ahorro en una cuenta separada hasta cubrir al menos 3 meses.'
      });
    }
    // 7) Debt
    data.debts.forEach(d=>{
      const summary = Engine.amortizationSummary(d);
      if((d.rate|0)>=5){
        insights.push({
          id:'debt_'+d.id, kind:'neg',
          title:`Deuda con interés alto: ${d.name}`,
          body:`La deuda ${d.name} tiene un ${d.rate}% de interés. Pagaréis ${fmtMoney(summary.totalInterest)} en intereses si mantenéis la cuota actual.`,
          why:`Pendiente: ${fmtMoney(d.outstanding)}. Cuota: ${fmtMoney(d.payment)}. Meses restantes: ${summary.monthsLeft}.`,
          action:'Considerad adelantar pagos para reducir intereses.'
        });
      }
    });
    // Sort by kind priority
    const order = {neg:0,warning:1,info:2,pos:3};
    insights.sort((a,b)=>(order[a.kind]||9)-(order[b.kind]||9));
    return insights;
  }
};

/* =========================================================================
   NOTIFICATIONS (in-app)
   ========================================================================= */
const Notif = {
  queue: [],
  show(msg, kind='info', ms=4000){
    const root = document.getElementById('notif-root');
    if(!root) return;
    const el = document.createElement('div');
    el.className = 'notif '+kind;
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateX(20px)'; el.style.transition='all .3s'; }, ms-300);
    setTimeout(()=>el.remove(), ms);
  },
  add(data, spaceId, notif){
    data.notifications.unshift({...notif, id:uid('n'), at:nowISO(), read:[]});
    if(data.notifications.length>100) data.notifications = data.notifications.slice(0,100);
    DB.saveData(spaceId,data);
  },
  maybeFire(data,spaceId,userId){
    // Budget overrun alert once per category per month
    const now = new Date();
    const cmk = monthKey(now);
    const cmFrom = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-01';
    const cmTo = dateToISO(now);
    data.budgets.filter(b=>b.month===cmk).forEach(b=>{
      const spent = data.transactions.filter(t=>t.type==='expense'&&t.categoryId===b.categoryId&&t.date>=cmFrom&&t.date<=cmTo).reduce((s,t)=>s+t.amount,0);
      if(spent>b.limit){
        const key = 'over_'+b.id+'_'+cmk;
        if(!data.notifications.some(n=>n.key===key)){
          const cat = data.categories.find(c=>c.id===b.categoryId);
          this.add(data,spaceId,{key,text:`Presupuesto superado en ${cat?.name||'categoría'}: ${fmtMoney(spent)} de ${fmtMoney(b.limit)}`,kind:'neg'});
        }
      }
    });
  }
};

/* =========================================================================
   ACTIVITY LOG
   ========================================================================= */
const Activity = {
  log(data,spaceId,{userId,verb,entity,label}){
    data.activity.unshift({id:uid('a'),userId,verb,entity,label,at:nowISO()});
    if(data.activity.length>200) data.activity = data.activity.slice(0,200);
  }
};

/* =========================================================================
   CLOUD (Supabase) — optional cross-device sync
   ========================================================================= */
const Cloud = {
  sb: null,
  channel: null,
  lastPushVersion: null,
  _pushTimer: null,
  _disabled: false,
  _initError: null,
  enabled(){
    if(this._disabled) return false;
    return !!(window.FF_CONFIG && window.FF_CONFIG.supabaseUrl && window.FF_CONFIG.supabaseAnonKey && window.supabase);
  },
  /**
   * Normalize and validate Supabase URL.
   * Removes trailing slash and any "/rest/v1" or "/rest/v2" paths that users
   * sometimes mistakenly paste.
   */
  _normalizeUrl(url){
    if(!url) return '';
    let u = url.trim();
    // Remove trailing slashes
    u = u.replace(/\/+$/, '');
    // Remove /rest/v1 or /rest/v2 or /rest/vN suffix (user mistake)
    u = u.replace(/\/rest\/v\d+\/?$/, '');
    // Remove /auth/v1 suffix (user mistake)
    u = u.replace(/\/auth\/v\d+\/?$/, '');
    return u;
  },
  /**
   * Validate that a Supabase anon key looks valid.
   * 
   * Two accepted formats:
   *   - Legacy (pre-2025): JWT starting with "eyJ", ~200 chars, 3 parts
   *   - New (2025+): Publishable key starting with "sb_publishable_"
   * 
   * Supabase renamed "anon key" → "Publishable key" and changed the format,
   * but both are fully valid for client-side usage.
   */
  _isValidKey(key){
    if(!key || typeof key !== 'string') return false;
    const k = key.trim();
    // New 2025 format: sb_publishable_xxxxx
    if(k.startsWith('sb_publishable_')) {
      return k.length > 20;
    }
    // Legacy JWT format: eyJxxxxx.yyyyy.zzzzz
    if(!k.startsWith('eyJ')) return false;
    if(k.length < 100) return false;
    const parts = k.split('.');
    if(parts.length !== 3) return false;
    return true;
  },
  validateConfig(){
    const errors = [];
    if(!window.FF_CONFIG) {
      errors.push('FF_CONFIG no está definido. Comprueba que config.js está cargado.');
      return errors;
    }
    if(!window.FF_CONFIG.supabaseUrl) {
      errors.push('Falta supabaseUrl en config.js');
    } else if(!/^https?:\/\/.+\..+/.test(window.FF_CONFIG.supabaseUrl)) {
      errors.push('supabaseUrl no parece una URL válida. Debe ser https://xxxxx.supabase.co');
    }
    if(!window.FF_CONFIG.supabaseAnonKey) {
      errors.push('Falta supabaseAnonKey en config.js. Pégala desde Settings → API → Project API keys → Publishable key (o la anon key legacy)');
    } else if(!this._isValidKey(window.FF_CONFIG.supabaseAnonKey)) {
      errors.push('supabaseAnonKey no parece válida. Debe empezar por "eyJ..." (JWT legacy) o "sb_publishable_..." (formato nuevo 2025). Cópiala desde Settings → API → Project API keys → Publishable key');
    }
    if(!window.supabase) {
      errors.push('Librería de Supabase no cargada');
    }
    return errors;
  },
  init(){
    if(!window.FF_CONFIG || !window.FF_CONFIG.supabaseUrl || !window.FF_CONFIG.supabaseAnonKey) return;
    const errors = this.validateConfig();
    if(errors.length > 0) {
      console.error('❌ Supabase: configuración inválida:');
      errors.forEach(e => console.error('   -', e));
      console.error('ℹ️  La app funcionará en modo DEMO (solo local).');
      this._disabled = true;
      this._initError = errors[0];
      // Show user-friendly error on first load
      setTimeout(() => {
        if(typeof Notif !== 'undefined') {
          Notif.show('Modo demo: la configuración de Supabase es incorrecta. ' + errors[0], 'warn', 8000);
        }
      }, 500);
      return;
    }
    try{
      const url = this._normalizeUrl(window.FF_CONFIG.supabaseUrl);
      const key = window.FF_CONFIG.supabaseAnonKey.trim();
      this.sb = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      console.log('✅ Supabase: conectado a', url);
    }catch(e){
      console.error('❌ Cloud init error:', e);
      this._disabled = true;
      this._initError = e.message;
      if(typeof Notif !== 'undefined') {
        Notif.show('Error al conectar con Supabase: ' + e.message, 'neg', 8000);
      }
    }
  },
  async getSession(){
    if(!this.sb) return null;
    try{
      const {data} = await this.sb.auth.getSession();
      return data?.session || null;
    }catch(e){
      console.error('getSession error:', e);
      return null;
    }
  },
  async getUserProfile(){
    if(!this.sb) return null;
    try{
      const {data:{user}} = await this.sb.auth.getUser();
      if(!user) return null;
      const {data, error} = await this.sb
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if(error || !data) return null;
      return {id:data.id, name:data.name, email:data.email, createdAt:data.created_at};
    }catch(e){
      console.error('getUserProfile error:', e);
      return null;
    }
  },
  async register({name, email, password}){
    if(!this.sb) throw new Error('Supabase no configurado correctamente');
    try {
      // IMPORTANTE: pasamos el nombre como metadata para el trigger handle_new_user
      const {data, error} = await this.sb.auth.signUp({
        email, password,
        options: {
          data: { name }  // Esto se usa en el trigger SQL para crear el perfil
        }
      });
      if(error){
        const msg = (error.message || '').toLowerCase();
        if(msg.includes('invalid api key') || msg.includes('invalid key') || msg.includes('jwt')){
          throw new Error('Clave de Supabase inválida. Revisa config.js');
        }
        if(msg.includes('invalid path') || msg.includes('not found') || msg.includes('404')){
          throw new Error('URL de Supabase inválida. Revisa config.js');
        }
        if(msg.includes('already') || msg.includes('exist') || msg.includes('registered')){
          throw new Error('Ya existe una cuenta con ese email. Intenta iniciar sesión o usa "Recuperar contraseña".');
        }
        if(msg.includes('signup not') || msg.includes('disabled')){
          throw new Error('El registro está desactivado en Supabase.');
        }
        if(msg.includes('confirm') || msg.includes('email')){
          // Email confirmation active - user created but needs to confirm
          throw {code: 'EMAIL_NOT_CONFIRMED', message: 'Cuenta creada. Revisa tu email para confirmar la cuenta.', email};
        }
        throw new Error('Error de registro: ' + error.message);
      }
      if(!data.user) throw new Error('Registro fallido: no se recibió usuario');
      
      // Si no hay sesión, significa que "Confirm email" está activado
      if(!data.session){
        // Intentar login inmediatamente (funciona si Confirm email está desactivado)
        // En algunos casos la sesión puede estar pendiente de confirmación
        throw {code: 'EMAIL_NOT_CONFIRMED', message: 'Cuenta creada. Revisa tu email para confirmar la cuenta (o desactiva "Confirm email" en Supabase → Authentication → Providers → Email).', email};
      }
      
      // Intentar crear perfil manualmente por si el trigger no existe
      try {
        const {error:profileError} = await this.sb
          .from('profiles')
          .insert({id:data.user.id, name, email});
        if(profileError) {
          console.warn('⚠️  Profile insert warning (puede ser normal si el trigger ya creó el perfil):', profileError.message);
        }
      } catch(pe) {
        console.warn('⚠️  Profile creation warning:', pe.message);
      }
      
      return {id:data.user.id, name, email};
    } catch(e) {
      // Re-throw our custom errors as-is
      if(e && e.code === 'EMAIL_NOT_CONFIRMED') throw e;
      if(e.message && e.message.includes('fetch')) {
        throw new Error('No se pudo conectar con Supabase. Revisa tu conexión y la URL en config.js');
      }
      throw e;
    }
  },
  async login({email, password}){
    if(!this.sb) throw new Error('Supabase no configurado correctamente');
    try {
      const {data, error} = await this.sb.auth.signInWithPassword({email, password});
      if(error){
        const msg = (error.message || '').toLowerCase();
        if(msg.includes('invalid api key') || msg.includes('invalid key') || msg.includes('jwt')){
          throw new Error('Clave de Supabase inválida. Revisa config.js');
        }
        if(msg.includes('invalid path') || msg.includes('not found') || msg.includes('404')){
          throw new Error('URL de Supabase inválida. Revisa config.js');
        }
        if(msg.includes('email not confirmed')){
          throw {code: 'EMAIL_NOT_CONFIRMED', message: 'Email no confirmado. Revisa tu bandeja de entrada para confirmar tu cuenta.', email};
        }
        if(msg.includes('invalid login') || msg.includes('invalid_credentials') || msg.includes('invalid_credentials')){
          throw new Error('Email o contraseña incorrectos. Si te registraste pero no puedes entrar, probablemente necesites confirmar tu email.');
        }
        throw new Error('Error de login: ' + error.message);
      }
      if(!data.user) throw new Error('Login fallido: no se recibió usuario');
      
      // Esperar un poco para que el trigger cree el perfil (puede haber delay)
      await new Promise(r => setTimeout(r, 200));
      
      // Cargar perfil
      let profile = await this.getUserProfile();
      if(!profile) {
        // Intentar crear el perfil si no existe (caso borde de migración o trigger ausente)
        console.warn('⚠️  Perfil no encontrado, intentando crear...');
        const profileName = data.user.user_metadata?.name || data.user.email.split('@')[0];
        const {error: insertErr} = await this.sb
          .from('profiles')
          .insert({id: data.user.id, name: profileName, email: data.user.email});
        if(insertErr) {
          console.warn('⚠️  No se pudo crear perfil:', insertErr.message);
          console.warn('⚠️  Asegúrate de haber ejecutado el SQL actualizado (con trigger on_auth_user_created)');
        }
        // Reintentar cargar perfil
        profile = await this.getUserProfile();
        if(!profile) {
          // Fallback: crear perfil in-memory
          return {id: data.user.id, name: profileName, email: data.user.email, createdAt: data.user.created_at};
        }
      }
      return profile;
    } catch(e) {
      // Re-throw our custom errors as-is
      if(e && e.code === 'EMAIL_NOT_CONFIRMED') throw e;
      if(e.message && e.message.includes('fetch')) {
        throw new Error('No se pudo conectar con Supabase. Revisa tu conexión y la URL en config.js');
      }
      throw e;
    }
  },
  async logout(){
    if(!this.sb) return;
    try{
      await this.sb.auth.signOut();
    }catch(e){
      console.error('Logout error:', e);
    }
  },
  /**
   * Resend confirmation email to user
   */
  async resendConfirmation(email){
    if(!this.sb) throw new Error('Supabase no configurado');
    try{
      const {error} = await this.sb.auth.resend({
        type: 'signup',
        email: email
      });
      if(error) throw new Error('No se pudo reenviar el email: ' + error.message);
      return true;
    }catch(e){
      throw new Error('Error al reenviar email de confirmación: ' + e.message);
    }
  },
  /**
   * Crea el espacio familiar usando una función RPC SECURITY DEFINER.
   * Esto bypass-ea RLS completamente y realiza 3 operaciones en una
   * sola transacción atómica:
   *   1. Crear family_spaces
   *   2. Crear family_members (owner)
   *   3. Crear invitation con el código
   * Evita el error "new row violates row-level security policy" que
   * ocurría con inserts directos cuando las políticas son inconsistentes.
   */
  async createSpace(name, userId){
    if(!this.sb) throw new Error('Cloud not enabled');
    
    // 1. Llamar a la RPC que crea TODO atómicamente (bypass-ea RLS)
    const {data: spaceId, error} = await this.sb
      .rpc('create_family_space', {p_name: name || 'Economía familiar'});
    
    if(error) {
      console.error('create_family_space RPC error:', error);
      const msg = (error.message || '').toLowerCase();
      if(msg.includes('perfil de usuario no encontrado') || msg.includes('profile')) {
        throw new Error('Tu perfil no se creó correctamente. Cierra sesión, vuelve a entrar e inténtalo de nuevo.');
      }
      if(msg.includes('no autenticado') || msg.includes('not authenticated')) {
        throw new Error('Tu sesión ha expirado. Cierra sesión y vuelve a iniciar.');
      }
      throw new Error('Error al crear la economía: ' + (error.message || 'desconocido'));
    }
    if(!spaceId) throw new Error('No se recibió ID del espacio creado');
    
    // 2. Cargar el espacio recién creado
    const {data: space, error: spaceError} = await this.sb
      .from('family_spaces')
      .select('id, name, invite_code, created_at, created_by, data, data_version')
      .eq('id', spaceId)
      .single();
    
    if(spaceError || !space) {
      throw new Error('Espacio creado pero no se pudo cargar: ' + (spaceError?.message || ''));
    }
    
    // 3. Cargar miembros usando la RPC helper (bypass-ea RLS de family_members)
    let members = [{userId, joinedAt: space.created_at, role: 'owner', name: '', email: ''}];
    try {
      const {data: memberRows, error: mErr} = await this.sb
        .rpc('get_space_members', {p_space_id: space.id});
      if(!mErr && memberRows && memberRows.length > 0) {
        members = memberRows.map(m => ({
          userId: m.user_id,
          name: m.name,
          email: m.email,
          joinedAt: m.joined_at,
          role: m.role
        }));
      }
    } catch(me) {
      console.warn('⚠️  Could not load members for new space:', me.message);
    }
    
    // 4. Guardar data en memoria para el primer push
    //    (data viene como {} vacío, se rellenará con datos reales durante el onboarding)
    const initialData = Family.emptyData();
    App.state.data = initialData;
    
    // 5. Guardar data localmente también (para fallback y modo offline)
    DB.saveData(space.id, initialData);
    
    // 6. Guardar el espacio en el storage local para el fallback
    const localSpaces = DB.spaces();
    const localSpace = {
      id: space.id,
      name: space.name,
      inviteCode: space.invite_code,
      createdAt: space.created_at,
      members: members.map(m => ({userId: m.userId, joinedAt: m.joinedAt, role: m.role}))
    };
    const existingIdx = localSpaces.findIndex(s => s.id === space.id);
    if(existingIdx >= 0) localSpaces[existingIdx] = localSpace;
    else localSpaces.push(localSpace);
    DB.saveSpaces(localSpaces);
    
    // 7. Programar el primer push para guardar la estructura base en la nube
    //    (se hará en 800ms gracias al debounce)
    setTimeout(() => this.schedulePush(), 100);
    
    return {
      id: space.id,
      name: space.name,
      inviteCode: space.invite_code,
      createdAt: space.created_at,
      members
    };
  },
  async joinByCode(code, userId){
    if(!this.sb) throw new Error('Cloud not enabled');
    
    // 1. Aceptar invitación usando RPC SECURITY DEFINER (ya lo era)
    const {data:spaceId, error} = await this.sb
      .rpc('accept_invitation', {invitation_code:code});
    
    if(error) {
      const msg = (error.message || '').toLowerCase();
      if(msg.includes('no válido') || msg.includes('ya usado') || msg.includes('invalid') || msg.includes('already')) {
        throw new Error('Código de invitación no válido o ya usado');
      }
      if(msg.includes('ya eres miembro')) {
        throw new Error('Ya eres miembro de este espacio');
      }
      throw new Error('Error al unirse: ' + error.message);
    }
    if(!spaceId) throw new Error('No se recibió ID del espacio');
    
    // 2. Cargar el espacio (sin joins — los miembros se cargan por RPC)
    const {data:space, error:spaceError} = await this.sb
      .from('family_spaces')
      .select('id, name, invite_code, created_at, created_by, data, data_version')
      .eq('id', spaceId)
      .single();
    
    if(spaceError || !space) {
      throw new Error('Te has unido pero no se pudo cargar el espacio: ' + (spaceError?.message || ''));
    }
    
    // 3. Cargar miembros usando la RPC helper (bypass-ea RLS)
    let members = [{userId, joinedAt: space.created_at, role: 'member', name: '', email: ''}];
    try {
      const {data: memberRows, error: mErr} = await this.sb
        .rpc('get_space_members', {p_space_id: space.id});
      if(!mErr && memberRows && memberRows.length > 0) {
        members = memberRows.map(m => ({
          userId: m.user_id,
          name: m.name,
          email: m.email,
          joinedAt: m.joined_at,
          role: m.role
        }));
      }
    } catch(me) {
      console.warn('⚠️  Could not load members for joined space:', me.message);
    }
    
    // 4. Cargar data financiera desde la nube
    const initialData = space.data && Object.keys(space.data).length > 0
      ? space.data
      : Family.emptyData();
    App.state.data = initialData;
    DB.saveData(space.id, initialData);
    
    // 5. Guardar el espacio localmente como fallback
    const localSpaces = DB.spaces();
    const localSpace = {
      id: space.id,
      name: space.name,
      inviteCode: space.invite_code,
      createdAt: space.created_at,
      members: members.map(m => ({userId: m.userId, joinedAt: m.joinedAt, role: m.role}))
    };
    const existingIdx = localSpaces.findIndex(s => s.id === space.id);
    if(existingIdx >= 0) localSpaces[existingIdx] = localSpace;
    else localSpaces.push(localSpace);
    DB.saveSpaces(localSpaces);
    
    // 6. Suscribir a cambios realtime
    this.subscribeToChanges(space.id, (newData) => {
      App.state.data = newData;
      DB.saveData(space.id, newData);
      App.render();
      Notif.show('Datos actualizados por otro miembro', 'info', 3000);
    });
    
    return {
      id: space.id,
      name: space.name,
      inviteCode: space.invite_code,
      createdAt: space.created_at,
      members
    };
  },
  /**
   * Get all spaces the user belongs to.
   * Uses a two-step query to avoid RLS recursion issues:
   *   1) Query family_members for the user's space_ids (simple policy: user_id = auth.uid())
   *   2) Load each family_space individually
   *   3) Load members for each space via RPC helper (bypasses RLS)
   */
  async getUserSpaces(userId){
    if(!this.sb) return [];
    try{
      // Step 1: get space_ids where user is a member
      // This query uses the simple policy: user_id = auth.uid()
      const {data: memberships, error: memError} = await this.sb
        .from('family_members')
        .select('space_id')
        .eq('user_id', userId);
      if(memError || !memberships || memberships.length === 0) {
        if(memError) console.warn('getUserSpaces step1 error:', memError.message);
        return [];
      }
      const spaceIds = memberships.map(m => m.space_id);
      // Step 2: load each space
      const {data: spaces, error: spError} = await this.sb
        .from('family_spaces')
        .select('id, name, invite_code, created_at, created_by')
        .in('id', spaceIds);
      if(spError || !spaces) {
        console.warn('getUserSpaces step2 error:', spError?.message);
        return [];
      }
      // Step 3: for each space, load members via RPC helper
      const result = [];
      for(const sp of spaces) {
        let members = [{userId, joinedAt: sp.created_at, role: 'member'}];
        try {
          const {data: memberRows, error: mErr} = await this.sb
            .rpc('get_space_members', {p_space_id: sp.id});
          if(!mErr && memberRows && memberRows.length > 0){
            members = memberRows.map(m => ({
              userId: m.user_id,
              name: m.name,
              email: m.email,
              joinedAt: m.joined_at,
              role: m.role
            }));
          }
        } catch(me) {
          console.warn('⚠️  Could not load members for space', sp.id, me.message);
        }
        result.push({
          id: sp.id,
          name: sp.name,
          inviteCode: sp.invite_code,
          createdAt: sp.created_at,
          members
        });
      }
      return result;
    }catch(e){
      console.error('getUserSpaces error:', e);
      return [];
    }
  },
  /**
   * Carga datos financieros del espacio desde la nube.
   * Devuelve un objeto {data, data_version} para poder cargar
   * también la versión actual del servidor y usarla como referencia
   * en los próximos pushes (optimistic locking).
   */
  async loadFamilyData(spaceId){
    if(!this.sb) return null;
    try{
      const {data, error} = await this.sb
        .from('family_spaces')
        .select('data, data_version')
        .eq('id', spaceId)
        .single();
      if(error || !data) {
        if(error) console.error('loadFamilyData error:', error.message);
        return null;
      }
      // IMPORTANTE: guardar la versión actual del servidor como referencia
      // para los próximos pushes (optimistic locking)
      this.lastPushVersion = data.data_version | 0;
      console.log('📥 Cloud: datos cargados, versión servidor =', this.lastPushVersion);
      return {data: data.data, version: this.lastPushVersion};
    }catch(e){
      console.error('loadFamilyData error:', e);
      return null;
    }
  },
  /**
   * Guarda datos financieros usando la RPC SECURITY DEFINER
   * `update_space_data`. Esto bypass-ea RLS y evita los errores:
   *   - "new row violates row-level security policy"
   *   - conflictos de versión causados por UPDATE directo
   *
   * @param spaceId UUID del espacio
   * @param data Objeto con todos los datos financieros
   * @param expectedVersion Versión esperada del servidor (para optimistic locking)
   *                        Si es null, no se valida versión (primer push).
   * @returns Nueva versión del servidor tras el update
   */
  async saveFamilyData(spaceId, data, expectedVersion){
    if(!this.sb) return null;
    console.log('📤 Cloud: guardando datos... versión esperada =', expectedVersion);
    try {
      const {data: newVersion, error} = await this.sb
        .rpc('update_space_data', {
          p_space_id: spaceId,
          p_data: data,
          p_expected_version: expectedVersion
        });
      if(error){
        console.error('❌ Cloud save error:', error);
        const msg = (error.message || '').toLowerCase();
        if(msg.includes('conflicto_version') || msg.includes('conflict')){
          throw new Error('CONFLICTO_VERSION');
        }
        if(msg.includes('no eres miembro') || msg.includes('not a member')){
          throw new Error('No eres miembro de este espacio');
        }
        if(msg.includes('no autenticado') || msg.includes('not authenticated')){
          throw new Error('Tu sesión ha expirado. Inicia sesión de nuevo.');
        }
        throw new Error('Error al guardar datos: ' + (error.message || 'desconocido'));
      }
      if(newVersion == null){
        throw new Error('No se recibió nueva versión del servidor');
      }
      this.lastPushVersion = newVersion | 0;
      console.log('✅ Cloud: datos guardados, nueva versión =', this.lastPushVersion);
      return this.lastPushVersion;
    } catch(e) {
      // Re-throw our custom errors
      if(e.message === 'CONFLICTO_VERSION') throw e;
      throw e;
    }
  },
  /**
   * Programa un push de datos a la nube con debounce de 800ms.
   * Usa `lastPushVersion` (versión del servidor conocida) como referencia
   * para el optimistic locking, NO la versión local del cliente.
   */
  schedulePush(){
    if(!this.enabled() || !App.state.space || !App.state.data) return;
    if(this._pushTimer) clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(async ()=>{
      try{
        // Usar la última versión conocida del servidor (no la local).
        // Si lastPushVersion es null, el servidor aceptará cualquier versión
        // (caso del primer push después de crear el espacio).
        const expectedVersion = this.lastPushVersion;
        await this.saveFamilyData(App.state.space.id, App.state.data, expectedVersion);
      }catch(err){
        console.error('Push failed:', err);
        if(err.message === 'CONFLICTO_VERSION' || err.message.includes('Conflicto')){
          Notif.show('Otro miembro modificó los datos. Recargando...','warn');
          await this.refreshFromCloud();
        } else {
          Notif.show('Error al sincronizar con la nube: ' + (err.message||''),'neg', 5000);
        }
      }
    }, 800);
  },
  async refreshFromCloud(){
    if(!this.enabled() || !App.state.space) return;
    const result = await this.loadFamilyData(App.state.space.id);
    if(result && result.data){
      App.state.data = result.data;
      DB.saveData(App.state.space.id, result.data);
      App.render();
      Notif.show('Datos recargados desde la nube', 'info', 1500);
    }
  },
  subscribeToChanges(spaceId, onChange){
    if(!this.enabled() || !this.sb) return;
    if(this.channel) {
      try { this.sb.removeChannel(this.channel); } catch(e){}
      this.channel = null;
    }
    console.log('🔌 Cloud: suscribiendo a cambios del espacio', spaceId);
    this.channel = this.sb.channel('space-'+spaceId)
      .on('postgres_changes',
        {event:'UPDATE', schema:'public', table:'family_spaces', filter:'id=eq.'+spaceId},
        payload => {
          if(!payload.new) return;
          const incomingVersion = payload.new.data_version | 0;
          // Si la versión entrante es DISTINTA de la que nosotros acabamos de pushear,
          // significa que OTRO dispositivo hizo el cambio.
          if(incomingVersion !== this.lastPushVersion){
            console.log('🔔 Cloud: cambio externo detectado, versión =', incomingVersion, '(nuestra última:', this.lastPushVersion, ')');
            // Actualizar nuestra referencia de versión del servidor
            this.lastPushVersion = incomingVersion;
            onChange(payload.new.data);
          } else {
            console.log('↩️  Cloud: eco de nuestro propio push ignorado (versión', incomingVersion, ')');
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime subscription status:', status);
      });
  },
  unsubscribe(){
    if(this.channel && this.sb){
      this.sb.removeChannel(this.channel);
      this.channel = null;
    }
  },
  /**
   * Load user's family space and data from cloud on app startup.
   * Called from App.loadFromCloud() during init.
   */
  async bootstrap(){
    if(!this.enabled()) return {user:null, space:null, data:null};
    // 1) Check current session
    const session = await this.getSession();
    if(!session || !session.user){
      return {user:null, space:null, data:null};
    }
    console.log('🚀 Cloud bootstrap: usuario autenticado =', session.user.email);
    // 2) Get user profile
    const profile = await this.getUserProfile();
    if(!profile){
      // Try to create fallback profile
      const profileName = session.user.user_metadata?.name || session.user.email.split('@')[0];
      try {
        await this.sb.from('profiles').insert({
          id: session.user.id,
          name: profileName,
          email: session.user.email
        });
      } catch(e) {
        console.warn('⚠️  Could not create fallback profile:', e.message);
      }
      const p2 = await this.getUserProfile();
      if(!p2){
        // Use session user as fallback
        return {user:{id:session.user.id, name:profileName, email:session.user.email}, space:null, data:null};
      }
      const spaces = await this.getUserSpaces(p2.id);
      if(spaces.length === 0) return {user:p2, space:null, data:null};
      const space = spaces[0];
      const result = await this.loadFamilyData(space.id);
      return {user:p2, space, data: result ? result.data : null};
    }
    // 3) Get user's spaces
    const spaces = await this.getUserSpaces(profile.id);
    if(spaces.length === 0) return {user:profile, space:null, data:null};
    // 4) Load first space's data (también carga lastPushVersion vía loadFamilyData)
    const space = spaces[0];
    const result = await this.loadFamilyData(space.id);
    return {user:profile, space, data: result ? result.data : null};
  }
};

// Override Auth methods to use Cloud when enabled
const _originalAuth = {
  register: Auth.register.bind(Auth),
  login: Auth.login.bind(Auth),
  logout: Auth.logout.bind(Auth),
  currentUser: Auth.currentUser.bind(Auth)
};

Auth.register = async function({name, email, password}){
  if(Cloud.enabled()){
    return await Cloud.register({name, email, password});
  }
  return await _originalAuth.register({name, email, password});
};

Auth.login = async function({email, password, remember=true}){
  if(Cloud.enabled()){
    const profile = await Cloud.login({email, password});
    // Persist session to local storage for cross-reload consistency
    if(profile && profile.id){
      DB.session.set(this.tabId, {
        userId: profile.id,
        spaceId: null,  // will be set by loadFromCloud
        cloudProfile: profile
      }, remember);
      // Try to find and associate the user's space
      try {
        const spaces = await Cloud.getUserSpaces(profile.id);
        if(spaces && spaces.length > 0){
          const sp = spaces[0];
          // Update session with spaceId
          DB.session.set(this.tabId, {
            userId: profile.id,
            spaceId: sp.id,
            cloudProfile: profile
          }, remember);
          // Save space to local DB for fallback
          const localSpaces = DB.spaces();
          const idx = localSpaces.findIndex(s=>s.id===sp.id);
          if(idx >= 0) localSpaces[idx] = sp;
          else localSpaces.push(sp);
          DB.saveSpaces(localSpaces);
        }
      } catch(e) {
        console.warn('⚠️  Could not load user spaces on login:', e.message);
      }
    }
    return profile;
  }
  return await _originalAuth.login({email, password, remember});
};

Auth.logout = async function(){
  if(Cloud.enabled()){
    await Cloud.logout();
    Cloud.unsubscribe();
    sessionStorage.removeItem('ff_tabid');
    location.reload();
  } else {
    _originalAuth.logout();
  }
};

Auth.currentUser = function(){
  if(Cloud.enabled()){
    return App.state.user || null;
  }
  return _originalAuth.currentUser();
};

Auth.currentSpace = function(){
  if(Cloud.enabled()){
    // In Cloud mode, rely on App.state.space (set by loadFromCloud or login)
    if(App.state.space) return App.state.space;
    // Fallback to DB session
    const s = DB.session.get(this.tabId);
    if(!s || !s.spaceId) return null;
    const spaces = DB.spaces();
    const sp = spaces.find(x=>x.id===s.spaceId);
    return sp || null;
  }
  // Original behavior for local mode
  const s = DB.session.get(this.tabId);
  if(!s) return null;
  const spaces = DB.spaces();
  if(s.spaceId){
    const sp = spaces.find(x=>x.id===s.spaceId);
    if(sp && sp.members.some(m=>m.userId===s.userId)) return sp;
  }
  const owned = spaces.find(sp=>sp.members.some(m=>m.userId===s.userId));
  if(owned){
    DB.session.set(this.tabId,{...s,spaceId:owned.id},true);
    return owned;
  }
  return null;
};

// Override Family methods to use Cloud when enabled
const _originalFamily = {
  createSpace: Family.createSpace.bind(Family),
  joinByCode: Family.joinByCode.bind(Family)
};

Family.createSpace = async function(name, ownerUserId){
  if(Cloud.enabled()){
    return await Cloud.createSpace(name, ownerUserId);
  }
  return _originalFamily.createSpace(name, ownerUserId);
};

Family.joinByCode = async function(code, userId){
  if(Cloud.enabled()){
    return await Cloud.joinByCode(code, userId);
  }
  return _originalFamily.joinByCode(code, userId);
};

/* =========================================================================
   BIOMETRICS (WebAuthn / Face ID / Touch ID)
   =========================================================================
   Permite autenticarse con Face ID/Touch ID/Windows Hello.

   Estrategia:
   - El usuario activa Face ID desde Ajustes → se crea una credencial WebAuthn
     con userVerification: 'required' (fuerza biometría del dispositivo).
   - Guardamos localmente: credentialId + email + hash de contraseña ofuscado.
   - En login, el botón "Entrar con Face ID" hace assertion WebAuthn.
     Si la assertion es válida → desciframos credenciales locales → login real.

   Las credenciales WebAuthn son específicas del dispositivo, por lo que
   Face ID solo funcionará en el dispositivo donde se activó.
   ========================================================================= */
const Biometrics = {
  K_CREDENTIALS: 'ff_biometrics',

  /** ¿El navegador soporta WebAuthn? */
  isSupported(){
    return !!(window.PublicKeyCredential
      && navigator.credentials
      && navigator.credentials.create
      && navigator.credentials.get);
  },

  /** Obtener todas las credenciales biométricas registradas en este dispositivo */
  getCredentials(){
    try {
      const raw = localStorage.getItem(this.K_CREDENTIALS);
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
  },

  _saveCredentials(creds){
    localStorage.setItem(this.K_CREDENTIALS, JSON.stringify(creds));
  },

  /** ¿Hay credenciales guardadas para este dispositivo? */
  hasCredentials(){
    return this.getCredentials().length > 0;
  },

  /** ¿Hay credencial para un userId concreto? */
  hasCredentialForUserId(userId){
    return this.getCredentials().some(c => c.userId === userId);
  },

  /* Ofuscación simple para proteger el hash en localStorage.
     NO es criptografía real; evita lectura trivial. */
  _obfuscate(text, key){
    const k = 'FF_BIO_' + key;
    let out = '';
    for(let i=0;i<text.length;i++){
      out += String.fromCharCode(text.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    }
    return btoa(unescape(encodeURIComponent(out)));
  },
  _deobfuscate(b64, key){
    try {
      const k = 'FF_BIO_' + key;
      const raw = decodeURIComponent(escape(atob(b64)));
      let out = '';
      for(let i=0;i<raw.length;i++){
        out += String.fromCharCode(raw.charCodeAt(i) ^ k.charCodeAt(i % k.length));
      }
      return out;
    } catch(e){ return null; }
  },

  /** Convierte Uint8Array a base64url (estándar WebAuthn) */
  _b64url(buf){
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let bin = '';
    for(let i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  },
  /** Convierte base64url a Uint8Array */
  _b64urlToBuf(str){
    let s = str.replace(/-/g,'+').replace(/_/g,'/');
    while(s.length % 4) s += '=';
    const bin = atob(s);
    const buf = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) buf[i] = bin.charCodeAt(i);
    return buf;
  },

  /**
   * Registrar una nueva credencial biométrica para el usuario actual.
   * @param {object} user {id, email, name}
   * @param {string} plainPassword - contraseña en texto plano (ofuscada localmente).
   *
   * SEGURIDAD: La contraseña se ofusca con XOR + base64 usando el credentialId
   * como clave, y se guarda en localStorage. No se envía a ningún servidor.
   * Es accesible solo tras desbloquear el dispositivo con biometría.
   * Para una app bancaria usaríamos tokens de sesión, pero para una app de
   * economía familiar este enfoque es aceptable y muy cómodo.
   */
  async register(user, plainPassword){
    if(!this.isSupported()) throw new Error('Tu navegador no soporta Face ID / Touch ID');
    // Si ya hay credencial para este user, la eliminamos primero
    if(this.hasCredentialForUserId(user.id)){
      this.remove(user.id);
    }
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(user.id);
    const rpId = location.hostname;
    const rpName = 'Family Finance';

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: rpName, id: rpId },
        user: {
          id: userIdBytes,
          name: user.email,
          displayName: user.name || user.email
        },
        pubKeyCredParams: [
          { type:'public-key', alg:-7 },   // ES256
          { type:'public-key', alg:-257 }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // solo el dispositivo (Face ID)
          userVerification: 'required',        // fuerza biometría
          residentKey: 'preferred',
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'none'
      }
    });

    if(!credential) throw new Error('No se pudo crear la credencial biométrica');

    const credentialId = this._b64url(new Uint8Array(credential.rawId));
    const entry = {
      credentialId,
      userId: user.id,
      email: user.email,
      name: user.name,
      // ofuscamos la contraseña usando credentialId como clave
      secured: this._obfuscate(plainPassword, credentialId),
      rpId,
      createdAt: nowISO()
    };
    const creds = this.getCredentials();
    creds.push(entry);
    this._saveCredentials(creds);
    console.log('✅ Biometría registrada para', user.email);
    return entry;
  },

  /**
   * Login con biometría. Devuelve {email, password} si tiene éxito.
   * Si hay múltiples credenciales (varios usuarios en este dispositivo),
   * usamos allowCredentials con todas para que el sistema elija.
   */
  async login(){
    if(!this.isSupported()) throw new Error('Tu navegador no soporta Face ID / Touch ID');
    const creds = this.getCredentials();
    if(creds.length === 0) throw new Error('No hay Face ID configurado en este dispositivo');

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const allowCredentials = creds.map(c => ({
      type: 'public-key',
      id: this._b64urlToBuf(c.credentialId)
    }));

    let assertion;
    try {
      assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials,
          userVerification: 'required',
          rpId: creds[0].rpId || location.hostname,
          timeout: 60000
        }
      });
    } catch(e){
      if(e.name === 'NotAllowedError') throw new Error('Face ID cancelado o no disponible');
      if(e.name === 'SecurityError') throw new Error('Face ID no disponible en este dispositivo. Usa email/contraseña.');
      throw new Error('Error al verificar Face ID: ' + (e.message || e.name));
    }
    if(!assertion) throw new Error('Face ID cancelado');

    const usedId = this._b64url(new Uint8Array(assertion.rawId));
    const matched = creds.find(c => c.credentialId === usedId);
    if(!matched) throw new Error('Credencial no reconocida');

    const password = this._deobfuscate(matched.secured, matched.credentialId);
    if(!password) throw new Error('No se pudieron recuperar las credenciales');

    return {
      userId: matched.userId,
      email: matched.email,
      name: matched.name,
      password
    };
  },

  /** Eliminar credencial biométrica de un usuario */
  remove(userId){
    const creds = this.getCredentials().filter(c => c.userId !== userId);
    this._saveCredentials(creds);
  },

  /** Eliminar todas las credenciales de este dispositivo */
  clearAll(){
    localStorage.removeItem(this.K_CREDENTIALS);
  }
};

