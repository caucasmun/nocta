import { HashRouter, Route, Routes } from "react-router-dom"
import { AudioProvider } from "./context/AudioContext"
import { AuthProvider } from "./context/AuthContext"
import Layout from "./pages/Layout"
import Home from "./pages/Home/Home"
import Search from "./pages/Search/Search"
import Artist from "./pages/Artist/Artist"
import Library from "./pages/Library/Library"
import Liked from "./pages/Liked/Liked"
import AddContent from "./pages/AddContent/AddContent"
import Auth from "./pages/Auth/Auth"
import Settings from "./pages/Settings/Settings"

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AudioProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Home />}></Route>
                <Route path="search" element={<Search />}></Route>
                <Route path="artist/:slug" element={<Artist />}></Route>
                <Route path="library" element={<Library />}></Route>
                <Route path="liked" element={<Liked />}></Route>
                <Route path="add" element={<AddContent />}></Route>
            </Route>
            <Route path="/auth" element={<Auth />}></Route>
            <Route path="/settings" element={<Settings />}></Route>
          </Routes>
        </AudioProvider>
      </HashRouter>
    </AuthProvider>
  )
}

export default App