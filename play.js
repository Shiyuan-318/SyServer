(function () {
  'use strict';

  // ============ 常量 ============
  var WORLD_SIZE = 24;     // 世界水平尺寸（X、Z）
  var GRAVITY = 28;        // 重力加速度
  var JUMP_SPEED = 8.4;    // 跳跃初速度
  var WALK_SPEED = 4.5;    // 行走速度
  var REACH = 5;           // 方块交互最远距离
  var EYE = 1.62;          // 视线高度
  var P_H = 1.8;           // 玩家高度
  var P_R = 0.3;           // 玩家半宽

  var BLOCK = { AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, LEAVES: 5, SAND: 6, COBBLE: 7, PLANKS: 8, GLASS: 9 };
  var BLOCK_NAME = { 1: '草地', 2: '泥土', 3: '石头', 4: '木头', 5: '树叶', 6: '沙子', 7: '圆石', 8: '木板', 9: '玻璃' };
  var HOTBAR = [BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.WOOD, BLOCK.LEAVES, BLOCK.SAND, BLOCK.COBBLE, BLOCK.PLANKS, BLOCK.GLASS];

  // ============ 状态 ============
  var blocks = new Map();   // "x,y,z" -> 方块类型
  var meshes = new Map();   // "x,y,z" -> THREE.Mesh
  var mats = {};            // 方块类型 -> [6 个材质]
  var boxGeo = null;        // 共享立方体几何体
  var highlight = null;     // 准星命中高亮框
  var currentHit = null;    // 当前射线命中

  var scene, camera, renderer;
  var player = { pos: null, vel: null, yaw: 0, pitch: 0, onGround: false };
  var keys = {};
  var joy = { x: 0, y: 0, jump: false };
  var selectedSlot = 0;
  var gameActive = false;
  var gameStarted = false;
  var isTouch = false;

  // 触摸追踪
  var joyTouchId = null, lookTouchId = null, joyCenter = null, lookLast = null;
  var touchActions = {};

  // ============ DOM 引用 ============
  var container, canvas, overlay, overlayTitle, overlaySub, hotbarEl, blockNameEl, fsBtn, joyBase, joyKnob;

  // ============ 工具函数 ============
  function key(x, y, z) { return x + ',' + y + ',' + z; }
  function hasBlock(x, y, z) { return blocks.has(key(x, y, z)); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clampPitch() { var lim = Math.PI / 2 - 0.01; player.pitch = clamp(player.pitch, -lim, lim); }

  // ============ 像素纹理生成 ============
  function makeTex(draw) {
    var c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    var ctx = c.getContext('2d');
    draw(ctx);
    var tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  }

  function px(ctx, x, y, r, g, b, a) {
    ctx.fillStyle = 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + (a == null ? 1 : a) + ')';
    ctx.fillRect(x, y, 1, 1);
  }

  function noiseFill(ctx, r, g, b, vary) {
    for (var y = 0; y < 16; y++) {
      for (var x = 0; x < 16; x++) {
        var n = (Math.random() - 0.5) * vary;
        px(ctx, x, y, r + n, g + n, b + n);
      }
    }
  }

  // 绘制某个方块的某一面到 16x16 画布
  function drawFace(type, face, ctx) {
    switch (type) {
      case BLOCK.GRASS:
        if (face === 'top') {
          noiseFill(ctx, 90, 140, 56, 22);
        } else if (face === 'bottom') {
          noiseFill(ctx, 134, 96, 67, 18);
        } else {
          noiseFill(ctx, 134, 96, 67, 18);
          for (var x = 0; x < 16; x++) {
            var h = 3 + ((Math.random() * 2) | 0);
            for (var y = 0; y < h; y++) {
              var n = (Math.random() - 0.5) * 22;
              px(ctx, x, y, 90 + n, 140 + n, 56 + n);
            }
          }
        }
        break;
      case BLOCK.DIRT:
        noiseFill(ctx, 134, 96, 67, 18);
        break;
      case BLOCK.STONE:
        noiseFill(ctx, 128, 128, 128, 16);
        for (var i = 0; i < 10; i++) {
          px(ctx, (Math.random() * 16) | 0, (Math.random() * 16) | 0, 100, 100, 100);
        }
        break;
      case BLOCK.WOOD:
        if (face === 'top' || face === 'bottom') {
          noiseFill(ctx, 160, 120, 60, 12);
          ctx.strokeStyle = 'rgba(110,75,40,0.85)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(8, 8, 3, 0, Math.PI * 2); ctx.stroke();
          px(ctx, 8, 8, 180, 140, 80);
        } else {
          noiseFill(ctx, 110, 80, 45, 12);
          for (var wx = 0; wx < 16; wx++) {
            if (wx % 4 === 0 || wx % 7 === 0) {
              for (var wy = 0; wy < 16; wy++) px(ctx, wx, wy, 85, 58, 32);
            }
          }
        }
        break;
      case BLOCK.LEAVES:
        noiseFill(ctx, 54, 98, 38, 26);
        for (var li = 0; li < 18; li++) {
          px(ctx, (Math.random() * 16) | 0, (Math.random() * 16) | 0, 38, 72, 28);
        }
        break;
      case BLOCK.SAND:
        noiseFill(ctx, 224, 206, 150, 14);
        break;
      case BLOCK.COBBLE:
        noiseFill(ctx, 120, 120, 120, 10);
        ctx.fillStyle = 'rgba(70,70,70,0.9)';
        for (var cy = 0; cy < 16; cy += 8) ctx.fillRect(0, cy, 16, 1);
        for (var cx = 0; cx < 16; cx += 8) { ctx.fillRect(cx, 0, 1, 8); ctx.fillRect(cx + 4, 8, 1, 8); }
        for (var ci = 0; ci < 24; ci++) {
          var cn = (Math.random() - 0.5) * 30;
          px(ctx, (Math.random() * 16) | 0, (Math.random() * 16) | 0, 135 + cn, 135 + cn, 135 + cn);
        }
        break;
      case BLOCK.PLANKS:
        noiseFill(ctx, 160, 120, 70, 12);
        ctx.fillStyle = 'rgba(110,78,45,0.9)';
        for (var py = 0; py < 16; py += 5) ctx.fillRect(0, py, 16, 1);
        ctx.fillRect(0, 0, 1, 5); ctx.fillRect(8, 5, 1, 5); ctx.fillRect(4, 10, 1, 6); ctx.fillRect(12, 15, 1, 1);
        break;
      case BLOCK.GLASS:
        ctx.clearRect(0, 0, 16, 16);
        ctx.fillStyle = 'rgba(200,230,240,0.22)'; ctx.fillRect(0, 0, 16, 16);
        ctx.strokeStyle = 'rgba(220,240,250,0.9)'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, 15, 15);
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(2, 2, 4, 1); ctx.fillRect(2, 2, 1, 4);
        break;
    }
  }

  // 为某方块类型生成 6 面材质（缓存）
  function getMats(type) {
    if (mats[type]) return mats[type];
    function m(face) {
      var t = makeTex(function (ctx) { drawFace(type, face, ctx); });
      var mm = new THREE.MeshLambertMaterial({ map: t });
      if (type === BLOCK.GLASS) { mm.transparent = true; mm.opacity = 0.65; }
      if (type === BLOCK.LEAVES) { mm.transparent = true; mm.opacity = 0.96; }
      return mm;
    }
    var top = m('top'), bottom = m('bottom'), side = m('side');
    // 顺序：[右, 左, 上, 下, 前, 后]
    var arr = [side, side, top, bottom, side, side];
    mats[type] = arr;
    return arr;
  }

  // ============ 世界生成 ============
  function generateWorld() {
    // 用三角函数叠加做简易高度噪声
    var heights = [];
    for (var x = 0; x < WORLD_SIZE; x++) {
      heights[x] = [];
      for (var z = 0; z < WORLD_SIZE; z++) {
        var n = Math.sin(x * 0.35) * Math.cos(z * 0.32) * 1.4
              + Math.sin((x + z) * 0.18) * 0.9
              + Math.cos(x * 0.7 - z * 0.5) * 0.5;
        heights[x][z] = 4 + Math.round(n);
      }
    }
    for (var gx = 0; gx < WORLD_SIZE; gx++) {
      for (var gz = 0; gz < WORLD_SIZE; gz++) {
        var h = heights[gx][gz];
        var beach = h <= 3; // 低洼处变沙滩
        blocks.set(key(gx, h, gz), beach ? BLOCK.SAND : BLOCK.GRASS);
        for (var y = h - 1; y >= h - 3 && y >= 0; y--) {
          blocks.set(key(gx, y, gz), beach ? BLOCK.SAND : BLOCK.DIRT);
        }
        for (var y2 = h - 4; y2 >= 0; y2--) {
          blocks.set(key(gx, y2, gz), BLOCK.STONE);
        }
      }
    }
    // 随机种几棵树
    var tries = 14;
    while (tries-- > 0) {
      var tx = 2 + ((Math.random() * (WORLD_SIZE - 4)) | 0);
      var tz = 2 + ((Math.random() * (WORLD_SIZE - 4)) | 0);
      var th = heights[tx][tz];
      if (blocks.get(key(tx, th, tz)) !== BLOCK.GRASS) continue;
      plantTree(tx, th, tz);
    }
  }

  function plantTree(x, baseY, z) {
    var h = 4 + ((Math.random() * 2) | 0); // 树干 4~5 格
    for (var i = 1; i <= h; i++) blocks.set(key(x, baseY + i, z), BLOCK.WOOD);
    var topY = baseY + h;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        for (var dz = -2; dz <= 2; dz++) {
          if (dx === 0 && dz === 0 && dy <= 0) continue;
          if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) > 3) continue;
          if (Math.random() < 0.25) continue;
          var lx = x + dx, ly = topY + dy, lz = z + dz;
          if (!blocks.has(key(lx, ly, lz))) blocks.set(key(lx, ly, lz), BLOCK.LEAVES);
        }
      }
    }
    if (!blocks.has(key(x, topY + 1, z))) blocks.set(key(x, topY + 1, z), BLOCK.LEAVES);
  }

  // ============ 网格管理（只渲染暴露面） ============
  var NEIGHBORS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

  function isExposed(x, y, z) {
    for (var i = 0; i < 6; i++) {
      if (!hasBlock(x + NEIGHBORS[i][0], y + NEIGHBORS[i][1], z + NEIGHBORS[i][2])) return true;
    }
    return false;
  }

  function addMesh(x, y, z, type) {
    var k = key(x, y, z);
    if (meshes.has(k)) return;
    var mesh = new THREE.Mesh(boxGeo, getMats(type));
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    mesh.userData = { x: x, y: y, z: z };
    scene.add(mesh);
    meshes.set(k, mesh);
  }

  function removeMesh(k) {
    var mesh = meshes.get(k);
    if (!mesh) return;
    scene.remove(mesh);
    meshes.delete(k);
  }

  function buildMeshes() {
    blocks.forEach(function (type, k) {
      var p = k.split(',');
      var x = +p[0], y = +p[1], z = +p[2];
      if (isExposed(x, y, z)) addMesh(x, y, z, type);
    });
  }

  function addBlock(x, y, z, type) {
    var k = key(x, y, z);
    if (blocks.has(k)) return;
    blocks.set(k, type);
    if (isExposed(x, y, z)) addMesh(x, y, z, type);
    // 邻居可能被完全包围，移除其网格
    for (var i = 0; i < 6; i++) {
      var nx = x + NEIGHBORS[i][0], ny = y + NEIGHBORS[i][1], nz = z + NEIGHBORS[i][2];
      var nk = key(nx, ny, nz);
      if (meshes.has(nk) && !isExposed(nx, ny, nz)) removeMesh(nk);
    }
  }

  function removeBlock(x, y, z) {
    var k = key(x, y, z);
    if (!blocks.has(k)) return;
    blocks.delete(k);
    removeMesh(k);
    // 邻居可能新暴露，补上网格
    for (var i = 0; i < 6; i++) {
      var nx = x + NEIGHBORS[i][0], ny = y + NEIGHBORS[i][1], nz = z + NEIGHBORS[i][2];
      var nk = key(nx, ny, nz);
      if (hasBlock(nx, ny, nz) && !meshes.has(nk) && isExposed(nx, ny, nz)) {
        addMesh(nx, ny, nz, blocks.get(nk));
      }
    }
  }

  // ============ 体素射线（DDA） ============
  function raycastVoxel(maxDist) {
    var o = camera.position;
    var d = new THREE.Vector3();
    camera.getWorldDirection(d);
    var x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    var stepX = d.x > 0 ? 1 : (d.x < 0 ? -1 : 0);
    var stepY = d.y > 0 ? 1 : (d.y < 0 ? -1 : 0);
    var stepZ = d.z > 0 ? 1 : (d.z < 0 ? -1 : 0);
    var tDeltaX = stepX !== 0 ? Math.abs(1 / d.x) : Infinity;
    var tDeltaY = stepY !== 0 ? Math.abs(1 / d.y) : Infinity;
    var tDeltaZ = stepZ !== 0 ? Math.abs(1 / d.z) : Infinity;
    var tMaxX = stepX > 0 ? (x + 1 - o.x) / d.x : (stepX < 0 ? (x - o.x) / d.x : Infinity);
    var tMaxY = stepY > 0 ? (y + 1 - o.y) / d.y : (stepY < 0 ? (y - o.y) / d.y : Infinity);
    var tMaxZ = stepZ > 0 ? (z + 1 - o.z) / d.z : (stepZ < 0 ? (z - o.z) / d.z : Infinity);
    var face = [0, 0, 0];
    var t = 0;
    if (hasBlock(x, y, z)) return { x: x, y: y, z: z, normal: face };
    while (t <= maxDist) {
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        x += stepX; t = tMaxX; tMaxX += tDeltaX; face = [-stepX, 0, 0];
      } else if (tMaxY < tMaxZ) {
        y += stepY; t = tMaxY; tMaxY += tDeltaY; face = [0, -stepY, 0];
      } else {
        z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; face = [0, 0, -stepZ];
      }
      if (t > maxDist) break;
      if (hasBlock(x, y, z)) return { x: x, y: y, z: z, normal: face };
    }
    return null;
  }

  // ============ 碰撞检测 ============
  function collidesAt(px, py, pz) {
    var minX = Math.floor(px - P_R), maxX = Math.floor(px + P_R);
    var minY = Math.floor(py), maxY = Math.floor(py + P_H - 0.001);
    var minZ = Math.floor(pz - P_R), maxZ = Math.floor(pz + P_R);
    for (var x = minX; x <= maxX; x++) {
      for (var y = minY; y <= maxY; y++) {
        for (var z = minZ; z <= maxZ; z++) {
          if (hasBlock(x, y, z)) return true;
        }
      }
    }
    return false;
  }

  function blockIntersectsPlayer(bx, by, bz) {
    return (player.pos.x + P_R > bx && player.pos.x - P_R < bx + 1 &&
            player.pos.y + P_H > by && player.pos.y < by + 1 &&
            player.pos.z + P_R > bz && player.pos.z - P_R < bz + 1);
  }

  // ============ 场景初始化 ============
  function setupScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 18, 42);

    camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 200);
    camera.rotation.order = 'YXZ';

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;

    // 环境光 + 方向光（模拟太阳）
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    var sun = new THREE.DirectionalLight(0xffffff, 0.72);
    sun.position.set(40, 80, 30);
    scene.add(sun);
    // 填充光，让背光面不太黑
    var fill = new THREE.DirectionalLight(0xbfd8ff, 0.25);
    fill.position.set(-30, 40, -20);
    scene.add(fill);

    boxGeo = new THREE.BoxGeometry(1, 1, 1);
  }

  // ============ 高亮框（准星命中的方块边框） ============
  function createHighlight() {
    var edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    var mat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
    highlight = new THREE.LineSegments(edges, mat);
    highlight.visible = false;
    scene.add(highlight);
  }

  // ============ 玩家物理 ============
  function updatePlayer(dt) {
    // 计算朝向向量
    var sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    var fwdX = -sy, fwdZ = -cy;
    var rgtX = cy, rgtZ = -sy;

    var mx = 0, mz = 0;
    if (keys['w']) { mx += fwdX; mz += fwdZ; }
    if (keys['s']) { mx -= fwdX; mz -= fwdZ; }
    if (keys['d']) { mx += rgtX; mz += rgtZ; }
    if (keys['a']) { mx -= rgtX; mz -= rgtZ; }
    // 摇杆输入（joy.y 正 = 前进，joy.x 正 = 右移）
    mx += fwdX * joy.y + rgtX * joy.x;
    mz += fwdZ * joy.y + rgtZ * joy.x;

    var len = Math.hypot(mx, mz);
    if (len > 0.0001) { mx = mx / len * WALK_SPEED; mz = mz / len * WALK_SPEED; }

    player.vel.x = mx;
    player.vel.z = mz;

    // 跳跃
    if ((keys[' '] || joy.jump) && player.onGround) {
      player.vel.y = JUMP_SPEED;
      player.onGround = false;
    }

    // 重力
    player.vel.y -= GRAVITY * dt;
    if (player.vel.y < -55) player.vel.y = -55;

    // 分轴移动 + 碰撞
    var nx = player.pos.x + player.vel.x * dt;
    if (!collidesAt(nx, player.pos.y, player.pos.z)) player.pos.x = nx;
    else player.vel.x = 0;

    var nz = player.pos.z + player.vel.z * dt;
    if (!collidesAt(player.pos.x, player.pos.y, nz)) player.pos.z = nz;
    else player.vel.z = 0;

    var ny = player.pos.y + player.vel.y * dt;
    if (!collidesAt(player.pos.x, ny, player.pos.z)) {
      player.pos.y = ny;
      player.onGround = false;
    } else {
      if (player.vel.y < 0) player.onGround = true;
      player.vel.y = 0;
    }

    // 掉出世界底部，重置
    if (player.pos.y < -10) respawn();

    // 同步相机
    camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z);
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
  }

  function respawn() {
    var cx = (WORLD_SIZE / 2) | 0, cz = (WORLD_SIZE / 2) | 0;
    // 找到该列最高的方块
    var topY = 0;
    for (var y = 30; y >= 0; y--) {
      if (hasBlock(cx, y, cz)) { topY = y + 1; break; }
    }
    player.pos.set(cx + 0.5, topY + 0.2, cz + 0.5);
    player.vel.set(0, 0, 0);
  }

  // ============ Hotbar UI ============
  function makeIconURL(type) {
    var c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    var ctx = c.getContext('2d');
    drawFace(type, 'side', ctx);
    return c.toDataURL();
  }

  function renderHotbar() {
    hotbarEl.innerHTML = '';
    for (var i = 0; i < HOTBAR.length; i++) {
      var slot = document.createElement('div');
      slot.className = 'play-hotbar-slot';
      slot.style.backgroundImage = 'url(' + makeIconURL(HOTBAR[i]) + ')';
      slot.title = BLOCK_NAME[HOTBAR[i]] || '';
      (function (idx) {
        slot.addEventListener('click', function () {
          selectedSlot = idx;
          updateHotbarUI();
          updateBlockName();
        });
      })(i);
      hotbarEl.appendChild(slot);
    }
    updateHotbarUI();
  }

  function updateHotbarUI() {
    var slots = hotbarEl.querySelectorAll('.play-hotbar-slot');
    for (var i = 0; i < slots.length; i++) {
      if (i === selectedSlot) slots[i].classList.add('active');
      else slots[i].classList.remove('active');
    }
  }

  function updateBlockName() {
    blockNameEl.textContent = BLOCK_NAME[HOTBAR[selectedSlot]] || '';
  }

  // ============ 方块破坏 / 放置 ============
  function breakBlock() {
    var hit = raycastVoxel(REACH);
    if (!hit) return;
    removeBlock(hit.x, hit.y, hit.z);
  }

  function placeBlock() {
    var hit = raycastVoxel(REACH);
    if (!hit) return;
    var bx = hit.x + hit.normal[0];
    var by = hit.y + hit.normal[1];
    var bz = hit.z + hit.normal[2];
    // 不能放在玩家所在位置
    if (blockIntersectsPlayer(bx, by, bz)) return;
    addBlock(bx, by, bz, HOTBAR[selectedSlot]);
  }

  // ============ 键盘事件 ============
  function onKeyDown(e) {
    var k = e.key.toLowerCase();
    keys[k] = true;
    // 数字键 1-9 切换 hotbar
    if (e.key >= '1' && e.key <= '9') {
      selectedSlot = parseInt(e.key, 10) - 1;
      updateHotbarUI();
      updateBlockName();
    }
    // ESC 由 Pointer Lock 自动处理，这里不需要额外逻辑
  }

  function onKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
  }

  // ============ 鼠标事件 ============
  function onMouseMove(e) {
    if (!gameActive) return;
    var s = 0.0022;
    player.yaw -= e.movementX * s;
    player.pitch -= e.movementY * s;
    clampPitch();
  }

  function onMouseDown(e) {
    if (!gameActive) return;
    if (e.button === 0) breakBlock();
    else if (e.button === 2) placeBlock();
  }

  function onWheel(e) {
    if (!gameActive) return;
    e.preventDefault();
    var dir = e.deltaY > 0 ? 1 : -1;
    selectedSlot = (selectedSlot + dir + HOTBAR.length) % HOTBAR.length;
    updateHotbarUI();
    updateBlockName();
  }

  // ============ Pointer Lock / 覆盖层流程 ============
  function showOverlay(title, sub) {
    overlay.classList.remove('hidden');
    overlayTitle.textContent = title;
    overlaySub.textContent = sub;
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function onPointerLockChange() {
    var locked = document.pointerLockElement === container;
    if (locked) {
      gameActive = true;
      gameStarted = true;
      hideOverlay();
    } else {
      gameActive = false;
      if (gameStarted) {
        showOverlay('已暂停，点击继续', 'WASD 移动 · 鼠标视角 · 空格跳跃 · 左键破坏 · 右键放置 · 滚轮/数字键切换方块');
      }
    }
  }

  function startGame() {
    // 触摸设备不锁定鼠标，直接开始
    if (isTouch) {
      gameActive = true;
      gameStarted = true;
      hideOverlay();
      return;
    }
    if (document.pointerLockElement !== container) {
      container.requestPointerLock();
    }
  }

  function onOverlayClick() {
    startGame();
  }

  // ============ 触摸控制 ============
  function setupTouchButtons() {
    var btns = document.querySelectorAll('.play-touch-btn');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        var action = btn.getAttribute('data-action');
        btn.addEventListener('touchstart', function (e) {
          e.preventDefault();
          if (!gameActive) return;
          if (action === 'jump') joy.jump = true;
          else if (action === 'break') breakBlock();
          else if (action === 'place') placeBlock();
        }, { passive: false });
        if (action === 'jump') {
          btn.addEventListener('touchend', function (e) { e.preventDefault(); joy.jump = false; });
          btn.addEventListener('touchcancel', function () { joy.jump = false; });
        }
      })(btns[i]);
    }
  }

  // 虚拟摇杆
  function onJoyStart(e) {
    e.preventDefault();
    var t = e.changedTouches[0];
    joyTouchId = t.identifier;
    var rect = joyBase.getBoundingClientRect();
    joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    updateJoy(t);
  }

  function onJoyMove(e) {
    if (joyTouchId === null) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId) {
        updateJoy(e.changedTouches[i]);
        e.preventDefault();
      }
    }
  }

  function onJoyEnd(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId) {
        joyTouchId = null;
        joy.x = 0; joy.y = 0;
        joyKnob.style.transform = 'translate(-50%, -50%)';
      }
    }
  }

  function updateJoy(t) {
    var dx = t.clientX - joyCenter.x;
    var dy = t.clientY - joyCenter.y;
    var r = joyBase.clientWidth / 2;
    var d = Math.hypot(dx, dy);
    if (d > r) { dx = dx / d * r; dy = dy / d * r; }
    joy.x = dx / r;
    joy.y = -dy / r; // 屏幕向上 = 前进
    joyKnob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
  }

  // 触摸拖动转向
  function onLookStart(e) {
    if (!gameActive) return;
    var t = e.changedTouches[0];
    lookTouchId = t.identifier;
    lookLast = { x: t.clientX, y: t.clientY };
    e.preventDefault();
  }

  function onLookMove(e) {
    if (lookTouchId === null) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId) {
        var t = e.changedTouches[i];
        var dx = t.clientX - lookLast.x;
        var dy = t.clientY - lookLast.y;
        lookLast.x = t.clientX; lookLast.y = t.clientY;
        player.yaw -= dx * 0.005;
        player.pitch -= dy * 0.005;
        clampPitch();
        e.preventDefault();
      }
    }
  }

  function onLookEnd(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId) lookTouchId = null;
    }
  }

  // ============ 全屏 ============
  function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } else if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    }
  }

  // ============ 尺寸自适应 ============
  function onResize() {
    var w = container.clientWidth || window.innerWidth;
    var h = container.clientHeight || window.innerHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ============ 游戏循环 ============
  var lastTime = 0;
  function animate(now) {
    requestAnimationFrame(animate);
    now = now || performance.now();
    var dt = lastTime ? (now - lastTime) / 1000 : 0;
    lastTime = now;
    if (dt > 0.1) dt = 0.1; // 卡顿后限制步长，避免穿墙

    if (gameActive) updatePlayer(dt);

    // 射线高亮
    if (gameActive) {
      var hit = raycastVoxel(REACH);
      currentHit = hit;
      if (hit) {
        highlight.visible = true;
        highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      } else {
        highlight.visible = false;
      }
    } else {
      highlight.visible = false;
    }

    renderer.render(scene, camera);
  }

  // ============ 初始化 ============
  function init() {
    container = document.getElementById('playContainer');
    canvas = document.getElementById('gameCanvas');
    overlay = document.getElementById('playOverlay');
    overlayTitle = document.getElementById('playOverlayTitle');
    overlaySub = document.getElementById('playOverlaySub');
    hotbarEl = document.getElementById('playHotbar');
    blockNameEl = document.getElementById('playBlockName');
    fsBtn = document.getElementById('playFullscreenBtn');
    joyBase = document.getElementById('playJoystickBase');
    joyKnob = document.getElementById('playJoystickKnob');

    isTouch = 'ontouchstart' in window;
    if (isTouch) container.classList.add('touch');

    setupScene();
    generateWorld();
    buildMeshes();
    createHighlight();

    player.pos = new THREE.Vector3();
    player.vel = new THREE.Vector3();
    respawn();
    camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z);
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;

    renderHotbar();
    updateBlockName();
    onResize();

    // —— 事件绑定 ——
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    document.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    container.addEventListener('wheel', onWheel, { passive: false });

    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    fsBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', onResize);
    document.addEventListener('webkitfullscreenchange', onResize);
    window.addEventListener('resize', onResize);

    if (isTouch) {
      setupTouchButtons();
      joyBase.addEventListener('touchstart', onJoyStart, { passive: false });
      joyBase.addEventListener('touchmove', onJoyMove, { passive: false });
      joyBase.addEventListener('touchend', onJoyEnd);
      joyBase.addEventListener('touchcancel', onJoyEnd);
      canvas.addEventListener('touchstart', onLookStart, { passive: false });
      canvas.addEventListener('touchmove', onLookMove, { passive: false });
      canvas.addEventListener('touchend', onLookEnd);
      canvas.addEventListener('touchcancel', onLookEnd);
    }

    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
