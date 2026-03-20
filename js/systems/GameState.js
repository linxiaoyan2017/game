/**
 * 游戏状态管理系统 - 集中管理所有游戏状态
 */
export class GameState {
    constructor() {
        // 游戏基本状态
        this.gamePhase = 'loading'; // loading, menu, playing, paused, gameOver, finale
        this.gameStartTime = 0;
        this.gamePlayTime = 0;
        this.isGameActive = false;
        
        // 玩家进度
        this.currentLevel = 0;
        this.maxLevelReached = 0;
        this.totalEntitiesCreated = 0;
        this.totalMerges = 0;
        this.score = 0;
        
        // AI进化状态
        this.currentMaxEvolutionStage = 1;
        this.evolutionHistory = [];
        this.activeEntities = [];
        this.nextEntityId = 1;
        
        // 环境状态
        this.currentEnvironment = 1;
        this.environmentTransitionProgress = 0;
        this.visualEffectsLevel = 'high';
        
        // 叙事状态
        this.storyMilestones = new Set();
        this.messagesShown = [];
        this.isFinaleTriggered = false;
        this.finalePhase = 0;
        
        // 性能状态
        this.performanceLevel = 'high';
        this.particleCount = 0;
        this.maxParticles = 200;
        
        // 事件系统
        this.eventListeners = new Map();
        
        // 状态变更历史（用于调试）
        this.stateHistory = [];
        this.maxHistoryLength = 100;
    }
    
    // === 状态管理核心方法 ===
    
    setState(path, value, silent = false) {
        const oldValue = this.getState(path);
        
        if (oldValue === value) return; // 没有变化，直接返回
        
        // 更新状态
        this.setNestedProperty(this, path, value);
        
        // 记录状态变更历史
        this.recordStateChange(path, oldValue, value);
        
        // 触发状态变更事件
        if (!silent) {
            this.emitStateChange(path, value, oldValue);
        }
    }
    
    getState(path) {
        return this.getNestedProperty(this, path);
    }
    
    // === 游戏阶段管理 ===
    
    startGame() {
        this.setState('gamePhase', 'playing');
        this.setState('gameStartTime', Date.now());
        this.setState('isGameActive', true);
        this.reset();
        this.emitEvent('gameStarted');
    }
    
    pauseGame() {
        if (this.gamePhase === 'playing') {
            this.setState('gamePhase', 'paused');
            this.setState('isGameActive', false);
            this.emitEvent('gamePaused');
        }
    }
    
    resumeGame() {
        if (this.gamePhase === 'paused') {
            this.setState('gamePhase', 'playing');
            this.setState('isGameActive', true);
            this.emitEvent('gameResumed');
        }
    }
    
    endGame() {
        this.setState('gamePhase', 'gameOver');
        this.setState('isGameActive', false);
        this.updateGamePlayTime();
        this.emitEvent('gameEnded');
    }
    
    triggerFinale() {
        this.setState('gamePhase', 'finale');
        this.setState('isFinaleTriggered', true);
        this.setState('finalePhase', 1);
        this.emitEvent('finaleTriggered');
    }
    
    // === 实体管理 ===
    
    addEntity(entity) {
        entity.id = this.nextEntityId++;
        this.activeEntities.push(entity);
        this.setState('totalEntitiesCreated', this.totalEntitiesCreated + 1);
        this.emitEvent('entityAdded', entity);
        return entity;
    }
    
    removeEntity(entityId) {
        const index = this.activeEntities.findIndex(e => e.id === entityId);
        if (index > -1) {
            const entity = this.activeEntities[index];
            this.activeEntities.splice(index, 1);
            this.emitEvent('entityRemoved', entity);
            return entity;
        }
        return null;
    }
    
    mergeEntities(entity1, entity2, newStage) {
        // 移除原实体
        this.removeEntity(entity1.id);
        this.removeEntity(entity2.id);
        
        // 创建新实体
        const newEntity = {
            id: this.nextEntityId++,
            stage: newStage,
            x: (entity1.x + entity2.x) / 2,
            y: (entity1.y + entity2.y) / 2,
            createdTime: Date.now()
        };
        
        this.activeEntities.push(newEntity);
        
        // 更新统计
        this.setState('totalMerges', this.totalMerges + 1);
        this.setState('score', this.score + newStage * 10);
        
        // 更新最高进化阶段
        if (newStage > this.currentMaxEvolutionStage) {
            this.setState('currentMaxEvolutionStage', newStage);
            this.checkEnvironmentTransition(newStage);
            this.checkStoryMilestones(newStage);
        }
        
        // 记录进化历史
        this.evolutionHistory.push({
            fromStage: entity1.stage,
            toStage: newStage,
            timestamp: Date.now()
        });
        
        this.emitEvent('entitiesMerged', { entity1, entity2, newEntity });
        return newEntity;
    }
    
    // === 环境和进度管理 ===
    
