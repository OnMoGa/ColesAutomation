import { getProductById } from "../caches/productCache";
import { navigateTo, sleep } from "../colesDom";

export const removeProductFromCart = async (productId: string) => {
  var cartDrawer = document.querySelector(`[data-testid="trolley-drawer"]`);
  if (!cartDrawer) {
    var cartDrawerButton = document.querySelector<HTMLButtonElement>(
      `[data-testid="header-trolley-tablet-up"]`,
    );
    if (!cartDrawerButton) {
      throw new Error("Cart drawer button not found.");
    }
    cartDrawerButton.click();
    await sleep(500);
  }

  var productInCart = document.querySelector(
    `[data-testid="trolley-productItem-${productId}"]`,
  );
  if (!productInCart) {
    throw new Error(`Product not found in cart: ${productId}`);
  }

  var removeUtils = productInCart.querySelector<HTMLButtonElement>(
    `[data-testid="remove-utils"]`,
  );

  var removeButton = removeUtils?.querySelector<HTMLButtonElement>(`button`);
  if (!removeButton) {
    throw new Error("Remove button not found.");
  }
  removeButton.click();
  await sleep(500);

  // maybe close the drawer here

  return true;
};
