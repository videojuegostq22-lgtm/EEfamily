
/* =========================================================================
   MODAL HELPERS
   ========================================================================= */
function openModal(html,onMount){
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop open" id="mbd"><div class="modal" onclick="event.stopPropagation()"><div class="grip"></div>${html}</div></div>`;
  const bdp = root.querySelector('#mbd');
  bdp.addEventListener('click',e=>{ if(e.target===bdp) closeModal(); });
  if(onMount) onMount(root.querySelector('.modal'));
  root.querySelector('.modal input:not([type=checkbox]),.modal select')?.focus();
}
function closeModal(){
  document.getElementById('modal-root').innerHTML = '';
}

function openTxModal(kind='expense', txId=null){
  const d = App.state.data;
  const tx = txId?d.transactions.find(t=>t.id===txId):null;
  if(tx) kind = tx.type;
  const cats = d.categories.filter(c=> kind==='transfer'?false : c.type===(kind==='income'?'income':'expense'));
  const accounts = d.accounts;
  openModal(`
    <h2>${tx?'Editar movimiento':(kind==='expense'?'💸 Añadir gasto':kind==='income'?'💰 Añadir ingreso':'🔁 Transferencia')}</h2>
    <div class="seg mb-16" id="kind-seg">
      <button data-k="expense" ${kind==='expense'?'class="active"':''}>Gasto</button>
      <button data-k="income" ${kind==='income'?'class="active"':''}>Ingreso</button>
      <button data-k="transfer" ${kind==='transfer'?'class="active"':''}>Transferencia</button>
    </div>
    <div class="field"><label>Importe</label><input class="input num" id="tx-amount" type="text" inputmode="decimal" placeholder="0,00" value="${tx?fmtMoneyPlain(tx.amount):''}" autofocus></div>
    ${kind==='transfer'?`
      <div class="grid-2">
        <div class="field"><label>Desde</label><select class="select" id="tx-from">${accounts.map(a=>`<option value="${a.id}" ${tx?.accountId===a.id?'selected':''}>${h.esc(a.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Hacia</label><select class="select" id="tx-to">${accounts.map(a=>`<option value="${a.id}" ${tx?.toAccountId===a.id?'selected':''}>${h.esc(a.name)}</option>`).join('')}</select></div>
      </div>
    `:`
      <div class="field"><label>Categoría</label>
        <div class="cat-grid" id="cat-grid">
          ${cats.map(c=>`<div class="chip ${tx?.categoryId===c.id?'active':''}" data-cat="${c.id}" style="background:${c.color}22;color:${c.color}"><span class="emoji">${catIcon(c.name)}</span>${h.esc(c.name)}</div>`).join('')}
        </div>
      </div>
      <div class="field"><label>Cuenta</label><select class="select" id="tx-account">${accounts.map(a=>`<option value="${a.id}" ${tx?.accountId===a.id?'selected':''}>${h.esc(a.name)}</option>`).join('')}</select></div>
    `}
    <div class="grid-2">
      <div class="field"><label>Fecha</label><input class="input" type="date" id="tx-date" value="${tx?.date||todayISO()}"></div>
      <div class="field"><label>Recurrente</label><select class="select" id="tx-recurring"><option value="">No</option><option value="monthly" ${tx?.recurring?.freq==='monthly'?'selected':''}>Mensual</option></select></div>
    </div>
    <div class="field"><label>Descripción</label><input class="input" id="tx-desc" placeholder="Ej: Compra semanal" value="${h.esc(tx?.description||'')}"></div>
    <div class="field"><label>Notas</label><textarea class="textarea" id="tx-notes">${h.esc(tx?.notes||'')}</textarea></div>
    <div class="modal-actions">
      ${tx?'<button class="btn btn-danger" id="tx-delete">Eliminar</button>':''}
      <button class="btn btn-ghost" id="cancel">Cancelar</button>
      <button class="btn btn-primary" id="save">Guardar</button>
    </div>
  `, modal=>{
    let selectedCat = tx?.categoryId || null;
    let currentKind = kind;
    const rebindCatGrid = ()=>{
      const grid = modal.querySelector('#cat-grid');
      if(!grid) return;
      const cats = d.categories.filter(c=>c.type===(currentKind==='income'?'income':'expense'));
      grid.innerHTML = cats.map(c=>`<div class="chip ${selectedCat===c.id?'active':''}" data-cat="${c.id}" style="background:${c.color}22;color:${c.color}"><span class="emoji">${catIcon(c.name)}</span>${h.esc(c.name)}</div>`).join('');
      grid.querySelectorAll('.chip').forEach(ch=>ch.addEventListener('click',()=>{
        selectedCat = ch.dataset.cat;
        grid.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
        ch.classList.add('active');
      }));
    };
    rebindCatGrid();
    modal.querySelectorAll('#kind-seg button').forEach(b=>b.addEventListener('click',()=>{
      modal.querySelectorAll('#kind-seg button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      currentKind = b.dataset.k;
      // re-render modal content (simplified: reload modal)
      openTxModal(currentKind, txId);
    }));
    modal.querySelector('#cancel').addEventListener('click',closeModal);
    modal.querySelector('#save').addEventListener('click',()=>{
      const amount = parseMoney(modal.querySelector('#tx-amount').value);
      if(amount<=0){ Notif.show('Importe no válido','neg'); return; }
      const date = modal.querySelector('#tx-date').value || todayISO();
      const desc = modal.querySelector('#tx-desc').value;
      const notes = modal.querySelector('#tx-notes').value;
      const recurring = modal.querySelector('#tx-recurring').value;
      const now = nowISO();
      if(currentKind==='transfer'){
        const from = modal.querySelector('#tx-from').value;
        const to = modal.querySelector('#tx-to').value;
        if(from===to){ Notif.show('Cuenta origen y destino deben ser distintas','neg'); return; }
        if(tx){
          Object.assign(tx,{amount,date,accountId:from,toAccountId:to,description:desc,notes,recurring:recurring?{freq:recurring}:null,updatedAt:now,version:(tx.version|0)+1});
        } else {
          d.transactions.push({id:uid('t'),type:'transfer',amount,date,accountId:from,toAccountId:to,description:desc,notes,recurring:recurring?{freq:recurring}:null,createdBy:App.state.user.id,createdAt:now,updatedAt:now,version:1});
        }
      } else {
        if(!selectedCat){ Notif.show('Selecciona una categoría','neg'); return; }
        const accountId = modal.querySelector('#tx-account').value;
        if(tx){
          Object.assign(tx,{type:currentKind,amount,categoryId:selectedCat,accountId,date,description:desc,notes,recurring:recurring?{freq:recurring}:null,updatedAt:now,version:(tx.version|0)+1});
        } else {
          d.transactions.push({id:uid('t'),type:currentKind,amount,categoryId:selectedCat,accountId,date,description:desc,notes,recurring:recurring?{freq:recurring}:null,createdBy:App.state.user.id,createdAt:now,updatedAt:now,version:1});
        }
      }
      closeModal();
      App.commit(tx?`Movimiento actualizado`:`${currentKind==='income'?'Ingreso':currentKind==='expense'?'Gasto':'Transferencia'} añadido`);
    });
    if(tx){
      modal.querySelector('#tx-delete').addEventListener('click',()=>{
        if(confirm('¿Eliminar este movimiento?')){
          d.transactions = d.transactions.filter(t=>t.id!==tx.id);
          closeModal();
          App.commit('Movimiento eliminado');
        }
      });
    }
  });
}

function openBudgetModal(budgetId){
  const d = App.state.data;
  const b = budgetId?d.budgets.find(x=>x.id===budgetId):null;
  const expCats = d.categories.filter(c=>c.type==='expense');
  const used = d.budgets.filter(x=>x.month===monthKey(new Date())).map(x=>x.categoryId);
  const available = expCats.filter(c=>b?.categoryId===c.id || !used.includes(c.id));
  openModal(`
    <h2>${b?'Editar presupuesto':'Nuevo presupuesto'}</h2>
    <div class="field"><label>Categoría</label>
      <select class="select" id="b-cat">${available.map(c=>`<option value="${c.id}" ${b?.categoryId===c.id?'selected':''}>${catIcon(c.name)} ${h.esc(c.name)}</option>`).join('')}</select>
    </div>
    <div class="field"><label>Límite mensual (€)</label><input class="input num" id="b-limit" type="text" inputmode="decimal" value="${b?fmtMoneyPlain(b.limit):''}"></div>
    <div class="modal-actions">
      ${b?'<button class="btn btn-danger" id="b-del">Eliminar</button>':''}
      <button class="btn btn-ghost" id="cancel">Cancelar</button>
      <button class="btn btn-primary" id="save">Guardar</button>
    </div>
  `, modal=>{
    modal.querySelector('#cancel').addEventListener('click',closeModal);
    modal.querySelector('#save').addEventListener('click',()=>{
      const catId = modal.querySelector('#b-cat').value;
      const limit = parseMoney(modal.querySelector('#b-limit').value);
      if(limit<=0){ Notif.show('Introduce un límite','neg'); return; }
      const mk = monthKey(new Date());
      if(b){ b.categoryId=catId; b.limit=limit; b.updatedAt=nowISO(); b.version=(b.version|0)+1; }
      else d.budgets.push({id:uid('b'),categoryId:catId,month:mk,limit,createdBy:App.state.user.id,updatedAt:nowISO(),version:1});
      closeModal(); App.commit('Presupuesto guardado');
    });
    if(b){
      modal.querySelector('#b-del').addEventListener('click',()=>{
        d.budgets = d.budgets.filter(x=>x.id!==b.id);
        closeModal(); App.commit('Presupuesto eliminado');
      });
    }
  });
}

function openGoalModal(goalId){
  const d = App.state.data;
  const g = goalId?d.goals.find(x=>x.id===goalId):null;
  openModal(`
    <h2>${g?'Editar objetivo':'Nuevo objetivo'}</h2>
    <div class="field"><label>Nombre</label><input class="input" id="g-name" value="${h.esc(g?.name||'')}" placeholder="Ej: Vacaciones"></div>
    <div class="field"><label>Icono</label><input class="input" id="g-icon" value="${h.esc(g?.icon||'🎯')}" maxlength="4"></div>
    <div class="grid-2">
      <div class="field"><label>Objetivo (€)</label><input class="input num" id="g-target" type="text" inputmode="decimal" value="${g?fmtMoneyPlain(g.target):''}"></div>
      <div class="field"><label>Ahorrado hasta ahora (€)</label><input class="input num" id="g-saved" type="text" inputmode="decimal" value="${g?fmtMoneyPlain(g.saved):'0'}"></div>
    </div>
    <div class="field"><label>Fecha límite (opcional)</label><input class="input" id="g-deadline" type="date" value="${g?.deadline||''}"></div>
    <div class="modal-actions">
      ${g?'<button class="btn btn-danger" id="g-del">Eliminar</button>':''}
      <button class="btn btn-ghost" id="cancel">Cancelar</button>
      <button class="btn btn-primary" id="save">Guardar</button>
    </div>
  `, modal=>{
    modal.querySelector('#cancel').addEventListener('click',closeModal);
    modal.querySelector('#save').addEventListener('click',()=>{
      const name = modal.querySelector('#g-name').value.trim();
      if(!name){ Notif.show('Introduce un nombre','neg'); return; }
      const target = parseMoney(modal.querySelector('#g-target').value);
      const saved = parseMoney(modal.querySelector('#g-saved').value);
      const deadline = modal.querySelector('#g-deadline').value || null;
      const icon = modal.querySelector('#g-icon').value || '🎯';
      if(target<=0){ Notif.show('Objetivo no válido','neg'); return; }
      if(g){ Object.assign(g,{name,icon,target,saved,deadline,updatedAt:nowISO(),version:(g.version|0)+1}); }
      else d.goals.push({id:uid('g'),name,icon,target,saved,deadline,color:'#6366F1',createdBy:App.state.user.id,createdAt:nowISO()});
      closeModal(); App.commit('Objetivo guardado');
    });
    if(g){
      modal.querySelector('#g-del').addEventListener('click',()=>{
        d.goals = d.goals.filter(x=>x.id!==g.id); closeModal(); App.commit('Objetivo eliminado');
      });
    }
  });
}

function openGoalAddModal(goalId){
  const d = App.state.data;
  const g = d.goals.find(x=>x.id===goalId);
  openModal(`
    <h2>Añadir ahorro a "${h.esc(g.name)}"</h2>
    <div class="small mb-12">Actualmente ahorrado: <b class="num">${fmtMoney(g.saved)}</b> de ${fmtMoney(g.target)}</div>
    <div class="field"><label>Cantidad a añadir</label><input class="input num" id="ga-amount" type="text" inputmode="decimal" autofocus></div>
    <div class="field"><label>Cuenta de origen</label><select class="select" id="ga-account">${d.accounts.map(a=>`<option value="${a.id}">${h.esc(a.name)}</option>`).join('')}</select></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="cancel">Cancelar</button>
      <button class="btn btn-primary" id="save">Añadir</button>
    </div>
  `, modal=>{
    modal.querySelector('#cancel').addEventListener('click',closeModal);
    modal.querySelector('#save').addEventListener('click',()=>{
      const amt = parseMoney(modal.querySelector('#ga-amount').value);
      const accId = modal.querySelector('#ga-account').value;
      if(amt<=0){ Notif.show('Cantidad no válida','neg'); return; }
      g.saved += amt; g.version=(g.version|0)+1;
      // register as expense from account (optional: we treat goal saving as money moved aside)
      closeModal();
      App.commit(`+${fmtMoney(amt)} al objetivo ${g.name}`);
      if(g.saved>=g.target) Notif.show(`🎉 ¡Objetivo ${g.name} alcanzado!`,'pos',5000);
    });
  });
}

function openAccountModal(accId){
  const d = App.state.data;
  const a = accId?d.accounts.find(x=>x.id===accId):null;
  const colors = ['#6366F1','#EC4899','#F59E0B','#10B981','#0EA5E9','#A855F7','#EF4444'];
  openModal(`
    <h2>${a?'Editar cuenta':'Nueva cuenta'}</h2>
    <div class="field"><label>Nombre</label><input class="input" id="a-name" value="${h.esc(a?.name||'')}" placeholder="Ej: Cuenta Nómina"></div>
    <div class="field"><label>Tipo</label>
      <select class="select" id="a-type">
        ${['bank','savings','cash','card','investment','other'].map(t=>`<option value="${t}" ${a?.type===t?'selected':''}>${{bank:'Banco',savings:'Ahorro',cash:'Efectivo',card:'Tarjeta',investment:'Inversión',other:'Otra'}[t]}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>Saldo inicial</label><input class="input num" id="a-bal" type="text" inputmode="decimal" value="${a?fmtMoneyPlain(a.initialBalance):'0'}"></div>
    <div class="field"><label>Color</label>
      <div class="chips" id="a-colors">${colors.map(c=>`<span class="chip ${a?.color===c||(!a&&c==='#6366F1')?'active':''}" data-color="${c}" style="background:${c};color:white">${c}</span>`).join('')}</div>
    </div>
    <div class="modal-actions">
      ${a?'<button class="btn btn-danger" id="a-del">Eliminar</button>':''}
      <button class="btn btn-ghost" id="cancel">Cancelar</button>
      <button class="btn btn-primary" id="save">Guardar</button>
    </div>
  `, modal=>{
    let color = a?.color || '#6366F1';
    modal.querySelectorAll('#a-colors .chip').forEach(c=>c.addEventListener('click',()=>{
      modal.querySelectorAll('#a-colors .chip').forEach(x=>x.classList.remove('active'));
      c.classList.add('active'); color = c.dataset.color;
    }));
    modal.querySelector('#cancel').addEventListener('click',closeModal);
    modal.querySelector('#save').addEventListener('click',()=>{
      const name = modal.querySelector('#a-name').value.trim();
      const type = modal.querySelector('#a-type').value;
      const bal = parseMoney(modal.querySelector('#a-bal').value);
      if(!name){ Notif.show('Nombre obligatorio','neg'); return; }
      if(a){ Object.assign(a,{name,type,initialBalance:bal,color}); }
      else d.accounts.push({id:uid('a'),name,type,initialBalance:bal,color,createdBy:App.state.user.id,createdAt:nowISO(),archived:false});
      closeModal(); App.commit('Cuenta guardada');
    });
    if(a){
      modal.querySelector('#a-del').addEventListener('click',()=>{
        if(d.transactions.some(t=>t.accountId===a.id||t.toAccountId===a.id)){ Notif.show('Esta cuenta tiene movimientos. No se puede eliminar.','neg'); return; }
        d.accounts = d.accounts.filter(x=>x.id!==a.id); closeModal(); App.commit('Cuenta eliminada');
      });
    }
  });
}

function openDebtModal(debtId){
  const d = App.state.data;
  const de = debtId?d.debts.find(x=>x.id===debtId):null;
  openModal(`
    <h2>${de?'Editar deuda':'Nueva deuda'}</h2>
    <div class="field"><label>Nombre</label><input class="input" id="d-name" value="${h.esc(de?.name||'')}" placeholder="Ej: Hipoteca"></div>
    <div class="grid-2">
      <div class="field"><label>Importe inicial (€)</label><input class="input num" id="d-initial" type="text" inputmode="decimal" value="${de?fmtMoneyPlain(de.initial):''}"></div>
      <div class="field"><label>Pendiente (€)</label><input class="input num" id="d-out" type="text" inputmode="decimal" value="${de?fmtMoneyPlain(de.outstanding):''}"></div>
    </div>
    <div class="grid-2">
      <div class="field"><label>Interés anual (%)</label><input class="input num" id="d-rate" type="text" inputmode="decimal" value="${de?.rate||0}"></div>
      <div class="field"><label>Cuota mensual (€)</label><input class="input num" id="d-pay" type="text" inputmode="decimal" value="${de?fmtMoneyPlain(de.payment):''}"></div>
    </div>
    <div class="field"><label>Día del mes del pago</label><input class="input" id="d-day" type="number" min="1" max="28" value="${de?.paymentDay||5}"></div>
    <div class="modal-actions">
      ${de?'<button class="btn btn-danger" id="d-del">Eliminar</button>':''}
      <button class="btn btn-ghost" id="cancel">Cancelar</button>
      <button class="btn btn-primary" id="save">Guardar</button>
    </div>
  `, modal=>{
    modal.querySelector('#cancel').addEventListener('click',closeModal);
    modal.querySelector('#save').addEventListener('click',()=>{
      const name = modal.querySelector('#d-name').value.trim();
      const initial = parseMoney(modal.querySelector('#d-initial').value);
      const out = parseMoney(modal.querySelector('#d-out').value);
      const rate = parseFloat(modal.querySelector('#d-rate').value)||0;
      const pay = parseMoney(modal.querySelector('#d-pay').value);
      const day = parseInt(modal.querySelector('#d-day').value,10)||5;
      if(!name){ Notif.show('Nombre obligatorio','neg'); return; }
      if(de){ Object.assign(de,{name,initial,outstanding:out,rate,payment:pay,paymentDay:day}); }
      else d.debts.push({id:uid('d'),name,type:'loan',initial,outstanding:out,rate,payment:pay,paymentDay:day,createdBy:App.state.user.id});
      closeModal(); App.commit('Deuda guardada');
    });
    if(de){
      modal.querySelector('#d-del').addEventListener('click',()=>{
        d.debts = d.debts.filter(x=>x.id!==de.id); closeModal(); App.commit('Deuda eliminada');
      });
    }
  });
}

function openSubModal(subId){
  const d = App.state.data;
  const s = subId?d.subscriptions.find(x=>x.id===subId):null;
  openModal(`
    <h2>${s?'Editar suscripción':'Nueva suscripción'}</h2>
    <div class="field"><label>Nombre</label><input class="input" id="s-name" value="${h.esc(s?.name||'')}" placeholder="Ej: Netflix"></div>
    <div class="grid-2">
      <div class="field"><label>Importe</label><input class="input num" id="s-amount" type="text" inputmode="decimal" value="${s?fmtMoneyPlain(s.amount):''}"></div>
      <div class="field"><label>Ciclo</label>
        <select class="select" id="s-cycle">
          <option value="monthly" ${s?.cycle==='monthly'?'selected':''}>Mensual</option>
          <option value="yearly" ${s?.cycle==='yearly'?'selected':''}>Anual</option>
        </select>
      </div>
    </div>
    <div class="grid-2">
      <div class="field"><label>Día de cobro</label><input class="input" id="s-day" type="number" min="1" max="31" value="${s?.day||1}"></div>
      <div class="field"><label>Activa</label><select class="select" id="s-active"><option value="1" ${s?.active!==false?'selected':''}>Sí</option><option value="0" ${s?.active===false?'selected':''}>No</option></select></div>
    </div>
    <div class="modal-actions">
      ${s?'<button class="btn btn-danger" id="s-del">Eliminar</button>':''}
      <button class="btn btn-ghost" id="cancel">Cancelar</button>
      <button class="btn btn-primary" id="save">Guardar</button>
    </div>
  `, modal=>{
    modal.querySelector('#cancel').addEventListener('click',closeModal);
    modal.querySelector('#save').addEventListener('click',()=>{
      const name = modal.querySelector('#s-name').value.trim();
      const amount = parseMoney(modal.querySelector('#s-amount').value);
      const cycle = modal.querySelector('#s-cycle').value;
      const day = parseInt(modal.querySelector('#s-day').value,10)||1;
      const active = modal.querySelector('#s-active').value==='1';
      if(!name||amount<=0){ Notif.show('Datos no válidos','neg'); return; }
      if(s){ Object.assign(s,{name,amount,cycle,day,active}); }
      else d.subscriptions.push({id:uid('s'),name,category:null,amount,cycle,day,color:'#6366F1',createdBy:App.state.user.id,active});
      closeModal(); App.commit('Suscripción guardada');
    });
    if(s){
      modal.querySelector('#s-del').addEventListener('click',()=>{
        d.subscriptions = d.subscriptions.filter(x=>x.id!==s.id); closeModal(); App.commit('Suscripción eliminada');
      });
    }
  });
}

function showCustomPeriodModal(){
  openModal(`
    <h2>Rango personalizado</h2>
    <div class="grid-2">
      <div class="field"><label>Desde</label><input class="input" id="cp-from" type="date" value="${App.state.customRange.from||todayISO()}"></div>
      <div class="field"><label>Hasta</label><input class="input" id="cp-to" type="date" value="${App.state.customRange.to||todayISO()}"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="cancel">Cancelar</button>
      <button class="btn btn-primary" id="save">Aplicar</button>
    </div>
  `, modal=>{
    modal.querySelector('#cancel').addEventListener('click',closeModal);
    modal.querySelector('#save').addEventListener('click',()=>{
      App.state.customRange = {from:modal.querySelector('#cp-from').value, to:modal.querySelector('#cp-to').value};
      App.state.period = 'custom';
      closeModal(); App.render();
    });
  });
}

function openSimulator(){
  const d = App.state.data;
  const base = Engine.projection(d,24,0);
  const hist = Engine.monthlyAverage(d,6,'expense');
  openModal(`
    <h2>🎚 Simulador: ¿Qué pasaría si...?</h2>
    <p class="small">Ajusta parámetros y mira el impacto en tu proyección a 24 meses.</p>
    <div class="field"><label>Reducir gasto en categoría (€)</label>
      <select class="select" id="sim-cat">
        <option value="">-- Sin cambio --</option>
        ${d.categories.filter(c=>c.type==='expense').map(c=>`<option value="${c.id}">${h.esc(c.name)}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>Reducción mensual (€)</label><input class="input num" id="sim-reduce" type="text" inputmode="decimal" value="50"></div>
    <div class="field"><label>Cancelar suscripción</label>
      <div class="chips" id="sim-subs">
        ${d.subscriptions.filter(s=>s.active).map(s=>`<span class="chip" data-sub="${s.id}">${h.esc(s.name)} (${fmtMoney(s.cycle==='monthly'?s.amount:Math.round(s.amount/12))}/m)</span>`).join('')||'<span class="small">Sin suscripciones</span>'}
      </div>
    </div>
    <div class="field"><label>Ingreso extra mensual (€)</label><input class="input num" id="sim-extra" type="text" inputmode="decimal" value="0"></div>
    <div class="card" style="padding:14px;background:var(--surface-2)" id="sim-result">
      <div class="small">Introduce valores para ver el impacto...</div>
    </div>
    <div class="modal-actions"><button class="btn btn-primary" id="close-sim">Cerrar</button></div>
  `, modal=>{
    const cancelled = new Set();
    modal.querySelectorAll('#sim-subs .chip').forEach(c=>c.addEventListener('click',()=>{
      const id = c.dataset.sub;
      if(cancelled.has(id)){ cancelled.delete(id); c.classList.remove('active'); }
      else { cancelled.add(id); c.classList.add('active'); }
      update();
    }));
    ['sim-cat','sim-reduce','sim-extra'].forEach(id=>modal.querySelector('#'+id)?.addEventListener('input',update));
    function update(){
      const catId = modal.querySelector('#sim-cat').value;
      const reduce = parseMoney(modal.querySelector('#sim-reduce').value);
      const extra = parseMoney(modal.querySelector('#sim-extra').value);
      let deltaMonthly = extra;
      if(catId && reduce>0) deltaMonthly += reduce;
      cancelled.forEach(id=>{ const s=d.subscriptions.find(x=>x.id===id); if(s) deltaMonthly += (s.cycle==='monthly'?s.amount:Math.round(s.amount/12)); });
      const newAvg = base.monthly + deltaMonthly;
      const y1 = newAvg*12;
      const y2 = newAvg*24;
      const goal = d.goals.find(g=>g.target>g.saved);
      const etaGoal = goal ? Math.ceil((goal.target-goal.saved)/Math.max(1,newAvg)) : null;
      modal.querySelector('#sim-result').innerHTML = `
        <div class="metric-row" style="margin-bottom:0">
          <div class="metric ${newAvg>=0?'pos':'neg'}"><div class="label">Nuevo ahorro mensual</div><div class="value num">${fmtMoney(Math.round(newAvg))}</div></div>
          <div class="metric brand"><div class="label">En 12 meses</div><div class="value num">${fmtMoney(Math.round(y1))}</div></div>
          <div class="metric pos"><div class="label">En 24 meses</div><div class="value num">${fmtMoney(Math.round(y2))}</div></div>
          ${goal?`<div class="metric"><div class="label">Objetivo ${h.esc(goal.name)}</div><div class="value num">~${etaGoal} meses</div></div>`:''}
        </div>
        <div class="small" style="margin-top:8px">Δ mensual respecto al ritmo actual: <b class="num">${deltaMonthly>=0?'+':''}${fmtMoney(deltaMonthly)}</b></div>
      `;
    }
    update();
    modal.querySelector('#close-sim').addEventListener('click',closeModal);
  });
}

