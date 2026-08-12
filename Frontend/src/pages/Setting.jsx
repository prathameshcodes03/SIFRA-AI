import React, { useState } from 'react'
import Footer from '../components/Footer';
import AppShell from '../components/Dashboard/AppShell'
import { ChevronRight } from 'lucide-react'
import Toggle from '../components/Toggle'



const Setting = () => {
  const [reminders, setReminders] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [sounds, setSounds] = useState(true)

  const [workoutReminders, setWorkoutReminders] = useState(true)
  const [achievementAlerts, setAchievementAlerts] = useState(true)
  const [tipsInsights, setTipsInsights] = useState(true)
  const [marketingUpdates, setMarketingUpdates] = useState(false)

  const [twoFactor, setTwoFactor] = useState(false)

  const [cameraAccess, setCameraAccess] = useState(true)
  const [micAccess, setMicAccess] = useState(true)
  const [dataSaver, setDataSaver] = useState(false)

  return (
    <AppShell footer={<Footer/>}>

      <div>

        <h1 className='text-2xl font-bold'>Settings</h1>
        <p className='text-white/40 text-sm mb-6'>Manage your preferences and app settings</p>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>

          {/* General */}
          <div className='border border-white/10 rounded-2xl p-5'>
            <h2 className='font-semibold mb-3'>General</h2>

            <div className='flex justify-between items-center py-3 border-b border-white/5'>
              <div>
                <h5 className='text-sm font-medium'>Units</h5>
                <p className='text-xs text-white/40'>Choose your preferred units</p>
              </div>
              <select className='bg-[#0B0B14] border border-white/10 rounded-lg text-sm px-2 py-1'>
                <option>Metric (kg, cm)</option>
                <option>Imperial (lb, ft)</option>
              </select>
            </div>

            <div className='flex justify-between items-center py-3 border-b border-white/5'>
              <div>
                <h5 className='text-sm font-medium'>Reminders</h5>
                <p className='text-xs text-white/40'>Get reminded for your workouts</p>
              </div>
              <Toggle on={reminders} setOn={setReminders} />
            </div>

            <div className='flex justify-between items-center py-3 border-b border-white/5'>
              <div>
                <h5 className='text-sm font-medium'>Dark Mode</h5>
                <p className='text-xs text-white/40'>Enable dark mode</p>
              </div>
              <Toggle on={darkMode} setOn={setDarkMode} />
            </div>

            <div className='flex justify-between items-center py-3'>
              <div>
                <h5 className='text-sm font-medium'>Sounds</h5>
                <p className='text-xs text-white/40'>Enable workout sounds and alerts</p>
              </div>
              <Toggle on={sounds} setOn={setSounds} />
            </div>
          </div>

    
          <div className='border border-white/10 rounded-2xl p-5'>
            <h2 className='font-semibold mb-3'>Notifications</h2>

            <div className='flex justify-between items-center py-3 border-b border-white/5'>
              <div>
                <h5 className='text-sm font-medium'>Workout Reminders</h5>
                <p className='text-xs text-white/40'>Receive reminders for scheduled workouts</p>
              </div>
              <Toggle on={workoutReminders} setOn={setWorkoutReminders} />
            </div>

            <div className='flex justify-between items-center py-3 border-b border-white/5'>
              <div>
                <h5 className='text-sm font-medium'>Achievement Alerts</h5>
                <p className='text-xs text-white/40'>Get notified about your achievements</p>
              </div>
              <Toggle on={achievementAlerts} setOn={setAchievementAlerts} />
            </div>

            <div className='flex justify-between items-center py-3 border-b border-white/5'>
              <div>
                <h5 className='text-sm font-medium'>Tips & Insights</h5>
                <p className='text-xs text-white/40'>Receive AI tips and fitness insights</p>
              </div>
              <Toggle on={tipsInsights} setOn={setTipsInsights} />
            </div>

            <div className='flex justify-between items-center py-3'>
              <div>
                <h5 className='text-sm font-medium'>Marketing Updates</h5>
                <p className='text-xs text-white/40'>Receive news and updates from Sifra.AI</p>
              </div>
              <Toggle on={marketingUpdates} setOn={setMarketingUpdates} />
            </div>
          </div>

          <div className='border border-white/10 rounded-2xl p-5'>
            <h2 className='font-semibold mb-3'>Privacy & Security</h2>

            <button className='w-full flex justify-between items-center py-3 border-b border-white/5 text-left'>
              <div>
                <h5 className='text-sm font-medium'>Privacy Policy</h5>
                <p className='text-xs text-white/40'>Read our privacy policy</p>
              </div>
              <ChevronRight size={18} className='text-white/30' />
            </button>

            <button className='w-full flex justify-between items-center py-3 border-b border-white/5 text-left'>
              <div>
                <h5 className='text-sm font-medium'>Terms of Use</h5>
                <p className='text-xs text-white/40'>Read our terms of use</p>
              </div>
              <ChevronRight size={18} className='text-white/30' />
            </button>

            <button className='w-full flex justify-between items-center py-3 border-b border-white/5 text-left'>
              <div>
                <h5 className='text-sm font-medium'>Change Password</h5>
                <p className='text-xs text-white/40'>Update your account password</p>
              </div>
              <ChevronRight size={18} className='text-white/30' />
            </button>

            <div className='flex justify-between items-center py-3'>
              <div>
                <h5 className='text-sm font-medium'>Two-Factor Authentication</h5>
                <p className='text-xs text-white/40'>Add an extra layer of security</p>
              </div>
              <Toggle on={twoFactor} setOn={setTwoFactor} />
            </div>
          </div>


          <div className='border border-white/10 rounded-2xl p-5'>
            <h2 className='font-semibold mb-3'>App Settings</h2>

            <div className='flex justify-between items-center py-3 border-b border-white/5'>
              <div>
                <h5 className='text-sm font-medium'>Camera Access</h5>
                <p className='text-xs text-white/40'>Allow camera for workout tracking</p>
              </div>
              <Toggle on={cameraAccess} setOn={setCameraAccess} />
            </div>

            <div className='flex justify-between items-center py-3 border-b border-white/5'>
              <div>
                <h5 className='text-sm font-medium'>Microphone Access</h5>
                <p className='text-xs text-white/40'>Allow microphone for voice coach</p>
              </div>
              <Toggle on={micAccess} setOn={setMicAccess} />
            </div>

            <div className='flex justify-between items-center py-3 border-b border-white/5'>
              <div>
                <h5 className='text-sm font-medium'>Data Saver</h5>
                <p className='text-xs text-white/40'>Reduce data usage</p>
              </div>
              <Toggle on={dataSaver} setOn={setDataSaver} />
            </div>

            <div className='flex justify-between items-center py-3'>
              <div>
                <h5 className='text-sm font-medium'>Language</h5>
                <p className='text-xs text-white/40'>Choose your preferred language</p>
              </div>
              <select className='bg-[#0B0B14] border border-white/10 rounded-lg text-sm px-2 py-1'>
                <option>English</option>
                <option>Hindi</option>
              </select>
            </div>
          </div>

        </div>

        <div className='border border-white/10 rounded-2xl p-5 mt-5'>
          <h2 className='font-semibold'>Account</h2>
          <button className='w-full flex justify-between items-center pt-2 text-left'>
            <div>
              <p className='text-sm font-medium text-red-400'>Log Out</p>
              <p className='text-xs text-white/40'>Sign out from your account</p>
            </div>
            <ChevronRight size={18} className='text-white/30' />
          </button>
        </div>

      </div>

    </AppShell>
  )
}

export default Setting
