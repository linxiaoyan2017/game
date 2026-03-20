/**
 * 游戏引擎系统 - 协调所有游戏系统
 */
export class GameEngine {
    constructor(game) {
        this.game = game;
        this.systems = null;
        
        // 帧率管理
        this.frameRate = 60;
        this.targetFrameTime = 1000 / this.frameRate;
        this.frameCount = 0;
        this.fpsCounter = 0;
        this.lastFpsUpdate = 0;
        this.currentFPS = 0;
        
        // 游戏循环状态
        this.isRunning = false;
        this.lastFrameTime = 0;
        this.deltaTimeAccumulator = 0;
        this.maxDeltaTime = 50; // 最大帧时间（毫秒），防止螺旋死亡
        
        // 性能监控
        this.performanceMonitor = {
            frameTimeHistory: [],
            averageFrameTime: 16.67, // 60fps目标
            performanceLevel: 'high' // high, medium, low
        };
    }
    
    startGameLoop() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastFrameTime = performance.now();
            this.gameLoop();
            console.log('游戏循环已启动，目标帧率:', this.frameRate + 'fps');
        }
    }
    
    stopGameLoop() {
        this.isRunning = false;
        console.log('游戏循环已停止');
    }
    
    gameLoop(currentTime = performance.now()) {
        if (!this.isRunning) return;
        
        // 计算帧时间
        const rawDeltaTime = currentTime - this.lastFrameTime;
        const deltaTime = Math.min(rawDeltaTime, this.maxDeltaTime);
        this.lastFrameTime = currentTime;
        
        // 更新性能监控
        this.updatePerformanceMetrics(rawDeltaTime);
        
        // 更新所有系统
        this.update(deltaTime);
        
        // 请求下一帧
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // 更新帧率计数器
        this.updateFrameRate(deltaTime);
        
        // 协调系统更新（按依赖顺序）
        this.coordinateSystemUpdates(deltaTime);
    }
    
    coordinateSystemUpdates(deltaTime) {
        if (!this.systems) return;
        
        try {
            // 更新顺序很重要：输入 -> 物理 -> 逻辑 -> 音频 -> 渲染
            if (this.systems.input) this.systems.input.update(deltaTime);
            if (this.systems.physics) this.systems.physics.update(deltaTime);
            if (this.systems.aiEvolution) this.systems.aiEvolution.update(deltaTime);
            if (this.systems.narrative) this.systems.narrative.update(deltaTime);
            if (this.systems.audio) this.systems.audio.update(deltaTime);
            if (this.systems.renderer) this.systems.renderer.update(deltaTime);
            
        } catch (error) {
            console.error('系统更新时发生错误:', error);
            this.handleSystemError(error);
        }
    }
    
    updateFrameRate(deltaTime) {
        this.frameCount++;
        
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 1000) {
            this.currentFPS = this.frameCount;
            this.fpsCounter = this.currentFPS;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            
            // 更新UI显示（如果存在调试信息）
            this.updateFPSDisplay();
            
            // 自动质量调整
            if (this.currentFPS < 45) {
                this.adjustQuality();
            }
        }
    }
    
    updatePerformanceMetrics(frameTime) {
        const history = this.performanceMonitor.frameTimeHistory;
        history.push(frameTime);
        
        // 只保留最近30帧的数据
        if (history.length > 30) {
            history.shift();
        }
        
        // 计算平均帧时间
        if (history.length > 0) {
            const sum = history.reduce((a, b) => a + b, 0);
            this.performanceMonitor.averageFrameTime = sum / history.length;
        }
        
        // 根据平均帧时间确定性能等级
        const avgFPS = 1000 / this.performanceMonitor.averageFrameTime;
        if (avgFPS >= 55) {
            this.performanceMonitor.performanceLevel = 'high';
        } else if (avgFPS >= 40) {
            this.performanceMonitor.performanceLevel = 'medium';
        } else {
            this.performanceMonitor.performanceLevel = 'low';
        }
    }
    
    updateFPSDisplay() {
        // 可选的FPS显示更新（用于调试）
        if (this.game.debugMode) {
            console.log(`FPS: ${this.currentFPS}, 平均帧时间: ${this.performanceMonitor.averageFrameTime.toFixed(2)}ms`);
        }
    }
    
    adjustQuality() {
        const level = this.performanceMonitor.performanceLevel;
        console.log(`检测到性能问题 (${this.currentFPS}fps)，调整到${level}质量模式`);
        
        // 通知渲染系统调整质量
        if (this.systems && this.systems.renderer) {
            this.systems.renderer.setQualityLevel(level);
        }
        
        // 通知物理系统调整精度
        if (this.systems && this.systems.physics) {
            this.systems.physics.setPerformanceMode(level);
        }
        
        // 触发质量调整事件
        this.game.canvas?.dispatchEvent(new CustomEvent('qualityAdjusted', {
            detail: { level, fps: this.currentFPS }
        }));
    }
    
    handleSystemError(error) {
        console.error('游戏系统错误，尝试恢复:', error);
        
        // 尝试重新初始化有问题的系统
        // 这里可以加入更复杂的错误恢复逻辑
        
        // 如果错误太严重，停止游戏循环
        if (error.critical) {
            this.stopGameLoop();
            this.game.showError('游戏遇到严重错误，已暂停运行');
        }
    }
    
    getPerformanceInfo() {
        return {
            currentFPS: this.currentFPS,
            averageFrameTime: this.performanceMonitor.averageFrameTime,
            performanceLevel: this.performanceMonitor.performanceLevel,
            isRunning: this.isRunning
        };
    }
    
    reset() {
        this.frameCount = 0;
        this.fpsCounter = 0;
        this.currentFPS = 0;
        this.deltaTimeAccumulator = 0;
        this.performanceMonitor.frameTimeHistory = [];
        this.performanceMonitor.averageFrameTime = 16.67;
        this.performanceMonitor.performanceLevel = 'high';
        
        console.log('游戏引擎状态已重置');
    }
}
