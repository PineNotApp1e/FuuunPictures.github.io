const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');
const captureBtn = document.getElementById('captureBtn');
const galleryItems = document.getElementById('gallery-items');

// Boutons des effets
const btnPixel = document.getElementById('btnPixel');
const btnSepia = document.getElementById('btnSepia');
const btnBw = document.getElementById('btnBw');
const btnInvert = document.getElementById('btnInvert');

// État actuel de l'effet ('none', 'pixel', 'sepia', 'bw', 'invert')
let currentEffect = 'none';

// Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error('Erreur SW:', err));
}

// Fonction pour gérer l'activation d'un effet
function setEffect(effectName, btnElement) {
    // Si on clique sur l'effet déjà actif, on le désactive
    if (currentEffect === effectName) {
        currentEffect = 'none';
    } else {
        currentEffect = effectName;
    }
    
    // Retirer la classe 'active' de tous les boutons
    [btnPixel, btnSepia, btnBw, btnInvert].forEach(btn => btn.classList.remove('active'));
    
    // Ajouter la classe 'active' au bouton cliqué si un effet est actif
    if (currentEffect !== 'none') {
        btnElement.classList.add('active');
    }
}

// Écouteurs d'événements pour les boutons
btnPixel.addEventListener('click', () => setEffect('pixel', btnPixel));
btnSepia.addEventListener('click', () => setEffect('sepia', btnSepia));
btnBw.addEventListener('click', () => setEffect('bw', btnBw));
btnInvert.addEventListener('click', () => setEffect('invert', btnInvert));

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

// Boucle principale d'affichage
function renderLoop() {
    if (videoElement.readyState === 4) {
        canvasCtx.save();
        
        // Effet miroir pour la caméra frontale
        canvasCtx.scale(-1, 1);
        canvasCtx.translate(-canvasElement.width, 0);
        
        // Calculs pour remplir l'écran sans déformer l'image
        const vRatio = canvasElement.width / videoElement.videoWidth;
        const hRatio = canvasElement.height / videoElement.videoHeight;
        const ratio  = Math.max(vRatio, hRatio);
        const centerShift_x = (canvasElement.width - videoElement.videoWidth * ratio) / 2;
        const centerShift_y = (canvasElement.height - videoElement.videoHeight * ratio) / 2;  
        
        // Appliquer les filtres CSS natifs du Canvas
        if (currentEffect === 'sepia') canvasCtx.filter = 'sepia(100%)';
        else if (currentEffect === 'bw') canvasCtx.filter = 'grayscale(100%)';
        else if (currentEffect === 'invert') canvasCtx.filter = 'invert(100%)';
        else canvasCtx.filter = 'none'; // Pas de filtre CSS

        // Dessiner la vidéo
        canvasCtx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight,
                            centerShift_x, centerShift_y, videoElement.videoWidth * ratio, videoElement.videoHeight * ratio);
        
        // Réinitialiser le filtre pour ne pas impacter d'autres éléments
        canvasCtx.filter = 'none';

        // Appliquer l'effet Pixelisation (qui demande une manipulation différente)
        if (currentEffect === 'pixel') {
            const pixelScale = 0.03; 
            const w = canvasElement.width * pixelScale;
            const h = canvasElement.height * pixelScale;
            
            canvasCtx.imageSmoothingEnabled = false; // Rendu brut
            // Dessiner l'image en tout petit
            canvasCtx.drawImage(canvasElement, 0, 0, canvasElement.width, canvasElement.height, 0, 0, w, h);
            // La ré-agrandir
            canvasCtx.drawImage(canvasElement, 0, 0, w, h, 0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.imageSmoothingEnabled = true; // Remettre par défaut
        }

        canvasCtx.restore();
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
