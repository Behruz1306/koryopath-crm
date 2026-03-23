import { useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useUIStore } from '../../store';
import Sidebar from './Sidebar';
import Header from './Header';
import GlobalSearch from './GlobalSearch';

export default function Layout({ children }: { children?: React.ReactNode }) {
  const { sidebarOpen, globalSearchOpen, toggleSidebar } = useUIStore();

  const handleOverlayClick = useCallback(() => {
    if (sidebarOpen) {
      toggleSidebar();
    }
  }, [sidebarOpen, toggleSidebar]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Desktop sidebar */}
      <div
        className={clsx(
          'hidden flex-shrink-0 transition-all duration-300 lg:block',
          sidebarOpen ? 'w-64' : 'w-20',
        )}
      >
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black lg:hidden"
              onClick={handleOverlayClick}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children ?? <Outlet />}
        </main>
      </div>

      {/* Global search overlay */}
      <GlobalSearch
        isOpen={globalSearchOpen}
        onClose={() => useUIStore.getState().toggleGlobalSearch()}
      />
    </div>
  );
}
