const video = document.getElementById('video');
const statusEl = document.getElementById('status');
const rawEl = document.getElementById('raw');
const imgEl = document.getElementById('img');
const downloadEl = document.getElementById('download');

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnReset = document.getElementById('btnReset');
const btnDecodeText = document.getElementById('btnDecodeText');

let stream = null;
let rafId = null;

const qrParts = {};
let expectedTotal = null;

/* helpers */

function setStatus(msg) {
  statusEl.textContent = msg;
}

function resetAll() {
  Object.keys(qrParts).forEach(k => delete qrParts[k]);
  expectedTotal = null;
  rawEl.value = '';
  imgEl.style.display = 'none';
  downloadEl.style.display = 'none';
  setStatus('Reset.');
}

function normalizeBase64(text) {
  return text.replace(/[^A-Za-z0-9+/=]/g, '');
}

function base64ToBlob(base64, mime) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/* scanning */

async function startScan() {
  resetAll();


  video.style.display = 'block';
  video.style.opacity = '1';

  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' }
  });

  video.srcObject = stream;
  await video.play();

  btnStart.disabled = true;
  btnStop.disabled = false;

  setStatus('Scanning QR parts…');
  scanLoop();
}

function stopScan() {
  cancelAnimationFrame(rafId);

  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  // скрыть сканер
  video.style.opacity = '0';
  setTimeout(() => {
    video.style.display = 'none';
  }, 300);

  btnStart.disabled = false;
  btnStop.disabled = true;

  setStatus('Stopped. Decoding image…');

  decodeFromParts();
}

function scanLoop() {
  if (video.readyState !== video.HAVE_ENOUGH_DATA) {
    rafId = requestAnimationFrame(scanLoop);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, canvas.width, canvas.height);

  if (code) handleQr(code.data);

  rafId = requestAnimationFrame(scanLoop);
}

/* QR handling */

function handleQr(text) {
  let obj;
  try {
    obj = JSON.parse(text.trim());
  } catch {
    return;
  }

  if (
    typeof obj.part !== 'number' ||
    typeof obj.total !== 'number' ||
    typeof obj.data !== 'string'
  ) return;

  if (expectedTotal === null) expectedTotal = obj.total;
  if (qrParts[obj.part]) return;

  qrParts[obj.part] = obj.data;

  setStatus(`Scanned ${Object.keys(qrParts).length} / ${expectedTotal}`);
  rawEl.value = Object.values(qrParts).join('');
}

/* decode modes */

function decodeFromParts() {
  if (!expectedTotal) {
    setStatus('No QR data');
    return;
  }

  let full = '';
  for (let i = 1; i <= expectedTotal; i++) {
    if (!qrParts[i]) {
      setStatus(`Missing part ${i}`);
      return;
    }
    full += qrParts[i];
  }

  decodeBase64(full);
}

function decodeFromText() {
  const text = rawEl.value.trim();
  if (!text) {
    setStatus('Textarea empty');
    return;
  }
  decodeBase64(text);
}

function decodeBase64(base64) {
  const clean = normalizeBase64(base64);

  let blob;
  try {
    blob = base64ToBlob(clean, 'image/avif');
  } catch {
    setStatus('Invalid base64');
    return;
  }

  const url = URL.createObjectURL(blob);

  imgEl.src = url;
  imgEl.style.display = 'block';

  downloadEl.href = url;
  downloadEl.download = 'photo.avif';
  downloadEl.style.display = 'inline-block';

  imgEl.scrollIntoView({ behavior: 'smooth' });

  setStatus('Image decoded ✅');
}

/* buttons */

btnStart.onclick = startScan;
btnStop.onclick = stopScan;
btnReset.onclick = resetAll;
btnDecodeText.onclick = decodeFromText;
