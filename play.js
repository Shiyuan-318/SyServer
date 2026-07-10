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

  var BLOCK = {
    AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, LEAVES: 5, SAND: 6, COBBLE: 7, PLANKS: 8, GLASS: 9,
    SANDSTONE: 10, GRAVEL: 11, BRICK: 12, STONE_BRICK: 13, MOSSY_COBBLE: 14, DARK_PLANKS: 15,
    WOOL: 16, RED_WOOL: 17, BLUE_WOOL: 18, YELLOW_WOOL: 19,
    MELON: 20, PUMPKIN: 21, BOOKSHELF: 22, LAVA: 23, WATER: 24, OBSIDIAN: 25, SNOW: 26,
    CACTUS: 27, DIAMOND_BLOCK: 28, GOLD_BLOCK: 29, IRON_BLOCK: 30, COAL_BLOCK: 31
  };
  var BLOCK_NAME = {
    1: '草地', 2: '泥土', 3: '石头', 4: '木头', 5: '树叶', 6: '沙子', 7: '圆石', 8: '木板', 9: '玻璃',
    10: '砂岩', 11: '砾石', 12: '砖块', 13: '石砖', 14: '苔石', 15: '深色木板',
    16: '白色羊毛', 17: '红色羊毛', 18: '蓝色羊毛', 19: '黄色羊毛',
    20: '西瓜', 21: '南瓜', 22: '书架', 23: '熔岩', 24: '水', 25: '黑曜石', 26: '雪块',
    27: '仙人掌', 28: '钻石块', 29: '金块', 30: '铁块', 31: '煤块'
  };
  var HOTBAR = [BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.WOOD, BLOCK.LEAVES, BLOCK.SAND, BLOCK.COBBLE, BLOCK.PLANKS, BLOCK.GLASS];
  // 背包里展示的所有可用方块（31 种）
  var ALL_BLOCKS = [
    BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.COBBLE, BLOCK.MOSSY_COBBLE, BLOCK.SAND, BLOCK.SANDSTONE, BLOCK.GRAVEL, BLOCK.SNOW,
    BLOCK.WOOD, BLOCK.PLANKS, BLOCK.DARK_PLANKS, BLOCK.LEAVES, BLOCK.BOOKSHELF, BLOCK.BRICK, BLOCK.STONE_BRICK, BLOCK.OBSIDIAN, BLOCK.CACTUS,
    BLOCK.GLASS, BLOCK.WOOL, BLOCK.RED_WOOL, BLOCK.BLUE_WOOL, BLOCK.YELLOW_WOOL,
    BLOCK.MELON, BLOCK.PUMPKIN,
    BLOCK.COAL_BLOCK, BLOCK.IRON_BLOCK, BLOCK.GOLD_BLOCK, BLOCK.DIAMOND_BLOCK,
    BLOCK.WATER, BLOCK.LAVA
  ];

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
  var inventoryOpen = false;   // 背包是否打开（打开时游戏暂停）

  // 触摸追踪
  var joyTouchId = null, lookTouchId = null, joyCenter = null, lookLast = null;
  var touchActions = {};

  // ============ DOM 引用 ============
  var container, canvas, overlay, overlayTitle, overlaySub, hotbarEl, blockNameEl, fsBtn, joyBase, joyKnob;
  var inventoryEl, invGridEl, invHotbarEl;

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
      case BLOCK.SANDSTONE:
        if (face === 'top') {
          noiseFill(ctx, 226, 212, 158, 10);
        } else if (face === 'bottom') {
          noiseFill(ctx, 198, 178, 128, 10);
        } else {
          noiseFill(ctx, 218, 200, 150, 10);
          ctx.fillStyle = 'rgba(150,130,90,0.9)';
          ctx.fillRect(0, 0, 16, 3); ctx.fillRect(0, 13, 16, 3);
          ctx.fillStyle = 'rgba(180,160,110,0.8)';
          ctx.fillRect(0, 7, 16, 1); ctx.fillRect(0, 9, 16, 1);
        }
        break;
      case BLOCK.GRAVEL:
        noiseFill(ctx, 120, 110, 120, 14);
        for (var gvi = 0; gvi < 42; gvi++) {
          var gvsh = (Math.random() - 0.5) * 30;
          px(ctx, (Math.random() * 16) | 0, (Math.random() * 16) | 0, 90 + gvsh, 82 + gvsh, 95 + gvsh);
        }
        for (var gvj = 0; gvj < 22; gvj++) {
          px(ctx, (Math.random() * 16) | 0, (Math.random() * 16) | 0, 150, 142, 155);
        }
        break;
      case BLOCK.BRICK:
        noiseFill(ctx, 150, 65, 50, 8);
        ctx.fillStyle = 'rgba(195,188,180,0.95)';
        for (var bky = 0; bky < 16; bky += 4) ctx.fillRect(0, bky, 16, 1);
        ctx.fillRect(8, 1, 1, 3);
        ctx.fillRect(4, 5, 1, 3); ctx.fillRect(12, 5, 1, 3);
        ctx.fillRect(8, 9, 1, 3);
        ctx.fillRect(4, 13, 1, 3); ctx.fillRect(12, 13, 1, 3);
        break;
      case BLOCK.STONE_BRICK:
        noiseFill(ctx, 122, 122, 122, 12);
        ctx.fillStyle = 'rgba(60,60,60,0.85)';
        ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 8, 16, 1); ctx.fillRect(0, 15, 16, 1);
        ctx.fillRect(0, 0, 1, 8); ctx.fillRect(8, 0, 1, 8); ctx.fillRect(15, 0, 1, 8);
        ctx.fillRect(4, 8, 1, 8); ctx.fillRect(12, 8, 1, 8); ctx.fillRect(0, 8, 1, 8); ctx.fillRect(15, 8, 1, 8);
        for (var sbi = 0; sbi < 9; sbi++) px(ctx, (Math.random() * 16) | 0, (Math.random() * 16) | 0, 88, 88, 88);
        break;
      case BLOCK.MOSSY_COBBLE:
        drawFace(BLOCK.COBBLE, face, ctx);
        for (var mci = 0; mci < 44; mci++) {
          var mcsh = (Math.random() - 0.5) * 20;
          px(ctx, (Math.random() * 16) | 0, (Math.random() * 16) | 0, 58 + mcsh, 100 + mcsh, 45 + mcsh);
        }
        break;
      case BLOCK.DARK_PLANKS:
        noiseFill(ctx, 90, 60, 35, 10);
        ctx.fillStyle = 'rgba(55,35,20,0.9)';
        for (var dpky = 0; dpky < 16; dpky += 5) ctx.fillRect(0, dpky, 16, 1);
        ctx.fillRect(0, 0, 1, 5); ctx.fillRect(8, 5, 1, 5); ctx.fillRect(4, 10, 1, 6);
        break;
      case BLOCK.WOOL:
        noiseFill(ctx, 235, 235, 235, 8);
        break;
      case BLOCK.RED_WOOL:
        noiseFill(ctx, 170, 45, 40, 10);
        break;
      case BLOCK.BLUE_WOOL:
        noiseFill(ctx, 50, 70, 170, 10);
        break;
      case BLOCK.YELLOW_WOOL:
        noiseFill(ctx, 220, 200, 60, 10);
        break;
      case BLOCK.MELON:
        if (face === 'top') {
          noiseFill(ctx, 240, 120, 130, 8);
          ctx.fillStyle = 'rgba(60,140,55,0.9)'; ctx.fillRect(6, 6, 4, 4);
          px(ctx, 7, 8, 40, 40, 30); px(ctx, 9, 8, 40, 40, 30);
          px(ctx, 8, 7, 40, 40, 30); px(ctx, 8, 9, 40, 40, 30);
        } else if (face === 'bottom') {
          noiseFill(ctx, 70, 150, 60, 10);
        } else {
          noiseFill(ctx, 75, 150, 60, 10);
          ctx.fillStyle = 'rgba(140,200,110,0.85)';
          for (var mly = 0; mly < 16; mly += 4) ctx.fillRect(0, mly, 16, 1);
          ctx.fillStyle = 'rgba(55,120,45,0.8)';
          for (var mlx = 0; mlx < 16; mlx += 8) ctx.fillRect(mlx, 0, 1, 16);
        }
        break;
      case BLOCK.PUMPKIN:
        if (face === 'top') {
          noiseFill(ctx, 200, 110, 30, 10);
          ctx.fillStyle = 'rgba(80,120,45,1)'; ctx.fillRect(7, 7, 3, 3);
        } else if (face === 'bottom') {
          noiseFill(ctx, 200, 110, 30, 10);
        } else {
          noiseFill(ctx, 210, 120, 35, 12);
          ctx.fillStyle = 'rgba(170,85,20,0.6)';
          ctx.fillRect(2, 0, 1, 16); ctx.fillRect(7, 0, 1, 16); ctx.fillRect(13, 0, 1, 16);
          ctx.fillStyle = 'rgba(40,25,10,1)';
          ctx.fillRect(4, 5, 2, 2); ctx.fillRect(5, 6, 1, 1);
          ctx.fillRect(10, 5, 2, 2); ctx.fillRect(10, 6, 1, 1);
          ctx.fillRect(4, 10, 8, 1);
          ctx.fillRect(4, 11, 1, 1); ctx.fillRect(6, 11, 1, 1); ctx.fillRect(9, 11, 1, 1); ctx.fillRect(11, 11, 1, 1);
        }
        break;
      case BLOCK.BOOKSHELF:
        if (face === 'top' || face === 'bottom') {
          drawFace(BLOCK.PLANKS, face, ctx);
        } else {
          drawFace(BLOCK.PLANKS, 'side', ctx);
          ctx.fillStyle = 'rgba(60,40,25,1)';
          ctx.fillRect(1, 4, 14, 4); ctx.fillRect(1, 9, 14, 4);
          var bkCols = [[170, 50, 50], [60, 90, 170], [180, 150, 50], [60, 140, 70], [150, 80, 160], [200, 100, 50]];
          for (var bkRow = 0; bkRow < 2; bkRow++) {
            var bkY = bkRow === 0 ? 4 : 9;
            var bkX = 1;
            while (bkX < 15) {
              var bkC = bkCols[(Math.random() * bkCols.length) | 0];
              var bkW = 1 + ((Math.random() * 2) | 0);
              for (var bkXX = 0; bkXX < bkW && bkX + bkXX < 15; bkXX++) {
                var bkN = (Math.random() - 0.5) * 20;
                px(ctx, bkX + bkXX, bkY, bkC[0] + bkN, bkC[1] + bkN, bkC[2] + bkN);
                px(ctx, bkX + bkXX, bkY + 1, bkC[0] + bkN, bkC[1] + bkN, bkC[2] + bkN);
                px(ctx, bkX + bkXX, bkY + 2, bkC[0] + bkN, bkC[1] + bkN, bkC[2] + bkN);
                px(ctx, bkX + bkXX, bkY + 3, bkC[0] + bkN, bkC[1] + bkN, bkC[2] + bkN);
              }
              bkX += bkW;
              if (bkX < 15) {
                px(ctx, bkX, bkY, 40, 28, 18); px(ctx, bkX, bkY + 1, 40, 28, 18);
                px(ctx, bkX, bkY + 2, 40, 28, 18); px(ctx, bkX, bkY + 3, 40, 28, 18);
                bkX++;
              }
            }
          }
        }
        break;
      case BLOCK.LAVA:
        noiseFill(ctx, 220, 90, 20, 18);
        ctx.fillStyle = 'rgba(255,200,60,0.9)';
        for (var lvy = 0; lvy < 16; lvy++) {
          if (Math.random() < 0.32) {
            var lvx = (Math.random() * 14) | 0;
            ctx.fillRect(lvx, lvy, 2 + ((Math.random() * 3) | 0), 1);
          }
        }
        for (var lhi = 0; lhi < 12; lhi++) px(ctx, (Math.random() * 16) | 0, (Math.random() * 16) | 0, 255, 240, 180);
        break;
      case BLOCK.WATER:
        noiseFill(ctx, 50, 90, 200, 14);
        ctx.fillStyle = 'rgba(120,170,240,0.5)';
        for (var wty = 0; wty < 16; wty += 3) ctx.fillRect(0, wty, 16, 1);
        break;
      case BLOCK.OBSIDIAN:
        noiseFill(ctx, 30, 25, 45, 10);
        for (var obi = 0; obi < 14; obi++) px(ctx, (Math.random() * 16) | 0, (Math.random() * 16) | 0, 90, 60, 130);
        for (var obj = 0; obj < 8; obj++) px(ctx, (Math.random() * 16) | 0, (Math.random() * 16) | 0, 55, 40, 80);
        break;
      case BLOCK.SNOW:
        noiseFill(ctx, 240, 245, 250, 6);
        break;
      case BLOCK.CACTUS:
        if (face === 'top') {
          noiseFill(ctx, 90, 150, 70, 10);
          ctx.fillStyle = 'rgba(60,110,50,0.9)'; ctx.fillRect(2, 2, 12, 12);
          ctx.strokeStyle = 'rgba(70,130,60,0.8)'; ctx.lineWidth = 1; ctx.strokeRect(2.5, 2.5, 11, 11);
        } else if (face === 'bottom') {
          noiseFill(ctx, 90, 150, 70, 10);
        } else {
          noiseFill(ctx, 80, 140, 60, 10);
          ctx.fillStyle = 'rgba(220,230,200,0.9)';
          for (var ccy = 1; ccy < 16; ccy += 3) {
            for (var ccx = 1; ccx < 16; ccx += 4) ctx.fillRect(ccx, ccy, 1, 1);
          }
          ctx.fillStyle = 'rgba(55,100,45,0.7)';
          ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);
        }
        break;
      case BLOCK.DIAMOND_BLOCK:
        noiseFill(ctx, 90, 220, 215, 12);
        ctx.fillStyle = 'rgba(180,245,240,0.85)';
        ctx.fillRect(3, 3, 3, 3); ctx.fillRect(10, 3, 3, 3); ctx.fillRect(3, 10, 3, 3); ctx.fillRect(10, 10, 3, 3);
        ctx.fillStyle = 'rgba(220,255,250,0.9)'; ctx.fillRect(7, 7, 2, 2);
        ctx.fillStyle = 'rgba(50,160,155,0.6)';
        ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1); ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);
        break;
      case BLOCK.GOLD_BLOCK:
        noiseFill(ctx, 230, 190, 70, 12);
        ctx.fillStyle = 'rgba(255,230,140,0.85)';
        ctx.fillRect(3, 3, 3, 3); ctx.fillRect(10, 3, 3, 3); ctx.fillRect(3, 10, 3, 3); ctx.fillRect(10, 10, 3, 3);
        ctx.fillStyle = 'rgba(255,245,180,0.9)'; ctx.fillRect(7, 7, 2, 2);
        ctx.fillStyle = 'rgba(170,130,30,0.6)';
        ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1); ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);
        break;
      case BLOCK.IRON_BLOCK:
        noiseFill(ctx, 220, 220, 225, 8);
        ctx.fillStyle = 'rgba(240,240,245,0.7)';
        ctx.fillRect(3, 3, 3, 3); ctx.fillRect(10, 10, 3, 3);
        ctx.fillStyle = 'rgba(160,160,170,0.6)';
        ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1); ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);
        break;
      case BLOCK.COAL_BLOCK:
        noiseFill(ctx, 30, 30, 32, 8);
        for (var cbi = 0; cbi < 14; cbi++) px(ctx, (Math.random() * 16) | 0, (Math.random() * 16) | 0, 60, 58, 62);
        for (var cbj = 0; cbj < 6; cbj++) px(ctx, (Math.random() * 16) | 0, (Math.random() * 16) | 0, 15, 15, 16);
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
      if (type === BLOCK.WATER) { mm.transparent = true; mm.opacity = 0.72; }
      // 自发光方块：熔岩强烈发光，钻石块/金块微微闪光
      if (type === BLOCK.LAVA) { mm.emissive = new THREE.Color(0xff5a10); mm.emissiveIntensity = 0.9; }
      if (type === BLOCK.DIAMOND_BLOCK) { mm.emissive = new THREE.Color(0x4ad8d0); mm.emissiveIntensity = 0.4; }
      if (type === BLOCK.GOLD_BLOCK) { mm.emissive = new THREE.Color(0x6a5a10); mm.emissiveIntensity = 0.32; }
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
    // 阴影：所有方块接收阴影；非透明方块投射阴影（玻璃/水不投射，避免怪异黑影）
    mesh.castShadow = !(type === BLOCK.GLASS || type === BLOCK.WATER);
    mesh.receiveShadow = true;
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
  // 生成竖向天空渐变纹理（天顶浅蓝 -> 地平线偏白）
  function makeSkyTexture() {
    var c = document.createElement('canvas');
    c.width = 2; c.height = 256;
    var ctx = c.getContext('2d');
    var grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#5aa8e6');    // 天顶
    grad.addColorStop(0.5, '#9fd2f5');   // 中部
    grad.addColorStop(1, '#dcefff');     // 地平线偏白
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 256);
    var tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  }

  function setupScene() {
    scene = new THREE.Scene();
    scene.background = makeSkyTexture();
    var fogColor = 0xcfe8ff;
    scene.fog = new THREE.Fog(fogColor, 20, 50);

    camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 200);
    camera.rotation.order = 'YXZ';

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    // 开启阴影映射
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 半球光：天空蓝 + 地面褐绿，柔和环境光，阴影区不死黑
    var hemi = new THREE.HemisphereLight(0xbfe3ff, 0x6b5a3a, 0.55);
    scene.add(hemi);
    // 弱环境光兜底
    scene.add(new THREE.AmbientLight(0xffffff, 0.22));

    // 太阳光（暖白，开启阴影）
    var sun = new THREE.DirectionalLight(0xfff5e0, 0.95);
    sun.position.set(30, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 160;
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    sun.shadow.bias = -0.0005;
    sun.target.position.set(12, 6, 12);
    scene.add(sun);
    scene.add(sun.target);
    // 填充光，让背光面不太黑
    var fill = new THREE.DirectionalLight(0xbfd8ff, 0.22);
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

  // ============ 背包系统 ============
  function openInventory() {
    if (inventoryOpen) return;
    inventoryOpen = true;
    renderInventory();
    inventoryEl.classList.add('open');
    // 打开背包时解锁鼠标、暂停游戏
    if (!isTouch && document.pointerLockElement === container) {
      document.exitPointerLock();
    }
    gameActive = false;
  }

  function closeInventory() {
    if (!inventoryOpen) return;
    inventoryOpen = false;
    inventoryEl.classList.remove('open');
    // 关闭背包后恢复游戏（重新锁定鼠标）
    if (!isTouch && gameStarted) {
      container.requestPointerLock();
    } else if (isTouch && gameStarted) {
      gameActive = true;
    }
  }

  function toggleInventory() {
    if (inventoryOpen) closeInventory();
    else openInventory();
  }

  function renderInventory() {
    // 上方网格：所有可用方块
    invGridEl.innerHTML = '';
    for (var i = 0; i < ALL_BLOCKS.length; i++) {
      var type = ALL_BLOCKS[i];
      var slot = document.createElement('div');
      slot.className = 'play-inv-slot';
      slot.style.backgroundImage = 'url(' + makeIconURL(type) + ')';
      slot.title = BLOCK_NAME[type] || '';
      (function (t) {
        slot.addEventListener('click', function (ev) {
          ev.stopPropagation();
          // 点击方块 -> 放入当前选中的快捷栏格（替换该格方块类型）
          HOTBAR[selectedSlot] = t;
          renderInventory();
          renderHotbar();
          updateBlockName();
        });
      })(type);
      invGridEl.appendChild(slot);
    }
    // 底部快捷栏预览：可点击选中某格
    invHotbarEl.innerHTML = '';
    for (var j = 0; j < HOTBAR.length; j++) {
      var hslot = document.createElement('div');
      hslot.className = 'play-inv-hotbar-slot';
      if (j === selectedSlot) hslot.classList.add('active');
      hslot.style.backgroundImage = 'url(' + makeIconURL(HOTBAR[j]) + ')';
      hslot.title = BLOCK_NAME[HOTBAR[j]] || '';
      (function (idx) {
        hslot.addEventListener('click', function (ev) {
          ev.stopPropagation();
          selectedSlot = idx;
          renderInventory();
          updateHotbarUI();
          updateBlockName();
        });
      })(j);
      invHotbarEl.appendChild(hslot);
    }
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
      if (inventoryOpen) renderInventory(); // 同步背包内快捷栏预览的选中态
    }
    // E 键打开/关闭背包（仅游戏开始后可用）
    if (k === 'e' && gameStarted) {
      e.preventDefault();
      toggleInventory();
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
      // 背包打开时不显示暂停遮罩（背包面板本身已遮罩）
      if (gameStarted && !inventoryOpen) {
        showOverlay('已暂停，点击继续', 'WASD 移动 · 鼠标视角 · 空格跳跃 · 左键破坏 · 右键放置 · 滚轮/数字键切换方块 · 按 E 打开背包');
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
    inventoryEl = document.getElementById('playInventory');
    invGridEl = document.getElementById('playInvGrid');
    invHotbarEl = document.getElementById('playInvHotbar');

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

    // 背包：点击遮罩空白处关闭（点面板内部不关闭）
    inventoryEl.addEventListener('click', function (e) {
      if (e.target === inventoryEl) closeInventory();
    });

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
