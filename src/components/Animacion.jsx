import Lottie from "lottie-react";
import animationData from "../assets/animacion.json";

function Animacion() {
  return (
    <Lottie
      animationData={animationData}
      loop={true}
      style={{ width: 300, height: 300 }}
    />
  );
}

export default Animacion;