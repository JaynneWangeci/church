declare module "lucide-react" {
  import { FC, SVGProps } from "react";

  interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number;
  }

  type Icon = FC<IconProps>;

  export const Menu: Icon;
  export const X: Icon;
  export const Heart: Icon;
  export const Shield: Icon;
  export const ChevronDown: Icon;
  export const MapPin: Icon;
  export const Church: Icon;
  export const Target: Icon;
  export const Users: Icon;
  export const Medal: Icon;
  export const Check: Icon;
  export const Loader2: Icon;
  export const Share2: Icon;
  export const Search: Icon;
  export const Lock: Icon;
  export const Mail: Icon;
  export const AlertCircle: Icon;
  export const TrendingUp: Icon;
  export const DollarSign: Icon;
  export const Clock: Icon;
  export const Download: Icon;
  export const LogOut: Icon;
  export const RefreshCw: Icon;
  export const Navigation: Icon;
  export const ExternalLink: Icon;
  export const Building2: Icon;
  export const BookOpen: Icon;
  export const Trees: Icon;
  export const Play: Icon;
  export const Globe: Icon;
}
