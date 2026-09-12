import { calculateDiscount } from "./pricing";

if (
  calculateDiscount(100, "guest") !== 100
) {
  throw new Error(
    "Guest customers should pay the full price.",
  );
}
