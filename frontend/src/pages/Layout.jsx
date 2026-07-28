import { Outlet } from "react-router-dom"
import LeftNav from "../components/LeftNav/LeftNav"
import BottomPlayer from "../components/BottomPlayer/BottomPlayer"

const Layout = () => {
    return(
        <div className="layout">
            <LeftNav />
            <div className="layout-right">
                <main className="main-content">
                    <Outlet />
                </main>
                <BottomPlayer />
            </div>
        </div>
    )
}

export default Layout