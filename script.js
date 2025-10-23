const GEMINI_API_KEY = "AIzaSyBGfwFELLCnUyk4nEWnVKpljXJOPnU3JoQ";           
const HF_API_KEY = "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";     

document.getElementById("generateBtn").addEventListener("click", async () => {
  const ingredients = document.getElementById("ingredients").value.trim();
  const cuisine = document.getElementById("cuisine").value;
  const language = document.getElementById("language").value || "English";
  const preference = document.getElementById("preference").value;
  const output = document.getElementById("output");
  const loading = document.getElementById("loading");

  if (!ingredients) {
    output.innerHTML = "⚠️ Please enter some ingredients!";
    return;
  }

  loading.classList.remove("hidden");
  output.innerHTML = "";

  try {
 
   const prompt = `
Generate a ${preference || ""} ${cuisine || ""} recipe using these ingredients or dish name: ${ingredients}.
Write all recipe content in ${language || "English"}.

⚠️  But the "TITLE:" line must always be in English,
even if the rest of the recipe is written in another language.

Include:
- The first line: TITLE: <Recipe Title in English>
- Then the rest of the recipe text with sections for:
  • Estimated Cooking Time
  • Serving Size
  • Estimated Calories per serving
  • Ingredients list
  • Step-by-step Instructions
  • Tips/Variations
  • Health Benefits
Use clear formatting and headings.
`.trim();

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Gemini API error");

    const fullText = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("\n");

    const { title, body } = extractTitleAndBody(fullText);
    console.log("🔹 Recipe title:", title);


    const imagePrompt = buildFoodPrompt(title, cuisine, preference);
    const imageUrl = await generateImageFromHuggingFace(imagePrompt);

  
    output.innerHTML = `
      <div class="recipe-card">
        <img src="${imageUrl}" alt="${escapeHtml(title)}" class="food-image">
        <h2 class="recipe-title">${escapeHtml(title)}</h2>
        <div class="recipe-details">${escapeHtml(body).replace(/\n/g, "<br>")}</div>
      </div>`;
  } catch (err) {
    console.error("❌ Error:", err);
    output.innerHTML = "⚠️ Error generating recipe or image. See console.";
  } finally {
    loading.classList.add("hidden");
  }
});


function extractTitleAndBody(text = "") {
  const lines = text.split(/\r?\n/);
  let title = null;
  let i = 0;
  for (; i < lines.length; i++) {
    const m = lines[i].match(/^\s*TITLE\s*:\s*(.+)$/i);
    if (m) { title = m[1].trim(); i++; break; }
  }
  if (!title) {
    const h = text.match(/^#+\s*(.+)$/m);
    const plain = lines.find((l) => l.trim().length > 5);
    title = (h?.[1] || plain || "Delicious Dish").trim();
  }
  const body = lines.slice(i).join("\n").trim();
  return { title, body };
}

function buildFoodPrompt(title, cuisine = "", preference = "") {
  return `A high-quality, realistic photograph of ${title}, ${preference || ""} ${cuisine || ""} style, beautifully plated, professional food photography, soft lighting, appetizing look, bright background, depth of field.`;
}

async function generateImageFromHuggingFace(prompt) {
  const modelUrl = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";
  try {
    const res = await fetch(modelUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    if (!res.ok) throw new Error(`Hugging Face error ${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);  
  } catch (e) {
    console.error("Hugging Face image generation error:", e);
    return "https://via.placeholder.com/600x400?text=Food+Image";
  }
}

function escapeHtml(s = "") {
  return s.replace(/&/g,"&amp;")
          .replace(/</g,"&lt;")
          .replace(/>/g,"&gt;")
          .replace(/"/g,"&quot;")
          .replace(/'/g,"&#039;");
}




