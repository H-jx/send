import 'core-js/actual/object/from-entries'
import 'core-js/actual/array/flat'
import 'regenerator-runtime/runtime'
import 'antd-mobile/es/global'
import React from 'react'
import ReactDOM from 'react-dom'

import { App } from './app'

const app = document.getElementById('app')
ReactDOM.render(<App />, app)
