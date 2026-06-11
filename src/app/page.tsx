import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Trust from "@/components/Trust";
import Services from "@/components/Services";
import About from "@/components/About";
import Results from "@/components/Results";
import Process from "@/components/Process";
import Testimonials from "@/components/Testimonials";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Trust />
      <Services />
      <About />
      <Results />
      <Process />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </main>
  );
}
