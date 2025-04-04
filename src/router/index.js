import { createRouter, createWebHistory } from 'vue-router'
import VideoUploader from '../views/VideoUploader.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Video Uploader',
      component: VideoUploader,
    },
  ],
})

export default router
