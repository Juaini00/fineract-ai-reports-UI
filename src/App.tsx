import { RouterProvider } from "react-router-dom"
import { routes } from "./app/router"
import { Toaster } from "@/shared/components/ui/sonner"

function App() {

  return (
    <>
      <RouterProvider router={routes} />
      <Toaster />
    </>
  )
}

export default App
