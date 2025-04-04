const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

// Set up storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/') // Directory to save the uploaded files
  },
  filename: (req, file, cb) => {
    const date = new Date()
    const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}_${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`
    cb(null, formattedDate + '-' + file.originalname) // Adds a formatted date
  },
})

const upload = multer({ storage: storage })

// Middleware
app.use(cors())
app.use(express.json())

// Basic route
app.get('/', (req, res) => {
  res.send('Video Uploader API is running.')
})

// File upload route
app.post('/upload', upload.single('video'), (req, res) => {
  console.log('Received file:', req.file) // Log the received file
  if (req.file) {
    return res.json({ message: 'File uploaded successfully', file: req.file })
  } else {
    return res.status(400).json({ message: 'No file uploaded' })
  }
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
