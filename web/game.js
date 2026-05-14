const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const playerScoreEl = document.querySelector("#playerScore");
const cpuScoreEl = document.querySelector("#cpuScore");
const playerStatsEl = document.querySelector("#playerStats");
const cpuStatsEl = document.querySelector("#cpuStats");
const powerStatusEl = document.querySelector("#powerStatus");
const rallyStatusEl = document.querySelector("#rallyStatus");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlayTitle");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const pauseButton = document.querySelector("#pauseButton");
const upButton = document.querySelector("#upButton");
const downButton = document.querySelector("#downButton");

const DESIGN_WIDTH = 960;
const DESIGN_HEIGHT = 540;

const field = {
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  scale: 1,
  winScore: 5,
  baseBallSpeed: 7.8,
  maxBallSpeed: 17,
};

const keys = new Set();
const pointer = { active: false, y: 0 };
const particles = [];
const POWERUPS = [
  { kind: "wide", label: "WIDE PADDLE", color: "#5cff8d" },
  { kind: "slow", label: "SLOW BALL", color: "#53d7ff" },
  { kind: "double", label: "DOUBLE POINT", color: "#ffd166" },
];

const state = {
  running: false,
  over: false,
  paused: false,
  shake: 0,
  missEffect: 0,
  pendingResetDirection: 0,
  hits: 0,
  playerHits: 0,
  rally: 0,
  goalEffect: 0,
  goalMessage: "",
  scoreMultiplier: 1,
  activePower: "",
  powerTimer: 0,
  nextPowerSpawn: 240,
  cpuAimDrift: 0,
  comebackShield: false,
  powerup: null,
  playerScore: 0,
  cpuScore: 0,
  player: { x: 34, y: 210, width: 16, height: 118, speed: 8.2 },
  cpu: { x: 910, y: 210, width: 16, height: 118, speed: 6.8 },
  ball: { x: 480, y: 270, radius: 11, vx: 7.8, vy: 5.1, trail: [] },
};

