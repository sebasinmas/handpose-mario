const ENABLE_KEYBOARD_DEBUG = true;
const MIN_CONFIDENCE = 0.6;
const MIN_STABLE_FRAMES = 2;
const JUMP_TAP_MS = 140;
const EXPECTED_MODEL_LABELS = ["up", "down", "left", "right", "nothing"];
const SUPPORTED_ACTIONS = new Set(EXPECTED_MODEL_LABELS);
const LABEL_ALIASES = {
  up: "up",
  arriba: "up",
  down: "down",
  abajo: "down",
  left: "left",
  izquierda: "left",
  right: "right",
  derecha: "right",
  nothing: "nothing",
  nada: "nothing",
  Arriba: "up",
  Abajo: "down",
  Izquierda: "left",
  Derecha: "right",
  Nada: "nothing",
};

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = [];

const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
const imageData = ctx.getImageData(0, 0, 256, 240);
const debugModeEl = document.getElementById("debug-mode");
const modelStatusEl = document.getElementById("model-status");
const effectiveActionEl = document.getElementById("effective-action");
const gestureStatusEl = document.getElementById("gesture-status");

const mlState = {
  lastCandidate: "nothing",
  stableFrames: 0,
  activeAction: "nothing",
  pendingAction: "nothing",
  topPrediction: null,
  jumpTimeoutId: null,
  modelLabelsValid: false,
};

const nes = new jsnes.NES({
  onFrame: function(framebuffer_32) {
    for (let i = 0; i < framebuffer_32.length; i++) {
      const pixel = framebuffer_32[i];

      imageData.data[i * 4 + 0] = pixel & 0xFF;
      imageData.data[i * 4 + 1] = (pixel >> 8) & 0xFF;
      imageData.data[i * 4 + 2] = (pixel >> 16) & 0xFF;
      imageData.data[i * 4 + 3] = 0xFF;
    }

    ctx.putImageData(imageData, 0, 0);
  },

  onAudioSample: function(left, right) {
    if (audioBuffer.length < 8192) {
      audioBuffer.push(left);
      audioBuffer.push(right);
    }
  }
});

const bufferSize = 2048;
const scriptNode = audioCtx.createScriptProcessor(bufferSize, 0, 2);

scriptNode.onaudioprocess = function(e) {
  const outputL = e.outputBuffer.getChannelData(0);
  const outputR = e.outputBuffer.getChannelData(1);

  for (let i = 0; i < bufferSize; i++) {
    outputL[i] = audioBuffer[i * 2] || 0;
    outputR[i] = audioBuffer[i * 2 + 1] || 0;
  }

  audioBuffer = audioBuffer.slice(bufferSize * 2);
};

scriptNode.connect(audioCtx.destination);

document.addEventListener("click", () => {
  if (audioCtx.state !== "running") {
    audioCtx.resume();
    console.log("AudioContext resumed");
  }
});

function start() {
  setInterval(() => {
    nes.frame();
  }, 1000 / 60);
}

fetch("smb3.nes")
  .then(res => res.arrayBuffer())
  .then(data => {
    const romData = new Uint8Array(data);
    let binary = "";

    for (let i = 0; i < romData.length; i++) {
      binary += String.fromCharCode(romData[i]);
    }

    nes.loadROM(binary);
    start();
    initML();
  })
  .catch(err => console.error("ROM load error:", err));

