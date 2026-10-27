const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');
const toggleEmojiBtn = document.getElementById('toggleEmojiBtn');
const captureBtn = document.getElementById('captureBtn');
const galleryItems = document.getElementById('gallery-items');

let isEmojiActive = false;
let detectedFaces = [];

// Enregistrement du Service Worker pour la PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
    .then(() => console.log('Service Worker enregistré avec succès.'))
    .catch(err => console.error('Erreur SW:', err));
}

// Bouton d'activation du filtre
toggleEmojiBtn.addEventListener('click', () => {
    isEmojiActive = !isEmojiActive;
    toggleEmojiBtn.classList.toggle('active', isEmojiActive);
    toggleEmojiBtn.innerText = isEmojiActive ? "Désactiver Emoji" : "Activer Emoji 😎";
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
            video: { facingMode: 'user', width: 1280, height: 720 }
        });
        videoElement.srcObject = stream;
    } catch (error) {
        console.error("Erreur d'accès à la caméra:", error);
        alert("Impossible d'accéder à la caméra.");
    }
}

// Fonction exécutée par MediaPipe à chaque fois qu'un visage est détecté
function onResults(results) {
    detectedFaces = results.detections;
}

// Initialisation de l'IA MediaPipe
const faceDetection = new FaceDetection({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
}});

faceDetection.setOptions({
    model: 'short', // 'short' pour les visages proches (caméra frontale)
    minDetectionConfidence: 0.5
});
faceDetection.onResults(onResults);

// Boucle principale d'affichage et de détection
async function renderLoop() {
    if (videoElement.readyState === 4) { // Si la vidéo est prête
        
        // 1. Envoyer l'image à l'IA si le filtre est actif
        if (isEmojiActive) {
            await faceDetection.send({image: videoElement});
        }

        // 2. Dessiner la vidéo sur le canvas
        // (Effet miroir pour la caméra frontale)
        canvasCtx.save();
        canvasCtx.scale(-1, 1);
        canvasCtx.translate(-canvasElement.width, 0);
        
        // Calcul pour couvrir tout le canvas sans déformer (Object-fit cover manuel)
        const vRatio = canvasElement.width / videoElement.videoWidth;
        const hRatio = canvasElement.height / videoElement.videoHeight;
        const ratio  = Math.max(vRatio, hRatio);
        const centerShift_x = (canvasElement.width - videoElement.videoWidth * ratio) / 2;
        const centerShift_y = (canvasElement.height - videoElement.videoHeight * ratio) / 2;  
        
        canvasCtx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight,
                            centerShift_x, centerShift_y, videoElement.videoWidth * ratio, videoElement.videoHeight * ratio);
        
        // 3. Dessiner l'emoji sur les visages détectés
        if (isEmojiActive && detectedFaces.length > 0) {
            detectedFaces.forEach(detection => {
                const box = detection.boundingBox;
                // Conversion des coordonnées relatives (0 à 1) en pixels
                const x = (box.xMin * videoElement.videoWidth * ratio) + centerShift_x;
                const y = (box.yMin * videoElement.videoHeight * ratio) + centerShift_y;
                const width = box.width * videoElement.videoWidth * ratio;
                const height = box.height * videoElement.videoHeight * ratio;

                // Dessin de l'emoji 😎
                canvasCtx.font = `${Math.max(width, height) * 1.5}px Arial`;
                canvasCtx.textAlign = 'center';
                canvasCtx.textBaseline = 'middle';
                // Le x est inversé à cause du scale(-1, 1) précédent
                canvasCtx.fillText("😎", videoElement.videoWidth * ratio - x - width/2, y + height/2);
            });
        }
        canvasCtx.restore();
    }
    requestAnimationFrame(renderLoop);
}

// Lancer le système
initCamera().then(() => {
    videoElement.play();
    renderLoop();
});

// Capturer une photo
captureBtn.addEventListener('click', () => {
    const dataUrl = canvasElement.toDataURL('image/jpeg', 0.9);
    
    // Créer un élément miniature dans la galerie
    const img = document.createElement('img');
    img.src = dataUrl;
    
    // Permettre le téléchargement au clic sur la miniature
    img.onclick = () => {
        const link = document.createElement('a');
        link.download = `fun-picture-${Date.now()}.jpg`;
        link.href = dataUrl;
        link.click();
    };
    
    galleryItems.prepend(img);
});