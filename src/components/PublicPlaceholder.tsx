import PublicHeader from './PublicHeader';
import HeroCarousel from './HeroCarousel';
import Footer from './Footer';

type PublicPlaceholderProps = {
  titulo: string;
};

export default function PublicPlaceholder({ titulo }: PublicPlaceholderProps) {
  return (
    <div className="public-body">
      <PublicHeader />
      <HeroCarousel />
      <section className="promociones">
        <h2>{titulo}</h2>
        <p>Esta página está en construcción.</p>
      </section>
      <Footer />
    </div>
  );
}
