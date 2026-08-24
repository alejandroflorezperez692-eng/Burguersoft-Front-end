import PublicHeader from './PublicHeader';

type PublicPlaceholderProps = {
  titulo: string;
};

export default function PublicPlaceholder({ titulo }: PublicPlaceholderProps) {
  return (
    <div className="public-body">
      <PublicHeader />
      <section className="promociones">
        <h2>{titulo}</h2>
        <p>Esta página está en construcción.</p>
      </section>
      <footer>
        <div className="footer-bottom">
          <p>&copy; 2026 BURGUERSOFT - EL ORIENTE. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
