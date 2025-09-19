import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // Tarayıcıdan Base64 formatında gelen resim ve maskeyi alıyoruz
    const { imageBase64, maskBase64 } = req.body;

    if (!imageBase64 || !maskBase64) {
      return res.status(400).json({ error: "imageBase64 and maskBase64 are required" });
    }

    console.log("Running the LaMa inpainting model...");

    const output = await replicate.run(
      "andreasjansson/lama-inpainting:d22d583095b6c2a417e4f3f809d3c52e05a5015b63d76b1f893e36fe711e1f78",
      {
        input: {
          image: imageBase64, // Base64 verisini doğrudan gönder
          mask: maskBase64    // Base64 verisini doğrudan gönder
        }
      }
    );
    
    // Replicate'ten gelen sonuç bir URL dizisi olabilir, ilkini alıyoruz.
    const resultImageUrl = Array.isArray(output) ? output[0] : output;

    console.log("Model output URL:", resultImageUrl);
    
    // Yeni resmin URL'sini tarayıcıya geri gönderiyoruz.
    res.status(200).json({ resultUrl: resultImageUrl });

  } catch (error) {
    console.error("Error running the model:", error);
    res.status(500).json({ error: "Failed to run the model", details: error.message });
  }
}