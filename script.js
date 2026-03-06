// Hand Particle Magic - Interactive Hand Tracking with Particles
// Uses MediaPipe Hands for tracking and Canvas for particle rendering

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('video');
const startBtn = document.getElementById('startBtn');
const startScreen = document.getElementById('startScreen');
const loadingScreen = document.getElementById('loadingScreen');
const statusIndicator = document.getElementById('statusIndicator');

// Canvas setup
let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Hand tracking state
let handDetected = false;
let handX = width / 2;
let handY = height / 2;
let handZ = 0;
let handOpenness = 0;
let fingers = [];

// Particle system
const particles = [];
const PARTICLE_COUNT = 800;
const COLORS = [
    '#00ff88', // emerald green
    '#00cc66', // green
    '#39ff14', // neon green
    '#ff4444', // red accent
    '#00ffaa', // cyan green
    '#88ff00', // lime
];

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        // Start in a circle formation
        const angle = Math.random() * Math.PI * 2;
        const radius = 100 + Math.random() * 150;
        this.x = width / 2 + Math.cos(angle) * radius;
        this.y = height / 2 + Math.sin(angle) * radius;
        this.z = Math.random() * 2 - 1;
        
        this.vx = 0;
        this.vy = 0;
        
        this.size = 1.5 + Math.random() * 2.5;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.alpha = 0.3 + Math.random() * 0.7;
        
        this.angle = angle;
        this.orbitRadius = radius;
        this.orbitSpeed = 0.002 + Math.random() * 0.003;
        
        this.life = 1;
        this.decay = 0.001 + Math.random() * 0.002;
    }

    update() {
        // Calculate distance to hand
        const dx = handX - this.x;
        const dy = handY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Hand influence radius
        const influenceRadius = 250;
        
        if (handDetected && dist < influenceRadius) {
            // Particles are attracted to hand
            const force = (1 - dist / influenceRadius) * 0.8;
            const angle = Math.atan2(dy, dx);
            
            // Add some spiral motion
            const spiralAngle = angle + Math.PI / 3;
            
            this.vx += Math.cos(spiralAngle) * force * 2;
            this.vy += Math.sin(spiralAngle) * force * 2;
            
            // Particles get brighter near hand
            this.alpha = Math.min(1, this.alpha + 0.05);
        } else {
            // Return to orbital motion when no hand influence
            const centerX = handDetected ? handX : width / 2;
            const centerY = handDetected ? handY : height / 2;
            
            const toCenterX = centerX - this.x;
            const toCenterY = centerY - this.y;
            const toCenterDist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
            
            if (toCenterDist > 10) {
                // Gentle pull toward center
                this.vx += (toCenterX / toCenterDist) * 0.1;
                this.vy += (toCenterY / toCenterDist) * 0.1;
            }
            
            // Orbital motion
            this.angle += this.orbitSpeed;
            const targetX = centerX + Math.cos(this.angle) * this.orbitRadius;
            const targetY = centerY + Math.sin(this.angle) * this.orbitRadius;
            
            this.vx += (targetX - this.x) * 0.01;
            this.vy += (targetY - this.y) * 0.01;
        }
        
        // Apply velocity with damping
        this.vx *= 0.95;
        this.vy *= 0.95;
        
        this.x += this.vx;
        this.y += this.vy;
        
        // Boundary check - wrap around
        if (this.x < -50) this.x = width + 50;
        if (this.x > width + 50) this.x = -50;
        if (this.y < -50) this.y = height + 50;
        if (this.y > height + 50) this.y = -50;
        
        // Life cycle
        this.life -= this.decay;
        if (this.life <= 0) {
            this.reset();
            this.life = 1;
        }
    }

    draw() {
        const lifeAlpha = this.life * this.alpha;
        ctx.globalAlpha = lifeAlpha;
        ctx.fillStyle = this.color;
        
        // Draw particle with glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

// Initialize particles
for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
}

// Trail effect
const trails = [];
const MAX_TRAILS = 50;

function addTrail(x, y) {
    trails.push({ x, y, life: 1 });
    if (trails.length > MAX_TRAILS) {
        trails.shift();
    }
}

// Animation loop
function animate() {
    // Clear with fade effect for trails
    ctx.fillStyle = 'rgba(10, 10, 10, 0.15)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw connecting lines between nearby particles
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.05)';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i < particles.length; i += 5) { // Sample for performance
        const p1 = particles[i];
        for (let j = i + 5; j < particles.length; j += 10) {
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 80) {
                ctx.globalAlpha = (1 - dist / 80) * 0.3 * p1.life * p2.life;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        }
    }
    ctx.globalAlpha = 1;
    
    // Update and draw particles
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    // Draw hand glow effect (subtle, no visible tracking)
    if (handDetected) {
        const gradient = ctx.createRadialGradient(handX, handY, 0, handX, handY, 150);
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0.1)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 136, 0.05)');
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(handX, handY, 150, 0, Math.PI * 2);
        ctx.fill();
    }
    
    requestAnimationFrame(animate);
}

// MediaPipe Hands setup
function onResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        handDetected = true;
        
        const landmarks = results.multiHandLandmarks[0];
        
        // Get palm center (average of wrist and middle finger base)
        const wrist = landmarks[0];
        const middleBase = landmarks[9];
        
        // Map coordinates to canvas
        handX = (1 - wrist.x) * width; // Mirror effect
        handY = wrist.y * height;
        
        // Calculate hand openness based on finger tips distance from palm
        const tips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky tips
        let avgTipDist = 0;
        
        tips.forEach(tipIdx => {
            const tip = landmarks[tipIdx];
            const dx = tip.x - wrist.x;
            const dy = tip.y - wrist.y;
            avgTipDist += Math.sqrt(dx * dx + dy * dy);
        });
        
        handOpenness = avgTipDist / 4;
        
        // Store finger positions
        fingers = tips.map(idx => ({
            x: (1 - landmarks[idx].x) * width,
            y: landmarks[idx].y * height
        }));
        
        // Add to trail
        addTrail(handX, handY);
    } else {
        handDetected = false;
    }
}

// Initialize MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// Camera setup
let camera = null;

async function startCamera() {
    startScreen.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
    
    try {
        camera = new Camera(video, {
            onFrame: async () => {
                await hands.send({ image: video });
            },
            width: 640,
            height: 480
        });
        
        await camera.start();
        
        loadingScreen.classList.add('hidden');
        statusIndicator.classList.remove('hidden');
        
        // Start animation
        animate();
        
    } catch (error) {
        console.error('Error starting camera:', error);
        loadingScreen.innerHTML = `
            <p class="text-red-400">Gagal mengakses kamera</p>
            <p class="text-gray-500 text-sm mt-2">Pastikan Anda memberikan izin kamera</p>
            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
                Coba Lagi
            </button>
        `;
    }
}

// Start button event
startBtn.addEventListener('click', startCamera);

// Handle keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && startScreen.classList.contains('hidden') === false) {
        startCamera();
    }
});

// Initial render
ctx.fillStyle = '#0a0a0a';
ctx.fillRect(0, 0, width, height);

// Draw initial particle formation
for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
    const radius = 150 + Math.sin(i * 0.1) * 50;
    const x = width / 2 + Math.cos(angle) * radius;
    const y = height / 2 + Math.sin(angle) * radius;
    
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
}
ctx.globalAlpha = 1;
