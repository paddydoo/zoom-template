import express from 'express';
import multer from 'multer';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

mkdirSync(join(__dirname, 'public', 'media'), { recursive: true });
mkdirSync(join(__dirname, 'out'), { recursive: true });

const app = express();
const PORT = 3001;

app.use(express.json());
app.use('/out', express.static(join(__dirname, 'out')));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, join(__dirname, 'public', 'media')),
  filename: (req, file, cb) => cb(null, `${req.params.slot}${extname(file.originalname)}`),
});
const upload = multer({ storage });

app.post('/upload/:slot', upload.single('file'), (req, res) => {
  res.json({ src: `media/${req.file.filename}` });
});

app.get('/props', (_, res) => {
  const p = join(__dirname, 'input-props.json');
  res.json(existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {});
});

app.post('/props', (req, res) => {
  writeFileSync(join(__dirname, 'input-props.json'), JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

app.post('/open-output', (_, res) => {
  const file = join(__dirname, 'out', 'output.mp4');
  if (!existsSync(file)) return res.status(404).json({ error: 'No output yet' });
  const cmd = process.platform === 'win32' ? `start "" "${file}"` :
               process.platform === 'darwin' ? `open "${file}"` : `xdg-open "${file}"`;
  spawn(cmd, { shell: true });
  res.json({ ok: true });
});

let renderProc = null;
app.get('/render-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (type, msg) => res.write(`data: ${JSON.stringify({ type, msg })}\n\n`);

  if (renderProc) { send('error', 'A render is already running.'); return res.end(); }

  send('log', 'Starting render…\n');
  renderProc = spawn('npm', ['run', 'render'], { cwd: __dirname, shell: true, env: { ...process.env } });
  renderProc.stdout.on('data', d => send('log', d.toString()));
  renderProc.stderr.on('data', d => send('log', d.toString()));
  renderProc.on('close', code => {
    send(code === 0 ? 'done' : 'error',
      code === 0 ? 'Render complete! Output saved to out/output.mp4' : `Render failed (exit code ${code})`);
    renderProc = null;
    res.end();
  });
  req.on('close', () => { renderProc?.kill(); renderProc = null; });
});

app.get('/', (_, res) => res.send(HTML));

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Zoom Template Setup → ${url}\n`);
  const cmd = process.platform === 'win32' ? `start ${url}` :
               process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
  spawn(cmd, { shell: true });
});

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Zoom Template Setup</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#111113;color:#e0e0e0;min-height:100vh}
header{padding:20px 28px;border-bottom:1px solid #222226;display:flex;align-items:center;gap:14px}
header h1{font-size:16px;font-weight:600;color:#fff}
header p{font-size:12px;color:#555}
.main{padding:24px 28px}
.slots{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px}
.card{background:#18181b;border:1px solid #222226;border-radius:10px;padding:16px}
.card h3{font-size:10px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
.dz{border:2px dashed #2a2a2e;border-radius:8px;padding:20px 12px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s;margin-bottom:12px;position:relative;min-height:80px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.dz:hover,.dz.over{border-color:#3b82f6;background:rgba(59,130,246,.06)}
.dz input{display:none}
.dz .ico{font-size:22px}
.dz .hint{font-size:11px;color:#555}
.dz .fn{font-size:11px;color:#3b82f6;font-weight:500;word-break:break-all;padding:0 4px}
.field{margin-bottom:10px}
.field label{display:block;font-size:11px;color:#555;margin-bottom:3px}
input[type=text],input[type=number]{width:100%;background:#0d0d10;border:1px solid #222226;border-radius:6px;padding:7px 10px;color:#e0e0e0;font-size:13px;outline:none;transition:border-color .15s}
input:focus{border-color:#3b82f6}
.toolbar{background:#18181b;border:1px solid #222226;border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.dur{display:flex;align-items:center;gap:8px}
.dur label{font-size:12px;color:#666;white-space:nowrap}
.dur input{width:70px}
.dur span{font-size:12px;color:#444}
.sp{flex:1}
button{padding:8px 14px;border-radius:6px;border:none;font-size:13px;font-weight:500;cursor:pointer;transition:opacity .15s;white-space:nowrap}
button:hover{opacity:.82}
button:disabled{opacity:.35;cursor:not-allowed}
.bs{background:#27272a;color:#ccc}
.bst{background:#1d4ed8;color:#fff}
.br{background:#15803d;color:#fff}
.bo{background:#0f766e;color:#fff}
.sm{font-size:11px;color:#555}
.sm.ok{color:#4ade80}
.sm.er{color:#f87171}
.con{background:#08080d;border:1px solid #1a1a1e;border-radius:10px;overflow:hidden;margin-bottom:14px;display:none}
.con.show{display:block}
.ch{padding:8px 14px;border-bottom:1px solid #141418;font-size:11px;color:#444;display:flex;justify-content:space-between}
.cb{font-family:monospace;font-size:11px;color:#86efac;padding:14px;height:200px;overflow-y:auto;white-space:pre-wrap;word-break:break-all}
.out{display:none;background:#18181b;border:1px solid #222226;border-radius:10px;padding:16px}
.out.show{display:flex;align-items:center;gap:14px}
.out h3{font-size:13px;color:#4ade80;margin-bottom:6px}
.out p{font-size:12px;color:#555;margin-bottom:10px}
</style>
</head>
<body>
<header>
  <h1>🎬 Zoom Template</h1>
  <p>Upload your media, configure names, then render</p>
</header>
<div class="main">
  <div class="slots">
    <div class="card">
      <h3>Speaker 1</h3>
      <div class="dz" id="dz1" data-slot="speaker1" onclick="document.getElementById('fi1').click()"><input type="file" id="fi1" accept="video/*" onchange="up('speaker1',this)"><div class="ico">🎥</div><div class="hint">Click or drop video</div><div class="fn" id="fn1"></div></div>
      <div class="field"><label>Display Name</label><input type="text" id="n1" placeholder="Speaker 1"></div>
      <div class="field"><label>Trim Start (seconds)</label><input type="number" id="t1" value="0" min="0" step="0.1"></div>
    </div>
    <div class="card">
      <h3>Speaker 2</h3>
      <div class="dz" id="dz2" data-slot="speaker2" onclick="document.getElementById('fi2').click()"><input type="file" id="fi2" accept="video/*" onchange="up('speaker2',this)"><div class="ico">🎥</div><div class="hint">Click or drop video</div><div class="fn" id="fn2"></div></div>
      <div class="field"><label>Display Name</label><input type="text" id="n2" placeholder="Speaker 2"></div>
      <div class="field"><label>Trim Start (seconds)</label><input type="number" id="t2" value="0" min="0" step="0.1"></div>
    </div>
    <div class="card">
      <h3>Logo / Brand</h3>
      <div class="dz" id="dzl" data-slot="logo" onclick="document.getElementById('fil').click()"><input type="file" id="fil" accept="image/*" onchange="up('logo',this)"><div class="ico">🖼️</div><div class="hint">Click or drop image</div><div class="fn" id="fnl"></div></div>
      <div class="field"><label>Display Name</label><input type="text" id="nl" placeholder="Company Logo"></div>
    </div>
  </div>
  <div class="toolbar">
    <div class="dur"><label>Duration</label><input type="number" id="dur" value="10" min="1" step="1"><span>seconds</span></div>
    <div class="sp"></div>
    <button class="bs" onclick="save()">💾 Save Config</button>
    <button class="bst" onclick="window.open('http://localhost:3000','_blank')">👁 Open Studio</button>
    <button class="br" id="rb" onclick="render()">▶ Render MP4</button>
    <span class="sm" id="sm"></span>
  </div>
  <div class="con" id="con">
    <div class="ch"><span>Render Output</span><span id="rs"></span></div>
    <div class="cb" id="cb"></div>
  </div>
  <div class="out" id="op">
    <div>
      <h3>✅ Render Complete</h3>
      <p>Saved to <strong>out/output.mp4</strong></p>
      <button class="bo" onclick="openOut()">📂 Open in Video Player</button>
    </div>
  </div>
</div>
<script>
fetch('/props').then(r=>r.json()).then(p=>{
  if(p.speaker1){document.getElementById('n1').value=p.speaker1.name||'';document.getElementById('t1').value=(p.speaker1.trimStart||0)/30;if(p.speaker1.src)document.getElementById('fn1').textContent=p.speaker1.src;}
  if(p.speaker2){document.getElementById('n2').value=p.speaker2.name||'';document.getElementById('t2').value=(p.speaker2.trimStart||0)/30;if(p.speaker2.src)document.getElementById('fn2').textContent=p.speaker2.src;}
  if(p.logo){document.getElementById('nl').value=p.logo.name||'';if(p.logo.src)document.getElementById('fnl').textContent=p.logo.src;}
  if(p.durationInSeconds)document.getElementById('dur').value=p.durationInSeconds;
});
const SLOT_EL={speaker1:'fn1',speaker2:'fn2',logo:'fnl'};
async function upFile(slot,file){
  const el=document.getElementById(SLOT_EL[slot]);
  el.style.color='';
  el.textContent='Uploading…';
  try{
    const fd=new FormData();fd.append('file',file);
    const r=await fetch('/upload/'+slot,{method:'POST',body:fd});
    if(!r.ok)throw new Error('Server error '+r.status);
    const{src}=await r.json();
    el.textContent='✓ '+src;
    el.style.color='#4ade80';
  }catch(err){
    el.textContent='❌ '+err.message;
    el.style.color='#f87171';
  }
}
function up(slot,input){const f=input.files[0];if(f)upFile(slot,f);}
document.querySelectorAll('.dz').forEach(d=>{
  d.addEventListener('dragover',e=>{e.preventDefault();d.classList.add('over')});
  d.addEventListener('dragleave',()=>d.classList.remove('over'));
  d.addEventListener('drop',e=>{
    e.preventDefault();d.classList.remove('over');
    const f=e.dataTransfer.files[0];
    if(f)upFile(d.dataset.slot,f);
  });
});
async function save(){
  const dur=parseInt(document.getElementById('dur').value)||10;
  const f=dur*30;
  const g=id=>document.getElementById(id).textContent;
  const props={durationInSeconds:dur,
    speaker1:{src:g('fn1')||'media/speaker1.mp4',name:document.getElementById('n1').value||'Speaker 1',startFrame:0,durationInFrames:f,trimStart:Math.round(parseFloat(document.getElementById('t1').value||0)*30)},
    speaker2:{src:g('fn2')||'media/speaker2.mp4',name:document.getElementById('n2').value||'Speaker 2',startFrame:0,durationInFrames:f,trimStart:Math.round(parseFloat(document.getElementById('t2').value||0)*30)},
    logo:{src:g('fnl')||'media/logo.png',name:document.getElementById('nl').value||'Company Logo',startFrame:0,durationInFrames:f}
  };
  await fetch('/props',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(props)});
  const m=document.getElementById('sm');m.textContent='✓ Saved';m.className='sm ok';
  setTimeout(()=>{m.textContent='';m.className='sm'},2000);
}
function render(){
  const btn=document.getElementById('rb'),con=document.getElementById('con'),cb=document.getElementById('cb'),rs=document.getElementById('rs'),op=document.getElementById('op');
  btn.disabled=true;btn.textContent='⏳ Rendering…';
  con.classList.add('show');op.classList.remove('show');cb.textContent='';rs.textContent='';
  const es=new EventSource('/render-stream');
  es.onmessage=e=>{
    const{type,msg}=JSON.parse(e.data);
    cb.textContent+=msg;cb.scrollTop=cb.scrollHeight;
    if(type==='done'||type==='error'){
      rs.textContent=type==='done'?'✅ Done':'❌ Failed';
      btn.disabled=false;btn.textContent='▶ Render MP4';
      es.close();
      if(type==='done')op.classList.add('show');
    }
  };
  es.onerror=()=>{cb.textContent+='\n[Connection closed]\n';btn.disabled=false;btn.textContent='▶ Render MP4';es.close()};
}
function openOut(){fetch('/open-output',{method:'POST'})}
</script>
</body>
</html>`;
