import { Outlet, useLocation } from "react-router-dom"
import LeftNav from "../components/LeftNav/LeftNav"
import BottomPlayer from "../components/BottomPlayer/BottomPlayer"

const Layout = () => {
    const location = useLocation();
    const isHome = location.pathname === "/" || location.pathname === "";
    
    return(
        <div className="layout">
            <LeftNav />
            <div className={`layout-right${isHome ? ' home-page' : ''}`}>
                <main className={`main-content${isHome ? ' home-page' : ''}`}>
                    <Outlet />
                </main>
                {!isHome && <BottomPlayer />}
            </div>
        </div>
    )
}

export default Layout