import React from "react";

import { cn } from "@/lib/utils";

function Section({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="section"
      className={cn("px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}

export { Section };