if (ENABLE_KEYBOARD_DEBUG) {
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
        nes.buttonDown(1, jsnes.Controller.BUTTON_UP);
        break;
      case "ArrowDown":
        nes.buttonDown(1, jsnes.Controller.BUTTON_DOWN);
        break;
      case "ArrowLeft":
        nes.buttonDown(1, jsnes.Controller.BUTTON_LEFT);
        break;
      case "ArrowRight":
        nes.buttonDown(1, jsnes.Controller.BUTTON_RIGHT);
        break;
      case "z":
        nes.buttonDown(1, jsnes.Controller.BUTTON_A);
        break;
      case "x":
        nes.buttonDown(1, jsnes.Controller.BUTTON_B);
        break;
      case "Enter":
        nes.buttonDown(1, jsnes.Controller.BUTTON_START);
        break;
      case "Shift":
        nes.buttonDown(1, jsnes.Controller.BUTTON_SELECT);
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowUp":
        nes.buttonUp(1, jsnes.Controller.BUTTON_UP);
        break;
      case "ArrowDown":
        nes.buttonUp(1, jsnes.Controller.BUTTON_DOWN);
        break;
      case "ArrowLeft":
        nes.buttonUp(1, jsnes.Controller.BUTTON_LEFT);
        break;
      case "ArrowRight":
        nes.buttonUp(1, jsnes.Controller.BUTTON_RIGHT);
        break;
      case "z":
        nes.buttonUp(1, jsnes.Controller.BUTTON_A);
        break;
      case "x":
        nes.buttonUp(1, jsnes.Controller.BUTTON_B);
        break;
      case "Enter":
        nes.buttonUp(1, jsnes.Controller.BUTTON_START);
        break;
      case "Shift":
        nes.buttonUp(1, jsnes.Controller.BUTTON_SELECT);
        break;
    }
  });
}

updateDebugMode();
updateDebugPanel();

let model, webcam;
let isPredicting = false;

async function loadModel(modelName) {
  modelStatusEl.textContent = "Cargando modelo...";
  modelStatusEl.dataset.state = "warning";
  const modelURL = `model/${modelName}/model.json`;
  const metadataURL = `model/${modelName}/metadata.json`;

  model = await tmImage.load(modelURL, metadataURL);
  validateModelLabels(model);
}

document.getElementById("model-select").addEventListener("change", async (e) => {
  await loadModel(e.target.value);
});

async function initML() {
  const initialModel = document.getElementById("model-select").value;
  await loadModel(initialModel);

  const webcamCanvasContainer = document.getElementById("webcam-container");
  if (!webcamCanvasContainer.hasChildNodes()) {
    webcam = new tmImage.Webcam(200, 200, true);
    await webcam.setup();
    await webcam.play();
    webcamCanvasContainer.appendChild(webcam.canvas);
  }

  if (!isPredicting) {
    isPredicting = true;
    loopML();
  }
}

async function loopML() {
  if (!webcam || !model) {
    if (isPredicting) requestAnimationFrame(loopML);
    return;
  }
  webcam.update();

  const predictions = await model.predict(webcam.canvas);

  handleMLInput(predictions);
  displayPredictions(predictions);

  requestAnimationFrame(loopML);
}

function validateModelLabels(modelInstance) {
  const labels = modelInstance.getClassLabels();
  const normalizedLabels = labels
    .map(label => normalizeLabel(label))
    .filter(Boolean);
  const uniqueLabels = [...new Set(normalizedLabels)];
  const isValid =
    uniqueLabels.length === EXPECTED_MODEL_LABELS.length &&
    EXPECTED_MODEL_LABELS.every(label => uniqueLabels.includes(label));

  mlState.modelLabelsValid = isValid;

  if (isValid) {
    modelStatusEl.textContent = `Modelo OK: ${labels.join(", ")} -> ${uniqueLabels.join(", ")}`;
    modelStatusEl.dataset.state = "ok";
    return;
  }

  modelStatusEl.textContent =
    `Modelo actual incompatible para entrega: ${labels.join(", ")}. Reentrena/exporta ${EXPECTED_MODEL_LABELS.join(", ")}.`;
  modelStatusEl.dataset.state = "warning";
}

function getTopPrediction(predictions) {
  return predictions.reduce((best, current) =>
    current.probability > best.probability ? current : best
  );
}

function normalizePrediction(topPrediction) {
  const normalizedLabel = topPrediction ? normalizeLabel(topPrediction.className) : null;

  if (!normalizedLabel || !SUPPORTED_ACTIONS.has(normalizedLabel)) {
    return "nothing";
  }

  return normalizedLabel;
}

function normalizeLabel(label) {
  if (!label) {
    return null;
  }

  return LABEL_ALIASES[label.trim().toLowerCase()] || null;
}

