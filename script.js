document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SEÇİMLERİ ---
    const mainPage = document.getElementById('main-page');
    const editorPage = document.getElementById('editor-page');
    const uploadButton = document.getElementById('upload-button');
    const imageUpload = document.getElementById('image-upload');
    const backButton = document.getElementById('back-button');
    const eraseButton = document.getElementById('erase-button');
    const eraseButtonText = document.getElementById('erase-button-text');
    const eraseLoader = document.getElementById('erase-loader');
    const canvasContainer = document.getElementById('canvas-container');
    const bgImage = document.getElementById('background-image');
    const canvas = document.getElementById('editor-canvas');
    const ctx = canvas.getContext('2d');
    const brushSizeSlider = document.getElementById('brush-size');
    const cookieBanner = document.getElementById('cookie-consent-banner');
    const acceptCookiesButton = document.getElementById('accept-cookies');
    const langSwitcher = document.getElementById('lang-switcher');
    const langButton = document.getElementById('lang-button');
    const langMenu = document.getElementById('lang-menu');
    const currentLangSpan = document.getElementById('current-lang');
    
    // --- DEĞİŞKENLER ---
    let brushSize = 30;
    let isDrawing = false;
    let originalImageFile = null;

    // --- SAYFA YÜKLENDİĞİNDE ÇALIŞACAK FONKSİYONLAR ---

    // 1. Dil tercihini kontrol et
    const savedLang = getCookie('lang') || 'TR';
    setLanguage(savedLang);

    // 2. Çerez onayını kontrol et
    if (!getCookie('cookies_accepted')) {
        cookieBanner.classList.remove('hidden');
    }

    // --- OLAY DİNLEYİCİLERİ (EVENT LISTENERS) ---

    // Resim Yükleme
    uploadButton.addEventListener('click', () => imageUpload.click());
    imageUpload.addEventListener('change', handleImageUpload);

    // Editörden Geri Dönme
    backButton.addEventListener('click', () => {
        mainPage.classList.remove('hidden');
        editorPage.classList.add('hidden');
        originalImageFile = null;
    });

    // Fırça Boyutunu Değiştirme
    brushSizeSlider.addEventListener('input', (e) => brushSize = e.target.value);

    // SİL BUTONU (Yapay Zeka Tetikleyici)
    eraseButton.addEventListener('click', handleErase);

    // Çerezleri Kabul Etme
    acceptCookiesButton.addEventListener('click', () => {
        setCookie('cookies_accepted', 'true', 365);
        cookieBanner.classList.add('hidden');
    });

    // Dil Değiştirme Menüsünü Aç/Kapa
    langButton.addEventListener('click', (e) => {
        e.stopPropagation();
        langMenu.classList.toggle('hidden');
    });

    // Dil Seçimi Yapma
    langMenu.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            const lang = e.target.getAttribute('data-lang');
            setLanguage(lang);
            setCookie('lang', lang, 365);
            langMenu.classList.add('hidden');
        }
    });

    // Dışarı tıklayınca dil menüsünü kapat
    document.addEventListener('click', () => langMenu.classList.add('hidden'));

    // Canvas Çizim Olayları
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('resize', setupCanvas);

    // --- ANA FONKSİYONLAR ---

    function handleImageUpload(event) {
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
    }

    async function handleErase() {
        eraseButton.disabled = true;
        eraseButtonText.classList.add('hidden');
        eraseLoader.classList.remove('hidden');

        try {
            const imageBase64 = await toBase64(originalImageFile);
            const maskBase64 = canvas.toDataURL();

            const response = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64, maskBase64 })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            bgImage.src = data.resultUrl;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

        } catch (error) {
            console.error("Silme işlemi başarısız oldu:", error);
            alert("Bir hata oluştu. Lütfen tekrar deneyin.");
        } finally {
            eraseButton.disabled = false;
            eraseButtonText.classList.remove('hidden');
            eraseLoader.classList.add('hidden');
        }
    }

    function setLanguage(lang) {
        currentLangSpan.textContent = lang;
        document.querySelectorAll('.lang-tr, .lang-en').forEach(el => {
            el.style.display = el.classList.contains(`lang-${lang.toLowerCase()}`) ? 'inline' : 'none';
        });
        document.documentElement.lang = lang.toLowerCase();
    }
    
    // --- CANVAS FONKSİYONLARI ---
    function setupCanvas() {
        const { width, height } = bgImage.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
    }
    function startDrawing(e) { isDrawing = true; draw(e); }
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

    // --- YARDIMCI (HELPER) FONKSİYONLAR ---
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
    
    // Animasyon için Intersection Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
});
