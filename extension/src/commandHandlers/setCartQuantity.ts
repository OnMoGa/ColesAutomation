import { COLES_ORIGIN, navigateTo, sleep } from "../colesDom";

export const setCartQuantity = async (productId: string, desiredQuantity: number) => {
  const url = new URL(`${COLES_ORIGIN}/product/${productId}`);
  await navigateTo(url.toString());
  const buyContainer = document.querySelector<HTMLDivElement>('[data-testid="product-buy"]');
  if (!buyContainer) {
    throw new Error("Buy container not found.");
  }
  const addButton = buyContainer.querySelector<HTMLButtonElement>('[data-testid="add-to-cart-button"]');
  if (addButton) {
    addButton.click();
    await sleep(500);
  }

  const quantityInput = buyContainer.querySelector<HTMLInputElement>('[data-testid="quantity-input"]');

  if (!quantityInput) {
    throw new Error("Quantity input not found.");
  }

  const currentQuantity = Number(quantityInput.value);
  const delta = desiredQuantity - currentQuantity;

  if (delta > 0) {
    for (let i = 0; i < delta; i++) {
      const increaseButton = buyContainer.querySelector<HTMLButtonElement>('[data-testid="plus-btn"]');
      if (!increaseButton) {
        throw new Error("Increase button not found.");
      }
      increaseButton.click();
      await sleep(500);
    }
  } else if (delta < 0) {
    for (let i = 0; i < Math.abs(delta); i++) {
      const decreaseButton = buyContainer.querySelector<HTMLButtonElement>('[data-testid="minus-btn"]');
      if (!decreaseButton) {
        throw new Error("Decrease button not found.");
      }
      decreaseButton.click();
      await sleep(500);
    }
  }

  return { quantity: Number(quantityInput.value) };
};
