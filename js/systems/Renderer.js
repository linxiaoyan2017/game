/**
 * 渲染系统 - 赛博朋克风格的Canvas 2D渲染
 */
export class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.game = null;
        this.systems = null;

        this.particles = [];
        this.currentEnvironment = 1;
        this.qualityLevel = 'high';

        // 环境过渡动画状态
        this._envTransition = { active: false, alpha: 0, startTime: 0, duration: 600 };
        // 悬停脉冲动画状态（每个实体单独记录）
        this._hoverPulses = new Map();

        // 背景渐变色（随环境变化）
        this.bgColors = [
            ['#0a0a1a', '#0d1b2a'],   // 1: 电路板 - 深蓝黑
            ['#0a0a0a', '#1a0a1a'],   // 2: 服务器 - 近黑紫
            ['#0d1b0d', '#001a0d'],   // 3: 城市   - 深绿黑
            ['#0a0014', '#14001e'],   // 4: 太空   - 深紫
            ['#000510', '#001428'],   // 5: 数字宇宙- 宇宙蓝
        ];

        // 不在构造函数里调用 setupCanvas()，避免二次缩放
        // 由 main.js 在 DOM 布局完成后显式调用
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;

        // 计算可用尺寸：桌面最大 500×700，移动端填满屏幕
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const isMobile = screenW <= 768;

        let logicalW, logicalH;
        if (isMobile) {
            // 移动端：全屏，留出顶部信息栏和底部按钮的空间
            logicalW = screenW;
            logicalH = screenH;
        } else {
            // 桌面端：限制最大尺寸，保持比例
            const maxW = Math.min(screenW * 0.65, 520);
            const maxH = Math.min(screenH * 0.92, 750);
            logicalW = maxW;
            logicalH = maxH;
        }

        logicalW = Math.floor(logicalW);
        logicalH = Math.floor(logicalH);

        if (logicalW === 0 || logicalH === 0) return;

        // 先把 CSS display 尺寸锁死，防止后续 canvas.width 变化撑大画布
        this.logicalWidth  = logicalW;
        this.logicalHeight = logicalH;
        this.canvas.style.width  = logicalW + 'px';
        this.canvas.style.height = logicalH + 'px';

        // 设置高 DPI 缓冲区
        this.canvas.width  = Math.round(logicalW * dpr);
        this.canvas.height = Math.round(logicalH * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 用 setTransform 而非 scale，避免叠加

        // 同步物理边界
        if (this.systems?.physics) {
            this.systems.physics.setBounds(0, this.logicalWidth, 0, this.logicalHeight);
        }

        console.log(`✅ Canvas 初始化: ${this.logicalWidth}×${this.logicalHeight} (dpr=${dpr})`);
    }

    async loadSprites() {
        // Emoji渲染不需要图片资源
        console.log('✅ 使用Emoji精灵，无需加载');
    }

    // ─────────────────────────────────────────
    // 主渲染循环
    // ─────────────────────────────────────────
    update(deltaTime) {
        this.clear();
        this.renderBackground();
        this.renderEntities();
        this.updateAndRenderParticles(deltaTime);
        this.renderDropIndicator();
        this.renderHUD();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.logicalWidth || this.canvas.width, this.logicalHeight || this.canvas.height);
    }

    // ─────────────────────────────────────────
    // 背景：5阶段赛博朋克场景（含过渡闪光层）
    // ─────────────────────────────────────────
    renderBackground() {
        const ctx = this.ctx;
        const w = this.logicalWidth || 400;
        const h = this.logicalHeight || 600;
        const env = Math.min(this.currentEnvironment, 5);
        const t = Date.now() / 1000;

        switch (env) {
            case 1: this._drawCircuitBoard(ctx, w, h, t); break;
            case 2: this._drawServerRoom(ctx, w, h, t);   break;
            case 3: this._drawCitySkyline(ctx, w, h, t);  break;
            case 4: this._drawSpaceCenter(ctx, w, h, t);  break;
            case 5: this._drawDigitalUniverse(ctx, w, h, t); break;
            default: this._drawCircuitBoard(ctx, w, h, t);
        }

        // ── 环境过渡：闪白 + 径向扩散遮罩 ──
        const tr = this._envTransition;
        if (tr.active) {
            const elapsed = Date.now() - tr.startTime;
            const progress = Math.min(elapsed / tr.duration, 1);
            // 先升（0→1），再降（1→0）
            const alpha = progress < 0.3
                ? progress / 0.3
                : 1 - (progress - 0.3) / 0.7;

            // 闪白层
            ctx.save();
            ctx.globalAlpha = alpha * 0.55;
            ctx.fillStyle = tr.color || '#ffffff';
            ctx.fillRect(0, 0, w, h);

            // 径向扩散圆
            const maxR = Math.sqrt(w * w + h * h);
            const circleR = progress * maxR * 1.4;
            const radGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, circleR);
            radGrad.addColorStop(0, 'transparent');
            radGrad.addColorStop(0.7, 'transparent');
            radGrad.addColorStop(1, (tr.color || '#ffffff') + '88');
            ctx.globalAlpha = (1 - progress) * 0.6;
            ctx.fillStyle = radGrad;
            ctx.beginPath();
            ctx.arc(w/2, h/2, circleR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            if (progress >= 1) tr.active = false;
        }
    }

    // 环境1：电路板（绿色数据流）
    _drawCircuitBoard(ctx, w, h, t) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#040d04');
        grad.addColorStop(1, '#0a1a0a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 流动的绿色格栅
        ctx.strokeStyle = 'rgba(0,255,70,0.06)';
        ctx.lineWidth = 0.5;
        const step = 30;
        for (let x = 0; x < w; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // 流动数据点（模拟电流）
        if (this.qualityLevel !== 'low') {
            ctx.fillStyle = 'rgba(0,255,70,0.6)';
            for (let i = 0; i < 8; i++) {
                const x = ((i * 137 + t * 40) % w);
                const y = ((i * 93  + t * 60) % h);
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // 环境2：服务器机房（蓝色扫描线）
    _drawServerRoom(ctx, w, h, t) {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#010814');
        grad.addColorStop(1, '#05122a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 蓝色扫描线
        const scanY = (t * 80) % h;
        const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
        scanGrad.addColorStop(0, 'transparent');
        scanGrad.addColorStop(0.5, 'rgba(0,128,255,0.12)');
        scanGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, scanY - 20, w, 40);

        // 服务器机架轮廓
        if (this.qualityLevel !== 'low') {
            ctx.strokeStyle = 'rgba(0,100,255,0.07)';
            ctx.lineWidth = 1;
            for (let x = 0; x < w; x += 80) {
                ctx.strokeRect(x + 5, 0, 70, h);
            }
        }
    }

    // 环境3：城市天际线（霓虹粉紫）
    _drawCitySkyline(ctx, w, h, t) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#0a0014');
        grad.addColorStop(0.6, '#1a0028');
        grad.addColorStop(1, '#0d0020');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 楼宇轮廓
        ctx.fillStyle = 'rgba(20,0,40,0.9)';
        const buildings = [
            [0, 0.55, 0.12, 0.45], [0.1, 0.4, 0.08, 0.6], [0.16, 0.5, 0.1, 0.5],
            [0.25, 0.35, 0.07, 0.65],[0.3, 0.45, 0.12, 0.55],[0.42, 0.3, 0.09, 0.7],
            [0.5, 0.42, 0.11, 0.58],[0.6, 0.38, 0.08, 0.62],[0.67, 0.48, 0.13, 0.52],
            [0.78, 0.33, 0.1, 0.67],[0.86, 0.44, 0.14, 0.56],
        ];
        buildings.forEach(([rx, ry, rw, rh]) => {
            ctx.fillRect(rx * w, ry * h, rw * w, rh * h);
        });

        // 霓虹灯闪烁
        if (this.qualityLevel !== 'low') {
            const flicker = 0.6 + 0.4 * Math.sin(t * 3.7);
            ctx.strokeStyle = `rgba(255,0,110,${0.15 * flicker})`;
            ctx.lineWidth = 1;
            buildings.forEach(([rx, ry, rw]) => {
                ctx.beginPath();
                ctx.moveTo(rx * w, ry * h);
                ctx.lineTo((rx + rw) * w, ry * h);
                ctx.stroke();
            });
        }
    }

    // 环境4：太空数据中心（金色节点网络）
    _drawSpaceCenter(ctx, w, h, t) {
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h));
        grad.addColorStop(0, '#0d0a1f');
        grad.addColorStop(1, '#030209');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 星点
        if (this.qualityLevel !== 'low') {
            ctx.fillStyle = 'rgba(255,220,100,0.7)';
            for (let i = 0; i < 30; i++) {
                const sx = (i * 237) % w;
                const sy = (i * 173) % h;
                const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.3 + i));
                ctx.globalAlpha = twinkle * 0.5;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // 节点连线
        ctx.strokeStyle = 'rgba(255,180,0,0.06)';
        ctx.lineWidth = 0.5;
        const nodes = [[0.2,0.2],[0.8,0.15],[0.5,0.5],[0.15,0.7],[0.85,0.75],[0.5,0.85]];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i+1; j < nodes.length; j++) {
                ctx.beginPath();
                ctx.moveTo(nodes[i][0]*w, nodes[i][1]*h);
                ctx.lineTo(nodes[j][0]*w, nodes[j][1]*h);
                ctx.stroke();
            }
        }
    }

    // 环境5：数字宇宙（白光网络，最终形态）
    _drawDigitalUniverse(ctx, w, h, t) {
        const grad = ctx.createRadialGradient(w/2, h/3, 0, w/2, h/2, Math.max(w,h));
        grad.addColorStop(0, '#0a0520');
        grad.addColorStop(0.5, '#030214');
        grad.addColorStop(1, '#000008');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 脉冲光环（从中心扩散）
        if (this.qualityLevel !== 'low') {
            const pulseR = ((t * 60) % Math.max(w, h));
            const alpha = Math.max(0, 1 - pulseR / Math.max(w, h));
            ctx.strokeStyle = `rgba(200,180,255,${alpha * 0.15})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(w/2, h/2, pulseR, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 白色星粒
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let i = 0; i < 50; i++) {
            const sx = (i * 311 + Math.sin(t * 0.1 + i) * 5) % w;
            const sy = (i * 197 + Math.cos(t * 0.1 + i) * 5) % h;
            const twinkle = 0.2 + 0.8 * Math.abs(Math.sin(t * 2 + i * 0.7));
            ctx.globalAlpha = twinkle * 0.6;
            ctx.beginPath();
            ctx.arc(sx, sy, 1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 能量格栅（白色超细线）
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        const step = 50;
        for (let x = 0; x < w; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
    }

    // ─────────────────────────────────────────
    // 实体渲染
    // ─────────────────────────────────────────
    renderEntities() {
        const state = this.systems?.gameState;
        if (!state) return;

        for (const entity of state.activeEntities) {
            this.renderEntity(entity);
        }
    }

    renderEntity(entity) {
        const ctx = this.ctx;
        const { x, y, radius = 20, color = '#00ff88', emoji = '⚡', displayName } = entity;

        // ── 合并诞生动画（scale pop）──
        const now = Date.now();
        if (!entity.birthTime) entity.birthTime = now;
        const age = now - entity.birthTime;
        const popDuration = 350; // ms
        let scale = 1;
        if (age < popDuration) {
            const t = age / popDuration;
            // 弹性缩放：超出后回弹
            scale = t < 0.6
                ? 1 + 0.35 * Math.sin(t / 0.6 * Math.PI)
                : 1 + 0.35 * Math.sin(Math.PI) * (1 - (t - 0.6) / 0.4);
        }

        // ── 悬停高亮检测 ──
        const input = this.systems?.input;
        const hoverR = radius * 1.5;
        const isHovered = input?.dropX !== null &&
            Math.abs((input?.dropX ?? -999) - x) < hoverR &&
            Math.abs((input?.dropY ?? -999) - y) < hoverR;

        const r = radius * scale;
        const glowBoost = isHovered ? 2 : 1;

        ctx.save();
        ctx.translate(x, y);

        // 发光外圈
        if (this.qualityLevel !== 'low') {
            const glow = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.8 * glowBoost);
            glow.addColorStop(0, color + '66');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.8 * glowBoost, 0, Math.PI * 2);
            ctx.fill();
        }

        // 主圆体
        const bodyGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        bodyGrad.addColorStop(0, color + 'cc');
        bodyGrad.addColorStop(1, color + '44');
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = isHovered ? '#ffffff' : color;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = isHovered ? 20 : 10;

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Emoji
        ctx.font = `${r * 0.9}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 0);

        // 名称标签
        if (radius >= 30) {
            ctx.font = `bold ${Math.max(9, radius * 0.22)}px 'Courier New', monospace`;
            ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255,255,255,0.85)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(displayName || '', 0, r + 3);
        }

        ctx.restore();
    }

    // ─────────────────────────────────────────
    // 放置预览指示器
    // ─────────────────────────────────────────
    renderDropIndicator() {
        const input = this.systems?.input;
        const state = this.systems?.gameState;
        if (!input || !state?.isPlaying()) return;

        const { dropX } = input;
        if (dropX === undefined || dropX === null) return;

        const ctx = this.ctx;
        const h = this.logicalHeight || 600;

        ctx.save();
        ctx.strokeStyle = 'rgba(0,255,136,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(dropX, 0);
        ctx.lineTo(dropX, h);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // ─────────────────────────────────────────
    // 合并粒子效果
    // ─────────────────────────────────────────
    spawnMergeParticles(x, y, color = '#00ff88') {
        if (this.qualityLevel === 'low') return;
        const count = this.qualityLevel === 'high' ? 20 : 10;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
            const speed = 60 + Math.random() * 120;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                radius: 3 + Math.random() * 4,
                color
            });
        }
    }

    updateAndRenderParticles(deltaTime) {
        const dt = deltaTime / 1000;
        const ctx = this.ctx;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt; // 粒子也有重力
            p.life -= p.decay;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ─────────────────────────────────────────
    // HUD（分数/进化阶段）
    // ─────────────────────────────────────────
    renderHUD() {
        const state = this.systems?.gameState;
        if (!state?.isPlaying()) return;

        const ctx = this.ctx;
        const w = this.logicalWidth || 400;

        ctx.save();
        ctx.font = 'bold 13px "Courier New", monospace';
        ctx.fillStyle = 'rgba(0,255,136,0.8)';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${state.score}`, 12, 20);
        ctx.textAlign = 'right';
        ctx.fillText(`MAX: ${this.getMaxStageName(state.currentMaxEvolutionStage)}`, w - 12, 20);
        ctx.restore();
    }

    getMaxStageName(stage) {
        const evolution = this.systems?.aiEvolution;
        if (!evolution) return `LV${stage}`;
        const data = evolution.getStageData(stage);
        return data ? data.displayName : `LV${stage}`;
    }

    // ─────────────────────────────────────────
    // 环境变化
    // ─────────────────────────────────────────
    setEnvironment(env) {
        // 每个环境对应的过渡闪光色
        const envColors = ['#00ff46','#0080ff','#ff00ae','#ffcc00','#ffffff'];
        const color = envColors[(env - 1) % envColors.length];

        // 触发过渡动画
        this._envTransition = {
            active: true,
            startTime: Date.now(),
            duration: 700,
            color
        };

        this.currentEnvironment = env;

        this.currentEnvironment = env;

        // 更新 body data-env 属性，触发 CSS3 动画切换
        document.body.setAttribute('data-env', String(env));

        // 更新 canvas 边框颜色（CSS 变量注入）
        if (this.canvas) {
            this.canvas.style.borderColor = color;
            this.canvas.style.boxShadow = `0 0 30px ${color}, 0 0 60px ${color}44, inset 0 0 20px ${color}22`;
        }
    }

    setQualityLevel(level) {
        this.qualityLevel = level;
    }

    reset() {
        this.particles = [];
        this.currentEnvironment = 1;
    }
}