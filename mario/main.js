const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = [];

const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
const imageData = ctx.getImageData(0, 0, 256, 240);

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



let model, webcam;

async function initML() {
  const modelURL = "model/model.json";
  const metadataURL = "model/metadata.json";

  model = await tmImage.load(modelURL, metadataURL);

  webcam = new tmImage.Webcam(200, 200, true);
  await webcam.setup();
  await webcam.play();

  document.getElementById("webcam-container").appendChild(webcam.canvas);

  loopML();
}

async function loopML() {
  webcam.update();

  const predictions = await model.predict(webcam.canvas);

  displayPredictions(predictions);
  handleMLInput(predictions);

  requestAnimationFrame(loopML);
}

let lastAction = "neutral";
let stableFrames = 0;

function handleMLInput(predictions) {
  const top = predictions.reduce((a, b) =>
    a.probability > b.probability ? a : b
  );

  if (top.className === lastAction) {
    stableFrames++;
  } else {
    stableFrames = 0;
    lastAction = top.className;
  }

  if (stableFrames < 3 || top.probability < 0.75) return;

  nes.buttonUp(1, jsnes.Controller.BUTTON_LEFT);
  nes.buttonUp(1, jsnes.Controller.BUTTON_RIGHT);
  nes.buttonUp(1, jsnes.Controller.BUTTON_A);

  switch (top.className) {
    case "left":
      nes.buttonDown(1, jsnes.Controller.BUTTON_LEFT);
      break;

    case "right":
      nes.buttonDown(1, jsnes.Controller.BUTTON_RIGHT);
      break;

    case "jump":
      nes.buttonDown(1, jsnes.Controller.BUTTON_A);
      break;

    case "up":
      nes.buttonDown(1, jsnes.Controller.BUTTON_UP);
      break;

  }
}


function displayPredictions(predictions) {
  const container = document.getElementById("predictions");

  const sorted = [...predictions].sort((a, b) => b.probability - a.probability);

  let html = "";

  sorted.forEach((p, index) => {
    const percent = (p.probability * 100).toFixed(1);

    if (index === 0) {
      html += `<b>> ${p.className}: ${percent}%</b><br>`;
    } else {
      html += `${p.className}: ${percent}%<br>`;
    }
  });

  container.innerHTML = html;
}