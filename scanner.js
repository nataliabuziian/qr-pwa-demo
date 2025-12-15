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

function looksLikeBase64(text) {
  if (!text || text.length < 100) return false;
  return /^[A-Za-z0-9+/=\s]+$/.test(text);
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
  const value = text.trim();

  if (!looksLikeBase64(value)) {
    setStatus('❌ Text is not base64 image data');
    ret
