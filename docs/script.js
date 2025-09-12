// Simple frontend demo logic
let patients = {};

async function loadPatients(){
  try{
    const r = await fetch('patients.json');
    patients = await r.json();
  }catch(e){
    console.error('patients.json load failed', e);
  }
}
loadPatients();

// Simple helpers
function show(el,show=true){ el.style.display = show ? 'block' : 'none' }
function q(id){return document.getElementById(id)}

q('fetchBtn').addEventListener('click',()=> {
  const nic = q('nicInput').value.trim();
  if(!nic){ alert('Enter a NIC or upload QR image first.'); return; }
  const p = patients[nic];
  if(!p){ alert('Patient not found in demo dataset. Use sample NICs in patients.json'); return; }
  displayPatient(p);
});

q('fileInput').addEventListener('change', async (ev)=>{
  const f = ev.target.files[0];
  if(!f) return;
  q('fileMsg').textContent = 'Processing image...';
  const dataURL = await fileToDataURL(f);
  showImagePreview(dataURL);
  // decode QR with jsQR
  setTimeout(async ()=>{
    const decoded = await tryDecodeQR(dataURL);
    if(decoded){
      q('fileMsg').textContent = `QR decoded: ${decoded}`;
      if(patients[decoded]) displayPatient(patients[decoded]);
      else q('fileMsg').textContent += ' — not present in demo dataset';
    } else {
      q('fileMsg').textContent = 'No QR found in image (or poor quality).';
    }
  }, 150);
});

function fileToDataURL(file){ 
  return new Promise(res=>{
    const fr = new FileReader();
    fr.onload = ()=>res(fr.result);
    fr.readAsDataURL(file);
  });
}

function showImagePreview(dataURL){
  q('imagePreview').innerHTML = `<img src="${dataURL}" alt="preview" />`;
}

// Try decode QR via jsQR
async function tryDecodeQR(dataURL){
  return new Promise(res=>{
    const img = new Image();
    img.onload = ()=>{
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img,0,0);
      const imgData = ctx.getImageData(0,0,c.width,c.height);
      const code = jsQR(imgData.data, c.width, c.height);
      if(code && code.data) res(code.data);
      else res(null);
    };
    img.src = dataURL;
  });
}

function displayPatient(p){
  show(q('patientCard'), true);
  show(q('aiCard'), true);
  const info = `
    <div class="pfield"><b>Name</b><div>${p.name}</div></div>
    <div class="pfield"><b>CNIC</b><div>${p.nic}</div></div>
    <div class="pfield"><b>DOB / Age</b><div>${p.dob} / ${p.age}</div></div>
    <div class="pfield"><b>Gender</b><div>${p.gender}</div></div>
    <div class="pfield"><b>Contact</b><div>${p.contact}</div></div>
    <div class="pfield"><b>Medical History</b><div>${p.medical_history || '—'}</div></div>
  `;
  q('patientInfo').innerHTML = info;

  // compute risk (simple mock)
  const result = computeRiskScore(p);
  renderAIResult(result);
}

function computeRiskScore(p){
  let score = 10;
  if(p.age >= 50) score += 30;
  else if(p.age >= 40) score += 20;
  else if(p.age >= 30) score += 10;

  const history = (p.medical_history || '').toLowerCase();
  if(history.includes('diabetes')) score += 30;
  if(history.includes('hypertension')) score += 20;

  if(score > 95) score = 95;
  // label
  let label = 'Normal', color = '#10b981';
  if(score >= 70){ label = 'Urgent'; color = '#ef4444'; }
  else if(score >= 40){ label = 'Attention'; color = '#f59e0b'; }
  return {score, label, color, explanation: `Simple rule-based demo score (${score}%)`};
}

function renderAIResult(res){
  const container = q('aiResult');
  container.innerHTML = `
    <div><b>Risk Score</b></div>
    <div style="margin:10px 0">
      <div class="progress-wrap">
        <div class="progress-bar" style="width:${res.score}% ; background:${res.color}"></div>
      </div>
      <div style="margin-top:8px">${res.score}% — <strong>${res.label}</strong></div>
      <div class="muted small" style="margin-top:6px">${res.explanation}</div>
    </div>
  `;
}

q('reportBtn').addEventListener('click', generateReport);

function generateReport(){
  // build printable HTML
  const pInfo = q('patientInfo').innerHTML;
  const aiHtml = q('aiResult').innerHTML;
  const extra = q('ocrText').value || '';
  const html = `
    <html>
    <head>
      <title>SehatAI - Patient Report</title>
      <style>
        body{font-family:Inter,Arial;padding:20px;color:#071032}
        .header{display:flex;justify-content:space-between;align-items:center}
        .card{border:1px solid #e6eef2;padding:16px;border-radius:8px;margin-top:12px}
      </style>
    </head>
    <body>
      <div class="header">
        <div><h2>SehatAI — Clinic Demo</h2><div class="muted">Demo report</div></div>
        <div>${new Date().toLocaleString()}</div>
      </div>
      <div class="card"><h3>Patient Information</h3>${pInfo}</div>
      <div class="card"><h3>AI Results</h3>${aiHtml}</div>
      <div class="card"><h3>OCR / Notes</h3><pre>${escapeHtml(extra)}</pre></div>
      <div style="margin-top:20px">Doctor Signature: ____________________</div>
    </body>
    </html>
  `;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}

function escapeHtml(t){ return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* Optional: Browser OCR using Tesseract.js
   - This is heavy and may be slow. To enable:
     1) Include Tesseract.js script in index.html (uncomment)
     2) Call runOCR(dataURL) where needed.
*/
// async function runOCR(dataURL){
//   const { createWorker } = Tesseract;
//   const worker = createWorker({ logger: m => console.log(m) });
//   await worker.load();
//   await worker.loadLanguage('eng');
//   await worker.initialize('eng');
//   const res = await worker.recognize(dataURL);
//   q('ocrText').value = res.data.text;
//   await worker.terminate();
// }
// --------------------
// Scroll spy for sidebar
// --------------------
const links = document.querySelectorAll('.sidebar nav a');

window.addEventListener('scroll', () => {
  let current = '';
  document.querySelectorAll('section').forEach(section => {
    const sectionTop = section.offsetTop - 60;
    if (scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  links.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + current) {
      link.classList.add('active');
    }
  });
});
