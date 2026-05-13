import { Menu, Mountain, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'About', href: '#about' },
    { label: 'Operations', href: '#operations' },
    { label: 'Vision & Mission', href: '#investment' },
    { label: 'Values', href: '#sustainability' },
    { label: 'Contact', href: '#contact' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#e2e8f0] shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0a4d68] to-[#088395] rounded-lg flex items-center justify-center">
              <Mountain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-xl text-[#0f1419]">Minera Marte S.R.L.</div>
              <div className="text-xs text-[#64748b]">Bolivian Private Mining Company</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-[#64748b] hover:text-[#0a4d68] transition-colors duration-200 font-medium"
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/login"
              className="px-6 py-2.5 bg-[#0a4d68] hover:bg-[#083d54] text-white rounded-lg transition-all duration-300 font-medium"
            >
              Log In
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-[#0f1419]"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t border-[#e2e8f0]">
          <div className="px-6 py-4 space-y-3">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block py-2 text-[#64748b] hover:text-[#0a4d68] transition-colors duration-200 font-medium"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Link
              to="/login"
              className="block w-full px-6 py-2.5 bg-[#0a4d68] hover:bg-[#083d54] text-white rounded-lg transition-all duration-300 font-medium text-center"
            >
              Log In
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
