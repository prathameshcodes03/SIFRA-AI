import {React,useRef,useLayoutEffect,videoRef} from 'react'
import gsap from "gsap";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Talking from '../assets/Videos/Talking.mp4'
import Pushups from '../assets/Videos/Pushups.mp4'
import SifraTrainer from '../assets/Videos/SifraTrainer.mp4'
import Speaking from '../assets/Audio/Speaking.mp3'
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);





const Landing_Page = () => {

const featuresRef = useRef(null);
const slide1Ref = useRef(null);
const slide2Ref = useRef(null);
const slide3Ref = useRef(null);


useLayoutEffect(() => {
  const ctx = gsap.context(() => {

    const slides = gsap.utils.toArray(".feature-slide");

    gsap.set(slides, {
      opacity: 0,
      y: 80,
    });

    gsap.set(slides[0], {
      opacity: 1,
      y: 0,
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: featuresRef.current,
        start: "top top",
        end: "+=220%",  
        pin: true,
        scrub: 0.6,     
        anticipatePin: 1,
      },
    });

    slides.forEach((slide, i) => {
      if (i === 0) return;

      tl.to(slides[i - 1], {
        opacity: 0,
        y: -60,
        duration: 1,
        ease: "power2.out",
      });

      tl.to(
        slide,
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power2.out",
        },
        "<0.15"
      );
    });

  }, featuresRef);

  return () => ctx.revert();
}, []);




  return (
    <div className='min-h-screen w-full overflow-x-hidden bg-[#05050A]'>
      <Navbar />

      <main id="main">
        <section
          id="home"
          className='mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl grid-cols-1 items-center gap-10 px-5 py-12 text-white sm:px-8 md:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pb-30'
        >
          <div className='order-2 mx-auto w-full max-w-[22rem] overflow-hidden rounded-2xl shadow-[0_0_45px_rgba(52,211,153,0.18)] sm:max-w-[26rem] lg:order-1'>
            <video
              src={SifraTrainer}
              autoPlay
              loop
              muted
              playsInline
              className="aspect-[3/5] h-auto w-full object-cover"
            />
          </div>

          <div className='order-1 text-center lg:order-2 lg:text-left'>
            <h1 className='inline-block max-w-3xl bg-gradient-to-r from-[#34d399] via-[#06b6d4] to-[#3b82f6] bg-clip-text text-[clamp(2.4rem,8vw,5rem)] font-bold leading-tight text-transparent'>
              Your AI Coach <br className='hidden sm:block' /> Every Rep Perfected.
            </h1>

            <p className='mt-6 inline-block max-w-2xl bg-gradient-to-r from-[#f97316] to-[#8b5cf6] bg-clip-text text-[clamp(1.25rem,4vw,2rem)] font-semibold leading-snug text-transparent sm:mt-8'>
              Real time pose correction, rep counting and personalised feedback.
            </p>
          </div>
        </section>



<section id="features" ref={featuresRef} className="relative h-screen">


  <div className="sticky top-0 h-screen overflow-hidden">

    <video
      ref={videoRef}
      src={Pushups}
      autoPlay
      loop
      muted
      playsInline
      className="h-full w-full object-cover"
    />

    <div className="absolute inset-0 bg-black/50" />

  </div>


  <div className="absolute inset-0">


    <div className="feature-slide absolute inset-0 flex items-center justify-center px-6">
      <div className="max-w-5xl text-center">

        <h1 className="mb-6 inline-block bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-[clamp(2.5rem,8vw,5rem)] font-bold leading-tight text-transparent">
          98% Form Accuracy
        </h1>

        <p className="mx-auto max-w-3xl bg-gradient-to-r from-[#f97316] to-[#8b5cf6] bg-clip-text text-[clamp(1.1rem,3vw,1.7rem)] font-medium leading-relaxed text-transparent">
          Real-time AI posture analysis powered by MediaPipe.
        </p>

      </div>
    </div>

   
    <div className="feature-slide absolute inset-0 flex items-center justify-center px-6">
      <div className="max-w-5xl text-center">

        <h1 className="mb-6 inline-block bg-gradient-to-r from-[#34d399] via-[#06b6d4] to-[#3b82f6] bg-clip-text text-[clamp(2.5rem,8vw,5rem)] font-bold leading-tight text-transparent">
          Smart Rep Counting
        </h1>

        <p className="mx-auto max-w-3xl bg-gradient-to-r from-[#f97316] to-[#8b5cf6] bg-clip-text text-[clamp(1.1rem,3vw,1.7rem)] font-medium leading-relaxed text-transparent">
          Automatically tracks every pushup and workout session.
        </p>

      </div>
    </div>

   
    <div className="feature-slide absolute inset-0 flex items-center justify-center px-6">
      <div className="max-w-5xl text-center">

        <h1 className="mb-6 inline-block bg-gradient-to-r from-[#fbbf24] via-[#f97316] to-[#ef4444] bg-clip-text text-[clamp(2.5rem,8vw,5rem)] font-bold leading-tight text-transparent">
          Voice Coaching
        </h1>

        <p className="mx-auto max-w-3xl bg-gradient-to-r from-[#f97316] to-[#8b5cf6] bg-clip-text text-[clamp(1.1rem,3vw,1.7rem)] font-medium leading-relaxed text-transparent">
          Get instant feedback just like a real trainer.
        </p>

      </div>
    </div>

  </div>

</section>





        <section
          id="trainer"
          className='mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-10 px-5 py-16 text-white sm:px-8 lg:grid-cols-2 lg:px-10 '
        >
          <div className='text-center lg:text-left'>
            <h1 className='inline-block bg-gradient-to-r from-[#f97316] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-[clamp(2.4rem,8vw,5rem)] font-bold leading-tight text-transparent'>
              Meet Your Ai <br className='hidden sm:block' /> Coach
            </h1>

            <p className='mt-6 inline-block max-w-2xl bg-gradient-to-r from-[#6366f1] to-[#ec4899] bg-clip-text text-[clamp(1.2rem,4vw,2rem)] font-semibold leading-snug text-transparent sm:mt-8'>
              Your Personal Ai Trainer is here 24/7 to guide, support and push you to be best.
            </p>

            <div className='mt-8 flex justify-center lg:justify-start'>
              <button
                onClick={() => {
                  const audio = new Audio(Speaking);
                  audio.play();
                }}
                className='w-full max-w-xs cursor-pointer rounded-2xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 px-6 py-3 font-semibold text-white shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all duration-300 hover:scale-105 sm:w-auto'
              >
                Listen to Sifra
              </button>
            </div>
          </div>

          <div className='mx-auto w-full max-w-[22rem] overflow-hidden rounded-2xl shadow-[0_0_45px_rgba(236,72,153,0.18)] sm:max-w-[26rem]'>
            <video
              src={Talking}
              autoPlay
              loop
              muted
              playsInline
              className="aspect-[3/5] h-auto w-full object-cover"
            />
          </div>
        </section>

        <Footer />
      </main>
    </div>
  )
}

export default Landing_Page;
