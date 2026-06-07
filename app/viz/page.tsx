'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// ─── Inline style constants ────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f0a 100%)',
    color: '#e2e8f0',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: '24px',
  },
  container: {
    maxWidth: '1600px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    paddingBottom: '20px',
    marginBottom: '28px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    background: 'linear-gradient(90deg, #60a5fa, #34d399)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#64748b',
    margin: '4px 0 0 0',
    fontSize: '14px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '50px',
    padding: '8px 16px',
  },
  dot: (live: boolean): React.CSSProperties => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: live ? '#10b981' : '#ef4444',
    boxShadow: live ? '0 0 8px #10b981' : 'none',
  }),
  pauseBtn: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px 14px',
    fontSize: '12px',
  },
  sectionLabel: (color: string): React.CSSProperties => ({
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color,
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  sectionDivider: (color: string): React.CSSProperties => ({
    flex: 1,
    height: '1px',
    background: `linear-gradient(90deg, ${color}40, transparent)`,
    marginLeft: '8px',
  }),
  kpiRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  kpiCard: (accent: string): React.CSSProperties => ({
    flex: '1 1 140px',
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${accent}30`,
    borderRadius: '16px',
    padding: '16px',
    position: 'relative',
    overflow: 'hidden',
  }),
  kpiAccentBar: (accent: string): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: accent,
    borderRadius: '16px 16px 0 0',
  }),
  kpiLabel: {
    color: '#64748b',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    margin: '0 0 6px 0',
  },
  kpiValue: {
    color: '#f1f5f9',
    fontSize: '22px',
    fontWeight: 700,
    margin: 0,
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  chartCard: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '16px',
    padding: '16px',
    overflow: 'hidden',
  },
  chartTitle: {
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.8px',
    textTransform: 'uppercase' as const,
    margin: '0 0 12px 0',
  },
  empty: {
    color: '#334155',
    fontSize: '14px',
    padding: '24px 0',
  },
}

const TOOLTIP_STYLE = { backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }
const GRID_STROKE = 'rgba(255,255,255,0.05)'
const AXIS_STYLE = { stroke: '#475569', fontSize: 10 }

export default function VizPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [healthData, setHealthData] = useState<any[]>([])
  const [live, setLive] = useState(true)

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: initialData } = await supabase
        .from('esp32_data').select('*').order('ts', { ascending: false }).limit(80)
      if (initialData) setData(initialData.reverse())
    }
    const fetchHealthData = async () => {
      const { data: initialHealth } = await supabase
        .from('health_vitals').select('*').order('ts', { ascending: false }).limit(80)
      if (initialHealth) setHealthData(initialHealth.reverse())
    }
    fetchInitialData()
    fetchHealthData()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sub: any, healthSub: any
    if (live) {
      sub = supabase.channel('esp32_live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'esp32_data' }, p => {
          setData(c => { const n = [...c, p.new]; return n.length > 80 ? n.slice(-80) : n })
        }).subscribe()
      healthSub = supabase.channel('health_live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'health_vitals' }, p => {
          setHealthData(c => { const n = [...c, p.new]; return n.length > 80 ? n.slice(-80) : n })
        }).subscribe()
    }
    return () => {
      if (sub) supabase.removeChannel(sub)
      if (healthSub) supabase.removeChannel(healthSub)
    }
  }, [live])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fmt = (ts: any) => {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
  }

  const latest = data[data.length - 1] || {}
  const latestH = healthData[healthData.length - 1] || {}

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* ── Header ── */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Command Center</h1>
            <p style={styles.subtitle}>Unified Robot & Health Telemetry — Live</p>
          </div>
          <div style={styles.statusBadge}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Stream</span>
            <div style={styles.dot(live)} />
            <span style={{ fontSize: '13px', color: live ? '#10b981' : '#ef4444', fontWeight: 600 }}>
              {live ? 'LIVE' : 'PAUSED'}
            </span>
            <button style={styles.pauseBtn} onClick={() => setLive(!live)}>
              {live ? '⏸ Pause' : '▶ Resume'}
            </button>
          </div>
        </div>

        {/* ═══════════ ROBOT SECTION ═══════════ */}
        <div>
          <div style={styles.sectionLabel('#60a5fa')}>
            <span>🤖</span>
            <span>Robot Telemetry</span>
            <div style={styles.sectionDivider('#60a5fa')} />
          </div>

          {/* KPIs */}
          <div style={styles.kpiRow}>
            <KpiCard accent="#3b82f6" label="Battery" value={`${latest.battery_v?.toFixed(2) ?? '--'} V`} />
            <KpiCard accent="#ef4444" label="Board Temp" value={`${latest.board_temp_c?.toFixed(1) ?? '--'} °C`} />
            <KpiCard accent="#f59e0b" label="Env Temp" value={`${latest.bme_temp_c?.toFixed(1) ?? '--'} °C`} />
            <KpiCard accent="#06b6d4" label="Humidity" value={`${latest.bme_humidity_pct?.toFixed(1) ?? '--'} %`} />
            <KpiCard accent="#eab308" label="Pressure" value={`${latest.bme_pressure_hpa?.toFixed(0) ?? '--'} hPa`} />
            <KpiCard accent="#ec4899" label="PM 2.5" value={`${latest.pm2_5 ?? '--'} µg/m³`} />
          </div>

          {/* Charts */}
          {data.length > 0 ? (
            <div style={styles.chartsGrid}>

              <div style={styles.chartCard}>
                <p style={styles.chartTitle}>⚡ Power & Board Temp</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AXIS_STYLE} />
                    <YAxis yAxisId="l" {...AXIS_STYLE} domain={['auto','auto']} />
                    <YAxis yAxisId="r" orientation="right" {...AXIS_STYLE} domain={['auto','auto']} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{fontSize:'11px'}} />
                    <Line yAxisId="l" type="monotone" dataKey="battery_v" name="Battery (V)" stroke="#3b82f6" dot={false} strokeWidth={2} />
                    <Line yAxisId="r" type="monotone" dataKey="board_temp_c" name="Board Temp (°C)" stroke="#ef4444" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <p style={styles.chartTitle}>🌡 BME680 Temp & Humidity</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AXIS_STYLE} />
                    <YAxis yAxisId="l" {...AXIS_STYLE} domain={['auto','auto']} />
                    <YAxis yAxisId="r" orientation="right" {...AXIS_STYLE} domain={['auto','auto']} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{fontSize:'11px'}} />
                    <Line yAxisId="l" type="monotone" dataKey="bme_temp_c" name="Temp (°C)" stroke="#f59e0b" dot={false} strokeWidth={2} />
                    <Line yAxisId="r" type="monotone" dataKey="bme_humidity_pct" name="Humidity (%)" stroke="#06b6d4" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <p style={styles.chartTitle}>💨 Air Quality — PMS5003</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{fontSize:'11px'}} />
                    <Line type="monotone" dataKey="pm1_0" name="PM 1.0" stroke="#a855f7" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="pm2_5" name="PM 2.5" stroke="#ec4899" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="pm10" name="PM 10" stroke="#f43f5e" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <p style={styles.chartTitle}>🌬 Atmospheric Pressure (hPa)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} domain={['auto','auto']} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{fontSize:'11px'}} />
                    <Line type="monotone" dataKey="bme_pressure_hpa" name="Pressure (hPa)" stroke="#eab308" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <p style={styles.chartTitle}>🧪 Gas Resistance (kΩ)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} domain={['auto','auto']} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{fontSize:'11px'}} />
                    <Line type="monotone" dataKey="bme_gas_kohm" name="Gas (kΩ)" stroke="#22c55e" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

            </div>
          ) : (
            <p style={styles.empty}>⏳ Waiting for robot data...</p>
          )}
        </div>

        {/* ═══════════ HEALTH SECTION ═══════════ */}
        <div>
          <div style={styles.sectionLabel('#34d399')}>
            <span>❤️</span>
            <span>User Health Vitals</span>
            <div style={styles.sectionDivider('#34d399')} />
          </div>

          {/* KPIs */}
          <div style={styles.kpiRow}>
            <KpiCard accent="#ef4444" label="Heart Rate" value={`${latestH.heart_rate_bpm ?? '--'} BPM`} />
            <KpiCard accent="#10b981" label="SpO2" value={`${latestH.spo2_percent ?? '--'} %`} />
            <KpiCard accent="#8b5cf6" label="Systolic" value={`${latestH.bp_systolic ?? '--'} mmHg`} />
            <KpiCard accent="#3b82f6" label="Diastolic" value={`${latestH.bp_diastolic ?? '--'} mmHg`} />
            <KpiCard accent="#f59e0b" label="Steps" value={`${latestH.steps ?? '--'}`} />
            <KpiCard accent="#06b6d4" label="Calories" value={`${latestH.calories_kcal ?? '--'} kcal`} />
          </div>

          {/* Charts */}
          {healthData.length > 0 ? (
            <div style={styles.chartsGrid}>

              <div style={styles.chartCard}>
                <p style={styles.chartTitle}>💓 Heart Rate (BPM)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={healthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} domain={['auto','auto']} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{fontSize:'11px'}} />
                    <Line type="monotone" dataKey="heart_rate_bpm" name="Heart Rate" stroke="#ef4444" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <p style={styles.chartTitle}>🩸 Blood Pressure (mmHg)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={healthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} domain={['auto','auto']} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{fontSize:'11px'}} />
                    <Line type="monotone" dataKey="bp_systolic" name="Systolic" stroke="#8b5cf6" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="bp_diastolic" name="Diastolic" stroke="#3b82f6" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <p style={styles.chartTitle}>🫀 Blood Oxygen — SpO2 (%)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={healthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="ts" tickFormatter={fmt} {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} domain={['dataMin - 2', 100]} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={fmt} />
                    <Legend iconSize={8} wrapperStyle={{fontSize:'11px'}} />
                    <Line type="monotone" dataKey="spo2_percent" name="SpO2" stroke="#10b981" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

            </div>
          ) : (
            <p style={styles.empty}>⏳ Waiting for health vitals...</p>
          )}
        </div>

      </div>
    </div>
  )
}

function KpiCard({ accent, label, value }: { accent: string; label: string; value: string }) {
  return (
    <div style={styles.kpiCard(accent)}>
      <div style={styles.kpiAccentBar(accent)} />
      <p style={styles.kpiLabel}>{label}</p>
      <p style={styles.kpiValue}>{value}</p>
    </div>
  )
}
