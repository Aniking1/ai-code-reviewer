import {
  calculateDiscount,
} from "./pricing-service";

export function calculateOrderTotal(
  price: number,
  customerType: string,
): number {
  if (customerType === "premium") {
    return price * 0.8;
  }

  if (customerType === "standard") {
    return price * 0.9;
  }

  return price;
}
