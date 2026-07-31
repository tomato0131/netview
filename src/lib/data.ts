export interface Device {
  id: string;
  name: string;
  type: 'core-switch' | 'aggregation-switch' | 'access-switch' | 'router' | 'firewall' | 'ap' | 'wireless-gateway';
  brand: string;
  model: string;
  ip: string;
  location: string;
  floor: string;
  room: string;
  pingStatus: 'up' | 'down';
  snmpStatus: 'up' | 'down' | 'disabled';
  uptime: string;
  cpu: number;
  memory: number;
  fanStatus: 'normal' | 'warning' | 'error';
  ports: Port[];
  lastSync: string;
  snmpCommunity?: string;
  snmpPort?: number;
  sshPort: number;
  groups?: string[];
  tags?: string[];
  snmpEnabled?: boolean;
  snmpVersion?: 'v1' | 'v2c' | 'v3';
  snmpInterval?: number;
  sshUsername?: string;
  sshPassword?: string;
}

export interface Port {
  id: string;
  name: string;
  status: 'up' | 'down' | 'disabled';
  speed: string;
  traffic?: { in: number; out: number };
  connectedTo?: string;
}

export interface User {
  id: string;
  name: string;
  department: string;
  phone: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  status: 'active' | 'disabled';
  lastLogin: string;
  avatar?: string;
  password?: string;
}

export interface SnmpTrap {
  id: string;
  deviceId: string;
  deviceName: string;
  type: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface DeviceGroup {
  id: string;
  name: string;
  color: string;
  deviceCount: number;
  description: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  target: string;
  detail: string;
  ip: string;
  timestamp: string;
  result: 'success' | 'failed';
}

export interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  brand?: string;
  lastUsed?: string;
}

export const DEVICE_TYPES: Record<string, string> = {
  'core-switch': '核心交换机',
  'aggregation-switch': '汇聚交换机',
  'access-switch': '接入交换机',
  'router': '路由器',
  'firewall': '防火墙',
  'ap': '无线AP',
  'wireless-gateway': '无线网关',
  'fortress': '堡垒机',
  'vpn': 'VPN网关',
  'waf': 'WAF',
  'behavior-manager': '上网行为管理',
  'internet': '互联网',
};

export const FLOORS = ['B1F', '1F', '2F', '3F', '4F', '5F', '6F', '7F', '8F', '9F', '10F', '11F', '12F', '13F', '14F', '15F', '16F', '17F', '18F', '19F', '20F', '21F', '22F', '23F', '辅楼1F', '辅楼2F', '辅楼3F', '辅楼4F', '辅楼5F', '辅楼6F'];
export const ROOMS = ['409机房', '403机房', '楼层弱电间'];

export const DEFAULT_ADMIN: User = {
  id: 'u-admin', name: '管理员', department: 'IT运维部', phone: '13800000001',
  email: 'admin', role: 'admin', status: 'active',
  lastLogin: '', password: 'admin@2026',
};

export const MOCK_USERS: User[] = [
  DEFAULT_ADMIN,
];

export const MOCK_SNMP_TRAPS: SnmpTrap[] = [];

export const MOCK_DEVICE_GROUPS: DeviceGroup[] = [];

export const MOCK_AUDIT_LOGS: AuditLog[] = [];

export const MOCK_SSH_CONNECTIONS: SSHConnection[] = [];

// ==================== ALERT ====================
export interface AlertRule {
  id: string;
  name: string;
  type: 'cpu' | 'memory' | 'interface-down' | 'device-offline' | 'fan-error' | 'custom';
  metric: string;              // 监控指标描述
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=' | 'down' | 'offline';
  threshold: number;           // 阈值（百分比或0/1）
  severity: 'critical' | 'major' | 'minor' | 'info';
  deviceIds: string[];         // 关联设备ID列表
  enabled: boolean;
  webhookEnabled: boolean;     // 是否推送企业微信
  description: string;
  createdAt: string;
  lastTriggered?: string;
}

export interface AlertRecord {
  id: string;
  ruleId: string;
  ruleName: string;
  deviceId: string;
  deviceName: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  message: string;
  timestamp: string;
  status: 'firing' | 'acknowledged' | 'resolved';
  pushedToWecom: boolean;
}

// ==================== TOPOLOGY ====================
export interface TopoNode {
  id: string;
  type: string;       // core-switch / firewall / router / fortress / vpn / waf / behavior-manager / internet / access-switch / aggregation-switch / ap
  name: string;
  x: number;
  y: number;
  linkedDeviceId?: string;  // 可选关联设备管理中的设备ID
  label?: string;          // 自定义标签（如IP地址）
}

export interface TopoLink {
  id: string;
  from: string;  // node id
  to: string;    // node id
  label?: string;
}

export interface MonitorItem {
  id: string;
  deviceId: string;       // 所属设备ID
  name: string;           // 监控项名称
  type: 'shell' | 'api' | 'snmp';  // 监控模式
  key: string;            // 监控项键值 如 system.cpu.load
  interval: number;       // 采集间隔(秒)
  enabled: boolean;       // 是否启用
  valueType: 'float' | 'unsigned' | 'char' | 'text';  // 返回值类型
  units: string;          // 单位 如 %, B, bps
  description: string;    // 描述
  historyDays: number;    // 历史数据保留天数
  trendDays: number;     // 趋势数据保留天数
  // Shell 类型字段
  shellCommand?: string;          // Shell命令
  shellHost?: string;             // 目标主机
  shellPort?: number;             // SSH端口
  shellUsername?: string;         // SSH用户名
  shellPassword?: string;         // SSH密码
  // API 类型字段
  apiUrl?: string;                // 请求URL
  apiMethod?: 'GET' | 'POST';    // 请求方法
  apiHeaders?: string;            // 请求头 JSON
  apiBody?: string;              // 请求体
  apiExpectedStatus?: number;    // 期望状态码
  // SNMP 类型字段
  snmpOid?: string;              // SNMP OID
  snmpCommunity?: string;        // SNMP Community
  snmpVersion?: 'v1' | 'v2c' | 'v3';
  snmpPort?: number;
  lastValue?: string;           // 最近一次采集值
  lastCheck?: string;           // 最近采集时间
  status?: 'normal' | 'unsupported' | 'error';  // 运行状态
  errorMsg?: string;            // 错误信息
}

