import React from 'react';
import { LayoutDashboard, Network, Package, Users, MapPin, Cpu, ChevronLeft, ChevronRight } from 'lucide-react';
import './Sidebar.css';

const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'graph', label: 'Graph View', icon: Network, primary: true },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'people', label: 'People', icon: Users },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'tech', label: 'Tech Stack', icon: Cpu }
];

function Sidebar({ currentView, onViewChange, collapsed, onToggleCollapse }) {
    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <button className="collapse-button" onClick={onToggleCollapse}>
                {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>

            <nav className="sidebar-nav">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            className={`nav-item ${currentView === item.id ? 'active' : ''} ${item.primary ? 'primary' : ''}`}
                            onClick={() => onViewChange(item.id)}
                            title={collapsed ? item.label : ''}
                        >
                            <Icon className="nav-icon" size={20} />
                            {!collapsed && <span className="nav-label">{item.label}</span>}
                            {item.primary && !collapsed && <span className="primary-badge">★</span>}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}

export default Sidebar;
