import {
  LayoutDashboard,
  ListTodo,
  PlusCircle,
  Calendar,
  Clock,
  TrendingUp,
  Star,
  CalendarDays,
  CheckSquare,
  CalendarCheck,
  Timer,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navSections = [
  {
    label: "Dashboard",
    items: [{ title: "Dashboard", url: "/", icon: LayoutDashboard }],
  },
  {
    label: "Management",
    items: [
      { title: "Tasks", url: "/tasks", icon: ListTodo },
      { title: "Add Task", url: "/tasks/new", icon: PlusCircle },
      { title: "Calendar", url: "/calendar", icon: Calendar },
      { title: "Schedule", url: "/schedule", icon: Clock },
    ],
  },
  {
    label: "Overview",
    items: [
      { title: "Priorities", url: "/priorities", icon: TrendingUp },
      { title: "Today", url: "/today", icon: Star },
      { title: "This Week", url: "/this-week", icon: CalendarDays },
      { title: "Completed", url: "/completed", icon: CheckSquare },
    ],
  },
  {
    label: "Timesheet",
    items: [
      { title: "Timesheet", url: "/timesheet", icon: Timer },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Settings",
    items: [{ title: "Settings", url: "/settings", icon: Settings }],
  },
];

export function AppSidebar() {
  const { signOut } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold text-sidebar-foreground">GSI Planner</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="flex items-center gap-2"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
