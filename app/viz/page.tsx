'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import dynamic from 'next/dynamic'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const GraceMindMap = dynamic(() => import('./MindMap'), { ssr: false })

// ─── Style helpers ─────────────────────────────────────────────────────────────
const TT  = { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }
const GS  = 'rgba(255,255,255,0.05)'
const AX  = { stroke: '#475569', fontSize: 10 }

const pg: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg,#0a0a0f 0%,#0d1117 50%,#0a0f0a 100%)',
  color: '#e2e8f0', fontFamily: "'Inter','Segoe UI',sans-serif", padding: '24px',
}
const grid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '32px',
}
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px', padding: '16px', overflow: 'hidden',
}
const ct: React.CSSProperties = {
  color: '#94a3b8', fontSize: '12px', fontWeight: 600,
  letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 12px 0',
}

const dot = (live: boolean): React.CSSProperties => ({
  width: 10, height: 10, borderRadius: '50%',
  background: live ? '#10b981' : '#ef4444',
  boxShadow: live ? '0 0 8px #10b981' : 'none',
})
const secLabel = (c: string): React.CSSProperties => ({
  fontSize: '13px', fontWeight: 600, letterSpacing: '1.5px',
  textTransform: 'uppercase', color: c,
  marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px',
})
const secDiv = (c: string): React.CSSProperties => ({
  flex: 1, height: '1px',
  background: `linear-gradient(90deg,${c}40,transparent)`, marginLeft: '8px',
})
const kpiRow: React.CSSProperties = { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }

function kpiCard(acc: string): React.CSSProperties {
  return { flex: '1 1 140px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${acc}30`, borderRadius: '16px', padding: '16px', position: 'relative', overflow: 'hidden' }
}

// ─── Components ────────────────────────────────────────────────────────────────
function KPI({ accent, label, value }: { accent: string; label: string; value: string }) {
  return (
    <div style={kpiCard(accent)}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent, borderRadius: '16px 16px 0 0' }} />
      <p style={{ color: '#64748b', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 6px 0' }}>{label}</p>
      <p style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>{value}</p>
    </div>
  )
}

function Chart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <p style={ct}>{title}</p>
      {children}
    </div>
  )
}

