const { GoogleGenAI } = require("@google/genai")

let _ai = null

function getClient() {
  if (!_ai) {
    _ai = new GoogleGenAI({
      vertexai: true,
      project:  process.env.VERTEX_AI_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "beora-492609",
      location: process.env.VERTEX_AI_LOCATION || "us-central1"
    })
  }
  return _ai
}

function getModel() {
  return process.env.DEFAULT_MODEL || "gemini-2.5-flash"
}

/**
 * Multi-turn chat via Vertex AI (BAA-covered, same path as beora-agent).
 * @param {{ system: string, messages: Array<{role: 'user'|'assistant', content: string}> }} opts
 */
async function generateChat({ system, messages }) {
  const contents = messages.map(m => ({
    role:  m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }]
  }))

  const response = await getClient().models.generateContent({
    model:    getModel(),
    contents,
    config: {
      systemInstruction: system,
      temperature:       0.4,
      maxOutputTokens:   500
    }
  })

  return response.text ?? ""
}

module.exports = { generateChat, getModel }
