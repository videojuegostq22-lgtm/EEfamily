
/* =========================================================================
   APP STATE & ROUTER
   ========================================================================= */
const App = {
  state: {
    user: null,
    space: null,
    data: null,
    route: 'dashboard',
    period: 'this-month',
    customRange: {from:null,to:null},
    periodLabel: '',
    modal: null,
    fabOpen: false,
    bnavSheet: false,
    notifOpen: false,
    ddOpen: null, // which dropdown is open
    selectedCalDay: null,
    calMonth: monthKey(new Date()),
    filterCategory: null,
    filterType: 'all',
    simulator: {catId:null, reducePct:10, cancelSubs:new Set(), extraIncome:0}
  },
  setData(d){ this.state.data = d; },
  persistData(){ if(this.state.space&&this.state.data) DB.saveData(this.state.space.id,this.state.data); },
  persistSpaces(){ /* spaces array already saved when Family.createSpace/joinByCode called */ },
  load(){
    this.state.user = Auth.currentUser();
    this.state.space = Auth.currentSpace();
    if(this.state.space){
      this.state.data = DB.data(this.state.space.id);
      // Run migration: ensure categories have IDs (fixes pre-bug data)
      if(this.state.data && Family.migrateCategories(this.state.data)){
        DB.saveData(this.state.space.id, this.state.data);
      }
    }
  },
  refreshData(){
    if(!this.state.space) return;
    this.state.data = DB.data(this.state.space.id);
    // Run migration on refresh as well
    if(this.state.data && Family.migrateCategories(this.state.data)){
      DB.saveData(this.state.space.id, this.state.data);
    }
    this.state.space = Auth.currentSpace();
    this.state.user = Auth.currentUser();
  },
  nav(route){
    this.state.route = route;
    this.state.bnavSheet = false;
    this.state.ddOpen = null;
    location.hash = '#/'+route;
    this.render();
  },
  setPeriod(p){
    this.state.period = p;
    this.state.customRange = {from:null,to:null};
    this.render();
  },
  commit(changeLabel,entity){
    const u = this.state.user;
    if(u) Activity.log(this.state.data,this.state.space.id,{userId:u.id,verb:'actualizó',entity,label:changeLabel});
    this.state.data.version = (this.state.data.version|0)+1;
    this.persistData();
    Sync.broadcast(this.state.space.id);
    Notif.maybeFire(this.state.data,this.state.space.id,u.id);
    // Schedule push to cloud if enabled
    if(typeof Cloud !== 'undefined' && Cloud.enabled && Cloud.enabled()) {
      Cloud.schedulePush();
    }
    this.render();
  },
  /**
   * Load user session and family data from cloud on startup.
   * Called by init() when Cloud is enabled.
   */
  async loadFromCloud(){
    if(typeof Cloud === 'undefined' || !Cloud.enabled()) return;
    try {
      const result = await Cloud.bootstrap();
      if(result.user){
        this.state.user = result.user;
        // Also persist to local session for cross-reloads
        DB.session.set(Auth.tabId, {
          userId: result.user.id,
          spaceId: result.space ? result.space.id : null,
          cloudProfile: result.user
        }, true);
      }
      if(result.space){
        this.state.space = result.space;
        // Persist space to local DB as well for fallback
        const spaces = DB.spaces();
        const idx = spaces.findIndex(s=>s.id===result.space.id);
        if(idx >= 0) spaces[idx] = result.space;
        else spaces.push(result.space);
        DB.saveSpaces(spaces);
        // Load member profiles from cloud and save to local DB
        // so Family.getUserById works properly
        if(result.space.members && result.space.members.length > 0){
          try {
            const memberIds = result.space.members.map(m=>m.userId);
            const {data: profiles} = await Cloud.sb
              .from('profiles')
              .select('id,name,email,created_at')
              .in('id', memberIds);
            if(profiles && profiles.length > 0){
              const users = DB.users();
              profiles.forEach(p => {
                const existing = users.findIndex(u=>u.id===p.id);
                const userData = {
                  id: p.id,
                  name: p.name,
                  email: p.email,
                  createdAt: p.created_at,
                  cloudUser: true
                };
                if(existing >= 0) users[existing] = {...users[existing], ...userData};
                else users.push(userData);
              });
              DB.saveUsers(users);
            }
          } catch(e){
            console.warn('⚠️  Could not load member profiles:', e.message);
          }
        }
      }
      if(result.data){
        this.state.data = result.data;
        DB.saveData(result.space.id, result.data);
        // Run migration
        if(Family.migrateCategories(result.data)){
          DB.saveData(result.space.id, result.data);
        }
      }
      // Subscribe to realtime changes
      if(result.space) {
        Cloud.subscribeToChanges(result.space.id, (newData) => {
          this.state.data = newData;
          DB.saveData(result.space.id, newData);
          this.render();
          Notif.show('Datos actualizados por otro miembro','info',1800);
        });
      }
    } catch(e) {
      console.error('Cloud bootstrap error:', e);
      // Don't crash — fall back to local auth
      if(typeof Notif !== 'undefined') {
        Notif.show('Error al cargar desde la nube: ' + (e.message||e), 'neg', 5000);
      }
    }
  }
};

