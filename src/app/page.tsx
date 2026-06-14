import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Trust from "@/components/Trust";
import DataIntelligence from "@/components/DataIntelligence";
import Services from "@/components/Services";
import Diagnostic from "@/components/Diagnostic";
import About from "@/components/About";
import Results from "@/components/Results";
import Process from "@/components/Process";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Trust />
      <DataIntelligence />
      <Services />
      <Diagnostic />
      <About />
      <Results />
      <Process />
      <Testimonials />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  );
}
