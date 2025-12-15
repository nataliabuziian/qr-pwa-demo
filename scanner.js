const video = document.getElementById("video");
const statusEl = document.getElementById("status");
const resultImg = document.getElementById("result");

const STORE_KEY = "qr_image_demo";

navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
  .then(stream => video.srcObject = stream);

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

function scanLoop() {
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQR(imgData.data, canvas.width, canvas.height);
    if (code) handleQR(code.data);
  }
  requestAnimationFrame(scanLoop);
}
requestAnimationFrame(scanLoop);

function handleQR(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    statusEl.innerText = "QR is not JSON";
    return;
  }

  let stored = JSON.parse(localStorage.getItem(STORE_KEY)) || {
    total: payload.total,
    parts: {}
  };

  stored.parts[payload.part] = payload.data;
  localStorage.setItem(STORE_KEY, JSON.stringify(stored));

  statusEl.innerText =
    `Received part ${payload.part} / ${payload.total}`;

  if (Object.keys(stored.parts).length === stored.total) {
    assembleImage(stored.parts);
  }
}

function assembleImage(parts) {
  statusEl.innerText = "Assembling image…";

  const base64 = Object.keys(parts)
    .sort((a, b) => a - b)
    .map(k => parts[k])
    .join("");

  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "image/avif" });

  resultImg.src = URL.createObjectURL(blob);
  statusEl.innerText = "Image received ✔";
}
