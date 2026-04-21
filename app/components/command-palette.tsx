import {
  AddCircleIcon,
  Briefcase01Icon,
  House01Icon,
  Logout03Icon,
  Moon02Icon,
  Search01Icon,
  Setting06Icon,
  Sun01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useAuth } from "@/features/auth/provider";

interface CommandPaletteProps {
  isCompany: boolean;
}

const companyNavItems = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: House01Icon,
  },
  {
    title: "Jobs",
    url: "/dashboard/jobs",
    icon: Briefcase01Icon,
  },
  {
    title: "Post a Job",
    url: "/dashboard/jobs/new",
    icon: AddCircleIcon,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Setting06Icon,
  },
];

const candidateNavItems = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: House01Icon,
  },
  {
    title: "Browse Jobs",
    url: "/dashboard/jobs",
    icon: Search01Icon,
  },
  {
    title: "My Applications",
    url: "/dashboard/applications",
    icon: Briefcase01Icon,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Setting06Icon,
  },
];

export function CommandPalette({ isCompany }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();

  const navItems = isCompany ? companyNavItems : candidateNavItems;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const onSelectNav = (url: string) => {
    setOpen(false);
    navigate({ to: url });
  };

  const onToggleTheme = () => {
    setOpen(false);
    setTheme(theme === "light" ? "dark" : "light");
  };

  const onSignOut = () => {
    setOpen(false);
    signOut();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {navItems.map((item) => (
              <CommandItem key={item.url} onSelect={() => onSelectNav(item.url)}>
                <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Preferences">
            <CommandItem onSelect={onToggleTheme}>
              {theme === "light" ? (
                <HugeiconsIcon icon={Moon02Icon} strokeWidth={2} />
              ) : (
                <HugeiconsIcon icon={Sun01Icon} strokeWidth={2} />
              )}
              <span>{theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Account">
            <CommandItem onSelect={onSignOut}>
              <HugeiconsIcon icon={Logout03Icon} strokeWidth={2} />
              <span>Sign Out</span>
              <CommandShortcut>⇧⌘Q</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
