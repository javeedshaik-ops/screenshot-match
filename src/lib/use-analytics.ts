import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAnalytics } from "./interview.functions";

export function useAnalytics() {
  const fn = useServerFn(getAnalytics);
  return useQuery({ queryKey: ["analytics"], queryFn: () => fn() });
}
