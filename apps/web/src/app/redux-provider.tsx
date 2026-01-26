"use client";

import type { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { store } from "@/lib/state/store";

export function ReduxProvider({ children }: PropsWithChildren) {
  return <Provider store={store}>{children}</Provider>;
}

