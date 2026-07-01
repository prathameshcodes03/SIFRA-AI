import react from 'react'
import { Link,Route,Routes,Navigate } from 'react-router-dom'
import Landing_Page from './pages/Landing_Page'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Workout from './pages/Workout'
import Setting from './pages/Setting'
import Progress from './pages/Progress'


function App() {
  

  return (
    <Routes>
  <Route path='/' element = {<Navigate to ='Landing_Page'/>}/>
  <Route path="/Landing_Page" element={<Landing_Page />} />
    <Route path="/Login" element={<Login />} />
        <Route path="/Register" element={<Register />} />
        <Route path="/Dashboard" element={<Dashboard />} />
         <Route path="/Workout" element={<Workout/>} />
          <Route path="/Progress" element={<Progress/>} />
           <Route path="/Profile" element={<Profile />} />
            <Route path="/Setting" element={<Setting />} />
       <Route path='*' element={<NotFound/>}/>
  </Routes>
 
  )
}

export default App
