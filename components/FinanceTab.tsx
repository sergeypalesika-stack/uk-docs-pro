'use client'

const FS = { background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', padding: '8px 10px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }

export default function FinanceTab({ finance, finTab, setFinTab, finMonth, setFinMonth, incForm, setIncForm, expForm, setExpForm, mileForm, setMileForm, addIncome, addExpense, addMileage, deleteFinEntry, generateCSV, generatePDFReport, fmtGBP, finMonthLabel, EXP_CATS, getTotalYearMiles, getHMRCDeadlines, TAX_ALLOWANCE, t, dark, profile }) {
  const curYear = new Date().getFullYear().toString()
  const allMonths = [...new Set(finance.map(function(e){ return e.date.slice(0,7) }))].sort().reverse()
  if (!allMonths.includes(finMonth)) allMonths.unshift(finMonth)
  const mIncome   = finance.filter(function(e){ return e.type === 'income'  && e.date.startsWith(finMonth) })
  const mExpenses = finance.filter(function(e){ return e.type === 'expense' && e.date.startsWith(finMonth) })
  const mTotalIn  = mIncome.reduce(function(s,e){ return s + Number(e.amount) }, 0)
  const mTotalEx  = mExpenses.reduce(function(s,e){ return s + Number(e.amount) }, 0)
  const mProfit   = mTotalIn - mTotalEx
  const yearMiles = getTotalYearMiles()
  const mileEntries = finance.filter(function(e){ return e.category === 'mileage' && e.date.startsWith(finMonth) })
  const deadlines = getHMRCDeadlines()
  const rptIncome   = finance.filter(function(e){ return e.type === 'income'  && e.date.startsWith(curYear) }).reduce(function(s,e){ return s + Number(e.amount) }, 0)
  const rptExpenses = finance.filter(function(e){ return e.type === 'expense' && e.date.startsWith(curYear) && e.category !== 'mileage' }).reduce(function(s,e){ return s + Number(e.amount) }, 0)
  const rptMileage  = finance.filter(function(e){ return e.category === 'mileage' && e.date.startsWith(curYear) }).reduce(function(s,e){ return s + Number(e.amount) }, 0)
  const rptProfit   = rptIncome - rptExpenses - rptMileage
  const rptTaxable  = Math.max(0, rptProfit - TAX_ALLOWANCE)
  const rptEstTax   = rptTaxable * 0.20
  const rptEstNI    = rptProfit > TAX_ALLOWANCE ? (rptProfit - TAX_ALLOWANCE) * 0.09 : 0

  return (
    <div style={{ background: '#0d1117', minHeight: '100%', marginTop: -16, marginLeft: -20, marginRight: -20, paddingBottom: 20 }}>

      <div style={{ background: 'linear-gradient(135deg,#1a2332,#0d1117)', borderBottom: '1px solid #21262d', padding: '16px 20px 12px' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#58a6ff', marginBottom: 2 }}>💷 UK Driver Finance</div>
        <div style={{ fontSize: 11, color: '#8b949e' }}>Self-Employment · Self Assessment</div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '12px 20px 0', overflowX: 'auto' }}>
        {allMonths.slice(0,6).map(function(m) { return (
          <button key={m} onClick={function(){ setFinMonth(m) }} style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (m===finMonth?'#58a6ff':'#30363d'), background: m===finMonth?'#1f3a5f':'transparent', color: m===finMonth?'#58a6ff':'#8b949e', fontSize: 12, cursor: 'pointer' }}>
            {finMonthLabel(m)}
          </button>
        )})}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8, margin: '12px 20px' }}>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
          <div style={{ fontSize:11, color:'#8b949e', marginBottom:4 }}>{t('Income','Дохід','Дохід')}</div>
          <div style={{ fontSize:15, fontWeight:700, color:'#3fb950' }}>{fmtGBP(mTotalIn)}</div>
        </div>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
          <div style={{ fontSize:11, color:'#8b949e', marginBottom:4 }}>{t('Costs','Витрати','Витрати')}</div>
          <div style={{ fontSize:15, fontWeight:700, color:'#f85149' }}>{fmtGBP(mTotalEx)}</div>
        </div>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
          <div style={{ fontSize:11, color:'#8b949e', marginBottom:4 }}>{t('Profit','Прибуток','Прибуток')}</div>
          <div style={{ fontSize:15, fontWeight:700, color: mProfit>=0?'#58a6ff':'#f85149' }}>{fmtGBP(mProfit)}</div>
        </div>
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid #21262d', padding:'0 20px', marginBottom:0 }}>
        {[['log',t('Income','Дохід','Дохід')],['expenses',t('Expenses','Витрати','Витрати')],['mileage','Mileage'],['summary',t('Summary','Підсумок','Підсумок')],['deadlines','HMRC'],['report','📤']].map(function(item) { return (
          <button key={item[0]} onClick={function(){ setFinTab(item[0]) }} style={{ background:'none', border:'none', borderBottom:'2px solid '+(finTab===item[0]?'#58a6ff':'transparent'), color: finTab===item[0]?'#58a6ff':'#8b949e', padding:'10px 10px 10px 0', marginRight:4, cursor:'pointer', fontSize:12, fontWeight:finTab===item[0]?600:400 }}>
            {item[1]}
          </button>
        )})}
      </div>

      <div style={{ padding:'16px 20px' }}>

        {finTab === 'log' && renderLog()}
        {finTab === 'expenses' && renderExpenses()}
        {finTab === 'mileage' && renderMileage()}
        {finTab === 'deadlines' && renderDeadlines()}
        {finTab === 'summary' && renderSummary()}
        {finTab === 'report' && renderReport()}

      </div>
    </div>
  )

  function renderLog() {
    return (
      <div>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:11, color:'#8b949e', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>+ {t('Add Income','Додати дохід','Додати дохід')}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
            <input type="date" value={incForm.date} onChange={function(e){ setIncForm({...incForm, date:e.target.value}) }} style={FS} />
            <input type="number" placeholder="£ Amount" value={incForm.amount} onChange={function(e){ setIncForm({...incForm, amount:e.target.value}) }} style={FS} />
          </div>
          <input placeholder="Note (optional)" value={incForm.note} onChange={function(e){ setIncForm({...incForm, note:e.target.value}) }} style={{...FS, marginBottom:8}} />
          <button onClick={addIncome} style={{ background:'#0d2b0d', border:'1px solid #3fb950', color:'#3fb950', borderRadius:8, padding:'9px 16px', fontSize:13, cursor:'pointer', fontWeight:600, width:'100%' }}>+ {t('Add','Додати','Додати')}</button>
        </div>
        {mIncome.length === 0 && <div style={{ color:'#8b949e', fontSize:13, textAlign:'center', padding:20 }}>{t('No entries this month','Немає записів','Немає записів')}</div>}
        {[...mIncome].reverse().map(function(e) { return (
          <div key={e.id} style={{ display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #21262d' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, color:'#e6edf3' }}>{e.note || 'Delivery'}</div>
              <div style={{ fontSize:11, color:'#8b949e' }}>{e.date}</div>
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:'#3fb950', marginRight:10 }}>{fmtGBP(e.amount)}</div>
            <button onClick={function(){ deleteFinEntry(e.id) }} style={{ background:'none', border:'none', color:'#f85149', cursor:'pointer', fontSize:16 }}>✕</button>
          </div>
        )})}
      </div>
    )
  }

  function renderExpenses() {
    return (
      <div>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:11, color:'#8b949e', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>+ {t('Add Expense','Додати витрату','Додати витрату')}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
            <input type="date" value={expForm.date} onChange={function(e){ setExpForm({...expForm, date:e.target.value}) }} style={FS} />
            <input type="number" placeholder="£ Amount" value={expForm.amount} onChange={function(e){ setExpForm({...expForm, amount:e.target.value}) }} style={FS} />
          </div>
          <select value={expForm.category} onChange={function(e){ setExpForm({...expForm, category:e.target.value}) }} style={{...FS, marginBottom:8}}>
            {EXP_CATS.map(function(c){ return <option key={c.id} value={c.id}>{c.icon} {c.label}</option> })}
          </select>
          <input placeholder="Note (optional)" value={expForm.note} onChange={function(e){ setExpForm({...expForm, note:e.target.value}) }} style={{...FS, marginBottom:8}} />
          <button onClick={addExpense} style={{ background:'#2d0d0d', border:'1px solid #f85149', color:'#f85149', borderRadius:8, padding:'9px 16px', fontSize:13, cursor:'pointer', fontWeight:600, width:'100%' }}>+ {t('Add','Додати','Додати')}</button>
        </div>
        <div style={{ marginBottom:12 }}>
          {EXP_CATS.map(function(cat) {
            const total = mExpenses.filter(function(e){ return e.category===cat.id }).reduce(function(s,e){ return s+Number(e.amount) },0)
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
        {[...mExpenses].reverse().map(function(e) {
          const cat = EXP_CATS.find(function(c){ return c.id===e.category })
          return (
            <div key={e.id} style={{ display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #21262d' }}>
              <span style={{ fontSize:18, marginRight:8 }}>{cat ? cat.icon : '📦'}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:'#e6edf3' }}>{e.note || (cat ? cat.label : '')}</div>
                <div style={{ fontSize:11, color:'#8b949e' }}>{e.date}</div>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:'#f85149', marginRight:10 }}>{fmtGBP(e.amount)}</div>
              <button onClick={function(){ deleteFinEntry(e.id) }} style={{ background:'none', border:'none', color:'#f85149', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>
          )
        })}
      </div>
    )
  }

  function renderMileage() {
    return (
      <div>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:11, color:'#58a6ff', marginBottom:12, textTransform:'uppercase', letterSpacing:1 }}>🚗 {curYear} Mileage</div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#8b949e', marginBottom:6 }}>
            <span>45p/mile rate</span>
            <span style={{ color: yearMiles >= 10000 ? '#f85149' : '#3fb950' }}>{yearMiles.toFixed(0)} / 10,000 miles</span>
          </div>
          <div style={{ background:'#21262d', borderRadius:99, height:8, overflow:'hidden', marginBottom:8 }}>
            <div style={{ background: yearMiles >= 10000 ? '#f85149' : '#3fb950', width: Math.min(100, yearMiles/100) + '%', height:'100%', borderRadius:99 }} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, background:'#0d1117', borderRadius:8, padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:11, color:'#8b949e' }}>45p/mile</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#3fb950' }}>{fmtGBP(Math.min(yearMiles,10000)*0.45)}</div>
            </div>
            <div style={{ flex:1, background:'#0d1117', borderRadius:8, padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:11, color:'#8b949e' }}>25p/mile</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#e3b341' }}>{yearMiles > 10000 ? fmtGBP((yearMiles-10000)*0.25) : '£0.00'}</div>
            </div>
          </div>
        </div>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:11, color:'#8b949e', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>+ Log Miles</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
            <input type="date" value={mileForm.date} onChange={function(e){ setMileForm({...mileForm, date:e.target.value}) }} style={FS} />
            <input type="number" placeholder="Miles driven" value={mileForm.miles} onChange={function(e){ setMileForm({...mileForm, miles:e.target.value}) }} style={FS} />
          </div>
          <input placeholder="Route / note" value={mileForm.note} onChange={function(e){ setMileForm({...mileForm, note:e.target.value}) }} style={{...FS, marginBottom:8}} />
          <button onClick={addMileage} style={{ background:'#1f3a5f', border:'1px solid #58a6ff', color:'#58a6ff', borderRadius:8, padding:'9px 16px', fontSize:13, cursor:'pointer', fontWeight:600, width:'100%' }}>
            + Log Mileage
          </button>
        </div>
        {mileEntries.map(function(e) { return (
          <div key={e.id} style={{ display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #21262d' }}>
            <span style={{ fontSize:18, marginRight:8 }}>🚗</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, color:'#e6edf3' }}>{e.note.split('|')[0]} miles</div>
              <div style={{ fontSize:11, color:'#8b949e' }}>{e.date}</div>
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:'#3fb950', marginRight:10 }}>{fmtGBP(e.amount)}</div>
            <button onClick={function(){ deleteFinEntry(e.id) }} style={{ background:'none', border:'none', color:'#f85149', cursor:'pointer', fontSize:16 }}>✕</button>
          </div>
        )})}
      </div>
    )
  }

  function renderDeadlines() {
    return (
      <div>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:11, color:'#e3b341', marginBottom:14, textTransform:'uppercase', letterSpacing:1 }}>⏰ HMRC Key Dates</div>
          {deadlines.map(function(d,i) { return (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 0', borderBottom:'1px solid #21262d' }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{d.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color: d.diff <= 30 ? '#f85149' : d.diff <= 60 ? '#e3b341' : '#e6edf3' }}>{d.label}</div>
                <div style={{ fontSize:11, color:'#8b949e', marginTop:2 }}>{d.detail}</div>
                <div style={{ fontSize:11, color:'#8b949e', marginTop:4 }}>{d.date.toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}</div>
              </div>
              <div style={{ background: d.diff<=30?'#2d0d0d':d.diff<=60?'#2b1d00':'#161b22', border:'1px solid '+(d.diff<=30?'#f85149':d.diff<=60?'#e3b341':'#30363d'), borderRadius:20, padding:'4px 10px', fontSize:12, fontWeight:700, color:d.diff<=30?'#f85149':d.diff<=60?'#e3b341':'#8b949e' }}>
                {d.diff >= 0 ? d.diff + 'd' : 'done'}
              </div>
            </div>
          )})}
        </div>
        <div style={{ background:'#0d2b0d', border:'1px solid #1a4a1a', borderRadius:12, padding:16 }}>
          <div style={{ fontSize:11, color:'#3fb950', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>💡 Key Facts</div>
          {[['📅','UK Tax Year: 6 April to 5 April'],['💻','Self Assessment deadline: 31 January'],['💰','Payment on Account: 31 Jan + 31 Jul'],['📝','New self-employed: register by 5 Oct'],['🔢','UTR number needed — apply at gov.uk']].map(function(item) { return (
            <div key={item[1]} style={{ display:'flex', gap:8, padding:'5px 0', fontSize:12, color:'#8b949e' }}>
              <span>{item[0]}</span><span>{item[1]}</span>
            </div>
          )})}
        </div>
      </div>
    )
  }

  function renderSummary() {
    const last6Months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const ym = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')
      const inc = finance.filter(function(e){ return e.type === 'income' && e.date.startsWith(ym) }).reduce(function(s,e){ return s + Number(e.amount) }, 0)
      const exp = finance.filter(function(e){ return e.type === 'expense' && e.date.startsWith(ym) }).reduce(function(s,e){ return s + Number(e.amount) }, 0)
      last6Months.push({ ym: ym, label: d.toLocaleDateString('en-GB', { month: 'short' }), income: inc, expense: exp })
    }
    const maxVal = Math.max(...last6Months.map(function(m){ return Math.max(m.income, m.expense) }), 1)

    return (
      <div>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:11, color:'#58a6ff', marginBottom:14, textTransform:'uppercase', letterSpacing:1 }}>📈 Last 6 Months</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120, marginBottom:8 }}>
            {last6Months.map(function(m) { return (
              <div key={m.ym} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, height:'100%', justifyContent:'flex-end' }}>
                <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:'100%', width:'100%', justifyContent:'center' }}>
                  <div style={{ width:'40%', background:'#3fb950', borderRadius:'3px 3px 0 0', height: Math.max(2, (m.income/maxVal)*100) + '%' }} />
                  <div style={{ width:'40%', background:'#f85149', borderRadius:'3px 3px 0 0', height: Math.max(2, (m.expense/maxVal)*100) + '%' }} />
                </div>
              </div>
            )})}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {last6Months.map(function(m) { return (
              <div key={m.ym} style={{ flex:1, textAlign:'center', fontSize:10, color:'#8b949e' }}>{m.label}</div>
            )})}
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:10, fontSize:11 }}>
            <span style={{ color:'#3fb950' }}>● Income</span>
            <span style={{ color:'#f85149' }}>● Expenses</span>
          </div>
        </div>

        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:11, color:'#58a6ff', marginBottom:12, textTransform:'uppercase', letterSpacing:1 }}>📊 Year {curYear} — Self Assessment</div>
          {[['Total Income', fmtGBP(rptIncome), '#3fb950'],['Deductible Expenses', '- ' + fmtGBP(rptExpenses), '#f85149'],['Mileage Allowance', '- ' + fmtGBP(rptMileage), '#f85149'],['Net Profit', fmtGBP(rptProfit), '#58a6ff'],['Personal Allowance', fmtGBP(Math.min(rptProfit, TAX_ALLOWANCE)), '#8b949e'],['Taxable Income', fmtGBP(rptTaxable), '#e3b341'],['Income Tax (20%)', fmtGBP(rptEstTax), '#f85149'],['Class 4 NI (9%)', fmtGBP(rptEstNI), '#f85149'],['Total Tax Due', fmtGBP(rptEstTax + rptEstNI), '#f85149']].map(function(row) { return (
            <div key={row[0]} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #21262d' }}>
              <span style={{ fontSize:12, color:'#8b949e' }}>{row[0]}</span>
              <span style={{ fontSize:13, fontWeight:600, color:row[2] }}>{row[1]}</span>
            </div>
          )})}
          <div style={{ marginTop:12, fontSize:11, color:'#8b949e', lineHeight:1.6 }}>Submit Self Assessment by 31 Jan at gov.uk/self-assessment</div>
        </div>
        <div style={{ background:'#0d2b0d', border:'1px solid #1a4a1a', borderRadius:12, padding:16 }}>
          <div style={{ fontSize:11, color:'#3fb950', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>What you can deduct</div>
          {[['🚐','Van rental'],['⛽','Fuel (work portion)'],['📱','Phone (work portion)'],['🛡️','Insurance (work portion)'],['👕','Work clothing'],['📦','Equipment & supplies']].map(function(item) { return (
            <div key={item[1]} style={{ display:'flex', gap:8, padding:'5px 0', fontSize:12, color:'#8b949e' }}>
              <span>{item[0]}</span><span>{item[1]}</span>
            </div>
          )})}
        </div>
      </div>
    )
  }

  function renderReport() {
    return (
      <div>
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:11, color:'#58a6ff', marginBottom:12, textTransform:'uppercase', letterSpacing:1 }}>📊 Tax Year {curYear} Summary</div>
          {[['Total Income', fmtGBP(rptIncome), '#3fb950'],['Expenses', '- ' + fmtGBP(rptExpenses), '#f85149'],['Mileage', '- ' + fmtGBP(rptMileage), '#f85149'],['Net Profit (Box 28)', fmtGBP(rptProfit), '#58a6ff'],['Income Tax', fmtGBP(rptEstTax), '#f85149'],['NI', fmtGBP(rptEstNI), '#f85149'],['Total Tax', fmtGBP(rptEstTax + rptEstNI), '#f85149']].map(function(row) { return (
            <div key={row[0]} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #21262d' }}>
              <span style={{ fontSize:12, color:'#8b949e' }}>{row[0]}</span>
              <span style={{ fontSize:13, fontWeight:600, color:row[2] }}>{row[1]}</span>
            </div>
          )})}
        </div>
        <button onClick={generatePDFReport} style={{ background:'linear-gradient(135deg,#003078,#1d4ed8)', border:'none', borderRadius:14, padding:'18px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:14, textAlign:'left', color:'#fff', width:'100%', marginBottom:12 }}>
          <span style={{ fontSize:32 }}>🖨️</span>
          <div>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:3 }}>Self Assessment Report (PDF)</div>
            <div style={{ fontSize:12, opacity:0.75 }}>SA103 key figures · Print or save as PDF</div>
          </div>
        </button>
        <button onClick={generateCSV} style={{ background:'#0d2b0d', border:'1px solid #3fb950', borderRadius:14, padding:'18px 20px', cursor:'pointer', display:'flex', alignItems:'center', gap:14, textAlign:'left', color:'#3fb950', width:'100%', marginBottom:12 }}>
          <span style={{ fontSize:32 }}>📊</span>
          <div>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:3 }}>Export to CSV (Excel)</div>
            <div style={{ fontSize:12, opacity:0.75 }}>All income and expenses</div>
          </div>
        </button>
        <div style={{ background:'#1c1917', border:'1px solid #78350f', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ fontSize:12, color:'#f59e0b', fontWeight:700, marginBottom:8 }}>📋 SA103 Short Form — Box Reference</div>
          {[['Box 9','Turnover',fmtGBP(rptIncome)],['Box 17','Total allowable expenses',fmtGBP(rptExpenses + rptMileage)],['Box 28','Net profit',fmtGBP(rptProfit)]].map(function(row) { return (
            <div key={row[0]} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid #292524' }}>
              <span style={{ background:'#003078', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4 }}>{row[0]}</span>
              <span style={{ flex:1, fontSize:12, color:'#e7e5e4' }}>{row[1]}</span>
              <span style={{ fontSize:13, fontWeight:700, color:'#f59e0b' }}>{row[2]}</span>
            </div>
          )})}
          <div style={{ marginTop:10, fontSize:11, color:'#78350f' }}>File at gov.uk/file-your-self-assessment-tax-return · Deadline: 31 January</div>
        </div>
      </div>
    )
  }
}
