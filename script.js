// ESTADO E NAVEGAÇÃO DE CENAS
let currentSceneIndex = 0;
let isTransitioning = false;

const scenes = document.querySelectorAll('.scene');
const transitionOverlay = document.getElementById('transition-overlay');
const bgMusic = document.getElementById('bg-music');
const audioControl = document.getElementById('audio-control');
const audioIcon = document.getElementById('audio-icon');

// Imagens a carregar previamente
const imageSources = [
    'assets/images/01-abertura.jpg',
    'assets/images/02-floresta.jpg',
    'assets/images/03-colina.jpg',
    'assets/images/04-lirios.jpg',
    'assets/images/05-carta.jpg',
    'assets/images/06-final.jpg'
];

document.addEventListener('DOMContentLoaded', () => {
    preloadImages();
    initParticles();
    setupAudioControl();
    verifyImageSources();
});

// Pré-carrega as imagens
function preloadImages() {
    imageSources.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Trata erro de carregamento das imagens
function verifyImageSources() {
    scenes.forEach(scene => {
        const bg = scene.querySelector('.scene-background');
        if (bg) {
            const urlMatch = bg.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
            if (urlMatch && urlMatch[1]) {
                const img = new Image();
                img.src = urlMatch[1];
                img.onerror = () => {
                    console.warn(`Imagem não encontrada: ${urlMatch[1]}. Usando gradiente fallback.`);
                    bg.classList.add('fallback');
                };
            }
        }
    });
}

// Troca de cena com transição de fade suave
function showScene(targetIndex) {
    if (isTransitioning || targetIndex === currentSceneIndex || targetIndex >= scenes.length) {
        return;
    }

    isTransitioning = true;
    transitionOverlay.classList.add('active');

    setTimeout(() => {
        scenes[currentSceneIndex].classList.remove('active');
        currentSceneIndex = targetIndex;
        scenes[currentSceneIndex].classList.add('active');

        setTimeout(() => {
            transitionOverlay.classList.remove('active');
            isTransitioning = false;
        }, 300);

    }, 800);
}

function nextScene() {
    if (currentSceneIndex === 0 && bgMusic.paused) {
        playAudio();
    }
    showScene(currentSceneIndex + 1);
}

function restartJourney() {
    showScene(0);
}

// CONTROLE DE MÚSICA DE FUNDO
function setupAudioControl() {
    bgMusic.volume = 0.3;

    audioControl.addEventListener('click', () => {
        if (bgMusic.paused) {
            playAudio();
        } else {
            pauseAudio();
        }
    });
}

function playAudio() {
    bgMusic.play().then(() => {
        audioIcon.textContent = '🎵';
        audioControl.style.opacity = '1';
    }).catch(err => {
        console.log("Autoplay retido pelo navegador. Aguardando interação.", err);
    });
}

function pauseAudio() {
    bgMusic.pause();
    audioIcon.textContent = '🔇';
    audioControl.style.opacity = '0.5';
}

// EFEITO DE PARTÍCULAS MÁGICAS NO CANVAS
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    const ctx = canvas.getContext('2d');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const numParticles = 35;
    const particles = [];

    for (let i = 0; i < numParticles; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.5 + 0.2,
            speedX: Math.random() * 0.6 - 0.2,
            speedY: Math.random() * -0.5 - 0.2,
            pulse: Math.random() * 0.02 + 0.005
        });
    }

    function renderParticles() {
        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;

            p.alpha += Math.sin(Date.now() * p.pulse) * 0.005;

            if (p.y < -10) p.y = height + 10;
            if (p.x > width + 10) p.x = -10;
            if (p.x < -10) p.x = width + 10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 245, 220, ${Math.abs(p.alpha)})`;
            ctx.fill();
        });

        requestAnimationFrame(renderParticles);
    }

    renderParticles();
}