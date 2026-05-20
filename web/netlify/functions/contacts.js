const https = require('https')

exports.handler = async function() {
  const key = process.env.VITE_SHEETS_API_KEY
  const id  = process.env.VITE_SHEETS_SPREADSHEET_ID

  if (!key || !id) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing config' }) }
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/A:E?key=${key}`

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ raw: json.values })
          })
        } catch(e) {
          resolve({ statusCode: 500, body: JSON.stringify({ error: 'Parse failed' }) })
        }
      })
    }).on('error', err => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: err.message }) })
    })
  })
}
