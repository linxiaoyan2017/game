/**
 * AI进化游戏 - 主入口文件
 */

import { GameEngine }  from './systems/GameEngine.js';
import { GameState }   from './systems/GameState.js';
import { Renderer }    from './systems/Renderer.js';
import { Physics }     from './systems/Physics.js';
import { Audio }       from './systems/Audio.js';
import { Input }       from './systems/Input.js';
import { AIEvolution } from './systems/AIEvolution.js';
import { Narrative }   from './systems/Narrative.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx    = this.canvas.getContext('2d');
        this.systems = {};
        this.isRunning = false;
        this.init();
    }

    async init() {
        try {
            this.showLoadingScreen();

            // 1. 创建所有系统实例
            this.systems.gameState   = new GameState();
            this.systems.renderer    = new Renderer(this.canvas, this.ctx);
            this.systems.physics     = new Physics();
            this.systems.audio       = new Audio();
            this.systems.input       = new Input(this.canvas);
            this.systems.aiEvolution = new AIEvolution();
            this.systems.narrative   = new Narrative();
            this.systems.gameEngine  = new GameEngine(this);

            // 2. 让所有系统互相能访问
            Object.values(this.systems).forEach(sys => {
                sys.game    = this;
                sys.systems = this.systems;
            });

            // 3. 等 DOM 完成布局后再初始化 Canvas 尺寸（关键！）
            await new Promise(resolve => requestAnimationFrame(resolve));
            this.systems.renderer.setupCanvas();

            // 4. 根据 canvas 尺寸设置物理边界
            const w = this.systems.renderer.logicalWidth  || 400;
            const h = this.systems.renderer.logicalHeight || 600;
            this.systems.physics.setBounds(0, w, 0, h);

            // 5. 加载资源
            await this.systems.aiEvolution.loadEvolutionData();
            await this.systems.renderer.loadSprites();
            await this.systems.audio.loadSounds();

            this.hideLoadingScreen();
            this.setupEventListeners();
            console.log('✅ AI进化游戏初始化完成');

        } catch (error) {
            console.error('游戏初始化失败:', error);
            this.showError('游戏加载失败，请刷新页面重试');
        }
    }

    setupEventListeners() {
        const startBtn   = document.getElementById('start-game');
        const restartBtn = document.getElementById('restart-game');
        const shareBtn   = document.getElementById('share-game');

        if (startBtn)   startBtn.addEventListener('click',   () => this.startGame());
        if (restartBtn) restartBtn.addEventListener('click', () => this.restartGame());
        if (shareBtn)   shareBtn.addEventListener('click',   () => this.shareGame());

        // 音量开关
        const volumeBtn = document.getElementById('volume-btn');
        let muted = false;
        if (volumeBtn) {
            volumeBtn.addEventListener('click', () => {
                muted = !muted;
                volumeBtn.textContent = muted ? '🔇' : '🔊';
                this.systems.audio.setMasterVolume(muted ? 0 : 0.4);
                const bgEl = document.getElementById('bg-music');
                if (bgEl) bgEl.muted = muted;
            });
        }

        // 窗口 resize 时重新对齐 UI
        window.addEventListener('resize', () => {
            this.systems.renderer.setupCanvas();
        });

        // 监听环境变化事件，同步给渲染器 + 触发环境音效
        this.systems.gameState.addEventListener('environmentChanged', (env) => {
            this.systems.renderer.setEnvironment(env);
            this.systems.audio.playEnvironmentStinger(env);
        });

        // 监听叙事里程碑
        this.systems.gameState.addEventListener('storyMilestone', (milestone) => {
            this.systems.narrative?.showMilestoneMessage(milestone);
        });

        // 监听游戏结束事件，显示失败遮罩 + 战绩统计
        this.systems.gameState.addEventListener('gameEnded', () => {
            const stats = this.systems.gameState.getGameStats();
            const overlay = document.getElementById('gameover-overlay');
            const statsEl = document.getElementById('gameover-stats');
            if (statsEl) {
                statsEl.innerHTML =
                    `⏱ 坚持时间：${stats.playTime}<br>` +
                    `🧬 最高进化：阶段 ${stats.maxEvolution}<br>` +
                    `💥 合并次数：${stats.totalMerges}<br>` +
                    `🏆 得分：${stats.score}`;
            }
            if (overlay) overlay.style.display = 'flex';

            // 显示重启/分享按钮，并移入失败遮罩内
            const r = document.getElementById('restart-game');
            const s = document.getElementById('share-game');
            const content = document.getElementById('gameover-content');
            if (r) { r.style.display = 'inline-block'; content?.appendChild(r); }
            if (s) { s.style.display = 'inline-block'; content?.appendChild(s); }
        });

        // 监听 finaleTriggered 事件，调用 Narrative 显示结局
        this.systems.gameState.addEventListener('finaleTriggered', () => {
            this.systems.narrative?.triggerFinale();
        });

        // 监听合并事件，实时更新顶部阶段文案
        this.systems.gameState.addEventListener('entitiesMerged', ({ newEntity }) => {
            this._updateStageDisplay(newEntity?.stage);
        });

        // ── 🛠️ 调试快捷键（仅 localhost，线上自动失效）──
        const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
        if (isLocal) {
            document.addEventListener('keydown', (e) => {
                // Shift + E → 直接触发结局（finale）
                if (e.shiftKey && e.key === 'E') {
                    console.log('🛠️ [DEBUG] 强制触发结局');
                    if (!this.isRunning) this.startGame();
                    setTimeout(() => {
                        this.systems.gameState.triggerFinale();   // 改状态
                        this.systems.narrative.triggerFinale();   // 直接显示UI
                    }, 100);
                }
                // Shift + G → 游戏结束（普通结束 + 显示按钮）
                if (e.shiftKey && e.key === 'G') {
                    console.log('🛠️ [DEBUG] 强制触发 Game Over');
                    if (!this.isRunning) this.startGame();
                    setTimeout(() => {
                        this.systems.gameState.endGame();
                        const r = document.getElementById('restart-game');
                        const s = document.getElementById('share-game');
                        if (r) r.style.display = 'inline-block';
                        if (s) s.style.display = 'inline-block';
                    }, 100);
                }
            });
            console.log('🛠️ [DEBUG模式] 快捷键已激活：Shift+E=结局 / Shift+G=游戏结束');
        }
    }

    startGame() {
        if (this.isRunning) return;
        this.isRunning = true;

        // 重置所有系统状态
        Object.values(this.systems).forEach(sys => sys.reset?.());

        // 重置后重新设置边界（reset 会清掉物理实体但不改边界）
        const w = this.systems.renderer.logicalWidth  || 400;
        const h = this.systems.renderer.logicalHeight || 600;
        this.systems.physics.setBounds(0, w, 0, h);

        this.hideStartScreen();
        document.body.setAttribute('data-env', '1'); // 隐藏首页标题
        this.systems.gameState.startGame();
        this.systems.audio.startBackgroundMusic();
        this.systems.gameEngine.startGameLoop();
        this._startCountdown(300); // 5分钟倒计时
        console.log('🚀 游戏开始！');
    }

    restartGame() {
        this.isRunning = false;
        this.systems.gameEngine.stopGameLoop();

        // 重置所有系统（含 Narrative：隐藏结局遮罩、把按钮移回 control-panel）
        Object.values(this.systems).forEach(sys => sys.reset?.());

        // 隐藏重启/分享按钮
        this.hideEndScreen();

        // 重置顶部文案和进度条
        const el = document.getElementById('current-stage');
        if (el) el.textContent = '📡 初始化中 · 🔸 数据比特';
        const fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = '0%';

        // 移除 data-env，让首页标题重新显示
        document.body.removeAttribute('data-env');

        // 回到首页，等用户点"开始进化"
        this.showStartScreen();
        console.log('🔄 返回首页');
    }

    shareGame() {
        const stats  = this.systems.gameState?.getGameStats?.() || {};
        const maxEvo = stats.maxEvolution ?? '?';
        const score  = stats.score ?? 0;
        const url    = location.href;
        const desc   = `🤖 我完成了第 ${maxEvo} 阶进化，得分 ${score}！\n从数字比特到宇宙主宰，快来挑战！`;

        // 填充弹窗内容
        const descEl = document.getElementById('share-modal-desc');
        const linkEl = document.getElementById('share-link-text');
        if (descEl) descEl.textContent = desc;
        if (linkEl) linkEl.textContent = url;

        // 显示弹窗
        const overlay = document.getElementById('share-overlay');
        if (overlay) overlay.style.display = 'flex';

        // 复制按钮
        const copyBtn  = document.getElementById('share-copy-btn');
        const closeBtn = document.getElementById('share-close-btn');

        if (copyBtn) {
            // 移除旧监听避免重复绑定
            const newCopyBtn = copyBtn.cloneNode(true);
            copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);
            newCopyBtn.addEventListener('click', () => {
                navigator.clipboard?.writeText(url).then(() => {
                    newCopyBtn.textContent = '✅ 已复制！';
                    newCopyBtn.classList.add('copied');
                    setTimeout(() => {
                        newCopyBtn.textContent = '📋 复制链接';
                        newCopyBtn.classList.remove('copied');
                    }, 2000);
                }).catch(() => {
                    // 降级：选中文字
                    const el = document.getElementById('share-link-text');
                    if (el) {
                        const range = document.createRange();
                        range.selectNode(el);
                        window.getSelection().removeAllRanges();
                        window.getSelection().addRange(range);
                    }
                });
            });
        }

        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', () => {
                if (overlay) overlay.style.display = 'none';
            });
        }

        // 点遮罩背景也可关闭
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.style.display = 'none';
        };
    }

    // ── 顶部阶段文案更新 ──
    _updateStageDisplay(stage) {
        if (!stage) return;
        const maxStage = this.systems.gameState.currentMaxEvolutionStage;
        const targetStage = Math.max(stage, maxStage);

        // 从进化链里用 id 匹配
        const chain = this.systems.aiEvolution?.evolutionChain;
        const stageData = chain?.find(s => s.id === targetStage);
        const displayName = stageData?.displayName || `进化体 ${targetStage}`;
        const emoji       = stageData?.emoji || '🤖';

        // 进化等级对应的氛围前缀
        const prefixes = {
            1:  '📡 初始化中',
            2:  '⚡ 数据汇聚',
            3:  '🔬 算力觉醒',
            4:  '🦿 机械崛起',
            5:  '🌐 意识融合',
            6:  '🧬 深度进化',
            7:  '🌩️ 系统掌控',
            8:  '🛸 超维突破',
            9:  '🌌 宇宙感知',
            10: '♾️ 无限扩张',
            11: '👑 神格降临',
        };
        const prefix = prefixes[targetStage] || '🤖 进化中';

        const el = document.getElementById('current-stage');
        if (el) {
            el.textContent = `${prefix} · ${emoji} ${displayName}`;
            // 升级时高亮闪烁
            el.style.color = '#ffffff';
            el.style.textShadow = '0 0 12px #00ffff, 0 0 24px #00ffff';
            clearTimeout(this._stageDisplayTimer);
            this._stageDisplayTimer = setTimeout(() => {
                el.style.color = '';
                el.style.textShadow = '';
            }, 1500);
        }

        // 同步更新进度条（11阶为满）
        const fill = document.getElementById('progress-fill');
        if (fill) {
            fill.style.width = `${Math.min((targetStage / 11) * 100, 100)}%`;
        }
    }

    // ── 倒计时 ──
    _startCountdown(totalSeconds) {
        // 清除旧计时器
        if (this._countdownInterval) clearInterval(this._countdownInterval);

        const timerEl = document.getElementById('countdown-timer');
        const valueEl = document.getElementById('countdown-value');
        let remaining  = totalSeconds;

        const update = () => {
            if (!this.isRunning) {
                clearInterval(this._countdownInterval);
                return;
            }

            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            if (valueEl) valueEl.textContent = `${m}:${String(s).padStart(2, '0')}`;

            // 最后30秒红色紧急状态
            if (timerEl) {
                timerEl.classList.toggle('urgent', remaining <= 30);
            }

            if (remaining <= 0) {
                clearInterval(this._countdownInterval);
                // 时间到：触发游戏结束
                if (this.isRunning) {
                    console.log('⏱ 时间到！游戏结束');
                    this.systems.gameState.endGame();
                }
                return;
            }
            remaining--;
        };

        update(); // 立即渲染第一帧
        this._countdownInterval = setInterval(update, 1000);
    }

    // ── UI 控制 ──
    showLoadingScreen() {
        const el = document.getElementById('loading-screen');
        if (el) el.style.display = 'flex';
    }

    hideLoadingScreen() {
        const el = document.getElementById('loading-screen');
        if (el) el.style.display = 'none';
    }

    showStartScreen() {
        const btn = document.getElementById('start-game');
        if (btn) btn.style.display = 'block';
    }

    hideStartScreen() {
        const btn = document.getElementById('start-game');
        if (btn) btn.style.display = 'none';
    }

    hideEndScreen() {
        const r = document.getElementById('restart-game');
        const s = document.getElementById('share-game');
        if (r) r.style.display = 'none';
        if (s) s.style.display = 'none';
    }

    showError(message) {
        const el = document.querySelector('#loading-screen p');
        if (el) {
            el.textContent = message;
            el.style.color = '#ff6b6b';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.aiEvolutionGame = new Game();
});

export default Game;