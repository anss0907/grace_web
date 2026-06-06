'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

export default function VizPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([])
  const [live, setLive] = useState(true)

  useEffect(() => {
    // Initial fetch of the last 100 rows
    const fetchInitialData = async () => {
      const { data: initialData, error } = await supabase
        .from('esp32_data')
        .select('*')
        .order('ts', { ascending: false })
        .limit(100)

      if (initialData) {
        setData(initialData.reverse())
      }
    }

    fetchInitialData()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let subscription: any

    if (live) {
      subscription = supabase
        .channel('public:esp32_data')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'esp32_data' }, payload => {
          setData(current => {
            const newData = [...current, payload.new]
            // Keep last 100 points
            if (newData.length > 100) return newData.slice(newData.length - 100)
            return newData
          })
        })
        .subscribe()
    }

    return () => {
      if (subscription) supabase.removeChannel(subscription)
    }
  }, [live])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatTime = (ts: any) => {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        <header className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              Telemetry Dashboard
            </h1>
            <p className="text-neutral-400 mt-1">Real-time ESP32 Sensor Visualization</p>
          </div>

          <div className="flex items-center space-x-4 bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-neutral-300">Status</span>
              <div className={`w-3 h-3 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            </div>
            <button
              onClick={() => setLive(!live)}
              className="text-xs bg-neutral-800 hover:bg-neutral-700 transition px-3 py-1 rounded-full"
            >
              {live ? 'Pause' : 'Resume'}
            </button>
          </div>
        </header>

        {/* KPIs */}
        {data.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Battery" value={`${data[data.length - 1].battery_v?.toFixed(2) || '--'} V`} />
            <KpiCard title="Board Temp" value={`${data[data.length - 1].board_temp_c?.toFixed(1) || '--'} °C`} />
            <KpiCard title="BME Temp" value={`${data[data.length - 1].bme_temp_c?.toFixed(1) || '--'} °C`} />
            <KpiCard title="PM 2.5" value={`${data[data.length - 1].pm2_5 || '--'} µg/m³`} />
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Power">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="ts" tickFormatter={formatTime} stroke="#888" fontSize={12} />
                <YAxis yAxisId="left" stroke="#888" fontSize={12} domain={['auto', 'auto']} />
                <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} labelFormatter={formatTime} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="battery_v" name="Battery (V)" stroke="#3b82f6" dot={false} strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="board_temp_c" name="Board Temp (°C)" stroke="#ef4444" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Environment (BME680)">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="ts" tickFormatter={formatTime} stroke="#888" fontSize={12} />
                <YAxis yAxisId="left" stroke="#888" fontSize={12} domain={['auto', 'auto']} />
                <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} labelFormatter={formatTime} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="bme_temp_c" name="Temp (°C)" stroke="#f59e0b" dot={false} strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="bme_humidity_pct" name="Humidity (%)" stroke="#06b6d4" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Air Quality (PMS5003)">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="ts" tickFormatter={formatTime} stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} labelFormatter={formatTime} />
                <Legend />
                <Line type="monotone" dataKey="pm1_0" name="PM 1.0" stroke="#a855f7" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="pm2_5" name="PM 2.5" stroke="#ec4899" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="pm10" name="PM 10" stroke="#f43f5e" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>


        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value }: { title: string, value: string }) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 backdrop-blur-sm">
      <h3 className="text-neutral-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-4">
      <h2 className="text-lg font-medium text-neutral-200 mb-4">{title}</h2>
      {children}
    </div>
  )
}
