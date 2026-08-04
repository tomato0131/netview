declare global {
  interface Window { __NETVIEWONE_API_BASE__?: string; }
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { DEVICE_TYPES, FLOORS, ROOMS, DEFAULT_ADMIN, DEFAULT_H3C_TEMPLATE } from '@/lib/data';
import type { Device, User, SnmpTrap, DeviceGroup, AuditLog, AlertRule, AlertRecord, TopoNode, TopoLink, MonitorItem, OidTemplate, OidCategory, OidItem } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
  LayoutDashboard, Server, Terminal, Users, Settings,
  ChevronRight, Activity, Cpu, HardDrive, Fan, EthernetPort,
  Search, Plus, Pencil, Trash2, Wifi, Shield, Radio,
  Building2, Sun, Moon, AlertTriangle, X, Check, Eye,
  ArrowUpRight, ArrowDownRight, RefreshCw, Plug,
  Database, Zap, Phone, Mail, Lock, Unlock, LogOut,
  Globe, UserPlus, KeyRound, Scan, Tag, Fullscreen,
  FileText, Bell, Send, Wrench, Play, Clock,
  Link2, Cloud, Monitor, Move,
  Download, Upload, Unplug, FileDown, FileUp,
} from 'lucide-react';

type Page = 'dashboard' | 'devices' | 'device-detail' | 'monitor-items' | 'monitor-hosts' | 'monitor-latest' | 'ssh' | 'users' | 'snmp' | 'audit' | 'alerts' | 'debug' | 'templates' | 'login' | 'register' | 'forgot';

// API base URL: use server address when opened from file:// or localhost dev server
const API_BASE = (() => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1') {
      return window.__NETVIEWONE_API_BASE__ || 'http://localhost:8090';
    }
  }
  return '';
})();

// ==================== SHARED ====================
function StatusDot({ status }: { status: 'up' | 'down' | 'disabled' }) {
  const m = { up: 'bg-emerald-400', down: 'bg-red-400', disabled: 'bg-muted-foreground/40' };
  return <span className="relative flex h-2.5 w-2.5">{status === 'up' && <span className={`absolute inline-flex h-full w-full rounded-full ${m[status]} opacity-75 status-pulse`} />}<span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${m[status]}`} /></span>;
}

function DualStatusBadge({ ping, snmp }: { ping: 'up' | 'down'; snmp: 'up' | 'down' | 'disabled' }) {
  const m = { up: 'bg-emerald-400', down: 'bg-red-400', disabled: 'bg-muted-foreground/40' };
  return <div className="flex items-center gap-2"><span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-muted/30"><span className={`w-2 h-2 rounded-full ${m[ping]}`} />PING</span><span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-muted/30"><span className={`w-2 h-2 rounded-full ${m[snmp]}`} />SNMP</span></div>;
}

function MetricBar({ value, label, icon, warn = 80 }: { value: number; label: string; icon: React.ReactNode; warn?: number }) {
  const color = value >= warn ? 'text-amber-400' : value >= 90 ? 'text-red-400' : 'text-foreground';
  return (
    <div className="space-y-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}<span>{label}</span></div><span className={`text-sm font-semibold tabular-nums ${color}`}>{value}%</span></div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ease-out ${value >= warn ? 'bg-amber-400' : value >= 90 ? 'bg-red-400' : 'bg-primary'}`} style={{ width: `${value}%` }} /></div></div>
  );
}

// ==================== LOGIN PAGE ====================
function LoginPage({ onLogin, onRegister, onForgot, users }: { onLogin: (user: User) => void; onRegister: () => void; onForgot: () => void; users: User[] }) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!account.trim() || !password) { setError('请输入账号和密码'); return; }
    console.log('[NetviewOne] Login attempt:', { account: account.trim(), passwordLen: password.length, usersCount: users.length, users: users.map(u => ({ phone: u.phone, email: u.email, hasPassword: !!u.password, passwordMatch: u.password === password, status: u.status })) });
    const matched = users.find(u =>
      (u.phone === account.trim() || u.email === account.trim()) && u.password === password && u.status === 'active'
    );
    if (matched) {
      console.log('[NetviewOne] Login success:', matched.name);
      setError('');
      onLogin(matched);
    } else {
      console.log('[NetviewOne] Login failed - no match found');
      setError('账号或密码错误，或账号已禁用');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-0 shadow-lg apple-card">
        <CardContent className="p-8 space-y-6">
          <div className="text-center"><div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto"><EthernetPort className="h-7 w-7 text-primary-foreground" /></div><h1 className="text-2xl font-bold mt-4">NetviewOne</h1><p className="text-sm text-muted-foreground mt-1">网络设备统一管理平台</p></div>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">手机号 / 邮箱</label><Input className="mt-1.5 rounded-xl" placeholder="请输入手机号或邮箱" value={account} onChange={e => { setAccount(e.target.value); setError(''); }} onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }} /></div>
            <div><label className="text-sm font-medium">密码</label><Input className="mt-1.5 rounded-xl" type="password" placeholder="请输入密码" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }} /></div>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <div className="flex justify-end"><button className="text-xs text-primary hover:underline" onClick={onForgot}>忘记密码？</button></div>
            <Button className="w-full rounded-xl h-10" onClick={handleLogin}>登录</Button>
          </div>
          <div className="text-center text-sm text-muted-foreground">还没有账号？ <button className="text-primary hover:underline" onClick={onRegister}>立即注册</button></div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== REGISTER PAGE ====================
