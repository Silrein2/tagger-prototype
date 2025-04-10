require('dotenv').config()
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence')
const { Storage } = require('@google-cloud/storage')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const videoClient = new VideoIntelligenceServiceClient({
  keyFilename: 'key.json',
})

const gcs = new Storage({
  keyFilename: 'key.json',
})
const bucketName = 'tagger-prototype-test'

app.use(cors())
app.use(express.json())

app.post('/upload', upload.single('video'), async (req, res) => {
  const file = req.file
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded.' })
  }

  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()

  const formattedDate = `${day}-${month}-${year}`

  const fileName = `${formattedDate}-${file.originalname}`

  //const fileName = file.originalname //for testing
  const filePath = path.join('uploads', fileName)

  await gcs.bucket(bucketName).file(fileName).save(file.buffer)
  console.log(`Uploaded video to gs://${bucketName}/${fileName}`)

  try {
    const { labels, transcriptions } = await analyzeVideo(`gs://${bucketName}/${fileName}`)
    console.log(`Sending video for analysis: gs://${bucketName}/${fileName}`)

    // OpenAI part
    // const summary = await generateSummary(labels, transcriptions)
    return res.json({
      message: 'File uploaded and analyzed',
      labels,
      transcriptions,
      // summary, // OpenAI part
    })
  } catch (error) {
    console.error('Error processing video:', error)
    return res.status(500).json({ message: 'Error processing video' })
  }
})

async function analyzeVideo(inputUri) {
  console.log(`Sending video for analysis: ${inputUri}`)

  const request = {
    inputUri: inputUri,
    features: ['LABEL_DETECTION', 'SPEECH_TRANSCRIPTION'],
    videoContext: {
      speechTranscriptionConfig: {
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableSpeakerDiarization: true,
        diarizationSpeakerCount: 10,
      },
    },
  }

  console.log('Sending request to Video Intelligence API:', JSON.stringify(request, null, 2))

  try {
    const [operation] = await videoClient.annotateVideo(request)
    console.log('Waiting for operation to complete...')

    const [response] = await operation.promise()

    console.log('Video Intelligence API response:', JSON.stringify(response, null, 2))

    if (response.annotationResults && response.annotationResults.length > 0) {
      const annotationResult = response.annotationResults[0]

      if (annotationResult.error) {
        console.error(
          'Error in annotation result:',
          JSON.stringify(annotationResult.error, null, 2),
        )
        throw new Error(
          `Video Intelligence API error for ${inputUri}: ${annotationResult.error.message} (Code: ${annotationResult.error.code})`,
        )
      }

      let transcriptions = ''
      if (
        annotationResult.speechTranscriptions &&
        annotationResult.speechTranscriptions.length > 0
      ) {
        transcriptions = annotationResult.speechTranscriptions
          .map(
            (transcription) => transcription.alternatives[0]?.transcript || '', // Get transcript from the first alternative
          )
          .join(' \n')
        console.log('Found transcriptions.')
      } else {
        console.warn('No speech transcription results found in the response.')
      }

      const labels =
        annotationResult.segmentLabelAnnotations?.map((label) => label.entity.description) || []

      return { labels, transcriptions }
    } else {
      console.error('No annotation results found in the response.')
      throw new Error('Video Intelligence API returned an empty or invalid response.')
    }
  } catch (error) {
    console.error('Error during video analysis operation:', error)
    throw error
  }
}

// OpenAI part
// async function generateSummary(labels, transcription) {
//   const prompt = `Summarize the following video content:\n\nLabels: ${labels.join(', ')}\nTranscription: ${transcription}`
//   const response = await openai.createCompletion({
//     model: 'text-davinci-003',
//     prompt: prompt,
//     max_tokens: 300,
//   })
//   return response.data.choices[0].text.trim()
// }

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
