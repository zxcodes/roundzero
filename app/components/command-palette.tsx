import {
  AddCircleIcon,
  Briefcase01Icon,
  BubbleChatIcon,
  CheckmarkCircle02Icon,
  CreditCardIcon,
  CustomerService01Icon,
  House01Icon,
  Loading03Icon,
  Logout03Icon,
  Moon02Icon,
  RankingIcon,
  Search01Icon,
  Setting06Icon,
  Sun01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";

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
  showTeam: boolean;
  showBilling: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CommandNavItem = {
  title: string;
  url: string;
  icon: typeof House01Icon;
};

type CommandNavSection = {
  label: string;
  items: CommandNavItem[];
};

const buildCompanyNavSections = (showBilling: boolean, showTeam: boolean): CommandNavSection[] => {
  const sections: CommandNavSection[] = [
    {
      label: "Hiring",
      items: [
        { title: "Overview", url: "/dashboard", icon: House01Icon },
        { title: "Jobs", url: "/dashboard/jobs", icon: Briefcase01Icon },
        { title: "Post a job", url: "/dashboard/jobs/new", icon: AddCircleIcon },
      ],
    },
    {
      label: "Review",
      items: [
        { title: "Awaiting review", url: "/dashboard/awaiting-review", icon: RankingIcon },
        { title: "Shortlisted", url: "/dashboard/shortlisted", icon: CheckmarkCircle02Icon },
      ],
    },
    {
      label: "Company",
      items: [
        ...(showTeam ? [{ title: "Team", url: "/dashboard/team", icon: UserGroupIcon }] : []),
        ...(showBilling
          ? [{ title: "Billing", url: "/dashboard/billing", icon: CreditCardIcon }]
          : []),
        { title: "Support", url: "/dashboard/support", icon: CustomerService01Icon },
        { title: "Settings", url: "/dashboard/settings", icon: Setting06Icon },
      ],
    },
  ];

  return sections.filter((section) => section.items.length > 0);
};

const candidateNavSections: CommandNavSection[] = [
  {
    label: "Overview",
    items: [{ title: "Overview", url: "/dashboard", icon: House01Icon }],
  },
  {
    label: "Applications",
    items: [
      { title: "Browse jobs", url: "/dashboard/jobs", icon: Search01Icon },
      { title: "My applications", url: "/dashboard/applications", icon: Briefcase01Icon },
      { title: "Interviews", url: "/interview", icon: BubbleChatIcon },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Support", url: "/dashboard/support", icon: CustomerService01Icon },
      { title: "Settings", url: "/dashboard/settings", icon: Setting06Icon },
    ],
  },
];

export function CommandPalette({
  isCompany,
  showTeam,
  showBilling,
  open,
  onOpenChange,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { signOut, isSigningOut } = useAuth();

  const navSections = isCompany
    ? buildCompanyNavSections(showBilling, showTeam)
    : candidateNavSections;

  const onSelectNav = (url: string) => {
    onOpenChange(false);
    void navigate({ to: url });
  };

  const onToggleTheme = () => {
    onOpenChange(false);
    setTheme(theme === "light" ? "dark" : "light");
  };

  const onSignOut = () => {
    onOpenChange(false);
    void signOut();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {navSections.map((section) => (
            <CommandGroup key={section.label} heading={section.label}>
              {section.items.map((item) => (
                <CommandItem key={item.url} onSelect={() => onSelectNav(item.url)}>
                  <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Preferences">
            <CommandItem onSelect={onToggleTheme}>
              {theme === "light" ? (
                <HugeiconsIcon icon={Moon02Icon} strokeWidth={2} />
              ) : (
                <HugeiconsIcon icon={Sun01Icon} strokeWidth={2} />
              )}
              <span>{theme === "light" ? "Switch to dark mode" : "Switch to light mode"}</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Account">
            <CommandItem onSelect={onSignOut} disabled={isSigningOut}>
              <HugeiconsIcon icon={isSigningOut ? Loading03Icon : Logout03Icon} strokeWidth={2} />
              <span>{isSigningOut ? "Signing out" : "Sign out"}</span>
              <CommandShortcut>⇧⌘Q</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
