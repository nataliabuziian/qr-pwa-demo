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
  return /^[A-Za-z0-9+/=\s]+$/.test(text) && text.length > 200;
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
    setStatus('❌ This text does not look like base64 image data.');
    return;
  }

  try {
    const blob = base64ToBlob(text, 'image/avif');
    const url = URL.createObjectURL(blob);

    imgEl.src = url;
    imgEl.style.display = 'block';

    downloadEl.href = url;
    downloadEl.style.display = 'inline';

    setStatus(`✅ Image decoded
Bytes: ${blob.size}
Type: ${blob.type}`);
  } catch (e) {
    setStatus('❌ Decode error: ' + e.message);
  }
}

async function startScan() {
  if (!('BarcodeDetector' in window)) {
    setStatus('❌ BarcodeDetector not supported in this browser.');
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
    try {
      const codes = await detector.detect(video);
      if (codes.length > 0) {
        const text = codes[0].rawValue || '';
        rawEl.value = text;
        setStatus(`✅ QR scanned
Characters: ${text.length}`);
        stopScan();
        return;
      }
    } catch (e) {
      setStatus('❌ Scan error');
    }
    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
}

function stopScan() {
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
btnDecode.onclick = () => decodeImageFromText(rawEl.value.trim());
