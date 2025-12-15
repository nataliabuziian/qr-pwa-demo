// This version accepts BOTH:
// 1) Plain base64 (your case)
// 2) JSON parts: {id, part, total, data}

const video = document.getElementById('video');
const statusEl = document.getElementById('status');
const imgEl = document.getElementById('img');
const resultEl = document.getElementById('result');
const downloadEl = document.getElementById('download');

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnDecode = document.getElementById('btnDecode');
const paste = document.getElementById('paste');

let stream = null;
let rafId = null;

// For JSON multipart mode
const partsStore = new Map(); // key: id -> {total, parts: Map(partNo->data)}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function isLikelyBase64(s) {
  // loose check (base64 may contain + / =)
  if (!s || s.length < 20) return false;
  return /^[A-Za-z0-9+/=\s]+$/.test(s);
}

function tryParseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function base64ToBlob(base64, mime) {
  const clean = base64.replace(/\s+/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function showImageFromBase64(base64) {
  // Your data is AVIF
  const blob = base64ToBlob(base64, 'image/avif');
  const url = URL.createObjectURL(blob);

  imgEl.src = url;
  imgEl.alt = 'Decoded image';

  downloadEl.href = url;
  downloadEl.style.display = 'inline';
  downloadEl.download = 'photo.avif';

  setStatus(`✅ Decoded image\nBytes: ${blob.size}\nType: ${blob.type}`);
}

function handlePayload(rawText) {
  const text = (rawText || '').trim();

  // 1) If JSON - store part(s)
  const obj = tryParseJson(text);
  if (obj && obj.data && obj.part && obj.total && obj.id) {
    const id = String(obj.id);
    const part = Number(obj.part);
    const total = Number(obj.total);

    if (!partsStore.has(id)) {
      partsStore.set(id, { total, parts: new Map() });
    }
    const entry = partsStore.get(id);
    entry.total = total;
    entry.parts.set(part, String(obj.data));

    setStatus(`📦 Received part ${part}/${total} for id=${id}`);

    if (entry.parts.size === total) {
      // assemble in order
      let full = '';
      for (let p = 1; p <= total; p++) {
        if (!entry.parts.has(p)) {
          setStatus(`❌ Missing part ${p}/${total}`);
          return;
        }
        full += entry.parts.get(p);
      }
      setStatus(`✅ All parts received. Decoding...`);
      showImageFromBase64(full);
    }
    return;
  }

  // 2) Otherwise treat as plain base64
  if (isLikelyBase64(text)) {
    setStatus(`📦 Received plain base64 (${text.length} chars). Decoding...`);
    showImageFromBase64(text);
    return;
  }

  setStatus(`❌ Unknown QR content.\nFirst 80 chars:\n${text.slice(0, 80)}`);
}

async function startScan() {
  if (!('BarcodeDetector' in window)) {
    setStatus('❌ BarcodeDetector API not supported in this browser.\nUse the paste fallback.');
    return;
  }

  const detector = new BarcodeDetector({ formats: ['qr_code'] });

  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false,
  });

  video.srcObject = stream;
  await video.play();

  btnStart.disabled = true;
  btnStop.disabled = false;

  setStatus('📷 Camera started. Point at the QR.');

  const scanLoop = async () => {
    try {
      const barcodes = await detector.detect(video);
      if (barcodes && barcodes.length > 0) {
        const value = barcodes[0].rawValue || '';
        if (value) {
          // stop automatically after first success
          await stopScan();
          handlePayload(value);
          return;
        }
      }
    } catch (e) {
      setStatus('❌ Scan error: ' + (e?.message || e));
    }
    rafId = requestAnimationFrame(scanLoop);
  };

  rafId = requestAnimationFrame(scanLoop);
}

async function stopScan() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;

  if (video) {
    video.pause();
    video.srcObject = null;
  }
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  btnStart.disabled = false;
  btnStop.disabled = true;
  setStatus('Stopped.');
}

btnStart.addEventListener('click', () => startScan());
btnStop.addEventListener('click', () => stopScan());

btnDecode.addEventListener('click', () => {
  handlePayload(paste.value);
});
