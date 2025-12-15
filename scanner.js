const video = document.getElementById('video');
const statusEl = document.getElementById('status');
const qrTextEl = document.getElementById('qrText');
const metaEl = document.getElementById('meta');
const imgEl = document.getElementById('img');
const downloadEl = document.getElementById('download');

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnTryDecode = document.getElementById('btnTryDecode');
const btnDecodePaste = document.getElementById('btnDecodePaste');
const paste = document.getElementById('paste');

let stream = null;
let rafId = null;
let lastText = '';

function setStatus(msg) {
  statusEl.textContent = msg;
}

function showRawText(text) {
  lastText = text;
  qrTextEl.value = text;
  metaEl.textContent = `Characters: ${text.length}`;
}

function tryDecodeBase64(text) {
  try {
    const clean = text.replace(/\s+/g, '');
    const bin = atob(clean);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'image/avif' });

    const url = URL.createObjectURL(blob);
    imgEl.src = url;
    downloadEl.href = url;
    downloadEl.style.display = 'inline';

    setStatus(`✅ Decoded as image\nBytes: ${blob.size}`);
  } catch {
    setStatus('❌ Not valid base64 image (this is OK)');
  }
}

async function startScan() {
  if (!('BarcodeDetector' in window)) {
    setStatus('❌ BarcodeDetector not supported. Use paste fallback.');
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

  setStatus('📷 Scanning…');

  const loop = async () => {
    const codes = await detector.detect(video);
    if (codes.length > 0) {
      await stopScan();
      const text = codes[0].rawValue || '';
      showRawText(text);
      setStatus('✅ QR scanned');
      return;
    }
    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
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
}

btnStart.onclick = startScan;
btnStop.onclick = stopScan;

btnTryDecode.onclick = () => {
  if (lastText) tryDecodeBase64(lastText);
};

btnDecodePaste.onclick = () => {
  showRawText(paste.value);
};