function handleMLInput(predictions) {
  const topPrediction = getTopPrediction(predictions);
  const logicalAction = normalizePrediction(topPrediction);

  mlState.topPrediction = topPrediction;
  mlState.pendingAction = logicalAction;

  if (logicalAction === mlState.lastCandidate) {
    mlState.stableFrames++;
  } else {
    mlState.lastCandidate = logicalAction;
    mlState.stableFrames = 1;
  }

  if (topPrediction.probability < MIN_CONFIDENCE || mlState.stableFrames < MIN_STABLE_FRAMES) {
    updateDebugPanel();
    return;
  }

  applyAction(logicalAction);
  updateDebugPanel();
}

function releaseControlledButtons() {
  nes.buttonUp(1, jsnes.Controller.BUTTON_LEFT);
  nes.buttonUp(1, jsnes.Controller.BUTTON_RIGHT);
  nes.buttonUp(1, jsnes.Controller.BUTTON_DOWN);
  nes.buttonUp(1, jsnes.Controller.BUTTON_A);
}

function clearJumpTimeout() {
  if (mlState.jumpTimeoutId !== null) {
    clearTimeout(mlState.jumpTimeoutId);
    mlState.jumpTimeoutId = null;
  }
}

function tapJump() {
  clearJumpTimeout();
  nes.buttonDown(1, jsnes.Controller.BUTTON_A);
  mlState.jumpTimeoutId = setTimeout(() => {
    nes.buttonUp(1, jsnes.Controller.BUTTON_A);
    mlState.jumpTimeoutId = null;
  }, JUMP_TAP_MS);
}

function applyAction(logicalAction) {
  if (logicalAction === mlState.activeAction && logicalAction !== "up") {
    return;
  }

  releaseControlledButtons();
  clearJumpTimeout();

  switch (logicalAction) {
    case "left":
      nes.buttonDown(1, jsnes.Controller.BUTTON_LEFT);
      break;
    case "right":
      nes.buttonDown(1, jsnes.Controller.BUTTON_RIGHT);
      break;
    case "down":
      nes.buttonDown(1, jsnes.Controller.BUTTON_DOWN);
      break;
    case "up":
      tapJump();
      break;
    case "nothing":
    default:
      break;
  }

  mlState.activeAction = logicalAction;
}

function describeAction(action) {
  switch (action) {
    case "left":
      return "Moviendo izquierda";
    case "right":
      return "Moviendo derecha";
    case "down":
      return "Agachado";
    case "up":
      return "Saltando";
    case "nothing":
    default:
      return "Sin accion";
  }
}

function updateDebugMode() {
  debugModeEl.textContent = ENABLE_KEYBOARD_DEBUG
    ? "Teclado debug: ACTIVADO"
    : "Teclado debug: DESACTIVADO";
}

function updateDebugPanel() {
  const topPrediction = mlState.topPrediction;
  const confidence = topPrediction ? `${(topPrediction.probability * 100).toFixed(1)}%` : "--";
  const gesture = topPrediction ? topPrediction.className : "--";
  const logicalGesture = topPrediction ? normalizePrediction(topPrediction) : "--";

  gestureStatusEl.textContent =
    `Clase detectada: ${gesture} (${confidence}) | Normalizada: ${logicalGesture} | Estables: ${mlState.stableFrames}/${MIN_STABLE_FRAMES}`;
  effectiveActionEl.textContent =
    `Accion efectiva: ${mlState.activeAction} | Pendiente: ${mlState.pendingAction} | Estado: ${describeAction(mlState.activeAction)}`;
}

function displayPredictions(predictions) {
  const container = document.getElementById("predictions");
  const sorted = [...predictions].sort((a, b) => b.probability - a.probability);

  let html = "";

  sorted.forEach((prediction, index) => {
    const percent = (prediction.probability * 100).toFixed(1);
    const isTop = index === 0;
    const isSupported = SUPPORTED_ACTIONS.has(prediction.className);
    const marker = isTop ? "&gt; " : "";
    const className = isSupported ? "supported" : "unsupported";

    html += `<div class="${className}">${marker}${prediction.className}: ${percent}%</div>`;
  });

  container.innerHTML = html;
}
