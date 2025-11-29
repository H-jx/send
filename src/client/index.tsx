import 'core-js/actual/object/from-entries'
import 'core-js/actual/array/flat'
import 'regenerator-runtime/runtime'
import 'antd-mobile/es/global'
import React from 'react'
import ReactDOM from 'react-dom'

import { App } from './app'
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register(new URL('service-worker.js', import.meta.url), { type: 'module' })
    .then((reg) => {
      // registration worked
      console.log('Registration succeeded. Scope is ' + reg.scope)
    })
    .catch((error) => {
      // registration failed
      console.log(`Registration failed with ${error}`)
    })
}

const app = document.getElementById('app')
ReactDOM.render(<App />, app)
