require("dotenv").config();
const functions = require("firebase-functions");
const fetch = require("node-fetch");
const cors = require("cors");

// Güvenlik için, sadece Vercel'deki sitemizden gelen isteklere
// izin veriyoruz. Bu, CORS hatasını kesin olarak çözer.
const corsHandler = cors({ origin: "https://retouchc-l4w4.vercel.app" });

exports.generativeApiProxy = functions.https.onRequest((req, res) => {
  // Gelen isteği CORS işleyicisiyle sarmalıyoruz.
  corsHandler(req, res, async () => {
    // Sadece POST metoduyla gelen istekleri kabul ediyoruz.
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      // İstekten resim ve prompt verilerini alıyoruz.
      const { prompt, image } = req.body;
      if (!prompt || !image) {
        return res.status(400).send("Bad Request: 'prompt' and 'image' are required.");
      }

      // Güvenli .env.local dosyasından API anahtarını okuyoruz.
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("Gemini API key not found in environment variables!");
        // Kullanıcıya bu mesajı göstermiyoruz, sadece log'larda görünüyor.
        throw new Error("API key not configured on the server.");
      }

      // Google'ın Gemini API adresini oluşturuyoruz.
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      // Gemini API'sine göndereceğimiz isteğin içeriğini hazırlıyoruz.
      const payload = {
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/png", data: image } },
          ],
        }],
      };

      // Hazırladığımız isteği Google'a gönderiyoruz.
      const apiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Eğer Google'dan bir hata dönerse, bunu log'layıp hata fırlatıyoruz.
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error("Gemini API Error:", errorText);
        throw new Error(`API Error: ${apiResponse.status}`);
      }

      // Google'dan gelen başarılı cevabı JSON formatına çeviriyoruz.
      const result = await apiResponse.json();
      // Gelen cevabın içinden işlenmiş resmin base64 verisini bulup çıkarıyoruz.
      const base64Data = result?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;

      // Eğer resim verisi bulunduysa, bunu web sitesine geri gönderiyoruz.
      if (base64Data) {
        res.status(200).json({ base64Data: base64Data });
      } else {
        // Eğer resim verisi gelmediyse, bir hata gönderiyoruz.
        res.status(500).send("No image data received from API.");
      }
    } catch (error) {
      // Beklenmedik bir hata olursa bunu log'layıp genel bir hata mesajı dönüyoruz.
      console.error("Error in Cloud Function:", error);
      res.status(500).send("Internal Server Error");
    }
  });
});

