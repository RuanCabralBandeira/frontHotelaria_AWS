import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/Home/Home";

import Quartos from "../features/quarto/pages/Quartos";
import Reservas from "../features/reserva/pages/Reservas";
import Usuarios from "../features/usuario/pages/Usuarios";
import Pagamentos from "../features/pagamento/pages/Pagamentos";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/quartos" element={<Quartos />} />
        <Route path="/reservas" element={<Reservas />} />
        <Route path="/pagamentos" element={<Pagamentos />} />
      </Routes>
    </BrowserRouter>
  );
}