'use client'

export default function FinanceTab({ finance, finTab, setFinTab, finMonth, setFinMonth, incForm, setIncForm, expForm, setExpForm, mileForm, setMileForm, addIncome, addExpense, addMileage, deleteFinEntry, generateCSV, generatePDFReport, fmtGBP, finMonthLabel, EXP_CATS, getTotalYearMiles, getHMRCDeadlines, TAX_ALLOWANCE, t, dark, profile }) {
  const curYear = new Date().getFullYear().toString()
  const allMonths = [...new Set(finance.map(e => e.date.slice(0,7)))].sort().reverse()
  if (!allMonths.includes(finMonth)) allMonths.unshift(finMonth)
    const mIncome   = finance.filter(e => e.type === 'income'  && e.date.startsWith(finMonth))
  const mExpenses = finance.filter(e => e.type === 'expense' && e.date.startsWith(finMonth))
  const mTotalIn  = mIncome.reduce((s,e) => s + Number(e.amount), 0)
  const mTotalEx  = mExpenses.reduce((s,e) => s + Number(e.amount), 0)
  const mProfit   = mTotalIn - mTotalEx
    const yIncome   = finance.filter(e => e.type === 'income'  && e.date.startsWith(curYear)).reduce((s,e) => s + Number(e.amount), 0)
  const yExpenses = finance.filter(e => e.type === 'expense' && e.date.startsWith(curYear)).reduce((s,e) => s + Number(e.amount), 0)
  const yProfit   = yIncome - yExpenses
  const taxable   = Math.max(0, yProfit - TAX_ALLOWANCE)
  const estTax    = taxable * 0.20
  const estNI     = yProfit > TAX_ALLOWANCE ? (yProfit - TAX_ALLOWANCE) * 0.09 : 0
    const FS = { background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', padding: '8px 10px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
    const yearMiles = getTotalYearMiles()
  const rate1End = Math.min(yearMiles, 10000)
  const rate2Start = Math.max(0, yearMiles - 10000)
  const mileEntries = finance.filter(function(e){ return e.category === 'mileage' && e.date.startsWith(finMonth) })
  const deadlines = getHMRCDeadlines()
  const rptIncome   = finance.filter(function(e){ return e.type === 'income'  && e.date.startsWith(curYear) }).reduce(function(s,e){ return s + Number(e.amount) }, 0)
  const rptExpenses = finance.filter(function(e){ return e.type === 'expense' && e.date.startsWith(curYear) && e.category !== 'mileage' }).reduce(function(s,e){ return s + Number(e.amount) }, 0)
  const rptMileage  = finance.filter(function(e){ return e.category === 'mileage' && e.date.startsWith(curYear) }).reduce(function(s,e){ return s + Number(e.amount) }, 0)
  const rptProfit   = rptIncome - rptExpenses - rptMileage
  const rptTaxable  = Math.max(0, rptProfit - 12570)
  const rptEstTax   = rptTaxable * 0.20
  const rptEstNI    = rptProfit > 12570 ? (rptProfit - 12570) * 0.09 : 0
  return (
    <div style={{ background: '#0d1117', minHeight: '100%', marginTop: -16, marginLeft: -20, marginRight: -20, padding: '16px 20px 20px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1a2332,#0d1117)', borderBottom: '1px solid #21262d', padding: '16px 20px 12px' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#58a6ff', marginBottom: 2 }}>💷 UK Driver Finance</div>
        <div style={{ fontSize: 11, color: '#8b949e' }}>Self-Employment · Self Assessment</div>
      </div>

      {/* Month selector */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px 0', overflowX: 'auto' }}>
        {allMonths.slice(0,6).map(m => (
          <button key={m} onClick={() => setFinMonth(m)} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, border: `1px solid ${m===finMonth?'#58a6ff':'#30363d'}`, background: m===finMonth?'#1f3a5f':'transparent', color: m===finMonth?'#58a6ff':'#8b949e', fontSize: 12, cursor: 'pointer' }}>
            {finMonthLabel(m)}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8, margin: '12px 20px' }}>
        {[
          { label: t('Income','Дохід','Дохід'),   val: fmtGBP(mTotalIn),  color: '#3fb950' },
          { label: t('Costs','Витрати','Витрати'), val: fmtGBP(mTotalEx),  color: '#f85149' },
          { label: t('Profit','Прибуток','Прибуток'), val: fmtGBP(mProfit), color: mProfit>=0?'#58a6ff':'#f85149' },
        ].map(s => (
          <div key={s.label} style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
            <div style={{ fontSize:11, color:'#8b949e', marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:15, fontWeight:700, color:s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid #21262d', padding:'0 20px', marginBottom:0 }}>
        {[['log',t('Income','Дохід','Дохід')],['expenses',t('Expenses','Витрати','Витрати')],['mileage','Mileage'],['summary',t('Summary','Підсумок','Підсумок')],['deadlines','HMRC'],['report','📤 Export']].map(([id,label]) => (
          <button key={id} onClick={() => setFinTab(id)} style={{ background:'none', border:'none', borderBottom:`2px solid ${finTab===id?'#58a6ff':'transparent'}`, color: finTab===id?'#58a6ff':'#8b949e', padding:'10px 14px 10px 0', marginRight:4, cursor:'pointer', fontSize:13, fontWeight:finTab===id?600:400 }}>
            {label}
          </button>
        ))}
      </div>


        {/* INCOME */}
        {finTab === 'log' && (
          <div>
            <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:11, color:'#8b949e', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>+ {t('Add Income','Додати дохід','Додати дохід')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                <input type="date" value={incForm.date} onChange={e => setIncForm({...incForm, date:e.target.value})} style={FS} />
                <input type="number" placeholder="£ Amount" value={incForm.amount} onChange={e => setIncForm({...incForm, amount:e.target.value})} style={FS} />
              </div>
              <input placeholder={t('Note (optional)','Нотатка (необов`язково)','Нотатка (необов`язково)')} value={incForm.note} onChange={e => setIncForm({...incForm, note:e.target.value})} style={{...FS, marginBottom:8}} />
              <button onClick={addIncome} style={{ background:'#0d2b0d', border:'1px solid #3fb950', color:'#3fb950', borderRadius:8, padding:'9px 16px', fontSize:13, cursor:'pointer', fontWeight:600, width:'100%' }}>
                + {t('Add','Додати','Додати')}
              </button>
            </div>
            {mIncome.length === 0 && <div style={{ color:'#8b949e', fontSize:13, textAlign:'center', padding:20 }}>{t('No entries this month','Немає записів за цей місяць','Немає записів за цей місяць')}</div>}
            {[...mIncome].reverse().map(e => (
              <div key={e.id} style={{ display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #21262d' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:'#e6edf3' }}>{e.note || 'Delivery'}</div>
                  <div style={{ fontSize:11, color:'#8b949e' }}>{e.date}</div>
                </div>
                <div style={{ fontSize:15, fontWeight:700, color:'#3fb950', marginRight:10 }}>{fmtGBP(e.amount)}</div>
                <button onClick={() => deleteFinEntry(e.id)} style={{ background:'none', border:'none', color:'#f85149', cursor:'pointer', fontSize:16, padding:'2px 6px' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* EXPENSES */}
        {finTab === 'expenses' && (
          <div>
            <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:11, color:'#8b949e', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>+ {t('Add Expense','Додати витрату','Додати витрату')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                <input type="date" value={expForm.date} onChange={e => setExpForm({...expForm, date:e.target.value})} style={FS} />
                <input type="number" placeholder="£ Amount" value={expForm.amount} onChange={e => setExpForm({...expForm, amount:e.target.value})} style={FS} />
              </div>
              <select value={expForm.category} onChange={e => setExpForm({...expForm, category:e.target.value})} style={{...FS, marginBottom:8}}>
                {EXP_CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
              <input placeholder={t('Note (optional)','Нотатка','Нотатка')} value={expForm.note} onChange={e => setExpForm({...expForm, note:e.target.value})} style={{...FS, marginBottom:8}} />
              <button onClick={addExpense} style={{ background:'#2d0d0d', border:'1px solid #f85149', color:'#f85149', borderRadius:8, padding:'9px 16px', fontSize:13, cursor:'pointer', fontWeight:600, width:'100%' }}>
                + {t('Add','Додати','Додати')}
              </button>
            </div>

            {/* Category breakdown */}
            <div style={{ marginBottom:12 }}>
              {EXP_CATS.map(cat => {
                const total = mExpenses.filter(e => e.category===cat.id).reduce((s,e) => s+Number(e.amount),0)
                if (!total) return null
                return (
                  <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid #21262d' }}>
                    <span style={{ fontSize:16 }}>{cat.icon}</span>
                    <span style={{ flex:1, fontSize:13, color:'#8b949e' }}>{cat.label}</span>
                    <span style={{ fontSize:14, fontWeight:600, color:'#f85149' }}>{fmtGBP(total)}</span>
                  </div>
                )
              })}
            </div>

            {[...mExpenses].reverse().map(e => {
              const cat = EXP_CATS.find(c => c.id===e.category)
              return (
                <div key={e.id} style={{ display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #21262d' }}>
                  <span style={{ fontSize:18, marginRight:8 }}>{cat ? cat.icon : '📦'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:'#e6edf3' }}>{e.note || (cat ? cat.label : '')}</div>
                    <div style={{ fontSize:11, color:'#8b949e' }}>{e.date}</div>
                  </div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#f85149', marginRight:10 }}>{fmtGBP(e.amount)}</div>
                  <button onClick={() => deleteFinEntry(e.id)} style={{ background:'none', border:'none', color:'#f85149', cursor:'pointer', fontSize:16, padding:'2px 6px' }}>✕</button>
                </div>
              )
            })}
          </div>
        )}

        {/* MILEAGE */}
        {finTab === 'mileage' && (
          <div>
            <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:11, color:'#58a6ff', marginBottom:12, textTransform:'uppercase', letterSpacing:1 }}>🚗 {new Date().getFullYear()} Mileage Allowance</div>
              <div style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#8b949e', marginBottom:6 }}>
                  <span>45p/mile rate</span>
                  <span style={{ color: yearMiles >= 10000 ? '#f85149' : '#3fb950' }}>{yearMiles.toFixed(0)} / 10,000 miles</span>
                </div>
                <div style={{ background:'#21262d', borderRadius:99, height:8, overflow:'hidden' }}>
                  <div style={{ background: yearMiles >= 10000 ? '#f85149' : '#3fb950', width: Math.min(100, yearMiles/100) + '%', height:'100%', borderRadius:99 }} />
                </div>
                {yearMiles >= 10000 && <div style={{ fontSize:11, color:'#f85149', marginTop:4 }}>Exceeded 10,000 miles — 25p/mile now applies</div>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div style={{ background:'#0d1117', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:11, color:'#8b949e' }}>45p/mile</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#3fb950' }}>{fmtGBP(Math.min(yearMiles,10000)*0.45)}</div>
                  <div style={{ fontSize:10, color:'#8b949e' }}>{Math.min(yearMiles,10000).toFixed(0)} miles</div>
                </div>
                {yearMiles > 10000 && <div style={{ background:'#0d1117', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:11, color:'#8b949e' }}>25p/mile</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#e3b341' }}>{fmtGBP((yearMiles-10000)*0.25)}</div>
                  <div style={{ fontSize:10, color:'#8b949e' }}>{(yearMiles-10000).toFixed(0)} miles</div>
                </div>}
              </div>
            </div>
            <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:11, color:'#8b949e', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>+ Log Miles</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                <input type="date" value={mileForm.date} onChange={e => setMileForm({...mileForm, date:e.target.value})} style={FS} />
                <input type="number" placeholder="Miles driven" value={mileForm.miles} onChange={e => setMileForm({...mileForm, miles:e.target.value})} style={FS} />
              </div>
              <input placeholder="Route / note (optional)" value={mileForm.note} onChange={e => setMileForm({...mileForm, note:e.target.value})} style={{...FS, marginBottom:8}} />
              {mileForm.miles && <div style={{ fontSize:12, color:'#3fb950', padding:'6px 10px', background:'#0d2b0d', borderRadius:6, marginBottom:8 }}>
                approx {fmtGBP(parseFloat(mileForm.miles) * (yearMiles < 10000 ? 0.45 : 0.25))} at {yearMiles < 10000 ? '45' : '25'}p/mile
              </div>}
              <button onClick={addMileage} style={{ background:'#1f3a5f', border:'1px solid #58a6ff', color:'#58a6ff', borderRadius:8, padding:'9px 16px', fontSize:13, cursor:'pointer', fontWeight:600, width:'100%' }}>
                + Log Mileage
              </button>
            </div>
            <div>
              {mileEntries.map(function(e) { return (
                <div key={e.id} style={{ display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #21262d' }}>
                  <span style={{ fontSize:18, marginRight:8 }}>🚗</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:'#e6edf3' }}>{e.note.split('|')[0]} miles {e.note.split('|')[1] ? '· ' + e.note.split('|')[1] : ''}</div>
                    <div style={{ fontSize:11, color:'#8b949e' }}>{e.date}</div>
                  </div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#3fb950', marginRight:10 }}>{fmtGBP(e.amount)}</div>
                  <button onClick={() => deleteFinEntry(e.id)} style={{ background:'none', border:'none', color:'#f85149', cursor:'pointer', fontSize:16, padding:'2px 6px' }}>x</button>
                </div>
              )})}
            </div>
          </div>
        )}
        {/* DEADLINES */}
        {finTab === 'deadlines' && (
            <div>
              <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
                <div style={{ fontSize:11, color:'#e3b341', marginBottom:14, textTransform:'uppercase', letterSpacing:1 }}>⏰ HMRC Key Dates</div>
                {deadlines.map((d,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 0', borderBottom:'1px solid #21262d' }}>
                    <span style={{ fontSize:22, flexShrink:0 }}>{d.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color: d.diff <= 30 ? '#f85149' : d.diff <= 60 ? '#e3b341' : '#e6edf3' }}>{d.label}</div>
                      <div style={{ fontSize:11, color:'#8b949e', marginTop:2 }}>{d.detail}</div>
                      <div style={{ fontSize:11, marginTop:4 }}>
                        <span style={{ color:'#8b949e' }}>{d.date.toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      {d.diff >= 0 ? (
                        <div style={{ background: d.diff<=30?'#2d0d0d':d.diff<=60?'#2b1d00':'#161b22', border:`1px solid ${d.diff<=30?'#f85149':d.diff<=60?'#e3b341':'#30363d'}`, borderRadius:20, padding:'4px 10px', fontSize:12, fontWeight:700, color:d.diff<=30?'#f85149':d.diff<=60?'#e3b341':'#8b949e' }}>
                          {d.diff}d
                        </div>
                      ) : (
                        <div style={{ fontSize:11, color:'#3fb950' }}>✓ done</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background:'#0d2b0d', border:'1px solid #1a4a1a', borderRadius:12, padding:16 }}>
                <div style={{ fontSize:11, color:'#3fb950', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>💡 Key Facts</div>
                {[
                  ['📅','UK Tax Year: 6 April → 5 April'],
                  ['💻','Self Assessment online deadline: 31 January'],
                  ['💰','Payment on Account: 31 Jan + 31 Jul'],
                  ['📝','New to self-employment: register by 5 Oct'],
                  ['🔢','UTR number needed to file — apply at gov.uk'],
                  ['📱','HMRC app: track payments, view tax code'],
                ].map(([icon,text]) => (
                  <div key={text} style={{ display:'flex', gap:8, padding:'5px 0', fontSize:12, color:'#8b949e' }}>
                    <span>{icon}</span><span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}


        {/* SUMMARY / SELF ASSESSMENT */}
        {finTab === 'summary' && (
          <div>
            <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:11, color:'#58a6ff', marginBottom:12, textTransform:'uppercase', letterSpacing:1 }}>📊 Year {curYear} — Self Assessment</div>
              {[
                { label:'Total Income',              val:fmtGBP(rptIncome),             color:'#3fb950' },
                { label:'Deductible Expenses',       val:`− ${fmtGBP(rptExpenses)}`,    color:'#f85149' },
                { label:'Net Profit',                val:fmtGBP(rptProfit),             color:'#58a6ff' },
                { label:'Personal Allowance',        val:fmtGBP(Math.min(yProfit,TAX_ALLOWANCE)), color:'#8b949e' },
                { label:'Taxable Income',            val:fmtGBP(rptTaxable),             color:'#e3b341' },
                { label:'≈ Income Tax (20%)',        val:fmtGBP(rptEstTax),              color:'#f85149' },
                { label:'≈ Class 4 NI (9%)',         val:fmtGBP(rptEstNI),               color:'#f85149' },
                { label:'≈ Total Tax Due',           val:fmtGBP(estTax+estNI),        color:'#f85149', bold:true },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #21262d' }}>
                  <span style={{ fontSize:12, color:'#8b949e' }}>{item.label}</span>
                  <span style={{ fontSize:13, fontWeight:item.bold?700:500, color:item.color }}>{item.val}</span>
                </div>
              ))}
              <div style={{ marginTop:12, fontSize:11, color:'#8b949e', lineHeight:1.6 }}>
                ⚠️ Approximate estimate. Rates 2024/25. Submit Self Assessment by 31 Jan at gov.uk/self-assessment
              </div>
            </div>

            <div style={{ background:'#0d2b0d', border:'1px solid #1a4a1a', borderRadius:12, padding:16 }}>
              <div style={{ fontSize:11, color:'#3fb950', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>✅ What you can deduct</div>
              {[
                ['🚐','Van rental (if self-employed)'],
                ['⛽','Fuel — proportional to work journeys'],
                ['📱','Phone — work portion (usually 50–80%)'],
                ['🛡️','Insurance — work portion'],
                ['👕','Work clothing (if required)'],
                ['🔧','Equipment repairs'],
                ['💻','Accounting software'],
                ['📦','Bags, trolleys for deliveries'],
              ].map(([icon,text]) => (
                <div key={text} style={{ display:'flex', gap:8, padding:'5px 0', fontSize:12, color:'#8b949e' }}>
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

        {/* EXPORT REPORT TAB */}
        {finTab === 'report' && (
            <div>
              {/* Summary preview */}
              <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
                <div style={{ fontSize:11, color:'#58a6ff', marginBottom:12, textTransform:'uppercase', letterSpacing:1 }}>📊 Tax Year {curYear} Summary</div>
                {[
                  ['Total Income',         fmtGBP(rptIncome),             '#3fb950'],
                  ['Business Expenses',    '− ' + fmtGBP(rptExpenses),    '#f85149'],
                  ['Mileage Allowance',    '− ' + fmtGBP(rptMileage),     '#f85149'],
                  ['Net Profit (Box 28)',  fmtGBP(rptProfit),             '#58a6ff'],
                  ['≈ Income Tax',         fmtGBP(rptEstTax),              '#f85149'],
                  ['≈ NI',                 fmtGBP(rptEstNI),               '#f85149'],
                  ['≈ Total Tax',          fmtGBP(rptEstTax + rptEstNI),      '#f85149'],
                ].map(([l,v,c]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #21262d' }}>
                    <span style={{ fontSize:12, color:'#8b949e' }}>{l}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:c }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Export buttons */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <button onClick={generatePDFReport} style={{ background:'linear-gradient(135deg,#003078,#1d4ed8)', border:'none', borderRadius:14, padding:'18px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:14, textAlign:'left', color:'#fff' }}>
                  <span style={{ fontSize:32 }}>🖨️</span>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, marginBottom:3 }}>Self Assessment Report (PDF)</div>
                    <div style={{ fontSize:12, opacity:0.75 }}>Full report · SA103 key figures · Print or save as PDF</div>
                  </div>
                </button>

                <button onClick={generateCSV} style={{ background:'#0d2b0d', border:'1px solid #3fb950', borderRadius:14, padding:'18px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:14, textAlign:'left', color:'#3fb950' }}>
                  <span style={{ fontSize:32 }}>📊</span>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, marginBottom:3 }}>Export to CSV (Excel)</div>
                    <div style={{ fontSize:12, opacity:0.75 }}>All income & expenses · Opens in Excel or Google Sheets</div>
                  </div>
                </button>

                <div style={{ background:'#1c1917', border:'1px solid #78350f', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:12, color:'#f59e0b', fontWeight:700, marginBottom:8 }}>📋 SA103 Short Form — Box Reference</div>
                  {[
                    ['Box 9',  'Turnover',                         fmtGBP(rptIncome)],
                    ['Box 17', 'Total allowable expenses',         fmtGBP(rptExpenses + rptMileage)],
                    ['Box 28', 'Net profit',                       fmtGBP(rptProfit)],
                  ].map(([box,label,val]) => (
                    <div key={box} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid #292524' }}>
                      <span style={{ background:'#003078', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, flexShrink:0 }}>{box}</span>
                      <span style={{ flex:1, fontSize:12, color:'#e7e5e4' }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:'#f59e0b' }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:10, fontSize:11, color:'#78350f' }}>
                    File at: <span style={{ color:'#f59e0b' }}>gov.uk/file-your-self-assessment-tax-return</span> · Deadline: 31 January
                  </div>
                </div>
              </div>
            </div>
          )}

    </div>
  )
}
