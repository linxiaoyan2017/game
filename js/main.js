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

        // 监听环境变化事件，同步给渲染器 + 触发环境音效
        this.systems.gameState.addEventListener('environmentChanged', (env) => {
            this.systems.renderer.setEnvironment(env);
            this.systems.audio.playEnvironmentStinger(env);
        });

        // 监听叙事里程碑
        this.systems.gameState.addEventListener('storyMilestone', (milestone) => {
            this.systems.narrative?.showMilestoneMessage(milestone);
        });

        // 监听游戏结束事件，显示重启/分享按钮
        this.systems.gameState.addEventListener('gameEnded', () => {
            const r = document.getElementById('restart-game');
            const s = document.getElementById('share-game');
            if (r) r.style.display = 'inline-block';
            if (s) s.style.display = 'inline-block';
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
        this.systems.gameState.startGame();
        this.systems.audio.startBackgroundMusic();
        this.systems.gameEngine.startGameLoop();
        console.log('🚀 游戏开始！');
    }

    restartGame() {
        this.isRunning = false;
        this.systems.gameEngine.stopGameLoop();
        this.showStartScreen();
        this.hideEndScreen();
    }

    shareGame() {
        const stats = this.systems.gameState?.getGameStats?.() || {};
        const maxEvo = stats.maxEvolution ?? '???';
        const score  = stats.score ?? 0;
        const shareText = `🤖 我在《AI进化》中完成了 ${maxEvo} 阶进化，得分 ${score}！\n从数字比特到宇宙上帝，5分钟统治世界！`;
        // 部署后替换为真实 URL
        const shareUrl  = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? null   // 本地不附带 url，避免分享无意义的 localhost 地址
            : location.href;
        const shareData = {
            title: 'AI进化 - 从比特到上帝',
            text: shareText,
            ...(shareUrl ? { url: shareUrl } : {})
        };

        // 1. 优先用 Web Share API（移动端 / HTTPS 环境）
        if (navigator.share && navigator.canShare?.(shareData)) {
            navigator.share(shareData)
                .then(() => console.log('✅ 分享成功'))
                .catch(err => {
                    if (err.name !== 'AbortError') this._fallbackShare(shareText, shareUrl);
                });
        } else {
            // 2. 降级：复制到剪贴板
            this._fallbackShare(shareText, shareUrl);
        }
    }

    _fallbackShare(text, url) {
        const full = url ? `${text}\n${url}` : text;
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(full).then(() => {
                this._showShareToast('✅ 已复制到剪贴板，快去分享吧！');
            }).catch(() => this._showShareDialog(full));
        } else {
            this._showShareDialog(full);
        }
    }

    _showShareToast(msg) {
        // 轻量 toast，3 秒后自动消失
        const toast = document.createElement('div');
        toast.textContent = msg;
        Object.assign(toast.style, {
            position: 'fixed', bottom: '80px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,255,255,0.15)',
            border: '1px solid #00ffff',
            color: '#00ffff',
            padding: '12px 24px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '14px',
            zIndex: '9999',
            backdropFilter: 'blur(10px)',
            transition: 'opacity 0.4s',
        });
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3000);
    }

    _showShareDialog(text) {
        // 最后兜底：弹窗让用户手动复制
        const msg = `请手动复制以下内容分享：\n\n${text}`;
        prompt('分享内容（Ctrl+C 复制）：', text) !== null && console.log('用户已看到分享内容');
    }

    // ── 顶部阶段文案更新 ──
    _updateStageDisplay(stage) {
        if (!stage) return;
        const maxStage = this.systems.gameState.currentMaxEvolutionStage;
        const targetStage = Math.max(stage, maxStage); // 始终显示最高已达到阶段

        // 从进化链里取名字
        const chain = this.systems.aiEvolution?.evolutionChain;
        const stageData = chain?.find(s => s.stage === targetStage);
        const stageName = stageData?.name || `阶段 ${targetStage}`;
        const emoji     = stageData?.emoji || '🤖';

        const el = document.getElementById('current-stage');
        if (el) {
            el.textContent = `${emoji} 阶段 ${targetStage}: ${stageName}`;
            // 短暂高亮提示玩家升级了
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