/* ============================================
   ENAN Dashboard Live Widgets
   OpenWrt 24.10 LuCI
   ============================================ */

(function() {
  'use strict';

  const icons = {
    cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3"/><path d="M15 1v3"/><path d="M9 20v3"/><path d="M15 20v3"/><path d="M20 9h3"/><path d="M20 14h3"/><path d="M1 9h3"/><path d="M1 14h3"/></svg>',
    memory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01"/><path d="M10 10h.01"/><path d="M14 10h.01"/><path d="M18 10h.01"/></svg>',
    wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
    traffic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    wireless: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
    network: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="1"/><path d="M5 12a7 7 0 0 1 7-7"/><path d="M12 19a7 7 0 0 0 7-7"/></svg>',
    wan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
    lan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>'
  };

  function isNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function toNumber(value, fallback) {
    const number = Number(value);
    return isFinite(number) ? number : (fallback == null ? 0 : fallback);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatBytes(bytes) {
    const value = toNumber(bytes, 0);
    if (value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const amount = value / Math.pow(1024, index);
    return (amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)) + ' ' + units[index];
  }

  function formatMemoryMB(bytes) {
    const value = Math.max(0, toNumber(bytes, 0)) / (1024 * 1024);
    if (value <= 0) return '0 MB';
    return (value >= 10 ? value.toFixed(0) : value.toFixed(1)) + ' MB';
  }

  function formatUptime(seconds) {
    const value = Math.max(0, toNumber(seconds, 0));
    if (!value) return 'N/A';
    const days = Math.floor(value / 86400);
    const hours = Math.floor((value % 86400) / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const parts = [];
    if (days) parts.push(days + 'd');
    if (hours) parts.push(hours + 'h');
    if (minutes || !parts.length) parts.push(minutes + 'm');
    return parts.join(' ');
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, toNumber(value, min)));
  }

  function safeObject(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function callRpc(object, method) {
    if (typeof L === 'undefined' || !L.rpc || typeof L.rpc.declare !== 'function')
      return Promise.resolve({});

    try {
      const call = L.rpc.declare({
        object: object,
        method: method,
        expect: { '': {} }
      });
      return L.resolveDefault(call(), {});
    } catch (error) {
      return Promise.resolve({});
    }
  }

  function callAssocList(device) {
    if (!device || typeof L === 'undefined' || !L.rpc || typeof L.rpc.declare !== 'function')
      return Promise.resolve([]);

    try {
      const call = L.rpc.declare({
        object: 'iwinfo',
        method: 'assoclist',
        params: ['device', 'mac'],
        expect: { results: [] }
      });
      return L.resolveDefault(call(device), []).then(function(result) {
        if (Array.isArray(result)) return result;
        return Array.isArray(result && result.results) ? result.results : [];
      });
    } catch (error) {
      return Promise.resolve([]);
    }
  }

  function discoverPhysicalPorts() {
    if (typeof L === 'undefined' || typeof L.require !== 'function') return Promise.resolve([]);
    return L.require('fs').then(function(fs) {
      return L.resolveDefault(fs.list('/sys/class/net'), []).then(function(entries) {
        const result = [];
        const seen = {};
        const list = Array.isArray(entries) ? entries : [];
        list.forEach(function(entry) {
          const name = String(entry && entry.name || '');
          if (!name || /^(lo|br[-.]|bond|ppp|wlan|phy|sit|tun|tap|ifb|docker|veth)/i.test(name)) return;
          if (!/^(eth|lan|wan|port|sw|en)/i.test(name)) return;
          if (seen[name]) return;
          seen[name] = true;
          const lower = name.toLowerCase();
          result.push({ device: name, role: lower.indexOf('wan') === 0 ? 'wan' : (lower.indexOf('lan') === 0 ? 'lan' : 'unknown'), label: name });
        });
        return result;
      });
    }).catch(function() { return []; });
  }

  function callBuiltinPorts() {
    if (typeof L === 'undefined' || !L.rpc || typeof L.rpc.declare !== 'function') return discoverPhysicalPorts();
    try {
      const call = L.rpc.declare({ object: 'luci', method: 'getBuiltinEthernetPorts', expect: { result: [] } });
      return L.resolveDefault(call(), null).then(function(result) {
        return Array.isArray(result) && result.length ? result : discoverPhysicalPorts();
      });
    } catch (error) { return discoverPhysicalPorts(); }
  }

  function callDeviceStatus(device) {
    if (!device || typeof L === 'undefined' || !L.rpc || typeof L.rpc.declare !== 'function') return Promise.resolve({});
    try {
      const call = L.rpc.declare({ object: 'network.device', method: 'status', params: ['name'], expect: { '': {} } });
      return L.resolveDefault(call(device), {});
    } catch (error) { return Promise.resolve({}); }
  }

  function readPhysicalPortStatus(fs, device) {
    const base = '/sys/class/net/' + device;
    return Promise.all([
      readText(fs, base + '/carrier'),
      readText(fs, base + '/operstate'),
      readText(fs, base + '/speed'),
      readText(fs, base + '/statistics/rx_bytes'),
      readText(fs, base + '/statistics/tx_bytes')
    ]).then(function(values) {
      const carrierText = String(values[0] == null ? '' : values[0]).trim();
      const operstate = String(values[1] == null ? '' : values[1]).trim().toLowerCase();
      const carrier = carrierText === '1';
      const speed = Number(String(values[2] == null ? '' : values[2]).trim());
      return {
        carrier: carrier,
        operstate: operstate,
        up: carrier,
        speed: isFinite(speed) && speed > 0 ? speed : null,
        rx: toNumber(values[3], 0),
        tx: toNumber(values[4], 0)
      };
    });
  }

  function loadPhysicalPortStatuses(ports) {
    const list = Array.isArray(ports) ? ports : [];
    if (!list.length || typeof L === 'undefined' || typeof L.require !== 'function') return Promise.resolve({});
    return L.require('fs').then(function(fs) {
      return Promise.all(list.map(function(port) {
        const device = String(port && (port.device || port.name) || '');
        if (!device) return Promise.resolve(null);
        return readPhysicalPortStatus(fs, device).then(function(status) {
          return { device: device, status: status };
        });
      }));
    }).then(function(results) {
      const map = {};
      results.forEach(function(item) { if (item && item.device) map[item.device] = item.status; });
      return map;
    }).catch(function() { return {}; });
  }

  function loadSwitchPortStates() {
    if (typeof L === 'undefined' || typeof L.require !== 'function' || !L.rpc || typeof L.rpc.declare !== 'function') return Promise.resolve([]);
    return L.require('network').then(function(network) {
      if (!network || typeof network.getSwitchTopologies !== 'function') return [];
      return network.getSwitchTopologies().then(function(topologies) {
        const callState = L.rpc.declare({ object: 'luci', method: 'getSwconfigPortState', params: ['switch'], expect: { result: [] } });
        return Promise.all(Object.keys(topologies || {}).map(function(switchName) {
          const topology = safeObject(topologies[switchName]);
          return L.resolveDefault(callState(switchName), []).then(function(states) {
            const stateList = Array.isArray(states) ? states : [];
            return (Array.isArray(topology.ports) ? topology.ports : []).map(function(port) {
              const portNumber = Number(port && (port.num != null ? port.num : port.port));
              const state = stateList.find(function(item) { return Number(item && item.port) === portNumber; }) || safeObject(stateList[portNumber]);
              const label = String(port && (port.label || port.name || '') || '').trim();
              if (/cpu/i.test(label)) return null;
              const role = /wan/i.test(label) ? 'wan' : (/lan/i.test(label) ? 'lan' : 'unknown');
              const link = safeObject(state && state.link);
              const carrier = !!(state && (state.link === true || link.carrier === true));
              return {
                switchName: switchName,
                port: portNumber,
                label: label || ('Port ' + portNumber),
                role: role,
                carrier: carrier,
                speed: Number(state && state.speed) > 0 ? Number(state.speed) : null,
                duplex: state && state.duplex ? state.duplex : null,
                rx: 0,
                tx: 0
              };
            }).filter(Boolean);
          });
        })).then(function(groups) {
          return groups.reduce(function(all, group) { return all.concat(group); }, []);
        });
      });
    }).catch(function() { return []; });
  }

  function loadDeviceStatuses(ports) {
    const list = Array.isArray(ports) ? ports : [];
    if (!list.length) return callRpc('network.device', 'status');
    return Promise.all(list.map(function(port) {
      const item = safeObject(port);
      const device = item.device || item.name;
      return callDeviceStatus(device).then(function(status) { return { device: device, status: status }; });
    })).then(function(results) {
      const map = {};
      results.forEach(function(item) { if (item.device) map[item.device] = item.status; });
      return map;
    });
  }

  function readText(fs, path) {
    try { return L.resolveDefault(fs.read(path), ''); }
    catch (error) { return Promise.resolve(''); }
  }

  function parseCpuInfoFrequency(value) {
    const text = String(value == null ? '' : value);
    const match = text.match(/(?:cpu\s+MHz|clock)\s*[:@]\s*([0-9]+(?:\.[0-9]+)?)/i) || text.match(/([0-9]+(?:\.[0-9]+)?)\s*MHz/i);
    return match && Number(match[1]) > 0 ? Number(match[1]) : null;
  }

  function parseFrequencyMHz(value) {
    const text = String(value == null ? '' : value).trim();
    const match = text.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (!match) return null;
    const number = Number(match[1]);
    if (!isFinite(number) || number <= 0) return null;
    return number > 100000 ? number / 1000 : number;
  }

  function parseTemperatureC(value) {
    const text = String(value == null ? '' : value).trim();
    const match = text.match(/-?[0-9]+(?:\.[0-9]+)?/);
    if (!match) return null;
    const number = Number(match[0]);
    if (!isFinite(number)) return null;
    return Math.abs(number) > 200 ? number / 1000 : number;
  }

  function readHwmonTemperature(fs) {
    return L.resolveDefault(fs.list('/sys/class/hwmon'), []).then(function(entries) {
      const dirs = Array.isArray(entries) ? entries.filter(function(entry) { return entry && /^hwmon[0-9]+$/.test(entry.name || ''); }) : [];
      return Promise.all(dirs.map(function(dir) {
        const base = '/sys/class/hwmon/' + dir.name;
        return Promise.all([readText(fs, base + '/name')].concat(Array.from({length: 8}, function(_, i) { return readText(fs, base + '/temp' + (i + 1) + '_input'); })));
      })).then(function(groups) {
        let fallback = null;
        groups.forEach(function(group) {
          for (let i = 1; i < group.length; i++) {
            const value = parseTemperatureC(group[i]);
            if (value != null && fallback == null) fallback = value;
          }
        });
        return fallback;
      });
    }).catch(function() { return null; });
  }

  function readHardwareMetrics() {
    const empty = { cpuMHz: null, temperature: null };
    if (typeof L === 'undefined' || typeof L.require !== 'function') return Promise.resolve(empty);
    return L.require('fs').then(function(fs) {
      const cpuPaths = [
        '/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq',
        '/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_cur_freq',
        '/sys/devices/system/cpu/cpufreq/policy0/scaling_cur_freq',
        '/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq',
        '/proc/cpuinfo'
      ];
      return Promise.all(cpuPaths.map(function(path) { return readText(fs, path); })).then(function(cpuValues) {
        let cpuMHz = null;
        for (let i = 0; i < cpuValues.length && cpuMHz == null; i++) {
          cpuMHz = i === cpuValues.length - 1 ? parseCpuInfoFrequency(cpuValues[i]) : parseFrequencyMHz(cpuValues[i]);
        }
        return L.resolveDefault(fs.list('/sys/class/thermal'), []).then(function(entries) {
          const zones = Array.isArray(entries) ? entries.filter(function(entry) {
            return entry && /^thermal_zone[0-9]+$/.test(entry.name || '');
          }) : [];
          return Promise.all(zones.map(function(zone) {
            const base = '/sys/class/thermal/' + zone.name;
            return Promise.all([readText(fs, base + '/temp'), readText(fs, base + '/type')]);
          })).then(function(values) {
            let temperature = null;
            let fallback = null;
            values.forEach(function(pair) {
              const value = parseTemperatureC(pair[0]);
              const type = String(pair[1] || '').toLowerCase();
              if (value == null) return;
              if (fallback == null) fallback = value;
              if (temperature == null && (type.indexOf('cpu') >= 0 || type.indexOf('soc') >= 0 || type.indexOf('package') >= 0)) temperature = value;
            });
            if (temperature != null || fallback != null)
              return { cpuMHz: cpuMHz, temperature: temperature == null ? fallback : temperature };
            return readHwmonTemperature(fs).then(function(hwmonTemperature) {
              return { cpuMHz: cpuMHz, temperature: hwmonTemperature };
            });
          });
        }).catch(function() {
          return readHwmonTemperature(fs).then(function(hwmonTemperature) {
            return { cpuMHz: cpuMHz, temperature: hwmonTemperature };
          });
        });
      });
    }).catch(function() { return empty; });
  }

  function extractCpuFrequency(board, systemInfo, hardware) {
    const hardwareInfo = safeObject(hardware);
    if (isNumber(hardwareInfo.cpuMHz) && hardwareInfo.cpuMHz > 0)
      return Math.round(hardwareInfo.cpuMHz) + ' MHz';
    const boardInfo = safeObject(board);
    const sysInfo = safeObject(systemInfo);
    const cpuInfo = safeObject(boardInfo.cpuinfo);
    const candidates = [
      boardInfo.cpu_mhz,
      boardInfo.cpufreq,
      cpuInfo.mhz,
      sysInfo.cpu_mhz,
      sysInfo.cpufreq,
      cpuInfo.frequency
    ];

    for (let i = 0; i < candidates.length; i++) {
      if (isNumber(candidates[i]) && candidates[i] > 0)
        return Math.round(candidates[i]) + ' MHz';
      if (typeof candidates[i] === 'string') {
        const match = candidates[i].match(/([0-9]+(?:\.[0-9]+)?)\s*(?:MHz|Mhz)/);
        if (match) return Math.round(Number(match[1])) + ' MHz';
      }
    }

    return 'N/A';
  }

  function getMemory(systemInfo) {
    const memory = safeObject(safeObject(systemInfo).memory);
    // LuCI system.info reports memory counters in bytes. Storage root/tmp
    // counters are handled separately because those are exposed in KiB.
    const total = toNumber(memory.total, 0);
    const free = memory.free != null ? toNumber(memory.free, 0) : toNumber(memory.available, 0);
    const used = Math.max(0, total - free);
    return { total: total, free: free, used: used };
  }

  function getStorage(systemInfo, key) {
    const item = safeObject(safeObject(systemInfo)[key]);
    const total = toNumber(item.total, 0) * 1024;
    const free = toNumber(item.free, 0) * 1024;
    const used = item.used != null ? toNumber(item.used, 0) * 1024 : Math.max(0, total - free);
    return { total: total, free: free, used: used };
  }

  function getLoad(systemInfo) {
    const load = Array.isArray(safeObject(systemInfo).load) ? systemInfo.load[0] : 0;
    return clamp(toNumber(load, 0) / 65535, 0, 1);
  }

  function getTemperature(systemInfo, board, hardware) {
    const hardwareInfo = safeObject(hardware);
    if (isNumber(hardwareInfo.temperature)) return Math.round(hardwareInfo.temperature);
    const sysInfo = safeObject(systemInfo);
    const boardInfo = safeObject(board);
    const candidates = [sysInfo.temperature, sysInfo.cpu_temperature, boardInfo.temperature];
    for (let i = 0; i < candidates.length; i++) {
      if (isNumber(candidates[i])) return Math.round(candidates[i]);
    }
    return null;
  }

  function getWirelessEntries(devices) {
    const source = safeObject(devices);
    const entries = [];

    Object.keys(source).forEach(function(radioName) {
      const radio = safeObject(source[radioName]);
      const interfaces = Array.isArray(radio.interfaces) ? radio.interfaces : [];

      if (interfaces.length) {
        interfaces.forEach(function(iface) {
          const item = safeObject(iface);
          const info = safeObject(item.iwinfo || radio.iwinfo || item);
          entries.push({
            radio: radioName,
            ifname: item.ifname || item.device || radioName,
            ssid: item.ssid || info.ssid || radio.ssid || item.ifname || radioName,
            band: item.band || radio.band || '',
            channel: info.channel || item.channel || radio.channel || null,
            frequency: info.frequency || item.frequency || radio.frequency || null,
            bitrate: info.bitrate || item.bitrate || radio.bitrate || null,
            quality: info.quality,
            qualityMax: info.quality_max,
            clients: []
          });
        });
      } else if (radio.ifname || radio.ssid || radio.iwinfo) {
        const info = safeObject(radio.iwinfo || radio);
        entries.push({
          radio: radioName,
          ifname: radio.ifname || radioName,
          ssid: radio.ssid || info.ssid || radioName,
          band: radio.band || '',
          channel: info.channel || radio.channel || null,
          frequency: info.frequency || radio.frequency || null,
          bitrate: info.bitrate || radio.bitrate || null,
          quality: info.quality,
          qualityMax: info.quality_max,
          clients: []
        });
      }
    });

    return entries;
  }

  function bandLabel(entry) {
    const band = String(entry.band || '').toLowerCase();
    if (band.indexOf('5') >= 0) return '5 GHz';
    if (band.indexOf('2') >= 0) return '2.4 GHz';
    const frequency = toNumber(entry.frequency, 0);
    if (frequency >= 5000) return '5 GHz';
    if (frequency >= 2000) return '2.4 GHz';
    return 'Wireless';
  }

  function wirelessLoad(entry) {
    if (entry.qualityMax && isNumber(entry.quality))
      return clamp((entry.quality / entry.qualityMax) * 100, 0, 100);
    return 0;
  }

  function loadWirelessData(devices) {
    const entries = getWirelessEntries(devices);
    return Promise.all(entries.map(function(entry) {
      return callAssocList(entry.ifname).then(function(clients) {
        entry.clients = clients;
        return entry;
      });
    }));
  }

  function getDeviceStatusMap(rawStatus) {
    const map = {};
    if (Array.isArray(rawStatus)) {
      rawStatus.forEach(function(item) {
        if (item && item.name) map[item.name] = item;
      });
      return map;
    }

    const source = safeObject(rawStatus);
    const devices = source.devices && typeof source.devices === 'object' ? source.devices : source;
    Object.keys(devices).forEach(function(name) {
      if (devices[name] && typeof devices[name] === 'object') map[name] = devices[name];
    });
    return map;
  }

  function mergePhysicalPortSources(portData, networkDevices, netIfaces, board) {
    const merged = [];
    const seen = {};
    const add = function(device, label, role) {
      const name = String(device || '');
      if (!name || seen[name] || /^(lo|br[-.]|bond|ppp|wlan|phy|sit|tun|tap|ifb|docker|veth)/i.test(name)) return;
      if (/\\.([0-9]+)$/.test(name)) return;
      if (!/^(eth|lan|wan|port|sw|en)/i.test(name)) return;
      seen[name] = true;
      const lower = name.toLowerCase();
      merged.push({ device: name, label: label || name, role: role || (lower.indexOf('wan') === 0 ? 'wan' : (lower.indexOf('lan') === 0 ? 'lan' : 'unknown')) });
    };

    (Array.isArray(portData) ? portData : []).forEach(function(port) {
      const item = safeObject(port);
      add(item.device || item.name, item.label || item.name || item.device, item.role);
    });

    const deviceMap = Array.isArray(networkDevices) ? networkDevices : safeObject(networkDevices);
    if (Array.isArray(deviceMap)) {
      deviceMap.forEach(function(item) {
        const value = safeObject(item);
        add(value.name || value.device || value.ifname, value.name || value.device || value.ifname, value.role);
      });
    } else {
      Object.keys(deviceMap).forEach(function(name) {
        const value = safeObject(deviceMap[name]);
        add(value.name || name, value.name || name, value.role);
      });
    }

    const interfaces = Array.isArray(safeObject(netIfaces).interface) ? netIfaces.interface : [];
    interfaces.forEach(function(item) {
      const value = safeObject(item);
      add(value.device || value.l3_device, value.device || value.l3_device, value.role);
    });

    if (!merged.length) {
      const network = safeObject(safeObject(board).network);
      ['lan', 'wan'].forEach(function(role) {
        const item = safeObject(network[role]);
        if (Array.isArray(item.ports)) item.ports.forEach(function(device) { add(device, device, role); });
        else add(item.device, role.toUpperCase(), role);
      });
    }
    return merged;
  }

  function getInterfaceRows(netIfaces, rawStatus, portData, board, switchPorts, fileStatus) {
    const statusMap = getDeviceStatusMap(rawStatus);
    const interfaces = Array.isArray(safeObject(netIfaces).interface) ? netIfaces.interface : [];
    const boardNetwork = safeObject(safeObject(board).network);
    const rows = [];
    const ports = [];
    const seen = {};

    function addPort(device, label, role) {
      if (!device || seen[device] || /\\.([0-9]+)$/.test(String(device))) return;
      seen[device] = true;
      ports.push({ device: device, label: label || device, role: role || '' });
    }

    // Preferred source: luci.getBuiltinEthernetPorts(), as used by LuCI's Port status view.
    const builtin = Array.isArray(portData) ? portData : [];
    builtin.forEach(function(port) {
      const item = safeObject(port);
      addPort(item.device || item.name, item.label || item.name || item.device, item.role);
    });

    // Fallback for boards which do not expose getBuiltinEthernetPorts().
    if (!ports.length) {
      ['wan', 'lan'].forEach(function(role) {
        const item = safeObject(boardNetwork[role]);
        if (Array.isArray(item.ports)) item.ports.forEach(function(device) { addPort(device, device, role); });
        else addPort(item.device, role.toUpperCase(), role);
      });
    }

    function makeRow(device, label, role, iface) {
      const logical = safeObject(iface);
      const status = safeObject(statusMap[device] || statusMap[logical.interface] || statusMap[label]);
      const link = safeObject(status.link);
      const statistics = safeObject(status.stats || status.statistics || logical.statistics);
      const physical = safeObject(safeObject(fileStatus)[device]);
      const hasCarrier = typeof physical.carrier === 'boolean';
      const lower = String(label || device).toLowerCase();
      return {
        name: String(label || device).toUpperCase(),
        device: device,
        role: role || '',
        // sysfs carrier is authoritative for a copper link; logical up state
        // alone remains a fallback for devices without a readable carrier.
        isUp: hasCarrier ? physical.carrier : (logical.up === true || status.up === true || status.carrier === true || link.carrier === true),
        speed: physical.speed || logical.speed || link.speed || status.speed || null,
        rx: physical.rx || toNumber(statistics.rx_bytes, 0),
        tx: physical.tx || toNumber(statistics.tx_bytes, 0),
        icon: (role === 'wan' || lower.indexOf('wan') === 0) ? icons.wan : icons.lan
      };
    }

    // On swconfig targets, the switch port state is the authoritative source
    // for the cable link. Do not replace these ports with eth0 VLAN rows.
    const switchList = Array.isArray(switchPorts) ? switchPorts : [];
    if (switchList.length) {
      return switchList.map(function(port) {
        const label = String(port.label || port.device || ('Port ' + port.port));
        const lower = label.toLowerCase();
        return {
          name: label.toUpperCase(),
          device: port.device || label,
          role: port.role || (lower.indexOf('wan') >= 0 ? 'wan' : (lower.indexOf('lan') >= 0 ? 'lan' : 'unknown')),
          isUp: port.carrier === true,
          speed: port.speed || null,
          rx: toNumber(port.rx, 0),
          tx: toNumber(port.tx, 0),
          icon: (port.role === 'wan' || lower.indexOf('wan') >= 0) ? icons.wan : icons.lan
        };
      });
    }

    // When physical netdev ports are known, show every one and do not replace
    // them with a single bridge/VLAN row.
    if (ports.length)
      return ports.map(function(port) { return makeRow(port.device, port.label, port.role, null); });

    interfaces.forEach(function(item) {
      const iface = safeObject(item);
      const name = iface.interface || iface.name || iface.device;
      if (!name || name === 'loopback' || name === 'lo') return;
      rows.push(makeRow(iface.device || name, name, name.toLowerCase().indexOf('wan') === 0 ? 'wan' : '', iface));
    });

    if (!rows.length) {
      Object.keys(statusMap).forEach(function(name) {
        const lower = name.toLowerCase();
        if (lower === 'lo' || lower === 'loopback') return;
        rows.push(makeRow(name, name, lower.indexOf('wan') === 0 ? 'wan' : '', null));
      });
    }
    return rows;
  }

  function totalTraffic(rows) {
    return rows.reduce(function(total, row) {
      return total + toNumber(row.rx, 0) + toNumber(row.tx, 0);
    }, 0);
  }

  function buildDashboard() {
    const container = document.getElementById('enan-dashboard-content');
    if (!container) return;
    if (container.dataset.enanBuilt === '1') return;
    container.dataset.enanBuilt = '1';
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'enan-dash-header';
    header.innerHTML = '<h1 class="enan-dash-title">Dashboard Overview</h1>' +
      '<div class="enan-dash-meta">' +
      '<span id="dash-model">N/A</span><span class="dot"></span>' +
      '<span id="dash-release">OpenWrt N/A</span><span class="dot"></span>' +
      '<span id="dash-kernel">Kernel N/A</span><span class="dot"></span>' +
      '<span id="dash-uptime">Uptime: N/A</span></div>';
    container.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'enan-dash-grid';
    grid.id = 'enan-dash-grid';
    container.appendChild(grid);

    const sysPanel = document.createElement('div');
    sysPanel.className = 'enan-panel';
    sysPanel.innerHTML = '<div class="enan-panel-header"><div class="enan-panel-title">' + icons.system + ' System Resources</div></div><div id="enan-sys-resources"></div>';
    container.appendChild(sysPanel);

    const wifiPanel = document.createElement('div');
    wifiPanel.className = 'enan-panel';
    wifiPanel.innerHTML = '<div class="enan-panel-header"><div class="enan-panel-title">' + icons.wireless + ' Wireless Load</div><span id="enan-wifi-badge" class="enan-panel-badge broadcasting">N/A</span></div><div id="enan-wireless-load"></div>';
    container.appendChild(wifiPanel);

    const netPanel = document.createElement('div');
    netPanel.className = 'enan-panel';
    netPanel.innerHTML = '<div class="enan-panel-header"><div class="enan-panel-title">' + icons.network + ' Network Interfaces</div><span id="enan-net-badge" class="enan-panel-badge online">N/A</span></div><div class="enan-net-grid" id="enan-net-interfaces"></div>';
    container.appendChild(netPanel);

    updateDashboard();
    if (window._enanDashboardInterval) clearInterval(window._enanDashboardInterval);
    window._enanDashboardInterval = setInterval(updateDashboard, 5000);
  }

  function updateDashboard() {
    if (window._enanDashboardUpdating) return;
    if (typeof L === 'undefined' || !L.rpc) return;
    window._enanDashboardUpdating = true;

    Promise.all([
      callRpc('system', 'info'),
      callRpc('system', 'board'),
      callRpc('network.interface', 'dump'),
      callRpc('luci-rpc', 'getWirelessDevices'),
      callBuiltinPorts(),
      callRpc('luci-rpc', 'getNetworkDevices'),
      readHardwareMetrics(),
      loadSwitchPortStates()
    ]).then(function(data) {
      const systemInfo = safeObject(data[0]);
      const board = safeObject(data[1]);
      const netIfaces = safeObject(data[2]);
      const ports = Array.isArray(data[4]) ? data[4] : [];
      const networkDevices = data[5];
      const physicalPorts = mergePhysicalPortSources(ports, networkDevices, netIfaces, board);
      const hardware = safeObject(data[6]);
      const switchPorts = Array.isArray(data[7]) ? data[7] : [];
      return Promise.all([loadWirelessData(data[3]), loadDeviceStatuses(physicalPorts), loadPhysicalPortStatuses(physicalPorts)]).then(function(results) {
        const wireless = results[0];
        const deviceStatus = results[1];
        const fileStatus = results[2];
        const interfaceRows = getInterfaceRows(netIfaces, deviceStatus, physicalPorts, board, switchPorts, fileStatus);
        updateHeader(systemInfo, board);
        updateStatsGrid(systemInfo, board, hardware, wireless, interfaceRows);
        updateSystemResources(systemInfo, board, hardware);
        updateWirelessLoad(wireless);
        updateNetworkInterfaces(interfaceRows);
      });
    }).catch(function(error) {
      if (window.console && console.warn) console.warn('[ENAN Dashboard] Update error', error);
    }).then(function() {
      window._enanDashboardUpdating = false;
    });
  }

  function updateHeader(systemInfo, board) {
    const release = safeObject(board.release);
    const model = board.model || board.board_name || 'N/A';
    const releaseText = release.version || release.description || 'N/A';
    const kernel = board.kernel || 'N/A';
    const uptime = formatUptime(systemInfo.uptime);
    const modelEl = document.getElementById('dash-model');
    const releaseEl = document.getElementById('dash-release');
    const kernelEl = document.getElementById('dash-kernel');
    const uptimeEl = document.getElementById('dash-uptime');
    if (modelEl) modelEl.textContent = model;
    if (releaseEl) releaseEl.textContent = 'OpenWrt ' + releaseText;
    if (kernelEl) kernelEl.textContent = 'Kernel ' + kernel;
    if (uptimeEl) uptimeEl.textContent = 'Uptime: ' + uptime;

    const hostnameValue = safeObject(systemInfo).hostname || safeObject(board).hostname || '';
    const hostname = document.getElementById('enan-hostname');
    if (hostname && hostnameValue) hostname.textContent = hostnameValue;
    const deviceInfo = document.getElementById('enan-device-info');
    if (deviceInfo) {
      const description = release.description || release.version || 'OpenWrt';
      deviceInfo.textContent = (board.model || 'N/A') + ' • ' + (board.system || 'N/A') + ' • ' + description;
    }
  }

  function updateStatsGrid(systemInfo, board, hardware, wireless, interfaceRows) {
    const grid = document.getElementById('enan-dash-grid');
    if (!grid) return;
    const memory = getMemory(systemInfo);
    const clients = wireless.reduce(function(total, item) {
      return total + (Array.isArray(item.clients) ? item.clients.length : 0);
    }, 0);
    const traffic = totalTraffic(interfaceRows);
    const trafficValue = traffic > 0 ? formatBytes(traffic) : '0 B';

    grid.innerHTML =
      '<div class="enan-dash-card"><div class="enan-dash-card-header"><div class="enan-dash-card-icon">' + icons.cpu + '</div></div><div class="enan-dash-card-value">' + escapeHtml(extractCpuFrequency(board, systemInfo, hardware)) + '</div><div class="enan-dash-card-label">CPU Frequency</div></div>' +
      '<div class="enan-dash-card"><div class="enan-dash-card-header"><div class="enan-dash-card-icon">' + icons.memory + '</div></div><div class="enan-dash-card-value">' + escapeHtml(formatMemoryMB(memory.free)) + '</div><div class="enan-dash-card-label">RAM Free / ' + escapeHtml(formatMemoryMB(memory.total)) + '</div></div>' +
      '<div class="enan-dash-card"><div class="enan-dash-card-header"><div class="enan-dash-card-icon">' + icons.wifi + '</div></div><div class="enan-dash-card-value">' + clients + '</div><div class="enan-dash-card-label">Active WiFi Clients</div></div>' +
      '<div class="enan-dash-card"><div class="enan-dash-card-header"><div class="enan-dash-card-icon">' + icons.traffic + '</div></div><div class="enan-dash-card-value">' + escapeHtml(trafficValue) + '</div><div class="enan-dash-card-label">Total Traffic Since Boot</div></div>';
  }

  function updateSystemResources(systemInfo, board, hardware) {
    const container = document.getElementById('enan-sys-resources');
    if (!container) return;
    const memory = getMemory(systemInfo);
    const root = getStorage(systemInfo, 'root');
    const temperature = getTemperature(systemInfo, board, hardware);
    const load = getLoad(systemInfo);
    const memoryPercent = memory.total > 0 ? clamp((memory.used / memory.total) * 100, 0, 100) : 0;
    const flashPercent = root.total > 0 ? clamp((root.used / root.total) * 100, 0, 100) : 0;
    const tempPercent = temperature == null ? 0 : clamp((temperature / 80) * 100, 0, 100);
    const tempText = temperature == null ? 'N/A' : temperature + '°C';
    const rootText = root.total > 0 ? formatBytes(root.used) + ' / ' + formatBytes(root.total) : 'N/A';
    const memoryText = memory.total > 0 ? formatBytes(memory.used) + ' / ' + formatBytes(memory.total) : 'N/A';

    container.innerHTML =
      progressRow('CPU Load (1m)', load.toFixed(2), load * 100, 'blue') +
      progressRow('Memory Usage', memoryText, memoryPercent, 'green') +
      progressRow('Flash Usage', rootText, flashPercent, 'gold') +
      progressRow('Temperature', tempText, tempPercent, 'red');
  }

  function progressRow(label, value, percent, color) {
    return '<div class="enan-progress-row"><div class="enan-progress-label"><span class="enan-progress-label-name">' + escapeHtml(label) + '</span><span class="enan-progress-label-value">' + escapeHtml(value) + '</span></div><div class="enan-progress-track"><div class="enan-progress-fill ' + color + '" style="width:' + clamp(percent, 0, 100) + '%"></div></div></div>';
  }

  function updateWirelessLoad(entries) {
    const container = document.getElementById('enan-wireless-load');
    const badge = document.getElementById('enan-wifi-badge');
    if (!container) return;
    if (!entries.length) {
      if (badge) badge.textContent = 'Unavailable';
      container.innerHTML = '<div class="enan-empty-state">No wireless interfaces detected</div>';
      return;
    }

    const totalClients = entries.reduce(function(total, entry) {
      return total + entry.clients.length;
    }, 0);
    if (badge) badge.textContent = totalClients + ' client' + (totalClients === 1 ? '' : 's');
    container.innerHTML = entries.map(function(entry) {
      const channel = entry.channel ? 'Ch ' + entry.channel : 'Ch N/A';
      const bitrate = entry.bitrate ? formatBytes(toNumber(entry.bitrate, 0) * 1000 / 8) + '/s' : 'N/A';
      return '<div class="enan-wifi-item"><div class="enan-wifi-header"><div class="enan-wifi-name">' + escapeHtml(entry.ssid) + '<span class="enan-wifi-band">' + escapeHtml(bandLabel(entry)) + '</span></div><span class="enan-wifi-clients">' + entry.clients.length + ' client' + (entry.clients.length === 1 ? '' : 's') + '</span></div><div class="enan-wifi-stats"><span>↓ ' + escapeHtml(bitrate) + '</span><span>↑ N/A</span><span>' + escapeHtml(channel) + '</span></div><div class="enan-progress-track enan-wifi-bar"><div class="enan-progress-fill gold" style="width:' + wirelessLoad(entry) + '%"></div></div></div>';
    }).join('');
  }

  function updateNetworkInterfaces(rows) {
    const container = document.getElementById('enan-net-interfaces');
    const badge = document.getElementById('enan-net-badge');
    if (!container) return;
    const online = rows.filter(function(row) { return row.isUp; }).length;
    if (badge) badge.textContent = rows.length ? online + '/' + rows.length + ' online' : 'Unavailable';
    if (!rows.length) {
      container.innerHTML = '<div class="enan-empty-state">No network interfaces detected</div>';
      return;
    }
    container.innerHTML = rows.map(function(row) {
      const speed = row.speed ? row.speed + ' Mbps' : 'N/A';
      return '<div class="enan-net-item ' + (row.isUp ? 'up' : '') + '"><div class="enan-net-icon">' + row.icon + '</div><div class="enan-net-name">' + escapeHtml(row.name) + '</div><div class="enan-net-status">' + (row.isUp ? 'UP' : 'DOWN') + '</div><div class="enan-net-speed">' + escapeHtml(speed) + '</div><div class="enan-net-traffic"><span class="down">↓ ' + escapeHtml(formatBytes(row.rx)) + '</span><span class="up">↑ ' + escapeHtml(formatBytes(row.tx)) + '</span></div></div>';
    }).join('');
  }

  window.enanBuildDashboard = buildDashboard;
  window.enanRefreshDashboard = updateDashboard;
})();
