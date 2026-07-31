---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: 'fa085a7b-20ad-457f-83f2-5d9313e7b550'
  PropagateID: 'fa085a7b-20ad-457f-83f2-5d9313e7b550'
  ReservedCode1: '6904e7a5-ac88-42ec-aade-1d0e94d6b9a1'
  ReservedCode2: '6904e7a5-ac88-42ec-aade-1d0e94d6b9a1'
---

# NetView - 网络设备统一管理平台

> 企业级网络设备监控与管理平台，集成 SNMP 采集、SSH 远程终端、拓扑编辑、告警推送等能力，支持 Ping/SNMP 双状态探活，开箱即用。

---

## ✨ 功能概览

| 模块 | 功能 | 说明 |
|------|------|------|
| 📊 统一大盘 | 设备概览 + 拓扑图 + 统计卡片 + 楼层热力图 + 告警时间线 | 一屏掌控全网状态 |
| 🖥️ 设备管理 | CRUD + SNMP 配置 + SSH 账号 + 监控项入口 | 支持 30 个楼层、3 种机房位置 |
| 🔌 SSH 终端 | 真实 SSH 连接 + More 翻页 + 状态灯 + 设备搜索 | 基于 sshpass + pty 实时交互 |
| 📡 SNMP 采集 | 设备探活 + 实时数据采集 + 端口表/系统指标/硬件状态 | 支持 snmpget/snmpwalk |
| 📈 监控项 | Shell/API/SNMP 三种模式 + OID 模板选择 + 立刻执行 | Zabbix 风格监控项管理 |
| 🗺️ 拓扑编辑 | 11 种设备图标 + 拖拽连线 + 关联设备 + DrawIO 导入导出 | 可视化网络拓扑 |
| 🚨 告警管理 | 告警规则 + 模拟告警 + 企微/邮件双通道推送 | 灵活配置告警策略 |
| 👥 人员管理 | 用户 CRUD + 角色权限 + 登录认证 | Admin/Operator/Viewer 三级 |
| ⚙️ OID 模板 | SNMP 指标固化 + 一键从模板创建监控项 | 内置 H3C S5130S-52P-EI 完整模板 |

---

## 📸 界面预览

### 统一大盘

大盘页面集成网络拓扑编辑器、5 列统计卡片（设备总数 / Ping 异常 / SNMP 异常 / 告警规则 / 告警记录）、设备类型分布饼图、楼层分布热力图和最近告警时间线。点击 Ping/SNMP 异常卡片可直接跳转到设备管理并过滤异常设备。

```
┌──────────────────────────────────────────────────────────────┐
│  统一大盘                                                     │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │            网络拓扑编辑器（拖拽 / 连线 / 关联）          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                        │
│  │ 12 │ │  1 │ │  2 │ │  3 │ │ 15 │  ← 统计卡片           │
│  │设备│ │PING│ │SNMP│ │规则│ │记录│                         │
│  └────┘ └────┘ └────┘ └────┘ └────┘                        │
│  ┌──────────────┐ ┌──────────────────────────────────┐    │
│  │  设备类型分布  │ │       楼层分布热力图               │    │
│  │    饼图       │ │                                   │    │
│  └──────────────┘ └──────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  最近告警时间线                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 设备管理

支持设备的增删改查，SNMP/SSH 配置，双状态灯（Ping UP/DOWN + SNMP UP/DOWN/Disabled），楼层与位置选择，一键跳转设备详情 / SSH 终端 / 监控项。

### SSH 终端

真实 SSH 连接，支持交互式命令执行，`---- More ----` 自动翻页模式（空格翻页 / Q 退出），实时状态灯，设备快速搜索。

### 监控项管理（Zabbix 风格）

支持 Shell / API / SNMP 三种监控模式，SNMP 模式下可从 OID 模板直接选择键值和 OID 自动填充，"立刻执行"按钮实时采集最新数据，最近值列支持鼠标悬浮显示完整信息（含单位与异常标注）。

### 网络拓扑编辑器

11 种设备图标（含无线网关），支持拖拽移动、边缘连线带箭头、关联设备实时显示运行状态、右键菜单编辑备注，DrawIO 格式导入导出。

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────┐
│           前端 (React 18 + TS)            │
│  Vite + Tailwind CSS + shadcn/ui          │
│  单 HTML 文件交付 (bundle.html)            │
├─────────────────────────────────────────┤
│           后端 (Python HTTP Server)        │
│  RESTful API + SSH Session Manager        │
│  MySQL/MariaDB 持久化 (8 张表)            │
│  SNMP 采集 (net-snmp-utils)               │
│  Python 2.7 / 3.x 双版本兼容             │
├─────────────────────────────────────────┤
│           基础设施                         │
│  CentOS 7 + systemd + sshpass            │
│  net-snmp-utils + MariaDB 5.5            │
└─────────────────────────────────────────┘
```

**前端技术栈**：React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · Lucide Icons

**后端技术栈**：Python 2.7/3.x · MySQLdb · sshpass · net-snmp · pty/termios

**交付方式**：Vite 构建 → pack.mjs 将 JS 编码为 Base64 + Blob URL 内联 CSS → 生成可直接打开的 `bundle.html`

---

## 🚀 快速开始

### 环境要求

