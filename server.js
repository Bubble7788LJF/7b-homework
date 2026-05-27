const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3788;
const DATA_FILE = path.join(__dirname, 'homework_data.json');
const VOICE_FILE = path.join(__dirname, 'voice_data.json');
const SCHEDULE_FILE = path.join(__dirname, 'schedule_data.json');
const STATE_FILE = path.join(__dirname, 'state_data.json');

// 初始化语音数据
function initVoiceData() {
  if (!fs.existsSync(VOICE_FILE)) {
    fs.writeFileSync(VOICE_FILE, JSON.stringify({ id: '', text: '', time: '' }, null, 2), 'utf8');
  }
}

// 初始化课表数据
function initScheduleData() {
  if (!fs.existsSync(SCHEDULE_FILE)) {
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

// 初始化提交状态数据
function initStateData() {
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

// 初始化作业数据
function initData() {
  if (!fs.existsSync(DATA_FILE)) {
    const today = getToday();
    const initial = {
      [today]: { chinese: '', math: '', english: '', science: '', social: '', reminder: '' }
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 读取静态文件
function serveFile(res, filePath, contentType) {
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType + '; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

initData();
initVoiceData();
initScheduleData();
initStateData();

// MIME 类型映射
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost`);
  const pathname = url.pathname;

  // API: 获取作业
  if (pathname === '/api/homework' && req.method === 'GET') {
    const date = url.searchParams.get('date') || getToday();
    const data = readData();
    const hw = data[date] || { chinese: '', math: '', english: '', science: '', social: '', reminder: '' };
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ date, homework: hw }));
    return;
  }

  // API: 保存作业
  if (pathname === '/api/homework' && req.method === 'POST') {
    const body = await parseBody(req);
    const date = body.date || getToday();
    const data = readData();
    data[date] = body.homework || {};
    writeData(data);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, date }));
    return;
  }

  // API: 获取所有日期列表
  if (pathname === '/api/dates' && req.method === 'GET') {
    const data = readData();
    const dates = Object.keys(data).sort().reverse();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ dates }));
    return;
  }

  // API: 获取语音消息（教室端轮询）
  if (pathname === '/api/voice' && req.method === 'GET') {
    try {
      const voice = JSON.parse(fs.readFileSync(VOICE_FILE, 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ voice }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ voice: { id: '', text: '', time: '' } }));
    }
    return;
  }

  // API: 发送语音消息（老师端）
  if (pathname === '/api/voice' && req.method === 'POST') {
    const body = await parseBody(req);
    const voice = {
      id: Date.now().toString(),
      text: body.text || '',
      time: body.time || new Date().toISOString()
    };
    fs.writeFileSync(VOICE_FILE, JSON.stringify(voice, null, 2), 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, voice }));
    return;
  }

  // API: 获取课表
  if (pathname === '/api/schedule' && req.method === 'GET') {
    const date = url.searchParams.get('date') || getToday();
    try {
      const all = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
      const day = all[date] || new Array(10).fill('');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ date, schedule: day }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ date, schedule: new Array(10).fill('') }));
    }
    return;
  }

  // API: 保存课表
  if (pathname === '/api/schedule' && req.method === 'POST') {
    const body = await parseBody(req);
    const date = body.date || getToday();
    try {
      const all = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
      all[date] = body.schedule || new Array(10).fill('');
      fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(all, null, 2), 'utf8');
    } catch (e) {
      const all = {};
      all[date] = body.schedule || new Array(10).fill('');
      fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(all, null, 2), 'utf8');
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, date }));
    return;
  }

  // API: 获取提交状态
  if (pathname === '/api/state' && req.method === 'GET') {
    const date = url.searchParams.get('date') || getToday();
    try {
      const all = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      const state = all[date] || {};
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ date, state }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ date, state: {} }));
    }
    return;
  }

  // API: 保存提交状态（学生端每次点击后同步）
  if (pathname === '/api/state' && req.method === 'POST') {
    const body = await parseBody(req);
    const date = body.date || getToday();
    try {
      const all = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      all[date] = body.state || {};
      fs.writeFileSync(STATE_FILE, JSON.stringify(all, null, 2), 'utf8');
    } catch (e) {
      const all = {};
      all[date] = body.state || {};
      fs.writeFileSync(STATE_FILE, JSON.stringify(all, null, 2), 'utf8');
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, date }));
    return;
  }

  // 静态文件
  if (pathname === '/' || pathname === '/index.html') {
    serveFile(res, path.join(__dirname, 'index.html'), 'text/html');
    return;
  }
  // 通用静态文件
  const ext = path.extname(pathname);
  if (MIME[ext]) {
    const filePath = path.join(__dirname, pathname);
    if (fs.existsSync(filePath)) {
      serveFile(res, filePath, MIME[ext]);
      return;
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n=======================================');
  console.log('  📚 7B班作业同步服务器已启动');
  console.log('=======================================');
  console.log(`  本机访问：  http://localhost:${PORT}`);
  console.log(`  局域网访问：http://${localIP}:${PORT}`);
  console.log('\n  👩‍🏫 老师在本机编辑作业');
  console.log(`  🖥️  教室电脑打开：http://${localIP}:${PORT}`);
  console.log('\n  按 Ctrl+C 停止服务器');
  console.log('=======================================\n');
});

// 获取本机局域网 IP
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