function fitCanvasToWindow() {
  const rect = canvas.getBoundingClientRect();
  const previousWidth = field.width;
  const previousHeight = field.height;
  const ratioX = previousWidth > 0 ? rect.width / previousWidth : 1;
  const ratioY = previousHeight > 0 ? rect.height / previousHeight : 1;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  field.width = rect.width;
  field.height = rect.height;
  field.scale = Math.min(field.width / DESIGN_WIDTH, field.height / DESIGN_HEIGHT);
  field.baseBallSpeed = 7.8 * field.scale;
  field.maxBallSpeed = 17 * field.scale;

  state.player.x = 34 * field.scale;
  state.player.width = Math.max(10, 16 * field.scale);
  state.player.height = paddleBaseHeight(state.player);
  state.player.speed = Math.max(5.2, 8.2 * field.scale * comebackBoost());
  state.cpu.width = state.player.width;
  state.cpu.height = state.player.height;
  state.cpu.speed = Math.max(4.8, 6.8 * field.scale);
  state.cpu.x = field.width - 34 * field.scale - state.cpu.width;

  state.player.y *= ratioY;
  state.cpu.y *= ratioY;
  state.ball.x *= ratioX;
  state.ball.y *= ratioY;
  state.ball.radius = Math.max(7, 11 * field.scale);
  state.ball.vx *= ratioX;
  state.ball.vy *= ratioY;
  state.ball.trail = state.ball.trail.map((point) => ({ x: point.x * ratioX, y: point.y * ratioY }));
  particles.forEach((particle) => {
    particle.x *= ratioX;
    particle.y *= ratioY;
    particle.vx *= ratioX;
    particle.vy *= ratioY;
  });
  if (state.powerup) {
    state.powerup.x *= ratioX;
    state.powerup.y *= ratioY;
    state.powerup.radius = Math.max(11, 15 * field.scale);
  }

  state.player.y = clamp(state.player.y, wallInset(), field.height - state.player.height - wallInset());
  state.cpu.y = clamp(state.cpu.y, wallInset(), field.height - state.cpu.height - wallInset());
  state.ball.x = clamp(state.ball.x, state.ball.radius, field.width - state.ball.radius);
  state.ball.y = clamp(state.ball.y, state.ball.radius, field.height - state.ball.radius);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wallInset() {
  return Math.max(12, 18 * field.scale);
}

function paddleBaseHeight(paddle) {
  const powerBoost = paddle === state.player && state.activePower === "wide" ? 1.42 : 1;
  const comeback = paddle === state.player ? comebackBoost() : 1;
  const boost = powerBoost * comeback;
  return Math.max(76, 118 * field.scale * boost);
}

function comebackBoost() {
  const deficit = Math.max(0, state.cpuScore - state.playerScore);
  return 1 + Math.min(deficit, 3) * 0.08;
}

function resetBall(direction = 1) {
  state.ball.x = field.width / 2;
  state.ball.y = field.height / 2;
  state.ball.vx = field.baseBallSpeed * direction;
  state.ball.vy = (Math.random() > 0.5 ? 1 : -1) * 5.1 * field.scale;
  state.ball.trail = [];
}

function resetRound() {
  state.player.height = paddleBaseHeight(state.player);
  state.cpu.height = paddleBaseHeight(state.cpu);
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
  state.missEffect = 0;
  state.pendingResetDirection = 0;
  state.hits = 0;
  state.playerHits = 0;
  state.rally = 0;
  state.goalEffect = 0;
  state.goalMessage = "";
  state.scoreMultiplier = 1;
  state.activePower = "";
  state.powerTimer = 0;
  state.nextPowerSpawn = 180;
  state.cpuAimDrift = 0;
  state.comebackShield = false;
  state.powerup = null;
  particles.length = 0;
  pauseButton.textContent = "Pause";
  overlay.classList.add("hidden");
  resetRound();
  syncScore();
}

function syncScore() {
  playerScoreEl.textContent = state.playerScore;
  cpuScoreEl.textContent = state.cpuScore;
  playerStatsEl.textContent = `hits ${state.playerHits}`;
  cpuStatsEl.textContent = `rally ${state.rally}`;
  powerStatusEl.textContent = state.activePower
    ? `POWER: ${state.activePower.toUpperCase()} ${Math.ceil(state.powerTimer / 60)}s`
    : state.powerup
      ? `POWER: ${state.powerup.label}`
      : state.comebackShield
        ? "POWER: SHIELD READY"
        : "POWER: WAITING";
  rallyStatusEl.textContent = `RALLY: ${state.rally}  MULTI: x${state.scoreMultiplier}  BOOST: x${comebackBoost().toFixed(2)}`;
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
  state.player.height = paddleBaseHeight(state.player);
  state.player.y = clamp(state.player.y, wallInset(), field.height - state.player.height - wallInset());
}

function moveCpu() {
  const center = state.cpu.y + state.cpu.height / 2;
  const speedPressure = Math.max(0, Math.abs(state.ball.vx) / Math.max(field.baseBallSpeed, 1) - 1);
  if (state.ball.vx > 0 && Math.random() < 0.025 + speedPressure * 0.012) {
    state.cpuAimDrift = (Math.random() - 0.5) * state.cpu.height * Math.min(1.2, 0.42 + speedPressure * 0.22);
  }
  const target = state.ball.vx > 0 ? state.ball.y + state.cpuAimDrift : field.height / 2;
  const delta = target - center;
  const edgePenalty = Math.abs(state.ball.y - field.height / 2) / (field.height / 2);
  const pressurePenalty = clamp(1 - speedPressure * 0.08 - edgePenalty * 0.14, 0.72, 1);
  const maxStep = state.ball.vx > 0 ? state.cpu.speed * pressurePenalty : state.cpu.speed * 0.46;

  state.cpu.y += clamp(delta, -maxStep, maxStep);
  state.cpu.y = clamp(state.cpu.y, wallInset(), field.height - state.cpu.height - wallInset());
}

function spawnImpact(x, y, direction, color, isPowerHit = false) {
  state.shake = isPowerHit ? 18 : 10;
  const count = isPowerHit ? 42 : 18;

  for (let i = 0; i < count; i++) {
    const angle = isPowerHit ? (Math.PI * 2 * i) / count : (Math.random() - 0.5) * 1.4;
    const spread = isPowerHit ? Math.sin(angle) : (Math.random() - 0.5) * 5.4;
    const speed = ((isPowerHit ? 3.8 : 2.4) + Math.random() * (isPowerHit ? 7.4 : 5.2)) * field.scale;
    particles.push({
      x,
      y,
      vx: isPowerHit ? Math.cos(angle) * speed : direction * speed,
      vy: spread * speed,
      life: isPowerHit ? 1.25 : 1,
      size: ((isPowerHit ? 3 : 2) + Math.random() * (isPowerHit ? 4 : 3)) * field.scale,
      color: isPowerHit && i % 3 === 0 ? "#ffd166" : color,
    });
  }
}

function spawnMissEffect() {
  state.shake = 24;
  state.missEffect = 1;

  for (let i = 0; i < 70; i++) {
    const angle = -0.85 + Math.random() * 1.7;
    const speed = (4 + Math.random() * 12) * field.scale;
    particles.push({
      x: 22 * field.scale,
      y: state.ball.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.35,
      size: (3 + Math.random() * 6) * field.scale,
      color: i % 4 === 0 ? "#ffd166" : "#ff5f7d",
    });
  }
}

function spawnGoalEffect(label, color) {
  state.goalEffect = 1;
  state.goalMessage = label;
  state.shake = 30;

  for (let i = 0; i < 90; i++) {
    const side = label.startsWith("PLAYER") ? field.width - wallInset() : wallInset();
    const angle = Math.PI + (Math.random() - 0.5) * Math.PI;
    const speed = (4 + Math.random() * 14) * field.scale;
    particles.push({
      x: side,
      y: field.height / 2 + (Math.random() - 0.5) * field.height * 0.5,
      vx: Math.cos(angle) * speed * (label.startsWith("PLAYER") ? -1 : 1),
      vy: Math.sin(angle) * speed,
      life: 1.2,
      size: (3 + Math.random() * 7) * field.scale,
      color,
    });
  }
}

function spawnShieldEffect() {
  state.shake = 18;
  state.goalEffect = 0.78;
  state.goalMessage = "SHIELD SAVE";

  for (let i = 0; i < 56; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
    const speed = (3 + Math.random() * 9) * field.scale;
    particles.push({
      x: wallInset() + 8 * field.scale,
      y: state.ball.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      size: (3 + Math.random() * 5) * field.scale,
      color: "#ffd166",
    });
  }
}

function spawnPowerup() {
  const template = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
  state.powerup = {
    ...template,
    x: field.width * (0.34 + Math.random() * 0.32),
    y: wallInset() * 2 + Math.random() * (field.height - wallInset() * 4),
    radius: Math.max(11, 15 * field.scale),
    pulse: 0,
  };
}

function clearActivePower() {
  state.activePower = "";
  state.powerTimer = 0;
  state.scoreMultiplier = 1;
  state.player.height = paddleBaseHeight(state.player);
  state.player.y = clamp(state.player.y, wallInset(), field.height - state.player.height - wallInset());
}

function activatePowerup(powerup) {
  state.activePower = powerup.kind;
  state.powerTimer = powerup.kind === "double" ? 420 : 540;
  state.powerup = null;

  if (powerup.kind === "wide") {
    state.player.height = paddleBaseHeight(state.player);
    state.player.y = clamp(state.player.y, wallInset(), field.height - state.player.height - wallInset());
  } else if (powerup.kind === "slow") {
    state.ball.vx *= 0.82;
    state.ball.vy *= 0.82;
  } else if (powerup.kind === "double") {
    state.scoreMultiplier = 2;
  }

  spawnImpact(state.ball.x, state.ball.y, Math.sign(state.ball.vx) || 1, powerup.color, true);
  syncScore();
}

function updatePowerups() {
  if (!state.comebackShield && state.cpuScore - state.playerScore >= 2) {
    state.comebackShield = true;
  }

  if (state.activePower) {
    state.powerTimer -= 1;
    if (state.powerTimer <= 0) {
      clearActivePower();
    }
  }

  if (!state.powerup && !state.activePower) {
    state.nextPowerSpawn -= Math.max(1, comebackBoost() - 0.05);
    if (state.nextPowerSpawn <= 0) {
      spawnPowerup();
      state.nextPowerSpawn = 420 + Math.floor(Math.random() * 300);
    }
  }

  if (state.powerup) {
    state.powerup.pulse += 0.08;
    const ball = state.ball;
    const dx = ball.x - state.powerup.x;
    const dy = ball.y - state.powerup.y;
    if (Math.hypot(dx, dy) < ball.radius + state.powerup.radius) {
      activatePowerup(state.powerup);
    }
  }
}

function hitPaddle(paddle) {
  const ball = state.ball;
  const withinY = ball.y + ball.radius >= paddle.y && ball.y - ball.radius <= paddle.y + paddle.height;
  const withinX = ball.x + ball.radius >= paddle.x && ball.x - ball.radius <= paddle.x + paddle.width;

  if (!withinX || !withinY) {
    return false;
  }

  const rawOffset = (ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
  const offset = clamp(rawOffset, -1, 1);
  const isPlayerHit = paddle === state.player;
  state.hits += 1;
  state.rally += 1;
  if (isPlayerHit) {
    state.playerHits += 1;
  }

  const playerEdgeBonus = isPlayerHit ? Math.abs(offset) * 0.42 * field.scale : 0;
  const speedBoost = (0.38 + Math.min(state.hits, 18) * 0.085) * field.scale + playerEdgeBonus;
  const nextSpeed = Math.min(Math.abs(ball.vx) + speedBoost, field.maxBallSpeed);
  ball.vx = Math.sign(ball.vx) * -1 * nextSpeed;
  ball.vy = Math.sign(offset || ball.vy || 1) * Math.pow(Math.abs(offset), isPlayerHit ? 0.7 : 1) * (isPlayerHit ? 10.8 : 8.6) * field.scale;
  ball.x = ball.vx > 0 ? paddle.x + paddle.width + ball.radius : paddle.x - ball.radius;
  const isPowerHit = isPlayerHit && state.playerHits >= 5;
  paddle.flash = isPowerHit ? 1.45 : 1;
  spawnImpact(ball.x, ball.y, Math.sign(ball.vx), isPlayerHit ? "#5cff8d" : "#53d7ff", isPowerHit);
  syncScore();
  return true;
}

function updateEffects() {
  state.shake *= 0.82;
  state.missEffect = Math.max(0, state.missEffect - 0.018);
  state.player.flash = Math.max(0, (state.player.flash || 0) - 0.08);
  state.cpu.flash = Math.max(0, (state.cpu.flash || 0) - 0.08);
  state.goalEffect = Math.max(0, state.goalEffect - 0.022);

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

function resetAfterMissIfReady() {
  if (state.missEffect > 0 || state.pendingResetDirection === 0) {
    return;
  }

  const direction = state.pendingResetDirection;
  state.pendingResetDirection = 0;
  state.goalMessage = "";
  resetBall(direction);
}

function updateBall() {
  const ball = state.ball;

  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 9) {
    ball.trail.shift();
  }

  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.y - ball.radius < wallInset() || ball.y + ball.radius > field.height - wallInset()) {
    ball.vy *= -1;
    ball.y = clamp(ball.y, wallInset() + ball.radius, field.height - wallInset() - ball.radius);
  }

  hitPaddle(state.player);
  hitPaddle(state.cpu);

  if (ball.x < -ball.radius) {
    if (state.comebackShield) {
      state.comebackShield = false;
      state.hits = 0;
      state.playerHits = 0;
      state.rally = 0;
      state.cpuAimDrift = 0;
      state.ball.x = wallInset() + state.ball.radius;
      state.ball.vx = Math.abs(field.baseBallSpeed * 0.95);
      state.ball.vy *= 0.5;
      spawnShieldEffect();
      syncScore();
      return;
    }

    state.cpuScore += 1;
    state.hits = 0;
    state.playerHits = 0;
    state.rally = 0;
    state.cpuAimDrift = 0;
    clearActivePower();
    syncScore();
    if (state.cpuScore >= field.winScore) {
      finishGame("CPU");
    } else {
      spawnGoalEffect("CPU GOAL", "#ff5f7d");
      spawnMissEffect();
      state.pendingResetDirection = 1;
    }
  } else if (ball.x > field.width + ball.radius) {
    const points = state.scoreMultiplier;
    state.playerScore += points;
    state.hits = 0;
    state.playerHits = 0;
    state.rally = 0;
    state.cpuAimDrift = 0;
    clearActivePower();
    spawnGoalEffect(points > 1 ? "PLAYER +2" : "PLAYER GOAL", "#5cff8d");
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
  ctx.lineWidth = Math.max(3, 5 * field.scale);
  ctx.strokeRect(wallInset(), wallInset(), field.width - wallInset() * 2, field.height - wallInset() * 2);

  ctx.setLineDash([16 * field.scale, 20 * field.scale]);
  ctx.beginPath();
  ctx.moveTo(field.width / 2, wallInset() * 2);
  ctx.lineTo(field.width / 2, field.height - wallInset() * 2);
  ctx.strokeStyle = "rgba(143, 166, 184, 0.42)";
  ctx.lineWidth = Math.max(2, 4 * field.scale);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPaddle(paddle, color) {
  const flash = paddle.flash || 0;
  ctx.shadowColor = flash > 0 ? "#ffffff" : color;
  ctx.shadowBlur = (18 + flash * 34) * field.scale;
  ctx.fillStyle = flash > 0 ? "#ffffff" : color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  if (flash > 0) {
    ctx.globalAlpha = flash * 0.55;
    ctx.fillStyle = color;
    ctx.fillRect(paddle.x - 6 * field.scale, paddle.y - 6 * field.scale, paddle.width + 12 * field.scale, paddle.height + 12 * field.scale);
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
  ctx.shadowBlur = 22 * field.scale;
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

function drawPowerup() {
  if (!state.powerup) {
    return;
  }

  const powerup = state.powerup;
  const pulse = 1 + Math.sin(powerup.pulse) * 0.18;

  ctx.save();
  ctx.translate(powerup.x, powerup.y);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = powerup.color;
  ctx.shadowBlur = 26 * field.scale;
  ctx.fillStyle = powerup.color;
  ctx.beginPath();
  ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#02060a";
  ctx.font = `800 ${Math.max(11, 14 * field.scale)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(powerup.kind === "wide" ? "W" : powerup.kind === "slow" ? "S" : "2", 0, 1);
  ctx.restore();
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawGoalEffect() {
  if (state.goalEffect <= 0) {
    return;
  }

  const t = state.goalEffect;
  const pulse = Math.sin((1 - t) * Math.PI);

  ctx.save();
  ctx.globalAlpha = 0.26 * t;
  ctx.fillStyle = state.goalMessage.startsWith("PLAYER") ? "#5cff8d" : "#ff5f7d";
  ctx.fillRect(0, 0, field.width, field.height);
  ctx.restore();

  ctx.save();
  ctx.translate(field.width / 2, field.height / 2);
  ctx.scale(1 + pulse * 0.22, 1 + pulse * 0.22);
  ctx.fillStyle = "#edf6ff";
  ctx.shadowColor = state.goalMessage.startsWith("PLAYER") ? "#5cff8d" : "#ff5f7d";
  ctx.shadowBlur = 34 * field.scale;
  ctx.font = `900 ${Math.max(32, 58 * field.scale)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.goalMessage, 0, 0);
  ctx.restore();
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawMissZoom() {
  if (state.missEffect <= 0) {
    return;
  }

  const t = state.missEffect;
  const pulse = Math.sin((1 - t) * Math.PI);

  ctx.save();
  ctx.globalAlpha = 0.22 * t;
  ctx.fillStyle = "#ff5f7d";
  ctx.fillRect(0, 0, field.width * 0.34, field.height);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.75 * t;
  ctx.strokeStyle = "#ff5f7d";
  ctx.lineWidth = (8 + pulse * 18) * field.scale;
  ctx.beginPath();
  ctx.arc(28 * field.scale, state.ball.y, (42 + pulse * 190) * field.scale, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(96 * field.scale, clamp(state.ball.y, 118 * field.scale, field.height - 96 * field.scale));
  ctx.scale(1 + pulse * 0.18, 1 + pulse * 0.18);
  ctx.fillStyle = "#ffd166";
  ctx.shadowColor = "#ff5f7d";
  ctx.shadowBlur = 28 * field.scale;
  ctx.font = `800 ${Math.max(26, 46 * field.scale)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText("MISS", 0, 0);
  ctx.font = `700 ${Math.max(12, 18 * field.scale)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillStyle = "rgba(237, 246, 255, 0.82)";
  ctx.fillText("CPU SCORES", 4, 30);
  ctx.restore();
}

function draw() {
  const missZoom = state.missEffect > 0 ? 1 + state.missEffect * 0.1 : 1;
  const shakeX = (Math.random() - 0.5) * state.shake;
  const shakeY = (Math.random() - 0.5) * state.shake;

  ctx.save();
  ctx.translate(shakeX, shakeY);
  if (state.missEffect > 0) {
    ctx.translate(-field.width * 0.055 * state.missEffect, -field.height * 0.05 * state.missEffect);
    ctx.scale(missZoom, missZoom);
  }
  drawCourt();
  drawPaddle(state.player, "#5cff8d");
  drawPaddle(state.cpu, "#53d7ff");
  drawPowerup();
  drawParticles();
  drawBall();
  ctx.restore();
  drawGoalEffect();
  drawMissZoom();
}

function tick() {
  if (state.running && !state.paused) {
    if (state.pendingResetDirection === 0) {
      movePlayer();
      moveCpu();
      updateBall();
      updatePowerups();
    }
    updateEffects();
    resetAfterMissIfReady();
    syncScore();
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
window.addEventListener("resize", fitCanvasToWindow);

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

fitCanvasToWindow();
draw();
tick();
