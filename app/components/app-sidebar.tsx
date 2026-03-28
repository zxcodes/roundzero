import { Briefcase, ChartBar, House, MagnifyingGlass, Users } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { User } from "@/router";

const companyNav = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: <House />,
  },
  {
    title: "Jobs",
    url: "/dashboard/jobs",
    icon: <Briefcase />,
  },
  {
    title: "Candidates",
    url: "/dashboard/candidates",
    icon: <Users />,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: <ChartBar />,
  },
];

const candidateNav = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: <House />,
  },
  {
    title: "Browse Jobs",
    url: "/dashboard/jobs",
    icon: <MagnifyingGlass />,
  },
  {
    title: "My Applications",
    url: "/dashboard/applications",
    icon: <Briefcase />,
  },
];

export function AppSidebar({
  user,
  isCompany,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User; isCompany: boolean }) {
  const navItems = isCompany ? companyNav : candidateNav;

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link to="/dashboard">
                <span className="text-base font-semibold tracking-tight">hirely</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
