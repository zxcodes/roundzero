import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { User } from "@/router";
import {
    AddCircleIcon,
    Briefcase01Icon,
    ChartBarBigIcon,
    HelpCircleIcon,
    House01Icon,
    Search01Icon,
    Settings01Icon,
    UserGroupIcon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";

const companyMain = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: <HugeiconsIcon icon={House01Icon} strokeWidth={2} className="size-5" />,
  },
  {
    title: "Jobs",
    url: "/dashboard/jobs",
    icon: <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-5" />,
  },
  {
    title: "Candidates",
    url: "/dashboard/candidates",
    icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-5" />,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: <HugeiconsIcon icon={ChartBarBigIcon} strokeWidth={2} className="size-5" />,
  },
];

const candidateMain = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: <HugeiconsIcon icon={House01Icon} strokeWidth={2} className="size-5" />,
  },
  {
    title: "Browse Jobs",
    url: "/dashboard/jobs",
    icon: <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="size-5" />,
  },
  {
    title: "My Applications",
    url: "/dashboard/applications",
    icon: <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-5" />,
  },
];


const secondaryItems = [
  {
    title: "Settings",
    url: "/dashboard",
    icon: <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} className="size-5" />,
  },
  {
    title: "Get Help",
    url: "/dashboard",
    icon: <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} className="size-5" />,
  },
  {
    title: "Search",
    url: "/dashboard/jobs",
    icon: <HugeiconsIcon icon={Search01Icon} strokeWidth={2} className="size-5" />,
  },
];

export function AppSidebar({
  user,
  isCompany,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User; isCompany: boolean }) {
  const mainItems = isCompany ? companyMain : candidateMain;

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link to="/dashboard">
                <span className="text-base font-semibold">hirely</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              <SidebarMenuItem className="flex items-center gap-2">
                <SidebarMenuButton
                  asChild
                  className="bg-primary text-primary-foreground min-w-8 hover:bg-primary/90 hover:text-primary-foreground"
                >
                  <Link to="/dashboard/jobs/new">
                    <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                    <span>Quick Create</span>
                  </Link>
                </SidebarMenuButton>

              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <NavMain sections={[{ items: mainItems }]} />

        <div className="mt-auto">
          <NavMain sections={[{ items: secondaryItems }]} />
        </div>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
