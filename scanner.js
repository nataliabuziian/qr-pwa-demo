// scanner.js
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

function setStatus(msg) {
  statusEl.textContent = msg;
}

function resetAll() {
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
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/* scanning */

async function startScan() {
  resetAll();

  if (typeof jsQR !== 'function') {
    setStatus('Error: jsQR is not loaded.\nCheck internet or CDN.');
    return;
  }

  video.style.display = 'block';
  video.style.opacity = '1';

  btnStart.disabled = true;
  btnStop.disabled = false;

  setStatus('Requesting camera…');

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
  } catch (e) {
    btnStart.disabled = false;
    btnStop.disabled = true;
    video.style.display = 'none';
    setStatus('Camera error:\n' + (e?.message || e));
    return;
  }

  video.srcObject = stream;

  try {
    await video.play();
  } catch (e) {
    setStatus('Video play error: ' + (e?.message || e));
    stopScan();
    return;
  }

  setStatus('Scanning… show QR to camera');
  scanLoop();
}

function stopScan() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;

  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  video.style.opacity = '0';
  setTimeout(() => {
    video.style.display = 'none';
  }, 200);

  btnStart.disabled = false;
  btnStop.disabled = true;

  if (!imgEl.src) {
    setStatus('Stopped.');
  }
}

function scanLoop() {
  if (!video || video.readyState < 2) {
    rafId = requestAnimationFrame(scanLoop);
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let code = null;
  try {
    code = jsQR(imageData.data, canvas.width, canvas.height);
  } catch (e) {
    setStatus('jsQR decode error: ' + (e?.message || e));
  }

  if (code && code.data) {
    handleQr(code.data);
    return;
  }

  rafId = requestAnimationFrame(scanLoop);
}

/* QR handling: single QR contains Base64 */

function handleQr(text) {
  const base64 = normalizeBase64(String(text || '').trim());

  if (base64.length < 100) {
    setStatus('QR detected, but content is too short.');
    return;
  }

  rawEl.value = base64;
  setStatus('QR scanned ✅ Decoding image…');

  decodeBase64(base64);
  stopScan();
}

/* manual decode */

function decodeFromText() {
  const text = rawEl.value.trim();
  if (!text) {
    setStatus('Textarea empty.');
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
    setStatus('Invalid base64.');
    return;
  }

  const url = URL.createObjectURL(blob);

  imgEl.src = url;
  imgEl.style.display = 'block';

  downloadEl.href = url;
  downloadEl.download = 'photo.avif';
  downloadEl.style.display = 'inline-block';

  imgEl.scrollIntoView({ behavior: 'smooth' });

  setStatus(`✅ Image decoded\nBytes: ${blob.size}\nType: ${blob.type}`);
}

/* buttons */

btnStart.onclick = startScan;
btnStop.onclick = stopScan;
btnReset.onclick = resetAll;
btnDecodeText.onclick = decodeFromText;
