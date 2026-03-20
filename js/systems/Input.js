/**
 * 输入系统 - 处理鼠标/触摸输入，触发AI实体生成
 */
export class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.game = null;
        this.systems = null;

        this.dropX = null;       // 鼠标悬停 X
        this.dropY = null;       // 鼠标悬停 Y（用于悬停检测）
        this.spawnCooldown = 0;  // 防止连点刷屏
        this.minSpawnInterval = 400; // ms

        this._bindEvents();
    }

    _bindEvents() {
        // 绑定到 document 避免被 UI overlay 遮挡
        document.addEventListener('mousemove', (e) => this._onMouseMove(e));
        document.addEventListener('click',     (e) => this._onClick(e));
        document.addEventListener('touchstart',(e) => this._onTouch(e), { passive: false });
        document.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    }

    _getCanvasPos(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    _onMouseMove(e) {
        const pos = this._getCanvasPos(e.clientX, e.clientY);
        this.dropX = pos.x;
    }

    _onClick(e) {
        const pos = this._getCanvasPos(e.clientX, e.clientY);
        this._trySpawn(pos.x, pos.y);
    }

    _onTouch(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const pos = this._getCanvasPos(touch.clientX, touch.clientY);
        this.dropX = pos.x;
        this._trySpawn(pos.x, pos.y);
    }

    _onTouchMove(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const pos = this._getCanvasPos(touch.clientX, touch.clientY);
        this.dropX = pos.x;
    }

    _trySpawn(x, y) {
        const state = this.systems?.gameState;
        const evolution = this.systems?.aiEvolution;
        if (!state?.isPlaying() || !evolution) return;

        const now = Date.now();
        if (now - this.spawnCooldown < this.minSpawnInterval) return;
        this.spawnCooldown = now;

        // 从顶部掉落（y 固定为顶部附近，x 跟随点击位置）
        const spawnY = 30;
        evolution.spawnEntity(x, spawnY);
        this.systems?.audio?.playDropSound();
    }

    update(deltaTime) {
        // 未来可在此处理长按等
    }

    reset() {
        this.dropX = null;
        this.spawnCooldown = 0;
    }
}