import classes from "@/styles/Direction.module.scss";
import { useIsRtl } from "./useIsRtl";

// Style that sets the reading direction on a screen's root view (Hebrew and Arabic flip, other languages do not).
export const useDirection = () => (useIsRtl() ? classes.rtl : classes.ltr);
