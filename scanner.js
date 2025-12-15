const video = document.getElementById('video');
const statusEl = document.getElementById('status');
const rawEl = document.getElementById('raw');
const imgEl = document.getElementById('img');
const downloadEl = document.getElementById('download');

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnDecode = document.getElementById('btnDecode');

let stream = null;
let rafId = null;

function setStatus(msg) {
  statusEl.textContent = msg;
}

function isLikelyBase64(text) {
  return /^[A-Za-z0-9+/=\s]+$/.test(text) && text.length > 100;
}

function base64ToBlob(base64, mime) {
  const clean = base64.replace(/\s+/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function decodeImageFromText(text) {
  if (!isLikelyBase64(text)) {
    setStatus('❌ This is not base64 image data.');
    return;
  }

  const blob = base64ToBlob(text, 'image/avif');
  const url = URL.createObjectURL(blob);

  imgEl.src = url;
  imgEl.style.display = 'block';

  downloadEl.href = url;
  downloadEl.style.display = 'inline';

  setStatus(`✅ Image decoded\nBytes: ${blob.size}\nType: ${blob.type}`);
}

async function startScan() {
  if (!('BarcodeDetector' in window)) {
    setStatus('❌ BarcodeDetector not supported. Use Chrome / Edge.');
    return;
  }

  const detector = new BarcodeDetector({ formats: ['qr_code'] });

  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false
  });

  video.srcObject = stream;
  await video.play();

  btnStart.disabled = true;
  btnStop.disabled = false;

  setStatus('📷 Scanning...');

  const loop = async () => {
    const codes = await detector.detect(video);
    if (codes.length > 0) {
      await stopScan();
      const text = codes[0].rawValue || '';
      rawEl.value = text;
      setStatus(`✅ QR scanned\nCharacters: ${text.length}`);
      return;
    }
    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
}

async function stopScan() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;

  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  video.srcObject = null;
  btnStart.disabled = false;
  btnStop.disabled = true;
}

btnStart.onclick = startScan;
btnStop.onclick = stopScan;

btnDecode.onclick = () => {
  decodeImageFromText(rawEl.value.trim());
};
