type PaginaModuloProps = {
  titulo: string;
};

export default function PaginaModulo({ titulo }: PaginaModuloProps) {
  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h1>{titulo}</h1>
          <p className="subtitulo">Este módulo está en construcción.</p>
        </div>
      </div>
    </div>
  );
}
