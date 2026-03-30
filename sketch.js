// ── ml5 handpose + p5.js ── mueve un cuadrado con la dirección de la mano ──

let handPose;
let video;
let hands = [];

// Cuadrado
let squareX, squareY;
const SQUARE_SIZE = 40;
const SPEED = 4;

// ── preload: cargar modelo ──
function preload() {
  handPose = ml5.handPose({ flipped: true });
}

// ── setup ──
function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO, { flipped: true });
  video.size(640, 480);
  video.hide();

  // Cuadrado empieza en el centro
  squareX = width / 2;
  squareY = height / 2;

  // Empezar detección continua
  handPose.detectStart(video, gotHands);
}

// ── draw ──
function draw() {
  // Dibujar video de fondo
  image(video, 0, 0, width, height);

  // Filtro oscuro para que se vea mejor el cuadrado
  fill(0, 0, 0, 80);
  noStroke();
  rect(0, 0, width, height);

  // Si hay manos detectadas, calcular dirección
  if (hands.length > 0) {
    let hand = hands[0];
    let keypoints = hand.keypoints;

    // Índice 0 = muñeca (wrist), Índice 9 = middle_finger_mcp (base del dedo medio)
    // Usamos la punta del dedo índice (8) y la muñeca (0) para la dirección
    let wrist = keypoints[0];        // muñeca
    let indexTip = keypoints[8];     // punta del dedo índice

    // Vector de dirección: de muñeca a punta del índice
    let dirX = indexTip.x - wrist.x;
    let dirY = indexTip.y - wrist.y;

    // Normalizar
    let mag = Math.sqrt(dirX * dirX + dirY * dirY);
    if (mag > 0) {
      dirX /= mag;
      dirY /= mag;
    }

    // Mover el cuadrado
    squareX += dirX * SPEED;
    squareY += dirY * SPEED;

    // Mantener dentro del canvas
    squareX = constrain(squareX, 0, width - SQUARE_SIZE);
    squareY = constrain(squareY, 0, height - SQUARE_SIZE);

    // Dibujar keypoints de la mano
    for (let kp of keypoints) {
      fill(0, 255, 150);
      noStroke();
      circle(kp.x, kp.y, 8);
    }

    // Línea de dirección (muñeca → índice)
    stroke(255, 255, 0);
    strokeWeight(2);
    line(wrist.x, wrist.y, indexTip.x, indexTip.y);
  }

  // Dibujar cuadrado
  fill(255, 60, 80);
  noStroke();
  rect(squareX, squareY, SQUARE_SIZE, SQUARE_SIZE, 6);

  // Texto de estado
  fill(255);
  noStroke();
  textSize(14);
  textAlign(LEFT, TOP);
  text(hands.length > 0 ? "✋ Mano detectada" : "👋 Muestra tu mano a la cámara", 10, 10);
}

// ── callback de detección ──
function gotHands(results) {
  hands = results;
}
