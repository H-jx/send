import { Entry } from './pages/entry'
import { Room } from './pages/room'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import style from './app.module.less'

export const App = () => {
  return (
    <div className={style.appStyle}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Entry />} />
          <Route path="/room" element={<Room />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}