const fmt = (ts: unknown) => {
  if (!ts) return ''
  const d = new Date(ts as string)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function VizPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [esp, setEsp]     = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [health, setHealth] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nano, setNano]   = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stm32, setStm32] = useState<any[]>([])
  const [live, setLive]   = useState(true)
  const [showMap, setShowMap] = useState(false)
  const [visible, setVisible] = useState({ robot: true, env: true, person: true })

  const onToggle = (s: string) => setVisible(p => ({ ...p, [s]: !p[s as keyof typeof p] }))

  useEffect(() => {
    const fetch3 = async () => {
      const [a, b, c, d] = await Promise.all([
        supabase.from('esp32_data').select('*').order('ts', { ascending: false }).limit(80),
        supabase.from('health_vitals').select('*').order('ts', { ascending: false }).limit(80),
        supabase.from('arduino_nano_data').select('*').order('ts', { ascending: false }).limit(80),
        supabase.from('stm32_data').select('*').order('ts', { ascending: false }).limit(80),
      ])
      if (a.data) setEsp(a.data.reverse())
      if (b.data) setHealth(b.data.reverse())
      if (c.data) setNano(c.data.reverse())
      if (d.data) setStm32(d.data.reverse())
    }
    fetch3()

    if (!live) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const push = (set: React.Dispatch<React.SetStateAction<any[]>>) => (p: any) =>
      set(c => { const n = [...c, p.new]; return n.length > 80 ? n.slice(-80) : n })

    const s1 = supabase.channel('esp_live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'esp32_data' }, push(setEsp)).subscribe()
    const s2 = supabase.channel('hlt_live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'health_vitals' }, push(setHealth)).subscribe()
    const s3 = supabase.channel('nan_live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'arduino_nano_data' }, push(setNano)).subscribe()
    const s4 = supabase.channel('stm_live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stm32_data' }, push(setStm32)).subscribe()
    return () => { supabase.removeChannel(s1); supabase.removeChannel(s2); supabase.removeChannel(s3); supabase.removeChannel(s4) }
  }, [live])

  const le = esp[esp.length - 1] || {}
  const lh = health[health.length - 1] || {}
  const ln = nano[nano.length - 1] || {}
  const ls = stm32[stm32.length - 1] || {}

  // merged robot + env datasets
  const robotData = esp.map((row, i) => ({ ...row, ...nano[i] }))

  return (
    <div style={pg}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 20, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(90deg,#60a5fa,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, letterSpacing: '-0.5px' }}>
              GRACE Command Center
            </h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Unified Telemetry — Robot · Environment · Person</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => setShowMap(m => !m)}
              style={{ background: showMap ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 20, color: '#a5b4fc', cursor: 'pointer', padding: '8px 18px', fontSize: 13, fontWeight: 600 }}
            >
              {showMap ? '🗺 Hide Mind Map' : '🗺 Show Mind Map'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 50, padding: '8px 16px' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Stream</span>
              <div style={dot(live)} />
              <span style={{ fontSize: 13, color: live ? '#10b981' : '#ef4444', fontWeight: 600 }}>{live ? 'LIVE' : 'PAUSED'}</span>
              <button style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, color: '#94a3b8', cursor: 'pointer', padding: '4px 14px', fontSize: 12 }} onClick={() => setLive(l => !l)}>
                {live ? '⏸ Pause' : '▶ Resume'}
              </button>
            </div>
          </div>
        </div>

        {/* Mind Map */}
        {showMap && (
          <div style={{ height: 480, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 32, background: '#080c14' }}>
            <GraceMindMap visible={visible} onToggle={onToggle} />
          </div>
        )}

        {/* ═══ 🤖 ROBOT HEALTH ═══ */}
        <div style={{ marginBottom: 40 }}>
          <div style={secLabel('#3b82f6')}>
            <span>🤖</span><span>Robot Health</span>
            <div style={secDiv('#3b82f6')} />
            <button onClick={() => onToggle('robot')} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 12, border: '1px solid #3b82f640', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', cursor: 'pointer' }}>
              {visible.robot ? 'Hide Charts' : 'Show Charts'}
            </button>
          </div>
          <div style={kpiRow}>
            <KPI accent="#3b82f6" label="Hoverboard 40V" value={`${le.battery_v?.toFixed(2) ?? '--'} V`} />
            <KPI accent="#ef4444" label="ESP32 Temp"     value={`${le.board_temp_c?.toFixed(1) ?? '--'} °C`} />
            <KPI accent="#06b6d4" label="Battery 24V"  value={`${ln.battery_24v_v?.toFixed(2) ?? '--'} V`} />
            <KPI accent="#8b5cf6" label="Buck 19V"     value={`${ln.buck_19v_v?.toFixed(2) ?? '--'} V`} />
            <KPI accent="#f59e0b" label="Batt 40V I"   value={`${ln.battery_40v_a?.toFixed(2) ?? '--'} A`} />
            <KPI accent="#fb923c" label="Batt 24V I"   value={`${ln.battery_24v_a?.toFixed(2) ?? '--'} A`} />
            <KPI accent="#a855f7" label="Chrg 40V"     value={`${ln.charger_40v_a?.toFixed(2) ?? '--'} A`} />
            <KPI accent="#ec4899" label="Chrg 24V"     value={`${ln.charger_24v_a?.toFixed(2) ?? '--'} A`} />
          </div>
          {visible.robot && (esp.length > 0 || nano.length > 0) && (
            <div style={grid}>
              <Chart title="⚡ Battery Voltages">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={nano}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis {...AX} domain={['auto','auto']} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="battery_24v_v" name="24V Batt" stroke="#06b6d4" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="buck_19v_v"    name="19V Buck" stroke="#8b5cf6" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
              <Chart title="🔋 Hoverboard 40V Battery & ESP32 Board Temp">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={esp}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis yAxisId="l" {...AX} domain={['auto','auto']} />
                    <YAxis yAxisId="r" orientation="right" {...AX} domain={['auto','auto']} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="l" type="monotone" dataKey="battery_v"    name="Hoverboard 40V (V)" stroke="#3b82f6" dot={false} strokeWidth={2} />
                    <Line yAxisId="r" type="monotone" dataKey="board_temp_c" name="ESP32 Board Temp (°C)" stroke="#ef4444" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
              <Chart title="⚡ Discharge Currents (A)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={nano}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis {...AX} domain={['auto','auto']} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="battery_40v_a" name="40V (A)" stroke="#f59e0b" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="battery_24v_a" name="24V (A)" stroke="#fb923c" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
              <Chart title="🔌 Charger Currents (A)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={nano}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis {...AX} domain={['auto','auto']} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="charger_40v_a" name="40V (A)" stroke="#a855f7" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="charger_24v_a" name="24V (A)" stroke="#ec4899" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
            </div>
          )}
        </div>

        {/* ═══ 🌍 ENVIRONMENT ═══ */}
        <div style={{ marginBottom: 40 }}>
          <div style={secLabel('#22c55e')}>
            <span>🌍</span><span>Environment</span>
            <div style={secDiv('#22c55e')} />
            <button onClick={() => onToggle('env')} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 12, border: '1px solid #22c55e40', background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer' }}>
              {visible.env ? 'Hide Charts' : 'Show Charts'}
            </button>
          </div>
          <div style={kpiRow}>
            <KPI accent="#f59e0b" label="BME Temp"   value={`${le.bme_temp_c?.toFixed(1) ?? '--'} °C`} />
            <KPI accent="#f59e0b" label="STM Temp"   value={`${ls.temp_c?.toFixed(1) ?? '--'} °C`} />
            <KPI accent="#06b6d4" label="BME Hum"   value={`${le.bme_humidity_pct?.toFixed(1) ?? '--'} %`} />
            <KPI accent="#06b6d4" label="STM Hum"   value={`${ls.humidity_pct?.toFixed(1) ?? '--'} %`} />
            <KPI accent="#eab308" label="BME Press"   value={`${le.bme_pressure_hpa?.toFixed(0) ?? '--'} hPa`} />
            <KPI accent="#eab308" label="STM Press"   value={`${ls.pressure_hpa?.toFixed(0) ?? '--'} hPa`} />
            <KPI accent="#ec4899" label="PM 2.5"     value={`${le.pm2_5 ?? '--'} µg/m³`} />
            <KPI accent="#22c55e" label="Gas (kΩ)"   value={`${le.bme_gas_kohm?.toFixed(1) ?? '--'} kΩ`} />
            <KPI accent="#84cc16" label="MQ Ratio"   value={`${ln.mq_ratio?.toFixed(3) ?? '--'}`} />
            <KPI accent="#a3e635" label="MHMQ Ratio" value={`${ln.mhmq_ratio?.toFixed(3) ?? '--'}`} />
          </div>
          {visible.env && esp.length > 0 && (
            <div style={grid}>
              <Chart title="🌡 BME680 Temp & Humidity">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={esp}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis yAxisId="l" {...AX} domain={['auto','auto']} />
                    <YAxis yAxisId="r" orientation="right" {...AX} domain={['auto','auto']} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="l" type="monotone" dataKey="bme_temp_c"      name="Temp (°C)"  stroke="#f59e0b" dot={false} strokeWidth={2} />
                    <Line yAxisId="r" type="monotone" dataKey="bme_humidity_pct" name="Humidity (%)" stroke="#06b6d4" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
              <Chart title="🌬 BME Pressure (hPa)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={esp}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis {...AX} domain={['auto','auto']} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="bme_pressure_hpa" name="Pressure" stroke="#eab308" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
              <Chart title="🌡 STM32 Temp & Humidity">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stm32}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis yAxisId="l" {...AX} domain={['auto','auto']} />
                    <YAxis yAxisId="r" orientation="right" {...AX} domain={['auto','auto']} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="l" type="monotone" dataKey="temp_c"       name="Temp (°C)"  stroke="#f59e0b" dot={false} strokeWidth={2} />
                    <Line yAxisId="r" type="monotone" dataKey="humidity_pct" name="Humidity (%)" stroke="#06b6d4" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
              <Chart title="🌬 STM32 Pressure (hPa)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stm32}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis {...AX} domain={['auto','auto']} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="pressure_hpa" name="Pressure" stroke="#eab308" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
              <Chart title="💨 Air Quality — PM">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={esp}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis {...AX} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="pm1_0" name="PM 1.0" stroke="#a855f7" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="pm2_5" name="PM 2.5" stroke="#ec4899" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="pm10"  name="PM 10"  stroke="#f43f5e" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
              <Chart title="🧪 Gas Resistance (kΩ)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={esp}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis {...AX} domain={['auto','auto']} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="bme_gas_kohm" name="Gas (kΩ)" stroke="#22c55e" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
              <Chart title="🧪 MQ Gas Ratios">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={nano}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis {...AX} domain={['auto','auto']} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="mq_ratio"   name="MQ"   stroke="#84cc16" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="mhmq_ratio" name="MHMQ" stroke="#a3e635" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
            </div>
          )}
        </div>

        {/* ═══ ❤️ PERSON VITALS ═══ */}
        <div style={{ marginBottom: 40 }}>
          <div style={secLabel('#f43f5e')}>
            <span>❤️</span><span>Person Vitals</span>
            <div style={secDiv('#f43f5e')} />
            <button onClick={() => onToggle('person')} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 12, border: '1px solid #f43f5e40', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', cursor: 'pointer' }}>
              {visible.person ? 'Hide Charts' : 'Show Charts'}
            </button>
          </div>
          <div style={kpiRow}>
            <KPI accent="#ef4444" label="Heart Rate" value={`${lh.heart_rate_bpm ?? '--'} BPM`} />
            <KPI accent="#10b981" label="SpO2"       value={`${lh.spo2_percent ?? '--'} %`} />
            <KPI accent="#8b5cf6" label="Systolic"   value={`${lh.bp_systolic ?? '--'} mmHg`} />
            <KPI accent="#3b82f6" label="Diastolic"  value={`${lh.bp_diastolic ?? '--'} mmHg`} />
            <KPI accent="#f59e0b" label="Steps"      value={`${lh.steps ?? '--'}`} />
            <KPI accent="#06b6d4" label="Calories"   value={`${lh.calories_kcal ?? '--'} kcal`} />
          </div>
          {visible.person && health.length > 0 && (
            <div style={grid}>
              <Chart title="💓 Heart Rate (BPM)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={health}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis {...AX} domain={['auto','auto']} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="heart_rate_bpm" name="Heart Rate" stroke="#ef4444" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
              <Chart title="🩸 Blood Pressure (mmHg)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={health}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis {...AX} domain={['auto','auto']} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="bp_systolic"  name="Systolic"  stroke="#8b5cf6" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="bp_diastolic" name="Diastolic" stroke="#3b82f6" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
              <Chart title="🫀 SpO2 (%)">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={health}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GS} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AX} />
                    <YAxis {...AX} domain={['dataMin - 2', 100]} />
                    <Tooltip contentStyle={TT} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="spo2_percent" name="SpO2" stroke="#10b981" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Chart>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
