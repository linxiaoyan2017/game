/**
 * 音效系统 - 使用 Web Audio API 程序生成音效（不依赖外部文件）
 */
export class Audio {
    constructor() {
        this.game = null;
        this.systems = null;
        this.audioCtx = null;
        this.masterGain = null;
        this.bgmOscillators = [];
        this.enabled = true;

        // 环境持续 ambient drone 节点（可淡入/淡出）
        this._ambientOsc  = null;
        this._ambientGain = null;
        this._currentEnv  = 0;
    }

    _initCtx() {
        if (this.audioCtx) return;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 0.4;
            this.masterGain.connect(this.audioCtx.destination);
        } catch (e) {
            console.warn('Web Audio API 不可用，静音模式');
            this.enabled = false;
        }
    }

    async loadSounds() {
        this._initCtx();

        // 预加载 HTML <audio> 元素中的 BGM 文件
        // 加超时保险：iOS 微信浏览器 canplaythrough 可能永远不触发
        const bgEl = document.getElementById('bg-music');
        if (bgEl) {
            await new Promise((resolve) => {
                let resolved = false;
                const done = () => { if (!resolved) { resolved = true; resolve(); } };

                bgEl.addEventListener('canplaythrough', () => {
                    console.log('✅ BGM文件加载成功');
                    done();
                }, { once: true });
                bgEl.addEventListener('error', () => {
                    console.warn('⚠️ BGM文件未找到，静音运行');
                    done();
                }, { once: true });

                // 3秒超时，防止 iOS 微信/Safari 卡死
                setTimeout(() => {
                    console.warn('⚠️ BGM加载超时，跳过音频预加载');
                    done();
                }, 3000);

                bgEl.load();
            });
        }

        console.log('✅ 音频系统初始化完成');
    }

    // ─────────────────────────────────────────
    // 合并音效：随阶段升高音调
    // ─────────────────────────────────────────
    playMergeSound(stage) {
        if (!this.enabled || !this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const baseFreq = 220;
        const freq = baseFreq * Math.pow(1.15, stage - 1);
        const now = this.audioCtx.currentTime;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = stage >= 9 ? 'sine' : 'square';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.15);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.4);
    }

    // ─────────────────────────────────────────
    // 落地音效
    // ─────────────────────────────────────────
    playDropSound() {
        if (!this.enabled || !this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    // ─────────────────────────────────────────
    // 背景音乐（赛博朋克氛围）
    // ─────────────────────────────────────────
    startBackgroundMusic() {
        // 优先使用 HTML <audio> 元素播放 BGM 文件
        const bgEl = document.getElementById('bg-music');
        if (bgEl) {
            bgEl.volume = 0.4;
            bgEl.play().then(() => {
                console.log('🎵 BGM 开始播放');
            }).catch(err => {
                console.warn('BGM 文件不可用，使用静音模式。请在 assets/sounds/ 放入 cyberpunk-ambient.mp3', err);
            });
        }

        // 同时初始化 Web Audio 上下文（供音效使用），但不播放振荡器
        this._initCtx();
        if (this.audioCtx?.state === 'suspended') this.audioCtx.resume();
    }

    // ─────────────────────────────────────────
    // 环境音效（转场 Stinger + 持续 Ambient Drone）
    // 任务 8.4：每阶段独特氛围音
    // 任务 8.5：多层混音（BGM + Drone + SFX）
    // ─────────────────────────────────────────
    playEnvironmentStinger(envLevel) {
        if (!this.enabled || !this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        if (envLevel === this._currentEnv) return;
        this._currentEnv = envLevel;

        // 各环境的转场 stinger 配置
        const stingerMap = {
            1: { freq: 330, type: 'sine',      duration: 0.5, droneFreq: 55,  msg: '电路板激活' },
            2: { freq: 160, type: 'sawtooth',  duration: 0.8, droneFreq: 73,  msg: '服务器机房' },
            3: { freq: 220, type: 'square',    duration: 0.6, droneFreq: 98,  msg: '城市天际线' },
            4: { freq: 110, type: 'sine',      duration: 1.2, droneFreq: 55,  msg: '太空数据中心' },
            5: { freq: 55,  type: 'sine',      duration: 2.0, droneFreq: 27.5,msg: '数字宇宙' },
        };
        const cfg = stingerMap[envLevel];
        if (!cfg) return;

        const now = this.audioCtx.currentTime;

        // ── 1. 转场 Stinger（和弦扫描）──
        [1, 1.5, 2].forEach((ratio, idx) => {
            const osc  = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            const filter = this.audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1200;

            osc.type = cfg.type;
            osc.frequency.setValueAtTime(cfg.freq * ratio, now + idx * 0.06);
            osc.frequency.exponentialRampToValueAtTime(cfg.freq * ratio * 0.6, now + cfg.duration);

            gain.gain.setValueAtTime(0, now + idx * 0.06);
            gain.gain.linearRampToValueAtTime(0.12 / (idx + 1), now + idx * 0.06 + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.duration);

            osc.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
            osc.start(now + idx * 0.06);
            osc.stop(now + cfg.duration + 0.05);
        });

        // ── 2. 淡出旧 Ambient Drone ──
        if (this._ambientGain) {
            const oldGain = this._ambientGain;
            oldGain.gain.setTargetAtTime(0, now, 0.4);
            setTimeout(() => { try { this._ambientOsc?.stop(); } catch(e){} }, 2000);
        }

        // ── 3. 新 Ambient Drone（持续低频氛围层）──
        if (envLevel >= 2) {
            const droneOsc  = this.audioCtx.createOscillator();
            const droneGain = this.audioCtx.createGain();
            const lfo       = this.audioCtx.createOscillator();
            const lfoGain   = this.audioCtx.createGain();

            // LFO 调制 Drone 音量（颤音效果）
            lfo.type = 'sine';
            lfo.frequency.value = 0.15 + envLevel * 0.05;
            lfoGain.gain.value  = 0.03;
            lfo.connect(lfoGain);
            lfoGain.connect(droneGain.gain);

            droneOsc.type = 'sine';
            droneOsc.frequency.value = cfg.droneFreq;
            droneGain.gain.setValueAtTime(0, now + 0.3);
            droneGain.gain.linearRampToValueAtTime(0.06, now + 1.5); // 慢淡入

            droneOsc.connect(droneGain);
            droneGain.connect(this.masterGain);
            droneOsc.start(now + 0.3);
            lfo.start(now + 0.3);

            this._ambientOsc  = droneOsc;
            this._ambientGain = droneGain;
            this._ambientLFO  = lfo;
        }

        console.log(`🎵 环境音效: ${cfg.msg} [Drone ${cfg.droneFreq}Hz]`);
    }

    // ─────────────────────────────────────────
    // 音量控制（混合层）
    // ─────────────────────────────────────────
    setMasterVolume(vol) {
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(
                Math.max(0, Math.min(1, vol)),
                this.audioCtx.currentTime,
                0.1
            );
        }
        const bgEl = document.getElementById('bg-music');
        if (bgEl) bgEl.volume = Math.max(0, Math.min(0.6, vol * 0.6));
    }

    stopBackgroundMusic() {
        this.bgmOscillators.forEach(o => { try { o.stop(); } catch (e) {} });
        this.bgmOscillators = [];
        const bgEl = document.getElementById('bg-music');
        if (bgEl) { bgEl.pause(); bgEl.currentTime = 0; }
    }

    update(deltaTime) {}

    reset() {
        this.stopBackgroundMusic();
        // 停止持续 Drone
        try { this._ambientOsc?.stop(); this._ambientLFO?.stop(); } catch(e) {}
        this._ambientOsc = null; this._ambientGain = null; this._currentEnv = 0;
    }
}