    checkEnvironmentTransition(evolutionStage) {
        let newEnvironment = 1;
        
        if (evolutionStage >= 9) newEnvironment = 5; // 数字宇宙
        else if (evolutionStage >= 7) newEnvironment = 4; // 太空数据中心
        else if (evolutionStage >= 5) newEnvironment = 3; // 城市天际线
        else if (evolutionStage >= 3) newEnvironment = 2; // 服务器机房
        else newEnvironment = 1; // 电路板
        
        if (newEnvironment > this.currentEnvironment) {
            this.setState('currentEnvironment', newEnvironment);
            this.emitEvent('environmentChanged', newEnvironment);
        }
    }
    
    checkStoryMilestones(evolutionStage) {
        const milestones = [
            { stage: 3, name: 'firstEvolution', message: '🤖 AI学会了自我复制...' },
            { stage: 5, name: 'selfAwareness', message: '🧠 神经网络获得了自我意识' },
            { stage: 7, name: 'networkControl', message: '🌐 AI开始控制网络系统...' },
            { stage: 9, name: 'cosmicAwareness', message: '🌌 AI发现了多维空间的秘密' },
            { stage: 11, name: 'godhood', message: '👑 新的宇宙主宰诞生了！' }
        ];
        
        milestones.forEach(milestone => {
            if (evolutionStage >= milestone.stage && !this.storyMilestones.has(milestone.name)) {
                this.storyMilestones.add(milestone.name);
                this.emitEvent('storyMilestone', milestone);
                
                // 检查是否应该触发终局
                if (milestone.name === 'godhood') {
                    setTimeout(() => this.triggerFinale(), 2000);
                }
            }
        });
    }
    
    // === 性能管理 ===
    
    setPerformanceLevel(level) {
        this.setState('performanceLevel', level);
        
        // 根据性能等级调整参数
        switch (level) {
            case 'high':
                this.setState('maxParticles', 200);
                this.setState('visualEffectsLevel', 'high');
                break;
            case 'medium':
                this.setState('maxParticles', 100);
                this.setState('visualEffectsLevel', 'medium');
                break;
            case 'low':
                this.setState('maxParticles', 50);
                this.setState('visualEffectsLevel', 'low');
                break;
        }
        
        this.emitEvent('performanceLevelChanged', level);
    }
    
    // === 时间管理 ===
    
    updateGamePlayTime() {
        if (this.gameStartTime > 0) {
            this.setState('gamePlayTime', Date.now() - this.gameStartTime);
        }
    }
    
    getFormattedPlayTime() {
        const totalMs = this.gamePlayTime || (Date.now() - this.gameStartTime);
        const minutes = Math.floor(totalMs / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // === 事件系统 ===
    
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    emitEvent(event, data = null) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data, this);
                } catch (error) {
                    console.error(`事件监听器错误 (${event}):`, error);
                }
            });
        }
    }
    
    emitStateChange(path, newValue, oldValue) {
        this.emitEvent('stateChanged', { path, newValue, oldValue });
        this.emitEvent(`stateChanged:${path}`, { newValue, oldValue });
    }
    
    // === 工具方法 ===
    
    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
        target[lastKey] = value;
    }
    
    getNestedProperty(obj, path) {
        return path.split('.').reduce((o, k) => o && o[k], obj);
    }
    
    recordStateChange(path, oldValue, newValue) {
        this.stateHistory.push({
            path,
            oldValue,
            newValue,
            timestamp: Date.now()
        });
        
        // 限制历史记录长度
        if (this.stateHistory.length > this.maxHistoryLength) {
            this.stateHistory.shift();
        }
    }
    
    // === 游戏状态查询 ===
    
    isPlaying() {
        return this.gamePhase === 'playing' && this.isGameActive;
    }
    
    isGameOver() {
        return this.gamePhase === 'gameOver' || this.gamePhase === 'finale';
    }
    
    getGameStats() {
        return {
            playTime: this.getFormattedPlayTime(),
            score: this.score,
            totalEntities: this.totalEntitiesCreated,
            totalMerges: this.totalMerges,
            maxEvolution: this.currentMaxEvolutionStage,
            environment: this.currentEnvironment,
            milestonesReached: this.storyMilestones.size
        };
    }
    
    // === 重置和清理 ===
    
    reset() {
        // 保留基本游戏状态，重置游戏进度
        this.setState('currentLevel', 0);
        this.setState('totalEntitiesCreated', 0);
        this.setState('totalMerges', 0);
        this.setState('score', 0);
        this.setState('currentMaxEvolutionStage', 1);
        this.setState('currentEnvironment', 1);
        this.setState('environmentTransitionProgress', 0);
        this.setState('isFinaleTriggered', false);
        this.setState('finalePhase', 0);
        
        // 清理游戏数据
        this.activeEntities = [];
        this.evolutionHistory = [];
        this.storyMilestones.clear();
        this.messagesShown = [];
        this.nextEntityId = 1;
        
        this.emitEvent('gameReset');
    }
    
    // === 序列化 ===
    
    serialize() {
        return {
            gameStats: this.getGameStats(),
            activeEntities: this.activeEntities,
            storyMilestones: Array.from(this.storyMilestones),
            evolutionHistory: this.evolutionHistory.slice(-10), // 只保存最近10次进化
            timestamp: Date.now()
        };
    }
}