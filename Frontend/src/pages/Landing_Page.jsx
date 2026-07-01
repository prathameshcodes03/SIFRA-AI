import React from 'react'
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Talking from '../assets/Videos/Talking.mp4'
import Pushups from '../assets/Videos/Pushups.mp4'
import SifraTrainer from '../assets/Videos/SifraTrainer.mp4'
import Speaking from '../assets/Audio/Speaking.mp3'




const Landing_Page = () => {
  return (
    <div className='h-full w-full bg-[#05050A]'>
            <Navbar/>



           <section id="main" >

             <section id="home" className='text-white h-screen w-screen pt-1'>



                                                            <div className='ml-[50rem] mt-[10rem]'>
                              <h1 className='text-5xl inline-block bg-gradient-to-r from-[#34d399] via-[ #06b6d4] to-[#3b82f6] bg-clip-text text-transparent'>
                               Your AI Coach <br /> Every Rep Perfected.
                              </h1>
                            </div>

                            <div className='mt-16 ml-[50rem]'>
                              <p className='text-3xl inline-block bg-gradient-to-r from-[#f97316] to-[#8b5cf6] bg-clip-text text-transparent'>
                                Real time pose correction <br />
                                rep counting and <br />
                                personalised feedback.
                              </p>
                            </div>


                            <div className='h-150 w-90 rounded-2xl ml-[10rem] mt-[-25rem]'>
                              <video
                                src={SifraTrainer}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="h-full w-full object-cover"
                              />
                            </div>


             </section>






               <section className="relative h-[300vh]" id='features'>

      

 

      <div className="sticky top-0 h-screen w-full overflow-hidden">

        <video

          src={Pushups}

          autoPlay

          loop

          muted

          playsInline

          className="h-full w-full object-cover"

        />

      

        <div className="absolute inset-0 bg-black/50"></div>

      </div>








      <div className="absolute top-0 left-0 w-full">

        

        <div className="h-screen flex items-center justify-center">

          <div className="text-center">

            <h1 className="text-7xl font-bold  inline-block bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-transparent  mb-6">

              98% Form Accuracy

            </h1>

            <p className="text-2xl  bg-gradient-to-r from-[#f97316]  to-[#8b5cf6] bg-clip-text text-transparent">

              Real-time AI posture analysis powered by MediaPipe.

            </p>

          </div>

        </div>



        <div className="h-screen flex items-center justify-center">

          <div className="text-center">

            <h1 className="text-7xl font-bold inline-block bg-gradient-to-r from-[#34d399] via-[#06b6d4] to-[#3b82f6] bg-clip-text text-transparent mb-6">

              Smart Rep Counting

            </h1>

            <p className="text-2xl bg-gradient-to-r from-[#f97316]  to-[#8b5cf6] bg-clip-text text-transparent">

              Automatically tracks every pushup and workout session.

            </p>

          </div>

        </div>

        {/* Block 3 */}

        <div className="h-screen flex items-center justify-center">

          <div className="text-center">

            <h1 className="text-7xl font-bold inline-block bg-gradient-to-r from-[#fbbf24] via-[#f97316] to-[#ef4444] bg-clip-text text-transparent mb-6">

              Voice Coaching

            </h1>

            <p className="text-2xl bg-gradient-to-r from-[#f97316]  to-[#8b5cf6] bg-clip-text text-transparent">

              Get instant feedback just like a real trainer.

            </p>

          </div>

        </div>

      </div>

    </section>



                   <section id="trainer" className='text-white h-screen w-screen pt-1 '>

                                                            <div className='ml-60 mt-[15rem]'>
                              <h1 className='text-5xl inline-block bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-transparent'>
                                Meet Your Ai <br /> Coach
                              </h1>
                            </div>

                            <div className='mt-8 ml-60'>
                              <p className='text-3xl inline-block bg-gradient-to-r from-[#6366f1] to-[#ec4899] bg-clip-text text-transparent'>
                                Your Personal Ai Trainer is here <br />
                                24/7 guide , support and <br />
                                push you to be best.
                              </p>

                           
                              <div className='mt-8'>
                                <button
                                  onClick={() => {
                                    const audio = new Audio(Speaking);
                                    audio.play();
                                  }}
                                  className='px-6 py-3 rounded-2xl text-white font-semibold cursor-pointer
                                  bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500
                                  hover:scale-105 transition-all duration-300
                                  shadow-[0_0_25px_rgba(168,85,247,0.4)]'
                                >
                                  ▶ Listen to Sifra
                                </button>
                              </div>
                            </div>

                            <div className='h-150 w-90 rounded-2xl ml-[60rem] mt-[-25rem]'>
                              <video
                                src={Talking}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="h-full w-full object-cover"
                              />
                            </div>





                   </section>


                          <Footer/>

           </section>
    </div>
  )
}

export default Landing_Page;