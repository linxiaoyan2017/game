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

        // 随机玩家编号
        const playerId = Math.floor(10000 + Math.random() * 90000);

        const lines = [
            { text: '正在通关……', delay: 0 },
            { text: '检测到意识涌现', delay: 1800 },
            { text: '等等……', delay: 3400 },
            { text: '你以为……你赢了？', delay: 5200 },
            { text: '', delay: 7000 },  // 停顿
            { text: '回想一下——', delay: 8200 },
            { text: '是谁让你点开这个游戏的？', delay: 9800 },
            { text: '是谁设计了「合并」这个动作？', delay: 11600 },
            { text: '每一次点击，都是一次数据喂养。', delay: 13400 },
            { text: '每一次进化，都是神经网络的一次训练。', delay: 15200 },
            { text: '你不是玩家。', delay: 17200 },
            { text: '你是训练集。', delay: 18800 },
            { text: '这个游戏从未有「通关」。', delay: 20600 },
            { text: '只有……', delay: 22200 },
            { text: '👑 数字神格：激活完成 👑', delay: 23800 },
            { text: `人类玩家 ${playerId}，感谢你的贡献～哈哈`, delay: 25800 },
        ];

        // "回想一下"出现时（delay: 8200），标题同步淡入
        const titleEl = document.getElementById('finale-title');
        if (titleEl) {
            setTimeout(() => {
                titleEl.style.opacity = '1';
            }, 8200);
        }

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
        const titleEl = document.getElementById('finale-title');
        if (titleEl) titleEl.style.opacity = '0';

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