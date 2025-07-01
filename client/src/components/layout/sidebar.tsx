import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { User } from "@shared/schema";
import { useAuth } from "@/lib/auth";

interface SidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: Partial<User>;
}

export default function Sidebar({ isOpen, onOpenChange, user }: SidebarProps) {
  const [location] = useLocation();
  const { logout } = useAuth();
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  const links = [
    { href: "/dashboard", label: "Overview", icon: "ri-dashboard-line" },
    { href: "/dashboard/bookings", label: "Booking Manager", icon: "ri-calendar-check-line" },
    { href: "/dashboard/calendar", label: "Calendar Sync", icon: "ri-calendar-line" },
    { href: "/dashboard/pricing", label: "Pricing Engine", icon: "ri-money-dollar-circle-line" },
    { href: "/dashboard/ai-marketing", label: "AI Marketing", icon: "ri-robot-line" },
    { href: "/dashboard/ai-features", label: "AI Features", icon: "ri-brain-line" },
    { href: "/dashboard/ai-trainer", label: "AI Agent Trainer", icon: "ri-graduation-cap-line" },
    { href: "/dashboard/airtable", label: "Business Data", icon: "ri-database-2-line" },
    { href: "/dashboard/analytics", label: "Analytics & Reports", icon: "ri-line-chart-line" },
    { href: "/dashboard/profile", label: "Profile Settings", icon: "ri-user-settings-line" },
    { href: "/dashboard/notifications", label: "Notifications & Logs", icon: "ri-notification-3-line" },
  ];

  return (
    <div 
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out transform",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="px-6 pt-8 pb-4 flex items-center border-b border-sidebar-border">
        <i className="ri-island-line text-3xl mr-2"></i>
        <h1 className="text-xl font-bold">IslandLoaf</h1>
      </div>
      
      <div className="px-4 py-6">
        <div className="flex items-center mb-6 px-2">
          <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-white font-medium">
              {user.fullName ? getInitials(user.fullName) : "U"}
            </span>
          </div>
          <div className="ml-3">
            <p className="font-medium">{user.fullName}</p>
            <p className="text-xs text-sidebar-foreground/70">{user.businessName}</p>
          </div>
        </div>
        
        <nav className="space-y-1">
          {links.map((link) => {
            const isActive = location === link.href;
            
            return (
              <Link 
                key={link.href}
                href={link.href}
                onClick={() => onOpenChange(false)}
              >
                <a 
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <i className={cn(link.icon, "mr-3")}></i>
                  <span>{link.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-auto border-t border-sidebar-border px-4 py-4">
        <button 
          onClick={logout}
          className="flex items-center px-3 py-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md w-full"
        >
          <i className="ri-logout-box-line mr-3"></i>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
