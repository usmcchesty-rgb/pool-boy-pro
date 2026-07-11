import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Logo } from '../ui/Logo';
import { getPageTitle, NAV_ITEMS } from '../../constants/navigation';

export function AppShell() {
  const { settings } = useApp();
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `${getPageTitle(pathname)} — Pool Boy Pro`;
  }, [pathname]);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar__brand">
          <Logo variant="transparent" size="xl" className="sidebar__brand-logo" />
          <p className="sidebar__subtitle">{settings.poolName}</p>
        </div>
        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
            >
              <span className="sidebar__link-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__kit">
          <span className="sidebar__kit-label">Test Kit</span>
          <span className="sidebar__kit-name">Taylor K-2006-SALT</span>
        </div>
      </aside>

      <div className="app-shell__stage">
        <main className="main-content" id="main-content">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <div className="bottom-nav__scroll">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `bottom-nav__link ${isActive ? 'bottom-nav__link--active' : ''}`
              }
            >
              <span className="bottom-nav__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="bottom-nav__label">{item.shortLabel}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
