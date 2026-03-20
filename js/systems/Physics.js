/**
 * 物理系统 - 处理重力、碰撞检测和弹性反弹
 * 基于简单圆形碰撞的2D物理模拟
 */
import { Vector2D } from '../utils/Vector2D.js';

export class Physics {
    constructor() {
        this.game = null;
        this.systems = null;

        this.gravity = 800;        // 像素/秒²
        this.damping = 0.6;        // 落地弹性系数
        this.friction = 0.98;      // 横向摩擦
        this.entities = [];        // 物理实体数组

        // 世界边界（会在 init 里根据 canvas 动态设置）
        this.worldBounds = { left: 0, right: 400, top: 0, bottom: 600 };

        // 合并冷却（避免同帧重复合并）
        this.mergeCooldown = new Set();
    }

    /** 由 GameEngine 设置边界 */
    setBounds(left, right, top, bottom) {
        this.worldBounds = { left, right, top, bottom };
    }

    // ─────────────────────────────────────────
    // 主更新
    // ─────────────────────────────────────────
    update(deltaTime) {
        const dt = Math.min(deltaTime / 1000, 0.05); // 转为秒，最大50ms
        this.updateEntityPhysics(dt);
        this.checkCollisions();
        this.enforceWorldBounds();
        this.mergeCooldown.clear();
    }

    // ─────────────────────────────────────────
    // 重力 & 速度积分
    // ─────────────────────────────────────────
    updateEntityPhysics(dt) {
        for (const e of this.entities) {
            if (e.isStatic) continue;

            // 施加重力
            e.vy += this.gravity * dt;

            // 积分位置
            e.x += e.vx * dt;
            e.y += e.vy * dt;
        }
    }

    // ─────────────────────────────────────────
    // 边界碰撞
    // ─────────────────────────────────────────
    enforceWorldBounds() {
        const b = this.worldBounds;
        for (const e of this.entities) {
            const r = e.radius || 20;

            // 底部
            if (e.y + r > b.bottom) {
                e.y = b.bottom - r;
                e.vy *= -this.damping;
                e.vx *= this.friction;
                if (Math.abs(e.vy) < 20) e.vy = 0; // 消除微小弹跳
            }
            // 左边
            if (e.x - r < b.left) {
                e.x = b.left + r;
                e.vx *= -0.5;
            }
            // 右边
            if (e.x + r > b.right) {
                e.x = b.right - r;
                e.vx *= -0.5;
            }
            // 顶部（防止飞出）
            if (e.y - r < b.top) {
                e.y = b.top + r;
                if (e.vy < 0) e.vy *= -0.3;
            }
        }
    }

    // ─────────────────────────────────────────
    // 圆形碰撞检测 + 分离响应
    // ─────────────────────────────────────────
    checkCollisions() {
        const evolution = this.systems?.aiEvolution;

        for (let i = 0; i < this.entities.length; i++) {
            for (let j = i + 1; j < this.entities.length; j++) {
                const a = this.entities[i];
                const b = this.entities[j];

                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const distSq = dx * dx + dy * dy;
                const minDist = (a.radius || 20) + (b.radius || 20);

                if (distSq < minDist * minDist && distSq > 0.0001) {
                    const dist = Math.sqrt(distSq);
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const overlap = minDist - dist;

                    // ── 尝试合并（同阶段且不在合并冷却中）──
                    if (
                        a.stage === b.stage &&
                        !a.merging && !b.merging &&
                        !this.mergeCooldown.has(a.id) &&
                        !this.mergeCooldown.has(b.id) &&
                        evolution
                    ) {
                        this.mergeCooldown.add(a.id);
                        this.mergeCooldown.add(b.id);
                        evolution.tryMerge(a, b);
                        continue;
                    }

                    // ── 物理分离（位置校正）──
                    // 按质量比例分配分离量（大球少动，小球多动）
                    const massA = a.radius * a.radius;
                    const massB = b.radius * b.radius;
                    const totalMass = massA + massB;
                    const ratioA = massB / totalMass;
                    const ratioB = massA / totalMass;

                    a.x -= nx * overlap * ratioA;
                    a.y -= ny * overlap * ratioA;
                    b.x += nx * overlap * ratioB;
                    b.y += ny * overlap * ratioB;

                    // ── 速度响应 ──
                    const relVx = b.vx - a.vx;
                    const relVy = b.vy - a.vy;
                    const dot = relVx * nx + relVy * ny;

                    if (dot < 0) {
                        const restitution = 0.35; // 弹性（低一点防止永远弹跳）
                        const impulse = -(1 + restitution) * dot / (1 / massA + 1 / massB);
                        a.vx -= (impulse / massA) * nx;
                        a.vy -= (impulse / massA) * ny;
                        b.vx += (impulse / massB) * nx;
                        b.vy += (impulse / massB) * ny;
                    }
                }
            }
        }
    }

    // ─────────────────────────────────────────
    // 实体管理
    // ─────────────────────────────────────────
    addEntity(entity) {
        // 确保有物理属性
        if (entity.vx === undefined) entity.vx = (Math.random() - 0.5) * 50;
        if (entity.vy === undefined) entity.vy = 0;
        this.entities.push(entity);
    }

    removeEntity(entityId) {
        const idx = this.entities.findIndex(e => e.id === entityId);
        if (idx > -1) this.entities.splice(idx, 1);
    }

    setPerformanceMode(level) {
        // 低性能时降低检测频率（简化处理）
        this.gravity = level === 'low' ? 600 : 800;
    }

    reset() {
        this.entities = [];
        this.mergeCooldown.clear();
    }
}