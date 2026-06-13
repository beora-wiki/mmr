const admin = require("firebase-admin")

let _initialized = false

function initFirebase() {
  if (_initialized) return
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "beora-492609"
  if (!admin.apps.length) {
    admin.initializeApp({ projectId })
  }
  _initialized = true
}

async function verifyIdToken(idToken) {
  initFirebase()
  return admin.auth().verifyIdToken(idToken)
}

module.exports = { verifyIdToken }
