import { getProductById } from "../caches/productCache";
import { navigateTo } from "../colesDom";

export const addProductToCart = async (productId: string) => {
  const product = getProductById(productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }
  await navigateTo(product.productUrl);

  const buyContainer = document.querySelector<HTMLDivElement>(
    '[data-testid="product-buy"]'
  );
  if (!buyContainer) {
    throw new Error("Buy container not found.");
  }
  const addButton = buyContainer.querySelector<HTMLButtonElement>(
    '[data-testid="add-to-cart-button"]'
  );
  if (!addButton) {
    throw new Error("Add button not found.");
  }
  addButton.click();

  const quantityInput = document.querySelector<HTMLInputElement>(
    '[data-testid="quantity-input"]'
  );

  if (!quantityInput) {
    throw new Error("Add button not found.");
  }

  const quantity = Number(quantityInput.value);

  return { quantity };
};
