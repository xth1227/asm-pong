const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const playerScoreEl = document.querySelector("#playerScore");
const cpuScoreEl = document.querySelector("#cpuScore");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlayTitle");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const pauseButton = document.querySelector("#pauseButton");
const upButton = document.querySelector("#upButton");
const downButton = document.querySelector("#downButton");

const field = {
  width: canvas.width,
  height: canvas.height,
  winScore: 5,
  baseBallSpeed: 6.4,
  maxBallSpeed: 13.2,
};

const keys = new Set();
const pointer = { active: false, y: 0 };
const particles = [];

const state = {
  running: false,
  over: false,
  paused: false,
  shake: 0,
  hits: 0,
  playerHits: 0,
  playerScore: 0,
  cpuScore: 0,
  player: { x: 34, y: 210, width: 16, height: 118, speed: 8.2 },
  cpu: { x: 910, y: 210, width: 16, height: 118, speed: 6.8 },
  ball: { x: 480, y: 270, radius: 11, vx: 6.4, vy: 4.2, trail: [] },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetBall(direction = 1) {
  state.ball.x = field.width / 2;
  state.ball.y = field.height / 2;
  state.ball.vx = field.baseBallSpeed * direction;
  state.ball.vy = (Math.random() > 0.5 ? 1 : -1) * 4.2;
  state.ball.trail = [];
}

function resetRound() {
  state.player.y = field.height / 2 - state.player.height / 2;
  state.cpu.y = field.height / 2 - state.cpu.height / 2;
  resetBall(Math.random() > 0.5 ? 1 : -1);
}

function resetGame() {
  state.playerScore = 0;
  state.cpuScore = 0;
  state.over = false;
  state.running = true;
  state.paused = false;
  state.shake = 0;
  state.hits = 0;
  state.playerHits = 0;
  particles.length = 0;
  pauseButton.textContent = "Pause";
  overlay.classList.add("hidden");
  resetRound();
  syncScore();
}

function syncScore() {
  playerScoreEl.textContent = state.playerScore;
  cpuScoreEl.textContent = state.cpuScore;
}

function finishGame(winner) {
  state.running = false;
  state.over = true;
  state.paused = false;
  overlayTitle.textContent = `${winner} WINS`;
  startButton.textContent = "Restart";
  pauseButton.textContent = "Pause";
  overlay.classList.remove("hidden");
}

function togglePause() {
  if (!state.running || state.over) {
    return;
  }

  state.paused = !state.paused;
  pauseButton.textContent = state.paused ? "Resume" : "Pause";

  if (state.paused) {
    overlayTitle.textContent = "PAUSED";
    startButton.textContent = "Resume";
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
  }
}

function movePlayer() {
  if (keys.has("w") || keys.has("arrowup")) {
    state.player.y -= state.player.speed;
  }
  if (keys.has("s") || keys.has("arrowdown")) {
    state.player.y += state.player.speed;
  }
  if (pointer.active) {
    state.player.y += (pointer.y - state.player.height / 2 - state.player.y) * 0.36;
  }
  state.player.y = clamp(state.player.y, 18, field.height - state.player.height - 18);
}

function moveCpu() {
  const center = state.cpu.y + state.cpu.height / 2;
  const target = state.ball.vx > 0 ? state.ball.y : field.height / 2;
  const delta = target - center;
  const maxStep = state.ball.vx > 0 ? state.cpu.speed : state.cpu.speed * 0.52;

  state.cpu.y += clamp(delta, -maxStep, maxStep);
  state.cpu.y = clamp(state.cpu.y, 18, field.height - state.cpu.height - 18);
}

function spawnImpact(x, y, direction, color, isPowerHit = false) {
  state.shake = isPowerHit ? 18 : 10;
  const count = isPowerHit ? 42 : 18;

  for (let i = 0; i < count; i++) {
    const angle = isPowerHit ? (Math.PI * 2 * i) / count : (Math.random() - 0.5) * 1.4;
    const spread = isPowerHit ? Math.sin(angle) : (Math.random() - 0.5) * 5.4;
    const speed = (isPowerHit ? 3.8 : 2.4) + Math.random() * (isPowerHit ? 7.4 : 5.2);
    particles.push({
      x,
      y,
      vx: isPowerHit ? Math.cos(angle) * speed : direction * speed,
      vy: spread * speed,
      life: isPowerHit ? 1.25 : 1,
      size: (isPowerHit ? 3 : 2) + Math.random() * (isPowerHit ? 4 : 3),
      color: isPowerHit && i % 3 === 0 ? "#ffd166" : color,
    });
  }
}

function hitPaddle(paddle) {
  const ball = state.ball;
  const withinY = ball.y + ball.radius >= paddle.y && ball.y - ball.radius <= paddle.y + paddle.height;
  const withinX = ball.x + ball.radius >= paddle.x && ball.x - ball.radius <= paddle.x + paddle.width;

  if (!withinX || !withinY) {
    return false;
  }

  const offset = (ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
  const isPlayerHit = paddle === state.player;
  state.hits += 1;
  if (isPlayerHit) {
    state.playerHits += 1;
  }

  const speedBoost = 0.24 + Math.min(state.hits, 16) * 0.055;
  const nextSpeed = Math.min(Math.abs(ball.vx) + speedBoost, field.maxBallSpeed);
  ball.vx = Math.sign(ball.vx) * -1 * nextSpeed;
  ball.vy = offset * 7.4;
  ball.x = ball.vx > 0 ? paddle.x + paddle.width + ball.radius : paddle.x - ball.radius;
  const isPowerHit = isPlayerHit && state.playerHits >= 5;
  paddle.flash = isPowerHit ? 1.45 : 1;
  spawnImpact(ball.x, ball.y, Math.sign(ball.vx), isPlayerHit ? "#5cff8d" : "#53d7ff", isPowerHit);
  return true;
}

function updateEffects() {
  state.shake *= 0.82;
  state.player.flash = Math.max(0, (state.player.flash || 0) - 0.08);
  state.cpu.flash = Math.max(0, (state.cpu.flash || 0) - 0.08);

  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.96;
    particle.vy *= 0.96;
    particle.life -= 0.045;
    if (particle.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function updateBall() {
  const ball = state.ball;

  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 9) {
    ball.trail.shift();
  }

  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.y - ball.radius < 16 || ball.y + ball.radius > field.height - 16) {
    ball.vy *= -1;
    ball.y = clamp(ball.y, 16 + ball.radius, field.height - 16 - ball.radius);
  }

  hitPaddle(state.player);
  hitPaddle(state.cpu);

  if (ball.x < -ball.radius) {
    state.cpuScore += 1;
    state.hits = 0;
    state.playerHits = 0;
    syncScore();
    state.cpuScore >= field.winScore ? finishGame("CPU") : resetBall(1);
  } else if (ball.x > field.width + ball.radius) {
    state.playerScore += 1;
    state.hits = 0;
    state.playerHits = 0;
    syncScore();
    state.playerScore >= field.winScore ? finishGame("PLAYER") : resetBall(-1);
  }
}

function drawCourt() {
  ctx.fillStyle = "#02060a";
  ctx.fillRect(0, 0, field.width, field.height);

  const grid = ctx.createLinearGradient(0, 0, field.width, field.height);
  grid.addColorStop(0, "rgba(83, 215, 255, 0.10)");
  grid.addColorStop(1, "rgba(92, 255, 141, 0.06)");
  ctx.fillStyle = grid;
  ctx.fillRect(0, 0, field.width, field.height);

  ctx.strokeStyle = "rgba(83, 215, 255, 0.38)";
  ctx.lineWidth = 5;
  ctx.strokeRect(14, 14, field.width - 28, field.height - 28);

  ctx.setLineDash([16, 20]);
  ctx.beginPath();
  ctx.moveTo(field.width / 2, 28);
  ctx.lineTo(field.width / 2, field.height - 28);
  ctx.strokeStyle = "rgba(143, 166, 184, 0.42)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPaddle(paddle, color) {
  const flash = paddle.flash || 0;
  ctx.shadowColor = flash > 0 ? "#ffffff" : color;
  ctx.shadowBlur = 18 + flash * 34;
  ctx.fillStyle = flash > 0 ? "#ffffff" : color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  if (flash > 0) {
    ctx.globalAlpha = flash * 0.55;
    ctx.fillStyle = color;
    ctx.fillRect(paddle.x - 6, paddle.y - 6, paddle.width + 12, paddle.height + 12);
    ctx.globalAlpha = 1;
  }
  ctx.shadowBlur = 0;
}

function drawBall() {
  const ball = state.ball;

  ball.trail.forEach((point, index) => {
    const alpha = (index + 1) / ball.trail.length;
    ctx.beginPath();
    ctx.arc(point.x, point.y, ball.radius * alpha * 0.78, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 95, 125, ${alpha * 0.22})`;
    ctx.fill();
  });

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.shadowColor = "#ff5f7d";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#ff5f7d";
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  });
  ctx.globalAlpha = 1;
}

function draw() {
  const shakeX = (Math.random() - 0.5) * state.shake;
  const shakeY = (Math.random() - 0.5) * state.shake;

  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawCourt();
  drawPaddle(state.player, "#5cff8d");
  drawPaddle(state.cpu, "#53d7ff");
  drawParticles();
  drawBall();
  ctx.restore();
}

function tick() {
  if (state.running && !state.paused) {
    movePlayer();
    moveCpu();
    updateBall();
    updateEffects();
  }

  draw();
  requestAnimationFrame(tick);
}

function canvasY(event) {
  const rect = canvas.getBoundingClientRect();
  return ((event.clientY - rect.top) / rect.height) * field.height;
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  if (key === " " && !state.running) {
    resetGame();
  } else if (key === "p") {
    togglePause();
  }
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointerdown", (event) => {
  pointer.active = true;
  pointer.y = canvasY(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (event.buttons || pointer.active) {
    pointer.active = true;
    pointer.y = canvasY(event);
  }
});

canvas.addEventListener("pointerup", () => {
  pointer.active = false;
});

upButton.addEventListener("pointerdown", () => keys.add("w"));
upButton.addEventListener("pointerup", () => keys.delete("w"));
upButton.addEventListener("pointerleave", () => keys.delete("w"));
downButton.addEventListener("pointerdown", () => keys.add("s"));
downButton.addEventListener("pointerup", () => keys.delete("s"));
downButton.addEventListener("pointerleave", () => keys.delete("s"));
startButton.addEventListener("click", () => {
  if (state.paused) {
    togglePause();
  } else {
    resetGame();
  }
});
restartButton.addEventListener("click", resetGame);
pauseButton.addEventListener("click", togglePause);

draw();
tick();
