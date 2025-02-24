import { registerProperties } from 'corner-smoothie'
import smoothieWorklet from 'corner-smoothie/worklet?url'
import { createApp } from 'vue'
import App from './components/App.vue'

registerProperties()
CSS.paintWorklet.addModule(smoothieWorklet)

createApp(App)
  .mount('#app')
