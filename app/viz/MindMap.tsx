'use client'
import { useCallback, useEffect } from 'react'
import {
  ReactFlow, Background, BackgroundVariant,
  useNodesState, useEdgesState,
  Handle, Position, Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const C = { robot: '#3b82f6', env: '#22c55e', person: '#f43f5e' }

function CenterNode() {
  return (
    <div style={{
      width: 100, height: 100, borderRadius: '50%',
      background: 'linear-gradient(135deg,#1e293b,#0f172a)',
      border: '2px solid rgba(148,163,184,0.35)',
      boxShadow: '0 0 28px rgba(148,163,184,0.18)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#f1f5f9', userSelect: 'none',
    }}>
      <span style={{ fontSize: 22 }}>⚙️</span>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>GRACE</span>
      <Handle type="source" id="l" position={Position.Left}  style={{ opacity: 0 }} />
      <Handle type="source" id="r" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BranchNode({ data }: { data: any }) {
  const { color, active, emoji, label, onToggle, tgt, src } = data
  return (
    <div onClick={onToggle} style={{
      background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
      border: `2px solid ${active ? color : 'rgba(255,255,255,0.12)'}`,
      borderRadius: 40, padding: '10px 20px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 8,
      color: active ? color : '#64748b', fontWeight: 700, fontSize: 13,
      boxShadow: active ? `0 0 20px ${color}40` : 'none',
      transition: 'all 0.3s', userSelect: 'none', whiteSpace: 'nowrap',
    }}>
      <Handle type="target" position={tgt} style={{ opacity: 0 }} />
      <span>{emoji}</span><span>{label}</span>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', marginLeft: 4,
        background: active ? color : '#334155',
        boxShadow: active ? `0 0 6px ${color}` : 'none',
      }} />
      <Handle type="source" id="out" position={src} style={{ opacity: 0 }} />
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LeafNode({ data }: { data: any }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: `1px solid ${data.color}25`, borderRadius: 8,
      padding: '5px 12px', color: '#94a3b8', fontSize: 11,
      fontWeight: 500, userSelect: 'none', whiteSpace: 'nowrap',
    }}>
      <Handle type="target" position={data.side} style={{ opacity: 0 }} />
      {data.label}
    </div>
  )
}

const nodeTypes = { centerNode: CenterNode, branchNode: BranchNode, leafNode: LeafNode }

const EDGE_STYLE = { stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1.5 }

function makeNodes(visible: Record<string, boolean>, onToggle: (s: string) => void): Node[] {
  return [
    { id: 'grace', type: 'centerNode', position: { x: 490, y: 210 }, data: {} },
    // Robot branch (left-top)
    { id: 'robot', type: 'branchNode', position: { x: 230, y: 80 }, data: { label: 'Robot Health', emoji: '🤖', color: C.robot, active: visible.robot, onToggle: () => onToggle('robot'), tgt: Position.Right, src: Position.Left } },
    { id: 'r1', type: 'leafNode', position: { x: 0,  y: 10  }, data: { label: 'Battery V · Board Temp',        color: C.robot, side: Position.Right } },
    { id: 'r2', type: 'leafNode', position: { x: 0,  y: 58  }, data: { label: 'Battery 24V · Buck 19V',        color: C.robot, side: Position.Right } },
    { id: 'r3', type: 'leafNode', position: { x: 0,  y: 106 }, data: { label: 'Discharge Currents (40V·24V)',  color: C.robot, side: Position.Right } },
    { id: 'r4', type: 'leafNode', position: { x: 0,  y: 154 }, data: { label: 'Charger Currents (40V·24V)',    color: C.robot, side: Position.Right } },
    // Env branch (left-bottom)
    { id: 'env', type: 'branchNode', position: { x: 230, y: 380 }, data: { label: 'Environment', emoji: '🌍', color: C.env, active: visible.env, onToggle: () => onToggle('env'), tgt: Position.Right, src: Position.Left } },
    { id: 'e1', type: 'leafNode', position: { x: 0,  y: 310 }, data: { label: 'Temp · Humidity · Pressure',   color: C.env, side: Position.Right } },
    { id: 'e2', type: 'leafNode', position: { x: 0,  y: 358 }, data: { label: 'PM 1.0 · PM 2.5 · PM 10',     color: C.env, side: Position.Right } },
    { id: 'e3', type: 'leafNode', position: { x: 0,  y: 406 }, data: { label: 'Gas Resistance (kΩ)',          color: C.env, side: Position.Right } },
    { id: 'e4', type: 'leafNode', position: { x: 0,  y: 454 }, data: { label: 'MQ Ratio · MHMQ Ratio',        color: C.env, side: Position.Right } },
    // Person branch (right)
    { id: 'person', type: 'branchNode', position: { x: 760, y: 230 }, data: { label: 'Person Vitals', emoji: '❤️', color: C.person, active: visible.person, onToggle: () => onToggle('person'), tgt: Position.Left, src: Position.Right } },
    { id: 'p1', type: 'leafNode', position: { x: 990, y: 140 }, data: { label: 'Heart Rate (BPM)',      color: C.person, side: Position.Left } },
    { id: 'p2', type: 'leafNode', position: { x: 990, y: 190 }, data: { label: 'SpO2 (%)',              color: C.person, side: Position.Left } },
    { id: 'p3', type: 'leafNode', position: { x: 990, y: 240 }, data: { label: 'Blood Pressure',        color: C.person, side: Position.Left } },
    { id: 'p4', type: 'leafNode', position: { x: 990, y: 290 }, data: { label: 'Step Count',            color: C.person, side: Position.Left } },
    { id: 'p5', type: 'leafNode', position: { x: 990, y: 340 }, data: { label: 'Calories (kcal)',        color: C.person, side: Position.Left } },
  ]
}

