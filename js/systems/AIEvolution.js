/**
 * AI进化系统 - 管理AI实体的生成、合并与进化链
 */
export class AIEvolution {
    constructor() {
        this.game = null;
        this.systems = null;

        this.evolutionChain = [];   // 从 evolution.json 加载
        this.currentMaxStage = 1;
        this.nextSpawnStage = 1;    // 下次生成的阶段（随最高阶段浮动）
    }

    // ─────────────────────────────────────────
    // 资源加载
    // ─────────────────────────────────────────
    async loadEvolutionData() {
        try {
            const resp = await fetch('./js/config/evolution.json');
            const data = await resp.json();
            // JSON 结构是 evolutionChain.stages[]
            this.evolutionChain = data.evolutionChain?.stages || data.stages || data.evolutionChain || data;
            // 顺手修正 color 笔误
            this.evolutionChain.forEach(s => {
                if (s.color === '#gold') s.color = '#ffd700';
                // JSON 里用的是 size，我们物理系统用 radius
                if (!s.radius && s.size) s.radius = s.size;
            });
            console.log(`✅ 进化链加载成功，共 ${this.evolutionChain.length} 阶段`);
        } catch (e) {
            console.warn('evolution.json 加载失败，使用内建默认数据', e);
            this.evolutionChain = this.getDefaultChain();
        }
    }

    getDefaultChain() {
        return [
            { id: 1,  name: 'bit',     displayName: '比特',   emoji: '0️⃣', radius: 18, color: '#00ff88' },
            { id: 2,  name: 'byte',    displayName: '字节',   emoji: '📦', radius: 22, color: '#00d4ff' },
            { id: 3,  name: 'chip',    displayName: '芯片',   emoji: '💡', radius: 27, color: '#ff6b35' },
            { id: 4,  name: 'robot',   displayName: '机器人', emoji: '🤖', radius: 32, color: '#a855f7' },
            { id: 5,  name: 'cyborg',  displayName: '赛博格', emoji: '🦾', radius: 37, color: '#f59e0b' },
            { id: 6,  name: 'brain',   displayName: '神经脑', emoji: '🧠', radius: 42, color: '#ec4899' },
            { id: 7,  name: 'eye',     displayName: '全视之眼',emoji:'👁️', radius: 47, color: '#06b6d4' },
            { id: 8,  name: 'network', displayName: '数据网', emoji: '🌐', radius: 52, color: '#10b981' },
            { id: 9,  name: 'lightning',displayName:'量子风暴',emoji:'⚡', radius: 57, color: '#fbbf24' },
            { id: 10, name: 'cosmos',  displayName: '数字宇宙',emoji:'🌌', radius: 62, color: '#8b5cf6' },
            { id: 11, name: 'god',     displayName: '数字神格',emoji:'👑', radius: 70, color: '#ffd700' },
        ];
    }

    // ─────────────────────────────────────────
    // 生成实体
    // ─────────────────────────────────────────
    spawnEntity(x, y) {
        const state = this.systems?.gameState;
        const physics = this.systems?.physics;
        if (!state || !physics) return;

        // 生成阶段：1 到 max(currentMax-2, 1)，给玩家挑战空间
        const maxSpawn = Math.max(1, Math.min(this.currentMaxStage - 1, 5));
        const stage = Math.floor(Math.random() * maxSpawn) + 1;
        const stageData = this.getStageData(stage);
        if (!stageData) return;

        const entity = {
            stage,
            x,
            y,
            vx: (Math.random() - 0.5) * 80,
            vy: -50,
            radius: stageData.radius,
            color: stageData.color,
            emoji: stageData.emoji,
            displayName: stageData.displayName,
            merging: false,     // 合并动画标记
            mergeTimer: 0,
        };

        const added = state.addEntity(entity);
        physics.addEntity(added);
        return added;
    }

    // ─────────────────────────────────────────
    // 合并逻辑（由 Physics 碰撞触发）
    // ─────────────────────────────────────────
    tryMerge(entityA, entityB) {
        if (entityA.stage !== entityB.stage) return;
        if (entityA.merging || entityB.merging) return;

        const nextStage = entityA.stage + 1;
        if (nextStage > this.evolutionChain.length) {
            // 已是最高阶段，触发终局
            this.triggerGodhoodIfNeeded(entityA, entityB);
            return;
        }

        entityA.merging = true;
        entityB.merging = true;

        const state = this.systems?.gameState;
        const physics = this.systems?.physics;
        const narrative = this.systems?.narrative;

        if (!state || !physics) return;

        // 合并位置取中点
        const mx = (entityA.x + entityB.x) / 2;
        const my = (entityA.y + entityB.y) / 2;

        // 从物理和状态中移除旧实体
        physics.removeEntity(entityA.id);
        physics.removeEntity(entityB.id);

        const newEntity = state.mergeEntities(entityA, entityB, nextStage);

        // 补充渲染属性
        const stageData = this.getStageData(nextStage);
        newEntity.x = mx;
        newEntity.y = my;
        newEntity.vx = 0;
        newEntity.vy = -30; // 合并后轻微上弹
        newEntity.radius = stageData?.radius || 20 + nextStage * 4;
        newEntity.color = stageData?.color || '#ffffff';
        newEntity.emoji = stageData?.emoji || '✨';
        newEntity.displayName = stageData?.displayName || `Stage ${nextStage}`;
        newEntity.merging = false;
        newEntity.mergeTimer = 0;

        // 添加到物理
        physics.addEntity(newEntity);

        // 更新最高阶段
        if (nextStage > this.currentMaxStage) {
            this.currentMaxStage = nextStage;
        }

        // 触发音效
        this.systems?.audio?.playMergeSound(nextStage);

        // 触发叙事
        narrative?.onMerge(nextStage, newEntity);

        // 触发粒子
        this.systems?.renderer?.spawnMergeParticles(mx, my, stageData?.color);

        console.log(`🔥 进化合并: ${entityA.displayName} × 2 → ${newEntity.displayName}`);
    }

    triggerGodhoodIfNeeded(entityA, entityB) {
        const state = this.systems?.gameState;
        if (state && !state.isFinaleTriggered) {
            state.triggerFinale();
        }
    }

    // ─────────────────────────────────────────
    // 每帧更新
    // ─────────────────────────────────────────
    update(deltaTime) {
        // 同步物理实体列表与状态实体列表
        // （物理系统是权威来源，状态跟踪逻辑数据）
    }

    // ─────────────────────────────────────────
    // 工具方法
    // ─────────────────────────────────────────
    getStageData(stage) {
        return this.evolutionChain.find(s => s.id === stage) || null;
    }

    reset() {
        this.currentMaxStage = 1;
    }
}