/* =========================================================================
   RENDER HELPERS
   ========================================================================= */
const h = {
  esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); },
  formatDate(iso){
    if(!iso) return '';
    const d=new Date(iso+'T00:00:00');
    return d.toLocaleDateString('es-ES',{day:'numeric',month:'short'});
  },
  formatDateFull(iso){
    if(!iso) return '';
    const d=new Date(iso+'T00:00:00');
    return d.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'});
  },
  timeAgo(iso){
    if(!iso) return '';
    const t=new Date(iso).getTime(), n=Date.now();
    const s = Math.floor((n-t)/1000);
    if(s<60) return 'ahora';
    if(s<3600) return 'hace '+Math.floor(s/60)+' min';
    if(s<86400) return 'hace '+Math.floor(s/3600)+' h';
    if(s<604800) return 'hace '+Math.floor(s/86400)+' d';
    return this.formatDate(iso.slice(0,10));
  }
};

/* =========================================================================
   AUTH SCREEN
   ========================================================================= */
function renderAuth(){
  const root = document.getElementById('app');
  root.innerHTML = `
  <div class="auth">
    <div class="auth-card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
        <div class="brand-mark">FF</div>
        <div>
          <div style="font-size:20px;font-weight:700;letter-spacing:-.02em">Family Finance</div>
          <div style="font-size:12.5px;color:var(--text-2)">Nuestra economía familiar</div>
        </div>
      </div>
      <div class="auth-tabs">
        <button class="active" data-tab="login">Iniciar sesión</button>
        <button data-tab="register">Crear cuenta</button>
        <button data-tab="join">Unirme</button>
      </div>
      <form id="auth-form" autocomplete="on">
        <div data-panel="register" class="hidden">
          <div class="field">
            <label for="reg-name">Nombre</label>
            <input id="reg-name" class="input" type="text" autocomplete="name" required>
          </div>
        </div>
        <div class="field">
          <label for="auth-email">Email</label>
          <input id="auth-email" class="input" type="email" autocomplete="email" required>
        </div>
        <div class="field">
          <label for="auth-pw">Contraseña</label>
          <input id="auth-pw" class="input" type="password" autocomplete="current-password" required>
        </div>
        <div data-panel="join" class="hidden">
          <div class="field">
            <label for="join-code">Código de invitación</label>
            <input id="join-code" class="input" type="text" placeholder="Ej: A1B2C3" style="text-transform:uppercase;letter-spacing:.2em" maxlength="8">
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-2);margin-bottom:14px">
          <input type="checkbox" id="remember" checked> Recordar sesión
        </label>
        <button type="submit" class="btn btn-primary btn-block" id="auth-submit">Entrar</button>
        <div id="biometric-login-wrap" style="display:none;margin-top:12px">
          <div style="display:flex;align-items:center;gap:10px;margin:10px 0;font-size:12px;color:var(--text-3)">
            <div style="flex:1;height:1px;background:var(--border)"></div>
            <span>o</span>
            <div style="flex:1;height:1px;background:var(--border)"></div>
          </div>
          <button type="button" class="btn btn-biometric btn-block" id="biometric-login-btn">
            <span class="bio-icon">🔐</span>
            <span>Entrar con Face ID</span>
          </button>
        </div>
        <div id="auth-error" style="margin-top:10px;color:var(--neg);font-size:13px;text-align:center"></div>
        <div class="hint">
          <button type="button" id="forgot" style="color:var(--brand);font-size:12.5px">¿Olvidaste la contraseña?</button>
        </div>
      </form>
      <div class="auth-demo">
        <button type="button" id="demo-btn">✨ Explorar con datos de demostración</button>
        <div style="font-size:11.5px;color:var(--text-3);margin-top:6px">Crea una economía de ejemplo con Daniel y María</div>
      </div>
    </div>
  </div>`;

  let tab = 'login';
  const panels = root.querySelectorAll('[data-panel]');
  const tabs = root.querySelectorAll('.auth-tabs button');
  const submit = root.querySelector('#auth-submit');
  const updateTab = ()=>{
    tabs.forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    panels.forEach(p=>p.classList.toggle('hidden',p.dataset.panel!==tab));
    const rp = root.querySelector('#auth-pw');
    rp.setAttribute('autocomplete', tab==='register'?'new-password':'current-password');
    submit.textContent = tab==='register'?'Crear cuenta': tab==='join'?'Unirme a economía':'Entrar';
  };
  tabs.forEach(b=>b.addEventListener('click',()=>{ tab=b.dataset.tab; updateTab(); }));
  updateTab();

  const handleSubmit = async e=>{
    if(e) e.preventDefault();
    const errEl = root.querySelector('#auth-error');
    const submitBtn = root.querySelector('#auth-submit');
    errEl.innerHTML = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Procesando...';
    const email = root.querySelector('#auth-email').value.trim();
    const pw = root.querySelector('#auth-pw').value;
    const remember = root.querySelector('#remember').checked;
    try{
      if(tab==='register'){
        const name = root.querySelector('#reg-name').value.trim();
        if(!name) throw new Error('Introduce tu nombre');
        if(!email) throw new Error('Introduce tu email');
        if(!pw) throw new Error('Introduce una contraseña');
        try {
          const u = await Auth.register({name,email,password:pw});
          // Try to login immediately (works if Confirm email is disabled)
          try {
            await Auth.login({email,password:pw,remember});
            App.state.user = u;
            App.state.space = Auth.currentSpace();
            if(App.state.space){
              App.state.data = DB.data(App.state.space.id);
              if(App.state.data && Family.migrateCategories(App.state.data)){
                DB.saveData(App.state.space.id, App.state.data);
              }
              App.nav('dashboard');
            } else {
              App.nav('onboarding');
            }
          } catch(loginErr){
            if(loginErr && loginErr.code === 'EMAIL_NOT_CONFIRMED'){
              // Show confirmation screen
              showEmailConfirmationScreen(email, name);
              return;
            }
            // Other login error after successful register
            Notif.show('Cuenta creada, pero no se pudo iniciar sesión: ' + loginErr.message, 'warn', 5000);
            App.state.user = u;
            App.nav('onboarding');
          }
        } catch(regErr) {
          if(regErr && regErr.code === 'EMAIL_NOT_CONFIRMED'){
            showEmailConfirmationScreen(regErr.email || email, name);
            return;
          }
          throw regErr;
        }
      } else if(tab==='login'){
        const u = await Auth.login({email,password:pw,remember});
        App.state.user = u;
        // In Cloud mode, reload full state from cloud to get latest data
        if(typeof Cloud !== 'undefined' && Cloud.enabled && Cloud.enabled()){
          try {
            await App.loadFromCloud();
          } catch(e){
            console.warn('⚠️  Could not reload from cloud after login:', e.message);
          }
        }
        App.state.space = Auth.currentSpace();
        if(App.state.space){
          App.state.data = DB.data(App.state.space.id);
          if(App.state.data && Family.migrateCategories(App.state.data)){
            DB.saveData(App.state.space.id, App.state.data);
          }
          App.nav('dashboard');
        } else {
          App.nav('onboarding');
        }
      } else {
        const code = root.querySelector('#join-code').value.trim().toUpperCase();
        if(!code) throw new Error('Introduce el código de invitación');
        const u = Auth.currentUser() || await Auth.login({email,password:pw,remember});
        App.state.user = u;
        const sp = await Family.joinByCode(code,u.id);
        Auth.joinSpace(sp.id);
        App.state.space = sp;
        App.state.data = DB.data(sp.id);
        if(App.state.data && Family.migrateCategories(App.state.data)){
          DB.saveData(sp.id, App.state.data);
        }
        const d = App.state.data;
        Notif.add(d,sp.id,{text:`${u.name} se ha unido a la economía familiar`,kind:'info'});
        DB.saveData(sp.id,d);
        Sync.broadcast(sp.id);
        Sync.broadcastNotify(`${u.name} se ha unido a la economía`,'pos');
        App.nav('dashboard');
      }
    }catch(err){
      console.error('[auth]',err);
      if(err && err.code === 'EMAIL_NOT_CONFIRMED'){
        showEmailConfirmationScreen(err.email || email);
      } else {
        errEl.textContent = err.message || 'Error desconocido';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = tab==='register'?'Crear cuenta': tab==='join'?'Unirme a economía':'Entrar';
    }
  };

  function showEmailConfirmationScreen(email, name){
    const card = root.querySelector('.auth-card');
    if(!card) return;
    card.innerHTML = `
      <div style="text-align:center;padding:16px 0">
        <div style="font-size:48px;margin-bottom:12px">📧</div>
        <h2 style="margin:0 0 8px;font-size:20px">Revisa tu email</h2>
        <p style="font-size:14px;color:var(--text-2);margin-bottom:20px">
          Hemos enviado un email de confirmación a<br>
          <b style="color:var(--text)">${h.esc(email)}</b>
        </p>
        <div class="card" style="background:var(--surface-2);padding:16px;margin-bottom:18px;text-align:left">
          <div style="font-size:13px;color:var(--text-2);margin-bottom:8px"><b>📋 Pasos a seguir:</b></div>
          <ol style="font-size:13px;color:var(--text-2);margin:0;padding-left:20px;line-height:1.6">
            <li>Abre tu bandeja de entrada</li>
            <li>Haz click en el enlace de confirmación</li>
            <li>Vuelve aquí e inicia sesión</li>
          </ol>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-primary" id="resend-email-btn">📬 Reenviar email</button>
          <button class="btn btn-ghost" id="back-to-login">← Volver al inicio de sesión</button>
        </div>
        <div id="resend-msg" style="margin-top:12px;font-size:13px;color:var(--text-2)"></div>
        <div class="hint" style="margin-top:16px">
          <details style="text-align:left">
            <summary style="cursor:pointer;font-size:12.5px;color:var(--text-2)">¿No quieres confirmar emails? (modo testing)</summary>
            <div style="margin-top:8px;font-size:12px;color:var(--text-3);padding:10px;background:var(--surface-2);border-radius:8px">
              En Supabase → <b>Authentication</b> → <b>Providers</b> → <b>Email</b>, desactiva
              "Confirm email" y guarda. Los nuevos registros no requerirán confirmación.
            </div>
          </details>
        </div>
      </div>
    `;
    root.querySelector('#resend-email-btn')?.addEventListener('click', async ()=>{
      const btn = root.querySelector('#resend-email-btn');
      const msg = root.querySelector('#resend-msg');
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      try {
        if(typeof Cloud !== 'undefined' && Cloud.resendConfirmation){
          await Cloud.resendConfirmation(email);
          msg.textContent = '✅ Email reenviado correctamente';
          msg.style.color = 'var(--pos)';
        } else {
          throw new Error('Cloud no disponible');
        }
      } catch(e) {
        msg.textContent = '❌ ' + (e.message || 'Error al reenviar');
        msg.style.color = 'var(--neg)';
      } finally {
        btn.disabled = false;
        btn.textContent = '📬 Reenviar email';
      }
    });
    root.querySelector('#back-to-login')?.addEventListener('click', ()=>{
      renderAuth();
    });
  }
  root.querySelector('#auth-form').addEventListener('submit', handleSubmit);
  // Also bind the submit button directly as fallback
  root.querySelector('#auth-submit')?.addEventListener('click', handleSubmit);

  root.querySelector('#demo-btn').addEventListener('click',()=> loadDemoAndEnter());

  root.querySelector('#forgot').addEventListener('click',()=>{
    Notif.show('Recuperación de contraseña no disponible en esta demo. Usa "Explorar datos de demostración".','info',5000);
  });

  /* ====== BIOMETRIC LOGIN BUTTON ====== */
  if(typeof Biometrics !== 'undefined' && Biometrics.isSupported() && Biometrics.hasCredentials()){
    const bioWrap = root.querySelector('#biometric-login-wrap');
    const bioBtn = root.querySelector('#biometric-login-btn');
    if(bioWrap && bioBtn){
      bioWrap.style.display = 'block';
      bioBtn.addEventListener('click', async ()=>{
        const errEl = root.querySelector('#auth-error');
        errEl.innerHTML = '';
        bioBtn.disabled = true;
        bioBtn.innerHTML = '<span class="bio-icon">🔐</span><span>Verificando...</span>';
        try {
          const creds = await Biometrics.login();
          // Real login with recovered credentials
          const u = await Auth.login({email:creds.email, password:creds.password, remember:true});
          App.state.user = u;
          if(typeof Cloud !== 'undefined' && Cloud.enabled && Cloud.enabled()){
            try { await App.loadFromCloud(); } catch(e){ console.warn('Cloud reload failed:', e); }
          }
          App.state.space = Auth.currentSpace();
          if(App.state.space){
            App.state.data = DB.data(App.state.space.id);
            if(App.state.data && Family.migrateCategories(App.state.data)){
              DB.saveData(App.state.space.id, App.state.data);
            }
            App.nav('dashboard');
          } else {
            App.nav('onboarding');
          }
        } catch(e){
          console.error('[biometric-login]', e);
          errEl.textContent = e.message || 'Error al verificar Face ID';
          bioBtn.disabled = false;
          bioBtn.innerHTML = '<span class="bio-icon">🔐</span><span>Entrar con Face ID</span>';
        }
      });
    }
  }
}

/* =========================================================================
   ONBOARDING WIZARD
   ========================================================================= */
function renderOnboarding(){
  const root = document.getElementById('app');
  const u = App.state.user;
  let step = 0;
  const answers = {people:2, income:300000, expense:200000, savings:500000, debt:0, goal:'', spaceName:`Economía de ${u.name}`};
  const steps = [
    {title:'Bienvenido/a, '+h.esc(u.name),sub:'Vamos a configurar tu economía familiar en menos de un minuto.',render:()=>`
      <div class="card" style="background:var(--surface-2);padding:20px;margin-bottom:18px">
        <div style="font-size:14px;color:var(--text-2)">Empezamos creando tu <b style="color:var(--text)">Family Space</b>. Podrás invitar a tu pareja al final.</div>
      </div>
      <div class="field"><label>Nombre de vuestra economía</label>
        <input class="input" id="ob-name" value="${h.esc(answers.spaceName)}">
      </div>`},
    {title:'¿Cuántos sois?',sub:'Número de personas en la economía familiar.',render:()=>`
      <div class="seg" style="width:100%">
        ${[1,2,3,4].map(n=>`<button type="button" data-n="${n}" ${answers.people===n?'class="active"':''}>${n}</button>`).join('')}
      </div>`},
    {title:'Ingresos mensuales aprox.',sub:'Suma de todos los ingresos habituales de la familia.',render:()=>`
      <div class="field"><label>Total mensual</label>
        <input class="input" type="text" id="ob-income" value="${h.esc(EUR.format(answers.income/100))}" inputmode="decimal">
      </div>`},
    {title:'Gastos mensuales aprox.',sub:'Incluye vivienda, alimentación, transporte, ocio, etc.',render:()=>`
      <div class="field"><label>Total mensual</label>
        <input class="input" type="text" id="ob-expense" value="${h.esc(EUR.format(answers.expense/100))}" inputmode="decimal">
      </div>`},
    {title:'Ahorros actuales',sub:'Dinero que tenéis disponible en cuentas.',render:()=>`
      <div class="field"><label>Total ahorrado</label>
        <input class="input" type="text" id="ob-savings" value="${h.esc(EUR.format(answers.savings/100))}" inputmode="decimal">
      </div>`},
    {title:'¿Tenéis deudas?',sub:'Hipotecas, préstamos, financiaciones... Introduce el total pendiente.',render:()=>`
      <div class="field"><label>Deuda pendiente</label>
        <input class="input" type="text" id="ob-debt" value="${h.esc(EUR.format(answers.debt/100))}" inputmode="decimal">
      </div>
      <div class="field"><label>Primer objetivo (opcional)</label>
        <input class="input" type="text" id="ob-goal" placeholder="Ej: Vacaciones, Coche, Fondo de emergencia..." value="${h.esc(answers.goal)}">
      </div>`}
  ];

  const renderStep = ()=>{
    const s = steps[step];
    root.innerHTML = `
    <div class="wizard">
      <div class="wizard-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="font-size:12px;color:var(--text-3)">👤 ${h.esc(u.name)} · ${h.esc(u.email)}</div>
          <button class="btn btn-ghost" id="ob-logout" style="font-size:12px;padding:4px 10px">Cerrar sesión</button>
        </div>
        <div class="wizard-steps">
          ${steps.map((_,i)=>`<i class="${i<step?'done':i===step?'active':''}"></i>`).join('')}
        </div>
        <h2>${h.esc(s.title)}</h2>
        <p class="lead">${h.esc(s.sub)}</p>
        <div id="ob-content">${s.render()}</div>
        <div style="display:flex;justify-content:space-between;margin-top:24px;gap:8px">
          <button class="btn btn-ghost" id="ob-back" ${step===0?'disabled':''}>← Atrás</button>
          <button class="btn btn-primary" id="ob-next">${step===steps.length-1?'Crear economía →':'Siguiente →'}</button>
        </div>
      </div>
    </div>`;

    root.querySelectorAll('.seg button').forEach(b=>b.addEventListener('click',()=>{
      answers.people = parseInt(b.dataset.n,10);
      renderStep();
    }));

    const collect = ()=>{
      const nameEl = root.querySelector('#ob-name');
      if(nameEl) answers.spaceName = nameEl.value.trim()||'Economía familiar';
      const inc = root.querySelector('#ob-income'); if(inc) answers.income = parseMoney(inc.value);
      const exp = root.querySelector('#ob-expense'); if(exp) answers.expense = parseMoney(exp.value);
      const sav = root.querySelector('#ob-savings'); if(sav) answers.savings = parseMoney(sav.value);
      const deb = root.querySelector('#ob-debt'); if(deb) answers.debt = parseMoney(deb.value);
      const goa = root.querySelector('#ob-goal'); if(goa) answers.goal = goa.value.trim();
    };

    root.querySelector('#ob-back').addEventListener('click',()=>{ collect(); if(step>0){step--;renderStep();} });
    root.querySelector('#ob-next').addEventListener('click',async ()=>{
      collect();
      const btn = root.querySelector('#ob-next');
      if(step<steps.length-1){ step++; renderStep(); }
      else {
        btn.disabled = true;
        btn.textContent = 'Creando economía...';
        try {
          await finishOnboarding();
        } catch(e) {
          console.error('Onboarding error:', e);
          Notif.show('Error al crear la economía: ' + (e.message||e), 'neg', 6000);
          btn.disabled = false;
          btn.textContent = 'Crear economía →';
        }
      }
    });
    // Logout button - allows stuck users to return to login screen
    root.querySelector('#ob-logout')?.addEventListener('click', async ()=>{
      if(confirm('¿Cerrar sesión? Volverás a la pantalla de inicio de sesión.')){
        try { await Auth.logout(); } catch(e){ /* ignore */ }
        renderAuth();
      }
    });
  };
  renderStep();

  async function finishOnboarding(){
    console.log('🚀 Creando espacio familiar:', answers.spaceName);
    const sp = await Family.createSpace(answers.spaceName, App.state.user.id);
    console.log('✅ Espacio creado:', sp.id);
    Auth.joinSpace(sp.id);
    App.state.space = sp;
    App.state.data = DB.data(sp.id);
    if(!App.state.data){
      // Cloud mode might not have saved locally yet; initialize empty
      App.state.data = Family.emptyData();
      DB.saveData(sp.id, App.state.data);
    }
    const d = App.state.data;
    // create default accounts
    const bankAcc = {id:uid('a'),name:'Cuenta Nómina',type:'bank',initialBalance:answers.savings||0,color:'#6366F1',createdBy:App.state.user.id,createdAt:nowISO(),archived:false};
    const cashAcc = {id:uid('a'),name:'Efectivo',type:'cash',initialBalance:0,color:'#F59E0B',createdBy:App.state.user.id,createdAt:nowISO(),archived:false};
    d.accounts.push(bankAcc,cashAcc);
    // seed a starting income
    const salaryCat = d.categories.find(c=>c.name==='Sueldo');
    d.transactions.push({
      id:uid('t'), type:'income', amount:answers.income, date:todayISO(), categoryId:salaryCat.id, accountId:bankAcc.id,
      description:'Ingreso inicial (configuración)', createdBy:App.state.user.id, createdAt:nowISO(), updatedAt:nowISO(), version:1
    });
    const targetSaving = Math.max(0,answers.income - answers.expense);
    const expenseSplits = [
      {name:'Alimentación',ratio:0.18},
      {name:'Vivienda',ratio:0.30},
      {name:'Transporte',ratio:0.08},
      {name:'Ocio',ratio:0.06},
      {name:'Restaurantes',ratio:0.06},
      {name:'Suministros',ratio:0.06},
      {name:'Suscripciones',ratio:0.04}
    ];
    const cmk = monthKey(new Date());
    expenseSplits.forEach(s=>{
      const cat = d.categories.find(c=>c.name===s.name);
      if(cat){
        const limit = Math.round(answers.expense*s.ratio);
        if(limit>0) d.budgets.push({id:uid('b'),categoryId:cat.id,month:cmk,limit,createdBy:App.state.user.id,updatedAt:nowISO(),version:1});
      }
    });
    if(answers.goal){
      d.goals.push({id:uid('g'),name:answers.goal,icon:'🎯',target:Math.max(100000, targetSaving*12),saved:0,deadline:null,color:'#6366F1',createdBy:App.state.user.id,createdAt:nowISO()});
    }
    if(answers.debt>0){
      d.debts.push({id:uid('d'),name:'Deuda',type:'loan',initial:answers.debt,outstanding:answers.debt,rate:0,payment:Math.round(answers.debt/60),paymentDay:5,createdBy:App.state.user.id});
    }
    Activity.log(d,sp.id,{userId:App.state.user.id,verb:'creó',entity:'family',label:'Economía familiar'});
    DB.saveData(sp.id,d);
    // Push to cloud if enabled
    if(typeof Cloud !== 'undefined' && Cloud.enabled && Cloud.enabled()){
      Cloud.schedulePush();
      Cloud.subscribeToChanges(sp.id, (newData) => {
        App.state.data = newData;
        DB.saveData(sp.id, newData);
        App.render();
        Notif.show('Datos actualizados por otro miembro','info',1800);
      });
    }
    // Go to invite screen
    App.state.route='invite';
    App.render();
  }
}

/* =========================================================================
   INVITE SCREEN
   ========================================================================= */
function renderInvite(){
  const root = document.getElementById('app');
  const sp = App.state.space;
  root.innerHTML = `
  <div class="wizard">
    <div class="wizard-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-size:12px;color:var(--text-3)">👤 ${h.esc(App.state.user.name)}</div>
        <button class="btn btn-ghost" id="inv-logout" style="font-size:12px;padding:4px 10px">Cerrar sesión</button>
      </div>
      <h2 style="margin-top:0">✅ Economía familiar creada</h2>
      <p class="lead"><b>${h.esc(sp.name)}</b>. Ahora invita a tu pareja para compartir los datos.</p>
      <div class="card" style="padding:18px;margin-bottom:14px">
        <div class="small mb-8">Comparte este código con tu pareja:</div>
        <div style="font-family:ui-monospace,Menlo,monospace;font-size:32px;letter-spacing:.3em;text-align:center;padding:16px;background:var(--surface-2);border-radius:14px;font-weight:700">${h.esc(sp.inviteCode)}</div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:center">
          <button class="btn btn-soft" id="copy-code-invite">Copiar código</button>
          <button class="btn btn-ghost" id="share-link">Compartir</button>
        </div>
        <div class="small center" style="margin-top:12px">Tu pareja debe registrarse con su email y luego usar "Unirme" con este código.</div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" id="skip-invite">Saltar por ahora</button>
        <button class="btn btn-primary" id="go-dashboard">Ir al Dashboard →</button>
      </div>
    </div>
  </div>`;
  root.querySelector('#copy-code-invite').addEventListener('click',()=>{
    navigator.clipboard?.writeText(sp.inviteCode);
    Notif.show('Código copiado','pos');
  });
  root.querySelector('#share-link').addEventListener('click',async ()=>{
    const text = `Únete a nuestra economía familiar en Family Finance. Código: ${sp.inviteCode}`;
    if(navigator.share) await navigator.share({title:'Family Finance',text});
    else { navigator.clipboard?.writeText(text); Notif.show('Texto copiado','pos'); }
  });
  const goDash = ()=>{ App.state.route='dashboard'; location.hash='#/dashboard'; App.render(); };
  root.querySelector('#skip-invite').addEventListener('click',goDash);
  root.querySelector('#go-dashboard').addEventListener('click',goDash);
  // Logout button for users who want to switch accounts
  root.querySelector('#inv-logout')?.addEventListener('click', async ()=>{
    if(confirm('¿Cerrar sesión? Volverás a la pantalla de inicio de sesión.')){
      try { await Auth.logout(); } catch(e){ /* ignore */ }
      renderAuth();
    }
  });
}