const EDGES: ReturnType<typeof useEdgesState>[0] = [
  { id: 'g-r',  source: 'grace', sourceHandle: 'l', target: 'robot',  style: { stroke: C.robot,  strokeWidth: 2 }, type: 'smoothstep' },
  { id: 'g-e',  source: 'grace', sourceHandle: 'l', target: 'env',    style: { stroke: C.env,   strokeWidth: 2 }, type: 'smoothstep' },
  { id: 'g-p',  source: 'grace', sourceHandle: 'r', target: 'person', style: { stroke: C.person, strokeWidth: 2 }, type: 'smoothstep' },
  { id: 'r-r1', source: 'robot', sourceHandle: 'out', target: 'r1', style: EDGE_STYLE, type: 'smoothstep' },
  { id: 'r-r2', source: 'robot', sourceHandle: 'out', target: 'r2', style: EDGE_STYLE, type: 'smoothstep' },
  { id: 'r-r3', source: 'robot', sourceHandle: 'out', target: 'r3', style: EDGE_STYLE, type: 'smoothstep' },
  { id: 'r-r4', source: 'robot', sourceHandle: 'out', target: 'r4', style: EDGE_STYLE, type: 'smoothstep' },
  { id: 'e-e1', source: 'env',   sourceHandle: 'out', target: 'e1', style: EDGE_STYLE, type: 'smoothstep' },
  { id: 'e-e2', source: 'env',   sourceHandle: 'out', target: 'e2', style: EDGE_STYLE, type: 'smoothstep' },
  { id: 'e-e3', source: 'env',   sourceHandle: 'out', target: 'e3', style: EDGE_STYLE, type: 'smoothstep' },
  { id: 'e-e4', source: 'env',   sourceHandle: 'out', target: 'e4', style: EDGE_STYLE, type: 'smoothstep' },
  { id: 'p-p1', source: 'person', sourceHandle: 'out', target: 'p1', style: EDGE_STYLE, type: 'smoothstep' },
  { id: 'p-p2', source: 'person', sourceHandle: 'out', target: 'p2', style: EDGE_STYLE, type: 'smoothstep' },
  { id: 'p-p3', source: 'person', sourceHandle: 'out', target: 'p3', style: EDGE_STYLE, type: 'smoothstep' },
  { id: 'p-p4', source: 'person', sourceHandle: 'out', target: 'p4', style: EDGE_STYLE, type: 'smoothstep' },
  { id: 'p-p5', source: 'person', sourceHandle: 'out', target: 'p5', style: EDGE_STYLE, type: 'smoothstep' },
]

export default function GraceMindMap({
  visible, onToggle,
}: {
  visible: Record<string, boolean>
  onToggle: (section: string) => void
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(makeNodes(visible, onToggle))
  const [edges, , onEdgesChange] = useEdgesState(EDGES)

  useEffect(() => {
    setNodes(makeNodes(visible, onToggle))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'branchNode') {
      const section = (node.data as { section?: string }).section
      if (section) onToggle(section)
    }
  }, [onToggle])

  return (
    <ReactFlow
      nodes={nodes} edges={edges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView fitViewOptions={{ padding: 0.2 }}
      nodesDraggable={false} nodesConnectable={false}
      panOnDrag zoomOnScroll
      style={{ background: '#080c14' }}
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.04)" />
    </ReactFlow>
  )
}
