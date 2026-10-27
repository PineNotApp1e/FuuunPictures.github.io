const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');
const toggleEmojiBtn = document.getElementById('toggleEmojiBtn');
const togglePixelBtn = document.getElementById('togglePixelBtn');
const captureBtn = document.getElementById('captureBtn');
const galleryItems = document.getElementById('gallery-items');

let isEmojiActive = false;
let isPixelActive = false;
let detectedFaces = [];
let isDetecting = false; // Verrou pour ne pas surcharger l'IA

// Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error('Erreur SW:', err));
}

// Boutons des filtres
toggleEmojiBtn.addEventListener('click', () => {
    isEmojiActive = !isEmojiActive;
    toggleEmojiBtn.classList.toggle('active', isEmojiActive);
});

togglePixelBtn.addEventListener('click', () => {
    isPixelActive = !isPixelActive;
    togglePixelBtn.classList.toggle('active', isPixelActive);
});

// Ajuster la taille du canvas
function resizeCanvas() {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Initialisation de la caméra
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        videoElement.srcObject = stream;
    } catch (error) {
        console.error("Erreur d'accès à la caméra:", error);
        alert("Impossible d'accéder à la caméra.");
    }
}

// Initialisation de l'IA MediaPipe
const faceDetection = new FaceDetection({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${file}`;
}});

faceDetection.setOptions({
    model: 'short',
    minDetectionConfidence: 0.5
});

faceDetection.onResults((results) => {
    detectedFaces = results.detections;
});

// Boucle principale
async function renderLoop() {
    if (videoElement.readyState === 4) {
        
        // 1. Envoyer à l'IA uniquement si on ne traite pas déjà une image
        if (isEmojiActive && !isDetecting) {
            isDetecting = true;
            faceDetection.send({image: videoElement}).then(() => {
                isDetecting = false;
            }).catch(() => {
                isDetecting = false;
            });
        }

        // 2. Dessiner la vidéo de base
        canvasCtx.save();
        canvasCtx.scale(-1, 1); // Effet miroir
        canvasCtx.translate(-canvasElement.width, 0);
        
        const vRatio = canvasElement.width / videoElement.videoWidth;
        const hRatio = canvasElement.height / videoElement.videoHeight;
        const ratio  = Math.max(vRatio, hRatio);
        const centerShift_x = (canvasElement.width - videoElement.videoWidth * ratio) / 2;
        const centerShift_y = (canvasElement.height - videoElement.videoHeight * ratio) / 2;  
        
        canvasCtx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight,
                            centerShift_x, centerShift_y, videoElement.videoWidth * ratio, videoElement.videoHeight * ratio);
        canvasCtx.restore();

        // 3. Appliquer l'effet Pixelisation (réduction puis agrandissement brut)
        if (isPixelActive) {
            const pixelScale = 0.03; // Taille des pixels (plus le chiffre est petit, plus les pixels sont gros)
            const w = canvasElement.width * pixelScale;
            const h = canvasElement.height * pixelScale;
            
            canvasCtx.imageSmoothingEnabled = false; // Désactiver le lissage
            // On dessine le canvas sur lui-même en tout petit
            canvasCtx.drawImage(canvasElement, 0, 0, canvasElement.width, canvasElement.height, 0, 0, w, h);
            // On le ré-étire sur toute la taille
            canvasCtx.drawImage(canvasElement, 0, 0, w, h, 0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.imageSmoothingEnabled = true; // Réactiver pour le reste
        }

        // 4. Dessiner l'emoji (par dessus la vidéo et les pixels)
        if (isEmojiActive && detectedFaces.length > 0) {
            canvasCtx.save();
            canvasCtx.scale(-1, 1);
            canvasCtx.translate(-canvasElement.width, 0);
            
            detectedFaces.forEach(detection => {
                const box = detection.boundingBox;
                const x = (box.xMin * videoElement.videoWidth * ratio) + centerShift_x;
                const y = (box.yMin * videoElement.videoHeight * ratio) + centerShift_y;
                const width = box.width * videoElement.videoWidth * ratio;
                const height = box.height * videoElement.videoHeight * ratio;

                canvasCtx.font = `${Math.max(width, height) * 1.5}px Arial`;
                canvasCtx.textAlign = 'center';
                canvasCtx.textBaseline = 'middle';
                canvasCtx.fillText("😎", videoElement.videoWidth * ratio - x - width/2, y + height/2);
            });
            canvasCtx.restore();
        }
    }
    requestAnimationFrame(renderLoop);
}

// Lancement
initCamera().then(() => {
    videoElement.play();
    renderLoop();
});

// Capture photo
captureBtn.addEventListener('click', () => {
    const dataUrl = canvasElement.toDataURL('image/jpeg', 0.9);
    const img = document.createElement('img');
    img.src = dataUrl;
    img.onclick = () => {
        const link = document.createElement('a');
        link.download = `fun-picture-${Date.now()}.jpg`;
        link.href = dataUrl;
        link.click();
    };
    galleryItems.prepend(img);
});
