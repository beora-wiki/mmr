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
 * Multi-turn chat with optional function-call tool support.
 *
 * @param {{
 *   system: string,
 *   messages: Array<{role: 'user'|'assistant', content: string}>,
 *   tools?: Array<object>,              // functionDeclarations array
 *   toolHandler?: (name: string, args: object) => Promise<object>
 * }} opts
 * @returns {Promise<{ text: string, calledTool: boolean }>}
 */
async function generateChat({ system, messages, tools, toolHandler }) {
  const contents = buildContents(messages)

  const config = {
    systemInstruction: system,
    temperature:       0.5,
    maxOutputTokens:   600
  }
  if (tools && tools.length > 0) {
    config.tools = [{ functionDeclarations: tools }]
  }

  const response = await getClient().models.generateContent({
    model:   getModel(),
    contents,
    config
  })

  const parts = response.candidates?.[0]?.content?.parts || []
  const functionCallPart = parts.find(p => p.functionCall)

  if (functionCallPart && toolHandler) {
    const { name, args } = functionCallPart.functionCall

    let toolResult
    try {
      toolResult = await toolHandler(name, args || {})
    } catch (err) {
      toolResult = { error: err.message }
    }

    const updatedContents = [
      ...contents,
      { role: "model", parts: [{ functionCall: { name, args: args || {} } }] },
      { role: "user",  parts: [{ functionResponse: { name, response: toolResult } }] }
    ]

    const followUp = await getClient().models.generateContent({
      model:   getModel(),
      contents: updatedContents,
      config: {
        systemInstruction: system,
        temperature:       0.5,
        maxOutputTokens:   600
      }
    })

    return { text: stripMarkdown(followUp.text ?? ""), calledTool: true }
  }

  return { text: stripMarkdown(response.text ?? ""), calledTool: false }
}

function buildContents(messages) {
  return messages.map(m => ({
    role:  m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }]
  }))
}

function stripMarkdown(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^#{1,6}\s/gm, "")
    .replace(/_{1,2}/g, "")
    .replace(/`{1,3}/g, "")
    .trim()
}

module.exports = { generateChat, getModel }
