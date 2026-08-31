/**
 * ParticleEngine.js - Antigravity Visual Physics Particle System
 * Emits ambient floating dust, warp speed streaks during gravity shift,
 * and laser capture explosions.
 */

export class ParticleEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.maxAmbient = 35;
        this.initAmbient();
    }

    initAmbient() {
        for (let i = 0; i < this.maxAmbient; i++) {
            this.particles.push(this.createAmbientParticle());
        }
    }

    createAmbientParticle() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -0.2 - Math.random() * 0.5,
            radius: 1 + Math.random() * 2,
            color: Math.random() > 0.5 ? '#00f0ff' : '#ff007f',
            alpha: 0.1 + Math.random() * 0.4,
            decay: 0,
            type: 'ambient'
        };
    }

    createCaptureBurst(x, y, color) {
        for (let i = 0; i < 22; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2 + Math.random() * 3,
                color,
                alpha: 1,
                decay: 0.03 + Math.random() * 0.03,
                type: 'burst'
            });
        }
    }

    createGravityWarpBurst() {
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                radius: 2 + Math.random() * 4,
                color: '#c084fc',
                alpha: 1,
                decay: 0.02,
                type: 'warp'
            });
        }
    }

    updateAndRender() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.type === 'ambient') {
                if (p.y < 0) p.y = this.canvas.height;
                if (p.y > this.canvas.height) p.y = 0;
                if (p.x < 0) p.x = this.canvas.width;
                if (p.x > this.canvas.width) p.x = 0;
            } else {
                p.alpha -= p.decay;
                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }
            }

            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, p.alpha);
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // Maintain ambient count
        const ambientCount = this.particles.filter(p => p.type === 'ambient').length;
        if (ambientCount < this.maxAmbient) {
            this.particles.push(this.createAmbientParticle());
        }
    }
}
