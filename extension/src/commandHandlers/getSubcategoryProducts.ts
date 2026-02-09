import { Product } from "../../../shared/protocol";
import { updateProductCacheBulk } from "../caches/productCache";
import { navigateTo } from "../colesDom";
import { getSubcategories } from "./getSubcategories";

export const getSubcategoryProducts = async (
  categoryName: string,
  subCategoryName: string
) => {
  const subcategory = (await getSubcategories(categoryName)).find(
    (subcategory) => subcategory.name === subCategoryName
  );
  if (!subcategory) {
    throw new Error(`Subcategory not found: ${subCategoryName}`);
  }
  await navigateTo(subcategory.url);
  return extractProductsFromPage();
};

const extractProductsFromPage = (): Product[] => {
  const container = document.querySelector<HTMLElement>(
    '[data-testid="product-tiles"]'
  );
  if (!container) {
    throw new Error("Product tiles container not found.");
  }
  const productTiles = Array.from(
    container.querySelectorAll<HTMLElement>('[data-testid="product-tile"]')
  );

  var products: Product[] = productTiles.map((productTile) => {
    var productId =
      productTile
        .querySelector("[data-bv-product-id]")
        ?.getAttribute("data-bv-product-id") ?? "unknown";

    var productLink = productTile.querySelector<HTMLAnchorElement>(
      'a[href*="/product/"]'
    );
    var productName = productLink?.getAttribute("aria-label") ?? "";
    var productPrice =
      productTile.querySelector<HTMLSpanElement>(
        '[data-testid="product-pricing"]'
      )?.innerText ?? "";

    return {
      id: productId,
      name: productName,
      price: productPrice,
      productUrl: productLink?.href ?? "",
    };
  });

  updateProductCacheBulk(products);

  return products;
};
