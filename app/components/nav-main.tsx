import { Link, useRouterState } from "@tanstack/react-router";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavMain({
  sections,
}: {
  sections: {
    label?: string;
    items: {
      title: string;
      url: string;
      icon?: React.ReactNode;
      matchPrefix?: boolean;
    }[];
  }[];
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <>
      {sections.map((section, sectionIndex) => (
        <SidebarGroup key={section.label ?? `section-${sectionIndex}`}>
          {section.label ? <SidebarGroupLabel>{section.label}</SidebarGroupLabel> : null}
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => {
                const matchPrefix = item.matchPrefix !== false;
                const isActive =
                  pathname === item.url ||
                  pathname === `${item.url}/` ||
                  (matchPrefix && pathname.startsWith(`${item.url}/`));

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                      <Link to={item.url}>
                        {item.icon}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
