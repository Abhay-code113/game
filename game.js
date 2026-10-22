(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const frame = document.querySelector('#gameFrame');
  const scoreEl = document.querySelector('#score');
  const shotEl = document.querySelector('#shotCount');
  const angleEl = document.querySelector('#angleReadout');
  const powerEl = document.querySelector('#powerReadout');
  const powerFill = document.querySelector('#powerFill');
  const message = document.querySelector('#message');
  const messageTitle = document.querySelector('#messageTitle');
  const messageText = document.querySelector('#messageText');
  const resetButton = document.querySelector('#resetButton');

  let width = 0;
  let height = 0;
  let dpr = 1;
  let pointer = { x: 0, y: 0, down: false };
  let aim = { x: 0, y: 0 };
  let ball = null;
  let score = 0;
  let shots = 0;
  let charging = false;
  let charge = 0;
  let lastTime = 0;
  let messageTimer = 0;
  let particles = [];
  let chargeAtShot = 0;

  const maxShots = 10;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function layout() {
    const rect = frame.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ball = ball || {};
    ball.x = width * 0.19;
    ball.y = height * 0.79;
    ball.r = Math.max(9, Math.min(16, width * 0.018));

    aim = { x: width * 0.75, y: height * 0.48 };
    draw();
  }

  function hoop() {
    return { x: width * 0.77, y: height * 0.37, w: Math.min(68, width * 0.12) };
  }

  function drawCourt() {
    const sky = ctx.createLinearGradient(0, 0, 0, height * 0.72);
    sky.addColorStop(0, '#88b8a6');
    sky.addColorStop(0.7, '#c5c79c');
    sky.addColorStop(1, '#8c9b69');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#354e49';
    ctx.fillRect(0, height * 0.3, width, height * 0.18);
    ctx.fillStyle = '#46635a';
    ctx.fillRect(0, height * 0.33, width, height * 0.11);

    for (let i = 0; i < 130; i++) {
      const x = (i * 47) % width;
      const y = height * 0.32 + ((i * 29) % Math.max(1, height * 0.13));
      ctx.fillStyle = ['#e7bd62', '#d97e60', '#d9ded0', '#758eae'][i % 4];
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 3) * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    const floor = ctx.createLinearGradient(0, height * 0.47, 0, height);
    floor.addColorStop(0, '#bd8152');
    floor.addColorStop(1, '#e3ad70');
    ctx.fillStyle = floor;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.48);
    ctx.lineTo(width, height * 0.48);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffebc2aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.49);
    ctx.lineTo(width, height * 0.49);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(width * 0.52, height * 0.83, width * 0.34, height * 0.19, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, height * 0.65);
    ctx.lineTo(width, height * 0.65);
    ctx.stroke();

    ctx.strokeStyle = '#fff0c477';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, height * 0.5);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

  function drawHoop() {
    const h = hoop();
    const poleX = h.x + h.w * 0.68;

    ctx.fillStyle = '#56605b';
    ctx.fillRect(poleX, h.y - 7, 9, height * 0.55);

    ctx.fillStyle = '#d9ece0b0';
    ctx.fillRect(h.x - h.w * 0.12, h.y - h.w * 0.56, h.w * 0.88, h.w * 0.55);
    ctx.strokeStyle = '#f6f3dc';
    ctx.lineWidth = 3;
    ctx.strokeRect(h.x - h.w * 0.12, h.y - h.w * 0.56, h.w * 0.88, h.w * 0.55);

    ctx.strokeStyle = '#e55c42';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(h.x - h.w * 0.42, h.y);
    ctx.lineTo(h.x + h.w * 0.42, h.y);
    ctx.stroke();

    ctx.strokeStyle = '#f1eee0';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) {
      const x = h.x - h.w * 0.4 + h.w * 0.8 * i / 6;
      const endX = h.x - h.w * 0.27 + h.w * 0.54 * i / 6;
      ctx.beginPath();
      ctx.moveTo(x, h.y + 2);
      ctx.lineTo(endX, h.y + h.w * 0.45);
      ctx.stroke();
    }

    for (let j = 1; j <= 3; j++) {
      const y = h.y + h.w * 0.45 * j / 4;
      const half = h.w * (0.4 - 0.13 * j / 4);
      ctx.beginPath();
      ctx.moveTo(h.x - half, y);
      ctx.lineTo(h.x + half, y);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    const x = width * 0.13;
    const base = height * 0.83;

    ctx.lineCap = 'round';
    ctx.strokeStyle = '#25343a';
    ctx.lineWidth = Math.max(7, width * 0.015);

    ctx.beginPath();
    ctx.moveTo(x, base - 12);
    ctx.lineTo(x - 7, base + 24);
    ctx.lineTo(x - 18, base + 41);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, base - 12);
    ctx.lineTo(x + 15, base + 20);
    ctx.lineTo(x + 27, base + 38);
    ctx.stroke();

    ctx.fillStyle = '#e4a878';
    ctx.beginPath();
    ctx.arc(x, base - 46, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e7e8df';
    ctx.beginPath();
    ctx.roundRect(x - 17, base - 34, 34, 36, 9);
    ctx.fill();

    ctx.strokeStyle = '#e4a878';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x + 11, base - 25);
    ctx.lineTo(x + 26, base - 52);
    ctx.lineTo(x + 38, base - 68);
    ctx.stroke();

    ctx.fillStyle = '#27343a';
    ctx.beginPath();
    ctx.arc(x + 39, base - 70, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBall(x = ball.x, y = ball.y, r = ball.r, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    ctx.fillStyle = '#ea792c';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#552f20';
    ctx.lineWidth = Math.max(1, r * 0.09);

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.quadraticCurveTo(0, -r * 0.28, r, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(-r * 0.3, 0, 0, r);
    ctx.stroke();

    ctx.restore();
  }

  function drawAim() {
    if (ball && !ball.moving && !charging) {
      ctx.save();
      ctx.setLineDash([5, 7]);
      ctx.strokeStyle = '#f3ffccaa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.quadraticCurveTo((ball.x + aim.x) / 2, aim.y - 50, aim.x, aim.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#e5ff8a';
      ctx.beginPath();
      ctx.arc(aim.x, aim.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function draw() {
    if (!width || !height) return;
    drawCourt();
    drawHoop();
    drawPlayer();
    drawAim();

    if (ball && !ball.hidden) {
      drawBall(ball.x, ball.y, ball.r, ball.rotation || 0);
    }

    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function setMessage(title, text, duration = 1.6) {
    messageTitle.textContent = title;
    messageText.textContent = text;
    message.classList.remove('hidden');
    messageTimer = duration;
  }

  function updateHud() {
    scoreEl.innerHTML = `${score} <i>/ ${maxShots}</i>`;
    shotEl.textContent = String(Math.min(shots + 1, maxShots)).padStart(2, '0');

    const dx = aim.x - ball.x;
    const dy = ball.y - aim.y;
    const angle = clamp(Math.round(Math.atan2(dy, Math.max(1, dx)) * 180 / Math.PI), 15, 80);
    angleEl.textContent = `${angle}°`;

    powerFill.style.width = `${charging ? charge * 100 : 30}%`;
    powerEl.textContent = charging ? `${Math.round(charge * 100)}% POWER` : 'HOLD TO CHARGE';
  }

  function shoot() {
    if (ball.moving || shots >= maxShots) return;

    shots++;
    const h = hoop();
    const power = clamp(charge, 0.12, 1);
    const targetX = clamp(aim.x, width * 0.34, width * 0.92);
    const targetY = clamp(aim.y - (power - 0.55) * height * 0.25, height * 0.20, height * 0.70);
    const flightTime = 1.05 - power * 0.35;

    ball.vx = (targetX - ball.x) / flightTime;
    ball.vy = (targetY - ball.y - 210 * flightTime * flightTime) / flightTime;
    ball.target = { x: h.x, y: h.y };
    ball.moving = true;
    ball.elapsed = 0;
    ball.scored = false;
    ball.resolved = false;

    setMessage('Up it goes!', 'Watch the ball find its arc.', 0.7);
    charging = false;
    charge = 0;
    updateHud();
  }

  function resolveShot() {
    if (!ball || ball.resolved) return;
    ball.resolved = true;

    const made = ball.scored && chargeAtShot > 0.23 && chargeAtShot < 0.91;

    if (made) {
      score++;
      setMessage('SWISH!', 'Nothing but net. Great shot!', 1.3);

      for (let i = 0; i < 24; i++) {
        particles.push({
          x: hoop().x,
          y: hoop().y,
          vx: (Math.random() - 0.5) * 170,
          vy: -Math.random() * 180,
          life: 1,
          r: 2 + Math.random() * 3,
          color: ['#d8ff58', '#fff0a8', '#f18b4e'][i % 3]
        });
      }
    } else {
      setMessage('Missed it.', 'Adjust your aim and try another shot.', 1.4);
    }

    updateHud();

    if (shots >= maxShots) {
      setTimeout(() => {
        setMessage('SESSION COMPLETE', `You made ${score} of ${maxShots}. Tap NEW GAME to shoot again.`, 999);
      }, 1450);
    }
  }

  function animate(now) {
    const dt = Math.min(0.035, (now - (lastTime || now)) / 1000);
    lastTime = now;

    if (charging && pointer.down) {
      charge = Math.min(1, charge + dt * 0.8);
      updateHud();
    }

    if (ball && ball.moving) {
      ball.elapsed += dt;
      const previousX = ball.x;

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.vy += 420 * dt;
      ball.rotation = (ball.rotation || 0) + dt * 5;

      const h = hoop();
      if (
        !ball.scored &&
        ball.vx > 0 &&
        previousX < h.x &&
        ball.x >= h.x &&
        Math.abs(ball.y - h.y) < h.w * 0.42 &&
        chargeAtShot > 0.23 &&
        chargeAtShot < 0.91
      ) {
        ball.scored = true;
        ball.vy = Math.abs(ball.vy) * 0.25;
      }

      if (ball.elapsed > 2.5 || ball.y > height + 40 || ball.x > width + 50) {
        ball.moving = false;
        ball.hidden = true;
        resolveShot();

        setTimeout(() => {
          if (shots < maxShots) {
            ball.x = width * 0.19;
            ball.y = height * 0.79;
            ball.hidden = false;
            ball.resolved = false;
            ball.scored = false;
          }
        }, 400);
      }
    }

    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 230 * dt;
      p.life -= dt * 0.75;
    });

    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0 && !charging && !ball.moving && shots < maxShots) {
        message.classList.add('hidden');
      }
    }

    draw();
    requestAnimationFrame(animate);
  }

  function aimAt(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    aim.x = clamp(pointer.x, width * 0.32, width * 0.94);
    aim.y = clamp(pointer.y, height * 0.18, height * 0.75);
    updateHud();
  }

  canvas.addEventListener('pointermove', aimAt);

  canvas.addEventListener('pointerdown', event => {
    if (shots >= maxShots || (ball && ball.moving)) return;
    canvas.setPointerCapture(event.pointerId);
    aimAt(event);
    pointer.down = true;
    charging = true;
    charge = 0.08;
    message.classList.add('hidden');
  });

  canvas.addEventListener('pointerup', event => {
    if (!charging) return;
    aimAt(event);
    pointer.down = false;
    charging = false;
    chargeAtShot = charge;
    shoot();
  });

  canvas.addEventListener('pointercancel', () => {
    pointer.down = false;
    charging = false;
    charge = 0;
    updateHud();
  });

  function reset() {
    score = 0;
    shots = 0;
    charge = 0;
    charging = false;
    pointer.down = false;
    particles = [];
    ball = {
      x: width * 0.19,
      y: height * 0.79,
      r: Math.max(9, Math.min(16, width * 0.018)),
      moving: false,
      hidden: false,
      resolved: false,
      rotation: 0
    };

    setMessage('Ready at the line?', 'Move to aim, then hold and release to shoot.', 999);
    updateHud();
    draw();
  }

  resetButton.addEventListener('click', reset);
  window.addEventListener('resize', layout);

  layout();
  reset();
  requestAnimationFrame(animate);
})();