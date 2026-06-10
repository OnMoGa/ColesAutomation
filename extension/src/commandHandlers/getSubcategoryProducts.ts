import { Product } from "../../../shared/protocol";
import { navigateTo } from "../colesDom";

export const getSubcategoryProducts = async (subCategoryUrl: string) => {
  await navigateTo(subCategoryUrl);
  return extractProductsFromPage();
};

const extractProductsFromPage = (): Product[] => {
  const container = document.querySelector<HTMLElement>('[data-testid="product-tiles"]');
  if (!container) {
    throw new Error("Product tiles container not found.");
  }
  const productTiles = Array.from(container.querySelectorAll<HTMLElement>('[data-testid="product-tile"]'));

  var products: Product[] = productTiles.map((productTile) => {
    var productId = productTile.querySelector("[data-bv-product-id]")?.getAttribute("data-bv-product-id") ?? "unknown";

    var productLink = productTile.querySelector<HTMLAnchorElement>('a[href*="/product/"]');
    var productName = productLink?.getAttribute("aria-label") ?? "";
    var productPrice = productTile.querySelector<HTMLSpanElement>('[data-testid="product-pricing"]')?.innerText ?? "";

    return {
      id: productId,
      name: productName,
      price: Number(productPrice),
      productUrl: productLink?.href ?? "",
    };
  });
  return products;
};
