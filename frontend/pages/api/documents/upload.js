import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header' })
    }

    const form = formidable({})
    const [fields, files] = await form.parse(req)
    
    const file = files.file?.[0]
    if (!file) {
      return res.status(400).json({ message: 'No file provided' })
    }

    // Create FormData for the backend request
    const FormData = require('form-data')
    const formData = new FormData()
    
    // Read the file and append to FormData
    const fileStream = fs.createReadStream(file.filepath)
    formData.append('file', fileStream, {
      filename: file.originalFilename,
      contentType: file.mimetype,
    })

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        ...formData.getHeaders(),
      },
      body: formData,
    })

    const data = await response.json()
    
    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}