export interface TopologyData {
  nodes: TopoNode[];
  links: TopoLink[];
}

// ==================== OID TEMPLATE ====================
export interface OidItem {
  name: string;            // e.g. "CPU利用率"
  oid: string;             // e.g. "1.3.6.1.4.1.25506.2.6.1.1.1.1.6"
  method: 'get' | 'walk';  // snmpget or snmpwalk
  unit: string;            // e.g. "%", "°C", "bps"
  description: string;     // description
}

export interface OidCategory {
  name: string;            // e.g. "系统指标", "接口信息", "硬件状态"
  items: OidItem[];
}

export interface OidTemplate {
  id: string;
  name: string;            // e.g. "H3C S5130S-52P-EI"
  brand: string;           // e.g. "H3C"
  model: string;           // e.g. "S5130S-52P-EI"
  categories: OidCategory[];
}

export const DEFAULT_H3C_TEMPLATE: OidTemplate = {
  id: 'tpl-h3c-s5130s',
  name: 'H3C S5130S-52P-EI',
  brand: 'H3C',
  model: 'S5130S-52P-EI',
  categories: [
    {
      name: '系统信息',
      items: [
        { name: '系统描述', oid: '1.3.6.1.2.1.1.1.0', method: 'get', unit: '', description: 'sysDescr' },
        { name: '系统运行时间', oid: '1.3.6.1.2.1.1.3.0', method: 'get', unit: '', description: 'sysUpTime' },
        { name: '系统名称', oid: '1.3.6.1.2.1.1.5.0', method: 'get', unit: '', description: 'sysName' },
        { name: '系统联系人', oid: '1.3.6.1.2.1.1.4.0', method: 'get', unit: '', description: 'sysContact' },
      ]
    },
    {
      name: 'CPU/内存',
      items: [
        { name: 'CPU利用率', oid: '1.3.6.1.4.1.25506.2.6.1.1.1.1.6', method: 'walk', unit: '%', description: 'hh3cCpuUsage' },
        { name: '内存利用率', oid: '1.3.6.1.4.1.25506.2.6.1.1.1.1.8', method: 'walk', unit: '%', description: 'hh3cMemUsage' },
      ]
    },
    {
      name: '温度/电源/风扇',
      items: [
        { name: '温度', oid: '1.3.6.1.4.1.25506.2.6.1.1.1.1.10', method: 'walk', unit: '°C', description: 'hh3cTemperature' },
        { name: '电源状态', oid: '1.3.6.1.4.1.25506.2.6.1.1.1.1.11', method: 'walk', unit: '', description: 'hh3cPowerStatus' },
        { name: '风扇状态', oid: '1.3.6.1.4.1.25506.2.6.1.1.1.1.13', method: 'walk', unit: '', description: 'hh3cFanStatus' },
      ]
    },
    {
      name: '接口信息',
      items: [
        { name: '接口名称', oid: '1.3.6.1.2.1.31.1.1.1.1', method: 'walk', unit: '', description: 'ifName - 接口名称' },
        { name: '接口描述', oid: '1.3.6.1.2.1.31.1.1.1.18', method: 'walk', unit: '', description: 'ifAlias - 接口描述' },
        { name: '接口类型', oid: '1.3.6.1.2.1.2.2.1.3', method: 'walk', unit: '', description: 'ifType - 接口类型(6=ethernet)' },
        { name: '接口速率', oid: '1.3.6.1.2.1.2.2.1.5', method: 'walk', unit: 'bps', description: 'ifSpeed - 接口速率' },
        { name: '接口物理状态', oid: '1.3.6.1.2.1.2.2.1.7', method: 'walk', unit: '', description: 'ifAdminStatus - 1=up 2=down' },
        { name: '接口运行状态', oid: '1.3.6.1.2.1.2.2.1.8', method: 'walk', unit: '', description: 'ifOperStatus - 1=up 2=down' },
        { name: '入流量(Byte)', oid: '1.3.6.1.2.1.2.2.1.10', method: 'walk', unit: 'B', description: 'ifInOctets' },
        { name: '出流量(Byte)', oid: '1.3.6.1.2.1.2.2.1.16', method: 'walk', unit: 'B', description: 'ifOutOctets' },
        { name: '入包数', oid: '1.3.6.1.2.1.2.2.1.11', method: 'walk', unit: '', description: 'ifInUcastPkts' },
        { name: '出包数', oid: '1.3.6.1.2.1.2.2.1.17', method: 'walk', unit: '', description: 'ifOutUcastPkts' },
        { name: '入错误包', oid: '1.3.6.1.2.1.2.2.1.14', method: 'walk', unit: '', description: 'ifInErrors' },
        { name: '出错误包', oid: '1.3.6.1.2.1.2.2.1.20', method: 'walk', unit: '', description: 'ifOutErrors' },
      ]
    },
  ]
};
