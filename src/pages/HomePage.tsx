import ChurchHero from "../components/ChurchHero";
import AboutSection from "../components/AboutSection";
import ContributeSection from "../components/ContributeSection";
import LocationMap from "../components/LocationMap";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <>
      <ChurchHero />
      <AboutSection />
      <ContributeSection />
      <LocationMap />
      <Footer />
    </>
  );
}
