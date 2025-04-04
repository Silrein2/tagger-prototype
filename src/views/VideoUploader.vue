<template>
  <div class="uploader">
    <h1>Upload Videos</h1>

    <div class="drop-area" @dragover.prevent @drop="handleDrop">
      <p>Drag and drop your video files here</p>
    </div>

    <input
      type="file"
      @change="handleFileChange"
      multiple
      accept="video/*"
      style="display: none"
      ref="fileInput"
    />
    <button @click="selectFiles">Choose Files</button>

    <h2>Uploaded Videos</h2>
    <div v-if="videos.length === 0">No videos uploaded yet.</div>
    <div v-for="video in videos" :key="video.title" class="video-container">
      <video :src="video.url" controls width="780"></video>
      <h3>{{ video.title }}</h3>
      <p>Tags: {{ video.tags.join(', ') }}</p>
      <button @click="downloadVideo(video.url, video.title)">Download Video</button>
      <br />
      <br />
      <br />
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  data() {
    return {
      files: [],
      videos: [],
    }
  },
  methods: {
    selectFiles() {
      this.$refs.fileInput.click()
    },
    handleFileChange(event) {
      const selectedFiles = Array.from(event.target.files)
      this.uploadVideos(selectedFiles)
    },
    handleDrop(event) {
      const droppedFiles = Array.from(event.dataTransfer.files)
      this.uploadVideos(droppedFiles)
    },
    async uploadVideos(selectedFiles) {
      console.log('Selected files:', selectedFiles) // Log selected files
      if (selectedFiles.length === 0) {
        alert('Please select at least one video file.')
        return
      }

      const uploadPromises = selectedFiles.map((file) => {
        const formData = new FormData()
        formData.append('video', file)

        return axios
          .post('http://localhost:3000/upload', formData)
          .then((response) => {
            const url = URL.createObjectURL(file)
            return {
              title: file.name,
              url: url,
              tags: this.extractTags(file.name),
            }
          })
          .catch((error) => {
            console.error(
              'Error uploading file:',
              error.response ? error.response.data : error.message,
            )
            return null // Handle the error
          })
      })

      const uploadedVideos = await Promise.all(uploadPromises)
      this.videos = uploadedVideos.filter((video) => video !== null)
    },
    extractTags(filename) {
      // Simulate tag extraction based on the filename
      return filename.split('.')[0].split('_') // Example: "video_tag1_tag2.mp4" -> ["video", "tag1", "tag2"]
    },
    downloadVideo(url, title) {
      const link = document.createElement('a')
      link.href = url
      link.download = title
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },
  },
}
</script>

<style scoped>
.uploader {
  max-width: 600px;
  margin: auto;
  text-align: center;
}

.drop-area {
  border: 2px dashed #ccc;
  padding: 20px;
  margin-bottom: 20px;
  background-color: #f9f9f9;
}

.video-container {
  margin: 20px 0;
}
</style>