- CentOS 7+ (或其他 Linux 发行版)
- Python 2.7+ 或 Python 3.x
- MariaDB / MySQL
- `sshpass` (SSH 远程终端)
- `net-snmp-utils` (SNMP 采集: snmpget, snmpwalk)

### 1. 准备数据库

```sql
CREATE DATABASE netview CHARACTER SET utf8mb4;
CREATE USER 'netview'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON netview.* TO 'netview'@'localhost';
FLUSH PRIVILEGES;
```

### 2. 安装依赖

```bash
# CentOS 7
yum install -y epel-release
yum install -y sshpass net-snmp-utils

# Python 2.7
pip install MySQL-python
# 或 Python 3
pip3 install mysqlclient
```

### 3. 部署后端

```bash
# 创建部署目录
mkdir -p /data/net_view

# 复制后端文件
cp backend/serve_api.py /data/net_view/

# 配置环境变量
export NETVIEW_HOME=/data/net_view
export NETVIEW_MYSQL_HOST=localhost
export NETVIEW_MYSQL_USER=netview
export NETVIEW_MYSQL_PASS=your_password
export NETVIEW_MYSQL_DB=netview

# 启动服务
python /data/net_view/serve_api.py
```

### 4. 配置 systemd (可选)

```bash
# 复制 service 模板
cp backend/netview.service /etc/systemd/system/netview.service

# 编辑密码等环境变量
vi /etc/systemd/system/netview.service

# 启用并启动
systemctl daemon-reload
systemctl enable netview
systemctl start netview
```

### 5. 构建并部署前端

```bash
# 安装 Node.js (需要 18+)
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# 安装依赖
npm install

# 构建
npx vite build

# 打包为单 HTML 文件 (需要 pack.mjs)
node .temp/pack.mjs

# 复制到服务器
cp dist/bundle.html /data/net_view/index.html
```

### 6. 访问平台

浏览器打开 `http://<服务器IP>/`，使用默认管理员账号登录：

| 字段 | 值 |
|------|-----|
| 邮箱/账号 | `admin` |
| 手机号 | `13800000001` |
| 初始密码 | `admin@2026` |

> ⚠️ 首次登录后请立即修改默认密码！

---

## 📡 API 接口

| 方法 | 路径 | 功能 |
|------|------|------|
| GET/POST/DELETE | `/api/devices` | 设备 CRUD |
| GET/POST/DELETE | `/api/users` | 用户 CRUD |
| GET/POST/DELETE | `/api/alert-rules` | 告警规则 CRUD |
| GET/POST/DELETE | `/api/alert-records` | 告警记录 CRUD |
| GET/POST/DELETE | `/api/topology` | 拓扑数据 CRUD |
| GET/POST/DELETE | `/api/monitor-items` | 监控项 CRUD |
| GET/POST/DELETE | `/api/templates` | OID 模板 CRUD |
| GET/POST | `/api/settings` | 设置读写 |
| POST | `/api/ping-probe` | Ping 探活 |
| POST | `/api/snmp-probe` | SNMP 探活 |
| POST | `/api/snmp-collect` | SNMP 数据采集 |
| POST | `/api/push-wecom` | 企业微信 Webhook 代理 |
| POST | `/api/send-email` | 邮件 SMTP 推送 |
| POST | `/api/ssh/connect` | SSH 连接 |
| POST | `/api/ssh/exec` | SSH 执行命令 |
| POST | `/api/ssh/disconnect` | SSH 断开 |

---

## 📂 项目结构

```
netview/
├── src/
│   ├── App.tsx                  # 主应用（所有页面组件）
│   ├── lib/
│   │   └── data.ts              # 数据模型 + 常量 + 默认模板
│   └── components/ui/           # shadcn/ui 组件
├── backend/
│   ├── serve_api.py             # Python 后端服务器
│   └── netview.service          # systemd 服务模板
├── index.html                   # Vite 入口
├── vite.config.ts               # Vite 配置
├── tailwind.config.js           # Tailwind 配置
├── package.json                 # 依赖管理
└── .gitignore                   # 排除敏感文件
```

---

## 🗄️ 数据库设计

8 张表，采用 JSON-LONGTEXT 模式存储（兼容 MariaDB 5.5 不支持 JSON 类型）：

```sql
CREATE TABLE devices (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL);
CREATE TABLE users (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL);
CREATE TABLE alert_rules (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL);
CREATE TABLE alert_records (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL);
CREATE TABLE topology (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL);
CREATE TABLE monitor_items (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL);
CREATE TABLE templates (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL);
CREATE TABLE settings (k VARCHAR(128) PRIMARY KEY, v TEXT NOT NULL);
```

---

## ⚙️ 配置说明

### API 地址配置

前端在本地开发（`file://` 或 `localhost`）时自动连接后端 API，可通过全局变量覆盖：

```html
<script>window.__NETVIEW_API_BASE__ = 'http://your-server:80';</script>
```

### SNMP Community

在设备管理中为每台设备单独配置 SNMP Community、Version 和 Port，监控项创建时自动继承设备配置。

### 企业微信推送

在告警管理页面配置 Webhook URL，推送时通过后端代理（解决浏览器 CORS 限制）。

### 邮件推送

在告警推送页签配置 SMTP 服务器、端口、发件人、授权码、收件人，配置持久化到数据库。

---

## 📜 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交变更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

> AI生成