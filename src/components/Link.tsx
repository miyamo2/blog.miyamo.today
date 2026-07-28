import * as React from "react";
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** kept compatible with gatsby's <Link to={...}> */
  to: string;
  children?: ReactNode;
}

/** drop-in replacement for gatsby's Link (renders a plain anchor) */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(({ to, children, ...rest }, ref) => (
  <a href={to} ref={ref} {...rest}>
    {children}
  </a>
));

Link.displayName = "Link";

export default Link;
