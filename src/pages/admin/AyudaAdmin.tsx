import React from "react";
import { Accordion } from "react-bootstrap";

const AyudaAdmin = () => {
  return (
    <div className="page-inner">
      <div className="page-header">
        <h1>Ayuda del Sistema</h1>
        <p className="subtitulo">Soporte y documentación del panel administrativo</p>
      </div>

      <Accordion defaultActiveKey="1" id="ayudaAccordion">
        <Accordion.Item eventKey="1">
          <Accordion.Header>Inicio de ayuda</Accordion.Header>
          <Accordion.Body>
            <p>Presenta las categorías disponibles para navegar el sistema.</p>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="2">
          <Accordion.Header>Productos e inventario</Accordion.Header>
          <Accordion.Body>
            <p>Explica cómo registrar, editar y controlar productos.</p>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="3">
          <Accordion.Header>Ventas y compras</Accordion.Header>
          <Accordion.Body>
            <p>Enseña a registrar operaciones y consultar sus detalles.</p>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="4">
          <Accordion.Header>Usuarios y permisos</Accordion.Header>
          <Accordion.Body>
            <p>Explica cómo gestionar cuentas y roles.</p>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="5">
          <Accordion.Header>Preguntas frecuentes</Accordion.Header>
          <Accordion.Body>
            <p>Resuelve dudas habituales del sistema.</p>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="6">
          <Accordion.Header>Reportar un problema</Accordion.Header>
          <Accordion.Body>
            <p>Permite enviar incidencias al soporte técnico.</p>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="7">
          <Accordion.Header>Manual del sistema</Accordion.Header>
          <Accordion.Body>
            <p>Contiene instrucciones completas de uso del sistema.</p>
          </Accordion.Body>
        </Accordion.Item>

        {/* NUEVO APARTADO: cambia el título y el texto */}
        <Accordion.Item eventKey="8">
          <Accordion.Header>Título del nuevo apartado</Accordion.Header>
          <Accordion.Body>
            <p>Descripción del nuevo apartado.</p>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};

export default AyudaAdmin;