document.addEventListener('DOMContentLoaded', () => {
    // Sayfa elementlerini seçme
    const mainPage = document.getElementById('main-page');
    const editorPage = document.getElementById('editor-page');
    const uploadButton = document.getElementById('upload-button');
    const imageUpload = document.getElementById('image-upload');
    const backButton = document.getElementById('back-button');
    const eraseButton = document.getElementById('erase-button');
    const eraseButtonText = document.getElementById('erase-button-text');
    const eraseLoader = document.getElementById('erase-loader');
    
    // Canvas elementleri
    const canvasContainer = document.getElementById('canvas-container');
    const bgImage = document.getElementById('background-image');
    const canvas = document.getElementById('editor-canvas');
    const ctx = canvas.getContext('2d');
    
    // Fırça ayarları
    const brushSizeSlider = document.getElementById('brush-size');
    let brushSize = 30;
    let isDrawing = false;
    
    let originalImageFile = null;

    // --- BUTON OLAYLARI ---

    // Resim Yükleme Butonu
    uploadButton.addEventListener('click', () => imageUpload.click());
    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            originalImageFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                bgImage.src = e.target.result;
                bgImage.onload = () => {
                    setupCanvas();
                    mainPage.classList.add('hidden');
                    editorPage.classList.remove('hidden');
                }
            };
            reader.readAsDataURL(file);
        }
    });

    // Geri Butonu
    backButton.addEventListener('click', () => {
        mainPage.classList.remove('hidden');
        editorPage.classList.add('hidden');
        originalImageFile = null; // Resmi temizle
    });

    // Fırça Boyutu Ayarı
    brushSizeSlider.addEventListener('input', (e) => {
        brushSize = e.target.value;
    });

    // Sil Butonu (YAPAY ZEKA BAĞLANTISI)
    eraseButton.addEventListener('click', async () => {
        // Yükleniyor durumunu başlat
        eraseButton.disabled = true;
        eraseButtonText.classList.add('hidden');
        eraseLoader.classList.remove('hidden');

        try {
            // 1. Orijinal resmi Base64 formatına çevir
            const imageBase64 = await toBase64(originalImageFile);

            // 2. Canvas üzerine çizilen maskeyi Base64 formatına çevir
            const maskBase64 = canvas.toDataURL();

            // 3. Backend'e isteği gönder
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: imageBase64,
                    maskBase64: maskBase64
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // 4. Sonucu al ve ekrandaki resmi güncelle
            bgImage.src = data.resultUrl;
            // Maskeyi temizle
            ctx.clearRect(0, 0, canvas.width, canvas.height);

        } catch (error) {
            console.error("Silme işlemi başarısız oldu:", error);
            alert("Bir hata oluştu. Lütfen tekrar deneyin.");
        } finally {
            // Yükleniyor durumunu bitir
            eraseButton.disabled = false;
            eraseButtonText.classList.remove('hidden');
            eraseLoader.classList.add('hidden');
        }
    });

    // --- CANVAS FONKSİYONLARI ---
    
    function setupCanvas() {
        const { width, height } = bgImage.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
    }

    function startDrawing(e) {
        isDrawing = true;
        draw(e);
    }
    function stopDrawing() { isDrawing = false; ctx.beginPath(); }
    function draw(e) {
        if (!isDrawing) return;
        ctx.lineWidth = brushSize;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('resize', setupCanvas);
    
    // --- YARDIMCI FONKSİYONLAR ---

    // Dosyayı Base64'e çeviren fonksiyon
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    // Fiyatlandırma kartları için animasyon
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-reveal').forEach(el => {
        observer.observe(el);
    });
});