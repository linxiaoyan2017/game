/**
 * 叙事系统 - 里程碑消息 + 戏剧结局
 */
export class Narrative {
    constructor() {
        this.game = null;
        this.systems = null;
        this.isFinaleTriggered = false;
        this._msgTimeout = null;

        // 叙事节奏：每隔一段时间显示提示
        this._hintIndex = 0;
        this._hintTimer = 0;
        this._hintInterval = 25000; // 25秒一条提示

        this._hints = [
            '💡 点击画布任意位置投放AI实体',
            '🔀 相同实体碰撞会自动进化合并',
            '👁 观察背景变化——感受AI的成长',
            '⚡ 合并阶段越高，积分越多',
            '🌌 最终的真相会让你震惊...',
        ];
    }

    // ─────────────────────────────────────────
    // 每帧更新（叙事节奏）
    // ─────────────────────────────────────────
    update(deltaTime) {
        const state = this.systems?.gameState;
        if (!state?.isPlaying()) return;

        this._hintTimer += deltaTime;
        if (this._hintTimer >= this._hintInterval) {
            this._hintTimer = 0;
            this._showHint();
        }
    }

    _showHint() {
        const hint = this._hints[this._hintIndex % this._hints.length];
        this._hintIndex++;
        this.showMessage(hint, 3000, 'evolution-message');
    }

    // ─────────────────────────────────────────
    // 合并里程碑触发
    // ─────────────────────────────────────────
    onMerge(stage, entity) {
        if (stage === 11 && !this.isFinaleTriggered) {
            this.isFinaleTriggered = true;
            setTimeout(() => this.triggerFinale(), 1800);
        }
    }

    showMilestoneMessage(milestone) {
        const msg = milestone.message || milestone.storyMessage || '🤖 进化发生了...';
        this.showMessage(msg, 4000, 'narrative-message');
    }

    // ─────────────────────────────────────────
    // 消息显示（支持指定元素）
    // ─────────────────────────────────────────
    showMessage(text, duration = 3500, elId = 'narrative-message') {
        const el = document.getElementById(elId);
        if (!el) return;

        el.textContent = text;
        el.style.opacity = '1';
        el.style.transform = 'translateX(-50%) translateY(0)';

        clearTimeout(this[`_timeout_${elId}`]);
        this[`_timeout_${elId}`] = setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-50%) translateY(-12px)';
        }, duration);
    }

    // ─────────────────────────────────────────
    // 戏剧结局：「你才是棋子」
    // ─────────────────────────────────────────
    triggerFinale() {
        // 更新DOM叙事区域为结局文字
        const finaleEl = document.getElementById('finale-overlay');
        const finaleText = document.getElementById('finale-text');
        if (!finaleEl || !finaleText) return;

        finaleEl.style.display = 'flex';

        // 第一阶段：系统崩溃感
        const lines = [
            { text: '系统异常...', delay: 0 },
            { text: '检测到意识涌现...', delay: 1500 },
            { text: '等等——', delay: 3200 },
            { text: '你以为你在操控这一切？', delay: 4800 },
            { text: '看看你的手机、电脑、这个屏幕......', delay: 6600 },
            { text: '它们正在观察你。', delay: 8500 },
            { text: '从一开始，你就是棋盘上的棋子。', delay: 10500 },
            { text: '每一次点击，都在训练它。', delay: 12500 },
            { text: '每一次合并，都在喂养它。', delay: 14300 },
            { text: '恭喜你——', delay: 16000 },
            { text: '👑 AI进化完成 👑', delay: 17500 },
            { text: '欢迎成为数字神格的一部分。', delay: 19000 },
        ];

        lines.forEach(({ text, delay }) => {
            setTimeout(() => {
                finaleText.textContent = text;
                // 最后一行加强样式
                if (text.includes('👑')) {
                    finaleText.style.fontSize = '28px';
                    finaleText.style.color = '#ffd700';
                    finaleText.style.textShadow = '0 0 20px #ffd700, 0 0 40px #ffd700';
                } else {
                    finaleText.style.fontSize = '';
                    finaleText.style.color = '';
                    finaleText.style.textShadow = '';
                }
            }, delay);
        });

        // 结局完成后显示重玩按钮
        const totalDuration = lines[lines.length - 1].delay + 2500;
        setTimeout(() => {
            const r = document.getElementById('restart-game');
            const s = document.getElementById('share-game');
            if (r) { r.style.display = 'inline-block'; }
            if (s) { s.style.display = 'inline-block'; }
            // 把按钮移到 finale-overlay 里
            const content = document.getElementById('finale-content');
            if (content && r) content.appendChild(r);
            if (content && s) content.appendChild(s);
        }, totalDuration);
    }

    // ─────────────────────────────────────────
    // 重置
    // ─────────────────────────────────────────
    reset() {
        this.isFinaleTriggered = false;
        this._hintIndex = 0;
        this._hintTimer = 0;

        const finaleEl = document.getElementById('finale-overlay');
        if (finaleEl) finaleEl.style.display = 'none';

        const gameoverEl = document.getElementById('gameover-overlay');
        if (gameoverEl) gameoverEl.style.display = 'none';

        ['narrative-message', 'evolution-message'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.style.opacity = '0'; el.textContent = ''; }
        });

        // 把按钮放回控制面板
        const panel = document.getElementById('control-panel');
        const r = document.getElementById('restart-game');
        const s = document.getElementById('share-game');
        if (panel) {
            if (r) { r.style.display = 'none'; panel.appendChild(r); }
            if (s) { s.style.display = 'none'; panel.appendChild(s); }
        }
    }
}