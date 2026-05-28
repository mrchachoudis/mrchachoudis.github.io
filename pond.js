/* =====================================================================
   THE POND — a small fishing game.
   States: idle → casting → waiting → bite → reeling → result → idle
   ===================================================================== */
(function pond(){
  const canvas = document.getElementById('pond-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const btn = document.getElementById('pond-btn');
  const statusEl = document.getElementById('pond-status');
  const tallyEl = document.getElementById('pond-tally');

  const W = canvas.width;
  const H = canvas.height;
  const WATER_TOP = H * 0.36;

  // Species, weighted. Latin names + colors. `kind` for special drawing.
  const FISH = [
    { name: 'Sea bass',       latin: 'Dicentrarchus labrax',   color: '#a8b5b8', size: 78, w: 22 },
    { name: 'Sea bream',      latin: 'Sparus aurata',          color: '#d4c8a0', size: 70, w: 20 },
    { name: 'Red mullet',     latin: 'Mullus barbatus',        color: '#c98c4a', size: 56, w: 16 },
    { name: 'Anchovy',        latin: 'Engraulis encrasicolus', color: '#9bb4bc', size: 40, w: 13 },
    { name: 'Sardine',        latin: 'Sardina pilchardus',     color: '#aac0c4', size: 46, w: 10 },
    { name: 'Bogue',          latin: 'Boops boops',            color: '#9bc09b', size: 58, w: 7 },
    { name: 'Common pandora', latin: 'Pagellus erythrinus',    color: '#d09680', size: 64, w: 5 },
    { name: 'Octopus',        latin: 'Octopus vulgaris',       color: '#b06868', size: 60, w: 3, kind: 'octopus' },
    { name: 'An old boot',    latin: '— not a fish —',         color: '#5c4a30', size: 60, w: 3, kind: 'boot' },
    { name: 'Empty hook',     latin: '— it escaped —',         color: '#888',    size: 0,  w: 8, kind: 'nothing' },
  ];

  const tally = {};
  let state = 'idle';
  let stateTime = 0;
  let lastT = 0;
  let bobberX = W * 0.5;
  let bobberTargetX = W * 0.5;
  let bobberY = 0;
  let bobberTargetY = 0;
  let biteCountdown = 0;
  let caughtFish = null;
  let resultStaged = false;

  // background silhouettes drifting underwater
  const silhouettes = [];
  for (let i = 0; i < 4; i++){
    silhouettes.push({
      x: Math.random() * W,
      y: WATER_TOP + 40 + Math.random() * (H - WATER_TOP - 70),
      vx: (Math.random() < 0.5 ? 1 : -1) * (18 + Math.random() * 22),
      size: 12 + Math.random() * 8,
    });
  }

  function pickFish(){
    const total = FISH.reduce((s,f)=>s+f.w, 0);
    let r = Math.random() * total;
    for (const f of FISH){
      r -= f.w;
      if (r <= 0) return f;
    }
    return FISH[FISH.length-1];
  }

  function setState(s){
    state = s;
    stateTime = 0;
    statusEl.classList.remove('bite');
    btn.classList.remove('bite');
    btn.disabled = false;

    if (s === 'idle'){
      statusEl.textContent = 'Click the canvas to cast →';
      btn.textContent = 'Cast';
      bobberY = 0;
      caughtFish = null;
      resultStaged = false;
    } else if (s === 'casting'){
      statusEl.textContent = 'Casting…';
      btn.textContent = '…';
      btn.disabled = true;
      bobberTargetX = W * 0.28 + Math.random() * W * 0.44;
      bobberTargetY = WATER_TOP + 70 + Math.random() * 80;
      bobberX = W * 0.5;
      bobberY = 0;
    } else if (s === 'waiting'){
      statusEl.textContent = 'Waiting… watch the bobber';
      btn.textContent = 'Waiting';
      btn.disabled = true;
      biteCountdown = 1400 + Math.random() * 2600;
    } else if (s === 'bite'){
      statusEl.textContent = '⚡  BITE — click NOW to reel!';
      statusEl.classList.add('bite');
      btn.textContent = 'REEL NOW';
      btn.classList.add('bite');
      biteCountdown = 1300;
    } else if (s === 'reeling'){
      statusEl.textContent = 'Reeling in…';
      btn.textContent = '…';
      btn.disabled = true;
      caughtFish = pickFish();
    } else if (s === 'miss'){
      statusEl.textContent = 'Too slow — it got away.';
      btn.textContent = 'Cast again';
    } else if (s === 'result'){
      const f = caughtFish;
      if (!f || f.kind === 'nothing'){
        statusEl.innerHTML = 'Hook came up empty.';
      } else if (f.kind === 'boot'){
        statusEl.innerHTML = '<span class="acc">An old boot.</span> <span class="latin">— left for the next angler —</span>';
      } else if (f.kind === 'octopus'){
        statusEl.innerHTML = '<span class="acc">' + f.name + '.</span> <span class="latin">' + f.latin + '</span> — too clever to keep.';
        tally[f.name] = (tally[f.name] || 0) + 1;
        updateTally();
      } else {
        statusEl.innerHTML = '<span class="acc">' + f.name + '.</span> <span class="latin">' + f.latin + '</span>';
        tally[f.name] = (tally[f.name] || 0) + 1;
        updateTally();
      }
      btn.textContent = 'Cast again';
    }
  }

  function updateTally(){
    const counts = Object.entries(tally);
    if (counts.length === 0){
      tallyEl.innerHTML = '<span class="cnt">0</span> caught';
      return;
    }
    const total = counts.reduce((s,[,n])=>s+n, 0);
    tallyEl.innerHTML = '<span class="cnt">' + total + '</span>caught';
  }
  updateTally();

  function onAction(){
    if (state === 'idle' || state === 'miss' || state === 'result'){
      setState('casting');
    } else if (state === 'bite'){
      setState('reeling');
    }
  }
  btn.addEventListener('click', onAction);
  canvas.addEventListener('click', onAction);

  /* ======== rendering ======== */
  function drawWater(t){
    // sky / above water
    ctx.fillStyle = '#0a1410';
    ctx.fillRect(0, 0, W, WATER_TOP);
    // faint horizon glow
    const sky = ctx.createLinearGradient(0, 0, 0, WATER_TOP);
    sky.addColorStop(0, 'rgba(212,176,106,0.03)');
    sky.addColorStop(1, 'rgba(107,165,147,0.06)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, WATER_TOP);
    // water column
    const grad = ctx.createLinearGradient(0, WATER_TOP, 0, H);
    grad.addColorStop(0, '#102019');
    grad.addColorStop(1, '#06100c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, WATER_TOP, W, H - WATER_TOP);

    // water surface line
    ctx.strokeStyle = 'rgba(107,165,147,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 3){
      const y = WATER_TOP + Math.sin(x * 0.035 + t * 0.0018) * 2;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // subtle ripple bands
    ctx.strokeStyle = 'rgba(212,176,106,0.04)';
    for (let i = 1; i < 5; i++){
      const baseY = WATER_TOP + i * 55;
      if (baseY > H - 10) break;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 6){
        const y = baseY + Math.sin(x * 0.018 + t * 0.0009 + i * 1.3) * 1.6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawSilhouettes(dt){
    silhouettes.forEach(f => {
      f.x += f.vx * dt / 1000;
      if (f.x > W + 40) f.x = -40;
      if (f.x < -40) f.x = W + 40;
      ctx.fillStyle = 'rgba(212,176,106,0.07)';
      const dir = f.vx > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.size, f.size * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(f.x - dir * f.size * 0.95, f.y);
      ctx.lineTo(f.x - dir * (f.size + 10), f.y - f.size * 0.4);
      ctx.lineTo(f.x - dir * (f.size + 10), f.y + f.size * 0.4);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawLineAndBobber(t){
    // IDLE: draw the click-to-cast hint even with no line in the water
    if (state === 'idle'){
      const pulse = (Math.sin(t * 0.004) + 1) / 2;
      ctx.save();
      ctx.font = '600 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(212,176,106,' + (0.4 + pulse * 0.4) + ')';
      ctx.fillText('—  CLICK ANYWHERE TO CAST  —', W * 0.5, H * 0.18);
      ctx.restore();
      return;
    }
    if (state === 'result' || state === 'miss') return;
    let bX = bobberX;
    let bY = bobberY;

    if (state === 'bite'){
      bX += Math.sin(t * 0.045) * 5;
      bY += Math.abs(Math.sin(t * 0.07)) * 6;
    } else if (state === 'waiting'){
      bY += Math.sin(t * 0.0025) * 1.5;
    }

    // line
    ctx.strokeStyle = 'rgba(212,176,106,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bX, 0);
    ctx.lineTo(bX, bY);
    ctx.stroke();

    // bobber
    if (state === 'reeling' && bY < WATER_TOP - 4){
      // bobber is above water during reel — still draw it
    }
    ctx.fillStyle = '#d4b06a';
    ctx.beginPath();
    ctx.arc(bX, bY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0c1612';
    ctx.beginPath();
    ctx.arc(bX, bY - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // ripple at water surface around line if waiting/bite
    if (bY > WATER_TOP){
      ctx.strokeStyle = 'rgba(212,176,106,0.4)';
      ctx.lineWidth = 1;
      const ringR = 6 + (state === 'bite' ? Math.abs(Math.sin(t * 0.02)) * 8 : 4);
      ctx.beginPath();
      ctx.ellipse(bX, WATER_TOP, ringR, ringR * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // BITE indicator — large "!" hovering above the bobber so it's
    // visually impossible to miss
    if (state === 'bite'){
      const float = Math.sin(t * 0.012) * 4;
      const yTop = Math.max(28, bY - 50 + float);
      ctx.save();
      ctx.font = 'bold 38px "Fraunces", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#d4b06a';
      ctx.shadowColor = 'rgba(212,176,106,0.6)';
      ctx.shadowBlur = 12;
      ctx.fillText('!', bX, yTop);
      ctx.restore();

      // small "CLICK!" caption
      ctx.save();
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#d4b06a';
      ctx.fillText('CLICK!', bX, yTop + 14);
      ctx.restore();
    }
  }

  function drawCaughtFish(t){
    if (state !== 'reeling' && state !== 'result') return;
    if (!caughtFish) return;
    const f = caughtFish;

    // position depends on state
    let fY, fX;
    if (state === 'reeling'){
      fX = bobberX;
      fY = bobberY + 6;
    } else { // result: float above water in center
      fX = W * 0.5;
      fY = WATER_TOP - 30 + Math.sin(t * 0.003) * 3;
    }

    if (f.kind === 'nothing') return;

    if (f.kind === 'boot'){
      ctx.save();
      ctx.translate(fX, fY);
      ctx.rotate(Math.sin(t * 0.002) * 0.05);
      // shaft of the boot
      ctx.fillStyle = f.color;
      ctx.fillRect(-22, -16, 28, 28);
      // foot
      ctx.fillRect(-22, 4, 44, 12);
      // sole stripe
      ctx.fillStyle = '#3a2e1d';
      ctx.fillRect(-22, 14, 44, 3);
      // opening
      ctx.fillStyle = '#1a1208';
      ctx.fillRect(-19, -14, 22, 6);
      // dangling line hook
      ctx.strokeStyle = 'rgba(212,176,106,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(0, -28);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (f.kind === 'octopus'){
      ctx.save();
      ctx.translate(fX, fY);
      ctx.fillStyle = f.color;
      // bulbous head
      ctx.beginPath();
      ctx.ellipse(0, -10, 22, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      // tentacles
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++){
        const a = -Math.PI/2 + (i - 2.5) * 0.4;
        const phase = t * 0.005 + i;
        const x1 = Math.cos(a) * 14;
        const y1 = 4 + Math.sin(a) * 14;
        const x2 = Math.cos(a) * 26 + Math.sin(phase) * 4;
        const y2 = 24 + Math.sin(a) * 4 + Math.cos(phase) * 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(Math.cos(a) * 20, 16, x2, y2);
        ctx.stroke();
      }
      // eyes
      ctx.fillStyle = '#0c1612';
      ctx.fillRect(-8, -14, 3, 3);
      ctx.fillRect(5, -14, 3, 3);
      // line up
      ctx.strokeStyle = 'rgba(212,176,106,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(0, -40);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // regular fish: ellipse body + triangle tail + small fin + eye
    const size = f.size;
    ctx.save();
    ctx.translate(fX, fY);
    // little bounce
    ctx.rotate(Math.sin(t * 0.004) * 0.06);

    // body
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.42, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // belly highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.05, size * 0.36, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // tail
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.moveTo(-size * 0.42, 0);
    ctx.lineTo(-size * 0.62, -size * 0.18);
    ctx.lineTo(-size * 0.58, 0);
    ctx.lineTo(-size * 0.62, size * 0.18);
    ctx.closePath();
    ctx.fill();

    // dorsal fin
    ctx.beginPath();
    ctx.moveTo(-size * 0.10, -size * 0.16);
    ctx.lineTo(size * 0.05, -size * 0.30);
    ctx.lineTo(size * 0.15, -size * 0.16);
    ctx.closePath();
    ctx.fill();

    // eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(size * 0.26, -size * 0.04, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0c1612';
    ctx.beginPath();
    ctx.arc(size * 0.27, -size * 0.04, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // hook line going up from the mouth
    ctx.strokeStyle = 'rgba(212,176,106,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size * 0.34, -size * 0.05);
    ctx.lineTo(size * 0.34, -size * 0.4);
    ctx.stroke();

    ctx.restore();
  }

  /* ======== game loop ======== */
  function loop(t){
    const dt = Math.min(t - lastT, 50);
    lastT = t;
    stateTime += dt;

    // animate bobber position
    if (state === 'casting'){
      bobberX += (bobberTargetX - bobberX) * Math.min(1, dt / 120);
      bobberY += (bobberTargetY - bobberY) * Math.min(1, dt / 200);
      if (Math.abs(bobberY - bobberTargetY) < 1.5) setState('waiting');
    } else if (state === 'waiting'){
      biteCountdown -= dt;
      if (biteCountdown <= 0) setState('bite');
    } else if (state === 'bite'){
      biteCountdown -= dt;
      if (biteCountdown <= 0) setState('miss');
    } else if (state === 'reeling'){
      bobberY = Math.max(-30, bobberY - dt * 0.45);
      if (bobberY <= -10 && !resultStaged){
        resultStaged = true;
        if (caughtFish && caughtFish.kind === 'nothing') setState('idle');
        else setState('result');
      }
    } else if (state === 'result'){
      if (stateTime > 4500) setState('idle');
    } else if (state === 'miss'){
      if (stateTime > 1600) setState('idle');
    }

    drawWater(t);
    drawSilhouettes(dt);
    drawLineAndBobber(t);
    drawCaughtFish(t);

    rafId = requestAnimationFrame(loop);
  }

  let rafId = 0;
  function start(){
    if (rafId) return;
    rafId = requestAnimationFrame((t) => { lastT = t; loop(t); });
  }
  function stop(){
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  // Only run when visible — save CPU when scrolled away
  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) start();
        else stop();
      });
    }, { threshold: 0.05 });
    io.observe(canvas);
  } else {
    start();
  }
})();
