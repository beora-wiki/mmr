import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import "./index.css"

const stashed = sessionStorage.getItem("ns_beora_redirect_path")
if (stashed && stashed !== "/") {
  sessionStorage.removeItem("ns_beora_redirect_path")
  window.history.replaceState(null, "", stashed)
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
