export const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/test': 'New Test',
  '/quick-check': 'Quick Test',
  '/history': 'History',
  '/charts': 'Charts',
  '/calculator': 'Calculator',
  '/reports': 'Reports',
  '/equipment': 'Equipment',
  '/maintenance': 'Maintenance',
  '/inventory': 'Inventory',
  '/settings': 'Settings',
};

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◉', shortLabel: 'Home' },
  { to: '/test', label: 'New Test', icon: '✦', shortLabel: 'Test' },
  { to: '/quick-check', label: 'Quick Test', icon: '▤', shortLabel: 'Quick' },
  { to: '/history', label: 'History', icon: '☰', shortLabel: 'History' },
  { to: '/charts', label: 'Charts', icon: '↗', shortLabel: 'Charts' },
  { to: '/calculator', label: 'Calculator', icon: '⚗', shortLabel: 'Calc' },
  { to: '/equipment', label: 'Equipment', icon: '⛭', shortLabel: 'Equip' },
  { to: '/maintenance', label: 'Maintenance', icon: '◷', shortLabel: 'Maint' },
  { to: '/inventory', label: 'Inventory', icon: '⊞', shortLabel: 'Stock' },
  { to: '/reports', label: 'Reports', icon: '▣', shortLabel: 'Reports' },
  { to: '/settings', label: 'Settings', icon: '⚙', shortLabel: 'Settings' },
] as const;

export function getPageTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith('/history/') && pathname.endsWith('/edit')) return 'Edit Test';
  if (pathname.startsWith('/history/')) return 'Test Details';
  if (pathname.startsWith('/equipment/')) return pathname.endsWith('/new') ? 'Add Equipment' : 'Equipment Details';
  if (pathname.startsWith('/maintenance/')) return pathname.endsWith('/new') ? 'Add Task' : 'Task Details';
  if (pathname.startsWith('/inventory/')) return pathname.endsWith('/new') ? 'Add Item' : 'Item Details';
  return 'Pool Boy Pro';
}
