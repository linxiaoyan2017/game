/**
 * 2D向量数学工具类
 */
export class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    // 向量加法
    add(vector) {
        return new Vector2D(this.x + vector.x, this.y + vector.y);
    }
    
    // 向量减法
    subtract(vector) {
        return new Vector2D(this.x - vector.x, this.y - vector.y);
    }
    
    // 向量乘法（标量）
    multiply(scalar) {
        return new Vector2D(this.x * scalar, this.y * scalar);
    }
    
    // 向量除法（标量）
    divide(scalar) {
        if (scalar === 0) {
            console.warn('Vector2D: Division by zero');
            return new Vector2D(this.x, this.y);
        }
        return new Vector2D(this.x / scalar, this.y / scalar);
    }
    
    // 计算向量长度
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    // 计算向量长度的平方（性能优化）
    magnitudeSquared() {
        return this.x * this.x + this.y * this.y;
    }
    
    // 向量归一化
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) {
            return new Vector2D(0, 0);
        }
        return this.divide(mag);
    }
    
    // 计算两向量距离
    distanceTo(vector) {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // 计算两向量距离的平方（性能优化）
    distanceSquaredTo(vector) {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        return dx * dx + dy * dy;
    }
    
    // 向量点积
    dot(vector) {
        return this.x * vector.x + this.y * vector.y;
    }
    
    // 限制向量长度
    limit(max) {
        const mag = this.magnitude();
        if (mag > max) {
            return this.normalize().multiply(max);
        }
        return new Vector2D(this.x, this.y);
    }
    
    // 复制向量
    copy() {
        return new Vector2D(this.x, this.y);
    }
    
    // 设置向量值
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    
    // 静态方法：创建随机向量
    static random(magnitude = 1) {
        const angle = Math.random() * Math.PI * 2;
        return new Vector2D(
            Math.cos(angle) * magnitude,
            Math.sin(angle) * magnitude
        );
    }
    
    // 静态方法：从角度创建向量
    static fromAngle(angle, magnitude = 1) {
        return new Vector2D(
            Math.cos(angle) * magnitude,
            Math.sin(angle) * magnitude
        );
    }
    
    // 转换为字符串
    toString() {
        return `Vector2D(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }
}