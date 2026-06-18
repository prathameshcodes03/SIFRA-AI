import react from 'react'
import { Link,Route,Routes,Navigate } from 'react-router-dom'
import Landing_Page from './pages/Landing_Page'
import NotFound from './pages/NotFound'
import Login from './pages/Login'


function App() {
  

  return (
    <Routes>
  <Route path='/' element = {<Navigate to ='Landing_Page'/>}/>
  <Route path="/Landing_Page" element={<Landing_Page />} />
    <Route path="/Login" element={<Login />} />
       <Route path='*' element={<NotFound/>}/>
  </Routes>
 
  )
}

export default App
