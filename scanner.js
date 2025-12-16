const video = document.getElementById('video');
const statusEl = document.getElementById('status');
const rawEl = document.getElementById('raw');
const imgEl = document.getElementById('img');
const downloadEl = document.getElementById('download');

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnReset = document.getElementById('btnReset');
const btnDecode = document.getElementById('btnDecode');

let stream = null;
let rafId = null;

const qrParts = {};
let expectedTotal = null;

/* ===== helpers ===== */

function setStatus(msg) {
  statusEl.textContent = msg;
}

function resetAll() {
  Object.keys(qrParts).forEach(k => delete qrParts[k]);
  expectedTotal = null;
  rawEl.value = '';
  imgEl.style.display = 'none';
  downloadEl.style.display = 'none';
  setStatus('Reset done.');
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

/* ===== scan ===== */

async function startScan() {
  resetAll();

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
  if (stream) stream.getTracks().forEach(t => t.stop());

  btnStart.disabled = false;
  btnStop.disabled = true;

  setStatus('Scan stopped');
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

/* ===== QR logic ===== */

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

  const count = Object.keys(qrParts).length;
  setStatus(`Scanned ${count} / ${expectedTotal}`);
  rawEl.value = JSON.stringify(qrParts, null, 2);

  // авто-декод когда все части собраны
  if (count === expectedTotal) {
    decodeImage();
  }
}

/* ===== decode ===== */

function decodeImage() {
  if (!expectedTotal) return;

  let fullBase64 = '';
  for (let i = 1; i <= expectedTotal; i++) {
    if (!qrParts[i]) return;
    fullBase64 += qrParts[i];
  }

  fullBase64 = normalizeBase64(fullBase64);

  console.log('FULL BASE64 LENGTH:', fullBase64.length);

  // Android Chrome AVIF поддерживает
  const blob = base64ToBlob(fullBase64, 'image/avif');
  const url = URL.createObjectURL(blob);

  imgEl.onload = () => {
    console.log('Image loaded');
  };
  imgEl.onerror = e => {
    console.error('Image load error', e);
  };

  imgEl.src = url;
  imgEl.style.display = 'block';

  downloadEl.href = url;
  downloadEl.download = 'photo.avif';
  downloadEl.style.display = 'inline-block';

  setStatus('Image decoded successfully ✅');
}

/* ===== buttons ===== */

btnStart.onclick = startScan;
btnStop.onclick = stopScan;
btnReset.onclick = resetAll;
btnDecode.onclick = decodeImage;
