#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
NetView Web Server with MySQL + REST CRUD API
- Serves static files from /data/net_view/
- MySQL persistence for devices, users, alert_rules, alert_records, settings
- POST /api/ping     - execute ping command
- POST /api/telnet   - test TCP port connectivity
- POST /api/ssh/connect    - establish real SSH via sshpass+ssh (ssh-rsa support)
- POST /api/ssh/exec       - send command to active SSH session
- POST /api/ssh/disconnect - close SSH session
- POST /api/ping-probe     - quick PING probe
- POST /api/snmp-probe     - SNMP probe
- GET/POST/DELETE /api/devices, /api/users, /api/alert-rules, /api/alert-records
- GET/POST /api/settings
- POST /api/import - bulk import data (migration from localStorage)
Compatible with Python 2.7+ and Python 3.x
"""

import os
import sys
import json
import subprocess
import socket
import re
import time
import threading
import select
import fcntl
import struct
import termios
import signal

# Python 2/3 compatibility
PY3 = sys.version_info[0] >= 3

if PY3:
    from http.server import SimpleHTTPRequestHandler, HTTPServer
    from urllib.parse import urlparse, parse_qs
else:
    from SimpleHTTPServer import SimpleHTTPRequestHandler
    from BaseHTTPServer import HTTPServer
    from urlparse import urlparse, parse_qs

os.chdir(os.environ.get('NETVIEW_HOME', '/data/net_view'))

# Security: whitelist allowed characters
SAFE_HOST_RE = re.compile(r'^[a-zA-Z0-9._-]+$')
SAFE_USER_RE = re.compile(r'^[a-zA-Z0-9._-]+$')

# ==================== MySQL Setup ====================
MYSQL_CONFIG = {
    'host': os.environ.get('NETVIEW_MYSQL_HOST', 'localhost'),
    'user': os.environ.get('NETVIEW_MYSQL_USER', 'netview'),
    'passwd': os.environ.get('NETVIEW_MYSQL_PASS', 'changeme'),
    'db': os.environ.get('NETVIEW_MYSQL_DB', 'netview'),
    'charset': 'utf8mb4',
}

_mysql_conn = None
_mysql_lock = threading.Lock()
_mysql_tables_created = False


def get_mysql():
    """Get or create a MySQL connection (thread-local per call, with reconnect)."""
    global _mysql_conn, _mysql_tables_created
    try:
        import MySQLdb
    except ImportError:
        return None

    with _mysql_lock:
        if _mysql_conn is not None:
            try:
                _mysql_conn.ping(True)
                return _mysql_conn
            except Exception:
                _mysql_conn = None

        try:
            conn = MySQLdb.connect(**MYSQL_CONFIG)
            _mysql_conn = conn
            if not _mysql_tables_created:
                _create_tables(conn)
                _mysql_tables_created = True
            return conn
        except Exception as e:
            sys.stderr.write('MySQL connect failed: {}\n'.format(str(e)))
            _mysql_conn = None
            return None


def _create_tables(conn):
    """Create tables if not exist."""
    cursor = conn.cursor()
    tables = [
        'CREATE TABLE IF NOT EXISTS devices (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS users (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS alert_rules (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS alert_records (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS topology (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS monitor_items (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS settings (k VARCHAR(128) PRIMARY KEY, v TEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS templates (id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL)',
    ]
    for t in tables:
        try:
            cursor.execute(t)
        except Exception as e:
            sys.stderr.write('Create table error: {}\n'.format(str(e)))
    conn.commit()
    cursor.close()


def mysql_get_all(table):
    """Get all rows from a JSON table, return list of dicts."""
    conn = get_mysql()
    if conn is None:
        return None
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT id, data FROM {}'.format(table))
        rows = cursor.fetchall()
        result = []
        for row in rows:
            try:
                row_id = row[0]
                raw = row[1]
                # Python 2.7: MySQLdb returns bytes for LONGTEXT with charset=utf8mb4
                if not PY3 and isinstance(raw, bytes):
                    raw = raw.decode('utf-8')
                elif PY3 and isinstance(raw, bytes):
                    raw = raw.decode('utf-8')
                # Validate it's proper JSON; if double-encoded, parse inner
                try:
                    parsed = json.loads(raw)
                    # If the parsed result is a dict with 'data' key and 'id' key,
                    # it was double-encoded by a previous bug - extract the inner data
                    if isinstance(parsed, dict) and 'data' in parsed and 'id' in parsed and isinstance(parsed['data'], (str, type(u''))):
                        try:
                            inner = json.loads(parsed['data'])
                            result.append(inner)
                        except (ValueError, TypeError):
                            result.append(parsed)
                    else:
                        result.append(parsed)
                except (ValueError, TypeError):
                    result.append({'id': row_id, 'data': raw})
            except Exception as e:
                sys.stderr.write('mysql_get_all parse error: {}\n'.format(str(e)))
        cursor.close()
        return result
    except Exception as e:
        sys.stderr.write('mysql_get_all error: {}\n'.format(str(e)))
        return None


def mysql_upsert(table, id_val, data):
    """Insert or update a row in a JSON table."""
    conn = get_mysql()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        # If data has a 'data' key that is already a JSON string, use it directly
        # to avoid double JSON encoding (front-end sends {id, data: JSON.stringify(item)})
        if isinstance(data, dict) and 'data' in data and isinstance(data['data'], (str, type(u''))):
            data_json = data['data']
            # Ensure it's valid JSON by re-serializing through json.loads -> json.dumps
            try:
                inner = json.loads(data_json)
                data_json = json.dumps(inner, ensure_ascii=False)
            except (ValueError, TypeError):
                pass
        else:
            data_json = json.dumps(data, ensure_ascii=False)
        # Python 2.7 fix: ensure data_json is a proper utf-8 encoded string for MySQL
        if not PY3 and isinstance(data_json, type(u'')):
            data_json = data_json.encode('utf-8')
        elif PY3 and isinstance(data_json, bytes):
            data_json = data_json.decode('utf-8')
        # MariaDB 5.5 doesn't support INSERT ... ON DUPLICATE KEY UPDATE with JSON
        # Check if row exists first
        cursor.execute('SELECT id FROM {} WHERE id = %s'.format(table), (id_val,))
        if cursor.fetchone():
            cursor.execute('UPDATE {} SET data = %s WHERE id = %s'.format(table), (data_json, id_val))
        else:
            cursor.execute('INSERT INTO {} (id, data) VALUES (%s, %s)'.format(table), (id_val, data_json))
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        sys.stderr.write('mysql_upsert error: {}\n'.format(str(e)))
        try:
            conn.rollback()
        except Exception:
            pass
        return False


def mysql_delete(table, id_val):
    """Delete a row from a table."""
    conn = get_mysql()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM {} WHERE id = %s'.format(table), (id_val,))
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        sys.stderr.write('mysql_delete error: {}\n'.format(str(e)))
        return False


def mysql_get_setting(key):
    """Get a setting value by key."""
    conn = get_mysql()
    if conn is None:
        return None
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT v FROM settings WHERE k = %s', (key,))
        row = cursor.fetchone()
        cursor.close()
        return row[0] if row else None
    except Exception:
        return None


def mysql_set_setting(key, value):
    """Set a setting value."""
    conn = get_mysql()
    if conn is None:
        return False
    try:
        cursor = conn.cursor()
        # Check exists
        cursor.execute('SELECT k FROM settings WHERE k = %s', (key,))
        if cursor.fetchone():
            cursor.execute('UPDATE settings SET v = %s WHERE k = %s', (value, key))
        else:
            cursor.execute('INSERT INTO settings (k, v) VALUES (%s, %s)', (key, value))
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        sys.stderr.write('mysql_set_setting error: {}\n'.format(str(e)))
        return False


def mysql_get_all_settings():
    """Get all settings as dict."""
    conn = get_mysql()
    if conn is None:
        return None
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT k, v FROM settings')
        rows = cursor.fetchall()
        result = {}
        for row in rows:
            result[row[0]] = row[1]
        cursor.close()
        return result
    except Exception:
        return None


# ==================== SSH Session via pty + sshpass ====================
class SSHSession:
    """Manage a real SSH session using sshpass + ssh command with pty."""

    def __init__(self, host, port, username, password, name):
        self.host = host
        self.port = int(port)
        self.username = username
        self.password = password
        self.name = name
        self.master_fd = None
        self.pid = None
        self.last_active = time.time()

    def connect(self):
        """Establish SSH connection using sshpass + ssh with ssh-rsa support."""
        master_fd, slave_fd = os.openpty()

        cmd = [
            'sshpass', '-p', self.password,
            'ssh',
            '-oHostKeyAlgorithms=+ssh-rsa',
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'UserKnownHostsFile=/dev/null',
            '-o', 'LogLevel=ERROR',
            '-o', 'ConnectTimeout=10',
            '-p', str(self.port),
            '{}@{}'.format(self.username, self.host),
        ]

        try:
            self.pid = subprocess.Popen(
                cmd,
                stdin=slave_fd,
                stdout=slave_fd,
                stderr=slave_fd,
                close_fds=True,
                preexec_fn=os.setsid,
            )
        except Exception as e:
            os.close(master_fd)
            os.close(slave_fd)
            raise Exception('Failed to start ssh: {}'.format(str(e)))

        os.close(slave_fd)
        self.master_fd = master_fd

        # Set non-blocking
        flags = fcntl.fcntl(self.master_fd, fcntl.F_GETFL)
        fcntl.fcntl(self.master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

        # Set terminal size
        try:
            winsize = struct.pack('HHHH', 50, 200, 0, 0)
            fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)
        except Exception:
            pass

        # Wait and read welcome output
        time.sleep(1)
        welcome = self.read_output(timeout=8, idle_timeout=1.5)

        # Check if process died immediately
        if self.pid.poll() is not None:
            err = self.read_remaining()
            if err:
                welcome += err
            if 'Permission denied' in welcome or 'authentication' in welcome.lower():
                raise Exception('Authentication failed: incorrect username or password')
            if 'Connection timed out' in welcome or 'timed out' in welcome.lower():
                raise Exception('Connection timed out (10s)')
            if 'Connection refused' in welcome:
                raise Exception('Connection refused: target port {} not open'.format(self.port))
            if 'Could not resolve' in welcome:
                raise Exception('Could not resolve hostname: {}'.format(self.host))
            if not welcome:
                raise Exception('SSH process exited immediately. Check if sshpass is installed.')

        return welcome

    def read_output(self, timeout=8, idle_timeout=1.5):
        """Read output from pty until no more data or timeout."""
        output = ''
        start = time.time()
        last_data = time.time()

        while True:
            elapsed = time.time() - start
            if elapsed > timeout:
                break

            r, _, _ = select.select([self.master_fd], [], [], 0.1)
            if r:
                try:
                    data = os.read(self.master_fd, 65536)
                    if data:
                        output += data.decode('utf-8', errors='replace')
                        last_data = time.time()
                    else:
                        break
                except OSError:
                    break
            else:
                if time.time() - last_data > idle_timeout:
                    break

        return output

    def read_remaining(self):
        """Read any remaining data after process exit."""
        output = ''
        try:
            while True:
                r, _, _ = select.select([self.master_fd], [], [], 0.3)
                if r:
                    data = os.read(self.master_fd, 65536)
                    if data:
                        output += data.decode('utf-8', errors='replace')
                    else:
                        break
                else:
                    break
        except OSError:
            pass
        return output

    def send_command(self, command):
        """Send a command to the SSH session and read output."""
        self.last_active = time.time()
        try:
            os.write(self.master_fd, (command + '\n').encode('utf-8'))
        except OSError:
            return '', True

        output = self.read_output(timeout=8, idle_timeout=1.5)

        closed = False
        if self.pid.poll() is not None:
            closed = True
            remaining = self.read_remaining()
            if remaining:
                output += remaining

        return output, closed

    def send_raw(self, data):
        """Send raw bytes to the SSH session and read output."""
        self.last_active = time.time()
        try:
            os.write(self.master_fd, data.encode('utf-8') if isinstance(data, type(u'')) else data)
        except OSError:
            return '', True

        output = self.read_output(timeout=8, idle_timeout=1.5)

        closed = False
        if self.pid.poll() is not None:
            closed = True
            remaining = self.read_remaining()
            if remaining:
                output += remaining

        return output, closed

    def close(self):
        """Close the SSH session."""
        if self.pid and self.pid.poll() is None:
            try:
                os.killpg(os.getpgid(self.pid), signal.SIGTERM)
                time.sleep(0.3)
                if self.pid.poll() is None:
                    os.killpg(os.getpgid(self.pid), signal.SIGKILL)
            except Exception:
                try:
                    self.pid.kill()
                except Exception:
                    pass
        if self.master_fd:
            try:
                os.close(self.master_fd)
            except Exception:
                pass
            self.master_fd = None


# ==================== Session Management ====================
SSH_SESSIONS = {}
SSH_LOCK = threading.Lock()
SESSION_TIMEOUT = 1800  # 30 minutes idle timeout


def cleanup_ssh_sessions():
    """Remove expired SSH sessions."""
    now = time.time()
    with SSH_LOCK:
        expired = [sid for sid, s in SSH_SESSIONS.items()
                   if now - s.last_active > SESSION_TIMEOUT]
        for sid in expired:
            try:
                s.close()
            except Exception:
                pass
            del SSH_SESSIONS[sid]


def check_sshpass():
    """Check if sshpass is available."""
    try:
        subprocess.check_output(['which', 'sshpass'], stderr=subprocess.PIPE)
        return True
    except Exception:
        return False


# ==================== HTTP Handler ====================
class NetViewHandler(SimpleHTTPRequestHandler):

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # CRUD GET endpoints
        if path == '/api/devices':
            return self._crud_get_all('devices')
        elif path == '/api/users':
            return self._crud_get_all('users')
        elif path == '/api/alert-rules':
            return self._crud_get_all('alert_rules')
        elif path == '/api/alert-records':
            return self._crud_get_all('alert_records')
        elif path == "/api/topology":
            return self._crud_get_all('topology')
        elif path == "/api/monitor-items":
            return self._crud_get_all('monitor_items')
        elif path == '/api/settings':
            return self._settings_get_all()
        elif path == '/api/templates':
            return self._crud_get_all('templates')

        # Fallback to static file serving
        SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # CRUD endpoints
        if path == '/api/devices':
            return self._crud_upsert('devices')
        elif path == '/api/users':
            return self._crud_upsert('users')
        elif path == '/api/alert-rules':
            return self._crud_upsert('alert_rules')
        elif path == '/api/alert-records':
            return self._crud_upsert('alert_records')
        elif path == "/api/topology":
            return self._crud_upsert('topology')
        elif path == "/api/monitor-items":
            return self._crud_upsert('monitor_items')
        elif path == '/api/settings':
            return self._settings_save()
        elif path == '/api/import':
            return self._handle_import()
        # Existing APIs
        elif path == '/api/ping':
            return self._handle_ping()
        elif path == '/api/telnet':
            return self._handle_telnet()
        elif path == '/api/ssh/connect':
            return self._handle_ssh_connect()
        elif path == '/api/ssh/exec':
            return self._handle_ssh_exec()
        elif path == '/api/ssh/disconnect':
            return self._handle_ssh_disconnect()
        elif path == '/api/ping-probe':
            return self._handle_ping_probe()
        elif path == '/api/snmp-probe':
            return self._handle_snmp_probe()
        elif path == '/api/snmp-collect':
            return self._handle_snmp_collect()
        elif path == '/api/templates':
            return self._crud_upsert('templates')
        else:
            self._send_json({'error': 'Not found'}, 404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # CRUD DELETE endpoints: /api/devices/{id}
        if path.startswith('/api/devices/'):
            return self._crud_delete('devices', path[len('/api/devices/'):])
        elif path.startswith('/api/users/'):
            return self._crud_delete('users', path[len('/api/users/'):])
        elif path.startswith('/api/alert-rules/'):
            return self._crud_delete('alert_rules', path[len('/api/alert-rules/'):])
        elif path.startswith('/api/alert-records/'):
            return self._crud_delete('alert_records', path[len('/api/alert-records/'):])
        elif path.startswith('/api/monitor-items/'):
            return self._crud_delete('monitor_items', path[len('/api/monitor-items/'):])
        elif path.startswith('/api/topology/'):
            return self._crud_delete('topology', path[len('/api/topology/'):])
        elif path.startswith('/api/templates/'):
            return self._crud_delete('templates', path[len('/api/templates/'):])
        else:
            self._send_json({'error': 'Not found'}, 404)

    # ==================== CRUD Handlers ====================
    def _crud_get_all(self, table):
        """GET /api/{table} - return all items."""
        items = mysql_get_all(table)
        if items is None:
            self._send_json({'error': 'Database unavailable'}, 503)
            return
        self._send_json(items)

    def _crud_upsert(self, table):
        """POST /api/{table} - upsert an item. Body must include 'id' field."""
        body = self._read_body()
        if body is None:
            return
        # Support both single item and list of items
        items = body if isinstance(body, list) else [body]
        results = []
        for item in items:
            item_id = item.get('id', '')
            if not item_id:
                results.append({'error': 'Missing id field'})
                continue
            ok = mysql_upsert(table, item_id, item)
            results.append({'id': item_id, 'success': ok})
        if len(results) == 1:
            self._send_json(results[0])
        else:
            self._send_json(results)

    def _crud_delete(self, table, item_id):
        """DELETE /api/{table}/{id} - delete an item."""
        if not item_id:
            self._send_json({'error': 'Missing id'}, 400)
            return
        ok = mysql_delete(table, item_id)
        self._send_json({'id': item_id, 'deleted': ok})

    # ==================== Settings Handlers ====================
    def _settings_get_all(self):
        """GET /api/settings - return all settings as key-value dict."""
        settings = mysql_get_all_settings()
        if settings is None:
            self._send_json({'error': 'Database unavailable'}, 503)
            return
        self._send_json(settings)

    def _settings_save(self):
        """POST /api/settings - save settings. Body is a key-value dict."""
        body = self._read_body()
        if body is None:
            return
        results = {}
        for key, value in body.items():
            if isinstance(value, dict) or isinstance(value, list):
                value = json.dumps(value, ensure_ascii=False)
            ok = mysql_set_setting(key, value)
            results[key] = ok
        self._send_json({'success': True, 'results': results})

    # ==================== Import Handler (migration) ====================
    def _handle_import(self):
        """POST /api/import - bulk import data from localStorage.
        Body format:
        {
            "devices": [...],
            "users": [...],
            "alertRules": [...],
            "alertRecords": [...],
            "settings": {"key": "value", ...}
        }
        """
        body = self._read_body()
        if body is None:
            return

        results = {}

        # Import devices
        devices = body.get('devices', [])
        count = 0
        for item in devices:
            item_id = item.get('id', '')
            if item_id and mysql_upsert('devices', item_id, item):
                count += 1
        results['devices'] = count

        # Import users
        users = body.get('users', [])
        count = 0
        for item in users:
            item_id = item.get('id', '')
            if item_id and mysql_upsert('users', item_id, item):
                count += 1
        results['users'] = count

        # Import alert rules
        rules = body.get('alertRules', [])
        count = 0
        for item in rules:
            item_id = item.get('id', '')
            if item_id and mysql_upsert('alert_rules', item_id, item):
                count += 1
        results['alertRules'] = count

        # Import alert records
        records = body.get('alertRecords', [])
        count = 0
        for item in records:
            item_id = item.get('id', '')
            if item_id and mysql_upsert('alert_records', item_id, item):
                count += 1
        results['alertRecords'] = count

        # Import settings
        settings = body.get('settings', {})
        count = 0
        for key, value in settings.items():
            if isinstance(value, dict) or isinstance(value, list):
                value = json.dumps(value, ensure_ascii=False)
            if mysql_set_setting(key, value):
                count += 1
        results['settings'] = count

        self._send_json({'success': True, 'imported': results})

    # ==================== PING ====================
    def _handle_ping(self):
        body = self._read_body()
        if body is None:
            return
        host = str(body.get('host', '')).strip()
        count = int(body.get('count', 4))
        count = max(1, min(count, 20))

        if not host or not SAFE_HOST_RE.match(host):
            self._send_json({'success': False, 'output': 'Invalid host'})
            return

        try:
            cmd = ['ping', '-c', str(count), '-W', '3', host]
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if PY3:
                stdout, stderr = proc.communicate(timeout=30)
                output = (stdout or b'').decode('utf-8', errors='replace')
                err = (stderr or b'').decode('utf-8', errors='replace')
            else:
                stdout, stderr = proc.communicate()
                output = (stdout or '').decode('utf-8', errors='replace')
                err = (stderr or '').decode('utf-8', errors='replace')

            if output:
                result = output
            else:
                result = err or 'Ping failed'

            success = proc.returncode == 0
            self._send_json({'success': success, 'output': result})
        except Exception as e:
            self._send_json({'success': False, 'output': str(e)})

    # ==================== TELNET ====================
    def _handle_telnet(self):
        body = self._read_body()
        if body is None:
            return
        host = str(body.get('host', '')).strip()
        port = int(body.get('port', 80))
        timeout = int(body.get('timeout', 5))
        timeout = max(1, min(timeout, 30))

        if not host or not SAFE_HOST_RE.match(host):
            self._send_json({'success': False, 'output': 'Invalid host'})
            return
        if not (1 <= port <= 65535):
            self._send_json({'success': False, 'output': 'Invalid port (1-65535)'})
            return

        try:
            start = time.time()
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((host, port))
            elapsed = time.time() - start
            sock.close()

            if result == 0:
                output = 'Connected to {}:{} successfully\nConnection time: {:.0f}ms\nPort is OPEN'.format(host, port, elapsed * 1000)
                success = True
            else:
                output = 'Connection to {}:{} failed\nError code: {}\nPort might be CLOSED or filtered'.format(host, port, result)
                success = False

            self._send_json({'success': success, 'output': output})
        except socket.timeout:
            self._send_json({'success': False, 'output': 'Connection to {}:{} timed out ({}s)'.format(host, port, timeout)})
        except Exception as e:
            self._send_json({'success': False, 'output': str(e)})

    # ==================== SSH CONNECT ====================
    def _handle_ssh_connect(self):
        cleanup_ssh_sessions()

        body = self._read_body()
        if body is None:
            return

        host = body.get('host', '').strip()
        port = int(body.get('port', 22))
        username = body.get('username', '').strip()
        password = body.get('password', '')
        name = body.get('name', host)

        if not host or not SAFE_HOST_RE.match(host):
            self._send_json({'success': False, 'output': 'Invalid host'})
            return
        if not username or not SAFE_USER_RE.match(username):
            self._send_json({'success': False, 'output': 'Invalid username'})
            return
        if not (1 <= port <= 65535):
            self._send_json({'success': False, 'output': 'Invalid port'})
            return

        if not check_sshpass():
            self._send_json({'success': False,
                            'output': 'sshpass not installed on server. Run: yum install -y sshpass'})
            return

        try:
            session = SSHSession(host, port, username, password, name)
            welcome = session.connect()

            session_id = 'sess-{}'.format(int(time.time() * 1000))
            with SSH_LOCK:
                SSH_SESSIONS[session_id] = session

            self._send_json({
                'success': True,
                'sessionId': session_id,
                'output': welcome,
            })
        except Exception as e:
            self._send_json({'success': False, 'output': str(e)})

    # ==================== SSH EXEC ====================
    def _handle_ssh_exec(self):
        cleanup_ssh_sessions()

        body = self._read_body()
        if body is None:
            return

        session_id = body.get('sessionId', '')
        command = body.get('command', '')
        is_raw = body.get('raw', False)

        with SSH_LOCK:
            session = SSH_SESSIONS.get(session_id)

        if not session:
            self._send_json({'success': False, 'output': 'Session not found or expired. Please reconnect.', 'closed': True})
            return

        try:
            if is_raw:
                output, closed = session.send_raw(command)
            else:
                output, closed = session.send_command(command)
            if closed:
                with SSH_LOCK:
                    SSH_SESSIONS.pop(session_id, None)
                try:
                    session.close()
                except Exception:
                    pass

            self._send_json({
                'success': True,
                'output': output,
                'closed': closed,
            })
        except Exception as e:
            with SSH_LOCK:
                SSH_SESSIONS.pop(session_id, None)
            try:
                session.close()
            except Exception:
                pass
            self._send_json({'success': False, 'output': str(e), 'closed': True})

    # ==================== SSH DISCONNECT ====================
    def _handle_ssh_disconnect(self):
        body = self._read_body()
        if body is None:
            return

        session_id = str(body.get('sessionId', ''))
        with SSH_LOCK:
            session = SSH_SESSIONS.pop(session_id, None)

        if session:
            try:
                session.close()
            except Exception:
                pass

        self._send_json({'success': True})

    # ==================== PING PROBE (quick, 1 packet) ====================
    def _handle_ping_probe(self):
        body = self._read_body()
        if body is None:
            return
        host = str(body.get('host', '')).strip()
        if not host or not SAFE_HOST_RE.match(host):
            self._send_json({'success': False, 'up': False})
            return
        try:
            cmd = ['ping', '-c', '1', '-W', '2', host]
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if PY3:
                stdout, stderr = proc.communicate(timeout=5)
            else:
                stdout, stderr = proc.communicate()
            up = proc.returncode == 0
            self._send_json({'success': True, 'up': up, 'host': host})
        except Exception as e:
            self._send_json({'success': False, 'up': False, 'error': str(e)})

    # ==================== SNMP PROBE ====================
    def _handle_snmp_probe(self):
        body = self._read_body()
        if body is None:
            return
        host = str(body.get('host', '')).strip()
        community = str(body.get('community', 'public')).strip()
        version = str(body.get('version', '2c')).strip()
        snmp_port = int(body.get('port', 161))
        if not host or not SAFE_HOST_RE.match(host):
            self._send_json({'success': False, 'up': False})
            return
        snmpget = None
        for candidate in ['snmpget', '/usr/bin/snmpget', '/usr/local/bin/snmpget']:
            try:
                subprocess.check_output(['which', candidate], stderr=subprocess.PIPE)
                snmpget = candidate
                break
            except Exception:
                pass
        if not snmpget:
            try:
                cmd = ['ping', '-c', '1', '-W', '2', host]
                proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if PY3:
                    stdout, stderr = proc.communicate(timeout=5)
                else:
                    stdout, stderr = proc.communicate()
                up = proc.returncode == 0
                self._send_json({'success': True, 'up': up, 'host': host, 'method': 'ping-fallback', 'note': 'snmpget not installed, using ping fallback'})
            except Exception as e:
                self._send_json({'success': False, 'up': False, 'error': str(e)})
            return
        try:
            snmp_ver = '2c' if version in ('v2c', '2c') else ('3' if version == 'v3' else '1')
            oid = '1.3.6.1.2.1.1.1.0'  # sysDescr
            target = '{}:{}'.format(host, snmp_port) if snmp_port != 161 else host
            cmd = [snmpget, '-v', snmp_ver, '-c', community, '-t', '2', '-r', '1', target, oid]
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if PY3:
                stdout, stderr = proc.communicate(timeout=5)
                output = (stdout or b'').decode('utf-8', errors='replace')
            else:
                stdout, stderr = proc.communicate()
                output = (stdout or '').decode('utf-8', errors='replace')
            up = proc.returncode == 0 and 'No Such' not in output and 'Timeout' not in output
            self._send_json({'success': True, 'up': up, 'host': host, 'community': community, 'method': 'snmpget'})
        except Exception as e:
            self._send_json({'success': False, 'up': False, 'error': str(e)})

    # ==================== SNMP COLLECT ====================
    def _handle_snmp_collect(self):
        """POST /api/snmp-collect - collect SNMP data using OIDs from template.
        Body: { host, community, version, port, oids: [{name, oid, method:'get'|'walk'}] }
        Returns: { success, results: [{name, oid, method, value}] }
        """
        body = self._read_body()
        if body is None:
            return
        host = str(body.get('host', '')).strip()
        community = str(body.get('community', 'public')).strip()
        version = str(body.get('version', '2c')).strip()
        snmp_port = int(body.get('port', 161))
        oids = body.get('oids', [])
        if not host or not SAFE_HOST_RE.match(host):
            self._send_json({'success': False, 'error': 'Invalid host'})
            return
        # Find snmpget and snmpwalk
        snmpget = None
        snmpwalk = None
        for candidate in ['snmpget', '/usr/bin/snmpget', '/usr/local/bin/snmpget']:
            try:
                subprocess.check_output(['which', candidate], stderr=subprocess.PIPE)
                snmpget = candidate
                break
            except Exception:
                pass
        for candidate in ['snmpwalk', '/usr/bin/snmpwalk', '/usr/local/bin/snmpwalk']:
            try:
                subprocess.check_output(['which', candidate], stderr=subprocess.PIPE)
                snmpwalk = candidate
                break
            except Exception:
                pass
        if not snmpget and not snmpwalk:
            self._send_json({'success': False, 'error': 'snmpget/snmpwalk not installed'})
            return
        snmp_ver = '2c' if version in ('v2c', '2c') else ('3' if version == 'v3' else '1')
        target = '{}:{}'.format(host, snmp_port) if snmp_port != 161 else host
        results = []
        for item in oids:
            name = str(item.get('name', ''))
            oid = str(item.get('oid', '')).strip()
            method = str(item.get('method', 'get'))
            if not oid:
                continue
            try:
                if method == 'walk' and snmpwalk:
                    cmd = [snmpwalk, '-v', snmp_ver, '-c', community, '-t', '2', '-r', '1', target, oid]
                elif method == 'get' and snmpget:
                    cmd = [snmpget, '-v', snmp_ver, '-c', community, '-t', '2', '-r', '1', target, oid]
                elif method == 'walk' and not snmpwalk and snmpget:
                    cmd = [snmpget, '-v', snmp_ver, '-c', community, '-t', '2', '-r', '1', target, oid]
                else:
                    results.append({'name': name, 'oid': oid, 'method': method, 'value': '', 'error': 'no tool'})
                    continue
                proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if PY3:
                    stdout, stderr = proc.communicate(timeout=15)
                    output = (stdout or b'').decode('utf-8', errors='replace')
                else:
                    stdout, stderr = proc.communicate()
                    output = (stdout or b'').decode('utf-8', errors='replace') if isinstance(stdout, bytes) else (stdout or '')
                results.append({'name': name, 'oid': oid, 'method': method, 'value': output.strip()})
            except Exception as e:
                results.append({'name': name, 'oid': oid, 'method': method, 'value': '', 'error': str(e)})
        self._send_json({'success': True, 'results': results})

    # ==================== UTILITIES ====================
    def _read_body(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self._send_json({'error': 'Empty body'}, 400)
                return None
            body = self.rfile.read(content_length)
            if PY3:
                body = body.decode('utf-8')
            return json.loads(body)
        except Exception as e:
            self._send_json({'error': 'Invalid JSON: ' + str(e)}, 400)
            return None

    def _send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False)
        if isinstance(body, type(u'')):
            body = body.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def end_headers(self):
        if self.path.startswith('/api/'):
            return SimpleHTTPRequestHandler.end_headers(self)
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('charset', 'utf-8')
        SimpleHTTPRequestHandler.end_headers(self)

    def log_message(self, format, *args):
        if not self.path.startswith('/api/'):
            return
        SimpleHTTPRequestHandler.log_message(self, format, *args)


class ReusableHTTPServer(HTTPServer):
    allow_reuse_address = True


def main():
    port = 80
    has_sshpass = check_sshpass()
    has_mysql = get_mysql() is not None

    print('NetView server running on port {} (sshpass: {}, mysql: {})'.format(port, has_sshpass, has_mysql))

    if not has_mysql:
        sys.stderr.write('WARNING: MySQL connection failed! Data will not be persisted.\n')
        sys.stderr.write('Check MySQL config: {}\n'.format(str(MYSQL_CONFIG)))

    if not has_sshpass:
        print('WARNING: sshpass not found! SSH remote will not work.')
        print('Install with: yum install -y epel-release && yum install -y sshpass')

    try:
        server = ReusableHTTPServer(('0.0.0.0', port), NetViewHandler)
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down...')
        with SSH_LOCK:
            for sid, s in SSH_SESSIONS.items():
                try:
                    s.close()
                except Exception:
                    pass
        server.shutdown()


if __name__ == '__main__':
    main()