function RegisterPage({ onBack, onRegister }: { onBack: () => void; onRegister: (user: User) => void }) {
  const [form, setForm] = useState({ name: '', department: '', phone: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  const handleSubmit = () => {
    if (!form.name || !form.department || !form.phone || !form.email || !form.password) { setError('请填写所有必填项'); return; }
    if (form.password !== form.confirm) { setError('两次输入的密码不一致'); return; }
    if (form.password.length < 6) { setError('密码至少6位'); return; }
    const newUser: User = {
      id: `u-${Date.now()}`, name: form.name, department: form.department, phone: form.phone,
      email: form.email, role: 'viewer', status: 'active', lastLogin: new Date().toISOString().slice(0, 16).replace('T', ' '), password: form.password,
    };
    setError('');
    onRegister(newUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-0 shadow-lg apple-card">
        <CardContent className="p-8 space-y-5">
          <div className="text-center"><div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto"><UserPlus className="h-7 w-7 text-primary-foreground" /></div><h1 className="text-xl font-bold mt-4">注册账号</h1><p className="text-sm text-muted-foreground mt-1">创建您的NetviewOne管理账号</p></div>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">姓名 <span className="text-red-400">*</span></label><Input className="mt-1.5 rounded-xl" placeholder="请输入姓名" value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div><label className="text-sm font-medium">部门 <span className="text-red-400">*</span></label><Input className="mt-1.5 rounded-xl" placeholder="请输入部门" value={form.department} onChange={e => set('department', e.target.value)} /></div>
            <div><label className="text-sm font-medium">手机号 <span className="text-red-400">*</span></label><Input className="mt-1.5 rounded-xl" placeholder="请输入手机号" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div><label className="text-sm font-medium">邮箱 <span className="text-red-400">*</span></label><Input className="mt-1.5 rounded-xl" type="email" placeholder="用于找回密码" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><label className="text-sm font-medium">密码 <span className="text-red-400">*</span></label><Input className="mt-1.5 rounded-xl" type="password" placeholder="至少6位" value={form.password} onChange={e => set('password', e.target.value)} /></div>
            <div><label className="text-sm font-medium">确认密码 <span className="text-red-400">*</span></label><Input className="mt-1.5 rounded-xl" type="password" placeholder="再次输入密码" value={form.confirm} onChange={e => set('confirm', e.target.value)} /></div>
          </div>
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <Button className="w-full rounded-xl h-10" onClick={handleSubmit}>注册</Button>
          <div className="text-center text-sm text-muted-foreground">已有账号？ <button className="text-primary hover:underline" onClick={onBack}>返回登录</button></div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== FORGOT PASSWORD PAGE ====================
function ForgotPasswordPage({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-0 shadow-lg apple-card">
        <CardContent className="p-8 space-y-6">
          <div className="text-center"><div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto"><KeyRound className="h-7 w-7 text-primary-foreground" /></div><h1 className="text-xl font-bold mt-4">找回密码</h1><p className="text-sm text-muted-foreground mt-1">通过注册邮箱重置密码</p></div>
          {!sent ? (
            <><div><label className="text-sm font-medium">注册邮箱</label><Input className="mt-1.5 rounded-xl" type="email" placeholder="请输入注册时使用的邮箱" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <Button className="w-full rounded-xl h-10" onClick={() => { if (email) setSent(true); }}>发送重置链接</Button></>
          ) : (
            <div className="text-center space-y-4"><div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto"><Check className="h-6 w-6 text-emerald-400" /></div><p className="text-sm">重置链接已发送至 <span className="font-medium">{email}</span></p><p className="text-xs text-muted-foreground">请检查邮箱并按照指引重置密码</p></div>
          )}
          <div className="text-center text-sm text-muted-foreground"><button className="text-primary hover:underline" onClick={onBack}>返回登录</button></div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== TOPOLOGY DEVICE ICONS ====================
// Calculate intersection point of line from rect center to target, hitting rect edge
// Node rect: width=80, height=56 (14*4), icon centered at (40, 28) relative to (x,y)
function calcEdgePoint(node: TopoNode, targetX: number, targetY: number): { x: number; y: number } {
  const cx = node.x + 40;
  const cy = node.y + 28;
  const hw = 44; // half-width of node box + small gap
  const hh = 34; // half-height of node box + small gap
  const dx = targetX - cx;
  const dy = targetY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  // Scale to intersect with rectangle edge
  const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy, 1);
  return { x: cx + dx * s, y: cy + dy * s };
}

const TOPO_ICONS: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  'internet':        { icon: <Cloud className="h-6 w-6" />,       color: 'text-sky-400',    bg: 'bg-sky-500/15' },
  'firewall':        { icon: <Shield className="h-6 w-6" />,      color: 'text-orange-400',  bg: 'bg-orange-500/15' },
  'router':          { icon: <Radio className="h-6 w-6" />,       color: 'text-violet-400',  bg: 'bg-violet-500/15' },
  'core-switch':     { icon: <Server className="h-6 w-6" />,      color: 'text-primary',     bg: 'bg-primary/15' },
  'aggregation-switch': { icon: <Server className="h-6 w-6" />,   color: 'text-indigo-400',  bg: 'bg-indigo-500/15' },
  'access-switch':   { icon: <EthernetPort className="h-6 w-6" />,color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  'ap':              { icon: <Wifi className="h-6 w-6" />,        color: 'text-cyan-400',    bg: 'bg-cyan-500/15' },
  'fortress':        { icon: <KeyRound className="h-6 w-6" />,    color: 'text-amber-400',   bg: 'bg-amber-500/15' },
  'vpn':             { icon: <Lock className="h-6 w-6" />,         color: 'text-teal-400',    bg: 'bg-teal-500/15' },
  'waf':             { icon: <Shield className="h-6 w-6" />,       color: 'text-rose-400',   bg: 'bg-rose-500/15' },
  'behavior-manager': { icon: <Monitor className="h-6 w-6" />,    color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15' },
};

const TOPO_PALETTE = [
  { type: 'internet', label: '互联网' },
  { type: 'firewall', label: '防火墙' },
  { type: 'router', label: '路由器' },
  { type: 'core-switch', label: '核心交换机' },
  { type: 'aggregation-switch', label: '汇聚交换机' },
  { type: 'access-switch', label: '接入交换机' },
  { type: 'ap', label: '无线AP' },
  { type: 'fortress', label: '堡垒机' },
  { type: 'vpn', label: 'VPN网关' },
  { type: 'waf', label: 'WAF' },
  { type: 'behavior-manager', label: '上网行为管理' },
];

// ==================== DASHBOARD PAGE (Topology Editor) ====================
function DashboardPage({ devices, onNavigateDevice, alertRecords, onNavigateAlerts, onNavigateDevices }: { devices: Device[]; onNavigateDevice: (id: string) => void; alertRecords: AlertRecord[]; onNavigateAlerts: () => void; onNavigateDevices: (statusFilter: string) => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [topoNodes, setTopoNodes] = useState<TopoNode[]>([]);
  const [topoLinks, setTopoLinks] = useState<TopoLink[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOff, setDragOff] = useState({ x: 0, y: 0 });
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const linkingFromRef = useRef<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeMenu, setNodeMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [linkDeviceOpen, setLinkDeviceOpen] = useState<string | null>(null);
  const [editRemarkId, setEditRemarkId] = useState<string | null>(null);
  const [editRemarkValue, setEditRemarkValue] = useState('');

  const apiBase = typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (window.__NETVIEWONE_API_BASE__ || 'http://localhost:8090') : '';

  // ==================== DrawIO Import/Export ====================
  const DRAWIO_STYLE_MAP: Record<string, string> = {
    'internet': 'shape=cloud;whiteSpace=wrap;html=1;',
    'firewall': 'shape=mxgraph.cisco.firewall;whiteSpace=wrap;html=1;',
    'router': 'shape=mxgraph.cisco.router;whiteSpace=wrap;html=1;',
    'core-switch': 'shape=mxgraph.cisco.layer_3_switch;whiteSpace=wrap;html=1;',
    'aggregation-switch': 'shape=mxgraph.cisco.workgroup_switch;whiteSpace=wrap;html=1;',
    'access-switch': 'shape=mxgraph.cisco.workgroup_switch;whiteSpace=wrap;html=1;',
    'ap': 'shape=mxgraph.cisco.wireless_access_point;whiteSpace=wrap;html=1;',
    'fortress': 'shape=mxgraph.cisco.security_management;whiteSpace=wrap;html=1;',
    'vpn': 'shape=mxgraph.cisco.vpn_concentrator;whiteSpace=wrap;html=1;',
    'waf': 'shape=mxgraph.cisco.firewall;whiteSpace=wrap;html=1;',
    'behavior-manager': 'shape=mxgraph.cisco.content_engine;whiteSpace=wrap;html=1;',
  };

  const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const exportDrawIO = () => {
    const nodeW = 80, nodeH = 56;
    let cells = '';
    topoNodes.forEach((n, i) => {
      const style = DRAWIO_STYLE_MAP[n.type] || 'rounded=1;whiteSpace=wrap;html=1;';
      const label = n.name + (n.label ? `\\n${n.label}` : '');
      cells += `        <mxCell id="${escapeXml(n.id)}" value="${escapeXml(label)}" style="${style}" vertex="1" parent="1">\n`;
      cells += `          <mxGeometry x="${n.x}" y="${n.y}" width="${nodeW}" height="${nodeH}" as="geometry" />\n`;
      cells += `        </mxCell>\n`;
    });
    topoLinks.forEach(l => {
      const style = 'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#3b82f6;';
      cells += `        <mxCell id="${escapeXml(l.id)}" value="${escapeXml(l.label || '')}" style="${style}" edge="1" source="${escapeXml(l.from)}" target="${escapeXml(l.to)}" parent="1">\n`;
      cells += `          <mxGeometry relative="1" as="geometry" />\n`;
      cells += `        </mxCell>\n`;
    });
    const xml = `<mxfile host="NetviewOne" modified="2026-07-31T00:00:00.000Z" agent="NetviewOne" version="1.0" type="device">
  <diagram id="netviewone-topology" name="网络拓扑">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1200" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${cells}      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'netviewone-topology.drawio'; a.click();
    URL.revokeObjectURL(url);
  };

  const importDrawIO = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.drawio,.xml';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'text/xml');
          const cells = doc.querySelectorAll('mxCell');
          const newNodes: TopoNode[] = [];
          const newLinks: TopoLink[] = [];
          const cellMap: Record<string, string> = {}; // id -> type
          cells.forEach(cell => {
            const id = cell.getAttribute('id') || '';
            if (id === '0' || id === '1') return;
            const vertex = cell.getAttribute('vertex');
            const edge = cell.getAttribute('edge');
            const value = cell.getAttribute('value') || '';
            const style = cell.getAttribute('style') || '';
            if (vertex === '1') {
              const geo = cell.querySelector('mxGeometry');
              const x = parseFloat(geo?.getAttribute('x') || '0');
              const y = parseFloat(geo?.getAttribute('y') || '0');
              // Detect type from style
              let type = 'core-switch';
              for (const [k, v] of Object.entries(DRAWIO_STYLE_MAP)) {
                if (style.includes(v.split(';')[0])) { type = k; break; }
              }
              // Also try to detect from value keywords
              const nameMap: Record<string, string> = {
                '互联网': 'internet', '防火墙': 'firewall', '路由器': 'router',
                '核心交换': 'core-switch', '汇聚交换': 'aggregation-switch', '接入交换': 'access-switch',
                '无线': 'ap', '堡垒': 'fortress', 'VPN': 'vpn', 'WAF': 'waf', '行为管理': 'behavior-manager',
              };
              const nameLower = value.replace(/\\n/g, ' ').split('\n')[0].trim();
              for (const [kw, t] of Object.entries(nameMap)) {
                if (nameLower.includes(kw)) { type = t; break; }
              }
              const nodeId = id.startsWith('tn-') ? id : `tn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
              newNodes.push({ id: nodeId, type, name: nameLower, x: Math.round(x), y: Math.round(y) });
              cellMap[id] = nodeId;
            } else if (edge === '1') {
              const source = cell.getAttribute('source') || '';
              const target = cell.getAttribute('target') || '';
              const linkId = id.startsWith('tl-') ? id : `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
              if (source && target) {
                newLinks.push({ id: linkId, from: cellMap[source] || source, to: cellMap[target] || target, label: value || undefined });
              }
            }
          });
          // Replace all topology data
          setTopoNodes(newNodes);
          setTopoLinks(newLinks);
          // Persist: delete all existing then save new
          fetch(`${apiBase}/api/topology`).then(r => r.json()).then((items: any[]) => {
            Promise.all(items.map((item: any) => fetch(`${apiBase}/api/topology/${item.id}`, { method: 'DELETE' }).catch(() => {}))).then(() => {
              newNodes.forEach(n => saveNode(n));
              newLinks.forEach(l => saveLink(l));
            });
          });
        } catch (err) {
          alert('导入DrawIO文件失败: ' + (err as Error).message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Load topology from API
  useEffect(() => {
    fetch(`${apiBase}/api/topology`).then(r => r.json()).then((items: any[]) => {
      const nodes: TopoNode[] = [];
      const links: TopoLink[] = [];
      items.forEach(item => {
        if (item.nodeType === 'link') links.push(item as TopoLink);
        else nodes.push(item as TopoNode);
      });
      setTopoNodes(nodes);
      setTopoLinks(links);
    }).catch(() => {});
  }, [apiBase]);

  // Save helpers
  const saveNode = (node: TopoNode) => {
    fetch(`${apiBase}/api/topology`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(node) }).catch(() => {});
  };
  const saveLink = (link: TopoLink) => {
    const data = { ...link, nodeType: 'link' };
    fetch(`${apiBase}/api/topology`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(() => {});
  };
  const deleteNodeApi = (id: string) => {
    fetch(`${apiBase}/api/topology/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // Stats - SNMP only counts devices with SNMP enabled
  const pingUpCount = devices.filter(d => d.pingStatus === 'up').length;
  const pingDownCount = devices.filter(d => d.pingStatus === 'down').length;
  const snmpEnabledDevices = devices.filter(d => d.snmpEnabled);
  const snmpUpCount = snmpEnabledDevices.filter(d => d.snmpStatus === 'up').length;
  const snmpDownCount = snmpEnabledDevices.filter(d => d.snmpStatus === 'down').length;

  // Get device status by linkedDeviceId
  const getDeviceStatus = (node: TopoNode): { ping: 'up' | 'down'; snmp: 'up' | 'down' | 'disabled' } => {
    if (!node.linkedDeviceId) return { ping: 'down', snmp: 'disabled' };
    const dev = devices.find(d => d.id === node.linkedDeviceId);
    if (!dev) return { ping: 'down', snmp: 'disabled' };
    return { ping: dev.pingStatus, snmp: dev.snmpStatus };
  };

  // Drag: start
  // Node mouseDown — skip if in linking mode to avoid interfering with click
  const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (!editMode) return;
    if (linkingFromRef.current) return; // Don't start dragging when linking
    e.stopPropagation();
    const node = topoNodes.find(n => n.id === nodeId);
    if (!node) return;
    setDragging(nodeId);
    setSelectedNode(nodeId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOff({ x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y });
    }
  };

  // Drag: move
  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !editMode) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, e.clientX - rect.left - dragOff.x);
    const y = Math.max(0, e.clientY - rect.top - dragOff.y);
    setTopoNodes(prev => prev.map(n => n.id === dragging ? { ...n, x, y } : n));
  };

  // Drag: end
  const onCanvasMouseUp = () => {
    if (dragging && editMode) {
      const node = topoNodes.find(n => n.id === dragging);
      if (node) saveNode(node);
    }
    setDragging(null);
  };

  // Add node from palette
  const addNode = (type: string) => {
    const id = `tn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const x = 100 + Math.random() * 400;
    const y = 100 + Math.random() * 200;
    const label = TOPO_PALETTE.find(p => p.type === type)?.label || type;
    const node: TopoNode = { id, type, name: label, x: Math.round(x), y: Math.round(y) };
    setTopoNodes(prev => [...prev, node]);
    saveNode(node);
  };

  // Delete node + its links
  const deleteNode = (nodeId: string) => {
    setTopoNodes(prev => prev.filter(n => n.id !== nodeId));
    setTopoLinks(prev => {
      const removed = prev.filter(l => l.from !== nodeId && l.to !== nodeId);
      removed.forEach(l => saveLink(l));
      // delete the removed links from API
      prev.filter(l => l.from === nodeId || l.to === nodeId).forEach(l => deleteNodeApi(l.id));
      return removed;
    });
    deleteNodeApi(nodeId);
    setNodeMenu(null);
    setSelectedNode(null);
  };

  // Start linking
  const startLinking = (nodeId: string) => {
    setLinkingFrom(nodeId);
    linkingFromRef.current = nodeId;
    setNodeMenu(null);
  };

  // Complete linking
  const completeLink = (nodeId: string) => {
    const fromId = linkingFromRef.current;
    if (!fromId || fromId === nodeId) { setLinkingFrom(null); linkingFromRef.current = null; return; }
    // Check duplicate
    const exists = topoLinks.some(l => (l.from === fromId && l.to === nodeId) || (l.from === nodeId && l.to === fromId));
    if (exists) { setLinkingFrom(null); linkingFromRef.current = null; return; }
    const link: TopoLink = { id: `tl-${Date.now()}`, from: fromId, to: nodeId };
    setTopoLinks(prev => [...prev, link]);
    saveLink(link);
    setLinkingFrom(null);
    linkingFromRef.current = null;
  };

  const cancelLinking = () => {
    setLinkingFrom(null);
    linkingFromRef.current = null;
  };

  // Delete link
  const deleteLink = (linkId: string) => {
    setTopoLinks(prev => prev.filter(l => l.id !== linkId));
    deleteNodeApi(linkId);
  };

  // Canvas click: deselect or cancel linking
  const onCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('topo-canvas-bg')) {
      setSelectedNode(null);
      setNodeMenu(null);
      if (linkingFromRef.current) cancelLinking();
    }
  };

  // Node click (non-edit: navigate if linked)
  const onNodeClick = (nodeId: string) => {
    if (linkingFromRef.current) { completeLink(nodeId); return; }
    if (editMode) { setSelectedNode(nodeId); return; }
    const node = topoNodes.find(n => n.id === nodeId);
    if (node?.linkedDeviceId) onNavigateDevice(node.linkedDeviceId);
  };

  // Node right click
  const onNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    if (!editMode) return;
    setSelectedNode(nodeId);
    const rect = canvasRef.current?.getBoundingClientRect();
    setNodeMenu({ nodeId, x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) });
  };

  // Link device from device management
  const linkDevice = (nodeId: string, deviceId: string) => {
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return;
    const updated = topoNodes.map(n => n.id === nodeId ? { ...n, linkedDeviceId: deviceId, label: dev.ip, name: dev.name } : n);
    setTopoNodes(updated);
    const node = updated.find(n => n.id === nodeId);
    if (node) saveNode(node);
    setLinkDeviceOpen(null);
  };

  const unlinkDevice = (nodeId: string) => {
    const updated = topoNodes.map(n => n.id === nodeId ? { ...n, linkedDeviceId: undefined, label: undefined } : n);
    setTopoNodes(updated);
    const node = updated.find(n => n.id === nodeId);
    if (node) saveNode(node);
  };

  // SVG path for links
  const renderLinks = () => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
      {topoLinks.map(link => {
        const from = topoNodes.find(n => n.id === link.from);
        const to = topoNodes.find(n => n.id === link.to);
        if (!from || !to) return null;
        const toCx = to.x + 40, toCy = to.y + 28;
        const fromCx = from.x + 40, fromCy = from.y + 28;
        const p1 = calcEdgePoint(from, toCx, toCy);
        const p2 = calcEdgePoint(to, fromCx, fromCy);
        return (
          <g key={link.id}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="#3b82f6" strokeWidth="2" opacity="0.7" strokeDasharray={link.label ? "6 3" : "none"} />
            {/* Arrow head */}
            <polygon points={`${p2.x},${p2.y} ${p2.x - 8 * Math.cos(Math.atan2(p2.y - p1.y, p2.x - p1.x) - 0.3)},${p2.y - 8 * Math.sin(Math.atan2(p2.y - p1.y, p2.x - p1.x) - 0.3)} ${p2.x - 8 * Math.cos(Math.atan2(p2.y - p1.y, p2.x - p1.x) + 0.3)},${p2.y - 8 * Math.sin(Math.atan2(p2.y - p1.y, p2.x - p1.x) + 0.3)}`}
              fill="#3b82f6" opacity="0.7" />
            {link.label && (
              <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 6}
                textAnchor="middle" className="fill-muted-foreground text-[10px]" fontSize="10">{link.label}</text>
            )}
            {/* Click area for delete (invisible wider line) */}
            {editMode && (
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                strokeWidth="12" stroke="transparent" className="pointer-events-auto cursor-pointer"
                onClick={() => deleteLink(link.id)} />
            )}
          </g>
        );
      })}
      {/* Linking preview: dashed line from source node edge to mouse cursor */}
      {linkingFrom && (() => {
        const from = topoNodes.find(n => n.id === linkingFrom);
        if (!from) return null;
        const fromCx = from.x + 40, fromCy = from.y + 28;
        const p1 = calcEdgePoint(from, mousePos.x, mousePos.y);
        return (
          <g>
            <circle cx={fromCx} cy={fromCy} r="4" className="fill-primary animate-pulse" />
            <line x1={p1.x} y1={p1.y} x2={mousePos.x} y2={mousePos.y}
              stroke="#3b82f6" strokeWidth="2" opacity="0.5" strokeDasharray="8 4" />
            <circle cx={mousePos.x} cy={mousePos.y} r="4" fill="#3b82f6" opacity="0.5" />
          </g>
        );
      })()}
    </svg>
  );

  return (
    <div className="space-y-6 fade-in">
      {/* Stats bar */}
      <div className="grid grid-cols-5 gap-4">
        {[{ label: '设备总数', value: devices.length, icon: <Server className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10', filter: null },
          { label: 'PING正常', value: pingUpCount, icon: <Activity className="h-5 w-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', filter: null },
          { label: 'PING不通', value: pingDownCount, icon: <X className="h-5 w-5" />, color: 'text-red-400', bg: 'bg-red-500/10', filter: 'down' },
          { label: 'SNMP正常', value: snmpUpCount, icon: <Check className="h-5 w-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', filter: null },
          { label: 'SNMP异常', value: snmpDownCount, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10', filter: 'snmp-down' }
        ].map(s => (
          <Card key={s.label} className={`border-0 shadow-sm apple-card ${s.filter ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={() => s.filter && onNavigateDevices(s.filter)}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold mt-0.5 tracking-tight">{s.value}</p></div><div className={`p-2.5 rounded-xl ${s.bg} ${s.color}`}>{s.icon}</div></div></CardContent></Card>
        ))}
      </div>

      {/* A: Device Type Distribution + B: Floor Heatmap */}
      <div className="grid grid-cols-2 gap-4">
        {/* A: 设备类型分布饼图 */}
        <Card className="border-0 shadow-sm apple-card">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">设备类型分布</h3>
            {(() => {
              const typeCounts: Record<string, number> = {};
              devices.forEach(d => { typeCounts[d.type] = (typeCounts[d.type] || 0) + 1; });
              const entries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
              const total = devices.length;
              if (total === 0) return <p className="text-xs text-muted-foreground text-center py-8">暂无设备</p>;
              const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#6366f1','#14b8a6','#e11d48'];
              const cx = 100, cy = 100, r = 70, ir = 45;
              let angle = -90;
              const arcs = entries.map(([type, count], i) => {
                const pct = count / total;
                const sweep = pct * 360;
                const startAngle = angle;
                const endAngle = angle + sweep;
                const midAngle = startAngle + sweep / 2;
                const largeArc = sweep > 180 ? 1 : 0;
                const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
                const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
                const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
                const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
                const ix1 = cx + ir * Math.cos((endAngle * Math.PI) / 180);
                const iy1 = cy + ir * Math.sin((endAngle * Math.PI) / 180);
                const ix2 = cx + ir * Math.cos((startAngle * Math.PI) / 180);
                const iy2 = cy + ir * Math.sin((startAngle * Math.PI) / 180);
                const path = `M${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} L${ix1},${iy1} A${ir},${ir} 0 ${largeArc} 0 ${ix2},${iy2} Z`;
                angle = endAngle;
                return { type, count, pct, path, color: COLORS[i % COLORS.length], midAngle };
              });
              return (
                <div className="flex items-center gap-6">
                  <svg viewBox="0 0 200 200" className="w-36 h-36 flex-shrink-0">
                    {arcs.map((a, i) => (
                      <path key={i} d={a.path} fill={a.color} stroke="white" strokeWidth="1.5" className="transition-opacity hover:opacity-80 cursor-pointer" />
                    ))}
                    <text x={cx} y={cy - 6} textAnchor="middle" className="text-[18px] font-bold fill-foreground">{total}</text>
                    <text x={cx} y={cy + 12} textAnchor="middle" className="text-[9px] fill-muted-foreground">设备总数</text>
                  </svg>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {arcs.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                        <span className="truncate flex-1">{DEVICE_TYPES[a.type] || a.type}</span>
                        <span className="font-semibold tabular-nums">{a.count}</span>
                        <span className="text-muted-foreground tabular-nums w-10 text-right">{(a.pct * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* B: 楼层分布热力图 */}
        <Card className="border-0 shadow-sm apple-card">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">楼层分布</h3>
            {(() => {
              const floorCounts: Record<string, number> = {};
              FLOORS.forEach(f => { floorCounts[f] = 0; });
              devices.forEach(d => { if (d.floor) floorCounts[d.floor] = (floorCounts[d.floor] || 0) + 1; });
              const maxCount = Math.max(...Object.values(floorCounts), 1);
              return (
                <div className="grid grid-cols-8 gap-1.5">
                  {FLOORS.map(floor => {
                    const count = floorCounts[floor];
                    const intensity = count / maxCount;
                    const bg = count === 0 ? 'bg-muted/30' : intensity > 0.7 ? 'bg-primary' : intensity > 0.4 ? 'bg-primary/70' : 'bg-primary/40';
                    const text = count === 0 ? 'text-muted-foreground/50' : intensity > 0.7 ? 'text-primary-foreground' : 'text-foreground';
                    return (
                      <div key={floor} title={`${floor}：${count} 台设备`}
                        className={`flex flex-col items-center justify-center rounded-lg py-2 px-1 ${bg} transition-colors hover:opacity-80 cursor-default`}>
                        <span className={`text-[10px] font-medium ${text}`}>{floor}</span>
                        <span className={`text-xs font-bold tabular-nums mt-0.5 ${text}`}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Topology */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><EthernetPort className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold tracking-tight">网络拓扑</h2>
            {linkingFrom && <Badge variant="outline" className="text-xs text-primary border-primary/30 ml-2 animate-pulse">🔗 连线模式：点击目标节点完成连线 | 点击空白取消</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {editMode && (
              <>
                <Button variant="outline" size="sm" className="rounded-lg text-xs h-7" onClick={exportDrawIO}>
                  <FileDown className="h-3 w-3 mr-1" />导出DrawIO
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg text-xs h-7" onClick={importDrawIO}>
                  <FileUp className="h-3 w-3 mr-1" />导入DrawIO
                </Button>
              </>
            )}
            <Button variant={editMode ? 'default' : 'outline'} size="sm" className="rounded-lg text-xs h-7" onClick={() => setEditMode(!editMode)}>
              {editMode ? <><Check className="h-3 w-3 mr-1" />完成编辑</> : <><Pencil className="h-3 w-3 mr-1" />编辑拓扑</>}
            </Button>
          </div>
        </div>

        {/* Edit mode: palette */}
        {editMode && (
          <div className="flex flex-wrap gap-2">
            {TOPO_PALETTE.map(p => {
              const ic = TOPO_ICONS[p.type];
              return (
                <button key={p.type} onClick={() => addNode(p.type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/60 transition-colors text-xs font-medium">
                  <span className={`${ic?.color || 'text-foreground'}`}>{ic?.icon || <Server className="h-4 w-4" />}</span>
                  {p.label}
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}

        {/* Canvas */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div ref={canvasRef}
              className={`topo-canvas-bg relative w-full bg-muted/20 select-none ${editMode ? 'cursor-crosshair' : 'cursor-default'}`}
              style={{ height: Math.max(480, ...topoNodes.map(n => n.y + 100)), minHeight: 480 }}
              onMouseMove={e => {
                onCanvasMouseMove(e);
                if (linkingFromRef.current) {
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                }
              }}
              onMouseUp={onCanvasMouseUp}
              onClick={onCanvasClick}
            >
              {/* Grid pattern */}
              <div className="absolute inset-0 opacity-[0.04]" style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }} />

              {/* Links SVG */}
              {renderLinks()}

              {/* Nodes */}
              {topoNodes.map(node => {
                const ic = TOPO_ICONS[node.type];
                const status = getDeviceStatus(node);
                const isSelected = selectedNode === node.id;
                const isLinkingTarget = linkingFrom === node.id;
                const hasLinked = !!node.linkedDeviceId;
                return (
                  <div key={node.id}
                    className={`absolute flex flex-col items-center gap-1 transition-shadow ${linkingFrom ? 'cursor-pointer' : editMode ? 'cursor-grab' : 'cursor-pointer'} ${isSelected ? 'z-20' : 'z-10'}`}
                    style={{ left: node.x, top: node.y, width: 80 }}
                    onMouseDown={e => onNodeMouseDown(e, node.id)}
                    onClick={() => onNodeClick(node.id)}
                    onContextMenu={e => onNodeContextMenu(e, node.id)}
                  >
                    {/* Icon box */}
                    <div className={`relative flex items-center justify-center w-14 h-14 rounded-2xl border-2 transition-all
                      ${ic?.bg || 'bg-muted/30'} ${isSelected ? 'border-primary shadow-lg shadow-primary/20' : 'border-transparent hover:border-border'}
                      ${isLinkingTarget ? 'ring-2 ring-primary ring-offset-2' : ''}
                      ${linkingFrom && !isLinkingTarget ? 'hover:border-primary hover:shadow-md hover:shadow-primary/20' : ''}
                      ${!hasLinked && node.type !== 'internet' ? 'opacity-70' : ''}`}
                    >
                      <span className={ic?.color || 'text-foreground'}>{ic?.icon || <Server className="h-6 w-6" />}</span>
                      {/* Status indicator */}
                      {hasLinked && (
                        <span className={`absolute -top-1 -right-1 flex h-3.5 w-3.5`}>
                          {status.ping === 'up' && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50 animate-ping" />}
                          <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-card ${status.ping === 'up' ? 'bg-emerald-400' : status.ping === 'down' ? 'bg-red-400' : 'bg-muted-foreground/40'}`} />
                        </span>
                      )}
                      {!hasLinked && node.type !== 'internet' && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-muted-foreground/30 border-2 border-card" />
                        </span>
                      )}
                    </div>
                    {/* Name */}
                    <span className="text-[11px] font-medium text-center leading-tight max-w-[80px] truncate"
                      onDoubleClick={() => { if (editMode) { setEditRemarkId(node.id); setEditRemarkValue(node.name); } }}
                      title={editMode ? '双击编辑备注' : node.name}
                    >{node.name}</span>
                    {/* Label (IP) */}
                    {node.label && <span className="text-[10px] text-muted-foreground font-mono">{node.label}</span>}
                  </div>
                );
              })}

              {/* Node context menu */}
              {nodeMenu && editMode && (
                <div className="absolute z-50 bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[160px]"
                  style={{ left: nodeMenu.x + 10, top: nodeMenu.y + 10 }}
                  onClick={e => e.stopPropagation()}
                >
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                    onClick={() => { const n = topoNodes.find(nn => nn.id === nodeMenu.nodeId); setEditRemarkId(nodeMenu.nodeId); setEditRemarkValue(n?.name || ''); setNodeMenu(null); }}>
                    <Pencil className="h-3.5 w-3.5" />编辑备注
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                    onClick={() => { startLinking(nodeMenu.nodeId); setNodeMenu(null); }}>
                    <Link2 className="h-3.5 w-3.5" />连线到...
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                    onClick={() => { setLinkDeviceOpen(nodeMenu.nodeId); setNodeMenu(null); }}>
                    <Plug className="h-3.5 w-3.5" />关联设备管理
                  </button>
                  {topoNodes.find(n => n.id === nodeMenu.nodeId)?.linkedDeviceId && (
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                      onClick={() => { unlinkDevice(nodeMenu.nodeId); setNodeMenu(null); }}>
                      <Unplug className="h-3.5 w-3.5" />取消关联
                    </button>
                  )}
                  <Separator />
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    onClick={() => deleteNode(nodeMenu.nodeId)}>
                    <Trash2 className="h-3.5 w-3.5" />删除节点
                  </button>
                </div>
              )}

              {/* Link device dialog */}
              {linkDeviceOpen && (
                <Dialog open onOpenChange={() => setLinkDeviceOpen(null)}>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>关联设备管理</DialogTitle></DialogHeader>
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {devices.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">设备管理中暂无设备</p>}
                      {devices.map(dev => (
                        <button key={dev.id}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-sm"
                          onClick={() => linkDevice(linkDeviceOpen, dev.id)}>
                          <div className="flex items-center gap-2">
                            <StatusDot status={dev.pingStatus} />
                            <span className="font-medium">{dev.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{dev.ip}</span>
                        </button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Edit remark dialog */}
              {editRemarkId && (
                <Dialog open onOpenChange={() => setEditRemarkId(null)}>
                  <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>编辑备注</DialogTitle></DialogHeader>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={editRemarkValue}
                      onChange={e => setEditRemarkValue(e.target.value)}
                      placeholder="输入备注名称"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setTopoNodes(prev => prev.map(n => n.id === editRemarkId ? { ...n, name: editRemarkValue } : n));
                          const node = topoNodes.find(n => n.id === editRemarkId);
                          if (node) saveNode({ ...node, name: editRemarkValue });
                          setEditRemarkId(null);
                        }
                        if (e.key === 'Escape') setEditRemarkId(null);
                      }}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button className="px-4 py-1.5 rounded-lg text-sm hover:bg-muted/60 transition-colors"
                        onClick={() => setEditRemarkId(null)}>取消</button>
                      <button className="px-4 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        onClick={() => {
                          setTopoNodes(prev => prev.map(n => n.id === editRemarkId ? { ...n, name: editRemarkValue } : n));
                          const node = topoNodes.find(n => n.id === editRemarkId);
                          if (node) saveNode({ ...node, name: editRemarkValue });
                          setEditRemarkId(null);
                        }}>保存</button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Empty state */}
              {topoNodes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <EthernetPort className="h-12 w-12 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">点击「编辑拓扑」添加设备节点</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Link list in edit mode */}
        {editMode && topoLinks.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">连线列表（点击删除）</p>
            <div className="flex flex-wrap gap-2">
              {topoLinks.map(link => {
                const from = topoNodes.find(n => n.id === link.from);
                const to = topoNodes.find(n => n.id === link.to);
                return (
                  <button key={link.id} onClick={() => deleteLink(link.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 hover:bg-red-500/10 text-xs text-muted-foreground hover:text-red-400 transition-colors">
                    <Link2 className="h-3 w-3" />
                    {from?.name || '?'} → {to?.name || '?'}
                    <X className="h-3 w-3" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* C: 最近告警时间线 */}
      <Card className="border-0 shadow-sm apple-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold">最近告警</h3>
            </div>
            {alertRecords.length > 0 && (
              <button className="text-xs text-primary hover:underline" onClick={onNavigateAlerts}>查看全部 →</button>
            )}
          </div>
          {alertRecords.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">暂无告警记录</p>
          ) : (
            <div className="space-y-0">
              {alertRecords
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                .slice(0, 10)
                .map((record, i) => {
                  const sevMap: Record<string, { label: string; dot: string; bg: string }> = {
                    critical: { label: '严重', dot: 'bg-red-500', bg: 'bg-red-500/10 text-red-400' },
                    major: { label: '重要', dot: 'bg-amber-500', bg: 'bg-amber-500/10 text-amber-400' },
                    minor: { label: '次要', dot: 'bg-blue-400', bg: 'bg-blue-500/10 text-blue-400' },
                    info: { label: '提示', dot: 'bg-muted-foreground', bg: 'bg-muted/30 text-muted-foreground' },
                  };
                  const sev = sevMap[record.severity] || sevMap.info;
                  const isLast = i === Math.min(alertRecords.length, 10) - 1;
                  return (
                    <div key={record.id} className="flex gap-3">
                      <div className="flex flex-col items-center w-4 flex-shrink-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${sev.dot} flex-shrink-0 mt-1.5`} />
                        {!isLast && <span className="w-px flex-1 bg-border" />}
                      </div>
                      <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sev.bg}`}>{sev.label}</span>
                          <span className="text-sm font-medium truncate">{record.ruleName || record.message}</span>
                          {record.status === 'firing' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{record.deviceName}</span>
                          <span>{record.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== DEVICES PAGE ====================
function DevicesPage({ devices, onAddDevice, onEditDevice, onDeleteDevice, onNavigateDevice, onNavigateMonitorItems, groups, initialStatusFilter }: {
  devices: Device[]; onAddDevice: (d: Device) => void; onEditDevice: (d: Device) => void; onDeleteDevice: (id: string) => void; onNavigateDevice: (id: string) => void; onNavigateMonitorItems: (id: string) => void; groups: DeviceGroup[]; initialStatusFilter?: string;
}) {
  const [probingIds, setProbingIds] = useState<Set<string>>(new Set());
  const API_BASE = typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (window.__NETVIEWONE_API_BASE__ || 'http://localhost:8090') : '';

  const probePing = (device: Device) => {
    const key = `ping-${device.id}`;
    setProbingIds(prev => new Set(prev).add(key));
    fetch(`${API_BASE}/api/ping-probe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host: device.ip }) })
      .then(r => r.json()).then(res => { onEditDevice({ ...device, pingStatus: res.up ? 'up' : 'down' }); })
      .catch(() => { onEditDevice({ ...device, pingStatus: 'down' }); })
      .finally(() => { setProbingIds(prev => { const s = new Set(prev); s.delete(key); return s; }); });
  };
  const probeSnmp = (device: Device) => {
    if (!device.snmpEnabled) return;
    const key = `snmp-${device.id}`;
    setProbingIds(prev => new Set(prev).add(key));
    fetch(`${API_BASE}/api/snmp-probe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host: device.ip, community: device.snmpCommunity || 'public', version: device.snmpVersion || 'v2c', port: device.snmpPort || 161 }) })
      .then(r => r.json()).then(res => { onEditDevice({ ...device, snmpStatus: res.up ? 'up' : 'down' }); })
      .catch(() => { onEditDevice({ ...device, snmpStatus: 'down' }); })
      .finally(() => { setProbingIds(prev => { const s = new Set(prev); s.delete(key); return s; }); });
  };

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || 'all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'access-switch', brand: '', model: '', ip: '', floor: '辅楼1F', room: '楼层弱电间', sshPort: '22', sshUsername: '', sshPassword: '', groupsStr: '', tagsStr: '', snmpEnabled: false, snmpVersion: 'v2c', snmpCommunity: 'public', snmpPort: '161', snmpInterval: '60' });

  const allTags = [...new Set(devices.flatMap(d => d.tags || []))];
  const filtered = devices.filter(d => {
    const ms = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.ip.includes(search);
    const mt = typeFilter === 'all' || d.type === typeFilter;
    let mst = true;
    if (statusFilter === 'up') mst = d.pingStatus === 'up';
    else if (statusFilter === 'down') mst = d.pingStatus === 'down';
    else if (statusFilter === 'snmp-down') mst = d.snmpEnabled && d.snmpStatus === 'down';
    const mg = groupFilter === 'all' || (d.groups || []).includes(groupFilter);
    return ms && mt && mst && mg;
  });

  const resetForm = () => setFormData({ name: '', type: 'access-switch', brand: '', model: '', ip: '', floor: '辅楼1F', room: '楼层弱电间', sshPort: '22', sshUsername: '', sshPassword: '', groupsStr: '', tagsStr: '', snmpEnabled: false, snmpVersion: 'v2c', snmpCommunity: 'public', snmpPort: '161', snmpInterval: '60' });
  const handleAdd = () => {
    const d: Device = {
      id: `dev-${Date.now()}`, name: formData.name, type: formData.type as Device['type'], brand: formData.brand, model: formData.model, ip: formData.ip,
      location: formData.room, floor: formData.floor, room: formData.room, pingStatus: 'down', snmpStatus: 'disabled', uptime: '—', cpu: 0, memory: 0, fanStatus: 'normal',
      sshPort: parseInt(formData.sshPort) || 22, sshUsername: formData.sshUsername, sshPassword: formData.sshPassword, lastSync: '从未', ports: [],
      groups: formData.groupsStr ? formData.groupsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
      tags: formData.tagsStr ? formData.tagsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
      snmpEnabled: formData.snmpEnabled, snmpVersion: formData.snmpVersion as Device['snmpVersion'], snmpCommunity: formData.snmpCommunity, snmpPort: parseInt(formData.snmpPort) || 161, snmpInterval: parseInt(formData.snmpInterval) || 60,
    };
    onAddDevice(d); setAddOpen(false); resetForm();
  };
  const openEdit = (device: Device) => {
    setFormData({ name: device.name, type: device.type, brand: device.brand, model: device.model, ip: device.ip, floor: device.floor, room: device.room, sshPort: String(device.sshPort), sshUsername: device.sshUsername || '', sshPassword: device.sshPassword || '', groupsStr: (device.groups || []).join(', '), tagsStr: (device.tags || []).join(', '), snmpEnabled: !!device.snmpEnabled, snmpVersion: device.snmpVersion || 'v2c', snmpCommunity: device.snmpCommunity || 'public', snmpPort: String(device.snmpPort || 161), snmpInterval: String(device.snmpInterval || 60) });
    setEditDevice(device);
  };
  const handleEdit = () => {
    if (!editDevice) return;
    onEditDevice({ ...editDevice, name: formData.name, type: formData.type as Device['type'], brand: formData.brand, model: formData.model, ip: formData.ip, floor: formData.floor, room: formData.room, location: formData.room, sshPort: parseInt(formData.sshPort) || 22, sshUsername: formData.sshUsername, sshPassword: formData.sshPassword, groups: formData.groupsStr ? formData.groupsStr.split(',').map(s => s.trim()).filter(Boolean) : [], tags: formData.tagsStr ? formData.tagsStr.split(',').map(s => s.trim()).filter(Boolean) : [], snmpEnabled: formData.snmpEnabled, snmpVersion: formData.snmpVersion as Device['snmpVersion'], snmpCommunity: formData.snmpCommunity, snmpPort: parseInt(formData.snmpPort) || 161, snmpInterval: parseInt(formData.snmpInterval) || 60 });
    setEditDevice(null); resetForm();
  };

  const f = formData;
  const sf = (k: string, v: string) => setFormData(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">设备管理</h1><p className="text-sm text-muted-foreground mt-1">管理所有网络设备台账信息</p></div>
        <Button className="gap-2 rounded-xl" onClick={() => { resetForm(); setAddOpen(true); }}><Plus className="h-4 w-4" />新增设备</Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索设备名称或IP..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="设备类型" /></SelectTrigger><SelectContent><SelectItem value="all">全部类型</SelectItem>{Object.entries(DEVICE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[130px] rounded-xl"><SelectValue placeholder="状态" /></SelectTrigger><SelectContent><SelectItem value="all">全部状态</SelectItem><SelectItem value="up">PING通</SelectItem><SelectItem value="down">PING不通</SelectItem><SelectItem value="snmp-down">SNMP异常</SelectItem></SelectContent></Select>
        {groups.length > 0 && <Select value={groupFilter} onValueChange={setGroupFilter}><SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="分组" /></SelectTrigger><SelectContent><SelectItem value="all">全部分组</SelectItem>{groups.map(g => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}</SelectContent></Select>}
        <span className="text-sm text-muted-foreground ml-2">{filtered.length} 台设备</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground"><Server className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" /><p>暂无设备，请点击「新增设备」添加</p></div>
      ) : (
        <Card className="border-0 shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-border"><th className="text-left p-4 font-medium text-muted-foreground">PING</th><th className="text-left p-4 font-medium text-muted-foreground">SNMP</th><th className="text-left p-4 font-medium text-muted-foreground">设备名称</th><th className="text-left p-4 font-medium text-muted-foreground">类型</th><th className="text-left p-4 font-medium text-muted-foreground">品牌/型号</th><th className="text-left p-4 font-medium text-muted-foreground">管理IP</th><th className="text-left p-4 font-medium text-muted-foreground">标签</th><th className="text-left p-4 font-medium text-muted-foreground">SNMP</th><th className="text-left p-4 font-medium text-muted-foreground">监控项</th><th className="text-right p-4 font-medium text-muted-foreground">操作</th></tr></thead>
          <tbody>{filtered.map(device => (
            <tr key={device.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onNavigateDevice(device.id)}>
              <td className="p-4"><button title="点击探测PING" className="inline-flex" onClick={e => { e.stopPropagation(); probePing(device); }}><span className={`relative flex h-2.5 w-2.5 transition-transform hover:scale-150 ${probingIds.has(`ping-${device.id}`) ? 'animate-pulse' : ''}`}><StatusDot status={device.pingStatus} /></span></button></td><td className="p-4"><button title="点击探测SNMP" className={`inline-flex ${!device.snmpEnabled ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={e => { e.stopPropagation(); if (device.snmpEnabled) probeSnmp(device); }} disabled={!device.snmpEnabled}><span className={`relative flex h-2.5 w-2.5 transition-transform ${device.snmpEnabled ? 'hover:scale-150' : ''} ${probingIds.has(`snmp-${device.id}`) ? 'animate-pulse' : ''}`}><StatusDot status={device.snmpStatus} /></span></button></td>
              <td className="p-4 font-medium">{device.name}</td>
              <td className="p-4 text-muted-foreground">{DEVICE_TYPES[device.type]}</td>
              <td className="p-4 text-muted-foreground">{device.brand} {device.model}</td>
              <td className="p-4 font-mono text-xs">{device.ip}</td>
              <td className="p-4"><div className="flex gap-1 flex-wrap">{(device.tags || []).map(t => <Badge key={t} variant="secondary" className="text-[10px] h-5">{t}</Badge>)}</div></td>
              <td className="p-4"><div className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${device.snmpEnabled ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} /><span className={`text-xs ${device.snmpEnabled ? 'text-emerald-400' : 'text-muted-foreground'}`}>{device.snmpEnabled ? '已启用' : '未启用'}</span></div></td>
              <td className="p-4"><button className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" onClick={e => { e.stopPropagation(); onNavigateMonitorItems(device.id); }}><Activity className="h-3 w-3" />监控项</button></td>
              <td className="p-4 text-right"><div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(device)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500" onClick={() => onDeleteDevice(device.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
            </tr>
          ))}</tbody>
        </table></div></Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen || !!editDevice} onOpenChange={v => { if (!v) { setAddOpen(false); setEditDevice(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editDevice ? '编辑设备' : '新增设备'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            {[{ l: '设备名称', k: 'name', p: '如 ACC-SW-9F-01' }, { l: '品牌', k: 'brand', p: '如 华为' }, { l: '型号', k: 'model', p: '如 S5700S' }, { l: '管理IP', k: 'ip', p: '如 10.0.10.1' }, { l: 'SSH端口', k: 'sshPort', p: '22' }, { l: 'SSH账号', k: 'sshUsername', p: '如 admin 或 omaccount' }, { l: '标签(逗号分隔)', k: 'tagsStr', p: '如 生产, 核心' }].map(i => (
              <div key={i.k} className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">{i.l}</label><Input className="col-span-3" placeholder={i.p} value={f[i.k as keyof typeof f] as string} onChange={e => sf(i.k, e.target.value)} /></div>
            ))}
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">SSH密码</label><Input className="col-span-3" type="password" placeholder="SSH登录密码" value={f.sshPassword} onChange={e => sf('sshPassword', e.target.value)} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">设备类型</label><Select value={f.type} onValueChange={v => sf('type', v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(DEVICE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">楼层</label><Select value={f.floor} onValueChange={v => sf('floor', v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent>{FLOORS.map(fl => <SelectItem key={fl} value={fl}>{fl}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">位置</label><Select value={f.room} onValueChange={v => sf('room', v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent>{ROOMS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>

            <Separator className="my-2" />
            <p className="text-sm font-medium text-muted-foreground">SNMP 采集配置</p>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">启用SNMP</label><button className={`col-span-3 flex items-center gap-2 text-sm ${f.snmpEnabled ? 'text-emerald-400' : 'text-muted-foreground'}`} onClick={() => setFormData(p => ({ ...p, snmpEnabled: !p.snmpEnabled }))}>{f.snmpEnabled ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}{f.snmpEnabled ? '已启用' : '已禁用'}</button></div>
            {f.snmpEnabled && (<>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">SNMP版本</label><Select value={f.snmpVersion} onValueChange={v => sf('snmpVersion', v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="v1">v1</SelectItem><SelectItem value="v2c">v2c</SelectItem><SelectItem value="v3">v3</SelectItem></SelectContent></Select></div>
              {f.snmpVersion !== 'v3' && <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">Community</label><Input className="col-span-3 font-mono" value={f.snmpCommunity} onChange={e => sf('snmpCommunity', e.target.value)} /></div>}
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">SNMP端口</label><Input className="col-span-3" type="number" value={f.snmpPort} onChange={e => sf('snmpPort', e.target.value)} /></div>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">采集间隔(秒)</label><Input className="col-span-3" type="number" value={f.snmpInterval} onChange={e => sf('snmpInterval', e.target.value)} /></div>
            </>)}
          </div>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => { setAddOpen(false); setEditDevice(null); resetForm(); }}>取消</Button><Button onClick={editDevice ? handleEdit : handleAdd}>{editDevice ? '保存修改' : '确认新增'}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== MONITOR ITEMS PAGE (Zabbix-style) ====================
function MonitorItemsPage({ devices, deviceId, onBack, templates }: { devices: Device[]; deviceId: string; onBack: () => void; templates: OidTemplate[] }) {
  const device = devices.find(d => d.id === deviceId);
  const API_BASE = typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (window.__NETVIEWONE_API_BASE__ || 'http://localhost:8090') : '';
  const [items, setItems] = useState<MonitorItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<MonitorItem | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form state
  const defaultForm = { name: '', type: 'shell' as 'shell' | 'api' | 'snmp', key: '', interval: '60', enabled: true, valueType: 'float' as MonitorItem['valueType'], units: '', description: '', historyDays: '14', trendDays: '90', shellCommand: '', shellHost: device?.ip || '', shellPort: '22', shellUsername: device?.sshUsername || '', shellPassword: device?.sshPassword || '', apiUrl: '', apiMethod: 'GET' as 'GET' | 'POST', apiHeaders: '', apiBody: '', apiExpectedStatus: '200', snmpOid: '', snmpCommunity: device?.snmpCommunity || 'public', snmpVersion: device?.snmpVersion || 'v2c', snmpPort: String(device?.snmpPort || 161) };
  const [form, setForm] = useState(defaultForm);
  const resetForm = () => setForm(defaultForm);
  const sf = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  // Template selector state for SNMP mode
  const [tplOpen, setTplOpen] = useState(false);

  // Apply template OID item to form
  const applyTemplateItem = (tpl: OidTemplate, cat: OidCategory, item: OidItem) => {
    const keyPrefix = `snmp.${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const generatedKey = `${keyPrefix}.${item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    sf('name', item.name);
    sf('key', generatedKey);
    sf('snmpOid', item.oid);
    if (item.unit) sf('units', item.unit);
    if (item.description) sf('description', item.description);
    setTplOpen(false);
  };

  // Execute now: immediately fetch latest data for a monitor item
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());
  const executeNow = (item: MonitorItem) => {
    if (item.type !== 'snmp') return;
    const oid = item.snmpOid || '';
    if (!oid) {
      const updated = { ...item, lastValue: '缺少SNMP OID', lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      return;
    }
    const host = device?.ip || item.shellHost || '';
    if (!host) {
      const updated = { ...item, lastValue: '缺少设备IP', lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      return;
    }
    const community = item.snmpCommunity || device?.snmpCommunity || 'public';
    const version = item.snmpVersion || device?.snmpVersion || 'v2c';
    const port = Number(item.snmpPort) || Number(device?.snmpPort) || 161;
    setExecutingIds(prev => new Set(prev).add(item.id));
    console.log('[executeNow] host=', host, 'oid=', oid, 'community=', community, 'port=', port, 'version=', version);
    fetch(`${API_BASE}/api/snmp-collect`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host, community, version, port,
        oids: [{ name: item.name, oid, method: 'get' }]
      })
    }).then(r => { console.log('[executeNow] HTTP status=', r.status); return r.json(); }).then(res => {
      console.log('[executeNow] response=', JSON.stringify(res).slice(0, 500));
      const result = res.results?.[0];
      if (result && result.value) {
        let raw = result.value;
        // Detect snmpget error responses
        if (/^(Error|Timeout|No Such|End of MIB)/i.test(raw.trim())) {
          const updated = { ...item, lastValue: '采集失败: ' + raw.trim().slice(0, 60), lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
          setItems(prev => prev.map(i => i.id === item.id ? updated : i));
          saveItem(updated);
          return;
        }
        const m = raw.match(/(?:STRING|INTEGER|Gauge32|Counter32|Counter64|Timeticks|Hex-STRING|IpAddress|OPAQUE|Counter|Gauge|Opaque):\s*(.+)/i);
        let parsed = m ? m[1].trim().replace(/^"|"$/g, '') : raw;
        const tm = parsed.match(/^\(\d+\)\s*(.+)/);
        if (tm) parsed = tm[1];
        console.log('[executeNow] parsed value=', parsed);
        const updated = { ...item, lastValue: parsed, lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'normal' as const };
        setItems(prev => prev.map(i => i.id === item.id ? updated : i));
        saveItem(updated);
      } else if (result && result.error) {
        const updated = { ...item, lastValue: '采集失败: ' + result.error, lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
        setItems(prev => prev.map(i => i.id === item.id ? updated : i));
        saveItem(updated);
      } else if (res.success === false || res.error) {
        const updated = { ...item, lastValue: '采集失败: ' + (res.error || '未知错误'), lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
        setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      } else {
        const updated = { ...item, lastValue: '无返回数据', lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
        setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      }
    }).catch(err => {
      console.error('[executeNow] fetch error=', err);
      const updated = { ...item, lastValue: '请求失败: ' + (err.message || String(err)).slice(0, 40), lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    }).finally(() => {
      setExecutingIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    });
  };

  // Load items from API
  useEffect(() => {
    fetch(`${API_BASE}/api/monitor-items?deviceId=${deviceId}`).then(r => r.json()).then((data: any[]) => {
      setItems(data.map(d => typeof d.data === 'string' ? JSON.parse(d.data) : (d.data && typeof d.data === 'object' ? d.data : d)).filter((d: MonitorItem) => d.deviceId === deviceId));
    }).catch(() => setItems([]));
  }, [API_BASE, deviceId]);

  const saveItem = (item: MonitorItem) => {
    fetch(`${API_BASE}/api/monitor-items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, data: JSON.stringify(item) }) }).catch(() => {});
  };
  const deleteItemApi = (id: string) => {
    fetch(`${API_BASE}/api/monitor-items/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleAdd = () => {
    const item: MonitorItem = {
      id: `mi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, deviceId, name: form.name, type: form.type, key: form.key,
      interval: parseInt(form.interval) || 60, enabled: form.enabled, valueType: form.valueType, units: form.units, description: form.description,
      historyDays: parseInt(form.historyDays) || 14, trendDays: parseInt(form.trendDays) || 90,
      shellCommand: form.type === 'shell' ? form.shellCommand : undefined, shellHost: form.type === 'shell' ? form.shellHost : undefined,
      shellPort: form.type === 'shell' ? parseInt(form.shellPort) || 22 : undefined, shellUsername: form.type === 'shell' ? form.shellUsername : undefined,
      shellPassword: form.type === 'shell' ? form.shellPassword : undefined,
      apiUrl: form.type === 'api' ? form.apiUrl : undefined, apiMethod: form.type === 'api' ? form.apiMethod : undefined,
      apiHeaders: form.type === 'api' ? form.apiHeaders : undefined, apiBody: form.type === 'api' ? form.apiBody : undefined,
      apiExpectedStatus: form.type === 'api' ? parseInt(form.apiExpectedStatus) || 200 : undefined,
      snmpOid: form.type === 'snmp' ? form.snmpOid : undefined, snmpCommunity: form.type === 'snmp' ? form.snmpCommunity : undefined,
      snmpVersion: form.type === 'snmp' ? (form.snmpVersion as MonitorItem['snmpVersion']) : undefined, snmpPort: form.type === 'snmp' ? parseInt(form.snmpPort) || 161 : undefined,
      status: 'normal',
    };
    setItems(prev => [...prev, item]);
    saveItem(item);
    setAddOpen(false);
    resetForm();
  };

  const handleEdit = () => {
    if (!editItem) return;
    const updated: MonitorItem = {
      ...editItem, name: form.name, type: form.type, key: form.key, interval: parseInt(form.interval) || 60, enabled: form.enabled,
      valueType: form.valueType, units: form.units, description: form.description, historyDays: parseInt(form.historyDays) || 14, trendDays: parseInt(form.trendDays) || 90,
      shellCommand: form.type === 'shell' ? form.shellCommand : undefined, shellHost: form.type === 'shell' ? form.shellHost : undefined,
      shellPort: form.type === 'shell' ? parseInt(form.shellPort) || 22 : undefined, shellUsername: form.type === 'shell' ? form.shellUsername : undefined,
      shellPassword: form.type === 'shell' ? form.shellPassword : undefined,
      apiUrl: form.type === 'api' ? form.apiUrl : undefined, apiMethod: form.type === 'api' ? form.apiMethod : undefined,
      apiHeaders: form.type === 'api' ? form.apiHeaders : undefined, apiBody: form.type === 'api' ? form.apiBody : undefined,
      apiExpectedStatus: form.type === 'api' ? parseInt(form.apiExpectedStatus) || 200 : undefined,
      snmpOid: form.type === 'snmp' ? form.snmpOid : undefined, snmpCommunity: form.type === 'snmp' ? form.snmpCommunity : undefined,
      snmpVersion: form.type === 'snmp' ? (form.snmpVersion as MonitorItem['snmpVersion']) : undefined, snmpPort: form.type === 'snmp' ? parseInt(form.snmpPort) || 161 : undefined,
    };
    setItems(prev => prev.map(i => i.id === editItem.id ? updated : i));
    saveItem(updated);
    setEditItem(null);
    resetForm();
  };

  const toggleEnabled = (item: MonitorItem) => {
    const updated = { ...item, enabled: !item.enabled };
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    saveItem(updated);
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    deleteItemApi(id);
  };

  const openEdit = (item: MonitorItem) => {
    setForm({
      name: item.name, type: item.type, key: item.key, interval: String(item.interval), enabled: item.enabled,
      valueType: item.valueType, units: item.units, description: item.description, historyDays: String(item.historyDays), trendDays: String(item.trendDays),
      shellCommand: item.shellCommand || '', shellHost: item.shellHost || device?.ip || '', shellPort: String(item.shellPort || 22),
      shellUsername: item.shellUsername || device?.sshUsername || '', shellPassword: item.shellPassword || device?.sshPassword || '',
      apiUrl: item.apiUrl || '', apiMethod: item.apiMethod || 'GET', apiHeaders: item.apiHeaders || '', apiBody: item.apiBody || '', apiExpectedStatus: String(item.apiExpectedStatus || 200),
      snmpOid: item.snmpOid || '', snmpCommunity: item.snmpCommunity || device?.snmpCommunity || 'public',
      snmpVersion: item.snmpVersion || device?.snmpVersion || 'v2c', snmpPort: String(item.snmpPort || device?.snmpPort || 161),
    });
    setEditItem(item);
  };

  const filtered = items.filter(i => {
    const mn = !filterName || i.name.toLowerCase().includes(filterName.toLowerCase()) || i.key.toLowerCase().includes(filterName.toLowerCase());
    const mt = filterType === 'all' || i.type === filterType;
    const ms = filterStatus === 'all' || (filterStatus === 'enabled' ? i.enabled : filterStatus === 'disabled' ? !i.enabled : i.status === 'error');
    return mn && mt && ms;
  });

  const enabledCount = items.filter(i => i.enabled).length;
  const TYPE_LABELS: Record<string, string> = { shell: 'Shell', api: 'API', snmp: 'SNMP' };
  const TYPE_COLORS: Record<string, string> = { shell: 'text-violet-400 bg-violet-500/10', api: 'text-sky-400 bg-sky-500/10', snmp: 'text-emerald-400 bg-emerald-500/10' };
  const VALUE_TYPE_LABELS: Record<string, string> = { float: '数值(浮点)', unsigned: '数值(整数)', char: '字符', text: '文本' };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}><ChevronRight className="h-4 w-4 rotate-180" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">监控项</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{device?.name || ''} ({device?.ip || ''}) — {items.length} 个监控项，{enabledCount} 个启用</p>
          </div>
        </div>
        <Button className="gap-2 rounded-xl" onClick={() => { resetForm(); setAddOpen(true); }}><Plus className="h-4 w-4" />创建监控项</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索名称或键值..." className="pl-9 rounded-xl" value={filterName} onChange={e => setFilterName(e.target.value)} /></div>
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-[120px] rounded-xl"><SelectValue placeholder="类型" /></SelectTrigger><SelectContent><SelectItem value="all">全部类型</SelectItem><SelectItem value="shell">Shell</SelectItem><SelectItem value="api">API</SelectItem><SelectItem value="snmp">SNMP</SelectItem></SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[120px] rounded-xl"><SelectValue placeholder="状态" /></SelectTrigger><SelectContent><SelectItem value="all">全部状态</SelectItem><SelectItem value="enabled">已启用</SelectItem><SelectItem value="disabled">已禁用</SelectItem><SelectItem value="error">异常</SelectItem></SelectContent></Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground">暂无监控项，请点击「创建监控项」添加</p></CardContent></Card>
      ) : (
        <Card className="border-0 shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left p-3 font-medium text-muted-foreground">状态</th>
            <th className="text-left p-3 font-medium text-muted-foreground">名称</th>
            <th className="text-left p-3 font-medium text-muted-foreground">监控模式</th>
            <th className="text-left p-3 font-medium text-muted-foreground">键值(Key)</th>
            <th className="text-left p-3 font-medium text-muted-foreground">信息类型</th>
            <th className="text-left p-3 font-medium text-muted-foreground">间隔</th>
            <th className="text-left p-3 font-medium text-muted-foreground">历史</th>
            <th className="text-left p-3 font-medium text-muted-foreground">趋势</th>
            <th className="text-left p-3 font-medium text-muted-foreground">最近值</th>
            <th className="text-right p-3 font-medium text-muted-foreground">操作</th>
          </tr></thead>
          <tbody>{filtered.map(item => (
            <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="p-3"><button onClick={() => toggleEnabled(item)} className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${item.enabled ? 'text-emerald-400' : 'text-red-400'}`}>
                <span className={`relative flex h-2 w-2`}><span className={`absolute inline-flex h-full w-full rounded-full ${item.enabled ? 'bg-emerald-400' : 'bg-red-400'} opacity-75 ${item.enabled ? 'animate-pulse' : ''}`} /><span className={`relative rounded-full h-2 w-2 ${item.enabled ? 'bg-emerald-400' : 'bg-red-400'}`} /></span>
                {item.enabled ? '已启用' : '已禁用'}</button></td>
              <td className="p-3 font-medium max-w-[200px] truncate">{item.name}</td>
              <td className="p-3"><Badge variant="outline" className={`text-[10px] h-5 ${TYPE_COLORS[item.type] || ''}`}>{TYPE_LABELS[item.type] || item.type}</Badge></td>
              <td className="p-3 font-mono text-xs text-muted-foreground max-w-[200px] truncate">{item.key}</td>
              <td className="p-3 text-xs text-muted-foreground">{VALUE_TYPE_LABELS[item.valueType] || item.valueType}</td>
              <td className="p-3 text-xs">{item.interval}s</td>
              <td className="p-3 text-xs text-muted-foreground">{item.historyDays}d</td>
              <td className="p-3 text-xs text-muted-foreground">{item.trendDays}d</td>
              <td className="p-3 text-xs font-mono max-w-[120px] truncate" title={item.lastValue ? `${item.lastValue}${item.units ? ' ' + item.units : ''}${item.status === 'error' ? '\n[采集异常]' : ''}` : '暂无数据'}><span className={item.status === 'error' ? 'text-red-400' : ''}>{item.lastValue || '—'}</span>{item.lastValue && item.units ? <span className="text-muted-foreground ml-0.5">{item.units}</span> : null}</td>
              <td className="p-3 text-right"><div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs gap-1 text-primary hover:text-primary/80" disabled={executingIds.has(item.id)} onClick={() => executeNow(item)}>{executingIds.has(item.id) ? <span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" /> : <Play className="h-3 w-3" />}立刻执行</Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-500" onClick={() => deleteItem(item.id)}><Trash2 className="h-3 w-3" /></Button>
              </div></td>
            </tr>
          ))}</tbody>
        </table></div></Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen || !!editItem} onOpenChange={v => { if (!v) { setAddOpen(false); setEditItem(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? '编辑监控项' : '创建监控项'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Basic fields */}
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">名称</label><Input className="col-span-3" placeholder="如 CPU使用率" value={form.name} onChange={e => sf('name', e.target.value)} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">监控模式</label><Select value={form.type} onValueChange={v => sf('type', v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="shell">Shell (SSH远程命令)</SelectItem><SelectItem value="api">API (HTTP接口)</SelectItem><SelectItem value="snmp">SNMP (SNMP OID)</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">键值(Key)</label><div className="col-span-3 flex items-center gap-2"><Input className="flex-1 font-mono" placeholder="如 system.cpu.util" value={form.key} onChange={e => sf('key', e.target.value)} />{form.type === 'snmp' && templates.length > 0 && <Button variant="outline" size="sm" className="rounded-xl gap-1 whitespace-nowrap" onClick={() => setTplOpen(!tplOpen)}><Database className="h-3 w-3" />从模板选择</Button>}</div></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">信息类型</label><Select value={form.valueType} onValueChange={v => sf('valueType', v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="float">数值(浮点)</SelectItem><SelectItem value="unsigned">数值(整数)</SelectItem><SelectItem value="char">字符</SelectItem><SelectItem value="text">文本</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">单位</label><Input className="col-span-3" placeholder="如 %, B, bps" value={form.units} onChange={e => sf('units', e.target.value)} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">采集间隔</label><div className="col-span-3 flex items-center gap-2"><Input className="w-32" type="number" value={form.interval} onChange={e => sf('interval', e.target.value)} /><span className="text-sm text-muted-foreground">秒</span></div></div>

            <Separator className="my-1" />

            {/* Type-specific fields */}
            {form.type === 'shell' && (<>
              <p className="text-sm font-medium text-muted-foreground">Shell 配置</p>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">命令</label><Input className="col-span-3 font-mono" placeholder="如 show cpu-usage" value={form.shellCommand} onChange={e => sf('shellCommand', e.target.value)} /></div>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">目标主机</label><Input className="col-span-3" placeholder="设备IP" value={form.shellHost} onChange={e => sf('shellHost', e.target.value)} /></div>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">SSH端口</label><Input className="col-span-3" value={form.shellPort} onChange={e => sf('shellPort', e.target.value)} /></div>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">用户名</label><Input className="col-span-3" value={form.shellUsername} onChange={e => sf('shellUsername', e.target.value)} /></div>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">密码</label><Input className="col-span-3" type="password" value={form.shellPassword} onChange={e => sf('shellPassword', e.target.value)} /></div>
            </>)}

            {form.type === 'api' && (<>
              <p className="text-sm font-medium text-muted-foreground">API 配置</p>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">请求URL</label><Input className="col-span-3 font-mono" placeholder="如 http://host/api/status" value={form.apiUrl} onChange={e => sf('apiUrl', e.target.value)} /></div>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">请求方法</label><Select value={form.apiMethod} onValueChange={v => sf('apiMethod', v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="GET">GET</SelectItem><SelectItem value="POST">POST</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">请求头</label><Input className="col-span-3 font-mono text-xs" placeholder='{"Authorization":"Bearer xxx"}' value={form.apiHeaders} onChange={e => sf('apiHeaders', e.target.value)} /></div>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">请求体</label><Input className="col-span-3 font-mono text-xs" placeholder="POST body (JSON)" value={form.apiBody} onChange={e => sf('apiBody', e.target.value)} /></div>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">期望状态码</label><Input className="col-span-3" value={form.apiExpectedStatus} onChange={e => sf('apiExpectedStatus', e.target.value)} /></div>
            </>)}

            {form.type === 'snmp' && (<>
              <p className="text-sm font-medium text-muted-foreground">SNMP 配置</p>
              {/* Template selector */}
              {tplOpen && templates.length > 0 && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-3 border border-border/50">
                  <div className="flex items-center justify-between"><p className="text-sm font-medium">从OID模板选择</p><Button variant="ghost" size="sm" className="h-6" onClick={() => setTplOpen(false)}>关闭</Button></div>
                  {templates.map(tpl => (
                    <div key={tpl.id}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">{tpl.name}</p>
                      <div className="space-y-2">
                        {tpl.categories.map((cat, ci) => (
                          <div key={ci}>
                            <p className="text-xs text-muted-foreground/70 mb-1">{cat.name}</p>
                            <div className="grid gap-1">
                              {cat.items.map((item, ii) => (
                                <button key={ii} className="flex items-center justify-between text-left px-3 py-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-xs group" onClick={() => applyTemplateItem(tpl, cat, item)}>
                                  <span className="font-medium">{item.name}</span>
                                  <span className="font-mono text-muted-foreground group-hover:text-primary/70 text-[10px] ml-2 truncate max-w-[260px]">{item.oid}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">SNMP OID</label><div className="col-span-3 flex items-center gap-2"><Input className="flex-1 font-mono" placeholder="如 1.3.6.1.2.1.1.3.0 (sysUpTime)" value={form.snmpOid} onChange={e => sf('snmpOid', e.target.value)} />{templates.length > 0 && <Button variant="ghost" size="sm" className="rounded-xl gap-1 whitespace-nowrap text-xs" onClick={() => setTplOpen(!tplOpen)}><Database className="h-3 w-3" />模板</Button>}</div></div>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">版本</label><Select value={form.snmpVersion} onValueChange={v => sf('snmpVersion', v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="v1">v1</SelectItem><SelectItem value="v2c">v2c</SelectItem><SelectItem value="v3">v3</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">Community</label><Input className="col-span-3 font-mono" value={form.snmpCommunity} onChange={e => sf('snmpCommunity', e.target.value)} /></div>
              <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">端口</label><Input className="col-span-3" value={form.snmpPort} onChange={e => sf('snmpPort', e.target.value)} /></div>
            </>)}

            <Separator className="my-1" />
            <p className="text-sm font-medium text-muted-foreground">数据保留</p>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">历史保留</label><div className="col-span-3 flex items-center gap-2"><Input className="w-32" type="number" value={form.historyDays} onChange={e => sf('historyDays', e.target.value)} /><span className="text-sm text-muted-foreground">天</span></div></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">趋势保留</label><div className="col-span-3 flex items-center gap-2"><Input className="w-32" type="number" value={form.trendDays} onChange={e => sf('trendDays', e.target.value)} /><span className="text-sm text-muted-foreground">天</span></div></div>

            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">描述</label><Input className="col-span-3" placeholder="监控项描述" value={form.description} onChange={e => sf('description', e.target.value)} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">启用</label><button className={`col-span-3 flex items-center gap-2 text-sm ${form.enabled ? 'text-emerald-400' : 'text-muted-foreground'}`} onClick={() => sf('enabled', !form.enabled)}>{form.enabled ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}{form.enabled ? '已启用' : '已禁用'}</button></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setAddOpen(false); setEditItem(null); resetForm(); }}>取消</Button><Button onClick={editItem ? handleEdit : handleAdd}>{editItem ? '保存' : '创建'}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== LATEST DATA PAGE ====================
function LatestDataPage({ devices }: { devices: Device[] }) {
  const API_BASE = typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (window.__NETVIEWONE_API_BASE__ || 'http://localhost:8090') : '';
  const [monitorItems, setMonitorItems] = useState<MonitorItem[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetch(`${API_BASE}/api/monitor-items`).then(r => r.json()).then((data: any[]) => {
      const items = data.map(d => typeof d.data === 'string' ? JSON.parse(d.data) : (d.data && typeof d.data === 'object' ? d.data : d)).filter((d: MonitorItem) => d.enabled);
      setMonitorItems(items);
    }).catch(() => setMonitorItems([]));
  }, [API_BASE]);

  // Group items by device
  const deviceMap = new Map<string, Device>();
  devices.forEach(d => deviceMap.set(d.id, d));

  // Build rows: device x items
  const rows: { device: Device; item: MonitorItem }[] = [];
  devices.forEach(dev => {
    const devItems = monitorItems.filter(i => i.deviceId === dev.id && i.enabled);
    if (devItems.length === 0) {
      rows.push({ device: dev, item: { id: '', deviceId: dev.id, name: '—', type: 'shell', key: '—', interval: 0, enabled: false, valueType: 'float', units: '', description: '', historyDays: 0, trendDays: 0 } });
    } else {
      devItems.forEach(item => rows.push({ device: dev, item }));
    }
  });

  const filtered = rows.filter(r => {
    const ms = !search || r.device.name.toLowerCase().includes(search.toLowerCase()) || r.device.ip.includes(search) || r.item.name.toLowerCase().includes(search.toLowerCase()) || r.item.key.toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter === 'all' || r.item.type === typeFilter;
    return ms && mt;
  });

  const TYPE_LABELS: Record<string, string> = { shell: 'Shell', api: 'API', snmp: 'SNMP' };
  const TYPE_COLORS: Record<string, string> = { shell: 'text-violet-400 bg-violet-500/10', api: 'text-sky-400 bg-sky-500/10', snmp: 'text-emerald-400 bg-emerald-500/10' };
  const VALUE_TYPE_LABELS: Record<string, string> = { float: '浮点', unsigned: '整数', char: '字符', text: '文本' };

  return (
    <div className="space-y-6 fade-in">
      <div><h1 className="text-2xl font-bold tracking-tight">最新数据</h1><p className="text-sm text-muted-foreground mt-1">所有设备最近一次的检测数据汇总</p></div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索设备、监控项..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[120px] rounded-xl"><SelectValue placeholder="类型" /></SelectTrigger><SelectContent><SelectItem value="all">全部类型</SelectItem><SelectItem value="shell">Shell</SelectItem><SelectItem value="api">API</SelectItem><SelectItem value="snmp">SNMP</SelectItem></SelectContent></Select>
        <span className="text-sm text-muted-foreground ml-2">{filtered.length} 条记录</span>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground">暂无检测数据，请先在设备监控项中创建监控项</p></CardContent></Card>
      ) : (
        <Card className="border-0 shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left p-3 font-medium text-muted-foreground">设备</th>
            <th className="text-left p-3 font-medium text-muted-foreground">管理IP</th>
            <th className="text-left p-3 font-medium text-muted-foreground">监控项</th>
            <th className="text-left p-3 font-medium text-muted-foreground">模式</th>
            <th className="text-left p-3 font-medium text-muted-foreground">键值</th>
            <th className="text-left p-3 font-medium text-muted-foreground">最近值</th>
            <th className="text-left p-3 font-medium text-muted-foreground">最近采集</th>
            <th className="text-left p-3 font-medium text-muted-foreground">状态</th>
          </tr></thead>
          <tbody>{filtered.map((row, i) => (
            <tr key={`${row.device.id}-${row.item.id}-${i}`} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="p-3 font-medium">{row.device.name}</td>
              <td className="p-3 font-mono text-xs">{row.device.ip}</td>
              <td className="p-3">{row.item.name}</td>
              <td className="p-3"><Badge variant="outline" className={`text-[10px] h-5 ${TYPE_COLORS[row.item.type] || ''}`}>{TYPE_LABELS[row.item.type] || row.item.type}</Badge></td>
              <td className="p-3 font-mono text-xs text-muted-foreground">{row.item.key}</td>
              <td className="p-3 font-mono text-xs" title={row.item.lastValue ? `${row.item.lastValue}${row.item.units ? ' ' + row.item.units : ''}${row.item.status === 'error' ? '\n[采集异常]' : ''}` : '暂无数据'}><span className={row.item.status === 'error' ? 'text-red-400' : ''}>{row.item.lastValue || '—'}</span>{row.item.lastValue && row.item.units ? <span className="text-muted-foreground ml-0.5">{row.item.units}</span> : null}</td>
              <td className="p-3 text-xs text-muted-foreground">{row.item.lastCheck || '—'}</td>
              <td className="p-3">
                {row.item.enabled ? (
                  row.item.status === 'error' ? <Badge variant="outline" className="text-[10px] h-5 text-amber-400 border-amber-500/20">异常</Badge> :
                  <Badge variant="outline" className="text-[10px] h-5 text-emerald-400 border-emerald-500/20">正常</Badge>
                ) : <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">—</Badge>}
              </td>
            </tr>
          ))}</tbody>
        </table></div></Card>
      )}
    </div>
  );
}

// ==================== DEVICE DETAIL PAGE ====================
function DeviceDetailPage({ devices, deviceId, onBack, onSSH, templates }: { devices: Device[]; deviceId: string; onBack: () => void; onSSH: (id: string) => void; templates: OidTemplate[] }) {
  const device = devices.find(d => d.id === deviceId);
  const [snmpData, setSnmpData] = useState<Record<string, string>>({});
  const [snmpLoading, setSnmpLoading] = useState(false);
  const [snmpError, setSnmpError] = useState('');
  const API_BASE_LOCAL = typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (window.__NETVIEWONE_API_BASE__ || 'http://localhost:8090') : '';

  if (!device) return <div className="text-center py-20 text-muted-foreground">设备未找到</div>;

  // Find a matching template by brand+model
  const matchedTemplate = templates.find(t => t.brand === device.brand && t.model === device.model);

  const collectSnmp = async () => {
    if (!matchedTemplate || !device.snmpEnabled) return;
    setSnmpLoading(true);
    setSnmpError('');
    try {
      const allOids: { name: string; oid: string; method: 'get' | 'walk' }[] = [];
      matchedTemplate.categories.forEach(cat => cat.items.forEach(item => allOids.push({ name: `${cat.name}::${item.name}`, oid: item.oid, method: item.method })));
      const res = await fetch(`${API_BASE_LOCAL}/api/snmp-collect`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: device.ip, community: device.snmpCommunity || 'public', version: device.snmpVersion || 'v2c', port: device.snmpPort || 161, oids: allOids }),
      });
      const data = await res.json();
      if (data.success) {
        const map: Record<string, string> = {};
        (data.results || []).forEach((r: any) => { map[r.name] = r.value || r.error || ''; });
        setSnmpData(map);
      } else {
        setSnmpError(data.error || '采集失败');
      }
    } catch (e) {
      setSnmpError('无法连接后端API');
    }
    setSnmpLoading(false);
  };

  // Parse SNMP walk output into key-value pairs
  const parseWalk = (raw: string): { index: string; value: string }[] => {
    if (!raw) return [];
    return raw.split('\n').filter(Boolean).map(line => {
      const m = line.match(/\.(\d+)\s*=\s*(.*)/);
      if (m) return { index: m[1], value: m[2].trim() };
      return null;
    }).filter(Boolean) as { index: string; value: string }[];
  };

  // Build interface table from snmpData
  const buildInterfaceTable = () => {
    const names = parseWalk(snmpData['接口信息::接口名称'] || '');
    const aliases = parseWalk(snmpData['接口信息::接口描述'] || '');
    const operStatus = parseWalk(snmpData['接口信息::接口运行状态'] || '');
    const speeds = parseWalk(snmpData['接口信息::接口速率'] || '');
    const inOctets = parseWalk(snmpData['接口信息::入流量(Byte)'] || '');
    const outOctets = parseWalk(snmpData['接口信息::出流量(Byte)'] || '');
    const inErrors = parseWalk(snmpData['接口信息::入错误包'] || '');
    const outErrors = parseWalk(snmpData['接口信息::出错误包'] || '');
    const aliasMap: Record<string, string> = {};
    aliases.forEach(a => { aliasMap[a.index] = a.value.replace(/^STRING:\s*/, ''); });
    const statusMap: Record<string, string> = {};
    operStatus.forEach(s => { statusMap[s.index] = s.value.includes('up(1)') ? 'up' : 'down'; });
    const speedMap: Record<string, string> = {};
    speeds.forEach(s => { const v = parseInt(s.value.replace(/.*:\s*/, '')); speedMap[s.index] = v >= 1000000000 ? `${v / 1000000000}G` : v >= 1000000 ? `${v / 1000000}M` : `${v}`; });
    const inMap: Record<string, string> = {};
    inOctets.forEach(s => { const v = parseInt(s.value.replace(/.*:\s*/, '')); inMap[s.index] = v > 1024 * 1024 * 1024 ? `${(v / 1024 / 1024 / 1024).toFixed(1)}GB` : v > 1024 * 1024 ? `${(v / 1024 / 1024).toFixed(1)}MB` : `${(v / 1024).toFixed(0)}KB`; });
    const outMap: Record<string, string> = {};
    outOctets.forEach(s => { const v = parseInt(s.value.replace(/.*:\s*/, '')); outMap[s.index] = v > 1024 * 1024 * 1024 ? `${(v / 1024 / 1024 / 1024).toFixed(1)}GB` : v > 1024 * 1024 ? `${(v / 1024 / 1024).toFixed(1)}MB` : `${(v / 1024).toFixed(0)}KB`; });
    const inErrMap: Record<string, string> = {};
    inErrors.forEach(s => { inErrMap[s.index] = s.value.replace(/.*:\s*/, ''); });
    const outErrMap: Record<string, string> = {};
    outErrors.forEach(s => { outErrMap[s.index] = s.value.replace(/.*:\s*/, ''); });
    return names.map(n => ({
      index: n.index,
      name: n.value.replace(/^STRING:\s*/, ''),
      alias: aliasMap[n.index] || '',
      status: statusMap[n.index] || 'unknown',
      speed: speedMap[n.index] || '—',
      inBytes: inMap[n.index] || '0',
      outBytes: outMap[n.index] || '0',
      inErrors: inErrMap[n.index] || '0',
      outErrors: outErrMap[n.index] || '0',
    }));
  };

  const interfaceTable = Object.keys(snmpData).length > 0 ? buildInterfaceTable() : [];

  // Parse system metrics
  const parseSimpleValue = (raw: string): string => {
    if (!raw) return '—';
    const m = raw.match(/.*:\s*(.*)/);
    return m ? m[1].trim() : raw;
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4"><Button variant="ghost" size="sm" className="gap-1" onClick={onBack}><ChevronRight className="h-4 w-4 rotate-180" /> 返回</Button><Separator orientation="vertical" className="h-6" />
          <div><div className="flex items-center gap-3"><h1 className="text-2xl font-bold tracking-tight">{device.name}</h1><DualStatusBadge ping={device.pingStatus} snmp={device.snmpStatus} /></div><p className="text-sm text-muted-foreground mt-1">{device.brand} {device.model} | {DEVICE_TYPES[device.type]} | {device.floor} {device.room}</p></div></div>
        <div className="flex items-center gap-2">
          {device.snmpEnabled && matchedTemplate && (
            <Button variant="outline" className="gap-2 rounded-xl" onClick={collectSnmp} disabled={snmpLoading}>
              {snmpLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />} SNMP采集
            </Button>
          )}
          <Button className="gap-2 rounded-xl" onClick={() => onSSH(device.id)}><Terminal className="h-4 w-4" /> SSH 连接</Button>
        </div>
      </div>
      {snmpError && <Card className="border-0 shadow-sm border-l-4 border-l-red-400"><CardContent className="p-3"><p className="text-sm text-red-400">{snmpError}</p></CardContent></Card>}
      {!device.snmpEnabled && <Card className="border-0 shadow-sm border-l-4 border-l-amber-400"><CardContent className="p-3"><p className="text-sm text-amber-400">SNMP采集未启用，请前往「设备管理」编辑此设备开启SNMP</p></CardContent></Card>}
      {device.snmpEnabled && !matchedTemplate && <Card className="border-0 shadow-sm border-l-4 border-l-amber-400"><CardContent className="p-3"><p className="text-sm text-amber-400">未找到匹配此设备品牌/型号的OID模板（{device.brand} {device.model}），请在「模板管理」中创建</p></CardContent></Card>}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/60 rounded-xl"><TabsTrigger value="overview" className="rounded-lg">运行概览</TabsTrigger><TabsTrigger value="ports" className="rounded-lg">端口状态</TabsTrigger><TabsTrigger value="snmp-data" className="rounded-lg">SNMP实时数据</TabsTrigger><TabsTrigger value="snmp" className="rounded-lg">SNMP配置</TabsTrigger></TabsList>
        <TabsContent value="overview" className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <Card className="border-0 shadow-sm"><CardContent className="p-6 space-y-5"><h3 className="font-semibold">资源使用</h3><MetricBar value={device.cpu} label="CPU 使用率" icon={<Cpu className="h-4 w-4" />} /><MetricBar value={device.memory} label="内存使用率" icon={<HardDrive className="h-4 w-4" />} /><div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2 text-muted-foreground"><Fan className="h-4 w-4" /> 风扇状态</div><span className={device.fanStatus === 'normal' ? 'text-emerald-400' : 'text-amber-400'}>{device.fanStatus === 'normal' ? '正常' : '告警'}</span></div></CardContent></Card>
            <Card className="border-0 shadow-sm"><CardContent className="p-6 space-y-5"><h3 className="font-semibold">基本信息</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">管理IP</span><span className="font-mono">{device.ip}</span></div><div className="flex justify-between"><span className="text-muted-foreground">SSH端口</span><span>{device.sshPort}</span></div><div className="flex justify-between"><span className="text-muted-foreground">运行时间</span><span>{device.uptime}</span></div><div className="flex justify-between"><span className="text-muted-foreground">最后同步</span><span>{device.lastSync}</span></div><div className="flex justify-between"><span className="text-muted-foreground">OID模板</span><span>{matchedTemplate ? matchedTemplate.name : '—'}</span></div></div></CardContent></Card>
          </div>
        </TabsContent>
        <TabsContent value="ports" className="space-y-5"><Card className="border-0 shadow-sm"><CardContent className="p-6"><div className="grid grid-cols-2 gap-4">{device.ports.map(port => (<div key={port.id} className={`flex items-center gap-3 p-3 rounded-xl border ${port.status === 'up' ? 'border-emerald-500/20 bg-emerald-500/5' : port.status === 'down' ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-muted/30'}`}><EthernetPort className={`h-4 w-4 ${port.status === 'up' ? 'text-emerald-400' : 'text-red-400'}`} /><div className="flex-1"><div className="flex items-center gap-2"><span className="font-mono text-sm">{port.name}</span><Badge variant="outline" className="text-[10px] h-4">{port.speed}</Badge></div>{port.traffic && <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1"><span className="flex items-center gap-1"><ArrowUpRight className="h-3 w-3 text-emerald-400" />{port.traffic.in} Mbps</span><span className="flex items-center gap-1"><ArrowDownRight className="h-3 w-3 text-blue-400" />{port.traffic.out} Mbps</span></div>}</div><span className={`text-xs font-medium ${port.status === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>{port.status.toUpperCase()}</span></div>))}</div></CardContent></Card></TabsContent>
        <TabsContent value="snmp-data" className="space-y-5">
          {Object.keys(snmpData).length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><Database className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">点击上方「SNMP采集」按钮获取实时数据</p></CardContent></Card>
          ) : matchedTemplate ? (
            <div className="space-y-5">
              {/* System metrics */}
              {matchedTemplate.categories.filter(c => c.name !== '接口信息').map((cat, ci) => (
                <Card key={ci} className="border-0 shadow-sm"><CardContent className="p-5">
                  <h3 className="text-sm font-semibold mb-3">{cat.name}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {cat.items.map((item, ii) => {
                      const rawVal = snmpData[`${cat.name}::${item.name}`] || '';
                      const parsed = item.method === 'walk' ? parseWalk(rawVal) : null;
                      return (
                        <div key={ii} className="p-3 rounded-lg border border-border/50 bg-muted/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">{item.name}</span>
                            {item.unit && <span className="text-[10px] text-muted-foreground">{item.unit}</span>}
                          </div>
                          {parsed && parsed.length > 0 ? (
                            <div className="space-y-0.5 max-h-24 overflow-y-auto">
                              {parsed.slice(0, 5).map((p, pi) => <p key={pi} className="text-xs font-mono"><span className="text-muted-foreground">[{p.index}]</span> {p.value}</p>)}
                              {parsed.length > 5 && <p className="text-[10px] text-muted-foreground">...共 {parsed.length} 项</p>}
                            </div>
                          ) : (
                            <p className="text-sm font-semibold truncate">{parseSimpleValue(rawVal) || '—'}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent></Card>
              ))}
              {/* Interface table */}
              {interfaceTable.length > 0 && (
                <Card className="border-0 shadow-sm"><CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">接口信息（共 {interfaceTable.length} 个）</h3>
                    <Badge variant="outline" className="text-[10px] h-5">UP: {interfaceTable.filter(i => i.status === 'up').length} / DOWN: {interfaceTable.filter(i => i.status === 'down').length}</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-1.5 px-2 font-medium">接口</th>
                        <th className="text-left py-1.5 px-2 font-medium">状态</th>
                        <th className="text-left py-1.5 px-2 font-medium">速率</th>
                        <th className="text-right py-1.5 px-2 font-medium">入流量</th>
                        <th className="text-right py-1.5 px-2 font-medium">出流量</th>
                        <th className="text-right py-1.5 px-2 font-medium">入错误</th>
                        <th className="text-right py-1.5 px-2 font-medium">出错误</th>
                      </tr></thead>
                      <tbody>
                        {interfaceTable.map((iface, ii) => (
                          <tr key={ii} className="border-b border-border/30 hover:bg-muted/30">
                            <td className="py-1.5 px-2 font-mono font-medium">{iface.name}</td>
                            <td className="py-1.5 px-2"><span className={`inline-flex items-center gap-1 ${iface.status === 'up' ? 'text-emerald-400' : 'text-red-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${iface.status === 'up' ? 'bg-emerald-400' : 'bg-red-400'}`} />{iface.status.toUpperCase()}</span></td>
                            <td className="py-1.5 px-2">{iface.speed}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{iface.inBytes}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{iface.outBytes}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{iface.inErrors}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{iface.outErrors}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent></Card>
              )}
            </div>
          ) : null}
        </TabsContent>
        <TabsContent value="snmp" className="space-y-5">
          <Card className="border-0 shadow-sm"><CardContent className="p-6"><h3 className="font-semibold mb-4">SNMP 采集配置</h3>
            {device.snmpEnabled ? (
              <div className="grid grid-cols-2 gap-4 text-sm"><div><span className="text-muted-foreground">启用状态</span><p className="font-medium text-emerald-400 mt-1">已启用</p></div><div><span className="text-muted-foreground">SNMP版本</span><p className="font-medium mt-1">{device.snmpVersion?.toUpperCase()}</p></div><div><span className="text-muted-foreground">Community</span><p className="font-mono mt-1">{device.snmpCommunity || '—'}</p></div><div><span className="text-muted-foreground">SNMP端口</span><p className="font-medium mt-1">{device.snmpPort || 161}</p></div><div><span className="text-muted-foreground">采集间隔</span><p className="font-medium mt-1">{device.snmpInterval || 60}s</p></div></div>
            ) : (<p className="text-muted-foreground">SNMP采集未启用，请前往「设备管理」编辑此设备开启SNMP</p>)}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== SSH TERMINAL PAGE ====================
function SSHTerminalPage({ onBack, devices, onEditDevice, onDeleteDevice }: {
  onBack: () => void; devices: Device[]; onEditDevice: (d: Device) => void; onDeleteDevice: (id: string) => void;
}) {
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [cmdExecuting, setCmdExecuting] = useState(false);
  const [moreMode, setMoreMode] = useState(false);
  const [credOpen, setCredOpen] = useState(false);
  const [credDevice, setCredDevice] = useState<Device | null>(null);
  const [credUsername, setCredUsername] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<Array<{ type: 'input' | 'output' | 'more'; text: string }>>([{ type: 'output', text: '欢迎使用 NetviewOne SSH 终端。请在左侧选择设备并连接。' }]);
  const [sshSearch, setSshSearch] = useState('');

  const termRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const connectedDevice = devices.find(d => d.id === connectedDeviceId);
  const scrollBottom = () => setTimeout(() => { if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight; }, 50);
  const filteredDevices = sshSearch.trim()
    ? devices.filter(d => d.name.toLowerCase().includes(sshSearch.toLowerCase()) || d.ip.toLowerCase().includes(sshSearch.toLowerCase()))
    : devices;

  // Auto-focus input after command execution completes
  useEffect(() => { if (!cmdExecuting) inputRef.current?.focus(); }, [cmdExecuting]);

  // Global keydown listener for More mode (space=continue, q=quit) — no need to click input first
  useEffect(() => {
    if (!moreMode || cmdExecuting || !sessionId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleMoreKey(' '); }
      else if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); handleMoreKey('q'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [moreMode, cmdExecuting, sessionId]);

  const MORE_RE = /-{2,}\s*More\s*-{2,}/i;

  const handleMoreKey = async (key: string) => {
    if (!sessionId || cmdExecuting) return;
    setCmdExecuting(true);
    try {
      const sendChar = key === ' ' ? ' ' : key === 'Enter' ? ' ' : 'q';
      const res = await fetch(`${API_BASE}/api/ssh/exec`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, command: sendChar, raw: true }),
      });
      const data = await res.json();
      const out = data.output || '';
      if (MORE_RE.test(out)) {
        setHistory(prev => [...prev, { type: 'output', text: out }, { type: 'more', text: ' -- More -- [空格继续 | Q退出] ' }]);
      } else {
        setMoreMode(false);
        setHistory(prev => [...prev, { type: 'output', text: out }]);
      }
      if (data.closed) {
        setConnectedDeviceId(null); setSessionId(null); setMoreMode(false);
        setHistory(prev => [...prev, { type: 'output', text: '连接已断开。' }]);
      }
    } catch {
      setHistory(prev => [...prev, { type: 'output', text: 'Error: 与服务器通信失败。' }]);
      setMoreMode(false);
    }
    setCmdExecuting(false);
    scrollBottom();
  };

  const handleConnect = async (device: Device) => {
    if (!device.sshUsername || !device.sshPassword) {
      setCredDevice(device);
      setCredUsername(device.sshUsername || '');
      setCredPassword(device.sshPassword || '');
      setCredOpen(true);
      return;
    }
    setConnecting(true);
    setConnectedDeviceId(device.id);
    setHistory([{ type: 'output', text: `Connecting to ${device.ip}:${device.sshPort}...` }]);
    try {
      const res = await fetch(`${API_BASE}/api/ssh/connect`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: device.ip, port: device.sshPort, username: device.sshUsername, password: device.sshPassword, name: device.name }),
      });
      if (!res.ok) throw new Error('API返回HTTP ' + res.status);
      const data = await res.json();
      if (data.success) {
        setSessionId(data.sessionId);
        const out = data.output || `Connected to ${device.ip}.`;
        if (MORE_RE.test(out)) {
          setMoreMode(true);
          setHistory([{ type: 'output', text: out }, { type: 'more', text: ' -- More -- [空格继续 | Q退出] ' }]);
        } else {
          setHistory([{ type: 'output', text: out }]);
        }
      } else {
        setConnectedDeviceId(null);
        setHistory([
          { type: 'output', text: `Connecting to ${device.ip}:${device.sshPort}...` },
          { type: 'output', text: `[连接失败] ${data.output || 'Unknown error'}` },
          { type: 'output', text: '' },
          { type: 'output', text: '提示：请检查设备IP、端口、SSH账号密码是否正确，以及网络是否可达。' },
        ]);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setConnectedDeviceId(null);
      setHistory([
        { type: 'output', text: `Connecting to ${device.ip}:${device.sshPort}...` },
        { type: 'output', text: `[连接失败] 无法连接到后端API服务 (${errMsg})` },
        { type: 'output', text: '提示：请确认后端服务是否运行。' },
      ]);
    }
    setConnecting(false);
    scrollBottom();
  };

  const handleSaveCred = () => {
    if (!credDevice || !credUsername || !credPassword) return;
    const updated = { ...credDevice, sshUsername: credUsername, sshPassword: credPassword };
    onEditDevice(updated);
    setCredOpen(false);
    setCredDevice(null);
    setCredUsername('');
    setCredPassword('');
    handleConnect(updated);
  };

  const handleDisconnect = async () => {
    if (sessionId) {
      try { await fetch(`${API_BASE}/api/ssh/disconnect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) }); } catch { /* ignore */ }
    }
    if (connectedDevice) {
      setHistory(prev => [...prev, { type: 'output', text: `Disconnected from ${connectedDevice.name}.` }]);
    }
    setConnectedDeviceId(null);
    setSessionId(null);
    setMoreMode(false);
  };

  const prompt = connectedDevice ? `<${connectedDevice.name}>` : '';

  // H3C read-only command filter
  const isH3CDevice = connectedDevice?.brand?.toUpperCase().includes('H3C') || connectedDevice?.brand?.toUpperCase().includes('华三');
  const H3C_ALLOWED = /^(display\s|ping\s|tracert\s|quit|return)/i;
  const H3C_DENIED_MSG = '⚠ 该H3C设备仅支持display查看命令，禁止执行配置变更操作。';

  // Tab completion - context-aware based on device brand
  const h3cCompletions: string[] = [
    'display version', 'display cpu', 'display memory', 'display interface brief',
    'display device', 'display clock', 'display current-configuration', 'display ip routing-table',
    'display arp', 'display mac-address', 'display vlan', 'display interface',
    'display diagnostic-information', 'display environment', 'display fan', 'display power',
    'display logbuffer', 'display info-center', 'display startup', 'display irf',
    'ping ', 'tracert ', 'quit', 'return',
  ];
  const otherCompletions: string[] = [
    'display version', 'display cpu', 'display memory', 'display interface brief',
    'display device', 'display clock', 'display current-configuration', 'display ip routing-table',
    'display arp', 'display mac-address', 'display vlan', 'display interface',
    'display diagnostic-information', 'display environment', 'display fan', 'display power',
    'display logbuffer', 'display info-center', 'display startup', 'display irf',
    'ping ', 'tracert ', 'system-view', 'quit', 'save', 'return',
    'show version', 'show ip interface brief', 'show running-config',
    'show mac address-table', 'show vlan', 'show interfaces',
    'enable', 'configure terminal', 'write memory',
  ];
  const tabCompletions = isH3CDevice ? h3cCompletions : otherCompletions;

  const handleTabComplete = () => {
    if (!connectedDevice || !command.trim()) return;
    const input = command.trim().toLowerCase();
    const matches = tabCompletions.filter(c => c.toLowerCase().startsWith(input));
    if (matches.length === 1) {
      setCommand(matches[0] + ' ');
    } else if (matches.length > 1) {
      const newHistory = [...history, { type: 'input' as const, text: command }];
      newHistory.push({ type: 'output' as const, text: matches.join('\n') });
      setHistory(newHistory);
      let prefix = matches[0];
      for (let i = 1; i < matches.length; i++) {
        let j = 0;
        while (j < prefix.length && j < matches[i].length && prefix[j].toLowerCase() === matches[i][j].toLowerCase()) j++;
        prefix = prefix.slice(0, j);
      }
      if (prefix.length > input.length) setCommand(prefix);
      setTimeout(() => { if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight; }, 50);
    }
  };

  const handleCommand = async () => {
    if (!connectedDevice || !command.trim() || cmdExecuting || !sessionId) return;
    const input = command.trim();

    // H3C read-only guard
    if (isH3CDevice && !H3C_ALLOWED.test(input)) {
      setHistory(prev => [...prev, { type: 'input', text: `${prompt}${input}` }, { type: 'output', text: H3C_DENIED_MSG }]);
      setCommand('');
      scrollBottom();
      return;
    }

    setCommand('');
    setCmdExecuting(true);
    try {
      const res = await fetch(`${API_BASE}/api/ssh/exec`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, command: input }),
      });
      const data = await res.json();
      const out = data.output || '';
      if (MORE_RE.test(out)) {
        setMoreMode(true);
        setHistory(prev => [...prev, { type: 'input', text: `${prompt}${input}` }, { type: 'output', text: out }, { type: 'more', text: ' -- More -- [空格继续 | Q退出] ' }]);
      } else {
        setHistory(prev => [...prev, { type: 'input', text: `${prompt}${input}` }, { type: 'output', text: out }]);
      }
      if (data.closed) {
        setConnectedDeviceId(null);
        setSessionId(null);
        setMoreMode(false);
        setHistory(prev => [...prev, { type: 'output', text: '连接已断开。' }]);
      }
    } catch {
      setHistory(prev => [...prev, { type: 'output', text: 'Error: 与服务器通信失败。' }]);
    }
    setCmdExecuting(false);
    scrollBottom();
  };

  return (
    <div className="space-y-4 fade-in h-full flex flex-col">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}><ChevronRight className="h-4 w-4 rotate-180" /> 返回</Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-3"><Terminal className="h-5 w-5 text-emerald-400" /><span className="font-semibold">SSH 终端</span></div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Panel: Device List */}
        <Card className="w-80 border-0 shadow-sm flex-shrink-0 flex flex-col">
          <CardContent className="p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">设备列表</h3>
              <Badge variant="outline" className="text-[10px] h-5">{devices.length} 台</Badge>
            </div>
            <div className="mb-3">
              <Input className="h-8 text-xs rounded-lg" placeholder="搜索设备名称或IP..." value={sshSearch} onChange={e => setSshSearch(e.target.value)} />
            </div>
            <div className="flex-1 space-y-3 overflow-auto">
              {devices.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">暂无设备<br />请先在「设备管理」中添加</p>
              ) : filteredDevices.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">未找到匹配设备</p>
              ) : filteredDevices.map(device => {
                const isConn = connectedDeviceId === device.id;
                const hasCred = !!(device.sshUsername && device.sshPassword);
                return (
                  <div key={device.id} className={`p-3 rounded-xl border transition-all ${isConn ? 'border-primary/30 bg-primary/5' : 'border-border/60'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="relative flex-shrink-0">
                        <Terminal className={`h-4 w-4 ${isConn ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card ${isConn ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{device.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{device.ip}:{device.sshPort}</p>
                      </div>
                      {isConn && <Badge variant="outline" className="text-[9px] h-4 text-emerald-400 border-emerald-500/20 flex-shrink-0">已连接</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button size="sm" variant={isConn ? 'secondary' : 'default'} className="h-7 text-xs gap-1 rounded-lg" disabled={isConn || connecting} onClick={() => handleConnect(device)}>
                        <Plug className="h-3 w-3" />连接
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-lg" disabled={!isConn} onClick={handleDisconnect}>
                        <LogOut className="h-3 w-3" />断开
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-lg" onClick={() => { setCredDevice(device); setCredUsername(device.sshUsername || ''); setCredPassword(device.sshPassword || ''); setCredOpen(true); }}>
                        <KeyRound className="h-3 w-3" />密码
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 rounded-lg text-muted-foreground hover:text-red-400" onClick={() => { if (isConn) handleDisconnect(); onDeleteDevice(device.id); }}>
                        <Trash2 className="h-3 w-3" />删除
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Terminal - Fixed Size */}
        <Card className="flex-1 border-0 shadow-sm flex flex-col overflow-hidden h-[calc(100vh-180px)]">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b flex-shrink-0">
            <div className="flex gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500/80" /><span className="w-3 h-3 rounded-full bg-amber-500/80" /><span className="w-3 h-3 rounded-full bg-emerald-500/80" /></div>
            <span className="text-xs text-muted-foreground ml-2">{connectedDevice ? `SSH — ${connectedDevice.ip}` : 'SSH — 未连接'}</span>
            {connectedDevice && <Badge variant="outline" className={`text-[10px] h-5 ml-auto gap-1 ${moreMode ? 'text-amber-400 border-amber-500/20' : 'text-emerald-400 border-emerald-500/20'}`}><Check className="h-3 w-3" />{moreMode ? 'More' : '已连接'}</Badge>}
          </div>
          <div ref={termRef} className="flex-1 overflow-y-auto p-4 terminal-output text-emerald-400 bg-[#0d1117] min-h-0">
            {history.map((line, i) => {
              if (line.type === 'more') return <div key={i} className="text-amber-400 font-bold animate-pulse"><pre className="whitespace-pre-wrap break-all">{line.text}</pre></div>;
              return <div key={i} className={line.type === 'input' ? 'text-white' : 'text-emerald-400/90'}><pre className="whitespace-pre-wrap break-all">{line.text}</pre></div>;
            })}
          </div>
          <div className="flex items-center gap-2 p-3 bg-[#161b22] border-t border-border/50 flex-shrink-0">
            {connectedDevice && !moreMode && <span className="text-emerald-400 terminal-output whitespace-nowrap">{prompt}</span>}
            {moreMode ? (
              <input ref={inputRef} className="flex-1 bg-transparent border-0 outline-none text-amber-400 terminal-output" placeholder={cmdExecuting ? '翻页中...' : '按 [空格] 继续 / [Q] 退出 More'} value={command} onChange={e => setCommand(e.target.value)} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'q' || e.key === 'Q') { e.preventDefault(); setCommand(''); handleMoreKey(e.key); } }} disabled={cmdExecuting} autoFocus />
            ) : (
              <input ref={inputRef} className="flex-1 bg-transparent border-0 outline-none text-white terminal-output" placeholder={cmdExecuting ? '执行中...' : connectedDevice ? '输入命令 (Tab补全)' : '请先选择设备连接'} value={command} onChange={e => setCommand(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCommand(); else if (e.key === 'Tab') { e.preventDefault(); handleTabComplete(); } }} disabled={!connectedDevice || cmdExecuting} autoFocus />
            )}
          </div>
        </Card>
      </div>

      {/* SSH Credential Dialog */}
      <Dialog open={credOpen} onOpenChange={setCredOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>SSH 凭据 — {credDevice?.name}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">设备地址</label><Input className="col-span-3 font-mono" value={credDevice ? `${credDevice.ip}:${credDevice.sshPort}` : ''} disabled /></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">用户名 <span className="text-red-400">*</span></label><Input className="col-span-3" placeholder="如 omaccount 或 admin" value={credUsername} onChange={e => setCredUsername(e.target.value)} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">密码 <span className="text-red-400">*</span></label><Input className="col-span-3" type="password" placeholder="SSH登录密码" value={credPassword} onChange={e => setCredPassword(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setCredOpen(false)}>取消</Button><Button onClick={handleSaveCred} disabled={!credUsername || !credPassword}>保存并连接</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== TEMPLATE MANAGEMENT PAGE ====================
function TemplatesPage({ templates, onAddTemplate, onDeleteTemplate }: { templates: OidTemplate[]; onAddTemplate: (t: OidTemplate) => void; onDeleteTemplate: (id: string) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', brand: '', model: '' });
  const selected = templates.find(t => t.id === selectedId);

  const handleAdd = () => {
    if (!form.name || !form.brand || !form.model) return;
    const tpl: OidTemplate = { id: `tpl-${Date.now()}`, name: form.name, brand: form.brand, model: form.model, categories: [] };
    onAddTemplate(tpl);
    setAddOpen(false);
    setForm({ name: '', brand: '', model: '' });
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">模板管理</h2>
        <Button size="sm" className="rounded-lg text-xs h-8 gap-1" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5" />新建模板</Button>
      </div>

      {addOpen && (
        <Card className="border-0 shadow-sm apple-card"><CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="模板名称" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <Input placeholder="品牌（如 H3C）" value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} />
            <Input placeholder="型号（如 S5130S-52P-EI）" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>取消</Button>
            <Button size="sm" onClick={handleAdd} disabled={!form.name || !form.brand || !form.model}>创建</Button>
          </div>
        </CardContent></Card>
      )}

      <div className="grid grid-cols-12 gap-4">
        {/* Left: template list */}
        <div className="col-span-4 space-y-2">
          {templates.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">暂无模板</p>}
          {templates.map(tpl => (
            <Card key={tpl.id} className={`border-0 shadow-sm cursor-pointer transition-all ${selectedId === tpl.id ? 'ring-2 ring-primary/40' : 'hover:shadow-md'}`} onClick={() => setSelectedId(tpl.id)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground">{tpl.brand} · {tpl.model}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-5">{tpl.categories.reduce((a, c) => a + c.items.length, 0)} 项</Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400" onClick={e => { e.stopPropagation(); onDeleteTemplate(tpl.id); }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Right: template detail */}
        <div className="col-span-8">
          {selected ? (
            <Card className="border-0 shadow-sm"><CardContent className="p-5 space-y-5">
              <div>
                <h3 className="text-base font-semibold">{selected.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">品牌：{selected.brand} · 型号：{selected.model} · ID：{selected.id}</p>
              </div>
              {selected.categories.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">此模板暂无指标分类</p>}
              {selected.categories.map((cat, ci) => (
                <div key={ci} className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground border-b border-border pb-1">{cat.name}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-1.5 px-2 font-medium">指标名称</th>
                        <th className="text-left py-1.5 px-2 font-medium">OID</th>
                        <th className="text-left py-1.5 px-2 font-medium">方式</th>
                        <th className="text-left py-1.5 px-2 font-medium">单位</th>
                        <th className="text-left py-1.5 px-2 font-medium">说明</th>
                      </tr></thead>
                      <tbody>
                        {cat.items.map((item, ii) => (
                          <tr key={ii} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-1.5 px-2 font-medium">{item.name}</td>
                            <td className="py-1.5 px-2 font-mono text-muted-foreground">{item.oid}</td>
                            <td className="py-1.5 px-2"><Badge variant="outline" className="text-[9px] h-4">{item.method === 'walk' ? 'Walk' : 'Get'}</Badge></td>
                            <td className="py-1.5 px-2">{item.unit || '—'}</td>
                            <td className="py-1.5 px-2 text-muted-foreground">{item.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </CardContent></Card>
          ) : (
            <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><p className="text-sm text-muted-foreground">请从左侧选择模板查看详情</p></CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== MONITOR HOSTS PAGE ====================
function MonitorHostsPage({ devices, templates }: { devices: Device[]; templates: OidTemplate[] }) {
  const API_BASE = typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (window.__NETVIEWONE_API_BASE__ || 'http://localhost:8090') : '';
  const [search, setSearch] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [monitorItems, setMonitorItems] = useState<MonitorItem[]>([]);
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());

  const selectedDevice = devices.find(d => d.id === selectedDeviceId) || null;

  // Load monitor items when a device is selected
  useEffect(() => {
    if (!selectedDeviceId) { setMonitorItems([]); return; }
    fetch(`${API_BASE}/api/monitor-items?deviceId=${selectedDeviceId}`).then(r => r.json()).then((data: any[]) => {
      setMonitorItems(data.map(d => typeof d.data === 'string' ? JSON.parse(d.data) : (d.data && typeof d.data === 'object' ? d.data : d)).filter((d: MonitorItem) => d.deviceId === selectedDeviceId));
    }).catch(() => setMonitorItems([]));
  }, [API_BASE, selectedDeviceId]);

  const saveItem = (item: MonitorItem) => {
    fetch(`${API_BASE}/api/monitor-items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, data: JSON.stringify(item) }) }).catch(() => {});
  };

  const executeNow = (item: MonitorItem) => {
    if (item.type !== 'snmp') return;
    const oid = item.snmpOid || '';
    if (!oid) {
      const updated = { ...item, lastValue: '缺少SNMP OID', lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
      setMonitorItems(prev => prev.map(i => i.id === item.id ? updated : i));
      return;
    }
    const host = selectedDevice?.ip || '';
    if (!host) {
      const updated = { ...item, lastValue: '缺少设备IP', lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
      setMonitorItems(prev => prev.map(i => i.id === item.id ? updated : i));
      return;
    }
    const community = item.snmpCommunity || selectedDevice?.snmpCommunity || 'public';
    const version = item.snmpVersion || selectedDevice?.snmpVersion || 'v2c';
    const port = Number(item.snmpPort) || Number(selectedDevice?.snmpPort) || 161;
    setExecutingIds(prev => new Set(prev).add(item.id));
    console.log('[HostsPage executeNow] host=', host, 'oid=', oid, 'community=', community, 'port=', port, 'version=', version);
    fetch(`${API_BASE}/api/snmp-collect`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host, community, version, port,
        oids: [{ name: item.name, oid, method: 'get' }]
      })
    }).then(r => { console.log('[HostsPage] HTTP status=', r.status); return r.json(); }).then(res => {
      console.log('[HostsPage] response=', JSON.stringify(res).slice(0, 500));
      const result = res.results?.[0];
      if (result && result.value) {
        let raw = result.value;
        if (/^(Error|Timeout|No Such|End of MIB)/i.test(raw.trim())) {
          const updated = { ...item, lastValue: '采集失败: ' + raw.trim().slice(0, 60), lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
          setMonitorItems(prev => prev.map(i => i.id === item.id ? updated : i));
          saveItem(updated);
          return;
        }
        const m = raw.match(/(?:STRING|INTEGER|Gauge32|Counter32|Counter64|Timeticks|Hex-STRING|IpAddress|OPAQUE|Counter|Gauge|Opaque):\s*(.+)/i);
        let parsed = m ? m[1].trim().replace(/^"|"$/g, '') : raw;
        const tm = parsed.match(/^\(\d+\)\s*(.+)/);
        if (tm) parsed = tm[1];
        console.log('[HostsPage] parsed value=', parsed);
        const updated = { ...item, lastValue: parsed, lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'normal' as const };
        setMonitorItems(prev => prev.map(i => i.id === item.id ? updated : i));
        saveItem(updated);
      } else if (result && result.error) {
        const updated = { ...item, lastValue: '采集失败: ' + result.error, lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
        setMonitorItems(prev => prev.map(i => i.id === item.id ? updated : i));
        saveItem(updated);
      } else if (res.success === false || res.error) {
        const updated = { ...item, lastValue: '采集失败: ' + (res.error || '未知错误'), lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
        setMonitorItems(prev => prev.map(i => i.id === item.id ? updated : i));
      } else {
        const updated = { ...item, lastValue: '无返回数据', lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
        setMonitorItems(prev => prev.map(i => i.id === item.id ? updated : i));
      }
    }).catch(err => {
      console.error('[HostsPage] fetch error=', err);
      const updated = { ...item, lastValue: '请求失败: ' + (err.message || String(err)).slice(0, 40), lastCheck: new Date().toISOString().slice(0, 19).replace('T', ' '), status: 'error' as const };
      setMonitorItems(prev => prev.map(i => i.id === item.id ? updated : i));
    }).finally(() => {
      setExecutingIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    });
  };

  // Filter devices by search
  const filteredDevices = devices.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.ip.includes(search)
  );

  const TYPE_LABELS: Record<string, string> = { shell: 'Shell', api: 'API', snmp: 'SNMP' };
  const TYPE_COLORS: Record<string, string> = { shell: 'text-violet-400 bg-violet-500/10', api: 'text-sky-400 bg-sky-500/10', snmp: 'text-emerald-400 bg-emerald-500/10' };
  const VALUE_TYPE_LABELS: Record<string, string> = { float: '浮点', unsigned: '整数', char: '字符', text: '文本' };

  return (
    <div className="space-y-6 fade-in">
      <div><h1 className="text-2xl font-bold tracking-tight">主机</h1><p className="text-sm text-muted-foreground mt-1">选择设备查看其监控项并执行检测</p></div>

      <div className="grid grid-cols-[320px_1fr] gap-6 min-h-[500px]">
        {/* Left: Device search & list */}
        <div className="space-y-3">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索设备名称或IP..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="border rounded-xl overflow-hidden">
            <div className="max-h-[calc(100vh-260px)] overflow-y-auto divide-y divide-border/50">
              {filteredDevices.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">无匹配设备</div>
              ) : filteredDevices.map(d => (
                <button key={d.id} className={`w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors ${selectedDeviceId === d.id ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent'}`} onClick={() => setSelectedDeviceId(d.id)}>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${d.pingStatus === 'up' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="font-medium text-sm truncate">{d.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 pl-3.5 font-mono">{d.ip}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Monitor items for selected device */}
        <div className="space-y-3">
          {!selectedDevice ? (
            <div className="border rounded-xl p-16 text-center"><Server className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground">请从左侧选择一台设备</p><p className="text-xs text-muted-foreground mt-1">选择后将展示该设备的全部监控项</p></div>
          ) : monitorItems.length === 0 ? (
            <div className="border rounded-xl p-12 text-center"><Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground">{selectedDevice.name} 暂无监控项</p><p className="text-xs text-muted-foreground mt-1">请先在设备管理中为该设备创建监控项</p></div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${selectedDevice.pingStatus === 'up' ? 'bg-emerald-400' : 'bg-red-400'}`} /><span className="font-semibold">{selectedDevice.name}</span><span className="text-xs text-muted-foreground font-mono">{selectedDevice.ip}</span></div>
                <span className="text-xs text-muted-foreground">{monitorItems.length} 个监控项</span>
              </div>
              <Card className="border-0 shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-muted-foreground">状态</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">名称</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">模式</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">键值</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">间隔</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">最近值</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">最近采集</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">操作</th>
                </tr></thead>
                <tbody>{monitorItems.map(item => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3"><span className={`inline-flex items-center gap-1.5 text-xs font-medium ${item.enabled ? 'text-emerald-400' : 'text-red-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${item.enabled ? 'bg-emerald-400' : 'bg-red-400'}`} />{item.enabled ? '已启用' : '已禁用'}</span></td>
                    <td className="p-3 font-medium text-sm max-w-[180px] truncate">{item.name}</td>
                    <td className="p-3"><Badge variant="outline" className={`text-[10px] h-5 ${TYPE_COLORS[item.type] || ''}`}>{TYPE_LABELS[item.type] || item.type}</Badge></td>
                    <td className="p-3 font-mono text-xs text-muted-foreground max-w-[180px] truncate">{item.key}</td>
                    <td className="p-3 text-xs">{item.interval}s</td>
                    <td className="p-3 text-xs font-mono max-w-[120px] truncate" title={item.lastValue ? `${item.lastValue}${item.units ? ' ' + item.units : ''}${item.status === 'error' ? '\n[采集异常]' : ''}` : '暂无数据'}><span className={item.status === 'error' ? 'text-red-400' : ''}>{item.lastValue || '—'}</span>{item.lastValue && item.units ? <span className="text-muted-foreground ml-0.5">{item.units}</span> : null}</td>
                    <td className="p-3 text-xs text-muted-foreground">{item.lastCheck || '—'}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs gap-1 text-primary hover:text-primary/80" disabled={executingIds.has(item.id) || !item.enabled} onClick={() => executeNow(item)}>{executingIds.has(item.id) ? <span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" /> : <Play className="h-3 w-3" />}立刻执行</Button>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div></Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== SNMP PAGE ====================
function SnmpPage({ devices, onEditDevice }: { devices: Device[]; onEditDevice: (d: Device) => void }) {
  const [traps] = useState<SnmpTrap[]>([]);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [form, setForm] = useState({ snmpVersion: 'v2c', snmpCommunity: 'public', snmpPort: '161', snmpInterval: '60' });

  const toggleSnmp = (dev: Device) => {
    onEditDevice({ ...dev, snmpEnabled: !dev.snmpEnabled });
  };

  const openEdit = (dev: Device) => {
    setForm({ snmpVersion: dev.snmpVersion || 'v2c', snmpCommunity: dev.snmpCommunity || 'public', snmpPort: String(dev.snmpPort || 161), snmpInterval: String(dev.snmpInterval || 60) });
    setEditDevice(dev);
  };

  const handleSave = () => {
    if (!editDevice) return;
    onEditDevice({ ...editDevice, snmpEnabled: true, snmpVersion: form.snmpVersion as Device['snmpVersion'], snmpCommunity: form.snmpCommunity, snmpPort: parseInt(form.snmpPort) || 161, snmpInterval: parseInt(form.snmpInterval) || 60 });
    setEditDevice(null);
  };

  return (
    <div className="space-y-6 fade-in">
      <div><h1 className="text-2xl font-bold tracking-tight">SNMP 采集管理</h1><p className="text-sm text-muted-foreground mt-1">管理SNMP采集配置与Trap告警，关联设备管理中的设备</p></div>

      <Tabs defaultValue="devices" className="space-y-6">
        <TabsList className="bg-muted/60 rounded-xl"><TabsTrigger value="devices" className="rounded-lg gap-2"><Database className="h-3.5 w-3.5" />设备采集配置</TabsTrigger><TabsTrigger value="traps" className="rounded-lg gap-2"><AlertTriangle className="h-3.5 w-3.5" />Trap 告警</TabsTrigger></TabsList>

        <TabsContent value="devices" className="space-y-4">
          {devices.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-muted-foreground"><Database className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" /><p>暂无设备，请先在「设备管理」中添加设备</p></CardContent></Card>
          ) : (
            <Card className="border-0 shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b border-border"><th className="text-left p-4 font-medium text-muted-foreground">设备名称</th><th className="text-left p-4 font-medium text-muted-foreground">管理IP</th><th className="text-left p-4 font-medium text-muted-foreground">SNMP版本</th><th className="text-left p-4 font-medium text-muted-foreground">Community</th><th className="text-left p-4 font-medium text-muted-foreground">端口</th><th className="text-left p-4 font-medium text-muted-foreground">采集间隔</th><th className="text-left p-4 font-medium text-muted-foreground">状态</th><th className="text-right p-4 font-medium text-muted-foreground">操作</th></tr></thead>
              <tbody>{devices.map(device => (
                <tr key={device.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{device.name}</td>
                  <td className="p-4 font-mono text-xs">{device.ip}</td>
                  <td className="p-4"><Badge variant="outline" className="text-[10px]">{device.snmpEnabled ? (device.snmpVersion || 'v2c').toUpperCase() : '—'}</Badge></td>
                  <td className="p-4 font-mono text-xs">{device.snmpEnabled ? (device.snmpVersion === 'v3' ? '—' : (device.snmpCommunity || '—')) : '—'}</td>
                  <td className="p-4 font-mono text-xs">{device.snmpEnabled ? (device.snmpPort || 161) : '—'}</td>
                  <td className="p-4">{device.snmpEnabled ? `${device.snmpInterval || 60}s` : '—'}</td>
                  <td className="p-4"><button onClick={() => toggleSnmp(device)} className={`flex items-center gap-2 text-sm ${device.snmpEnabled ? 'text-emerald-400' : 'text-muted-foreground'}`}>{device.snmpEnabled ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}{device.snmpEnabled ? '已启用' : '未启用'}</button></td>
                  <td className="p-4 text-right"><Button variant="ghost" size="sm" className="rounded-xl gap-1" onClick={() => openEdit(device)}><Pencil className="h-3.5 w-3.5" />编辑</Button></td>
                </tr>
              ))}</tbody>
            </table></div></Card>
          )}
          <p className="text-xs text-muted-foreground">提示：点击「编辑」可修改SNMP版本、Community和采集间隔，保存后自动启用SNMP采集。</p>
        </TabsContent>

        <TabsContent value="traps" className="space-y-4">
          {traps.length === 0 ? (<Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-muted-foreground"><AlertTriangle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" /><p>暂无Trap告警记录</p><p className="text-xs mt-1">启用SNMP采集后，设备告警将自动出现在这里</p></CardContent></Card>) : (
            <Card className="border-0 shadow-sm"><div className="divide-y divide-border/50">{traps.map(t => (<div key={t.id} className="p-4"><p className="text-sm font-medium">{t.deviceName}</p><p className="text-xs text-muted-foreground">{t.message}</p></div>))}</div></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit SNMP Dialog */}
      <Dialog open={!!editDevice} onOpenChange={v => { if (!v) setEditDevice(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>编辑 SNMP 配置 — {editDevice?.name}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">SNMP版本</label><Select value={form.snmpVersion} onValueChange={v => setForm(p => ({ ...p, snmpVersion: v }))}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="v1">v1</SelectItem><SelectItem value="v2c">v2c</SelectItem><SelectItem value="v3">v3</SelectItem></SelectContent></Select></div>
            {form.snmpVersion !== 'v3' && <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">Community</label><Input className="col-span-3 font-mono" value={form.snmpCommunity} onChange={e => setForm(p => ({ ...p, snmpCommunity: e.target.value }))} /></div>}
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">SNMP端口</label><Input className="col-span-3" type="number" value={form.snmpPort} onChange={e => setForm(p => ({ ...p, snmpPort: e.target.value }))} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">采集间隔(秒)</label><Input className="col-span-3" type="number" value={form.snmpInterval} onChange={e => setForm(p => ({ ...p, snmpInterval: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setEditDevice(null)}>取消</Button><Button onClick={handleSave}>保存</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== AUDIT LOG PAGE ====================
function AuditLogPage({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState('');
  const filtered = logs.filter(l => !search || l.user.includes(search) || l.target.includes(search) || l.detail.includes(search));
  return (
    <div className="space-y-6 fade-in">
      <div><h1 className="text-2xl font-bold tracking-tight">操作审计日志</h1><p className="text-sm text-muted-foreground mt-1">记录所有用户操作</p></div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} /></div>
      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-muted-foreground"><p>暂无操作记录</p></CardContent></Card>
      ) : (
        <Card className="border-0 shadow-sm"><div className="divide-y divide-border/50">{filtered.map(l => (<div key={l.id} className="flex items-center gap-4 p-4"><div className="flex-1"><div className="flex items-center gap-2"><span className="font-medium text-sm">{l.user}</span><Badge variant="outline" className="text-[10px] h-5">{l.action}</Badge><span className="text-sm">{l.target}</span></div><p className="text-sm text-muted-foreground mt-0.5">{l.detail}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">{l.timestamp}</p><Badge variant="outline" className={`text-[10px] mt-1 ${l.result === 'success' ? 'text-emerald-400 border-emerald-500/20' : 'text-red-400 border-red-500/20'}`}>{l.result === 'success' ? '成功' : '失败'}</Badge></div></div>))}</div></Card>
      )}
    </div>
  );
}

// ==================== BIG SCREEN PAGE ====================
function BigScreenPage({ devices, onExit }: { devices: Device[]; onExit: () => void }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const onlineCount = devices.filter(d => d.pingStatus === 'up').length;
  const offlineCount = devices.filter(d => d.pingStatus === 'down').length;
  const formatTime = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  const health = devices.length > 0 ? Math.round((onlineCount / devices.length) * 100) : 100;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="flex items-center justify-between px-8 py-4 border-b border-border/50">
        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center"><EthernetPort className="h-5 w-5 text-primary-foreground" /></div><div><h1 className="text-xl font-bold tracking-tight">NetviewOne 网络监控大屏</h1></div></div>
        <div className="flex items-center gap-6"><p className="text-2xl font-bold tabular-nums tracking-wider">{formatTime(now)}</p><Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={onExit}><Fullscreen className="h-5 w-5" /></Button></div>
      </div>
      <div className="flex-1 p-6 grid grid-cols-12 gap-5 overflow-auto">
        <div className="col-span-3 space-y-5">
          {[{ l: '设备总数', v: devices.length, c: 'from-blue-500/20 to-blue-600/5 border-blue-500/20' }, { l: 'PING正常', v: onlineCount, c: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20' }, { l: 'PING不通', v: offlineCount, c: 'from-red-500/20 to-red-600/5 border-red-500/20' }].map(s => (
            <div key={s.l} className={`p-5 rounded-2xl bg-gradient-to-br ${s.c} border`}><p className="text-sm text-muted-foreground">{s.l}</p><p className="text-4xl font-bold mt-1 tabular-nums">{s.v}</p></div>
          ))}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-3">网络健康度</p>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20"><svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36"><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="3" /><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className={health >= 90 ? 'text-emerald-400' : 'text-amber-400'} strokeWidth="3" strokeDasharray={`${health}, 100`} strokeLinecap="round" /></svg><span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{health}%</span></div>
              <div className="text-sm text-muted-foreground">{health >= 90 ? '网络正常' : '存在告警'}</div>
            </div>
          </div>
        </div>
        <div className="col-span-6 space-y-5">
          <Card className="border-0 shadow-sm flex-1"><CardContent className="p-6"><h3 className="font-semibold mb-4">网络拓扑</h3>
            {devices.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">暂无设备数据</p> : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 text-xs text-muted-foreground"><Wifi className="h-3 w-3" /> 互联网</div>
                {devices.filter(d => ['core-switch', 'firewall', 'router'].includes(d.type)).length > 0 && (<><div className="h-6 w-px bg-border" /><div className="flex gap-2 flex-wrap justify-center">{devices.filter(d => ['core-switch', 'firewall', 'router'].includes(d.type)).map(d => (<div key={d.id} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${d.type === 'firewall' ? 'bg-orange-500/10 text-orange-400' : 'bg-primary/10 text-primary'}`}>{d.name}</div>))}</div></>)}
                {devices.filter(d => d.type === 'aggregation-switch').length > 0 && (<><div className="h-6 w-px bg-border" /><div className="flex gap-2 flex-wrap justify-center">{devices.filter(d => d.type === 'aggregation-switch').map(d => (<div key={d.id} className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 font-medium text-xs">{d.name}</div>))}</div></>)}
                {devices.filter(d => ['access-switch', 'ap'].includes(d.type)).length > 0 && (<><div className="h-6 w-px bg-border" /><div className="flex gap-1 flex-wrap justify-center max-w-lg">{devices.filter(d => ['access-switch', 'ap'].includes(d.type)).map(d => (<div key={d.id} className={`px-2 py-1 rounded-lg text-xs font-medium ${d.pingStatus === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{d.name}</div>))}</div></>)}
              </div>
            )}
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-6"><h3 className="font-semibold mb-4">资源占用 Top5</h3>
            {devices.length === 0 ? <p className="text-muted-foreground text-sm text-center py-4">暂无数据</p> : (
              <div className="space-y-3">{[...devices].sort((a, b) => b.cpu - a.cpu).slice(0, 5).map(d => (<div key={d.id} className="space-y-1"><div className="flex items-center justify-between text-sm"><span className="font-medium truncate">{d.name}</span><span className={d.cpu >= 80 ? 'text-amber-400 font-medium' : 'text-muted-foreground'}>{d.cpu}%</span></div><div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${d.cpu >= 80 ? 'bg-amber-400' : 'bg-primary'}`} style={{ width: `${d.cpu}%` }} /></div></div>))}</div>
            )}
          </CardContent></Card>
        </div>
        <div className="col-span-3 space-y-5">
          <Card className="border-0 shadow-sm"><CardContent className="p-5"><h3 className="font-semibold mb-3">关键指标</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-muted/60"><p className="text-lg font-bold">{devices.filter(d => d.snmpEnabled).length}</p><p className="text-[10px] text-muted-foreground">SNMP采集</p></div>
              <div className="text-center p-3 rounded-xl bg-muted/60"><p className="text-lg font-bold">{devices.reduce((a, d) => a + d.ports.filter(p => p.status === 'up').length, 0)}</p><p className="text-[10px] text-muted-foreground">活跃端口</p></div>
            </div>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}

// ==================== USERS PAGE ====================
function UsersPage({ users, onAddUser }: { users: User[]; onAddUser: (u: User) => void }) {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', department: '', phone: '', email: '', password: '', role: 'viewer' as User['role'] });
  const [error, setError] = useState('');
  const roleMap = { admin: { label: '管理员', c: 'bg-primary/15 text-primary border-primary/20' }, operator: { label: '操作员', c: 'bg-violet-500/15 text-violet-400 border-violet-500/20' }, viewer: { label: '只读', c: 'bg-muted text-muted-foreground border-border' } };
  const filtered = users.filter(u => !search || u.name.includes(search) || u.department.includes(search) || u.phone.includes(search));
  const sf = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  const handleAdd = () => {
    if (!form.name || !form.department || !form.phone || !form.email || !form.password) { setError('请填写所有必填项'); return; }
    if (form.password.length < 6) { setError('密码至少6位'); return; }
    onAddUser({ id: `u-${Date.now()}`, name: form.name, department: form.department, phone: form.phone, email: form.email, role: form.role, status: 'active', lastLogin: '—', password: form.password });
    setAddOpen(false);
    setForm({ name: '', department: '', phone: '', email: '', password: '', role: 'viewer' });
    setError('');
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold tracking-tight">人员管理</h1><p className="text-sm text-muted-foreground mt-1">管理平台使用人员与权限</p></div><Button className="gap-2 rounded-xl" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />新增人员</Button></div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="搜索姓名、部门或电话..." className="pl-9 rounded-xl" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="grid grid-cols-3 gap-5 stagger-children">
        {filtered.map(user => (<Card key={user.id} className="border-0 shadow-sm apple-card"><CardContent className="p-5"><div className="flex items-start gap-4"><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">{user.name[0]}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="font-semibold">{user.name}</span><span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleMap[user.role].c}`}>{roleMap[user.role].label}</span></div><div className="mt-2 space-y-1.5 text-xs text-muted-foreground"><div className="flex items-center gap-1.5"><Building2 className="h-3 w-3" />{user.department}</div><div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{user.phone}</div><div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{user.email}</div></div></div></div><div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground"><span>上次登录: {user.lastLogin}</span><span className={user.status === 'active' ? 'text-emerald-400' : 'text-red-400'}>{user.status === 'active' ? '启用' : '禁用'}</span></div></CardContent></Card>))}
      </div>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>新增人员</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            {[{ l: '姓名', k: 'name', p: '请输入姓名' }, { l: '部门', k: 'department', p: '请输入部门' }, { l: '手机号', k: 'phone', p: '请输入手机号' }, { l: '邮箱', k: 'email', p: '请输入邮箱' }, { l: '密码', k: 'password', p: '至少6位' }].map(i => (
              <div key={i.k} className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">{i.l} <span className="text-red-400">*</span></label><Input className="col-span-3" type={i.k === 'password' ? 'password' : 'text'} placeholder={i.p} value={form[i.k as keyof typeof form]} onChange={e => sf(i.k, e.target.value)} /></div>
            ))}
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">角色</label><Select value={form.role} onValueChange={v => sf('role', v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="viewer">只读</SelectItem><SelectItem value="operator">操作员</SelectItem><SelectItem value="admin">管理员</SelectItem></SelectContent></Select></div>
          </div>
          {error && <p className="text-sm text-red-400 text-center -mt-2">{error}</p>}
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button><Button onClick={handleAdd}>确认新增</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== ALERT PAGE ====================
const ALERT_TYPE_MAP: Record<AlertRule['type'], { label: string; icon: React.ReactNode }> = {
  'cpu': { label: 'CPU告警', icon: <Cpu className="h-3.5 w-3.5" /> },
  'memory': { label: '内存告警', icon: <HardDrive className="h-3.5 w-3.5" /> },
  'interface-down': { label: '端口Down', icon: <Plug className="h-3.5 w-3.5" /> },
  'device-offline': { label: '设备离线', icon: <X className="h-3.5 w-3.5" /> },
  'fan-error': { label: '风扇告警', icon: <Fan className="h-3.5 w-3.5" /> },
  'custom': { label: '自定义', icon: <Zap className="h-3.5 w-3.5" /> },
};
const SEVERITY_MAP: Record<AlertRecord['severity'], { label: string; c: string }> = {
  critical: { label: '紧急', c: 'bg-red-500/15 text-red-400 border-red-500/20' },
  major: { label: '重要', c: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  minor: { label: '次要', c: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  info: { label: '提示', c: 'bg-muted text-muted-foreground border-border' },
};

function AlertPage({ devices, rules, onAddRule, onEditRule, onDeleteRule, records, onAckRecord, onDeleteRecord, wecomWebhook, onSetWecomWebhook, onPushWecom, onSimulateAlert, emailConfig, onSetEmailConfig, onPushEmail }: {
  devices: Device[]; rules: AlertRule[]; onAddRule: (r: AlertRule) => void; onEditRule: (r: AlertRule) => void; onDeleteRule: (id: string) => void;
  records: AlertRecord[]; onAckRecord: (id: string) => void; onDeleteRecord: (id: string) => void;
  wecomWebhook: string; onSetWecomWebhook: (v: string) => void; onPushWecom: (record: AlertRecord) => void;
  onSimulateAlert: (severity: AlertRecord['severity'], ruleName: string, deviceName: string, message: string) => void;
  emailConfig: { smtp: string; port: string; sender: string; password: string; receivers: string }; onSetEmailConfig: (c: { smtp: string; port: string; sender: string; password: string; receivers: string }) => void;
  onPushEmail: (record: AlertRecord) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editRule, setEditRule] = useState<AlertRule | null>(null);
  const [form, setForm] = useState({ name: '', type: 'cpu' as AlertRule['type'], operator: '>' as AlertRule['operator'], threshold: '80', severity: 'major' as AlertRule['severity'], deviceIdsStr: '', webhookEnabled: false, description: '' });
  const sf = (k: string, v: string | boolean) => { setForm(p => ({ ...p, [k]: v })); };

  const resetForm = () => setForm({ name: '', type: 'cpu', operator: '>', threshold: '80', severity: 'major', deviceIdsStr: '', webhookEnabled: false, description: '' });

  const openEdit = (r: AlertRule) => {
    setForm({ name: r.name, type: r.type, operator: r.operator, threshold: String(r.threshold), severity: r.severity, deviceIdsStr: r.deviceIds.join(','), webhookEnabled: r.webhookEnabled, description: r.description });
    setEditRule(r);
  };

  const buildRule = (id: string): AlertRule => ({
    id, name: form.name, type: form.type, metric: ALERT_TYPE_MAP[form.type].label,
    operator: form.operator, threshold: parseFloat(form.threshold) || 80, severity: form.severity,
    deviceIds: form.deviceIdsStr ? form.deviceIdsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
    enabled: true, webhookEnabled: form.webhookEnabled, description: form.description,
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  });

  const handleAdd = () => {
    if (!form.name) return;
    onAddRule(buildRule(`ar-${Date.now()}`));
    setAddOpen(false); resetForm();
  };
  const handleEdit = () => {
    if (!editRule || !form.name) return;
    onEditRule({ ...buildRule(editRule.id), enabled: editRule.enabled, createdAt: editRule.createdAt, lastTriggered: editRule.lastTriggered });
    setEditRule(null); resetForm();
  };

  const toggleEnabled = (r: AlertRule) => {
    onEditRule({ ...r, enabled: !r.enabled });
  };

  const closeRuleDialog = () => { setAddOpen(false); setEditRule(null); resetForm(); };

  const getDeviceName = (id: string) => devices.find(d => d.id === id)?.name || id;

  const [wecomEdit, setWecomEdit] = useState(false);
  const [wecomInput, setWecomInput] = useState(wecomWebhook);

  // Simulate alert state
  const [simOpen, setSimOpen] = useState(false);
  const [simForm, setSimForm] = useState({ severity: 'major' as AlertRecord['severity'], ruleName: '模拟告警', deviceName: '测试设备', message: '这是一条模拟告警，用于验证推送通道是否正常' });

  // Push channel selection dialog
  const [pushRecord, setPushRecord] = useState<AlertRecord | null>(null);

  // Email config editing
  const [emailEdit, setEmailEdit] = useState(false);
  const [emailInput, setEmailInput] = useState(emailConfig);

  return (
    <div className="space-y-6 fade-in">
      <div><h1 className="text-2xl font-bold tracking-tight">告警管理</h1><p className="text-sm text-muted-foreground mt-1">管理告警规则、告警记录与告警推送</p></div>

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList className="bg-muted/60 rounded-xl">
          <TabsTrigger value="rules" className="rounded-lg gap-2"><Bell className="h-3.5 w-3.5" />告警规则</TabsTrigger>
          <TabsTrigger value="records" className="rounded-lg gap-2"><AlertTriangle className="h-3.5 w-3.5" />告警记录</TabsTrigger>
          <TabsTrigger value="push" className="rounded-lg gap-2"><Send className="h-3.5 w-3.5" />告警推送</TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">共 {rules.length} 条规则</p><Button className="gap-2 rounded-xl" onClick={() => { resetForm(); setAddOpen(true); }}><Plus className="h-4 w-4" />新增规则</Button></div>
          {rules.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-muted-foreground"><Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" /><p>暂无告警规则</p><p className="text-xs mt-1">点击新增规则创建第一条告警</p></CardContent></Card>
          ) : (
            <Card className="border-0 shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b border-border"><th className="text-left p-4 font-medium text-muted-foreground">规则名称</th><th className="text-left p-4 font-medium text-muted-foreground">类型</th><th className="text-left p-4 font-medium text-muted-foreground">条件</th><th className="text-left p-4 font-medium text-muted-foreground">级别</th><th className="text-left p-4 font-medium text-muted-foreground">关联设备</th><th className="text-left p-4 font-medium text-muted-foreground">告警推送</th><th className="text-left p-4 font-medium text-muted-foreground">状态</th><th className="text-right p-4 font-medium text-muted-foreground">操作</th></tr></thead>
              <tbody>{rules.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{r.name}</td>
                  <td className="p-4"><div className="flex items-center gap-1.5">{ALERT_TYPE_MAP[r.type].icon}{ALERT_TYPE_MAP[r.type].label}</div></td>
                  <td className="p-4 font-mono text-xs">{r.operator} {r.threshold}{r.type === 'cpu' || r.type === 'memory' ? '%' : ''}</td>
                  <td className="p-4"><Badge variant="outline" className={`text-[10px] ${SEVERITY_MAP[r.severity].c}`}>{SEVERITY_MAP[r.severity].label}</Badge></td>
                  <td className="p-4 text-xs text-muted-foreground">{r.deviceIds.length > 0 ? r.deviceIds.map(getDeviceName).join(', ') : '全部设备'}</td>
                  <td className="p-4">{r.webhookEnabled ? <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/20">已启用</Badge> : <span className="text-xs text-muted-foreground">未启用</span>}</td>
                  <td className="p-4"><button onClick={() => toggleEnabled(r)} className={`flex items-center gap-2 text-sm ${r.enabled ? 'text-emerald-400' : 'text-muted-foreground'}`}>{r.enabled ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}{r.enabled ? '已启用' : '已禁用'}</button></td>
                  <td className="p-4 text-right"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500" onClick={() => onDeleteRule(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
                </tr>
              ))}</tbody>
            </table></div></Card>
          )}
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">共 {records.length} 条记录</p><Button variant="outline" className="gap-2 rounded-xl" onClick={() => setSimOpen(true)}><Zap className="h-4 w-4" />模拟告警</Button></div>
          {records.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-muted-foreground"><AlertTriangle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" /><p>暂无告警记录</p><p className="text-xs mt-1">当告警规则被触发时，记录将出现在这里</p></CardContent></Card>
          ) : (
            <Card className="border-0 shadow-sm"><div className="divide-y divide-border/50">{records.map(r => (
              <div key={r.id} className="flex items-center gap-4 p-4">
                <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${SEVERITY_MAP[r.severity].c}`}>{SEVERITY_MAP[r.severity].label}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-medium text-sm">{r.ruleName}</span><span className="text-xs text-muted-foreground">—</span><span className="text-sm">{r.deviceName}</span>{r.ruleId === 'simulated' && <Badge variant="secondary" className="text-[10px] h-4 ml-1">模拟</Badge>}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.message}</p>
                </div>
                <div className="flex-shrink-0 text-right space-y-1">
                  <p className="text-xs text-muted-foreground">{r.timestamp}</p>
                  <div className="flex items-center gap-2 justify-end">
                    <Badge variant="outline" className={`text-[10px] ${r.status === 'firing' ? 'text-red-400 border-red-500/20' : r.status === 'acknowledged' ? 'text-amber-400 border-amber-500/20' : 'text-emerald-400 border-emerald-500/20'}`}>{r.status === 'firing' ? '告警中' : r.status === 'acknowledged' ? '已确认' : '已恢复'}</Badge>
                    {r.pushedToWecom && <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/20">已推送</Badge>}
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                  {r.status === 'firing' && <Button variant="ghost" size="sm" className="rounded-xl text-xs h-7" onClick={() => onAckRecord(r.id)}>确认</Button>}
                  {!r.pushedToWecom && <Button variant="ghost" size="sm" className="rounded-xl text-xs h-7 gap-1" onClick={() => setPushRecord(r)}><Send className="h-3 w-3" />推送</Button>}
                  {r.ruleId === 'simulated' && <Button variant="ghost" size="sm" className="rounded-xl text-xs h-7 text-red-400 hover:text-red-500 gap-1" onClick={() => onDeleteRecord(r.id)}><Trash2 className="h-3 w-3" />删除</Button>}
                </div>
              </div>
            ))}</div></Card>
          )}
        </TabsContent>

        {/* Push Tab (企微 + 邮件) */}
        <TabsContent value="push" className="space-y-4">
          <Tabs defaultValue="wecom" className="space-y-4">
            <TabsList className="bg-muted/60 rounded-xl">
              <TabsTrigger value="wecom" className="rounded-lg gap-2"><Send className="h-3.5 w-3.5" />企微推送</TabsTrigger>
              <TabsTrigger value="email" className="rounded-lg gap-2"><Mail className="h-3.5 w-3.5" />邮件推送</TabsTrigger>
            </TabsList>

            {/* WeCom Push */}
            <TabsContent value="wecom" className="space-y-4">
              <Card className="border-0 shadow-sm"><CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-3"><Send className="h-5 w-5 text-emerald-400" /><h3 className="font-semibold">企业微信机器人推送</h3></div>
                <p className="text-sm text-muted-foreground">配置企业微信群机器人 Webhook 地址，告警触发时自动推送消息到群聊。</p>
                <div className="space-y-3">
                  <div><label className="text-sm font-medium">Webhook 地址</label>
                    {wecomEdit ? (
                      <div className="flex gap-2 mt-1.5"><Input className="rounded-xl flex-1" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." value={wecomInput} onChange={e => setWecomInput(e.target.value)} /><Button className="rounded-xl" onClick={() => { onSetWecomWebhook(wecomInput); setWecomEdit(false); }}>保存</Button><Button variant="outline" className="rounded-xl" onClick={() => { setWecomEdit(false); setWecomInput(wecomWebhook); }}>取消</Button></div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1.5"><Input className="rounded-xl flex-1" value={wecomWebhook || '未配置'} disabled /><Button variant="outline" className="rounded-xl" onClick={() => setWecomEdit(true)}>编辑</Button></div>
                    )}
                  </div>
                  <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${wecomWebhook ? 'bg-emerald-400' : 'bg-muted-foreground'}`} /><span className="text-sm text-muted-foreground">{wecomWebhook ? '已配置' : '未配置，将无法推送告警消息'}</span></div>
                </div>
              </CardContent></Card>
              <Card className="border-0 shadow-sm"><CardContent className="p-6 space-y-4">
                <h4 className="font-semibold">推送说明</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>1. 在企业微信群聊中添加「机器人」，获取 Webhook 地址</p>
                  <p>2. 将 Webhook 地址粘贴到上方输入框并保存</p>
                  <p>3. 在告警规则中勾选「启用告警推送」，告警触发时自动推送</p>
                  <p>4. 也可在告警记录中手动点击「推送」按钮发送指定告警</p>
                </div>
                <p className="text-xs text-muted-foreground">推送消息格式：包含告警级别、规则名称、关联设备、告警描述和触发时间。</p>
              </CardContent></Card>
            </TabsContent>

            {/* Email Push */}
            <TabsContent value="email" className="space-y-4">
              <Card className="border-0 shadow-sm"><CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-blue-400" /><h3 className="font-semibold">邮件推送</h3></div>
                <p className="text-sm text-muted-foreground">配置 SMTP 邮件服务器，告警触发时自动发送告警邮件到指定收件人。</p>
                <div className="space-y-3">
                  <div><label className="text-sm font-medium">SMTP 服务器</label>
                    {emailEdit ? (
                      <div className="space-y-2 mt-1.5">
                        <Input className="rounded-xl" placeholder="smtp.example.com" value={emailInput.smtp} onChange={e => setEmailInput(p => ({ ...p, smtp: e.target.value }))} />
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="text-xs text-muted-foreground">端口</label><Input className="rounded-xl mt-1" placeholder="465" value={emailInput.port} onChange={e => setEmailInput(p => ({ ...p, port: e.target.value }))} /></div>
                          <div><label className="text-xs text-muted-foreground">加密</label><Input className="rounded-xl mt-1" value={emailInput.port === '465' ? 'SSL/TLS' : 'STARTTLS'} disabled /></div>
                        </div>
                        <div><label className="text-xs text-muted-foreground">发件人地址</label><Input className="rounded-xl mt-1" placeholder="alert@example.com" value={emailInput.sender} onChange={e => setEmailInput(p => ({ ...p, sender: e.target.value }))} /></div>
                        <div><label className="text-xs text-muted-foreground">授权码/密码</label><Input className="rounded-xl mt-1" type="password" placeholder="SMTP授权码" value={emailInput.password} onChange={e => setEmailInput(p => ({ ...p, password: e.target.value }))} /></div>
                        <div><label className="text-xs text-muted-foreground">收件人（多个用逗号分隔）</label><Input className="rounded-xl mt-1" placeholder="admin@example.com, ops@example.com" value={emailInput.receivers} onChange={e => setEmailInput(p => ({ ...p, receivers: e.target.value }))} /></div>
                        <div className="flex gap-2 pt-2"><Button className="rounded-xl" onClick={() => { onSetEmailConfig(emailInput); setEmailEdit(false); }}>保存</Button><Button variant="outline" className="rounded-xl" onClick={() => { setEmailEdit(false); setEmailInput(emailConfig); }}>取消</Button></div>
                      </div>
                    ) : (
                      <div className="space-y-2 mt-1.5">
                        <div className="flex items-center gap-2"><Input className="rounded-xl flex-1" value={emailConfig.smtp ? `${emailConfig.smtp}:${emailConfig.port}` : '未配置'} disabled /><Button variant="outline" className="rounded-xl" onClick={() => setEmailEdit(true)}>编辑</Button></div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${emailConfig.smtp ? 'bg-emerald-400' : 'bg-muted-foreground'}`} /><span className="text-sm text-muted-foreground">{emailConfig.smtp ? `已配置 · 发件人: ${emailConfig.sender}` : '未配置，将无法发送告警邮件'}</span></div>
                  {emailConfig.receivers && <div className="text-xs text-muted-foreground">收件人: {emailConfig.receivers}</div>}
                </div>
              </CardContent></Card>
              <Card className="border-0 shadow-sm"><CardContent className="p-6 space-y-4">
                <h4 className="font-semibold">邮件推送说明</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>1. 填写 SMTP 服务器地址（如 smtp.qq.com:465）和授权码</p>
                  <p>2. 填写发件人邮箱和收件人地址（多个用逗号分隔）</p>
                  <p>3. 保存后，告警触发时将自动发送告警邮件</p>
                  <p>4. 使用「模拟告警」功能可快速验证邮件通道是否正常</p>
                </div>
                <p className="text-xs text-muted-foreground">邮件内容：包含告警级别、规则名称、关联设备、告警描述和触发时间。</p>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Simulate Alert Dialog */}
      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>模拟告警</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">自定义告警内容并发送到告警记录，用于测试企微/邮件推送通道是否正常。</p>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">告警级别</label><Select value={simForm.severity} onValueChange={v => setSimForm(p => ({ ...p, severity: v as AlertRecord['severity'] }))}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="critical">紧急</SelectItem><SelectItem value="major">重要</SelectItem><SelectItem value="minor">次要</SelectItem><SelectItem value="info">提示</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">规则名称</label><Input className="col-span-3" value={simForm.ruleName} onChange={e => setSimForm(p => ({ ...p, ruleName: e.target.value }))} placeholder="如：CPU使用率告警" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">设备名称</label><Input className="col-span-3" value={simForm.deviceName} onChange={e => setSimForm(p => ({ ...p, deviceName: e.target.value }))} placeholder="如：核心交换机-A" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">告警内容</label><Input className="col-span-3" value={simForm.message} onChange={e => setSimForm(p => ({ ...p, message: e.target.value }))} placeholder="如：CPU使用率超过90%" /></div>
          </div>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setSimOpen(false)}>取消</Button><Button onClick={() => { onSimulateAlert(simForm.severity, simForm.ruleName, simForm.deviceName, simForm.message); setSimOpen(false); }}>发送模拟告警</Button></div>
        </DialogContent>
      </Dialog>

      {/* Push Channel Selection Dialog */}
      <Dialog open={pushRecord !== null} onOpenChange={v => { if (!v) setPushRecord(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>选择推送通道</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">请选择推送方式，将此告警发送到对应通道。</p>
          <div className="grid gap-3 py-2">
            <Button className="rounded-xl gap-2 h-12 justify-center" onClick={() => { if (pushRecord) { onPushWecom(pushRecord); setPushRecord(null); } }}>
              <Send className="h-4 w-4" />企业微信推送
            </Button>
            <Button variant="outline" className="rounded-xl gap-2 h-12 justify-center" onClick={() => { if (pushRecord) { onPushEmail(pushRecord); setPushRecord(null); } }}>
              <Mail className="h-4 w-4" />邮件推送
            </Button>
          </div>
          <div className="flex justify-end"><Button variant="ghost" onClick={() => setPushRecord(null)}>取消</Button></div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={addOpen || !!editRule} onOpenChange={v => { if (!v) closeRuleDialog(); }}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRule ? '编辑告警规则' : '新增告警规则'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">规则名称 <span className="text-red-400">*</span></label><Input className="col-span-3" placeholder="如 CPU使用率告警" value={form.name} onChange={e => sf('name', e.target.value)} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">告警类型</label><Select value={form.type} onValueChange={v => sf('type', v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ALERT_TYPE_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">比较运算符</label><Select value={form.operator} onValueChange={v => sf('operator', v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value=">">&gt; 大于</SelectItem><SelectItem value=">=">&gt;= 大于等于</SelectItem><SelectItem value="<">&lt; 小于</SelectItem><SelectItem value="<=">&lt;= 小于等于</SelectItem><SelectItem value="==">== 等于</SelectItem><SelectItem value="!=">!= 不等于</SelectItem><SelectItem value="down">down 端口Down</SelectItem><SelectItem value="offline">offline 离线</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">阈值</label><Input className="col-span-3" type="number" value={form.threshold} onChange={e => sf('threshold', e.target.value)} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">告警级别</label><Select value={form.severity} onValueChange={v => sf('severity', v)}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="critical">紧急</SelectItem><SelectItem value="major">重要</SelectItem><SelectItem value="minor">次要</SelectItem><SelectItem value="info">提示</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">关联设备</label>
              <Select value={form.deviceIdsStr ? form.deviceIdsStr.split(',')[0] : 'all'} onValueChange={v => { if (v === 'all') sf('deviceIdsStr', ''); else sf('deviceIdsStr', form.deviceIdsStr ? [...new Set([...form.deviceIdsStr.split(','), v])].join(',') : v); }}><SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部设备</SelectItem>{devices.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">告警推送</label><button className={`col-span-3 flex items-center gap-2 text-sm ${form.webhookEnabled ? 'text-emerald-400' : 'text-muted-foreground'}`} onClick={() => sf('webhookEnabled', !form.webhookEnabled)}>{form.webhookEnabled ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}{form.webhookEnabled ? '已启用' : '已禁用'}</button></div>
            <div className="grid grid-cols-4 items-center gap-4"><label className="text-right text-sm font-medium">描述</label><Input className="col-span-3" placeholder="可选描述" value={form.description} onChange={e => sf('description', e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => { setAddOpen(false); setEditRule(null); resetForm(); }}>取消</Button><Button onClick={editRule ? handleEdit : handleAdd}>{editRule ? '保存修改' : '确认新增'}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== DEBUG PAGE ====================
interface DebugResult {
  id: string;
  type: 'ping' | 'telnet';
  target: string;
  port?: string;
  success: boolean;
  output: string;
  duration: string;
  timestamp: string;
}

function DebugPage({ devices }: { devices: Device[] }) {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [pingHost, setPingHost] = useState('');
  const [pingCount, setPingCount] = useState('4');
  const [telnetHost, setTelnetHost] = useState('');
  const [telnetPort, setTelnetPort] = useState('');
  const [telnetTimeout, setTelnetTimeout] = useState('5');
  const [loading, setLoading] = useState(false);



  const runPing = async () => {
    if (!pingHost.trim() || loading) return;
    setLoading(true);
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE}/api/ping`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: pingHost.trim(), count: parseInt(pingCount) || 4 }),
      });
      const data = await res.json();
      const dur = ((Date.now() - start) / 1000).toFixed(1);
      const r: DebugResult = {
        id: `dbg-${Date.now()}`, type: 'ping', target: pingHost.trim(),
        success: data.success, output: data.output || '', duration: `${dur}s`,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      setResults(prev => [r, ...prev]);
    } catch {
      const r: DebugResult = {
        id: `dbg-${Date.now()}`, type: 'ping', target: pingHost.trim(),
        success: false, output: '请求失败：无法连接到服务器API，请确认后端服务正常运行', duration: '—',
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      setResults(prev => [r, ...prev]);
    }
    setLoading(false);
  };

  const runTelnet = async () => {
    if (!telnetHost.trim() || !telnetPort.trim() || loading) return;
    setLoading(true);
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE}/api/telnet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: telnetHost.trim(), port: parseInt(telnetPort) || 80, timeout: parseInt(telnetTimeout) || 5 }),
      });
      const data = await res.json();
      const dur = ((Date.now() - start) / 1000).toFixed(1);
      const r: DebugResult = {
        id: `dbg-${Date.now()}`, type: 'telnet', target: telnetHost.trim(), port: telnetPort.trim(),
        success: data.success, output: data.output || '', duration: `${dur}s`,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      setResults(prev => [r, ...prev]);
    } catch {
      const r: DebugResult = {
        id: `dbg-${Date.now()}`, type: 'telnet', target: telnetHost.trim(), port: telnetPort.trim(),
        success: false, output: '请求失败：无法连接到服务器API，请确认后端服务正常运行', duration: '—',
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };
      setResults(prev => [r, ...prev]);
    }
    setLoading(false);
  };

  const clearResults = () => { setResults([]); };

  const fillFromDevice = (type: 'ping' | 'telnet') => {
    if (devices.length === 0) return;
    // Quick fill from first device
    const d = devices[0];
    if (type === 'ping') setPingHost(d.ip);
    else { setTelnetHost(d.ip); setTelnetPort(String(d.sshPort)); }
  };

  return (
    <div className="space-y-6 fade-in">
      <div><h1 className="text-2xl font-bold tracking-tight">网络调试</h1><p className="text-sm text-muted-foreground mt-1">Ping连通性测试与端口Telnet检测</p></div>

      <div className="grid grid-cols-2 gap-5">
        {/* Ping Card */}
        <Card className="border-0 shadow-sm apple-card">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10"><Wifi className="h-5 w-5 text-blue-400" /></div>
              <div><h3 className="font-semibold">Ping 测试</h3><p className="text-xs text-muted-foreground">测试目标IP的网络连通性</p></div>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">目标地址</label><Input className="mt-1.5 rounded-xl" placeholder="如 10.0.10.1 或 example.com" value={pingHost} onChange={e => setPingHost(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') runPing(); }} /></div>
              <div><label className="text-sm font-medium">Ping 次数</label><Input className="mt-1.5 rounded-xl" type="number" min="1" max="20" value={pingCount} onChange={e => setPingCount(e.target.value)} /></div>
              {devices.length > 0 && <div className="flex gap-1.5 flex-wrap">{devices.slice(0, 5).map(d => (<button key={d.id} className="text-[10px] px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all" onClick={() => setPingHost(d.ip)}>{d.name}</button>))}</div>}
            </div>
            <Button className="w-full rounded-xl gap-2" onClick={runPing} disabled={loading || !pingHost.trim()}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}执行 Ping
            </Button>
          </CardContent>
        </Card>

        {/* Telnet Card */}
        <Card className="border-0 shadow-sm apple-card">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10"><Plug className="h-5 w-5 text-violet-400" /></div>
              <div><h3 className="font-semibold">Telnet 端口检测</h3><p className="text-xs text-muted-foreground">检测目标IP的指定端口是否可达</p></div>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">目标地址</label><Input className="mt-1.5 rounded-xl" placeholder="如 10.0.10.1" value={telnetHost} onChange={e => setTelnetHost(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') runTelnet(); }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">端口</label><Input className="mt-1.5 rounded-xl" type="number" placeholder="如 22" value={telnetPort} onChange={e => setTelnetPort(e.target.value)} /></div>
                <div><label className="text-sm font-medium">超时(秒)</label><Input className="mt-1.5 rounded-xl" type="number" min="1" max="30" value={telnetTimeout} onChange={e => setTelnetTimeout(e.target.value)} /></div>
              </div>
              {devices.length > 0 && <div className="flex gap-1.5 flex-wrap">{devices.slice(0, 5).map(d => (<button key={d.id} className="text-[10px] px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all" onClick={() => { setTelnetHost(d.ip); setTelnetPort(String(d.sshPort)); }}>{d.name}:{d.sshPort}</button>))}</div>}
            </div>
            <Button className="w-full rounded-xl gap-2" onClick={runTelnet} disabled={loading || !telnetHost.trim() || !telnetPort.trim()}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}执行 Telnet
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><h2 className="text-lg font-semibold tracking-tight">测试记录</h2><Badge variant="outline" className="text-[10px]">{results.length}</Badge></div>
          {results.length > 0 && <Button variant="ghost" size="sm" className="text-xs text-red-400 hover:text-red-500" onClick={clearResults}>清空记录</Button>}
        </div>
        {results.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-muted-foreground"><Wrench className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" /><p>暂无调试记录</p><p className="text-xs mt-1">执行 Ping 或 Telnet 测试后，结果将显示在这里</p></CardContent></Card>
        ) : (
          <div className="space-y-3 stagger-children">
            {results.map(r => (
              <Card key={r.id} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${r.type === 'ping' ? 'bg-blue-500/10' : 'bg-violet-500/10'}`}>
                        {r.type === 'ping' ? <Wifi className="h-4 w-4 text-blue-400" /> : <Plug className="h-4 w-4 text-violet-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{r.type === 'ping' ? 'Ping' : 'Telnet'}</span>
                          <span className="font-mono text-sm">{r.target}{r.port ? `:${r.port}` : ''}</span>
                          <Badge variant="outline" className={`text-[10px] ${r.success ? 'text-emerald-400 border-emerald-500/20' : 'text-red-400 border-red-500/20'}`}>{r.success ? '成功' : '失败'}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{r.timestamp}</span>
                          <span>耗时 {r.duration}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <pre className="text-xs bg-[#0d1117] text-emerald-400/90 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap terminal-output max-h-60 overflow-y-auto">{r.output}</pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================
export default function App() {
  const [page, setPage] = useState<Page>(() => (sessionStorage.getItem('netviewone_page') as Page) || 'login');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [monitorDeviceId, setMonitorDeviceId] = useState<string | null>(null);
  const [deviceStatusFilter, setDeviceStatusFilter] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [users, setUsers] = useState<User[]>([DEFAULT_ADMIN]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => { try { const s = sessionStorage.getItem('netviewone_user'); return s ? JSON.parse(s) : null; } catch { return null; } });
  const [groups] = useState<DeviceGroup[]>([]);
  const [logs] = useState<AuditLog[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertRecords, setAlertRecords] = useState<AlertRecord[]>([]);
  const [wecomWebhook, setWecomWebhook] = useState<string>('');
  const [emailConfig, setEmailConfig] = useState<{ smtp: string; port: string; sender: string; password: string; receivers: string }>({ smtp: '', port: '465', sender: '', password: '', receivers: '' });
  const [bigScreen, setBigScreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lang, setLang] = useState('zh');

  // Monitor settings
  const [monitorSettings, setMonitorSettings] = useState({ pingEnabled: true, pingInterval: 60, snmpEnabled: true, snmpInterval: 120 });
  const [templates, setTemplates] = useState<OidTemplate[]>([]);
  const [monitorMenuOpen, setMonitorMenuOpen] = useState(true);

  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);

  // ==================== API Helper ====================
  const _apiPost = (path: string, body: any) => fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const _apiGet = (path: string) => fetch(`${API_BASE}${path}`).then(r => r.json());
  const _apiDel = (path: string) => fetch(`${API_BASE}${path}`, { method: 'DELETE' });

  // ==================== Load data from API on mount ====================
  useEffect(() => {
    const loadData = async () => {
      try {
        const [devs, usrs, rules, records, settings, tplData] = await Promise.all([
          _apiGet('/api/devices').catch(() => []),
          _apiGet('/api/users').catch(() => []),
          _apiGet('/api/alert-rules').catch(() => []),
          _apiGet('/api/alert-records').catch(() => []),
          _apiGet('/api/settings').catch(() => ({})),
          _apiGet('/api/templates').catch(() => []),
        ]);

        // Handle devices: migrate old status field
        const normalizedDevices = (Array.isArray(devs) ? devs : []).map((d: any) => {
          if (!d.pingStatus) {
            if (d.status === 'online') { d.pingStatus = 'up'; d.snmpStatus = 'up'; }
            else if (d.status === 'warning') { d.pingStatus = 'up'; d.snmpStatus = 'down'; }
            else { d.pingStatus = 'down'; d.snmpStatus = 'disabled'; }
            delete d.status;
          }
          return d as Device;
        });
        setDevices(normalizedDevices);

        // Users: ensure admin exists
        const loadedUsers = Array.isArray(usrs) ? usrs : [];
        if (loadedUsers.length === 0) loadedUsers.push(DEFAULT_ADMIN);
        setUsers(loadedUsers);

        setAlertRules(Array.isArray(rules) ? rules : []);
        setAlertRecords(Array.isArray(records) ? records : []);

        // Templates: if empty, insert default H3C template
        const loadedTemplates = Array.isArray(tplData) ? tplData : [];
        if (loadedTemplates.length === 0) {
          loadedTemplates.push(DEFAULT_H3C_TEMPLATE);
          _apiPost('/api/templates', DEFAULT_H3C_TEMPLATE).catch(e => console.warn('API save default template failed:', e));
        }
        setTemplates(loadedTemplates);

        // Settings
        const s = (settings && typeof settings === 'object' && !Array.isArray(settings)) ? settings : {};
        if (s['wecom-webhook']) setWecomWebhook(s['wecom-webhook']);
        if (s['email-config']) {
          try {
            const ec = typeof s['email-config'] === 'string' ? JSON.parse(s['email-config']) : s['email-config'];
            setEmailConfig(ec);
          } catch {}
        }
        if (s['monitor-settings']) {
          try {
            const ms = typeof s['monitor-settings'] === 'string' ? JSON.parse(s['monitor-settings']) : s['monitor-settings'];
            setMonitorSettings(ms);
          } catch {}
        }

        setDataLoaded(true);
      } catch (e) {
        console.error('[NetviewOne] Failed to load data from API:', e);
        setDataLoaded(true);
      }
    };
    loadData();
  }, []);

  // ==================== CRUD Handlers (API-backed) ====================
  const handleAddDevice = (d: Device) => {
    setDevices(prev => [...prev, d]);
    _apiPost('/api/devices', d).catch(e => console.warn('API save device failed:', e));
  };
  const handleEditDevice = (d: Device) => {
    setDevices(prev => prev.map(x => x.id === d.id ? d : x));
    _apiPost('/api/devices', d).catch(e => console.warn('API save device failed:', e));
  };
  const handleDeleteDevice = (id: string) => {
    setDevices(prev => prev.filter(x => x.id !== id));
    _apiDel(`/api/devices/${id}`).catch(e => console.warn('API delete device failed:', e));
  };

  const navigateDevice = (id: string) => { setSelectedDeviceId(id); setPage('device-detail'); };
  const navigateMonitorItems = (id: string) => { setMonitorDeviceId(id); setPage('monitor-items'); };
  const navigateSSH = (_id: string) => { setPage('ssh'); };

  // Alert callbacks
  const handleAddAlertRule = (r: AlertRule) => {
    setAlertRules(prev => [...prev, r]);
    _apiPost('/api/alert-rules', r).catch(e => console.warn('API save alert rule failed:', e));
  };
  const handleEditAlertRule = (r: AlertRule) => {
    setAlertRules(prev => prev.map(x => x.id === r.id ? r : x));
    _apiPost('/api/alert-rules', r).catch(e => console.warn('API save alert rule failed:', e));
  };
  const handleDeleteAlertRule = (id: string) => {
    setAlertRules(prev => prev.filter(x => x.id !== id));
    _apiDel(`/api/alert-rules/${id}`).catch(e => console.warn('API delete alert rule failed:', e));
  };
  const handleAckAlertRecord = (id: string) => {
    setAlertRecords(prev => prev.map(x => {
      if (x.id !== id) return x;
      const updated = { ...x, status: 'acknowledged' as const };
      _apiPost('/api/alert-records', updated).catch(e => console.warn('API save alert record failed:', e));
      return updated;
    }));
  };
  const handleDeleteAlertRecord = (id: string) => {
    setAlertRecords(prev => prev.filter(x => x.id !== id));
    _apiDel(`/api/alert-records/${id}`).catch(e => console.warn('API delete alert record failed:', e));
  };

  // Template CRUD handlers
  const handleAddTemplate = (t: OidTemplate) => {
    setTemplates(prev => [...prev, t]);
    _apiPost('/api/templates', t).catch(e => console.warn('API save template failed:', e));
  };
  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(x => x.id !== id));
    _apiDel(`/api/templates/${id}`).catch(e => console.warn('API delete template failed:', e));
  };

  const handleSetWecomWebhook = (v: string) => {
    setWecomWebhook(v);
    _apiPost('/api/settings', { 'wecom-webhook': v }).catch(e => console.warn('API save setting failed:', e));
  };

  const handleSetEmailConfig = (c: { smtp: string; port: string; sender: string; password: string; receivers: string }) => {
    setEmailConfig(c);
    _apiPost('/api/settings', { 'email-config': JSON.stringify(c) }).catch(e => console.warn('API save email config failed:', e));
  };

  const handleSimulateAlert = (severity: AlertRecord['severity'], ruleName: string, deviceName: string, message: string) => {
    const record: AlertRecord = {
      id: `ar-sim-${Date.now()}`,
      ruleId: 'simulated',
      ruleName,
      deviceId: '',
      deviceName,
      severity,
      message,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: 'firing',
      pushedToWecom: false,
    };
    setAlertRecords(prev => [record, ...prev]);
    _apiPost('/api/alert-records', record).catch(e => console.warn('API save simulated alert failed:', e));
  };

  const handlePushEmail = (record: AlertRecord) => {
    if (!emailConfig.smtp || !emailConfig.receivers) return;
    try {
      // Note: actual email sending requires backend SMTP support
      // For now, we send via backend API endpoint (to be implemented)
      fetch(`${API_BASE}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailConfig.receivers,
          subject: `[${SEVERITY_MAP[record.severity].label}] ${record.ruleName}`,
          body: `告警级别: ${SEVERITY_MAP[record.severity].label}\n规则名称: ${record.ruleName}\n设备: ${record.deviceName}\n描述: ${record.message}\n时间: ${record.timestamp}`,
          smtp: emailConfig.smtp,
          port: emailConfig.port,
          sender: emailConfig.sender,
          password: emailConfig.password,
        })
      }).then(() => {
        setAlertRecords(prev => prev.map(x => x.id === record.id ? { ...x, pushedToWecom: true } : x));
      }).catch(() => {});
    } catch { /* silently fail */ }
  };

  // Save monitor settings to API
  useEffect(() => {
    if (!dataLoaded) return;
    _apiPost('/api/settings', { 'monitor-settings': JSON.stringify(monitorSettings) }).catch(() => {});
  }, [monitorSettings, dataLoaded]);

  // ==================== Monitor Probing ====================
  const monitorTickRef = useRef(0);
  const devicesRef = useRef(devices);
  devicesRef.current = devices;
  const API_BASE = typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (window.__NETVIEWONE_API_BASE__ || 'http://localhost:8090') : '';

  useEffect(() => {
    if (page === 'login' || page === 'register' || page === 'forgot') return;
    const interval = setInterval(() => {
      monitorTickRef.current++;
      const tick = monitorTickRef.current;
      const currentDevices = devicesRef.current;

      // PING probe
      if (monitorSettings.pingEnabled && currentDevices.length > 0) {
        const pingSec = Math.max(monitorSettings.pingInterval || 60, 10);
        if (tick % Math.round(pingSec / 10) === 0 || tick === 1) {
          currentDevices.forEach(device => {
            fetch(`${API_BASE}/api/ping-probe`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ host: device.ip })
            }).then(r => r.json()).then(res => {
              const newStatus = res.up ? 'up' : 'down';
              setDevices(prev => prev.map(d => d.id === device.id ? { ...d, pingStatus: newStatus } : d));
            }).catch(() => {
              setDevices(prev => prev.map(d => d.id === device.id ? { ...d, pingStatus: 'down' } : d));
            });
          });
        }
      }

      // SNMP probe
      if (monitorSettings.snmpEnabled && currentDevices.length > 0) {
        const snmpSec = Math.max(monitorSettings.snmpInterval || 120, 30);
        if (tick % Math.round(snmpSec / 10) === 0 || tick === 1) {
          currentDevices.forEach(device => {
            if (!device.snmpEnabled) {
              setDevices(prev => prev.map(d => d.id === device.id ? { ...d, snmpStatus: 'disabled' } : d));
              return;
            }
            fetch(`${API_BASE}/api/snmp-probe`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ host: device.ip, community: device.snmpCommunity || 'public', version: device.snmpVersion || 'v2c', port: device.snmpPort || 161 })
            }).then(r => r.json()).then(res => {
              const newStatus = res.up ? 'up' : 'down';
              setDevices(prev => prev.map(d => d.id === device.id ? { ...d, snmpStatus: newStatus } : d));
            }).catch(() => {
              setDevices(prev => prev.map(d => d.id === device.id ? { ...d, snmpStatus: 'down' } : d));
            });
          });
        }
      }
    }, 10000); // check every 10s, actual probe controlled by interval settings

    return () => clearInterval(interval);
  }, [page, monitorSettings]);
  const handlePushWecom = (record: AlertRecord) => {
    if (!wecomWebhook) return;
    try {
      fetch(`${API_BASE}/api/push-wecom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook: wecomWebhook,
          msgtype: 'markdown',
          content: {
            content: `**[${SEVERITY_MAP[record.severity].label}] ${record.ruleName}**\n> 设备：${record.deviceName}\n> 描述：${record.message}\n> 时间：${record.timestamp}`
          }
        })
      }).then(r => r.json()).then(() => {
        setAlertRecords(prev => prev.map(x => x.id === record.id ? { ...x, pushedToWecom: true } : x));
      }).catch(() => {});
    } catch { /* silently fail */ }
  };

  // Auth pages
  if (page === 'login' || !currentUser) return <LoginPage onLogin={(user: User) => { setCurrentUser(user); sessionStorage.setItem('netviewone_user', JSON.stringify(user)); setPage('dashboard'); sessionStorage.setItem('netviewone_page', 'dashboard'); }} onRegister={() => setPage('register')} onForgot={() => setPage('forgot')} users={users} />;
  if (page === 'register') return <RegisterPage onBack={() => setPage('login')} onRegister={(user: User) => { setUsers(prev => [...prev, user]); setCurrentUser(user); setPage('dashboard'); _apiPost('/api/users', user).catch(e => console.warn('API save user failed:', e)); }} />;
  if (page === 'forgot') return <ForgotPasswordPage onBack={() => setPage('login')} />;

  // Big screen
  if (bigScreen) return <BigScreenPage devices={devices} onExit={() => setBigScreen(false)} />;

  const navItems = [
    { id: 'dashboard' as Page, label: '统一大盘', icon: LayoutDashboard },
    { id: 'devices' as Page, label: '设备管理', icon: Server },
    { id: 'snmp' as Page, label: 'SNMP采集', icon: Database },
    { id: 'ssh' as Page, label: 'SSH终端', icon: Terminal },
    { id: 'audit' as Page, label: '审计日志', icon: FileText },
    { id: 'alerts' as Page, label: '告警管理', icon: Bell },
    { id: 'templates' as Page, label: '模板管理', icon: FileText },
  ];

  const isMonitorActive = page === 'monitor-hosts' || page === 'monitor-latest' || page === 'monitor-items';

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`flex-shrink-0 flex flex-col bg-card border-r border-border transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
          <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0"><EthernetPort className="h-4 w-4 text-primary-foreground" /></div>
          {!sidebarCollapsed && <span className="font-bold text-sm tracking-tight">NetviewOne</span>}
          {!sidebarCollapsed && currentUser && <span className="text-xs text-muted-foreground ml-1">· {currentUser.name}</span>}
        </div>
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = page === item.id || (item.id === 'devices' && page === 'device-detail');
            return (<button key={item.id} onClick={() => setPage(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}><item.icon className="h-4.5 w-4.5 flex-shrink-0" />{!sidebarCollapsed && <span>{item.label}</span>}</button>);
          })}

          {/* 检测管理 (二级菜单) */}
          <div>
            <button onClick={() => setMonitorMenuOpen(!monitorMenuOpen)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isMonitorActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}>
              <Activity className="h-4.5 w-4.5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="flex-1 text-left">检测管理</span>}
              {!sidebarCollapsed && <ChevronRight className={`h-3.5 w-3.5 transition-transform ${monitorMenuOpen ? 'rotate-90' : ''}`} />}
            </button>
            {monitorMenuOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                <button onClick={() => setPage('monitor-hosts')} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${page === 'monitor-hosts' ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Server className="h-3.5 w-3.5 flex-shrink-0" />{!sidebarCollapsed && <span>主机</span>}
                </button>
                <button onClick={() => setPage('monitor-latest')} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${page === 'monitor-latest' ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Activity className="h-3.5 w-3.5 flex-shrink-0" />{!sidebarCollapsed && <span>最新数据</span>}
                </button>
              </div>
            )}
          </div>
        </nav>
        <div className="px-2 pb-3 space-y-1">
          <button onClick={() => setBigScreen(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 transition-all"><Eye className="h-4 w-4 flex-shrink-0" />{!sidebarCollapsed && <span>监控大屏</span>}</button>

          {/* Settings cascading menu */}
          <div className="relative">
            <button onClick={() => setSettingsOpen(!settingsOpen)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 transition-all">
              <Settings className="h-4 w-4 flex-shrink-0" />
              {!sidebarCollapsed && <span className="flex-1 text-left">设置</span>}
              {!sidebarCollapsed && <ChevronRight className={`h-3.5 w-3.5 transition-transform ${settingsOpen ? 'rotate-90' : ''}`} />}
            </button>
            {/* Level 2: 主题 / 语言 / 检测探活 */}
            {settingsOpen && (
              <div className="ml-4 mt-1 space-y-0.5">
                {/* 主题 → Level 3 flyout */}
                <div className="relative group">
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 transition-all">
                    {darkMode ? <Moon className="h-4 w-4 flex-shrink-0" /> : <Sun className="h-4 w-4 flex-shrink-0" />}
                    {!sidebarCollapsed && <span className="flex-1 text-left">主题</span>}
                    {!sidebarCollapsed && <ChevronRight className="h-3 w-3" />}
                  </button>
                  {/* Level 3 flyout: 深色/浅色 */}
                  <div className="absolute left-full top-0 ml-1 w-32 bg-popover border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 py-1">
                    <button onClick={() => { if (darkMode) setDarkMode(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors ${!darkMode ? 'text-primary font-medium' : 'text-muted-foreground'}`}><Sun className="h-3.5 w-3.5" />浅色模式</button>
                    <button onClick={() => { if (!darkMode) setDarkMode(true); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors ${darkMode ? 'text-primary font-medium' : 'text-muted-foreground'}`}><Moon className="h-3.5 w-3.5" />深色模式</button>
                  </div>
                </div>

                {/* 语言 → Level 3 flyout */}
                <div className="relative group">
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 transition-all">
                    <Globe className="h-4 w-4 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="flex-1 text-left">语言</span>}
                    {!sidebarCollapsed && <ChevronRight className="h-3 w-3" />}
                  </button>
                  {/* Level 3 flyout: 中文/English */}
                  <div className="absolute left-full top-0 ml-1 w-28 bg-popover border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 py-1">
                    <button onClick={() => { if (lang !== 'zh') setLang('zh'); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors ${lang === 'zh' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>中文</button>
                    <button onClick={() => { if (lang !== 'en') setLang('en'); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors ${lang === 'en' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>English</button>
                  </div>
                </div>

                {/* 人员管理 */}
                <div className="relative group">
                  <button onClick={() => setPage('users')} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 transition-all">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="flex-1 text-left">人员管理</span>}
                  </button>
                </div>

                {/* 网络调试 */}
                <div className="relative group">
                  <button onClick={() => setPage('debug')} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 transition-all">
                    <Wrench className="h-4 w-4 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="flex-1 text-left">网络调试</span>}
                  </button>
                </div>

                {/* 检测探活 → Level 3 flyout */}
                <div className="relative group">
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 transition-all">
                    <Activity className="h-4 w-4 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="flex-1 text-left">检测探活</span>}
                    {!sidebarCollapsed && <ChevronRight className="h-3 w-3" />}
                  </button>
                  {/* Level 3 flyout: Ping探活 / SNMP探活 */}
                  <div className="absolute left-full top-0 ml-1 w-32 bg-popover border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 py-1">
                    {/* Ping探活 → Level 4 flyout */}
                    <div className="relative group/ping">
                      <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/60 transition-colors">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${monitorSettings.pingEnabled ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
                        <span className="flex-1 text-left">Ping探活</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                      {/* Level 4 flyout: 开关+频率 */}
                      <div className="absolute left-full top-0 ml-1 w-44 bg-popover border border-border rounded-xl shadow-lg opacity-0 invisible group-hover/ping:opacity-100 group-hover/ping:visible transition-all duration-150 z-50 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Ping探活</span>
                          <button onClick={() => setMonitorSettings((p: any) => ({ ...p, pingEnabled: !p.pingEnabled }))} className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md border transition-colors ${monitorSettings.pingEnabled ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-muted-foreground border-border'}`}>
                            {monitorSettings.pingEnabled ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}{monitorSettings.pingEnabled ? '已启用' : '已关闭'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">频率</span>
                          <input type="number" min={10} max={600} step={10} value={monitorSettings.pingInterval} onChange={e => setMonitorSettings((p: any) => ({ ...p, pingInterval: Math.max(10, parseInt(e.target.value) || 60) }))} className="w-14 text-xs text-center bg-muted/50 border border-border rounded-lg px-1.5 py-1 outline-none focus:border-primary transition-colors" />
                          <span className="text-[10px] text-muted-foreground">秒</span>
                        </div>
                      </div>
                    </div>
                    {/* SNMP探活 → Level 4 flyout */}
                    <div className="relative group/snmp">
                      <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/60 transition-colors">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${monitorSettings.snmpEnabled ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
                        <span className="flex-1 text-left">SNMP探活</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                      {/* Level 4 flyout: 开关+频率 */}
                      <div className="absolute left-full top-0 ml-1 w-44 bg-popover border border-border rounded-xl shadow-lg opacity-0 invisible group-hover/snmp:opacity-100 group-hover/snmp:visible transition-all duration-150 z-50 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">SNMP探活</span>
                          <button onClick={() => setMonitorSettings((p: any) => ({ ...p, snmpEnabled: !p.snmpEnabled }))} className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md border transition-colors ${monitorSettings.snmpEnabled ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-muted-foreground border-border'}`}>
                            {monitorSettings.snmpEnabled ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}{monitorSettings.snmpEnabled ? '已启用' : '已关闭'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">频率</span>
                          <input type="number" min={30} max={3600} step={30} value={monitorSettings.snmpInterval} onChange={e => setMonitorSettings((p: any) => ({ ...p, snmpInterval: Math.max(30, parseInt(e.target.value) || 120) }))} className="w-14 text-xs text-center bg-muted/50 border border-border rounded-lg px-1.5 py-1 outline-none focus:border-primary transition-colors" />
                          <span className="text-[10px] text-muted-foreground">秒</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => { setCurrentUser(null); sessionStorage.removeItem('netviewone_user'); sessionStorage.removeItem('netviewone_page'); setPage('login'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>退出登录</span>}
          </button>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 transition-all">
            <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
            {!sidebarCollapsed && <span>收起侧栏</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto p-6">
          {page === 'dashboard' && <DashboardPage devices={devices} onNavigateDevice={navigateDevice} alertRecords={alertRecords} onNavigateAlerts={() => setPage('alerts')} onNavigateDevices={(f) => { setDeviceStatusFilter(f); setPage('devices'); }} />}
          {page === 'devices' && <DevicesPage devices={devices} onAddDevice={handleAddDevice} onEditDevice={handleEditDevice} onDeleteDevice={handleDeleteDevice} onNavigateDevice={navigateDevice} onNavigateMonitorItems={navigateMonitorItems} groups={groups} initialStatusFilter={deviceStatusFilter || undefined} />}
          {page === 'device-detail' && selectedDeviceId && <DeviceDetailPage devices={devices} deviceId={selectedDeviceId} onBack={() => setPage('devices')} onSSH={navigateSSH} templates={templates} />}
          {page === 'monitor-items' && monitorDeviceId && <MonitorItemsPage devices={devices} deviceId={monitorDeviceId} onBack={() => setPage('devices')} templates={templates} />}
          {page === 'monitor-hosts' && <MonitorHostsPage devices={devices} templates={templates} />}
          {page === 'monitor-latest' && <LatestDataPage devices={devices} />}
          {page === 'ssh' && <SSHTerminalPage onBack={() => setPage('devices')} devices={devices} onEditDevice={handleEditDevice} onDeleteDevice={handleDeleteDevice} />}
          {page === 'snmp' && <SnmpPage devices={devices} onEditDevice={handleEditDevice} />}
          {page === 'audit' && <AuditLogPage logs={logs} />}
          {page === 'alerts' && <AlertPage devices={devices} rules={alertRules} onAddRule={handleAddAlertRule} onEditRule={handleEditAlertRule} onDeleteRule={handleDeleteAlertRule} records={alertRecords} onAckRecord={handleAckAlertRecord} onDeleteRecord={handleDeleteAlertRecord} wecomWebhook={wecomWebhook} onSetWecomWebhook={handleSetWecomWebhook} onPushWecom={handlePushWecom} onSimulateAlert={handleSimulateAlert} emailConfig={emailConfig} onSetEmailConfig={handleSetEmailConfig} onPushEmail={handlePushEmail} />}
          {page === 'debug' && <DebugPage devices={devices} />}
          {page === 'templates' && <TemplatesPage templates={templates} onAddTemplate={handleAddTemplate} onDeleteTemplate={handleDeleteTemplate} />}
          {page === 'users' && <UsersPage users={users} onAddUser={u => { setUsers(prev => [...prev, u]); _apiPost('/api/users' as string, u).catch((e: any) => console.warn('API save user failed:', e)); }} />}
        </div>
      </main>
    </div>
  );
}
